import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type {
  RemoteDayOverview,
  RemoteDayDetails,
  RemoteUploadDetails,
} from './types'

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && error.response?.data) {
    const payload = error.response.data as { message?: string }
    if (payload?.message) return payload.message
  }
  if (error instanceof Error) return error.message
  return fallback
}

export async function activateRemoteDay(
  date: string,
  note?: string,
): Promise<{ id: number; date: string; note: string | null }> {
  try {
    const { data } = await apiClient.post('/admin/remote-attendance/activate', {
      date,
      note,
    })
    if (!data.success) throw new Error(data.message ?? 'تعذر تفعيل يوم الدوام عن بعد')
    return data.data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تفعيل يوم الدوام عن بعد'))
  }
}

export async function deactivateRemoteDay(date: string): Promise<void> {
  try {
    const { data } = await apiClient.delete(
      `/admin/remote-attendance/deactivate/${date}`,
    )
    if (!data.success) throw new Error(data.message ?? 'تعذر إلغاء يوم الدوام عن بعد')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر إلغاء يوم الدوام عن بعد'))
  }
}

export async function fetchRemoteDaysOverview(): Promise<RemoteDayOverview[]> {
  const { data } = await apiClient.get('/admin/remote-attendance/overview')
  if (!data.success) throw new Error(data.message ?? 'تعذر تحميل البيانات')
  return data.data
}

export async function fetchRemoteDayDetails(
  date: string,
): Promise<RemoteDayDetails> {
  const { data } = await apiClient.get(`/admin/remote-attendance/day/${date}`)
  if (!data.success) throw new Error(data.message ?? 'تعذر تحميل تفاصيل اليوم')
  return data.data
}

export async function fetchRemoteUploadDetails(
  uploadId: number,
): Promise<RemoteUploadDetails> {
  const { data } = await apiClient.get(
    `/admin/remote-attendance/upload/${uploadId}`,
  )
  if (!data.success) throw new Error(data.message ?? 'تعذر تحميل تفاصيل الرفع')
  return data.data
}
