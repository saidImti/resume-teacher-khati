type PublicSupabaseEnv = {
  url: string
  anonKey: string
}

type AdminSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function normalizeSupabaseUrl(rawUrl: string): string {
  const url = rawUrl.trim().replace(/\/+$/, '')

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must look like https://project-ref.supabase.co without /rest/v1, /auth/v1, or a trailing slash'
    )
  }

  return url
}

function getProjectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? ''
}

function decodeLegacyJwtPayload(key: string): { ref?: string; role?: string } | null {
  try {
    const payload = key.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
    const decoded = typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8')

    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function assertLegacyJwtMatchesProject(key: string, url: string, name: string): void {
  if (!key.startsWith('eyJ')) return

  const payload = decodeLegacyJwtPayload(key)
  const expectedRef = getProjectRefFromUrl(url)

  if (payload?.ref && payload.ref !== expectedRef) {
    throw new Error(`${name} belongs to Supabase project ${payload.ref}, but NEXT_PUBLIC_SUPABASE_URL points to ${expectedRef}`)
  }
}

function assertBrowserKey(key: string, url: string): void {
  if (key.startsWith('sb_secret_')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must never contain a Supabase secret key')
  }

  if (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase publishable key or legacy anon JWT')
  }

  assertLegacyJwtMatchesProject(key, url, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

function assertServiceRoleKey(key: string, url: string): void {
  if (key.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must not contain a publishable key')
  }

  if (!key.startsWith('sb_secret_') && !key.startsWith('eyJ')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key or legacy service_role JWT')
  }

  assertLegacyJwtMatchesProject(key, url, 'SUPABASE_SERVICE_ROLE_KEY')
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = normalizeSupabaseUrl(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'))
  const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  assertBrowserKey(anonKey, url)

  return { url, anonKey }
}

export function getAdminSupabaseEnv(): AdminSupabaseEnv {
  const publicEnv = getPublicSupabaseEnv()
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKey(serviceRoleKey, publicEnv.url)

  return { ...publicEnv, serviceRoleKey }
}
