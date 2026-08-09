import { AxiosError } from 'axios'

/** شكل استجابة الخطأ الموحّد في الباك */
interface ApiErrorBody {
  success?: boolean
  message?: string
  errors?: Record<string, string[] | string>
  missing_requirements?: string[]
  requires_confirmation?: boolean
}

function errorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    return data && typeof data === 'object' ? (data as ApiErrorBody) : null
  }
  return null
}

/**
 * استخراج رسالة الخطأ التي كتبها الباك.
 *
 * `error.message` في أخطاء Axios هو «Request failed with status code 422» —
 * نصٌّ لا يفيد المستخدم ويُخفي الرسالة العربية الفعلية. هذا المترجم يقرأ جسم
 * الاستجابة أولاً، ثم أول خطأ تحقق، ثم يسقط إلى النص البديل.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const body = errorBody(error)

  if (body?.message) {
    return body.message
  }

  // رسائل التحقق: أول رسالة أوضح للمستخدم من «بيانات غير صحيحة»
  const firstValidation = Object.values(body?.errors ?? {})[0]
  if (firstValidation) {
    return Array.isArray(firstValidation) ? firstValidation[0] : firstValidation
  }

  // أخطاء الشبكة تُميَّز عن أخطاء الخادم لأن التصرف المطلوب مختلف
  if (error instanceof AxiosError && !error.response) {
    return 'تعذّر الاتصال بالخادم. تحقّق من الشبكة ثم أعد المحاولة.'
  }

  if (error instanceof Error && error.message && !error.message.startsWith('Request failed')) {
    return error.message
  }

  return fallback
}

/** جمع كل رسائل التحقق (للحالات التي يفيد فيها عرضها كلها) */
export function getValidationMessages(error: unknown): string[] {
  const errors = errorBody(error)?.errors ?? {}

  return Object.values(errors).flatMap((value) => (Array.isArray(value) ? value : [value]))
}

/** المتطلبات الناقصة التي يرجعها معالج الإعداد مع رفض إكمال الخطوة */
export function getMissingRequirements(error: unknown): string[] {
  return errorBody(error)?.missing_requirements ?? []
}

/** هل رفض الخادم العملية طلباً لتأكيد صريح؟ (409 من تخطّي خطوة إلزامية) */
export function requiresConfirmation(error: unknown): boolean {
  return errorBody(error)?.requires_confirmation === true
}

export function getStatusCode(error: unknown): number | null {
  return error instanceof AxiosError ? (error.response?.status ?? null) : null
}
