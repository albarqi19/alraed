/**
 * المصادقة — مرّةً واحدةً لكلّ دور.
 *
 * تسجيلُ الدخول في كلّ اختبار بطيءٌ وهشّ: مئةُ صفحةٍ تعني مئةَ عمليةِ دخول،
 * وأيُّ تذبذبٍ في الشبكة يُسقط اختباراتٍ سليمة. فندخل مرّةً ونحفظ الحالة
 * (`storageState`)، وترثها بقيّةُ المشاريع.
 *
 * وإن تعذّر الدخول بدورٍ ما، **لا نُسقط التشغيل كلَّه**: نسجّل «تعذّر الدخول
 * بدور كذا» ونمضي ببقيّة الأدوار. تقريرٌ عن ثلاثة أدوارٍ خيرٌ من لا تقرير.
 */

import { test as setup, expect, request as playwrightRequest } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { apiUrl, assertNotProduction, crawlerConfig } from '../config/crawler.config'
import { credentials } from '../config/route-params'

/** حالة كلّ دور بعد محاولة الدخول — يقرؤها الزحف والمُبلِّغ */
export interface RoleStatus {
  role: string
  ok: boolean
  reason?: string
  userName?: string
  actualRole?: string
}

const statusFile = path.join(crawlerConfig.authStateDir, 'roles-status.json')

/** مسار ملفّ الحالة المحفوظة لدورٍ ما */
export function storageStatePath(role: string): string {
  return path.join(crawlerConfig.authStateDir, `${role}.json`)
}

/** يقرأ حالة الأدوار المسجَّلة (يستدعيها الزحف والمُبلِّغ) */
export function readRoleStatuses(): RoleStatus[] {
  if (!existsSync(statusFile)) return []
  try {
    return JSON.parse(readFileSync(statusFile, 'utf8')) as RoleStatus[]
  } catch {
    return []
  }
}

function recordStatus(status: RoleStatus): void {
  mkdirSync(crawlerConfig.authStateDir, { recursive: true })
  const all = readRoleStatuses().filter((s) => s.role !== status.role)
  all.push(status)
  writeFileSync(statusFile, JSON.stringify(all, null, 2), 'utf8')
}

/** حالةٌ فارغة: تُكتب كي لا ينهار مشروعُ الزحف بحثاً عن ملفٍّ غير موجود */
function writeEmptyState(role: string): void {
  mkdirSync(crawlerConfig.authStateDir, { recursive: true })
  writeFileSync(storageStatePath(role), JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf8')
}

/* ══════════════════════════════════════════════════════════════
   الدخول عبر الـ API ثم حقن الحالة
   ══════════════════════════════════════════════════════════════
   لماذا لا نملأ نموذج الدخول؟ الزاحف يفحص ١٤٠ صفحة؛ إن كان نموذج الدخول
   نفسه معطّلاً فسيسقط كلُّ شيء ولن نعرف شيئاً عن باقي النظام. فنفصل: الدخول
   عبر الـ API (طريقٌ مستقلّ لا ينكسر بانكسار الواجهة)، ونفحص نموذج الدخول
   نفسه كصفحةٍ عاديّةٍ ضمن الزحف العام. */

interface LoginOutcome {
  token: string
  user: Record<string, unknown>
}

async function loginViaApi(nationalId: string, password: string): Promise<LoginOutcome> {
  // عنوانٌ مطلق لا مسارٌ نسبيّ: انظر تعليق `apiUrl` — الأساس ذو المسار
  // (`…/api`) يضيع مع أيّ مسارٍ يبدأ بشرطةٍ مائلة.
  const context = await playwrightRequest.newContext()
  try {
    const response = await context.post(apiUrl('auth/login'), {
      data: { national_id: nationalId, password },
      headers: { Accept: 'application/json' },
      timeout: 20_000,
    })

    const bodyText = await response.text()
    if (!response.ok()) {
      throw new Error(`الخادم ردّ ${response.status()}: ${bodyText.slice(0, 200)}`)
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyText) as Record<string, unknown>
    } catch {
      throw new Error(`استجابةٌ ليست JSON: ${bodyText.slice(0, 200)}`)
    }

    // الاستجابة قد تُغلَّف في data، والتوكن قد يكون token أو access_token
    const payload = (body.data ?? body) as Record<string, unknown>
    const token = (payload.token ?? payload.access_token ?? body.token ?? body.access_token) as string | undefined
    const user = (payload.user ?? body.user) as Record<string, unknown> | undefined

    if (!token || !user) {
      throw new Error(`الاستجابة بلا توكن أو بلا مستخدم: ${bodyText.slice(0, 200)}`)
    }

    return { token, user }
  } finally {
    await context.dispose()
  }
}

