import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useActivateScheduleMutation,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useSchedulesQuery,
  useScheduleTemplatesQuery,
  useUpdateScheduleMutation,
} from '../hooks'
import type { ScheduleRecord, ScheduleTemplate, ScheduleType } from '../types'

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

export function AdminSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('all')
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleRecord | null>(null)

  const schedulesQuery = useSchedulesQuery()
  const templatesQuery = useScheduleTemplatesQuery()
  const createScheduleMutation = useCreateScheduleMutation()
  const updateScheduleMutation = useUpdateScheduleMutation()
  const activateScheduleMutation = useActivateScheduleMutation()
  const deleteScheduleMutation = useDeleteScheduleMutation()

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

  const isMutating =
    createScheduleMutation.isPending || updateScheduleMutation.isPending || activateScheduleMutation.isPending

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
          <button type="button" onClick={handleCreate} className="button-primary" disabled={isMutating}>
            <i className="bi bi-plus-lg" /> إنشاء جدول
          </button>
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
                  <div className="flex flex-col gap-2 sm:flex-row">
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
                      onClick={() => handleActivate(selectedSchedule)}
                      className="button-primary"
                      disabled={activateScheduleMutation.isPending || selectedSchedule.is_active}
                    >
                      {activateScheduleMutation.isPending && selectedScheduleId === selectedSchedule.id
                        ? 'جاري التفعيل...'
                        : selectedSchedule.is_active
                        ? 'مفعل'
                        : 'تفعيل الجدول'}
                    </button>
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

                <div className="overflow-x-auto rounded-3xl border border-slate-200">
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
    </section>
  )
}
