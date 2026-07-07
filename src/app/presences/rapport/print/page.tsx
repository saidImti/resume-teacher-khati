import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { buildAttendanceReport } from '@/lib/attendance-report'
import { getLogoUrl, getSignatories } from '@/lib/branding'
import { PrintAttendanceClient } from '@/components/presences/PrintAttendanceClient'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; siteId?: string; groupId?: string }>
}

export default async function PrintAttendancePage({ searchParams }: PageProps) {
  const { from, to, siteId, groupId } = await searchParams

  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    redirect('/presences')
  }

  const admin = createAdminSupabaseClient()
  const [report, { data: site }, { data: group }, logoUrl, signatories] = await Promise.all([
    // buildAttendanceReport passe à organizationId à l'étape « routes de données »
    buildAttendanceReport(admin, { userId: ctx.user.id, from, to, siteId, groupId }),
    siteId ? admin.from('sites').select('name').eq('id', siteId).single() : Promise.resolve({ data: null }),
    groupId ? admin.from('groups').select('name, level:levels(emoji)').eq('id', groupId).single() : Promise.resolve({ data: null }),
    getLogoUrl(admin, ctx.organizationId).catch(() => null),
    getSignatories(admin, ctx.organizationId).catch(() => []),
  ])

  return (
    <PrintAttendanceClient
      report={report}
      siteName={(site as { name: string } | null)?.name ?? null}
      groupName={(group as { name: string } | null)?.name ?? null}
      logoUrl={logoUrl}
      signatories={signatories}
    />
  )
}
