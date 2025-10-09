import { useEffect, useMemo, useState } from 'react'
import {
  useAddQuickClassSessionMutation,
  useApplyScheduleToClassMutation,
  useClassScheduleQuery,
  useClassScheduleSummaryQuery,
  useDeleteClassScheduleSessionMutation,
  useScheduleSessionDataQuery,
} from '../hooks'
import type {
  ClassScheduleGrid,
  ClassScheduleSessionData,
  ClassScheduleSlot,
  ClassScheduleSummary,
} from '../types'

const daysOfWeek: string[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const defaultPeriods = Array.from({ length: 8 }, (_, index) => index + 1)

function formatTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.slice(0, 5)
    return timePart ?? ''
  }
  return value.slice(0, 5)
}

function getPeriodTimeLabel(schedule: ClassScheduleGrid | undefined, period: number) {
  if (!schedule) return ''
  for (const day of daysOfWeek) {
    const slot = schedule[day]?.[period]
    if (slot && slot.start_time && slot.end_time) {
      return `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
    }
  }
  return ''
}

function extractPeriods(schedule?: ClassScheduleGrid | null) {
  if (!schedule) return defaultPeriods
  const periodNumbers = new Set<number>()
  for (const day of daysOfWeek) {
    const periods = schedule[day]
    if (!periods) continue
    for (const key of Object.keys(periods)) {
      periodNumbers.add(Number(key))
    }
  }
  if (periodNumbers.size === 0) {
    return defaultPeriods
  }
  return Array.from(periodNumbers).sort((a, b) => a - b)
}

function countScheduledSessions(schedule?: ClassScheduleGrid | null) {
  if (!schedule) return 0
  let total = 0
  for (const day of daysOfWeek) {
    const periods = schedule[day]
    if (!periods) continue
    for (const slot of Object.values(periods)) {
      if (slot) total += 1
    }
  }
  return total
}

interface QuickSessionDialogProps {
  open: boolean
  onClose: () => void
  classLabel: string
  grade: string
  className: string
  defaultDay?: string
  defaultPeriod?: number
  sessionData?: ClassScheduleSessionData
  isSessionDataLoading: boolean
  isSubmitting: boolean
  onSubmit: (payload: {
    teacher_id: number
    subject_id: number
    schedule_id?: number
    day: string
    period_number: number
  }) => void
}

type QuickSessionFormValues = {
  teacher_id: string
  subject_id: string
  schedule_id: string
  day: string
  period_number: string
}

function QuickSessionDialog({
  open,
  onClose,
  classLabel,
  grade,
  className,
  defaultDay,
  defaultPeriod,
  sessionData,
  isSessionDataLoading,
  isSubmitting,
  onSubmit,
}: QuickSessionDialogProps) {
  const initialValues: QuickSessionFormValues = {
    teacher_id: '',
    subject_id: '',
    schedule_id: '',
    day: defaultDay ?? daysOfWeek[0],
    period_number: defaultPeriod ? String(defaultPeriod) : '',
  }

  const [values, setValues] = useState<QuickSessionFormValues>(initialValues)
  const [errors, setErrors] = useState<Record<keyof QuickSessionFormValues, string | null>>({
    teacher_id: null,
    subject_id: null,
    schedule_id: null,
    day: null,
    period_number: null,
  })

  useEffect(() => {
    if (open) {
      setValues({
        teacher_id: '',
        subject_id: '',
        schedule_id: '',
        day: defaultDay ?? daysOfWeek[0],
        period_number: defaultPeriod ? String(defaultPeriod) : '',
      })
      setErrors({
        teacher_id: null,
        subject_id: null,
        schedule_id: null,
        day: null,
        period_number: null,
      })
    }
  }, [open, defaultDay, defaultPeriod])

  const validate = () => {
    const nextErrors: Record<keyof QuickSessionFormValues, string | null> = {
      teacher_id: null,
      subject_id: null,
      schedule_id: null,
      day: null,
      period_number: null,
    }

    if (!values.teacher_id) {
      nextErrors.teacher_id = 'اختر المعلم المسؤول'
    }
    if (!values.subject_id) {
      nextErrors.subject_id = 'اختر المادة الدراسية'
    }
    if (!values.day) {
      nextErrors.day = 'حدد اليوم الدراسي'
    }
    const period = Number(values.period_number)
    if (!values.period_number) {
      nextErrors.period_number = 'حدد رقم الحصة'
    } else if (!Number.isInteger(period) || period <= 0) {
      nextErrors.period_number = 'رقم الحصة يجب أن يكون رقمًا صحيحًا موجبًا'
    } else if (period > 12) {
      nextErrors.period_number = 'رقم الحصة لا يجب أن يتجاوز 12'
    }

    setErrors(nextErrors)
    return Object.values(nextErrors).every((value) => !value)
  }

  if (!open) return null

  const teacherOptions = sessionData?.teachers ?? []
  const subjectOptions = sessionData?.subjects ?? []
  const scheduleOptions = sessionData?.schedules ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">إضافة حصة سريعة</p>
          <h2 className="text-2xl font-bold text-slate-900">جدولة حصة جديدة لفصل {classLabel}</h2>
          <p className="text-sm text-muted">اختر المعلم والمادة وحدد اليوم ورقم الحصة، وسيتم تعيين أوقات الدرس تلقائيًا عند اختيار توقيت.</p>
        </header>

        <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-800">الفصل:</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 shadow-sm">
              {grade} / {className}
            </span>
            {defaultDay ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {defaultDay} - الحصة {defaultPeriod}
              </span>
            ) : null}
          </div>
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!validate()) return
            const payload = {
              teacher_id: Number(values.teacher_id),
              subject_id: Number(values.subject_id),
              schedule_id: values.schedule_id ? Number(values.schedule_id) : undefined,
              day: values.day,
              period_number: Number(values.period_number),
            }
            onSubmit(payload)
          }}
          noValidate
        >
          <div className="grid gap-2 text-right">
            <label htmlFor="quick-session-day" className="text-sm font-medium text-slate-800">
              اليوم الدراسي
            </label>
            <select
              id="quick-session-day"
              value={values.day}
              onChange={(event) => setValues((prev) => ({ ...prev, day: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            {errors.day ? <span className="text-xs font-medium text-rose-600">{errors.day}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="quick-session-period" className="text-sm font-medium text-slate-800">
              رقم الحصة
            </label>
            <input
              id="quick-session-period"
              type="number"
              min={1}
              max={12}
              value={values.period_number}
              onChange={(event) => setValues((prev) => ({ ...prev, period_number: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="مثال: 3"
              disabled={isSubmitting}
            />
            {errors.period_number ? <span className="text-xs font-medium text-rose-600">{errors.period_number}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="quick-session-teacher" className="text-sm font-medium text-slate-800">
              المعلم المسؤول
            </label>
            <select
              id="quick-session-teacher"
              value={values.teacher_id}
              onChange={(event) => setValues((prev) => ({ ...prev, teacher_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting || isSessionDataLoading || teacherOptions.length === 0}
            >
              <option value="">اختر المعلم</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                  {teacher.national_id ? ` • ${teacher.national_id}` : ''}
                </option>
              ))}
            </select>
            {isSessionDataLoading ? (
              <span className="text-xs text-slate-400">جارٍ تحميل قائمة المعلمين...</span>
            ) : null}
            {teacherOptions.length === 0 && !isSessionDataLoading ? (
              <span className="text-xs text-amber-600">لا يوجد معلمون نشطون حالياً.</span>
            ) : null}
            {errors.teacher_id ? <span className="text-xs font-medium text-rose-600">{errors.teacher_id}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="quick-session-subject" className="text-sm font-medium text-slate-800">
              المادة الدراسية
            </label>
            <select
              id="quick-session-subject"
              value={values.subject_id}
              onChange={(event) => setValues((prev) => ({ ...prev, subject_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting || isSessionDataLoading || subjectOptions.length === 0}
            >
              <option value="">اختر المادة</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {isSessionDataLoading ? (
              <span className="text-xs text-slate-400">جارٍ تحميل قائمة المواد...</span>
            ) : null}
            {subjectOptions.length === 0 && !isSessionDataLoading ? (
              <span className="text-xs text-amber-600">لا توجد مواد نشطة متاحة.</span>
            ) : null}
            {errors.subject_id ? <span className="text-xs font-medium text-rose-600">{errors.subject_id}</span> : null}
          </div>

          <div className="grid gap-2 text-right md:col-span-2">
            <label htmlFor="quick-session-schedule" className="text-sm font-medium text-slate-800">
              توقيت الحصة (اختياري)
            </label>
            <select
              id="quick-session-schedule"
              value={values.schedule_id}
              onChange={(event) => setValues((prev) => ({ ...prev, schedule_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting || isSessionDataLoading || scheduleOptions.length === 0}
            >
              <option value="">بدون توقيت محدد</option>
              {scheduleOptions.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name}
                  {schedule.type ? ` • ${schedule.type === 'winter' ? 'شتوي' : schedule.type === 'summer' ? 'صيفي' : 'مخصص'}` : ''}
                  {schedule.is_active ? ' • مفعل' : ''}
                </option>
              ))}
            </select>
            {scheduleOptions.length === 0 && !isSessionDataLoading ? (
              <span className="text-xs text-slate-500">
                لم يتم إنشاء أي توقيتات بعد. ستستخدم الحصة التوقيت الافتراضي 08:00 - 08:45.
              </span>
            ) : (
              <span className="text-xs text-muted">
                استخدام توقيت محدد يضمن ضبط أوقات البداية والنهاية تلقائياً حسب إعدادات الجدول.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة الحصة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ApplyScheduleDialogProps {
  open: boolean
  onClose: () => void
  classLabel: string
  schedules?: ClassScheduleSessionData['schedules']
  appliedScheduleId?: number | null
  isSubmitting: boolean
  onSubmit: (scheduleId: number) => void
}

function ApplyScheduleDialog({
  open,
  onClose,
  classLabel,
  schedules,
  appliedScheduleId,
  isSubmitting,
  onSubmit,
}: ApplyScheduleDialogProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedScheduleId(appliedScheduleId ? String(appliedScheduleId) : '')
      setError(null)
    }
  }, [open, appliedScheduleId])

  if (!open) return null

  const hasSchedules = Boolean(schedules && schedules.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">تطبيق توقيت على الفصل</p>
          <h2 className="text-2xl font-bold text-slate-900">اختيار توقيت لفصل {classLabel}</h2>
          <p className="text-sm text-muted">سيتم تحديث أوقات جميع الحصص الحالية لتتوافق مع التوقيت المحدد، مع الحفاظ على المعلمين والمواد.</p>
        </header>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!selectedScheduleId) {
              setError('الرجاء اختيار توقيت لتطبيقه على الفصل')
              return
            }
            onSubmit(Number(selectedScheduleId))
          }}
        >
          <div className="grid gap-2 text-right">
            <label htmlFor="apply-schedule-select" className="text-sm font-medium text-slate-800">
              اختر التوقيت المناسب
            </label>
            <select
              id="apply-schedule-select"
              value={selectedScheduleId}
              onChange={(event) => {
                setError(null)
                setSelectedScheduleId(event.target.value)
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={!hasSchedules || isSubmitting}
            >
              <option value="">اختر التوقيت</option>
              {schedules?.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name}
                  {schedule.type ? ` • ${schedule.type === 'winter' ? 'شتوي' : schedule.type === 'summer' ? 'صيفي' : 'مخصص'}` : ''}
                  {schedule.is_active ? ' • مفعل' : ''}
                </option>
              ))}
            </select>
            {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
            {!hasSchedules ? (
              <span className="text-xs text-amber-600">لا توجد توقيتات متاحة حالياً. قم بإنشاء توقيت من صفحة التوقيتات أولاً.</span>
            ) : null}
          </div>

          <p className="text-xs text-muted">
            التوقيت المطبق يحدد أوقات البداية والنهاية لكل حصة حسب رقمها. يمكن تغيير التوقيت لاحقاً دون فقد بيانات الحصص.
          </p>

          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting || !hasSchedules}>
              {isSubmitting ? 'جارٍ التطبيق...' : 'تطبيق التوقيت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ConfirmDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  sessionInfo?: {
    subject: string
    teacher: string
    day: string
    period: number
  }
}

function ConfirmDeleteDialog({ open, onClose, onConfirm, isSubmitting, sessionInfo }: ConfirmDeleteDialogProps) {
  if (!open) return null

  const subjectSummary = sessionInfo?.subject ? `«${sessionInfo.subject}»` : 'المحددة'
  const teacherSummary = sessionInfo?.teacher ? ` مع ${sessionInfo.teacher}` : ''
  const scheduleSummary = sessionInfo ? `${sessionInfo.day} • الحصة ${sessionInfo.period}` : 'الجدول الحالي'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-4 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">حذف حصة من الجدول</p>
          <h2 className="text-xl font-bold text-slate-900">هل تريد حذف هذه الحصة؟</h2>
        </header>

        <p className="text-sm text-slate-600">
          سيتم إزالة الحصة {subjectSummary}
          {teacherSummary} من جدول {scheduleSummary}. سيتم الاحتفاظ بسجلات الحضور المرتبطة بالحصة.
        </p>

        <footer className="mt-6 flex flex-col gap-2 md:flex-row md:justify-end">
          <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
            تراجع
          </button>
          <button type="button" onClick={onConfirm} className="button-primary sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export function AdminClassSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [quickSessionContext, setQuickSessionContext] = useState<{ day?: string; period?: number } | null>(null)
  const [isApplyScheduleOpen, setIsApplyScheduleOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<{ slot: ClassScheduleSlot; day: string } | null>(null)

  const classSummariesQuery = useClassScheduleSummaryQuery()
  const sessionDataQuery = useScheduleSessionDataQuery()
  const addQuickSessionMutation = useAddQuickClassSessionMutation()
  const applyScheduleMutation = useApplyScheduleToClassMutation()
  const deleteSessionMutation = useDeleteClassScheduleSessionMutation()

  useEffect(() => {
    if (!selectedClassId && classSummariesQuery.data && classSummariesQuery.data.length > 0) {
      setSelectedClassId(classSummariesQuery.data[0].id)
    }
  }, [classSummariesQuery.data, selectedClassId])

  const selectedClass: ClassScheduleSummary | null = useMemo(() => {
    if (!classSummariesQuery.data) return null
    return classSummariesQuery.data.find((item) => item.id === selectedClassId) ?? null
  }, [classSummariesQuery.data, selectedClassId])

  const scheduleQuery = useClassScheduleQuery(selectedClass?.grade, selectedClass?.class_name)

  const filteredClasses = useMemo(() => {
    if (!classSummariesQuery.data) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return classSummariesQuery.data
    return classSummariesQuery.data.filter((item) => {
      const searchable = `${item.name} ${item.grade} ${item.class_name}`.toLowerCase()
      return searchable.includes(term)
    })
  }, [classSummariesQuery.data, searchTerm])

  const periods = useMemo(() => extractPeriods(scheduleQuery.data?.schedule), [scheduleQuery.data?.schedule])
  const totalSessions = countScheduledSessions(scheduleQuery.data?.schedule)

  const handleOpenQuickSession = (day?: string, period?: number) => {
    if (!selectedClass) return
    setQuickSessionContext({ day, period })
  }

  const handleQuickSessionSubmit = (payload: {
    teacher_id: number
    subject_id: number
    schedule_id?: number
    day: string
    period_number: number
  }) => {
    if (!selectedClass) return
    const requestPayload: Record<string, unknown> = {
      grade: selectedClass.grade,
      class_name: selectedClass.class_name,
      teacher_id: payload.teacher_id,
      subject_id: payload.subject_id,
      day: payload.day,
      period_number: payload.period_number,
    }
    if (payload.schedule_id) {
      requestPayload.schedule_id = payload.schedule_id
    }

    addQuickSessionMutation.mutate(requestPayload, {
      onSuccess: () => {
        setQuickSessionContext(null)
      },
    })
  }

  const handleApplySchedule = (scheduleId: number) => {
    if (!selectedClass) return
    applyScheduleMutation.mutate(
      {
        grade: selectedClass.grade,
        class_name: selectedClass.class_name,
        schedule_id: scheduleId,
      },
      {
        onSuccess: () => {
          setIsApplyScheduleOpen(false)
        },
      },
    )
  }

  const handleDeleteSession = () => {
    if (!sessionToDelete) return
    deleteSessionMutation.mutate(sessionToDelete.slot.id, {
      onSuccess: () => {
        setSessionToDelete(null)
        deleteSessionMutation.reset()
      },
    })
  }

  const summariesErrorMessage =
    classSummariesQuery.error instanceof Error ? classSummariesQuery.error.message : 'تعذر تحميل قائمة الفصول'
  const scheduleErrorMessage =
    scheduleQuery.error instanceof Error ? scheduleQuery.error.message : 'تعذر تحميل جدول الفصل'

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">جداول الفصول</h1>
        <p className="text-sm text-muted">
          تحكم في الجداول الأسبوعية للفصول، أضف حصصًا بسرعة، وطبق التوقيتات المعتمدة عبر واجهات <code>/admin/class-schedules/*</code>.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">قائمة الفصول</h2>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              {classSummariesQuery.data?.length ?? 0}
            </span>
          </div>

          <div>
            <label htmlFor="class-search" className="sr-only">
              بحث عن فصل
            </label>
            <input
              id="class-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالصف أو الشعبة"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="space-y-3">
            {classSummariesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-3xl bg-slate-100" />
              ))
            ) : classSummariesQuery.isError ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                <p>تعذر تحميل الفصول: {summariesErrorMessage}</p>
                <button
                  type="button"
                  onClick={() => classSummariesQuery.refetch()}
                  className="button-secondary mt-3"
                  disabled={classSummariesQuery.isFetching}
                >
                  {classSummariesQuery.isFetching ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
                </button>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                لا توجد فصول مطابقة لبحثك حالياً.
              </div>
            ) : (
              filteredClasses.map((item) => {
                const isSelected = selectedClass?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedClassId(item.id)}
                    className={`w-full rounded-3xl border px-4 py-3 text-right transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                        : 'border-transparent bg-white/80 hover:border-teal-300 hover:bg-white'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-slate-900">{item.name}</span>
                      <span className="text-xs font-semibold text-teal-600">{item.students_count} طالب</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                        {item.grade} / {item.class_name}
                      </span>
                      {typeof item.sessions_count === 'number' ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {item.sessions_count} حصص
                        </span>
                      ) : null}
                      {item.active_schedule ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {item.active_schedule}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <div className="glass-card space-y-6">
          {selectedClass ? (
            <>
              <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1 text-right">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedClass.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted md:justify-end">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {selectedClass.students_count} طالب
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      {totalSessions} حصة مسجلة
                    </span>
                    {scheduleQuery.data?.applied_schedule ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">
                        التوقيت المطبق: {scheduleQuery.data.applied_schedule.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        لم يتم تطبيق توقيت بعد
                      </span>
                    )}
                    {scheduleQuery.isFetching ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <span className="h-2 w-2 animate-ping rounded-full bg-teal-500" />
                        يتم تحديث البيانات...
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => scheduleQuery.refetch()}
                    className="button-secondary"
                    disabled={scheduleQuery.isFetching}
                  >
                    {scheduleQuery.isFetching ? 'جارٍ التحديث...' : 'تحديث الجدول'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickSession()}
                    className="button-primary"
                    disabled={addQuickSessionMutation.isPending}
                  >
                    إضافة حصة سريعة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApplyScheduleOpen(true)}
                    className="button-secondary"
                    disabled={applyScheduleMutation.isPending}
                  >
                    {applyScheduleMutation.isPending ? 'جارٍ التطبيق...' : 'تطبيق توقيت'}
                  </button>
                </div>
              </header>

              {scheduleQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted">
                  <span className="h-12 w-12 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                  جاري تحميل جدول الفصل...
                </div>
              ) : scheduleQuery.isError ? (
                <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">
                  <p>تعذر تحميل جدول الفصل: {scheduleErrorMessage}</p>
                  <button type="button" onClick={() => scheduleQuery.refetch()} className="button-primary mt-4">
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full min-w-[720px] border-separate border-spacing-0 text-right">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="sticky right-0 w-32 border-l border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                            اليوم / الحصة
                          </th>
                          {periods.map((period) => {
                            const timeLabel = getPeriodTimeLabel(scheduleQuery.data?.schedule, period)
                            return (
                              <th key={period} className="border-l border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600">
                                <div className="flex flex-col items-end gap-1">
                                  <span>الحصة {period}</span>
                                  {timeLabel ? <span className="text-[11px] text-slate-500">{timeLabel}</span> : null}
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {daysOfWeek.map((day) => {
                          const daySessions = scheduleQuery.data?.schedule?.[day] ?? {}
                          return (
                            <tr key={day} className="border-t border-slate-100">
                              <th
                                scope="row"
                                className="sticky right-0 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700"
                              >
                                {day}
                              </th>
                              {periods.map((period) => {
                                const slot = daySessions?.[period] ?? null
                                const isBeingDeleted =
                                  deleteSessionMutation.isPending && sessionToDelete?.slot.id === slot?.id

                                return (
                                  <td key={period} className="border-l border-slate-100 px-3 py-4 align-top">
                                    {slot ? (
                                      <div className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{slot.subject_name}</p>
                                          <p className="text-xs text-muted">{slot.teacher_name}</p>
                                        </div>
                                        {slot.period_name ? (
                                          <span className="text-xs text-slate-500">{slot.period_name}</span>
                                        ) : null}
                                        {slot.schedule_name ? (
                                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
                                            {slot.schedule_name}
                                          </span>
                                        ) : null}
                                        {slot.start_time && slot.end_time ? (
                                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                          </span>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="button-secondary text-xs"
                                          onClick={() => setSessionToDelete({ slot, day })}
                                          disabled={deleteSessionMutation.isPending}
                                        >
                                          {isBeingDeleted ? 'جارٍ الحذف...' : 'حذف الحصة'}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuickSession(day, period)}
                                        className="w-full rounded-2xl border border-dashed border-slate-200 bg-white/60 py-5 text-sm font-semibold text-teal-600 transition hover:border-teal-300 hover:bg-teal-50"
                                        disabled={addQuickSessionMutation.isPending}
                                      >
                                        إضافة حصة
                                      </button>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted">
                    استخدم الأزرار داخل الخلايا لإضافة حصص جديدة مباشرة في المكان المطلوب، أو لحذف الحصص الحالية مع الحفاظ على سجلات الحضور التاريخية.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center text-sm text-muted">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">📋</span>
              اختر فصلًا من القائمة لعرض جدول حصصه الأسبوعي.
            </div>
          )}
        </div>
      </div>

      <QuickSessionDialog
        open={Boolean(selectedClass && quickSessionContext)}
        onClose={() => setQuickSessionContext(null)}
        classLabel={selectedClass?.name ?? ''}
        grade={selectedClass?.grade ?? ''}
        className={selectedClass?.class_name ?? ''}
        defaultDay={quickSessionContext?.day}
        defaultPeriod={quickSessionContext?.period}
        sessionData={sessionDataQuery.data}
        isSessionDataLoading={sessionDataQuery.isLoading}
        isSubmitting={addQuickSessionMutation.isPending}
        onSubmit={handleQuickSessionSubmit}
      />

      <ApplyScheduleDialog
        open={Boolean(selectedClass && isApplyScheduleOpen)}
        onClose={() => setIsApplyScheduleOpen(false)}
        classLabel={selectedClass?.name ?? ''}
        schedules={sessionDataQuery.data?.schedules}
        appliedScheduleId={scheduleQuery.data?.applied_schedule?.id}
        isSubmitting={applyScheduleMutation.isPending}
        onSubmit={handleApplySchedule}
      />

      <ConfirmDeleteDialog
        open={Boolean(sessionToDelete)}
        onClose={() => {
          setSessionToDelete(null)
          deleteSessionMutation.reset()
        }}
        onConfirm={handleDeleteSession}
        isSubmitting={deleteSessionMutation.isPending}
        sessionInfo={
          sessionToDelete
            ? {
                subject: sessionToDelete.slot.subject_name,
                teacher: sessionToDelete.slot.teacher_name,
                day: sessionToDelete.day,
                period: sessionToDelete.slot.period_number,
              }
            : undefined
        }
      />
    </section>
  )
}
