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
    <div className="glass-card border-r-4 border-r-amber-500 bg-gradient-to-l from-amber-50/50 to-white">
      <div className="flex items-center gap-4 text-right">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          🌙
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">
            إجازة
          </h3>
          {next_working_day_formatted && (
            <p className="text-sm text-slate-600">
              تبدأ الدراسة مجددًا يوم {next_working_day_formatted}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default HolidayBanner
