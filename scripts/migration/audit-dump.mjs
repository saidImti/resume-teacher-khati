// ============================================================
// audit-dump.mjs — Audit qualité des données legacy AVANT migration
// Lecture seule. Contrôles : doublons familles, contacts manquants,
// dates invalides, niveaux inconnus, enfants sans créneau,
// cohérence des paiements (total de contrôle financier — audit §9.1).
//
// Usage : node scripts/migration/audit-dump.mjs --dump=<fichier.json>
// ============================================================
import { loadDump } from './lib/legacy-dump.mjs'
import { matchKey, cleanName } from './lib/normalize.mjs'

const NIVEAUX = ['Preschoolers', 'Kids', 'Juniors', 'Tweens', 'Teenagers']
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function parseArgs(argv) {
  for (const a of argv.slice(2)) if (a.startsWith('--dump=')) return a.slice('--dump='.length)
  return null
}

function normPhone(t) {
  return String(t ?? '').replace(/[^0-9+]/g, '').replace(/^\+33/, '0')
}

function isValidDate(s) {
  if (!s || typeof s !== 'string') return false
  const d = new Date(s)
  return !isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2030
}

const dumpPath = parseArgs(process.argv)
const dump = loadDump(dumpPath)
const inscriptions = dump.inscriptions()
const paiements = dump.data.tk_paiements ?? {}

const issues = { critique: [], important: [], mineur: [] }
const push = (sev, msg) => issues[sev].push(msg)

// ─── 1. Doublons de familles (téléphone / email normalisés) ───
const byPhone = new Map(), byEmail = new Map()
for (const i of inscriptions) {
  const nom = `${cleanName(i.parent?.prenom)} ${cleanName(i.parent?.nom)}`.trim() || '(sans nom)'
  const tel = normPhone(i.parent?.tel)
  const email = String(i.parent?.email ?? '').trim().toLowerCase()
  if (tel && tel.length >= 9) {
    if (!byPhone.has(tel)) byPhone.set(tel, [])
    byPhone.get(tel).push({ id: i.id, nom, annee: i.annee, statut: i.statut })
  }
  if (email && email.includes('@')) {
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email).push({ id: i.id, nom, annee: i.annee })
  }
}
for (const [tel, list] of byPhone) {
  if (list.length > 1) {
    const noms = [...new Set(list.map(x => x.nom))]
    push(noms.length > 1 ? 'critique' : 'important',
      `Téléphone ${tel} partagé par ${list.length} inscriptions${noms.length > 1 ? ` (noms DIFFÉRENTS : ${noms.join(' / ')})` : ` (même famille : ${noms[0]} — doublon probable)`}`)
  }
}
for (const [email, list] of byEmail) {
  if (list.length > 1) {
    const noms = [...new Set(list.map(x => x.nom))]
    if (noms.length > 1) push('important', `Email ${email} partagé par des noms différents : ${noms.join(' / ')}`)
  }
}

// ─── 2. Contacts manquants ────────────────────────────────────
let sansTel = 0, sansEmail = 0, sansAdresse = 0
for (const i of inscriptions) {
  const nom = `${cleanName(i.parent?.prenom)} ${cleanName(i.parent?.nom)}`.trim() || `(id ${i.id})`
  if (!normPhone(i.parent?.tel) || normPhone(i.parent?.tel).length < 9) { sansTel++; push('important', `Sans téléphone valide : ${nom}`) }
  if (!String(i.parent?.email ?? '').includes('@')) sansEmail++
  if (!cleanName(i.parent?.adresse)) sansAdresse++
}

// ─── 3. Enfants : DDN, niveaux, créneaux ──────────────────────
let ddnInvalides = 0, niveauxInconnus = 0, sansCreneau = 0, joursInconnus = 0
for (const i of inscriptions) {
  for (const e of i.enfants ?? []) {
    const nomE = `${cleanName(e.prenom)} ${cleanName(e.nom)}`.trim() || '(enfant sans nom)'
    if (e.ddn && !isValidDate(e.ddn)) { ddnInvalides++; push('important', `DDN invalide "${e.ddn}" : ${nomE} (famille ${cleanName(i.parent?.nom)})`) }
    if (e.niveau && !NIVEAUX.includes(e.niveau)) { niveauxInconnus++; push('important', `Niveau inconnu "${e.niveau}" : ${nomE}`) }
    if (!e.jour || !e.hdebut) sansCreneau++
    else if (!JOURS.includes(e.jour)) { joursInconnus++; push('important', `Jour inconnu "${e.jour}" : ${nomE}`) }
  }
}

