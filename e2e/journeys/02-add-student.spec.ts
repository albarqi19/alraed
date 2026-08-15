/**
 * الرحلة ٢ — إضافة طالبٍ من صفحة الطلاب، ثم تعديله.
 *
 * ══ ما تُثبته ══
 * أنّ زرّ «إضافة طالب» **يحفظ فعلاً**: يظهر الطالب في الجدول باسمه، ويقرؤه
 * الـAPI بمعرّفه في المدرسة الصحيحة، ويزيد عددُ الطلاب **واحداً لا اثنين**.
 * ثم أنّ التعديل **يثبت**: تتغيّر قيمةُ الحقل في الواجهة وفي القاعدة معاً.
 *
 * ══ لماذا الوجهان معاً ══
 * ثلاثةُ أعطالٍ مختلفةٍ تبدو متشابهةً من وجهٍ واحد:
 *   · حُفظ ولم يظهر في الجدول   ← إبطالُ الذاكرة معطوب. الـAPI وحده لا يراه.
 *   · ظهر في الجدول ولم يُحفظ   ← تفاؤلٌ في الواجهة. الواجهة وحدها لا تراه.
 *   · حُفظ مرّتين                ← ضغطةٌ مكرَّرة. كلا الوجهين يقول «موجود»،
 *                                  ولا يكشفه إلا قياسُ الفرق: +٢ لا +١.
 * فالتحقّق هنا من الواجهة والـAPI معاً، وبقياس فرقٍ لا بوجودٍ مجرَّد.
 *
 * ══ لا حذف ══
 * الحذف رحلةٌ أخرى. وحذفُ ما أنشأناه هنا يخفي عن المالك أثرَ الرحلة، ويجعل
 * فشلَ الحذف يُقرأ فشلاً في الإضافة. فما نُنشئه يبقى — باسمٍ مميَّزٍ يُعرف.
 */

import { test, expect } from './_support/journey'
import { apiAs, sessionFile, type ApiBridge } from './_support/api-bridge'
import { countRows, firstRow } from './_support/php-bridge'
import { expectRowCount, readDisplayedNumber, rowCount } from './_support/measure'
import {
  uniqueNationalId,
  uniqueParentName,
  uniquePhone,
  uniqueStudentName,
} from './_support/unique'

/** حدُّ الترقيم الافتراضيّ في صفحة الطلاب (`PAGE_SIZE_OPTIONS[1]`) */
const PAGE_SIZE = 50

