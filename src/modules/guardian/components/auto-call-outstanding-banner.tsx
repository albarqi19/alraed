import { AutoCallAcknowledgeCard } from './auto-call-acknowledge-card'
import {
  useGuardianAutoCallQueueQuery,
  useGuardianAutoCallSettingsQuery,
} from '../hooks/use-guardian-auto-call'

/**
 * شريطُ النداء القائم — يعلو كلَّ صفحات البوّابة ما دام هناك ما يُقرّ.
 *
 * الشرط الأهمّ في هذه الميزة ليس الزرَّ نفسه بل بقاءه بعد إعادة التحميل:
 * وليُّ الأمر ينادي، ثمّ يضع جوّاله في جيبه ويمشي إلى ابنه، ثمّ يعود فيجد
 * الصفحة قد أُعيد بناؤها وذهبت حالةُ React كلّها. لو كان الزرّ حبيسَ لوحةٍ
 * تُفتح بضغطتين من صفحة «الخدمات» لضاع منه، ولانتهت المهلة، ولسُجّلت عليه
 * مخالفةٌ لا ذنب له فيها. فالطابور يُقرأ من الخادم عند الإقلاع، ويُعرض حيث
 * تقع عليه العين أوّلاً.
 *
 * ولا يُعرض شيءٌ إطلاقاً حين لا نداء: الشريط ينعدم فلا يشغل بكسلاً واحداً.
 */
export function GuardianAutoCallOutstandingBanner() {
  // الإعدادات تُقرأ أوّلاً لا الطابور: أكثر المدارس لم تفتح هذه الخدمة أصلاً،
  // وسؤالُ الطابور في كلّ إقلاعٍ عندها طلبٌ لا يعود بشيء أبداً. وهذه القراءة
  // نفسها هي التي تستعملها لوحة النداء لاحقاً — مفتاحٌ واحد ونسخةٌ واحدة.
  const settingsQuery = useGuardianAutoCallSettingsQuery(true)

  // تعذّر قراءة الإعدادات لا يعني «لا خدمة»: قد يكون عطلاً عابراً في طلبٍ
  // ثانويّ، والثمن هنا مخالفةٌ تُسجَّل على وليّ أمرٍ لم يُعرض له زرّه. فحين
  // نجهل، نسأل الطابور — وهو الحَكَم على كلّ حال.
  //
  // ثغرةٌ معلومة لم تُسدّ هنا: لو أطفأ الأدمن الخدمة ووليُّ أمرٍ له نداءٌ
  // قائم، عاد `enabled` كاذباً خلال دقيقة فيكفّ الشريط عن السؤال ويختفي من
  // فوق الصفحات — والنداء ما زال في الطابور ومهلته تجري. يبقى الزرّ حينئذٍ
  // في لوحة «النداء الآلي» (تقرأ الطابور بفتحها بلا شرط)، أي على بُعد نقرتين
  // لا في أوّل ما تقع عليه العين. سدُّها يحتاج قراءةً من ذاكرة الاستعلام قبل
  // تشغيله، وهو تعقيدٌ لا يُجرَّب إلا في متصفّح.
  const shouldReadQueue = settingsQuery.data?.enabled === true || settingsQuery.isError

  const queueQuery = useGuardianAutoCallQueueQuery(shouldReadQueue)
  const outstandingCalls = queueQuery.data ?? []

  if (outstandingCalls.length === 0) {
    return null
  }

  return (
    <div className="border-b border-amber-200 bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/70">
      <div className="mx-auto max-w-2xl space-y-2 px-4 py-3">
        <p className="text-center text-xs font-bold text-amber-900 dark:text-amber-200">
          {outstandingCalls.length === 1
            ? 'لديك نداءٌ لم تؤكّد استلامه بعد'
            : `لديك ${outstandingCalls.length} نداءات لم تؤكّد استلامها بعد`}
        </p>

        {outstandingCalls.map((call) => (
          <AutoCallAcknowledgeCard key={call.id} entry={call} variant="slim" />
        ))}

        <p className="text-center text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
          النداء الذي تنتهي مهلته بلا تأكيد يُحتسب مخالفة، وثلاث مخالفات توقف الخدمة يوماً كاملاً.
        </p>
      </div>
    </div>
  )
}
