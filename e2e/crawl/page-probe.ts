/**
 * الكواشف الأربعة — ما يُرصد في كلّ صفحة.
 *
 *   أ) شاشةٌ بيضاء     — منطقة المحتوى بلا نصٍّ ذي معنى
 *   ب) خطأ console     — بعد ترشيح الضجيج
 *   ج) انهيار React    — pageerror أو حدود خطأ
 *   د) نداءٌ فاشل      — 4xx/5xx مصنَّفةً بثلاث درجات
 */

import type { Page, Response } from '@playwright/test'
import { crawlerConfig, isApiUrl } from '../config/crawler.config'
import {
  expectedFailureReason,
  isConsoleNoise,
  isIgnoredRequest,
  isPageErrorNoise,
} from '../config/noise-filters'
import type { Finding } from './findings'

/* ══════════════════════════════════════════════════════════════
   المستمعون: يُركَّبون قبل الانتقال ويُجمَعون بعده
   ══════════════════════════════════════════════════════════════ */

export interface Collector {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: Array<{ url: string; status: number; method: string }>
  /** إفراغ ما جُمع — يُستدعى قبل تجربة كلّ زرّ كي يُنسب الخطأ لضغطته */
  reset(): void
  /** فكّ الارتباط بالصفحة */
  dispose(): void
}

export function attachCollector(page: Page): Collector {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: Array<{ url: string; status: number; method: string }> = []

  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (isConsoleNoise(text)) return
    consoleErrors.push(text)
  }

  const onPageError = (error: Error) => {
    const text = `${error.name}: ${error.message}`
    if (isPageErrorNoise(text)) return
    // أوّل ثلاثة أسطرٍ من الأثر تكفي للتشخيص، والباقي ضجيج
    const stack = (error.stack ?? '').split('\n').slice(1, 4).join('\n')
    pageErrors.push(stack ? `${text}\n${stack}` : text)
  }

  const onResponse = (response: Response) => {
    const status = response.status()
    if (status < 400) return
    const url = response.url()
    if (isIgnoredRequest(url)) return
    failedRequests.push({ url, status, method: response.request().method() })
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
    reset() {
      consoleErrors.length = 0
      pageErrors.length = 0
      failedRequests.length = 0
    },
    dispose() {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
      page.off('response', onResponse)
    },
  }
}

/* ══════════════════════════════════════════════════════════════
   درعُ الإنتاج — الحاجز الأخير
   ══════════════════════════════════════════════════════════════ */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal'])

/**
 * يمنع الصفحة من مناداة أيّ خادمٍ غير محلّي.
 *
 * لماذا هذا ضروريٌّ رغم وجود `assertNotProduction`؟
 * لأن ذلك الحارس يفحص ما نضبطه نحن، وهذا يفحص ما يفعله التطبيق فعلاً.
 * عنوانُ الـ API في الفرونت **يُخبَز في الحزمة وقت البناء** من
 * `VITE_API_BASE_URL`. فلو بنى أحدٌ الحزمة بملفّ `.env` الحاليّ — وهو يشير
 * إلى خادم الإنتاج — ثم شغّل الزاحف على `localhost`، لمرّ الحارس الأوّل
 * بسلام بينما الصفحاتُ تضرب الإنتاج. الزاحف يضغط أزراراً؛ فهذا احتمالٌ
 * لا يُترك للحظّ.
 *
 * فنقطع الطريق في المتصفّح نفسه: كلُّ نداءٍ إلى مضيفٍ غير محلّيٍّ يُجهَض،
 * ويُسجَّل عطلاً صريحاً في التقرير كي لا يُقرأ صمتُ الشبكة سلامةً.
 */
export async function installProductionShield(page: Page, onLeak: (host: string) => void): Promise<void> {
  if (crawlerConfig.allowRemote) return

  const allowedHosts = new Set(LOCAL_HOSTNAMES)
  for (const raw of [crawlerConfig.baseURL, crawlerConfig.apiBaseURL]) {
    try {
      allowedHosts.add(new URL(raw).hostname)
    } catch {
      /* عنوانٌ غير صالح — الحارس الأوّل تكفّل به */
    }
  }

  const reported = new Set<string>()

  await page.route('**/*', async (route) => {
    const request = route.request()

    let hostname: string
    try {
      hostname = new URL(request.url()).hostname
    } catch {
      await route.continue()
      return
    }

    if (allowedHosts.has(hostname) || hostname === '') {
      await route.continue()
      return
    }

    // ── تمييزٌ لازم ──
    // خطوطُ Google وأيقوناتُ jsdelivr موارد عرضٍ من طرفٍ ثالث: قطعُها لا يضرّ
    // الفحص (ولا يستحقّ سطراً في تقرير المالك)، وقطعُها يسرّع الزحف ويجعله
    // يعمل بلا إنترنت. أمّا نداءُ **بيانات** (xhr/fetch) إلى مضيفٍ غير محلّي
    // فهو التسريب الذي بُني هذا الدرع لأجله: يعني أنّ الحزمة تخاطب خادماً
    // خارجياً — وربّما الإنتاج.
    const isDataCall = request.resourceType() === 'xhr' || request.resourceType() === 'fetch'

    if (isDataCall && !reported.has(hostname)) {
      reported.add(hostname)
      onLeak(hostname)
    }

    await route.abort('blockedbyclient')
  })
}

