/**
 * إعدادات الزاحف — كلُّها من متغيّرات البيئة.
 *
 * مبدأٌ حاكم: **الزاحف لا يلمس الإنتاج أبداً.**
 * الافتراضات كلُّها محلّية (localhost). ولو أراد المالك توجيه الزاحف إلى بيئةٍ
 * تجريبية فليضبط المتغيّرات صراحةً — ولن يقع ذلك بالخطأ أو بالسهو.
 * وفوق ذلك: حارسٌ يرفض التشغيل على أيّ عنوانٍ يبدو إنتاجياً ما لم يُقرَّ صراحةً.
 */

// أوّلَ شيء: تعبئة البيئة من e2e/.env قبل قراءة أيّ متغيّر
import './load-env.mjs'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** جذر مجلّد e2e */
export const E2E_ROOT = path.resolve(here, '..')
/** جذر مستودع الفرونت */
export const FRONTEND_ROOT = path.resolve(E2E_ROOT, '..')

function env(name: string, fallback: string): string {
  const value = process.env[name]
  return value === undefined || value === '' ? fallback : value
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return ['1', 'true', 'yes', 'نعم'].includes(raw.toLowerCase())
}

/* ══════════════════════════════════════════════════════════════
   العناوين
   ══════════════════════════════════════════════════════════════ */

export const crawlerConfig = {
  /** عنوان الفرونت المزحوف عليه (vite preview أو dev) */
  baseURL: env('E2E_BASE_URL', 'http://localhost:4173'),

  /** عنوان الباك — يُستخدم لتصنيف النداءات وللدخول المباشر عبر الـ API */
  apiBaseURL: env('E2E_API_BASE_URL', 'http://127.0.0.1:8000/api'),

  /** إقرارٌ صريح بالزحف على عنوانٍ غير محلّي (حاجزُ أمانٍ ضدّ ضرب الإنتاج) */
  allowRemote: envBool('E2E_ALLOW_REMOTE', false),

  /* ── المهل ── */

  /** مهلة تحميل الصفحة الواحدة (مللي ثانية). تجاوزُها **عطلٌ يُسجَّل** لا تخطٍّ صامت. */
  pageTimeoutMs: envNumber('E2E_PAGE_TIMEOUT', 25_000),

  /** مهلة انتظار سكون الشبكة بعد الانتقال */
  networkIdleTimeoutMs: envNumber('E2E_NETWORK_IDLE_TIMEOUT', 8_000),

  /** فسحةٌ بعد السكون تسمح لـ React بإتمام الرسم وإطلاق أخطائه */
  settleDelayMs: envNumber('E2E_SETTLE_DELAY', 700),

  /**
   * أقصى انتظارٍ لظهور محتوىً حقيقيّ بعد أن تعجز الشبكة عن السكون.
   *
   * ضروريٌّ لأن `php artisan serve` خادمٌ **متسلسل**: يخدم طلباً واحداً في
   * المرّة. فحين يزحف ثلاثةُ عمّالٍ معاً تصطفّ نداءاتُ الصفحة، ولا تسكن الشبكة
   * خلال المهلة، فيُحكَم على الصفحة **وهي ما تزال تُحمَّل** — ويُكتب «بقي
   * مؤشّر التحميل يدور» عن صفحةٍ تعمل تماماً.
   *
   * وقع هذا فعلاً: سبعَ عشرةَ صفحةً أُعلنت معطّلةً، وحين فُتحت وحدَها ظهرت
   * سليمةً بالكامل. فالانتظار هنا ليس تساهلاً — بل هو الفرق بين «عالقة» و«بطيئة».
   */
  contentWaitMs: envNumber('E2E_CONTENT_WAIT', 20_000),

  /* ── الأزرار ── */

  /** هل نضغط الأزرار الآمنة بعد استقرار الصفحة؟ */
  probeButtons: envBool('E2E_PROBE_BUTTONS', true),

  /** أقصى عدد أزرارٍ تُجرَّب في الصفحة الواحدة (حاجزٌ ضد صفحاتٍ فيها مئة زر) */
  maxButtonsPerPage: envNumber('E2E_MAX_BUTTONS', 6),

  /** مهلة رصد ما بعد الضغطة */
  buttonSettleMs: envNumber('E2E_BUTTON_SETTLE', 900),

  /* ── التقرير ── */

  /**
   * مجلّد مخرجات التقرير.
   *
   * ولوضع الرحلات مجلّدٌ فرعيٌّ **افتراضاً** لا بإعدادٍ من المُشغِّل: لولا ذلك
   * لكتب مُبلِّغُ الرحلات ملفّاتِه بين ملفّات الزحف. وقد وقع: نداءٌ واحدٌ بـ
   * `E2E_JOURNEYS=1 npx playwright test --list` ترك في مجلّد الزحف «تقرير
   * رحلات» فارغاً يقول «٠ رحلة · ٠ رسالة» — تقريرٌ يطمئن بلا أن يفحص شيئاً،
   * وهو أسوأ ما يُترك في مجلّد نتائج.
   *
   * فالمشغّل `run-journeys.mjs` يضبط المتغيّر صراحةً، وهذا الافتراضُ يحمي من
   * يستدعي playwright مباشرةً.
   */
  reportDir: env(
    'E2E_REPORT_DIR',
    ['1', 'true', 'yes', 'نعم'].includes((process.env.E2E_JOURNEYS ?? '').toLowerCase())
      ? path.join(E2E_ROOT, 'report', 'journeys')
      : path.join(E2E_ROOT, 'report'),
  ),

  /** مجلّد اللقطات (داخل مجلّد التقرير) */
  get screenshotDir() {
    return path.join(this.reportDir, 'screenshots')
  },

  /** ملفّ النتائج الخام الذي يقرؤه المُبلِّغ */
  get resultsFile() {
    return path.join(this.reportDir, 'crawl-results.json')
  },

  /** مجلّد حالات المصادقة المحفوظة */
  get authStateDir() {
    return path.join(E2E_ROOT, '.auth')
  },
} as const

