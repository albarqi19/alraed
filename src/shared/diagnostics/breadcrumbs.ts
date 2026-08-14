/**
 * فتات المسار — «ماذا ضغط المستخدم قبل أن يظهر له الخطأ؟»
 *
 * ─── المشكلة التي يحلّها ───────────────────────────────────────────────────
 *
 * سجلُّ الخادم يقول: «SQLSTATE… عند POST /api/admin/students». وهذا يجيب سؤال
 * «ما الخطأ؟» ولا يجيب سؤال المالك: **ماذا فعل المستخدم حتى وصل إلى هنا؟** بلا
 * الإجابة الثانية يصير كلُّ بلاغٍ تحقيقاً من الصفر: نتّصل بمدير المدرسة، نطلب
 * منه أن يعيد الخطوات، فينسى نصفها.
 *
 * فهذه حلقةٌ في الذاكرة بآخر ٢٠ حدثاً — نقرات وتنقّلات ونداءات فاشلة وتغيّر
 * حالة الحقول — تُرسل مع كلّ طلبٍ في ترويسة `X-Client-Breadcrumbs`، فيضمّها
 * الخادم إلى سطر الخطأ. سطرٌ واحد يحمل القصّة كاملة.
 *
 * ─── قواعد صارمة ───────────────────────────────────────────────────────────
 *
 * ١) **لا تخزين دائم**: الحلقة في الذاكرة فقط. إغلاق التبويب يمحوها. لا
 *    localStorage ولا IndexedDB — بيانات تشخيصٍ لا أرشيف.
 * ٢) **لا قيم**: لا تُلتقط قيمة أيّ حقلٍ أبداً. الاسم وحالة الامتلاء وطول ما
 *    كُتب — لا أكثر. سياسة الحجب كلّها في `redaction.ts`.
 * ٣) **لا تكسر شيئاً**: كلّ ما هنا مبتلعُ الأخطاء. جامع تشخيصٍ يُسقط حفظ
 *    درجات طالب هو عطلٌ لا أداة.
 * ٤) **مستمعٌ واحد بالتفويض**: مستمعان اثنان على `document` لا مستمعٌ لكلّ زرّ.
 *    الصفحة الواحدة فيها مئات الأزرار، والربط الفرديّ يقتل الأداء ويتسرّب.
 */

import {
  REDACTION_LIMITS,
  classifyFieldName,
  redactFieldName,
  redactUrl,
  truncate,
} from './redaction'

/** اسم الترويسة — وكيل الباك يقرؤها بهذا الاسم حرفيّاً */
export const BREADCRUMB_HEADER = 'X-Client-Breadcrumbs'

/**
 * سقف الترويسة بالبايت.
 *
 * nginx على الإنتاج (1.26.3) بلا `large_client_header_buffers` مخصّص، أي القيمة
 * الافتراضيّة `4 8k`: سطر الترويسة الواحد يجب ألّا يتجاوز ٨ كيلوبايت وإلّا ردّ
 * الخادم 400 **قبل أن يصل الطلب إلى لارافيل أصلاً** — أي أن جامع التشخيص يصير
 * هو سبب العطل. نقصّ عند النصف تماماً: هامشٌ لأيّ وسيطٍ أضيق في الطريق.
 */
export const BREADCRUMB_HEADER_MAX_BYTES = 4096

/** بادئة النسخة — تسمح بتغيير الترميز لاحقاً دون كسر قارئٍ قديم */
const HEADER_VERSION_PREFIX = 'v1:'

/** سعة الحلقة: آخر ٢٠ حدثاً. ما قبلها لم يعد جزءاً من القصّة */
const RING_CAPACITY = REDACTION_LIMITS.arrayItems

/** عدد الأحداث حين لا تتّسع العشرون في الترويسة */
const TRIMMED_EVENT_COUNT = 8

interface ClickCrumb {
  k: 'click'
  /** نصّ الزرّ أو aria-label — لا المحدِّد التقنيّ */
  label: string
  /** عدد الضغطات المتتالية على الشيء نفسه (٣ ضغطاتٍ على «حفظ» قصّةٌ بذاتها) */
  n?: number
}

interface NavCrumb {
  k: 'nav'
  from: string
  to: string
}

interface NetCrumb {
  k: 'net'
  method: string
  path: string
  /** رمز الحالة، و`0` حين لم يصل الردّ أصلاً (انقطاع شبكة أو مهلة) */
  status: number
  /** رقم البلاغ الذي ردّه الخادم — يربط الفتات بسطر السجلّ */
  ref?: string
}

