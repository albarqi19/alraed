export const AUTO_CALL_COLLECTION_ROOT = 'autoCalls'
export const AUTO_CALL_SETTINGS_DOC = 'settings'
export const AUTO_CALL_QUEUE_COLLECTION = 'autoCallQueue'
export const AUTO_CALL_HISTORY_COLLECTION = 'autoCallHistory'
export const AUTO_CALL_GUARDIANS_COLLECTION = 'autoCallGuardians'

export const DEFAULT_AUTO_CALL_SETTINGS = {
  enabled: false,
  openFrom: null,
  openUntil: null,
  repeatIntervalSeconds: 120,
  announcementDurationSeconds: 30,
  enableSpeech: true,
  voiceGender: 'auto' as const,
  voiceLocale: 'ar-SA',
  allowGuardianAcknowledgement: true,
  geofence: null,
  maxStrikesBeforeBlock: 3,
  blockDurationMinutes: 1440,
  displayTheme: 'dark' as const,
}

export const AUTO_CALL_HISTORY_LIMIT = 100
