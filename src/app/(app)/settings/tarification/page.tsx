import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getOrgContext } from '@/lib/org'
import { getSites } from '@/lib/supabase/queries'
import { monthlyForFamily } from '@/lib/pricing'
import { TarificationManager } from './TarificationManager'
import type { PricingRule, Site } from '@/types'

export const metadata: Metadata = { title: 'Tarification — Paramètres' }

export default async function TarificationPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/auth/login')

  const admin = createAdminSupabaseClient()
  const orgId = ctx.organizationId

  const [sites, { data: rules }, { data: families }] = await Promise.all([
    getSites(admin, orgId),
    admin
      .from('pricing_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('effective_from', { ascending: false }),
    admin
      .from('families')
      .select('id, parent1_first, parent1_last, primary_site_id, custom_monthly_rate, custom_rate_note, registration_number, students(id, status)')
      .eq('organization_id', orgId)
      .eq('is_active', true),
  ])

  // Une seule regle active par site (la plus recente si effective_from se chevauche)
  const ruleBySite = new Map<string, PricingRule>()
  for (const r of (rules ?? []) as PricingRule[]) {
    if (!ruleBySite.has(r.site_id)) ruleBySite.set(r.site_id, r)
  }

  // Stats par site : familles actives, enfants actifs, revenu mensuel effectif
  const siteStats = new Map<string, { families: number; children: number; monthly: number }>()
  for (const fam of families ?? []) {
    const siteId = fam.primary_site_id
    if (!siteId) continue
    const activeChildren = (fam.students ?? []).filter((s) => s.status === 'active' || s.status === 'trial').length
    if (activeChildren === 0) continue
    const rule = ruleBySite.get(siteId)
    const monthly = fam.custom_monthly_rate && fam.custom_monthly_rate > 0
      ? fam.custom_monthly_rate
      : rule ? monthlyForFamily(rule, activeChildren) : 0
    const cur = siteStats.get(siteId) ?? { families: 0, children: 0, monthly: 0 }
    cur.families += 1
    cur.children += activeChildren
    cur.monthly += monthly
    siteStats.set(siteId, cur)
  }

  const familiesWithSpecialRate = (families ?? [])
    .filter((f) => f.custom_monthly_rate && f.custom_monthly_rate > 0)
    .map((f) => ({
      id: f.id,
      name: `${f.parent1_first} ${f.parent1_last}`.trim(),
      registration_number: f.registration_number,
      custom_monthly_rate: f.custom_monthly_rate,
      custom_rate_note: f.custom_rate_note,
      students_count: Array.isArray(f.students) ? f.students.length : 0,
    }))

  const totalMonthly = Array.from(siteStats.values()).reduce((s, v) => s + v.monthly, 0)

  return (
    <div className="p-6">
      <TarificationManager
        sites={sites as Site[]}
        initialRules={Array.from(ruleBySite.entries()).map(([siteId, rule]) => ({ siteId, rule }))}
        siteStats={Array.from(siteStats.entries()).map(([siteId, stats]) => ({
          siteId,
          ...stats,
          pctRevenue: totalMonthly > 0 ? Math.round((stats.monthly / totalMonthly) * 100) : 0,
        }))}
        familiesWithSpecialRate={familiesWithSpecialRate}
        totalMonthly={totalMonthly}
        isAdmin={ctx.role === 'admin'}
      />
    </div>
  )
}