test.describe('الرحلة ٢ — إضافة طالب', () => {
  test.use({ storageState: sessionFile('admin') })

  test('المديرُ يضيف طالباً فيظهر في القائمة ويثبت في القاعدة، ثمّ يعدّله فيثبت التعديل', async ({
    page,
    journey,
  }) => {
    journey.about({
      role: 'الإدارة (admin)',
      purpose:
        'يُثبت أنّ إضافة طالبٍ من الواجهة تُنشئ صفّاً واحداً في مدرسة المدير نفسِها، ' +
        'ويظهر في الجدول، ويقرؤه الـAPI — وأنّ تعديل حقلٍ واحدٍ يثبت في الوجهين.',
    })

    /* ── بيانات هذه الجولة وحدها ── */
    const studentName = uniqueStudentName()
    const nationalId = uniqueNationalId()
    const parentName = uniqueParentName()
    const parentPhone = uniquePhone()
    const grade = 'الصف الأول'
    const className = '1/أ'

    let api: ApiBridge | null = null

    try {
      api = await apiAs('admin')
      const bridge = api

      /* ── مَن نحن، وأيّ مدرسةٍ نكتب فيها؟ ──
         بلا هذا السؤال يصير التحقّق «الطالب موجودٌ في مكانٍ ما» — وهو تحقّقٌ
         يمرّ حتى لو تسرّب الطالب إلى مدرسةٍ أخرى، وهو أخطر عطلٍ في نظامٍ
         متعدّد المدارس. */
      const me = await journey.step('التعرّف على حساب المدير ومدرسته', async () => {
        const payload = await bridge.get<{ user: { id: number; school_id: number; name: string; role: string } }>(
          'auth/me',
        )
        const user = payload.user
        expect(user?.school_id, 'حسابُ المدير بلا مدرسة — كلُّ ما بعده لا معنى له').toBeTruthy()
        return user
      })

      const schoolId = me.school_id
      journey.note(`المدرسة المستهدَفة: ${schoolId} · الحساب: ${me.name}`)

      /* ── القياسات قبل الفعل ──
         ثلاثةُ عدّادات: الـAPI (ما يراه هذا الدور)، والقاعدة (ما استقرّ فعلاً
         في هذه المدرسة)، والواجهة (ما يراه المستخدم). فرقُ أيٍّ منها عن الآخرين
         بعد الفعل عطلٌ بذاته. */
      const apiCount = await journey.measure('عدد الطلاب في الـAPI', async () => (await bridge.students()).length)
      const dbCount = await journey.measure('عدد صفوف الطلاب في القاعدة (لهذه المدرسة)', () =>
        countRows('students', { school_id: schoolId }),
      )

      /* ── الواجهة ── */
      await journey.step('فتح صفحة الطلاب', async () => {
        await page.goto('/admin/students', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'إدارة الطلاب' }),
          'لم تظهر ترويسة «إدارة الطلاب» — الصفحة لم تُرسم أو قذفت المستخدم',
        ).toBeVisible()
        // الجدول يُملأ بعد جلبٍ من الخادم؛ ننتظر ظهور صفٍّ واحدٍ على الأقلّ
        await expect(
          page.locator('table.ws-table tbody tr').first(),
          'جدول الطلاب لم يعرض صفّاً واحداً رغم أنّ البذرة فيها طلاب',
        ).toBeVisible()
      })

      const table = page.locator('table.ws-table')
      const totalFact = page.locator('.ws-fact').filter({ hasText: 'إجمالي الطلاب:' }).locator('b')

      const uiCount = await journey.measure('العدد المعروض في الترويسة', () => readDisplayedNumber(totalFact))
      const rowsBefore = await rowCount(table)

      await journey.step(`إضافة الطالب «${studentName}» من النموذج`, async () => {
        await page.getByRole('button', { name: 'إضافة طالب', exact: true }).click()

        const dialog = page.getByRole('dialog')
        await expect(dialog, 'لم ينفتح حوارُ إضافة الطالب بعد ضغط الزرّ').toBeVisible()
        await expect(dialog.getByText('إضافة طالب جديد')).toBeVisible()

        await dialog.locator('#student-name').fill(studentName)
        await dialog.locator('#student-national-id').fill(nationalId)
        await dialog.locator('#student-grade').fill(grade)
        await dialog.locator('#student-class-name').fill(className)
        await dialog.locator('#student-parent-name').fill(parentName)
        await dialog.locator('#student-parent-phone').fill(parentPhone)

        // نلتقط استجابة الخادم لا مجرّد اختفاء الحوار: حوارٌ يُغلق ليس دليلاً
        // على حفظ — وقد يُغلق على خطأٍ ابتُلع.
        const saved = page.waitForResponse(
          (response) =>
            response.url().includes('/admin/students') &&
            response.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await dialog.getByRole('button', { name: 'إضافة الطالب' }).click()
        const response = await saved

        expect(
          response.status(),
          `الخادم ردّ ${response.status()} على حفظ الطالب بدل 201. الردّ: ${(await response.text()).slice(0, 300)}`,
        ).toBe(201)

        await expect(
          page.getByRole('dialog'),
          'الخادم حفظ الطالب لكنّ الحوار بقي مفتوحاً — الواجهة لا تقرأ نجاح الحفظ',
        ).toBeHidden()
      })

      journey.created(`طالب «${studentName}» بالهويّة ${nationalId} في المدرسة ${schoolId}`)

      /* ── التحقّق الأوّل: الواجهة ── */
      await journey.step('الطالب يظهر في الجدول باسمه', async () => {
        /* الجدول مُرقَّمٌ بخمسين صفّاً في الصفحة. فحين تكون الصفحة ممتلئةً لا
           يزيد عددُ صفوفها بإضافةٍ جديدة — والتأكيد على «+١» حينئذٍ يفشل على
           سلوكٍ صحيح. فنقيس الصفوف ما دامت الصفحة غير ممتلئة، ونكتفي بعدّاد
           الترويسة والـAPI فيما بعد ذلك. */
        if (rowsBefore < PAGE_SIZE) {
          await expectRowCount(
            table,
            rowsBefore,
            1,
            `أضفنا طالباً واحداً «${studentName}» فيجب أن يزيد الجدول صفّاً واحداً — ` +
              'زيادةُ أكثر تعني حفظاً مكرَّراً، وعدمُ الزيادة تعني أنّ القائمة لم تُحدَّث بعد الحفظ.',
          )
        } else {
          journey.note(
            `صفحةُ الجدول ممتلئةٌ (${rowsBefore} صفّاً = حدُّ الترقيم)، فلم يُقس فرقُ الصفوف — ` +
              'العدّ اعتُمد على الترويسة والـAPI. نظّف طلاب الجولات السابقة إن أردت استعادة هذا القياس.',
          )
        }

        // البحث بالاسم: يُثبت أنّ الصفَّ الجديد هو صفُّنا لا صفٌّ آخرُ صادف الظهور
        await page.locator('#students-search').fill(studentName)
        const matching = table.locator('tbody tr')
        await expect(
          matching,
          `بحثتُ عن «${studentName}» في قائمة الطلاب فلم أجد صفّاً واحداً يطابقه`,
        ).toHaveCount(1)

        const row = matching.first()
        await expect(row, 'الصفّ ظهر لكنّ اسم الطالب ليس ما أدخلناه').toContainText(studentName)
        await expect(row, 'رقم الهوية في الصفّ ليس ما أدخلناه').toContainText(nationalId)
        await expect(row, 'اسم وليّ الأمر في الصفّ ليس ما أدخلناه').toContainText(parentName)
        await expect(row, 'الشعبة في الصفّ ليست ما أدخلناه').toContainText(className)
      })

      /* ── التحقّق الثاني: الـAPI والقاعدة ──
         هنا يُكشف «حُفظ في الواجهة ولم يُحفظ في الخادم»، و«حُفظ لكن في مدرسةٍ
         أخرى». */
      const savedStudent = await journey.step('الـAPI يقرأ الطالب بمعرّفه ومدرسته الصحيحة', async () => {
        const student = await bridge.studentByNationalId(nationalId)
        expect(
          student,
          `الواجهة أظهرت الطالب «${studentName}» لكنّ الـAPI لا يراه بهويّته ${nationalId} — لم يُحفظ حقّاً`,
        ).not.toBeNull()

        const found = student!
        expect(found.name, 'الاسم المحفوظ يخالف ما أُدخل').toBe(studentName)
        expect(
          Number(found.school_id),
          `الطالب حُفظ في المدرسة ${found.school_id} بينما المدير في المدرسة ${schoolId} — تسريبٌ بين المدارس`,
        ).toBe(schoolId)
        expect(found.parent_name, 'اسم وليّ الأمر المحفوظ يخالف ما أُدخل').toBe(parentName)
        expect(String(found.parent_phone), 'جوّال وليّ الأمر المحفوظ يخالف ما أُدخل').toBe(parentPhone)
        expect(found.id, 'الطالب محفوظٌ بلا معرّف').toBeTruthy()
        return found
      })

      /* ── التحقّق الثالث: الفرق واحدٌ لا أكثر ── */
      await journey.step('العدد زاد واحداً بالضبط — في الـAPI والقاعدة والواجهة', async () => {
        await journey.confirm(
          apiCount,
          async () => (await bridge.students()).length,
          1,
          'فعلٌ واحد يجب أن يُنتج صفّاً واحداً؛ الزيادة بأكثر تعني إرسالاً مكرَّراً للطلب.',
        )
        await journey.confirm(
          dbCount,
          () => countRows('students', { school_id: schoolId }),
          1,
          'صفوفُ المدرسة في القاعدة يجب أن تزيد بالمقدار نفسه — الفارق يعني كتابةً في مدرسةٍ أخرى.',
        )

        // الترويسة تقرأ من القائمة نفسها، فاختلافُها عن الـAPI يعني عرضاً بائتاً
        await page.locator('#students-search').fill('')
        await journey.confirm(
          uiCount,
          () => readDisplayedNumber(totalFact),
          1,
          'العدد المعروض للمستخدم يجب أن يتبع القائمة؛ بقاؤه كما كان يعني ترويسةً لا تُحدَّث.',
        )
      })

      /* ── التعديل ── */
      const newParentName = uniqueParentName()

      await journey.step(`تعديل اسم وليّ الأمر إلى «${newParentName}»`, async () => {
        await page.locator('#students-search').fill(studentName)
        const row = table.locator('tbody tr').first()
        await expect(row, 'لم أجد صفَّ الطالب لتعديله').toContainText(studentName)

        await row.getByRole('button', { name: 'تعديل' }).click()

        const dialog = page.getByRole('dialog')
        await expect(dialog, 'لم ينفتح حوار التعديل').toBeVisible()
        await expect(
          dialog.locator('#student-name'),
          'حوارُ التعديل فُتح فارغاً أو ببيانات طالبٍ آخر',
        ).toHaveValue(studentName)

        await dialog.locator('#student-parent-name').fill(newParentName)

        const updated = page.waitForResponse(
          (response) =>
            response.url().includes(`/admin/students/${savedStudent.id}`) &&
            response.request().method() === 'PUT',
          { timeout: 30_000 },
        )
        await dialog.getByRole('button', { name: 'حفظ التعديلات' }).click()
        const response = await updated

        expect(
          response.status(),
          `الخادم ردّ ${response.status()} على تعديل الطالب بدل 200. الردّ: ${(await response.text()).slice(0, 300)}`,
        ).toBe(200)
        await expect(page.getByRole('dialog'), 'حوار التعديل بقي مفتوحاً بعد الحفظ').toBeHidden()
      })

      await journey.step('التعديل ثبت — في الجدول وفي القاعدة', async () => {
        const row = table.locator('tbody tr').first()
        await expect(
          row,
          `عدّلتُ اسم وليّ الأمر إلى «${newParentName}» فلم يتغيّر في الجدول بعد الحفظ`,
        ).toContainText(newParentName)
        await expect(row, 'الاسم القديم لوليّ الأمر ما زال معروضاً بعد التعديل').not.toContainText(parentName)

        const stored = await firstRow<{ parent_name: string; name: string }>('students', { id: savedStudent.id })
        expect(stored, 'الطالب اختفى من القاعدة بعد التعديل').not.toBeNull()
        expect(
          stored!.parent_name,
          `القاعدة ما زالت تحمل «${stored?.parent_name}» بينما الواجهة تعرض «${newParentName}» — الحفظ لم يصل`,
        ).toBe(newParentName)
        expect(stored!.name, 'التعديل غيّر اسم الطالب وهو لم يُمسّ').toBe(studentName)
      })

      await journey.step('لم يتضاعف الطالب بعد التعديل', async () => {
        const all = await bridge.students()
        const sameId = all.filter((student) => String(student.national_id) === nationalId)
        expect(
          sameId.length,
          `وجدتُ ${sameId.length} طالباً بالهويّة ${nationalId} — التعديل أنشأ صفّاً جديداً بدل أن يحدّث القائم`,
        ).toBe(1)
      })
    } finally {
      await api?.dispose()
    }
  })
})
