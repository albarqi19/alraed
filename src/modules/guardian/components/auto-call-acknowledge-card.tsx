import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Megaphone } from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
import type { GuardianAutoCallEntry } from '../auto-call-api'
import {
  describeAcknowledgeFailure,
  useAcknowledgeGuardianAutoCallMutation,
} from '../hooks/use-guardian-auto-call'

/**
 * بطاقة «استلمتُ ابني» — الفعل الذي كان النظام يعاقب على تركه ولا يتيحه.
 *
 * كان وليُّ الأمر ينادي، ويخرج ابنه، ويستلمه، ثم تنتهي المهلة فتُسجَّل عليه
 * مخالفة لأنه لم يضغط زرّاً لا وجود له؛ وثلاثُ مخالفاتٍ تحجب عنه الخدمة يوماً
 * كاملاً. فالبطاقة هذه ليست تحسيناً في الواجهة، بل الطرفُ المفقود من عقوبةٍ
 * كانت قائمةً بلا وسيلةٍ للنجاة منها.
 *
 * ولذلك تُستعمل في موضعين: داخل لوحة النداء في صفحة الخدمات، وفي الشريط
 * المقيم فوق كلّ صفحات البوّابة — كي لا يتوقّف إغلاق الطلب على أن يتذكّر
 * وليُّ الأمر أين كان الزرّ.
 */

interface AutoCallAcknowledgeCardProps {
  entry: GuardianAutoCallEntry
  /** `full` داخل اللوحة، و`slim` في الشريط العلويّ وفي نداءات الإخوة. */
  variant?: 'full' | 'slim'
  onAcknowledged?: (entry: GuardianAutoCallEntry) => void
}

/**
 * ما تبقّى من المهلة.
 *
 * الرقم يجعل الخطر ملموساً: «يتبقّى 3:12» تدفع إلى الضغط، و«نداء قائم» وحدها
 * لا تقول متى يتحوّل إلى مخالفة. وحين يتعذّر قراءة الوقت لا نخترع عدّاً —
 * عدّادٌ كاذب أسوأ من لا عدّاد.
 */
function useRemaining(expiresAt: string | null): { label: string; isOverdue: boolean } | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) return null

  const deadline = new Date(expiresAt).getTime()
  if (!Number.isFinite(deadline)) return null

  const remainingMs = deadline - now
  if (remainingMs <= 0) {
    return { label: 'انتهت المهلة', isOverdue: true }
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return { label: `يتبقّى ${minutes}:${String(seconds).padStart(2, '0')}`, isOverdue: false }
}

/** «نُودي عليه مرّتين» تطمئن أن النداء سُمع؛ والرقم المجرّد لا يطمئن. */
function formatAnnouncements(count: number): string {
  if (count <= 0) return 'طلبك في الطابور'
  if (count === 1) return 'نُودي عليه مرّة'
  if (count === 2) return 'نُودي عليه مرّتين'
  if (count <= 10) return `نُودي عليه ${count} مرّات`
  return `نُودي عليه ${count} مرّة`
}