/* ══════════════════════════════════════════════════════════════
   أ) الشاشة البيضاء
   ══════════════════════════════════════════════════════════════ */

export interface ContentSnapshot {
  /** هل رُسم التطبيق أصلاً؟ (جذر React موجودٌ وفيه شيء) */
  found: boolean
  /** كيف حُدِّدت منطقة المحتوى — للشفافية في التشخيص */
  region: 'main' | 'role-main' | 'root' | 'body'
  /** طول النصّ المرئيّ ذي المعنى داخل منطقة المحتوى */
  textLength: number
  /** عدد العناصر التفاعلية/البيانية داخلها */
  richElements: number
  /** هل ما زال مؤشّر التحميل ظاهراً؟ */
  stillLoading: boolean
  /** هل هي حالة «لا بيانات» المشروعة (WsEmpty)؟ */
  emptyState: boolean
  /** نصّ حدود الخطأ إن ظهر */
  errorBoundaryText: string | null
  /** أوّل ١٢٠ حرفاً من المحتوى — للتشخيص في التقرير */
  sample: string
}

/**
 * يقيس منطقة المحتوى وحدها.
 *
 * لماذا لا نكتفي بطول `body.innerText`؟ لأن صفحةً انهار محتواها لكن بقي فيها
 * الهيدر والقائمة الجانبية تحمل مئات الأحرف — فتبدو «سليمة» وهي بيضاء عملياً
 * في عين المستخدم. القياس يجب أن يقتصر على ما جاء المستخدمُ لأجله.
 *
 * منطقة المحتوى = أعمق عنصر <main> في الصفحة. الشلّات كلُّها (الأدمن والمعلم
 * ووليّ الأمر والمشرف العام) تضع محتوى الصفحة داخل <main> خاصٍّ بها، وهو
 * متداخلٌ داخل <main> الخاص بـ RootLayout — فالأعمق هو المحتوى الحقيقيّ.
 *
 * لكنْ ليست كلُّ صفحةٍ داخل شلّ: صفحاتُ الهبوط وشاشاتُ ملء الشاشة (الدفع،
 * النداء الآلي، الحساب الموقوف) يرسمها RootLayout بلا <main> إطلاقاً — عبر
 * `<Outlet/>` عارياً. فلو اشترطنا وجود <main> لأعلنّا كلَّ صفحة هبوطٍ منهارة
 * وهي سليمة. ولا ضرر في السقوط إلى #root هناك: تلك الصفحات بلا هيدرٍ ولا
 * قائمةٍ جانبية أصلاً، فجذرُها **هو** محتواها.
 */
