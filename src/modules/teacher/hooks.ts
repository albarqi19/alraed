import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSubmittedAttendance,
  fetchTeacherSessionStudents,
  fetchTeacherSessions,
  submitTeacherAttendance,
} from './api'
import type { AttendanceFormState, SessionAttendancePayload, TeacherSessionStudentsPayload } from './types'
import { useToast } from '@/shared/feedback/use-toast'

export function useTeacherSessionsQuery() {
  return useQuery({
    queryKey: ['teacher', 'sessions'],
    queryFn: fetchTeacherSessions,
    staleTime: 5 * 60 * 1000, // 5 دقائق - البيانات تبقى fresh
    gcTime: 10 * 60 * 1000, // 10 دقائق - تبقى في الكاش
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

export function useTeacherSessionStudentsQuery(sessionId?: number) {
  return useQuery<TeacherSessionStudentsPayload>({
    queryKey: ['teacher', 'sessions', sessionId, 'students'],
    queryFn: () => fetchTeacherSessionStudents(sessionId as number),
    enabled: Boolean(sessionId),
  })
}

export function useSubmittedAttendanceQuery(sessionId?: number, date?: string) {
  return useQuery<SessionAttendancePayload>({
    queryKey: ['teacher', 'sessions', sessionId, 'submitted-attendance', date],
    queryFn: () => fetchSubmittedAttendance(sessionId as number, date),
    enabled: Boolean(sessionId),
  })
}

export function useSubmitAttendanceMutation(sessionId: number) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attendance: AttendanceFormState) => submitTeacherAttendance(sessionId, attendance),
    onSuccess: (response) => {
      toast({ type: 'success', title: `تم حفظ التحضير (${response.saved_count}) طالب` })
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'sessions', sessionId, 'submitted-attendance'],
      })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'فشل حفظ التحضير'
      toast({ type: 'error', title: message })
    },
  })
}
