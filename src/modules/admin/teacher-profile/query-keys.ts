/**
 * مفاتيح استعلام ملف المعلم
 */

import type { DateRangeFilter } from './types'

export const teacherProfileKeys = {
  root: ['admin', 'teacher-profile'] as const,

  summary: (id: number, filters?: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'summary', filters ?? {}] as const,

  attendance: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'attendance', filters] as const,

  delays: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'delays', filters] as const,

  delayActions: (id: number, fiscalYear?: number) =>
    ['admin', 'teacher-profile', id, 'delay-actions', fiscalYear ?? 'all'] as const,

  schedule: (id: number) =>
    ['admin', 'teacher-profile', id, 'schedule'] as const,

  duties: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'duties', filters] as const,

  messages: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'messages', filters] as const,

  preparation: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'preparation', filters] as const,

  referrals: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'referrals', filters] as const,

  points: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'points', filters] as const,

  coverageRequests: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'coverage-requests', filters] as const,

  studentAttendanceStats: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'student-attendance-stats', filters] as const,

  benchmarks: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'benchmarks', filters] as const,

  periodActions: (id: number, filters: DateRangeFilter) =>
    ['admin', 'teacher-profile', id, 'period-actions', filters] as const,
}
