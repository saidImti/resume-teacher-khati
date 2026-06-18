import type { Group, Schedule, Student } from '@/types'

export interface GroupCapacity {
  groupId: string
  siteId: string
  siteName: string
  levelId: string
  levelName: string
  levelEmoji: string
  groupName: string
  capacity: number
  occupied: number
  available: number
  occupancyRate: number
  isFull: boolean
}

export interface CapacitySummary {
  groups: GroupCapacity[]
  occupied: number
  capacity: number
  available: number
  fullGroups: number
  occupancyRate: number
  studentsWithoutEnrollment: number
}

const CURRENT_STATUSES = new Set(['active', 'trial'])

export function buildCapacitySummary(
  schedules: Schedule[],
  students: Student[],
  groups: Group[]
): CapacitySummary {
  const schedulesByGroup = new Map<string, Schedule[]>()
  const groupById = new Map(groups.map(group => [group.id, group]))

  schedules
    .filter(schedule => schedule.is_active)
    .forEach(schedule => {
      const current = schedulesByGroup.get(schedule.group_id) ?? []
      current.push(schedule)
      schedulesByGroup.set(schedule.group_id, current)
    })

  const studentIdsByGroup = new Map<string, Set<string>>()
  let studentsWithoutEnrollment = 0

  students
    .filter(student => CURRENT_STATUSES.has(student.status))
    .forEach(student => {
      const currentEnrollments = (student.enrollments ?? []).filter(enrollment =>
        CURRENT_STATUSES.has(enrollment.status)
      )

      if (currentEnrollments.length === 0) {
        studentsWithoutEnrollment += 1
        return
      }

      currentEnrollments.forEach(enrollment => {
        const enrolled = studentIdsByGroup.get(enrollment.group_id) ?? new Set<string>()
        enrolled.add(student.id)
        studentIdsByGroup.set(enrollment.group_id, enrolled)
      })
    })

  const groupCapacities = Array.from(schedulesByGroup.entries()).map(([groupId, groupSchedules]) => {
    const group = groupById.get(groupId) ?? groupSchedules[0]?.group
    const positiveScheduleCapacities = groupSchedules
      .map(schedule => schedule.max_students)
      .filter(capacity => capacity > 0)
    const capacity = positiveScheduleCapacities.length > 0
      ? Math.min(...positiveScheduleCapacities)
      : Math.max(group?.max_students ?? 0, 0)
    const occupied = studentIdsByGroup.get(groupId)?.size ?? 0
    const available = Math.max(capacity - occupied, 0)

    return {
      groupId,
      siteId: group?.site_id ?? groupSchedules[0]?.site_id ?? '',
      siteName: group?.site?.name ?? groupSchedules[0]?.site?.name ?? 'Site inconnu',
      levelId: group?.level_id ?? '',
      levelName: group?.level?.name ?? group?.name ?? 'Niveau inconnu',
      levelEmoji: group?.level?.emoji ?? '',
      groupName: group?.name ?? 'Groupe',
      capacity,
      occupied,
      available,
      occupancyRate: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
      isFull: capacity > 0 && occupied >= capacity,
    }
  }).sort((a, b) =>
    a.siteName.localeCompare(b.siteName, 'fr') ||
    a.levelName.localeCompare(b.levelName, 'fr') ||
    a.groupName.localeCompare(b.groupName, 'fr')
  )

  const occupied = groupCapacities.reduce((sum, group) => sum + group.occupied, 0)
  const capacity = groupCapacities.reduce((sum, group) => sum + group.capacity, 0)

  return {
    groups: groupCapacities,
    occupied,
    capacity,
    available: Math.max(capacity - occupied, 0),
    fullGroups: groupCapacities.filter(group => group.isFull).length,
    occupancyRate: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
    studentsWithoutEnrollment,
  }
}
