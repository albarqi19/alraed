import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeriodAttendanceGrid,
  fetchPeriodAttendanceDetails,
  fetchPeriodAbsenceAlerts,
  fetchPeriodAttendanceGrades,
  updatePeriodAttendanceStatus,
  updatePeriodAlertStatus,
} from '../api/period-attendance-api'

export function usePeriodAttendanceGridQuery(date: string, grade?: string) {
  return useQuery({
    queryKey: ['period-attendance-grid', date, grade],
    queryFn: () => fetchPeriodAttendanceGrid(date, grade),
    enabled: !!date,
  })
}

export function usePeriodAttendanceDetailsQuery(
  date: string,
  grade: string,
  className: string,
  periodNumber: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['period-attendance-details', date, grade, className, periodNumber],
    queryFn: () => fetchPeriodAttendanceDetails(date, grade, className, periodNumber),
    enabled: options.enabled !== false && !!date && !!grade && !!className && periodNumber > 0,
  })
}

export function usePeriodAbsenceAlertsQuery(date: string) {
  return useQuery({
    queryKey: ['period-absence-alerts', date],
    queryFn: () => fetchPeriodAbsenceAlerts(date),
    enabled: !!date,
  })
}

export function usePeriodAttendanceGradesQuery() {
  return useQuery({
    queryKey: ['period-attendance-grades'],
    queryFn: fetchPeriodAttendanceGrades,
  })
}

export function useUpdatePeriodStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendanceId, status }: { attendanceId: number; status: 'present' | 'absent' | 'late' }) =>
      updatePeriodAttendanceStatus(attendanceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-attendance-grid'] })
      queryClient.invalidateQueries({ queryKey: ['period-attendance-details'] })
      queryClient.invalidateQueries({ queryKey: ['period-absence-alerts'] })
    },
  })
}

export function useUpdatePeriodAlertStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ alertId, alertStatus }: { alertId: number; alertStatus: 'new' | 'seen' | 'resolved' }) =>
      updatePeriodAlertStatus(alertId, alertStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-absence-alerts'] })
    },
  })
}
