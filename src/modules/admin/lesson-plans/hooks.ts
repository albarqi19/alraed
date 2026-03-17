import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchLessonPlans,
  fetchLessonPlanDetail,
  approveLessonPlan,
  rejectLessonPlan,
  fetchLessonPlanStats,
  fetchCurriculumDistributions,
  fetchUnmappedSubjects,
  mapSubjectCurriculum,
} from './api'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export function useLessonPlans(params: {
  teacher_id?: number
  subject_id?: number
  grade?: string
  academic_week_id?: number
  status?: string
  page?: number
}) {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', params],
    queryFn: () => fetchLessonPlans(params),
    staleTime: 30 * 1000,
  })
}

export function useLessonPlanDetail(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'detail', id],
    queryFn: () => fetchLessonPlanDetail(id!),
    enabled: !!id,
  })
}

export function useLessonPlanStats(weekId?: number) {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'stats', weekId],
    queryFn: () => fetchLessonPlanStats(weekId),
    staleTime: 30 * 1000,
  })
}

export function useCurriculumDistributions() {
  return useQuery({
    queryKey: ['admin', 'curriculum-distributions'],
    queryFn: fetchCurriculumDistributions,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUnmappedSubjects() {
  return useQuery({
    queryKey: ['admin', 'unmapped-subjects'],
    queryFn: fetchUnmappedSubjects,
    staleTime: 60 * 1000,
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

export function useMapSubjectMutation() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ subjectId, name }: { subjectId: number; name: string }) =>
      mapSubjectCurriculum(subjectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'unmapped-subjects'] })
      toast({ type: 'success', title: 'تم ربط المادة بالتوزيع' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر ربط المادة') })
    },
  })
}
