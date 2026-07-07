import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getLogoUrl, getSignatories } from '@/lib/branding'
import { BrandingClient } from '@/components/settings/BrandingClient'

// Le layout /settings fournit déjà le Header + la barre d'onglets SettingsNav.
export default async function MarquePage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminSupabaseClient()
  const [logoUrl, signatories] = await Promise.all([
    getLogoUrl(admin, ctx.organizationId).catch(() => null),
    getSignatories(admin, ctx.organizationId).catch(() => []),
  ])

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
      <BrandingClient initialLogoUrl={logoUrl} initialSignatories={signatories} />
    </main>
  )
}
