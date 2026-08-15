/**
 * نقاطُ الواجهة العامّة — ما يُقرأ بلا جلسةٍ ولا توكن.
 *
 * أوّلُ ساكنيها: قراءةُ رمز بيانات الدخول الذي يصل في بريد الترحيب.
 */

import { apiClient } from '@/services/api/client'
import { getErrorMessage, getStatusCode } from '@/services/api/errors'
import { AxiosError } from 'axios'

/* ══════════════════════════════════════════════════════════════
   الرايةُ الواحدة — بياناتٌ وهميّةٌ حتّى تجهز نقطةُ الخادم
   ══════════════════════════════════════════════════════════════
   نقطةُ `GET /api/public/credentials/{token}` يبنيها وكيلٌ آخر بالتوازي.
   فحتّى تصل، تُطوَّر الصفحة على بياناتٍ محليّة — **خلف رايةٍ واحدة** لا خلف
   شروطٍ متناثرة، كي يكون إطفاؤها سطراً واحداً لا مطاردةً في الملفّات.

   وفي وضع المحاكاة تُشتقّ الحالةُ من الرمز نفسه، فتُجرَّب الحالات الثلاث بلا
   خادم:
     • رمزٌ يحوي `expired` → رابطٌ منتهي الصلاحية
     • رمزٌ يحوي `used`    → رابطٌ استُهلك بفتحٍ سابق
     • ما عداهما           → رابطٌ صالح

   **اجعلها `false` قبل النشر.** */
export const USE_MOCK_CREDENTIALS = false

/** بيانات الدخول كما تردّها النقطة العامّة */
export interface CredentialsPayload {
  school_name: string
  username: string
  password: string
  /** ISO 8601 — متى ينتهي الرمز. قد يغيب فلا نعرض مهلة. */
  expires_at: string | null
}

/** سببُ تعذّر فتح الرابط — تختار الصفحةُ عليه نصَّها */
export type CredentialsFailureReason =
  /** انتهت المهلة (٧٢ ساعة) */
  | 'expired'
  /** فُتح من قبل، والرمز يُبطَل بعد أوّل فتحٍ ناجح */
  | 'consumed'
  /** رمزٌ لا وجود له — رابطٌ مبتور أو مُحرَّف */
  | 'not-found'
  /** لم يصل ردٌّ أصلاً — انقطاع شبكة */
  | 'network'
  /** عطلٌ في الخادم أو استجابةٌ لا تُفهم */
  | 'server'

/** خطأٌ مصنَّف: الصفحة تقرأ `reason` لا نصّ الرسالة */
export class CredentialsLinkError extends Error {
  readonly reason: CredentialsFailureReason

