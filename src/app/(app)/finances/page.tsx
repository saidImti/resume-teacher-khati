import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSites, getPricingRules, getInvoices, getRevenueStats } from '@/lib/supabase/queries'
import { FinancesContent } from '@/components/finances/FinancesContent'

export const metadata: Metadata = { title: 'Finances' }

export default async function FinancesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const currentYear = new Date().getFullYear()

  const [sites, pricingRules, invoices, revenueStats] = await Promise.all([
    getSites(supabase),
    getPricingRules(supabase).catch(() => []),
    getInvoices(supabase).catch(() => []),
    getRevenueStats(supabase, currentYear).catch(() => []),
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
