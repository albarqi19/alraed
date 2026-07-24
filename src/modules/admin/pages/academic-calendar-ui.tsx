import { useMemo } from 'react'
import { TONES, type Tone } from '@/shared/workspace'
import type { AcademicDay, AcademicEvent, AcademicWeek } from '@/services/api/academic-calendar'

/* ═══════════════════════════════════════════════════════════
   وحدات التقويم الدراسي — «مِسطرة العام» وما تحتاجه
   قناتان منفصلتان: اللون = ماذا · العتمة = متى.
   ═══════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000

export const toDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00`) : new Date(NaN))

export const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** اليوم بصيغة ISO من التوقيت المحلي — لا toISOString (UTC يعطي تاريخ أمس بين ٠٠:٠٠ و٠٣:٠٠ في السعودية) */
export const localIso = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const addDays = (iso: string, count: number) => localIso(new Date(toDate(iso).getTime() + count * DAY_MS))

export const differenceInDays = (iso: string, base: Date) => {
  if (!iso) return 0
  const diff = Math.round((startOfDay(toDate(iso)).getTime() - startOfDay(base).getTime()) / DAY_MS)
  return isNaN(diff) ? 0 : diff
}

export const formatCountdown = (diff: number) => {
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'بعد يوم واحد'
  if (diff === 2) return 'بعد يومين'
  if (diff === -1) return 'منذ يوم'
  if (diff === -2) return 'منذ يومين'
  if (diff < 0) return `منذ ${Math.abs(diff)} أيام`
  return `بعد ${diff} أيام`
}

const locale = 'ar-SA-u-nu-latn'
const fullDateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long' })
const numericFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
const monthYearFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
const monthShortFormatter = new Intl.DateTimeFormat(locale, { month: 'short' })

export const formatDateLabel = (iso: string) => {
  const date = toDate(iso)
  return isNaN(date.getTime()) ? '' : fullDateFormatter.format(date)
}

/** كل تاريخ ميلادي بـ ar-SA وحده — لا منسّق en-GB موازٍ */
export const formatNumericDate = (iso: string) => {
  const date = toDate(iso)
  return isNaN(date.getTime()) ? '—' : numericFormatter.format(date)
}

export const formatShortDate = (iso: string) => {
  const date = toDate(iso)
  return isNaN(date.getTime()) ? '' : shortDateFormatter.format(date)
}

export const formatWeekRange = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return ''
  if (startDate === endDate) return fullDateFormatter.format(toDate(startDate))

  const start = toDate(startDate)
  const end = toDate(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

  if (start.getMonth() === end.getMonth()) {
    return `${shortDateFormatter.format(start)} – ${shortDateFormatter.format(end)} · ${monthYearFormatter.format(start)}`
  }
  return `${fullDateFormatter.format(start)} – ${fullDateFormatter.format(end)}`
}

export const toArabicNumerals = (str: string) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return str.replace(/\d/g, (d) => digits[parseInt(d)])
}

/**
 * التاريخ الهجري صحيحاً.
 * `hijri_day` صيغته MM/DD في قاعدة البيانات (البذرة: '07/20' مع hijri_month='رجب' = الشهر ٧).
 * كانت الصفحة تطبع `${hijri_day}/${hijri_year}` → «٠٧/٢٠/١٤٤٧» = «٧ من الشهر ٢٠»، ولا شهر رقمه ٢٠.
 * اسم الشهر واصل جاهزاً، فيسقط الجزء MM ويُقرأ اليوم وحده.
 */
export const hijriLabel = (day: AcademicDay) => {
  const parts = (day.hijri_day ?? '').split('/')
  const dayNum = parts.length > 1 ? parts[1] : parts[0]
  return toArabicNumerals(`${dayNum} ${day.hijri_month} ${day.hijri_year}`)
}

export const getSemesterLabel = (semester?: 'first' | 'second') =>
  !semester ? '' : semester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'