/**
 * يحقن الجلسة في المتصفّح ويحفظها.
 *
 * تُكتب في مفتاحين لأن التطبيق يقرأ من كليهما:
 *   • `auth_token`   — يقرؤه معترضُ axios وبناةُ روابط الملفّات مباشرة
 *   • `auth-storage` — مخزن zustand المُبقى (persist)، وهو مصدر `isAuthenticated`
 * وكتابةُ أحدهما دون الآخر تُنتج جلسةً نصفَ حيّة: النداءات موقَّعة لكنّ حرّاس
 * المسارات يظنّونك زائراً فيقذفونك إلى صفحة الدخول.
 */
async function persistSession(
  role: string,
  token: string,
  user: Record<string, unknown>,
  browserContextPage: import('@playwright/test').Page,
): Promise<void> {
  const snapshot = {
    state: {
      token,
      tokenType: 'Bearer',
      user: {
        ...user,
        permissions: user.permissions_simple ?? user.permissions ?? [],
      },
      isAuthenticated: true,
    },
    version: 0,
  }

  await writeLocalStorage(browserContextPage, {
    auth_token: token,
    'auth-storage': JSON.stringify(snapshot),
  })

  mkdirSync(crawlerConfig.authStateDir, { recursive: true })
  await browserContextPage.context().storageState({ path: storageStatePath(role) })
}

/**
 * يكتب مفاتيح `localStorage` على أصل التطبيق — بلا تشغيل التطبيق.
 *
 * `localStorage` مرتبطٌ بالأصل (origin)، فلا بدّ من صفحةٍ على ذلك الأصل.
 * لكنّ زيارة صفحةٍ حقيقيةٍ لا تصلح: التطبيق يُقلع فوراً، وحرّاسُ المسارات يرون
 * زائراً بلا جلسةٍ فيقذفونه إلى `/auth/…` — والملاحةُ تُدمّر سياقَ التنفيذ قبل
 * أن نكتب شيئاً، فيسقط `page.evaluate` بـ «Execution context was destroyed»
 * ويُسجَّل «تعذّر الدخول» وهو دخولٌ ناجح.
 *
 * فنُلفّق صفحةً فارغةً على الأصل نفسه: لا شيفرةَ تطبيقٍ تعمل، ولا ملاحةَ
 * تسبقنا، والأصلُ هو هو — فالمفاتيح تُكتب في المكان الصحيح.
 */
async function writeLocalStorage(
  page: import('@playwright/test').Page,
  entries: Record<string, string>,
): Promise<void> {
  const blankUrl = new URL('/__e2e_session_bootstrap', crawlerConfig.baseURL).toString()

  await page.route(blankUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تهيئة الجلسة</title></head><body></body></html>',
    }),
  )

  try {
    await page.goto(blankUrl, { waitUntil: 'domcontentloaded', timeout: crawlerConfig.pageTimeoutMs })
    await page.evaluate((pairs) => {
      for (const [key, value] of Object.entries(pairs)) {
        window.localStorage.setItem(key, value)
      }
    }, entries)
  } finally {
    await page.unroute(blankUrl)
  }
}

