/**
 * تسجيل اختبارات الزحف لدورٍ واحد.
 *
 * اختبارٌ واحدٌ لكلّ صفحة (لا حلقةٌ تمرّ على الكلّ): كي تُعزل الصفحة المنهارة
 * عن جاراتها، فلا تُسقِط واحدةٌ معطوبةٌ فحصَ العشرين التي بعدها. ولكي تحصل كلُّ
 * صفحةٍ على محاولةٍ ثانيةٍ خاصّةٍ بها عند تذبذب الشبكة.
 */

import { test, type Page, type TestInfo } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { crawlerConfig } from '../config/crawler.config'
import type { CrawlRole } from '../config/route-params'
import { probeButtons } from './button-prober'
import type { Finding, PageResult } from './findings'
import {
  attachCollector,
  collectFindings,
  installProductionShield,
  snapshotContent,
  waitForStability,
} from './page-probe'
import { loadInventory, type CrawlTarget } from '../inventory'

/* ══════════════════════════════════════════════════════════════
   حالة الدور — تُقرأ وقت التشغيل لا وقت الجمع
   ══════════════════════════════════════════════════════════════
   مشروع التهيئة يعمل **بعد** جمع الاختبارات، فلا يمكن معرفة نجاح الدخول وقت
   بناء القائمة. نقرأها في أوّل اختبارٍ ونخزّنها. */

interface RoleStatus {
  role: string
  ok: boolean
  reason?: string
}

let cachedStatuses: RoleStatus[] | null = null

function roleStatus(role: string): RoleStatus | null {
  if (cachedStatuses === null) {
    const file = path.join(crawlerConfig.authStateDir, 'roles-status.json')
    try {
      cachedStatuses = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as RoleStatus[]) : []
    } catch {
      cachedStatuses = []
    }
  }
  return cachedStatuses.find((status) => status.role === role) ?? null
}

/* ══════════════════════════════════════════════════════════════
   أدوات
   ══════════════════════════════════════════════════════════════ */

function slugify(role: string, url: string): string {
  const cleaned = url.replace(/^\//, '').replace(/[^a-zA-Z0-9؀-ۿ]+/g, '-') || 'root'
  return `${role}--${cleaned}`.slice(0, 120)
}

/** صفحاتُ الدخول والهبوط: الوصول إليها ليس «قذفاً» بل هو المقصود */
function isAuthLikePath(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname === '/' || pathname === '/account-suspended'
}

/* ══════════════════════════════════════════════════════════════
   زيارة صفحةٍ واحدة
   ══════════════════════════════════════════════════════════════ */

async function crawlPage(page: Page, target: CrawlTarget, role: CrawlRole, testInfo: TestInfo): Promise<PageResult> {
  const collector = attachCollector(page)
  const findings: Finding[] = []
  const startedAt = Date.now()
  let timedOut = false

  // الحاجز الأخير: لو كانت الحزمة مبنيّةً على عنوان إنتاج، تُجهَض نداءاتها
  // ويُعلَن ذلك عطلاً بدل أن تضرب الصفحاتُ خادماً حيّاً بصمت.
  const leakedHosts: string[] = []
  await installProductionShield(page, (host) => leakedHosts.push(host))

  const absoluteUrl = new URL(target.url, crawlerConfig.baseURL).toString()

  try {
    await page.goto(absoluteUrl, { waitUntil: 'domcontentloaded', timeout: crawlerConfig.pageTimeoutMs })
  } catch (error) {
    // مهلةٌ منتهية = **عطلٌ يُسجَّل**، لا تخطٍّ صامت. صفحةٌ لا تُحمَّل خلال
    // خمسٍ وعشرين ثانيةً هي صفحةٌ لا يستطيع المستخدم استعمالها.
    timedOut = true
    findings.push({
      kind: 'مهلة التحميل',
      severity: 'عطل',
      detail: `لم تُحمَّل الصفحة خلال ${Math.round(crawlerConfig.pageTimeoutMs / 1000)} ثانية`,
      technical: error instanceof Error ? error.message.split('\n')[0] : String(error),
    })
  }

  if (!timedOut) await waitForStability(page)

  // ── القذف إلى صفحة الدخول ──
  // صفحةٌ تُعيد المستخدمَ المسجَّلَ إلى الدخول ليست «سليمة» لمجرّد أنّ نموذج
  // الدخول ظهر فيه نصّ. هذا عطلُ صلاحياتٍ أو جلسةٍ، ويجب أن يُسمّى باسمه.
  let landedElsewhere = false
  if (!timedOut) {
    try {
      const landed = new URL(page.url())
      const expected = new URL(absoluteUrl)
      if (landed.pathname !== expected.pathname) {
        landedElsewhere = true
        if (isAuthLikePath(landed.pathname) && !isAuthLikePath(expected.pathname)) {
          findings.push({
            kind: 'شاشة بيضاء',
            severity: 'عطل',
            detail: `الصفحة قذفت المستخدم إلى «${landed.pathname}» بدل عرض محتواها — الجلسة مرفوضة أو الصلاحية ناقصة`,
            technical: `${expected.pathname} → ${landed.pathname}`,
          })
        }
      }
    } catch {
      /* عنوانٌ غير قابلٍ للتحليل — نتجاهل */
    }
  }

  if (leakedHosts.length > 0) {
    findings.push({
      kind: 'نداء فاشل',
      severity: 'عطل',
      detail:
        `الصفحة تنادي خادماً غير محلّي (${leakedHosts.join('، ')}) فأُجهض النداء. ` +
        'الحزمة مبنيّةٌ على عنوان API خارجيّ — أعد بناء الفرونت وVITE_API_BASE_URL يشير إلى الباك المحلّي.',
      technical: `hosts: ${leakedHosts.join(', ')}`,
    })
  }

  const snapshot = await snapshotContent(page).catch(() => null)
  if (snapshot) {
    findings.push(...collectFindings(collector, snapshot))
  } else if (!timedOut) {
    findings.push({
      kind: 'شاشة بيضاء',
      severity: 'عطل',
      detail: 'تعذّرت قراءة محتوى الصفحة — الصفحة لا تستجيب للفحص',
    })
  }

  // ── الأزرار ──
  // لا نجرّبها على صفحةٍ منهارةٍ أصلاً (لا فائدة، وخطرُ ضغطٍ أعمى)،
  // ولا على صفحةٍ هبطنا على غير عنوانها (فتُنسب نتائجُها للصفحة الخطأ).
  let buttonsProbed: PageResult['buttonsProbed'] = []
  let buttonsSkipped: PageResult['buttonsSkipped'] = []
  const alreadyBroken = findings.some((f) => f.severity === 'عطل')

  if (!alreadyBroken && !timedOut && !landedElsewhere) {
    const outcome = await probeButtons(page, collector, absoluteUrl)
    findings.push(...outcome.findings)
    buttonsProbed = outcome.probed
    buttonsSkipped = outcome.skipped
  }

  const durationMs = Date.now() - startedAt

  // ── اللقطة: لكلّ صفحةٍ فيها ما يُبلَّغ عنه ──
  let screenshot: string | undefined
  if (findings.some((f) => f.severity === 'عطل' || f.severity === 'مشبوه')) {
    // JPEG لا PNG: التقرير الـHTML يضمّن اللقطات كـ data: URI ليبقى ذاتيَّ
    // الاحتواء. وبمئة صفحةٍ معطّلة تصير لقطاتُ PNG عشرات الميغابايت في ملفٍّ
    // واحد يعجز المتصفّح عن فتحه — وتقريرٌ لا يُفتح لا يُقرأ. والجودة ٧٢٪
    // تكفي تماماً لرؤية «الصفحة بيضاء».
    const fileName = `${slugify(role, target.url)}.jpg`
    try {
      mkdirSync(crawlerConfig.screenshotDir, { recursive: true })
      await page.screenshot({
        path: path.join(crawlerConfig.screenshotDir, fileName),
        fullPage: false,
        type: 'jpeg',
        quality: 72,
        timeout: 10_000,
      })
      screenshot = `screenshots/${fileName}`
    } catch {
      // لقطةٌ متعذّرة لا تُلغي الاكتشاف — نمضي بلا صورة
    }
  }

  collector.dispose()

  const result: PageResult = {
    url: target.url,
    pattern: target.pattern,
    role,
    element: target.element,
    durationMs,
    findings,
    screenshot,
    buttonsProbed,
    buttonsSkipped,
  }

  // المُبلِّغ المخصّص يلتقط هذه المرفقة ويبني منها التقرير
  await testInfo.attach('crawl-result', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  })

  return result
}

