// ============================================================
// Requêtes Supabase réutilisables — Phase 1
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Site, Level, Group, Session, Resume,
  Activity, AcademicYear, SiteStats,
  Family, Student, Enrollment, Schedule,
  PricingRule, Invoice, Payment, StudentStats,
} from '@/types'

// ─── SITES ───────────────────────────────────────────────────

export async function getSites(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data as Site[]
}

export async function getSiteBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as Site
}

// ─── LEVELS ──────────────────────────────────────────────────

export async function getLevels(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .order('sort_order')

  if (error) throw error
  return data as Level[]
}

// ─── ACADEMIC YEARS ──────────────────────────────────────────

export async function getActiveAcademicYear(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data as AcademicYear
}

export async function getAcademicYears(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw error
  return data as AcademicYear[]
}

// ─── GROUPS ──────────────────────────────────────────────────

export async function getGroupsBySite(
  supabase: SupabaseClient,
  siteId: string,
  academicYearId?: string
) {
  let query = supabase
    .from('groups')
    .select(`
      *,
      level:levels(*),
      site:sites(*)
    `)
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('level_id')
    .order('name')

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Group[]
}

export async function getGroupById(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      level:levels(*),
      site:sites(*),
      academic_year:academic_years(*)
    `)
    .eq('id', groupId)
    .single()

  if (error) throw error
  return data as Group
}

// ─── SESSIONS ────────────────────────────────────────────────

export async function getSessionsByGroup(
  supabase: SupabaseClient,
  groupId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .order('session_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Session[]
}

export async function getSessionById(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      group:groups(
        *,
        level:levels(*),
        site:sites(*)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data as Session
}

export async function createSession(
  supabase: SupabaseClient,
  payload: {
    group_id: string
    session_date: string
    title?: string
    theme?: string
    notes?: string
  }
) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Session
}

// ─── RÉSUMÉS ─────────────────────────────────────────────────

export async function getCurrentResume(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await supabase
    .from('resumes')
    .select('*, sections:resume_sections(*)')
    .eq('session_id', sessionId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as Resume | null
}

export async function getResumeById(
  supabase: SupabaseClient,
  resumeId: string
) {
  const { data, error } = await supabase
    .from('resumes')
    .select('*, sections:resume_sections(*), session:sessions(*, group:groups(*, level:levels(*), site:sites(*)))')
    .eq('id', resumeId)
    .single()

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as unknown as Resume
}

// ─── ACTIVITÉS ───────────────────────────────────────────────

export async function getActivities(
  supabase: SupabaseClient,
  filters?: { levelId?: string; skill?: string; tag?: string }
) {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('is_public', true)
    .order('usage_count', { ascending: false })

  if (filters?.levelId) {
    query = query.contains('level_ids', [filters.levelId])
  }
  if (filters?.skill) {
    query = query.contains('skills', [filters.skill])
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag])
  }

  const { data, error } = await query
  if (error) throw error
  return data as Activity[]
}

// ─── STATISTIQUES DASHBOARD ──────────────────────────────────

export async function getSiteStats(
  supabase: SupabaseClient,
  siteId: string,
  academicYearId: string
): Promise<SiteStats> {
  const [sitesRes, groupsRes, sessionsRes, resumesRes] = await Promise.all([
    supabase.from('sites').select('*').eq('id', siteId).single(),
    supabase.from('groups').select('id, is_active')
      .eq('site_id', siteId)
      .eq('academic_year_id', academicYearId),
    supabase.from('sessions')
      .select('id, session_date, group:groups!inner(site_id)')
      .eq('groups.site_id', siteId)
      .gte('session_date', getWeekStart()),
    supabase.from('resumes')
      .select('id, status, session:sessions!inner(group:groups!inner(site_id))')
      .eq('sessions.groups.site_id', siteId)
      .eq('is_current', true),
  ])

  const groups = groupsRes.data ?? []
  const sessions = sessionsRes.data ?? []
  const resumes = resumesRes.data ?? []

  return {
    site: sitesRes.data as Site,
    groups_count: groups.length,
    active_groups_count: groups.filter(g => g.is_active).length,
    sessions_this_week: sessions.length,
    resumes_pending: resumes.filter(r => r.status === 'draft' || r.status === 'reviewed').length,
    resumes_sent_total: resumes.filter(r => r.status === 'sent').length,
  }
}

// ─── UTILS ───────────────────────────────────────────────────

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Lundi
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0] ?? ''
}

// ============================================================
// GESTION SCOLAIRE — Familles, Élèves, Planning, Finances
// ============================================================

// ─── FAMILLES ────────────────────────────────────────────────

export async function getFamilies(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('families')
    .select('*, site:sites(*), students(*)')
    .order('parent1_last')
  if (error) throw error
  return (data ?? []) as Family[]
}

export async function getFamilyById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('families')
    .select('*, site:sites(*), students(*, site:sites(*), level:levels(*))' )
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Family
}

export async function upsertFamily(
  supabase: SupabaseClient,
  family: Partial<Family> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('families')
    .upsert(family)
    .select()
    .single()
  if (error) throw error
  return data as Family
}

export async function deleteFamily(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('families').delete().eq('id', id)
  if (error) throw error
}

// ─── ÉLÈVES ──────────────────────────────────────────────────

export async function getStudents(supabase: SupabaseClient, filters?: {
  siteId?: string
  status?: string
  levelId?: string
}) {
  let q = supabase
    .from('students')
    .select('*, site:sites(*), level:levels(*), family:families(parent1_first,parent1_last,parent1_phone)')
    .order('last_name')

  if (filters?.siteId)  q = q.eq('site_id',  filters.siteId)
  if (filters?.status)  q = q.eq('status',   filters.status)
  if (filters?.levelId) q = q.eq('level_id', filters.levelId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Student[]
}

export async function getStudentById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*, site:sites(*), level:levels(*), family:families(*), enrollments(*, group:groups(*, level:levels(*)))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Student
}

export async function upsertStudent(
  supabase: SupabaseClient,
  student: Partial<Student> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('students')
    .upsert(student)
    .select()
    .single()
  if (error) throw error
  return data as Student
}

export async function deleteStudent(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}

export async function getStudentStats(supabase: SupabaseClient): Promise<StudentStats> {
  const [allRes, sitesRes, levelsRes] = await Promise.all([
    supabase.from('students').select('status, site_id, level_id, enrollment_date, departure_date'),
    supabase.from('sites').select('*'),
    supabase.from('levels').select('*'),
  ])

  const all     = allRes.data     ?? []
  const sites   = (sitesRes.data  ?? []) as Site[]
  const levels  = (levelsRes.data ?? []) as Level[]

  const total     = all.length
  const active    = all.filter(s => s.status === 'active').length
  const trial     = all.filter(s => s.status === 'trial').length
  const departed  = all.filter(s => s.status === 'departed').length
  const suspended = all.filter(s => s.status === 'suspended').length

  const bySite = sites.map(site => ({
    site,
    active:   all.filter(s => s.site_id === site.id && (s.status === 'active' || s.status === 'trial')).length,
    departed: all.filter(s => s.site_id === site.id && s.status === 'departed').length,
  }))

  const byLevel = levels.map(level => ({
    level,
    count: all.filter(s => s.level_id === level.id && s.status !== 'departed').length,
  }))

  const byDay: StudentStats['byDay'] = []

  const monthlyEvolution: StudentStats['monthlyEvolution'] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })
    const monthStr = d.toISOString().slice(0, 7)

    const enrolled = all.filter(s => s.enrollment_date?.startsWith(monthStr)).length
    const dep      = all.filter(s => s.departure_date?.startsWith(monthStr)).length
    const t        = all.filter(s => {
      const enrolled_before = s.enrollment_date <= monthStr + '-31'
      const not_departed    = !s.departure_date || s.departure_date > monthStr + '-01'
      return enrolled_before && not_departed
    }).length

    monthlyEvolution.push({ month: label, enrolled, departed: dep, total: t })
  }

  return { total, active, trial, departed, suspended, bySite, byLevel, byDay, monthlyEvolution }
}

// ─── INSCRIPTIONS ────────────────────────────────────────────

export async function getEnrollmentsByStudent(supabase: SupabaseClient, studentId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, group:groups(*, site:sites(*), level:levels(*))')
    .eq('student_id', studentId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Enrollment[]
}

export async function upsertEnrollment(
  supabase: SupabaseClient,
  enrollment: Partial<Enrollment> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert(enrollment)
    .select()
    .single()
  if (error) throw error
  return data as Enrollment
}

// ─── PLANNING ────────────────────────────────────────────────

export async function getSchedules(supabase: SupabaseClient, siteId?: string) {
  let q = supabase
    .from('schedules')
    .select('*, group:groups(*, level:levels(*)), site:sites(*)')
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')
  if (siteId) q = q.eq('site_id', siteId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Schedule[]
}

export async function getSchedulesByDay(supabase: SupabaseClient, siteId?: string) {
  const schedules = await getSchedules(supabase, siteId)
  const byDay: Record<number, Schedule[]> = {}
  for (let d = 0; d <= 6; d++) {
    byDay[d] = schedules.filter(s => s.day_of_week === d)
  }
  return byDay
}

export async function upsertSchedule(
  supabase: SupabaseClient,
  schedule: Partial<Schedule> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(schedule)
    .select()
    .single()
  if (error) throw error
  return data as Schedule
}

export async function deleteSchedule(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}

// ─── TARIFS ──────────────────────────────────────────────────

export async function getPricingRules(supabase: SupabaseClient, siteId?: string) {
  let q = supabase
    .from('pricing_rules')
    .select('*, site:sites(*)')
    .order('effective_from', { ascending: false })
  if (siteId) q = q.eq('site_id', siteId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as PricingRule[]
}

export async function getActivePricingRule(supabase: SupabaseClient, siteId: string) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*, site:sites(*)')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_until.is.null,effective_until.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data as PricingRule
}

export async function upsertPricingRule(
  supabase: SupabaseClient,
  rule: Partial<PricingRule> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .upsert(rule)
    .select()
    .single()
  if (error) throw error
  return data as PricingRule
}

// ─── CALCUL DU MONTANT (helper) ───────────────────────────────

export function computeMonthlyAmount(
  rule: PricingRule,
  nbActiveChildren: number,
  sessionsInMonth = 4
): number {
  if (rule.billing_type === 'per_session') {
    return (rule.price_per_session ?? 0) * nbActiveChildren * sessionsInMonth
  }
  if (rule.billing_type === 'monthly_family') {
    const rates: (number | null)[] = [
      rule.price_1_child,
      rule.price_2_children,
      rule.price_3_children,
      rule.price_4_children,
      rule.price_5plus,
    ]
    const idx  = Math.min(nbActiveChildren - 1, 4)
    const rate = rates[idx] ?? 0
    return rate * nbActiveChildren
  }
  return 0
}

// ─── FACTURES ────────────────────────────────────────────────

export async function getInvoices(supabase: SupabaseClient, filters?: {
  familyId?: string
  status?: string
  year?: number
  month?: number
}) {
  let q = supabase
    .from('invoices')
    .select('*, family:families(parent1_first,parent1_last), site:sites(name,color)')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (filters?.familyId) q = q.eq('family_id', filters.familyId)
  if (filters?.status)   q = q.eq('status',    filters.status)
  if (filters?.year)     q = q.eq('period_year',  filters.year)
  if (filters?.month)    q = q.eq('period_month', filters.month)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Invoice[]
}

export async function getInvoiceById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, family:families(*), site:sites(*), payments(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Invoice
}

export async function upsertInvoice(
  supabase: SupabaseClient,
  invoice: Partial<Invoice> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('invoices')
    .upsert(invoice)
    .select()
    .single()
  if (error) throw error
  return data as Invoice
}

// ─── PAIEMENTS ───────────────────────────────────────────────

export async function getPaymentsByFamily(supabase: SupabaseClient, familyId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(invoice_number, period_month, period_year)')
    .eq('family_id', familyId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Payment[]
}

export async function upsertPayment(
  supabase: SupabaseClient,
  payment: Partial<Payment> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('payments')
    .upsert(payment)
    .select()
    .single()
  if (error) throw error
  return data as Payment
}

// ─── STATS FINANCIÈRES ───────────────────────────────────────

export async function getRevenueStats(supabase: SupabaseClient, year: number) {
  const { data, error } = await supabase
    .from('invoices')
    .select('period_month, amount_due, amount_paid, status, site:sites(name,color)')
    .eq('period_year', year)
    .order('period_month')
  if (error) throw error
  return data ?? []
}
