import { apiClient } from '@/services/api/client'
import type {
  AutoCallSettings,
  AutoCallQueueEntry,
  AutoCallHistoryEntry,
  AutoCallGuardianStatus,
  EnqueueAutoCallPayload,
  AutoCallStatus,
} from '../types'

// ============ Response Types ============

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

interface QueueStatistics {
  pending: number
  announcing: number
  acknowledged: number
  total: number
}

// ============ API Raw Response Type ============

type ApiRawData = Record<string, unknown>

// ============ Settings API ============

export async function getAutoCallSettings(): Promise<AutoCallSettings> {
  const response = await apiClient.get<ApiResponse<ApiRawData>>('/admin/auto-call/settings')
  return normalizeSettingsFromApi(response.data.data)
}

export async function updateAutoCallSettings(payload: Partial<AutoCallSettings>): Promise<AutoCallSettings> {
  const apiPayload = normalizeSettingsToApi(payload)
  const response = await apiClient.put<ApiResponse<ApiRawData>>('/admin/auto-call/settings', apiPayload)
  return normalizeSettingsFromApi(response.data.data)
}

// ============ Queue API ============

export async function getAutoCallQueue(): Promise<AutoCallQueueEntry[]> {
  const response = await apiClient.get<ApiResponse<ApiRawData[]>>('/admin/auto-call/queue')
  return response.data.data.map(normalizeQueueEntryFromApi)
}

export async function getAutoCallQueueEntry(id: number | string): Promise<AutoCallQueueEntry> {
  const response = await apiClient.get<ApiResponse<ApiRawData>>(`/admin/auto-call/queue/${id}`)
  return normalizeQueueEntryFromApi(response.data.data)
}

export async function enqueueAutoCall(payload: EnqueueAutoCallPayload): Promise<AutoCallQueueEntry> {
  const apiPayload = {
    student_id: payload.studentId ?? null,
    student_national_id: payload.studentNationalId,
    student_name: payload.studentName,
    class_label: payload.classLabel ?? null,
    guardian_name: payload.guardianName ?? null,
    guardian_phone: payload.guardianPhone ?? null,
    notes: payload.notes ?? null,
    requested_by: payload.requestedBy,
  }
  const response = await apiClient.post<ApiResponse<ApiRawData>>('/admin/auto-call/queue', apiPayload)
  return normalizeQueueEntryFromApi(response.data.data)
}

export async function updateAutoCallStatus(
  id: number | string,
  status: AutoCallStatus,
  notes?: string | null
): Promise<AutoCallQueueEntry> {
  const response = await apiClient.patch<ApiResponse<ApiRawData>>(`/admin/auto-call/queue/${id}/status`, {
    status,
    notes: notes ?? null,
  })
  return normalizeQueueEntryFromApi(response.data.data)
}

export async function acknowledgeAutoCall(
  id: number | string,
  acknowledgedBy: 'guardian' | 'admin'
): Promise<AutoCallQueueEntry> {
  const response = await apiClient.post<ApiResponse<ApiRawData>>(`/admin/auto-call/queue/${id}/acknowledge`, {
    acknowledged_by: acknowledgedBy,
  })
  return normalizeQueueEntryFromApi(response.data.data)
}

export async function cancelAutoCall(id: number | string): Promise<void> {
  await apiClient.delete(`/admin/auto-call/queue/${id}`)
}

export async function getQueueStatistics(): Promise<QueueStatistics> {
  const response = await apiClient.get<ApiResponse<QueueStatistics>>('/admin/auto-call/queue/statistics')
  return response.data.data
}

// ============ History API ============

export async function getAutoCallHistory(params?: {
  page?: number
  per_page?: number
  date_from?: string
  date_to?: string
  status?: string
}): Promise<PaginatedResponse<AutoCallHistoryEntry>> {
  const response = await apiClient.get<PaginatedResponse<ApiRawData>>('/admin/auto-call/history', { params })
  return {
    ...response.data,
    data: response.data.data.map(normalizeHistoryEntryFromApi),
  }
}

export async function getTodayAutoCallHistory(): Promise<AutoCallHistoryEntry[]> {
  const response = await apiClient.get<ApiResponse<ApiRawData[]>>('/admin/auto-call/history/today')
  return response.data.data.map(normalizeHistoryEntryFromApi)
}

export async function getAutoCallHistoryEntry(id: number | string): Promise<AutoCallHistoryEntry> {
  const response = await apiClient.get<ApiResponse<ApiRawData>>(`/admin/auto-call/history/${id}`)
  return normalizeHistoryEntryFromApi(response.data.data)
}

// ============ Guardian Status API ============

export async function getGuardianStatuses(): Promise<AutoCallGuardianStatus[]> {
  const response = await apiClient.get<ApiResponse<ApiRawData[]>>('/admin/auto-call/guardians')
  return response.data.data.map(normalizeGuardianStatusFromApi)
}

export async function checkGuardianStatus(guardianNationalId: string): Promise<AutoCallGuardianStatus | null> {
  try {
    const response = await apiClient.get<ApiResponse<ApiRawData>>('/admin/auto-call/guardians/check', {
      params: { guardian_national_id: guardianNationalId },
    })
    return normalizeGuardianStatusFromApi(response.data.data)
  } catch {
    return null
  }
}

