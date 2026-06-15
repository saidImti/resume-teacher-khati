import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile(path) {
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
    // .env.local is optional in CI and Vercel.
  }
}

function summarize(name) {
  const value = process.env[name]?.trim() ?? ''

  return {
    name,
    present: value.length > 0,
    length: value.length,
    prefix: value ? value.slice(0, Math.min(16, value.length)) : '',
    suffix: value ? value.slice(Math.max(0, value.length - 6)) : '',
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function projectRefFromUrl(value) {
  return new URL(value).hostname.split('.')[0]
}

function decodeJwtPayload(value) {
  try {
    const payload = value.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')

    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

function assertLegacyJwtProject(value, name) {
  if (!value.startsWith('eyJ')) return

  const payload = decodeJwtPayload(value)
  const expectedRef = projectRefFromUrl(url)

  assert(
    !payload?.ref || payload.ref === expectedRef,
    `${name} belongs to Supabase project ${payload?.ref}, but NEXT_PUBLIC_SUPABASE_URL points to ${expectedRef}`
  )
}

loadEnvFile(resolve(process.cwd(), '.env.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '') ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

console.table([
  summarize('NEXT_PUBLIC_SUPABASE_URL'),
  summarize('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  summarize('SUPABASE_SERVICE_ROLE_KEY'),
  summarize('OPENAI_API_KEY'),
])

assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url), 'Invalid NEXT_PUBLIC_SUPABASE_URL format')
assert(!anonKey.startsWith('sb_secret_'), 'NEXT_PUBLIC_SUPABASE_ANON_KEY contains a secret key')
assert(
  anonKey.startsWith('sb_publishable_') || anonKey.startsWith('eyJ'),
  'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a publishable key or legacy anon JWT'
)
assertLegacyJwtProject(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
assert(!serviceRoleKey.startsWith('sb_publishable_'), 'SUPABASE_SERVICE_ROLE_KEY contains a publishable key')
assert(
  serviceRoleKey.startsWith('sb_secret_') || serviceRoleKey.startsWith('eyJ'),
  'SUPABASE_SERVICE_ROLE_KEY must be a secret key or legacy service_role JWT'
)
assertLegacyJwtProject(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY')

const res = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: anonKey },
})

if (!res.ok) {
  const body = await res.text()
  throw new Error(`Supabase public key check failed: HTTP ${res.status} ${body.slice(0, 160)}`)
}

console.log('Supabase public URL/key check: OK')