interface FieldCrumb {
  k: 'field'
  field: string
  state: 'filled' | 'cleared'
  /** طول ما كُتب — لا محتواه. يجيب «هل أدخل رقماً أقصر؟» بلا كشف الرقم */
  len?: number
}

/** حدثٌ صناعيّ يُقحم عند القصّ ليعرف القارئ أن ما يراه جزءٌ لا كلّ */
interface TruncationCrumb {
  k: 'trunc'
  dropped: number
}

type CrumbBody = ClickCrumb | NavCrumb | NetCrumb | FieldCrumb

/** الشكل المرسَل: نفس الجسم مسبوقاً بالزمن النسبيّ بالثواني */
export type Breadcrumb = (CrumbBody | TruncationCrumb) & { t?: number }

interface StoredCrumb {
  /** لحظة الحدث على ساعةٍ رتيبة — لا تتأثّر بتعديل ساعة الجهاز */
  at: number
  body: CrumbBody
}

const ring: StoredCrumb[] = []

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/** غلافٌ يبتلع كلّ خطأ — القاعدة الثالثة أعلاه، مطبَّقةً في موضعٍ واحد */
function safely(action: () => void): void {
  try {
    action()
  } catch {
    /* جامع التشخيص لا يُفشل عملاً للمستخدم بحال */
  }
}

function push(body: CrumbBody): void {
  ring.push({ at: now(), body })
  if (ring.length > RING_CAPACITY) ring.shift()
}

function lastCrumb(): StoredCrumb | undefined {
  return ring[ring.length - 1]
}

// ─── تسجيل الأحداث ─────────────────────────────────────────────────────────

/**
 * نافذةٌ نعدّ ما دونها ضغطةً واحدة لا ضغطتين.
 *
 * ضغطةٌ على `<label>` يوجّهها المتصفّح إلى مربّع الاختيار الذي تحتضنه، فتصعد
 * النقرتان إلى المستند في اللحظة نفسها ونرى حدثين لضغطةٍ واحدة. وأسرع ضغطتين
 * بشريّتين متتاليتين تفصلهما أضعاف هذا المدى، فلا يبتلع الحدّ ضغطاً حقيقيّاً.
 */
const CLICK_ECHO_WINDOW_MS = 50

/**
 * نقرة. الضغطات المتتالية على العنصر نفسه تُدمج في حدثٍ واحد بعدّاد: حلقةٌ
 * سعتها ٢٠ تمتلئ بضغطاتٍ يائسةٍ على «حفظ» فتضيع الخطوات التي سبقتها. والعدّاد
 * نفسه قصّة: «ضغط حفظ ثلاث مرّات» يعني أنه لم يرَ أثراً للضغطة الأولى.
 */
export function recordClick(label: string): void {
  safely(() => {
    const previous = lastCrumb()
    if (previous?.body.k === 'click' && previous.body.label === label) {
      const moment = now()
      if (moment - previous.at >= CLICK_ECHO_WINDOW_MS) {
        previous.body.n = (previous.body.n ?? 1) + 1
      }
      previous.at = moment
      return
    }

    push({ k: 'click', label })
  })
}

export function recordNavigation(from: string, to: string): void {
  safely(() => {
    if (from === to) return
    push({ k: 'nav', from, to })
  })
}

/** نداء شبكةٍ فاشل — يُستدعى من معترض axios */
export function recordNetworkFailure(input: {
  method: string
  url: string
  status: number
  ref?: string | null
}): void {
  safely(() => {
    const crumb: NetCrumb = {
      k: 'net',
      method: input.method.toUpperCase(),
      path: redactUrl(input.url),
      status: input.status,
    }
    if (input.ref) crumb.ref = input.ref
    push(crumb)
  })
}

/**
 * تغيّر حقل: اسمه وهل صار مملوءاً أم فُرّغ — **لا قيمته**.
 *
 * التكرار على الحقل نفسه بالحالة نفسها يُحدّث الحدث القائم بدل أن يضيف: تعبئة
 * حقلٍ ثم تصحيحه ثم تصحيحه مرّةً أخرى ليست ثلاث خطواتٍ في القصّة، بل خطوة.
 */