/* ══════════════════════════════════════════════════════════════
   التسجيل
   ══════════════════════════════════════════════════════════════ */

/** يسجّل اختباراً لكلّ صفحةٍ تخصّ هذا الدور. */
export function registerCrawl(role: CrawlRole): void {
  const inventory = loadInventory()
  const targets = inventory.targets.filter((target) => target.audience === role)

  if (targets.length === 0) {
    test(`لا صفحاتٍ مسجَّلةً لدور «${role}»`, () => {
      test.skip(true, 'الجرد لا يحوي أهدافاً لهذا الدور')
    })
    return
  }

  for (const target of targets) {
    test(target.url, async ({ page }, testInfo) => {
      const status = roleStatus(role)
      // دورٌ فشل دخوله: لا نفحص صفحاته أصلاً. لو فحصناها لرأينا نموذج الدخول
      // ولحسبناه «محتوىً سليماً» — وهو أخطر أنواع الكذب في تقرير.
      test.skip(
        status !== null && !status.ok,
        `تعذّر الدخول بدور «${role}» — ${status?.reason ?? 'سببٌ غير معروف'}`,
      )

      const result = await crawlPage(page, target, role, testInfo)

      const broken = result.findings.filter((f) => f.severity === 'عطل')
      if (broken.length > 0) {
        // رسالةٌ تشخيصيةٌ لا رقمية: من يقرأ السجلّ يفهم العطل بلا فتح التقرير
        throw new Error(
          [`الصفحة ${target.url} معطّلة:`, ...broken.map((f) => `  • [${f.kind}] ${f.detail}`)].join('\n'),
        )
      }
    })
  }

  /* ── فحصٌ إضافيّ للزائر: مسار الالتقاط الشامل ── */
  if (role === 'public') {
    test('عنوانٌ غير موجودٍ يعرض صفحة ٤٠٤ لا شاشةً بيضاء', async ({ page }, testInfo) => {
      const result = await crawlPage(
        page,
        {
          url: '/لا-يوجد-مسار-بهذا-الاسم-9137',
          pattern: '/*',
          audience: 'public',
          element: 'NotFoundPage',
          params: [],
        },
        'public',
        testInfo,
      )

      const broken = result.findings.filter((f) => f.severity === 'عطل')
      if (broken.length > 0) {
        throw new Error(
          ['مسار الالتقاط الشامل معطّل:', ...broken.map((f) => `  • [${f.kind}] ${f.detail}`)].join('\n'),
        )
      }
    })
  }
}
