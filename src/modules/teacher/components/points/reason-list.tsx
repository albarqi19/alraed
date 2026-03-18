import type { TeacherPointMode, TeacherPointReason } from '@/modules/teacher/points/types'

interface ReasonListProps {
  mode: TeacherPointMode
  reasons: TeacherPointReason[]
  selectedReasonId: number | null
  onSelect: (reason: TeacherPointReason) => void
}

export function ReasonList({ mode, reasons, selectedReasonId, onSelect }: ReasonListProps) {
  if (!reasons.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-5 text-center text-sm text-muted">
        لا توجد أسباب مفعّلة حالياً لهذا النوع. يرجى التواصل مع الإدارة لإضافة أسباب جديدة.
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reasons.map((reason) => {
        const isActive = reason.id === selectedReasonId
        return (
          <button
            key={reason.id}
            type="button"
            onClick={() => onSelect(reason)}
            className={`flex flex-col items-stretch rounded-3xl border px-4 py-4 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              isActive
                ? mode === 'reward'
                  ? 'border-teal-500 bg-gradient-to-l from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900'
                  : 'border-amber-500 bg-gradient-to-l from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-200 dark:hover:border-teal-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{reason.title}</p>
                {reason.category ? (
                  <p className="mt-1 text-xs font-semibold text-teal-600 dark:text-teal-400">{reason.category}</p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  mode === 'reward' ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-400' : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400'
                }`}
              >
                {reason.value.toLocaleString('ar-SA')} نقطة
              </span>
            </div>
            {reason.description ? (
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{reason.description}</p>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
