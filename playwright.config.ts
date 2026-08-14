/**
 * إعداد Playwright لزاحف «الرائد».
 *
 * مشروعٌ لكلّ دور، يرث حالةَ مصادقةٍ حُفظت مرّةً واحدةً في مشروع التهيئة.
 * والسياق عربيٌّ فعليّ: locale ar-SA وtoimezone الرياض واتجاه RTL — كي تُشبه
 * الجلسةُ ما يراه المستخدم لا ما يراه متصفّحٌ أمريكيّ.
 */

// أوّلَ شيء: تعبئة البيئة من e2e/.env قبل قراءة أيّ متغيّر
import './e2e/config/load-env.mjs'

import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const E2E = path.join(here, 'e2e')
const AUTH = path.join(E2E, '.auth')

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4173'
const REPORT_DIR = process.env.E2E_REPORT_DIR ?? path.join(E2E, 'report')

/**
 * التوازي محدود عمداً: الزاحف يضرب باكاً محلّياً واحداً على SQLite/MySQL
 * تطويريّ. رفعُ العمّال يحوّل الفحصَ إلى اختبار حِمل، فتظهر مهلاتٌ منتهية
 * تُقرأ أعطالاً وهي ليست أعطالاً.
 */
const WORKERS = Number(process.env.E2E_WORKERS ?? 3)

/** إعدادات السياق العربيّ — مشتركةٌ بين كلّ المشاريع */
const arabicContext = {
  ...devices['Desktop Chrome'],
  locale: 'ar-SA',
  timezoneId: 'Asia/Riyadh',
  viewport: { width: 1440, height: 900 },
  // الأذونات تُمنح مسبقاً كي لا تعلق الصفحة على نافذة طلبٍ من المتصفّح
  permissions: [] as string[],
  // تجاهُل شهاداتٍ محلّيةٍ موقَّعةٍ ذاتياً — شائعٌ في Laragon
  ignoreHTTPSErrors: true,
  /**
   * حجبُ عمّال الخدمة (service workers).
   *
   * التطبيق يسجّل عاملَ خدمةٍ للتحديث الذاتيّ، وهو يفعل شيئاً يقتل أيّ فحص:
   * حين يتغيّر المتحكّم يُنادي `location.reload()`. فتُعاد الصفحةُ تحميلاً في
   * منتصف القياس، ويُدمَّر سياقُ التنفيذ، فتُلتقط اللقطةُ على صفحةٍ بيضاء
   * ويُعلَن عطلٌ لا وجود له. وأسوأ: العاملُ قد يخدم نسخةً **مخبَّأةً قديمة**
   * فيُفحص بناءٌ ليس البناءَ الذي بنيناه.
   *
   * فنحجبه: الزاحف يفحص التطبيق، لا طبقةَ التخبئة. وثمنُ ذلك أنّ سلوك PWA
   * (العمل بلا إنترنت، إشعارُ التحديث) خارج نطاق هذا الفحص — وهو مذكورٌ في
   * حدود التقرير كي لا يُظنّ مفحوصاً.
   */
  serviceWorkers: 'block' as const,
}

/**
 * يبني مشروع دورٍ يرث حالة مصادقته.
 *
 * لكلّ دورٍ ملفُّ مواصفاتٍ خاصٌّ به (e2e/roles/<الدور>.crawl.spec.ts) لا ملفٌّ
 * واحدٌ مشترك: Playwright يحمّل ملفّ المواصفات مرّةً واحدةً ثم يستنسخ شجرته
 * لكلّ مشروع، فلا يمكن لملفٍّ واحدٍ أن يعرف أيَّ دورٍ يُسجَّل له. والفصلُ يجعل
 * كلَّ مشروعٍ يسجّل صفحاتِ دوره وحدها — بلا مئاتِ الاختبارات المتخطّاة.
 */
function roleProject(role: string, label: string) {
  return {
    name: label,
    testMatch: new RegExp(`roles[\\\\/]${role}\\.crawl\\.spec\\.ts$`),
    dependencies: ['تهيئة المصادقة'],
    use: {
      ...arabicContext,
      storageState: path.join(AUTH, `${role}.json`),
    },
  }
}

export default defineConfig({
  testDir: E2E,
  outputDir: path.join(E2E, '.artifacts'),
  globalSetup: path.join(E2E, 'global-setup.ts'),

  /** مهلة الاختبار الواحد: تحميل الصفحة + استقرارها + تجربة أزرارها */
  timeout: Number(process.env.E2E_TEST_TIMEOUT ?? 70_000),
  expect: { timeout: 8_000 },

  fullyParallel: true,
  workers: WORKERS,

  /**
   * محاولةٌ ثانيةٌ واحدة: فشلُ الشبكة العابر (باكٌ يعيد تشغيل عاملَه، قفلُ
   * قاعدةٍ لحظيّ) لا يستحقّ سطراً في تقرير المالك. وما يفشل مرّتين عطلٌ حقيقيّ.
   */
  retries: Number(process.env.E2E_RETRIES ?? 1),

  /** لا نُسقط التشغيل عند أوّل عطل: التقرير الكامل هو الهدف */
  maxFailures: 0,
  forbidOnly: true,

  reporter: [
    ['list'],
    [path.join(E2E, 'reporter', 'crawler-reporter.ts')],
    ['html', { outputFolder: path.join(REPORT_DIR, 'playwright'), open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: Number(process.env.E2E_PAGE_TIMEOUT ?? 25_000),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ...arabicContext,
  },

  projects: [
    {
      name: 'تهيئة المصادقة',
      testMatch: /auth\.setup\.ts/,
      use: arabicContext,
    },
    roleProject('public', 'زائر'),
    roleProject('admin', 'الإدارة'),
    roleProject('teacher', 'المعلم'),
    roleProject('super-admin', 'المشرف العام'),
    roleProject('guardian', 'وليّ الأمر'),
  ],
})
