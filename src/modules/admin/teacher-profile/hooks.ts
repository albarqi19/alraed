/**
 * React Query hooks لملف المعلم
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherProfileKeys } from './query-keys'
import {
  fetchTeacherProfileSummary,
  fetchTeacherProfileAttendance,
  fetchTeacherProfileDelays,
  fetchTeacherProfileDelayActions,
  fetchTeacherProfileSchedule,
  fetchTeacherProfileDuties,
  fetchTeacherProfileMessages,
  fetchTeacherProfilePreparation,
  fetchTeacherProfileReferrals,
  fetchTeacherProfilePoints,
  fetchTeacherProfileCoverage,
  fetchTeacherStudentAttendanceStats,
  fetchTeacherPeriodActions,
  fetchTeacherBenchmarks,
  fetchTeacherBadges,
  fetchTeacherAIAnalysis,
  fetchAppreciationTemplates,
  sendTeacherAppreciation,
} from './api'
import type { DateRangeFilter, ProfileTabKey } from './types'
import { useCallback } from 'react'

interface QueryOptions {
  enabled?: boolean
}

/** ملخص النظرة العامة */
export function useTeacherProfileSummary(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.summary(teacherId!, filters),
    queryFn: () => fetchTeacherProfileSummary(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** سجل الحضور */
export function useTeacherProfileAttendance(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.attendance(teacherId!, filters),
    queryFn: () => fetchTeacherProfileAttendance(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** التأخرات */
export function useTeacherProfileDelays(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.delays(teacherId!, filters),
    queryFn: () => fetchTeacherProfileDelays(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** التنبيهات والحسميات */
export function useTeacherProfileDelayActions(
  teacherId: number | null,
  fiscalYear?: number,
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.delayActions(teacherId!, fiscalYear),
    queryFn: () => fetchTeacherProfileDelayActions(teacherId!, fiscalYear),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** الجدول الدراسي */
export function useTeacherProfileSchedule(
  teacherId: number | null,
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.schedule(teacherId!),
    queryFn: () => fetchTeacherProfileSchedule(teacherId!),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** المناوبة والإشراف */
export function useTeacherProfileDuties(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.duties(teacherId!, filters),
    queryFn: () => fetchTeacherProfileDuties(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** الرسائل */
export function useTeacherProfileMessages(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.messages(teacherId!, filters),
    queryFn: () => fetchTeacherProfileMessages(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** التحضير */
export function useTeacherProfilePreparation(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.preparation(teacherId!, filters),
    queryFn: () => fetchTeacherProfilePreparation(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** الإحالات */
export function useTeacherProfileReferrals(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.referrals(teacherId!, filters),
    queryFn: () => fetchTeacherProfileReferrals(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** النقاط */
export function useTeacherProfilePoints(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.points(teacherId!, filters),
    queryFn: () => fetchTeacherProfilePoints(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** طلبات التغطية */
export function useTeacherProfileCoverage(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.coverageRequests(teacherId!, filters),
    queryFn: () => fetchTeacherProfileCoverage(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** إحصائيات تحضير الطلاب */
export function useTeacherStudentAttendanceStats(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.studentAttendanceStats(teacherId!, filters),
    queryFn: () => fetchTeacherStudentAttendanceStats(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** إجراءات الحصص والطابور */
export function useTeacherPeriodActions(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.periodActions(teacherId!, filters),
    queryFn: () => fetchTeacherPeriodActions(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** المقارنة بمتوسط المدرسة */
export function useTeacherBenchmarks(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.benchmarks(teacherId!, filters),
    queryFn: () => fetchTeacherBenchmarks(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** الأوسمة */
export function useTeacherBadges(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.badges(teacherId!, filters),
    queryFn: () => fetchTeacherBadges(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
    placeholderData: (prev) => prev,
  })
}

/** تحليل AI */
export function useTeacherAIAnalysis(
  teacherId: number | null,
  filters: DateRangeFilter = {},
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.aiAnalysis(teacherId!, filters),
    queryFn: () => fetchTeacherAIAnalysis(teacherId!, filters),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
    staleTime: 1000 * 60 * 60, // ساعة واحدة
  })
}

/** قوالب التقدير */
export function useAppreciationTemplates(
  teacherId: number | null,
  opts: QueryOptions = {},
) {
  return useQuery({
    queryKey: teacherProfileKeys.appreciationTemplates(teacherId!),
    queryFn: () => fetchAppreciationTemplates(teacherId!),
    enabled: Boolean(teacherId) && (opts.enabled ?? true),
  })
}

/** إرسال تقدير */
export function useSendAppreciation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teacherId, message }: { teacherId: number; message: string }) =>
      sendTeacherAppreciation(teacherId, message),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherProfileKeys.appreciationTemplates(variables.teacherId),
      })
    },
  })
}

/**
 * Prefetch hook - لتحميل بيانات التبويب مسبقاً عند hover
 */
export function useTeacherProfilePrefetch(
  teacherId: number | null,
  filters: DateRangeFilter = {},
) {
  const queryClient = useQueryClient()

  const prefetchTab = useCallback(
    (tab: ProfileTabKey) => {
      if (!teacherId) return

      const prefetchMap: Record<ProfileTabKey, () => void> = {
        overview: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.summary(teacherId, filters),
            queryFn: () => fetchTeacherProfileSummary(teacherId, filters),
            staleTime: 30_000,
          })
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.benchmarks(teacherId, filters),
            queryFn: () => fetchTeacherBenchmarks(teacherId, filters),
            staleTime: 30_000,
          })
        },
        attendance: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.attendance(teacherId, filters),
            queryFn: () => fetchTeacherProfileAttendance(teacherId, filters),
            staleTime: 30_000,
          })
        },
        delays: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.delays(teacherId, filters),
            queryFn: () => fetchTeacherProfileDelays(teacherId, filters),
            staleTime: 30_000,
          })
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.delayActions(teacherId),
            queryFn: () => fetchTeacherProfileDelayActions(teacherId),
            staleTime: 30_000,
          })
        },
        'period-actions': () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.periodActions(teacherId, filters),
            queryFn: () => fetchTeacherPeriodActions(teacherId, filters),
            staleTime: 30_000,
          })
        },
        teaching: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.schedule(teacherId),
            queryFn: () => fetchTeacherProfileSchedule(teacherId),
            staleTime: 60_000,
          })
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.studentAttendanceStats(teacherId, filters),
            queryFn: () => fetchTeacherStudentAttendanceStats(teacherId, filters),
            staleTime: 30_000,
          })
        },
        duties: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.duties(teacherId, filters),
            queryFn: () => fetchTeacherProfileDuties(teacherId, filters),
            staleTime: 30_000,
          })
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.coverageRequests(teacherId, filters),
            queryFn: () => fetchTeacherProfileCoverage(teacherId, filters),
            staleTime: 30_000,
          })
        },
        messages: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.messages(teacherId, filters),
            queryFn: () => fetchTeacherProfileMessages(teacherId, filters),
            staleTime: 30_000,
          })
        },
        preparation: () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.preparation(teacherId, filters),
            queryFn: () => fetchTeacherProfilePreparation(teacherId, filters),
            staleTime: 30_000,
          })
        },
        'referrals-reports': () => {
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.referrals(teacherId, filters),
            queryFn: () => fetchTeacherProfileReferrals(teacherId, filters),
            staleTime: 30_000,
          })
          queryClient.prefetchQuery({
            queryKey: teacherProfileKeys.points(teacherId, filters),
            queryFn: () => fetchTeacherProfilePoints(teacherId, filters),
            staleTime: 30_000,
          })
        },
      }

      prefetchMap[tab]?.()
    },
    [teacherId, filters, queryClient],
  )

  return { prefetchTab }
}
