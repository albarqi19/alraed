import { useMemo, useState, useEffect, useRef } from 'react'
import { useTeacherSessionsQuery } from '../hooks'
import type { TeacherSession } from '../types'
import { InstallPWAPrompt } from '../components/install-pwa-prompt'
import clsx from 'classnames'

const WEEK_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const
type WeekDay = (typeof WEEK_DAYS)[number]

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

function isWeekDay(day: unknown): day is WeekDay {
  return typeof day === 'string' && (WEEK_DAYS as readonly string[]).includes(day)
}

function useSessionsByDay(sessions: TeacherSession[]) {
  return useMemo(() => {
    const byDay: Partial<Record<WeekDay, TeacherSession[]>> = {}
    const unmatched: TeacherSession[] = []

    sessions.forEach((session) => {
      const day = session.day
      if (!isWeekDay(day)) {
        unmatched.push(session)
        return
      }
      if (!byDay[day]) {
        byDay[day] = []
      }
      byDay[day]!.push(session)
    })

    // Sort sessions in each day by period
    Object.values(byDay).forEach(daySessions => {
      if (daySessions) {
        daySessions.sort((a, b) => (a.period_number ?? 0) - (b.period_number ?? 0))
      }
    })

    return { byDay, unmatched }
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
  const { byDay, unmatched } = useSessionsByDay(sessions)
  const stats = useScheduleStats(sessions)
  const weekRange = useWeekRange(data?.saudiTime)

  const [selectedDay, setSelectedDay] = useState<WeekDay>(WEEK_DAYS[0])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedDayRef = useRef<HTMLButtonElement>(null)
  const [showRightFog, setShowRightFog] = useState(false)
  const [showLeftFog, setShowLeftFog] = useState(false)

  const checkScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    // In RTL scrollLeft is 0 at start (right) and negative as we scroll left
    const currentScroll = Math.abs(scrollLeft)
    const maxScroll = scrollWidth - clientWidth

    setShowRightFog(currentScroll > 5)
    setShowLeftFog(currentScroll < maxScroll - 5)
  }

  // Handle scroll events and window resizing
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    checkScroll() // Initial check

    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [sessions]) // Re-run when sessions load to re-calc scrollWidth

  // Automatically select today if possible on initial load
  useEffect(() => {
    const dayIndex = new Date().getDay()
    if (dayIndex >= 0 && dayIndex <= 4) {
      setSelectedDay(WEEK_DAYS[dayIndex])
    }
  }, [])

  // تمرير شريط الأيام لإظهار اليوم المحدد في المنتصف
  useEffect(() => {
    if (selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedDay])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        <p className="mt-4 text-sm font-medium text-slate-500">جاري تحميل الجدول...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl bg-rose-50 p-8 text-center ring-1 ring-rose-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <i className="bi bi-exclamation-triangle-fill text-xl"></i>
        </div>
        <p className="mt-4 font-semibold text-rose-900">تعذر تحميل الجدول الأسبوعي</p>
        <button type="button" onClick={() => refetch()} className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 hover:bg-rose-50 transition-all">
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const currentDaySessions = byDay[selectedDay] || []

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">جدولي الدراسي</h1>
          <p className="mt-1 text-sm text-slate-500">
            {weekRange ? `الأسبوع الحالي: ${weekRange}` : 'عرض جميع الحصص الأسبوعية'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          title="تحديث البيانات"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
        >
          <i className="bi bi-arrow-clockwise text-[1.15rem]"></i>
        </button>
      </div>

      {/* Compact Stats Summary */}
      <div className="flex divide-x divide-x-reverse divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50 rounded-r-2xl">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">إجمالي الحصص</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50">
          <p className="text-2xl font-bold text-emerald-600">{stats.todaysSessions}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">حصص اليوم</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50">
          <p className="text-2xl font-bold text-sky-600">{stats.subjects}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">عدد المواد</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50 rounded-l-2xl">
          <p className="text-2xl font-bold text-amber-600">{stats.classes}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">عدد الفصول</p>
        </div>
      </div>

      {/* Days Tabs */}
      <div className="relative mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
        {/* Fog Effects for Horizontal Scrolling (Dynamic Visibility) */}
        <div className={clsx(
          "pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-300",
          showRightFog ? "opacity-100" : "opacity-0"
        )} />
        <div className={clsx(
          "pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-white to-transparent transition-opacity duration-300",
          showLeftFog ? "opacity-100" : "opacity-0"
        )} />

        <div
          ref={scrollContainerRef}
          className="relative flex items-center gap-2 overflow-x-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {WEEK_DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const daySessionsCount = byDay[day]?.length || 0;
            return (
              <button
                key={day}
                ref={isSelected ? selectedDayRef : undefined}
                onClick={() => setSelectedDay(day)}
                className={clsx(
                  "relative flex min-w-[5.5rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all duration-300",
                  isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "bg-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className="text-sm font-semibold shrink-0">{day}</span>
                <span className={clsx(
                  "flex h-5 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-bold",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {daySessionsCount} {daySessionsCount === 1 ? 'حصة' : daySessionsCount === 2 ? 'حصتان' : 'حصص'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline List */}
      <div className="mt-6 space-y-4">
        {currentDaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <i className="bi bi-calendar-x text-2xl"></i>
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">لا يوجد حصص مبرمجة</p>
            <p className="mt-1 text-sm text-slate-500">يوم معفي من الحصص، يوم موفق!</p>
          </div>
        ) : (
          currentDaySessions.map((session, index) => {
            const isStandby = session.is_standby === true;
            const isToday = session.is_today === true;
            return (
              <div key={session.id || index} className="group relative flex gap-4">
                {/* Timeline Line & Dot */}
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold shadow-sm ring-1",
                    isStandby
                      ? "bg-orange-50 text-orange-600 ring-orange-200"
                      : isToday
                        ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                        : "bg-white text-slate-900 ring-slate-200"
                  )}>
                    {session.period_number ?? '-'}
                  </div>
                  {index !== currentDaySessions.length - 1 && (
                    <div className="my-2 min-h-[3rem] w-px flex-1 bg-slate-200" />
                  )}
                </div>

                {/* Session Card */}
                <div className={clsx(
                  "flex-1 rounded-2xl p-4 shadow-sm ring-1 transition-all hover:shadow-md mb-4",
                  isStandby
                    ? "bg-gradient-to-br from-orange-50/80 to-bg-white ring-orange-200 hover:ring-orange-300"
                    : isToday
                      ? "bg-gradient-to-br from-emerald-50/50 to-white ring-emerald-200 hover:ring-emerald-300"
                      : "bg-white ring-slate-200 hover:ring-slate-300"
                )}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {session.subject?.name ?? 'مادة غير محددة'}
                        </h3>
                        {isStandby && (
                          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                            انتظار
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <i className="bi bi-people text-slate-400"></i>
                          {session.grade} {session.class_name ? `— الفصل ${session.class_name}` : ''}
                        </span>
                        {isStandby && session.replacing_teacher_name && (
                          <span className="flex items-center gap-1.5 font-medium text-orange-600">
                            <i className="bi bi-person-lines-fill"></i>
                            بديل أ. {session.replacing_teacher_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={clsx(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold self-start shrink-0",
                      isStandby ? "bg-orange-100 text-orange-700" : "bg-slate-100/80 text-slate-700"
                    )}>
                      <i className="bi bi-clock"></i>
                      {getSessionTimeRange(session)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>



      {unmatched.length > 0 && (
        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <i className="bi bi-info-circle-fill"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">حصص بلا وقت محدد</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توجد بيانات غير مكتملة المصدر تحتاج مراجعة في النظام المركزي
              </p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {unmatched.map((session) => (
              <div key={session.id} className="py-3 text-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900">{session.subject?.name ?? 'مادة غير محددة'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {session.grade} — {session.class_name}
                  </p>
                </div>
                <div className="text-xs font-medium text-slate-400 text-left">
                  {session.day || 'يوم غير محدد'}
                  {session.period_number ? <><br />حصة {session.period_number}</> : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InstallPWAPrompt />
    </div>
  )
}
