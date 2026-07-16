/* ======================================================
   مكونات «النمط الملتصق» — Workspace Components
   طبقة عرض خفيفة فوق كلاسات ws-* في styles/workspace.css.
   ------------------------------------------------------
   فلسفة التصميم: أساس مرن لا قالب جامد —
   - كل مكوّن يقبل className ويمرر بقية الخصائص (spread)
   - التركيب بالـ children/slots لا بإعدادات ضخمة
   - أي لمسة خاصة بصفحة: انزل لكلاسات ws-* الخام بحرّية
   المرجع التطبيقي: admin-attendance-page.tsx
   ====================================================== */
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertTriangle, ChevronsLeft, ChevronsRight, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import cx from 'classnames'

/* ────────────────────────────────────────────────
   الهيكل العام
   ──────────────────────────────────────────────── */

/** جذر الصفحة: يملأ مساحة الـ shell، لا تمرير خارجي (المسار يجب أن يكون في WORKSPACE_ROUTES) */
export function WsPage({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section dir="rtl" className={cx('ws-page', className)} {...props} />
}

interface WsHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode
  /** شارة صغيرة بجانب العنوان */
  badge?: ReactNode
  /** أزرار يسار الترويسة */
  actions?: ReactNode
  /** صف الحقائق أسفل العنوان (WsFact) — الفواصل تلقائية */
  facts?: ReactNode
  /** عناصر إضافية بجانب العنوان (chips ...) */
  children?: ReactNode
}

/** الترويسة: صف العنوان والأزرار + صف الحقائق */
export function WsHeader({ title, badge, actions, facts, children, className, ...props }: WsHeaderProps) {
  return (
    <header className={cx('ws-header', className)} {...props}>
      <div className="ws-header__top">
        <div className="ws-header__info">
          <h1 className="ws-header__title">{title}</h1>
          {badge != null && <span className="ws-header__badge">{badge}</span>}
          {children}
        </div>
        {actions != null && <div className="ws-header__actions">{actions}</div>}
      </div>
      {facts != null && <div className="ws-header__facts">{facts}</div>}
    </header>
  )
}

interface WsFactProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: LucideIcon
  label?: ReactNode
  children?: ReactNode
}

/** حقيقة في صف الحقائق: أيقونة + تسمية + قيمة بارزة */
export function WsFact({ icon: Icon, label, children, className, ...props }: WsFactProps) {
  return (
    <span className={cx('ws-fact', className)} {...props}>
      {Icon && <Icon />}
      {label != null && <span>{label}</span>}
      {children != null && <b>{children}</b>}
    </span>
  )
}

/** شريط الأدوات (فلاتر/إجراءات) أسفل الترويسة */
export function WsToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ws-toolbar', className)} {...props} />
}

interface WsFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode
  htmlFor?: string
  /** يتمدد ليملأ المساحة المتبقية (كحقل البحث) */
  grow?: boolean
}

/** حقل في شريط الأدوات: تسمية صغيرة فوق عنصر الإدخال */
export function WsField({ label, htmlFor, grow, className, children, ...props }: WsFieldProps) {
  return (
    <div className={cx('ws-field', grow && 'ws-field--grow', className)} {...props}>
      {label != null && (
        <label className="ws-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

export const WsInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function WsInput({ className, ...props }, ref) {
    return <input ref={ref} className={cx('ws-input', className)} {...props} />
  },
)

export const WsSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function WsSelect({ className, ...props }, ref) {
    return <select ref={ref} className={cx('ws-select', className)} {...props} />
  },
)

export const WsTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function WsTextarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx('ws-textarea', className)} {...props} />
  },
)

interface WsSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
}

/** مفتاح تبديل صغير — الوصف النصي بجانبه مسؤولية الصفحة */
export function WsSwitch({ checked, onChange, className, ...props }: WsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx('ws-switch', className)}
      onClick={() => onChange(!checked)}
      {...props}
    />
  )
}

/* ────────────────────────────────────────────────
   الأعمدة الملتصقة
   ──────────────────────────────────────────────── */

/** حاوية الأعمدة: تملأ الباقي، كل عمود يتمرر داخلياً */
export function WsLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ws-layout', className)} {...props} />
}

