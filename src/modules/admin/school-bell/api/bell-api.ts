import { apiClient } from '@/services/api/client'
import type {
  BellManagerState,
  BellSchedule,
  BellEvent,
  BellAudioAsset,
  ToneProfile,
  Weekday,
} from '../types'

// ============ Response Types ============

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface BellSettingsResponse {
  settings: ApiRawSettings
  schedules: ApiRawSchedule[]
  toneProfiles: ApiRawToneProfile[]
  audioAssets: ApiRawAudioAsset[]
}

// ============ API Raw Types ============

type ApiRawData = Record<string, unknown>

interface ApiRawSettings {
  school_id: number
  is_enabled: boolean
  background_execution: boolean
  show_widget: boolean
  active_schedule_uuid: string | null
  active_tone_profile_id: string | null
  install_reminder_dismissed: boolean
  additional_settings: Record<string, unknown> | null
}

interface ApiRawSchedule {
  id: number
  uuid: string
  school_id: number
  name: string
  description: string | null
  is_enabled: boolean
  allow_background_execution: boolean
  tone_profile_id: string | null
  linked_schedule_id: number | null
  events: ApiRawEvent[]
  created_at: string
  updated_at: string
}

interface ApiRawEvent {
  id: number
  uuid: string
  bell_schedule_id: number
  title: string
  time: string
  category: string
  sound_id: string | null
  repeat_type: string
  repeat_days: number[] | null
  enabled: boolean
  notes: string | null
  linked_period_id: number | null
  created_at: string
  updated_at: string
}

interface ApiRawAudioAsset {
  id: number
  asset_id: string
  school_id: number | null
  title: string
  duration_seconds: number
  status: string
  size_kb: number
  file_path: string | null
  external_url: string | null
  url: string | null
  is_system_default: boolean
  last_synced_at: string | null
}

interface ApiRawToneProfile {
  id: number
  profile_id: string
  school_id: number | null
  name: string
  description: string | null
  voice_type: string
  intensity: string
  tags: string[] | null
  mapping: Record<string, string> | null
  preview_asset_id: string | null
  is_system_default: boolean
}

// ============ Settings API ============

export async function getBellSettings(): Promise<{
  settings: Partial<BellManagerState>
  schedules: BellSchedule[]
  toneProfiles: ToneProfile[]
  audioAssets: BellAudioAsset[]
}> {
  const response = await apiClient.get<ApiResponse<BellSettingsResponse>>('/admin/bell/settings')
  const data = response.data.data

  return {
    settings: normalizeSettingsFromApi(data.settings),
    schedules: (data.schedules || []).map(normalizeScheduleFromApi),
    toneProfiles: (data.toneProfiles || []).map(normalizeToneProfileFromApi),
    audioAssets: (data.audioAssets || []).map(normalizeAudioAssetFromApi),
  }
}

export async function updateBellSettings(payload: Partial<BellManagerState>): Promise<void> {
  await apiClient.put('/admin/bell/settings', {
    is_enabled: payload.backgroundExecution,
    background_execution: payload.backgroundExecution,
    show_widget: payload.showWidget,
    active_schedule_uuid: payload.activeScheduleId,
    install_reminder_dismissed: payload.installReminderDismissed,
  })
}

export async function syncBellState(state: BellManagerState): Promise<void> {
  await apiClient.post('/admin/bell/sync', {
    schedules: state.schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      isEnabled: schedule.isEnabled,
      allowBackgroundExecution: schedule.allowBackgroundExecution,
      toneProfileId: schedule.toneProfileId,
      events: schedule.events.map((event) => ({
        id: event.id,
        title: event.title,
        time: event.time,
        category: event.category,
        soundId: event.soundId,
        repeatType: event.repeatType,
        repeatDays: event.repeatDays,
        enabled: event.enabled,
        notes: event.notes,
      })),
    })),
    activeScheduleId: state.activeScheduleId,
    backgroundExecution: state.backgroundExecution,
    showWidget: state.showWidget,
  })
}

// ============ Schedules API ============

export async function getBellSchedules(): Promise<BellSchedule[]> {
  const response = await apiClient.get<ApiResponse<ApiRawSchedule[]>>('/admin/bell/schedules')
  return response.data.data.map(normalizeScheduleFromApi)
}

