import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createLdForm,
  deleteLdForm,
  fetchLdBoard,
  fetchLdForm,
  fetchLdForms,
  fetchLdQuestionAnalytics,
  fetchLdScopeOptions,
  fetchLdStudent,
  generateLdAiReport,
  toggleLdFormAcceptance,
  updateLdForm,
} from './api'
import type { LdBoardFilters, LdFormPayload } from './types'

export const LD_KEYS = {
  all: ['learning-difficulties'] as const,
  board: (filters: LdBoardFilters) => [...LD_KEYS.all, 'board', filters] as const,
  student: (id: number) => [...LD_KEYS.all, 'student', id] as const,
  forms: () => [...LD_KEYS.all, 'forms'] as const,
  form: (id: number) => [...LD_KEYS.all, 'form', id] as const,
  scopeOptions: () => [...LD_KEYS.all, 'scope-options'] as const,
  questions: (year?: string) => [...LD_KEYS.all, 'questions', year ?? 'current'] as const,
}

export function useLdBoardQuery(filters: LdBoardFilters = {}) {
  return useQuery({
    queryKey: LD_KEYS.board(filters),
    queryFn: () => fetchLdBoard(filters),
    staleTime: 30_000,
  })
}

export function useLdStudentQuery(studentId: number | null, academicYear?: string) {
  return useQuery({
    queryKey: LD_KEYS.student(studentId ?? 0),
    queryFn: () => fetchLdStudent(studentId as number, academicYear),
    enabled: !!studentId,
    staleTime: 30_000,
  })
}

export function useLdFormsQuery() {
  return useQuery({ queryKey: LD_KEYS.forms(), queryFn: fetchLdForms, staleTime: 60_000 })
}

export function useLdFormQuery(id: number | null) {
  return useQuery({
    queryKey: LD_KEYS.form(id ?? 0),
    queryFn: () => fetchLdForm(id as number),
    enabled: !!id,
  })
}

export function useLdScopeOptionsQuery() {
  return useQuery({
    queryKey: LD_KEYS.scopeOptions(),
    queryFn: fetchLdScopeOptions,
    staleTime: 5 * 60_000,
  })
}

export function useLdQuestionAnalyticsQuery(academicYear?: string, enabled = true) {
  return useQuery({
    queryKey: LD_KEYS.questions(academicYear),
    queryFn: () => fetchLdQuestionAnalytics(academicYear),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateLdFormMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: LdFormPayload) => createLdForm(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LD_KEYS.forms() }),
  })
}

export function useUpdateLdFormMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LdFormPayload }) => updateLdForm(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: LD_KEYS.forms() })
      qc.invalidateQueries({ queryKey: LD_KEYS.form(variables.id) })
    },
  })
}

export function useToggleLdAcceptanceMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleLdFormAcceptance(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LD_KEYS.forms() }),
  })
}

export function useDeleteLdFormMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteLdForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LD_KEYS.forms() }),
  })
}

export function useGenerateLdAiReportMutation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ studentId, force }: { studentId: number; force?: boolean }) =>
      generateLdAiReport(studentId, force),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: LD_KEYS.student(variables.studentId) })
    },
  })
}
