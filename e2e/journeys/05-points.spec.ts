/**
 * الرحلة ٥ — رصدُ النقاط: منحٌ يزيد الرصيد، وتراجعٌ يُرجعه.
 *
 * ══ ما تُثبته ══
 * أنّ منح طالبٍ نقاطاً من صفحة «برنامج نقاطي» يفعل أربعةَ أشياءَ معاً، لا واحداً:
 *   ١) يُنشئ حركةً واحدةً في سجلّ المعاملات بسببها الصحيح وقيمتها الصحيحة،
 *   ٢) ويزيد **رصيد الطالب** بالمقدار المعلن بالضبط (لا «أكثر من صفر»)،
 *   ٣) وتعكسه لوحةُ الصدارة التي يراها المدير في العمود نفسِه،
 *   ٤) ثمّ إنّ «تراجع» **يُرجع الرصيد** إلى ما كان.
 *
 * ══ لماذا الأربعة معاً ══
 * لأنّ لكلٍّ منها عطلاً يخصّه، ويبدو النظام سليماً إن فُحص واحدٌ وحده:
 *   · حركةٌ تُسجَّل والرصيد لا يتحرّك   ← الدفترُ يكتب والمجاميعُ لا تُحدَّث.
 *   · الرصيد يتحرّك ولوحةُ الصدارة لا   ← عرضٌ بائتٌ لا يُبطَل بعد الكتابة.
 *   · تراجعٌ يعلّم الحركة «ملغاة» ولا يعيد النقاط ← وهذا **أسوأ من غياب
 *     التراجع أصلاً**: المدير يظنّ أنّه صحّح خطأً وهو لم يصحّح شيئاً، والطالب
 *     يحمل نقاطاً لا سببَ لها في دفترٍ يقول إنّه لا سبب.
 *
 * ══ لماذا الوجهان (الواجهة والقاعدة) ══
 * الرصيد رقمٌ مشتقّ (`student_point_totals`) لا مجموعٌ يُحسب عند العرض. فقد
 * تُكتب الحركةُ ولا يُحدَّث المشتقّ — ولا تكشف ذلك واجهةٌ تقرأ المشتقَّ وحده،
 * ولا قراءةٌ من جدول الحركات وحده. فنقرأ الاثنين ونطابق.
 *
 * ══ الأثر الخارجيّ ══
 * منحُ النقاط لا يُطلق شيئاً: `PointLedgerService` يكتب في معاملةٍ واحدةٍ بلا
 * `dispatch`، ولا مراقبَ على `PointTransaction`. فلا `expectQueued` هنا —
 * وأيُّ مهمّةٍ تصطفّ رغم ذلك تُسقط الرحلة، وهو المقصود.
 *
 * ══ ما تتركه ══
 * حركةً واحدةً **ملغاةً** (وسمُها في الملاحظات «رحلة النقاط …»)، ورصيداً عاد
 * إلى ما كان. فالجولة لا تُزحزح مجاميع أيّ طالب.
 */

import { test, expect } from './_support/journey'
import { apiAs, sessionFile, type ApiBridge } from './_support/api-bridge'
import { firstRow, phpJson } from './_support/php-bridge'
import { readDisplayedNumber } from './_support/measure'
import { uniqueSuffix } from './_support/unique'

/** حدُّ الترقيم في «سجل العمليات» (`DEFAULT_TRANSACTION_FILTERS.per_page`) */
const TRANSACTIONS_PAGE_SIZE = 10

interface NamedRow {
  id: number
  name: string
}

interface ReasonRow {
  id: number
  title: string
  value: number
}

interface LeaderboardEntry {
  student_id: number
  total_points: number
}

interface TransactionRow {
  id: number
  student_id: number
  amount: number
  type: string
}

/** رصيدُ الطالب كما استقرّ في القاعدة — صفرٌ إن لم يُنشأ له صفُّ مجاميعَ بعد */
async function readBalance(studentId: number): Promise<number> {
  const result = await phpJson<{ n: number }>(
    `['n' => (int) (\\DB::table('student_point_totals')->where('student_id', $__b['id'])->value('total_points') ?? 0)]`,
    { id: studentId },
  )
  return result.n
}

