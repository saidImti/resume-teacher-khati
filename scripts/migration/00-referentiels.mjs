// ============================================================
// 00-referentiels.mjs — Module 00 de la migration Fiche Inscription → RTK
// Périmètre : sites (match/création + préfixe de numérotation),
//             niveaux (confirmation + table de correspondance),
//             années scolaires (confirmation + warnings).
// Les groupes/schedules sont traités au Module 03 (conflit structurel).
//
// Idempotent · dry-run par défaut · une erreur enregistrement = log + skip.
//
// Usage :
//   node scripts/migration/00-referentiels.mjs --dump=export.json          (dry-run)
//   node scripts/migration/00-referentiels.mjs --dump=export.json --commit (écriture)
//
// Prérequis commit : migration 015 appliquée (colonne sites.registration_prefix).
// ============================================================
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getAdminClient } from './lib/env.mjs'
import { loadDump } from './lib/legacy-dump.mjs'
import { createReport } from './lib/report.mjs'
import { loadIdMap, saveIdMap, setMapping } from './lib/id-map.mjs'
import { matchKey, toSlug, uniqueSlug } from './lib/normalize.mjs'

// Slugs des 5 niveaux, identiques des deux côtés (aucun conflit de valeurs).
const NIVEAUX_SLUGS = ['preschoolers', 'kids', 'juniors', 'tweens', 'teenagers']

// Alias de réconciliation des lieux legacy → sites RTK canoniques (site-aliases.json).
// Évite de créer des doublons quand un lieu legacy correspond à un site existant
// sous un nom différent (ex. "Champigny sur Marne Taxi Phone" → "champigny-taxi-phone").
function loadAliases() {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'scripts/migration/site-aliases.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed._aliases ?? {}
  } catch {
    return {}
  }
}

function parseArgs(argv) {
  const args = { dump: null, commit: false }
  for (const a of argv.slice(2)) {
    if (a === '--commit') args.commit = true
    else if (a.startsWith('--dump=')) args.dump = a.slice('--dump='.length)
  }
  return args
}

// ─── Niveaux ────────────────────────────────────────────────
async function resolveLevels(supabase, report, idMap) {
  const { data, error } = await supabase.from('levels').select('id, name, slug')
  if (error) throw new Error(`Lecture des niveaux impossible : ${error.message}`)

  const bySlug = new Map((data ?? []).map(l => [l.slug, l]))
  for (const slug of NIVEAUX_SLUGS) {
    const lvl = bySlug.get(slug)
    if (lvl) {
      report.action('reuse', 'niveau', `${lvl.name} (${slug})`)
      setMapping(idMap, 'levels', slug, lvl.id)
    } else {
      report.conflict(`Niveau manquant en base : "${slug}". Appliquer le seed 001 avant de continuer.`)
    }
  }
  return bySlug
}

// ─── Années scolaires ───────────────────────────────────────
async function resolveAcademicYears(supabase, report, dump, idMap) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, is_active')
  if (error) throw new Error(`Lecture des années scolaires impossible : ${error.message}`)

  const byKey = new Map((data ?? []).map(y => [matchKey(y.name), y]))
  for (const y of data ?? []) {
    setMapping(idMap, 'academic_years', matchKey(y.name), y.id)
  }
  const active = (data ?? []).find(y => y.is_active)
  if (!active) report.warn('Aucune année scolaire active en base.')

  for (const annee of dump.anneesUtilisees()) {
    if (byKey.has(matchKey(annee))) {
      report.action('reuse', 'année', `${annee} → déjà en base`)
    } else {
      report.warn(
        `Année "${annee}" présente côté Fiche Inscription mais absente de RTK. ` +
        `Ne sera pas créée automatiquement (dates inconnues) — à créer manuellement dans /settings/annees si nécessaire.`
      )
    }
  }
  return byKey
}

