import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  ListPlus,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Trash2,
  Zap,
} from 'lucide-react'
import {
  useActivateScheduleMutation,
  useApplyScheduleToMultipleClassesMutation,
  useClassScheduleSummaryQuery,
  useCreateScheduleMutation,
  useDeactivateScheduleMutation,
  useDeleteScheduleMutation,
  useSchedulesQuery,
  useScheduleTemplatesQuery,
  useUpdateScheduleMutation,
} from '../hooks'
import type { ScheduleRecord, ScheduleTemplate, ScheduleType, ClassScheduleSummary, SchedulePeriod } from '../types'
import {
  TONES,
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsTextarea,
} from '@/shared/workspace'
import { DayCard, chip } from './dashboard-ui'

type ScheduleStatusFilter = 'all' | 'active' | 'inactive'

interface SchedulePeriodFormValue {
  key: string
  period_number: string
  period_name: string
  start_time: string
  end_time: string
  is_break: boolean
  break_duration: string
}

interface ScheduleFormValues {
  name: string
  type: ScheduleType
  target_level: string
  description: string
  periods: SchedulePeriodFormValue[]
}

interface ScheduleFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    name: string
    type: ScheduleType
    target_level?: string | null
    description?: string | null
    periods: Array<{
      period_number: number
      start_time: string
      end_time: string
      is_break: boolean
      break_duration?: number | null
      period_name?: string | null
    }>
  }) => void
  isSubmitting: boolean
  schedule?: ScheduleRecord | null
  templates?: ScheduleTemplate[]
}

interface ConfirmDeleteDialogProps {
  open: boolean
  schedule?: ScheduleRecord | null
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

interface ApplyScheduleToClassesDialogProps {
  open: boolean
  schedule?: ScheduleRecord | null
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: (selectedClasses: Array<{ grade: string; class_name: string }>) => void
}

type ScheduleFormSubmitPayload = Parameters<ScheduleFormDialogProps['onSubmit']>[0]

const scheduleTypeLabels: Record<ScheduleType, string> = {
  winter: 'شتوي',
  summer: 'صيفي',
  custom: 'مخصص',
}

const scheduleTypeDescriptions: Record<ScheduleType, string> = {
  winter: 'مناسب لأوقات الدوام الشتوي',
  summer: 'مناسب لأوقات الدوام الصيفي',
  custom: 'جدول مخصص قابل للتعديل بالكامل',
}

type QuickScheduleEntryType = 'class' | 'break' | 'prayer'

interface QuickAddBreakFormValue {
  id: string
  afterPeriod: string
  duration: string
}

interface QuickAddPrayerFormValue {
  id: string
  afterPeriod: string
  duration: string
  name: string
}

interface QuickAddScheduleFormValues {
  scheduleName: string
  semesterType: ScheduleType
  targetLevel: string
  periodDuration: string
  firstPeriodStart: string
  numberOfPeriods: string
  breaksEnabled: boolean
  breaks: QuickAddBreakFormValue[]
  prayersEnabled: boolean
  prayers: QuickAddPrayerFormValue[]
}

interface QuickAddErrorState {
  scheduleName?: string | null
  semesterType?: string | null
  periodDuration?: string | null
  firstPeriodStart?: string | null
  numberOfPeriods?: string | null
  breaks?: string | null
  prayers?: string | null
  overlap?: string | null
  breaksById: Record<string, { afterPeriod?: string | null; duration?: string | null }>
  prayersById: Record<string, { afterPeriod?: string | null; duration?: string | null; name?: string | null }>
}

interface QuickNormalizedBreak {
  id: string
  afterPeriod: number
  duration: number
}

interface QuickNormalizedPrayer {
  id: string
  afterPeriod: number
  duration: number
  name: string
}

interface QuickNormalizedValues {
  scheduleName: string
  semesterType: ScheduleType
  targetLevel: string
  periodDuration: number
  firstPeriodStart: string
  numberOfPeriods: number
  breaks: QuickNormalizedBreak[]
  prayers: QuickNormalizedPrayer[]
}

interface QuickScheduleEntry {
  sequence: number
  type: QuickScheduleEntryType
  typeLabel: string
  name?: string | null
  startTime: string
  endTime: string
  duration: number
}

interface QuickScheduleGenerationResult {
  entries: QuickScheduleEntry[]
  payload: ScheduleFormSubmitPayload['periods']
  totalDuration: number
}

interface QuickPreviewData {
  scheduleName: string
  semesterType: ScheduleType
  targetLevel: string
  entries: QuickScheduleEntry[]
  periodsPayload: ScheduleFormSubmitPayload['periods']
  totalDuration: number
}

function generateKey() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEmptyPeriod(nextNumber: number): SchedulePeriodFormValue {
  return {
    key: generateKey(),
    period_number: String(nextNumber),
    period_name: '',
    start_time: '',
    end_time: '',
    is_break: false,
    break_duration: '',
  }
}

function getNextPeriodNumber(periods: SchedulePeriodFormValue[]) {
  if (periods.length === 0) return 1
  const numbers = periods
    .map((period) => Number.parseInt(period.period_number ?? '', 10))
    .filter((value) => Number.isInteger(value) && value > 0)
  if (numbers.length === 0) return periods.length + 1
  return Math.max(...numbers) + 1
}

function mapScheduleToFormValues(schedule?: ScheduleRecord | null): ScheduleFormValues {
  if (!schedule) {
    return {
      name: '',
      type: 'winter',
      target_level: '',
      description: '',
      periods: [createEmptyPeriod(1), createEmptyPeriod(2)],
    }
  }

  const periods = (schedule.periods ?? []).map((period) => ({
    key: generateKey(),
    period_number: String(period.period_number ?? ''),
    period_name: period.period_name ?? '',
    start_time: period.start_time ?? '',
    end_time: period.end_time ?? '',
    is_break: Boolean(period.is_break),
    break_duration:
      period.break_duration !== undefined && period.break_duration !== null
        ? String(period.break_duration)
        : '',
  }))

  return {
    name: schedule.name ?? '',
    type: schedule.type ?? 'winter',
    target_level: schedule.target_level ?? '',
    description: schedule.description ?? '',
    periods: periods.length > 0 ? periods : [createEmptyPeriod(1)],
  }
}

function formatTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const [, timePart] = value.split('T')
    return (timePart ?? '').slice(0, 5)
  }
  return value.slice(0, 5)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
  }
}

const quickEntryTypeLabels: Record<QuickScheduleEntryType, string> = {
  class: 'حصة دراسية',
  break: 'فسحة',
  prayer: 'صلاة',
}

