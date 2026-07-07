// ============================================================
// test-data.ts — Génération et purge de données de test
// Portée : 3 sites canoniques (fusion Fiche Inscription, cf.
// AUDIT_FUSION_TEACHER_KHATI.md §11). Toute donnée créée porte le
// marqueur TEST_TAG_PREFIX dans `notes` pour purge fiable et isolée
// des vraies données — jamais de suppression par ancienneté ou par nom.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export const TEST_TAG_PREFIX = 'TEST_MODE::'
// Compatible avec l'ancien tag du script CLI (scripts/migration/seed-test-students.mjs)
// pour qu'un seul bouton "Purger" nettoie les deux origines.
const TEST_TAG_MATCH_PATTERN = 'TEST%'

const CANONICAL_SITE_NAMES = ['Maison-Alfort', 'Champigny Taxi Phone', "Maison Pour Tous Bois l'Abbé"]
const WED = 2 // day_of_week : 0=Lundi … 2=Mercredi
const SAT = 5 // … 5=Samedi

const PRENOMS_G = ['Léo', 'Adam', 'Nathan', 'Lucas', 'Gabriel', 'Malo', 'Ethan', 'Sacha', 'Younes', 'Elias']
const PRENOMS_F = ['Léa', 'Nina', 'Inaya', 'Camille', 'Zoé', 'Manon', 'Yasmine', 'Chloé', 'Alice', 'Rania']
const NOMS = ['Dubois', 'Faye', 'Nguyen', 'Kaci', 'Moreau', 'Diarra', 'Petit', 'Haddad', 'Rousseau', 'Cissé']

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T
}

function randomDOBInRange(ageMin: number, ageMax: number): string {
  const today = new Date()
  const age = ageMin + Math.floor(Math.random() * (ageMax - ageMin + 1))
  const year = today.getFullYear() - age
  const month = 1 + Math.floor(Math.random() * 12)
  const day = 1 + Math.floor(Math.random() * 28)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>

export interface TestDataStatus {
  families: number
  students: number
  enrollments: number
  bySite: { site: string; color: string; students: number }[]
  byLevel: { level: string; emoji: string; color: string; students: number }[]
  active: boolean
}

export async function getTestDataStatus(admin: AnySupabase, organizationId: string): Promise<TestDataStatus> {
  const [{ count: families }, { count: students }, { count: enrollments }] = await Promise.all([
    admin.from('families').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN),
    admin.from('students').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN),
    admin.from('enrollments').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN),
  ])

  const { data: studentsDetail } = await admin
    .from('students')
    .select('site_id, level_id, sites(name, color), levels(name, emoji, color, sort_order)')
    .eq('organization_id', organizationId)
    .ilike('notes', TEST_TAG_MATCH_PATTERN)

  const bySiteMap = new Map<string, { count: number; color: string }>()
  const byLevelMap = new Map<string, { count: number; order: number; emoji: string; color: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (studentsDetail ?? []) as any[]) {
    const siteName = row.sites?.name ?? 'Sans site'
    const siteEntry = bySiteMap.get(siteName) ?? { count: 0, color: row.sites?.color ?? '#6366f1' }
    bySiteMap.set(siteName, { ...siteEntry, count: siteEntry.count + 1 })
    const levelName = row.levels?.name ?? 'Sans niveau'
    const levelEntry = byLevelMap.get(levelName) ?? {
      count: 0,
      order: row.levels?.sort_order ?? 99,
      emoji: row.levels?.emoji ?? '🌟',
      color: row.levels?.color ?? '#f59e0b',
    }
    byLevelMap.set(levelName, { ...levelEntry, count: levelEntry.count + 1 })
  }

  return {
    families: families ?? 0,
    students: students ?? 0,
    enrollments: enrollments ?? 0,
    bySite: [...bySiteMap.entries()]
      .map(([site, v]) => ({ site, color: v.color, students: v.count }))
      .sort((a, b) => a.site.localeCompare(b.site, 'fr')),
    byLevel: [...byLevelMap.entries()]
      .map(([level, v]) => ({ level, emoji: v.emoji, color: v.color, students: v.count, order: v.order }))
      .sort((a, b) => a.order - b.order)
      .map(({ level, emoji, color, students }) => ({ level, emoji, color, students })),
    active: (students ?? 0) > 0,
  }
}

export interface GenerateOptions {
  studentsPerGroup: number
}

export interface GenerateResult {
  families: number
  students: number
  enrollments: number
  groupsCreated: number
  groupsReused: number
  schedulesCreated: number
  schedulesReused: number
  tag: string
}

export interface TestDataContext {
  organizationId: string
  /** Trace user_id sur les inserts (NOT NULL jusqu'à la migration 019). */
  userId: string
}

