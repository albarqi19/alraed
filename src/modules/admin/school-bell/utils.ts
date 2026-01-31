import type {
  BellAudioAsset,
  BellEvent,
  BellManagerState,
  BellSchedule,
  ToneProfile,
  Weekday,
} from './types'

export const STORAGE_KEY = 'norin:admin:school-bell-state@v1'

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 0, label: 'الأحد', short: 'أحد' },
  { value: 1, label: 'الإثنين', short: 'إثن' },
  { value: 2, label: 'الثلاثاء', short: 'ثلا' },
  { value: 3, label: 'الأربعاء', short: 'أرب' },
  { value: 4, label: 'الخميس', short: 'خمي' },
  { value: 5, label: 'الجمعة', short: 'جمع' },
  { value: 6, label: 'السبت', short: 'سبت' },
]

// لا توجد أصوات افتراضية - يتم تحميلها من الخادم
export const DEFAULT_AUDIO_ASSETS: BellAudioAsset[] = []

// لا توجد ملفات نغمات افتراضية - يتم تحميلها من الخادم
export const DEFAULT_TONE_PROFILES: ToneProfile[] = []

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

// لا توجد جداول افتراضية - يتم تحميلها من الخادم
export const DEFAULT_SCHEDULES: BellSchedule[] = []

export function findToneProfile(profiles: ToneProfile[], toneProfileId?: string | null) {
  if (!profiles.length) return null
  if (toneProfileId) {
    const match = profiles.find((profile) => profile.id === toneProfileId)
    if (match) return match
  }
  return profiles[0] ?? null
}

export function resolveSoundIdForEvent(
  event: BellEvent,
  toneProfile: ToneProfile | null,
  audioAssets: BellAudioAsset[],
): string {
  const existing = event.soundId
  if (toneProfile) {
    const mapped = toneProfile.mapping[event.category] ?? toneProfile.mapping.generic ?? toneProfile.previewAssetId
    if (mapped) {
      return mapped
    }
  }
  if (existing) return existing
  const readyAsset = audioAssets.find((asset) => asset.status === 'ready') ?? audioAssets[0]
  return readyAsset?.id ?? ''
}

export function applyToneProfileToEvents(
  events: BellEvent[],
  toneProfile: ToneProfile | null,
  audioAssets: BellAudioAsset[],
): BellEvent[] {
  return events.map((event) => ({
    ...event,
    soundId: resolveSoundIdForEvent(event, toneProfile, audioAssets),
  }))
}

export function normalizeSchedules(
  schedules: BellSchedule[],
  toneProfiles: ToneProfile[],
  audioAssets: BellAudioAsset[],
): BellSchedule[] {
  return schedules.map((schedule) => {
    const toneProfile = findToneProfile(toneProfiles, schedule.toneProfileId)
    const toneProfileId = toneProfile?.id ?? toneProfiles[0]?.id ?? schedule.toneProfileId
    return {
      ...schedule,
      toneProfileId,
      events: applyToneProfileToEvents(schedule.events, toneProfile, audioAssets),
    }
  })
}

export function assignEventSound(
  event: BellEvent,
  toneProfileId: string,
  toneProfiles: ToneProfile[],
  audioAssets: BellAudioAsset[],
): BellEvent {
  const toneProfile = findToneProfile(toneProfiles, toneProfileId)
  return {
    ...event,
    soundId: resolveSoundIdForEvent(event, toneProfile, audioAssets),
  }
}

export function loadInitialState(): BellManagerState {
  const buildState = (
    schedules: BellSchedule[],
    audioAssets: BellAudioAsset[],
    toneProfiles: ToneProfile[],
    activeScheduleId: string | null,
    backgroundExecution: boolean,
    installReminderDismissed: boolean,
    showWidget: boolean,
  ): BellManagerState => {
    const normalizedSchedules = normalizeSchedules(schedules, toneProfiles, audioAssets)
    const resolvedActiveScheduleId = activeScheduleId ?? normalizedSchedules[0]?.id ?? null
    return {
      schedules: normalizedSchedules,
      activeScheduleId: resolvedActiveScheduleId,
      audioAssets,
      toneProfiles,
      backgroundExecution,
      installReminderDismissed,
      showWidget,
    }
  }

  if (typeof window === 'undefined') {
    return buildState(
      DEFAULT_SCHEDULES,
      DEFAULT_AUDIO_ASSETS,
      DEFAULT_TONE_PROFILES,
      DEFAULT_SCHEDULES[0]?.id ?? null,
      false,  // backgroundExecution: معطّل افتراضياً
      false,
      false,  // showWidget: مخفي افتراضياً
    )
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return buildState(
        DEFAULT_SCHEDULES,
        DEFAULT_AUDIO_ASSETS,
        DEFAULT_TONE_PROFILES,
        DEFAULT_SCHEDULES[0]?.id ?? null,
        false,  // backgroundExecution: معطّل افتراضياً
        false,
        false,  // showWidget: مخفي افتراضياً
      )
    }

    const parsed = JSON.parse(raw) as Partial<BellManagerState>
    const toneProfiles = parsed.toneProfiles?.length ? parsed.toneProfiles : DEFAULT_TONE_PROFILES
    const audioAssets = parsed.audioAssets?.length ? parsed.audioAssets : DEFAULT_AUDIO_ASSETS
    const schedules = parsed.schedules?.length ? parsed.schedules : DEFAULT_SCHEDULES
    return buildState(
      schedules,
      audioAssets,
      toneProfiles,
      parsed.activeScheduleId ?? schedules[0]?.id ?? null,
      parsed.backgroundExecution ?? false,  // معطّل افتراضياً
      Boolean(parsed.installReminderDismissed),
      parsed.showWidget ?? false,  // مخفي افتراضياً
    )
  } catch (error) {
    console.warn('تعذر قراءة حالة الجرس المدرسي من التخزين المحلي. سيتم استخدام الإعدادات الافتراضية.', error)
    return buildState(
      DEFAULT_SCHEDULES,
      DEFAULT_AUDIO_ASSETS,
      DEFAULT_TONE_PROFILES,
      DEFAULT_SCHEDULES[0]?.id ?? null,
      false,  // backgroundExecution: معطّل افتراضياً
      false,
      false,  // showWidget: مخفي افتراضياً
    )
  }
}

export function getNextOccurrence(event: BellEvent, baseDate: Date): Date | null {
  const allowedDays = event.repeatType === 'daily' ? WEEKDAYS.map((w) => w.value) : event.repeatDays ?? []
  if (!allowedDays.length) return null

  const [hours, minutes] = event.time.split(':').map((value) => parseInt(value, 10))

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(baseDate)
    candidate.setHours(0, 0, 0, 0)
    candidate.setDate(baseDate.getDate() + offset)
    const candidateDay = candidate.getDay() as Weekday

    if (!allowedDays.includes(candidateDay)) {
      continue
    }

    candidate.setHours(hours, minutes, 0, 0)
    if (candidate >= baseDate) {
      return candidate
    }
  }

  return null
}

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatTime(time: string) {
  const [hour, minute] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatRelative(target: Date, base: Date) {
  const diffMs = target.getTime() - base.getTime()
  if (diffMs <= 0) return 'الآن'

  const diffMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days > 0) {
    return `${days} يوم${days > 1 ? 'اً' : ''} و ${remainingHours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
