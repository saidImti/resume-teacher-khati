import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getFamilies,
  getInvoices,
  getPricingRules,
  getSites,
  getStudents,
  getStudentStats,
} from '@/lib/supabase/queries'
import { ElevesContent } from '@/components/eleves/ElevesContent'

export const metadata: Metadata = { title: 'Élèves' }

export default async function ElevesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [sites, students, stats, families, pricingRules, invoices] = await Promise.all([
    getSites(admin),
    getStudents(admin).catch(() => []),
    getStudentStats(admin).catch(() => null),
    getFamilies(admin).catch(() => []),
    getPricingRules(admin).catch(() => []),
    getInvoices(admin).catch(() => []),
  ])

  return (
    <ElevesContent
      sites={sites}
      students={students}
      stats={stats}
      families={families}
      pricingRules={pricingRules}
      invoices={invoices}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  )
}
