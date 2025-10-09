import { useEffect, useMemo, useState } from 'react'
import {
  useClassSessionsQuery,
  useCreateClassSessionMutation,
  useDeleteClassSessionMutation,
  useSubjectsQuery,
  useTeachersQuery,
  useUpdateClassSessionMutation,
} from '../hooks'
import type { ClassSessionRecord, SubjectRecord, TeacherRecord } from '../types'

const daysOfWeek: string[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

type SessionStatus = ClassSessionRecord['status']

interface ClassSessionFormValues {
  grade: string
  class_name: string
  day: string
  period_number: string
  start_time: string
  end_time: string
  teacher_id: string
  subject_id: string
  status: SessionStatus
  notes: string
}

interface ClassSessionFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: ClassSessionFormValues) => void
  isSubmitting: boolean
  session?: ClassSessionRecord | null
  teacherOptions: TeacherRecord[]
  subjectOptions: SubjectRecord[]
  gradeOptions: string[]
  classOptionsByGrade: Record<string, string[]>
}

interface ConfirmDeleteDialogProps {
  session: ClassSessionRecord
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

function formatTimeLabel(value?: string | null) {
  if (!value) return '—'
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.split('.')[0] ?? ''
    return timePart.slice(0, 5)
  }
  return value.slice(0, 5)
}

function toTimeInputValue(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.split('.')[0] ?? ''
    return timePart.slice(0, 5)
  }
  return value.slice(0, 5)
}

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const tone = status === 'active'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-500 border border-slate-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status === 'active' ? 'نشطة' : 'متوقفة'}
    </span>
  )
}

interface DayDetailsDialogProps {
  day: string
  sessions: ClassSessionRecord[]
  filters: {
    grade: string
    class_name: string
    teacherId: string | number
    subjectId: string | number
    query: string
  }
  onFiltersChange: (filters: {
    grade: string
    class_name: string
    teacherId: string | number
    subjectId: string | number
    query: string
  }) => void
  onClose: () => void
  onEdit: (session: ClassSessionRecord) => void
  onDelete: (session: ClassSessionRecord) => void
  teacherOptions: TeacherRecord[]
  subjectOptions: SubjectRecord[]
  gradeOptions: string[]
  classOptionsByGrade: Record<string, string[]>
}

