import { useTodayStatus } from '@/hooks/use-academic-calendar'

/**
 * مكون بانر الإجازة
 * يظهر عندما يكون اليوم إجازة
 */
export function HolidayBanner() {
  const { data: todayStatus, isLoading } = useTodayStatus()

  // لا تعرض شيء أثناء التحميل أو إذا كان يوم عمل
  if (isLoading || !todayStatus || todayStatus.is_working_day) {
    return null
  }

  const { next_working_day_formatted } = todayStatus

  return (
    <div className="flex w-full items-center justify-center gap-2 bg-amber-50/80 dark:bg-amber-950/80 backdrop-blur-sm border-b border-amber-200/50 dark:border-amber-800/50 px-4 py-2 text-center sm:px-6 lg:px-10">
      <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/80 border border-amber-200/50 dark:border-amber-800/50">
        <span className="text-sm drop-shadow-sm">✨</span>
        <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100 tracking-wide">
          إجازة رسمية
        </p>
      </div>
      {next_working_day_formatted && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          العودة للدراسة: <span className="text-amber-900 dark:text-amber-100 font-bold">{next_working_day_formatted}</span>
        </p>
      )}
    </div>
  )
}

export default HolidayBanner
