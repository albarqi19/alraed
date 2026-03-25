import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchWeeksSummary,
  fetchWeekTeachers,
  approveLessonPlan,
  approveAllWeekPlans,
  rejectLessonPlan,
  fetchLessonPlanSettings,
  updateLessonPlanSettings,
  sendPlansToParents,
  fetchWeekGrades,
  type LessonPlanSettings,
} from './api'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export function useWeeksSummary() {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'weeks-summary'],
    queryFn: fetchWeeksSummary,
    staleTime: 30 * 1000,
  })
}

export function useWeekTeachers(weekId: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'week-teachers', weekId],
    queryFn: () => fetchWeekTeachers(weekId!),
    enabled: !!weekId,
    staleTime: 15 * 1000,
  })
}

export function useApprovePlanMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: number) => approveLessonPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans'] })
      toast({ type: 'success', title: 'تم اعتماد الخطة' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد الخطة') })
    },
  })
}

export function useApproveAllMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (weekId: number) => approveAllWeekPlans(weekId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans'] })
      toast({ type: 'success', title: `تم اعتماد ${data.approved_count} خطة` })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد الخطط') })
    },
  })
}

export function useRejectPlanMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectLessonPlan(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans'] })
      toast({ type: 'success', title: 'تم رفض الخطة' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر رفض الخطة') })
    },
  })
}

// ═══════════ الإعدادات ═══════════

export function useLessonPlanSettings() {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'settings'],
    queryFn: fetchLessonPlanSettings,
    staleTime: 60 * 1000,
  })
}

export function useUpdateLessonPlanSettingsMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (settings: LessonPlanSettings) => updateLessonPlanSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans', 'settings'] })
      toast({ type: 'success', title: 'تم حفظ الإعدادات' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ الإعدادات') })
    },
  })
}

// ═══════════ إرسال لأولياء الأمور ═══════════

export function useSendToParentsMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (weekId: number) => sendPlansToParents(weekId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans'] })
      toast({ type: 'success', title: data.message ?? 'تم جدولة الإرسال' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال الخطط') })
    },
  })
}

// ═══════════ الصفوف ═══════════

export function useWeekGrades(weekId: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'week-grades', weekId],
    queryFn: () => fetchWeekGrades(weekId!),
    enabled: !!weekId,
    staleTime: 30 * 1000,
  })
}
