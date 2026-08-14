/**
 * تعيين بارامترات المسارات وبيانات الدخول — واجهةٌ مكتوبةُ الأنواع.
 *
 * المنطق كلُّه في `seed-payload.mjs` (جافاسكربت خالص) لأن له قارئَين: عدّةُ
 * Playwright وسطرُ الأوامر `e2e:routes` الذي يعمل بـ node بلا مترجم. وهذا
 * الملفّ ليس إلا غلافاً يمنح الأنواع لبقيّة العدّة.
 *
 * المسار `/admin/students/:studentId` بلا قيمةٍ للبارامتر لا يُزار. والخيار
 * بين أمرين: أن نخترع رقماً (فيردّ الباك 404 ونظنّه عطلاً)، أو أن نأخذ معرّفاً
 * حقيقياً من البذرة. الثاني هو الصحيح — ولذلك تأتي القيم من حمولة
 * `php artisan e2e:seed` (عبر `E2E_SEED_FILE`) أو من متغيّرات البيئة.
 *
 * ما لا قيمة له يُسجَّل في التقرير «متخطّى — لا بيانات»، ولا يُحذف صامتاً.
 *
 * ══ كيف تضيف بارامتراً جديداً؟ ══
 * أضف سطراً إلى `routeParams()` في `seed-payload.mjs` بالاسم كما هو في الراوتر
 * (بلا النقطتين)، واقرأه من متغيّر بيئةٍ باسمٍ مفهوم — ومن مفتاحٍ في حمولة
 * البذرة إن كانت تُخرجه. ثم أضف المتغيّر إلى `e2e/.env.example`.
 */

// أوّلَ شيء: تعبئة البيئة من e2e/.env قبل قراءة أيّ متغيّر
import './load-env.mjs'

import {
  credentials as buildCredentials,
  perRouteParams,
  routeParams as buildRouteParams,
} from './seed-payload.mjs'

/** البارامترات المعروفة. المفتاح = اسم البارامتر في الراوتر. */
export const routeParams: Record<string, string | undefined> = buildRouteParams()

/**
 * تعييناتٌ خاصّةٌ بمساراتٍ بعينها، مفتاحُها نمطُ المسار كما هو في الراوتر.
 * تتقدّم على `routeParams` العامّ.
 */
export const routeParamOverrides: Record<string, Record<string, string>> = perRouteParams()

/**
 * بيانات الدخول لكلّ دور — من البيئة أو من حمولة البذرة حصراً.
 * لا كلمات مرورٍ مكتوبةً في الشيفرة: هذا ملفٌّ في مستودعٍ عامّ.
 */
export const credentials = buildCredentials()

export type CrawlRole = 'admin' | 'teacher' | 'super-admin' | 'guardian' | 'public'
