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

export function TimeColumnHeader({ period, schedules, isCurrentPeriod }: TimeColumnHeaderProps) {
  // جلب أوقات الفترة من التوقيتات
  const getScheduleTimes = () => {
    return schedules.map((schedule) => {
      const schedulePeriod = schedule.periods.find((p) => p.number === period.number)
      return {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        target_level: schedule.target_level,
        start_time: schedulePeriod?.start_time || '',
        end_time: schedulePeriod?.end_time || '',
      }
    })
  }

  const scheduleTimes = getScheduleTimes()
  const hasMultipleSchedules = scheduleTimes.length > 1

  // تحديد لون مؤشر التوقيت
  const getLevelColor = (level: string | null | undefined) => {
    if (level === 'upper') return 'bg-blue-500'
    if (level === 'lower') return 'bg-green-500'
    return 'bg-slate-400'
  }

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

      {/* الأوقات */}
      <div className="flex flex-col items-center gap-0.5">
        {scheduleTimes.map((time) => (
          <div key={time.schedule_id} className="flex items-center gap-1">
            {/* مؤشر التوقيت إذا كان هناك أكثر من توقيت */}
            {hasMultipleSchedules && (
              <span
                className={cn('h-2 w-2 rounded-full', getLevelColor(time.target_level))}
                title={time.schedule_name}
              />
            )}
            <span className="text-[10px] text-slate-500">
              {time.start_time && time.end_time ? `${time.start_time} - ${time.end_time}` : '—'}
            </span>
          </div>
        ))}
      </div>
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
