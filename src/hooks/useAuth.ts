'use client'

import { useEffect, useState } from 'react'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { useSupabase } from './useSupabase'
import type { User } from '@/types'

interface AuthState {
  user: SupabaseUser | null
  profile: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState {
  const supabase = useSupabase()
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
          isAuthenticated: true,
        })
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    })

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  async function fetchProfile(userId: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data as User | null
  }

  return state
}
