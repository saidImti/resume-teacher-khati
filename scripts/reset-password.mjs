/**
 * Script de réinitialisation du mot de passe
 * Lancer : node scripts/reset-password.mjs
 *
 * Prérequis dans .env.local :
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=sb_secret_xxxx
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variables manquantes dans .env.local : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const NEW_PASSWORD = 'TeacherKhati2026!'

async function resetPassword() {
  console.log('\n🔐 Résumé Teacher Khati — Réinitialisation du mot de passe\n')
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=10`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  })
  const { users } = await listRes.json()
  if (!users?.length) { console.log("❌ Aucun compte trouvé."); return }

  const user = users[0]
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: NEW_PASSWORD }),
  })
  const data = await res.json()
  if (data.id) console.log('\n✅ Mot de passe réinitialisé pour', user.email)
  else console.error('❌ Erreur :', data)
}

resetPassword().catch(console.error)
