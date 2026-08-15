/**
 * عدّادُ الآثار الخارجية — شرطُ المالك الصريح، ومقدّمةُ كلّ رحلةٍ تكتب.
 *
 * ══ الخطر ══
 * الرحلات تكتب بياناتٍ حقيقية. وبعضُ ما نكتبه يُطلق أثراً **يغادر الجهاز**:
 * تسجيلُ مدرسةٍ يُدرج مهمّةَ ترحيبٍ عبر واتساب، وتسجيلُ غيابٍ يُنبّه وليَّ أمر،
 * وإشعارٌ يُدفع إلى هاتف. ورسالةٌ واحدة تصل إلى وليّ أمرٍ حقيقيّ من اختبارٍ
 * آليّ **عطلٌ جسيم** لا يُصلحه اعتذار.
 *
 * ══ الجواب ══
 * لا نفترض السلامة، بل **نقيسها**: نعدّ صفوف `whatsapp_messages` والمهامَّ
 * المصطفّة قبل الرحلة وبعدها، ونُبلغ بالرقمين في التقرير. فإن خرجت رسالةٌ
 * واحدة ظهرت في الفرق، وسقطت الرحلة، وقُرئ السببُ بلا تخمين.
 *
 * ══ التمييز الذي يجب ألّا يُخلط ══
 * «مهمّةٌ اصطفّت في الطابور» ليست «رسالةٌ خرجت». الطابور في بيئة الاختبار
 * `database` بلا عاملٍ يعمل عليه — فالصفّ يمتلئ ولا يُنفَّذ منه شيء. لكنّه
 * **أثرٌ كامن**: لو شغّل أحدٌ `queue:work` على قاعدة الاختبار لخرجت الرسائل.
 * فنعدّه ونذكره صراحةً، ونطالب كلَّ رحلةٍ بأن تُعلن ما تتوقّع اصطفافه.
 */

import { phpJson } from './php-bridge'

/** لقطةُ عدّادات الأثر في لحظةٍ ما */
export interface EffectsSnapshot {
  /** صفوف whatsapp_messages — الرسائل المسجَّلة. أيُّ زيادةٍ هنا **عطل**. */
  whatsappMessages: number
  /** مهامٌّ مصطفّةٌ في الطابور بانتظار عاملٍ لا يعمل */
  queuedJobs: number
  /** توزيعُ المصطفّ على الطوابير — يكشف أيُّ قناةٍ تحرّكت */
  jobsByQueue: Record<string, number>
  /** مهامٌّ فشلت — زيادتُها تعني أنّ عاملاً **يعمل** فعلاً على قاعدة الاختبار */
  failedJobs: number
  takenAt: string
}

/** فرقُ لقطتين */
export interface EffectsDelta {
  whatsappMessages: number
  queuedJobs: number
  failedJobs: number
  /** الطوابير التي زادت، ومقدارُ زيادتها */
  queuesTouched: Array<{ queue: string; added: number }>
  /** هل خرج شيءٌ لا يُغتفر؟ */
  hasLeak: boolean
}

interface RawEffects {
  whatsapp_messages: number
  jobs: number
  jobs_by_queue: Record<string, number> | unknown[]
  failed_jobs: number
}

/**
 * يقرأ كلَّ العدّادات في **نداءٍ واحد**.
 *
 * النداء الواحد ليس تحسيناً تجميلياً: إقلاعُ tinker يكلّف نحو ثانيةٍ ونصف،
 * وأربعةُ نداءاتٍ في رحلتين تعني اثنتي عشرة ثانيةً تضيع في كل تشغيل. والأهمّ:
 * القراءةُ الواحدة **متّسقة** — أربعُ قراءاتٍ متفرّقةٍ قد تقع بينها كتابة.
 */
export async function readEffects(): Promise<EffectsSnapshot> {
  const raw = await phpJson<RawEffects>(
    `[
      'whatsapp_messages' => \\Illuminate\\Support\\Facades\\Schema::hasTable('whatsapp_messages')
        ? \\DB::table('whatsapp_messages')->count() : -1,
      'jobs' => \\Illuminate\\Support\\Facades\\Schema::hasTable('jobs')
        ? \\DB::table('jobs')->count() : -1,
      'jobs_by_queue' => \\Illuminate\\Support\\Facades\\Schema::hasTable('jobs')
        ? \\DB::table('jobs')->select('queue', \\DB::raw('count(*) as aggregate'))
            ->groupBy('queue')->pluck('aggregate', 'queue')
        : [],
      'failed_jobs' => \\Illuminate\\Support\\Facades\\Schema::hasTable('failed_jobs')
        ? \\DB::table('failed_jobs')->count() : -1,
    ]`,
  )

  return {
    whatsappMessages: raw.whatsapp_messages,
    queuedJobs: raw.jobs,
    jobsByQueue: normalizeQueueMap(raw.jobs_by_queue),
    failedJobs: raw.failed_jobs,
    takenAt: new Date().toISOString(),
  }
}

