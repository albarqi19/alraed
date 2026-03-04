import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchRemoteAttendanceStatus,
  uploadRemoteAttendance,
  fetchRemoteAttendanceReport,
} from './api'

export function useRemoteAttendanceStatus(date?: string) {
  return useQuery({
    queryKey: ['teacher', 'remote-attendance', 'status', date],
    queryFn: () => fetchRemoteAttendanceStatus(date),
    staleTime: 2 * 60 * 1000,
  })
}

export function useUploadRemoteAttendanceMutation(sessionId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadRemoteAttendance(sessionId, file),
    onSuccess: (data) => {
      toast({
        type: 'success',
        title: `تم رفع الملف بنجاح - ${data.participants_count} مشارك`,
      })
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'remote-attendance'],
      })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: error instanceof Error ? error.message : 'فشل رفع الملف',
      })
    },
  })
}

export function useRemoteAttendanceReport(sessionId?: number, date?: string) {
  return useQuery({
    queryKey: ['teacher', 'remote-attendance', 'report', sessionId, date],
    queryFn: () => fetchRemoteAttendanceReport(sessionId as number, date),
    enabled: Boolean(sessionId),
  })
}
