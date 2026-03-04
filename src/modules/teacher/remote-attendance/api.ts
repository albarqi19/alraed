import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type {
  RemoteAttendanceStatusResponse,
  RemoteUploadResponse,
  RemoteReportData,
} from './types'

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && error.response?.data) {
    const payload = error.response.data as { message?: string }
    if (payload?.message) return payload.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

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
  try {
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
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر رفع الملف'))
  }
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
