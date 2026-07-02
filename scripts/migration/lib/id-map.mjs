// ============================================================
// lib/id-map.mjs — Table de correspondance ancien id → UUID Postgres
// Persistée sur disque pour que les modules suivants (01, 03, 04…)
// retrouvent les entités créées par les modules précédents.
// Fichier : scripts/migration/.state/id-map.json (git-ignoré).
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const STATE_PATH = resolve(process.cwd(), 'scripts/migration/.state/id-map.json')

export function loadIdMap() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export function saveIdMap(map) {
  const dir = dirname(STATE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(STATE_PATH, JSON.stringify(map, null, 2), 'utf-8')
}

// map[entity][legacyKey] = uuid   (ex. map.sites["maisonalfort"] = "…uuid…")
export function setMapping(map, entity, legacyKey, uuid) {
  if (!map[entity]) map[entity] = {}
  map[entity][legacyKey] = uuid
}

export function getMapping(map, entity, legacyKey) {
  return map[entity]?.[legacyKey] ?? null
}
