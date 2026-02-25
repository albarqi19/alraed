import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <Icon className="h-8 w-8 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>
      )}
    </div>
  )
}
