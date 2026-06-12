'use client'

import { useMemo } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Hook pour accéder au client Supabase dans les composants client
export function useSupabase() {
  const client = useMemo(() => getSupabaseBrowserClient(), [])
  return client
}