function DayDetailsDialog({
  day,
  sessions,
  filters,
  onFiltersChange,
  onClose,
  onEdit,
  onDelete,
  teacherOptions,
  subjectOptions,
  gradeOptions,
  classOptionsByGrade,
}: DayDetailsDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-500/10 p-3">
              <i className="bi bi-calendar-week text-2xl text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{day}</h2>
              <p className="text-sm text-slate-600">{sessions.length.toLocaleString('en-US')} حصة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-200/50"
          >
            <i className="bi bi-x-lg text-xl text-slate-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <i className="bi bi-search text-slate-400" />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                placeholder="بحث سريع..."
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>

            <select
              value={filters.grade}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  grade: e.target.value,
                  class_name: 'all',
                })
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="all">جميع الصفوف</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <select
              value={filters.class_name}
              onChange={(e) => onFiltersChange({ ...filters, class_name: e.target.value })}
              disabled={filters.grade === 'all'}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none disabled:opacity-60"
            >
              <option value="all">جميع الفصول</option>
              {(filters.grade === 'all' ? [] : classOptionsByGrade[filters.grade] ?? []).map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>

            <select
              value={filters.teacherId === 'all' ? 'all' : String(filters.teacherId)}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  teacherId: e.target.value === 'all' ? 'all' : Number(e.target.value),
                })
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="all">جميع المعلمين</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>

            <select
              value={filters.subjectId === 'all' ? 'all' : String(filters.subjectId)}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  subjectId: e.target.value === 'all' ? 'all' : Number(e.target.value),
                })
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="all">جميع المواد</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-slate-100 p-6 mb-4">
                <i className="bi bi-inbox text-4xl text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-600">لا توجد حصص تطابق الفلاتر المحددة</p>
              <p className="text-sm text-slate-500 mt-1">جرب تغيير الفلاتر أو البحث</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700">
                          <i className="bi bi-123" /> الحصة #{session.period_number}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          <i className="bi bi-clock" /> {formatTimeLabel(session.start_time)} - {formatTimeLabel(session.end_time)}
                        </span>
                        <SessionStatusBadge status={session.status} />
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {session.subject?.name ?? 'مادة غير محددة'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-2">
                          <i className="bi bi-person-fill text-teal-600" />
                          {session.teacher?.name ?? 'غير معروف'}
                        </span>
                        <span className="flex items-center gap-2">
                          <i className="bi bi-building text-amber-600" />
                          {session.grade} - {session.class_name}
                        </span>
                      </div>

                      {session.notes && (
                        <p className="mt-2 text-sm text-slate-500">
                          <i className="bi bi-chat-dots ml-1" />
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(session)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                      >
                        <i className="bi bi-pencil ml-1" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(session)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                      >
                        <i className="bi bi-trash ml-1" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClassSessionFormDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  session,
  teacherOptions,
  subjectOptions,
  gradeOptions,
  classOptionsByGrade,
}: ClassSessionFormDialogProps) {
  const defaultValues: ClassSessionFormValues = {
    grade: session?.grade ?? '',
    class_name: session?.class_name ?? '',
    day: session?.day ?? daysOfWeek[0],
    period_number: session ? String(session.period_number) : '',
    start_time: toTimeInputValue(session?.start_time),
    end_time: toTimeInputValue(session?.end_time),
    teacher_id: session ? String(session.teacher?.id ?? '') : '',
    subject_id: session ? String(session.subject?.id ?? '') : '',
    status: session?.status ?? 'active',
    notes: session?.notes ?? '',
  }

  const [values, setValues] = useState<ClassSessionFormValues>(defaultValues)
  const [errors, setErrors] = useState<Record<keyof ClassSessionFormValues, string | null>>({
    grade: null,
    class_name: null,
    day: null,
    period_number: null,
    start_time: null,
    end_time: null,
    teacher_id: null,
    subject_id: null,
    status: null,
    notes: null,
  })

  useEffect(() => {
    if (open) {
      setValues({
        grade: session?.grade ?? '',
        class_name: session?.class_name ?? '',
        day: session?.day ?? daysOfWeek[0],
        period_number: session ? String(session.period_number) : '',
        start_time: toTimeInputValue(session?.start_time),
        end_time: toTimeInputValue(session?.end_time),
        teacher_id: session ? String(session.teacher?.id ?? '') : '',
        subject_id: session ? String(session.subject?.id ?? '') : '',
        status: session?.status ?? 'active',
        notes: session?.notes ?? '',
      })
      setErrors({
        grade: null,
        class_name: null,
        day: null,
        period_number: null,
        start_time: null,
        end_time: null,
        teacher_id: null,
        subject_id: null,
        status: null,
        notes: null,
      })
    }
  }, [open, session])

  const availableClasses = useMemo(() => classOptionsByGrade[values.grade] ?? [], [classOptionsByGrade, values.grade])

  const validate = () => {
    const nextErrors: typeof errors = {
      grade: null,
      class_name: null,
      day: null,
      period_number: null,
      start_time: null,
      end_time: null,
      teacher_id: null,
      subject_id: null,
      status: null,
      notes: null,
    }

    if (!values.grade.trim()) {
      nextErrors.grade = 'الرجاء تحديد الصف'
    }
    if (!values.class_name.trim()) {
      nextErrors.class_name = 'الرجاء تحديد الفصل'
    }
    if (!values.teacher_id) {
      nextErrors.teacher_id = 'الرجاء اختيار المعلم'
    }
    if (!values.subject_id) {
      nextErrors.subject_id = 'الرجاء اختيار المادة'
    }
    if (!values.day) {
      nextErrors.day = 'الرجاء اختيار اليوم'
    }
    const period = Number(values.period_number)
    if (!values.period_number) {
      nextErrors.period_number = 'الرجاء إدخال رقم الحصة'
    } else if (!Number.isInteger(period) || period <= 0) {
      nextErrors.period_number = 'رقم الحصة يجب أن يكون رقمًا موجبًا'
    }
    if (!values.start_time) {
      nextErrors.start_time = 'حدد وقت البداية'
    }
    if (!values.end_time) {
      nextErrors.end_time = 'حدد وقت النهاية'
    }
    if (values.start_time && values.end_time && values.start_time >= values.end_time) {
      nextErrors.end_time = 'وقت النهاية يجب أن يكون بعد وقت البداية'
    }
    if (values.notes && values.notes.length > 255) {
      nextErrors.notes = 'الملاحظات يجب ألا تتجاوز 255 حرفًا'
    }

    setErrors(nextErrors)
    return Object.values(nextErrors).every((error) => !error)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
            {session ? 'تعديل حصة دراسية' : 'إضافة حصة دراسية'}
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            {session ? `تحديث ${session.subject?.name ?? 'الحصة'}` : 'إنشاء حصة جديدة'}
          </h2>
          <p className="text-sm text-muted">
            حدد تفاصيل الحصة بما في ذلك المعلم، المادة، الجدول الزمني، ورقم الحصة لترتيبها في الجدول الأسبوعي.
          </p>
        </header>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!validate()) return
            onSubmit(values)
          }}
          noValidate
        >
          <div className="grid gap-2 text-right">
            <label htmlFor="session-grade" className="text-sm font-medium text-slate-800">
              الصف الدراسي
            </label>
            <input
              id="session-grade"
              name="grade"
              type="text"
              list="session-grade-options"
              value={values.grade}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, grade: event.target.value, class_name: '' }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: الصف الأول"
            />
            <datalist id="session-grade-options">
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade} />
              ))}
            </datalist>
            {errors.grade ? <span className="text-xs font-medium text-rose-600">{errors.grade}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-class" className="text-sm font-medium text-slate-800">
              الفصل
            </label>
            <input
              id="session-class"
              name="class_name"
              type="text"
              list="session-class-options"
              value={values.class_name}
              onChange={(event) => setValues((prev) => ({ ...prev, class_name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: أ"
            />
            <datalist id="session-class-options">
              {availableClasses.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {errors.class_name ? <span className="text-xs font-medium text-rose-600">{errors.class_name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-teacher" className="text-sm font-medium text-slate-800">
              المعلم المسؤول
            </label>
            <select
              id="session-teacher"
              name="teacher_id"
              value={values.teacher_id}
              onChange={(event) => setValues((prev) => ({ ...prev, teacher_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting || teacherOptions.length === 0}
            >
              <option value="">اختر المعلم</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {errors.teacher_id ? <span className="text-xs font-medium text-rose-600">{errors.teacher_id}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-subject" className="text-sm font-medium text-slate-800">
              المادة الدراسية
            </label>
            <select
              id="session-subject"
              name="subject_id"
              value={values.subject_id}
              onChange={(event) => setValues((prev) => ({ ...prev, subject_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting || subjectOptions.length === 0}
            >
              <option value="">اختر المادة</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {errors.subject_id ? <span className="text-xs font-medium text-rose-600">{errors.subject_id}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-day" className="text-sm font-medium text-slate-800">
              اليوم
            </label>
            <select
              id="session-day"
              name="day"
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
            <label htmlFor="session-period" className="text-sm font-medium text-slate-800">
              رقم الحصة
            </label>
            <input
              id="session-period"
              name="period_number"
              type="number"
              min={1}
              max={12}
              value={values.period_number}
              onChange={(event) => setValues((prev) => ({ ...prev, period_number: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            />
            {errors.period_number ? (
              <span className="text-xs font-medium text-rose-600">{errors.period_number}</span>
            ) : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-start-time" className="text-sm font-medium text-slate-800">
              وقت البداية
            </label>
            <input
              id="session-start-time"
              name="start_time"
              type="time"
              value={values.start_time}
              onChange={(event) => setValues((prev) => ({ ...prev, start_time: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            />
            {errors.start_time ? <span className="text-xs font-medium text-rose-600">{errors.start_time}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-end-time" className="text-sm font-medium text-slate-800">
              وقت النهاية
            </label>
            <input
              id="session-end-time"
              name="end_time"
              type="time"
              value={values.end_time}
              onChange={(event) => setValues((prev) => ({ ...prev, end_time: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            />
            {errors.end_time ? <span className="text-xs font-medium text-rose-600">{errors.end_time}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="session-status" className="text-sm font-medium text-slate-800">
              حالة الحصة
            </label>
            <select
              id="session-status"
              name="status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as SessionStatus }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              <option value="active">نشطة</option>
              <option value="inactive">متوقفة</option>
            </select>
          </div>

          <div className="md:col-span-2 grid gap-2 text-right">
            <label htmlFor="session-notes" className="text-sm font-medium text-slate-800">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              id="session-notes"
              name="notes"
              value={values.notes}
              onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="أدخل أي تعليمات أو ملاحظات خاصة بهذه الحصة"
            />
            {errors.notes ? <span className="text-xs font-medium text-rose-600">{errors.notes}</span> : null}
          </div>

          <div className="md:col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : session ? 'حفظ التعديلات' : 'إضافة الحصة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ session, open, onCancel, onConfirm, isSubmitting }: ConfirmDeleteDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">حذف الحصة</h2>
          <p className="text-sm text-muted">
            سيتم حذف الحصة الخاصة بمادة <strong className="text-slate-800">{session.subject?.name}</strong> للصف{' '}
            <strong className="text-slate-800">{session.grade}</strong> فصل{' '}
            <strong className="text-slate-800">{session.class_name}</strong>. لا يمكن التراجع عن هذا الإجراء.
          </p>
        </header>
        <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="button-secondary sm:w-auto" disabled={isSubmitting}>
            إلغاء
          </button>
          <button type="button" onClick={onConfirm} className="button-primary sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-16 text-center">
      <p className="text-lg font-semibold text-slate-700">لا توجد حصص مسجلة حالياً</p>
      <p className="mt-2 text-sm text-muted">
        اضغط على زر "إضافة حصة" لإنشاء الجدول الأسبوعي للصفوف والمعلمين.
      </p>
      <button type="button" onClick={onAdd} className="button-primary mt-6">
        إضافة حصة جديدة
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="space-y-4 rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-10 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((__, innerIndex) => (
              <div key={innerIndex} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminClassSessionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSessionRecord | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<ClassSessionRecord | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayDialogFilters, setDayDialogFilters] = useState<{
    grade: string
    class_name: string
    teacherId: string | number
    subjectId: string | number
    query: string
  }>({
    grade: 'all',
    class_name: 'all',
    teacherId: 'all',
    subjectId: 'all',
    query: '',
  })

  const { data, isLoading, isError, isFetching, refetch } = useClassSessionsQuery()
  const { data: teachersData } = useTeachersQuery()
  const { data: subjectsData } = useSubjectsQuery()

  const sessions = useMemo(() => data ?? [], [data])
  const teacherOptions = useMemo(() => teachersData ?? [], [teachersData])
  const subjectOptions = useMemo(() => subjectsData ?? [], [subjectsData])

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    sessions.forEach((session) => {
      if (session.grade) set.add(session.grade)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [sessions])

  const classOptionsByGrade = useMemo(() => {
    const map = new Map<string, Set<string>>()
    sessions.forEach((session) => {
      if (!session.grade) return
      if (!map.has(session.grade)) map.set(session.grade, new Set<string>())
      if (session.class_name) map.get(session.grade)?.add(session.class_name)
    })
    const record: Record<string, string[]> = {}
    map.forEach((set, grade) => {
      record[grade] = Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
    })
    return record
  }, [sessions])

  const stats = useMemo(() => {
    const total = sessions.length
    const active = sessions.filter((session) => session.status === 'active').length
    const uniqueTeachers = new Set(sessions.map((session) => session.teacher?.id).filter(Boolean)).size
    return [
      { label: 'إجمالي الحصص', value: total },
      { label: 'حصص نشطة', value: active },
      { label: 'عدد المعلمين المشاركين', value: uniqueTeachers },
    ]
  }, [sessions])

  // إحصائيات الأيام
  const dayStats = useMemo(() => {
    const stats = new Map<string, { total: number; classes: Set<string>; teachers: Set<number> }>()
    
    sessions.forEach((session) => {
      if (!stats.has(session.day)) {
        stats.set(session.day, {
          total: 0,
          classes: new Set(),
          teachers: new Set(),
        })
      }
      const stat = stats.get(session.day)!
      stat.total++
      if (session.class_name) stat.classes.add(`${session.grade}-${session.class_name}`)
      if (session.teacher?.id) stat.teachers.add(session.teacher.id)
    })

    return stats
  }, [sessions])

  // حصص اليوم المحدد بعد الفلترة
  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return []
    
    const daySessions = sessions.filter(s => s.day === selectedDay)
    const query = dayDialogFilters.query.trim().toLowerCase()
    
    return daySessions.filter((session) => {
      const matchesGrade = dayDialogFilters.grade === 'all' ? true : session.grade === dayDialogFilters.grade
      const matchesClass = dayDialogFilters.class_name === 'all' ? true : session.class_name === dayDialogFilters.class_name
      const matchesTeacher = dayDialogFilters.teacherId === 'all' ? true : session.teacher?.id === dayDialogFilters.teacherId
      const matchesSubject = dayDialogFilters.subjectId === 'all' ? true : session.subject?.id === dayDialogFilters.subjectId
      const matchesQuery = !query
        ? true
        : [
            session.grade,
            session.class_name,
            session.teacher?.name ?? '',
            session.subject?.name ?? '',
          ]
            .map((value) => value?.toLowerCase?.() ?? '')
            .some((value) => value.includes(query))

      return matchesGrade && matchesClass && matchesTeacher && matchesSubject && matchesQuery
    }).sort((a, b) => {
      if (a.period_number !== b.period_number) return a.period_number - b.period_number
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    })
  }, [selectedDay, sessions, dayDialogFilters])

  const handleAdd = () => {
    setEditingSession(null)
    setIsFormOpen(true)
  }

  const handleEdit = (session: ClassSessionRecord) => {
    setEditingSession(session)
    setIsFormOpen(true)
  }

  const createSessionMutation = useCreateClassSessionMutation()
  const updateSessionMutation = useUpdateClassSessionMutation()
  const deleteSessionMutation = useDeleteClassSessionMutation()

  const handleFormSubmit = (values: ClassSessionFormValues) => {
    const payload = {
      grade: values.grade.trim(),
      class_name: values.class_name.trim(),
      day: values.day,
      period_number: Number(values.period_number),
      start_time: values.start_time,
      end_time: values.end_time,
      teacher_id: Number(values.teacher_id),
      subject_id: Number(values.subject_id),
      status: values.status,
      notes: values.notes.trim() ? values.notes.trim() : null,
    }

    if (editingSession) {
      updateSessionMutation.mutate(
        {
          id: editingSession.id,
          payload,
        },
        {
          onSuccess: () => {
            setIsFormOpen(false)
            setEditingSession(null)
          },
        },
      )
    } else {
      createSessionMutation.mutate(payload, {
        onSuccess: () => {
          setIsFormOpen(false)
        },
      })
    }
  }

  const handleDelete = () => {
    if (!sessionToDelete) return
    deleteSessionMutation.mutate(sessionToDelete.id, {
      onSuccess: () => {
        setSessionToDelete(null)
      },
    })
  }

  return (
    <section className="w-full space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إدارة الحصص</h1>
            <p className="text-sm text-muted">
              عرض وتنظيم جميع الحصص الأسبوعية، مع إمكانية تعديلها، نقلها، أو إيقافها.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
            >
              <i className={`bi bi-arrow-repeat ${isFetching ? 'animate-spin' : ''}`} /> تحديث القوائم
            </button>
            <button type="button" onClick={handleAdd} className="button-primary">
              <i className="bi bi-plus-lg" /> إضافة حصة
            </button>
          </div>
        </div>
        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            حدث خطأ أثناء تحميل الحصص. الرجاء المحاولة لاحقًا.
          </div>
        ) : null}
      </header>

      <div className="glass-card space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{item.value.toLocaleString('en-US')}</p>
            </article>
          ))}
        </section>

        {isLoading ? (
          <LoadingSkeleton />
        ) : sessions.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {daysOfWeek.map((day) => {
              const stat = dayStats.get(day)
              const total = stat?.total ?? 0
              const classesCount = stat?.classes.size ?? 0
              const teachersCount = stat?.teachers.size ?? 0

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day)
                    setDayDialogFilters({
                      grade: 'all',
                      class_name: 'all',
                      teacherId: 'all',
                      subjectId: 'all',
                      query: '',
                    })
                  }}
                  className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 text-right shadow-sm transition-all hover:scale-[1.03] hover:border-teal-400 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">{day}</h3>
                      <div className="rounded-full bg-teal-500/10 p-2">
                        <i className="bi bi-calendar-week text-lg text-teal-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">الحصص</span>
                        <span className="text-xl font-bold text-slate-900">{total.toLocaleString('en-US')}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">الفصول</span>
                        <span className="font-semibold text-teal-600">{classesCount.toLocaleString('en-US')}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">المعلمين</span>
                        <span className="font-semibold text-amber-600">{teachersCount.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-center gap-1 text-xs font-semibold text-teal-700 transition-colors group-hover:text-teal-800">
                        <span>عرض</span>
                        <i className="bi bi-arrow-left text-[10px]" />
                      </div>
                    </div>
                  </div>

                  {/* زينة خلفية */}
                  <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-teal-400/5 blur-xl transition-all group-hover:bg-teal-400/10" />
                  <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-400/5 blur-xl transition-all group-hover:bg-blue-400/10" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* نافذة منبثقة لتفاصيل اليوم */}
      {selectedDay && (
        <DayDetailsDialog
          day={selectedDay}
          sessions={selectedDaySessions}
          filters={dayDialogFilters}
          onFiltersChange={setDayDialogFilters}
          onClose={() => setSelectedDay(null)}
          onEdit={handleEdit}
          onDelete={setSessionToDelete}
          teacherOptions={teacherOptions}
          subjectOptions={subjectOptions}
          gradeOptions={gradeOptions}
          classOptionsByGrade={classOptionsByGrade}
        />
      )}

      <ClassSessionFormDialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSession(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createSessionMutation.isPending || updateSessionMutation.isPending}
        session={editingSession}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
        gradeOptions={gradeOptions}
        classOptionsByGrade={classOptionsByGrade}
      />

      <ConfirmDeleteDialog
        open={Boolean(sessionToDelete)}
        session={sessionToDelete as ClassSessionRecord}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={handleDelete}
        isSubmitting={deleteSessionMutation.isPending}
      />
    </section>
  )
}

