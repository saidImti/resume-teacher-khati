import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getFamilies, getInvoices, getPricingRules, getSites, getStudents } from '@/lib/supabase/queries'
import { FamiliesPaymentsContent } from '@/components/eleves/FamiliesPaymentsContent'

export const metadata: Metadata = { title: 'Familles & paiements' }

export default async function FamiliesPaymentsPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()
  const now = new Date()
  const [sites, students, families, pricingRules, invoices] = await Promise.all([
    getSites(admin, orgId), getStudents(admin, orgId).catch(() => []), getFamilies(admin, orgId).catch(() => []),
    getPricingRules(admin, orgId).catch(() => []), getInvoices(admin, orgId).catch(() => []),
  ])
  return <FamiliesPaymentsContent sites={sites} students={students} families={families} pricingRules={pricingRules} invoices={invoices} currentMonth={now.getMonth() + 1} currentYear={now.getFullYear()} />
}
