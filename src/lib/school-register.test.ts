import { describe, expect, it } from 'vitest'
import { buildSchoolRegister } from './school-register'
import type { Family, Invoice, PricingRule, Site, Student } from '@/types'

const site = { id: 'site-1', name: 'Centre' } as Site
const rule = {
  id: 'rule-1',
  site_id: site.id,
  billing_type: 'monthly_family',
  price_1_child: 50,
  price_2_children: 40,
  price_3_children: 35,
  is_active: true,
  effective_from: '2020-01-01',
} as PricingRule
const family = {
  id: 'family-1',
  parent1_first: 'Sarah',
  parent1_last: 'Martin',
  is_active: true,
  custom_monthly_rate: null,
} as Family
const students = [
  { id: 'student-1', family_id: family.id, site_id: site.id, status: 'active' },
  { id: 'student-2', family_id: family.id, site_id: site.id, status: 'trial' },
] as Student[]

describe('buildSchoolRegister', () => {
  it('calculates the sibling rate and prioritizes missing invoices', () => {
    const rows = buildSchoolRegister({
      families: [family],
      students,
      pricingRules: [rule],
      invoices: [],
      sites: [site],
      month: 6,
      year: 2026,
    })

    expect(rows[0]?.expectedMonthly).toBe(80)
    expect(rows[0]?.paymentStatus).toBe('missing_invoice')
  })

  it('applies a special family rate over the standard grid', () => {
    const rows = buildSchoolRegister({
      families: [{ ...family, custom_monthly_rate: 55, custom_rate_note: 'Tarif solidaire' }],
      students,
      pricingRules: [rule],
      invoices: [],
      sites: [site],
      month: 6,
      year: 2026,
    })

    expect(rows[0]?.normalMonthly).toBe(80)
    expect(rows[0]?.expectedMonthly).toBe(55)
    expect(rows[0]?.hasSpecialRate).toBe(true)
  })

  it('places overdue families before paid families', () => {
    const secondFamily = { ...family, id: 'family-2', parent1_last: 'Durand' }
    const invoices = [
      {
        id: 'invoice-paid',
        family_id: family.id,
        period_month: 6,
        period_year: 2026,
        amount_due: 80,
        amount_paid: 80,
        status: 'paid',
      },
      {
        id: 'invoice-overdue',
        family_id: secondFamily.id,
        period_month: 6,
        period_year: 2026,
        amount_due: 50,
        amount_paid: 0,
        status: 'overdue',
      },
    ] as Invoice[]

    const rows = buildSchoolRegister({
      families: [family, secondFamily],
      students: [
        students[0]!,
        { ...students[1]!, family_id: secondFamily.id },
      ],
      pricingRules: [rule],
      invoices,
      sites: [site],
      month: 6,
      year: 2026,
    })

    expect(rows[0]?.family?.id).toBe(secondFamily.id)
    expect(rows[0]?.paymentStatus).toBe('overdue')
    expect(rows[1]?.paymentStatus).toBe('paid')
  })
})
