import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Flag,
  FileText,
  GraduationCap,
  Info,
  MessageSquareOff,
  Play,
  RefreshCw,
  Timer,
  UserX,
} from 'lucide-react'
import { academicCalendarApi, type AcademicEvent, type AcademicWeek } from '@/services/api/academic-calendar'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsAlert,
  WsEmpty,
  WsIconBtn,
  WsBtn,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  YearRuler,
  RulerLegend,
  useRulerModel,
  dayTone,
  eventTone,
  EVENT_CATEGORY_LABEL,
  hijriLabel,
  formatWeekRange,
  formatNumericDate,
  formatShortDate,
  formatCountdown,
  differenceInDays,
  getSemesterLabel,
  startOfDay,
  localIso,
  toArabicNumerals,
} from './academic-calendar-ui'

type CalendarTab = 'first' | 'second' | 'all'

const tabs: Array<{ id: CalendarTab; label: string }> = [
  { id: 'first', label: 'الفصل الأول' },
  { id: 'second', label: 'الفصل الثاني' },
  { id: 'all', label: 'العام كاملاً' },
]

const EVENT_ICON: Record<string, typeof Flag> = {
  start: Play,
  return: Play,
  holiday: Flag,
  exam: FileText,
  deadline: CalendarClock,
  info: Info,
}

