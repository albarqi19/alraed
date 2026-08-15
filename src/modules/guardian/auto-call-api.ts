import { guardianClient } from '@/services/api/guardian-client'

/**
 * النداء الآليّ من بوّابة وليّ الأمر.
 *
 * لماذا ملفٌّ منفصل عن `modules/auto-call/api/auto-call-api.ts`؟ لأن ذاك يخاطب
 * `/admin/auto-call/*` عبر `apiClient` أي برمز حارس الموظّفين، ووليّ الأمر لا
 * يملكه: بوّابته تُصدر رمز حارس `guardian` وتحفظه في `guardian_auth_token`،
 * و`guardianClient` وحده هو من يحمله. استعمال المسار الإداريّ من البوّابة يردّ
 * 401 قبل أن يبلغ المتحكّم أصلاً — وهذا نصف سبب موت الزرّ.
 *
 * النصف الآخر أن `AutoCallProvider` نفسه لا يُجدي هنا: كلّ أفعاله محروسةٌ
 * بـ`schoolId && token` المقروءين من مخزن مصادقة الموظّفين، وكلاهما `null` في
 * بوّابة وليّ الأمر، فـ`enqueueCall` منه يرمي «لا يمكن إنشاء مناداة بدون مدرسة
 * محددة» قبل أن يلمس الشبكة. لذلك تنادي البوّابة الخادمَ مباشرةً من هنا.
 */

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

export interface GuardianAutoCallGeofence {
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface GuardianAutoCallSettings {
  enabled: boolean
  openFrom: string | null
  openUntil: string | null
  /** `null` تعني «لا سياج لهذه المدرسة» — لا «سياجٌ مركزه (0,0)». */
  geofence: GuardianAutoCallGeofence | null
}

/** حالات النداء كما يسمّيها الخادم حرفيّاً (`AutoCallQueue::STATUS_*`). */
export type GuardianAutoCallStatus =
  | 'pending'
  | 'announcing'
  | 'acknowledged'
  | 'expired'
  | 'cancelled'

/** صفٌّ واحد من طابور النداء كما يراه وليّ الأمر. */
export interface GuardianAutoCallEntry {
  id: number
  studentNationalId: string | null
  studentName: string
  classLabel: string | null
  status: GuardianAutoCallStatus
  /** كم مرّةً نُودي على الطالب — يطمئن وليَّ الأمر أن نداءه سُمع فعلاً. */
  announcedCount: number
  /** لحظة انتهاء المهلة بصيغة ISO؛ بعدها يُغلق النداء وتُحتسب المخالفة. */
  expiresAt: string | null
  acknowledgedAt: string | null
}

export interface GuardianEnqueueAutoCallPayload {
  studentNationalId: string
  studentName: string
  classLabel?: string | null
  /**
   * الإحداثيّتان تُرسلان حين تُقاسان فقط. حذفهما حين يكون للمدرسة سياجٌ يجعل
   * الخادم يرفض الطلب برسالة «يجب تفعيل خدمة الموقع» — وهو المقصود: لو قبِلهما
   * اختياريّتين لأمكن تخطّي السياج بحذف حقلين من الطلب.
   */
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
}

interface RawGuardianAutoCallSettings {
  enabled?: boolean
  open_from?: string | null
  open_until?: string | null
  geofence?: {
    latitude?: number
    longitude?: number
    radius_meters?: number
  } | null
}

/**
 * الشكل الخام لصفّ الطابور كما يُصدره الخادم (`snake_case` كأعمدة الجدول).
 *
 * كلّ الحقول اختياريّة لأن مسار الإقرار لا يُعيد الصفَّ كاملاً —يكفيه المعرِّف
 * والحالة— بينما مسارا الإنشاء والقراءة يُعيدانه كاملاً. مطبِّعٌ واحدٌ متسامح
 * يخدم الثلاثة بلا ثلاثة أشكالٍ متوازية تتباعد مع الوقت.
 */
interface RawGuardianAutoCallEntry {
  id?: number | string
  student_national_id?: string | number | null
  student_name?: string | null
  class_label?: string | null
  status?: string | null
  announced_count?: number | string | null
  expires_at?: string | null
  acknowledged_at?: string | null
}

/**
 * تطبيع السياج مع رفض القيم التي لا تصلح للقياس.
 *
 * إحداثيّاتٌ غير رقميّة أو نصفُ قطرٍ صفريّ أو مركزٌ عند (0,0) —وهي نقطةٌ في
 * المحيط الأطلسيّ لا مدرسةَ فيها، وقيمةٌ شائعةٌ لعمودٍ مُهيَّأ خطأً— كلّها
 * تعني سياجاً غير مضبوط. قبولها يجعل كلّ أولياء الأمور «بعيدين آلاف
 * الكيلومترات» فيُقفل الزرّ في وجه الجميع بلا سببٍ مفهوم.
 */
function normalizeGeofence(raw: RawGuardianAutoCallSettings['geofence']): GuardianAutoCallGeofence | null {
  if (!raw) {
    return null
  }

  const latitude = Number(raw.latitude)
  const longitude = Number(raw.longitude)
  const radiusMeters = Number(raw.radius_meters)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusMeters)) {
    return null
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null
  }

  if (radiusMeters <= 0 || (latitude === 0 && longitude === 0)) {
    return null
  }

  return { latitude, longitude, radiusMeters }
}