/* ── نغمة اليوم: اللون للحالة وحدها ── */
export function dayTone(day: AcademicDay): Tone {
  if (day.note?.includes('اختبار')) return TONES.purple
  return day.is_working_day ? TONES.green : TONES.amber
}

/* ── نغمة المحطة ── */
export const EVENT_TONES: Record<string, Tone> = {
  start: TONES.green,
  return: TONES.green,
  holiday: TONES.amber,
  exam: TONES.purple,
  deadline: TONES.gray,
  info: TONES.gray,
}

export const eventTone = (category: string): Tone => EVENT_TONES[category] ?? TONES.gray

export const EVENT_CATEGORY_LABEL: Record<string, string> = {
  start: 'بداية',
  return: 'عودة',
  holiday: 'إجازة',
  exam: 'اختبارات',
  deadline: 'موعد ختامي',
  info: 'إعلامي',
}

/* ═══ حساب مقاطع المسطرة ═══ */

export interface RulerGap {
  key: string
  startIso: string
  endIso: string
  days: number
  event: AcademicEvent | null
}

export interface RulerModel {
  domainStart: string
  domainEnd: string
  spanDays: number
  pos: (iso: string) => number
  gaps: RulerGap[]
  months: Array<{ key: string; label: string; left: number; width: number }>
  totalDays: number
  coveredDays: number
}

/**
 * المجال زمن تقويمي حقيقي، ومقاطع الأسابيع **لا تجمع ١٠٠٪ عمداً**.
 * المساحة غير المطالَب بها هي المعلومة: ما لا أسبوع له = لا تدريس فيه.
 */
export function useRulerModel(weeks: AcademicWeek[], events: AcademicEvent[]): RulerModel | null {
  return useMemo(() => {
    if (!weeks.length) return null
    const sorted = [...weeks].sort((a, b) => a.start_date.localeCompare(b.start_date))
    const domainStart = sorted[0].start_date
    const domainEnd = addDays(sorted[sorted.length - 1].end_date, 1) // حصري
    const startMs = toDate(domainStart).getTime()
    const spanMs = toDate(domainEnd).getTime() - startMs
    if (spanMs <= 0) return null

    const pos = (iso: string) => ((toDate(iso).getTime() - startMs) / spanMs) * 100
    const spanDays = Math.round(spanMs / DAY_MS)

    // الفجوات: ما بين نهاية أسبوع وبداية الذي يليه
    const gaps: RulerGap[] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = addDays(sorted[i].end_date, 1)
      const gapEnd = addDays(sorted[i + 1].start_date, -1)
      const days = Math.round((toDate(gapEnd).getTime() - toDate(gapStart).getTime()) / DAY_MS) + 1
      if (days < 1) continue
      // الحدث الذي يغطي الفجوة يسمّيها — وما لا يفسّره حدث يبقى بلا تسمية
      const event =
        events.find((e) => e.end_date && e.event_date <= gapStart && e.end_date >= gapEnd) ?? null
      gaps.push({ key: `${gapStart}_${gapEnd}`, startIso: gapStart, endIso: gapEnd, days, event })
    }

    // محور الشهور
    const months: RulerModel['months'] = []
    const endMs = toDate(domainEnd).getTime()
    const cursor = new Date(toDate(domainStart).getFullYear(), toDate(domainStart).getMonth(), 1)
    while (cursor.getTime() < endMs) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      const from = Math.max(cursor.getTime(), startMs)
      const to = Math.min(next.getTime(), endMs)
      const left = ((from - startMs) / spanMs) * 100
      const width = ((to - from) / spanMs) * 100
      months.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, label: monthShortFormatter.format(cursor), left, width })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const coveredDays = sorted.reduce(
      (sum, w) => sum + Math.round((toDate(w.end_date).getTime() - toDate(w.start_date).getTime()) / DAY_MS) + 1,
      0,
    )

    return { domainStart, domainEnd, spanDays, pos, gaps, months, totalDays: spanDays, coveredDays }
  }, [weeks, events])
}

