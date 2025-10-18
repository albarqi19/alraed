import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useToast } from '@/shared/feedback/use-toast'
import {
  archiveAdminForm,
  createAdminForm,
  deleteAdminForm,
  deleteAdminFormSubmission,
  fetchAdminForm,
  fetchAdminForms,
  fetchAdminFormSubmissions,
  fetchAdminFormSubmission,
  fetchGuardianForms,
  publishAdminForm,
  reviewAdminFormSubmission,
  submitGuardianForm,
  updateAdminForm,
} from './api'
import { formQueryKeys } from './query-keys'
import type {
  FormSummary,
  FormUpsertPayload,
  GuardianFormSubmissionPayload,
  FormSubmission,
} from './types'

interface UseAdminFormsOptions {
  status?: FormSummary['status']
  category?: string
  q?: string
  page?: number
  per_page?: number
}

interface UseAdminSubmissionsOptions {
  status?: FormSubmission['status']
  student_id?: number
  guardian_phone?: string
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
}

export function useAdminForms(options: UseAdminFormsOptions = {}) {
  const filters = useMemo(() => ({ ...options }), [JSON.stringify(options)])

  return useQuery({
    queryKey: formQueryKeys.adminList(filters),
    queryFn: async () => fetchAdminForms(filters),
    placeholderData: keepPreviousData,
  })
}

export function useAdminForm(formId: number | null) {
  return useQuery<FormSummary>({
    queryKey: formQueryKeys.adminDetail(formId),
    queryFn: () => fetchAdminForm(formId as number),
    enabled: typeof formId === 'number',
  })
}

export function useCreateAdminFormMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: FormUpsertPayload) => createAdminForm(payload),
    onSuccess: (form) => {
      toast({ type: 'success', title: 'تم إنشاء النموذج بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['forms', 'admin'] })
      queryClient.setQueryData(formQueryKeys.adminDetail(form.id), form)
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر إنشاء النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useUpdateAdminFormMutation(formId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<FormUpsertPayload>) => updateAdminForm(formId, payload),
    onSuccess: (form) => {
      toast({ type: 'success', title: 'تم تحديث النموذج' })
      queryClient.invalidateQueries({ queryKey: ['forms', 'admin'] })
      queryClient.setQueryData(formQueryKeys.adminDetail(formId), form)
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر تحديث النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useDeleteAdminFormMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formId: number) => deleteAdminForm(formId),
    onSuccess: (_, formId) => {
      toast({ type: 'success', title: 'تم حذف النموذج' })
      queryClient.invalidateQueries({ queryKey: ['forms', 'admin'] })
      queryClient.removeQueries({ queryKey: formQueryKeys.adminDetail(formId) })
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر حذف النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function usePublishAdminFormMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formId: number) => publishAdminForm(formId),
    onSuccess: (form) => {
      toast({ type: 'success', title: 'تم نشر النموذج' })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminList() })
      queryClient.setQueryData(formQueryKeys.adminDetail(form.id), form)
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر نشر النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useArchiveAdminFormMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formId: number) => archiveAdminForm(formId),
    onSuccess: (form) => {
      toast({ type: 'info', title: 'تم أرشفة النموذج' })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminList() })
      queryClient.setQueryData(formQueryKeys.adminDetail(form.id), form)
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر أرشفة النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useAdminFormSubmissions(formId: number, options: UseAdminSubmissionsOptions = {}) {
  const filters = useMemo(() => ({ ...options }), [JSON.stringify(options)])

  return useQuery({
    queryKey: formQueryKeys.adminSubmissions(formId, filters),
    queryFn: () => fetchAdminFormSubmissions(formId, filters),
    enabled: Number.isFinite(formId),
    placeholderData: keepPreviousData,
  })
}

export function useAdminFormSubmission(formId: number, submissionId: number | null) {
  return useQuery<FormSubmission>({
    queryKey: formQueryKeys.adminSubmission(formId, submissionId),
    queryFn: () => fetchAdminFormSubmission(formId, submissionId as number),
    enabled: Number.isFinite(formId) && typeof submissionId === 'number',
  })
}

export function useReviewAdminSubmissionMutation(formId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { submissionId: number; status: FormSubmission['status']; review_notes?: string | null }) =>
      reviewAdminFormSubmission(formId, payload.submissionId, {
        status: payload.status as Extract<FormSubmission['status'], 'approved' | 'rejected' | 'reviewed'>,
        review_notes: payload.review_notes,
      }),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث حالة الرد' })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminSubmissions(formId) })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminDetail(formId) })
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر تحديث حالة الرد', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useDeleteAdminSubmissionMutation(formId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (submissionId: number) => deleteAdminFormSubmission(formId, submissionId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الرد بنجاح' })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminSubmissions(formId) })
      queryClient.invalidateQueries({ queryKey: formQueryKeys.adminDetail(formId) })
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر حذف الرد', description: error instanceof Error ? error.message : undefined })
    },
  })
}

export function useGuardianForms(nationalId: string) {
  return useQuery({
    queryKey: formQueryKeys.guardianList(nationalId),
    queryFn: () => fetchGuardianForms(nationalId),
    enabled: nationalId.trim().length === 10,
    staleTime: 5 * 60_000,
  })
}

export function useSubmitGuardianFormMutation(formId: number) {
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: GuardianFormSubmissionPayload) => submitGuardianForm(formId, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال النموذج بنجاح' })
    },
    onError: (error: unknown) => {
      toast({ type: 'error', title: 'تعذر إرسال النموذج', description: error instanceof Error ? error.message : undefined })
    },
  })
}
