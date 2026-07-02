// ============================================================
// lib/legacy-dump.mjs — Lecture du dump JSON exporté de Fiche Inscription
// Le dump est produit par le bouton "⬇ Export migration" ajouté à
// dashboard.html. Structure : { _meta, data: { tk_dashboard, tk_sites, … } }.
// Ce module lit, valide et expose des accesseurs propres. Il ne touche
// jamais à Supabase (lecture de fichier uniquement).
// ============================================================
import { readFileSync } from 'node:fs'
import { cleanName, matchKey } from './normalize.mjs'

export function loadDump(path) {
  if (!path) throw new Error('Chemin du dump manquant (argument --dump=<fichier.json>)')
  let raw
  try {
    raw = readFileSync(path, 'utf-8')
  } catch (e) {
    throw new Error(`Impossible de lire le dump : ${path} (${e.message})`)
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Dump JSON invalide : ${e.message}`)
  }
  // Tolère deux formes : { data: {...} } (export enrichi) ou {...} (localStorage brut).
  const data = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
  return new LegacyDump(data, parsed._meta ?? null)
}

class LegacyDump {
  constructor(data, meta) {
    this.data = data ?? {}
    this.meta = meta
  }

  inscriptions() {
    return Array.isArray(this.data.tk_dashboard) ? this.data.tk_dashboard : []
  }

  // Map legacy { "Champigny": { code: 10 }, … }
  sitesCodes() {
    const s = this.data.tk_sites
    return s && typeof s === 'object' && !Array.isArray(s) ? s : {}
  }

  lieuxAutocomplete() {
    return Array.isArray(this.data.tk_lieux) ? this.data.tk_lieux : []
  }

  anneesUtilisees() {
    const set = new Set()
    for (const insc of this.inscriptions()) {
      if (insc && insc.annee) set.add(cleanName(insc.annee))
    }
    return [...set].sort()
  }

  // Reproduit la logique legacy getSiteCode() : match exact puis préfixe.
  codeForLieu(lieuName) {
    const codes = this.sitesCodes()
    if (codes[lieuName] && codes[lieuName].code != null) return Number(codes[lieuName].code)
    const lk = matchKey(lieuName)
    for (const [k, v] of Object.entries(codes)) {
      const kk = matchKey(k)
      if (v && v.code != null && (lk.startsWith(kk) || kk.startsWith(lk))) return Number(v.code)
    }
    return null
  }

  // Sites réels = union des lieux utilisés par les inscriptions + des clés
  // de tk_sites qui portent un code. Les défauts génériques de tk_lieux
  // (Domicile, Crèche…) ne sont PAS inclus s'ils ne sont pas réellement utilisés.
  // Regroupe par clé de matching pour fusionner "Paris 11" et "paris 11 ".
  collectRealSites() {
    const byKey = new Map()

    const add = (rawName, source) => {
      const name = cleanName(rawName)
      if (!name) return
      const key = matchKey(name)
      if (!key) return
      if (!byKey.has(key)) {
        byKey.set(key, { matchKey: key, names: new Set(), code: null, count: 0, sources: new Set() })
      }
      const entry = byKey.get(key)
      entry.names.add(name)
      entry.sources.add(source)
    }

    for (const insc of this.inscriptions()) {
      if (!insc || !insc.lieu) continue
      add(insc.lieu, 'inscription')
      byKey.get(matchKey(cleanName(insc.lieu))).count += 1
    }
    // Clés de tk_sites (codes) — même si aucune inscription ne les utilise.
    for (const rawName of Object.keys(this.sitesCodes())) add(rawName, 'tk_sites')

    // Résolution du code pour chaque site regroupé.
    for (const entry of byKey.values()) {
      for (const name of entry.names) {
        const code = this.codeForLieu(name)
        if (code != null) { entry.code = code; break }
      }
      // Nom d'affichage privilégié : le plus fréquent / premier stable.
      entry.displayName = [...entry.names].sort((a, b) => a.localeCompare(b))[0]
      entry.sources = [...entry.sources]
      entry.names = [...entry.names]
    }

    return [...byKey.values()].sort((a, b) => b.count - a.count)
  }
}
