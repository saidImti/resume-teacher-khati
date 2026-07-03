import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getLogoUrl, getSignatories } from '@/lib/branding'
import { BrandingClient } from '@/components/settings/BrandingClient'

// Le layout /settings fournit déjà le Header + la barre d'onglets SettingsNav.
export default async function MarquePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminSupabaseClient()
  const [logoUrl, signatories] = await Promise.all([
    getLogoUrl(admin, user.id).catch(() => null),
    getSignatories(admin, user.id).catch(() => []),
  ])

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
      <BrandingClient initialLogoUrl={logoUrl} initialSignatories={signatories} />
    </main>
  )
}
