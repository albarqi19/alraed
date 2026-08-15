/**
 * الرحلة ٦ — تقريرٌ يعكس ما رُصد.
 *
 * ══ لماذا هذه أهمُّ رحلةٍ في الدفعة ══
 * لأنّ التقارير هي حيث تسكن الأعطالُ **الصامتة**. صفحةٌ تُفتح، وجدولٌ يُرسم،
 * وأرقامٌ تظهر — ولا أحد يعرف أنّها ليست الأرقام. لا انهيار، ولا رسالةَ خطأ،
 * ولا شيء يُشتكى منه إلّا بعد أن يُبنى قرارٌ على رقمٍ كاذب.
 * وقد وقع هذا فعلاً هذا الأسبوع: مدىً زمنيٌّ مقلوب جعل التقارير تردّ ٤٢٢ أو
 * صفراً بلا تفسير، فقرأها المستخدم «تعذّر تحميل بيانات الحضور».
 *
 * ══ ما تُثبته ══
 *   ١) أنّ الأرقام المعروضة **تطابق القاعدة** للمدى نفسِه — محسوبةً هنا
 *      بالاستعلام لا مأخوذةً من التقرير نفسِه. ثلاثةُ وجوهٍ تتطابق: القاعدة،
 *      وجسمُ استجابة الخادم، والرقمُ الذي يراه المستخدم في الترويسة.
 *   ٢) أنّ التقرير **يستجيب للمدى**: قلّصنا المدى فنقص المجموع بمقدار ما في
 *      الأيام المحذوفة بالضبط — لا بمقدارٍ آخر، ولا بلا تغيير (وهو ما يقع حين
 *      يُهمَل المدى في الاستعلام فيُقرأ كلُّ شيءٍ دائماً).
 *   ٣) أنّ مدىً فارغاً يُنتج أصفاراً صادقة لا خطأً ولا شاشةً بيضاء.
 *   ٤) أنّ مدىً **مقلوباً** يُقابَل برسالةٍ عربيةٍ مفهومة قبل أن يُرسَل الطلب —
 *      لا ٤٢٢ خاماً، ولا شاشةً بيضاء.
 *   ٥) أنّ زرّ التصدير يُنتج ملفّاً فعلاً (نتحقّق من الاستجابة ولا نفتح الملفّ).
 *
 * ══ لماذا ثلاثُ رحلاتٍ في ملفٍّ واحد ══
 * لأنّ الحكم يجب أن يكون قابلاً للقراءة: عطلٌ في زرّ التصدير كان — لو بقي داخل
 * الرحلة الأمّ — سيوقفها قبل أن تفحص المدى المقلوب أصلاً، فيُقرأ التقرير كأنّ
 * التقارير كلَّها معطّلة. ففُصل ما يمكن أن يسقط وحده: «الاستئذان» رحلةٌ،
 * و«التصدير» رحلةٌ. وكلُّ حمراءَ منها تقول موضعَها بلا فتح الشيفرة.
 *
 * ══ لماذا نحسب المتوقَّع بأنفسنا ══
 * لأنّ «التقرير عرض شيئاً» ليس تحقّقاً. ولو قارنّا التقريرَ بنفسه (مجموعَه
 * بصفوفه) لمرّ عطلُ الاستعلام كلَّه سالماً: استعلامٌ ينسى مدرسةً أو يخلط مدىً
 * يُنتج مجموعاً متّسقاً مع صفوفه تماماً — وكاذباً تماماً.
 *
 * ══ الأثر الخارجيّ ══
 * هذه الرحلة **تقرأ ولا تكتب**: لا صفَّ يُنشأ ولا مهمّةَ تُدرَج. فأيُّ زيادةٍ في
 * الطوابير أو في رسائل الواتساب أثناءها تسريبٌ بذاته، والحلبةُ تُسقطها عليه.
 */

import type { Page, Request } from '@playwright/test'
import { test, expect } from './_support/journey'
import { apiAs, sessionFile, type ApiBridge } from './_support/api-bridge'
import { phpJson } from './_support/php-bridge'
import { readDisplayedNumber } from './_support/measure'

/* ══════════════════════════════════════════════════════════════
   أدواتُ المدى — نظيرةُ ما يفعله الخادم بالضبط
   ══════════════════════════════════════════════════════════════ */

/**
 * أيامُ العمل في مدىً مغلق: كلُّ الأيام عدا الجمعة والسبت.
 *
 * الخادم يبني أعمدة التقرير هكذا (`StudentController::getAttendanceReport`)،
 * فلو حسبنا نحن كلَّ الأيام لاختلف عددُ الأعمدة وظنناه عطلاً وهو اتّفاقُ عملٍ
 * مدرسيّ. والبناء بمكوّنات التاريخ لا بـ`new Date(نصّ)` مقصود: الثانيةُ تُفسَّر
 * بتوقيت غرينتش فتُزحزح اليومَ ليلاً وتقلب حسابَ نهاية الأسبوع.
 */
