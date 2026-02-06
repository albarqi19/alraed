import { apiClient } from '@/services/api/client'
import type {
  PeriodAttendanceGrid,
  PeriodAttendanceDetails,
  PeriodAbsenceAlert,
} from '../types'

interface GridResponse {
  success: boolean
  data: PeriodAttendanceGrid
}

interface DetailsResponse {
  success: boolean
  data: PeriodAttendanceDetails
}

interface AlertsResponse {
  success: boolean
  data: {
    alerts: PeriodAbsenceAlert[]
    counts: {
      new: number
      seen: number
      resolved: number
    }
  }
}

interface GradesResponse {
  success: boolean
  data: string[]
}

export async function fetchPeriodAttendanceGrid(
  date: string,
  grade?: string,
): Promise<PeriodAttendanceGrid> {
  const { data } = await apiClient.get<GridResponse>('/admin/period-attendance/grid', {
    params: { date, grade },
  })
  return data.data
}

export async function fetchPeriodAttendanceDetails(
  date: string,
  grade: string,
  className: string,
  periodNumber: number,
): Promise<PeriodAttendanceDetails> {
  const { data } = await apiClient.get<DetailsResponse>('/admin/period-attendance/details', {
    params: { date, grade, class_name: className, period_number: periodNumber },
  })
  return data.data
}

export async function fetchPeriodAbsenceAlerts(
  date: string,
): Promise<AlertsResponse['data']> {
  const { data } = await apiClient.get<AlertsResponse>('/admin/period-attendance/alerts', {
    params: { date },
  })
  return data.data
}

export async function fetchPeriodAttendanceGrades(): Promise<string[]> {
  const { data } = await apiClient.get<GradesResponse>('/admin/period-attendance/grades')
  return data.data
}

export async function updatePeriodAttendanceStatus(
  attendanceId: number,
  status: 'present' | 'absent' | 'late',
): Promise<{ success: boolean; new_status: string; late_minutes: number | null; message: string }> {
  const { data } = await apiClient.post(`/admin/period-attendance/${attendanceId}/update-status`, {
    status,
  })
  return data
}

export async function updatePeriodAlertStatus(
  alertId: number,
  alertStatus: 'new' | 'seen' | 'resolved',
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/admin/period-attendance/alerts/${alertId}/update`, {
    alert_status: alertStatus,
  })
  return data
}
