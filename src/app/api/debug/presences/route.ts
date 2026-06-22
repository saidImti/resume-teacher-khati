// TEMPORAIRE — supprimer après diagnostic
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminSupabaseClient()

  const [
    { data: sites,  error: sitesErr  },
    { data: groups, error: groupsErr },
    { data: allGroups, error: allGroupsErr },
  ] = await Promise.all([
    supabase.from('sites').select('id, name, is_active, user_id').eq('user_id', user.id),
    admin.from('groups').select('id, name, is_active, site_id').eq('is_active', true),
    admin.from('groups').select('id, name, is_active, site_id'),
  ])

  const siteIds = (sites ?? []).map((s) => s.id)

  const { data: groupsForSites, error: groupsForSitesErr } = siteIds.length > 0
    ? await admin.from('groups').select('id, name, is_active, site_id').in('site_id', siteIds)
    : { data: [], error: null }

  return NextResponse.json({
    userId: user.id,
    sites: { data: sites, error: sitesErr?.message },
    siteIds,
    allGroups: { count: allGroups?.length, data: allGroups, error: allGroupsErr?.message },
    activeGroups: { count: groups?.length, data: groups, error: groupsErr?.message },
    groupsForUserSites: { count: groupsForSites?.length, data: groupsForSites, error: groupsForSitesErr?.message },
  })
}
