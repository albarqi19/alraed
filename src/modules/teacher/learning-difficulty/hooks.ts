import { useMutation, useQuery } from '@tanstack/react-query'

import { fetchTeacherLdForms, submitLdReferral, type SubmitLdPayload } from './api'

export const TEACHER_LD_KEYS = {
  all: ['teacher-learning-difficulty'] as const,
  forms: (studentId?: number) => [...TEACHER_LD_KEYS.all, 'forms', studentId ?? 0] as const,
}

/**
 * لا يُستعلَم قبل اختيار الطالب: النطاقُ يُقرأ بالطالب، واستعلامٌ بلا طالبٍ
 * يعرض بطاقةً ثمّ يخفيها — وميضٌ لا معنى له.
 */
export function useTeacherLdFormsQuery(studentId: number | null) {
  return useQuery({
    queryKey: TEACHER_LD_KEYS.forms(studentId ?? undefined),
    queryFn: () => fetchTeacherLdForms(studentId as number),
    enabled: !!studentId,
    staleTime: 60_000,
  })
}

export function useSubmitLdReferralMutation() {
  return useMutation({
    mutationFn: (payload: SubmitLdPayload) => submitLdReferral(payload),
  })
}
