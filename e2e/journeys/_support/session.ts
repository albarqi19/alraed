/**
 * حقنُ جلسةٍ في المتصفّح أثناء الرحلة.
 *
 * أدوارُ البذرة تدخل مرّةً في مشروع التهيئة وترث الرحلاتُ حالتَها. لكنّ رحلةً
 * **تُنشئ حساباً جديداً** (كتسجيل مدرسة) لا تملك حالةً محفوظةً لذلك الحساب —
 * وهي تحتاج أن تكمل الطريق بعينَي صاحبه: أن تدخل التهيئة كما يدخلها هو.
 *
 * فنحقن الجلسة يدوياً كما يفعل مشروع التهيئة تماماً.
 */

import type { Page } from '@playwright/test'
import { crawlerConfig } from '../../config/crawler.config'

/**
 * يكتب مفاتيح `localStorage` على أصل التطبيق بلا تشغيل التطبيق.
 *
 * ══ لماذا صفحةٌ ملفَّقة لا صفحةٌ حقيقية؟ ══
 * `localStorage` مرتبطٌ بالأصل، فلا بدّ من صفحةٍ عليه. لكنّ زيارة صفحةٍ حقيقية
 * تُقلع التطبيقَ فوراً، وحرّاسُ المسارات يرون زائراً بلا جلسةٍ فيقذفونه إلى
 * `/auth/…` — والملاحةُ تُدمّر سياق التنفيذ قبل أن نكتب شيئاً، فيسقط
 * `page.evaluate` بـ«Execution context was destroyed».
 *
 * فنُلفّق صفحةً فارغةً على الأصل نفسه: لا شيفرةَ تطبيقٍ تعمل، ولا ملاحةَ
 * تسبقنا، والأصلُ هو هو.
 *
 * (هذه الحيلة مأخوذةٌ عن `e2e/auth/auth.setup.ts` — وهي غيرُ مُصدَّرةٍ هناك.)
 */
async function writeLocalStorage(page: Page, entries: Record<string, string>): Promise<void> {
  const blankUrl = new URL('/__e2e_journey_bootstrap', crawlerConfig.baseURL).toString()

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

/**
 * يجعل المتصفّح مسجَّلَ الدخول بهذا المستخدم.
 *
 * يُكتب مفتاحان لأن التطبيق يقرأ من كليهما:
 *   • `auth_token`   — يقرؤه معترضُ axios مباشرة
 *   • `auth-storage` — مخزن zustand المُبقى، وهو مصدر `isAuthenticated` للحرّاس
 * وكتابةُ أحدهما دون الآخر تُنتج جلسةً نصفَ حيّة: النداءات موقَّعة لكنّ الحرّاس
 * يظنّونك زائراً فيقذفونك إلى صفحة الدخول — ويُقرأ ذلك «عطلاً في الصفحة».
 */
export async function installSession(
  page: Page,
  token: string,
  user: Record<string, unknown>,
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

  await writeLocalStorage(page, {
    auth_token: token,
    'auth-storage': JSON.stringify(snapshot),
  })
}