export async function generateTestStudents(admin: AnySupabase, ctx: TestDataContext, opts: GenerateOptions): Promise<GenerateResult> {
  const { organizationId, userId } = ctx
  const studentsPerGroup = Math.min(Math.max(opts.studentsPerGroup, 1), 30)
  const tag = `${TEST_TAG_PREFIX}${new Date().toISOString()}`

  const [{ data: sites }, { data: levels }, { data: years }] = await Promise.all([
    admin.from('sites').select('id, name').eq('organization_id', organizationId),
    admin.from('levels').select('id, name, age_min, age_max, sort_order').eq('organization_id', organizationId).order('sort_order'),
    admin.from('academic_years').select('id, name, is_active').eq('organization_id', organizationId),
  ])
  const activeYear = (years ?? []).find((y: { is_active: boolean }) => y.is_active)
  if (!activeYear) throw new Error('Aucune année scolaire active.')

  const targetSites = (sites ?? []).filter((s: { name: string }) => CANONICAL_SITE_NAMES.includes(s.name))
  if (targetSites.length !== CANONICAL_SITE_NAMES.length) {
    throw new Error(`Sites canoniques attendus : ${CANONICAL_SITE_NAMES.join(', ')} — trouvés : ${targetSites.map((s: { name: string }) => s.name).join(', ')}`)
  }

  const { data: existingGroups } = await admin.from('groups').select('id, site_id, level_id').eq('organization_id', organizationId)
  const { data: existingSchedules } = await admin.from('schedules').select('id, group_id, day_of_week').eq('organization_id', organizationId)
  const groups = [...(existingGroups ?? [])]
  const schedules = [...(existingSchedules ?? [])]

  let groupsCreated = 0, groupsReused = 0, schedulesCreated = 0, schedulesReused = 0
  let totalFamilies = 0, totalStudents = 0, totalEnrollments = 0
  let levelSlot = 0

  for (const site of targetSites) {
    for (const level of levels ?? []) {
      let groupId: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const foundGroup = groups.find((g: any) => g.site_id === site.id && g.level_id === level.id)
      if (foundGroup) {
        groupId = foundGroup.id
        groupsReused++
      } else {
        const { data: newGroup, error } = await admin
          .from('groups')
          .insert({ organization_id: organizationId, site_id: site.id, level_id: level.id, academic_year_id: activeYear.id, name: level.name, is_active: true })
          .select('id')
          .single()
        if (error) throw new Error(`Création groupe ${site.name}/${level.name} : ${error.message}`)
        groupId = newGroup.id
        groups.push({ id: groupId, site_id: site.id, level_id: level.id })
        groupsCreated++
      }

      const baseHour = 9 + Math.floor(levelSlot / 2)
      const baseMin = (levelSlot % 2) * 45
      const start = `${String(baseHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')}:00`
      const endMin = baseMin + 45
      const end = `${String(baseHour + Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`
      levelSlot++

      for (const day of [WED, SAT]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasSchedule = schedules.some((s: any) => s.group_id === groupId && s.day_of_week === day)
        if (hasSchedule) { schedulesReused++; continue }
        const { error } = await admin.from('schedules').insert({
          organization_id: organizationId, user_id: userId, group_id: groupId, site_id: site.id, day_of_week: day,
          start_time: start, end_time: end, room: site.name, max_students: 15, is_active: true,
        })
        if (error) throw new Error(`Création créneau ${site.name}/${level.name} : ${error.message}`)
        schedules.push({ id: 'new', group_id: groupId, day_of_week: day })
        schedulesCreated++
      }

      for (let i = 0; i < studentsPerGroup; i++) {
        const isGirl = i % 2 === 0
        const prenom = isGirl ? pick(PRENOMS_F, i) : pick(PRENOMS_G, i)
        const nom = pick(NOMS, i + levelSlot)
        const dob = randomDOBInRange(level.age_min, level.age_max)

        const { data: fam, error: famErr } = await admin.from('families').insert({
          organization_id: organizationId, user_id: userId, parent1_first: `Parent-${prenom}`, parent1_last: nom,
          primary_site_id: site.id, notes: tag,
        }).select('id').single()
        if (famErr) continue
        totalFamilies++

        const { data: stu, error: stuErr } = await admin.from('students').insert({
          organization_id: organizationId, user_id: userId, family_id: fam.id, first_name: prenom, last_name: nom,
          date_of_birth: dob, gender: isGirl ? 'F' : 'M', site_id: site.id, level_id: level.id,
          status: 'active', enrollment_date: new Date().toISOString().split('T')[0], notes: tag,
        }).select('id').single()
        if (stuErr) continue
        totalStudents++

        const { error: enrErr } = await admin.from('enrollments').insert({
          organization_id: organizationId, user_id: userId, student_id: stu.id, group_id: groupId, academic_year_id: activeYear.id,
          status: 'active', notes: tag,
        })
        if (!enrErr) totalEnrollments++
      }
    }
  }

  return {
    families: totalFamilies, students: totalStudents, enrollments: totalEnrollments,
    groupsCreated, groupsReused, schedulesCreated, schedulesReused, tag,
  }
}

export interface PurgeResult {
  families: number
  students: number
  enrollments: number
}

// Supprime uniquement les familles/élèves/enrollments marqués test.
// Les groupes/créneaux créés ne sont PAS supprimés : ce sont de vraies
// structures pédagogiques réutilisables pour la rentrée, indépendantes
// des familles fictives qui les ont temporairement occupées.
export async function purgeTestData(admin: AnySupabase, organizationId: string): Promise<PurgeResult> {
  const { data: enr } = await admin.from('enrollments').delete().eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN).select('id')
  const { data: stu } = await admin.from('students').delete().eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN).select('id')
  const { data: fam } = await admin.from('families').delete().eq('organization_id', organizationId).ilike('notes', TEST_TAG_MATCH_PATTERN).select('id')
  return { families: fam?.length ?? 0, students: stu?.length ?? 0, enrollments: enr?.length ?? 0 }
}
