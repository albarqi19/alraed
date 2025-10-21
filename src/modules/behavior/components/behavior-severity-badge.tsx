import type { BehaviorSeverity } from '../types'
import { Flame, OctagonAlert, AlertTriangle, ShieldCheck } from 'lucide-react'

const severityConfig: Record<BehaviorSeverity, { label: string; tone: string; icon: typeof Flame }> = {
  low: {
    label: 'منخفض',
    tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: ShieldCheck,
  },
  medium: {
    label: 'متوسط',
    tone: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: AlertTriangle,
  },
  high: {
    label: 'مرتفع',
    tone: 'bg-orange-50 text-orange-700 border border-orange-200',
    icon: OctagonAlert,
  },
  critical: {
    label: 'حرج',
    tone: 'bg-rose-50 text-rose-700 border border-rose-200',
    icon: Flame,
  },
}

interface BehaviorSeverityBadgeProps {
  severity: BehaviorSeverity
}

export function BehaviorSeverityBadge({ severity }: BehaviorSeverityBadgeProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${config.tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}
