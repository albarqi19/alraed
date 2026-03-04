import { apiClient } from '@/services/api/client'
import type {
  RemoteAttendanceStatusResponse,
  RemoteUploadResponse,
  RemoteReportData,
} from './types'

export async function fetchRemoteAttendanceStatus(
  date?: string,
): Promise<RemoteAttendanceStatusResponse> {
  const params = date ? { date } : {}
  const { data } = await apiClient.get('/teacher/remote-attendance/status', { params })
  if (!data.success) throw new Error(data.message ?? 'تعذر تحميل حالة الدوام عن بعد')
  return data
}

export async function uploadRemoteAttendance(
  sessionId: number,
  file: File,
  date?: string,
): Promise<RemoteUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (date) formData.append('date', date)

  const { data } = await apiClient.post(
    `/teacher/remote-attendance/${sessionId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  if (!data.success) throw new Error(data.message ?? 'تعذر رفع الملف')
  return data.data
}

export async function fetchRemoteAttendanceReport(
  sessionId: number,
  date?: string,
): Promise<RemoteReportData> {
  const params = date ? { date } : {}
  const { data } = await apiClient.get(
    `/teacher/remote-attendance/${sessionId}/report`,
    { params },
  )
  if (!data.success) throw new Error(data.message ?? 'تعذر تحميل التقرير')
  return data.data
}
