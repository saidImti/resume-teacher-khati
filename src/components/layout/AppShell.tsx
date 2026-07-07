import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getLogoUrl, getOrganizationName } from '@/lib/branding'
import { getOrgContext } from '@/lib/org'
import { Sidebar } from './Sidebar'
import type { OrgRole } from '@/lib/with-api-auth'

interface AppShellProps {
  children: React.ReactNode
}

// Server Component : récupère le profil utilisateur + l'identité de
// l'organisation (logo, nom) pour la sidebar
export async function AppShell({ children }: AppShellProps) {
  const ctx = await getOrgContext()

  let userName: string | undefined
  let userEmail: string | undefined
  let logoUrl: string | null = null
  let orgName: string | null = null
  let role: OrgRole | undefined

  if (ctx) {
    const admin = createAdminSupabaseClient()
    const [{ data: profile }, logo, name] = await Promise.all([
      admin.from('users').select('full_name').eq('id', ctx.user.id).maybeSingle(),
      getLogoUrl(admin, ctx.organizationId).catch(() => null),
      getOrganizationName(admin, ctx.organizationId).catch(() => null),
    ])

    userName  = profile?.full_name ?? ctx.user.email?.split('@')[0]
    userEmail = ctx.user.email ?? undefined
    logoUrl   = logo
    orgName   = name
    role      = ctx.role
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={userName} userEmail={userEmail} logoUrl={logoUrl} orgName={orgName} role={role} />

      {/* Contenu principal */}
      <main className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
