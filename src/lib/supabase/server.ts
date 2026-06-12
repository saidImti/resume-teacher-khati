import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase côté serveur (Server Components, API Routes, Actions)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createServerSupabaseClient(): Promise<ReturnType<typeof createServerClient<any>>> {
  const cookieStore = await cookies()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignoré en Server Components read-only
          }
        },
      },
    }
  )
}

// Client admin avec service role (pour les opérations sensibles)
export function createAdminSupabaseClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createClient } = require('@supabase/supabase-js')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
