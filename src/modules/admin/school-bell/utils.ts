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

export const DEFAULT_AUDIO_ASSETS: BellAudioAsset[] = [
  { id: 'calm-start-v1', title: 'بداية هادئة', durationSeconds: 9, status: 'ready', sizeKb: 410 },
  { id: 'calm-end-v1', title: 'نهاية هادئة', durationSeconds: 7, status: 'ready', sizeKb: 360 },
]

export const DEFAULT_TONE_PROFILES: ToneProfile[] = [
  {
    id: 'calm-voice-v1',
    name: 'صوت هادئ ومتوازن',
    description: 'من نبرة ذكورية لطيفة تناسب الحصص الصباحية الهادئة.',
    voiceType: 'male-calm',
    intensity: 'soft',
    tags: ['هادئ', 'رسمي'],
    previewAssetId: 'calm-start-v1',
    mapping: {
      lesson_start: 'calm-start-v1',
      lesson_end: 'calm-end-v1',
      break: 'calm-break-v1',
      prayer: 'calm-prayer-v1',
      custom: 'calm-generic-v1',
      generic: 'calm-generic-v1',
    },
  },
  {
    id: 'grand-voice-v1',
    name: 'صوت رسمي حيوي',
    description: 'نبرة ذكورية فخمة وحماسية للحصص والفعاليات الكبيرة.',
    voiceType: 'male-grand',
    intensity: 'energetic',
    tags: ['حماسي', 'رسمي'],
    previewAssetId: 'grand-start-v1',
    mapping: {
      lesson_start: 'grand-start-v1',
      lesson_end: 'grand-end-v1',
      break: 'grand-break-v1',
      prayer: 'grand-prayer-v1',
      custom: 'grand-generic-v1',
      generic: 'grand-generic-v1',
    },
  },
  {
    id: 'bright-voice-v1',
    name: 'صوت بشوش وحيوي',
    description: 'نبرة أنثوية مشرقة تناسب المدارس التي تفضل حيوية أكثر.',
    voiceType: 'female-bright',
    intensity: 'standard',
    tags: ['مشرق', 'ودود'],
    previewAssetId: 'bright-start-v1',
    mapping: {
      lesson_start: 'bright-start-v1',
      lesson_end: 'bright-end-v1',
      break: 'bright-break-v1',
      prayer: 'bright-prayer-v1',
      custom: 'bright-generic-v1',
      generic: 'bright-generic-v1',
    },
  },
]

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

export const DEFAULT_SCHEDULES: BellSchedule[] = [
  {
    id: createId(),
    name: 'الجدول الشتوي',
    description: 'مناسب للفترة الشتوية، يبدأ الدوام الساعة 6:45 صباحًا.',
    isEnabled: false,
    allowBackgroundExecution: true,
    toneProfileId: 'calm-voice-v1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [
      {
        id: createId(),
        title: 'الحصة الأولى - بداية',
        time: '06:45',
        category: 'lesson_start',
        soundId: 'calm-start-v1',
        repeatType: 'daily',
        enabled: true,
        notes: 'تشغيل قبل دخول الطلاب بقليل',
      },
      {
        id: createId(),
        title: 'الحصة الأولى - نهاية',
        time: '07:35',
        category: 'lesson_end',
        soundId: 'calm-end-v1',
        repeatType: 'daily',
        enabled: true,
      },
      {
        id: createId(),
        title: 'الفسحة الصباحية',
        time: '09:35',
        category: 'break',
        soundId: 'calm-break-v1',
        repeatType: 'custom',
        repeatDays: [0, 1, 2, 3, 4],
        enabled: true,
        notes: 'لا تشمل يومي الجمعة والسبت',
      },
    ],
  },
]

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
      true,
      false,
      true,
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
        true,
        false,
        true,
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
      parsed.backgroundExecution ?? true,
      Boolean(parsed.installReminderDismissed),
      parsed.showWidget ?? true,
    )
  } catch (error) {
    console.warn('تعذر قراءة حالة الجرس المدرسي من التخزين المحلي. سيتم استخدام الإعدادات الافتراضية.', error)
    return buildState(
      DEFAULT_SCHEDULES,
      DEFAULT_AUDIO_ASSETS,
      DEFAULT_TONE_PROFILES,
      DEFAULT_SCHEDULES[0]?.id ?? null,
      true,
      false,
      true,
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