export async function fetchGuardianAutoCallSettings(): Promise<GuardianAutoCallSettings> {
  const { data } = await guardianClient.get<ApiEnvelope<RawGuardianAutoCallSettings>>('/guardian/auto-call/settings')
  const raw = data.data ?? {}

  return {
    enabled: Boolean(raw.enabled),
    openFrom: raw.open_from ?? null,
    openUntil: raw.open_until ?? null,
    geofence: normalizeGeofence(raw.geofence),
  }
}

export async function requestGuardianAutoCall(
  payload: GuardianEnqueueAutoCallPayload,
): Promise<GuardianAutoCallEntry | null> {
  // `guardian_national_id` و`guardian_phone` و`requested_by` غائبةٌ عمداً:
  // الخادم يشتقّها من الجلسة الموثَّقة. إرسالها من المتصفّح ادّعاءٌ لا إثبات،
  // وقبوله يعني أن الموقوف عن النداء يفلت من وقفه بتبديل رقمٍ في الحمولة.
  const { data } = await guardianClient.post<ApiEnvelope<RawGuardianAutoCallEntry>>(
    '/guardian/auto-call/queue',
    {
      student_national_id: payload.studentNationalId,
      student_name: payload.studentName,
      class_label: payload.classLabel ?? null,
      notes: payload.notes ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    },
  )

  // النداء المُنشأ يُعاد للواجهة لا لتزيينٍ بل لضرورة: زرّ «استلمتُ ابني» لا
  // يظهر إلا لنداءٍ معلوم المعرِّف، وانتظار جولةٍ أخرى إلى الخادم لمعرفته يترك
  // وليَّ الأمر ثوانيَ أمام شاشةٍ لا زرّ فيها — وهي الثواني التي يضع فيها
  // جوّاله في جيبه فينسى.
  return normalizeQueueEntry(data?.data)
}

const KNOWN_STATUSES: readonly string[] = [
  'pending',
  'announcing',
  'acknowledged',
  'expired',
  'cancelled',
]

/**
 * حالةٌ لا نعرفها تُقرأ «قائمة» لا «منتهية».
 *
 * الخطأ هنا غير متماثل: أن نعرض زرّ استلامٍ لنداءٍ مُغلق ينتهي برفضٍ ٤٠٩ يفهمه
 * وليُّ الأمر في ثانية؛ وأن نُخفي الزرّ عن نداءٍ قائم ينتهي بمخالفةٍ تُحسب عليه
 * وحظرٍ أربعاً وعشرين ساعة. فحين نشكّ، نُظهر الزرّ.
 */
function normalizeStatus(raw: unknown): GuardianAutoCallStatus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return KNOWN_STATUSES.includes(value) ? (value as GuardianAutoCallStatus) : 'pending'
}

function normalizeQueueEntry(raw: RawGuardianAutoCallEntry | null | undefined): GuardianAutoCallEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  // بلا معرِّفٍ لا يمكن إقرار الاستلام أصلاً — والصفُّ الذي لا يُقرّ لا معنى
  // لعرضه، فهو يَعِد بزرٍّ لا يعمل.
  const id = Number(raw.id)
  if (!Number.isFinite(id) || id <= 0) {
    return null
  }

  return {
    id,
    studentNationalId: raw.student_national_id != null ? String(raw.student_national_id) : null,
    studentName: typeof raw.student_name === 'string' ? raw.student_name.trim() : '',
    classLabel: raw.class_label ?? null,
    status: normalizeStatus(raw.status),
    announcedCount: Number.isFinite(Number(raw.announced_count)) ? Number(raw.announced_count) : 0,
    expiresAt: raw.expires_at ?? null,
    acknowledgedAt: raw.acknowledged_at ?? null,
  }
}

/** النداء القائم: ما زال في الطابور ينتظر خروج الطالب وإقرار وليّه. */
export function isActiveAutoCall(entry: GuardianAutoCallEntry): boolean {
  return entry.status === 'pending' || entry.status === 'announcing'
}

/**
 * نداءات هذا الوليّ القائمة اليوم.
 *
 * لماذا تُقرأ من الخادم لا من الذاكرة؟ لأن أشيع ما يقع أن ينادي وليُّ الأمر
 * ثم يضع جوّاله في جيبه، فإذا عاد وجد الصفحة قد أُعيد تحميلها وذهبت حالةُ
 * React كلّها. زرٌّ يختفي عند التحديث لا يُغلق دورةً، والنداءُ الذي لا يُقرّ
 * يُحتسب مخالفةً على صاحبه.
 */
export async function fetchGuardianAutoCallQueue(): Promise<GuardianAutoCallEntry[]> {
  const { data } = await guardianClient.get<ApiEnvelope<RawGuardianAutoCallEntry[]>>('/guardian/auto-call/queue')
  const rows = Array.isArray(data?.data) ? data.data : []

  return rows
    .map(normalizeQueueEntry)
    .filter((entry): entry is GuardianAutoCallEntry => entry !== null)
}

/**
 * إقرار الاستلام — الفعل الذي كان مفقوداً.
 *
 * الجسم فارغٌ عمداً: هويّة المُقِرّ من الجلسة، والخادم هو من يتحقّق أن هذا
 * النداء لهذا الوليّ (٤٠٣) وأن حالته تسمح بالإقرار (٤٠٩).
 */
export async function acknowledgeGuardianAutoCall(callId: number): Promise<GuardianAutoCallEntry | null> {
  const { data } = await guardianClient.post<ApiEnvelope<RawGuardianAutoCallEntry>>(
    `/guardian/auto-call/queue/${callId}/acknowledge`,
    {},
  )

  return normalizeQueueEntry(data?.data)
}
