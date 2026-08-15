/**
 * جسرٌ إلى قاعدة الاختبار — الوجهُ الثاني لكلّ تحقّق.
 *
 * ══ لماذا نحتاج قراءةً من القاعدة أصلاً؟ ══
 * لأن الواجهة تكذب أحياناً. زرٌّ يُضغط، ويظهر «تم الحفظ بنجاح»، ولا يُكتب شيء:
 * إمّا لأن الاستجابة لم تُقرأ، أو لأن المعاملة ارتدّت، أو لأن الحفظ ذهب إلى
 * مدرسةٍ أخرى. ومَن يتحقّق من الواجهة وحدها لا يرى شيئاً من ذلك.
 *
 * فكلُّ رحلةٍ تتحقّق من **وجهين**: ما يراه المستخدم، وما استقرّ في القاعدة.
 *
 * ══ لماذا artisan tinker لا عميلُ MySQL من node؟ ══
 * لأن جرَّ حزمة `mysql2` إلى مستودع الفرونت لأجل عدّة اختبارٍ ثمنٌ غالٍ: تبعيةٌ
 * جديدة في package.json تسافر مع كلّ تثبيت، وبيانات اتصالٍ تُكرَّر في مكانين
 * فتتباعد عن `.env` الباك بعد أوّل تعديل. أمّا tinker فيُقلع لارافل بإعداده
 * الحقيقيّ — فما نقرؤه هو ما يراه التطبيق نفسه، بالاتصال نفسه والقاعدة نفسها.
 *
 * ثمنُه: نحو ثانيةٍ ونصف لكلّ نداء. ولذلك **تُجمَّع القراءات في نداءٍ واحد**
 * (انظر `readEffects`) بدل نداءٍ لكلّ عدّاد.
 */

import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { FRONTEND_ROOT } from '../../config/crawler.config'

const execFileAsync = promisify(execFile)

/** جذر مستودع الباك — الفرونت مستودعٌ متداخلٌ داخله */
export const BACKEND_ROOT = path.resolve(FRONTEND_ROOT, '..')

/**
 * قاعدة الاختبار. اسمُها شرطٌ لا إعداد: كلُّ نداءٍ يمرّ من هنا يُحقن بهذا
 * الاسم عبر `DB_DATABASE`، فلا يمكن لاستعلامٍ أن يتسرّب إلى قاعدة التطوير
 * ولو نُسي المتغيّر في الطرفية.
 */
export const TEST_DATABASE = process.env.E2E_DB ?? 'attendance_system_test'

/**
 * حارسُ الاسم — يُنفَّذ قبل أوّل استعلام.
 *
 * الرحلات **تكتب**. وقاعدةٌ لا ينتهي اسمُها بـ`_test` قد تكون قاعدة التطوير
 * التي فيها بيانات مدارسَ حقيقية. فالرفض هنا مطلقٌ ولا يُتجاوز بعَلَم.
 */
function assertTestDatabase(): void {
  if (!TEST_DATABASE.endsWith('_test')) {
    throw new Error(
      [
        `توقّف: قاعدة الرحلات «${TEST_DATABASE}» لا ينتهي اسمُها بـ_test.`,
        'رحلات الاختبار تكتب بياناتٍ حقيقية — ولن تعمل إلا على قاعدة اختبار.',
        'اضبط E2E_DB على قاعدةٍ تنتهي بـ_test، أو اترك الافتراضي attendance_system_test.',
      ].join('\n'),
    )
  }
}

/**
 * يستخرج أوّل كائن/مصفوفة JSON من خرج tinker.
 *
 * لماذا لا نكتفي بـ`JSON.parse(stdout)`؟ لأن الخرج قد يسبقه تحذيرُ إهمالٍ من
 * PHP أو سطرُ بيئةٍ من لارافل. ولو أسقطنا القراءة لأجل سطرٍ عابر لظهر «تعذّر
 * قياس الأثر» في تقريرٍ عن نظامٍ سليم — وهو إنذارٌ كاذبٌ يُفقد الثقةَ بالعدّة.
 */
