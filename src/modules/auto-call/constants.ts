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
  autoAnnounce: true,
  maxAnnouncements: 3,
  announceWithClass: true,
  speechRate: 0.9,
  voiceGender: 'auto' as const,
  voiceLocale: 'ar-SA-u-nu-latn',
  allowGuardianAcknowledgement: true,
  geofence: null,
  maxStrikesBeforeBlock: 3,
  blockDurationMinutes: 1440,
  callExpiryMinutes: 30,
  displayTheme: 'dark' as const,
}

export const AUTO_CALL_HISTORY_LIMIT = 100

/**
 * دورةُ محرّك النطق على شاشة البوّابة، بالمللي ثانية.
 *
 * ثانيةٌ واحدة: أقصرُ من أن يشعر واقفٌ عند البوّابة بتأخّر، وأطولُ من أن يُثقل
 * الخادمَ (طلبٌ واحدٌ خفيفٌ في الثانية من شاشةٍ واحدة، ولا يُرسَل أصلاً إلا حين
 * لا يكون ثمّة نداءٌ يُنطق).
 */
export const AUTO_CALL_ENGINE_TICK_MS = 1000

/**
 * فاصلُ الاستطلاع الاحتياطيّ حين ينقطع البثّ اللحظيّ (Reverb).
 *
 * الشاشة معلّقةٌ على بوّابة المدرسة ساعاتٍ متّصلة؛ انقطاعُ الشبكة دقيقةً واحدة
 * كان يعني صمتاً بقيّةَ اليوم: الاشتراك يسقط ولا شيء يُعيد القراءة. عشرُ ثوانٍ
 * تُبقيها حيّةً بلا بثٍّ أصلاً.
 */
export const AUTO_CALL_FALLBACK_POLL_MS = 10_000
