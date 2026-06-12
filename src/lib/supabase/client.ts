'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Client Supabase côté navigateur (pour les composants client)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton pour éviter les multiples instances
let client: ReturnType<typeof createClient> | undefined

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient()
  }
  return client
}
