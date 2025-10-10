import type { TeacherPointMode } from '@/modules/teacher/points/types'

interface ModeToggleProps {
  value: TeacherPointMode
  onChange: (mode: TeacherPointMode) => void
}

const MODES: Array<{ key: TeacherPointMode; label: string; icon: string }> = [
  { key: 'reward', label: 'نقاط إيجابية', icon: 'bi-stars' },
  { key: 'violation', label: 'مخالفات', icon: 'bi-exclamation-octagon' },
]

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-1 shadow-sm">
      {MODES.map((mode) => {
        const isActive = value === mode.key
        return (
          <button
            key={mode.key}
            type="button"
            onClick={() => onChange(mode.key)}
            className={`flex flex-col items-end rounded-3xl px-4 py-3 text-right transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${isActive ? 'bg-gradient-to-l from-teal-500 to-teal-600 text-white shadow-lg' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`}
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              <i className={`bi ${mode.icon} text-lg`} aria-hidden></i>
              {mode.label}
            </span>
            <span className="text-xs text-current opacity-80">
              {mode.key === 'reward' ? 'امنح الطلاب تعزيزًا فورياً' : 'سجّل المخالفات بسرعة'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