// ─── Sites ──────────────────────────────────────────────────
async function resolveSites(supabase, report, dump, idMap, commit, aliases) {
  // La colonne registration_prefix existe-t-elle ? (migration 015)
  let prefixAvailable = true
  let existing = []
  {
    const withPrefix = await supabase.from('sites').select('id, name, slug, registration_prefix')
    if (withPrefix.error) {
      prefixAvailable = false
      const fallback = await supabase.from('sites').select('id, name, slug')
      if (fallback.error) throw new Error(`Lecture des sites impossible : ${fallback.error.message}`)
      existing = fallback.data ?? []
      report.warn(
        'Colonne sites.registration_prefix absente — migration 015 non appliquée. ' +
        'Les préfixes ne seront ni lus ni écrits.' + (commit ? ' Commit bloqué.' : '')
      )
    } else {
      existing = withPrefix.data ?? []
    }
  }

  const existingByKey = new Map(existing.map(s => [matchKey(s.name), s]))
  const existingBySlug = new Map(existing.map(s => [s.slug, s]))
  const takenSlugs = new Set(existing.map(s => s.slug))

  // Étape 1 — regrouper les lieux legacy par SITE CIBLE (plusieurs lieux → un site).
  // targetKey : "exist:<id>" pour un site existant, "new:<matchKey>" pour une création.
  const groups = new Map()
  for (const site of dump.collectRealSites()) {
    let target = null, targetKey, slug = null
    const alias = aliases[site.matchKey]
    if (alias) {
      target = existingBySlug.get(alias)
      if (!target) { report.conflict(`Alias "${site.matchKey}" → slug "${alias}" introuvable dans la table sites RTK.`); continue }
      targetKey = 'exist:' + target.id
    } else {
      target = existingByKey.get(site.matchKey)
      if (target) targetKey = 'exist:' + target.id
      else { targetKey = 'new:' + site.matchKey; slug = uniqueSlug(toSlug(site.displayName), takenSlugs); takenSlugs.add(slug) }
    }
    if (!groups.has(targetKey)) {
      groups.set(targetKey, {
        target, slug: target ? target.slug : slug,
        name: target ? target.name : site.displayName,
        count: 0, legacyKeys: [], members: [], bestCode: null, bestCount: -1,
      })
    }
    const g = groups.get(targetKey)
    g.count += site.count
    g.legacyKeys.push(site.matchKey)
    g.members.push(site.displayName)
    // Préfixe = code du lieu legacy MAJORITAIRE ayant un code non nul.
    if (site.code != null && site.count > g.bestCount) { g.bestCode = site.code; g.bestCount = site.count }
  }

  // Détection de doublons de préfixe entre sites cibles distincts.
  const prefixOwner = new Map()
  for (const s of existing) if (prefixAvailable && s.registration_prefix != null) prefixOwner.set(Number(s.registration_prefix), s.name)

  // Étape 2 — appliquer par site cible.
  for (const [targetKey, g] of groups) {
    const memberLabel = g.members.length > 1
      ? `${g.members.length} lieux legacy [${g.members.join(' + ')}] · ${g.count} inscription(s)`
      : `${g.members[0]} · ${g.count} inscription(s)`

    if (prefixAvailable && g.bestCode != null) {
      const owner = prefixOwner.get(g.bestCode)
      if (owner && matchKey(owner) !== matchKey(g.name)) {
        report.conflict(`Préfixe ${g.bestCode} déjà utilisé par "${owner}" — conflit avec "${g.name}".`)
        g.bestCode = null
      }
    }

    if (targetKey.startsWith('exist:')) {
      for (const lk of g.legacyKeys) setMapping(idMap, 'sites', lk, g.target.id)
      if (prefixAvailable && g.bestCode != null) {
        if (g.target.registration_prefix == null) {
          report.action('update', 'site', `${g.name} → préfixe ${g.bestCode}  (${memberLabel})`)
          if (commit) {
            const { error } = await supabase.from('sites').update({ registration_prefix: g.bestCode }).eq('id', g.target.id)
            if (error) report.warn(`Échec MAJ préfixe "${g.name}" : ${error.message}`)
            else prefixOwner.set(g.bestCode, g.name)
          } else prefixOwner.set(g.bestCode, g.name)
        } else if (Number(g.target.registration_prefix) !== g.bestCode) {
          report.conflict(`Site "${g.name}" a déjà le préfixe ${g.target.registration_prefix}, legacy indique ${g.bestCode}. Revue manuelle.`)
        } else {
          report.action('reuse', 'site', `${g.name} — préfixe ${g.bestCode} déjà correct  (${memberLabel})`)
        }
      } else {
        report.action('reuse', 'site', `${g.name} ↔ ${memberLabel}`)
      }
    } else {
      report.action('create', 'site', `${g.name} → slug "${g.slug}"${g.bestCode != null ? `, préfixe ${g.bestCode}` : ''}  (${memberLabel})`)
      if (commit) {
        if (!prefixAvailable && g.bestCode != null) { report.conflict(`Commit bloqué : "${g.name}" a un préfixe mais la migration 015 n'est pas appliquée.`); continue }
        const row = { name: g.name, slug: g.slug }
        if (prefixAvailable && g.bestCode != null) row.registration_prefix = g.bestCode
        const { data, error } = await supabase.from('sites').insert(row).select('id').single()
        if (error) { report.warn(`Échec création site "${g.name}" : ${error.message}`); continue }
        for (const lk of g.legacyKeys) setMapping(idMap, 'sites', lk, data.id)
        if (g.bestCode != null) prefixOwner.set(g.bestCode, g.name)
      }
    }
  }
}

// ─── Orchestration ──────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv)
  const dump = loadDump(args.dump)
  const supabase = getAdminClient()
  const idMap = loadIdMap()
  const aliases = loadAliases()
  const report = createReport('00 — Référentiels', { commit: args.commit })

  await resolveLevels(supabase, report, idMap)
  await resolveAcademicYears(supabase, report, dump, idMap)
  await resolveSites(supabase, report, dump, idMap, args.commit, aliases)

  report.print()

  if (report.hasBlockingConflicts() && args.commit) {
    console.error('Des conflits bloquants subsistent — id-map non sauvegardée. Corrige puis relance.')
    process.exit(1)
  }
  if (args.commit) {
    saveIdMap(idMap)
    console.log('Table de correspondance (id-map) sauvegardée.')
  }
}

main().catch(err => {
  console.error('\nÉchec du module 00 :', err.message)
  process.exit(1)
})
