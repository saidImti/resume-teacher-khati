import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getPricingRules, getInvoices, getRevenueStats } from '@/lib/supabase/queries'
import { FinancesContent } from '@/components/finances/FinancesContent'

export const metadata: Metadata = { title: 'Finances' }

export default async function FinancesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const admin = createAdminSupabaseClient()

  const currentYear = new Date().getFullYear()

  const [sites, pricingRules, invoices, revenueStats] = await Promise.all([
    getSites(admin),
    getPricingRules(admin).catch(() => []),
    getInvoices(admin).catch(() => []),
    getRevenueStats(admin, currentYear).catch(() => []),
  ])

  return (
    <FinancesContent
      sites={sites}
      pricingRules={pricingRules}
      invoices={invoices}
      revenueStats={revenueStats}
      currentYear={currentYear}
    />
  )
}
