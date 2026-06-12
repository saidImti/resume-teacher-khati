import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getLevels, getGroupsBySite, getActiveAcademicYear, getStudentStats, getSchedulesByDay, getInvoices } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/Header'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import type { Group } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Chargement des données en parallèle
  const currentYear = new Date().getFullYear()

  const [sites, levels, academicYear, studentStats, schedulesByDay, invoices] = await Promise.all([
    getSites(supabase),
    getLevels(supabase),
    getActiveAcademicYear(supabase).catch(() => null),
    getStudentStats(supabase).catch(() => null),
    getSchedulesByDay(supabase).catch(() => ({})),
    getInvoices(supabase, { year: currentYear }).catch(() => []),
  ])

  // Groupes pour chaque site
  const groupsBySite: Record<string, Group[]> = {}
  await Promise.all(
    sites.map(async (site) => {
      if (academicYear) {
        const groups = await getGroupsBySite(supabase, site.id, academicYear.id)
        groupsBySite[site.id] = groups
      } else {
        groupsBySite[site.id] = []
      }
    })
  )

  const totalGroups = Object.values(groupsBySite).flat().length
  const todayDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Dashboard"
        subtitle={todayDate.charAt(0).toUpperCase() + todayDate.slice(1)}
        action={{ label: 'Nouveau cours', href: '/resumes/new' }}
      />

      <div className="flex-1 overflow-y-auto">
        <DashboardContent
          sites={sites}
          levels={levels}
          groupsBySite={groupsBySite}
          academicYear={academicYear}
          totalGroups={totalGroups}
          studentStats={studentStats}
          schedulesByDay={schedulesByDay}
          invoices={invoices}
        />
      </div>
    </div>
  )
}
