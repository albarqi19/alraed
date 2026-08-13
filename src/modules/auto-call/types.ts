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
  /**
     * مفتاح تتبّع المخالفات والحظر لوليّ الأمر.
     *
     * كان غائباً عن العقد كلّياً، فكان كلّ نداءٍ يُنشأ بـ`null`: لا يُفحص الحظر
     * ولا تُسجَّل مخالفةٌ على أحد، أي أن عتبة الإيقاف بعد تكرار النداء دون
     * حضور —وهي مضبوطةٌ في الإعدادات ومعروضةٌ في اللوحة— لم تكن تعمل إطلاقاً.
     *
     * في بوّابة وليّ الأمر لا يُرسَل من هنا: الخادم يشتقّه من الجلسة الموثَّقة
     * لأن ما يرسله المتصفّح ادّعاءٌ يُفلت الموقوفَ من وقفه. يبقى هذا الحقل
     * لمسار الأدمن حيث الموظّف هو من يُدخل هويّة الوليّ.
     */
  guardianNationalId?: string | null
  /**
     * موقع الطالِب للنداء وقت الضغط، يُطابَق بالسياج الجغرافيّ في الخادم.
     *
     * الفحص في الواجهة للعرض والإرشاد لا للأمان: مَن يفتح أدوات المطوّر يزوّر
     * أيّ إحداثيّة. الحَكَم هو `AutoCallService::assertWithinGeofence`، وهو يرفض
     * الطلب إن كان السياج مضبوطاً وهذان غائبين — فحذفهما تخطٍّ للسياج لا تجاوزٌ
     * له.
     */
  latitude?: number | null
  longitude?: number | null
}

export interface UpdateAutoCallStatusOptions {
  status: AutoCallStatus
  acknowledgedBy?: 'guardian' | 'admin'
  notes?: string | null
}
