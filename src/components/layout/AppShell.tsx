import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

// Server Component : récupère le profil utilisateur pour la sidebar
export async function AppShell({ children }: AppShellProps) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName: string | undefined
  let userEmail: string | undefined

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    userName  = profile?.full_name ?? user.email?.split('@')[0]
    userEmail = user.email ?? undefined
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} userEmail={userEmail} />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