  constructor(reason: CredentialsFailureReason, message: string) {
    super(message)
    this.name = 'CredentialsLinkError'
    this.reason = reason
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/**
 * تمييزُ «منتهٍ» من «مُستهلَك» من «لا وجود له».
 *
 * ثلاثةُ مواقفَ لا موقفان: مَن انتهت مهلتُه يطلب رابطاً جديداً، ومَن فُتح رابطُه
 * قبله يبحث عمّن فتحه، ومَن وصله الرابطُ مبتوراً يعيد نسخه. فالخادمُ يرسل
 * `reason` صريحاً (`expired` · `consumed` · `not_found`) وعليه نبني.
 *
 * والاستدلالُ بنصّ الرسالة العربيّة يبقى شبكةَ أمانٍ لخادمٍ قديم، لكنّه لا
 * يُوثَق به وحده: كان يقرأ «استُعمل هذا الرابط من قبل» فلا يجد فيه «استُهلك»
 * ولا «فُتح»، فيسقط إلى «منتهٍ» — ويضيع التحذير الذي تعنيه الحالة. ولذلك صار
 * **رمزُ الحالة** هو المرجّح الأخير: 404 يعني «لا وجود له» لا «انتهى».
 */
function classifyGone(body: unknown, status: number): CredentialsFailureReason {
  const raw = isRecord(body) ? body : {}
  const marker = (text(raw.reason) ?? text(raw.code) ?? '').toLowerCase()

  if (marker.includes('consum') || marker.includes('used') || marker.includes('opened')) {
    return 'consumed'
  }
  if (marker.includes('expire')) {
    return 'expired'
  }
  if (marker.includes('not_found') || marker.includes('notfound') || marker.includes('not-found') || marker.includes('missing')) {
    return 'not-found'
  }

  const message = text(raw.message) ?? ''
  if (
    message.includes('استُهلك') ||
    message.includes('استهلك') ||
    message.includes('استُعمل') ||
    message.includes('استعمل') ||
    message.includes('فُتح') ||
    message.includes('سبق')
  ) {
    return 'consumed'
  }
  if (message.includes('انتهت') || message.includes('منتهٍ') || message.includes('الصلاحية')) {
    return 'expired'
  }

  // آخرُ ما نتّكئ عليه: 404 «لم نجد الرمز»، و410 «عرفناه ومضى».
  return status === 404 ? 'not-found' : 'expired'
}

const MOCK_DELAY_MS = 450

async function mockCredentials(token: string): Promise<CredentialsPayload> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  if (token.includes('expired')) {
    throw new CredentialsLinkError('expired', 'انتهت صلاحية هذا الرابط.')
  }
  if (token.includes('used')) {
    throw new CredentialsLinkError('consumed', 'فُتح هذا الرابط من قبل.')
  }
  if (token.includes('missing')) {
    throw new CredentialsLinkError('not-found', 'الرابط غير صحيح.')
  }

  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  return {
    school_name: 'مدرسة الرائد الابتدائية (بيانات تجريبية)',
    username: '1088123456',
    password: 'Raed-8f2Kq7',
    expires_at: expires,
  }
}

/**
 * قراءةُ رمز بيانات الدخول.
 *
 * **الرمز يُبطَل بعد أوّل فتحٍ ناجح** — فهذا نداءٌ يُغيّر الحالة وإن كان GET.
 * ولذلك لا يُعاد تلقائياً عند الفشل ولا يُعاد جلبُه عند العودة إلى النافذة؛
 * تلك القيود مضبوطةٌ في خطّاف الصفحة، وتُذكَر هنا كي لا يستدعيَها أحدٌ في حلقة.
 */
export async function fetchCredentialsByToken(token: string): Promise<CredentialsPayload> {
  if (USE_MOCK_CREDENTIALS) {
    return mockCredentials(token)
  }

  try {
    const { data } = await apiClient.get(`/public/credentials/${encodeURIComponent(token)}`)

    /* الجسمُ يُقرأ ملفوفاً وعارياً معاً: أغلبُ نقاط النظام تردّ
       `{ success, data }`، والعقدُ هنا كُتب بالحقول مباشرةً. فنقبل الشكلين بدل
       أن تنكسر الصفحة على اختلافِ لفٍّ لا يخصّ المستخدم. */
    const envelope = isRecord(data) ? data : {}
    const payload = isRecord(envelope.data) ? envelope.data : envelope

    const schoolName = text(payload.school_name)
    const username = text(payload.username)
    const password = text(payload.password)

    if (!schoolName || !username || !password) {
      throw new CredentialsLinkError('server', 'استجابةٌ غير مفهومة من الخادم.')
    }

    return {
      school_name: schoolName,
      username,
      password,
      expires_at: text(payload.expires_at),
    }
  } catch (error) {
    if (error instanceof CredentialsLinkError) {
      throw error
    }

    const status = getStatusCode(error)

    if (status === 410 || status === 404) {
      const body = error instanceof AxiosError ? error.response?.data : null
      throw new CredentialsLinkError(classifyGone(body, status), getErrorMessage(error, 'الرابط لم يعد صالحاً.'))
    }

    if (error instanceof AxiosError && !error.response) {
      throw new CredentialsLinkError('network', 'تعذّر الاتصال بالخادم.')
    }

    throw new CredentialsLinkError('server', getErrorMessage(error, 'تعذّر فتح الرابط.'))
  }
}
