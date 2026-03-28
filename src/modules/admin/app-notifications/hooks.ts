import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchNotificationStats,
  fetchTeachersAppStatus,
  fetchNotificationHistory,
  sendNotification,
} from './api'
import type { SendNotificationPayload } from './types'

const keys = {
  all: ['admin', 'app-notifications'] as const,
  stats: () => [...keys.all, 'stats'] as const,
  teachers: (filters?: { search?: string; status?: string }) => [...keys.all, 'teachers', filters] as const,
  history: (page?: number) => [...keys.all, 'history', page] as const,
}

export function useNotificationStatsQuery() {
  return useQuery({
    queryKey: keys.stats(),
    queryFn: fetchNotificationStats,
    refetchInterval: 60_000,
  })
}

export function useTeachersAppStatusQuery(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: keys.teachers(filters),
    queryFn: () => fetchTeachersAppStatus(filters),
  })
}

export function useNotificationHistoryQuery(page = 1) {
  return useQuery({
    queryKey: keys.history(page),
    queryFn: () => fetchNotificationHistory(page),
  })
}

export function useSendNotificationMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendNotificationPayload) => sendNotification(payload),
    onSuccess: (log) => {
      const rate =
        log.total_tokens > 0 ? Math.round((log.delivered_count / log.total_tokens) * 100) : 0
      toast({
        type: 'success',
        title: 'تم إرسال الإشعار',
        description: `${log.delivered_count}/${log.total_tokens} تم التوصيل (${rate}%)`,
      })
      queryClient.invalidateQueries({ queryKey: keys.stats() })
      queryClient.invalidateQueries({ queryKey: keys.all })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: error instanceof Error ? error.message : 'تعذر إرسال الإشعار',
      })
    },
  })
}
