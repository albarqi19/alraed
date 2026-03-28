import { apiClient } from '@/services/api/client'
import type {
  AppNotificationStats,
  TeacherAppStatus,
  NotificationLogEntry,
  SendNotificationPayload,
} from './types'

export async function fetchNotificationStats(): Promise<AppNotificationStats> {
  const { data } = await apiClient.get<{ success: boolean; data: AppNotificationStats }>(
    '/admin/app-notifications/stats',
  )
  return data.data
}

export async function fetchTeachersAppStatus(filters?: {
  search?: string
  status?: string
}): Promise<TeacherAppStatus[]> {
  const { data } = await apiClient.get<{ success: boolean; data: TeacherAppStatus[] }>(
    '/admin/app-notifications/teachers',
    { params: filters },
  )
  return data.data
}

export async function fetchNotificationHistory(page = 1): Promise<{
  data: NotificationLogEntry[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}> {
  const { data } = await apiClient.get<{
    success: boolean
    data: NotificationLogEntry[]
    meta: { current_page: number; last_page: number; per_page: number; total: number }
  }>('/admin/app-notifications/history', { params: { page } })
  return { data: data.data, meta: data.meta }
}

export async function sendNotification(
  payload: SendNotificationPayload,
): Promise<NotificationLogEntry> {
  const { data } = await apiClient.post<{ success: boolean; data: NotificationLogEntry }>(
    '/admin/app-notifications/send',
    payload,
  )
  return data.data
}
