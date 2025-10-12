export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface BellEvent {
  id: string
  title: string
  time: string // HH:mm
  category: 'lesson_start' | 'lesson_end' | 'break' | 'prayer' | 'custom'
  soundId: string
  repeatType: 'daily' | 'custom'
  repeatDays?: Weekday[]
  enabled: boolean
  notes?: string
}

export interface BellSchedule {
  id: string
  name: string
  description?: string
  isEnabled: boolean
  events: BellEvent[]
  allowBackgroundExecution: boolean
  toneProfileId: string
  createdAt: string
  updatedAt: string
}

export interface BellAudioAsset {
  id: string
  title: string
  durationSeconds: number
  status: 'ready' | 'pending' | 'missing'
  sizeKb: number
  lastSyncedAt?: string
}

export interface ToneProfile {
  id: string
  name: string
  description?: string
  voiceType: string
  intensity: 'soft' | 'standard' | 'energetic'
  tags: string[]
  mapping: Partial<Record<BellEvent['category'] | 'generic', string>>
  previewAssetId: string
}

export interface BellManagerState {
  schedules: BellSchedule[]
  activeScheduleId: string | null
  audioAssets: BellAudioAsset[]
  toneProfiles: ToneProfile[]
  backgroundExecution: boolean
  installReminderDismissed: boolean
  showWidget: boolean
}

export interface RuntimeLogEntry {
  id: string
  eventId: string
  title: string
  executedAt: string
  status: 'pending-playback' | 'played' | 'skipped'
  source: 'foreground' | 'background' | 'manual'
  notes?: string
}