export async function createBellSchedule(payload: {
  name: string
  description?: string
  isEnabled?: boolean
  allowBackgroundExecution?: boolean
  toneProfileId?: string
  linkedScheduleId?: number
}): Promise<BellSchedule> {
  const response = await apiClient.post<ApiResponse<ApiRawSchedule>>('/admin/bell/schedules', {
    name: payload.name,
    description: payload.description,
    is_enabled: payload.isEnabled ?? false,
    allow_background_execution: payload.allowBackgroundExecution ?? true,
    tone_profile_id: payload.toneProfileId,
    linked_schedule_id: payload.linkedScheduleId,
  })
  return normalizeScheduleFromApi(response.data.data)
}

export async function updateBellSchedule(
  id: string | number,
  payload: {
    name: string
    description?: string
    isEnabled?: boolean
    allowBackgroundExecution?: boolean
    toneProfileId?: string
    linkedScheduleId?: number
  }
): Promise<BellSchedule> {
  const response = await apiClient.put<ApiResponse<ApiRawSchedule>>(`/admin/bell/schedules/${id}`, {
    name: payload.name,
    description: payload.description,
    is_enabled: payload.isEnabled,
    allow_background_execution: payload.allowBackgroundExecution,
    tone_profile_id: payload.toneProfileId,
    linked_schedule_id: payload.linkedScheduleId,
  })
  return normalizeScheduleFromApi(response.data.data)
}

export async function deleteBellSchedule(id: string | number): Promise<void> {
  await apiClient.delete(`/admin/bell/schedules/${id}`)
}

export async function activateBellSchedule(id: string | number): Promise<void> {
  await apiClient.post(`/admin/bell/schedules/${id}/activate`)
}

export async function deactivateBellSchedule(id: string | number): Promise<void> {
  await apiClient.post(`/admin/bell/schedules/${id}/deactivate`)
}

export async function syncScheduleFromLinkedSchedule(id: string | number): Promise<BellSchedule> {
  const response = await apiClient.post<ApiResponse<ApiRawSchedule>>(
    `/admin/bell/schedules/${id}/sync-from-schedule`
  )
  return normalizeScheduleFromApi(response.data.data)
}

export async function duplicateBellSchedule(id: string | number, name: string): Promise<BellSchedule> {
  const response = await apiClient.post<ApiResponse<ApiRawSchedule>>(
    `/admin/bell/schedules/${id}/duplicate`,
    { name }
  )
  return normalizeScheduleFromApi(response.data.data)
}

export async function getAvailableSchedules(): Promise<
  Array<{
    id: number
    name: string
    type: string
    targetLevel: string | null
    isActive: boolean
    periods: Array<{
      id: number
      periodNumber: number
      startTime: string
      endTime: string
      isBreak: boolean
      periodName: string | null
    }>
  }>
> {
  const response = await apiClient.get<ApiResponse<ApiRawData[]>>('/admin/bell/schedules/available-schedules')
  return response.data.data.map((schedule) => ({
    id: Number(schedule.id),
    name: String(schedule.name || ''),
    type: String(schedule.type || 'custom'),
    targetLevel: schedule.target_level as string | null ?? null,
    isActive: Boolean(schedule.is_active),
    periods: Array.isArray(schedule.periods)
      ? schedule.periods.map((period: ApiRawData) => ({
          id: Number(period.id),
          periodNumber: Number(period.period_number),
          startTime: String(period.start_time || ''),
          endTime: String(period.end_time || ''),
          isBreak: Boolean(period.is_break),
          periodName: period.period_name as string | null ?? null,
        }))
      : [],
  }))
}

// ============ Events API ============

export async function createBellEvent(
  scheduleId: string | number,
  payload: Omit<BellEvent, 'id'>
): Promise<BellEvent> {
  const response = await apiClient.post<ApiResponse<ApiRawEvent>>(
    `/admin/bell/schedules/${scheduleId}/events`,
    {
      title: payload.title,
      time: payload.time,
      category: payload.category,
      sound_id: payload.soundId,
      repeat_type: payload.repeatType,
      repeat_days: payload.repeatDays,
      enabled: payload.enabled,
      notes: payload.notes,
    }
  )
  return normalizeEventFromApi(response.data.data)
}