/* ══════════════════════════════════════════════════════════════
   المشاريع
   ══════════════════════════════════════════════════════════════ */

setup.describe.configure({ mode: 'serial' })

setup('تهيئة: التحقّق من أنّ الهدف ليس الإنتاج', async () => {
  assertNotProduction()
})

for (const role of ['admin', 'teacher', 'super-admin'] as const) {
  setup(`تسجيل الدخول بدور: ${role}`, async ({ page }) => {
    const creds = credentials[role]

    if (!creds.nationalId || !creds.password) {
      writeEmptyState(role)
      recordStatus({
        role,
        ok: false,
        reason:
          `لم تُضبط بيانات الدخول (E2E_${role.toUpperCase().replace('-', '_')}_NATIONAL_ID و…_PASSWORD). ` +
          'شغّل سكربت التهيئة أوّلاً — صفحات هذا الدور لن تُفحص.',
      })
      setup.skip(true, `بيانات دخول ${role} غير مضبوطة`)
      return
    }

    try {
      const { token, user } = await loginViaApi(creds.nationalId, creds.password)
      await persistSession(role, token, user, page)
      recordStatus({
        role,
        ok: true,
        userName: typeof user.name === 'string' ? user.name : undefined,
        actualRole: typeof user.role === 'string' ? user.role : undefined,
      })
      expect(token.length).toBeGreaterThan(0)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      writeEmptyState(role)
      recordStatus({ role, ok: false, reason: `تعذّر الدخول بدور «${role}»: ${message}` })
      // لا نُفشل التهيئة: بقيّة الأدوار يجب أن تُفحص
      setup.skip(true, `تعذّر الدخول بدور ${role}`)
    }
  })
}

setup('تسجيل الدخول ببوابة وليّ الأمر', async ({ page }) => {
  const creds = credentials.guardian

  if (!creds.studentNationalId || !creds.phoneLast4) {
    writeEmptyState('guardian')
    recordStatus({
      role: 'guardian',
      ok: false,
      reason:
        'لم تُضبط بيانات وليّ الأمر (E2E_GUARDIAN_STUDENT_NATIONAL_ID و E2E_GUARDIAN_PHONE_LAST4). ' +
        'بوابة وليّ الأمر لن تُفحص.',
    })
    setup.skip(true, 'بيانات وليّ الأمر غير مضبوطة')
    return
  }

  const context = await playwrightRequest.newContext()
  try {
    const response = await context.post(apiUrl('guardian-auth/login'), {
      data: { national_id: creds.studentNationalId, phone_last4: creds.phoneLast4 },
      headers: { Accept: 'application/json' },
      timeout: 20_000,
    })

    if (!response.ok()) {
      throw new Error(`الخادم ردّ ${response.status()}: ${(await response.text()).slice(0, 200)}`)
    }

    const body = (await response.json()) as Record<string, unknown>
    const token = (body.token ?? (body.data as Record<string, unknown>)?.token) as string | undefined
    if (!token) throw new Error('استجابةٌ بلا توكن')

    // بوابة وليّ الأمر لا تستعمل مخزن zustand: عميلُها الخاصّ
    // (`services/api/guardian-client.ts`) يقرأ المفتاح مباشرةً من localStorage.
    await writeLocalStorage(page, { guardian_auth_token: token })

    mkdirSync(crawlerConfig.authStateDir, { recursive: true })
    await page.context().storageState({ path: storageStatePath('guardian') })
    recordStatus({ role: 'guardian', ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeEmptyState('guardian')
    recordStatus({ role: 'guardian', ok: false, reason: `تعذّر الدخول ببوابة وليّ الأمر: ${message}` })
    setup.skip(true, 'تعذّر دخول وليّ الأمر')
  } finally {
    await context.dispose()
  }
})

setup('الزائر: حالةٌ فارغة للمسارات العامة', async () => {
  writeEmptyState('public')
  recordStatus({ role: 'public', ok: true })
})
