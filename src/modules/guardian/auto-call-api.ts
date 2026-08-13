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

export async function requestGuardianAutoCall(payload: GuardianEnqueueAutoCallPayload): Promise<void> {
  // `guardian_national_id` و`guardian_phone` و`requested_by` غائبةٌ عمداً:
  // الخادم يشتقّها من الجلسة الموثَّقة. إرسالها من المتصفّح ادّعاءٌ لا إثبات،
  // وقبوله يعني أن الموقوف عن النداء يفلت من وقفه بتبديل رقمٍ في الحمولة.
  await guardianClient.post('/guardian/auto-call/queue', {
    student_national_id: payload.studentNationalId,
    student_name: payload.studentName,
    class_label: payload.classLabel ?? null,
    notes: payload.notes ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
  })
}
