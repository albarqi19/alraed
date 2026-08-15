/**
 * الرحلة ٤ — نموذجٌ يصل وليَّ الأمر: الحلقةُ الثلاثية كاملةً.
 *
 * ══ ما تُثبته ══
 *   أنشئ ← يُنشَر ← **يظهر لوليّ الأمر** ← يردّ ← **يُقرأ ردُّه عند الإدارة**.
 * وهذه الحلقةُ بتمامها هي ما لم يكن يُختبر قطّ. الزاحفُ يفتح صفحة المصمّم
 * فيقول «تعمل»، ويفتح بوّابةَ وليّ الأمر فيقول «تعمل» — ولا أحدَ يسأل: هل
 * الذي أنشأه الأوّلُ يراه الثاني؟
 *
 * ══ لماذا هنا بالذات ══
 * كان أربعةٌ من خمسةِ جماهيرَ يُنتجون نموذجاً **لا يراه أحد**: الواجهة تعرض
 * خمسةَ خياراتٍ للجمهور وتُرسل `assignments: []` دائماً، فيُحفَظ النموذج
 * ويُنشَر ويُعرض في القوائم ولا يبلغ وليَّ أمرٍ واحداً. عطلٌ لا يظهر في أيّ
 * شاشة — إنّما في الصمت الذي يليها. فهذه الرحلة حارسُه.
 *
 * ══ والإخفاءُ ميزةٌ كالإظهار ══
 * تُنشئ الرحلة نموذجاً ثانياً **موجَّهاً لصفٍّ غير صفّ الطالب**، وتتحقّق أنّه
 * لا يظهر له. فحارسٌ يمتحن الإظهار وحده يمرّ على تطبيقٍ يعرض كلَّ شيءٍ لكلّ
 * أحد — وذلك تسريبُ بيانات.
 *
 * ══ الأثر الخارجيّ ══
 * لا شيء: النماذج لا تُطلق إشعاراً ولا رسالة (وصفحةُ وليّ الأمر تقول ذلك
 * صراحةً في حالتها الفارغة). ومع ذلك يُقاس عدّاد الواتساب قبل وبعد — الادّعاء
 * لا يُغني عن القياس.
 *
 * ══ إعادةُ التشغيل ══
 * كلُّ ما تُنشئه الرحلة يحمل وسمَ الجولة في عنوانه، وتحذفه في النهاية عبر
 * واجهة التطبيق. ولولا الحذفُ لتراكمت النماذج المنشورة في بوّابة وليّ الأمر
 * جولةً بعد جولة، فصار كلُّ تشغيلٍ يقرأ قائمةً أطول ممّا قبله.
 */