/* ══════════════════════════════════════════════════════════════
   حارس الإنتاج
   ══════════════════════════════════════════════════════════════ */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal']

/**
 * يرفض التشغيل على عنوانٍ غير محلّي ما لم يُقرّه المشغّل صراحةً.
 * الزاحف يضغط أزراراً. وضغطُ زرٍّ على الإنتاج ليس فحصاً — بل حادثة.
 */
export function assertNotProduction(): void {
  if (crawlerConfig.allowRemote) return

  for (const [label, raw] of [
    ['عنوان الفرونت', crawlerConfig.baseURL],
    ['عنوان الـ API', crawlerConfig.apiBaseURL],
  ] as const) {
    let host: string
    try {
      host = new URL(raw).hostname
    } catch {
      throw new Error(`${label} غير صالح: ${raw}`)
    }

    if (!LOCAL_HOSTS.includes(host)) {
      throw new Error(
        [
          `توقّف: ${label} يشير إلى «${host}» وهو ليس عنواناً محلّياً.`,
          'الزاحف يضغط أزراراً — وتشغيلُه على بيئةٍ حيّة قد يغيّر بيانات حقيقية.',
          'إن كنت واثقاً أنّ هذه بيئةٌ تجريبية فاضبط E2E_ALLOW_REMOTE=1 صراحةً.',
        ].join('\n'),
      )
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   حارس الهُويّة — هل الهدف تطبيقُنا أصلاً؟
   ══════════════════════════════════════════════════════════════ */

/**
 * علامةٌ يجب أن تظهر في صفحة الهدف كي نصدّق أنّه تطبيقُ «الرائد» المدرسيّ.
 * قابلةٌ للضبط لمن غيّر عنوان الصفحة.
 */
const APP_MARKER = env('E2E_APP_MARKER', 'نظام الرائد للإدارة المدرسية')

/**
 * يرفض الزحف على تطبيقٍ ليس تطبيقَنا.
 *
 * ══ لماذا هذا الحارس موجود ══
 * وقع هذا فعلاً في أوّل تشغيلٍ كامل: منفذُ المعاينة كان محجوزاً على IPv6
 * (`[::1]`) بخادم تطويرٍ لمشروعٍ آخر تماماً، بينما حجزت معاينتُنا IPv4
 * (`127.0.0.1`) وحدها — و`localhost` على ويندوز يُحلّ إلى IPv6 أوّلاً.
 * فزحف الزاحفُ أربع دقائق على **تطبيقٍ آخر**، وكلُّ صفحةٍ طلبها ردّت بصفحة
 * «٤٠٤» من ذلك التطبيق — وصفحةُ ٤٠٤ فيها نصٌّ وأزرار، فعُدّت «سليمة».
 * والنتيجة: تقريرٌ يقول «١٣٧ صفحةً سليمة» ولم تُفحص صفحةٌ واحدةٌ من نظامنا.
 *
 * وهذا أخطر من أيّ إنذارٍ كاذب: إنذارٌ كاذبٌ يُزعج، أمّا **طمأنينةٌ كاذبة**
 * فتُخرج نظاماً معطّلاً إلى المدارس. فالفحص هنا شرطُ صحّةِ كلّ ما بعده.
 */
export async function assertTargetIsOurApp(): Promise<void> {
  const url = crawlerConfig.baseURL
  let html: string

  try {
    const response = await fetch(url, { headers: { Accept: 'text/html' } })
    if (!response.ok) {
      throw new Error(`ردّ الخادم ${response.status}`)
    }
    html = await response.text()
  } catch (error) {
    throw new Error(
      [
        `توقّف: لا خادمَ يستجيب على «${url}».`,
        'شغّل الفرونت أوّلاً (vite preview أو dev) وتأكّد من المنفذ.',
        `التفصيل: ${error instanceof Error ? error.message : String(error)}`,
      ].join('\n'),
    )
  }

  if (html.includes(APP_MARKER)) return

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '(بلا عنوان)'
  throw new Error(
    [
      `توقّف: الخادم على «${url}» ليس تطبيق «الرائد» المدرسيّ.`,
      `عنوان ما يُقدّمه: «${title}»`,
      '',
      'الأسباب المعتادة:',
      '  · المنفذ محجوزٌ بمشروعٍ آخر. تحقّق بـ: netstat -ano | findstr :<المنفذ>',
      '  · أو محجوزٌ على IPv6 وحدها بينما معاينتُك على IPv4 — و«localhost» يُحلّ',
      '    إلى IPv6 أوّلاً على ويندوز. استعمل 127.0.0.1 صراحةً في E2E_BASE_URL،',
      '    أو اختر منفذاً حرّاً على الطبقتين.',
      '  · أو عاملُ خدمةٍ (service worker) قديمٌ يخدم نسخةً مخبَّأةً لتطبيقٍ آخر',
      '    على الأصل نفسه.',
      '',
      'ولو كان العنوان قد تغيّر فعلاً فاضبط E2E_APP_MARKER بعلامةٍ من صفحتك.',
    ].join('\n'),
  )
}

/**
 * يبني عنواناً مطلقاً لنقطةٍ في الـ API.
 *
 * لماذا لا نكتفي بـ `baseURL` في `request.newContext`؟ لأن Playwright يحلّ
 * المسار بدلالة `new URL(path, base)` — وهذه تُسقط مسارَ الأساس كلَّه إذا بدأ
 * المسارُ بشرطةٍ مائلة. فـ `/auth/login` على أساس `http://host:8010/api`
 * يصير `http://host:8010/auth/login` بلا `/api`، فيردّ الخادم 404 ويُقرأ
 * «تعذّر الدخول» — عطلٌ في العدّة يُلبَس ثوبَ عطلٍ في التطبيق.
 */
export function apiUrl(endpoint: string): string {
  const base = crawlerConfig.apiBaseURL.replace(/\/+$/, '')
  return `${base}/${endpoint.replace(/^\/+/, '')}`
}

/** هل ينتمي هذا العنوان إلى الـ API الذي نفحصه؟ */
export function isApiUrl(url: string): boolean {
  try {
    const target = new URL(url)
    const api = new URL(crawlerConfig.apiBaseURL)
    return target.host === api.host
  } catch {
    return false
  }
}