/** العمود الأوسط الرئيسي */
export function WsMain({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ws-main', className)} {...props} />
}

interface WsSideColProps {
  title: ReactNode
  icon?: LucideIcon
  /** مفتاح حفظ حالة الطي — بالاتفاق: ws:<اسم-الصفحة>:sidecol */
  storageKey: string
  /** جهة العمود: 'end' يسار (افتراضي) أو 'start' يمين */
  side?: 'start' | 'end'
  /** نص الشريط عند الطي (افتراضياً title إن كان نصاً) */
  collapsedLabel?: string
  /** أدوات إضافية في رأس العمود بجانب زر الطي */
  tools?: ReactNode
  /** عرض مخصص بالبكسل (افتراضياً 340 من CSS) */
  width?: number
  defaultCollapsed?: boolean
  className?: string
  children?: ReactNode
}

/** عمود جانبي ملتصق قابل للطي إلى شريط 46px بنص عمودي، حالته محفوظة */
export function WsSideCol({
  title,
  icon: Icon,
  storageKey,
  side = 'end',
  collapsedLabel,
  tools,
  width,
  defaultCollapsed = false,
  className,
  children,
}: WsSideColProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved === null ? defaultCollapsed : saved === '1'
  })

  useEffect(() => {
    localStorage.setItem(storageKey, isCollapsed ? '1' : '0')
  }, [storageKey, isCollapsed])

  const railLabel = collapsedLabel ?? (typeof title === 'string' ? title : '')
  // اتجاه أسهم الطي حسب جهة العمود: العمود الأيمن يُطوى نحو اليمين
  const CollapseIcon = side === 'start' ? ChevronsRight : ChevronsLeft
  const ReopenIcon = side === 'start' ? ChevronsLeft : ChevronsRight

  if (isCollapsed) {
    return (
      <aside className={cx('ws-sidecol', side === 'start' && 'ws-sidecol--start', 'ws-sidecol--min', className)}>
        <button
          type="button"
          className="ws-sidecol__reopen"
          onClick={() => setIsCollapsed(false)}
          title={`فتح ${railLabel}`}
        >
          <ReopenIcon />
          <span>{railLabel}</span>
        </button>
      </aside>
    )
  }

  return (
    <aside
      className={cx('ws-sidecol', side === 'start' && 'ws-sidecol--start', className)}
      style={width ? { width } : undefined}
    >
      <div className="ws-block__head">
        <span className="ws-block__title">
          {Icon && <Icon />}
          {title}
        </span>
        <span className="ws-block__tools">
          {tools}
          <button type="button" className="ws-icon-btn" onClick={() => setIsCollapsed(true)} title="طي العمود">
            <CollapseIcon />
          </button>
        </span>
      </div>
      {children}
    </aside>
  )
}

interface WsBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** بلا title/tools لا يُعرض رأس للبلوك */
  title?: ReactNode
  icon?: LucideIcon
  /** عدّاد صغير بجانب العنوان */
  count?: ReactNode
  tools?: ReactNode
  /** يملأ المساحة المتبقية من العمود */
  fill?: boolean
  /** يلف المحتوى بحشوة قياسية */
  padded?: boolean
  /** يلف المحتوى بحاوية تمرير داخلي (للبلوك الأخير الممتلئ) */
  scroll?: boolean
}

/** بلوك مدمج: بلا استدارة ولا إطار، فاصل سفلي فقط */
export function WsBlock({
  title,
  icon: Icon,
  count,
  tools,
  fill,
  padded,
  scroll,
  className,
  children,
  ...props
}: WsBlockProps) {
  const hasHead = title != null || tools != null
  let body = children
  if (padded) body = <div className="ws-block__body">{body}</div>
  if (scroll) body = <div className="ws-block__scroll">{body}</div>

  return (
    <div className={cx('ws-block', fill && 'ws-block--fill', className)} {...props}>
      {hasHead && (
        <div className="ws-block__head">
          <span className="ws-block__title">
            {Icon && <Icon />}
            {title}
            {count != null && <span className="ws-count">{count}</span>}
          </span>
          {tools != null && <span className="ws-block__tools">{tools}</span>}
        </div>
      )}
      {body}
    </div>
  )
}

/* ────────────────────────────────────────────────
   الجدول الكثيف
   ──────────────────────────────────────────────── */

interface WsTableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** كلاس حاوية التمرير */
  wrapClassName?: string
}