export async function snapshotContent(page: Page): Promise<ContentSnapshot> {
  return page.evaluate(() => {
    const mains = Array.from(document.querySelectorAll('main'))
    // الأعمق: آخرُ عنصرٍ لا يحوي بداخله <main> آخر
    const innermostMain = mains.filter((m) => !m.querySelector('main')).pop() ?? mains.pop() ?? null
    const roleMain = document.querySelector('[role="main"]')
    const root = document.getElementById('root')

    let region: Element
    let regionKind: 'main' | 'role-main' | 'root' | 'body'
    if (innermostMain) {
      region = innermostMain
      regionKind = 'main'
    } else if (roleMain) {
      region = roleMain
      regionKind = 'role-main'
    } else if (root) {
      region = root
      regionKind = 'root'
    } else {
      region = document.body
      regionKind = 'body'
    }

    const isVisible = (el: Element): boolean => {
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    // النصّ المرئيّ: innerText يحترم الإخفاء بـ CSS بخلاف textContent
    const rawText = (region as HTMLElement).innerText ?? ''
    const text = rawText.replace(/\s+/g, ' ').trim()

    const richElements = Array.from(
      region.querySelectorAll('table, form, canvas, svg, img, input, select, textarea, button, [role="table"], [role="grid"], li, article'),
    ).filter(isVisible).length

    const stillLoading =
      region.querySelector('.ws-spinner, [role="progressbar"], .animate-spin') !== null && text.length < 40

    const emptyState = region.querySelector('.ws-empty') !== null

    // حدود الخطأ: نبحث عن نصوصها المعتادة. المشروع لا يملك ErrorBoundary
    // بعدُ (وهذا بذاته ملاحظة)، لكن إن أُضيفت غداً فالكاشف جاهز.
    const boundaryMarkers = ['حدث خطأ غير متوقع', 'حدث خطأ ما', 'عذراً، حدث خطأ', 'Something went wrong', 'خطأ في تحميل الصفحة']
    const bodyText = document.body.innerText ?? ''
    const errorBoundaryText = boundaryMarkers.find((marker) => bodyText.includes(marker)) ?? null

    return {
      // «رُسم التطبيق» = جذر React موجودٌ وليس فارغاً. غيابُه يعني أنّ الحزمة
      // لم تُنفَّذ أصلاً — وهذا انهيارٌ حقيقيّ لا اختلافُ قالب.
      found: root !== null && root.childElementCount > 0,
      region: regionKind,
      textLength: text.length,
      richElements,
      stillLoading,
      emptyState,
      errorBoundaryText,
      sample: text.slice(0, 120),
    }
  })
}

/** الحدّ الأدنى لنصٍّ يُعتبر «محتوىً حقيقياً» في منطقة المحتوى */
const MEANINGFUL_TEXT_THRESHOLD = 40

/**
 * يحكم على الشاشة البيضاء.
 *
 * التمييز الحاسم: صفحةٌ فارغة لأنها **بلا بيانات** (حالة WsEmpty المشروعة —
 * «لا مخالفات مسجّلة») ليست عطلاً؛ وصفحةٌ فارغة لأنها **انهارت** عطلٌ صريح.
 * الفارق أنّ الأولى تعرض رسالتها بوعي، والثانية لا تعرض شيئاً.
 */
export function judgeBlankScreen(snapshot: ContentSnapshot): Finding | null {
  if (snapshot.errorBoundaryText) {
    return {
      kind: 'انهيار React',
      severity: 'عطل',
      detail: `الصفحة عرضت رسالة خطأ بدل محتواها: «${snapshot.errorBoundaryText}»`,
    }
  }

  if (!snapshot.found) {
    return {
      kind: 'شاشة بيضاء',
      severity: 'عطل',
      detail: 'جذر التطبيق فارغ — لم تُرسم الصفحة إطلاقاً (انهيارٌ قبل أوّل رسمة)',
    }
  }

  if (snapshot.stillLoading) {
    return {
      kind: 'شاشة بيضاء',
      severity: 'عطل',
      detail:
        `بقي مؤشّر التحميل يدور ${Math.round(crawlerConfig.contentWaitMs / 1000)} ثانيةً ` +
        'ولم يظهر محتوى — الصفحة عالقةٌ في الانتظار',
    }
  }

  if (snapshot.emptyState && snapshot.textLength > 0) {
    // حالةٌ مشروعة: الصفحة تعمل وتقول «لا بيانات» بوضوح
    return null
  }

  if (snapshot.textLength < MEANINGFUL_TEXT_THRESHOLD && snapshot.richElements < 3) {
    return {
      kind: 'شاشة بيضاء',
      severity: 'عطل',
      detail:
        snapshot.textLength === 0
          ? 'منطقة المحتوى فارغةٌ تماماً — لا نصّ ولا عناصر. المكوّن انهار عند الرسم'
          : `منطقة المحتوى شبه فارغة (${snapshot.textLength} حرفاً فقط)، وما ظهر: «${snapshot.sample}»`,
      technical: `منطقة: ${snapshot.region} · نصّ: ${snapshot.textLength} حرف · عناصر: ${snapshot.richElements}`,
    }
  }

  return null
}

/* ══════════════════════════════════════════════════════════════
   د) تصنيف النداءات الفاشلة
   ══════════════════════════════════════════════════════════════ */

/**
 * ثلاث درجات:
 *   • 5xx        → **عطل دائماً**. الخادم انكسر، لا عذر.
 *   • 422 عند التحميل → **عطل غالباً**. هو بالضبط ما وقع في ملفّ الطالب:
 *     الفرونت بنى مدىً مقلوباً فردّ الباك «بياناتك غير صالحة» على مجرّد فتحِ
 *     صفحة. صفحةُ عرضٍ لا يُفترض أن تُرسل بياناتٍ غير صالحة أصلاً.
 *   • 401/403 على مسار دورٍ آخر → متوقَّع.
 *   • 404 على مورد → مشبوه (قد يكون بذرةً صغيرة، وقد يكون مساراً ميّتاً).
 */
export function classifyFailedRequest(request: { url: string; status: number; method: string }): Finding {
  const { url, status, method } = request
  const short = shortenUrl(url)
  const technical = `${method} ${url} → ${status}`

  // ── التوقّع المُعلَن يتقدّم على كلّ قاعدةٍ عامّة ──
  // لا بدّ أن يسبق فحصَ 5xx: بعض نقاط الباك تنهار بـ 500 لأن تكاملاً خارجياً
  // (بوّابة واتساب) غير مشغَّلٍ محلّياً، وهي حالةٌ بيئيةٌ موصوفةٌ صراحةً في
  // `expectedFailures`. ولو حكمنا بـ 5xx أوّلاً لبطل كلُّ استثناءٍ مقصود،
  // ولامتلأ التقرير بنسخةٍ من العطل نفسه في كلّ صفحةٍ من صفحات الإدارة.
  const expected = expectedFailureReason(url, status)
  if (expected) {
    return {
      kind: 'نداء فاشل',
      severity: 'متوقَّع',
      detail: `${short} ردّ ${status} — ${expected}`,
      technical,
    }
  }

  if (status >= 500) {
    return {
      kind: 'نداء فاشل',
      severity: 'عطل',
      detail: `الخادم ردّ ${status} على ${short} — انكسارٌ في الباك، الصفحة لن تعرض بياناتها`,
      technical,
    }
  }

  if (status === 422) {
    return {
      kind: 'نداء فاشل',
      severity: 'عطل',
      detail: `النداء ${short} ردّ 422 (بيانات غير صالحة) على مجرّد فتح الصفحة — الفرونت يرسل بارامتراً خاطئاً`,
      technical,
    }
  }

  if (status === 401 || status === 403) {
    return {
      kind: 'نداء فاشل',
      severity: 'مشبوه',
      detail: `${short} ردّ ${status} — إمّا صلاحيةٌ ناقصة في البذرة، وإمّا الصفحة تنادي ما لا يخصّ هذا الدور`,
      technical,
    }
  }

  if (status === 404) {
    return {
      kind: 'نداء فاشل',
      severity: 'مشبوه',
      detail: `${short} ردّ 404 — قد يكون المورد غير موجودٍ في بذرةٍ صغيرة، وقد يكون مساراً ميّتاً`,
      technical,
    }
  }

  if (status === 423) {
    return {
      kind: 'نداء فاشل',
      severity: 'متوقَّع',
      detail: `${short} ردّ 423 — وضع تصفّح الأرشيف للقراءة فقط`,
      technical,
    }
  }

  return {
    kind: 'نداء فاشل',
    severity: 'مشبوه',
    detail: `${short} ردّ ${status}`,
    technical,
  }
}

/** يختصر العنوان إلى مسارِه — العناوين الكاملة تُغرق الجدول */
export function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const query = parsed.search.length > 40 ? `${parsed.search.slice(0, 40)}…` : parsed.search
    return `${parsed.pathname}${query}`
  } catch {
    return url
  }
}