export function AdminAcademicCalendarPage() {
  const [selectedTab, setSelectedTab] = useState<CalendarTab | null>(null)
  const [showPreviousWeeks, setShowPreviousWeeks] = useState(false)
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null)

  const today = new Date()
  const todayTimestamp = startOfDay(today).getTime()
  // من التوقيت المحلي لا UTC — كانا مصدرين متضاربين لـ«اليوم»
  const todayIso = localIso(today)

  // جلب الفصول الدراسية
  const {
    data: semestersData,
    isLoading: loadingSemesters,
    isError: semestersError,
    refetch: refetchSemesters,
  } = useQuery({
    queryKey: ['academic-calendar', 'semesters'],
    queryFn: academicCalendarApi.getSemesters,
    staleTime: 60 * 60 * 1000,
  })

  // تحديد الفصل الحالي تلقائياً
  useEffect(() => {
    if (selectedTab !== null || !semestersData?.length) return
    const current = semestersData.find((s) => s.is_current)
    setSelectedTab((current?.code as CalendarTab) ?? 'first')
  }, [semestersData, selectedTab])

  const semesterParam = selectedTab === 'all' ? undefined : (selectedTab ?? undefined)

  // جلب الأسابيع — enabled يمنع طلباً أولاً بلا فلترة يجلب كل أسابيع كل الأعوام ثم يُرمى
  const {
    data: weeksData,
    isLoading: loadingWeeks,
    isError: weeksError,
    refetch: refetchWeeks,
  } = useQuery({
    queryKey: ['academic-calendar', 'weeks', semesterParam],
    queryFn: () => academicCalendarApi.getWeeks(semesterParam),
    staleTime: 60 * 60 * 1000,
    enabled: selectedTab !== null,
  })

  // محطات الفصل كلها — المسطرة تحتاجها لتسمية الفجوات ووضع الأوتاد، لا أقرب أربع.
  // limit صريح: الافتراضي على الخادم ١٠ والأحداث ١٢، فبدونه يُبتلع حدثان صامتاً.
  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['academic-calendar', 'events', semesterParam, 200],
    queryFn: () => academicCalendarApi.getEvents({ semester: semesterParam, limit: 200 }),
    staleTime: 30 * 60 * 1000,
    enabled: selectedTab !== null,
  })

  const semesters = useMemo(() => semestersData ?? [], [semestersData])
  const weeks: AcademicWeek[] = useMemo(() => weeksData?.data ?? [], [weeksData])
  const currentWeekFromApi = weeksData?.current_week
  const events: AcademicEvent[] = useMemo(() => eventsData ?? [], [eventsData])

  // تنظيم الأسابيع — التصنيف الثلاثي محفوظ، لكنه يقود العتمة لا ترتيب المصفوفة
  const { currentWeekData, previousWeeksCount, upcomingCount, pastWeekIds } = useMemo(() => {
    const past = new Set<number>()
    let current: AcademicWeek | null = null
    let previous = 0
    let upcoming = 0

    weeks.forEach((week) => {
      const weekStartTimestamp = new Date(week.start_date + 'T00:00:00').getTime()
      const weekEndTimestamp = new Date(week.end_date + 'T23:59:59').getTime()

      if (todayTimestamp >= weekStartTimestamp && todayTimestamp <= weekEndTimestamp) {
        current = week
      } else if (weekEndTimestamp < todayTimestamp) {
        previous += 1
        past.add(week.id)
      } else if (weekStartTimestamp > todayTimestamp) {
        upcoming += 1
      }
    })

    return {
      currentWeekData: current as AcademicWeek | null,
      previousWeeksCount: previous,
      upcomingCount: upcoming,
      pastWeekIds: past,
    }
  }, [weeks, todayTimestamp])

  // انتهى العام: كل الأسابيع منقضية — الصفحة كانت تُخرج «لا توجد أسابيع متاحة» وتبيضّ
  const seasonEnded = !currentWeekData && upcomingCount === 0 && weeks.length > 0

  // الجدول: زمنياً دائماً. المنقضية تُخفى إلا بالمفتاح — أو حين انتهى العام فلا شيء غيرها
  const tableWeeks = useMemo(() => {
    const list = showPreviousWeeks || seasonEnded ? [...weeks] : weeks.filter((w) => !pastWeekIds.has(w.id))
    return list.sort((a, b) => a.start_date.localeCompare(b.start_date))
  }, [weeks, showPreviousWeeks, seasonEnded, pastWeekIds])

  const rulerWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [weeks],
  )
  const model = useRulerModel(rulerWeeks, events)

  // عدّ صادق: من is_working_day الواصل مع كل يوم — لا من رقم total_days المبذور
  const dayCounts = useMemo(() => {
    let working = 0
    let remaining = 0
    weeks.forEach((week) =>
      (week.days ?? []).forEach((day) => {
        if (!day.is_working_day) return
        working += 1
        if (day.date >= todayIso) remaining += 1
      }),
    )
    return { working, remaining }
  }, [weeks, todayIso])

  const nextMilestone = useMemo(
    () =>
      events
        .filter((e) => e.event_date >= todayIso)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))[0] ?? null,
    [events, todayIso],
  )

  const longestGap = useMemo(() => {
    if (!model) return null
    const upcomingGaps = model.gaps.filter((g) => g.endIso >= todayIso)
    if (!upcomingGaps.length) return null
    return upcomingGaps.reduce((max, gap) => (gap.days > max.days ? gap : max))
  }, [model, todayIso])

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events],
  )

  const activeSemester = useMemo(
    () => (selectedTab && selectedTab !== 'all' ? semesters.find((s) => s.code === selectedTab) : null),
    [selectedTab, semesters],
  )

  const weeksPerTab = useMemo(() => {
    const first = semesters.find((s) => s.code === 'first')?.total_weeks ?? 0
    const second = semesters.find((s) => s.code === 'second')?.total_weeks ?? 0
    return { first, second, all: first + second }
  }, [semesters])

  // أكثر من عام دراسي في الاستجابة: الـ endpoints لا تفلتر بالعام، والمسطرة تنهار نسبها
  const multipleYears = useMemo(
    () => new Set(semesters.map((s) => s.academic_year)).size > 1,
    [semesters],
  )

  const pickWeek = (weekId: number) => {
    const row = document.getElementById(`ws-week-${weekId}`)
    if (!row) return
    row.scrollIntoView({ behavior: 'smooth', block: 'start' })
    row.classList.remove('ws-soft-pulse')
    void row.offsetWidth
    row.classList.add('ws-soft-pulse')
  }

  const todayPct = model ? model.pos(todayIso) : -1
  const todayInRange = todayPct >= 0 && todayPct <= 100

  return (
    <WsPage>
      <WsHeader
        title={`التقويم الدراسي ${semesters[0]?.academic_year ?? ''}`}
        badge={seasonEnded ? 'انتهى العام الدراسي' : undefined}
        actions={
          <WsIconBtn
            icon={RefreshCw}
            label="إعادة الجلب"
            onClick={() => {
              void refetchSemesters()
              void refetchWeeks()
            }}
          />
        }
        facts={
          <>
            <WsFact icon={CalendarRange} label="الفصل">
              {activeSemester
                ? `${activeSemester.name} · ${formatShortDate(activeSemester.start_date)} ← ${formatShortDate(activeSemester.end_date)}`
                : selectedTab === 'all'
                  ? 'العام كاملاً'
                  : '—'}
            </WsFact>
            <WsFact icon={Timer} label="الأسبوع">
              {/* من current_week الخام لا من القائمة المفلترة بالتبويب */}
              {currentWeekFromApi ? (
                <span style={{ color: TONES.sky.tx }}>
                  {currentWeekFromApi.week_number}
                  {selectedTab !== 'all' && activeSemester ? ` من ${activeSemester.total_weeks}` : ''}
                </span>
              ) : (
                'خارج الموسم'
              )}
            </WsFact>
            <WsFact icon={GraduationCap} label="أيام دراسية">
              <span style={{ color: TONES.green.tx }}>{dayCounts.remaining}</span>
              <span style={{ color: 'var(--ws-text-2)' }}> متبقٍ من {dayCounts.working}</span>
            </WsFact>
            <WsFact icon={CalendarClock} label="المحطة التالية">
              {nextMilestone
                ? `${nextMilestone.title} · ${formatCountdown(differenceInDays(nextMilestone.event_date, today))}`
                : '—'}
            </WsFact>
            <WsFact icon={CalendarOff} label="أطول توقف قادم">
              {longestGap ? (
                <span style={{ color: TONES.amber.tx }}>{longestGap.days} يوماً</span>
              ) : (
                '—'
              )}
            </WsFact>
          </>
        }
      >
        <ToneChip tone={TONES.gray}>تقويم موحّد — لا يُعدَّل من المدرسة</ToneChip>
      </WsHeader>

      <WsToolbar>
        <WsField label="النطاق">
          <div className="ws-seg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ws-seg__btn ${tab.id === selectedTab ? 'is-active' : ''}`}
                onClick={() => setSelectedTab(tab.id)}
              >
                {tab.label}
                {weeksPerTab[tab.id] > 0 && <span className="ws-count">{weeksPerTab[tab.id]}</span>}
              </button>
            ))}
          </div>
        </WsField>
        <WsField label={seasonEnded ? 'الأسابيع (الكل منتهٍ)' : `إظهار المنتهية (${previousWeeksCount})`}>
          <WsSwitch
            checked={showPreviousWeeks || seasonEnded}
            onChange={setShowPreviousWeeks}
            disabled={seasonEnded}
          />
        </WsField>
        {multipleYears && (
          <WsAlert tone="warn" boxed>
            الاستجابة تحوي أكثر من عام دراسي — المسطرة تمتد عليها كلها
          </WsAlert>
        )}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* ★ مِسطرة العام — أطروحتها الفراغ: ما لا أسبوع له لا تدريس فيه */}
          <WsBlock padded>
            {loadingWeeks || !model ? (
              <div style={{ height: 34, borderRadius: 8, background: 'var(--ws-surface-2)' }} />
            ) : (
              <>
                <YearRuler
                  model={model}
                  weeks={rulerWeeks}
                  events={sortedEvents}
                  todayIso={todayIso}
                  pastWeekIds={pastWeekIds}
                  currentWeekId={currentWeekData?.id ?? null}
                  hoveredEventId={hoveredEventId}
                  onHoverEvent={setHoveredEventId}
                  onPickWeek={pickWeek}
                />
                <RulerLegend
                  weeks={rulerWeeks}
                  hasGaps={model.gaps.some((g) => g.days > 2 && g.event)}
                  hasBareGaps={model.gaps.some((g) => g.days > 2 && !g.event)}
                  todayInRange={todayInRange}
                />
                <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  {model.totalDays} يوماً تقويمياً · {model.coveredDays} منها في أسابيع دراسية ·{' '}
                  <b style={{ color: TONES.amber.tx }}>{model.totalDays - model.coveredDays}</b> بلا أي أسبوع
                  {!todayInRange && ' · اليوم خارج نطاق التقويم'}
                </p>
              </>
            )}
          </WsBlock>

          {/* جدول واحد متصل — لا ١٩ جدولاً كلٌّ في صندوق انزلاق مستقل */}
          <WsBlock
            fill
            scroll
            title="الأيام"
            icon={CalendarDays}
            count={tableWeeks.reduce((sum, w) => sum + (w.days?.length ?? 0), 0)}
          >
            {weeksError ? (
              <WsAlert tone="error" boxed>
                تعذّر تحميل الأسابيع.
                <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetchWeeks()}>
                  إعادة المحاولة
                </WsBtn>
              </WsAlert>
            ) : loadingWeeks ? (
              <WsEmpty loading>جارٍ تحميل الأسابيع...</WsEmpty>
            ) : tableWeeks.length === 0 ? (
              <WsEmpty icon={CalendarDays}>لا توجد أسابيع في هذا النطاق</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th style={{ width: 92 }}>اليوم</th>
                    <th style={{ width: 130 }}>هجري</th>
                    <th style={{ width: 110 }}>ميلادي</th>
                    <th>الحالة والملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {tableWeeks.map((week) => {
                    const days = week.days ?? []
                    const workingCount = days.filter((d) => d.is_working_day).length
                    const isPast = pastWeekIds.has(week.id)
                    const isCurrent = currentWeekData?.id === week.id
                    return (
                      <Fragment key={week.id}>
                        {/* صف مجموعة لاصق — الشهران يصعدان إليه بدل تكرارهما خمس مرات في كل أسبوع */}
                        <tr id={`ws-week-${week.id}`}>
                          <td
                            colSpan={4}
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 2,
                              background: isCurrent ? TONES.sky.bg : 'var(--ws-surface-2)',
                              borderBottom: '1px solid var(--ws-hairline)',
                              fontSize: 11,
                              fontWeight: 700,
                              opacity: isPast ? 0.62 : 1,
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <span style={{ color: isCurrent ? TONES.sky.tx : undefined }}>
                                الأسبوع {week.week_number}
                              </span>
                              <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>
                                {formatWeekRange(week.start_date, week.end_date)}
                              </span>
                              {days[0] && (
                                <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>
                                  · {toArabicNumerals(`${days[0].hijri_month} ${days[0].hijri_year}`)}
                                </span>
                              )}
                              <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>· {days.length} أيام</span>
                              {workingCount === 0 ? (
                                <ToneChip tone={TONES.amber}>صفر تدريس</ToneChip>
                              ) : workingCount < days.length ? (
                                <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>
                                  · {workingCount} تدريس
                                </span>
                              ) : null}
                              {isCurrent && <ToneChip tone={TONES.sky}>الأسبوع الحالي</ToneChip>}
                              {week.semester?.code && selectedTab === 'all' && (
                                <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>
                                  · {getSemesterLabel(week.semester.code)}
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                        {days.map((day) => {
                          const isToday = day.date === todayIso
                          const tone = dayTone(day)
                          return (
                            <tr
                              key={day.id}
                              style={{
                                background: isToday ? TONES.sky.bg : undefined,
                                opacity: isPast ? 0.62 : 1,
                              }}
                            >
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  {isToday && (
                                    <span
                                      title="اليوم"
                                      style={{ width: 6, height: 6, borderRadius: '50%', background: TONES.sky.tx }}
                                    />
                                  )}
                                  <span style={{ fontWeight: 600 }}>{day.day_name}</span>
                                </span>
                              </td>
                              <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ws-text-2)' }}>
                                {hijriLabel(day)}
                              </td>
                              <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ws-text-2)' }}>
                                {formatNumericDate(day.date)}
                              </td>
                              <td>
                                {/* اللون للاستثناء وحده — غياب الشارة = يوم دراسي */}
                                {day.note ? (
                                  <ToneChip tone={tone}>{day.note}</ToneChip>
                                ) : !day.is_working_day ? (
                                  <ToneChip tone={TONES.amber}>إجازة</ToneChip>
                                ) : (
                                  <span style={{ color: 'var(--ws-text-2)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        {/* ═══ المحطات — end_date والأثر التشغيلي يخرجان للنور ═══ */}
        <WsSideCol side="end" title="المحطات" icon={Flag} storageKey="ws:academic-calendar:sidecol" width={320}>
          <WsBlock fill scroll>
            {loadingEvents ? (
              <WsEmpty loading>جارٍ تحميل المحطات...</WsEmpty>
            ) : sortedEvents.length === 0 ? (
              <WsEmpty icon={CalendarCheck}>
                {seasonEnded ? 'انتهى العام الدراسي — لا محطات قادمة' : 'لا محطات في هذا النطاق'}
              </WsEmpty>
            ) : (
              <div className="ws-timeline" style={{ padding: 10 }}>
                {sortedEvents.map((event) => {
                  const diff = differenceInDays(event.event_date, today)
                  const tone = eventTone(event.category)
                  const Icon = EVENT_ICON[event.category] ?? Info
                  const isPast = event.event_date < todayIso
                  const isNext = nextMilestone?.id === event.id
                  const spanDays = event.end_date
                    ? Math.round(
                        (new Date(event.end_date).getTime() - new Date(event.event_date).getTime()) / 86_400_000,
                      ) + 1
                    : 0
                  // التناقض الذي ترسمه المسطرة، معترَفاً به بالكلمات:
                  // وتد «العودة» يقف فوق خلية يومه الكهرمانية — الباك إند يتبع اليوم لا الحدث
                  const dayOfEvent = weeks
                    .flatMap((w) => w.days ?? [])
                    .find((d) => d.date === event.event_date)
                  const contradicts =
                    (event.category === 'return' || event.category === 'start') &&
                    dayOfEvent != null &&
                    !dayOfEvent.is_working_day

                  return (
                    <div
                      key={event.id}
                      className={`ws-timeline__item ${isPast ? 'is-past' : ''} ${isNext ? 'is-current' : ''}`}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      style={hoveredEventId === event.id ? { background: 'var(--ws-surface-2)', borderRadius: 7 } : undefined}
                    >
                      <span className="ws-timeline__node">
                        <span className="ws-timeline__dot" style={{ background: tone.tx }}>
                          <Icon style={{ width: 9, height: 9, color: '#fff' }} />
                        </span>
                      </span>
                      <span className="ws-timeline__time">{formatCountdown(diff)}</span>
                      {/* لا ws-timeline__card — يحمل حافة ملوّنة مخبوزة */}
                      <div style={{ paddingBottom: 9 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{event.title}</p>
                        {event.description && (
                          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.65 }}>
                            {event.description}
                          </p>
                        )}
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--ws-text-2)' }}>
                          {formatShortDate(event.event_date)}
                          {event.hijri_date && ` · ${toArabicNumerals(event.hijri_date)}`}
                        </p>
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                          <ToneChip tone={tone}>{EVENT_CATEGORY_LABEL[event.category] ?? event.category}</ToneChip>
                          {/* إجازة ٢٤ يوماً كانت تظهر نقطة يوم واحد */}
                          {spanDays > 1 && (
                            <ToneChip tone={tone}>
                              {formatShortDate(event.event_date)} ← {formatShortDate(event.end_date!)} · {spanDays} يوماً
                            </ToneChip>
                          )}
                          {event.blocks_messages && (
                            <span className="ws-chip" style={{ color: TONES.amber.tx, borderColor: TONES.amber.bd, background: TONES.amber.bg }}>
                              <MessageSquareOff style={{ width: 10, height: 10 }} /> الرسائل محجوبة
                            </span>
                          )}
                          {event.affects_attendance && (
                            <span className="ws-chip" style={{ color: TONES.amber.tx, borderColor: TONES.amber.bd, background: TONES.amber.bg }}>
                              <UserX style={{ width: 10, height: 10 }} /> لا يُحتسب غياب
                            </span>
                          )}
                          {contradicts && <ToneChip tone={TONES.amber}>لكن يومه مسجَّل إجازة</ToneChip>}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {semestersError && (
        <WsAlert tone="error" boxed>
          تعذّر تحميل الفصول الدراسية.
          <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetchSemesters()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}
      {loadingSemesters && !semesters.length && <WsEmpty loading>جارٍ تحميل التقويم...</WsEmpty>}
    </WsPage>
  )
}