/** عددُ حركات النقاط لطالبٍ في القاعدة */
async function countLedger(studentId: number): Promise<number> {
  const result = await phpJson<{ n: number }>(
    `['n' => \\DB::table('point_transactions')->where('student_id', $__b['id'])->count()]`,
    { id: studentId },
  )
  return result.n
}

/**
 * يقرأ رقماً من الواجهة **بعد أن يستقرّ** على المتوقَّع، أو يُرجع آخرَ ما قرأ.
 *
 * ولماذا لا نقرأ مرّةً واحدة؟ لأن الواجهة تُبطل ذاكرتها بعد الكتابة ثمّ تُعيد
 * الجلب، والقراءةُ في اللحظة نفسِها تقع على الرقم القديم فتُعلن عطلاً لا وجود له.
 * وهذا انتظارٌ **بالشرط لا بالثواني**: يخرج فور بلوغ القيمة، ولو لم تبلغ أرجع
 * ما رآه فعلاً كي تكون رسالةُ الفشل «كان س فصار س» لا «انتهت المهلة».
 */
async function readSettled(read: () => Promise<number>, expected: number, timeoutMs = 15_000): Promise<number> {
  const deadline = Date.now() + timeoutMs
  let value = await read()
  while (value !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    value = await read()
  }
  return value
}

