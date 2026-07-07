import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites, getPricingRules, getInvoices, getRevenueStats, getFamilies } from '@/lib/supabase/queries'
import { FinancesContent } from '@/components/finances/FinancesContent'

export const metadata: Metadata = { title: 'Finances' }

export default async function FinancesPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')
  const orgId = ctx.organizationId
  const admin = createAdminSupabaseClient()

  const currentYear = new Date().getFullYear()

  const [sites, pricingRules, invoices, revenueStats, families] = await Promise.all([
    getSites(admin, orgId),
    getPricingRules(admin, orgId).catch(() => []),
    getInvoices(admin, orgId).catch(() => []),
    getRevenueStats(admin, orgId, currentYear).catch(() => []),
    getFamilies(admin, orgId).catch(() => []),
  ])

  return (
    <FinancesContent
      sites={sites}
      pricingRules={pricingRules}
      invoices={invoices}
      revenueStats={revenueStats}
      currentYear={currentYear}
      families={families}
    />
  )
}