export function recordFieldChange(input: {
  name: string | null | undefined
  filled: boolean
  length?: number
}): void {
  safely(() => {
    const field = redactFieldName(input.name)
    if (!field) return

    const state: FieldCrumb['state'] = input.filled ? 'filled' : 'cleared'
    const previous = lastCrumb()
    if (previous?.body.k === 'field' && previous.body.field === field && previous.body.state === state) {
      previous.at = now()
      if (input.length !== undefined) previous.body.len = input.length
      return
    }

    const crumb: FieldCrumb = { k: 'field', field, state }
    if (input.length !== undefined) crumb.len = input.length
    push(crumb)
  })
}

// ─── القراءة والترميز ──────────────────────────────────────────────────────

/** لقطةٌ من الحلقة، الأقدم أوّلاً، مع الزمن النسبيّ بالثواني («قبل 3.2 ثانية») */
export function snapshotBreadcrumbs(): Breadcrumb[] {
  const reference = now()
  return ring.map(({ at, body }) => ({
    t: Math.round(((reference - at) / 1000) * 10) / 10,
    ...body,
  }))
}

/** يُستدعى عند تبديل المستخدم: فتات جلسةٍ سابقة لا يخصّ من دخل بعده */
export function clearBreadcrumbs(): void {
  ring.length = 0
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function buildHeader(events: Breadcrumb[], dropped: number): string {
  const payload: Breadcrumb[] = dropped > 0 ? [{ k: 'trunc', dropped }, ...events] : events
  return HEADER_VERSION_PREFIX + toBase64(JSON.stringify(payload))
}

/**
 * قيمة الترويسة: `v1:` + base64 لـ JSON بترميز UTF-8.
 *
 * لماذا base64 ولسنا نرسل JSON خاماً؟ لأن نصوص الأزرار عربيّة، وقيمة الترويسة
 * في المتصفّح `ByteString`: أيّ محرفٍ فوق 0xFF يجعل `setRequestHeader` يرمي
 * استثناءً فيسقط الطلب كلّه. وترميز النسبة المئويّة يضخّم الحرف العربيّ إلى
 * ستّة محارف (٩ أضعاف)، وbase64 يضخّم الثلث فقط.
 *
 * @param maxEvents أقصى عدد أحداث (نقلّله في طلبات GET — انظر `client.ts`)
 */
export function encodeBreadcrumbHeader(
  maxEvents: number = RING_CAPACITY,
  maxBytes: number = BREADCRUMB_HEADER_MAX_BYTES,
): string | null {
  try {
    const all = snapshotBreadcrumbs()
    if (!all.length) return null

    let events = all.slice(-Math.max(1, maxEvents))
    let header = buildHeader(events, all.length - events.length)
    if (header.length <= maxBytes) return header

    // القصّ المنصوص عليه: حين لا تتّسع العشرون، تُرسل آخر ثمانية
    events = all.slice(-TRIMMED_EVENT_COUNT)
    header = buildHeader(events, all.length - events.length)

    // وإن ضاق السقف بالثمانية أيضاً (نصوصٌ عربيّة طويلة)، نُسقط الأقدم فالأقدم
    while (header.length > maxBytes && events.length > 1) {
      events = events.slice(1)
      header = buildHeader(events, all.length - events.length)
    }

    return header.length <= maxBytes ? header : null
  } catch {
    return null
  }
}

// ─── الجامعون ──────────────────────────────────────────────────────────────

/**
 * العناصر التي تُعدّ «ضغطة». نصعد من هدف النقرة إلى أقرب عنصرٍ فاعلٍ منها،
 * فالمستخدم يضغط أيقونةً داخل زرّ لا الزرّ نفسه.
 */
const ACTIONABLE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="link"]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="reset"]',
  'summary',
  'label',
  '[data-testid]',
].join(', ')

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function attribute(element: Element, name: string): string {
  return normalizeSpace(element.getAttribute(name) ?? '')
}

/** وصفٌ عامّ حين لا يوجد نصٌّ آمن — يُبقي الضغطة في التسلسل بلا تسريب */
function genericDescriptor(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (tag === 'a') return '«رابط»'
  if (tag === 'summary') return '«قائمة منسدلة»'
  if (element.getAttribute('role') === 'tab') return '«تبويب»'
  return '«زرّ»'
}

/**
 * تسمية العنصر: النصّ ثم aria-label ثم title ثم data-testid.
 *
 * والنصّ الذي يتجاوز ٦٠ محرفاً **يُرفض ولا يُقصّ**: صفُّ جدولٍ قابلٌ للنقر نصُّه
 * اسم طالبٍ ورقم هويّته وصفّه، وقصّه عند ٦٠ يُبقي الاسم كاملاً. القصّ هنا ليس
 * تقنيعاً، فالرفض هو الصواب.
 */
