import { useMemo, useState } from 'react'
import { CalendarClock, CalendarDays, Flag, Sparkles, Timer } from 'lucide-react'

import type { AcademicMilestoneCategory, AcademicWeek, SemesterId } from '../constants/academic-calendar-data'
import {
  academicCalendarWeeks,
  academicSemesterSummaries,
  getCurrentAcademicWeek,
  getUpcomingMilestones,
  getWeeksBySemester,
} from '../constants/academic-calendar-data'

type CalendarTab = SemesterId | 'all'

const locale = 'ar-SA'
const fullDateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long' })
const numericFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
const monthYearFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })

// للتاريخ الميلادي بأرقام إنجليزية
const gregorianNumericFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

// دالة لتحويل الأرقام الإنجليزية إلى عربية
const toArabicNumerals = (str: string) => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return str.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)])
}

const tabs: Array<{ id: CalendarTab; label: string }> = [
  { id: 'first', label: 'الفصل الدراسي الأول' },
  { id: 'second', label: 'الفصل الدراسي الثاني' },
  { id: 'all', label: 'عرض العام كاملًا' },
]

const categoryMeta: Record<AcademicMilestoneCategory | 'info', { label: string; badge: string; dot: string }> = {
  start: {
    label: 'بداية الفصل',
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-400',
  },
  holiday: {
    label: 'إجازة / مناسبة',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-400',
  },
  exam: {
    label: 'اختبارات',
    badge: 'border border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-400',
  },
  return: {
    label: 'عودة الدراسة',
    badge: 'border border-sky-200 bg-sky-50 text-sky-700',
    dot: 'bg-sky-400',
  },
  deadline: {
    label: 'موعد ختامي',
    badge: 'border border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
  info: {
    label: 'حدث',
    badge: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-400',
  },
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00`)

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const differenceInDays = (iso: string, base: Date) => {
  const target = startOfDay(toDate(iso))
  const current = startOfDay(base)
  const diff = Math.round((target.getTime() - current.getTime()) / 86_400_000)
  return diff
}

const formatCountdown = (diff: number) => {
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'بعد يوم واحد'
  if (diff === 2) return 'بعد يومين'
  if (diff === -1) return 'منذ يوم'
  if (diff === -2) return 'منذ يومين'
  if (diff < 0) return `منذ ${Math.abs(diff)} أيام`
  return `بعد ${diff} أيام`
}

const formatWeekRange = (week: AcademicWeek) => {
  if (week.startIso === week.endIso) {
    return fullDateFormatter.format(toDate(week.startIso))
  }

  const start = toDate(week.startIso)
  const end = toDate(week.endIso)

  if (start.getMonth() === end.getMonth()) {
    const startDay = shortDateFormatter.format(start)
    const endDay = shortDateFormatter.format(end)
    const monthLabel = monthYearFormatter.format(start)
    return `${startDay} - ${endDay} • ${monthLabel}`
  }

  return `${fullDateFormatter.format(start)} - ${fullDateFormatter.format(end)}`
}

const formatDateLabel = (iso: string) => fullDateFormatter.format(toDate(iso))

const formatNumericDate = (iso: string) => numericFormatter.format(toDate(iso))

const detectNoteCategory = (note?: string): AcademicMilestoneCategory | 'info' => {
  if (!note) return 'info'
  if (note.includes('إجازة')) return 'holiday'
  if (note.includes('اختبار')) return 'exam'
  if (note.includes('اليوم الوطني')) return 'holiday'
  if (note.includes('نهاية')) return 'deadline'
  if (note.includes('عودة')) return 'return'
  if (note.includes('بداية')) return 'start'
  return 'info'
}

const getSemesterLabel = (semester: SemesterId) => (semester === 'first' ? 'الفصل الأول' : 'الفصل الثاني')

const allYearSummary = {
  id: 'all',
  title: 'العام الدراسي 1447/1448 هـ',
  startIso: academicSemesterSummaries.first.startIso,
  endIso: academicSemesterSummaries.second.endIso,
  startHijri: academicSemesterSummaries.first.startHijri,
  endHijri: academicSemesterSummaries.second.endHijri,
  totalWeeks: academicSemesterSummaries.first.totalWeeks + academicSemesterSummaries.second.totalWeeks,
  totalDays: academicSemesterSummaries.first.totalDays + academicSemesterSummaries.second.totalDays,
}

export function AdminAcademicCalendarPage() {
  const [selectedTab, setSelectedTab] = useState<CalendarTab>('first')
  const [showPreviousWeeks, setShowPreviousWeeks] = useState(false)

  const today = new Date()
  const todayTimestamp = startOfDay(today).getTime()

  const currentWeek = useMemo(() => getCurrentAcademicWeek(today), [today])
  const weeksForTab = useMemo(() => {
    if (selectedTab === 'all') {
      return academicCalendarWeeks
    }
    return getWeeksBySemester(selectedTab)
  }, [selectedTab])

  const milestoneWindow = useMemo(() => getUpcomingMilestones(today, 4), [today])
  const nextMilestone = milestoneWindow[0]

  const summaries = useMemo(() => {
    if (selectedTab === 'all') {
      return [allYearSummary]
    }
    return [academicSemesterSummaries[selectedTab]]
  }, [selectedTab])

  const highlightWeekId = currentWeek?.id ?? null

  // تنظيم الأسابيع: الحالي، القادمة، السابقة
  const { orderedWeeks, currentWeekData } = useMemo(() => {
    const previous: AcademicWeek[] = []
    const upcoming: AcademicWeek[] = []
    let current: AcademicWeek | null = null

    weeksForTab.forEach((week) => {
      if (highlightWeekId && week.id === highlightWeekId) {
        current = week
      } else if (week.timestamps.end < todayTimestamp) {
        previous.push(week)
      } else {
        upcoming.push(week)
      }
    })

    previous.sort((a, b) => b.timestamps.start - a.timestamps.start)
    upcoming.sort((a, b) => a.timestamps.start - b.timestamps.start)

    if (!current && (upcoming.length > 0 || previous.length > 0)) {
      current = upcoming[0] ?? previous[0] ?? null
      if (current) {
        const filtered = weeksForTab.filter((w) => w.id !== current?.id)
        const newPrevious = filtered.filter((w) => w.timestamps.end < todayTimestamp)
        const newUpcoming = filtered.filter((w) => w.timestamps.end >= todayTimestamp)
        newPrevious.sort((a, b) => b.timestamps.start - a.timestamps.start)
        newUpcoming.sort((a, b) => a.timestamps.start - b.timestamps.start)
        
        const list: AcademicWeek[] = []
        if (current) list.push(current)
        list.push(...newUpcoming)
        if (showPreviousWeeks) list.push(...newPrevious)
        
        return { orderedWeeks: list, currentWeekData: current }
      }
    }

    const list: AcademicWeek[] = []
    if (current) list.push(current)
    list.push(...upcoming)
    if (showPreviousWeeks) list.push(...previous)

    return { orderedWeeks: list, currentWeekData: current }
  }, [weeksForTab, highlightWeekId, todayTimestamp, showPreviousWeeks])

  return (
    <section className="space-y-10" dir="rtl">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">لوحة التقويم المدرسي</p>
            <h1 className="text-3xl font-bold text-slate-900">التقويم الدراسي 1447/1448 هـ</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              راقب مواعيد الدراسة والإجازات عبر تجربة تفاعلية منظمة. يمكنك استعراض الأسابيع، متابعة الأحداث المهمة،
              ومعرفة العد التنازلي لأهم المحطات خلال العام الدراسي.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm">
              <p className="text-xs font-medium text-indigo-600">الحدث القادم</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-base font-semibold text-indigo-900">
                  {nextMilestone ? nextMilestone.title : 'لا أحداث قريبة'}
                </p>
                <CalendarClock className="h-5 w-5 text-indigo-500" />
              </div>
              {nextMilestone ? (
                <div className="mt-3 space-y-2 text-sm text-indigo-900/80">
                  <p>{formatDateLabel(nextMilestone.isoDate)}</p>
                  <p className="text-xs font-medium text-indigo-600">
                    {formatCountdown(differenceInDays(nextMilestone.isoDate, today))}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-indigo-600">تم عرض آخر الأحداث المنتهية.</p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
              <p className="text-xs font-medium text-emerald-600">الأسبوع الحالي</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-base font-semibold text-emerald-900">
                  {currentWeek ? `الأسبوع ${currentWeek.week}` : 'خارج الموسم الدراسي'}
                </p>
                <Timer className="h-5 w-5 text-emerald-500" />
              </div>
              {currentWeek ? (
                <div className="mt-3 space-y-1 text-xs text-emerald-700">
                  <p>{getSemesterLabel(currentWeek.semester)}</p>
                  <p>{formatWeekRange(currentWeek)}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-emerald-600">لا توجد أسابيع محددة حاليًا.</p>
              )}
            </div>

            {summaries.map((summary) => (
              <div key={summary.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">نظرة عامة</p>
                <div className="mt-3 space-y-2">
                  <p className="text-base font-semibold text-slate-900">{summary.title}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <p className="font-medium text-slate-700">البداية</p>
                      <p>{formatNumericDate(summary.startIso)}</p>
                      <p className="text-[11px] text-slate-500">{summary.startHijri}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">النهاية</p>
                      <p>{formatNumericDate(summary.endIso)}</p>
                      <p className="text-[11px] text-slate-500">{summary.endHijri}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">عدد الأسابيع</p>
                      <p>{summary.totalWeeks} أسبوع</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">عدد الأيام</p>
                      <p>{summary.totalDays} يوم دراسي</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">أحدث المحطات</p>
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                {milestoneWindow.map((milestone) => {
                  const diff = differenceInDays(milestone.isoDate, today)
                  const meta = categoryMeta[milestone.category]
                  return (
                    <div key={milestone.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{milestone.title}</p>
                        <p className="text-[11px] text-slate-500">{formatDateLabel(milestone.isoDate)}</p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${meta.badge}`}>
                        {formatCountdown(diff)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <Sparkles className="absolute left-6 top-6 h-12 w-12 text-indigo-200" />
        <Sparkles className="absolute right-16 bottom-6 h-16 w-16 text-indigo-100" />
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === selectedTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
                  className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-indigo-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600">
            {(['holiday', 'exam', 'deadline', 'return', 'start'] as Array<AcademicMilestoneCategory>).map((key) => {
              const meta = categoryMeta[key]
              return (
                <span key={key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <span>{meta.label}</span>
                </span>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-600">عرض الأسابيع</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  showPreviousWeeks
                    ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                }`}
                onClick={() => setShowPreviousWeeks((prev) => !prev)}
              >
                {showPreviousWeeks ? 'إخفاء الأسابيع السابقة' : 'عرض الأسابيع السابقة'}
              </button>
              {currentWeekData ? (
                <span className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                  الأسبوع الحالي أولًا
                </span>
              ) : null}
            </div>
          </div>

          {orderedWeeks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500">
              لا توجد أسابيع متاحة في هذا النطاق.
            </div>
          ) : (
            orderedWeeks.map((week, index) => {
              const isCurrentWeek = currentWeekData?.id === week.id
              const weekLabel = getSemesterLabel(week.semester)
              const isActiveWeek = todayTimestamp >= week.timestamps.start && todayTimestamp <= week.timestamps.end
              const isPastWeek = week.timestamps.end < todayTimestamp
              
              const statusLabel = isActiveWeek ? 'الأسبوع الحالي' : isPastWeek ? 'منتهي' : 'قادِم'
              const statusStyle = isActiveWeek
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : isPastWeek
                  ? 'border-slate-200 bg-slate-100 text-slate-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'

              return (
                <div
                  key={week.id}
                  className={`rounded-3xl border bg-white/90 p-6 shadow-sm backdrop-blur transition ${
                    isCurrentWeek
                      ? 'border-indigo-400 shadow-indigo-100'
                      : 'border-slate-200 hover:border-indigo-200/60'
                  }`}
                >
                  {index === 0 && isCurrentWeek ? (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      يتم عرض هذا الأسبوع أولًا
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-indigo-500">{weekLabel}</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">الأسبوع {week.week}</h2>
                      <p className="text-xs text-slate-500">{formatWeekRange(week)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 self-start md:items-center">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyle}`}>
                        {statusLabel}
                      </span>
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        <span>{week.days.length} أيام</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">اليوم</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">التاريخ الهجري</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">الشهر الهجري</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">التاريخ الميلادي</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">الشهر الميلادي</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {week.days.map((day) => {
                          const isToday = Math.abs(day.timestamp - todayTimestamp) < 1
                          const noteCategory = detectNoteCategory(day.note)
                          const meta = categoryMeta[noteCategory]

                          return (
                            <tr
                              key={day.id}
                              className={`border-b border-slate-100 transition ${
                                isToday
                                  ? 'bg-indigo-50'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  {isToday && (
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" title="اليوم" />
                                  )}
                                  <span className="font-medium text-slate-900">{day.dayName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-slate-700">
                                {toArabicNumerals(`${day.hijriDay}/${day.hijriYear}`)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {day.hijriMonth}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-slate-700">
                                {gregorianNumericFormatter.format(toDate(day.gregorianIso))}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {day.gregorianMonth}
                              </td>
                              <td className="px-3 py-2.5">
                                {day.note ? (
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
                                    <Flag className="h-3 w-3" />
                                    {day.note}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    {isToday ? 'اليوم الدراسي' : '—'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
