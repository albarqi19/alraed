// =============================================
// رأس العمود مع الوقت
// Time Column Header Component
// =============================================

import { cn } from '@/lib/utils'
import type { TrackerPeriod, TrackerSchedule } from '../types'

interface TimeColumnHeaderProps {
  period: TrackerPeriod
  schedules: TrackerSchedule[]
  isCurrentPeriod?: boolean
}

export function TimeColumnHeader({ period, schedules: _schedules, isCurrentPeriod }: TimeColumnHeaderProps) {
  // تحديد لون مؤشر التوقيت
  const getLevelColor = (level: string | null | undefined) => {
    if (level === 'upper') return 'bg-blue-500'
    if (level === 'lower') return 'bg-green-500'
    return 'bg-slate-400'
  }

  // للفترات المتداخلة: عرض التوقيت الخاص بها مع مؤشر المرحلة
  if (period.is_overlapping && period.start_time && period.end_time) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 px-2 py-2',
          isCurrentPeriod && 'bg-indigo-50'
        )}
      >
        {/* اسم الفترة مع المرحلة */}
        <span
          className={cn(
            'text-xs font-semibold text-center leading-tight',
            isCurrentPeriod ? 'text-indigo-700' : 'text-slate-700'
          )}
        >
          {period.name}
        </span>

        {/* الوقت مع مؤشر اللون */}
        <div className="flex items-center gap-1">
          <span
            className={cn('h-2 w-2 rounded-full flex-shrink-0', getLevelColor(period.target_level))}
            title={period.target_level === 'upper' ? 'العليا' : 'الأولية'}
          />
          <span className="text-[10px] text-slate-500">
            {period.start_time} - {period.end_time}
          </span>
        </div>
      </div>
    )
  }

  // للفترات الموحدة: عرض الوقت مباشرة من بيانات الفترة
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-2 py-2',
        isCurrentPeriod && 'bg-indigo-50'
      )}
    >
      {/* اسم الفترة */}
      <span
        className={cn(
          'text-sm font-semibold',
          isCurrentPeriod ? 'text-indigo-700' : 'text-slate-700'
        )}
      >
        {period.name}
      </span>

      {/* الوقت */}
      <span className="text-[10px] text-slate-500">
        {period.start_time && period.end_time ? `${period.start_time} - ${period.end_time}` : '—'}
      </span>
    </div>
  )
}

// مكون رأس عمود اسم المعلم
interface TeacherNameHeaderProps {
  schedules: TrackerSchedule[]
}

export function TeacherNameHeader({ schedules }: TeacherNameHeaderProps) {
  const hasMultipleSchedules = schedules.length > 1

  return (
    <div className="flex flex-col items-start justify-center px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">المعلم</span>

      {/* دليل التوقيتات */}
      {hasMultipleSchedules && (
        <div className="mt-1 flex flex-col gap-0.5">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex items-center gap-1">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  schedule.target_level === 'upper' ? 'bg-blue-500' : 'bg-green-500'
                )}
              />
              <span className="text-[10px] text-slate-500">{schedule.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