function resolveLabel(element: Element): string {
  const text = normalizeSpace(element.textContent ?? '')
  if (text && text.length <= REDACTION_LIMITS.elementText) return text

  for (const name of ['aria-label', 'title', 'data-testid']) {
    const value = attribute(element, name)
    if (value && value.length <= REDACTION_LIMITS.elementText) return value
  }

  return genericDescriptor(element)
}

function onDocumentClick(event: Event): void {
  safely(() => {
    const target = event.target
    if (!(target instanceof Element)) return

    const actionable = target.closest(ACTIONABLE_SELECTOR)
    if (!actionable) return

    recordClick(resolveLabel(actionable))
  })
}

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function fieldNameOf(element: EditableElement): string | null {
  return (
    element.name ||
    element.id ||
    element.getAttribute('data-field') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('placeholder') ||
    null
  )
}

function onDocumentChange(event: Event): void {
  safely(() => {
    const element = event.target
    const isEditable =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    if (!isEditable) return

    const name = fieldNameOf(element)
    if (!name) return

    // الملفّات: نسجّل أنّ ملفّاً اختير ولا نلمس اسمه — أسماء الملفّات تحمل
    // أسماء الطلاب وأرقامهم في هذا النظام تحديداً (كشوف الاستيراد).
    if (element instanceof HTMLInputElement && element.type === 'file') {
      recordFieldChange({ name, filled: (element.files?.length ?? 0) > 0 })
      return
    }

    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
      recordFieldChange({ name, filled: element.checked })
      return
    }

    const value = element.value ?? ''
    const filled = value.trim().length > 0

    // الطول يُحجب عن حقول قائمة الحذف: طول كلمة السرّ تلميحٌ عنها لا عن العطل.
    const length = classifyFieldName(name) === 'drop' ? undefined : value.length

    recordFieldChange({ name, filled, length })
  })
}

// ─── التنقّل ───────────────────────────────────────────────────────────────

let lastPath = ''

function currentPath(): string {
  return truncate(redactUrl(window.location.pathname + window.location.search), REDACTION_LIMITS.value)
}

function captureNavigation(): void {
  safely(() => {
    const next = currentPath()
    if (next === lastPath) return
    const previous = lastPath
    lastPath = next
    recordNavigation(previous, next)
  })
}

/**
 * لماذا نلفّ `history` بدل استخدام `useLocation`؟
 *
 * لأن هذا يجعل الجامع مستقلّاً عن React تماماً: يعمل قبل أن تُركّب الشجرة
 * (فيلتقط أوّل ضغطةٍ في شاشة الدخول)، ولا يُعيد رسم شيء، ولا يفرض على نقطة
 * التركيب أكثر من سطرٍ واحد. وReact Router يمرّ من هنا حتماً — لا مسار تنقّلٍ
 * في المتصفّح يتجاوز `pushState`/`replaceState`/`popstate`.
 */
function patchHistory(): void {
  const original = {
    push: history.pushState.bind(history),
    replace: history.replaceState.bind(history),
  }

  history.pushState = function patchedPushState(...args) {
    const result = original.push(...args)
    captureNavigation()
    return result
  }

  history.replaceState = function patchedReplaceState(...args) {
    const result = original.replace(...args)
    captureNavigation()
    return result
  }

  window.addEventListener('popstate', captureNavigation)
  window.addEventListener('hashchange', captureNavigation)
}

let installed = false

/**
 * تركيب الجامعين. يُستدعى مرّةً واحدة من نقطة تركيب التطبيق.
 * الالتقاط في طور الالتقاط (capture) كي لا يُخفيه معالجٌ يوقف الانتشار.
 */
export function installBreadcrumbCollectors(): void {
  if (installed || typeof document === 'undefined') return
  installed = true

  safely(() => {
    document.addEventListener('click', onDocumentClick, true)
    document.addEventListener('change', onDocumentChange, true)
    patchHistory()

    lastPath = currentPath()
    recordNavigation('«بداية الجلسة»', lastPath)

    // منفذُ دعمٍ: نطلب من المستخدم أن يفتح الكونسول ويكتب `__crumbs()` حين لا
    // يصل الطلب إلى الخادم أصلاً (انقطاع شبكة) فلا ترويسة تُرسل. آمنٌ بحكم
    // البناء: ما في الحلقة مقنَّعٌ من المنبع.
    ;(window as unknown as { __crumbs?: () => Breadcrumb[] }).__crumbs = snapshotBreadcrumbs
  })
}