/** جدول كثيف برأس لاصق داخل حاوية تمرير — thead/tbody بيد الصفحة بحرّية كاملة */
export function WsTable({ wrapClassName, className, children, ...props }: WsTableProps) {
  return (
    <div className={cx('ws-tablewrap', wrapClassName)}>
      <table className={cx('ws-table', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

/* ────────────────────────────────────────────────
   عناصر أساسية
   ──────────────────────────────────────────────── */

interface WsBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger'
  size?: 'sm'
  icon?: LucideIcon
}

export function WsBtn({ variant, size, icon: Icon, className, children, type = 'button', ...props }: WsBtnProps) {
  return (
    <button
      type={type}
      className={cx('ws-btn', variant && `ws-btn--${variant}`, size && `ws-btn--${size}`, className)}
      {...props}
    >
      {Icon && <Icon />}
      {children}
    </button>
  )
}

interface WsIconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  /** وصف الزر (title + aria-label) */
  label: string
}

export function WsIconBtn({ icon: Icon, label, className, type = 'button', ...props }: WsIconBtnProps) {
  return (
    <button type={type} className={cx('ws-icon-btn', className)} title={label} aria-label={label} {...props}>
      <Icon />
    </button>
  )
}

export type WsChipTone = 'green' | 'red' | 'amber' | 'sky'

interface WsChipProps extends HTMLAttributes<HTMLElement> {
  tone?: WsChipTone
  icon?: LucideIcon
  /** عند تمرير onClick تُعرض كزر قابل للنقر */
  onClick?: () => void
  disabled?: boolean
}

/** شريحة حالة ملونة — span افتراضياً، وزر عند تمرير onClick */
export function WsChip({ tone, icon: Icon, onClick, disabled, className, children, ...props }: WsChipProps) {
  const cls = cx('ws-chip', tone && `ws-chip--${tone}`, className)
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} {...props}>
        {Icon && <Icon />}
        {children}
      </button>
    )
  }
  return (
    <span className={cls} {...props}>
      {Icon && <Icon />}
      {children}
    </span>
  )
}

const alertToneIcon: Record<string, LucideIcon> = {
  error: AlertTriangle,
  warn: AlertTriangle,
  info: Info,
  success: Info,
}

interface WsAlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'error' | 'warn' | 'info' | 'success'
  /** نسخة صندوقية (داخل مودال/بلوك) بدل الشريط الملتصق */
  boxed?: boolean
  /** أيقونة مخصصة — null لإخفائها */
  icon?: LucideIcon | null
}

export function WsAlert({ tone = 'error', boxed, icon, className, children, ...props }: WsAlertProps) {
  const Icon = icon === null ? null : (icon ?? alertToneIcon[tone])
  return (
    <div
      className={cx('ws-alert', tone !== 'error' && `ws-alert--${tone}`, boxed && 'ws-alert--boxed', className)}
      {...props}
    >
      {Icon && <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />}
      {children}
    </div>
  )
}

interface WsEmptyProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  /** يعرض سبينر بدل الأيقونة */
  loading?: boolean
}

/** حالة فارغة/تحميل تتوسط المساحة المتاحة */
export function WsEmpty({ icon: Icon, loading, className, children, ...props }: WsEmptyProps) {
  return (
    <div className={cx('ws-empty', className)} {...props}>
      {loading ? <span className="ws-spinner" /> : Icon ? <Icon /> : null}
      {children}
    </div>
  )
}

export function WsSpinner({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ws-spinner', className)} {...props} />
}

interface WsProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** نسبة 0-100 */
  value: number
  /** تسمية بجانب الشريط */
  label?: ReactNode
}

export function WsProgress({ value, label, className, ...props }: WsProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={cx('ws-progress', className)} {...props}>
      {label != null && (
        <span className="ws-fact" style={{ flexShrink: 0 }}>
          {label}
        </span>
      )}
      <span className="ws-progressbar">
        <span style={{ width: `${clamped}%` }} />
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────
   قوائم الحقائق التفصيلية
   ──────────────────────────────────────────────── */

export function WsFactsList({ className, ...props }: HTMLAttributes<HTMLDListElement>) {
  return <dl className={cx('ws-facts-list', className)} {...props} />
}

export function WsFactRow({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/* ────────────────────────────────────────────────
   المودال الكثيف
   ──────────────────────────────────────────────── */

interface WsModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  sub?: ReactNode
  footer?: ReactNode
  maxWidth?: number
  children?: ReactNode
}

export function WsModal({ open, onClose, title, sub, footer, maxWidth, children }: WsModalProps) {
  if (!open) return null
  return (
    <div className="ws-modal" onClick={onClose}>
      <div
        className="ws-modal__panel"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{title}</h3>
          {sub != null && <p className="ws-modal__sub">{sub}</p>}
        </header>
        <div className="ws-modal__body">{children}</div>
        {footer != null && <footer className="ws-modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}
