import { useRef, useEffect } from 'react'
import clsx from 'classnames'
import type { AcademicWeekSummary } from '../types'

interface Props {
  weeks: AcademicWeekSummary[]
  selectedWeekId: number | undefined
  onSelect: (weekId: number) => void
}

export function WeekSelector({ weeks, selectedWeekId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // التمرير للأسبوع الحالي عند التحميل
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedWeekId])

  if (weeks.length === 0) return null

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300"
    >
      {weeks.map((week) => {
        const isSelected = week.id === selectedWeekId
        const isCurrent = week.is_current

        return (
          <button
            key={week.id}
            ref={isSelected ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(week.id)}
            className={clsx(
              'flex shrink-0 flex-col items-center rounded-xl px-4 py-2.5 text-xs font-medium transition-all',
              isSelected
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                : isCurrent
                  ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            <span className="text-[11px] font-bold">الأسبوع {week.week_number}</span>
            <span className={clsx('mt-0.5 text-[10px]', isSelected ? 'text-cyan-100' : 'text-muted')}>
              {week.date_range}
            </span>
            {isCurrent && !isSelected && (
              <span className="mt-1 rounded-full bg-cyan-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                الحالي
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
