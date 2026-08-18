import axios from 'axios'
import type { AutoCallQueueEntry, AutoCallSettings } from '../types'
import { DEFAULT_AUTO_CALL_SETTINGS } from '../constants'

/**
 * مسارُ الشاشة العامّ — بالرمز لا بالجلسة.
 *
 * `apiClient` المشترك يحقن ترويسة `Authorization` ويعترض 401 بإخراج المستخدم
 * وإعادة توجيهه إلى صفحة الدخول. وشاشةُ البوّابة لا مستخدمَ فيها أصلاً: عميلٌ
 * عارٍ خاصٌّ بها يمنع أن يوقظ ردٌّ عابر منطقَ الجلسة فيقذف الشاشةَ إلى صفحة
 * تسجيل دخولٍ يقرؤها الآباء عند المدخل.
 */
const displayClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

export interface DisplayAcknowledgement {
  id: string
  studentName: string
  classLabel: string | null
  resolvedAt: string | null
}

export interface DisplayState {
  schoolId: number | null
  schoolName: string | null
  settings: AutoCallSettings
  queue: AutoCallQueueEntry[]
  recentAcknowledged: DisplayAcknowledgement[]
  /** ساعةُ الخادم لحظةَ الردّ — تُقاس بها إزاحةُ ساعة جهاز العرض. */
  serverTime: string | null
}

type Raw = Record<string, unknown>

function normalizeCall(raw: Raw): AutoCallQueueEntry {
  return {
    id: String(raw.id),
    studentId: null,
    // المسارُ العامّ لا يرسل هويّةً ولا هاتفاً عمداً — الشاشةُ تُقرأ من الشارع.
    studentNationalId: '',
    studentName: String(raw.student_name || ''),
    classLabel: (raw.class_label as string | null) ?? null,
    guardianName: null,
    guardianPhone: null,
    createdAt: String(raw.created_at || new Date().toISOString()),
    status: (raw.status as AutoCallQueueEntry['status']) || 'pending',
    lastAnnouncedAt: (raw.last_announced_at as string | null) ?? null,
    announcedCount: Number(raw.announced_count) || 0,
    acknowledgedAt: null,
    acknowledgedBy: null,
    expiresAt: null,
    notes: null,
  }
}

function normalizeSettings(raw: Raw): AutoCallSettings {
  return {
    ...DEFAULT_AUTO_CALL_SETTINGS,
    enabled: raw.enabled === true,
    openFrom: (raw.open_from as string | null) ?? null,
    openUntil: (raw.open_until as string | null) ?? null,
    repeatIntervalSeconds: Number(raw.repeat_interval_seconds) || DEFAULT_AUTO_CALL_SETTINGS.repeatIntervalSeconds,
    announcementDurationSeconds:
      Number(raw.announcement_duration_seconds) || DEFAULT_AUTO_CALL_SETTINGS.announcementDurationSeconds,
    enableSpeech: raw.enable_speech !== false,
    autoAnnounce: raw.auto_announce !== false,
    maxAnnouncements: Number(raw.max_announcements) || DEFAULT_AUTO_CALL_SETTINGS.maxAnnouncements,
    announceWithClass: raw.announce_with_class !== false,
    speechRate: Number(raw.speech_rate) || DEFAULT_AUTO_CALL_SETTINGS.speechRate,
    voiceGender: (raw.voice_gender as AutoCallSettings['voiceGender']) || 'auto',
    voiceLocale: (raw.voice_locale as string) || DEFAULT_AUTO_CALL_SETTINGS.voiceLocale,
    displayTheme: raw.display_theme === 'light' ? 'light' : 'dark',
    geofence: null,
  }
}

export async function fetchDisplayState(token: string): Promise<DisplayState> {
  const { data } = await displayClient.get<{ data: Raw }>(`/auto-call/display/${token}/state`)
  const payload = (data?.data ?? {}) as Raw

  return {
    schoolId: payload.school_id != null ? Number(payload.school_id) : null,
    schoolName: (payload.school_name as string | null) ?? null,
    settings: normalizeSettings((payload.settings ?? {}) as Raw),
    queue: Array.isArray(payload.queue) ? (payload.queue as Raw[]).map(normalizeCall) : [],
    recentAcknowledged: Array.isArray(payload.recent_acknowledged)
      ? (payload.recent_acknowledged as Raw[]).map((row) => ({
          id: String(row.id),
          studentName: String(row.student_name || ''),
          classLabel: (row.class_label as string | null) ?? null,
          resolvedAt: (row.resolved_at as string | null) ?? null,
        }))
      : [],
    serverTime: (payload.server_time as string | null) ?? null,
  }
}

export async function announceNextByToken(token: string): Promise<AutoCallQueueEntry | null> {
  const { data } = await displayClient.post<{ data: Raw | null }>(`/auto-call/display/${token}/announce-next`)
  return data?.data ? normalizeCall(data.data) : null
}

export async function finishAnnouncementByToken(token: string, callId: string): Promise<void> {
  await displayClient.post(`/auto-call/display/${token}/calls/${callId}/finish`)
}