/* درجات ألوان أنواع الفترات — تُستخدم في مسطرة اليوم والشارات */
const ENTRY_TONES: Record<QuickScheduleEntryType, { bg: string; bd: string; tx: string }> = {
  class: { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46' },
  break: { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A' },
  prayer: { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E' },
}

function createInitialQuickFormValues(): QuickAddScheduleFormValues {
  return {
    scheduleName: '',
    semesterType: 'winter',
    targetLevel: '',
    periodDuration: '45',
    firstPeriodStart: '07:30',
    numberOfPeriods: '7',
    breaksEnabled: false,
    breaks: [],
    prayersEnabled: false,
    prayers: [],
  }
}

function createInitialQuickErrorState(): QuickAddErrorState {
  return {
    breaksById: {},
    prayersById: {},
  }
}

function createDefaultBreakEntry(): QuickAddBreakFormValue {
  return {
    id: generateKey(),
    afterPeriod: '',
    duration: '15',
  }
}

function createDefaultPrayerEntry(): QuickAddPrayerFormValue {
  return {
    id: generateKey(),
    afterPeriod: '',
    duration: '20',
    name: '',
  }
}

function parseTimeToMinutes(value: string): number | null {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/
  const match = timePattern.exec(value)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  return hours * 60 + minutes
}

function formatMinutesToTime(totalMinutes: number): string {
  const minutesInDay = 24 * 60
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 دقيقة'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`
  }
  if (hours > 0) {
    return `${hours} ساعة`
  }
  return `${minutes} دقيقة`
}

function normalizeQuickFormValues(
  values: QuickAddScheduleFormValues,
): { data: QuickNormalizedValues | null; errors: QuickAddErrorState } {
  const errors = createInitialQuickErrorState()
  let hasError = false

  const scheduleName = values.scheduleName.trim()
  if (!scheduleName) {
    errors.scheduleName = 'هذا الحقل مطلوب'
    hasError = true
  }

  const semesterType = values.semesterType
  if (!['winter', 'summer', 'custom'].includes(semesterType)) {
    errors.semesterType = 'اختر نوع الفصل'
    hasError = true
  }

  const periodDuration = Number.parseInt(values.periodDuration, 10)
  if (Number.isNaN(periodDuration)) {
    errors.periodDuration = 'أدخل مدة صحيحة'
    hasError = true
  } else if (periodDuration < 15 || periodDuration > 120) {
    errors.periodDuration = 'المدة يجب أن تكون بين 15 و 120 دقيقة'
    hasError = true
  }

  const firstPeriodStart = values.firstPeriodStart.trim()
  const startMinutes = firstPeriodStart ? parseTimeToMinutes(firstPeriodStart) : null
  if (!firstPeriodStart) {
    errors.firstPeriodStart = 'هذا الحقل مطلوب'
    hasError = true
  } else if (startMinutes === null) {
    errors.firstPeriodStart = 'يرجى إدخال وقت صحيح'
    hasError = true
  }

  const numberOfPeriods = Number.parseInt(values.numberOfPeriods, 10)
  const validPeriodsCount = !Number.isNaN(numberOfPeriods) && numberOfPeriods >= 1 && numberOfPeriods <= 12
  if (Number.isNaN(numberOfPeriods)) {
    errors.numberOfPeriods = 'أدخل عدد الحصص'
    hasError = true
  } else if (!validPeriodsCount) {
    errors.numberOfPeriods = 'العدد يجب أن يكون بين 1 و 12'
    hasError = true
  }

  const normalizedBreaks: QuickNormalizedBreak[] = []
  const normalizedPrayers: QuickNormalizedPrayer[] = []

  if (values.breaksEnabled) {
    if (values.breaks.length === 0) {
      errors.breaks = 'أضف فسحة واحدة على الأقل'
      hasError = true
    }
    const breakPositions = new Set<number>()
    values.breaks.forEach((item) => {
      const entryErrors: { afterPeriod?: string | null; duration?: string | null } = {}
      const afterValue = Number.parseInt(item.afterPeriod, 10)
      if (Number.isNaN(afterValue)) {
        entryErrors.afterPeriod = 'أدخل رقم الفترة'
      } else if (!validPeriodsCount) {
        entryErrors.afterPeriod = 'حدد عدد الحصص أولًا'
      } else if (afterValue < 1 || afterValue >= numberOfPeriods) {
        entryErrors.afterPeriod = 'الموقع يجب أن يكون بين 1 و (عدد الحصص - 1)'
      } else if (breakPositions.has(afterValue)) {
        entryErrors.afterPeriod = 'لا يمكن تكرار نفس الموقع'
      } else {
        breakPositions.add(afterValue)
      }

      const durationValue = Number.parseInt(item.duration, 10)
      if (Number.isNaN(durationValue)) {
        entryErrors.duration = 'أدخل مدة صحيحة'
      } else if (durationValue <= 0) {
        entryErrors.duration = 'المدة يجب أن تكون أكبر من صفر'
      } else if (durationValue > 120) {
        entryErrors.duration = 'المدة تتجاوز الحد المسموح'
      }

      if (Object.keys(entryErrors).length > 0) {
        errors.breaksById[item.id] = entryErrors
        hasError = true
      } else {
        errors.breaksById[item.id] = {}
        normalizedBreaks.push({ id: item.id, afterPeriod: afterValue, duration: durationValue })
      }
    })
  }

  if (values.prayersEnabled) {
    if (values.prayers.length === 0) {
      errors.prayers = 'أضف وقت صلاة واحد على الأقل'
      hasError = true
    }
    const prayerPositions = new Set<number>()
    values.prayers.forEach((item) => {
      const entryErrors: { afterPeriod?: string | null; duration?: string | null; name?: string | null } = {}
      const afterValue = Number.parseInt(item.afterPeriod, 10)
      if (Number.isNaN(afterValue)) {
        entryErrors.afterPeriod = 'أدخل رقم الفترة'
      } else if (!validPeriodsCount) {
        entryErrors.afterPeriod = 'حدد عدد الحصص أولًا'
      } else if (afterValue < 1 || afterValue >= numberOfPeriods) {
        entryErrors.afterPeriod = 'الموقع يجب أن يكون بين 1 و (عدد الحصص - 1)'
      } else if (prayerPositions.has(afterValue)) {
        entryErrors.afterPeriod = 'لا يمكن تكرار نفس الموقع'
      } else {
        prayerPositions.add(afterValue)
      }

      const durationValue = Number.parseInt(item.duration, 10)
      if (Number.isNaN(durationValue)) {
        entryErrors.duration = 'أدخل مدة صحيحة'
      } else if (durationValue <= 0) {
        entryErrors.duration = 'المدة يجب أن تكون أكبر من صفر'
      } else if (durationValue > 180) {
        entryErrors.duration = 'المدة تتجاوز الحد المسموح'
      }

      const nameValue = item.name.trim()
      if (!nameValue) {
        entryErrors.name = 'هذا الحقل مطلوب'
      }

      if (Object.keys(entryErrors).length > 0) {
        errors.prayersById[item.id] = entryErrors
        hasError = true
      } else {
        errors.prayersById[item.id] = {}
        normalizedPrayers.push({ id: item.id, afterPeriod: afterValue, duration: durationValue, name: nameValue })
      }
    })
  }

  if (values.breaksEnabled && values.prayersEnabled) {
    const overlap = normalizedPrayers.find((prayer) =>
      normalizedBreaks.some((item) => item.afterPeriod === prayer.afterPeriod),
    )
    if (overlap) {
      errors.overlap = 'تعارض في الأوقات، يرجى المراجعة'
      hasError = true
    }
  }

  if (hasError) {
    return { data: null, errors }
  }

  return {
    data: {
      scheduleName,
      semesterType,
      targetLevel: values.targetLevel.trim(),
      periodDuration,
      firstPeriodStart,
      numberOfPeriods,
      breaks: normalizedBreaks.sort((a, b) => a.afterPeriod - b.afterPeriod),
      prayers: normalizedPrayers.sort((a, b) => a.afterPeriod - b.afterPeriod),
    },
    errors,
  }
}

function generateQuickSchedule(values: QuickNormalizedValues): QuickScheduleGenerationResult {
  const startMinutes = parseTimeToMinutes(values.firstPeriodStart)
  if (startMinutes === null) {
    throw new Error('Invalid start time supplied')
  }

  const breakMap = new Map<number, QuickNormalizedBreak>()
  const breakOrderMap = new Map<number, number>()
  values.breaks.forEach((item, index) => {
    breakMap.set(item.afterPeriod, item)
    breakOrderMap.set(item.afterPeriod, index + 1)
  })

  const prayerMap = new Map<number, QuickNormalizedPrayer>()
  values.prayers.forEach((item) => {
    prayerMap.set(item.afterPeriod, item)
  })

  let timeline = startMinutes
  let sequence = 1
  const entries: QuickScheduleEntry[] = []
  const payload: ScheduleFormSubmitPayload['periods'] = []
  const hasMultipleBreaks = values.breaks.length > 1

  for (let index = 1; index <= values.numberOfPeriods; index += 1) {
    const classStart = timeline
    const classEnd = classStart + values.periodDuration
    const classStartLabel = formatMinutesToTime(classStart)
    const classEndLabel = formatMinutesToTime(classEnd)
    const className = `الحصة ${index}`

    entries.push({
      sequence,
      type: 'class',
      typeLabel: quickEntryTypeLabels.class,
      name: className,
      startTime: classStartLabel,
      endTime: classEndLabel,
      duration: values.periodDuration,
    })

    payload.push({
      period_number: sequence,
      start_time: classStartLabel,
      end_time: classEndLabel,
      is_break: false,
      break_duration: null,
      period_name: className,
    })

    sequence += 1
    timeline = classEnd

    const breakItem = breakMap.get(index)
    if (breakItem) {
      const breakStart = timeline
      const breakEnd = breakStart + breakItem.duration
      const breakStartLabel = formatMinutesToTime(breakStart)
      const breakEndLabel = formatMinutesToTime(breakEnd)
  const breakIndexFromList = values.breaks.findIndex((entry) => entry.afterPeriod === index)
  const breakPosition = breakOrderMap.get(index) ?? (breakIndexFromList >= 0 ? breakIndexFromList + 1 : 1)
      const breakName = hasMultipleBreaks ? `فسحة ${breakPosition}` : 'فسحة'

      entries.push({
        sequence,
        type: 'break',
        typeLabel: quickEntryTypeLabels.break,
        name: breakName,
        startTime: breakStartLabel,
        endTime: breakEndLabel,
        duration: breakItem.duration,
      })

      payload.push({
        period_number: sequence,
        start_time: breakStartLabel,
        end_time: breakEndLabel,
        is_break: true,
        break_duration: breakItem.duration,
        period_name: breakName,
      })

      sequence += 1
      timeline = breakEnd
    }

    const prayerItem = prayerMap.get(index)
    if (prayerItem) {
      const prayerStart = timeline
      const prayerEnd = prayerStart + prayerItem.duration
      const prayerStartLabel = formatMinutesToTime(prayerStart)
      const prayerEndLabel = formatMinutesToTime(prayerEnd)

      entries.push({
        sequence,
        type: 'prayer',
        typeLabel: quickEntryTypeLabels.prayer,
        name: prayerItem.name,
        startTime: prayerStartLabel,
        endTime: prayerEndLabel,
        duration: prayerItem.duration,
      })

      payload.push({
        period_number: sequence,
        start_time: prayerStartLabel,
        end_time: prayerEndLabel,
        is_break: true,
        break_duration: prayerItem.duration,
        period_name: prayerItem.name,
      })

      sequence += 1
      timeline = prayerEnd
    }
  }

  const totalDuration = timeline - startMinutes

  return {
    entries,
    payload,
    totalDuration,
  }
}

function ScheduleStatusBadge({ isActive, showLabel = false }: { isActive: boolean; showLabel?: boolean }) {
  return showLabel ? (
    <WsChip tone={isActive ? 'green' : undefined}>
      <span
        className={isActive ? 'ws-pulse' : undefined}
        style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--ws-green)' : 'var(--ws-text-2)' }}
      />
      {isActive ? 'مفعل' : 'معطل'}
    </WsChip>
  ) : (
    <span
      title={isActive ? 'مفعل' : 'غير مفعل'}
      className={isActive ? 'ws-pulse' : undefined}
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        background: isActive ? 'var(--ws-green)' : 'var(--ws-border)',
      }}
    />
  )
}

