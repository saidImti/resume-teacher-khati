// ============================================================
// lib/normalize.mjs — Helpers de normalisation texte
// Partagés par tous les modules (matching noms, slugs, téléphones…).
// ============================================================

// Retire les diacritiques : "Maison-Alfort" garde le tiret, "École" → "Ecole".
export function stripDiacritics(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Clé de matching : minuscules, sans accents, sans caractère non alphanumérique.
// "Maison-Alfort" == "Maison Alfort" == "maison  alfort" → "maisonalfort".
export function matchKey(s) {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Nom d'affichage nettoyé : trim + espaces internes réduits à un seul.
export function cleanName(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ')
}

// Slug URL : minuscules, sans accents, non-alphanumériques → tirets.
export function toSlug(s) {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

// Slug unique dans un ensemble existant (ajoute -2, -3… si collision).
export function uniqueSlug(base, taken) {
  let slug = base || 'site'
  if (!taken.has(slug)) return slug
  let n = 2
  while (taken.has(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}
