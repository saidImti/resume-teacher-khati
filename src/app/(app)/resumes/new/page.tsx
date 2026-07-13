import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getLevels, getGroupsBySite, getActiveAcademicYear } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/Header'
import { ResumeWizard } from '@/components/resume/ResumeWizard'
import type { Group, Level, Site } from '@/types'

export const metadata: Metadata = { title: 'Nouveau cours' }

interface PageProps {
  searchParams: Promise<{ groupId?: string }>
}

export default async function NewResumePage({ searchParams }: PageProps) {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  const params = await searchParams

  // Chargement des données en parallèle
  const [sites, levels, academicYear] = await Promise.all([
    getSites(admin, orgId),
    getLevels(admin, orgId),
    getActiveAcademicYear(admin, orgId).catch(() => null),
  ])

  // Groupes par site avec enrichissement du niveau
  interface GroupWithLevel extends Group {
    level?: Level
  }
  interface GroupsBySiteItem {
    site: Site
    groups: GroupWithLevel[]
  }

  const groupsBySite: GroupsBySiteItem[] = []

  for (const site of sites) {
    const groups = academicYear
      ? await getGroupsBySite(admin, orgId, site.id, academicYear.id)
      : []

    const enrichedGroups: GroupWithLevel[] = groups.map((group) => ({
      ...group,
      level: levels.find((l) => l.id === group.level_id),
    }))

    groupsBySite.push({ site, groups: enrichedGroups })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Nouveau cours"
        subtitle="Générer un résumé pour les parents"
      />

      <div className="flex-1 overflow-y-auto">
        <ResumeWizard
          groupsBySite={groupsBySite}
          defaultGroupId={params.groupId}
          academicYearId={academicYear?.id}
        />
      </div>
    </div>
  )
}