/**
 * `pluck` على مجموعةٍ فارغة يُرجع `[]` لا `{}` في JSON — وهي الحالة الطبيعية
 * (طابورٌ فارغ). فنُوحّد الشكل بدل أن ينهار القارئ على مصفوفةٍ يتوقّع كائناً.
 */
function normalizeQueueMap(value: Record<string, number> | unknown[]): Record<string, number> {
  if (Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [queue, count] of Object.entries(value)) {
    out[queue] = Number(count) || 0
  }
  return out
}

/** يحسب الفرق بين لقطتين */
export function effectsDelta(before: EffectsSnapshot, after: EffectsSnapshot): EffectsDelta {
  const queuesTouched: Array<{ queue: string; added: number }> = []
  const queues = new Set([...Object.keys(before.jobsByQueue), ...Object.keys(after.jobsByQueue)])
  for (const queue of queues) {
    const added = (after.jobsByQueue[queue] ?? 0) - (before.jobsByQueue[queue] ?? 0)
    if (added !== 0) queuesTouched.push({ queue, added })
  }
  queuesTouched.sort((a, b) => b.added - a.added)

  const whatsappMessages = after.whatsappMessages - before.whatsappMessages
  const failedJobs = after.failedJobs - before.failedJobs

  return {
    whatsappMessages,
    queuedJobs: after.queuedJobs - before.queuedJobs,
    failedJobs,
    queuesTouched,
    // التسريب الحقيقيّ شيئان: رسالةٌ سُجّلت، أو مهمّةٌ **فشلت** — وفشلُ مهمّةٍ
    // يعني أنّ عاملاً التقطها وحاول تنفيذها، أي أنّ الطابور حيٌّ لا خامد.
    hasLeak: whatsappMessages > 0 || failedJobs > 0,
  }
}

/**
 * جملةٌ عربيةٌ تصف الأثر — تُكتب في التقرير كما هي.
 * الأرقام قبل/بعد لا الفرق وحده: «كان صفراً فصار صفراً» أبلغُ من «لا تغيير».
 */
export function describeEffects(before: EffectsSnapshot, after: EffectsSnapshot): string {
  const delta = effectsDelta(before, after)
  const parts: string[] = [
    `رسائل واتساب مسجَّلة: ${before.whatsappMessages} ← ${after.whatsappMessages}`,
  ]

  if (delta.queuedJobs !== 0) {
    const queues = delta.queuesTouched.map((q) => `${q.queue}${q.added > 0 ? '+' : ''}${q.added}`).join('، ')
    parts.push(`مهامُّ الطابور: ${before.queuedJobs} ← ${after.queuedJobs} (${queues})`)
  } else {
    parts.push(`مهامُّ الطابور: ${before.queuedJobs} ← ${after.queuedJobs} (بلا تغيير)`)
  }

  if (delta.failedJobs !== 0) {
    parts.push(`مهامٌّ فاشلة: ${before.failedJobs} ← ${after.failedJobs} ⚠ عاملُ الطابور يعمل!`)
  }

  return parts.join(' · ')
}

/**
 * يبني رسالة العطل حين يتسرّب أثر.
 * تُصاغ بلغةِ الحادثة لا بلغةِ التأكيد: من يقرأها في منتصف الليل يجب أن يعرف
 * فوراً أنّ شيئاً خرج، وأين ينظر.
 */
export function leakMessage(before: EffectsSnapshot, after: EffectsSnapshot): string {
  const delta = effectsDelta(before, after)
  const lines = ['أثرٌ خارجيٌّ غادر بيئة الاختبار أثناء هذه الرحلة:']

  if (delta.whatsappMessages > 0) {
    lines.push(
      `  • سُجّلت ${delta.whatsappMessages} رسالة واتساب جديدة ` +
        `(كانت ${before.whatsappMessages} فصارت ${after.whatsappMessages}). ` +
        'إن كانت أرقامُ أولياء الأمور في البذرة أرقاماً حقيقيةً فقد وصلت الرسالة فعلاً.',
    )
  }
  if (delta.failedJobs > 0) {
    lines.push(
      `  • فشلت ${delta.failedJobs} مهمّةٍ في الطابور — وفشلُها يعني أنّ عاملاً ` +
        'التقطها وحاول تنفيذها. الطابور حيٌّ على قاعدة الاختبار: أوقفه قبل أيّ تشغيلٍ آخر.',
    )
  }

  lines.push('', 'أوقف الرحلات، وتحقّق من: QUEUE_CONNECTION، ووجود queue:work عاملٍ على قاعدة الاختبار.')
  return lines.join('\n')
}
