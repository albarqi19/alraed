/**
 * الرحلة ٣ — رصدُ حضورٍ وغياب: قلبُ النظام.
 *
 * ══ ما تُثبته ══
 * أنّ التحضيرَ **يُكتب ويُقرأ وينعكس**، بأربعة وجوهٍ لا وجهٍ واحد:
 *   ١) المعلّم يعلّم طالباً غائباً وبقيّتَهم حضوراً ويحفظ، فيستقرّ في القاعدة
 *      بالحالة الصحيحة **لكلّ طالبٍ باسمه** — لا «حُفظ شيءٌ ما».
 *   ٢) إعادةُ فتح الشاشة تُظهر ما حُفظ، ولا تعود فارغةً كأنّ شيئاً لم يكن.
 *   ٣) **عدّادُ الغياب في مكانٍ آخر يتغيّر**: صفحةُ «تقارير الحضور» عند الإدارة
 *      تعرض السجلَّ الجديد وإحصاءَه. والرصدُ الذي لا ينعكس في التقرير عطلٌ
 *      صامت، وهو أشيعُ ما يشتكي منه المستخدم.
 *   ٤) تبديلُ غائبٍ إلى حاضرٍ من الإدارة **يُنقص العدّاد** في الوجهين معاً.
 *
 * ══ ⚠ لماذا هذه أخطرُ رحلةٍ في الدفعة ══
 * الغيابُ يُطلق رسالةَ واتساب لوليّ الأمر. وأخطرُ من ذلك: تبديلُ الحالة من
 * الإدارة (`DashboardController::updateAttendanceStatus`) **لا يمرّ بالطابور
 * أصلاً** — يُنشئ صفَّ `whatsapp_messages` ثمّ ينادي البوّابة **داخل الطلب
 * نفسه** (`sendWhatsappMessageDirectly`). فحارسُ «الطابور ليس sync» لا يحميك
 * هنا؛ الحارسُ الوحيد هو إعدادُ المدرسة `send_absence_sms`.
 *
 * ولذلك تفعل هذه الرحلة ثلاثة أشياء قبل أن تكتب حرفاً:
 *   · تقرأ `send_absence_sms` من قاعدة الاختبار، و**تتخطّى نفسها معلِنةً** إن
 *     كان مفعَّلاً — لا تكتب ولا تخاطر.
 *   · تقيس `whatsapp_messages` قبل وبعد وتُثبت الرقمين في التقرير.
 *   · وتتركُ حكمَ الحَلبة العامّ فوق ذلك: أيُّ زيادةٍ في الرسائل أو في المهامّ
 *     الفاشلة تُسقط الرحلة.
 *
 * ══ كيف تبقى الرحلة قابلةً للإعادة ══
 * التحضيرُ لا يُقبل مرّتين لنفس الحصة في اليوم نفسِه (`existingSessionAttendance`).
 * فالرحلة تعمل على **فصلٍ نظيفٍ اليوم**: لا يحمل أيُّ طالبٍ من فصلها سجلَّ
 * حضورٍ بتاريخ اليوم. وهذا الشرط يضمن ثلاثةً معاً:
 *   · الحفظُ يمرّ (لا تحضيرَ سابقاً لهذه الحصة)،
 *   · ونوعُه `daily` لا `period` (لا تحضيرَ سابقاً لهذا الفصل اليوم) — وهو
 *     النوع الذي تعرضه صفحةُ تقارير الحضور،
 *   · والسجلُّ المجمَّع في صفحة الإدارة (معلّم × تاريخ × صف × فصل) يخصُّنا وحدنا،
 *     فما نقرؤه فيه أثرُنا لا أثرُ البذرة.
 * ثمّ تحذف الرحلةُ ما كتبته في النهاية عبر واجهة التطبيق نفسها، فيبقى اليومُ
 * نظيفاً للتشغيل التالي.
 *
 * **وإن لم يوجد فصلٌ نظيف** — وهي الحالُ على كلّ قاعدةٍ بُذرت للتوّ، لأنّ البذرة
 * تكتب حضورَ اليوم لفصولها كلِّها — فالرحلة **تستعير** فصلاً: ترفع سجلّاتِ يومه
 * مؤقّتاً، ثمّ تُعيدها بمعرّفاتها وكلّ أعمدتها في النهاية. ولولا ذلك لتخطّت
 * الرحلةُ نفسَها في الحالة القياسية تماماً فلا تُثبت شيئاً. والاستعارةُ تهيئةُ
 * شرطٍ لا فعلٌ يُختبر، ولذلك تجري بالاستعلام لا بواجهة التطبيق — وتُذكر صراحةً
 * في التقرير.
 *
 * ══ يومُ الدوام عن بُعد ══
 * البذرة تُفعّل «دواماً عن بُعد» ليوم بذرها. وحين يكون اليومُ كذلك تستبدل شاشةُ
 * الحصة قائمةَ التحضير بواجهة رفع تقرير — فلا زرَّ حفظٍ أصلاً. فإن صادفت
 * الرحلةُ ذلك ألغت اليوم من الإدارة، ثمّ **أعادته كما كان** في النهاية.
 */

