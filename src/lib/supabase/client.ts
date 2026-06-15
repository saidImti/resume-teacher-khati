'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { getPublicSupabaseEnv } from './env'

export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv()

  return createBrowserClient<Database>(url, anonKey)
}

let client: ReturnType<typeof createClient> | undefined

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient()
  }

  return client
}
