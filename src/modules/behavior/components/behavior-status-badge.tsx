import type { BehaviorStatus } from '../types'
import { AlertOctagon, CheckCircle2, Clock3, RefreshCcw } from 'lucide-react'

const statusConfig: Record<BehaviorStatus, { label: string; tone: string; icon: typeof Clock3 }> = {
  pending: {
    label: 'بانتظار الإجراء',
    tone: 'bg-slate-100 text-slate-700 border border-slate-200',
    icon: Clock3,
  },
  under_review: {
    label: 'قيد المتابعة',
    tone: 'bg-sky-50 text-sky-700 border border-sky-200',
    icon: RefreshCcw,
  },
  resolved: {
    label: 'مغلقة',
    tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: CheckCircle2,
  },
  escalated: {
    label: 'مُصعّدة',
    tone: 'bg-rose-50 text-rose-700 border border-rose-200',
    icon: AlertOctagon,
  },
}

interface BehaviorStatusBadgeProps {
  status: BehaviorStatus
}

export function BehaviorStatusBadge({ status }: BehaviorStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${config.tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}
