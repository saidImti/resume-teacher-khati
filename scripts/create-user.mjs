/**
 * Script de création du compte Teacher Khati
 * Lancer depuis le dossier du projet : node scripts/create-user.mjs
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

const EMAIL    = 'teacher@khati.fr'
const PASSWORD = 'TeacherKhati2026!'

async function createUser() {
  console.log('\n🔧 Résumé Teacher Khati — Création du compte initial\n')

  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=10`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  })
  const listData = await listRes.json()

  if (listData.users?.length > 0) {
    console.log('✅ Des comptes existent déjà :')
    listData.users.forEach(u => console.log(`   • ${u.email}`))
    return
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  })
  const data = await res.json()
  if (data.id) console.log('\n🎉 Compte créé ! Email:', EMAIL, '— Password:', PASSWORD)
  else console.error('❌ Erreur :', data)
}

createUser().catch(console.error)
