import { CalendarClock, ShieldCheck } from 'lucide-react'
import clsx from 'classnames'

interface SubscriptionStatusIndicatorProps {
  plan: string
  status: string
  nextBillingAt?: string | null
  trialEndsAt?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'تجريبي',
  active: 'نشط',
  suspended: 'موقوف',
  cancelled: 'ملغي',
  expired: 'منتهي',
}

const STATUS_STYLES: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-slate-200 text-slate-600',
}

function formatDate(date?: string | null) {
  if (!date) return null
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return null
  return value.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function SubscriptionStatusIndicator({ plan, status, nextBillingAt, trialEndsAt }: SubscriptionStatusIndicatorProps) {
  const statusLabel = STATUS_LABELS[status] ?? status
  const statusStyle = STATUS_STYLES[status] ?? 'bg-slate-200 text-slate-600'
  const nextBilling = formatDate(nextBillingAt)
  const trialEnds = formatDate(trialEndsAt)

  return (
    <div className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">الخطة الحالية</p>
            <p className="text-lg font-semibold text-slate-900">{plan.toUpperCase()}</p>
          </div>
        </div>
        <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold', statusStyle)}>
          <span className="h-2 w-2 rounded-full bg-current" /> {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        {nextBilling ? (
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-emerald-500" />
            <span>
              الفاتورة القادمة:
              <strong className="mr-2 text-slate-800">{nextBilling}</strong>
            </span>
          </div>
        ) : null}
        {trialEnds ? (
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            <span>
              نهاية الفترة التجريبية:
              <strong className="mr-2 text-slate-800">{trialEnds}</strong>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