export async function updateBellEvent(
  scheduleId: string | number,
  eventId: string | number,
  payload: Partial<BellEvent>
): Promise<BellEvent> {
  const response = await apiClient.put<ApiResponse<ApiRawEvent>>(
    `/admin/bell/schedules/${scheduleId}/events/${eventId}`,
    {
      title: payload.title,
      time: payload.time,
      category: payload.category,
      sound_id: payload.soundId,
      repeat_type: payload.repeatType,
      repeat_days: payload.repeatDays,
      enabled: payload.enabled,
      notes: payload.notes,
    }
  )
  return normalizeEventFromApi(response.data.data)
}

export async function deleteBellEvent(scheduleId: string | number, eventId: string | number): Promise<void> {
  await apiClient.delete(`/admin/bell/schedules/${scheduleId}/events/${eventId}`)
}

export async function toggleBellEventEnabled(
  scheduleId: string | number,
  eventId: string | number
): Promise<BellEvent> {
  const response = await apiClient.post<ApiResponse<ApiRawEvent>>(
    `/admin/bell/schedules/${scheduleId}/events/${eventId}/toggle`
  )
  return normalizeEventFromApi(response.data.data)
}

export async function getUpcomingEvents(): Promise<BellEvent[]> {
  const response = await apiClient.get<ApiResponse<ApiRawEvent[]>>('/admin/bell/events/upcoming')
  return response.data.data.map(normalizeEventFromApi)
}

// ============ Audio API ============

export async function getBellAudioAssets(): Promise<BellAudioAsset[]> {
  const response = await apiClient.get<ApiResponse<ApiRawAudioAsset[]>>('/admin/bell/audio')
  return response.data.data.map(normalizeAudioAssetFromApi)
}

export async function uploadBellAudio(file: File, title: string): Promise<BellAudioAsset> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)

  const response = await apiClient.post<ApiResponse<ApiRawAudioAsset>>('/admin/bell/audio/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalizeAudioAssetFromApi(response.data.data)
}

export async function addExternalBellAudio(
  title: string,
  externalUrl: string,
  durationSeconds?: number
): Promise<BellAudioAsset> {
  const response = await apiClient.post<ApiResponse<ApiRawAudioAsset>>('/admin/bell/audio/external', {
    title,
    external_url: externalUrl,
    duration_seconds: durationSeconds,
  })
  return normalizeAudioAssetFromApi(response.data.data)
}

export async function deleteBellAudio(id: string | number): Promise<void> {
  await apiClient.delete(`/admin/bell/audio/${id}`)
}

export async function updateBellAudioStatus(
  id: string | number,
  status: BellAudioAsset['status']
): Promise<BellAudioAsset> {
  const response = await apiClient.patch<ApiResponse<ApiRawAudioAsset>>(`/admin/bell/audio/${id}/status`, {
    status,
  })
  return normalizeAudioAssetFromApi(response.data.data)
}

// ============ Normalizers (API -> Frontend) ============

function normalizeSettingsFromApi(data: ApiRawSettings): Partial<BellManagerState> {
  return {
    activeScheduleId: data.active_schedule_uuid ?? null,
    backgroundExecution: Boolean(data.background_execution),
    showWidget: data.show_widget !== false,
    installReminderDismissed: Boolean(data.install_reminder_dismissed),
  }
}

