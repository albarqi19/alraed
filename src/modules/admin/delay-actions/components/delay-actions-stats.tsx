/**
 * بطاقات إحصائيات إجراءات التأخير
 */

import { Users, AlertTriangle, FileWarning, ClipboardCheck } from 'lucide-react'
import type { DelayActionsStatistics } from '../types'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  tone: string
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
  return (
    <article className={`rounded-2xl px-4 py-4 text-right shadow-sm ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-white/50 p-2">{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value.toLocaleString('ar-SA')}</p>
        </div>
      </div>
    </article>
  )
}

interface DelayActionsStatsProps {
  data: DelayActionsStatistics | undefined
  isLoading: boolean
}

export function DelayActionsStats({ data, isLoading }: DelayActionsStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  const totalActions = data.total_warnings_issued + data.total_deductions_issued

  const cards = [
    {
      label: 'معلمين لديهم تأخير',
      value: data.teachers_with_delay,
      icon: <Users className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    {
      label: 'ينتظرون تنبيه',
      value: data.pending_warnings,
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    {
      label: 'ينتظرون حسم',
      value: data.pending_deductions,
      icon: <FileWarning className="h-5 w-5 text-rose-600" />,
      tone: 'bg-rose-50 text-rose-700 border border-rose-200',
    },
    {
      label: 'إجراءات هذا العام',
      value: totalActions,
      icon: <ClipboardCheck className="h-5 w-5 text-sky-600" />,
      tone: 'bg-sky-50 text-sky-700 border border-sky-200',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </div>
  )
}
