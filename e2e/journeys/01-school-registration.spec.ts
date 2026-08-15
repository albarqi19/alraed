/**
 * الرحلة ١ — تسجيل مدرسةٍ جديدة من `/register`، ثمّ أوّل خطوةٍ في التهيئة.
 *
 * ══ ما تُثبته ══
 * أنّ الطريقَ الذي تدخل منه كلُّ مدرسةٍ جديدة سالكٌ من أوّله إلى آخره:
 *   ١) النموذجُ يُرسل، والخادمُ يُنشئ **مدرسةً واحدة** ومديراً لها.
 *   ٢) بياناتُ الدخول المعروضة على الشاشة **تعمل فعلاً** — لا نصٌّ جميلٌ لحسابٍ
 *      لا يدخل.
 *   ٣) الحسابُ الجديد يصل إلى معالج التهيئة، وضغطةُ «لنبدأ الإعداد» **تُقدّم
 *      الحالة**: الخطوةُ الأولى تُختم، والخطوة التالية تصير الحالية.
 *
 * ══ لماذا هذه الرحلة أوّل الرحلات ══
 * لأنها الطريق الوحيد الذي لا بديل عنه. عطلٌ في أيّ صفحةٍ أخرى يُلتفّ عليه؛
 * وعطلٌ هنا يعني أنّ المدرسة لا تدخل النظام أصلاً.
 *
 * ══ حدُّ المحاولات ══
 * `POST schools/register` عليه `throttle:5,60` — خمسُ محاولاتٍ في الساعة لكلّ
 * عنوان. وهذا مقصودٌ في الإنتاج، وعائقٌ في الاختبار: التشغيلُ السادس في الساعة
 * يردّ 429. فالرحلة **تتخطّى نفسها معلِنةً** عند بلوغ الحدّ بدل أن تُسجَّل عطلاً
 * في ميزةٍ سليمة — وتُكتب في التقرير «متخطّاة ولماذا» لا «ناجحة».
 *
 * ══ الأثر الخارجيّ ══
 * التسجيل يُدرج `SendSchoolWelcomeWhatsApp` في طابور `whatsapp`. وهو أثرٌ
 * **كامنٌ لا خارج**: الطابور بلا عاملٍ يعمل عليه في بيئة الاختبار. تُعلنه
 * الرحلة صراحةً، ويُقاس عددُ رسائل الواتساب المسجَّلة قبل وبعد — ويجب أن يبقى
 * كما هو تماماً.
 */

import { test, expect } from './_support/journey'
import { apiWithToken, loginViaApi, NO_SESSION, type ApiBridge } from './_support/api-bridge'
import { countRows, firstRow } from './_support/php-bridge'
import { installSession } from './_support/session'
import {
  uniqueAdminName,
  uniqueMinistryNumber,
  uniqueNationalId,
  uniquePhone,
  uniqueSchoolName,
  uniqueSubdomain,
} from './_support/unique'
import type { Page } from '@playwright/test'

/** استجابةُ التسجيل كما يردّها الخادم */
interface RegisterResponse {
  success: boolean
  message?: string
  data?: {
    school?: { id: number; name: string; slug: string; subdomain: string }
    admin_credentials?: { national_id: string; password: string }
  }
}

/**
 * يلتقط حقلاً في نموذج التسجيل بنصّ تسميته الظاهر.
 *
 * النموذج يلفّ حقولَه في `<label>` بلا `id` ولا `data-testid`، فالتسمية هي
 * المرساة المستقرّة الوحيدة فيه. والاحتواء آمنٌ هنا: «اسم المدرسة» ليس جزءاً
 * من «اسم مدير المدرسة» (بينهما «مدير»)، فلا التباس.
 */
function field(page: Page, labelText: string) {
  return page.locator('label').filter({ hasText: labelText }).locator('input, select').first()
}

