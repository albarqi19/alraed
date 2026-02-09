import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchSessionEvaluationConfig,
  fetchStudentEvaluations,
  saveEvaluation,
  saveBulkEvaluation,
  removeEvaluation,
  fetchSessionEvaluationsSummary,
  fetchStudentReport,
  fetchTeacherSubjects,
  fetchTeacherSubjectSkills,
  createSubjectSkill,
  updateSubjectSkill,
  deleteSubjectSkill,
} from './api'
import type { SaveEvaluationPayload, BulkEvaluationPayload, SubjectSkillFormPayload } from './types'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

// ═══════════ إعدادات التقييم (تُحمل مرة واحدة) ═══════════

export function useSessionEvaluationConfig(sessionId: number | undefined) {
  return useQuery({
    queryKey: ['teacher', 'evaluation-config', sessionId],
    queryFn: () => fetchSessionEvaluationConfig(sessionId!),
    enabled: !!sessionId,
    staleTime: 10 * 60 * 1000, // 10 دقائق
  })
}

// ═══════════ تقييمات طالب ═══════════

export function useStudentEvaluations(sessionId: number | undefined, studentId: number | undefined) {
  return useQuery({
    queryKey: ['teacher', 'student-evaluations', sessionId, studentId],
    queryFn: () => fetchStudentEvaluations(sessionId!, studentId!),
    enabled: !!sessionId && !!studentId,
    staleTime: 30 * 1000, // 30 ثانية
  })
}

// ═══════════ ملخص تقييمات الحصة ═══════════

export function useSessionEvaluationsSummary(sessionId: number | undefined) {
  return useQuery({
    queryKey: ['teacher', 'evaluations-summary', sessionId],
    queryFn: () => fetchSessionEvaluationsSummary(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  })
}

// ═══════════ حفظ تقييم فردي ═══════════

export function useSaveEvaluationMutation(sessionId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: SaveEvaluationPayload }) =>
      saveEvaluation(sessionId, studentId, payload),
    onSuccess: (_data, variables) => {
      // تحديث الكاش
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'student-evaluations', sessionId, variables.studentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'evaluations-summary', sessionId],
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ التقييم') })
    },
  })
}

// ═══════════ حفظ تقييم جماعي ═══════════

export function useBulkEvaluationMutation(sessionId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkEvaluationPayload) => saveBulkEvaluation(sessionId, payload),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: `تم تقييم ${result.saved_count} طالب بنجاح`,
      })
      // تحديث كل الكاش
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'student-evaluations', sessionId],
      })
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'evaluations-summary', sessionId],
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ التقييم الجماعي') })
    },
  })
}

// ═══════════ حذف تقييم ═══════════

export function useRemoveEvaluationMutation(sessionId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ studentId, evaluationId }: { studentId: number; evaluationId: number }) =>
      removeEvaluation(sessionId, studentId, evaluationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'student-evaluations', sessionId, variables.studentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'evaluations-summary', sessionId],
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف التقييم') })
    },
  })
}

// ═══════════ كشف الطالب ═══════════

export function useStudentReport(studentId: number | null, subjectId?: number) {
  return useQuery({
    queryKey: ['teacher', 'student-report', studentId, subjectId],
    queryFn: () => fetchStudentReport(studentId!, subjectId),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // دقيقتان
  })
}

// ═══════════ مواد المعلم ═══════════

export function useTeacherSubjects() {
  return useQuery({
    queryKey: ['teacher', 'my-subjects'],
    queryFn: fetchTeacherSubjects,
    staleTime: 10 * 60 * 1000,
  })
}

// ═══════════ مهارات المعلم ═══════════

export function useTeacherSubjectSkills(subjectId: number | undefined) {
  return useQuery({
    queryKey: ['teacher', 'subject-skills', subjectId],
    queryFn: () => fetchTeacherSubjectSkills(subjectId!),
    enabled: !!subjectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateSubjectSkillMutation(subjectId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SubjectSkillFormPayload) => createSubjectSkill(subjectId, payload),
    onSuccess: (skill) => {
      toast({ type: 'success', title: `تم إنشاء "${skill.name}"` })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'subject-skills', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'evaluation-config'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء المهارة') })
    },
  })
}

export function useUpdateSubjectSkillMutation(subjectId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ skillId, payload }: { skillId: number; payload: Partial<SubjectSkillFormPayload> }) =>
      updateSubjectSkill(subjectId, skillId, payload),
    onSuccess: (skill) => {
      toast({ type: 'success', title: `تم تحديث "${skill.name}"` })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'subject-skills', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'evaluation-config'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث المهارة') })
    },
  })
}

export function useDeleteSubjectSkillMutation(subjectId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (skillId: number) => deleteSubjectSkill(subjectId, skillId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف المهارة' })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'subject-skills', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'evaluation-config'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف المهارة') })
    },
  })
}
