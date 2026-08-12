import type { ReactNode } from 'react'
import { Archive, Undo2 } from 'lucide-react'
import { useArchiveMode } from '../hooks'

interface ArchiveUnsupportedProps {
  /** اسم الشاشة كما يعرفه المستخدم — يجعل الاعتراف محدَّداً لا عامّاً */
  screen?: ReactNode
}

/**
 * البطاقة التي تحلّ محلّ كل شاشةٍ لا يبلغها الأرشيف.
 *
 * لماذا حجبٌ لا عرضٌ مع تنبيه: الشاشات المحجوبة تستعلم جداول رُحّلت صفوفها إلى
 * توائم `archive_*`، فهي في وضع الأرشيف لا ترجع «لا شيء لهذه السنة» بل ترجع
 * صفراً — طابورَ مناوبةٍ فارغاً، ونشاطاً واحداً، ومعلّماً بلا واجبات. والصفر
 * الكاذب يُقرأ حقيقةً ويُبنى عليه قرار. البطاقة تكلّف المستخدم نقرةً للعودة،
 * والصفر الكاذب يكلّفه ثقته بالنظام كله.
 */
export function ArchiveUnsupported({ screen }: ArchiveUnsupportedProps) {
  const { yearLabel, exitArchive } = useArchiveMode()

  return (
    <div
      dir="rtl"
      className="flex w-full flex-1 items-center justify-center p-6"
      // ارتفاعٌ أدنى صريح: البطاقة تُركَّب أحياناً في غلافٍ ليس عموداً مرناً
      // (صفحات النمط القديم)، وهناك لا يفعل `flex-1` شيئاً فتلتصق بأعلى الشاشة
      style={{ backgroundColor: 'var(--ws-bg)', color: 'var(--ws-text)', minHeight: '60vh' }}
    >
      <div
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border px-6 py-8 text-center"
        style={{ backgroundColor: 'var(--ws-surface)', borderColor: 'var(--ws-border)' }}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--ws-red-bg)', border: '1px solid var(--ws-red-bd)' }}
        >
          <Archive className="h-5 w-5" style={{ color: 'var(--ws-red)' }} aria-hidden />
        </span>

        <h2 className="text-[15px] font-bold">هذه الشاشة لا تدعم عرض الأرشيف</h2>

        <p className="text-[12.5px] leading-6" style={{ color: 'var(--ws-text-2)' }}>
          {screen ? <b>{screen}</b> : 'هذه الشاشة'} تقرأ بيانات السنة الجارية وحدها، وبياناتها لعام{' '}
          {yearLabel ?? 'الأرشيف'} نُقلت إلى جداول الأرشيف. لو عُرضت الآن لأظهرت أرقاماً ناقصة تبدو
          كاملة.
        </p>

        <p className="text-[12px]" style={{ color: 'var(--ws-text-2)' }}>
          المتاح في وضع الأرشيف: الحضور، والسلوك، والإحالات، والتقييمات، والجدول.
        </p>

        <button
          type="button"
          onClick={exitArchive}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold transition hover:opacity-90 focus:outline-none focus-visible:ring-2"
          style={{ backgroundColor: 'var(--ws-accent)', color: '#FFFFFF' }}
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden />
          العودة إلى السنة الجارية
        </button>
      </div>
    </div>
  )
}

interface ArchiveGuardProps extends ArchiveUnsupportedProps {
  children: ReactNode
}

/**
 * غلافٌ يمنع شاشةً بعينها من الرسم في وضع الأرشيف.
 *
 * الحجب العامّ يقع في `AdminShell` انطلاقاً من قائمة المسارات المدعومة، وهذا
 * الغلاف هو الحارس الثاني لمن أراد تثبيت الحكم في الشاشة نفسها: قائمة المسارات
 * ملفٌّ بعيد يُنسى عند إعادة تسمية مسار، والغلاف يسافر مع الملف الذي يحرسه.
 *
 * الأطفال لا يُركّبون أصلاً — لا يُخفَون بـ`display:none` — كي لا تنطلق
 * استعلاماتهم فتُحمَّل الشبكة ببياناتٍ لن تُعرض.
 */
export function ArchiveGuard({ screen, children }: ArchiveGuardProps) {
  const { isArchiveMode } = useArchiveMode()

  if (isArchiveMode) {
    return <ArchiveUnsupported screen={screen} />
  }

  return <>{children}</>
}
