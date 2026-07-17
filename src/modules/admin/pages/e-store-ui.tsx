/* عناصر بصرية مشتركة لصفحة «المتجر الإلكتروني» — عرض فقط، لا منطق
   قاعدة اللون: بنفسجي = النقاط وحدها · أخضر = سليم ومنتهٍ بخير ·
   كهرماني = يدُك مطلوبة الآن (وهو الوحيد المسموح له بالنبض) ·
   أحمر = حاجز فعلي · سماوي = طائر لم يهبط بعد + الزمن · رمادي = لا يستدعي انتباهاً. */
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { TONES, ToneChip, WsIconBtn, type Tone } from '@/shared/workspace'
import type { StoreItemRecord, StoreOrderStatus, StoreStatus } from '@/modules/admin/types'

export const ORDER_STATUS_META: Record<StoreOrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'قيد المراجعة', tone: TONES.amber },
  approved: { label: 'معتمد', tone: TONES.sky },
  fulfilled: { label: 'مكتمل', tone: TONES.green },
  cancelled: { label: 'ملغي', tone: TONES.gray },
  rejected: { label: 'مرفوض', tone: TONES.red },
}

export const STORE_STATUS_TONES: Record<StoreStatus, Tone> = {
  open: TONES.green,
  closed: TONES.red,
  maintenance: TONES.amber,
  inventory: TONES.sky,
  paused: TONES.gray,
  empty: TONES.amber,
}

/** حالة المخزون بمقياس واحد يخدم الرفّ والقسيمة معاً */
export function stockState(item: Pick<StoreItemRecord, 'unlimited_stock' | 'stock_quantity'>, threshold: number) {
  if (item.unlimited_stock) return { kind: 'unlimited' as const, tone: TONES.gray }
  const qty = item.stock_quantity ?? 0
  if (qty <= 0) return { kind: 'out' as const, tone: TONES.red, qty }
  if (qty <= threshold) return { kind: 'low' as const, tone: TONES.amber, qty }
  return { kind: 'ok' as const, tone: TONES.green, qty }
}

/** ترقيم موحّد — يحل محل بلوكَي «السابق/التالي» المتطابقين سطراً بسطر */
export function StorePager({
  page,
  lastPage,
  total,
  unit,
  onChange,
}: {
  page: number
  lastPage: number
  total?: number
  unit: string
  onChange: (page: number) => void
}) {
  if (lastPage <= 1) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
        صفحة {page} من {lastPage}
        {total != null && ` · ${new Intl.NumberFormat('en-US').format(total)} ${unit}`}
      </span>
      <WsIconBtn icon={ChevronRight} label="السابق" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))} />
      <WsIconBtn icon={ChevronLeft} label="التالي" disabled={page >= lastPage} onClick={() => onChange(Math.min(lastPage, page + 1))} />
    </span>
  )
}

/** صورة المنتج — image_url حقل إدخال في النموذج ولم يُرسم قط */
export function ItemThumb({ url, name, size = 32, tone = TONES.gray }: { url?: string | null; name: string; size?: number; tone?: Tone }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--ws-border)' }}
      />
    )
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tone.bg,
        color: tone.tx,
        border: `1px solid ${tone.bd}`,
      }}
    >
      <Package style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  )
}

/** شريط الرواج: times_redeemed مُطبَّعاً على أعلى قيمة في الصفحة — بنفسجي لأنه نقاط أُنفقت */
export function PopularityBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'block', width: 42, height: 5, borderRadius: 3, background: 'var(--ws-border)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: TONES.purple.tx, borderRadius: 3 }} />
      </span>
      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>{value}</span>
    </span>
  )
}

/** «منذ» بالعربية — الطلب المعلّق أسبوعاً تقصير إداري لا يظهر اليوم في أي مكان */
export function timeAgo(iso?: string | null): { text: string; days: number } {
  if (!iso) return { text: '—', days: 0 }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return { text: '—', days: 0 }
  const diffMs = Date.now() - then
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor(diffMs / 60_000)
  if (days >= 1) return { text: `منذ ${days} يوم`, days }
  if (hours >= 1) return { text: `منذ ${hours} ساعة`, days: 0 }
  if (minutes >= 1) return { text: `منذ ${minutes} دقيقة`, days: 0 }
  return { text: 'الآن', days: 0 }
}

/** شريحة الانتظار: تحمرّ حين يتجاوز الطلب المعلّق ثلاثة أيام */
export function WaitingChip({ createdAt, status }: { createdAt?: string | null; status: StoreOrderStatus }) {
  const { text, days } = timeAgo(createdAt)
  if (status !== 'pending') {
    return <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>{text}</span>
  }
  const isStale = days >= 3
  return (
    <span
      className={isStale ? 'ws-soft-pulse' : undefined}
      style={{ fontSize: 11, fontWeight: isStale ? 700 : 400, color: isStale ? TONES.red.tx : 'var(--ws-text-2)' }}
    >
      {isStale ? `ينتظر ${text.replace('منذ ', '')}` : text}
    </span>
  )
}

/** شريحة حالة الطلب */
export function OrderStatusChip({ status }: { status: StoreOrderStatus }) {
  const meta = ORDER_STATUS_META[status] ?? ORDER_STATUS_META.pending
  return <ToneChip tone={meta.tone}>{meta.label}</ToneChip>
}
