import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTeacherPointTransaction,
  fetchTeacherPointConfig,
  fetchTeacherPointSummary,
  undoTeacherPointTransaction,
} from './api'
import type { TeacherPointConfigPayload, TeacherPointSummary, TeacherPointTransactionPayload } from './types'
import { useToast } from '@/shared/feedback/use-toast'

export const teacherPointQueryKeys = {
  all: ['teacher', 'points'] as const,
  config: () => [...teacherPointQueryKeys.all, 'config'] as const,
  summary: () => [...teacherPointQueryKeys.all, 'summary'] as const,
}

export function useTeacherPointConfigQuery() {
  return useQuery<TeacherPointConfigPayload>({
    queryKey: teacherPointQueryKeys.config(),
    queryFn: fetchTeacherPointConfig,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeacherPointSummaryQuery(options: { enabled?: boolean; refetchInterval?: number } = {}) {
  const { enabled = true, refetchInterval = 30_000 } = options

  return useQuery<TeacherPointSummary>({
    queryKey: teacherPointQueryKeys.summary(),
    queryFn: fetchTeacherPointSummary,
    enabled,
    refetchInterval,
  })
}

export function useTeacherPointTransactionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TeacherPointTransactionPayload) => createTeacherPointTransaction(payload),
    onSuccess: (data) => {
      const { transaction, summary } = data
      toast({
        type: transaction.type === 'reward' ? 'success' : 'warning',
        title: transaction.type === 'reward' ? 'تم إضافة النقاط بنجاح' : 'تم تسجيل المخالفة',
      })
      queryClient.setQueryData(teacherPointQueryKeys.summary(), summary)
      queryClient.invalidateQueries({ queryKey: teacherPointQueryKeys.config() })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر حفظ العملية'
      toast({ type: 'error', title: message })
    },
  })
}

export function useTeacherPointUndoMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (transactionId: number) => undoTeacherPointTransaction(transactionId),
    onSuccess: () => {
      toast({ type: 'info', title: 'تم إلغاء العملية' })
      queryClient.invalidateQueries({ queryKey: teacherPointQueryKeys.summary() })
      queryClient.invalidateQueries({ queryKey: teacherPointQueryKeys.config() })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر إلغاء العملية'
      toast({ type: 'error', title: message })
    },
  })
}
