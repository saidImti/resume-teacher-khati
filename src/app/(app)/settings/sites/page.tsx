import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { SitesManager } from './SitesManager'
import type { Site } from '@/types'

export default async function SitesSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const { data: sites } = await admin
    .from('sites')
    .select('*')
    .order('name')

  return (
    <div className="p-6">
      <SitesManager initialSites={(sites ?? []) as Site[]} />
    </div>
  )
}
