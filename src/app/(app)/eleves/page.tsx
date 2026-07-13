import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
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
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [sites, students, stats, families, pricingRules, invoices] = await Promise.all([
    getSites(admin, orgId),
    getStudents(admin, orgId).catch(() => []),
    getStudentStats(admin, orgId).catch(() => null),
    getFamilies(admin, orgId).catch(() => []),
    getPricingRules(admin, orgId).catch(() => []),
    getInvoices(admin, orgId).catch(() => []),
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
