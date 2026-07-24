import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  GraduationCap,
  Layers,
  Plus,
  Printer,
  RefreshCcw,
  Trash2,
  Users,
} from 'lucide-react'
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
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
} from '@/shared/workspace'

const daysOfWeek: string[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const defaultPeriods = Array.from({ length: 8 }, (_, index) => index + 1)

/* لوحة ألوان المواد — نفس لوحة صفحة جداول المعلمين لتوحيد الهوية */
const SUBJECT_COLORS: Array<{ bg: string; bd: string; tx: string }> = [
  { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46' },
  { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E' },
  { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9' },
  { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A' },
  { bg: '#FBEAEA', bd: '#EFC5C5', tx: '#C43D3D' },
  { bg: '#E4F5F5', bd: '#BCE4E4', tx: '#1D7A7A' },
  { bg: '#FBEEE4', bd: '#F0D2B8', tx: '#B05E1D' },
  { bg: '#EAF0EE', bd: '#C8D8D2', tx: '#3F6F55' },
]

function subjectColor(name?: string | null) {
  if (!name) return SUBJECT_COLORS[7]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
}

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

const fieldError = (message: string | null) =>
  message ? <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ws-red)' }}>{message}</span> : null

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
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 560 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">جدولة حصة جديدة لفصل {classLabel}</h3>
          <p className="ws-modal__sub">
            اختر المعلم والمادة وحدد اليوم ورقم الحصة — تُضبط أوقات الدرس تلقائيًا عند اختيار توقيت.
          </p>
        </header>

        <form
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
          <div className="ws-modal__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <WsChip tone="sky">
                {grade} / {className}
              </WsChip>
              {defaultDay ? (
                <WsChip>
                  {defaultDay} - الحصة {defaultPeriod}
                </WsChip>
              ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <WsField label="اليوم الدراسي" htmlFor="quick-session-day">
                <WsSelect
                  id="quick-session-day"
                  value={values.day}
                  onChange={(event) => setValues((prev) => ({ ...prev, day: event.target.value }))}
                  disabled={isSubmitting}
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </WsSelect>
                {fieldError(errors.day)}
              </WsField>

              <WsField label="رقم الحصة" htmlFor="quick-session-period">
                <WsInput
                  id="quick-session-period"
                  type="number"
                  min={1}
                  max={12}
                  value={values.period_number}
                  onChange={(event) => setValues((prev) => ({ ...prev, period_number: event.target.value }))}
                  placeholder="مثال: 3"
                  disabled={isSubmitting}
                />
                {fieldError(errors.period_number)}
              </WsField>

              <WsField label="المعلم المسؤول" htmlFor="quick-session-teacher">
                <WsSelect
                  id="quick-session-teacher"
                  value={values.teacher_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, teacher_id: event.target.value }))}
                  disabled={isSubmitting || isSessionDataLoading || teacherOptions.length === 0}
                >
                  <option value="">اختر المعلم</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                      {teacher.national_id ? ` • ${teacher.national_id}` : ''}
                    </option>
                  ))}
                </WsSelect>
                {isSessionDataLoading ? (
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>جارٍ تحميل قائمة المعلمين...</span>
                ) : null}
                {teacherOptions.length === 0 && !isSessionDataLoading ? (
                  <span style={{ fontSize: 10.5, color: 'var(--ws-amber)' }}>لا يوجد معلمون نشطون حالياً.</span>
                ) : null}
                {fieldError(errors.teacher_id)}
              </WsField>

              <WsField label="المادة الدراسية" htmlFor="quick-session-subject">
                <WsSelect
                  id="quick-session-subject"
                  value={values.subject_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, subject_id: event.target.value }))}
                  disabled={isSubmitting || isSessionDataLoading || subjectOptions.length === 0}
                >
                  <option value="">اختر المادة</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </WsSelect>
                {isSessionDataLoading ? (
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>جارٍ تحميل قائمة المواد...</span>
                ) : null}
                {subjectOptions.length === 0 && !isSessionDataLoading ? (
                  <span style={{ fontSize: 10.5, color: 'var(--ws-amber)' }}>لا توجد مواد نشطة متاحة.</span>
                ) : null}
                {fieldError(errors.subject_id)}
              </WsField>

              <WsField label="توقيت الحصة (اختياري)" htmlFor="quick-session-schedule" style={{ gridColumn: '1 / -1' }}>
                <WsSelect
                  id="quick-session-schedule"
                  value={values.schedule_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, schedule_id: event.target.value }))}
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
                </WsSelect>
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  {scheduleOptions.length === 0 && !isSessionDataLoading
                    ? 'لم يتم إنشاء أي توقيتات بعد — ستستخدم الحصة التوقيت الافتراضي 08:00 - 08:45.'
                    : 'استخدام توقيت محدد يضبط أوقات البداية والنهاية تلقائياً حسب إعدادات الجدول.'}
                </span>
              </WsField>
            </div>
          </div>

          <footer className="ws-modal__foot">
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة الحصة'}
            </WsBtn>
          </footer>
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
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">اختيار توقيت لفصل {classLabel}</h3>
          <p className="ws-modal__sub">
            سيتم تحديث أوقات جميع الحصص الحالية لتتوافق مع التوقيت المحدد، مع الحفاظ على المعلمين والمواد.
          </p>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!selectedScheduleId) {
              setError('الرجاء اختيار توقيت لتطبيقه على الفصل')
              return
            }
            onSubmit(Number(selectedScheduleId))
          }}
        >
          <div className="ws-modal__body">
            <WsField label="اختر التوقيت المناسب" htmlFor="apply-schedule-select">
              <WsSelect
                id="apply-schedule-select"
                value={selectedScheduleId}
                onChange={(event) => {
                  setError(null)
                  setSelectedScheduleId(event.target.value)
                }}
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
              </WsSelect>
              {fieldError(error)}
              {!hasSchedules ? (
                <span style={{ fontSize: 10.5, color: 'var(--ws-amber)' }}>
                  لا توجد توقيتات متاحة حالياً — أنشئ توقيتاً من صفحة التوقيتات أولاً.
                </span>
              ) : null}
            </WsField>

            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
              التوقيت المطبق يحدد أوقات البداية والنهاية لكل حصة حسب رقمها، ويمكن تغييره لاحقاً دون فقد بيانات الحصص.
            </p>
          </div>

          <footer className="ws-modal__foot">
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting || !hasSchedules}>
              {isSubmitting ? 'جارٍ التطبيق...' : 'تطبيق التوقيت'}
            </WsBtn>
          </footer>
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
    <div className="ws-modal" style={{ zIndex: 60 }} role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">هل تريد حذف هذه الحصة؟</h3>
        </header>
        <div className="ws-modal__body">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9 }}>
            سيتم إزالة الحصة {subjectSummary}
            {teacherSummary} من جدول {scheduleSummary}. سيتم الاحتفاظ بسجلات الحضور المرتبطة بالحصة.
          </p>
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose} disabled={isSubmitting}>
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
    <div className="ws-modal" role="dialog" onClick={onCancel}>
      <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">تعديل سريع — المعلم والمادة</h3>
          <p className="ws-modal__sub">
            {day} | الحصة {slot.period_number} | {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
          </p>
        </header>

        <div className="ws-modal__body">
          <WsField label="المعلم" htmlFor="quick-edit-schedule-teacher">
            <WsSelect
              id="quick-edit-schedule-teacher"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              disabled={isSubmitting}
            >
              <option value="0">اختر المعلم...</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </WsSelect>
          </WsField>

          <WsField label="المادة" htmlFor="quick-edit-schedule-subject">
            <WsSelect
              id="quick-edit-schedule-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              disabled={isSubmitting}
            >
              <option value="0">اختر المادة...</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </WsSelect>
          </WsField>

          <WsAlert tone="warn" boxed>
            السجلات التاريخية للحضور ستبقى محفوظة بأسماء المعلم والمادة السابقة — التغيير يؤثر على الحصص الجديدة فقط.
          </WsAlert>
        </div>

        <footer className="ws-modal__foot" style={{ justifyContent: 'space-between' }}>
          <WsBtn variant="danger" icon={Trash2} onClick={onDelete} disabled={isSubmitting || isDeleting}>
            {isDeleting ? 'جاري الحذف...' : 'حذف الحصة'}
          </WsBtn>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <WsBtn onClick={onCancel} disabled={isSubmitting || isDeleting}>
              إلغاء
            </WsBtn>
            <WsBtn
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || isDeleting || !selectedTeacherId || !selectedSubjectId}
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </WsBtn>
          </span>
        </footer>
      </div>
    </div>
  )
}

