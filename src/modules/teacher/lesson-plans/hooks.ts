import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchMySubjectsForPlanning,
  fetchWeeks,
  fetchWeekPlans,
  fetchSuggestedTopics,
  storePlan,
  approvePlan,
} from './api'
import type { StorePlanPayload } from './types'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

// ═══════════ المواد ═══════════

export function useMySubjectsForPlanning() {
  return useQuery({
    queryKey: ['teacher', 'lesson-plans', 'my-subjects'],
    queryFn: fetchMySubjectsForPlanning,
    staleTime: 5 * 60 * 1000,
  })
}

// ═══════════ الأسابيع ═══════════

export function useWeeks() {
  return useQuery({
    queryKey: ['teacher', 'lesson-plans', 'weeks'],
    queryFn: fetchWeeks,
    staleTime: 10 * 60 * 1000,
  })
}

// ═══════════ خطط الأسبوع ═══════════

export function useWeekPlans(weekId: number | undefined) {
  return useQuery({
    queryKey: ['teacher', 'lesson-plans', 'week', weekId],
    queryFn: () => fetchWeekPlans(weekId!),
    enabled: !!weekId,
    staleTime: 30 * 1000,
  })
}

// ═══════════ الاقتراح الذكي ═══════════

export function useSuggestedTopics(
  subjectId: number | undefined,
  grade: string | undefined,
  weekId: number | undefined,
) {
  return useQuery({
    queryKey: ['teacher', 'lesson-plans', 'suggest', subjectId, grade, weekId],
    queryFn: () => fetchSuggestedTopics(subjectId!, grade!, weekId!),
    enabled: !!subjectId && !!grade && !!weekId,
    staleTime: 60 * 1000,
  })
}

// ═══════════ حفظ الخطة ═══════════

export function useStorePlanMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: StorePlanPayload) => storePlan(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'lesson-plans', 'week', variables.academic_week_id],
      })
      toast({ type: 'success', title: 'تم حفظ الخطة بنجاح' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ الخطة') })
    },
  })
}

// ═══════════ اعتماد الخطة ═══════════

export function useApprovePlanMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (planId: number) => approvePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      toast({ type: 'success', title: 'تم اعتماد الخطة بنجاح' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد الخطة') })
    },
  })
}
