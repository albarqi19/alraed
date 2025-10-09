import { useMemo } from 'react'
import { useTeacherSessionsQuery } from '../hooks'
import type { TeacherSession } from '../types'

const WEEK_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const

const PERIOD_TEMPLATE: Array<
  | { number: number; defaultTime: string; isBreak?: false }
  | { number: number; defaultTime: string; isBreak: true; label: string }
> = [
  { number: 1, defaultTime: '07:30 - 08:15' },
  { number: 2, defaultTime: '08:15 - 09:00' },
  { number: 3, defaultTime: '09:00 - 09:45' },
  { number: 4, defaultTime: '09:45 - 10:15', isBreak: true, label: 'فسحة' },
  { number: 5, defaultTime: '10:15 - 11:00' },
  { number: 6, defaultTime: '11:00 - 11:45' },
  { number: 7, defaultTime: '11:45 - 12:30' },
  { number: 8, defaultTime: '12:30 - 01:15' },
]

function formatTime(value?: string) {
  if (!value) return 'غير محدد'
  const [hourStr, minuteStr] = value.split(':')
  const hour = Number.parseInt(hourStr ?? '0', 10)
  if (Number.isNaN(hour)) return value
  const period = hour >= 12 ? 'م' : 'ص'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minuteStr ?? '00'} ${period}`
}

function getSessionTimeRange(session: TeacherSession) {
  const start = session.formatted_start_time ?? session.start_time
  const end = session.formatted_end_time ?? session.end_time
  if (!start || !end) return 'غير محدد'
  return `${formatTime(start)} – ${formatTime(end)}`
}

function isWeekDay(day: unknown): day is (typeof WEEK_DAYS)[number] {
  return typeof day === 'string' && (WEEK_DAYS as readonly string[]).includes(day)
}

function useScheduleMatrix(sessions: TeacherSession[]) {
  return useMemo(() => {
    const matrix: Record<number, Partial<Record<(typeof WEEK_DAYS)[number], TeacherSession>>> = {}
    const unmatched: TeacherSession[] = []

    sessions.forEach((session) => {
      const period = session.period_number
      const day = session.day

      if (!period || !isWeekDay(day)) {
        unmatched.push(session)
        return
      }

      if (!matrix[period]) {
        matrix[period] = {}
      }

      matrix[period]![day] = session
    })

    return { matrix, unmatched }
  }, [sessions])
}

function useScheduleStats(sessions: TeacherSession[]) {
  return useMemo(() => {
    const total = sessions.length
    const todaysSessions = sessions.filter((session) => session.is_today).length
    const subjects = new Set(sessions.map((session) => session.subject?.name).filter(Boolean)).size
    const classes = new Set(
      sessions
        .map((session) => (session.grade && session.class_name ? `${session.grade}-${session.class_name}` : undefined))
        .filter(Boolean),
    ).size

    return {
      total,
      todaysSessions,
      subjects,
      classes,
    }
  }, [sessions])
}

function useWeekRange(saudiTime?: string) {
  return useMemo(() => {
    if (!saudiTime) return null
    const currentDate = new Date(saudiTime)
    if (Number.isNaN(currentDate.getTime())) return null

    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const formatter = new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return `${formatter.format(startOfWeek)} - ${formatter.format(endOfWeek)}`
  }, [saudiTime])
}

export function TeacherSchedulePage() {
  const { data, isLoading, isError, refetch } = useTeacherSessionsQuery()
  const sessions = data?.sessions ?? []
  const { matrix, unmatched } = useScheduleMatrix(sessions)
  const stats = useScheduleStats(sessions)
  const weekRange = useWeekRange(data?.saudiTime)

  if (isLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-4 text-sm text-muted">جاري تحميل الجدول الأسبوعي...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="glass-card text-center">
        <p className="text-sm font-semibold text-rose-600">تعذر تحميل الجدول الأسبوعي</p>
        <button type="button" onClick={() => refetch()} className="button-secondary mt-4">
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">جدولي الدراسي</h1>
        <p className="text-sm text-muted">
          {weekRange ? `الأسبوع الحالي: ${weekRange}` : 'عرض جميع الحصص الأسبوعية'}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card text-center">
          <p className="text-3xl font-semibold text-slate-900">{stats.total}</p>
          <p className="text-xs text-muted">إجمالي الحصص</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-3xl font-semibold text-emerald-600">{stats.todaysSessions}</p>
          <p className="text-xs text-muted">حصص اليوم</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-3xl font-semibold text-sky-600">{stats.subjects}</p>
          <p className="text-xs text-muted">عدد المواد</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-3xl font-semibold text-amber-600">{stats.classes}</p>
          <p className="text-xs text-muted">عدد الفصول</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/60 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">الجدول الأسبوعي</h2>
            <p className="text-xs text-muted">يتم التحديث تلقائيًا من النظام المركزي</p>
          </div>
          <button type="button" onClick={() => refetch()} className="button-secondary">
            تحديث البيانات
          </button>
        </header>

        <div className="-mx-4 mt-4 overflow-x-auto px-4">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-3 py-3 text-center font-semibold">الحصة</th>
                <th className="px-3 py-3 text-center font-semibold">التوقيت</th>
                {WEEK_DAYS.map((day) => (
                  <th key={day} className="px-3 py-3 text-center font-semibold">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIOD_TEMPLATE.map((period) => {
                if ('isBreak' in period && period.isBreak) {
                  return (
                    <tr key={`break-${period.number}`} className="bg-amber-50 text-amber-700">
                      <td className="px-3 py-4 text-center text-sm font-semibold">{period.label}</td>
                      <td className="px-3 py-4 text-center text-xs">{period.defaultTime}</td>
                      <td className="px-3 py-4 text-center text-xs" colSpan={WEEK_DAYS.length}>
                        وقت استراحة لجميع الفصول
                      </td>
                    </tr>
                  )
                }

                const sessionsByDay = matrix[period.number] ?? {}

                return (
                  <tr key={period.number} className="even:bg-slate-50/60">
                    <td className="px-3 py-4 text-center text-sm font-semibold text-slate-900">{period.number}</td>
                    <td className="px-3 py-4 text-center text-xs text-muted">{period.defaultTime}</td>
                    {WEEK_DAYS.map((day) => {
                      const session = sessionsByDay[day]
                      if (!session) {
                        return (
                          <td key={day} className="px-3 py-4 text-center text-xs text-slate-300">
                            —
                          </td>
                        )
                      }

                      return (
                        <td key={day} className="px-3 py-4">
                          <div
                            className={`space-y-1 rounded-2xl border border-transparent px-3 py-2 ${
                              session.is_today ? 'bg-emerald-50 border-emerald-200' : 'bg-white/70'
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {session.subject?.name ?? 'مادة غير محددة'}
                            </p>
                            <p className="text-xs text-muted">
                              {session.grade} — {session.class_name}
                            </p>
                            <p className="text-xs text-emerald-600">{getSessionTimeRange(session)}</p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {unmatched.length > 0 ? (
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-slate-900">حصص بلا جدول محدد</h3>
          <p className="text-xs text-muted">
            تم جلب هذه الحصص من النظام لكن ينقصها يوم أو رقم حصة، الرجاء مراجعة التنسيق في النظام الأساسي.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {unmatched.map((session) => (
              <div key={session.id} className="py-3 text-sm">
                <p className="font-medium text-slate-900">{session.subject?.name ?? 'مادة غير محددة'}</p>
                <p className="text-xs text-muted">
                  {session.grade} — {session.class_name} | {getSessionTimeRange(session)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