test.describe('الرحلة ٥ — رصد نقاط', () => {
  test.use({ storageState: sessionFile('admin') })

  test('المديرُ يمنح طالباً نقاطاً فيزيد رصيده بالمقدار الصحيح، ثمّ يتراجع فيعود الرصيد', async ({
    page,
    journey,
  }) => {
    journey.about({
      role: 'الإدارة (admin)',
      purpose:
        'يُثبت أنّ منح النقاط يُنشئ حركةً واحدةً بسببها الصحيح، ويزيد رصيد الطالب بالمقدار المعلن، ' +
        'وتعكسه لوحةُ الصدارة — وأنّ التراجع يُرجع الرصيد إلى ما كان.',
    })

    /** وسمُ هذه الجولة: يُكتب في ملاحظات الحركة فنجدها في القاعدة بلا لبس */
    const runTag = `رحلة النقاط ${uniqueSuffix()}`

    let api: ApiBridge | null = null

    try {
      api = await apiAs('admin')
      const bridge = api

      /* ── مَن نحن، وأيّ مدرسةٍ نكتب فيها؟ ── */
      const me = await journey.step('التعرّف على حساب المدير ومدرسته', async () => {
        const payload = await bridge.get<{ user: { id: number; school_id: number; name: string } }>('auth/me')
        expect(payload.user?.school_id, 'حسابُ المدير بلا مدرسة — كلُّ ما بعده لا معنى له').toBeTruthy()
        return payload.user
      })
      const schoolId = me.school_id

      /* ── اختيارُ الهدف من القاعدة لا من رقمٍ مثبَّت ──
         نأخذ **متصدّر لوحة الشرف الحاليّ**: هو الطالب الوحيد المضمونُ ظهورُه في
         العمود الجانبيّ (اللوحة تعرض العشرة الأوائل)، فلا ينكسر التحقّق حين
         تكبر القاعدة بجولاتٍ سابقة. ولو لم تكن في المدرسة نقاطٌ بعد، فأوّلُ
         طالبٍ فيها — وهو حينئذٍ متصدّرٌ بمجرّد أن يُمنح. */
      const picked = await journey.step('اختيار الطالب والسبب من بيانات المدرسة', async () => {
        const found = await phpJson<{
          leader: NamedRow | null
          fallback: NamedRow | null
          reason: ReasonRow | null
        }>(
          `[
            'leader' => \\DB::table('student_point_totals as t')
              ->join('students as s', 's.id', '=', 't.student_id')
              ->where('s.school_id', $__b['school'])
              ->orderByDesc('t.total_points')
              ->select('s.id', 's.name')
              ->first(),
            'fallback' => \\DB::table('students')
              ->where('school_id', $__b['school'])
              ->orderBy('id')
              ->select('id', 'name')
              ->first(),
            'reason' => \\DB::table('point_reasons')
              ->where('school_id', $__b['school'])
              ->where('type', 'reward')
              ->where('is_active', 1)
              ->orderBy('display_order')
              ->select('id', 'title', 'value')
              ->first(),
          ]`,
          { school: schoolId },
        )

        const student = found.leader ?? found.fallback
        expect(student, `لا طالبَ واحدٌ في المدرسة ${schoolId} — البذرة لم تعمل`).not.toBeNull()
        return { student: student!, reason: found.reason }
      })

      /* ── تخطٍّ مُعلَن، لا فشلٌ مُقنَّع ──
         بلا سببٍ نشطٍ من نوع «مكافأة» لا يمكن منحُ نقاطٍ من الواجهة أصلاً. وهذه
         حالةُ إعدادٍ ناقصةٍ لا عطلٌ في الميزة، فتُعلن ولا تُلبَس ثوبَ الفشل. */
      if (!picked.reason) {
        const why = `لا سببَ نشطاً من نوع «مكافأة» في المدرسة ${schoolId} — لا يمكن منح نقاطٍ من الواجهة.`
        journey.markSkipped(why)
        test.skip(true, why)
        return
      }

      const student = picked.student
      const reason = picked.reason
      journey.note(
        `الهدف: الطالب «${student.name}» (${student.id}) · السبب «${reason.title}» بقيمة ${reason.value} · المدرسة ${schoolId}`,
      )

      /* ── القياسات قبل الفعل ──
         الرصيدُ من القاعدة، وعددُ الحركات من القاعدة، ولوحةُ الصدارة من الـAPI.
         ثلاثةُ مصادرَ يجب أن تتحرّك معاً بالمقدار نفسِه. */
      const balance = await journey.measure('رصيد الطالب في القاعدة', () => readBalance(student.id))
      const ledger = await journey.measure('عدد حركات الطالب في القاعدة', () => countLedger(student.id))
      const readApiLeaderboard = async () => {
        const rows = await bridge.get<LeaderboardEntry[]>('admin/points/leaderboard', { per_page: 50 })
        return rows.find((row) => Number(row.student_id) === student.id)?.total_points ?? 0
      }
      const apiLeader = await journey.measure('نقاط الطالب في لوحة الصدارة (الـAPI)', readApiLeaderboard)

      /* ── الواجهة ── */
      await journey.step('فتح صفحة برنامج نقاطي', async () => {
        await page.goto('/admin/points-program', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'برنامج نقاطي' }),
          'لم تظهر ترويسة «برنامج نقاطي» — الصفحة لم تُرسم أو قذفت المستخدم',
        ).toBeVisible()
      })

      const board = page.locator('aside.ws-sidecol').filter({ hasText: 'لوحة الشرف' })
      const entryCol = page.locator('aside.ws-sidecol').filter({ hasText: 'تسجيل سريع' })
      const table = page.locator('table.ws-table')

      /** خانةُ نقاط الطالب في لوحة الشرف: أعمقُ عنصرٍ يحمل اسمه، وفيه `b` واحد */
      const boardValue = board.locator('div').filter({ hasText: student.name }).last().locator('b')
      const readBoard = () => readDisplayedNumber(boardValue)

      /* ── ترشيحُ السجلّ باسم الطالب قبل الفعل ──
         بلا ترشيحٍ يكون «+١ في الجدول» كذبةً: الجدول مُرقَّمٌ بعشرة صفوف، وأيُّ
         حركةٍ لطالبٍ آخرَ في المدرسة تدفع صفَّنا خارج الصفحة. ومع الترشيح يصير
         العدُّ عن طالبنا وحده.
         وننتظر **استجابة الترشيح نفسَها** لا مجرّد ظهور صفوف: القياس على جدولٍ
         لم يُعد جلبُه بعد يقع على الصفوف القديمة، فيصير الفرقُ بعد المنح كاذباً. */
      const rowsBefore = await journey.step('ترشيح سجلّ العمليات باسم الطالب', async () => {
        const filtered = page.waitForResponse(
          (response) =>
            response.url().includes('/admin/points/transactions') &&
            response.url().includes('search=') &&
            response.request().method() === 'GET',
          { timeout: 30_000 },
        )
        await page.getByPlaceholder('بحث عن طالب أو سبب').fill(student.name)
        const response = await filtered
        const body = (await response.json()) as { data?: unknown[] }
        const served = Array.isArray(body.data) ? body.data.length : 0

        await expect(
          table.locator('tbody tr'),
          `الخادم ردّ بـ${served} حركةً للطالب «${student.name}» والجدول يعرض عدداً آخر — ` +
            'الواجهة لا تعرض ما استلمت.',
        ).toHaveCount(served)

        return served
      })

      const uiBoard = await journey.measure('نقاط الطالب في لوحة الشرف (الواجهة)', async () => {
        await expect(
          boardValue,
          'لم أجد خانةَ نقاطٍ واحدةً للطالب في لوحة الشرف — تغيّر بناءُ اللوحة أو غاب الطالب عنها',
        ).toHaveCount(1)
        return readBoard()
      })

      /* ── الفعل: منحُ النقاط من نموذج «تسجيل سريع» ── */
      const created = await journey.step(
        `منحُ «${student.name}» ${reason.value} نقاطاً بسبب «${reason.title}»`,
        async () => {
          await entryCol.getByPlaceholder('ابحث عن الطالب بالاسم أو الصف...').fill(student.name)

          const suggestion = entryCol.locator('button').filter({ hasText: student.name }).first()
          await expect(
            suggestion,
            `بحثتُ عن «${student.name}» في نموذج التسجيل فلم تقترح الواجهةُ اسمَه`,
          ).toBeVisible()
          await suggestion.click()

          // بعد الاختيار تُستبدل خانةُ البحث ببطاقة الطالب المختار
          await expect(entryCol, 'اخترتُ الطالب فلم تعرض الواجهةُ اسمَه في بطاقة الاختيار').toContainText(student.name)

          // السبب يضبط النوع والقيمة معاً — وهذا جزءٌ ممّا نتحقّق منه
          await entryCol.locator('button.ws-choice').filter({ hasText: reason.title }).first().click()
          await expect(
            entryCol.locator('input[type="number"]'),
            `اخترتُ السبب «${reason.title}» (${reason.value}) فلم تضبط الواجهةُ القيمة عليه`,
          ).toHaveValue(String(reason.value))

          await entryCol.locator('textarea').fill(runTag)

          // لا نكتفي بأنّ النموذج فُرّغ: نلتقط استجابة الخادم ونؤكّد رمزَها
          const saved = page.waitForResponse(
            (response) =>
              response.url().includes('/admin/points/transactions/manual') &&
              response.request().method() === 'POST',
            { timeout: 30_000 },
          )
          await entryCol.getByRole('button', { name: 'تسجيل العملية' }).click()
          const response = await saved

          expect(
            response.status(),
            `الخادم ردّ ${response.status()} على تسجيل الحركة بدل 201. الردّ: ${(await response.text()).slice(0, 300)}`,
          ).toBe(201)

          const body = (await response.json()) as { data?: TransactionRow }
          const transaction = body.data
          expect(transaction?.id, 'الخادم ردّ بنجاحٍ بلا حركةٍ في جسم الاستجابة').toBeTruthy()
          expect(
            Number(transaction!.student_id),
            `الحركة سُجّلت للطالب ${transaction!.student_id} بينما اخترنا ${student.id} (${student.name}) — ` +
              'اختير طالبٌ آخرُ من الاقتراحات، أو ذهب الحفظ إلى غير هدفه',
          ).toBe(student.id)
          expect(Number(transaction!.amount), 'قيمة الحركة المحفوظة تخالف قيمة السبب').toBe(reason.value)
          expect(transaction!.type, 'نوع الحركة المحفوظة ليس «مكافأة»').toBe('reward')

          return transaction!
        },
      )

      journey.created(
        `حركةُ نقاطٍ (${created.id}) للطالب «${student.name}» بقيمة ${reason.value}، ملاحظتها «${runTag}» — ` +
          'تُلغى في آخر الرحلة فلا يبقى أثرٌ على الرصيد',
      )

      /* ── التحقّق الأوّل: القاعدة ──
         هنا يُكشف «الواجهة قالت تمّ ولم يُكتب شيء»، و«كُتب في مدرسةٍ أخرى». */
      await journey.step('الحركة استقرّت في القاعدة بسببها وقيمتها ومدرستها', async () => {
        const stored = await firstRow<{
          id: number
          school_id: number
          student_id: number
          reason_id: number
          amount: number
          type: string
          source: string
          undone_at: string | null
        }>('point_transactions', { notes: runTag })

        expect(
          stored,
          `لم أجد في القاعدة حركةً بملاحظة «${runTag}» — الواجهة عرضت نجاحاً ولم يُكتب شيء`,
        ).not.toBeNull()
        expect(Number(stored!.id), 'معرّف الحركة في القاعدة يخالف ما ردّه الخادم').toBe(Number(created.id))
        expect(
          Number(stored!.school_id),
          `الحركة كُتبت في المدرسة ${stored!.school_id} بينما المدير في المدرسة ${schoolId} — تسريبٌ بين المدارس`,
        ).toBe(schoolId)
        expect(Number(stored!.student_id), 'الحركة كُتبت لطالبٍ غير الذي اخترناه').toBe(student.id)
        expect(Number(stored!.reason_id), `السبب المحفوظ ليس «${reason.title}»`).toBe(reason.id)
        expect(Number(stored!.amount), 'القيمة المحفوظة تخالف قيمة السبب').toBe(reason.value)
        expect(stored!.source, 'مصدر الحركة ليس «admin» رغم أنّها سُجّلت من صفحة الإدارة').toBe('admin')
        expect(stored!.undone_at, 'حركةٌ وُلدت ملغاةً — التراجع سبق المنح').toBeNull()
      })

      /* ── التحقّق الثاني: الرصيد زاد بالمقدار الصحيح ──
         «صار أكبر من صفر» لا يقول شيئاً؛ «كان س فصار س+٥» يقول كلَّ شيء. */
      await journey.step(`رصيد الطالب زاد ${reason.value} بالضبط — في القاعدة والـAPI والواجهة`, async () => {
        await journey.confirm(
          balance,
          () => readBalance(student.id),
          reason.value,
          `منحنا ${reason.value} نقاطاً مرّةً واحدة؛ زيادةٌ أكبر تعني حفظاً مكرَّراً، وبقاءُ الرصيد يعني ` +
            'أنّ الحركة كُتبت في الدفتر ولم تُحدَّث المجاميع المشتقّة.',
        )
        await journey.confirm(ledger, () => countLedger(student.id), 1, 'فعلٌ واحد يجب أن يُنتج حركةً واحدة لا حركتين.')
        await journey.confirm(
          apiLeader,
          readApiLeaderboard,
          reason.value,
          'لوحةُ الصدارة تقرأ المجاميع نفسَها — فاختلافُها عن القاعدة يعني استعلاماً يرى غيرَ ما كُتب.',
        )
        await journey.confirm(
          uiBoard,
          () => readSettled(readBoard, uiBoard.before + reason.value),
          reason.value,
          'الرقم الذي يراه المدير في لوحة الشرف يجب أن يتبع الرصيد؛ بقاؤه كما كان يعني عرضاً بائتاً لا يُبطَل بعد الكتابة.',
        )
      })

      /* ── التحقّق الثالث: الحركة ظهرت في السجلّ بسببها الصحيح ── */
      const newestRow = table.locator('tbody tr').first()
      await journey.step('الحركة ظهرت في سجلّ العمليات بسببها ونوعها وقيمتها', async () => {
        if (rowsBefore < TRANSACTIONS_PAGE_SIZE) {
          await expect(
            table.locator('tbody tr'),
            `كانت للطالب ${rowsBefore} حركةً فيجب أن تصير ${rowsBefore + 1} بعد منحٍ واحد — ` +
              'زيادةُ أكثر تعني تسجيلاً مكرَّراً، وعدمُ الزيادة تعني سجلّاً لا يُحدَّث بعد الحفظ.',
          ).toHaveCount(rowsBefore + 1)
        } else {
          journey.note(
            `صفحةُ السجلّ ممتلئةٌ (${rowsBefore} صفّاً = حدُّ الترقيم)، فلم يُقس فرقُ الصفوف — ` +
              'التحقّق اعتُمد على القاعدة والـAPI ومحتوى الصفّ الأحدث.',
          )
        }

        await expect(newestRow, 'الصفّ الأحدث في السجلّ ليس لطالبنا').toContainText(student.name)
        await expect(newestRow, `الصفّ الأحدث لا يحمل السبب «${reason.title}»`).toContainText(reason.title)
        await expect(newestRow, 'الصفّ الأحدث لا يعرض الحركة مكافأةً').toContainText('مكافأة')
        await expect(
          newestRow,
          `الصفّ الأحدث لا يعرض القيمة +${reason.value} — الجدول يعرض رقماً غير المحفوظ`,
        ).toContainText(`+${reason.value}`)
        await expect(
          newestRow,
          'الصفّ الأحدث لا يعرض المصدر «يدوي» رغم أنّ الحركة سُجّلت من صفحة الإدارة',
        ).toContainText('يدوي')
        await expect(newestRow, 'الحركة ظهرت ملغاةً قبل أن نتراجع عنها').not.toContainText('ملغاة')
      })

      /* ══ التراجع ══
         قياسٌ جديدٌ من نقطة ما بعد المنح: نريد أن نقول «كان س+٥ فعاد س». */
      const afterGrant = await journey.measure('رصيد الطالب بعد المنح (نقطةُ قياس التراجع)', () =>
        readBalance(student.id),
      )

      await journey.step('الضغط على «تراجع» في صفّ الحركة', async () => {
        const undone = page.waitForResponse(
          (response) =>
            response.url().includes(`/admin/points/transactions/${created.id}/undo`) &&
            response.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await newestRow.getByRole('button', { name: /تراجع/ }).click()
        const response = await undone

        expect(
          response.status(),
          `الخادم ردّ ${response.status()} على التراجع بدل 200. الردّ: ${(await response.text()).slice(0, 300)}`,
        ).toBe(200)
      })

      await journey.step('التراجع أرجع الرصيد إلى ما كان — لا مجرّد وسمٍ بالإلغاء', async () => {
        await journey.confirm(
          afterGrant,
          () => readBalance(student.id),
          -reason.value,
          'تراجعٌ لا يُرجع الرصيد أسوأ من غياب التراجع: الدفتر يقول «ملغاة» والطالب يحمل النقاط.',
        )

        const back = await readBalance(student.id)
        expect(
          back,
          `الرصيد قبل الرحلة كان ${balance.before} وبعد المنح والتراجع صار ${back} — ` +
            'الدورةُ الكاملة يجب ألّا تترك أثراً على الرصيد.',
        ).toBe(balance.before)

        const stored = await firstRow<{ undone_at: string | null }>('point_transactions', { notes: runTag })
        expect(
          stored?.undone_at,
          'الرصيد عاد لكنّ الحركة ما زالت غير موسومةٍ بالإلغاء في القاعدة — سجلٌّ يخالف المجاميع',
        ).not.toBeNull()
      })

      await journey.step('السجلّ يعرض الحركة ملغاةً ولوحةُ الشرف عادت', async () => {
        await expect(
          newestRow,
          'تراجعنا عن الحركة فلم يعرضها الجدولُ ملغاةً — المدير لا يرى أنّ تصحيحه وقع',
        ).toContainText('ملغاة')

        const settled = await readSettled(readBoard, uiBoard.before)
        expect(
          settled,
          `لوحةُ الشرف تعرض ${settled} بعد التراجع، والمتوقَّع العودة إلى ${uiBoard.before} — ` +
            'الرقم الذي يراه المدير لا يتبع الرصيد بعد الإلغاء.',
        ).toBe(uiBoard.before)
      })
    } finally {
      await api?.dispose()
    }
  })
})
