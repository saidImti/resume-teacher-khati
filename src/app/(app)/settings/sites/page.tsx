import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { SitesManager } from './SitesManager'
import type { Site } from '@/types'

export default async function SitesSettingsPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const { data: sites } = await admin
    .from('sites')
    .select('*')
    .eq('organization_id', ctx.organizationId)
    .order('name')

  return (
    <div className="p-6">
      <SitesManager initialSites={(sites ?? []) as Site[]} />
    </div>
  )
}