function ScheduleTypeBadge({ type }: { type: ScheduleType }) {
  return <WsChip tone="sky">{scheduleTypeLabels[type]}</WsChip>
}

/** يستنتج نوع الفترة من بياناتها لعرضها في مسطرة اليوم */
function inferEntryType(isBreak: boolean, name?: string | null): QuickScheduleEntryType {
  if (!isBreak) return 'class'
  if (name && name.includes('صلا')) return 'prayer'
  return 'break'
}

interface RulerSegment {
  key: string
  type: QuickScheduleEntryType
  name: string
  startTime: string
  endTime: string
  duration: number
}

/** مسطرة اليوم: شريط يمثل اليوم الدراسي — عرض كل مقطع بنسبة مدته الحقيقية */
function DayRuler({
  segments,
  hoverKey,
  onHover,
  showNow,
}: {
  segments: RulerSegment[]
  /** مفتاح المقطع المضاء (تزامن مع جدول الفترات) */
  hoverKey?: string | null
  onHover?: (key: string | null) => void
  /** يعرض مؤشر «الآن» — للجدول المفعّل فقط */
  showNow?: boolean
}) {
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    if (!showNow) return
    const timer = window.setInterval(() => {
      const d = new Date()
      setNowMin(d.getHours() * 60 + d.getMinutes())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [showNow])

  const total = segments.reduce((sum, segment) => sum + segment.duration, 0)
  if (segments.length === 0 || total <= 0) return null

  // موضع «الآن» بمنطق المسطرة نفسها: تراكم المدد لا الزمن المتواصل،
  // فالمسطرة أصلاً تتجاهل الفجوات بين الفترات
  let nowPct: number | null = null
  if (showNow) {
    let acc = 0
    for (const seg of segments) {
      const s = parseTimeToMinutes(seg.startTime)
      const e = parseTimeToMinutes(seg.endTime)
      if (s !== null && e !== null && nowMin >= s && nowMin < e) {
        nowPct = ((acc + (nowMin - s)) / total) * 100
        break
      }
      acc += seg.duration
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ws-text-2)', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
          {segments[0].startTime}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
          {(['class', 'break', 'prayer'] as QuickScheduleEntryType[]).map((type) => (
            <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ws-text-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: ENTRY_TONES[type].tx }} />
              {quickEntryTypeLabels[type]}
            </span>
          ))}
          <span style={{ fontWeight: 700, color: 'var(--ws-text)' }}>المجموع {formatDurationLabel(total)}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ws-text-2)', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
          {segments[segments.length - 1].endTime}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          height: 40,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--ws-hairline)',
        }}
      >
        {segments.map((segment, i) => {
          const tone = ENTRY_TONES[segment.type]
          const widthPercent = (segment.duration / total) * 100
          const hot = hoverKey != null && hoverKey === segment.key
          return (
            <div
              key={segment.key}
              className="ws-ruler-seg ws-bar-x"
              title={`${segment.name} — ${segment.startTime} إلى ${segment.endTime} (${segment.duration} د)`}
              onMouseEnter={onHover ? () => onHover(segment.key) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
              style={{
                width: `${widthPercent}%`,
                minWidth: 4,
                background: tone.bg,
                borderInlineEnd: '1px solid var(--ws-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                animationDelay: `${i * 45}ms`,
                ...(hot ? { filter: 'brightness(0.92)', boxShadow: 'inset 0 0 0 2px var(--ws-accent-2)' } : null),
              }}
            >
              {widthPercent > 7 ? (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: tone.tx,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 3px',
                  }}
                >
                  {segment.name}
                </span>
              ) : null}
            </div>
          )
        })}
        {nowPct != null ? (
          <span
            className="ws-ruler-now"
            style={{ insetInlineEnd: `${nowPct}%` }}
            title={`الآن ${formatMinutesToTime(nowMin)}`}
          />
        ) : null}
      </div>
    </div>
  )
}

/** يبني مقاطع المسطرة من فترات جدول محفوظ */
function segmentsFromPeriods(periods: SchedulePeriod[]): RulerSegment[] {
  const segments: RulerSegment[] = []
  for (const period of periods) {
    const start = formatTime(period.start_time)
    const end = formatTime(period.end_time)
    const startMinutes = start ? parseTimeToMinutes(start) : null
    const endMinutes = end ? parseTimeToMinutes(end) : null
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue
    const type = inferEntryType(Boolean(period.is_break), period.period_name)
    segments.push({
      key: `${period.period_number}-${start}`,
      type,
      name: period.period_name ?? (type === 'class' ? `الحصة ${period.period_number}` : quickEntryTypeLabels[type]),
      startTime: start,
      endTime: end,
      duration: endMinutes - startMinutes,
    })
  }
  return segments.sort((a, b) => (parseTimeToMinutes(a.startTime) ?? 0) - (parseTimeToMinutes(b.startTime) ?? 0))
}

const fieldError = (message?: string | null) =>
  message ? <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ws-red)' }}>{message}</span> : null