function extractJson(raw: string): string {
  const firstBrace = raw.indexOf('{')
  const firstBracket = raw.indexOf('[')
  const candidates = [firstBrace, firstBracket].filter((index) => index >= 0)
  if (candidates.length === 0) return raw.trim()

  const start = Math.min(...candidates)
  const lastBrace = raw.lastIndexOf('}')
  const lastBracket = raw.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)
  if (end <= start) return raw.trim()

  return raw.slice(start, end + 1)
}

/**
 * ينفّذ تعبير PHP على قاعدة الاختبار ويُرجع نتيجته مفكوكةً من JSON.
 *
 * التعبير **لا يأتي من بيانات المستخدم إطلاقاً** — هو نصٌّ مكتوبٌ في ملفّات
 * الرحلات. ومَن أراد تمرير قيمةٍ متغيّرةٍ فليمرّرها في `bindings` لا بلصقها
 * في النصّ: الالتصاق يكسر أوّل اسمٍ فيه علامةُ اقتباسٍ عربية.
 *
 * @param phpExpression تعبيرٌ يُقيَّم ويُطبع بـ json_encode — مثل: `['n' => \DB::table('students')->count()]`
 * @param bindings قيمٌ تُحقن بأمانٍ عبر `$__b['key']` داخل التعبير
 */
export async function phpJson<T>(phpExpression: string, bindings: Record<string, unknown> = {}): Promise<T> {
  assertTestDatabase()

  // الحقن عبر json_decode: أيُّ نصٍّ عربيّ أو علامةُ اقتباسٍ تمرّ سالمةً،
  // لأنها تعبر كسلسلة JSON مُهرَّبةٍ لا كشيفرة PHP.
  const encodedBindings = JSON.stringify(JSON.stringify(bindings))
  const code = `$__b = json_decode(${encodedBindings}, true); echo json_encode(${phpExpression});`

  let stdout: string
  try {
    const result = await execFileAsync('php', ['artisan', 'tinker', '--execute', code], {
      cwd: BACKEND_ROOT,
      env: { ...process.env, DB_DATABASE: TEST_DATABASE },
      encoding: 'utf8',
      timeout: 90_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    })
    stdout = result.stdout
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      [
        'تعذّر الاستعلام عن قاعدة الاختبار عبر artisan tinker.',
        `القاعدة: ${TEST_DATABASE} · المجلّد: ${BACKEND_ROOT}`,
        'تأكّد أنّ php في المسار وأنّ القاعدة مُهيّأة: php artisan test:setup-database',
        `التفصيل: ${message.split('\n').slice(0, 3).join(' | ')}`,
      ].join('\n'),
    )
  }

  const json = extractJson(stdout)
  try {
    return JSON.parse(json) as T
  } catch {
    throw new Error(
      [
        'خرجُ tinker ليس JSON صالحاً — التعبير ربّما أخطأ.',
        `التعبير: ${phpExpression.slice(0, 200)}`,
        `الخرج: ${stdout.slice(0, 400)}`,
      ].join('\n'),
    )
  }
}

/** عدّ صفوفٍ بشرطٍ اختياريّ — أكثرُ استعمالاتِ الجسر شيوعاً */
export async function countRows(table: string, where: Record<string, string | number> = {}): Promise<number> {
  const result = await phpJson<{ n: number }>(
    `['n' => \\DB::table($__b['table'])->where($__b['where'])->count()]`,
    { table, where },
  )
  return result.n
}

/** صفٌّ واحدٌ بشرط — يُرجع null إن لم يوجد. للتحقّق من أنّ ما حُفظ هو ما أُدخل. */
export async function firstRow<T = Record<string, unknown>>(
  table: string,
  where: Record<string, string | number>,
): Promise<T | null> {
  const result = await phpJson<{ row: T | null }>(
    `['row' => \\DB::table($__b['table'])->where($__b['where'])->first()]`,
    { table, where },
  )
  return result.row ?? null
}