function workingDays(start: string, end: string): string[] {
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  const cursor = new Date(ys, ms - 1, ds)
  const last = new Date(ye, me - 1, de)
  const days: string[] = []

  while (cursor <= last) {
    const weekday = cursor.getDay() // 0=الأحد … 5=الجمعة، 6=السبت
    if (weekday !== 5 && weekday !== 6) days.push(isoOf(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** يزيح تاريخاً بعددٍ من الأيام ويُرجعه بصيغة YYYY-MM-DD */
function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + days))
}

/**
 * يختار خياراً من قائمةٍ منسدلة **بعد أن يصل الخيار من الخادم**.
 *
 * قوائمُ هذه الصفحة (الصفوف، الشعب، الطلاب) تُملأ بنداءاتٍ مستقلّة، و
 * `selectOption` يفشل بـ«did not find some options» إن سبق الخيارَ. ووقع ذلك
 * فعلاً: نجح التشغيلُ الأوّل وسقط الثاني لأنّ باكاً محلّياً **متسلسلاً** كان
 * يخدم وكلاءَ آخرين في اللحظة نفسِها، فتأخّرت قائمةُ الصفوف عن مهلة الفعل.
 *
 * فننتظر وجودَ الخيار أوّلاً — انتظاراً بالعنصر لا بالثواني — ثمّ نختار.
 * ورسالةُ الفشل حينئذٍ تقول «لم تصل القائمة» لا «تعذّر الاختيار».
 */
async function chooseOption(page: Page, selector: string, value: string, label: string): Promise<void> {
  const select = page.locator(selector)
  await expect(
    select.locator(`option[value=${JSON.stringify(value)}]`),
    `لم يظهر الخيار «${value}» في قائمة ${label} — القائمة لم تصل من الخادم أو لا تحتوي هذه القيمة.`,
  ).toHaveCount(1, { timeout: 30_000 })
  await select.selectOption(value, { timeout: 30_000 })
}

/* ══════════════════════════════════════════════════════════════
   النماذج
   ══════════════════════════════════════════════════════════════ */

/** حقائقُ مدىً واحدٍ كما تقولها القاعدة */
interface RangeFacts {
  present: number
  absent: number
  late: number
  excused: number
  rows: number
  /** أزواجٌ فريدةٌ (طالب، يوم) — إن خالفت `rows` ففي القاعدة تكرار */
  pairs: number
  students: number
}

/** مدىً نسأل القاعدة عنه */
interface RangeSpec {
  key: string
  start: string
  end: string
  grade?: string
  class?: string
  student_id?: number
}

interface ReportEntry {
  date: string
  status: string | null
}

interface ReportStudent {
  id: number
  name: string
  attendance: ReportEntry[]
  total_present: number
  total_absent: number
  total_late: number
}

interface ReportPayload {
  students: ReportStudent[]
  dates: string[]
  period: { start: string; end: string }
}

/** مجاميعُ التقرير كما يقولها الخادم في جسم استجابته */
function sumReport(payload: ReportPayload) {
  return payload.students.reduce(
    (acc, student) => {
      acc.present += Number(student.total_present ?? 0)
      acc.absent += Number(student.total_absent ?? 0)
      acc.late += Number(student.total_late ?? 0)
      acc.excusedCells += (student.attendance ?? []).filter((entry) => entry.status === 'excused').length
      return acc
    },
    { present: 0, absent: 0, late: 0, excusedCells: 0 },
  )
}

/**
 * يسأل القاعدة عن عدّة مدياتٍ في **نداءٍ واحد**.
 *
 * نداءُ tinker يكلّف نحو ثانيةٍ ونصف، والرحلة تحتاج أربعةَ مدياتٍ — فأربعةُ
 * نداءاتٍ تعني ستّ ثوانٍ تضيع، وأسوأ منها: قراءاتٌ متفرّقةٌ قد تقع بينها كتابة.
 *
 * والاستعلام هنا **نظيرُ** ما يفعله الخادم: الحضورُ اليوميّ وحده
 * (`attendance_type = daily`، وهو ما يفرضه `DailyAttendanceScope`)، وأيامُ
 * العمل وحدها (تستثني الجمعة والسبت: DAYOFWEEK ٦ و٧ في MySQL).
 */
async function readRangeFacts(schoolId: number, ranges: RangeSpec[]): Promise<Record<string, RangeFacts>> {
  return phpJson<Record<string, RangeFacts>>(
    `collect($__b['ranges'])->mapWithKeys(function ($r) use ($__b) {
        $base = \\DB::table('attendances as a')
          ->join('students as s', 's.id', '=', 'a.student_id')
          ->where('s.school_id', $__b['school'])
          ->where('a.attendance_type', 'daily')
          ->whereBetween('a.attendance_date', [$r['start'], $r['end']])
          ->whereRaw('DAYOFWEEK(a.attendance_date) not in (6, 7)');

        $roster = \\DB::table('students')->where('school_id', $__b['school']);

        if (!empty($r['grade'])) { $base->where('s.grade', $r['grade']); $roster->where('grade', $r['grade']); }
        if (!empty($r['class'])) { $base->where('s.class_name', $r['class']); $roster->where('class_name', $r['class']); }
        if (!empty($r['student_id'])) { $base->where('s.id', $r['student_id']); $roster->where('id', $r['student_id']); }

        return [$r['key'] => [
          'present' => (clone $base)->where('a.status', 'present')->count(),
          'absent' => (clone $base)->where('a.status', 'absent')->count(),
          'late' => (clone $base)->where('a.status', 'late')->count(),
          'excused' => (clone $base)->where('a.status', 'excused')->count(),
          'rows' => (clone $base)->count(),
          'pairs' => (int) (clone $base)->selectRaw('count(distinct a.student_id, a.attendance_date) as n')->value('n'),
          'students' => $roster->count(),
        ]];
      })`,
    { school: schoolId, ranges },
  )
}

test.describe('الرحلة ٦ — تقارير الحضور', () => {
  test.use({ storageState: sessionFile('admin') })

  test('كشفُ الحضور يطابق القاعدة، ويستجيب للمدى، ويردّ المقلوبَ برسالةٍ مفهومة', async ({ page, journey }) => {
    journey.about({
      role: 'الإدارة (admin)',
      purpose:
        'يُثبت أنّ أرقام كشف الغياب (فصلاً وطالباً) تطابق ما في القاعدة للمدى نفسِه، ' +
        'وأنّ تقليص المدى ينقص المجموع بمقدار الأيام المحذوفة بالضبط، ' +
        'وأنّ المدى الفارغ يُنتج أصفاراً والمقلوب يُقابَل برسالةٍ لا بخطأٍ خام.',
    })

    let api: ApiBridge | null = null

    try {
      api = await apiAs('admin')
      const bridge = api

      const me = await journey.step('التعرّف على حساب المدير ومدرسته', async () => {
        const payload = await bridge.get<{ user: { id: number; school_id: number; name: string } }>('auth/me')
        expect(payload.user?.school_id, 'حسابُ المدير بلا مدرسة — كلُّ ما بعده لا معنى له').toBeTruthy()
        return payload.user
      })
      const schoolId = me.school_id

      /* ── اختيارُ فصلٍ فيه بياناتٌ فعلاً ──
         تقريرٌ عن فصلٍ فارغ يمرّ بأصفارٍ صادقة ولا يُثبت شيئاً. فنسأل القاعدة عن
         الطالب الأكثر سجلّاتِ حضورٍ في الشهر الأخير، ونأخذ فصلَه هدفاً. وبهذا
         لا يُثبَّت في الشيفرة اسمُ صفٍّ ولا رقمُ طالب. */
      const target = await journey.step('اختيار فصلٍ وطالبٍ فيهما سجلّاتُ حضور', async () => {
        const found = await phpJson<{
          student: { id: number; name: string; grade: string; class_name: string; n: number } | null
        }>(
          `['student' => \\DB::table('attendances as a')
              ->join('students as s', 's.id', '=', 'a.student_id')
              ->where('s.school_id', $__b['school'])
              ->where('a.attendance_type', 'daily')
              ->whereBetween('a.attendance_date', [now()->subDays(35)->toDateString(), now()->toDateString()])
              ->whereNotNull('s.grade')
              ->whereNotNull('s.class_name')
              ->groupBy('s.id', 's.name', 's.grade', 's.class_name')
              ->select('s.id', 's.name', 's.grade', 's.class_name', \\DB::raw('count(*) as n'))
              ->orderByDesc('n')
              ->first()]`,
          { school: schoolId },
        )

        expect(
          found.student,
          `لا سجلَّ حضورٍ يوميٍّ واحدٌ في المدرسة ${schoolId} خلال الخمسة والثلاثين يوماً الماضية — ` +
            'البذرة لم تعمل، وأيُّ حكمٍ على التقارير بعد ذلك حكمٌ على الفراغ.',
        ).not.toBeNull()
        return found.student!
      })

      const grade = target.grade
      const className = target.class_name
      journey.note(
        `الهدف: الفصل «${grade} — ${className}» · الطالب «${target.name}» (${target.id}) · المدرسة ${schoolId}`,
      )

      /* ── الواجهة ── */
      await journey.step('فتح صفحة كشف الغياب', async () => {
        await page.goto('/admin/attendance-report', { waitUntil: 'domcontentloaded' })
        await expect(
          page.getByRole('heading', { name: 'كشف الغياب' }),
          'لم تظهر ترويسة «كشف الغياب» — الصفحة لم تُرسم أو قذفت المستخدم',
        ).toBeVisible()
        await expect(
          page.getByText('ابدأ بتحديد نوع الكشف والفترة الزمنية'),
          'الصفحة فُتحت بلا حالة البداية المتوقَّعة — تغيّر بناؤها',
        ).toBeVisible()
      })

      const facts = page.locator('.ws-header__facts .ws-fact')
      const factValue = (label: string) => facts.filter({ hasText: label }).locator('b')
      const matrix = page.locator('table.ws-matrix')

      /**
       * يقرأ حقيقةً من الترويسة **بعد أن تستقرّ** على المتوقَّع، أو يُرجع آخرَ ما قرأ.
       *
       * الجلبُ بعد تغيير المرشِّح غيرُ فوريّ، وبين وصول الاستجابة ورسمِ React
       * لحظةٌ تختفي فيها حقائقُ الترويسة كلُّها (لأن `report` يصير null لمفتاحٍ
       * جديد). فالقراءةُ الواحدة إمّا تقع على أرقام التقرير السابق وإمّا ترتطم
       * بغياب العنصر. وهذا انتظارٌ **بالشرط لا بالثواني**: يخرج فورَ البلوغ،
       * ويُرجع ما رآه فعلاً كي تكون رسالةُ الفشل رقماً لا «انتهت المهلة».
       */
      const readFact = async (label: string, expected: number, timeoutMs = 25_000): Promise<number> => {
        const deadline = Date.now() + timeoutMs
        let value: number | null = null
        for (;;) {
          value = await readDisplayedNumber(factValue(label)).catch(() => null)
          if (value === expected || Date.now() > deadline) break
          await new Promise((resolve) => setTimeout(resolve, 250))
        }
        if (value === null) {
          throw new Error(
            `لم تظهر حقيقةُ «${label}» في ترويسة التقرير خلال ${Math.round(timeoutMs / 1000)} ثانية — ` +
              'الترويسة لا تعرض هذا الرقم أصلاً.',
          )
        }
        return value
      }

      /** يضغط «إنشاء التقرير» ويُرجع جسم استجابة الخادم ومُعاملاتِ الطلب */
      const generate = async (): Promise<{ payload: ReportPayload; params: URLSearchParams }> => {
        const waiting = page.waitForResponse(
          (response) => response.url().includes('/admin/attendance/report') && response.request().method() === 'GET',
          { timeout: 40_000 },
        )
        await page.getByRole('button', { name: 'إنشاء التقرير' }).click()
        const response = await waiting
        expect(
          response.status(),
          `الخادم ردّ ${response.status()} على طلب التقرير بدل 200. الردّ: ${(await response.text()).slice(0, 300)}`,
        ).toBe(200)
        const body = (await response.json()) as { data: ReportPayload }
        return { payload: body.data, params: new URL(response.url()).searchParams }
      }

      /* ══ (١) كشفُ فصلٍ كامل على آخر سبعة أيام ══ */
      const classWeek = await journey.step(`إنشاء كشف الفصل «${grade} — ${className}» على آخر ٧ أيام`, async () => {
        await chooseOption(page, '#ws-rep-grade', grade, 'الصف الدراسي')
        await chooseOption(page, '#ws-rep-class', className, 'الشعبة')
        await page.getByRole('button', { name: 'آخر ٧ أيام' }).click()

        const result = await generate()
        const start = result.params.get('start_date') ?? ''
        const end = result.params.get('end_date') ?? ''
        expect(
          Boolean(start && end),
          'طلبُ التقرير خرج بلا مدىً زمنيّ — الواجهة لا ترسل إلى الخادم ما اختاره المستخدم',
        ).toBe(true)
        return { ...result, start, end }
      })

      const rangeA = { start: classWeek.start, end: classWeek.end }
      /* المديات الأربعة تُسأل عنها القاعدة دفعةً واحدة:
         · A: الفصل على آخر سبعة أيام            (المطابقة الأساسية)
         · B: الفصل على آخر ثلاثة أيام            (قياسُ الاستجابة للمدى)
         · S: الطالب وحده على المدى A             (كشف الطالب)
         · E: الطالب على مدىً بعيدٍ لا بيانات فيه (المدى الفارغ) */
      const rangeB = { start: shiftDate(rangeA.end, -2), end: rangeA.end }
      const rangeEmpty = { start: '2019-09-02', end: '2019-09-05' } // الاثنين ← الخميس: بلا جمعةٍ ولا سبت

      const db = await journey.step('حساب المتوقَّع من القاعدة للمديات الأربعة', () =>
        readRangeFacts(schoolId, [
          { key: 'classA', start: rangeA.start, end: rangeA.end, grade, class: className },
          { key: 'classB', start: rangeB.start, end: rangeB.end, grade, class: className },
          { key: 'studentA', start: rangeA.start, end: rangeA.end, student_id: target.id },
          { key: 'studentEmpty', start: rangeEmpty.start, end: rangeEmpty.end, student_id: target.id },
        ]),
      )

      await journey.step('أرقامُ كشف الفصل تطابق القاعدة — في الخادم وفي الشاشة', async () => {
        const expectedDays = workingDays(rangeA.start, rangeA.end)
        const server = sumReport(classWeek.payload)

        /* شرطُ صحّةِ المقارنة: صفٌّ يوميٌّ واحدٌ لكلّ طالبٍ في اليوم. لو تكرّر
           لعدَّ الخادمُ واحداً وعدَّ استعلامُنا اثنين، فصار الفارق عطلاً موهوماً —
           والتكرارُ نفسُه خللٌ في البيانات يستحقّ أن يُقال. */
        expect(
          db.classA.rows,
          `في القاعدة ${db.classA.rows} سجلَّ حضورٍ يوميّ للفصل في المدى، بينما الأزواج الفريدة ` +
            `(طالب، يوم) ${db.classA.pairs} فقط — أي أنّ لطالبٍ سجلَّين في اليوم نفسِه.`,
        ).toBe(db.classA.pairs)

        expect(
          classWeek.payload.dates.length,
          `المدى ${rangeA.start} → ${rangeA.end} فيه ${expectedDays.length} يومَ عملٍ (بلا جمعةٍ ولا سبت)، ` +
            `والتقرير بنى ${classWeek.payload.dates.length} عموداً — عدُّ الأيام يخالف اتّفاق أيام الدراسة.`,
        ).toBe(expectedDays.length)

        expect(
          classWeek.payload.students.length,
          `في الفصل «${grade} — ${className}» ${db.classA.students} طالباً في القاعدة، والتقرير أعاد ` +
            `${classWeek.payload.students.length} — كشفُ الفصل يجب أن يشمل كلَّ طلابه ولو بلا سجلّات.`,
        ).toBe(db.classA.students)

        expect(
          server.present,
          `الحضور: القاعدة تقول ${db.classA.present} والتقرير يجمع ${server.present} للمدى نفسِه (${rangeA.start} → ${rangeA.end}).`,
        ).toBe(db.classA.present)
        expect(
          server.absent,
          `الغياب: القاعدة تقول ${db.classA.absent} والتقرير يجمع ${server.absent} للمدى نفسِه.`,
        ).toBe(db.classA.absent)
        expect(
          server.late,
          `التأخير: القاعدة تقول ${db.classA.late} والتقرير يجمع ${server.late} للمدى نفسِه.`,
        ).toBe(db.classA.late)

        /* والوجهُ الثالث: ما يراه المستخدم. خادمٌ يردّ صحيحاً وشاشةٌ تعرض صفراً
           عطلٌ كامل، ولا يكشفه إلّا قراءةُ الترويسة نفسِها. */
        await expect(matrix, 'الخادم ردّ ببيانات ولم تُرسم مصفوفةُ الحضور').toBeVisible()

        for (const [label, expected] of [
          ['الطلاب:', db.classA.students],
          ['الحضور:', db.classA.present],
          ['الغياب:', db.classA.absent],
          ['التأخير:', db.classA.late],
        ] as const) {
          const shown = await readFact(label, expected)
          expect(
            shown,
            `ترويسة التقرير تعرض «${label} ${shown}» بينما القاعدة تقول ${expected} — ` +
              'الرقم الذي يراه المستخدم ليس الرقم الذي في القاعدة.',
          ).toBe(expected)
        }

        const bodyRows = await matrix.locator('tbody tr').count()
        expect(
          bodyRows,
          `المصفوفة رسمت ${bodyRows} صفّاً والخادم أرسل ${classWeek.payload.students.length} طالباً — ` +
            'الجدول يُسقط صفوفاً أو يكرّرها.',
        ).toBe(Math.min(classWeek.payload.students.length, 50))
      })

      /* ══ (٢) قياسُ الاستجابة للمدى: قبل وبعد ══
         (التصديرُ رحلةٌ مستقلّةٌ في آخر الملفّ: عطلُ زرٍّ واحدٍ يجب ألّا يحجب
          الحكمَ على صحّة الأرقام نفسِها.) */
      const absentFact = await journey.measure('إجمالي الغياب المعروض في الترويسة', () =>
        readFact('الغياب:', db.classA.absent),
      )
      const presentFact = await journey.measure('إجمالي الحضور المعروض في الترويسة', () =>
        readFact('الحضور:', db.classA.present),
      )

      await journey.step(`تقليص المدى إلى ${rangeB.start} ← ${rangeB.end} وإعادةُ الإنشاء`, async () => {
        await page.getByRole('button', { name: 'مخصصة' }).click()
        await page.locator('#ws-rep-start').fill(rangeB.start)
        await page.locator('#ws-rep-end').fill(rangeB.end)

        const narrowed = await generate()
        const server = sumReport(narrowed.payload)

        expect(
          server.absent,
          `الغياب في المدى المقلَّص: القاعدة تقول ${db.classB.absent} والتقرير يجمع ${server.absent}.`,
        ).toBe(db.classB.absent)
        expect(
          server.present,
          `الحضور في المدى المقلَّص: القاعدة تقول ${db.classB.present} والتقرير يجمع ${server.present}.`,
        ).toBe(db.classB.present)
      })

      await journey.step('المجاميع المعروضة نقصت بمقدار الأيام المحذوفة بالضبط', async () => {
        await journey.confirm(
          absentFact,
          () => readFact('الغياب:', db.classB.absent),
          db.classB.absent - db.classA.absent,
          `حذفنا من المدى أياماً فيها ${db.classA.absent - db.classB.absent} سجلَّ غيابٍ في القاعدة، فيجب أن ينقص ` +
            'المعروض بالمقدار نفسِه. بقاؤه كما كان يعني تقريراً لا يرى المدى أصلاً، ونقصانُه بمقدارٍ آخرَ يعني حدوداً مزاحة.',
        )
        await journey.confirm(
          presentFact,
          () => readFact('الحضور:', db.classB.present),
          db.classB.present - db.classA.present,
          'والحضور كذلك — المدى يجب أن يقصّ الطرفين بالقدر نفسِه.',
        )
      })

      /* ══ (٣) كشفُ طالبٍ واحد ══ */
      await journey.step(`إنشاء كشف الطالب «${target.name}» على المدى ${rangeA.start} ← ${rangeA.end}`, async () => {
        await page.locator('label.ws-pick').filter({ hasText: 'كشف طالب واحد' }).locator('input').check()
        await chooseOption(page, '#ws-rep-student', String(target.id), 'الطلاب')
        await page.getByRole('button', { name: 'آخر ٧ أيام' }).click()

        const report = await generate()
        const server = sumReport(report.payload)

        expect(
          report.payload.students.length,
          `كشفُ طالبٍ واحدٍ أعاد ${report.payload.students.length} طالباً — الترشيح بالطالب لا يعمل.`,
        ).toBe(1)
        expect(
          Number(report.payload.students[0].id),
          `الكشف أعاد الطالب ${report.payload.students[0].id} بينما اخترنا ${target.id} («${target.name}»).`,
        ).toBe(target.id)
        expect(
          server.present,
          `حضور الطالب: القاعدة تقول ${db.studentA.present} والكشف يقول ${server.present}.`,
        ).toBe(db.studentA.present)
        expect(
          server.absent,
          `غياب الطالب: القاعدة تقول ${db.studentA.absent} والكشف يقول ${server.absent}.`,
        ).toBe(db.studentA.absent)
        expect(
          server.late,
          `تأخير الطالب: القاعدة تقول ${db.studentA.late} والكشف يقول ${server.late}.`,
        ).toBe(db.studentA.late)

        await expect(
          page.locator('.ws-header'),
          `ترويسة الكشف لا تذكر اسم الطالب «${target.name}» — المستخدم لا يعرف عمّن يقرأ`,
        ).toContainText(target.name)

        const shownAbsent = await readFact('الغياب:', db.studentA.absent)
        expect(
          shownAbsent,
          `الترويسة تعرض غياباً ${shownAbsent} بينما القاعدة تقول ${db.studentA.absent} لهذا الطالب.`,
        ).toBe(db.studentA.absent)
      })

      /* ══ (٤) مدىً فارغ: أصفارٌ صادقة لا خطأ ══ */
      await journey.step(`مدىً بلا بيانات (${rangeEmpty.start} ← ${rangeEmpty.end}) يُنتج أصفاراً لا خطأً`, async () => {
        expect(
          db.studentEmpty.rows,
          `اخترتُ ${rangeEmpty.start} ← ${rangeEmpty.end} مدىً فارغاً، وفي القاعدة ${db.studentEmpty.rows} سجلاً فيه — ` +
            'فلم يعد فارغاً ولا يصلح لهذا الاختبار.',
        ).toBe(0)

        await page.getByRole('button', { name: 'مخصصة' }).click()
        await page.locator('#ws-rep-start').fill(rangeEmpty.start)
        await page.locator('#ws-rep-end').fill(rangeEmpty.end)

        const report = await generate()
        const server = sumReport(report.payload)

        expect(
          server.present + server.absent + server.late,
          `المدى فارغٌ في القاعدة والتقرير يجمع ${server.present + server.absent + server.late} سجلاً — ` +
            'التقرير يقرأ خارج المدى المطلوب.',
        ).toBe(0)

        // لا شاشةَ خطأ: الصفحة تقول «صفر» بوضوحٍ ولا تدّعي عطلاً
        await expect(
          page.getByText('حدث خطأ غير متوقع'),
          'مدىً فارغٌ عُومل معاملةَ العطل — والفراغ ليس خطأً',
        ).toHaveCount(0)

        const shown = await readFact('الغياب:', 0)
        expect(shown, `الترويسة تعرض غياباً ${shown} في مدىً لا سجلَّ فيه`).toBe(0)

        journey.note(
          'المدى الفارغ يُعرض مصفوفةً من الشُّرَط (—) وأصفاراً في الترويسة، لا برسالةٍ صريحة ' +
            'كـ«لا سجلّات في هذه الفترة». صادقٌ لا خاطئ، لكنّه أقلُّ وضوحاً ممّا يستحقّه المستخدم.',
        )
      })

      /* ══ (٥) المدى المقلوب — العطل الذي أوجع المالك ══ */
      await journey.step('مدىً مقلوب (البداية بعد النهاية) يُقابَل برسالةٍ مفهومة ولا يُرسَل طلبٌ أصلاً', async () => {
        let requests = 0
        const counter = (request: Request) => {
          if (request.url().includes('/admin/attendance/report')) requests += 1
        }
        page.on('request', counter)

        try {
          await page.locator('#ws-rep-start').fill(rangeA.end)
          await page.locator('#ws-rep-end').fill(rangeEmpty.start)
          await page.getByRole('button', { name: 'إنشاء التقرير' }).click()

          await expect(
            page.getByText('يجب أن يكون تاريخ البداية أسبق من تاريخ النهاية'),
            'قلبتُ المدى فلم تظهر رسالةٌ تشرح السبب — المستخدم يرى إمّا خطأً خاماً وإمّا لا شيء',
          ).toBeVisible()

          // الصفحة لم تنهر: نتيجةُ الكشف السابق ما زالت معروضة
          await expect(
            matrix,
            'المدى المقلوب أفرغ الشاشة — والمتوقَّع أن تبقى النتيجة السابقة قائمةً مع التنبيه',
          ).toBeVisible()
        } finally {
          page.off('request', counter)
        }

        expect(
          requests,
          `المدى المقلوب أرسل ${requests} طلباً إلى الخادم — والمتوقَّع أن تمسكه الواجهة قبل الإرسال ` +
            'فلا يعود ٤٢٢ خاماً بلا تفسير.',
        ).toBe(0)
      })
    } finally {
      await api?.dispose()
    }
  })

  /**
   * رحلةٌ ثانيةٌ قصيرة، مفصولةٌ عمداً.
   *
   * ما تفحصه شيءٌ واحد: **حقيقةُ «الاستئذان» في ترويسة التقرير**. وفُصلت عن
   * الرحلة الأمّ كي لا يختلط حكمُها بحكمها: تلك تُثبت أنّ الحضور والغياب
   * والتأخير صحيحةٌ كلُّها، وهذه تسأل عن الحالة الرابعة وحدها. فإن سقطت هذه
   * وحدها عُرف موضعُ العطل من التقرير بلا فتح الشيفرة.
   */
  test('حقيقةُ «الاستئذان» في الترويسة تعكس سجلّات الاستئذان في القاعدة', async ({ page, journey }) => {
    journey.about({
      role: 'الإدارة (admin)',
      purpose:
        'يُثبت أنّ حقيقة «الاستئذان» في ترويسة كشف الغياب تعدّ سجلّات الاستئذان في المدى — ' +
        'كما تعدّها خلايا المصفوفة تحتها، وكما يعدّها ملفُّ تصدير Excel.',
    })

    let api: ApiBridge | null = null

    try {
      api = await apiAs('admin')
      const bridge = api

      const me = await bridge.get<{ user: { school_id: number } }>('auth/me')
      const schoolId = me.user.school_id

      const target = await journey.step('اختيار فصلٍ فيه سجلّاتُ استئذان', async () => {
        const found = await phpJson<{ klass: { grade: string; class_name: string } | null }>(
          `['klass' => \\DB::table('attendances as a')
              ->join('students as s', 's.id', '=', 'a.student_id')
              ->where('s.school_id', $__b['school'])
              ->where('a.attendance_type', 'daily')
              ->where('a.status', 'excused')
              ->whereBetween('a.attendance_date', [now()->subDays(6)->toDateString(), now()->toDateString()])
              ->whereNotNull('s.grade')
              ->whereNotNull('s.class_name')
              ->groupBy('s.grade', 's.class_name')
              ->select('s.grade', 's.class_name', \\DB::raw('count(*) as n'))
              ->orderByDesc('n')
              ->first()]`,
          { school: schoolId },
        )
        return found.klass
      })

      /* تخطٍّ مُعلَن: بلا سجلّ استئذانٍ واحدٍ في المدى لا شيءَ يُقارَن،
         و«صفرٌ يساوي صفراً» طمأنينةٌ كاذبة لا تحقّق. */
      if (!target) {
        const why = 'لا سجلَّ حضورٍ بحالة «استئذان» في آخر سبعة أيام — لا شيء يُقاس عليه.'
        journey.markSkipped(why)
        test.skip(true, why)
        return
      }

      await journey.step(`فتح كشف الغياب للفصل «${target.grade} — ${target.class_name}» على آخر ٧ أيام`, async () => {
        await page.goto('/admin/attendance-report', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'كشف الغياب' })).toBeVisible()
        await chooseOption(page, '#ws-rep-grade', target.grade, 'الصف الدراسي')
        await chooseOption(page, '#ws-rep-class', target.class_name, 'الشعبة')
        await page.getByRole('button', { name: 'آخر ٧ أيام' }).click()
      })

      await journey.step('حقيقةُ «الاستئذان» تساوي ما في القاعدة', async () => {
        const waiting = page.waitForResponse(
          (response) => response.url().includes('/admin/attendance/report') && response.request().method() === 'GET',
          { timeout: 40_000 },
        )
        await page.getByRole('button', { name: 'إنشاء التقرير' }).click()
        const response = await waiting
        const payload = ((await response.json()) as { data: ReportPayload }).data
        const params = new URL(response.url()).searchParams
        const start = params.get('start_date') ?? ''
        const end = params.get('end_date') ?? ''

        const db = await readRangeFacts(schoolId, [
          { key: 'klass', start, end, grade: target.grade, class: target.class_name },
        ])
        const expected = db.klass.excused
        expect(
          expected,
          'اخترنا هذا الفصل لسجلّات استئذانه ثمّ لم نجدها في المدى الذي طلبته الواجهة',
        ).toBeGreaterThan(0)

        // ما تعرضه المصفوفةُ نفسُها في خلاياها — من الاستجابة عينِها
        const cells = sumReport(payload).excusedCells

        await expect(page.locator('table.ws-matrix'), 'لم تُرسم مصفوفةُ الحضور').toBeVisible()
        const shown = await readDisplayedNumber(
          page.locator('.ws-header__facts .ws-fact').filter({ hasText: 'الاستئذان:' }).locator('b'),
        )

        expect(
          shown,
          `الترويسة تعرض «الاستئذان: ${shown}» بينما في القاعدة ${expected} سجلَّ استئذانٍ في المدى ${start} ← ${end}، ` +
            `والاستجابة نفسُها فيها ${cells} خليةً بحالة «استئذان» تُلوّنها المصفوفة تحت الرقم مباشرةً. ` +
            'أي أنّ الرقم المعروض لا يعدّ ما تعرضه الشاشة تحته — وملفُّ تصدير Excel يعدّه ' +
            '(AttendanceReportExportService)، فالنقص في مُخرَج getAttendanceReport وحده.',
        ).toBe(expected)
      })
    } finally {
      await api?.dispose()
    }
  })

  /**
   * رحلةٌ ثالثة: **زرُّ التصدير يُنتج ملفّاً**.
   *
   * وتُصدَّر مرّتين عن قصد، وبهذا الترتيب:
   *   ١) كشفاً حسب الصف (بلا شعبة) — ليُعرف أنّ التصدير نفسَه يعمل.
   *   ٢) كشفَ فصلٍ كامل (بشعبة)   — والفرقُ بين الحالتين اسمُ الشعبة وحده.
   * فلو سقطت الثانيةُ وحدها لم يعد التشخيص تخميناً: ليست العلّةُ في المُصدِّر
   * ولا في البيانات، بل في شيءٍ يخصّ الشعبة.
   *
   * ولا يُفتح الملفّ: يكفي أن نتحقّق من رمز الحالة ونوع المحتوى وحجمه.
   */
  test('زرُّ تصدير Excel يُنتج ملفّاً — للصف وللفصل', async ({ page, journey }) => {
    journey.about({
      role: 'الإدارة (admin)',
      purpose:
        'يُثبت أنّ زرّ «Excel» في كشف الغياب يُنزّل ملفَّ جدولٍ حقيقياً لا رسالةَ خطأ — ' +
        'في كشف الصف وفي كشف الفصل كليهما.',
    })

    let api: ApiBridge | null = null

    try {
      api = await apiAs('admin')
      const bridge = api

      const me = await bridge.get<{ user: { school_id: number } }>('auth/me')
      const schoolId = me.user.school_id

      const target = await journey.step('اختيار فصلٍ فيه سجلّاتُ حضور', async () => {
        const found = await phpJson<{ klass: { grade: string; class_name: string } | null }>(
          `['klass' => \\DB::table('attendances as a')
              ->join('students as s', 's.id', '=', 'a.student_id')
              ->where('s.school_id', $__b['school'])
              ->where('a.attendance_type', 'daily')
              ->whereBetween('a.attendance_date', [now()->subDays(35)->toDateString(), now()->toDateString()])
              ->whereNotNull('s.grade')
              ->whereNotNull('s.class_name')
              ->groupBy('s.grade', 's.class_name')
              ->select('s.grade', 's.class_name', \\DB::raw('count(*) as n'))
              ->orderByDesc('n')
              ->first()]`,
          { school: schoolId },
        )
        expect(found.klass, `لا سجلَّ حضورٍ في المدرسة ${schoolId} — لا شيء يُصدَّر`).not.toBeNull()
        return found.klass!
      })

      /** يضغط «إنشاء التقرير» ثمّ «Excel»، ويُرجع وصفَ ما ردّه الخادم */
      const exportOnce = async (): Promise<{ status: number; type: string; bytes: number; body: string }> => {
        const reported = page.waitForResponse(
          (response) => response.url().includes('/admin/attendance/report') && response.request().method() === 'GET',
          { timeout: 40_000 },
        )
        await page.getByRole('button', { name: 'إنشاء التقرير' }).click()
        await reported
        await expect(page.locator('table.ws-matrix'), 'لم تُرسم نتيجةُ الكشف فلا شيءَ يُصدَّر').toBeVisible()

        const exported = page.waitForResponse(
          (response) => response.url().includes('/admin/attendance-reports/export/excel'),
          { timeout: 60_000 },
        )
        // حدثُ التنزيل زائدةٌ مفيدة: الاستجابةُ تُثبت أنّ الخادم أنتج الملفّ،
        // والحدثُ يُثبت أنّ المتصفّح تسلّمه. وغيابُه يُذكر ولا يُسقط الرحلة.
        const downloading = page.waitForEvent('download', { timeout: 12_000 }).catch(() => null)
        await page.getByRole('button', { name: 'Excel' }).click()
        const response = await exported

        const buffer = await response.body().catch(() => Buffer.alloc(0))
        const download = await downloading
        if (download) {
          journey.note(`حفظ المتصفّح الملفّ باسم «${download.suggestedFilename()}» (لم يُفتح ولم يُبقَ).`)
          await download.delete().catch(() => undefined)
        }

        return {
          status: response.status(),
          type: response.headers()['content-type'] ?? '',
          bytes: buffer.length,
          body: buffer.toString('utf8').slice(0, 300),
        }
      }

      await journey.step('فتح صفحة كشف الغياب', async () => {
        await page.goto('/admin/attendance-report', { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name: 'كشف الغياب' })).toBeVisible()
      })

      const byGrade = await journey.step(`تصديرُ كشفٍ حسب الصف «${target.grade}»`, async () => {
        await page.locator('label.ws-pick').filter({ hasText: 'كشف حسب الصف' }).locator('input').check()
        await chooseOption(page, '#ws-rep-grade', target.grade, 'الصف الدراسي')
        await page.getByRole('button', { name: 'آخر ٧ أيام' }).click()

        const result = await exportOnce()
        expect(
          result.status,
          `الخادم ردّ ${result.status} على تصدير كشف الصف بدل 200 — التصدير معطّلٌ من أصله. الردّ: ${result.body}`,
        ).toBe(200)
        expect(
          result.type,
          `نوعُ المحتوى «${result.type}» ليس ملفَّ جدول — الأرجح أنّ الخادم ردّ برسالة خطأٍ بصيغة JSON.`,
        ).toContain('spreadsheetml')
        expect(
          result.bytes,
          `ملفُّ التصدير فارغٌ تقريباً (${result.bytes} بايت) — أُنتج ملفٌّ بلا محتوى.`,
        ).toBeGreaterThan(1024)
        return result
      })

      await journey.step(`تصديرُ كشف الفصل «${target.grade} — ${target.class_name}»`, async () => {
        await page.locator('label.ws-pick').filter({ hasText: 'كشف فصل كامل' }).locator('input').check()
        await chooseOption(page, '#ws-rep-grade', target.grade, 'الصف الدراسي')
        await chooseOption(page, '#ws-rep-class', target.class_name, 'الشعبة')

        const result = await exportOnce()
        expect(
          result.status,
          `تصديرُ كشف الصف نجح (${byGrade.bytes} بايت)، وتصديرُ الفصل «${target.class_name}» ردّ ${result.status}. ` +
            `والفرقُ بين الطلبين اسمُ الشعبة وحده. ردُّ الخادم: ${result.body}`,
        ).toBe(200)
        expect(
          result.type,
          `نوعُ المحتوى المُصدَّر للفصل «${result.type}» ليس ملفَّ جدول.`,
        ).toContain('spreadsheetml')
        expect(
          result.bytes,
          `ملفُّ تصدير الفصل فارغٌ تقريباً (${result.bytes} بايت).`,
        ).toBeGreaterThan(1024)
      })
    } finally {
      await api?.dispose()
    }
  })
})