export function AutoCallAcknowledgeCard({
  entry,
  variant = 'full',
  onAcknowledged,
}: AutoCallAcknowledgeCardProps) {
  const toast = useToast()
  const acknowledgeMutation = useAcknowledgeGuardianAutoCallMutation()

  const [isConfirming, setIsConfirming] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const remaining = useRemaining(entry.expiresAt)
  const studentName = entry.studentName || 'ابنك'
  const isSlim = variant === 'slim'

  const isPending = acknowledgeMutation.isPending

  // السؤال المعلّق لا يبقى معلّقاً إلى الأبد: من فتح البطاقة ثم انشغل بابنه
  // يعود فيجد الزرّ كما تركه، لا سؤالاً قد تُصيبه إبهامُه سهواً وهو يمشي.
  //
  // ولا ينسحب السؤال والطلبُ في الطريق: انسحابه حينئذٍ يُظهر زرّ «استلمتُ»
  // من جديد فيضغطه وليُّ الأمر ظانّاً أن ضغطته الأولى ضاعت، فيذهب طلبٌ ثانٍ
  // يردّه الخادم ٤٠٩ ويربكه بلا سبب.
  useEffect(() => {
    if (!isConfirming || isPending) return
    const timer = window.setTimeout(() => setIsConfirming(false), 12_000)
    return () => window.clearTimeout(timer)
  }, [isConfirming, isPending])

  const handleConfirm = () => {
    setFailure(null)
    acknowledgeMutation.mutate(entry.id, {
      onSuccess: () => {
        setIsConfirming(false)
        toast({
          type: 'success',
          title: 'تمّ — نتمنّى لكم يوماً طيباً',
          description: `أُغلق طلب مناداة ${studentName}.`,
        })
        onAcknowledged?.(entry)
      },
      onError: (error) => {
        // نعود إلى الزرّ لا إلى السؤال: الفشل قد يكون شبكةً منقطعة، والمطلوب
        // إعادة المحاولة بضغطةٍ واضحة لا تأكيدٌ معلّقٌ لا يعرف صاحبه أوقع أم لا.
        setIsConfirming(false)

        const message = describeAcknowledgeFailure(error)
        setFailure(message)

        // ولماذا تنبيهٌ عائم مع الرسالة الملتصقة؟ لأن بعض حالات الفشل تُزيل
        // البطاقة نفسها: «أُقرّ سلفاً» و«لم يعد موجوداً» يعيدان قراءة الطابور
        // فيختفي الصفّ ومعه رسالته قبل أن تُقرأ. التنبيه يبقى بعدها فيفهم
        // وليُّ الأمر لماذا اختفى الزرّ من تحت إصبعه.
        toast({ type: 'error', title: message })
      },
    })
  }

  return (
    <div
      className={
        isSlim
          ? 'rounded-2xl border border-amber-300 bg-white/80 p-3 dark:border-amber-700/70 dark:bg-slate-900/50'
          : 'rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/60'
      }
    >
      {/* من ينادَى، وكم بقي له */}
      <div className="flex items-start gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm dark:bg-amber-600 ${
            isSlim ? 'h-9 w-9' : 'h-11 w-11'
          }`}
        >
          <Megaphone className={isSlim ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`font-bold text-amber-900 dark:text-amber-200 ${
              isSlim ? 'text-sm' : 'text-base'
            }`}
          >
            نداءٌ قائم لـ{studentName}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-amber-700 dark:text-amber-300/90">
            <span>{formatAnnouncements(entry.announcedCount)}</span>
            {remaining && (
              <>
                <span aria-hidden>•</span>
                <span className={remaining.isOverdue ? 'font-bold text-rose-600 dark:text-rose-400' : 'font-semibold'}>
                  {remaining.label}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* الفعل: ضغطةٌ تفتح السؤال، وضغطةٌ تُغلق الطلب — لا إقرارَ بالخطأ */}
      <div className="mt-3">
        {isConfirming ? (
          <div className="space-y-2">
            <p
              className={`text-center font-bold text-amber-900 dark:text-amber-200 ${
                isSlim ? 'text-sm' : 'text-base'
              }`}
            >
              هل استلمتَ {studentName}؟
            </p>
            <p className="text-center text-[11px] text-amber-700 dark:text-amber-300/90">
              لا تراجع بعد التأكيد.
            </p>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className={`flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 font-extrabold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ${
                  isSlim ? 'min-h-[44px] px-3 text-sm' : 'min-h-[52px] px-4 text-base'
                }`}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                )}
                {isPending ? 'جارٍ التأكيد…' : 'نعم، استلمته'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isPending}
                className={`flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${
                  isSlim ? 'min-h-[44px] px-3 text-sm' : 'min-h-[52px] px-4 text-base'
                }`}
              >
                تراجع
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setFailure(null)
              setIsConfirming(true)
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-extrabold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] ${
              isSlim ? 'min-h-[44px] text-sm' : 'min-h-[56px] text-base'
            }`}
          >
            <CheckCircle2 className={isSlim ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden />
            استلمتُ ابني
          </button>
        )}
      </div>

      {/* لماذا يضغط؟ إعلامٌ لا تهديد: العقوبة قائمةٌ في النظام، وكتمانها عنه
          هو الظلم لا ذكرُها. */}
      {!isSlim && (
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
          تأكيد الاستلام يُغلق الطلب. والنداء الذي تنتهي مهلته بلا تأكيد يُحتسب مخالفة، وثلاث مخالفات
          توقف الخدمة عنك يوماً كاملاً.
        </p>
      )}

      {failure && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{failure}</span>
        </div>
      )}
    </div>
  )
}