// ─── 4. Statuts et départs ────────────────────────────────────
let actifs = 0, partis = 0, statutsAutres = 0
for (const i of inscriptions) {
  if (i.statut === 'actif') actifs++
  else if (i.statut === 'inactif' || i.dateDepart) partis++
  else statutsAutres++
}

// ─── 5. Total de contrôle financier (audit §9.1) ──────────────
let totalPaye = 0, nbCellules = 0, cellulesOrphelines = 0
const idsInsc = new Set(inscriptions.map(i => String(i.id)))
for (const [inscId, mois] of Object.entries(paiements)) {
  const orphan = !idsInsc.has(String(inscId))
  for (const [ym, cell] of Object.entries(mois ?? {})) {
    if (!cell || typeof cell !== 'object') continue
    nbCellules++
    if (orphan) cellulesOrphelines++
    if (cell.statut === 'paye' || cell.statut === 'partiel') {
      const m = Number(cell.montant ?? cell.montantPaye ?? 0)
      if (!isNaN(m)) totalPaye += m
    }
  }
}
if (cellulesOrphelines > 0) push('critique', `${cellulesOrphelines} cellule(s) de paiement pointent vers des inscriptions INEXISTANTES (orphelines)`)

// ─── 6. Champs structurels pour la migration ──────────────────
let sansNumero = 0, sansLieu = 0, idsDupliques = 0
const seenIds = new Set()
for (const i of inscriptions) {
  if (!i.numeroInscription) sansNumero++
  if (!cleanName(i.lieu)) { sansLieu++; push('critique', `Inscription sans lieu : ${cleanName(i.parent?.nom)} (id ${i.id})`) }
  if (seenIds.has(String(i.id))) { idsDupliques++; push('critique', `ID d'inscription dupliqué : ${i.id}`) }
  seenIds.add(String(i.id))
}

// ─── Rapport ──────────────────────────────────────────────────
const enfantsTotal = inscriptions.reduce((n, i) => n + (i.enfants?.length ?? 0), 0)
console.log('\n━━━ AUDIT QUALITÉ DES DONNÉES LEGACY ━━━\n')
console.log(`Périmètre : ${inscriptions.length} inscriptions · ${enfantsTotal} enfants · ${Object.keys(paiements).length} familles avec paiements`)
console.log(`Statuts   : ${actifs} actifs · ${partis} partis · ${statutsAutres} autres`)
console.log(`Structure : ${sansNumero} sans N° inscription · ${sansLieu} sans lieu · ${idsDupliques} IDs dupliqués`)
console.log(`Contacts  : ${sansTel} sans tél valide · ${sansEmail} sans email · ${sansAdresse} sans adresse`)
console.log(`Enfants   : ${ddnInvalides} DDN invalides · ${niveauxInconnus} niveaux inconnus · ${sansCreneau} sans jour/horaire · ${joursInconnus} jours inconnus`)
console.log(`\n💰 TOTAL DE CONTRÔLE FINANCIER (payé+partiel, toutes années) : ${totalPaye.toFixed(2)} €`)
console.log(`   (${nbCellules} cellules de paiement au total — ce montant devra être retrouvé À L'IDENTIQUE côté RTK après le Module 04)`)

for (const [sev, label, icon] of [['critique', 'CRITIQUES', '🔴'], ['important', 'IMPORTANTS', '🟡'], ['mineur', 'MINEURS', '🟢']]) {
  const list = issues[sev]
  if (!list.length) continue
  console.log(`\n${icon} ${label} (${list.length})`)
  const max = 25
  list.slice(0, max).forEach(m => console.log(`   • ${m}`))
  if (list.length > max) console.log(`   … et ${list.length - max} autres`)
}
if (!issues.critique.length && !issues.important.length) console.log('\n✅ Aucun problème critique ou important détecté.')
console.log('')
