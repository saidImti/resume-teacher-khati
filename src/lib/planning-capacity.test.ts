import { describe, expect, it } from 'vitest'
import { buildCapacitySummary } from './planning-capacity'
import type { Group, Schedule, Student } from '@/types'

const group = {
  id: 'group-1',
  site_id: 'site-1',
  level_id: 'level-1',
  name: 'Kids A',
  max_students: 20,
  is_active: true,
  site: { id: 'site-1', name: 'Centre' },
  level: { id: 'level-1', name: 'Kids', emoji: '🟡' },
} as Group

const schedules = [
  { id: 'slot-1', group_id: group.id, site_id: group.site_id, max_students: 12, is_active: true, group },
  { id: 'slot-2', group_id: group.id, site_id: group.site_id, max_students: 10, is_active: true, group },
] as Schedule[]

function student(id: string, status: Student['status'], enrollmentStatus?: 'active' | 'trial' | 'cancelled') {
  return {
    id,
    status,
    enrollments: enrollmentStatus ? [{
      id: `enrollment-${id}`,
      student_id: id,
      group_id: group.id,
      status: enrollmentStatus,
    }] : [],
  } as Student
}

describe('buildCapacitySummary', () => {
  it('counts a group once and uses the lowest active schedule capacity', () => {
    const result = buildCapacitySummary(schedules, [
      student('student-1', 'active', 'active'),
      student('student-2', 'trial', 'trial'),
    ], [group])

    expect(result.capacity).toBe(10)
    expect(result.occupied).toBe(2)
    expect(result.available).toBe(8)
    expect(result.occupancyRate).toBe(20)
    expect(result.groups).toHaveLength(1)
  })

  it('ignores inactive students and cancelled enrollments, and reports unassigned students', () => {
    const result = buildCapacitySummary(schedules, [
      student('student-1', 'departed', 'active'),
      student('student-2', 'active', 'cancelled'),
      student('student-3', 'trial'),
    ], [group])

    expect(result.occupied).toBe(0)
    expect(result.studentsWithoutEnrollment).toBe(2)
  })

  it('marks full and over-capacity groups without returning negative availability', () => {
    const enrolled = Array.from({ length: 11 }, (_, index) =>
      student(`student-${index}`, 'active', 'active')
    )
    const result = buildCapacitySummary(schedules, enrolled, [group])

    expect(result.groups[0]?.isFull).toBe(true)
    expect(result.groups[0]?.available).toBe(0)
    expect(result.groups[0]?.occupancyRate).toBe(110)
    expect(result.fullGroups).toBe(1)
  })
})
