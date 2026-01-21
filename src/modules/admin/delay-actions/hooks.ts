/**
 * React Query Hooks لنظام إجراءات تأخير المعلمين
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import { delayActionsQueryKeys } from './query-keys'
import {
  fetchTeacherDelayList,
  fetchDelayActionsStatistics,
  fetchTeacherDelayDetails,
  fetchDelayActionsHistory,
  recordWarning,
  recordDeduction,
  markActionSigned,
  fetchDelayActionsSettings,
  updateDelayActionsSettings,
} from './api'
import type {
  DelayActionsFilters,
  DelayActionsHistoryFilters,
  RecordActionPayload,
  MarkSignedPayload,
  UpdateDelayActionsSettingsPayload,
} from './types'

/**
 * جلب قائمة المعلمين مع التأخير
 */
export function useTeacherDelayListQuery(
  filters: DelayActionsFilters = {},
  options: { enabled?: boolean } = {},
) {
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== '' && v !== 'all',
    ),
  )

  return useQuery({
    queryKey: delayActionsQueryKeys.list(normalizedFilters),
    queryFn: () => fetchTeacherDelayList(filters),
    enabled: options.enabled ?? true,
    staleTime: 60_000, // 1 دقيقة
  })
}

/**
 * جلب الإحصائيات
 */
export function useDelayActionsStatisticsQuery(
  fiscalYear?: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: delayActionsQueryKeys.statistics(fiscalYear),
    queryFn: () => fetchDelayActionsStatistics(fiscalYear),
    enabled: options.enabled ?? true,
    staleTime: 60_000, // 1 دقيقة
  })
}

/**
 * جلب تفاصيل تأخير معلم
 */
export function useTeacherDelayDetailsQuery(
  userId: number | null,
  fiscalYear?: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: delayActionsQueryKeys.teacherDetails(userId ?? 0, fiscalYear),
    queryFn: () => fetchTeacherDelayDetails(userId!, fiscalYear),
    enabled: (options.enabled ?? true) && userId !== null && userId > 0,
    staleTime: 30_000, // 30 ثانية
  })
}

/**
 * جلب تاريخ الإجراءات
 */
export function useDelayActionsHistoryQuery(
  filters: DelayActionsHistoryFilters = {},
  options: { enabled?: boolean } = {},
) {
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== undefined && v !== '' && v !== 'all',
    ),
  )

  return useQuery({
    queryKey: delayActionsQueryKeys.history(normalizedFilters),
    queryFn: () => fetchDelayActionsHistory(filters),
    enabled: options.enabled ?? true,
    staleTime: 30_000, // 30 ثانية
  })
}

/**
 * تسجيل تنبيه
 */
export function useRecordWarningMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecordActionPayload) => recordWarning(payload),
    onSuccess: (data) => {
      toast({
        type: 'success',
        title: 'تم تسجيل التنبيه بنجاح',
        description: `تنبيه رقم ${data.sequence_number}`,
      })
      // إعادة تحميل البيانات
      void queryClient.invalidateQueries({ queryKey: delayActionsQueryKeys.root })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'تعذر تسجيل التنبيه',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    },
  })
}

/**
 * تسجيل قرار حسم
 */
export function useRecordDeductionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecordActionPayload) => recordDeduction(payload),
    onSuccess: (data) => {
      toast({
        type: 'success',
        title: 'تم تسجيل قرار الحسم بنجاح',
        description: `قرار حسم رقم ${data.sequence_number}`,
      })
      // إعادة تحميل البيانات
      void queryClient.invalidateQueries({ queryKey: delayActionsQueryKeys.root })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'تعذر تسجيل قرار الحسم',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    },
  })
}

/**
 * تحديث حالة التوقيع
 */
export function useMarkActionSignedMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ actionId, payload }: { actionId: number; payload: MarkSignedPayload }) =>
      markActionSigned(actionId, payload),
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'تم تحديث حالة التوقيع',
      })
      // إعادة تحميل البيانات
      void queryClient.invalidateQueries({ queryKey: delayActionsQueryKeys.root })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'تعذر تحديث حالة التوقيع',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    },
  })
}

/**
 * جلب إعدادات إجراءات التأخير
 */
export function useDelayActionsSettingsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: delayActionsQueryKeys.settings(),
    queryFn: () => fetchDelayActionsSettings(),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  })
}

/**
 * تحديث إعدادات إجراءات التأخير
 */
export function useUpdateDelayActionsSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateDelayActionsSettingsPayload) => updateDelayActionsSettings(payload),
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'تم حفظ الإعدادات بنجاح',
      })
      void queryClient.invalidateQueries({ queryKey: delayActionsQueryKeys.settings() })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'تعذر حفظ الإعدادات',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    },
  })
}
