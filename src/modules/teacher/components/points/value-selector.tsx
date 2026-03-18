import type { TeacherPointMode } from '@/modules/teacher/points/types'

interface ValueSelectorProps {
  mode: TeacherPointMode
  values: number[]
  selectedValue: number | null
  onSelect: (value: number) => void
  disabled?: boolean
}

export function ValueSelector({ mode, values, selectedValue, onSelect, disabled }: ValueSelectorProps) {
  if (!values.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4 text-right text-sm text-muted">
        لم يتم ضبط قيم {mode === 'reward' ? 'النقاط' : 'المخالفات'} بعد. يرجى التواصل مع الإدارة.
      </div>
    )
  }

  return (
    <div className="flex w-full snap-x gap-2 overflow-x-auto pb-2">
      {values.map((value) => {
        const isActive = selectedValue === value
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(value)}
            className={`snap-start rounded-3xl border px-5 py-3 text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              isActive
                ? mode === 'reward'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-700'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {value.toLocaleString('en-US')}
          </button>
        )
      })}
    </div>
  )
}