/* ══════════════════════════════════════════════════════════════
   جمع كل شيء
   ══════════════════════════════════════════════════════════════ */

/** يحوّل ما جمعه المستمعون إلى اكتشافات، مع دمج المتكرّر. */
export function collectFindings(collector: Collector, snapshot: ContentSnapshot): Finding[] {
  const findings: Finding[] = []

  const blank = judgeBlankScreen(snapshot)
  if (blank) findings.push(blank)

  for (const error of dedupe(collector.pageErrors)) {
    findings.push({
      kind: 'انهيار React',
      severity: 'عطل',
      detail: `استثناءٌ غير ملتقَط أثناء الرسم: ${firstLine(error)}`,
      technical: error,
    })
  }

  for (const error of dedupe(collector.consoleErrors)) {
    findings.push({
      kind: 'خطأ console',
      severity: 'مشبوه',
      detail: `خطأ في وحدة التحكّم: ${truncate(firstLine(error), 180)}`,
      // النصّ الكامل يبقى في «التقني» — الجدول يحتاج جملةً، والمطوّر يحتاج الأثر
      technical: error.slice(0, 800),
    })
  }

  // دمج النداءات المتطابقة (مسار + كود) كي لا يتكرّر السطر عشرين مرّة
  const seen = new Set<string>()
  for (const request of collector.failedRequests) {
    // نرصد نداءات الـ API وحدها بدقّة؛ غيرها مرشَّحٌ سلفاً
    const key = `${request.method} ${shortenUrl(request.url)} ${request.status}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!isApiUrl(request.url) && request.status === 404) continue // أصلٌ ثابتٌ مفقود، لا نداء بيانات
    findings.push(classifyFailedRequest(request))
  }

  return findings
}

function firstLine(text: string): string {
  return text.split('\n')[0] ?? text
}

/** يقصّ عند حدٍّ ويضع «…» — جملةٌ مبتورةٌ بلا علامةٍ توهم أنّها كاملة */
function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}…`
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}

/**
 * هل بلغت الصفحة حالةً يصحّ الحكمُ عليها؟
 *
 * أي: لم يعد فيها دوّارٌ ينتظر، **و** فيها ما يُقرأ — نصٌّ ذو معنى، أو عناصرُ
 * كافية، أو رسالةُ «لا بيانات» المشروعة. وما دون ذلك فالصفحة في منتصف رسمها،
 * والحكمُ عليها الآن حكمٌ على لقطةٍ عابرة لا على حالٍ مستقرّة.
 */
function isSettled(snapshot: ContentSnapshot): boolean {
  if (snapshot.stillLoading) return false
  if (snapshot.emptyState) return true
  return snapshot.textLength >= MEANINGFUL_TEXT_THRESHOLD || snapshot.richElements >= 3
}

/**
 * ينتظر استقرار الصفحة: سكون الشبكة، ثم فسحةٌ للرسم، ثم — والأهمّ — انتظارُ
 * **محتوىً حقيقيّ**.
 *
 * الخطوة الثالثة هي التي كانت ناقصة. سكونُ الشبكة ليس دليلاً على اكتمال الرسم،
 * وعجزُها عن السكون ليس دليلاً على العطل: الباك المحلّي متسلسل، فتصطفّ نداءاتُ
 * الصفحة وتتجاوز المهلة وهي تعمل بلا خلل. فلا نحكم بمجرّد انقضاء مهلةٍ زمنية،
 * بل نستطلع الصفحة كلَّ أربعِ أعشارِ الثانية حتى تستقرّ أو تنقضي مهلةٌ قصوى.
 *
 * وبهذا يبقى الكاشف صادقاً في الاتجاهين: صفحةٌ بطيئةٌ تُمهَل حتى تظهر، وصفحةٌ
 * عالقةٌ فعلاً يظلّ دوّارُها يدور بعد عشرين ثانيةً فتُعلَن معطّلةً بحقّ.
 */
export async function waitForStability(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: crawlerConfig.networkIdleTimeoutMs })
  } catch {
    // شبكةٌ لا تسكن (تحديثٌ دوريّ، مقبس ويب، أو باكٌ متسلسلٌ مزدحم) ليست عطلاً
    // بذاتها — نمضي إلى استطلاع المحتوى بدل إسقاط الصفحة.
  }
  await page.waitForTimeout(crawlerConfig.settleDelayMs)
  await waitForContentSettled(page)
}

/**
 * يستطلع الصفحة حتى تستقرّ أو تنقضي المهلة القصوى.
 *
 * مستقلٌّ عن `waitForStability` لأن له قارئَين: الانتقالُ إلى صفحة، **وضغطةُ
 * زرّ**. فزرُّ «عرض التفاصيل» يُبحر إلى صفحةٍ جديدة، ولو قِسنا بعد تسعِ أعشارِ
 * الثانية وحدها لرأينا دوّاراً يدور وأعلنّاه «انهياراً بعد ضغطة» — وهو مجرّد
 * تحميلٍ لم يكتمل. العلّة واحدةٌ في الموضعين، فليكن العلاجُ واحداً.
 */
export async function waitForContentSettled(page: Page): Promise<void> {
  const deadline = Date.now() + crawlerConfig.contentWaitMs
  for (;;) {
    const snapshot = await snapshotContent(page).catch(() => null)
    // تعذّرت القراءة (ملاحةٌ جارية): يتكفّل بها الكاشفُ نفسه لاحقاً
    if (snapshot === null) return
    if (isSettled(snapshot)) return
    if (Date.now() >= deadline) return
    await page.waitForTimeout(400)
  }
}
