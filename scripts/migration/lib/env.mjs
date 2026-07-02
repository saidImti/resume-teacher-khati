// ============================================================
// lib/env.mjs — Chargement des variables d'environnement + client admin
// Convention alignée sur scripts/audit-env.mjs (ESM, .env.local).
// Partagé par tous les modules de migration.
// ============================================================
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Charge .env.local sans écraser les variables déjà définies dans l'environnement.
export function loadEnvFile(path = resolve(process.cwd(), '.env.local')) {
  try {
    const env = readFileSync(path, 'utf-8')
    for (const line of env.split(/\r?\n/)) {
      if (!line || line.trimStart().startsWith('#') || !line.includes('=')) continue
      const index = line.indexOf('=')
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      if (key && process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    // .env.local est optionnel (CI / Vercel). On échouera plus loin si une clé manque.
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

// Client admin (service role) — bypass RLS, comme dans le reste de RTK.
export function getAdminClient() {
  loadEnvFile()
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY contient une clé publishable — clé secrète attendue')
  }
  if (!serviceRoleKey.startsWith('sb_secret_') && !serviceRoleKey.startsWith('eyJ')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY doit être une clé secrète (sb_secret_) ou un JWT legacy')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