export async function recordGuardianStrike(
  guardianNationalId: string,
  reason?: string | null
): Promise<AutoCallGuardianStatus> {
  const response = await apiClient.post<ApiResponse<ApiRawData>>('/admin/auto-call/guardians/strike', {
    guardian_national_id: guardianNationalId,
    reason: reason ?? null,
  })
  return normalizeGuardianStatusFromApi(response.data.data)
}

export async function unblockGuardian(guardianNationalId: string): Promise<void> {
  await apiClient.delete(`/admin/auto-call/guardians/${guardianNationalId}/block`)
}

// ============ Normalizers (API -> Frontend) ============

function normalizeSettingsFromApi(data: Record<string, unknown>): AutoCallSettings {
  return {
    enabled: Boolean(data.enabled),
    openFrom: data.open_from as string | null ?? null,
    openUntil: data.open_until as string | null ?? null,
    repeatIntervalSeconds: Number(data.repeat_interval_seconds) || 120,
    announcementDurationSeconds: Number(data.announcement_duration_seconds) || 30,
    enableSpeech: data.enable_speech !== false,
    voiceGender: (data.voice_gender as 'male' | 'female' | 'auto') || 'auto',
    voiceLocale: (data.voice_locale as string) || 'ar-SA',
    allowGuardianAcknowledgement: data.allow_guardian_acknowledgement !== false,
    geofence: data.geofence_latitude && data.geofence_longitude
      ? {
          latitude: Number(data.geofence_latitude),
          longitude: Number(data.geofence_longitude),
          radiusMeters: Number(data.geofence_radius_meters) || 150,
        }
      : null,
    maxStrikesBeforeBlock: Number(data.max_strikes_before_block) || 3,
    blockDurationMinutes: Number(data.block_duration_minutes) || 1440,
    displayTheme: data.display_theme === 'light' ? 'light' : 'dark',
    updatedAt: data.updated_at as string | null ?? null,
    createdAt: data.created_at as string | null ?? null,
  }
}

function normalizeSettingsToApi(payload: Partial<AutoCallSettings>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (payload.enabled !== undefined) result.enabled = payload.enabled
  if (payload.openFrom !== undefined) result.open_from = payload.openFrom
  if (payload.openUntil !== undefined) result.open_until = payload.openUntil
  if (payload.repeatIntervalSeconds !== undefined) result.repeat_interval_seconds = payload.repeatIntervalSeconds
  if (payload.announcementDurationSeconds !== undefined) result.announcement_duration_seconds = payload.announcementDurationSeconds
  if (payload.enableSpeech !== undefined) result.enable_speech = payload.enableSpeech
  if (payload.voiceGender !== undefined) result.voice_gender = payload.voiceGender
  if (payload.voiceLocale !== undefined) result.voice_locale = payload.voiceLocale
  if (payload.allowGuardianAcknowledgement !== undefined) result.allow_guardian_acknowledgement = payload.allowGuardianAcknowledgement
  if (payload.geofence !== undefined) {
    if (payload.geofence) {
      result.geofence_latitude = payload.geofence.latitude
      result.geofence_longitude = payload.geofence.longitude
      result.geofence_radius_meters = payload.geofence.radiusMeters
    } else {
      result.geofence_latitude = null
      result.geofence_longitude = null
      result.geofence_radius_meters = null
    }
  }
  if (payload.maxStrikesBeforeBlock !== undefined) result.max_strikes_before_block = payload.maxStrikesBeforeBlock
  if (payload.blockDurationMinutes !== undefined) result.block_duration_minutes = payload.blockDurationMinutes
  if (payload.displayTheme !== undefined) result.display_theme = payload.displayTheme

  return result
}

function normalizeQueueEntryFromApi(data: Record<string, unknown>): AutoCallQueueEntry {
  return {
    id: String(data.id),
    studentId: data.student_id ? Number(data.student_id) : null,
    studentNationalId: String(data.student_national_id || ''),
    studentName: String(data.student_name || ''),
    classLabel: data.class_label as string | null ?? null,
    guardianName: data.guardian_name as string | null ?? null,
    guardianPhone: data.guardian_phone as string | null ?? null,
    createdAt: String(data.created_at || new Date().toISOString()),
    status: (data.status as AutoCallStatus) || 'pending',
    lastAnnouncedAt: data.last_announced_at as string | null ?? null,
    announcedCount: Number(data.announced_count) || 0,
    acknowledgedAt: data.acknowledged_at as string | null ?? null,
    acknowledgedBy: data.acknowledged_by as 'guardian' | 'admin' | null ?? null,
    expiresAt: data.expires_at as string | null ?? null,
    notes: data.notes as string | null ?? null,
  }
}

function normalizeHistoryEntryFromApi(data: Record<string, unknown>): AutoCallHistoryEntry {
  return {
    ...normalizeQueueEntryFromApi(data),
    resolvedAt: data.resolved_at as string | null ?? null,
    resolutionNotes: data.resolution_notes as string | null ?? null,
  }
}

function normalizeGuardianStatusFromApi(data: Record<string, unknown>): AutoCallGuardianStatus {
  return {
    guardianNationalId: String(data.guardian_national_id || ''),
    strikeCount: Number(data.strike_count) || 0,
    blockedUntil: data.blocked_until as string | null ?? null,
    lastViolationAt: data.last_violation_at as string | null ?? null,
    lastStrikeReason: data.last_strike_reason as string | null ?? null,
  }
}

// Export normalizers for use in Echo events
export {
  normalizeQueueEntryFromApi,
  normalizeHistoryEntryFromApi,
  normalizeGuardianStatusFromApi,
  normalizeSettingsFromApi,
}