/* ═══ ★ لمسة التوقيع: مِسطرة العام ═══ */

interface YearRulerProps {
  model: RulerModel
  weeks: AcademicWeek[]
  events: AcademicEvent[]
  todayIso: string
  pastWeekIds: Set<number>
  currentWeekId: number | null
  hoveredEventId: number | null
  onHoverEvent: (id: number | null) => void
  onPickWeek: (weekId: number) => void
}

export function YearRuler({
  model,
  weeks,
  events,
  todayIso,
  pastWeekIds,
  currentWeekId,
  hoveredEventId,
  onHoverEvent,
  onPickWeek,
}: YearRulerProps) {
  const todayPct = model.pos(todayIso)
  const todayInRange = todayPct >= 0 && todayPct <= 100

  return (
    <div>
      {/* المضمار */}
      <div
        style={{
          position: 'relative',
          height: 34,
          border: '1px solid var(--ws-hairline)',
          borderRadius: 8,
          overflow: 'hidden',
          background: TONES.gray.bg,
        }}
      >
        {/* الفجوات المفسَّرة تُسمّى · وما لا يفسّره حدث يبقى بلا تسمية — اعتراف لا تجميل */}
        {model.gaps
          .filter((gap) => gap.days > 2)
          .map((gap) => {
            const left = model.pos(gap.startIso)
            const width = model.pos(addDays(gap.endIso, 1)) - left
            return (
              <div
                key={gap.key}
                title={
                  gap.event
                    ? `${gap.event.title} · ${gap.days} يوماً بلا تدريس`
                    : `${gap.days} أيام بلا تدريس · بلا سجل`
                }
                style={{
                  position: 'absolute',
                  insetInlineStart: `${left}%`,
                  width: `${width}%`,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: gap.event
                    ? TONES.amber.bg
                    : `repeating-linear-gradient(45deg, var(--ws-surface-2) 0 5px, transparent 5px 10px)`,
                }}
              >
                {width >= 7 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      color: gap.event ? TONES.amber.tx : 'var(--ws-text-2)',
                    }}
                  >
                    {gap.event ? gap.event.title : `${gap.days} أيام`}
                  </span>
                )}
              </div>
            )
          })}

        {/* كتل الأسابيع — بداخلها خلايا أيام لا كتلة صمّاء، فالإجازة المفردة داخل أسبوع تدريس تُرى */}
        {weeks.map((week) => {
          const left = model.pos(week.start_date)
          const width = model.pos(addDays(week.end_date, 1)) - left
          const days = week.days ?? []
          const isPast = pastWeekIds.has(week.id)
          return (
            <div
              key={week.id}
              role="button"
              tabIndex={0}
              title={`الأسبوع ${week.week_number} · ${formatWeekRange(week.start_date, week.end_date)}`}
              onClick={() => onPickWeek(week.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPickWeek(week.id)
                }
              }}
              style={{
                position: 'absolute',
                insetInlineStart: `${left}%`,
                width: `${width}%`,
                top: 0,
                bottom: 0,
                display: 'flex',
                cursor: 'pointer',
                /* العتمة تقول «متى» — القيم منقولة من .ws-timeline__item.is-past */
                opacity: isPast ? 0.55 : 1,
                filter: isPast ? 'saturate(.55)' : undefined,
                outline: currentWeekId === week.id ? `2px solid ${TONES.sky.tx}` : undefined,
                outlineOffset: -2,
                zIndex: currentWeekId === week.id ? 2 : 1,
              }}
            >
              {days.map((day) => {
                const tone = dayTone(day)
                return (
                  <span
                    key={day.id}
                    title={`${day.day_name} ${formatShortDate(day.date)}${day.note ? ` · ${day.note}` : day.is_working_day ? '' : ' · إجازة'}`}
                    style={{
                      flex: 1,
                      minWidth: 2,
                      background: tone.bg,
                      borderInlineEnd: '1px solid var(--ws-surface)',
                    }}
                  />
                )
              })}
            </div>
          )
        })}

        {/* إبرة اليوم — تعليق موضع داخل مخطط */}
        {todayInRange && (
          <div
            title={`اليوم · ${formatDateLabel(todayIso)}`}
            style={{
              position: 'absolute',
              insetInlineStart: `${todayPct}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: TONES.sky.tx,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* محور الشهور */}
      <div style={{ position: 'relative', height: 15, marginTop: 2 }}>
        {model.months.map((month) => (
          <span
            key={month.key}
            style={{
              position: 'absolute',
              insetInlineStart: `${month.left}%`,
              width: `${month.width}%`,
              textAlign: 'center',
              fontSize: 9,
              color: 'var(--ws-text-2)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {month.width >= 3 ? month.label : ''}
          </span>
        ))}
      </div>

      {/* أوتاد المحطات — ذوات end_date أشرطة ممتدة لا نقاط يوم واحد */}
      <div style={{ position: 'relative', height: 12, marginTop: 1 }}>
        {events.map((event) => {
          const left = model.pos(event.event_date)
          if (left < -1 || left > 101) return null
          const tone = eventTone(event.category)
          const spread = event.end_date ? model.pos(addDays(event.end_date, 1)) - left : 0
          const isHovered = hoveredEventId === event.id
          return (
            <span
              key={event.id}
              title={`${event.title}${event.end_date ? ` · حتى ${formatShortDate(event.end_date)}` : ''}`}
              onMouseEnter={() => onHoverEvent(event.id)}
              onMouseLeave={() => onHoverEvent(null)}
              style={{
                position: 'absolute',
                insetInlineStart: `${left}%`,
                top: 3,
                width: spread > 0.4 ? `${spread}%` : 6,
                height: 6,
                borderRadius: 3,
                background: tone.tx,
                transform: isHovered ? 'scaleY(1.9)' : undefined,
                boxShadow: isHovered ? `0 0 0 2px ${tone.bd}` : undefined,
                cursor: 'default',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── وسيلة الإيضاح: مشتقة من الحالات الحاضرة فعلاً لا من قائمة يدوية ── */
export function RulerLegend({ weeks, hasGaps, hasBareGaps, todayInRange }: {
  weeks: AcademicWeek[]
  hasGaps: boolean
  hasBareGaps: boolean
  todayInRange: boolean
}) {
  const present = useMemo(() => {
    const set = new Set<string>()
    weeks.forEach((week) =>
      (week.days ?? []).forEach((day) => {
        if (day.note?.includes('اختبار')) set.add('exam')
        else if (day.is_working_day) set.add('teaching')
        else set.add('off')
      }),
    )
    return set
  }, [weeks])

  const items: Array<{ key: string; label: string; tone: Tone; hatch?: boolean; bar?: boolean }> = []
  if (present.has('teaching')) items.push({ key: 'teaching', label: 'يجري تدريس', tone: TONES.green })
  if (present.has('off')) items.push({ key: 'off', label: 'التدريس متوقف', tone: TONES.amber })
  if (present.has('exam')) items.push({ key: 'exam', label: 'اختبارات', tone: TONES.purple })
  if (hasGaps) items.push({ key: 'gap', label: 'إجازة ممتدة', tone: TONES.amber })
  if (hasBareGaps) items.push({ key: 'bare', label: 'بلا سجل', tone: TONES.gray, hatch: true })
  if (todayInRange) items.push({ key: 'today', label: 'اليوم', tone: TONES.sky, bar: true })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 7 }}>
      {items.map((item) => (
        <span key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ws-text-2)' }}>
          <span
            style={{
              width: item.bar ? 2 : 11,
              height: 9,
              borderRadius: item.bar ? 1 : 2,
              background: item.bar
                ? item.tone.tx
                : item.hatch
                  ? `repeating-linear-gradient(45deg, var(--ws-surface-2) 0 3px, transparent 3px 6px)`
                  : item.tone.bg,
              border: item.bar ? undefined : `1px solid ${item.tone.bd}`,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
