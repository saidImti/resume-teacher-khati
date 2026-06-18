import type { Family, Invoice, PricingRule, Site, Student } from '@/types'
import { computeMonthlyAmount } from './supabase/queries'

export type RegisterPaymentStatus =
  | 'overdue'
  | 'partial'
  | 'pending'
  | 'missing_invoice'
  | 'paid'
  | 'no_pricing'
  | 'no_charge'

export interface SchoolRegisterRow {
  id: string
  family: Family | null
  students: Student[]
  familyName: string
  parentPhone: string | null
  parentEmail: string | null
  siteIds: string[]
  siteNames: string[]
  expectedMonthly: number
  normalMonthly: number
  hasSpecialRate: boolean
  specialRateNote: string | null
  invoiced: number
  paid: number
  remaining: number
  paymentStatus: RegisterPaymentStatus
  priority: number
  invoiceCount: number
  paymentInvoiceId: string | null
}

interface RegisterInput {
  families: Family[]
  students: Student[]
  pricingRules: PricingRule[]
  invoices: Invoice[]
  sites: Site[]
  month: number
  year: number
}

const CURRENT_STUDENT_STATUSES = new Set(['active', 'trial'])

export function buildSchoolRegister({
  families,
  students,
  pricingRules,
  invoices,
  sites,
  month,
  year,
}: RegisterInput): SchoolRegisterRow[] {
  const today = new Date().toISOString().slice(0, 10)
  const siteNameById = new Map(sites.map(site => [site.id, site.name]))
  const activeRuleBySite = new Map<string, PricingRule>()

  pricingRules
    .filter(rule =>
      rule.is_active &&
      rule.effective_from <= today &&
      (!rule.effective_until || rule.effective_until >= today)
    )
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
    .forEach(rule => {
      if (!activeRuleBySite.has(rule.site_id)) activeRuleBySite.set(rule.site_id, rule)
    })

  const currentStudents = students.filter(student => CURRENT_STUDENT_STATUSES.has(student.status))
  const studentsByFamily = new Map<string, Student[]>()
  const allStudentsByFamily = new Map<string, Student[]>()
  students.forEach(student => {
    if (!student.family_id) return
    const familyStudents = allStudentsByFamily.get(student.family_id) ?? []
    familyStudents.push(student)
    allStudentsByFamily.set(student.family_id, familyStudents)
  })
  currentStudents.forEach(student => {
    if (!student.family_id) return
    const familyStudents = studentsByFamily.get(student.family_id) ?? []
    familyStudents.push(student)
    studentsByFamily.set(student.family_id, familyStudents)
  })

  const invoiceByFamily = new Map<string, Invoice[]>()
  invoices
    .filter(invoice =>
      invoice.period_month === month &&
      invoice.period_year === year &&
      invoice.status !== 'cancelled'
    )
    .forEach(invoice => {
      const current = invoiceByFamily.get(invoice.family_id) ?? []
      current.push(invoice)
      invoiceByFamily.set(invoice.family_id, current)
    })

  const rows: SchoolRegisterRow[] = families
    .filter(family => family.is_active && (allStudentsByFamily.get(family.id)?.length ?? 0) > 0)
    .map(family => createRow(
      family.id,
      family,
      allStudentsByFamily.get(family.id) ?? [],
      invoiceByFamily.get(family.id) ?? [],
      activeRuleBySite,
      siteNameById,
      studentsByFamily.get(family.id) ?? []
    ))

  currentStudents
    .filter(student => !student.family_id)
    .forEach(student => {
      rows.push(createRow(
        `student:${student.id}`,
        null,
        [student],
        [],
        activeRuleBySite,
        siteNameById
      ))
    })

  return rows.sort((a, b) =>
    a.priority - b.priority ||
    b.remaining - a.remaining ||
    a.familyName.localeCompare(b.familyName, 'fr')
  )
}

function createRow(
  id: string,
  family: Family | null,
  students: Student[],
  invoices: Invoice[],
  activeRuleBySite: Map<string, PricingRule>,
  siteNameById: Map<string, string>,
  billingStudents = students
): SchoolRegisterRow {
  const countsBySite = new Map<string, number>()
  billingStudents.forEach(student => {
    const siteId = student.site_id ?? family?.primary_site_id
    if (siteId) countsBySite.set(siteId, (countsBySite.get(siteId) ?? 0) + 1)
  })

  const normalMonthly = Array.from(countsBySite.entries()).reduce((total, [siteId, childCount]) => {
    const rule = activeRuleBySite.get(siteId)
    return total + (rule ? computeMonthlyAmount(rule, childCount) : 0)
  }, 0)
  const hasSpecialRate = family?.custom_monthly_rate !== null &&
    family?.custom_monthly_rate !== undefined
  const expectedMonthly = hasSpecialRate
    ? Number(family?.custom_monthly_rate ?? 0)
    : normalMonthly
  const invoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due), 0)
  const paid = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_paid), 0)
  const remaining = Math.max(invoiced - paid, 0)
  const hasOverdue = invoices.some(invoice => invoice.status === 'overdue')
  const hasPartial = invoices.some(invoice => invoice.status === 'partial')
  const hasPending = invoices.some(invoice => invoice.status === 'pending')
  const paymentInvoice = invoices.find(invoice =>
    Number(invoice.amount_due) > Number(invoice.amount_paid)
  ) ?? invoices[0]

  let paymentStatus: RegisterPaymentStatus
  let priority: number
  if (hasOverdue) {
    paymentStatus = 'overdue'
    priority = 1
  } else if (hasPartial || (paid > 0 && remaining > 0)) {
    paymentStatus = 'partial'
    priority = 2
  } else if (hasPending || remaining > 0) {
    paymentStatus = 'pending'
    priority = 3
  } else if (invoices.length === 0 && expectedMonthly > 0) {
    paymentStatus = 'missing_invoice'
    priority = 4
  } else if (invoiced > 0 && remaining === 0) {
    paymentStatus = 'paid'
    priority = 6
  } else if (expectedMonthly === 0 && countsBySite.size > 0) {
    paymentStatus = 'no_pricing'
    priority = 5
  } else {
    paymentStatus = 'no_charge'
    priority = 7
  }

  const siteIds = Array.from(countsBySite.keys())

  return {
    id,
    family,
    students,
    familyName: family
      ? `${family.parent1_first} ${family.parent1_last}`
      : `Dossier sans famille · ${students[0]?.first_name ?? ''} ${students[0]?.last_name ?? ''}`.trim(),
    parentPhone: family?.parent1_phone ?? null,
    parentEmail: family?.parent1_email ?? null,
    siteIds,
    siteNames: siteIds.map(siteId => siteNameById.get(siteId) ?? 'Site inconnu'),
    expectedMonthly,
    normalMonthly,
    hasSpecialRate,
    specialRateNote: family?.custom_rate_note ?? null,
    invoiced,
    paid,
    remaining,
    paymentStatus,
    priority,
    invoiceCount: invoices.length,
    paymentInvoiceId: paymentInvoice?.id ?? null,
  }
}
