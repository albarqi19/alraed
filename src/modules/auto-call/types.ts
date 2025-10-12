export type AutoCallStatus = 'pending' | 'announcing' | 'acknowledged' | 'expired' | 'cancelled'

export type AutoCallVoiceGender = 'male' | 'female' | 'auto'

export interface AutoCallGeofence {
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface AutoCallSettings {
  enabled: boolean
  openFrom?: string | null
  openUntil?: string | null
  repeatIntervalSeconds: number
  announcementDurationSeconds: number
  enableSpeech: boolean
  voiceGender: AutoCallVoiceGender
  voiceLocale: string
  allowGuardianAcknowledgement: boolean
  geofence?: AutoCallGeofence | null
  maxStrikesBeforeBlock: number
  blockDurationMinutes: number
  displayTheme: 'dark' | 'light'
  updatedAt?: string | null
  createdAt?: string | null
}

export interface AutoCallQueueEntry {
  id: string
  studentId: number | null
  studentNationalId: string
  studentName: string
  classLabel?: string | null
  guardianName?: string | null
  guardianPhone?: string | null
  createdAt: string
  status: AutoCallStatus
  lastAnnouncedAt?: string | null
  announcedCount: number
  acknowledgedAt?: string | null
  acknowledgedBy?: 'guardian' | 'admin' | null
  expiresAt?: string | null
  notes?: string | null
}

export interface AutoCallHistoryEntry extends AutoCallQueueEntry {
  resolvedAt?: string | null
  resolutionNotes?: string | null
}

export interface AutoCallGuardianStatus {
  guardianNationalId: string
  strikeCount: number
  blockedUntil?: string | null
  lastViolationAt?: string | null
  lastStrikeReason?: string | null
}

export interface EnqueueAutoCallPayload {
  studentNationalId: string
  studentName: string
  studentId?: number | null
  classLabel?: string | null
  guardianName?: string | null
  guardianPhone?: string | null
  notes?: string | null
  requestedBy: 'guardian' | 'admin'
}

export interface UpdateAutoCallStatusOptions {
  status: AutoCallStatus
  acknowledgedBy?: 'guardian' | 'admin'
  notes?: string | null
}
