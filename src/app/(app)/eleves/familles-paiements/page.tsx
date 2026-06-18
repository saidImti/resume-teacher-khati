import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getFamilies, getInvoices, getPricingRules, getSites, getStudents } from '@/lib/supabase/queries'
import { FamiliesPaymentsContent } from '@/components/eleves/FamiliesPaymentsContent'

export const metadata: Metadata = { title: 'Familles & paiements' }

export default async function FamiliesPaymentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()
  const now = new Date()
  const [sites, students, families, pricingRules, invoices] = await Promise.all([
    getSites(admin), getStudents(admin).catch(() => []), getFamilies(admin).catch(() => []),
    getPricingRules(admin).catch(() => []), getInvoices(admin).catch(() => []),
  ])
  return <FamiliesPaymentsContent sites={sites} students={students} families={families} pricingRules={pricingRules} invoices={invoices} currentMonth={now.getMonth() + 1} currentYear={now.getFullYear()} />
}