test.describe('الرحلة ١ — تسجيل مدرسة جديدة', () => {
  test.use({ storageState: NO_SESSION })

  test('مديرُ مدرسةٍ يسجّل مدرسته من /register فتُنشأ فعلاً، ويدخل بحسابها، ويتقدّم في التهيئة', async ({
    page,
    journey,
  }) => {
    journey.about({
      role: 'زائر ← مدير المدرسة الجديدة',
      purpose:
        'يُثبت أنّ نموذج التسجيل يُنشئ مدرسةً واحدةً وحساباً يعمل فعلاً، ' +
        'وأنّ معالج التهيئة يتقدّم بخطوةٍ حين يضغط صاحبُه الزرّ.',
    })
    journey.expectQueued('whatsapp', 1, 'رسالةُ الترحيب ببيانات الدخول — تصطفّ ولا تُنفَّذ')

    const schoolName = uniqueSchoolName()
    const subdomain = uniqueSubdomain()
    const ministryNumber = uniqueMinistryNumber()
    const adminName = uniqueAdminName()
    const adminNationalId = uniqueNationalId()
    const adminPhone = uniquePhone()

    let api: ApiBridge | null = null

    try {
      /* ── القياس قبل الفعل ── */
      const schoolsCount = await journey.measure('عدد المدارس في القاعدة', () => countRows('schools'))
      const usersCount = await journey.measure('عدد الحسابات في القاعدة', () => countRows('users'))

      await journey.step('فتح صفحة التسجيل العامّة', async () => {
        await page.goto('/register', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'ابدأ رحلتك مع نظام الرائد' }),
          'صفحة /register لم تعرض نموذج التسجيل — الطريق الوحيد لدخول مدرسةٍ جديدة مغلق',
        ).toBeVisible()
      })

      await journey.step(`ملء بيانات المدرسة «${schoolName}» ومديرها`, async () => {
        await field(page, 'اسم المدرسة').fill(schoolName)
        await field(page, 'المرحلة الدراسية').selectOption('elementary')
        await field(page, 'الرقم الوزاري للمدرسة').fill(ministryNumber)
        await field(page, 'النطاق الفرعي').fill(subdomain)
        await field(page, 'اسم مدير المدرسة').fill(adminName)
        await field(page, 'رقم جوال مدير المدرسة').fill(adminPhone)
        await field(page, 'رقم الهوية').fill(adminNationalId)
      })

      /* ── الإرسال ──
         نلتقط الاستجابة نفسها لا أثرَها فقط: منها نأخذ معرّف المدرسة، ومنها
         نعرف إن كان الردُّ 429 فنتخطّى بوعي. */
      const response = await journey.step('إرسال النموذج', async () => {
        const pending = page.waitForResponse(
          (res) => res.url().includes('/schools/register') && res.request().method() === 'POST',
          { timeout: 60_000 },
        )
        await page.getByRole('button', { name: 'إكمال التسجيل' }).click()
        return pending
      })

      if (response.status() === 429) {
        const reason =
          'بلغ حدُّ التسجيل (throttle:5,60 — خمسُ محاولاتٍ في الساعة لكلّ عنوان). ' +
          'هذا سلوكٌ صحيحٌ من الخادم لا عطل؛ أعد التشغيل بعد ساعة، أو من عنوانٍ آخر.'
        journey.markSkipped(reason)
        journey.note('لم تُنشأ مدرسة، ولم يُقس شيء — الرحلة لم تجرِ.')
        test.skip(true, reason)
        return
      }

      const body = (await response.json()) as RegisterResponse
      expect(
        response.status(),
        `الخادم ردّ ${response.status()} على تسجيل المدرسة. الرسالة: ${body.message ?? '—'}`,
      ).toBe(200)

      const createdSchool = body.data?.school
      const credentials = body.data?.admin_credentials
      expect(createdSchool?.id, 'استجابةُ التسجيل بلا معرّف مدرسة — لا نعرف ماذا أُنشئ').toBeTruthy()
      expect(
        credentials?.password,
        'استجابةُ التسجيل بلا كلمة مرور — المدرسة لن تستطيع الدخول إلّا برسالة واتساب قد لا تصل',
      ).toBeTruthy()

      const schoolId = createdSchool!.id
      journey.created(`مدرسة «${schoolName}» (المعرّف ${schoolId}) وحساب مديرها ${adminNationalId}`)

      /* ── التحقّق الأوّل: الواجهة ── */
      await journey.step('شاشةُ النجاح تعرض بيانات الدخول', async () => {
        await expect(
          page.getByText('تم تسجيل مدرستك بنجاح'),
          'الخادم أنشأ المدرسة لكنّ الصفحة لم تُظهر شاشةَ النجاح — الواجهة لا تقرأ الاستجابة',
        ).toBeVisible()

        /* بطاقةُ الاعتماد قائمةُ تعريفٍ `<dl>` وحيدةٌ في الشاشة. والالتقاطُ بها
           لا بنصٍّ حرّ: «بيانات الدخول» يظهر أيضاً على زرّ «نسخ بيانات الدخول»،
           فالنصُّ الحرّ يلتقط عنصرين ويسقط التأكيد بلا سببٍ حقيقيّ. */
        const credentialsCard = page.locator('dl').first()
        await expect(credentialsCard, 'شاشةُ النجاح بلا بطاقة بيانات دخول').toBeVisible()
        await expect(
          credentialsCard,
          `بطاقةُ الدخول لا تعرض اسم المستخدم ${adminNationalId} الذي أدخلناه`,
        ).toContainText(adminNationalId)
        await expect(
          credentialsCard,
          'بطاقةُ الدخول لا تعرض كلمة المرور — ومن يغادر الصفحة لن يعرفها إلّا برسالة واتساب',
        ).toContainText(credentials!.password)
      })

      /* ── التحقّق الثاني: القاعدة ── */
      await journey.step('مدرسةٌ واحدةٌ أُنشئت فعلاً، ومديرٌ واحدٌ معها', async () => {
        await journey.confirm(
          schoolsCount,
          () => countRows('schools'),
          1,
          'تسجيلٌ واحدٌ يجب أن يُنشئ مدرسةً واحدة؛ الزيادةُ بأكثر تعني إرسالاً مكرَّراً للنموذج.',
        )
        await journey.confirm(
          usersCount,
          () => countRows('users'),
          1,
          'ومعها حسابُ مديرٍ واحدٌ لا أكثر.',
        )

        const school = await firstRow<{ id: number; name: string; subdomain: string; status: string }>('schools', {
          id: schoolId,
        })
        expect(school, `المدرسة ${schoolId} ليست في القاعدة رغم أنّ الخادم قال إنّه أنشأها`).not.toBeNull()
        expect(school!.name, 'اسم المدرسة المحفوظ يخالف ما أُدخل').toBe(schoolName)

        const admin = await firstRow<{ id: number; school_id: number; role: string; name: string }>('users', {
          national_id: adminNationalId,
        })
        expect(admin, `حسابُ المدير ${adminNationalId} ليس في القاعدة`).not.toBeNull()
        expect(
          Number(admin!.school_id),
          `حسابُ المدير رُبط بالمدرسة ${admin?.school_id} بدل ${schoolId} — المدير لن يرى مدرسته`,
        ).toBe(schoolId)
        expect(admin!.role, 'الحساب أُنشئ بدورٍ غير «admin» فلن يملك صلاحيات الإدارة').toBe('admin')
      })

      /* ── التحقّق الثالث: الحسابُ يدخل فعلاً ──
         هذا هو السؤال الذي لا تجيبه القاعدة: كلمةُ مرورٍ محفوظةٌ ليست كلمةَ
         مرورٍ تعمل. */
      const session = await journey.step('الحساب الجديد يستطيع الدخول ببيانات الشاشة', async () => {
        const outcome = await loginViaApi(adminNationalId, credentials!.password)
        expect(outcome.token, 'الدخول نجح بلا توكن').toBeTruthy()
        expect(
          Number(outcome.user.school_id),
          `الدخول نجح لكنّ الحساب مربوطٌ بالمدرسة ${outcome.user.school_id} لا ${schoolId}`,
        ).toBe(schoolId)
        expect(
          outcome.user.needs_onboarding,
          'مدرسةٌ جديدة يجب أن تُوجَّه إلى معالج التهيئة، والخادم يقول إنّها لا تحتاجه',
        ).toBe(true)
        return outcome
      })

      api = await apiWithToken(session.token, `بجلسة مدير «${schoolName}»`)
      const bridge = api

      /* ── التهيئة ── */
      const stepBefore = await journey.step('حالةُ التهيئة قبل أيّ خطوة', async () => {
        const status = await bridge.get<{
          current_step: string
          progress: number
          onboarding_completed: boolean
          steps: Array<{ key: string; is_completed: boolean }>
        }>('admin/onboarding/status')

        expect(
          status.onboarding_completed,
          'مدرسةٌ لم تُنشأ إلّا قبل ثوانٍ ومعالجُ تهيئتها مكتمل — الخطواتُ لم تُهيَّأ أصلاً',
        ).toBe(false)
        expect(status.current_step, 'أوّل خطوةٍ في التهيئة يجب أن تكون «welcome»').toBe('welcome')
        return status
      })

      /* عدُّ الخطوات المكتملة لا نسبةُ التقدّم: النسبة رقمٌ محسوبٌ قد يتغيّر
         بتغيّر عدد الخطوات، فتثبيتُ «١٢٪» يُفشل الرحلة يومَ تُضاف خطوةٌ ثامنة —
         وهو تحسينٌ في المنتج لا عطل. أمّا «خطوةٌ واحدةٌ اكتملت» فحقيقةٌ ثابتة. */
      const completedSteps = await journey.measure(
        'عدد خطوات التهيئة المكتملة',
        async () => {
          const status = await bridge.get<{ steps: Array<{ is_completed: boolean }> }>('admin/onboarding/status')
          return status.steps.filter((s) => s.is_completed).length
        },
      )

      const wizardTitle = page.locator('h1.ws-header__title')

      const titleBefore = await journey.step('دخولُ معالج التهيئة بعينَي صاحب الحساب', async () => {
        await installSession(page, session.token, session.user)
        await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByRole('heading', { name: 'مرحباً بك في نظام الرائد!' }),
          'الحساب الجديد لم يصل إلى معالج التهيئة — إمّا قُذف إلى الدخول وإمّا انهارت الصفحة',
        ).toBeVisible()

        // عنوانُ الخطوة الحالية في ترويسة المعالج — مرساةُ «هل تقدّمت الشاشة؟»
        await expect(wizardTitle, 'ترويسةُ المعالج بلا عنوانِ خطوة').toBeVisible()
        return (await wizardTitle.innerText()).trim()
      })

      await journey.step('ضغطُ «لنبدأ الإعداد» يختم الخطوة الأولى', async () => {
        const completed = page.waitForResponse(
          (res) => res.url().includes('/admin/onboarding/steps/welcome/complete') && res.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await page.getByRole('button', { name: 'لنبدأ الإعداد' }).click()
        const res = await completed

        expect(
          res.status(),
          `الخادم ردّ ${res.status()} على ختم خطوة الترحيب بدل 200. الردّ: ${(await res.text()).slice(0, 300)}`,
        ).toBe(200)
      })

      await journey.step('الحالة تقدّمت فعلاً — لا في الشاشة وحدها', async () => {
        const after = await bridge.get<{
          current_step: string
          progress: number
          steps: Array<{ key: string; is_completed: boolean }>
        }>('admin/onboarding/status')

        expect(
          after.current_step,
          `الخطوة الحالية ما زالت «${after.current_step}» بعد ختم الترحيب — الحالة لم تتقدّم`,
        ).not.toBe(stepBefore.current_step)

        const welcome = after.steps.find((s) => s.key === 'welcome')
        expect(welcome?.is_completed, 'خطوةُ الترحيب لم تُعلَّم مكتملةً رغم أنّ الخادم ردّ بالنجاح').toBe(true)

        expect(
          after.progress,
          `نسبةُ التقدّم بقيت ${after.progress}% كما كانت — التقدّم لم يُسجَّل`,
        ).toBeGreaterThan(stepBefore.progress)

        journey.note(`التهيئة تقدّمت: «${stepBefore.current_step}» ← «${after.current_step}»`)
      })

      await journey.confirm(
        completedSteps,
        async () => {
          const status = await bridge.get<{ steps: Array<{ is_completed: boolean }> }>('admin/onboarding/status')
          return status.steps.filter((s) => s.is_completed).length
        },
        1,
        'ضغطةٌ واحدةٌ على «لنبدأ الإعداد» يجب أن تختم خطوةً واحدةً لا أكثر ولا أقلّ.',
      )

      await journey.step('الواجهة انتقلت إلى الخطوة التالية', async () => {
        await expect(
          page.getByRole('heading', { name: 'مرحباً بك في نظام الرائد!' }),
          'الخادم تقدّم بالخطوة لكنّ الشاشة ما زالت على شاشة الترحيب — الواجهة لا تعيد الجلب',
        ).toBeHidden()
        await expect(
          wizardTitle,
          `عنوانُ الخطوة في الترويسة ما زال «${titleBefore}» — الشاشة لم تتبع تقدّمَ الخادم`,
        ).not.toHaveText(titleBefore)
      })
    } finally {
      await api?.dispose()
    }
  })
})