/* معالج حذف متعدد الخطوات (لفصل واحد أو للجميع) */
interface DeletionWizardProps {
  open: boolean
  title: string
  step: 1 | 2 | 3
  password: string
  confirmText: string
  error: string | null
  confirmPhrase: string
  introText: React.ReactNode
  warningTone: 'warn' | 'error'
  warningItems: React.ReactNode[]
  isSubmitting: boolean
  submitLabel: string
  onClose: () => void
  onStepChange: (step: 1 | 2 | 3) => void
  onPasswordChange: (value: string) => void
  onConfirmTextChange: (value: string) => void
  onSubmit: () => void
}

function DeletionWizard({
  open,
  title,
  step,
  password,
  confirmText,
  error,
  confirmPhrase,
  introText,
  warningTone,
  warningItems,
  isSubmitting,
  submitLabel,
  onClose,
  onStepChange,
  onPasswordChange,
  onConfirmTextChange,
  onSubmit,
}: DeletionWizardProps) {
  if (!open) return null

  return (
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-red)' }}>{title}</span>
          <h3 className="ws-modal__title">
            {step === 1 && 'التحقق من الهوية'}
            {step === 2 && 'تنبيه مهم'}
            {step === 3 && 'التأكيد النهائي'}
          </h3>
        </header>

        <div className="ws-modal__body">
          {step === 1 && (
            <>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9 }}>{introText}</p>
              <WsField label="الرقم السري" htmlFor={`${title}-password`}>
                <WsInput
                  id={`${title}-password`}
                  type="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="أدخل الرقم السري"
                  autoFocus
                />
                {fieldError(error)}
              </WsField>
            </>
          )}

          {step === 2 && (
            <WsAlert tone={warningTone} boxed>
              <div>
                <b>{warningTone === 'error' ? 'تحذير: هذا الإجراء خطير!' : 'هذا الإجراء يؤثر على سير الحصص!'}</b>
                <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, display: 'grid', gap: 3, fontSize: 11.5 }}>
                  {warningItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </WsAlert>
          )}

          {step === 3 && (
            <>
              <p style={{ margin: 0, fontSize: 12.5 }}>للتأكيد النهائي، اكتب النص التالي بالضبط:</p>
              <div
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--ws-hairline)',
                  background: 'var(--ws-surface-2)',
                  padding: '8px 12px',
                  textAlign: 'center',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--ws-red)',
                }}
              >
                {confirmPhrase}
              </div>
              <WsInput
                type="text"
                value={confirmText}
                onChange={(e) => onConfirmTextChange(e.target.value)}
                placeholder="اكتب النص هنا"
                autoFocus
                dir="rtl"
                style={{ textAlign: 'center' }}
              />
              {fieldError(error)}
            </>
          )}
        </div>

        <footer className="ws-modal__foot">
          {step === 1 && (
            <>
              <WsBtn onClick={onClose}>إلغاء</WsBtn>
              <WsBtn variant="danger" onClick={onSubmit}>
                التالي
              </WsBtn>
            </>
          )}
          {step === 2 && (
            <>
              <WsBtn onClick={() => onStepChange(1)}>رجوع</WsBtn>
              <WsBtn variant="danger" onClick={() => onStepChange(3)}>
                فهمت، المتابعة
              </WsBtn>
            </>
          )}
          {step === 3 && (
            <>
              <WsBtn onClick={() => onStepChange(2)} disabled={isSubmitting}>
                رجوع
              </WsBtn>
              <WsBtn variant="danger" onClick={onSubmit} disabled={isSubmitting || confirmText !== confirmPhrase}>
                {isSubmitting ? 'جارٍ الحذف...' : submitLabel}
              </WsBtn>
            </>
          )}
        </footer>
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

  const handlePrintAll = async () => {
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
  }

  const handlePrintClass = () => {
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
  }

  const summariesErrorMessage =
    classSummariesQuery.error instanceof Error ? classSummariesQuery.error.message : 'تعذر تحميل قائمة الفصول'
  const scheduleErrorMessage =
    scheduleQuery.error instanceof Error ? scheduleQuery.error.message : 'تعذر تحميل جدول الفصل'

  // حساب إجمالي الحصص في جميع الفصول
  const totalSessionsAllClasses = useMemo(() => {
    return classSummariesQuery.data?.reduce((total, cls) => total + (cls.sessions_count ?? 0), 0) ?? 0
  }, [classSummariesQuery.data])

  const handleDeleteScheduleSubmit = () => {
    if (!selectedClass) return
    if (deleteScheduleStep === 1) {
      if (!deletePassword.trim()) {
        setDeleteError('الرقم السري مطلوب')
        return
      }
      setDeleteError(null)
      setDeleteScheduleStep(2)
      return
    }
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
      },
    )
  }

  const handleDeleteAllSubmit = () => {
    if (deleteAllStep === 1) {
      if (!deleteAllPassword.trim()) {
        setDeleteAllError('الرقم السري مطلوب')
        return
      }
      setDeleteAllError(null)
      setDeleteAllStep(2)
      return
    }
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
  }

  return (
    <WsPage>
      <WsHeader
        title="جداول الفصول"
        badge="الشبكة الأسبوعية"
        actions={
          totalSessionsAllClasses > 0 ? (
            <>
              <WsBtn icon={Printer} onClick={handlePrintAll} disabled={isPrintingAll}>
                {isPrintingAll ? 'جارٍ التحميل...' : 'طباعة الكل'}
              </WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  setIsDeleteAllSchedulesOpen(true)
                  setDeleteAllStep(1)
                  setDeleteAllPassword('')
                  setDeleteAllConfirmText('')
                  setDeleteAllError(null)
                }}
                disabled={deleteAllSchedulesMutation.isPending}
              >
                حذف الكل
              </WsBtn>
            </>
          ) : undefined
        }
        facts={
          <>
            <WsFact icon={Layers} label="الفصول:">
              {(classSummariesQuery.data?.length ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={Clock3} label="إجمالي الحصص:">
              {totalSessionsAllClasses.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            {selectedClass && (
              <>
                <WsFact icon={GraduationCap} label="المحدد:">
                  {selectedClass.grade} / {selectedClass.class_name}
                </WsFact>
                <WsFact icon={Users} label="طلابه:">
                  {selectedClass.students_count}
                </WsFact>
                <WsFact label="حصصه:">{totalSessions}</WsFact>
              </>
            )}
          </>
        }
      >
        {scheduleQuery.isFetching && <WsChip tone="sky">جارٍ التحديث...</WsChip>}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: قائمة الفصول */}
        <WsSideCol title="الفصول" icon={Layers} side="start" width={270} storageKey="ws:class-schedules:list">
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
            <WsSelect value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              <option value="all">جميع الصفوف</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </WsSelect>
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالصف أو الشعبة أو الاسم"
            />
          </div>

          <WsBlock
            title="القائمة"
            count={
              classSummariesQuery.isLoading
                ? '…'
                : `${filteredClasses.length}${isFiltered ? ` / ${classSummariesQuery.data?.length ?? 0}` : ''}`
            }
            fill
            scroll
          >
            {classSummariesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الفصول...</WsEmpty>
            ) : classSummariesQuery.isError ? (
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل الفصول: {summariesErrorMessage}
                <WsBtn
                  size="sm"
                  icon={RefreshCcw}
                  onClick={() => classSummariesQuery.refetch()}
                  disabled={classSummariesQuery.isFetching}
                >
                  {classSummariesQuery.isFetching ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
                </WsBtn>
              </WsEmpty>
            ) : filteredClasses.length === 0 ? (
              <WsEmpty icon={Layers}>لا توجد فصول مطابقة لبحثك حالياً.</WsEmpty>
            ) : (
              <div>
                {filteredClasses.map((item) => {
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
                      aria-pressed={isSelected}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)' }}>
                          {item.grade} / {item.class_name}
                        </span>
                        <WsChip tone={isSelected ? 'sky' : undefined}>{item.students_count} طالب</WsChip>
                      </span>
                      {item.name && item.name !== `${item.grade} / ${item.class_name}` ? (
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                          {item.name}
                        </span>
                      ) : null}
                      <span style={{ display: 'inline-flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {typeof item.sessions_count === 'number' ? <WsChip tone="amber">{item.sessions_count} حصص</WsChip> : null}
                        {item.active_schedule ? <WsChip>{item.active_schedule}</WsChip> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: جدول الفصل الأسبوعي */}
        <WsMain>
          <WsBlock
            title={selectedClass ? `جدول ${selectedClass.name}` : 'جدول الفصل'}
            icon={CalendarDays}
            count={selectedClass ? `${totalSessions} حصة` : undefined}
            tools={
              selectedClass ? (
                <>
                  {totalSessions > 0 && (
                    <WsBtn size="sm" icon={Printer} onClick={handlePrintClass}>
                      طباعة
                    </WsBtn>
                  )}
                  <WsBtn size="sm" icon={RefreshCcw} onClick={() => scheduleQuery.refetch()} disabled={scheduleQuery.isFetching}>
                    تحديث
                  </WsBtn>
                  <WsBtn
                    size="sm"
                    icon={Clock3}
                    onClick={() => setIsApplyScheduleOpen(true)}
                    disabled={applyScheduleMutation.isPending}
                  >
                    توقيت
                  </WsBtn>
                  <WsBtn
                    size="sm"
                    variant="primary"
                    icon={Plus}
                    onClick={() => handleOpenQuickSession()}
                    disabled={addQuickSessionMutation.isPending}
                  >
                    إضافة حصة
                  </WsBtn>
                  {totalSessions > 0 && (
                    <WsBtn
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => {
                        setIsDeleteScheduleOpen(true)
                        setDeleteScheduleStep(1)
                        setDeletePassword('')
                        setDeleteConfirmText('')
                        setDeleteError(null)
                      }}
                      disabled={deleteScheduleMutation.isPending}
                    />
                  )}
                </>
              ) : undefined
            }
            fill
          >
            {!selectedClass ? (
              <WsEmpty icon={Layers}>اختر فصلًا من القائمة اليمنى لعرض جدول حصصه الأسبوعي.</WsEmpty>
            ) : scheduleQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل جدول الفصل...</WsEmpty>
            ) : scheduleQuery.isError ? (
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل جدول الفصل: {scheduleErrorMessage}
                <WsBtn size="sm" icon={RefreshCcw} onClick={() => scheduleQuery.refetch()}>
                  إعادة المحاولة
                </WsBtn>
              </WsEmpty>
            ) : (
              <>
                {scheduleQuery.data?.applied_schedule && (
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderBottom: '1px solid var(--ws-hairline)',
                      fontSize: 11,
                      color: 'var(--ws-text-2)',
                    }}
                    className="hidden md:flex"
                  >
                    <Clock3 style={{ width: 12, height: 12, color: 'var(--ws-accent-2)' }} />
                    التوقيت المطبق: <b style={{ color: 'var(--ws-text)' }}>{scheduleQuery.data.applied_schedule.name}</b>
                  </div>
                )}

                {/* الشبكة للشاشات الكبيرة */}
                <div className="ws-tablewrap hidden md:block">
                  <table className="ws-matrix">
                    <thead>
                      <tr>
                        <th className="ws-matrix__stick" style={{ minWidth: 88 }}>
                          اليوم / الحصة
                        </th>
                        {periods.map((period) => {
                          const timeLabel = getPeriodTimeLabel(scheduleQuery.data?.schedule, period)
                          return (
                            <th key={period} style={{ minWidth: 112 }}>
                              <span style={{ display: 'block', fontWeight: 700 }}>الحصة {period}</span>
                              {timeLabel ? (
                                <span style={{ display: 'block', fontSize: 9.5, fontWeight: 400, direction: 'ltr' }}>
                                  {timeLabel}
                                </span>
                              ) : null}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map((day) => {
                        const daySessions = scheduleQuery.data?.schedule?.[day] ?? {}
                        return (
                          <tr key={day}>
                            <td className="ws-matrix__stick" style={{ fontWeight: 700, fontSize: 12 }}>
                              {day}
                            </td>
                            {periods.map((period) => {
                              const slot = daySessions?.[period] ?? null
                              const tone = slot ? subjectColor(slot.subject_name) : null

                              return (
                                <td key={period} style={{ padding: 3, verticalAlign: 'stretch' }}>
                                  {slot && tone ? (
                                    <button
                                      type="button"
                                      onClick={() => setSlotToQuickEdit({ slot, day })}
                                      disabled={deleteSessionMutation.isPending || updateSessionMutation.isPending}
                                      title="اضغط لتعديل المعلم والمادة أو الحذف"
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: 2,
                                        width: '100%',
                                        minHeight: 58,
                                        padding: '6px 9px',
                                        borderRadius: 8,
                                        border: `1px solid ${tone.bd}`,
                                        background: tone.bg,
                                        cursor: 'pointer',
                                        textAlign: 'right',
                                        fontFamily: 'inherit',
                                      }}
                                    >
                                      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: tone.tx }}>
                                        {slot.subject_name}
                                      </span>
                                      {slot.teacher_name ? (
                                        <span style={{ fontSize: 10.5, color: 'var(--ws-text)' }} title={slot.teacher_name}>
                                          {shortenTeacherName(slot.teacher_name)}
                                        </span>
                                      ) : null}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickSession(day, period)}
                                      disabled={addQuickSessionMutation.isPending}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        minHeight: 58,
                                        borderRadius: 8,
                                        border: '1px dashed var(--ws-border)',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        color: 'var(--ws-text-2)',
                                      }}
                                    >
                                      + إضافة
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

                <div
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderTop: '1px solid var(--ws-hairline)',
                    fontSize: 10.5,
                    color: 'var(--ws-text-2)',
                  }}
                  className="hidden md:block"
                >
                  اضغط على الحصة لتعديل المعلم والمادة أو حذفها، واستخدم الخلايا الفارغة لإضافة حصص جديدة — سجلات الحضور
                  التاريخية محفوظة دائماً.
                </div>

                {/* عرض الجوال: زر فتح الأيام */}
                <div className="md:hidden" style={{ padding: 14 }}>
                  <WsBtn variant="primary" icon={CalendarDays} onClick={() => setShowDaysPanel(true)} style={{ width: '100%' }}>
                    عرض أيام الأسبوع
                  </WsBtn>
                </div>
              </>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

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
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowDaysPanel(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl"
            style={{ background: 'var(--ws-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 flex justify-center pt-3 pb-2"
              style={{ background: 'var(--ws-surface)', borderBottom: '1px solid var(--ws-hairline)' }}
            >
              <div className="h-1.5 w-12 rounded-full" style={{ background: 'var(--ws-border)' }} />
            </div>

            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>أيام الأسبوع</h2>
                  <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>اختر يوماً لعرض حصصه</p>
                </div>
                <WsBtn size="sm" onClick={() => setShowDaysPanel(false)}>
                  إغلاق
                </WsBtn>
              </header>

              <div className="space-y-2">
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
                      className="ws-pick"
                      style={{ width: '100%' }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span className="ws-pick__name">{day}</span>
                        <span className="ws-pick__sub">{sessionsCount} حصة</span>
                      </span>
                      <CalendarDays style={{ width: 14, height: 14, color: 'var(--ws-accent-2)', flexShrink: 0 }} />
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
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSelectedDay(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl"
            style={{ background: 'var(--ws-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 flex justify-center pt-3 pb-2"
              style={{ background: 'var(--ws-surface)', borderBottom: '1px solid var(--ws-hairline)' }}
            >
              <div className="h-1.5 w-12 rounded-full" style={{ background: 'var(--ws-border)' }} />
            </div>

            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedDay.day}</h2>
                  <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>
                    {Object.values(selectedDay.sessions).filter(slot => slot !== null).length} حصة
                  </p>
                </div>
                <WsBtn size="sm" onClick={() => setSelectedDay(null)}>
                  إغلاق
                </WsBtn>
              </header>

              <div className="space-y-2">
                {Object.values(selectedDay.sessions).filter(slot => slot !== null).map((slot) => {
                  const tone = subjectColor(slot.subject_name)
                  return (
                    <div
                      key={slot.id}
                      style={{
                        borderRadius: 9,
                        border: `1px solid ${tone.bd}`,
                        background: tone.bg,
                        padding: '9px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: tone.tx }}>الحصة {slot.period_number}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', direction: 'ltr' }}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{slot.subject_name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)', marginTop: 2 }}>
                        {slot.teacher_name}
                      </span>
                    </div>
                  )
                })}
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

      {/* معالج حذف جدول الفصل - متعدد الخطوات */}
      {selectedClass && (
        <DeletionWizard
          open={isDeleteScheduleOpen}
          title="حذف جدول الفصل"
          step={deleteScheduleStep}
          password={deletePassword}
          confirmText={deleteConfirmText}
          error={deleteError}
          confirmPhrase="حذف جميع الحصص"
          introText={
            <>
              أنت على وشك حذف جدول الفصل <b>{selectedClass.name}</b> الذي يحتوي على <b>{totalSessions} حصة</b>. للمتابعة،
              أدخل الرقم السري الخاص بك.
            </>
          }
          warningTone="warn"
          warningItems={[
            <>سيتم حذف جميع الحصص المسجلة للفصل ({totalSessions} حصة)</>,
            <>سجلات الحضور المرتبطة بالحصص ستبقى محفوظة</>,
            <>لا يمكن التراجع عن هذا الإجراء</>,
          ]}
          isSubmitting={deleteScheduleMutation.isPending}
          submitLabel="تأكيد الحذف"
          onClose={() => setIsDeleteScheduleOpen(false)}
          onStepChange={setDeleteScheduleStep}
          onPasswordChange={(value) => {
            setDeletePassword(value)
            setDeleteError(null)
          }}
          onConfirmTextChange={(value) => {
            setDeleteConfirmText(value)
            setDeleteError(null)
          }}
          onSubmit={handleDeleteScheduleSubmit}
        />
      )}

      {/* معالج حذف جداول جميع الفصول - متعدد الخطوات */}
      <DeletionWizard
        open={isDeleteAllSchedulesOpen}
        title="حذف جداول جميع الفصول"
        step={deleteAllStep}
        password={deleteAllPassword}
        confirmText={deleteAllConfirmText}
        error={deleteAllError}
        confirmPhrase="حذف جميع الجداول"
        introText={
          <>
            أنت على وشك حذف جداول <b>جميع الفصول</b> في المدرسة ({totalSessionsAllClasses} حصة في{' '}
            {classSummariesQuery.data?.length ?? 0} فصل). للمتابعة، أدخل الرقم السري الخاص بك.
          </>
        }
        warningTone="error"
        warningItems={[
          <>
            سيتم حذف جميع الحصص من <b>جميع الفصول</b> ({totalSessionsAllClasses} حصة)
          </>,
          <>
            سيتم حذف جداول <b>{classSummariesQuery.data?.length ?? 0} فصل</b>
          </>,
          <>سجلات الحضور المرتبطة بالحصص ستبقى محفوظة</>,
          <b>لا يمكن التراجع عن هذا الإجراء</b>,
        ]}
        isSubmitting={deleteAllSchedulesMutation.isPending}
        submitLabel="تأكيد حذف الكل"
        onClose={() => setIsDeleteAllSchedulesOpen(false)}
        onStepChange={setDeleteAllStep}
        onPasswordChange={(value) => {
          setDeleteAllPassword(value)
          setDeleteAllError(null)
        }}
        onConfirmTextChange={(value) => {
          setDeleteAllConfirmText(value)
          setDeleteAllError(null)
        }}
        onSubmit={handleDeleteAllSubmit}
      />
    </WsPage>
  )
}
