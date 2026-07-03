import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAttendanceReport } from '@/lib/attendance-report'
import { PrintAttendanceClient } from '@/components/presences/PrintAttendanceClient'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; siteId?: string; groupId?: string }>
}

export default async function PrintAttendancePage({ searchParams }: PageProps) {
  const { from, to, siteId, groupId } = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    redirect('/presences')
  }

  const admin = createAdminSupabaseClient()
  const [report, { data: site }, { data: group }] = await Promise.all([
    buildAttendanceReport(admin, { userId: user.id, from, to, siteId, groupId }),
    siteId ? admin.from('sites').select('name').eq('id', siteId).single() : Promise.resolve({ data: null }),
    groupId ? admin.from('groups').select('name, level:levels(emoji)').eq('id', groupId).single() : Promise.resolve({ data: null }),
  ])

  return (
    <PrintAttendanceClient
      report={report}
      siteName={(site as { name: string } | null)?.name ?? null}
      groupName={(group as { name: string } | null)?.name ?? null}
    />
  )
}
