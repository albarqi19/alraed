import React, { useEffect, useMemo, useState } from 'react'
import {
  useAddQuickClassSessionMutation,
  useApplyScheduleToClassMutation,
  useClassScheduleQuery,
  useClassScheduleSummaryQuery,
  useDeleteAllClassSchedulesMutation,
  useDeleteClassScheduleMutation,
  useDeleteClassScheduleSessionMutation,
  useScheduleSessionDataQuery,
  useSubjectsQuery,
  useTeachersQuery,
  useUpdateClassSessionMutation,
} from '../hooks'
import { fetchClassSchedule } from '../api'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { printClassSchedule, printAllClassSchedules } from '../utils/print-class-schedule'
import type {
  ClassScheduleGrid,
  ClassScheduleSessionData,
  ClassScheduleSlot,
  ClassScheduleSummary,
  SubjectRecord,
  TeacherRecord,
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

function shortenTeacherName(name?: string | null) {
  if (!name) return ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length <= 2) {
    return parts.join(' ')
  }
  return `${parts.slice(0, 2).join(' ')}…`
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

interface QuickEditScheduleDialogProps {
  slot: ClassScheduleSlot | null
  day: string
  open: boolean
  onCancel: () => void
  onConfirm: (teacherId: number, subjectId: number) => void
  onDelete: () => void
  isSubmitting: boolean
  isDeleting: boolean
  teacherOptions: TeacherRecord[]
  subjectOptions: SubjectRecord[]
}

function QuickEditScheduleDialog({ slot, day, open, onCancel, onConfirm, onDelete, isSubmitting, isDeleting, teacherOptions, subjectOptions }: QuickEditScheduleDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(0)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0)

  useEffect(() => {
    if (slot) {
      // البحث عن teacher_id من الاسم
      const teacher = teacherOptions.find(t => t.name === slot.teacher_name)
      setSelectedTeacherId(teacher?.id ?? 0)
      
      // البحث عن subject_id من الاسم
      const subject = subjectOptions.find(s => s.name === slot.subject_name)
      setSelectedSubjectId(subject?.id ?? 0)
    }
  }, [slot, teacherOptions, subjectOptions])

  if (!open || !slot) return null

  const handleSubmit = () => {
    if (selectedTeacherId && selectedSubjectId) {
      onConfirm(selectedTeacherId, selectedSubjectId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">تعديل سريع</p>
          <h2 className="text-xl font-semibold text-slate-900">تعديل المعلم والمادة</h2>
          <p className="text-sm text-muted">
            {day} | الحصة {slot.period_number} | {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
          </p>
        </header>

        <div className="space-y-4">
          <div className="grid gap-2 text-right">
            <label htmlFor="quick-edit-schedule-teacher" className="text-sm font-medium text-slate-800">
              المعلم
            </label>
            <select
              id="quick-edit-schedule-teacher"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              <option value="0">اختر المعلم...</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="quick-edit-schedule-subject" className="text-sm font-medium text-slate-800">
              المادة
            </label>
            <select
              id="quick-edit-schedule-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              <option value="0">اختر المادة...</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex gap-2">
              <i className="bi bi-info-circle mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">ملاحظة هامة:</p>
                <p className="mt-1">
                  السجلات التاريخية للحضور ستبقى كما هي محفوظة بأسماء المعلم والمادة السابقة. التغيير سيؤثر على الحصص الجديدة فقط.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 sm:w-auto"
            disabled={isSubmitting || isDeleting}
          >
            <i className="bi bi-trash ml-2" />
            {isDeleting ? 'جاري الحذف...' : 'حذف الحصة'}
          </button>
          
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onCancel} className="button-secondary sm:w-auto" disabled={isSubmitting || isDeleting}>
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="button-primary sm:w-auto"
              disabled={isSubmitting || isDeleting || !selectedTeacherId || !selectedSubjectId}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminClassSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [quickSessionContext, setQuickSessionContext] = useState<{ day?: string; period?: number } | null>(null)
  const [isApplyScheduleOpen, setIsApplyScheduleOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<{ slot: ClassScheduleSlot; day: string } | null>(null)
  const [slotToQuickEdit, setSlotToQuickEdit] = useState<{ slot: ClassScheduleSlot; day: string } | null>(null)
  const [selectedDay, setSelectedDay] = useState<{ day: string; sessions: Record<number, ClassScheduleSlot> } | null>(null)
  const [showDaysPanel, setShowDaysPanel] = useState(false)
  const [isDeleteScheduleOpen, setIsDeleteScheduleOpen] = useState(false)
  const [deleteScheduleStep, setDeleteScheduleStep] = useState<1 | 2 | 3>(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // حالة طباعة جداول جميع الفصول
  const [isPrintingAll, setIsPrintingAll] = useState(false)

  // حالة حذف جداول جميع الفصول
  const [isDeleteAllSchedulesOpen, setIsDeleteAllSchedulesOpen] = useState(false)
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2 | 3>(1)
  const [deleteAllPassword, setDeleteAllPassword] = useState('')
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('')
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null)

  // الاستماع لفتح قائمة الأيام
  React.useEffect(() => {
    const handleOpenDays = () => setShowDaysPanel(true)
    window.addEventListener('openDaysPanel', handleOpenDays)
    return () => window.removeEventListener('openDaysPanel', handleOpenDays)
  }, [])

  // الاستماع لفتح جدول اليوم من قائمة الأيام
  React.useEffect(() => {
    const handleOpenDay = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setSelectedDay(detail)
      setShowDaysPanel(false)
    }
    window.addEventListener('openDaySchedule', handleOpenDay)
    return () => window.removeEventListener('openDaySchedule', handleOpenDay)
  }, [])

  // منع تمرير الخلفية عند فتح النوافذ
  React.useEffect(() => {
    if (selectedDay || showDaysPanel) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedDay, showDaysPanel])

  const classSummariesQuery = useClassScheduleSummaryQuery()
  const sessionDataQuery = useScheduleSessionDataQuery()
  const addQuickSessionMutation = useAddQuickClassSessionMutation()
  const applyScheduleMutation = useApplyScheduleToClassMutation()
  const deleteSessionMutation = useDeleteClassScheduleSessionMutation()
  const deleteScheduleMutation = useDeleteClassScheduleMutation()
  const deleteAllSchedulesMutation = useDeleteAllClassSchedulesMutation()
  const updateSessionMutation = useUpdateClassSessionMutation()
  const { data: teachersData } = useTeachersQuery()
  const { data: subjectsData } = useSubjectsQuery()

  const teacherOptions = useMemo(() => teachersData ?? [], [teachersData])
  const subjectOptions = useMemo(() => subjectsData ?? [], [subjectsData])

  const gradeOptions = useMemo(() => {
    if (!classSummariesQuery.data) return []
    const uniqueGrades = new Set<string>()
    classSummariesQuery.data.forEach((item) => {
      if (item.grade) {
        uniqueGrades.add(item.grade)
      }
    })
    return Array.from(uniqueGrades).sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }))
  }, [classSummariesQuery.data])

  useEffect(() => {
    if (gradeFilter !== 'all' && gradeOptions.length > 0 && !gradeOptions.includes(gradeFilter)) {
      setGradeFilter('all')
    }
  }, [gradeFilter, gradeOptions])

  const filteredClasses = useMemo(() => {
    if (!classSummariesQuery.data) return []
    const term = searchTerm.trim().toLowerCase()
    const baseList = gradeFilter === 'all'
      ? classSummariesQuery.data
      : classSummariesQuery.data.filter((item) => item.grade === gradeFilter)

    if (!term) return baseList

    return baseList.filter((item) => {
      const searchable = `${item.name} ${item.grade} ${item.class_name}`.toLowerCase()
      return searchable.includes(term)
    })
  }, [classSummariesQuery.data, gradeFilter, searchTerm])

  const isFiltered = gradeFilter !== 'all' || Boolean(searchTerm.trim())

  useEffect(() => {
    if (filteredClasses.length === 0) {
      if (selectedClassId !== null) {
        setSelectedClassId(null)
      }
      return
    }

    const isStillSelected = filteredClasses.some((item) => item.id === selectedClassId)

    if (!isStillSelected) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses, selectedClassId])

  const selectedClass: ClassScheduleSummary | null = useMemo(() => {
    if (filteredClasses.length === 0) return null
    return filteredClasses.find((item) => item.id === selectedClassId) ?? null
  }, [filteredClasses, selectedClassId])

  const scheduleQuery = useClassScheduleQuery(selectedClass?.grade, selectedClass?.class_name)

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

  const handleQuickEditSlot = (teacherId: number, subjectId: number) => {
    if (!slotToQuickEdit || !scheduleQuery.data?.class_info) return
    
    const slot = slotToQuickEdit.slot
    const classInfo = scheduleQuery.data.class_info
    const payload = {
      teacher_id: teacherId,
      subject_id: subjectId,
      grade: classInfo.grade,
      class_name: classInfo.class_name,
      day: slotToQuickEdit.day,
      period_number: slot.period_number,
      start_time: formatTime(slot.start_time),
      end_time: formatTime(slot.end_time),
      status: 'active' as const,
      notes: null,
    }
    
    updateSessionMutation.mutate(
      {
        id: slot.id,
        payload,
      },
      {
        onSuccess: () => {
          setSlotToQuickEdit(null)
          scheduleQuery.refetch()
        },
        onError: (error: unknown) => {
          const errorData = (error as { response?: { data?: unknown } })?.response?.data as { message?: string; conflict_details?: string } | undefined
          
          // عرض تفاصيل الحصة المتضاربة إن وجدت
          if (errorData?.conflict_details) {
            alert(`⚠️ ${errorData.message}\n\n${errorData.conflict_details}`)
          } else if (errorData?.message) {
            alert(`⚠️ ${errorData.message}`)
          }
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

  // حساب إجمالي الحصص في جميع الفصول
  const totalSessionsAllClasses = useMemo(() => {
    return classSummariesQuery.data?.reduce((total, cls) => total + (cls.sessions_count ?? 0), 0) ?? 0
  }, [classSummariesQuery.data])

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">جداول الفصول</h1>
          <p className="text-sm text-muted">
            تحكم في الجداول الأسبوعية للفصول، أضف حصصًا بسرعة، وطبق التوقيتات المعتمدة عبر واجهات <code>/admin/class-schedules/*</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalSessionsAllClasses > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (!classSummariesQuery.data || classSummariesQuery.data.length === 0) return
                setIsPrintingAll(true)
                try {
                  const schoolName = useAuthStore.getState().user?.school?.name || 'المدرسة'
                  const results = await Promise.all(
                    classSummariesQuery.data.map((cls) =>
                      fetchClassSchedule(cls.grade, cls.class_name).then((res) => ({
                        grade: cls.grade,
                        className: cls.class_name,
                        displayName: cls.name || `${cls.grade} / ${cls.class_name}`,
                        schedule: res.schedule,
                        appliedScheduleName: res.applied_schedule?.name,
                      })),
                    ),
                  )
                  const withSessions = results.filter(
                    (r) => Object.values(r.schedule).some((day) => Object.values(day).some(Boolean)),
                  )
                  printAllClassSchedules(withSessions, schoolName)
                } catch {
                  alert('حدث خطأ أثناء تحميل الجداول للطباعة')
                } finally {
                  setIsPrintingAll(false)
                }
              }}
              className="button-secondary whitespace-nowrap"
              disabled={isPrintingAll}
            >
              <i className="bi bi-printer ml-2" />
              {isPrintingAll ? 'جارٍ التحميل...' : 'طباعة جميع الجداول'}
            </button>
          )}
          {totalSessionsAllClasses > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsDeleteAllSchedulesOpen(true)
                setDeleteAllStep(1)
                setDeleteAllPassword('')
                setDeleteAllConfirmText('')
                setDeleteAllError(null)
              }}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 whitespace-nowrap"
              disabled={deleteAllSchedulesMutation.isPending}
            >
              <i className="bi bi-trash ml-2" />
              حذف جداول جميع الفصول ({totalSessionsAllClasses} حصة)
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
        <aside className="glass-card flex min-h-[320px] flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-140px)] lg:overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">قائمة الفصول</h2>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              {classSummariesQuery.isLoading
                ? '…'
                : `${filteredClasses.length}${isFiltered ? ` / ${classSummariesQuery.data?.length ?? 0}` : ''}`}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="sm:w-44">
              <label htmlFor="class-grade-filter" className="sr-only">
                تصفية حسب الصف
              </label>
              <select
                id="class-grade-filter"
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">جميع الصفوف</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="class-search" className="sr-only">
                بحث عن فصل
              </label>
              <input
                id="class-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث بالصف أو الشعبة أو اسم الفصل"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
            {classSummariesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              ))
            ) : classSummariesQuery.isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                لا توجد فصول مطابقة لبحثك حالياً.
              </div>
            ) : (
              filteredClasses.map((item) => {
                const isSelected = selectedClass?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedClassId(item.id)
                      // على الجوال: فتح نافذة الأيام مباشرة
                      if (window.innerWidth < 768) {
                        // انتظر تحديث الحالة ثم فتح النافذة
                        setTimeout(() => {
                          const event = new CustomEvent('openDaysPanel')
                          window.dispatchEvent(event)
                        }, 100)
                      }
                    }}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-right text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                        : 'border-transparent bg-white/80 hover:border-teal-300 hover:bg-white'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {item.grade} / {item.class_name}
                      </span>
                      <span className="text-[11px] font-semibold text-teal-600">{item.students_count} طالب</span>
                    </div>
                    {item.name && item.name !== `${item.grade} / ${item.class_name}` ? (
                      <p className="mt-1 text-xs text-slate-500">{item.name}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
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
                  {totalSessions > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!scheduleQuery.data?.schedule || !selectedClass) return
                        const schoolName = useAuthStore.getState().user?.school?.name || 'المدرسة'
                        printClassSchedule(
                          scheduleQuery.data.schedule,
                          {
                            grade: selectedClass.grade,
                            class_name: selectedClass.class_name,
                            name: selectedClass.name,
                          },
                          schoolName,
                          scheduleQuery.data.applied_schedule?.name,
                        )
                      }}
                      className="button-secondary"
                    >
                      <i className="bi bi-printer ml-1" />
                      طباعة الجدول
                    </button>
                  )}
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
                  {totalSessions > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteScheduleOpen(true)
                        setDeleteScheduleStep(1)
                        setDeletePassword('')
                        setDeleteConfirmText('')
                        setDeleteError(null)
                      }}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      disabled={deleteScheduleMutation.isPending}
                    >
                      حذف الجدول
                    </button>
                  )}
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
                  {/* عرض الجدول للشاشات الكبيرة */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[720px] border-collapse text-right text-xs md:text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="sticky right-0 w-28 border border-slate-200 bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
                            اليوم / الحصة
                          </th>
                          {periods.map((period) => {
                            const timeLabel = getPeriodTimeLabel(scheduleQuery.data?.schedule, period)
                            return (
                              <th key={period} className="border border-slate-200 px-2.5 py-2 text-[11px] font-semibold">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span>الحصة {period}</span>
                                  {timeLabel ? <span className="text-[10px] text-slate-500">{timeLabel}</span> : null}
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
                            <tr key={day} className="bg-white even:bg-slate-50/70">
                              <th
                                scope="row"
                                className="sticky right-0 border border-slate-200 bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-700"
                              >
                                {day}
                              </th>
                              {periods.map((period) => {
                                const slot = daySessions?.[period] ?? null

                                return (
                                  <td key={period} className="border border-slate-200 p-0">
                                    {slot ? (
                                      <button
                                        type="button"
                                        onClick={() => setSlotToQuickEdit({ slot, day })}
                                        className="w-full h-full min-h-[70px] flex flex-col justify-center gap-1 text-right transition-all hover:bg-teal-50 p-3 cursor-pointer"
                                        disabled={deleteSessionMutation.isPending || updateSessionMutation.isPending}
                                      >
                                        <p className="font-semibold text-slate-900 leading-tight text-sm">
                                          {slot.subject_name}
                                        </p>
                                        {slot.teacher_name ? (
                                          <p className="text-xs text-slate-500" title={slot.teacher_name}>
                                            {shortenTeacherName(slot.teacher_name)}
                                          </p>
                                        ) : null}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuickSession(day, period)}
                                        className="w-full min-h-[70px] border border-dashed border-teal-300 bg-white py-2 text-xs font-semibold text-teal-600 transition hover:border-teal-400 hover:bg-teal-50"
                                        disabled={addQuickSessionMutation.isPending}
                                      >
                                        إضافة
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
                    اضغط على الحصة لتعديل المعلم والمادة أو حذفها. استخدم الخلايا الفارغة لإضافة حصص جديدة مع الحفاظ على سجلات الحضور التاريخية.
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

      {/* نافذة قائمة الأيام للجوال */}
      {showDaysPanel && scheduleQuery.data?.schedule && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowDaysPanel(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div 
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 border-b border-slate-100">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            
            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">أيام الأسبوع</h2>
                  <p className="text-xs text-muted">اختر يوم لعرض حصصه</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDaysPanel(false)}
                  className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </header>

              <div className="space-y-3">
                {daysOfWeek.map((day) => {
                  const daySessions = scheduleQuery.data.schedule?.[day] ?? {}
                  const sessionsCount = Object.values(daySessions).filter(s => s !== null).length
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const event = new CustomEvent('openDaySchedule', { detail: { day, sessions: daySessions } })
                        window.dispatchEvent(event)
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm hover:border-teal-300 hover:bg-teal-50/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{day}</p>
                          <p className="text-xs text-muted mt-1">{sessionsCount} حصة</p>
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض حصص اليوم للجوال */}
      {selectedDay && (
        <div 
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSelectedDay(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div 
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 border-b border-slate-100">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            
            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedDay.day}</h2>
                  <p className="text-xs text-muted">{Object.keys(selectedDay.sessions).length} حصة</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </header>

              <div className="space-y-3">
                {Object.values(selectedDay.sessions).filter(slot => slot !== null).map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-teal-600">الحصة {slot.period_number}</span>
                      <span className="text-xs text-slate-500">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">المادة:</span>
                        <span className="font-semibold text-slate-900">{slot.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">المعلم:</span>
                        <span className="font-semibold text-slate-900">{slot.teacher_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

      <QuickEditScheduleDialog
        open={Boolean(slotToQuickEdit)}
        slot={slotToQuickEdit?.slot ?? null}
        day={slotToQuickEdit?.day ?? ''}
        onCancel={() => setSlotToQuickEdit(null)}
        onConfirm={handleQuickEditSlot}
        onDelete={() => {
          if (slotToQuickEdit) {
            setSessionToDelete(slotToQuickEdit)
            setSlotToQuickEdit(null)
          }
        }}
        isSubmitting={updateSessionMutation.isPending}
        isDeleting={false}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
      />

      {/* Dialog حذف جدول الفصل - متعدد الخطوات */}
      {isDeleteScheduleOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsDeleteScheduleOpen(false)}
              className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
              disabled={deleteScheduleMutation.isPending}
            >
              إغلاق
            </button>

            <header className="mb-4 space-y-1 text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">حذف جدول الفصل</p>
              <h2 className="text-xl font-bold text-slate-900">
                {deleteScheduleStep === 1 && 'التحقق من الهوية'}
                {deleteScheduleStep === 2 && 'تنبيه مهم'}
                {deleteScheduleStep === 3 && 'التأكيد النهائي'}
              </h2>
            </header>

            {/* الخطوة 1: إدخال الرقم السري */}
            {deleteScheduleStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  أنت على وشك حذف جدول الفصل <strong>{selectedClass.name}</strong> الذي يحتوي على{' '}
                  <strong>{totalSessions} حصة</strong>. للمتابعة، أدخل الرقم السري الخاص بك.
                </p>
                <div className="space-y-2">
                  <label htmlFor="delete-password" className="block text-sm font-medium text-slate-700">
                    الرقم السري
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value)
                      setDeleteError(null)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="أدخل الرقم السري"
                    autoFocus
                  />
                  {deleteError && <p className="text-xs font-medium text-rose-600">{deleteError}</p>}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDeleteScheduleOpen(false)}
                    className="button-secondary sm:w-auto"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!deletePassword.trim()) {
                        setDeleteError('الرقم السري مطلوب')
                        return
                      }
                      setDeleteScheduleStep(2)
                    }}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* الخطوة 2: التنبيه */}
            {deleteScheduleStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="space-y-2 text-sm text-amber-800">
                      <p className="font-semibold">هذا الإجراء يؤثر على سير الحصص!</p>
                      <ul className="list-inside list-disc space-y-1 text-amber-700">
                        <li>سيتم حذف جميع الحصص المسجلة للفصل ({totalSessions} حصة)</li>
                        <li>سجلات الحضور المرتبطة بالحصص ستبقى محفوظة</li>
                        <li>لا يمكن التراجع عن هذا الإجراء</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteScheduleStep(1)}
                    className="button-secondary sm:w-auto"
                  >
                    رجوع
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteScheduleStep(3)}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
                  >
                    فهمت، المتابعة
                  </button>
                </div>
              </div>
            )}

            {/* الخطوة 3: التأكيد النهائي */}
            {deleteScheduleStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  للتأكيد النهائي، اكتب النص التالي بالضبط:
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <code className="text-sm font-semibold text-rose-600">حذف جميع الحصص</code>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value)
                      setDeleteError(null)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="اكتب النص هنا"
                    autoFocus
                    dir="rtl"
                  />
                  {deleteError && <p className="text-xs font-medium text-rose-600 text-center">{deleteError}</p>}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteScheduleStep(2)}
                    className="button-secondary sm:w-auto"
                    disabled={deleteScheduleMutation.isPending}
                  >
                    رجوع
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteConfirmText !== 'حذف جميع الحصص') {
                        setDeleteError('النص غير مطابق')
                        return
                      }
                      deleteScheduleMutation.mutate(
                        {
                          grade: selectedClass.grade,
                          className: selectedClass.class_name,
                          password: deletePassword,
                        },
                        {
                          onSuccess: () => {
                            setIsDeleteScheduleOpen(false)
                            setDeleteScheduleStep(1)
                            setDeletePassword('')
                            setDeleteConfirmText('')
                            setDeleteError(null)
                          },
                          onError: (error) => {
                            const message = error instanceof Error ? error.message : 'حدث خطأ'
                            if (message.includes('السري')) {
                              setDeleteScheduleStep(1)
                            }
                            setDeleteError(message)
                          },
                        }
                      )
                    }}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
                    disabled={deleteScheduleMutation.isPending || deleteConfirmText !== 'حذف جميع الحصص'}
                  >
                    {deleteScheduleMutation.isPending ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog حذف جداول جميع الفصول - متعدد الخطوات */}
      {isDeleteAllSchedulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsDeleteAllSchedulesOpen(false)}
              className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
              disabled={deleteAllSchedulesMutation.isPending}
            >
              إغلاق
            </button>

            <header className="mb-4 space-y-1 text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">حذف جداول جميع الفصول</p>
              <h2 className="text-xl font-bold text-slate-900">
                {deleteAllStep === 1 && 'التحقق من الهوية'}
                {deleteAllStep === 2 && 'تنبيه مهم'}
                {deleteAllStep === 3 && 'التأكيد النهائي'}
              </h2>
            </header>

            {/* الخطوة 1: إدخال الرقم السري */}
            {deleteAllStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  أنت على وشك حذف جداول <strong>جميع الفصول</strong> في المدرسة ({totalSessionsAllClasses} حصة في {classSummariesQuery.data?.length ?? 0} فصل). للمتابعة، أدخل الرقم السري الخاص بك.
                </p>
                <div className="space-y-2">
                  <label htmlFor="delete-all-password" className="block text-sm font-medium text-slate-700">
                    الرقم السري
                  </label>
                  <input
                    id="delete-all-password"
                    type="password"
                    value={deleteAllPassword}
                    onChange={(e) => {
                      setDeleteAllPassword(e.target.value)
                      setDeleteAllError(null)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="أدخل الرقم السري"
                    autoFocus
                  />
                  {deleteAllError && <p className="text-xs font-medium text-rose-600">{deleteAllError}</p>}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllSchedulesOpen(false)}
                    className="button-secondary sm:w-auto"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!deleteAllPassword.trim()) {
                        setDeleteAllError('الرقم السري مطلوب')
                        return
                      }
                      setDeleteAllStep(2)
                    }}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* الخطوة 2: التنبيه */}
            {deleteAllStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="space-y-2 text-sm text-rose-800">
                      <p className="font-semibold">تحذير: هذا الإجراء خطير!</p>
                      <ul className="list-inside list-disc space-y-1 text-rose-700">
                        <li>سيتم حذف جميع الحصص من <strong>جميع الفصول</strong> ({totalSessionsAllClasses} حصة)</li>
                        <li>سيتم حذف جداول <strong>{classSummariesQuery.data?.length ?? 0} فصل</strong></li>
                        <li>سجلات الحضور المرتبطة بالحصص ستبقى محفوظة</li>
                        <li className="font-semibold">لا يمكن التراجع عن هذا الإجراء</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(1)}
                    className="button-secondary sm:w-auto"
                  >
                    رجوع
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(3)}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
                  >
                    فهمت، المتابعة
                  </button>
                </div>
              </div>
            )}

            {/* الخطوة 3: التأكيد النهائي */}
            {deleteAllStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  للتأكيد النهائي، اكتب النص التالي بالضبط:
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <code className="text-sm font-semibold text-rose-600">حذف جميع الجداول</code>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={deleteAllConfirmText}
                    onChange={(e) => {
                      setDeleteAllConfirmText(e.target.value)
                      setDeleteAllError(null)
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    placeholder="اكتب النص هنا"
                    autoFocus
                    dir="rtl"
                  />
                  {deleteAllError && <p className="text-xs font-medium text-rose-600 text-center">{deleteAllError}</p>}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(2)}
                    className="button-secondary sm:w-auto"
                    disabled={deleteAllSchedulesMutation.isPending}
                  >
                    رجوع
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteAllConfirmText !== 'حذف جميع الجداول') {
                        setDeleteAllError('النص غير مطابق')
                        return
                      }
                      deleteAllSchedulesMutation.mutate(deleteAllPassword, {
                        onSuccess: () => {
                          setIsDeleteAllSchedulesOpen(false)
                          setDeleteAllStep(1)
                          setDeleteAllPassword('')
                          setDeleteAllConfirmText('')
                          setDeleteAllError(null)
                        },
                        onError: (error) => {
                          const message = error instanceof Error ? error.message : 'حدث خطأ'
                          if (message.includes('السري')) {
                            setDeleteAllStep(1)
                          }
                          setDeleteAllError(message)
                        },
                      })
                    }}
                    className="rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
                    disabled={deleteAllSchedulesMutation.isPending || deleteAllConfirmText !== 'حذف جميع الجداول'}
                  >
                    {deleteAllSchedulesMutation.isPending ? 'جارٍ الحذف...' : 'تأكيد حذف الكل'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
