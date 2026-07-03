import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getLogoUrl } from '@/lib/branding'
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
  let logoUrl: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    userName  = profile?.full_name ?? user.email?.split('@')[0]
    userEmail = user.email ?? undefined
    logoUrl   = await getLogoUrl(createAdminSupabaseClient(), user.id).catch(() => null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={userName} userEmail={userEmail} logoUrl={logoUrl} />

      {/* Contenu principal */}
      <main className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