function normalizeScheduleFromApi(data: ApiRawSchedule): BellSchedule {
  return {
    id: data.uuid,
    name: data.name,
    description: data.description ?? undefined,
    isEnabled: Boolean(data.is_enabled),
    allowBackgroundExecution: data.allow_background_execution !== false,
    toneProfileId: data.tone_profile_id ?? '',
    events: (data.events || []).map(normalizeEventFromApi),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

function normalizeEventFromApi(data: ApiRawEvent): BellEvent {
  return {
    id: data.uuid,
    title: data.title,
    time: data.time.substring(0, 5), // HH:mm format
    category: data.category as BellEvent['category'],
    soundId: data.sound_id ?? '',
    repeatType: data.repeat_type as BellEvent['repeatType'],
    repeatDays: (data.repeat_days ?? []) as Weekday[],
    enabled: Boolean(data.enabled),
    notes: data.notes ?? undefined,
  }
}

function normalizeAudioAssetFromApi(data: ApiRawAudioAsset): BellAudioAsset {
  return {
    id: data.asset_id,
    title: data.title,
    durationSeconds: data.duration_seconds || 0,
    status: data.status as BellAudioAsset['status'],
    sizeKb: data.size_kb || 0,
    lastSyncedAt: data.last_synced_at ?? undefined,
    url: data.url ?? data.external_url ?? undefined,
    cacheStatus: 'not-cached',
  }
}

function normalizeToneProfileFromApi(data: ApiRawToneProfile): ToneProfile {
  return {
    id: data.profile_id,
    name: data.name,
    description: data.description ?? undefined,
    voiceType: data.voice_type,
    intensity: data.intensity as ToneProfile['intensity'],
    tags: data.tags ?? [],
    mapping: (data.mapping ?? {}) as ToneProfile['mapping'],
    previewAssetId: data.preview_asset_id ?? '',
  }
}

// ============ Active Schedules API (for quick import) ============

export interface ActiveScheduleInfo {
  id: number
  name: string
  type: string
  targetLevel: string | null
  periodsCount: number
  lessonsCount: number
  breaksCount: number
  periods: Array<{
    id: number
    periodNumber: number
    periodName: string | null
    startTime: string
    endTime: string
    isBreak: boolean
  }>
}

export async function getActiveSchedules(): Promise<ActiveScheduleInfo[]> {
  const response = await apiClient.get<ApiResponse<ApiRawData[]>>('/admin/bell/active-schedules')
  return response.data.data.map((schedule) => ({
    id: Number(schedule.id),
    name: String(schedule.name || ''),
    type: String(schedule.type || 'custom'),
    targetLevel: schedule.target_level as string | null ?? null,
    periodsCount: Number(schedule.periods_count ?? 0),
    lessonsCount: Number(schedule.lessons_count ?? 0),
    breaksCount: Number(schedule.breaks_count ?? 0),
    periods: Array.isArray(schedule.periods)
      ? schedule.periods.map((period: ApiRawData) => ({
          id: Number(period.id),
          periodNumber: Number(period.period_number),
          periodName: period.period_name as string | null ?? null,
          startTime: String(period.start_time || ''),
          endTime: String(period.end_time || ''),
          isBreak: Boolean(period.is_break),
        }))
      : [],
  }))
}

export async function createBellScheduleFromSchedule(payload: {
  scheduleId: number
  name?: string
  toneProfileId?: string
  workingDays?: string[]
}): Promise<BellSchedule> {
  const response = await apiClient.post<ApiResponse<ApiRawSchedule>>(
    '/admin/bell/schedules/create-from-schedule',
    {
      schedule_id: payload.scheduleId,
      name: payload.name,
      tone_profile_id: payload.toneProfileId,
      working_days: payload.workingDays,
    }
  )
  return normalizeScheduleFromApi(response.data.data)
}

export async function reapplyToneProfile(scheduleId: string | number): Promise<BellSchedule> {
  const response = await apiClient.post<ApiResponse<ApiRawSchedule>>(
    `/admin/bell/schedules/${scheduleId}/reapply-tone-profile`
  )
  return normalizeScheduleFromApi(response.data.data)
}

// ============ Extension Status API ============

export interface ExtensionStatus {
  connected: boolean
  connectionStatus: 'online' | 'offline' | 'unknown'
  lastSeen: string | null
  version: string | null
  status: Record<string, unknown> | null
  nextEvent: string | null
  activeSchedule: string | null
}

export async function getExtensionStatus(): Promise<ExtensionStatus> {
  const response = await apiClient.get<ApiResponse<{
    connected: boolean
    connection_status: string
    last_seen: string | null
    version: string | null
    status: Record<string, unknown> | null
    next_event: string | null
    active_schedule: string | null
  }>>('/admin/bell/extension-status')

  const data = response.data.data
  return {
    connected: Boolean(data.connected),
    connectionStatus: (data.connection_status as ExtensionStatus['connectionStatus']) || 'unknown',
    lastSeen: data.last_seen,
    version: data.version,
    status: data.status,
    nextEvent: data.next_event,
    activeSchedule: data.active_schedule,
  }
}

// ============ Manual Ring API ============

export async function sendManualRing(audioId: string): Promise<{ commandId: number }> {
  const response = await apiClient.post<ApiResponse<{ command_id: number }>>('/admin/bell/manual-ring', {
    audio_id: audioId,
  })
  return { commandId: response.data.data.command_id }
}

// Export for use elsewhere
export {
  normalizeScheduleFromApi,
  normalizeEventFromApi,
  normalizeAudioAssetFromApi,
  normalizeToneProfileFromApi,
}