import { request as playwrightRequest, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { test, expect } from './_support/journey'
import { apiAs, sessionFile, tokenOf, type ApiBridge } from './_support/api-bridge'
import { countRows, phpJson } from './_support/php-bridge'
import { uniqueSuffix } from './_support/unique'
import { apiUrl } from '../config/crawler.config'
import { credentials } from '../config/route-params'

/* ══════════════════════════════════════════════════════════════
   الاستطلاع
   ══════════════════════════════════════════════════════════════ */

interface GuardianStudent {
  id: number
  name: string
  grade: string
  class_name: string
  parent_name: string | null
  parent_phone: string | null
}

interface Reconnaissance {
  student: GuardianStudent | null
  /** صفوفُ المدرسة كما هي في جدول الطلاب — منها نختار صفّاً «آخر» للنموذج المحجوب */
  grades: string[]
  /** هل هويّةُ الطالب مكرَّرةٌ في القاعدة كلّها؟ البوّابةُ العامة تردّ 409 حينها */
  duplicates: number
}

/**
 * سؤالٌ واحدٌ عن كلّ ما تحتاجه الرحلة قبل أن تكتب.
 * (نداءُ tinker يكلّف نحو ثانيةٍ ونصف، والقراءةُ الواحدة متّسقة.)
 */
async function reconnoitre(schoolId: number, nationalId: string): Promise<Reconnaissance> {
  return phpJson<Reconnaissance>(
    `(function () use ($__b) {
      $school = (int) $__b['school'];
      $student = \\DB::table('students')
        ->where('school_id', $school)
        ->where('national_id', $__b['nid'])
        ->first();

      return [
        'student' => $student ? [
          'id' => (int) $student->id,
          'name' => $student->name,
          'grade' => $student->grade,
          'class_name' => $student->class_name,
          'parent_name' => $student->parent_name,
          'parent_phone' => $student->parent_phone,
        ] : null,
        'grades' => \\DB::table('students')
          ->where('school_id', $school)->where('status', 'active')
          ->distinct()->orderBy('grade')->pluck('grade')->values(),
        'duplicates' => \\DB::table('students')->where('national_id', $__b['nid'])->count(),
      ];
    })()`,
    { school: schoolId, nid: nationalId },
  )
}

/* ══════════════════════════════════════════════════════════════
   يدُ الإدارة على الـAPI — للشاهد المحجوب وللتنظيف
   ══════════════════════════════════════════════════════════════ */

async function adminContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokenOf('admin')}`,
      Accept: 'application/json',
    },
  })
}

/* ══════════════════════════════════════════════════════════════
   محدِّداتٌ في مكانٍ واحد
   ══════════════════════════════════════════════════════════════ */

/**
 * حقلٌ في مساحة العمل بنصّ تسميته.
 *
 * `WsField` لا يربط `<label>` بمُدخله إلا حين يُمرَّر `htmlFor` — ومصمّمُ
 * النموذج لا يمرّره في لوح الخصائص. فالمرساةُ الوحيدة المستقرّة هي البنية:
 * الحقلُ الذي تسميتُه كذا، ثمّ المُدخل داخله. (وهذا نقصٌ في الواجهة يستحقّ
 * `htmlFor` — سُجّل للمالك ولم يُصلَح هنا: كودُ التطبيق لا يُلمس في الاختبار.)
 */
function wsField(page: Page, label: string): Locator {
  return page.locator('.ws-field').filter({ has: page.locator('.ws-label', { hasText: label }) })
}

/** بلوكُ مساحة عملٍ بعنوانه */
function workspaceBlock(page: Page, title: string): Locator {
  return page.locator('.ws-block').filter({ has: page.locator('.ws-block__title', { hasText: title }) })
}

/** حقيقةٌ في ترويسة الصفحة («إجمالي الردود:» …) — الرقمُ في `<b>` */
function headerFact(page: Page, label: string): Locator {
  return page.locator('.ws-fact').filter({ hasText: label }).locator('b')
}

/** بطاقةُ سؤالٍ في استمارة وليّ الأمر، مُلتقطةٌ بعنوان السؤال */
function guardianQuestion(page: Page, label: string): Locator {
  return page.locator('article').filter({ hasText: label })
}

/* ══════════════════════════════════════════════════════════════
   الرحلة
   ══════════════════════════════════════════════════════════════ */

test.describe('الرحلة ٤ — نموذج يصل وليّ الأمر', () => {
  /* نبدأ بجلسة الإدارة. وبوّابةُ وليّ الأمر تُفتح في الصفحة نفسِها لاحقاً:
     مفاتيحُها في `localStorage` مستقلّةٌ عن مفاتيح الإدارة، فلا تدهسها ولا
     تُدهَس — والدخولُ إليها يجري من نموذجها كما يفعل وليُّ الأمر. */
  test.use({ storageState: sessionFile('admin') })

  test('الإدارة تُنشئ نموذجاً وتنشره، فيراه وليُّ الأمر ويردّ، فتقرأ الإدارة ردَّه — ولا يراه من ليس مستهدَفاً', async ({
    page,
    journey,
  }) => {
    journey.about({
      role: 'الإدارة ثمّ وليّ الأمر ثمّ الإدارة',
      purpose:
        'يُثبت أنّ النموذج المنشور يبلغ وليَّ الأمر فعلاً، وأنّ ردَّه يُحفظ بمحتواه ويُقرأ في صفحة الردود — ' +
        'وأنّ نموذجاً موجَّهاً لصفٍّ آخر لا يظهر له.',
    })

    const stamp = uniqueSuffix()
    const formTitle = `نموذج تجريبي ${stamp}`
    const hiddenTitle = `نموذج محجوب تجريبي ${stamp}`
    const nameLabel = 'اسم وليّ الأمر المجيب'
    const noteLabel = 'ملاحظتك للمدرسة'
    const nameAnswer = `مجيب تجريبي ${stamp}`
    const noteAnswer = `ردٌّ تجريبيّ من رحلة النماذج — ${stamp}`

    let api: ApiBridge | null = null
    let admin: APIRequestContext | null = null
    /** معرّفاتُ النماذج التي أنشأناها — تُحذف في النهاية */
    const createdFormIds: number[] = []

    try {
      api = await apiAs('admin')
      const bridge = api
      admin = await adminContext()
      const adminApi = admin

      const me = await journey.step('التعرّف على حساب الإدارة ومدرسته', async () => {
        const payload = await bridge.get<{ user: { id: number; school_id: number; name: string } }>('auth/me')
        expect(payload.user?.school_id, 'حسابُ الإدارة بلا مدرسة — لا سياقَ لهذه الرحلة').toBeTruthy()
        return payload.user
      })
      const schoolId = Number(me.school_id)

      /* ── وليُّ الأمر: مَن ابنُه، وفي أيّ صف؟ ── */
      const studentNationalId = credentials.guardian?.studentNationalId ?? ''
      const phoneLast4 = credentials.guardian?.phoneLast4 ?? ''

      if (!studentNationalId || !phoneLast4) {
        const reason =
          'بيانات دخول وليّ الأمر غير مضبوطة (E2E_GUARDIAN_STUDENT_NATIONAL_ID و E2E_GUARDIAN_PHONE_LAST4 ' +
          'أو حمولة البذرة) — ولا معنى لرحلةٍ نصفُها في بوّابته.'
        journey.markSkipped(reason)
        journey.note(reason)
        test.skip(true, reason)
        return
      }

      const scout = await journey.step('استطلاعُ القاعدة: الطالبُ وصفُّه وصفوفُ المدرسة', () =>
        reconnoitre(schoolId, studentNationalId),
      )

      if (!scout.student) {
        const reason =
          `لا طالبَ بالهوية ${studentNationalId} في المدرسة ${schoolId} — بيانات وليّ الأمر لا تخصّ هذه المدرسة. ` +
          'أعد بذر القاعدة.'
        journey.markSkipped(reason)
        journey.note(reason)
        test.skip(true, reason)
        return
      }

      const student = scout.student
      const otherGrade = scout.grades.find((grade) => grade !== student.grade) ?? null

      journey.note(
        `المدرسة ${schoolId} · الطالب «${student.name}» (${student.grade} / ${student.class_name}) · ` +
          `صفوف المدرسة: ${scout.grades.join('، ') || '—'}` +
          (scout.duplicates > 1
            ? ` · ⚠ الهويّة ${studentNationalId} مكرَّرة ${scout.duplicates} مرّاتٍ في القاعدة`
            : ''),
      )

      /* ── القياسات «قبل» ── */
      const whatsapp = await journey.measure('رسائل واتساب مسجَّلة (whatsapp_messages)', () =>
        countRows('whatsapp_messages'),
      )

      /* ── الشاهدُ المحجوب ──
         يُنشأ عبر الـAPI لا الواجهة عمداً: هو **شاهدٌ** لا موضوعُ الاختبار،
         وإنشاؤه بضغطاتٍ ثانيةٍ في المصمّم يضاعف زمن الرحلة ويخلط ما نمتحنه
         بما نستشهد به. والمهمّ فيه شيءٌ واحد: أن يكون منشوراً وموجَّهاً لصفٍّ
         ليس صفَّ ابننا. */
      if (otherGrade) {
        await journey.step(`إنشاءُ نموذجٍ شاهدٍ موجَّهٍ إلى «${otherGrade}» (يجب ألّا يراه وليُّ أمرنا)`, async () => {
          const response = await adminApi.post(apiUrl('admin/forms'), {
            data: {
              title: hiddenTitle,
              status: 'published',
              target_audience: 'grade',
              description: 'نموذجٌ شاهد: موجَّهٌ لصفٍّ آخر، وُجد ليُتحقَّق من أنّه لا يظهر.',
              assignments: [{ scope: 'grade', grade: otherGrade }],
              fields: [
                { field_key: 'hidden_note', type: 'text', label: 'لا ينبغي أن يُرى', is_required: false, sort_order: 0 },
              ],
            },
          })

          const body = (await response.json()) as { success?: boolean; data?: { id?: number }; message?: string }
          expect(
            response.status(),
            `تعذّر إنشاء النموذج الشاهد: ${response.status()} — ${body.message ?? (await response.text()).slice(0, 200)}`,
          ).toBe(201)
          expect(body.data?.id, 'الخادم أنشأ النموذج الشاهد بلا معرّف').toBeTruthy()
          createdFormIds.push(Number(body.data!.id))
        })
      } else {
        journey.note(
          'المدرسة كلُّها صفٌّ واحد، فلا صفَّ «آخر» يُوجَّه إليه الشاهد المحجوب — ' +
            'تُخطّي هذه الرحلةُ فحصَ الإخفاء وحده، وبقيّتُها تجري كاملة.',
        )
      }

      const formsCount = await journey.measure('عدد نماذج المدرسة في القاعدة', () =>
        countRows('forms', { school_id: schoolId }),
      )

      /* ══ (١) الإدارة تُنشئ النموذج من المصمّم ══ */

      await journey.step('فتحُ مصمّم النموذج', async () => {
        await page.goto('/admin/forms/new', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'نموذج جديد' }),
          'لم تظهر ترويسة «نموذج جديد» — صفحةُ المصمّم لم تُرسم',
        ).toBeVisible()
        await expect(
          page.getByRole('button', { name: 'نص قصير', exact: true }),
          'لوحةُ أنواع الأسئلة فارغة — لا سبيلَ إلى إضافة سؤال',
        ).toBeVisible()
      })

      await journey.step(`إضافةُ سؤالين: «${nameLabel}» و«${noteLabel}»`, async () => {
        const labelField = wsField(page, 'عنوان السؤال').locator('input')

        await page.getByRole('button', { name: 'نص قصير', exact: true }).click()
        await expect(labelField, 'أضفتُ سؤالاً فلم يظهر لوحُ خصائصه').toBeVisible()
        await labelField.fill(nameLabel)

        await page.getByRole('button', { name: 'نص طويل', exact: true }).click()
        await expect(
          labelField,
          'أضفتُ السؤال الثاني فبقي لوحُ الخصائص على الأوّل — الاختيارُ لا يتبع الإضافة',
        ).toHaveValue('نص طويل')
        await labelField.fill(noteLabel)

        // عدّادُ التبويب يقرأ الأسئلة الحاملة لإجابة: سؤالان لا أكثر ولا أقلّ
        await expect(
          page.locator('.ws-seg__btn').filter({ hasText: 'الأسئلة' }).locator('.ws-count'),
          'عدّادُ الأسئلة لا يطابق ما أضفتُه',
        ).toHaveText('2')
      })

      await journey.step(`تسميةُ النموذج «${formTitle}» وتوجيهُه إلى جميع الطلاب`, async () => {
        await page.locator('.ws-seg__btn').filter({ hasText: 'الإعدادات' }).click()

        await page.locator('#form-title').fill(formTitle)

        // «جميع الطلاب» هو الافتراض، ونضغطه صراحةً كي تكون إرادةُ الرحلة مكتوبةً
        // في الصفحة لا مفترضةً فيها
        const audienceButton = page.getByRole('button', { name: 'جميع الطلاب' })
        await audienceButton.click()
        await expect(
          audienceButton,
          'ضغطتُ «جميع الطلاب» فلم يُعلَّم الخيارُ نشِطاً — اختيارُ الجمهور لا يُسجَّل',
        ).toHaveClass(/is-active/)

        /* لا نتحقّق هنا من سطر «سيصل النموذج إلى N طالباً»: هو لا يُرسم أصلاً في
           هذا الجمهور. `FormAssignmentEditor` يجلب الطلاب بـ`enabled: needsTargets`
           و`needsTargets = audience !== 'all_students'`، بينما فرعُ الحساب لـ
           «جميع الطلاب» يقرأ القائمةَ نفسَها — فتبقى فارغةً و`reach` يساوي null
           فلا يُعرض شيء. سُجّل للمالك ولم يُصلَح: كودُ التطبيق لا يُلمس هنا. */
      })

      const formId = await journey.step('حفظُ النموذج — والخادمُ يردّ بمعرّفه', async () => {
        const response = page.waitForResponse(
          (candidate) =>
            candidate.url().includes('/admin/forms') && candidate.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await page.getByRole('button', { name: 'حفظ النموذج' }).click()
        const result = await response

        const body = (await result.json()) as { success?: boolean; data?: { id?: number }; message?: string }
        expect(
          result.status(),
          `الخادم ردّ ${result.status()} على حفظ النموذج بدل 201: ${body.message ?? '(بلا رسالة)'}`,
        ).toBe(201)
        expect(body.data?.id, 'النموذج حُفظ بلا معرّف').toBeTruthy()

        const id = Number(body.data!.id)

        // المصمّم ينقل إلى صفحة النموذج بعد الحفظ: وصولُنا إليها إقرارُ الواجهة
        await expect(
          page,
          'حُفظ النموذج ولم تنتقل الواجهة إلى صفحته — الحفظُ نجح والمصمّمُ لا يعلم',
        ).toHaveURL(new RegExp(`/admin/forms/${id}(\\?|$|#)`))

        return id
      })

      createdFormIds.push(formId)
      journey.created(`نموذج «${formTitle}» (#${formId}) في المدرسة ${schoolId} — يُحذف في نهاية الرحلة`)

      await journey.step('النموذج استقرّ في القاعدة ببنيته وجمهوره', async () => {
        const stored = await phpJson<{
          form: { id: number; title: string; status: string; target_audience: string; school_id: number } | null
          fields: string[]
          assignments: Array<{ scope: string; grade: string | null }>
        }>(
          `(function () use ($__b) {
            $form = \\DB::table('forms')->where('id', $__b['form'])->first();
            return [
              'form' => $form ? [
                'id' => (int) $form->id,
                'title' => $form->title,
                'status' => $form->status,
                'target_audience' => $form->target_audience,
                'school_id' => (int) $form->school_id,
              ] : null,
              'fields' => \\DB::table('form_fields')->where('form_id', $__b['form'])
                ->orderBy('sort_order')->pluck('label')->values(),
              'assignments' => \\DB::table('form_assignments')->where('form_id', $__b['form'])
                ->get(['scope', 'grade'])->values(),
            ];
          })()`,
          { form: formId },
        )

        expect(stored.form, 'الواجهة أعلنت الحفظ ولا صفَّ للنموذج في القاعدة').not.toBeNull()
        expect(stored.form!.title, 'عنوانُ النموذج المحفوظ يخالف ما كُتب').toBe(formTitle)
        expect(
          stored.form!.school_id,
          `النموذج حُفظ في المدرسة ${stored.form!.school_id} بينما المدير في ${schoolId} — تسريبٌ بين المدارس`,
        ).toBe(schoolId)
        expect(stored.form!.status, 'النموذج الجديد يجب أن يُحفظ مسودّةً قبل النشر').toBe('draft')
        expect(stored.form!.target_audience, 'جمهورُ النموذج المحفوظ ليس «جميع الطلاب»').toBe('all_students')

        expect(
          stored.fields,
          `أضفتُ سؤالين فحُفظ ${stored.fields.length}: ${stored.fields.join('، ') || '(لا شيء)'}`,
        ).toEqual([nameLabel, noteLabel])

        // العطلُ الأصليّ كان هنا بعينه: نموذجٌ يُحفظ بلا صفِّ إسنادٍ واحد
        expect(
          stored.assignments.length,
          'النموذج حُفظ بلا صفِّ إسنادٍ واحد — وهذا بالضبط ما يجعله نموذجاً لا يراه أحد',
        ).toBeGreaterThan(0)
        expect(
          stored.assignments.some((item) => item.scope === 'all_students'),
          `إسنادُ النموذج ليس «جميع الطلاب»: ${JSON.stringify(stored.assignments)}`,
        ).toBe(true)
      })

      await journey.confirm(
        formsCount,
        () => countRows('forms', { school_id: schoolId }),
        1,
        'حفظةٌ واحدةٌ من المصمّم يجب أن تُنتج نموذجاً واحداً؛ الزيادةُ بأكثر تعني إرسالاً مكرَّراً للطلب.',
      )

      /* ══ (٢) النشر ══ */

      await journey.step('نشرُ النموذج من قائمة النماذج', async () => {
        await page.goto('/admin/forms', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'النماذج الإلكترونية' }),
          'لم تظهر ترويسة «النماذج الإلكترونية»',
        ).toBeVisible()

        await page.locator('input[type="search"]').first().fill(formTitle)

        const row = page.locator('table.ws-table tbody tr').filter({ hasText: formTitle })
        await expect(row, `بحثتُ عن «${formTitle}» في قائمة النماذج فلم أجد صفّاً واحداً يطابقه`).toHaveCount(1)
        await expect(row, 'النموذج الجديد لا يظهر مسودّةً في القائمة').toContainText('مسودة')

        const response = page.waitForResponse(
          (candidate) =>
            candidate.url().includes(`/admin/forms/${formId}/publish`) &&
            candidate.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await row.getByRole('button', { name: 'نشر' }).click()
        const result = await response

        expect(
          result.status(),
          `الخادم ردّ ${result.status()} على نشر النموذج بدل 200: ${(await result.text()).slice(0, 200)}`,
        ).toBe(200)

        // الصفُّ يفقد شارةَ «مسودة» ويفقد زرَّ النشر: إقرارُ الواجهة بأنّه نُشر
        await expect(
          row.getByRole('button', { name: 'نشر' }),
          'نُشر النموذج على الخادم وما زال زرُّ النشر معروضاً — القائمةُ لا تُحدَّث بعد النشر',
        ).toHaveCount(0)
      })

      await journey.step('القاعدة تقول: منشور', async () => {
        const status = await phpJson<{ status: string | null }>(
          `['status' => \\DB::table('forms')->where('id', $__b['form'])->value('status')]`,
          { form: formId },
        )
        expect(
          status.status,
          `الواجهة أعلنت النشر والقاعدة تقول «${status.status}» — النشرُ لم يصل`,
        ).toBe('published')
      })

      /* ══ (٣) وليُّ الأمر: هل يراه؟ ══ */

      const submissions = await journey.measure('ردودُ هذا النموذج', () =>
        countRows('form_submissions', { form_id: formId }),
      )

      await journey.step('دخولُ بوّابة وليّ الأمر بهويّة ابنه', async () => {
        await page.goto('/guardian/forms', { waitUntil: 'domcontentloaded' })

        const nationalIdInput = page.locator('input[maxlength="10"]')
        await expect(
          nationalIdInput,
          'لم تظهر شاشةُ دخول بوّابة وليّ الأمر — البوّابة لم تُرسم',
        ).toBeVisible()

        await nationalIdInput.fill(studentNationalId)
        await page.locator('input[maxlength="4"]').fill(phoneLast4)
        await page.getByRole('button', { name: 'دخول' }).click()

        await expect(
          page.getByText(student.name).first(),
          `دخلتُ بهويّة «${student.name}» فلم تعرض البوّابةُ اسمَه — الدخولُ لم يكتمل`,
        ).toBeVisible()
        await expect(
          page.getByRole('heading', { name: 'النماذج الإلكترونية' }),
          'دخلتُ البوّابة فلم تُفتح صفحةُ النماذج',
        ).toBeVisible()
      })

      await journey.step(`النموذج «${formTitle}» يظهر لوليّ الأمر`, async () => {
        await expect(
          page.getByText(formTitle).first(),
          `نشرتُ النموذج «${formTitle}» لجميع الطلاب فلم يظهر في بوّابة وليّ أمر «${student.name}» — ` +
            'نموذجٌ يُنشأ ويُنشر ولا يراه أحد، وهو العطلُ الذي وُجدت هذه الرحلة لحراسته',
        ).toBeVisible()
      })

      if (otherGrade) {
        await journey.step(`النموذج الموجَّه إلى «${otherGrade}» **لا** يظهر له`, async () => {
          await expect(
            page.getByText(hiddenTitle),
            `نموذجٌ موجَّهٌ إلى «${otherGrade}» ظهر لوليّ أمر طالبٍ في «${student.grade}» — ` +
              'مرشّحُ الجمهور لا يعمل، وهذا تسريبُ بياناتٍ بين الصفوف',
          ).toHaveCount(0)
        })
      }

      /* ══ (٤) الردّ ══ */

      await journey.step('تعبئةُ النموذج وإرساله', async () => {
        // اختيارُ نموذجنا صراحةً: القائمةُ قد تحمل نماذجَ أخرى منشورةً للجميع
        await page.getByRole('button').filter({ hasText: formTitle }).first().click()

        const nameInput = guardianQuestion(page, nameLabel).locator('input')
        await expect(
          nameInput,
          `فتحتُ النموذج فلم أجد فيه السؤال «${nameLabel}» — الاستمارةُ وصلت وليَّ الأمر بلا أسئلتها`,
        ).toBeVisible()
        await nameInput.fill(nameAnswer)

        const noteInput = guardianQuestion(page, noteLabel).locator('textarea')
        await expect(noteInput, `لم أجد السؤال الثاني «${noteLabel}» في الاستمارة`).toBeVisible()
        await noteInput.fill(noteAnswer)

        const response = page.waitForResponse(
          (candidate) =>
            candidate.url().includes(`/public/forms/${formId}/submit`) &&
            candidate.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await page.getByRole('button', { name: 'إرسال النموذج' }).click()
        const result = await response

        const body = (await result.json()) as { success?: boolean; message?: string }
        expect(
          result.status(),
          `الخادم ردّ ${result.status()} على إرسال الردّ بدل 201: ${body.message ?? (await result.text()).slice(0, 200)}`,
        ).toBe(201)

        // إيصالُ الاستلام يبقى على الشاشة بعد أن يختفي النموذج من القائمة
        await expect(
          page.getByText(`تم استلام ردك على «${formTitle}»`),
          'أُرسل الردّ ولم تُقرّ البوّابةُ باستلامه — وليُّ الأمر لا يدري أوصل ردُّه أم ضاع',
        ).toBeVisible()

        // ولا يقبل النموذج ردّاً ثانياً، فيختفي من قائمة وليّ الأمر
        await expect(
          page.getByRole('button').filter({ hasText: formTitle }),
          'النموذج لا يقبل ردّاً ثانياً ومع ذلك بقي معروضاً في القائمة بعد الإرسال',
        ).toHaveCount(0)
      })

      await journey.step('الردُّ استقرّ في القاعدة بمحتواه ولصاحبه', async () => {
        const stored = await phpJson<{
          submission: { id: number; student_id: number; status: string } | null
          answers: string[]
        }>(
          `(function () use ($__b) {
            $submission = \\DB::table('form_submissions')->where('form_id', $__b['form'])->first();
            return [
              'submission' => $submission ? [
                'id' => (int) $submission->id,
                'student_id' => (int) $submission->student_id,
                'status' => $submission->status,
              ] : null,
              'answers' => $submission
                ? \\DB::table('form_submission_answers')
                    ->where('submission_id', $submission->id)->pluck('value_text')->values()
                : [],
            ];
          })()`,
          { form: formId },
        )

        expect(stored.submission, 'الخادم ردّ بالنجاح ولا صفَّ ردٍّ في القاعدة').not.toBeNull()
        expect(
          stored.submission!.student_id,
          `الردُّ نُسب إلى الطالب ${stored.submission!.student_id} لا إلى «${student.name}» (${student.id})`,
        ).toBe(student.id)

        const answers = stored.answers.map((value) => String(value ?? ''))
        expect(
          answers.some((value) => value.includes(nameAnswer)),
          `كتبتُ «${nameAnswer}» في السؤال الأوّل ولم أجده في الإجابات المحفوظة: ${JSON.stringify(answers)}`,
        ).toBe(true)
        expect(
          answers.some((value) => value.includes(noteAnswer)),
          `كتبتُ «${noteAnswer}» في السؤال الثاني ولم أجده في الإجابات المحفوظة: ${JSON.stringify(answers)}`,
        ).toBe(true)
      })

      await journey.confirm(
        submissions,
        () => countRows('form_submissions', { form_id: formId }),
        1,
        'إرسالٌ واحدٌ يجب أن يُنتج ردّاً واحداً؛ الزيادةُ بأكثر تعني إرسالاً مكرَّراً.',
      )

      /* ══ (٥) الإدارة تقرأ الردّ ══ */

      await journey.step('صفحةُ الردود عند الإدارة تعرض الردَّ بصاحبه', async () => {
        await page.goto(`/admin/forms/${formId}/submissions`, { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByRole('heading', { name: `ردود: ${formTitle}` }),
          'لم تظهر ترويسة صفحة الردود — الصفحةُ لم تُرسم أو قذفت المستخدم',
        ).toBeVisible()

        await expect(
          headerFact(page, 'إجمالي الردود:'),
          'وصل ردٌّ واحدٌ وصفحةُ الردود تعرض عدداً مخالفاً — الردُّ لا يصل إلى الإدارة',
        ).toHaveText('1')
        await expect(
          headerFact(page, 'استجابوا:'),
          'الردُّ لم يُحسب في عدّاد المستجيبين رغم وصوله',
        ).toHaveText('1')

        const row = workspaceBlock(page, 'قائمة الردود').locator('tbody tr')
        await expect(row, 'جدولُ الردود فارغٌ رغم وصول ردّ').toHaveCount(1)
        await expect(
          row,
          `الردُّ في الجدول منسوبٌ إلى غير «${student.name}»`,
        ).toContainText(student.name)
      })

      await journey.step('تفاصيلُ الردّ تعرض ما كتبه وليُّ الأمر حرفاً بحرف', async () => {
        await workspaceBlock(page, 'قائمة الردود').locator('tbody tr').first().click()

        const modal = page.locator('.ws-modal')
        await expect(modal, 'لم ينفتح درجُ تفاصيل الردّ بعد الضغط على الصفّ').toBeVisible()
        await expect(modal, 'درجُ التفاصيل لا يعرض اسم الطالب صاحب الردّ').toContainText(student.name)

        await expect(modal, `عنوانُ السؤال الأوّل «${nameLabel}» غائبٌ عن التفاصيل`).toContainText(nameLabel)
        await expect(
          modal,
          `أجاب وليُّ الأمر «${nameAnswer}» فلم تعرضه صفحةُ الردود — الردُّ يصل ولا يُقرأ`,
        ).toContainText(nameAnswer)
        await expect(modal, `الإجابة الثانية «${noteAnswer}» غائبةٌ عن التفاصيل`).toContainText(noteAnswer)
      })

      /* ══ (٦) الأثر الخارجيّ ══ */

      await journey.step('لم تخرج رسالةُ واتساب واحدة', async () => {
        await journey.confirm(
          whatsapp,
          () => countRows('whatsapp_messages'),
          0,
          'النماذج لا تُطلق إشعاراً ولا رسالة — والقياسُ يُثبت ذلك بدل أن يُدّعى.',
        )
      })
    } finally {
      /* ── التنظيف ──
         حذفُ النموذج يحذف ردودَه ومرفقاتِه معه (`FormController::destroy`).
         ولولاه لتراكمت النماذج المنشورة في بوّابة وليّ الأمر جولةً بعد جولة. */
      if (admin) {
        const failures: string[] = []

        for (const id of createdFormIds) {
          const response = await admin.delete(apiUrl(`admin/forms/${id}`)).catch(() => null)
          if (!response || !response.ok()) {
            failures.push(`النموذج ${id} (${response ? response.status() : 'تعذّر النداء'})`)
          }
        }

        if (failures.length > 0) {
          journey.note(`تعذّر حذفُ بعض ما أنشأته الرحلة: ${failures.join('، ')}. احذفه يدوياً.`)
        } else if (createdFormIds.length > 0) {
          journey.note(`نُظّف: حُذفت ${createdFormIds.length} نماذجَ أنشأتها الرحلة بردودها.`)
        }

        await admin.dispose()
      }

      await api?.dispose()
    }
  })
})