import { request as playwrightRequest, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { test, expect } from './_support/journey'
import { apiAs, apiWithToken, tokenOf, loginViaApi, NO_SESSION, type ApiBridge } from './_support/api-bridge'
import { countRows, firstRow, phpJson } from './_support/php-bridge'
import { installSession } from './_support/session'
import { readDisplayedNumber } from './_support/measure'
import { apiUrl } from '../config/crawler.config'
import { credentials } from '../config/route-params'

/* ══════════════════════════════════════════════════════════════
   ما نقرؤه من القاعدة قبل أن نلمس شيئاً
   ══════════════════════════════════════════════════════════════ */

/** صفُّ حضورٍ كاملٌ كما هو في القاعدة — يُحفظ ليُعاد بعينه */
type AttendanceRow = Record<string, unknown> & { id: number }

interface CandidateSession {
  id: number
  grade: string
  class_name: string
  day: string
  period_number: number | null
  teacher_id: number
  teacher_name: string
  teacher_national_id: string
  students: Array<{ id: number; name: string }>
  /**
   * سجلّاتُ حضورِ اليومِ **الموجودةُ سلفاً** لطلاب هذا الفصل (البذرةُ تكتبها).
   * فارغةٌ = الفصلُ نظيفٌ فيُرصد فيه مباشرةً. وغيرُ فارغةٍ = يُستعار الفصلُ:
   * تُرفع هذه الصفوف مؤقّتاً ثمّ تُعاد بعينها في نهاية الرحلة.
   */
  today_rows: AttendanceRow[]
}

interface Reconnaissance {
  /** «اليوم» بحساب الباك نفسِه — لا بحساب عقدة جافاسكربت */
  today: string
  /** قيمةُ الإعداد الحارس كما هي في الجدول؛ null يعني «غير مضبوط» = مُطفأ */
  send_absence_sms: string | null
  /** أهذا اليومُ دوامٌ عن بُعد مفعَّل؟ */
  remote_day: boolean
  /** الحصصُ الصالحة، مرتَّبةً بمعرّفها */
  candidates: CandidateSession[]
  /** عددُ سجلّات الغياب في المدرسة اليوم — قاعدةُ القياس «قبل» */
  absent_today: number
}

/**
 * استطلاعٌ واحدٌ يجيب عن كلّ ما تحتاجه الرحلة.
 *
 * نداءُ tinker يكلّف نحو ثانيةٍ ونصف، وستّةُ أسئلةٍ في ستّة نداءاتٍ تعني عشر
 * ثوانٍ تضيع. والأهمّ أنّ القراءة الواحدة **متّسقة**: لا تقع كتابةٌ بين سؤالٍ
 * وأخيه فتُبنى القرارات على صورتين مختلفتين للقاعدة.
 *
 * ويقرأ باستعلاماتٍ خام (`DB::table`) عمداً: النطاقاتُ العامّة على النماذج
 * تحجب `attendance_type = period`، ونحن نريد أن نرى **كلّ** ما في اليوم —
 * فحصّةٌ نحسبها نظيفةً وفيها سجلُّ حصّةٍ خفيّ ترتدّ بـ400 عند الحفظ.
 */
async function reconnoitre(schoolId: number): Promise<Reconnaissance> {
  return phpJson<Reconnaissance>(
    `(function () use ($__b) {
      $school = (int) $__b['school'];
      $today = now()->toDateString();

      $candidates = [];
      $sessions = \\DB::table('class_sessions')
        ->where('school_id', $school)
        ->orderBy('id')
        ->get();

      foreach ($sessions as $session) {
        $students = \\DB::table('students')
          ->where('school_id', $school)
          ->where('grade', $session->grade)
          ->where('class_name', $session->class_name)
          ->where('status', 'active')
          ->orderBy('name')
          ->get(['id', 'name']);

        // طالبان على الأقلّ: الرحلة تعلّم واحداً غائباً وواحداً حاضراً
        if ($students->count() < 2) { continue; }

        /* سجلّاتُ اليوم لا تُقصي الفصلَ بل تُوصَف.
           كان الشرطُ هنا «if (taken) continue;» فيُسقط كلَّ فصلٍ رُصد حضورُه
           اليوم — وبذرةُ الاختبار تكتب حضورَ **اليوم** لكلّ فصولها. فكانت
           النتيجةُ أنّ الرحلة تتخطّى نفسَها دائماً على قاعدةٍ بُذرت للتوّ، أي
           في الحالة القياسية تماماً. فصارت الصفوفُ تُقرأ كاملةً هنا لتُستعار
           هناك: تُرفع قبل الرصد وتُعاد بعده. */
        $todayRows = \\DB::table('attendances')
          ->whereIn('student_id', $students->pluck('id'))
          ->where('attendance_date', $today)
          ->orderBy('id')
          ->get();

        $teacher = \\DB::table('users')->where('id', $session->teacher_id)->first();
        if (!$teacher || !$teacher->national_id) { continue; }

        $candidates[] = [
          'id' => (int) $session->id,
          'grade' => $session->grade,
          'class_name' => $session->class_name,
          'day' => $session->day,
          'period_number' => $session->period_number,
          'teacher_id' => (int) $session->teacher_id,
          'teacher_name' => $teacher->name,
          'teacher_national_id' => (string) $teacher->national_id,
          'students' => $students->map(fn ($s) => ['id' => (int) $s->id, 'name' => $s->name])->values(),
          'today_rows' => $todayRows->values(),
        ];

        if (count($candidates) >= 6) { break; }
      }

      return [
        'today' => $today,
        'send_absence_sms' => optional(\\DB::table('settings')
          ->where('school_id', $school)->where('key', 'send_absence_sms')->first())->value,
        'remote_day' => \\DB::table('school_remote_days')
          ->where('school_id', $school)->where('date', $today)->where('is_active', 1)->exists(),
        'candidates' => $candidates,
        'absent_today' => \\DB::table('attendances')
          ->where('school_id', $school)->where('attendance_date', $today)->where('status', 'absent')->count(),
      ];
    })()`,
    { school: schoolId },
  )
}

/** هل الإعدادُ الحارس مُطفأ؟ `Setting::get` يقرؤه بـfilter_var فنحاكيها حرفياً */
function absenceMessagesAreOff(raw: string | null): boolean {
  if (raw === null || raw === '') return true
  return !['1', 'true', 'on', 'yes'].includes(String(raw).trim().toLowerCase())
}

/* ══════════════════════════════════════════════════════════════
   استعارةُ فصلٍ ليومٍ واحد — تهيئةُ الشرط، لا اختبارٌ لشيء
   ══════════════════════════════════════════════════════════════

   ══ لماذا وُجدت هذه الاستعارة ══
   التحضيرُ اليوميّ لا يُقبل مرّتين للفصل نفسِه في اليوم نفسِه؛ فالرحلةُ تحتاج
   فصلاً بلا سجلّ حضورٍ اليوم. وبذرةُ الاختبار تكتب حضورَ **اليوم** لكلّ فصولها
   (وهي فصلان فقط)، فلا يبقى فصلٌ نظيفٌ واحد. فكانت الرحلة تتخطّى نفسَها في
   الحالة القياسية — قاعدةٌ بُذرت للتوّ — ولا تُثبت شيئاً إطلاقاً.

   ══ لماذا رفعُ الصفوف بالاستعلام لا بواجهة التطبيق ══
   لأنّ هذا **تهيئةُ شرطٍ** لا فعلٌ يُختبر. وحذفُ التطبيق يمرّ بقيوده وعلاقاته
   فقد يحذف معه ما لا نعرف كيف نُعيده؛ ونحن لا نريد حذفاً بل **إعارةً**: نرفع
   الصفوف كما هي بمعرّفاتها، ثمّ نُعيدها بعينها في النهاية. فالقاعدةُ تخرج من
   الرحلة كما دخلت. (أمّا الصفوف التي **تُنشئها** الرحلة فتُحذف عبر واجهة
   التطبيق كما كانت — ذاك فعلٌ نختبره، وهذا ترتيبُ مسرح.)
*/

/** يرفع صفوفاً بمعرّفاتها ويُرجع عددَ ما رُفع */
async function liftRows(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0
  const result = await phpJson<{ n: number }>(
    `['n' => \\DB::table('attendances')->whereIn('id', $__b['ids'])->delete()]`,
    { ids },
  )
  return result.n
}

/** يُعيد الصفوف المرفوعة بعينها — بمعرّفاتها وكلّ أعمدتها */
async function restoreRows(rows: AttendanceRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const result = await phpJson<{ n: number }>(
    `(function () use ($__b) {
      $rows = $__b['rows'];
      $existing = \\DB::table('attendances')->whereIn('id', array_column($rows, 'id'))->pluck('id')->all();
      $missing = array_values(array_filter($rows, fn ($r) => !in_array($r['id'], $existing, false)));
      if ($missing) { \\DB::table('attendances')->insert($missing); }
      return ['n' => count($missing)];
    })()`,
    { rows },
  )
  return result.n
}

/* ══════════════════════════════════════════════════════════════
   يدُ الإدارة على الـAPI — لما ليس فيه واجهة (التهيئة والتنظيف)
   ══════════════════════════════════════════════════════════════ */

/**
 * سياقُ طلبٍ بتوكن الإدارة نفسِه الذي يحمله المتصفّح.
 *
 * `ApiBridge` يقرأ ولا يكتب — وهو الصواب: الرحلات تفعل من الواجهة. لكنّ
 * التهيئةَ والتنظيف ليسا مما نختبره، وإجراؤهما بضغطاتٍ في الواجهة يخلط
 * «إعدادَ التجربة» بـ«التجربة». فيُجريان هنا بأقصر طريق.
 */
async function adminContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokenOf('admin')}`,
      Accept: 'application/json',
    },
  })
}

/* ══════════════════════════════════════════════════════════════
   محدِّداتُ الواجهة — في مكانٍ واحدٍ كي تُصلَح في مكانٍ واحد
   ══════════════════════════════════════════════════════════════ */

/**
 * بطاقةُ طالبٍ في شاشة التحضير، مُلتقطةٌ باسمه الظاهر.
 *
 * الاسمُ داخل زرٍّ (يفتح ورقةَ التقييم)، فنلتقط البطاقةَ بأنّها `article` يحوي
 * زرّاً اسمُه هذا **بالضبط**: الاحتواءُ وحده يلتقط «طالب الزحف الأول» داخل
 * بحثٍ عن «طالب الزحف الأولى» لو وُجد.
 */
function studentCard(page: Page, name: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
}

/**
 * عدّادُ حالةٍ في شريط الملخّص أسفل شاشة التحضير.
 *
 * البطاقاتُ الأربع بلا معرّفات، والمرساةُ الوحيدة المستقرّة فيها هي تسميتُها
 * («حاضر» · «غائب» …) في فقرةٍ نصُّها التسميةُ وحدها. والمطابقةُ التامّة شرط:
 * زرُّ «إعادة ضبط الكل إلى حاضر» يحتوي «حاضر» ولا يساويها.
 */
function summaryTile(page: Page, label: string): Locator {
  return page
    .locator('.glass-card')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('p')
    .first()
}

/** بلوكُ مساحة العمل بعنوانه — مرساةُ صفحات الإدارة */
function workspaceBlock(page: Page, title: string): Locator {
  return page.locator('.ws-block').filter({ has: page.locator('.ws-block__title', { hasText: title }) })
}

/* ══════════════════════════════════════════════════════════════
   الرحلة
   ══════════════════════════════════════════════════════════════ */

test.describe('الرحلة ٣ — رصد الحضور والغياب', () => {
  /* بلا جلسةٍ محفوظة: المعلّمُ الذي سنستعمله يُختار من القاعدة (صاحبُ أوّل
     حصّةٍ نظيفة)، وقد لا يكون معلّمَ البذرة المحفوظةَ جلستُه. فندخل بجلسته هو. */
  test.use({ storageState: NO_SESSION })

  test('المعلّم يرصد غياباً فيثبت في القاعدة ويظهر في تقرير الإدارة، ثمّ يُبدَّل إلى حضورٍ فينقص العدّاد', async ({
    page,
    journey,
  }) => {
    journey.about({
      role: 'المعلّم ثمّ الإدارة',
      purpose:
        'يُثبت أنّ رصد الحضور يُحفظ بحالةٍ صحيحةٍ لكلّ طالب، ويبقى بعد إعادة فتح الشاشة، ' +
        'وينعكس في تقرير الإدارة — وأنّ تبديل غائبٍ إلى حاضرٍ يُنقص عدّاد الغياب في الواجهة والقاعدة معاً. ' +
        'وأنّ شيئاً من ذلك لا يُخرج رسالةً واحدة.',
    })

    let api: ApiBridge | null = null
    let admin: APIRequestContext | null = null

    /** معرّفاتُ ما كتبناه — تُحذف في النهاية مهما انتهت الرحلة */
    const createdAttendanceIds: number[] = []
    /** أألغينا يومَ دوامٍ عن بُعد؟ إن نعم فعلينا إعادتُه */
    let remoteDayToRestore: { date: string; note: string } | null = null
    /** صفوفُ حضورٍ مبذورةٌ رفعناها مؤقّتاً — تُعاد بعينها مهما انتهت الرحلة */
    let borrowedRows: AttendanceRow[] = []
    /** تاريخُ ما استُعير — يُذكر في رسالة الفشل إن تعذّرت الإعادة */
    let borrowedDate = ''

    try {
      api = await apiAs('admin')
      const bridge = api
      admin = await adminContext()
      const adminApi = admin

      /* ── مَن الإدارةُ وأيُّ مدرسة؟ ──
         بلا هذا السؤال يصير كلُّ ما بعده معلَّقاً في الهواء: نقرأ حصصاً من
         مدرسةٍ ونتحقّق من تقريرِ أخرى. */
      const me = await journey.step('التعرّف على حساب الإدارة ومدرسته', async () => {
        const payload = await bridge.get<{ user: { id: number; school_id: number; name: string } }>('auth/me')
        expect(payload.user?.school_id, 'حسابُ الإدارة بلا مدرسة — لا سياقَ لهذه الرحلة').toBeTruthy()
        return payload.user
      })
      const schoolId = Number(me.school_id)

      /* ── الاستطلاع ── */
      let scout = await journey.step('استطلاعُ القاعدة: الإعداد الحارس · يوم الدوام · حصّةٌ نظيفة', () =>
        reconnoitre(schoolId),
      )

      journey.note(
        `المدرسة ${schoolId} · تاريخ الباك ${scout.today} · ` +
          `إعداد send_absence_sms = ${scout.send_absence_sms ?? '(غير مضبوط)'} · ` +
          `حصصٌ صالحة: ${scout.candidates.length}`,
      )

      /* ── ⚠ الحارس الأوّل: قناةُ الواتساب ──
         تبديلُ الحالة من الإدارة يرسل **فوراً** داخل الطلب حين يكون هذا
         الإعداد مفعَّلاً. فلا نكتب حرفاً قبل أن نتيقّن أنّه مُطفأ. */
      if (!absenceMessagesAreOff(scout.send_absence_sms)) {
        const reason =
          `توقّف: إعدادُ المدرسة «send_absence_sms» مفعَّل (القيمة: ${scout.send_absence_sms}). ` +
          'رصدُ الغياب وتبديلُ الحالة يُنشئان رسالة واتساب ويُرسلانها فوراً داخل الطلب — ' +
          'لا عبر الطابور. أطفئ الإعداد على قاعدة الاختبار قبل تشغيل هذه الرحلة.'
        journey.markSkipped(reason)
        journey.note(reason)
        test.skip(true, reason)
        return
      }

      /* ── يومُ الدوام عن بُعد يحجب شاشةَ التحضير ── */
      if (scout.remote_day) {
        const remoteDate = scout.today
        await journey.step('إلغاءُ «الدوام عن بُعد» لهذا اليوم (يحجب شاشة التحضير)', async () => {
          const response = await adminApi.delete(apiUrl(`admin/remote-attendance/deactivate/${remoteDate}`))
          expect(
            response.ok(),
            `اليومُ مفعَّلٌ دواماً عن بُعد فتُخفى شاشةُ التحضير، وتعذّر إلغاؤه: ${response.status()} — ` +
              (await response.text()).slice(0, 200),
          ).toBeTruthy()
        })
        // الإسنادُ خارج الخطوة عمداً: ما يُكتب داخل دالّةٍ متداخلة لا يتعقّبه
        // المترجم، فيظنّ المتغيّر باقياً على null ويُسقط تنظيفَه في `finally`.
        remoteDayToRestore = { date: remoteDate, note: 'أُعيد بعد رحلة الحضور الآلية.' }

        // الحالةُ تغيّرت، فنعيد الاستطلاع بدل أن نبني على صورةٍ قديمة
        scout = await journey.step('إعادةُ الاستطلاع بعد إلغاء يوم الدوام', () => reconnoitre(schoolId))
      }

      /* ── اختيارُ الحصّة ──
         ترتيبُ التفضيل صريحٌ ومقصود:
           ١) حصّةُ معلّم البذرة في فصلٍ **نظيف** — أقلُّها أثراً: جلستُه محفوظة
              ولا استعارةَ أصلاً.
           ٢) أيُّ فصلٍ نظيف.
           ٣) حصّةُ معلّم البذرة في فصلٍ يُستعار.
           ٤) أوّلُ حصّةٍ صالحة، تُستعار.
         والتخطّي لم يعد يقع إلّا حين لا يوجد فصلٌ فيه طالبان ومعلّمٌ له هويّة —
         وهي حالةُ بذرةٍ ناقصةٍ لا حالةَ يومٍ مشغول. */
      const preferred = credentials.teacher?.nationalId ?? ''
      const isSeeded = (item: CandidateSession) =>
        preferred !== '' && item.teacher_national_id === preferred
      const isClean = (item: CandidateSession) => item.today_rows.length === 0

      const chosen =
        scout.candidates.find((item) => isSeeded(item) && isClean(item)) ??
        scout.candidates.find(isClean) ??
        scout.candidates.find(isSeeded) ??
        scout.candidates[0] ??
        null

      if (!chosen) {
        const reason =
          `لا حصّةَ صالحةً في المدرسة ${schoolId}: كلُّ حصّةٍ إمّا فصلُها فيه أقلُّ من طالبين نشِطين، ` +
          'وإمّا معلّمُها بلا هويّةٍ وطنيةٍ فلا سبيل إلى الدخول بجلسته. هذه حالةُ بذرةٍ ناقصة لا حالةُ عطل — ' +
          'أعد بذر القاعدة: php artisan e2e:seed'
        journey.markSkipped(reason)
        journey.note(reason)
        test.skip(true, reason)
        return
      }

      const password = credentials.teacher?.password ?? ''
      const teacherIsSeeded = chosen.teacher_national_id === preferred && preferred !== ''

      const absentStudent = chosen.students[0]
      const presentStudent = chosen.students[1]
      const classLabel = `${chosen.grade} - ${chosen.class_name}`

      journey.note(
        `الحصّة المختارة #${chosen.id} (${classLabel} · ${chosen.day} · الحصة ${chosen.period_number ?? '—'}) ` +
          `للمعلّم «${chosen.teacher_name}» · طلابُ الفصل: ${chosen.students.length} · ` +
          `سنُغيّب «${absentStudent.name}» ونُحضر البقيّة.`,
      )

      /* ══ استعارةُ الفصل — قبل أيّ قياس ══
         الرفعُ يجب أن يسبق القياسَ «قبل»: لو قِسنا ثمّ رفعنا لجاء فرقُ الغياب
         مخلوطاً بما رفعناه، ولانقلب معنى «كان س فصار س+١». */
      if (chosen.today_rows.length > 0) {
        const rows = chosen.today_rows
        await journey.step(
          `استعارةُ ${rows.length} سجلَّ حضورٍ مبذورٍ لفصل ${classLabel} اليوم (تُعاد بعينها في النهاية)`,
          async () => {
            const lifted = await liftRows(rows.map((row) => Number(row.id)))
            expect(
              lifted,
              `أردتُ رفع ${rows.length} صفّاً مؤقّتاً فرُفع ${lifted} — الاستعارةُ ناقصة، ولن أرصد على فصلٍ نصفِ نظيف`,
            ).toBe(rows.length)
          },
        )
        // الإسنادُ خارج الخطوة عمداً (كما في يوم الدوام): ما يُكتب داخل دالّةٍ
        // متداخلة لا يتعقّبه المترجم فيظنّ المتغيّر باقياً فارغاً.
        borrowedRows = rows
        borrowedDate = scout.today
        journey.note(
          `الفصلُ لم يكن نظيفاً: فيه ${rows.length} سجلَّ حضورٍ من البذرة بتاريخ ${scout.today}. ` +
            'رُفعت مؤقّتاً كي يُقبل التحضيرُ اليوميّ، وتُعاد بمعرّفاتها وكلّ أعمدتها في نهاية الرحلة.',
        )
      }

      /* ══ القياسات «قبل» ══ */
      const whatsapp = await journey.measure('رسائل واتساب مسجَّلة (whatsapp_messages)', () =>
        countRows('whatsapp_messages'),
      )
      const sessionRows = await journey.measure('سجلّات حضورٍ لهذه الحصة اليوم', () =>
        countRows('attendances', { class_session_id: chosen.id, attendance_date: scout.today }),
      )
      expect(
        sessionRows.before,
        'الحصّة المختارة كان يُفترض أن تكون نظيفةً تماماً، ووجدتُ فيها سجلّات — الاستطلاع لا يطابق الواقع',
      ).toBe(0)

      const absentToday = await journey.measure('سجلّات الغياب في المدرسة اليوم', () =>
        countRows('attendances', { school_id: schoolId, attendance_date: scout.today, status: 'absent' }),
      )

      /* ══ (١) المعلّم يرصد ══ */

      /* ── جلسةُ المعلّم ──
         إن كانت الحصّةُ لمعلّم البذرة فجلستُه محفوظةٌ من مشروع التهيئة، فنُعيد
         استعمالها بدل دخولٍ ثانٍ: `auth/login` محدودُ المعدّل (عشرُ محاولاتٍ في
         الدقيقة لكلّ عنوان)، ودخولٌ زائدٌ في كلّ تشغيلٍ يُقرّب السقفَ بلا فائدة —
         وقد أسقط ذلك تهيئةَ المصادقة فعلاً حين شُغّلت رحلتان معاً. */
      await journey.step(`الدخول بجلسة المعلّم «${chosen.teacher_name}»`, async () => {
        if (teacherIsSeeded) {
          const token = tokenOf('teacher')
          const scoped = await apiWithToken(token, 'بجلسة «teacher»')
          try {
            const payload = await scoped.get<{ user: Record<string, unknown> }>('auth/me')
            await installSession(page, token, payload.user)
          } finally {
            await scoped.dispose()
          }
          return
        }

        expect(
          password,
          `الحصّةُ الصالحة للمعلّم «${chosen.teacher_name}» وليست جلستُه محفوظةً، ولا كلمةَ مرورٍ لدور المعلّم ` +
            '(E2E_TEACHER_PASSWORD أو حمولة البذرة) — لا سبيلَ إلى الدخول بجلسته',
        ).not.toBe('')

        const { token, user } = await loginViaApi(chosen.teacher_national_id, password)
        await installSession(page, token, user)
      })

      await journey.step(`فتحُ شاشة تحضير الحصة #${chosen.id}`, async () => {
        await page.goto(`/teacher/sessions/${chosen.id}`, { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByRole('heading', { name: 'الحصة', exact: true }),
          'لم تظهر ترويسة «الحصة» — إمّا أنّ الصفحة لم تُرسم، وإمّا أنّ اليوم دوامٌ عن بُعد فاستُبدلت الشاشة',
        ).toBeVisible()

        await expect(
          page.getByText(`عدد الطلاب: ${chosen.students.length}`),
          `الشاشة لم تعرض طلاب الفصل: القاعدة فيها ${chosen.students.length} طالباً نشِطاً في ${classLabel}`,
        ).toBeVisible()

        await expect(
          page.getByRole('button', { name: 'حفظ الحضور' }),
          'زرُّ «حفظ الحضور» غائبٌ أو معطّل — الحصّةُ تبدو محضَّرةً مسبقاً رغم أنّ القاعدة خاليةٌ منها',
        ).toBeEnabled()
      })

      await journey.step(`تعليمُ «${absentStudent.name}» غائباً وبقيّةُ الفصل حضور`, async () => {
        // كلُّ الطلاب يبدؤون «حاضر» افتراضاً، فضغطةٌ واحدةٌ تقلب المختار إلى غائب
        await expect(
          summaryTile(page, 'حاضر'),
          `الشاشةُ تفتح بالجميع حضوراً، فالمتوقَّع ${chosen.students.length} حاضراً قبل أيّ ضغطة`,
        ).toHaveText(String(chosen.students.length))

        const card = studentCard(page, absentStudent.name)
        await expect(card, `لم أجد بطاقة الطالب «${absentStudent.name}» في قائمة الحصة`).toHaveCount(1)
        await card.locator('button[aria-pressed]').click()

        await expect(
          summaryTile(page, 'غائب'),
          `ضغطتُ زرَّ حالة «${absentStudent.name}» فلم يصر عدّادُ الغائبين واحداً — الضغطةُ لم تُبدّل الحالة`,
        ).toHaveText('1')
        await expect(summaryTile(page, 'حاضر'), 'عدّادُ الحاضرين لم ينقص بعد تغييب طالبٍ واحد').toHaveText(
          String(chosen.students.length - 1),
        )
      })

      const saved = await journey.step('حفظُ التحضير — والخادمُ يقول ماذا حفظ', async () => {
        const response = page.waitForResponse(
          (candidate) =>
            candidate.url().includes(`/teacher/sessions/${chosen.id}/attendance`) &&
            candidate.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await page.getByRole('button', { name: 'حفظ الحضور' }).click()
        const result = await response

        const body = (await result.json()) as {
          success?: boolean
          saved_count?: number
          attendance_type?: string
          message?: string
        }

        expect(
          result.status(),
          `الخادم ردّ ${result.status()} على حفظ التحضير بدل 200. الرسالة: ${body.message ?? '(بلا رسالة)'}`,
        ).toBe(200)
        expect(body.success, `الخادم ردّ 200 بجسمٍ فاشل: ${body.message ?? '(بلا رسالة)'}`).toBe(true)
        expect(
          body.saved_count,
          `أرسلتُ ${chosen.students.length} طالباً وقال الخادمُ إنّه حفظ ${body.saved_count} — الفارقُ طلابٌ بلا سجلّ`,
        ).toBe(chosen.students.length)
        expect(
          body.attendance_type,
          'نوعُ التحضير جاء «حصّة» لا «يوميّ» رغم أنّ الفصل بلا سجلٍّ اليوم — الحصّةُ المختارة ليست نظيفة',
        ).toBe('daily')

        // الواجهة تقرأ الحفظ فتُقفل الزرّ: هذا هو إقرارُها بأنّ الأمر تمّ
        await expect(
          page.getByRole('button', { name: 'تم إرسال التحضير مسبقًا' }),
          'الخادم حفظ التحضير لكنّ الشاشة ما زالت تعرض «حفظ الحضور» — الواجهة لا تقرأ نجاح الحفظ',
        ).toBeVisible()

        return body
      })

      journey.created(
        `${saved.saved_count} سجلَّ حضورٍ للحصة #${chosen.id} بتاريخ ${scout.today} (تُحذف في نهاية الرحلة)`,
      )

      /* ══ (٢) القاعدة: هل حُفظ ما رأيناه، ولمن؟ ══ */

      await journey.step('القاعدة تحمل الحالة الصحيحة لكلّ طالبٍ باسمه', async () => {
        const rows = await phpJson<Array<{ id: number; student_id: number; status: string; school_id: number; attendance_type: string }>>(
          `\\DB::table('attendances')
            ->where('class_session_id', $__b['session'])
            ->where('attendance_date', $__b['date'])
            ->orderBy('student_id')
            ->get(['id', 'student_id', 'status', 'school_id', 'attendance_type'])`,
          { session: chosen.id, date: scout.today },
        )

        for (const row of rows) createdAttendanceIds.push(row.id)

        expect(
          rows.length,
          `حفظتُ ${chosen.students.length} طالباً فوجدتُ ${rows.length} صفّاً في القاعدة`,
        ).toBe(chosen.students.length)

        const byStudent = new Map(rows.map((row) => [Number(row.student_id), row]))

        const absentRow = byStudent.get(absentStudent.id)
        expect(absentRow, `«${absentStudent.name}» غيّبتُه في الشاشة فلم أجد له سجلّاً في القاعدة`).toBeTruthy()
        expect(
          absentRow!.status,
          `«${absentStudent.name}» علّمتُه غائباً فحُفظ بحالة «${absentRow!.status}» — الحالةُ لم تصل كما رُصدت`,
        ).toBe('absent')

        const presentRow = byStudent.get(presentStudent.id)
        expect(presentRow, `«${presentStudent.name}» تركتُه حاضراً فلم أجد له سجلّاً`).toBeTruthy()
        expect(
          presentRow!.status,
          `«${presentStudent.name}» تركتُه حاضراً فحُفظ بحالة «${presentRow!.status}»`,
        ).toBe('present')

        for (const row of rows) {
          expect(
            Number(row.school_id),
            `سجلُّ حضورٍ كُتب في المدرسة ${row.school_id} بينما الحصّة في المدرسة ${schoolId} — تسريبٌ بين المدارس`,
          ).toBe(schoolId)
        }
      })

      await journey.step('الأعدادُ زادت بالمقدار المتوقَّع — لا أكثر', async () => {
        await journey.confirm(
          sessionRows,
          () => countRows('attendances', { class_session_id: chosen.id, attendance_date: scout.today }),
          chosen.students.length,
          'حفظةٌ واحدةٌ لفصلٍ فيه هذا العدد يجب أن تُنتج سجلّاً لكلّ طالبٍ مرّةً واحدة؛ الزيادةُ فوقه تعني إرسالاً مكرَّراً.',
        )
        await journey.confirm(
          absentToday,
          () => countRows('attendances', { school_id: schoolId, attendance_date: scout.today, status: 'absent' }),
          1,
          'غيّبنا طالباً واحداً، فعددُ الغياب في المدرسة اليوم يجب أن يزيد واحداً بالضبط.',
        )
      })

      /* ══ (٣) إعادةُ الفتح: هل تعرض الشاشة ما حُفظ؟ ══ */

      await journey.step('إعادةُ فتح الشاشة تُظهر ما حُفظ لا صفحةً فارغة', async () => {
        await page.goto(`/teacher/sessions/${chosen.id}`, { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByRole('button', { name: 'تم إرسال التحضير مسبقًا' }),
          'فتحتُ الشاشة من جديد فعرضت «حفظ الحضور» كأنّ التحضير لم يُرسل — الحالةُ المحفوظة لا تُقرأ عند الفتح',
        ).toBeVisible()

        // العدّاد المُعاد بناؤه من الخادم لا من ذاكرة الصفحة: هو الدليل على القراءة
        await expect(
          summaryTile(page, 'غائب'),
          `أعدتُ فتح الشاشة فلم تُظهر غياب «${absentStudent.name}» — الشاشةُ تعود بالجميع حضوراً وتكذب على المعلّم`,
        ).toHaveText('1')
        await expect(summaryTile(page, 'حاضر'), 'عددُ الحاضرين بعد إعادة الفتح لا يطابق ما حُفظ').toHaveText(
          String(chosen.students.length - 1),
        )

        await expect(
          studentCard(page, absentStudent.name).locator('button[aria-pressed="true"]'),
          `بطاقة «${absentStudent.name}» لا تحمل علامة الغياب بعد إعادة الفتح`,
        ).toHaveCount(1)
      })

      /* ══ (٤) مكانٌ آخر: تقريرُ الإدارة ══ */

      await journey.step('الانتقالُ إلى جلسة الإدارة', async () => {
        const payload = await bridge.get<{ user: Record<string, unknown> }>('auth/me')
        await installSession(page, tokenOf('admin'), payload.user)
      })

      const recordRow = page
        .locator('table.ws-table tbody tr')
        .filter({ hasText: chosen.teacher_name })
        .filter({ hasText: classLabel })

      await journey.step('السجلُّ الجديد يظهر في «تقارير الحضور» عند الإدارة', async () => {
        await page.goto('/admin/attendance', { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByRole('heading', { name: 'تقارير الحضور' }),
          'لم تظهر ترويسة «تقارير الحضور» — الصفحة لم تُرسم أو قذفت المستخدم',
        ).toBeVisible()

        await expect(
          recordRow,
          `رصدتُ تحضيراً للمعلّم «${chosen.teacher_name}» في ${classLabel} اليوم فلم يظهر له صفٌّ في تقارير الحضور — ` +
            'الرصدُ لا ينعكس في التقرير، وهو العطلُ الصامت الذي نبحث عنه',
        ).toHaveCount(1)

        await expect(
          recordRow,
          `صفُّ السجلّ لا يعرض عدد الطلاب الصحيح (${chosen.students.length})`,
        ).toContainText(String(chosen.students.length))

        await recordRow.click()
      })

      const statsBlock = workspaceBlock(page, 'إحصائيات الحصة')
      const absentChip = statsBlock.locator('.ws-chip').filter({ hasText: 'غائب' })
      const presentChip = statsBlock.locator('.ws-chip').filter({ hasText: 'حاضر' })

      await journey.step('تفاصيلُ السجلّ تعرض الغائبَ باسمه وإحصاءً مطابقاً', async () => {
        await expect(
          statsBlock,
          'اخترتُ السجلّ فلم يظهر بلوك «إحصائيات الحصة» — لوحُ التفاصيل لم يُحمَّل',
        ).toBeVisible()

        expect(
          await readDisplayedNumber(absentChip),
          `غيّبتُ طالباً واحداً فأظهر التقريرُ عدداً مخالفاً في شارة «غائب» (${await absentChip.innerText()})`,
        ).toBe(1)
        expect(
          await readDisplayedNumber(presentChip),
          'عددُ الحاضرين في إحصاء التقرير لا يطابق ما رُصد',
        ).toBe(chosen.students.length - 1)

        const studentsBlock = workspaceBlock(page, 'قائمة الطلاب')
        const absentRow = studentsBlock.locator('.ws-row').filter({ hasText: absentStudent.name })
        await expect(
          absentRow,
          `«${absentStudent.name}» غائبٌ في القاعدة فلم يظهر في قائمة طلاب السجلّ`,
        ).toHaveCount(1)
        await expect(absentRow, `«${absentStudent.name}» يظهر في التقرير بحالةٍ غير «غائب»`).toContainText('غائب')
      })

      /* ══ (٥) التبديل: غائبٌ ← حاضر، والعدّادُ ينقص ══ */

      await journey.step(`تبديلُ «${absentStudent.name}» من غائبٍ إلى حاضرٍ من الإدارة`, async () => {
        const studentsBlock = workspaceBlock(page, 'قائمة الطلاب')
        await studentsBlock.locator('.ws-row').filter({ hasText: absentStudent.name }).click()

        const modal = page.locator('.ws-modal')
        await expect(modal, 'لم ينفتح حوارُ «تغيير حالة الطالب» بعد الضغط على الطالب').toBeVisible()
        await expect(modal, 'الحوار انفتح على طالبٍ غير الذي ضغطتُه').toContainText(absentStudent.name)

        await modal.locator('.ws-choice').filter({ hasText: 'حاضر' }).click()

        const response = page.waitForResponse(
          (candidate) =>
            candidate.url().includes('/admin/attendance-reports/') &&
            candidate.url().includes('/update-status') &&
            candidate.request().method() === 'POST',
          { timeout: 30_000 },
        )
        await modal.getByRole('button', { name: 'تأكيد التغيير' }).click()
        const result = await response

        expect(
          result.status(),
          `الخادم ردّ ${result.status()} على تبديل الحالة بدل 200: ${(await result.text()).slice(0, 300)}`,
        ).toBe(200)

        await expect(page.locator('.ws-modal'), 'الحوار بقي مفتوحاً بعد نجاح التبديل').toBeHidden()
      })

      await journey.step('العدّادُ نقص — في الواجهة وفي القاعدة', async () => {
        await expect(
          absentChip,
          `بدّلتُ «${absentStudent.name}» إلى حاضر فبقيت شارةُ الغياب كما كانت — التقريرُ لا يتبع التعديل`,
        ).toContainText('غائب 0')
        await expect(presentChip, 'شارةُ الحاضرين لم تزد بعد التبديل').toContainText(
          `حاضر ${chosen.students.length}`,
        )

        // القاعدةُ هي الحَكَم: واجهةٌ تعرض نجاحاً ولا تحفظ عطلٌ شائع
        const stored = await firstRow<{ status: string }>('attendances', {
          class_session_id: chosen.id,
          student_id: absentStudent.id,
          attendance_date: scout.today,
        })
        expect(stored, 'سجلُّ الطالب اختفى من القاعدة بعد التبديل').not.toBeNull()
        expect(
          stored!.status,
          `الواجهة أعلنت التبديل بينما القاعدة ما زالت تحمل «${stored?.status}» — الحفظ لم يصل`,
        ).toBe('present')

        /* العودةُ إلى نقطة البداية: كان الغيابُ اليومَ س، صار س+١ بعد الرصد،
           ويجب أن يعود س بعد التبديل. فرقٌ صفريٌّ عن القياس الأوّل هو الدليل
           على أنّ العدّاد نقص فعلاً لا أنّه توقّف عن الزيادة. */
        await journey.confirm(
          absentToday,
          () => countRows('attendances', { school_id: schoolId, attendance_date: scout.today, status: 'absent' }),
          0,
          'غيّبنا طالباً ثمّ أعدناه حاضراً، فعددُ الغياب اليوم يجب أن يرجع إلى ما كان عليه قبل الرحلة.',
        )
      })

      /* ══ (٦) الأثر الخارجيّ: الرقمان صراحةً ══ */

      await journey.step('لم تخرج رسالةُ واتساب واحدة', async () => {
        await journey.confirm(
          whatsapp,
          () => countRows('whatsapp_messages'),
          0,
          'رصدُ الغياب وتبديلُ الحالة كلاهما قد يُنشئ رسالةً لوليّ الأمر؛ ' +
            'وإعدادُ المدرسة send_absence_sms مُطفأ فيجب ألّا يُسجَّل شيء.',
        )
      })
    } finally {
      /* ── التنظيف ──
         عبر واجهة التطبيق لا باستعلامٍ خام: ما يحذفه التطبيقُ يحذفه بقيوده
         وبعلاقاته. والفشلُ هنا لا يُسقط الرحلة — لكنه يُذكر كي لا يُقرأ عطلاً
         في التشغيل التالي حين تجد الحصّةُ نفسَها محضَّرةً مسبقاً. */
      if (admin) {
        const failures: string[] = []

        for (const id of createdAttendanceIds) {
          const response = await admin.delete(apiUrl(`admin/attendance-management/${id}`)).catch(() => null)
          if (!response || !response.ok()) {
            failures.push(`سجلُّ الحضور ${id} (${response ? response.status() : 'تعذّر النداء'})`)
          }
        }

        if (remoteDayToRestore) {
          const response = await admin
            .post(apiUrl('admin/remote-attendance/activate'), { data: remoteDayToRestore })
            .catch(() => null)
          if (!response || !response.ok()) {
            failures.push(`إعادةُ يوم الدوام عن بُعد ${remoteDayToRestore.date}`)
          }
        }

        if (failures.length > 0) {
          journey.note(`تعذّر تنظيفُ بعض ما أنشأته الرحلة: ${failures.join('، ')}. احذفه يدوياً قبل التشغيل التالي.`)
        } else if (createdAttendanceIds.length > 0) {
          journey.note(`نُظّف: حُذفت ${createdAttendanceIds.length} سجلَّ حضورٍ أنشأتها الرحلة.`)
        }

        await admin.dispose()
      }

      /* ── إعادةُ المُستعار ──
         **بعد** حذف ما أنشأناه لا قبله: إعادةُ سجلّاتِ اليومِ الأصليةِ بينما
         سجلّاتُنا قائمة تجعل للطالب سجلَّين في اليوم نفسِه للحظة.
         وتقع هذه الإعادةُ خارج شرط `admin` عمداً: الاستعارةُ لا تمرّ بجلسة
         الإدارة، فلا يجوز أن يمنعَ تعذّرُ إنشائها إعادةَ ما رفعناه. */
      if (borrowedRows.length > 0) {
        const restored = await restoreRows(borrowedRows).catch(() => -1)
        journey.note(
          restored === borrowedRows.length
            ? `أُعيدت ${restored} سجلَّ حضورٍ مبذورٍ رُفعت مؤقّتاً — القاعدةُ عادت كما كانت.`
            : `⚠ تعذّرت إعادةُ سجلّات الحضور المُستعارة (أُعيد ${restored} من ${borrowedRows.length}). ` +
              `أعد بذر القاعدة قبل الاعتماد على أرقام ${borrowedDate}.`,
        )
      }

      await api?.dispose()
    }
  })
})
