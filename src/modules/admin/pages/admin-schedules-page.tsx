import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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
import type { ScheduleRecord, ScheduleTemplate, ScheduleType, ClassScheduleSummary } from '../types'

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
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

const quickEntryTypeLabels: Record<QuickScheduleEntryType, string> = {
  class: 'حصة دراسية',
  break: 'فسحة',
  prayer: 'صلاة',
}

const quickEntryTypeBadgeStyles: Record<QuickScheduleEntryType, string> = {
  class: 'bg-emerald-100 text-emerald-700',
  break: 'bg-amber-100 text-amber-700',
  prayer: 'bg-sky-100 text-sky-700',
}

function createInitialQuickFormValues(): QuickAddScheduleFormValues {
  return {
    scheduleName: '',
    semesterType: 'winter',
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

function ScheduleStatusBadge({ isActive }: { isActive: boolean }) {
  const tone = isActive
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-500 border border-slate-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isActive ? 'مفعل' : 'غير مفعل'}
    </span>
  )
}

function ScheduleTypeBadge({ type }: { type: ScheduleType }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
      <span className="h-2 w-2 rounded-full bg-sky-500" />
      {scheduleTypeLabels[type]}
    </span>
  )
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5 text-right">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
              {schedule ? 'تعديل جدول زمني' : 'إنشاء جدول زمني جديد'}
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              {schedule ? `تحديث ${schedule.name}` : 'إضافة خطة زمنية'}
            </h2>
            <p className="text-sm text-muted">
              أدخل الفترات الزمنية للحصص بالترتيب الصحيح. يمكنك استخدام قالب جاهز لتعبئة الفترات بسرعة.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق"
            disabled={isSubmitting}
          >
            ×
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit} noValidate>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 custom-scrollbar">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 text-right">
                <label htmlFor="schedule-name" className="text-sm font-medium text-slate-800">
                  اسم الجدول
                </label>
                <input
                  id="schedule-name"
                  type="text"
                  value={values.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="مثال: التوقيت الشتوي"
                  disabled={isSubmitting}
                  autoFocus
                />
                {errors.name ? <span className="text-xs font-medium text-rose-600">{errors.name}</span> : null}
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="schedule-type" className="text-sm font-medium text-slate-800">
                  نوع الجدول
                </label>
                <select
                  id="schedule-type"
                  value={values.type}
                  onChange={(event) => handleChange('type', event.target.value as ScheduleType)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  disabled={isSubmitting}
                >
                  {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">{scheduleTypeDescriptions[values.type]}</p>
                {errors.type ? <span className="text-xs font-medium text-rose-600">{errors.type}</span> : null}
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="schedule-target" className="text-sm font-medium text-slate-800">
                  المرحلة الدراسية (اختياري)
                </label>
                <input
                  id="schedule-target"
                  type="text"
                  value={values.target_level}
                  onChange={(event) => handleChange('target_level', event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="مثال: الابتدائية"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="schedule-template" className="text-sm font-medium text-slate-800">
                  استخدام قالب جاهز
                </label>
                <div className="flex gap-2">
                  <select
                    id="schedule-template"
                    value={selectedTemplateKey}
                    onChange={(event) => {
                      setSelectedTemplateKey(event.target.value)
                      handleApplyTemplate(event.target.value)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    disabled={isSubmitting || !templates || templates.length === 0}
                  >
                    <option value="">اختر قالبًا</option>
                    {templates?.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted">اختيار القالب سيملأ الفترات آليًا ويمكن تعديلها لاحقًا.</p>
              </div>

              <div className="md:col-span-2 grid gap-2 text-right">
                <label htmlFor="schedule-description" className="text-sm font-medium text-slate-800">
                  الوصف (اختياري)
                </label>
                <textarea
                  id="schedule-description"
                  value={values.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="تفاصيل إضافية عن الجدول أو ملاحظات للمعلمين"
                  disabled={isSubmitting}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-right">
                  <h3 className="text-base font-semibold text-slate-800">الفترات الزمنية</h3>
                  <p className="text-xs text-muted">
                    رتب الفترات حسب تسلسل اليوم الدراسي. يمكنك إضافة فسحات أو فترات استراحة عبر خيار الفسحة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setValues((prev) => ({
                      ...prev,
                      periods: [...prev.periods, createEmptyPeriod(getNextPeriodNumber(prev.periods))],
                    }))
                  }
                  className="button-primary"
                  disabled={isSubmitting}
                >
                  إضافة فترة
                </button>
              </div>

              {errors.periods ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-semibold text-rose-700">
                  {errors.periods}
                </div>
              ) : null}

              <div className="space-y-3">
                {values.periods.map((period, index) => {
                  const periodError = periodErrors[period.key] ?? {}
                  return (
                    <article
                      key={period.key}
                      className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-teal-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-700">الفترة رقم {index + 1}</h4>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              checked={period.is_break}
                              onChange={(event) => handlePeriodChange(period.key, 'is_break', event.target.checked)}
                              disabled={isSubmitting}
                            />
                            فسحة / استراحة
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemovePeriod(period.key)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                            disabled={isSubmitting || values.periods.length === 1}
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-5">
                        <div className="grid gap-2 text-right">
                          <label className="text-xs font-medium text-slate-600">رقم الفترة</label>
                          <input
                            type="number"
                            min={1}
                            value={period.period_number}
                            onChange={(event) => handlePeriodChange(period.key, 'period_number', event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            disabled={isSubmitting}
                          />
                          {periodError.period_number ? (
                            <span className="text-[11px] font-medium text-rose-600">{periodError.period_number}</span>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-right md:col-span-2">
                          <label className="text-xs font-medium text-slate-600">اسم الفترة (اختياري)</label>
                          <input
                            type="text"
                            value={period.period_name}
                            onChange={(event) => handlePeriodChange(period.key, 'period_name', event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="مثال: الحصة الأولى"
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="grid gap-2 text-right">
                          <label className="text-xs font-medium text-slate-600">وقت البداية</label>
                          <input
                            type="time"
                            value={period.start_time}
                            onChange={(event) => handlePeriodChange(period.key, 'start_time', event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            disabled={isSubmitting}
                          />
                          {periodError.start_time ? (
                            <span className="text-[11px] font-medium text-rose-600">{periodError.start_time}</span>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-right">
                          <label className="text-xs font-medium text-slate-600">وقت النهاية</label>
                          <input
                            type="time"
                            value={period.end_time}
                            onChange={(event) => handlePeriodChange(period.key, 'end_time', event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            disabled={isSubmitting}
                          />
                          {periodError.end_time ? (
                            <span className="text-[11px] font-medium text-rose-600">{periodError.end_time}</span>
                          ) : null}
                        </div>
                      </div>

                      {period.is_break ? (
                        <div className="mt-3 grid gap-2 text-right md:w-48">
                          <label className="text-xs font-medium text-slate-600">مدة الفسحة (دقائق)</label>
                          <input
                            type="number"
                            min={0}
                            value={period.break_duration}
                            onChange={(event) => handlePeriodChange(period.key, 'break_duration', event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="مثال: 15"
                            disabled={isSubmitting}
                          />
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <button type="button" onClick={onClose} className="button-secondary" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : schedule ? 'حفظ التعديلات' : 'إنشاء الجدول'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ open, schedule, isSubmitting, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  if (!open || !schedule) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">حذف جدول زمني</p>
          <h2 className="text-xl font-semibold text-slate-900">هل تريد حذف {schedule.name}؟</h2>
          <p className="text-sm text-muted">
            سيتم إزالة الجدول في حال عدم وجود حصص مرتبطة به. إذا كان مرتبطًا بحصص نشطة فستظهر رسالة تمنع الحذف.
          </p>
        </header>
        <footer className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="button-secondary" disabled={isSubmitting}>
            تراجع
          </button>
          <button type="button" onClick={onConfirm} className="button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
          </button>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">معاينة الجدول الزمني</p>
          <h2 className="text-2xl font-bold text-slate-900">{data.scheduleName}</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted md:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {scheduleTypeLabels[data.semesterType]}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              إجمالي المدة: {durationLabel}
            </span>
          </div>
          {requiresWarning ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-700">
              تنبيه: مدة الجدول تتجاوز 8 ساعات. تأكد من مناسبة الجدول للفترة الدراسية.
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="w-full min-w-[600px] table-fixed text-right text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">رقم الفترة</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">وقت البداية</th>
                  <th className="px-4 py-3 font-semibold">وقت النهاية</th>
                  <th className="px-4 py-3 font-semibold">المدة</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.sequence} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{entry.sequence}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${quickEntryTypeBadgeStyles[entry.type]}`}
                      >
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {entry.typeLabel}
                      </span>
                      {entry.name && entry.name !== entry.typeLabel ? (
                        <span className="mt-2 block text-xs text-slate-500">{entry.name}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.startTime}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.endTime}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{`${entry.duration} دقيقة`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="space-y-1 text-xs text-muted">
            <p>تحقق من توزيع الحصص والفسحات قبل حفظ الجدول.</p>
            {errorMessage ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-rose-700">{errorMessage}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="button-secondary" disabled={isSubmitting}>
              تعديل المدخلات
            </button>
            <button type="button" onClick={onConfirm} className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>
        </footer>

        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          aria-label="إغلاق المعاينة"
          disabled={isSubmitting}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-16 text-center">
      <p className="text-lg font-semibold text-slate-700">لا توجد جداول زمنية حتى الآن</p>
      <p className="mt-2 text-sm text-muted">ابدأ بإنشاء جدول جديد أو استيراد قالب من النظام القديم.</p>
      <button type="button" onClick={onCreate} className="button-primary mt-6">
        إنشاء جدول جديد
      </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative flex w-full max-w-4xl flex-col rounded-3xl bg-white shadow-xl" style={{ maxHeight: '85vh' }}>
        <header className="shrink-0 border-b border-slate-100 px-6 py-5 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">تطبيق الجدول على الفصول</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{schedule.name}</h2>
          <p className="mt-2 text-sm text-muted">اختر الفصول التي تريد تطبيق هذا الجدول عليها</p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted">جاري التحميل...</div>
          ) : classes.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted">لا توجد فصول متاحة</div>
          ) : (
            <div className="space-y-4">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedClasses.size === classes.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500/20"
                    disabled={isSubmitting}
                  />
                  <span>تحديد الكل ({classes.length} فصل)</span>
                </label>
                <span className="text-xs text-muted">محدد: {selectedClasses.size}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((classItem: ClassScheduleSummary) => {
                  const key = `${classItem.grade}|${classItem.class_name}`
                  const isChecked = selectedClasses.has(key)
                  const isAlreadyApplied = classItem.active_schedule === schedule.name
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                        isChecked
                          ? 'border-teal-300 bg-teal-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClass(classItem.grade, classItem.class_name)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500/20"
                        disabled={isSubmitting}
                      />
                      <div className="flex-1 text-right text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-800">{classItem.class_name}</span>
                            <span className="mx-2 text-slate-400">•</span>
                            <span className="text-muted">{classItem.grade}</span>
                          </div>
                          {isAlreadyApplied && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              مطبق
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button type="button" onClick={onCancel} className="button-secondary" disabled={isSubmitting}>
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="button-primary"
            disabled={isSubmitting || selectedClasses.size === 0}
          >
            {isSubmitting ? 'جاري التطبيق...' : `تطبيق على ${selectedClasses.size} فصل`}
          </button>
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
      target_level: null,
      description: null,
      periods: quickPreviewData.periodsPayload,
    }

    createScheduleMutation.mutate(payload, {
      onSuccess: (createdSchedule) => {
        setSelectedScheduleId(createdSchedule.id)
        setIsQuickPreviewOpen(false)
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
    return schedules.filter((schedule) => {
      const matchesQuery = term
        ? [schedule.name, schedule.target_level ?? '', schedule.description ?? '']
            .map((value) => value?.toLowerCase?.() ?? '')
            .some((value) => value.includes(term))
        : true
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? schedule.is_active : !schedule.is_active
      return matchesQuery && matchesStatus
    })
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
    return [
      { label: 'إجمالي الجداول', value: total },
      { label: 'جداول مفعلة', value: active },
      { label: 'جداول غير مفعلة', value: archived },
      { label: 'عدد الفترات المسجلة', value: totalPeriods },
    ]
  }, [schedules])

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
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">الخطط الزمنية</h1>
            <p className="text-sm text-muted">
              إدارة الجداول الزمنية للحصص الدراسية، إنشاء توقيتات جديدة، وتفعيل الجدول المعتمد للفصول.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="button-secondary"
              aria-expanded={isQuickAddOpen}
              aria-controls="quick-add-section"
              disabled={createScheduleMutation.isPending}
            >
              <i className="bi bi-lightning-charge-fill" /> الإضافة السريعة
            </button>
            <button type="button" onClick={handleCreate} className="button-primary" disabled={isMutating}>
              <i className="bi bi-plus-lg" /> إنشاء جدول يدوي
            </button>
          </div>
        </div>
        {schedulesQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            حدث خطأ أثناء تحميل الجداول الزمنية.
            <button
              type="button"
              onClick={() => schedulesQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section
        id="quick-add-section"
        className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm space-y-6"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h2 className="text-xl font-semibold text-slate-900">الإضافة السريعة</h2>
            <p className="text-sm text-muted">
              كوّن جدولًا زمنيًا كاملًا خلال دقائق عبر تعبئة الحقول الأساسية وإضافة الفسح وأوقات الصلاة حسب الحاجة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsQuickAddOpen((prev) => !prev)}
            className="button-secondary"
            aria-expanded={isQuickAddOpen}
            aria-controls="quick-add-form"
            disabled={createScheduleMutation.isPending}
          >
            {isQuickAddOpen ? 'إخفاء النموذج' : 'عرض النموذج'}
          </button>
        </header>

        {quickSuccessMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-700">
            {quickSuccessMessage}
          </div>
        ) : null}

        {isQuickAddOpen ? (
          <form
            id="quick-add-form"
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault()
              handleQuickPreview()
            }}
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2 text-right">
                <label htmlFor="quick-schedule-name" className="text-sm font-medium text-slate-800">
                  اسم الجدول الزمني
                </label>
                <input
                  id="quick-schedule-name"
                  type="text"
                  value={quickFormValues.scheduleName}
                  onChange={(event) => handleQuickScheduleNameChange(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="مثال: الجدول الدراسي للفصل الأول"
                  disabled={createScheduleMutation.isPending}
                  required
                />
                {quickFormErrors.scheduleName ? (
                  <span className="text-xs font-medium text-rose-600">{quickFormErrors.scheduleName}</span>
                ) : null}
                <p className="text-xs text-muted">اكتب اسمًا واضحًا يسهل التعرف عليه لاحقًا.</p>
              </div>

              <div className="grid gap-2 text-right">
                <span className="text-sm font-medium text-slate-800">نوع الفصل</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {(['winter', 'summer'] as ScheduleType[]).map((value) => {
                    const isActive = quickFormValues.semesterType === value
                    return (
                      <label
                        key={value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500/40 ${
                          isActive ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quick-semester-type"
                          value={value}
                          checked={isActive}
                          onChange={() => handleQuickSemesterChange(value)}
                          className="sr-only"
                          disabled={createScheduleMutation.isPending}
                        />
                        {scheduleTypeLabels[value]}
                      </label>
                    )
                  })}
                </div>
                {quickFormErrors.semesterType ? (
                  <span className="text-xs font-medium text-rose-600">{quickFormErrors.semesterType}</span>
                ) : null}
                <p className="text-xs text-muted">اختر التوقيت المناسب للخطة (شتوي أو صيفي).</p>
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="quick-period-duration" className="text-sm font-medium text-slate-800">
                  مدة الحصة (بالدقائق)
                </label>
                <input
                  id="quick-period-duration"
                  type="number"
                  min={15}
                  max={120}
                  value={quickFormValues.periodDuration}
                  onChange={(event) => handleQuickPeriodDurationChange(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="45"
                  disabled={createScheduleMutation.isPending}
                  required
                />
                {quickFormErrors.periodDuration ? (
                  <span className="text-xs font-medium text-rose-600">{quickFormErrors.periodDuration}</span>
                ) : null}
                <p className="text-xs text-muted">المدة المعيارية للحصة الدراسية، يمكن تعديلها لاحقًا.</p>
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="quick-first-period" className="text-sm font-medium text-slate-800">
                  وقت بداية الحصة الأولى
                </label>
                <input
                  id="quick-first-period"
                  type="time"
                  value={quickFormValues.firstPeriodStart}
                  onChange={(event) => handleQuickFirstPeriodStartChange(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  disabled={createScheduleMutation.isPending}
                  required
                />
                {quickFormErrors.firstPeriodStart ? (
                  <span className="text-xs font-medium text-rose-600">{quickFormErrors.firstPeriodStart}</span>
                ) : null}
                <p className="text-xs text-muted">أدخل الوقت بصيغة 24 ساعة (مثال: 07:30).</p>
              </div>

              <div className="grid gap-2 text-right">
                <label htmlFor="quick-period-count" className="text-sm font-medium text-slate-800">
                  عدد الحصص
                </label>
                <input
                  id="quick-period-count"
                  type="number"
                  min={1}
                  max={12}
                  value={quickFormValues.numberOfPeriods}
                  onChange={(event) => handleQuickNumberOfPeriodsChange(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="7"
                  disabled={createScheduleMutation.isPending}
                  required
                />
                {quickFormErrors.numberOfPeriods ? (
                  <span className="text-xs font-medium text-rose-600">{quickFormErrors.numberOfPeriods}</span>
                ) : null}
                <p className="text-xs text-muted">يمكن إنشاء ما بين حصة واحدة وحتى 12 حصة في اليوم الدراسي.</p>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    checked={quickFormValues.breaksEnabled}
                    onChange={(event) => handleQuickBreaksToggle(event.target.checked)}
                    disabled={createScheduleMutation.isPending}
                  />
                  إضافة فسحة
                </label>
                <button
                  type="button"
                  onClick={handleAddBreak}
                  className="button-secondary"
                  disabled={!quickFormValues.breaksEnabled || createScheduleMutation.isPending}
                >
                  <i className="bi bi-plus" /> إضافة فسحة أخرى
                </button>
              </div>
              <p className="text-xs text-muted">
                استخدم هذا الخيار لإدراج فترات استراحة بين الحصص. سيتم ضبط توقيت الحصص التالية تلقائيًا.
              </p>
              {quickFormErrors.breaks ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700">
                  {quickFormErrors.breaks}
                </div>
              ) : null}
              {quickFormValues.breaksEnabled ? (
                <div className="space-y-3">
                  {quickFormValues.breaks.map((item, index) => {
                    const itemErrors = quickFormErrors.breaksById[item.id] ?? {}
                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-teal-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-700">فسحة رقم {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveBreak(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                            disabled={createScheduleMutation.isPending}
                          >
                            حذف
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div className="grid gap-2 text-right">
                            <label className="text-xs font-medium text-slate-600">بعد الحصة رقم</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={item.afterPeriod}
                              onChange={(event) => handleBreakFieldChange(item.id, 'afterPeriod', event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              placeholder="3"
                              disabled={createScheduleMutation.isPending}
                            />
                            {itemErrors.afterPeriod ? (
                              <span className="text-[11px] font-medium text-rose-600">{itemErrors.afterPeriod}</span>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-right">
                            <label className="text-xs font-medium text-slate-600">مدة الفسحة (دقائق)</label>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={item.duration}
                              onChange={(event) => handleBreakFieldChange(item.id, 'duration', event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              placeholder="15"
                              disabled={createScheduleMutation.isPending}
                            />
                            {itemErrors.duration ? (
                              <span className="text-[11px] font-medium text-rose-600">{itemErrors.duration}</span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    checked={quickFormValues.prayersEnabled}
                    onChange={(event) => handleQuickPrayersToggle(event.target.checked)}
                    disabled={createScheduleMutation.isPending}
                  />
                  إضافة وقت صلاة
                </label>
                <button
                  type="button"
                  onClick={handleAddPrayer}
                  className="button-secondary"
                  disabled={!quickFormValues.prayersEnabled || createScheduleMutation.isPending}
                >
                  <i className="bi bi-plus" /> إضافة وقت صلاة
                </button>
              </div>
              <p className="text-xs text-muted">يمكنك تحديد أكثر من وقت صلاة مع اسم المدة والموقع في الجدول.</p>
              {quickFormErrors.prayers ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700">
                  {quickFormErrors.prayers}
                </div>
              ) : null}
              {quickFormValues.prayersEnabled ? (
                <div className="space-y-3">
                  {quickFormValues.prayers.map((item, index) => {
                    const itemErrors = quickFormErrors.prayersById[item.id] ?? {}
                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-teal-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-700">وقت صلاة رقم {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemovePrayer(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                            disabled={createScheduleMutation.isPending}
                          >
                            حذف
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="grid gap-2 text-right">
                            <label className="text-xs font-medium text-slate-600">بعد الحصة رقم</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={item.afterPeriod}
                              onChange={(event) => handlePrayerFieldChange(item.id, 'afterPeriod', event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              placeholder="4"
                              disabled={createScheduleMutation.isPending}
                            />
                            {itemErrors.afterPeriod ? (
                              <span className="text-[11px] font-medium text-rose-600">{itemErrors.afterPeriod}</span>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-right">
                            <label className="text-xs font-medium text-slate-600">مدة الصلاة (دقائق)</label>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={item.duration}
                              onChange={(event) => handlePrayerFieldChange(item.id, 'duration', event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              placeholder="20"
                              disabled={createScheduleMutation.isPending}
                            />
                            {itemErrors.duration ? (
                              <span className="text-[11px] font-medium text-rose-600">{itemErrors.duration}</span>
                            ) : null}
                          </div>
                          <div className="md:col-span-2 grid gap-2 text-right">
                            <label className="text-xs font-medium text-slate-600">اسم الصلاة</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(event) => handlePrayerFieldChange(item.id, 'name', event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              placeholder="مثال: صلاة الظهر"
                              disabled={createScheduleMutation.isPending}
                            />
                            {itemErrors.name ? (
                              <span className="text-[11px] font-medium text-rose-600">{itemErrors.name}</span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>

            {quickFormErrors.overlap ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-700">
                {quickFormErrors.overlap}
              </div>
            ) : null}

            {quickTotalDuration !== null ? (
              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                إجمالي الزمن المتوقع: <span className="font-semibold text-slate-900">{formatDurationLabel(quickTotalDuration)}</span>
                {quickTotalDuration > 480 ? (
                  <span className="mt-2 block text-xs font-semibold text-amber-600">
                    تنبيه: مدة الجدول تتجاوز 8 ساعات، يرجى مراجعة الفسح وأوقات الصلاة.
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetQuickForm}
                className="button-secondary"
                disabled={createScheduleMutation.isPending}
              >
                إعادة تعيين
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={!quickFormIsReady || createScheduleMutation.isPending}
              >
                معاينة الجدول
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-muted">
            فعّل الإضافة السريعة لملء جدول كامل اعتمادًا على عدد الحصص والفسح وأوقات الصلاة التي تختارها.
          </div>
        )}
      </section>

      <section className="glass-card space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-100 bg-white/70 p-4 text-right shadow-sm">
              <p className="text-xs font-semibold text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{item.value.toLocaleString('ar-SA')}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">قائمة الجداول</h2>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                {filteredSchedules.length}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <i className="bi bi-search text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث بالاسم أو الوصف"
                  className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ScheduleStatusFilter)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">مفعلة</option>
                <option value="inactive">غير مفعلة</option>
              </select>
            </div>

            <div className="space-y-3">
              {schedulesQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
                ))
              ) : filteredSchedules.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                  لا توجد جداول مطابقة للبحث.
                </div>
              ) : (
                filteredSchedules.map((schedule) => {
                  const isSelected = schedule.id === selectedScheduleId
                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      className={`w-full rounded-3xl border px-4 py-4 text-right transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                          : 'border-transparent bg-white/80 hover:border-teal-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{schedule.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <ScheduleTypeBadge type={schedule.type ?? 'custom'} />
                            {schedule.target_level ? <span>{schedule.target_level}</span> : null}
                            <span>{schedule.periods?.length ?? 0} فترة</span>
                          </div>
                        </div>
                        <ScheduleStatusBadge isActive={schedule.is_active} />
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
            {selectedSchedule ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 text-right">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedSchedule.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted md:justify-end">
                      <ScheduleTypeBadge type={selectedSchedule.type ?? 'custom'} />
                      <ScheduleStatusBadge isActive={selectedSchedule.is_active} />
                      {selectedSchedule.target_level ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                          {selectedSchedule.target_level}
                        </span>
                      ) : null}
                    </div>
                    <dl className="grid gap-2 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <dt className="font-semibold text-slate-600">تاريخ الإنشاء:</dt>
                        <dd>{formatDateTime(selectedSchedule.created_at)}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <dt className="font-semibold text-slate-600">آخر تحديث:</dt>
                        <dd>{formatDateTime(selectedSchedule.updated_at ?? selectedSchedule.created_at)}</dd>
                      </div>
                    </dl>
                    {selectedSchedule.description ? (
                      <p className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
                        {selectedSchedule.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden md:flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleEdit(selectedSchedule)}
                      className="button-secondary"
                      disabled={isMutating}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleToApply(selectedSchedule)
                        setIsApplyToClassesModalOpen(true)
                      }}
                      className="button-secondary"
                      disabled={isMutating}
                    >
                      <i className="bi bi-grid-3x3-gap-fill" /> تطبيق
                    </button>
                    {selectedSchedule.is_active ? (
                      <button
                        type="button"
                        onClick={() => deactivateScheduleMutation.mutate(selectedSchedule.id)}
                        className="button-secondary"
                        disabled={deactivateScheduleMutation.isPending}
                      >
                        {deactivateScheduleMutation.isPending && selectedScheduleId === selectedSchedule.id
                          ? 'جاري التعطيل...'
                          : 'تعطيل الجدول'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleActivate(selectedSchedule)}
                        className="button-primary"
                        disabled={activateScheduleMutation.isPending}
                      >
                        {activateScheduleMutation.isPending && selectedScheduleId === selectedSchedule.id
                          ? 'جاري التفعيل...'
                          : 'تفعيل الجدول'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setScheduleToDelete(selectedSchedule)}
                      className="button-secondary"
                      disabled={deleteScheduleMutation.isPending}
                    >
                      حذف
                    </button>
                  </div>
                </div>

                {/* جدول الفترات - للشاشات الكبيرة */}
                <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200">
                  <table className="w-full min-w-[640px] table-fixed text-right text-sm">
                    <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">رقم الفترة</th>
                        <th className="px-4 py-3 font-semibold">الاسم</th>
                        <th className="px-4 py-3 font-semibold">النوع</th>
                        <th className="px-4 py-3 font-semibold">وقت البداية</th>
                        <th className="px-4 py-3 font-semibold">وقت النهاية</th>
                        <th className="px-4 py-3 font-semibold">المدة (دقيقة)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSchedule.periods ?? []).map((period) => {
                        const start = formatTime(period.start_time)
                        const end = formatTime(period.end_time)
                        const duration = period.break_duration ?? ''
                        return (
                          <tr key={`${period.period_number}-${period.start_time}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{period.period_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{period.period_name ?? '—'}</td>
                            <td className="px-4 py-3 text-xs font-semibold">
                              {period.is_break ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                                  فسحة
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                                  حصة دراسية
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{start || '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{end || '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{duration ? duration : period.is_break ? '—' : 'حسب الفترة'}</td>
                          </tr>
                        )
                      })}
                      {(selectedSchedule.periods ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                            لا توجد فترات مسجلة لهذا الجدول حاليًا.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {/* بطاقات الفترات - للجوال */}
                <div className="md:hidden space-y-3">
                  {(selectedSchedule.periods ?? []).map((period) => {
                    const start = formatTime(period.start_time)
                    const end = formatTime(period.end_time)
                    const duration = period.break_duration ?? ''
                    return (
                      <div key={`${period.period_number}-${period.start_time}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="font-semibold text-teal-600">الفترة {period.period_number}</span>
                            {period.period_name && <p className="text-xs text-slate-600 mt-1">{period.period_name}</p>}
                          </div>
                          {period.is_break ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                              فسحة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                              حصة دراسية
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">البداية:</span>
                            <span className="font-semibold text-slate-900">{start || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">النهاية:</span>
                            <span className="font-semibold text-slate-900">{end || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">المدة:</span>
                            <span className="font-semibold text-slate-900">{duration ? `${duration} دقيقة` : period.is_break ? '—' : 'حسب الفترة'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(selectedSchedule.periods ?? []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted">
                      لا توجد فترات مسجلة لهذا الجدول حاليًا.
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted">
                  يمكن تطبيق هذا الجدول على فصل محدد من خلال صفحة «جداول الفصول»، حيث يتم ضبط أوقات الحصص تلقائيًا لكل
                  فترة.
                </p>
              </div>
            ) : schedulesQuery.isLoading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <span className="h-12 w-12 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                جاري تحميل تفاصيل الجداول...
              </div>
            ) : (
              <EmptyState onCreate={handleCreate} />
            )}
          </div>
        </div>
      </section>

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
    </section>
  )
}
