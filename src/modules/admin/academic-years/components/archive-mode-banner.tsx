import { AlertTriangle, Undo2 } from 'lucide-react'
import { useArchiveMode } from '../hooks'

/**
 * أحمرُ ثابت لا يُشتق من الثيم.
 *
 * ألوان الحالة في `workspace.css` تنقلب في الثيم الداكن إلى ورديٍّ فاتح
 * (`--ws-red: #F08A8A`) لأنها مصمَّمة نصّاً فوق خلفيةٍ باهتة، لا خلفيةً تحت
 * نصٍّ أبيض. وشريطٌ ورديّ باهت في مكتب المدير يُقرأ زينةً لا تحذيراً. هذا
 * الشريط يجب أن يبدو واحداً في كل الثيمات لأن معناه واحد.
 */
const ALERT_RED = '#B3261E'

/**
 * الشريط الأحمر: إعلانٌ دائم أن ما على الشاشة ليس اليوم.
 *
 * لا زرّ إغلاق، ولا إخفاءٍ بعد ثوان، ولا تصغير. مكتب المدير شاشةٌ يقف أمامها
 * الوكيل والمرشد بالتناوب، والخطأ الأخطر في هذا النظام ليس رقماً غلطاً بل
 * قراءةَ رقمٍ صحيح على أنه رقم اليوم. وكل ما يُخفى يُنسى.
 */
export function ArchiveModeBanner() {
  const { isArchiveMode, yearLabel, exitArchive } = useArchiveMode()

  if (!isArchiveMode) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      dir="rtl"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 lg:px-6"
      style={{ backgroundColor: ALERT_RED, color: '#FFFFFF' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
        <p className="text-[13px] font-bold leading-tight">
          أنت تتصفّح أرشيف العام {yearLabel ?? 'السابق'} — قراءة فقط
        </p>
      </div>

      <button
        type="button"
        onClick={exitArchive}
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-bold transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{ border: '1px solid rgba(255,255,255,0.55)', color: '#FFFFFF' }}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        العودة إلى السنة الجارية
      </button>
    </div>
  )
}
