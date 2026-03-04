import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  activateRemoteDay,
  deactivateRemoteDay,
  fetchRemoteDaysOverview,
  fetchRemoteDayDetails,
  fetchRemoteUploadDetails,
} from './api'

export function useActivateRemoteDayMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, note }: { date: string; note?: string }) =>
      activateRemoteDay(date, note),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحويل الدوام إلى عن بعد بنجاح' })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'remote-attendance'],
      })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title:
          error instanceof Error ? error.message : 'فشل تحويل الدوام',
      })
    },
  })
}

export function useDeactivateRemoteDayMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (date: string) => deactivateRemoteDay(date),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إلغاء يوم الدوام عن بعد' })
      queryClient.invalidateQueries({
        queryKey: ['admin', 'remote-attendance'],
      })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title:
          error instanceof Error ? error.message : 'فشل إلغاء الدوام عن بعد',
      })
    },
  })
}

export function useRemoteDaysOverview() {
  return useQuery({
    queryKey: ['admin', 'remote-attendance', 'overview'],
    queryFn: fetchRemoteDaysOverview,
    staleTime: 2 * 60 * 1000,
  })
}

export function useRemoteDayDetails(date?: string) {
  return useQuery({
    queryKey: ['admin', 'remote-attendance', 'day', date],
    queryFn: () => fetchRemoteDayDetails(date!),
    enabled: Boolean(date),
  })
}

export function useRemoteUploadDetails(uploadId?: number) {
  return useQuery({
    queryKey: ['admin', 'remote-attendance', 'upload', uploadId],
    queryFn: () => fetchRemoteUploadDetails(uploadId!),
    enabled: Boolean(uploadId),
  })
}
