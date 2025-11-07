import { BEHAVIOR_DEGREE_LABELS } from '../constants'
import type { BehaviorDegree } from '../types'

interface ViolationBadgeProps {
  degree: BehaviorDegree
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES: Record<NonNullable<ViolationBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function ViolationBadge({ degree, size = 'md' }: ViolationBadgeProps) {
  const config = BEHAVIOR_DEGREE_LABELS[degree] ?? {
    name: `درجة غير مصنفة (${degree})`,
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${config.badgeClass} ${SIZE_CLASSES[size]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.name}
    </span>
  )
}
