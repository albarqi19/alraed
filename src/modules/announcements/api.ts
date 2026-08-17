import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type { ActiveAnnouncement, AnnouncementPayload, PlatformAnnouncement } from './types'

/** ما يراه المستخدمُ الآن — يُستدعى كلَّ دقيقة، فالردُّ خفيفٌ مقصوداً. */
export async function fetchActiveAnnouncements(): Promise<ActiveAnnouncement[]> {
  const { data } = await apiClient.get<ApiResponse<ActiveAnnouncement[]>>('/announcements/active')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الإعلانات')
  }
  return data.data
}

export async function dismissAnnouncement(id: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/announcements/${id}/dismiss`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إخفاء الإعلان')
  }
}

interface PlatformListResponse {
  items: PlatformAnnouncement[]
  meta: { current_page: number; last_page: number; total: number }
}

export async function fetchPlatformAnnouncements(status?: string | null): Promise<PlatformListResponse> {
  const endpoint = status ? `/platform/announcements?status=${status}` : '/platform/announcements'
  const { data } = await apiClient.get<ApiResponse<PlatformListResponse>>(endpoint)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل قائمة الإعلانات')
  }
  return data.data
}

export async function createPlatformAnnouncement(payload: AnnouncementPayload): Promise<PlatformAnnouncement> {
  const { data } = await apiClient.post<ApiResponse<PlatformAnnouncement>>('/platform/announcements', payload)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر نشر الإعلان')
  }
  return data.data
}

export async function updatePlatformAnnouncement(
  id: number,
  payload: AnnouncementPayload,
): Promise<PlatformAnnouncement> {
  const { data } = await apiClient.put<ApiResponse<PlatformAnnouncement>>(`/platform/announcements/${id}`, payload)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحديث الإعلان')
  }
  return data.data
}

export async function archivePlatformAnnouncement(id: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/platform/announcements/${id}/archive`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر أرشفة الإعلان')
  }
}

export async function deletePlatformAnnouncement(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/platform/announcements/${id}`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر حذف الإعلان')
  }
}
