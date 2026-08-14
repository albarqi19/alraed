/**
 * رقم البلاغ — الجسر بين شكوى مدير المدرسة وسطر السجلّ.
 *
 * ─── لماذا ─────────────────────────────────────────────────────────────────
 *
 * المكالمة اليوم: «النظام ما يحفظ». فنسأل: متى؟ أيّ صفحة؟ ما الرسالة؟ فيجيب
 * بما يتذكّره، فنبحث في سجلٍّ فيه آلاف السطور عن خطأ قد يكون له وقد يكون
 * لمدرسةٍ أخرى.
 *
 * والمكالمة بعد هذا الملفّ: «طلع لي رقم البلاغ a3f9c2b1». فنكتبه في اللوحة
 * فيظهر السطر: المستخدم، والمدرسة، والمسار، والاستثناء، وفتات ما ضغطه قبله.
 * شكوى غامضةٌ صارت سطراً واحداً.
 *
 * ─── الشرط الذي يجعله يعمل ─────────────────────────────────────────────────
 *
 * الترويسة `X-Request-Id` تأتي من الخادم، والواجهة على نطاقٍ آخر (Vercel مقابل
 * api.brqq.site). والمتصفّح **لا يسمح** لجافاسكربت بقراءة ترويسة استجابةٍ عابرة
 * للنطاقات ما لم يُصرّح الخادم بها في `Access-Control-Expose-Headers`. فإن لم
 * تُضف `X-Request-Id` إلى `exposed_headers` في `config/cors.php` فستكون القراءة
 * هنا `null` دائماً — بلا خطأ ولا تحذير، وهذا أخبث أنواع الأعطال.
 */

/** اسم ترويسة الاستجابة التي يولّدها الخادم لكلّ طلب */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * طول رقم البلاغ المعروض. ثمانية محارف تكفي للبحث في سجلّ يومٍ كامل، وتُملى
 * في مكالمةٍ هاتفيّة دون أن يخطئ سامعها.
 */
const DISPLAY_LENGTH = 8

/** آخر رقم بلاغ رآه المستخدم — لواجهةٍ تعرض زرّ «نسخ رقم البلاغ» لاحقاً */
let lastIncidentId: string | null = null

export function getLastIncidentId(): string | null {
  return lastIncidentId
}

/**
 * قراءة الترويسة من استجابة axios.
 *
 * `response.headers` قد يكون كائناً عادياً أو `AxiosHeaders` — نجرّب الواجهتين
 * ونتسامح مع حالة الأحرف، فترويسة تُقرأ بطريقةٍ واحدة تنكسر بترقيةٍ صامتة.
 */
export function readIncidentId(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') return null

  const bag = headers as Record<string, unknown> & { get?: (name: string) => unknown }

  let raw: unknown = bag[REQUEST_ID_HEADER] ?? bag['X-Request-Id'] ?? bag['X-REQUEST-ID']
  if (typeof raw !== 'string' && typeof bag.get === 'function') {
    try {
      raw = bag.get(REQUEST_ID_HEADER)
    } catch {
      return null
    }
  }

  return typeof raw === 'string' ? formatIncidentId(raw) : null
}

/**
 * تشكيل الرقم للعرض: نُسقط ما ليس حرفاً أو رقماً (شرطات UUID مثلاً) ونأخذ أوّل
 * ثمانية. البادئة — لا اللاحقة — كي يبقى البحث بها في السجلّ مطابقةَ بادئة
 * تعمل حتى لو خزّن الخادم المعرّف كاملاً.
 */
export function formatIncidentId(raw: string): string | null {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '')
  if (!clean) return null

  lastIncidentId = clean.slice(0, DISPLAY_LENGTH)
  return lastIncidentId
}

/** الصيغة التي يراها المستخدم — واحدةٌ في كلّ النظام كي يتعلّمها مرّة */
export function incidentSuffix(id: string): string {
  return ` — رقم البلاغ: ${id}`
}

/**
 * إلحاق رقم البلاغ برسالة الخطأ إن لم يكن ملحقاً.
 * لا نلحقه بكلّ خطأ: رسالة تحقّقٍ تقول «الاسم مطلوب» لا تحتاج رقم بلاغ، بل
 * يُشوّشها. القرار في `client.ts`: أخطاء الخادم (5xx) وحدها.
 */
export function withIncident(message: string, id: string | null): string {
  if (!id || message.includes(id)) return message
  return message + incidentSuffix(id)
}