function ScheduleFormDialog({ open, onClose, onSubmit, isSubmitting, schedule, templates }: ScheduleFormDialogProps) {
  const [values, setValues] = useState<ScheduleFormValues>(() => mapScheduleToFormValues(schedule))
  const [errors, setErrors] = useState<{ name?: string | null; type?: string | null; periods?: string | null }>({})
  const [periodErrors, setPeriodErrors] = useState<
    Record<string, { period_number?: string | null; start_time?: string | null; end_time?: string | null }>
  >({})
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('')

  useEffect(() => {
    if (open) {
      setValues(mapScheduleToFormValues(schedule))
      setErrors({})
      setPeriodErrors({})
      setSelectedTemplateKey('')
    }
  }, [open, schedule])

  if (!open) return null

  const handleChange = <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: null }))
  }

  const handlePeriodChange = (key: string, field: keyof SchedulePeriodFormValue, value: string | boolean) => {
    setValues((prev) => ({
      ...prev,
      periods: prev.periods.map((period) => (period.key === key ? { ...period, [field]: value } : period)),
    }))
    setPeriodErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      next[key] = { ...next[key], [field]: null }
      return next
    })
  }

  const handleRemovePeriod = (key: string) => {
    setValues((prev) => ({
      ...prev,
      periods: prev.periods.filter((period) => period.key !== key),
    }))
    setPeriodErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleApplyTemplate = (templateKey: string) => {
    if (!templateKey || !templates) return
    const template = templates.find((item) => item.key === templateKey)
    if (!template) return

    setValues((prev) => ({
      ...prev,
      name: prev.name || template.name,
      type: template.type,
      target_level: template.target_level ?? '',
      periods:
        template.periods.length > 0
          ? template.periods.map((period) => ({
              key: generateKey(),
              period_number: String(period.period_number),
              period_name: period.period_name ?? '',
              start_time: period.start_time,
              end_time: period.end_time,
              is_break: Boolean(period.is_break),
              break_duration:
                period.break_duration !== undefined && period.break_duration !== null
                  ? String(period.break_duration)
                  : '',
            }))
          : [createEmptyPeriod(1)],
    }))
    setPeriodErrors({})
    setErrors((prev) => ({ ...prev, periods: null }))
  }

  const validate = () => {
    const nextErrors: typeof errors = {}
    const nextPeriodErrors: typeof periodErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = 'الرجاء إدخال اسم الجدول'
    }

    if (!values.type) {
      nextErrors.type = 'اختر نوع الجدول'
    }

    if (values.periods.length === 0) {
      nextErrors.periods = 'أضف فترة واحدة على الأقل'
    }

    const seenNumbers = new Set<number>()
    values.periods.forEach((period) => {
      const periodError: { period_number?: string | null; start_time?: string | null; end_time?: string | null } = {}
      const numericNumber = Number.parseInt(period.period_number, 10)
      if (!period.period_number) {
        periodError.period_number = 'أدخل رقم الفترة'
      } else if (!Number.isInteger(numericNumber) || numericNumber <= 0) {
        periodError.period_number = 'رقم الفترة يجب أن يكون رقمًا صحيحًا موجبًا'
      } else if (seenNumbers.has(numericNumber)) {
        periodError.period_number = 'لا يمكن تكرار رقم الفترة'
        nextErrors.periods = 'يوجد تكرار في أرقام الفترات'
      } else {
        seenNumbers.add(numericNumber)
      }

      if (!period.start_time) {
        periodError.start_time = 'حدد وقت البداية'
      }
      if (!period.end_time) {
        periodError.end_time = 'حدد وقت النهاية'
      }
      if (period.start_time && period.end_time && period.start_time >= period.end_time) {
        periodError.end_time = 'وقت النهاية يجب أن يكون بعد البداية'
      }

      if (Object.keys(periodError).length > 0) {
        nextPeriodErrors[period.key] = periodError
      }
    })

    setErrors(nextErrors)
    setPeriodErrors(nextPeriodErrors)

    return Object.keys(nextErrors).length === 0 && Object.keys(nextPeriodErrors).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      name: values.name.trim(),
      type: values.type,
      target_level: values.target_level.trim() ? values.target_level.trim() : null,
      description: values.description.trim() ? values.description.trim() : null,
      periods: values.periods
        .map((period) => ({
          period_number: Number.parseInt(period.period_number, 10),
          start_time: period.start_time,
          end_time: period.end_time,
          is_break: period.is_break,
          break_duration:
            period.is_break && period.break_duration ? Number.parseInt(period.break_duration, 10) : null,
          period_name: period.period_name.trim() ? period.period_name.trim() : null,
        }))
        .sort((a, b) => a.period_number - b.period_number),
    }

    onSubmit(payload)
  }

  return (
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{schedule ? `تحديث ${schedule.name}` : 'إضافة خطة زمنية'}</h3>
          <p className="ws-modal__sub">
            أدخل الفترات الزمنية للحصص بالترتيب الصحيح — يمكنك استخدام قالب جاهز لتعبئة الفترات بسرعة.
          </p>
        </header>

        <form style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }} onSubmit={handleSubmit} noValidate>
          <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <WsField label="اسم الجدول" htmlFor="schedule-name">
                <WsInput
                  id="schedule-name"
                  type="text"
                  value={values.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="مثال: التوقيت الشتوي"
                  disabled={isSubmitting}
                  autoFocus
                />
                {fieldError(errors.name)}
              </WsField>

              <WsField label="نوع الجدول" htmlFor="schedule-type">
                <WsSelect
                  id="schedule-type"
                  value={values.type}
                  onChange={(event) => handleChange('type', event.target.value as ScheduleType)}
                  disabled={isSubmitting}
                >
                  {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </WsSelect>
                <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>{scheduleTypeDescriptions[values.type]}</span>
                {fieldError(errors.type)}
              </WsField>

              <WsField label="المرحلة الدراسية (اختياري)" htmlFor="schedule-target">
                <WsInput
                  id="schedule-target"
                  type="text"
                  value={values.target_level}
                  onChange={(event) => handleChange('target_level', event.target.value)}
                  placeholder="مثال: الابتدائية"
                  disabled={isSubmitting}
                />
              </WsField>

              <WsField label="استخدام قالب جاهز" htmlFor="schedule-template">
                <WsSelect
                  id="schedule-template"
                  value={selectedTemplateKey}
                  onChange={(event) => {
                    setSelectedTemplateKey(event.target.value)
                    handleApplyTemplate(event.target.value)
                  }}
                  disabled={isSubmitting || !templates || templates.length === 0}
                >
                  <option value="">اختر قالبًا</option>
                  {templates?.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </WsSelect>
                <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                  اختيار القالب سيملأ الفترات آليًا ويمكن تعديلها لاحقًا.
                </span>
              </WsField>

              <WsField label="الوصف (اختياري)" htmlFor="schedule-description" style={{ gridColumn: '1 / -1' }}>
                <WsTextarea
                  id="schedule-description"
                  value={values.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  placeholder="تفاصيل إضافية عن الجدول أو ملاحظات للمعلمين"
                  disabled={isSubmitting}
                  rows={3}
                />
              </WsField>
            </div>

            {/* الفترات الزمنية */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, display: 'block' }}>الفترات الزمنية</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    رتب الفترات حسب تسلسل اليوم الدراسي — أضف الفسح عبر خيار الفسحة.
                  </span>
                </span>
                <WsBtn
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      periods: [...prev.periods, createEmptyPeriod(getNextPeriodNumber(prev.periods))],
                    }))
                  }
                  disabled={isSubmitting}
                >
                  إضافة فترة
                </WsBtn>
              </div>

              {errors.periods ? <WsAlert boxed style={{ marginBottom: 8 }}>{errors.periods}</WsAlert> : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {values.periods.map((period, index) => {
                  const periodError = periodErrors[period.key] ?? {}
                  return (
                    <div key={period.key} style={{ borderRadius: 9, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700 }}>الفترة رقم {index + 1}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              style={{ width: 13, height: 13, accentColor: 'var(--ws-accent-2)' }}
                              checked={period.is_break}
                              onChange={(event) => handlePeriodChange(period.key, 'is_break', event.target.checked)}
                              disabled={isSubmitting}
                            />
                            فسحة / استراحة
                          </label>
                          <WsBtn
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={() => handleRemovePeriod(period.key)}
                            disabled={isSubmitting || values.periods.length === 1}
                          />
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr', gap: 6 }}>
                        <WsField label="الرقم">
                          <WsInput
                            type="number"
                            min={1}
                            value={period.period_number}
                            onChange={(event) => handlePeriodChange(period.key, 'period_number', event.target.value)}
                            disabled={isSubmitting}
                          />
                          {fieldError(periodError.period_number)}
                        </WsField>
                        <WsField label="الاسم (اختياري)">
                          <WsInput
                            type="text"
                            value={period.period_name}
                            onChange={(event) => handlePeriodChange(period.key, 'period_name', event.target.value)}
                            placeholder="مثال: الحصة الأولى"
                            disabled={isSubmitting}
                          />
                        </WsField>
                        <WsField label="البداية">
                          <WsInput
                            type="time"
                            value={period.start_time}
                            onChange={(event) => handlePeriodChange(period.key, 'start_time', event.target.value)}
                            disabled={isSubmitting}
                          />
                          {fieldError(periodError.start_time)}
                        </WsField>
                        <WsField label="النهاية">
                          <WsInput
                            type="time"
                            value={period.end_time}
                            onChange={(event) => handlePeriodChange(period.key, 'end_time', event.target.value)}
                            disabled={isSubmitting}
                          />
                          {fieldError(periodError.end_time)}
                        </WsField>
                      </div>

                      {period.is_break ? (
                        <div style={{ marginTop: 6, maxWidth: 180 }}>
                          <WsField label="مدة الفسحة (دقائق)">
                            <WsInput
                              type="number"
                              min={0}
                              value={period.break_duration}
                              onChange={(event) => handlePeriodChange(period.key, 'break_duration', event.target.value)}
                              placeholder="مثال: 15"
                              disabled={isSubmitting}
                            />
                          </WsField>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <footer className="ws-modal__foot" style={{ flexShrink: 0 }}>
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : schedule ? 'حفظ التعديلات' : 'إنشاء الجدول'}
            </WsBtn>
          </footer>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ open, schedule, isSubmitting, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  if (!open || !schedule) return null

  return (
    <div className="ws-modal" style={{ zIndex: 60 }} role="alertdialog" onClick={isSubmitting ? undefined : onCancel}>
      <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">هل تريد حذف {schedule.name}؟</h3>
        </header>
        <div className="ws-modal__body">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9 }}>
            سيتم إزالة الجدول في حال عدم وجود حصص مرتبطة به. إذا كان مرتبطًا بحصص نشطة فستظهر رسالة تمنع الحذف.
          </p>
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onCancel} disabled={isSubmitting}>
            تراجع
          </WsBtn>
          <WsBtn variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}

interface QuickSchedulePreviewModalProps {
  open: boolean
  data: QuickPreviewData
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  errorMessage?: string | null
}

function QuickSchedulePreviewModal({ open, data, onClose, onConfirm, isSubmitting, errorMessage }: QuickSchedulePreviewModalProps) {
  if (!open) return null

  const durationLabel = formatDurationLabel(data.totalDuration)
  const requiresWarning = data.totalDuration > 480

  const rulerSegments: RulerSegment[] = data.entries.map((entry) => ({
    key: `preview-${entry.sequence}`,
    type: entry.type,
    name: entry.name ?? entry.typeLabel,
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
  }))

  return (
    <div className="ws-modal" style={{ zIndex: 60 }} role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '86vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">معاينة: {data.scheduleName}</h3>
          <span style={{ display: 'inline-flex', gap: 5, marginTop: 4 }}>
            <WsChip tone="sky">{scheduleTypeLabels[data.semesterType]}</WsChip>
            <WsChip icon={Clock3}>إجمالي المدة: {durationLabel}</WsChip>
          </span>
        </header>

        <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {requiresWarning ? (
            <WsAlert tone="warn" boxed>
              تنبيه: مدة الجدول تتجاوز 8 ساعات. تأكد من مناسبة الجدول للفترة الدراسية.
            </WsAlert>
          ) : null}

          {/* مسطرة اليوم */}
          <DayRuler segments={rulerSegments} />

          <div style={{ borderRadius: 9, border: '1px solid var(--ws-hairline)', overflow: 'hidden' }}>
            <table className="ws-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>النوع</th>
                  <th>البداية</th>
                  <th>النهاية</th>
                  <th>المدة</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const tone = ENTRY_TONES[entry.type]
                  return (
                    <tr key={entry.sequence}>
                      <td style={{ fontWeight: 700 }}>{entry.sequence}</td>
                      <td>
                        <span className="ws-chip" style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}>
                          {entry.typeLabel}
                        </span>
                        {entry.name && entry.name !== entry.typeLabel ? (
                          <span className="ws-cell-sub" style={{ display: 'block', marginTop: 2 }}>{entry.name}</span>
                        ) : null}
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }} dir="ltr">{entry.startTime}</span>
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }} dir="ltr">{entry.endTime}</span>
                      </td>
                      <td>{entry.duration} دقيقة</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {errorMessage ? <WsAlert boxed>{errorMessage}</WsAlert> : null}
        </div>

        <footer className="ws-modal__foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>تحقق من توزيع الحصص والفسحات قبل حفظ الجدول.</span>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              تعديل المدخلات
            </WsBtn>
            <WsBtn variant="primary" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </WsBtn>
          </span>
        </footer>
      </div>
    </div>
  )
}

