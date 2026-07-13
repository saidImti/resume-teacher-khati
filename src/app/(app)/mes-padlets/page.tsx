import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getLevels, getGroupsBySite, getActiveAcademicYear } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/Header'
import { PadletPageLayout } from '@/components/padlet/PadletPageLayout'
import type { Group, Level } from '@/types'

export const metadata: Metadata = { title: 'Mes Padlets' }

export default async function MesPadletsPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  const [sites, levels, academicYear] = await Promise.all([
    getSites(admin, orgId),
    getLevels(admin, orgId),
    getActiveAcademicYear(admin, orgId).catch(() => null),
  ])

  interface GroupWithLevel extends Group { level?: Level }

  const groupOptions: Array<{
    id: string; name: string; levelName: string
    levelSlug: string; siteId: string; siteName: string
  }> = []

  for (const site of sites) {
    const groups: GroupWithLevel[] = academicYear
      ? (await getGroupsBySite(admin, orgId, site.id, academicYear.id)).map((g) => ({
          ...g, level: levels.find((l) => l.id === g.level_id),
        }))
      : []

    for (const group of groups) {
      groupOptions.push({
        id: group.id, name: group.name,
        levelName: group.level?.name ?? 'Niveau',
        levelSlug: group.level?.slug ?? '',
        siteId: site.id, siteName: site.name,
      })
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Mes Padlets"
        subtitle="Gérez vos Padlets, générez des idées de cours et retrouvez vos résumés"
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fade-in">
          <PadletPageLayout
            groupOptions={groupOptions}
            levels={levels}
            sites={sites}
          />
        </div>
      </div>
    </div>
  )
}
