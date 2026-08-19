import { USER_ROLES } from '@/modules/auth/constants/roles'
/* ======================================================
   أساس العرض الموحد لتفاصيل ملف المعلم — Profile UI
   ------------------------------------------------------
   أقسام الملف كانت تبني بطاقاتها وجداولها يدوياً بألوان
   تايلويند متناثرة (وبعضها كلاسات ديناميكية مكسورة أصلاً).
   هنا الأساس المشترك فوق نبرات TONES وكلاسات ws-* حتى
   يبقى نفس اللون يعني نفس الشيء في كل تبويب.
   ====================================================== */
import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import cx from 'classnames'
import { TONES, WsTable, type Tone } from '@/shared/workspace'
import { arNum, useCountUp } from '../../pages/dashboard-ui'

/** خلفية بطاقة ملوّنة — نفس مزج بطاقات لوحة التحكم (حدّ النبرة على سطح الصفحة) */
export const toneBg = (t: Tone) => `color-mix(in srgb, ${t.bd} 55%, var(--ws-surface))`

/* نبرة الدور — مطابقة لجدول إدارة المعلمين حتى يثبت لون الدور في كل الشاشات */
const ROLE_TONE_KEYS: Record<string, string> = Object.fromEntries(
  Object.values(USER_ROLES).map((r) => [r.value, r.color ?? 'gray']),
)

export function roleProfileTone(role: string): Tone {
  return TONES[ROLE_TONE_KEYS[role] ?? 'gray'] ?? TONES.gray
}

/* ────────────────────────────────────────────────
   اللوح المسطح: وحدة التقسيم الأساسية داخل التفاصيل
   ──────────────────────────────────────────────── */

interface ProfilePanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** بلا title/tools لا يُعرض رأس للوح */
  title?: ReactNode
  icon?: LucideIcon
  tools?: ReactNode
  /** يلف المحتوى بحشوة قياسية (افتراضي) — false للجداول التي تملأ اللوح */
  padded?: boolean
}

export function ProfilePanel({ title, icon: Icon, tools, padded = true, className, children, ...props }: ProfilePanelProps) {
  const hasHead = title != null || tools != null
  return (
    <section className={cx('ws-panel', className)} {...props}>
      {hasHead && (
        <header className="ws-panel__head">
          <span className="ws-panel__title">
            {Icon && <Icon />}
            {title}
          </span>
          {tools}
        </header>
      )}
      {padded ? <div className="ws-panel__body">{children}</div> : children}
    </section>
  )
}

/* ────────────────────────────────────────────────
   الأرقام المصغرة: شبكة + رقم بعدّ تصاعدي
   ──────────────────────────────────────────────── */

export function StatGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ws-statgrid', className)} {...props} />
}

interface StatMiniProps {
  label: ReactNode
  /** رقم يُعدّ تصاعدياً، أو نص يُعرض كما هو (مثل «غير مرتبط») */
  value: number | string
  suffix?: string
  sub?: ReactNode
  /** نبرة لونية اختيارية — بلاها يبقى الرقم محايداً */
  tone?: Tone
}

export function StatMini({ label, value, suffix, sub, tone }: StatMiniProps) {
  const numeric = typeof value === 'number'
  const display = useCountUp(numeric ? value : 0)

  return (
    <div className="ws-stat" style={tone ? { borderColor: tone.bd, background: toneBg(tone) } : undefined}>
      <span className="ws-stat__label">{label}</span>
      <span
        className="ws-stat__value"
        style={{
          ...(tone ? { color: tone.tx } : undefined),
          ...(!numeric ? { fontSize: 14 } : undefined),
        }}
      >
        {numeric ? arNum(display) : value}
        {suffix}
      </span>
      {sub != null && <span className="ws-stat__sub">{sub}</span>}
    </div>
  )
}

/* ────────────────────────────────────────────────
   جدول التفاصيل — أعطِ tbody كلاس ws-tbl-rise لتصعد الصفوف
   ──────────────────────────────────────────────── */

interface ProfileTableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapClassName?: string
}

export function ProfileTable({ wrapClassName, className, children, ...props }: ProfileTableProps) {
  return (
    <WsTable wrapClassName={wrapClassName} className={className} {...props}>
      {children}
    </WsTable>
  )
}