function ApplyScheduleToClassesDialog({ open, schedule, isSubmitting, onCancel, onConfirm }: ApplyScheduleToClassesDialogProps) {
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const classesQuery = useClassScheduleSummaryQuery()

  // Auto-select classes that already use this schedule
  useEffect(() => {
    if (open && schedule && classesQuery.data) {
      const classes = classesQuery.data
      const preSelected = new Set<string>()

      classes.forEach((classItem: ClassScheduleSummary) => {
        // Check if this class is already using the selected schedule
        if (classItem.active_schedule === schedule.name) {
          preSelected.add(`${classItem.grade}|${classItem.class_name}`)
        }
      })

      setSelectedClasses(preSelected)
    } else if (!open) {
      setSelectedClasses(new Set())
    }
  }, [open, schedule, classesQuery.data])

  if (!open || !schedule) return null

  const classes = classesQuery.data || []
  const isLoading = classesQuery.isLoading

  const toggleClass = (grade: string, className: string) => {
    const key = `${grade}|${className}`
    setSelectedClasses((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedClasses.size === classes.length) {
      setSelectedClasses(new Set())
    } else {
      setSelectedClasses(new Set(classes.map((c: ClassScheduleSummary) => `${c.grade}|${c.class_name}`)))
    }
  }

  const handleSubmit = () => {
    const selectedArray = Array.from(selectedClasses).map((key) => {
      const [grade, class_name] = key.split('|')
      return { grade, class_name }
    })
    onConfirm(selectedArray)
  }

  return (
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onCancel}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '84vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">تطبيق «{schedule.name}» على الفصول</h3>
          <p className="ws-modal__sub">اختر الفصول التي تريد تطبيق هذا الجدول عليها — الفصول المطبَّق عليها محددة مسبقاً.</p>
        </header>

        <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <WsEmpty loading>جاري التحميل...</WsEmpty>
          ) : classes.length === 0 ? (
            <WsEmpty icon={LayoutGrid}>لا توجد فصول متاحة.</WsEmpty>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedClasses.size === classes.length}
                    onChange={toggleAll}
                    style={{ width: 14, height: 14, accentColor: 'var(--ws-accent-2)' }}
                    disabled={isSubmitting}
                  />
                  تحديد الكل ({classes.length} فصل)
                </label>
                <WsChip tone="sky">محدد: {selectedClasses.size}</WsChip>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                {classes.map((classItem: ClassScheduleSummary) => {
                  const key = `${classItem.grade}|${classItem.class_name}`
                  const isChecked = selectedClasses.has(key)
                  const isAlreadyApplied = classItem.active_schedule === schedule.name
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 8,
                        border: `1px solid ${isChecked ? 'var(--ws-accent-2)' : 'var(--ws-hairline)'}`,
                        background: isChecked ? 'var(--ws-accent-soft)' : 'transparent',
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClass(classItem.grade, classItem.class_name)}
                        style={{ width: 14, height: 14, accentColor: 'var(--ws-accent-2)', flexShrink: 0 }}
                        disabled={isSubmitting}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>
                          {classItem.grade} / {classItem.class_name}
                        </span>
                      </span>
                      {isAlreadyApplied && <WsChip tone="green">مطبق</WsChip>}
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <footer className="ws-modal__foot">
          <WsBtn onClick={onCancel} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="primary" onClick={handleSubmit} disabled={isSubmitting || selectedClasses.size === 0}>
            {isSubmitting ? 'جاري التطبيق...' : `تطبيق على ${selectedClasses.size} فصل`}
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}

export function AdminSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('all')
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleRecord | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickFormValues, setQuickFormValues] = useState<QuickAddScheduleFormValues>(() => createInitialQuickFormValues())
  const [quickFormErrors, setQuickFormErrors] = useState<QuickAddErrorState>(() => createInitialQuickErrorState())
  const [quickPreviewData, setQuickPreviewData] = useState<QuickPreviewData | null>(null)
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false)
  const [quickPreviewError, setQuickPreviewError] = useState<string | null>(null)
  const [quickSuccessMessage, setQuickSuccessMessage] = useState<string | null>(null)
  const [isApplyToClassesModalOpen, setIsApplyToClassesModalOpen] = useState(false)
  const [scheduleToApply, setScheduleToApply] = useState<ScheduleRecord | null>(null)
  /** تزامن الإضاءة بين مسطرة اليوم وجدول الفترات */
  const [hotSegKey, setHotSegKey] = useState<string | null>(null)

  const schedulesQuery = useSchedulesQuery()
  const templatesQuery = useScheduleTemplatesQuery()
  const createScheduleMutation = useCreateScheduleMutation()
  const updateScheduleMutation = useUpdateScheduleMutation()
  const activateScheduleMutation = useActivateScheduleMutation()
  const deactivateScheduleMutation = useDeactivateScheduleMutation()
  const deleteScheduleMutation = useDeleteScheduleMutation()
  const applyScheduleToMultipleClassesMutation = useApplyScheduleToMultipleClassesMutation()

  const quickDerivedInfo = useMemo(() => {
    const result = normalizeQuickFormValues(quickFormValues)
    if (!result.data) {
      return { isReady: false, totalDuration: null as number | null }
    }
    const generated = generateQuickSchedule(result.data)
    return { isReady: true, totalDuration: generated.totalDuration }
  }, [quickFormValues])

  const quickFormIsReady = quickDerivedInfo.isReady
  const quickTotalDuration = quickDerivedInfo.totalDuration

  const clearQuickErrors = (updater: (draft: QuickAddErrorState) => void) => {
    setQuickFormErrors((prev) => {
      const next: QuickAddErrorState = {
        ...prev,
        breaksById: { ...prev.breaksById },
        prayersById: { ...prev.prayersById },
      }
      updater(next)
      return next
    })
  }

  const resetQuickForm = () => {
    setQuickFormValues(createInitialQuickFormValues())
    setQuickFormErrors(createInitialQuickErrorState())
    setQuickPreviewData(null)
    setQuickPreviewError(null)
  }

  const handleQuickScheduleNameChange = (value: string) => {
    setQuickFormValues((prev) => ({ ...prev, scheduleName: value }))
    clearQuickErrors((draft) => {
      draft.scheduleName = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickSemesterChange = (value: ScheduleType) => {
    setQuickFormValues((prev) => ({ ...prev, semesterType: value }))
    clearQuickErrors((draft) => {
      draft.semesterType = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickPeriodDurationChange = (value: string) => {
    setQuickFormValues((prev) => ({ ...prev, periodDuration: value }))
    clearQuickErrors((draft) => {
      draft.periodDuration = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickFirstPeriodStartChange = (value: string) => {
    setQuickFormValues((prev) => ({ ...prev, firstPeriodStart: value }))
    clearQuickErrors((draft) => {
      draft.firstPeriodStart = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickNumberOfPeriodsChange = (value: string) => {
    setQuickFormValues((prev) => ({ ...prev, numberOfPeriods: value }))
    clearQuickErrors((draft) => {
      draft.numberOfPeriods = null
      draft.overlap = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickBreaksToggle = (enabled: boolean) => {
    setQuickFormValues((prev) => ({
      ...prev,
      breaksEnabled: enabled,
      breaks: enabled ? (prev.breaks.length > 0 ? prev.breaks : [createDefaultBreakEntry()]) : [],
    }))
    clearQuickErrors((draft) => {
      draft.breaks = null
      draft.overlap = null
      if (!enabled) {
        draft.breaksById = {}
      }
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickPrayersToggle = (enabled: boolean) => {
    setQuickFormValues((prev) => ({
      ...prev,
      prayersEnabled: enabled,
      prayers: enabled ? (prev.prayers.length > 0 ? prev.prayers : [createDefaultPrayerEntry()]) : [],
    }))
    clearQuickErrors((draft) => {
      draft.prayers = null
      draft.overlap = null
      if (!enabled) {
        draft.prayersById = {}
      }
    })
    setQuickSuccessMessage(null)
  }

  const handleAddBreak = () => {
    setQuickFormValues((prev) => ({
      ...prev,
      breaksEnabled: true,
      breaks: [...prev.breaks, createDefaultBreakEntry()],
    }))
    clearQuickErrors((draft) => {
      draft.breaks = null
    })
    setQuickSuccessMessage(null)
  }

  const handleRemoveBreak = (id: string) => {
    setQuickFormValues((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((item) => item.id !== id),
    }))
    clearQuickErrors((draft) => {
      delete draft.breaksById[id]
      draft.overlap = null
    })
    setQuickSuccessMessage(null)
  }

  const handleBreakFieldChange = (id: string, field: 'afterPeriod' | 'duration', value: string) => {
    setQuickFormValues((prev) => ({
      ...prev,
      breaks: prev.breaks.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
    clearQuickErrors((draft) => {
      const existing = draft.breaksById[id] ?? {}
      draft.breaksById[id] = { ...existing, [field]: null }
      draft.breaks = null
      draft.overlap = null
    })
    setQuickSuccessMessage(null)
  }

  const handleAddPrayer = () => {
    setQuickFormValues((prev) => ({
      ...prev,
      prayersEnabled: true,
      prayers: [...prev.prayers, createDefaultPrayerEntry()],
    }))
    clearQuickErrors((draft) => {
      draft.prayers = null
    })
    setQuickSuccessMessage(null)
  }

  const handleRemovePrayer = (id: string) => {
    setQuickFormValues((prev) => ({
      ...prev,
      prayers: prev.prayers.filter((item) => item.id !== id),
    }))
    clearQuickErrors((draft) => {
      delete draft.prayersById[id]
      draft.overlap = null
    })
    setQuickSuccessMessage(null)
  }

  const handlePrayerFieldChange = (id: string, field: 'afterPeriod' | 'duration' | 'name', value: string) => {
    setQuickFormValues((prev) => ({
      ...prev,
      prayers: prev.prayers.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
    clearQuickErrors((draft) => {
      const existing = draft.prayersById[id] ?? {}
      draft.prayersById[id] = { ...existing, [field]: null }
      draft.prayers = null
      draft.overlap = null
    })
    setQuickSuccessMessage(null)
  }

  const handleQuickPreview = () => {
    const { data, errors } = normalizeQuickFormValues(quickFormValues)
    setQuickFormErrors(errors)
    if (!data) {
      return
    }
    const generated = generateQuickSchedule(data)
    setQuickPreviewData({
      scheduleName: data.scheduleName,
      semesterType: data.semesterType,
      targetLevel: data.targetLevel,
      entries: generated.entries,
      periodsPayload: generated.payload,
      totalDuration: generated.totalDuration,
    })
    setQuickPreviewError(null)
    setIsQuickPreviewOpen(true)
    setQuickSuccessMessage(null)
  }

  const handleQuickSave = () => {
    if (!quickPreviewData) return
    setQuickPreviewError(null)
    const payload: ScheduleFormSubmitPayload = {
      name: quickPreviewData.scheduleName,
      type: quickPreviewData.semesterType,
      target_level: quickPreviewData.targetLevel || null,
      description: null,
      periods: quickPreviewData.periodsPayload,
    }

    createScheduleMutation.mutate(payload, {
      onSuccess: (createdSchedule) => {
        setSelectedScheduleId(createdSchedule.id)
        setIsQuickPreviewOpen(false)
        setIsQuickAddOpen(false)
        setQuickPreviewData(null)
        setQuickSuccessMessage('تم إنشاء الجدول بنجاح.')
        resetQuickForm()
      },
      onError: () => {
        setQuickPreviewError('حدث خطأ أثناء حفظ الجدول. حاول مرة أخرى.')
      },
    })
  }

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])

  useEffect(() => {
    if (schedules.length === 0) {
      setSelectedScheduleId(null)
      return
    }

    if (!selectedScheduleId || !schedules.some((schedule) => schedule.id === selectedScheduleId)) {
      const activeSchedule = schedules.find((schedule) => schedule.is_active)
      setSelectedScheduleId(activeSchedule ? activeSchedule.id : schedules[0].id)
    }
  }, [schedules, selectedScheduleId])

  const filteredSchedules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return schedules
      .filter((schedule) => {
        const matchesQuery = term
          ? [schedule.name, schedule.target_level ?? '', schedule.description ?? '']
              .map((value) => value?.toLowerCase?.() ?? '')
              .some((value) => value.includes(term))
          : true
        const matchesStatus =
          statusFilter === 'all' ? true : statusFilter === 'active' ? schedule.is_active : !schedule.is_active
        return matchesQuery && matchesStatus
      })
      .sort((a, b) => Number(b.is_active) - Number(a.is_active))
  }, [schedules, searchTerm, statusFilter])

  useEffect(() => {
    if (filteredSchedules.length === 0) return
    if (!selectedScheduleId || !filteredSchedules.some((schedule) => schedule.id === selectedScheduleId)) {
      setSelectedScheduleId(filteredSchedules[0].id)
    }
  }, [filteredSchedules, selectedScheduleId])

  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null

  const stats = useMemo(() => {
    const total = schedules.length
    const active = schedules.filter((schedule) => schedule.is_active).length
    const archived = total - active
    const totalPeriods = schedules.reduce((count, schedule) => count + (schedule.periods?.length ?? 0), 0)
    return { total, active, archived, totalPeriods }
  }, [schedules])

  const selectedRulerSegments = useMemo(
    () => (selectedSchedule ? segmentsFromPeriods(selectedSchedule.periods ?? []) : []),
    [selectedSchedule],
  )

  const handleCreate = () => {
    setEditingSchedule(null)
    setIsFormOpen(true)
  }

  const handleEdit = (schedule: ScheduleRecord) => {
    setEditingSchedule(schedule)
    setIsFormOpen(true)
  }

  const handleSubmitForm = (payload: ScheduleFormSubmitPayload) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate(
        { id: editingSchedule.id, payload },
        {
          onSuccess: (updatedSchedule) => {
            setIsFormOpen(false)
            setEditingSchedule(null)
            setSelectedScheduleId(updatedSchedule.id)
          },
        },
      )
    } else {
      createScheduleMutation.mutate(payload, {
        onSuccess: (createdSchedule) => {
          setIsFormOpen(false)
          setSelectedScheduleId(createdSchedule.id)
        },
      })
    }
  }

  const handleActivate = (schedule: ScheduleRecord) => {
    activateScheduleMutation.mutate(schedule.id)
  }

  const handleDelete = () => {
    if (!scheduleToDelete) return
    deleteScheduleMutation.mutate(scheduleToDelete.id, {
      onSuccess: () => {
        if (scheduleToDelete.id === selectedScheduleId) {
          setSelectedScheduleId(null)
        }
        setScheduleToDelete(null)
      },
    })
  }

  const handleApplyToClasses = (selectedClasses: Array<{ grade: string; class_name: string }>) => {
    if (!scheduleToApply) return
    applyScheduleToMultipleClassesMutation.mutate(
      {
        schedule_id: scheduleToApply.id,
        classes: selectedClasses,
      },
      {
        onSuccess: () => {
          setIsApplyToClassesModalOpen(false)
          setScheduleToApply(null)
        },
      },
    )
  }

  const isMutating =
    createScheduleMutation.isPending || updateScheduleMutation.isPending || activateScheduleMutation.isPending || deactivateScheduleMutation.isPending

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="الخطط الزمنية"
        badge="توقيت اليوم الدراسي"
        actions={
          <>
            <WsBtn icon={ListPlus} onClick={handleCreate} disabled={createScheduleMutation.isPending}>
              جدول يدوي
            </WsBtn>
            <WsBtn variant="primary" icon={Zap} onClick={() => setIsQuickAddOpen(true)} disabled={createScheduleMutation.isPending}>
              إضافة توقيت سريع
            </WsBtn>
          </>
        }
      >
        {quickSuccessMessage ? <WsChip tone="green">{quickSuccessMessage}</WsChip> : null}
      </WsHeader>

      {schedulesQuery.isError ? (
        <WsAlert>
          حدث خطأ أثناء تحميل الجداول الزمنية.
          <WsBtn size="sm" icon={RefreshCcw} onClick={() => schedulesQuery.refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      ) : null}

      <WsLayout>
        {/* العمود الأيمن: قائمة الجداول */}
        <WsSideCol title="الجداول" icon={CalendarClock} side="start" width={280} storageKey="ws:schedules:list">
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              borderBottom: '1px solid var(--ws-hairline)',
            }}
          >
            <div className="ws-seg" style={{ display: 'flex' }}>
              {([
                { value: 'all', label: 'الكل' },
                { value: 'active', label: 'مفعلة' },
                { value: 'inactive', label: 'معطلة' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`ws-seg__btn ${statusFilter === option.value ? 'is-active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم أو المرحلة..."
            />
          </div>

          <WsBlock title="القائمة" count={filteredSchedules.length.toLocaleString('ar-SA-u-nu-latn')} fill scroll>
            {schedulesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الجداول...</WsEmpty>
            ) : filteredSchedules.length === 0 ? (
              <WsEmpty icon={CalendarClock}>لا توجد جداول مطابقة للبحث.</WsEmpty>
            ) : (
              <div>
                {filteredSchedules.map((schedule) => {
                  const isSelected = schedule.id === selectedScheduleId
                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      className="ws-rankrow"
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? chip(TONES.sky) : undefined,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <ScheduleStatusBadge isActive={schedule.is_active} />
                          <span style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)' }}>
                            {schedule.name}
                          </span>
                        </span>
                      </span>
                      <span style={{ display: 'inline-flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        <ScheduleTypeBadge type={schedule.type ?? 'custom'} />
                        {schedule.target_level ? <WsChip>{schedule.target_level}</WsChip> : null}
                        <WsChip>{schedule.periods?.length ?? 0} فترة</WsChip>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: تفاصيل الجدول */}
        <WsMain>
          {/* حصيلة الخطط — لغة الإغناء: باستيل + رقاقة بيضاء + علامة مائية */}
          <WsBlock padded>
            <div className="ws-dashboard-cards">
              <DayCard
                icon={CalendarClock}
                label="الجداول الزمنية"
                value={stats.total}
                tone={TONES.sky}
                hero
                context={
                  stats.active === 1
                    ? `المعتمد الآن: ${schedules.find((item) => item.is_active)?.name ?? ''}`
                    : stats.active > 1
                      ? `${stats.active} جداول معتمدة معاً`
                      : 'لا جدول معتمداً بعد'
                }
                zeroContext="ابدأ بالتوقيت السريع"
              />
              <DayCard
                icon={CheckCircle2}
                label="مفعلة"
                value={stats.active}
                tone={TONES.green}
                context="المعتمدة في النظام الآن"
                zeroContext="لا جدول معتمداً بعد"
              />
              <DayCard
                icon={Power}
                label="معطلة"
                value={stats.archived}
                tone={TONES.gray}
                context="أرشيف جاهز للتفعيل"
                zeroContext="لا جداول في الأرشيف"
              />
              <DayCard
                icon={Clock3}
                label="الفترات المسجلة"
                value={stats.totalPeriods}
                tone={TONES.purple}
                context="حصص وفسح وصلوات عبر كل الجداول"
                zeroContext="لا فترات مسجلة بعد"
              />
            </div>
          </WsBlock>

          <WsBlock
            title={selectedSchedule ? selectedSchedule.name : 'تفاصيل الجدول'}
            icon={CalendarClock}
            count={selectedSchedule ? `${(selectedSchedule.periods ?? []).length} فترة` : undefined}
            tools={
              selectedSchedule ? (
                <>
                  <WsBtn size="sm" icon={Pencil} onClick={() => handleEdit(selectedSchedule)} disabled={isMutating}>
                    تعديل
                  </WsBtn>
                  <WsBtn
                    size="sm"
                    icon={LayoutGrid}
                    onClick={() => {
                      setScheduleToApply(selectedSchedule)
                      setIsApplyToClassesModalOpen(true)
                    }}
                    disabled={isMutating}
                  >
                    تطبيق
                  </WsBtn>
                  {selectedSchedule.is_active ? (
                    <WsBtn
                      size="sm"
                      icon={Power}
                      onClick={() => deactivateScheduleMutation.mutate(selectedSchedule.id)}
                      disabled={deactivateScheduleMutation.isPending}
                    >
                      {deactivateScheduleMutation.isPending ? '...' : 'تعطيل'}
                    </WsBtn>
                  ) : (
                    <WsBtn
                      size="sm"
                      variant="primary"
                      icon={CheckCircle2}
                      onClick={() => handleActivate(selectedSchedule)}
                      disabled={activateScheduleMutation.isPending}
                    >
                      {activateScheduleMutation.isPending ? '...' : 'تفعيل'}
                    </WsBtn>
                  )}
                  <WsBtn
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setScheduleToDelete(selectedSchedule)}
                    disabled={deleteScheduleMutation.isPending}
                  />
                </>
              ) : undefined
            }
            fill
          >
            {selectedSchedule ? (
              <>
                {/* شريط التعريف + مسطرة اليوم */}
                <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid var(--ws-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <ScheduleStatusBadge isActive={selectedSchedule.is_active} showLabel />
                    <ScheduleTypeBadge type={selectedSchedule.type ?? 'custom'} />
                    {selectedSchedule.target_level ? <WsChip>{selectedSchedule.target_level}</WsChip> : null}
                    {selectedSchedule.description ? (
                      <span style={{ fontSize: 12.5, color: 'var(--ws-text-2)' }}>{selectedSchedule.description}</span>
                    ) : null}
                    <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)', marginInlineStart: 'auto' }}>
                      آخر تحديث: {formatDateTime(selectedSchedule.updated_at ?? selectedSchedule.created_at)}
                    </span>
                  </div>
                  {selectedRulerSegments.length > 0 ? (
                    <DayRuler
                      segments={selectedRulerSegments}
                      hoverKey={hotSegKey}
                      onHover={setHotSegKey}
                      showNow={selectedSchedule.is_active}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>
                      لا توجد فترات بأوقات صالحة لعرض مسطرة اليوم.
                    </span>
                  )}
                </div>

                {/* جدول الفترات */}
                {(selectedSchedule.periods ?? []).length === 0 ? (
                  <WsEmpty icon={Clock3}>لا توجد فترات مسجلة لهذا الجدول.</WsEmpty>
                ) : (
                  <WsTable>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>الاسم</th>
                        <th>النوع</th>
                        <th>البداية</th>
                        <th>النهاية</th>
                        <th>المدة (د)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSchedule.periods ?? []).map((period, i) => {
                        const start = formatTime(period.start_time)
                        const end = formatTime(period.end_time)
                        const duration = period.break_duration ?? ''
                        const entryType = inferEntryType(Boolean(period.is_break), period.period_name)
                        const tone = ENTRY_TONES[entryType]
                        // نفس صيغة مفتاح مقطع المسطرة (segmentsFromPeriods) ليتم التزامن
                        const rowKey = `${period.period_number}-${start}`
                        const hot = hotSegKey === rowKey
                        return (
                          <tr
                            key={rowKey}
                            className="ws-tbl-rise"
                            onMouseEnter={() => setHotSegKey(rowKey)}
                            onMouseLeave={() => setHotSegKey(null)}
                            style={{
                              animationDelay: `${Math.min(i * 30, 300)}ms`,
                              ...(hot ? { background: 'var(--ws-surface-2)' } : null),
                            }}
                          >
                            <td style={{ fontWeight: 700 }}>{period.period_number}</td>
                            <td>{period.period_name ?? '—'}</td>
                            <td>
                              <span className="ws-chip" style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}>
                                {quickEntryTypeLabels[entryType]}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }} dir="ltr">{start || '—'}</span>
                            </td>
                            <td>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }} dir="ltr">{end || '—'}</span>
                            </td>
                            <td>{duration || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </WsTable>
                )}

                <div
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderTop: '1px solid var(--ws-hairline)',
                    fontSize: 12,
                    color: 'var(--ws-text-2)',
                  }}
                >
                  لتطبيق هذا الجدول على فصول محددة استخدم زر «تطبيق» أعلاه — الجدول المفعّل هو المعتمد افتراضياً للنظام.
                </div>
              </>
            ) : schedulesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل تفاصيل الجداول...</WsEmpty>
            ) : (
              <WsEmpty icon={CalendarClock}>
                لا توجد جداول زمنية حتى الآن — ابدأ بالتوقيت السريع أو أنشئ جدولاً يدوياً.
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <WsBtn variant="primary" icon={Zap} onClick={() => setIsQuickAddOpen(true)}>
                    إضافة توقيت سريع
                  </WsBtn>
                  <WsBtn icon={ListPlus} onClick={handleCreate}>
                    جدول يدوي
                  </WsBtn>
                </span>
              </WsEmpty>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* مودال الإضافة السريعة */}
      {isQuickAddOpen ? (
        <div
          className="ws-modal"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget && !createScheduleMutation.isPending) {
              setIsQuickAddOpen(false)
              resetQuickForm()
            }
          }}
        >
          <div
            className="ws-modal__panel"
            style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}
          >
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إضافة توقيت سريع</h3>
              <p className="ws-modal__sub">
                كوّن جدولًا زمنيًا كاملًا خلال دقائق — عبّئ الأساسيات وأضف الفسح وأوقات الصلاة، والنظام يحسب كل الأوقات.
              </p>
            </header>

            <form
              id="quick-add-form"
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
              onSubmit={(event) => {
                event.preventDefault()
                handleQuickPreview()
              }}
              noValidate
            >
              <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <WsField label="اسم الجدول الزمني" htmlFor="quick-schedule-name" style={{ gridColumn: '1 / -1' }}>
                    <WsInput
                      id="quick-schedule-name"
                      type="text"
                      value={quickFormValues.scheduleName}
                      onChange={(event) => handleQuickScheduleNameChange(event.target.value)}
                      placeholder="مثال: الجدول الدراسي للفصل الأول"
                      disabled={createScheduleMutation.isPending}
                      required
                      autoFocus
                    />
                    {fieldError(quickFormErrors.scheduleName)}
                  </WsField>

                  <WsField label="نوع الفصل">
                    <div className="ws-choice-grid">
                      {(['winter', 'summer'] as ScheduleType[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleQuickSemesterChange(value)}
                          className={`ws-choice ${quickFormValues.semesterType === value ? 'is-selected' : ''}`}
                          disabled={createScheduleMutation.isPending}
                        >
                          {scheduleTypeLabels[value]}
                        </button>
                      ))}
                    </div>
                    {fieldError(quickFormErrors.semesterType)}
                  </WsField>

                  <WsField label="المرحلة الدراسية (اختياري)" htmlFor="quick-target-level">
                    <WsInput
                      id="quick-target-level"
                      type="text"
                      value={quickFormValues.targetLevel}
                      onChange={(event) => setQuickFormValues((prev) => ({ ...prev, targetLevel: event.target.value }))}
                      placeholder="مثال: العليا أو الدنيا"
                      disabled={createScheduleMutation.isPending}
                    />
                  </WsField>

                  <WsField label="مدة الحصة (دقائق)" htmlFor="quick-period-duration">
                    <WsInput
                      id="quick-period-duration"
                      type="number"
                      min={15}
                      max={120}
                      value={quickFormValues.periodDuration}
                      onChange={(event) => handleQuickPeriodDurationChange(event.target.value)}
                      placeholder="45"
                      disabled={createScheduleMutation.isPending}
                      required
                    />
                    {fieldError(quickFormErrors.periodDuration)}
                  </WsField>

                  <WsField label="بداية الحصة الأولى" htmlFor="quick-first-period">
                    <WsInput
                      id="quick-first-period"
                      type="time"
                      value={quickFormValues.firstPeriodStart}
                      onChange={(event) => handleQuickFirstPeriodStartChange(event.target.value)}
                      disabled={createScheduleMutation.isPending}
                      required
                    />
                    {fieldError(quickFormErrors.firstPeriodStart)}
                  </WsField>

                  <WsField label="عدد الحصص" htmlFor="quick-period-count">
                    <WsInput
                      id="quick-period-count"
                      type="number"
                      min={1}
                      max={12}
                      value={quickFormValues.numberOfPeriods}
                      onChange={(event) => handleQuickNumberOfPeriodsChange(event.target.value)}
                      placeholder="7"
                      disabled={createScheduleMutation.isPending}
                      required
                    />
                    {fieldError(quickFormErrors.numberOfPeriods)}
                  </WsField>

                  <WsField label=" " style={{ justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 10, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
                      بين 1 و 12 حصة يومياً — الأوقات بصيغة 24 ساعة.
                    </span>
                  </WsField>
                </div>

                {/* الفسح */}
                <div style={{ borderRadius: 9, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ width: 14, height: 14, accentColor: 'var(--ws-accent-2)' }}
                        checked={quickFormValues.breaksEnabled}
                        onChange={(event) => handleQuickBreaksToggle(event.target.checked)}
                        disabled={createScheduleMutation.isPending}
                      />
                      إضافة فسحة
                    </label>
                    <WsBtn
                      size="sm"
                      icon={Plus}
                      onClick={handleAddBreak}
                      disabled={!quickFormValues.breaksEnabled || createScheduleMutation.isPending}
                    >
                      فسحة أخرى
                    </WsBtn>
                  </div>
                  {fieldError(quickFormErrors.breaks)}
                  {quickFormValues.breaksEnabled ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {quickFormValues.breaks.map((item, index) => {
                        const itemErrors = quickFormErrors.breaksById[item.id] ?? {}
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr auto',
                              gap: 6,
                              alignItems: 'end',
                              borderRadius: 8,
                              background: 'var(--ws-surface-2)',
                              padding: 8,
                            }}
                          >
                            <WsField label={`فسحة ${index + 1} — بعد الحصة رقم`}>
                              <WsInput
                                type="number"
                                min={1}
                                max={12}
                                value={item.afterPeriod}
                                onChange={(event) => handleBreakFieldChange(item.id, 'afterPeriod', event.target.value)}
                                placeholder="3"
                                disabled={createScheduleMutation.isPending}
                              />
                              {fieldError(itemErrors.afterPeriod)}
                            </WsField>
                            <WsField label="المدة (دقائق)">
                              <WsInput
                                type="number"
                                min={5}
                                max={120}
                                value={item.duration}
                                onChange={(event) => handleBreakFieldChange(item.id, 'duration', event.target.value)}
                                placeholder="15"
                                disabled={createScheduleMutation.isPending}
                              />
                              {fieldError(itemErrors.duration)}
                            </WsField>
                            <WsBtn
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              onClick={() => handleRemoveBreak(item.id)}
                              disabled={createScheduleMutation.isPending}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>

                {/* أوقات الصلاة */}
                <div style={{ borderRadius: 9, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ width: 14, height: 14, accentColor: 'var(--ws-accent-2)' }}
                        checked={quickFormValues.prayersEnabled}
                        onChange={(event) => handleQuickPrayersToggle(event.target.checked)}
                        disabled={createScheduleMutation.isPending}
                      />
                      إضافة وقت صلاة
                    </label>
                    <WsBtn
                      size="sm"
                      icon={Plus}
                      onClick={handleAddPrayer}
                      disabled={!quickFormValues.prayersEnabled || createScheduleMutation.isPending}
                    >
                      وقت صلاة
                    </WsBtn>
                  </div>
                  {fieldError(quickFormErrors.prayers)}
                  {quickFormValues.prayersEnabled ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {quickFormValues.prayers.map((item, index) => {
                        const itemErrors = quickFormErrors.prayersById[item.id] ?? {}
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1.4fr auto',
                              gap: 6,
                              alignItems: 'end',
                              borderRadius: 8,
                              background: 'var(--ws-surface-2)',
                              padding: 8,
                            }}
                          >
                            <WsField label={`صلاة ${index + 1} — بعد الحصة`}>
                              <WsInput
                                type="number"
                                min={1}
                                max={12}
                                value={item.afterPeriod}
                                onChange={(event) => handlePrayerFieldChange(item.id, 'afterPeriod', event.target.value)}
                                placeholder="4"
                                disabled={createScheduleMutation.isPending}
                              />
                              {fieldError(itemErrors.afterPeriod)}
                            </WsField>
                            <WsField label="المدة (دقائق)">
                              <WsInput
                                type="number"
                                min={5}
                                max={120}
                                value={item.duration}
                                onChange={(event) => handlePrayerFieldChange(item.id, 'duration', event.target.value)}
                                placeholder="20"
                                disabled={createScheduleMutation.isPending}
                              />
                              {fieldError(itemErrors.duration)}
                            </WsField>
                            <WsField label="اسم الصلاة">
                              <WsInput
                                type="text"
                                value={item.name}
                                onChange={(event) => handlePrayerFieldChange(item.id, 'name', event.target.value)}
                                placeholder="مثال: صلاة الظهر"
                                disabled={createScheduleMutation.isPending}
                              />
                              {fieldError(itemErrors.name)}
                            </WsField>
                            <WsBtn
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              onClick={() => handleRemovePrayer(item.id)}
                              disabled={createScheduleMutation.isPending}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>

                {quickFormErrors.overlap ? <WsAlert boxed>{quickFormErrors.overlap}</WsAlert> : null}

                {quickTotalDuration !== null ? (
                  <div
                    style={{
                      borderRadius: 8,
                      border: '1px solid var(--ws-hairline)',
                      background: 'var(--ws-surface-2)',
                      padding: '8px 12px',
                      fontSize: 12,
                    }}
                  >
                    إجمالي الزمن المتوقع: <b>{formatDurationLabel(quickTotalDuration)}</b>
                    {quickTotalDuration > 480 ? (
                      <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--ws-amber)' }}>
                        تنبيه: مدة الجدول تتجاوز 8 ساعات، يرجى مراجعة الفسح وأوقات الصلاة.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <footer className="ws-modal__foot" style={{ flexShrink: 0 }}>
                <WsBtn onClick={resetQuickForm} disabled={createScheduleMutation.isPending}>
                  إعادة تعيين
                </WsBtn>
                <WsBtn type="submit" variant="primary" disabled={!quickFormIsReady || createScheduleMutation.isPending}>
                  معاينة الجدول
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      ) : null}

      <ScheduleFormDialog
        open={isFormOpen}
        onClose={() => {
          if (!isMutating) {
            setIsFormOpen(false)
            setEditingSchedule(null)
          }
        }}
        onSubmit={handleSubmitForm}
        isSubmitting={createScheduleMutation.isPending || updateScheduleMutation.isPending}
        schedule={editingSchedule}
        templates={templatesQuery.data}
      />

      <ConfirmDeleteDialog
        open={Boolean(scheduleToDelete)}
        schedule={scheduleToDelete}
        isSubmitting={deleteScheduleMutation.isPending}
        onCancel={() => {
          if (!deleteScheduleMutation.isPending) {
            setScheduleToDelete(null)
          }
        }}
        onConfirm={handleDelete}
      />

      <ApplyScheduleToClassesDialog
        open={isApplyToClassesModalOpen}
        schedule={scheduleToApply}
        isSubmitting={applyScheduleToMultipleClassesMutation.isPending}
        onCancel={() => {
          if (!applyScheduleToMultipleClassesMutation.isPending) {
            setIsApplyToClassesModalOpen(false)
            setScheduleToApply(null)
          }
        }}
        onConfirm={handleApplyToClasses}
      />

      {quickPreviewData ? (
        <QuickSchedulePreviewModal
          open={isQuickPreviewOpen}
          data={quickPreviewData}
          onClose={() => {
            if (createScheduleMutation.isPending) return
            setIsQuickPreviewOpen(false)
            setQuickPreviewError(null)
            setQuickPreviewData(null)
          }}
          onConfirm={handleQuickSave}
          isSubmitting={createScheduleMutation.isPending}
          errorMessage={quickPreviewError}
        />
      ) : null}
    </WsPage>
  )
}
