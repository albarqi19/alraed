import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import {
  useClassSessionsQuery,
  useCreateClassSessionMutation,
  useDeleteClassSessionMutation,
  useSubjectsQuery,
  useTeachersQuery,
  useUpdateClassSessionMutation,
} from '../hooks'
import type { ClassSessionRecord, SubjectRecord, TeacherRecord } from '../types'
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
  WsTable,
  WsTextarea,
  WsToolbar,
} from '@/shared/workspace'

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

const fieldError = (message: string | null) =>
  message ? <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ws-red)' }}>{message}</span> : null

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
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 640 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{session ? `تحديث ${session.subject?.name ?? 'الحصة'}` : 'إنشاء حصة جديدة'}</h3>
          <p className="ws-modal__sub">
            حدد تفاصيل الحصة: المعلم، المادة، الجدول الزمني، ورقمها في الجدول الأسبوعي.
          </p>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!validate()) return
            onSubmit(values)
          }}
          noValidate
        >
          <div className="ws-modal__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <WsField label="الصف الدراسي" htmlFor="session-grade">
                <WsInput
                  id="session-grade"
                  type="text"
                  list="session-grade-options"
                  value={values.grade}
                  onChange={(event) => setValues((prev) => ({ ...prev, grade: event.target.value, class_name: '' }))}
                  disabled={isSubmitting}
                  placeholder="مثال: الصف الأول"
                />
                <datalist id="session-grade-options">
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade} />
                  ))}
                </datalist>
                {fieldError(errors.grade)}
              </WsField>

              <WsField label="الفصل" htmlFor="session-class">
                <WsInput
                  id="session-class"
                  type="text"
                  list="session-class-options"
                  value={values.class_name}
                  onChange={(event) => setValues((prev) => ({ ...prev, class_name: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="مثال: أ"
                />
                <datalist id="session-class-options">
                  {availableClasses.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                {fieldError(errors.class_name)}
              </WsField>

              <WsField label="المعلم المسؤول" htmlFor="session-teacher">
                <WsSelect
                  id="session-teacher"
                  value={values.teacher_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, teacher_id: event.target.value }))}
                  disabled={isSubmitting || teacherOptions.length === 0}
                >
                  <option value="">اختر المعلم</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </WsSelect>
                {fieldError(errors.teacher_id)}
              </WsField>

              <WsField label="المادة الدراسية" htmlFor="session-subject">
                <WsSelect
                  id="session-subject"
                  value={values.subject_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, subject_id: event.target.value }))}
                  disabled={isSubmitting || subjectOptions.length === 0}
                >
                  <option value="">اختر المادة</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </WsSelect>
                {fieldError(errors.subject_id)}
              </WsField>

              <WsField label="اليوم" htmlFor="session-day">
                <WsSelect
                  id="session-day"
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

              <WsField label="رقم الحصة" htmlFor="session-period">
                <WsInput
                  id="session-period"
                  type="number"
                  min={1}
                  max={12}
                  value={values.period_number}
                  onChange={(event) => setValues((prev) => ({ ...prev, period_number: event.target.value }))}
                  disabled={isSubmitting}
                />
                {fieldError(errors.period_number)}
              </WsField>

              <WsField label="وقت البداية" htmlFor="session-start-time">
                <WsInput
                  id="session-start-time"
                  type="time"
                  value={values.start_time}
                  onChange={(event) => setValues((prev) => ({ ...prev, start_time: event.target.value }))}
                  disabled={isSubmitting}
                />
                {fieldError(errors.start_time)}
              </WsField>

              <WsField label="وقت النهاية" htmlFor="session-end-time">
                <WsInput
                  id="session-end-time"
                  type="time"
                  value={values.end_time}
                  onChange={(event) => setValues((prev) => ({ ...prev, end_time: event.target.value }))}
                  disabled={isSubmitting}
                />
                {fieldError(errors.end_time)}
              </WsField>

              <WsField label="حالة الحصة" htmlFor="session-status">
                <WsSelect
                  id="session-status"
                  value={values.status}
                  onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as SessionStatus }))}
                  disabled={isSubmitting}
                >
                  <option value="active">نشطة</option>
                  <option value="inactive">متوقفة</option>
                </WsSelect>
              </WsField>

              <WsField label="ملاحظات إضافية (اختياري)" htmlFor="session-notes" style={{ gridColumn: '1 / -1' }}>
                <WsTextarea
                  id="session-notes"
                  value={values.notes}
                  onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="أدخل أي تعليمات أو ملاحظات خاصة بهذه الحصة"
                  rows={3}
                />
                {fieldError(errors.notes)}
              </WsField>
            </div>
          </div>

          <footer className="ws-modal__foot">
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : session ? 'حفظ التعديلات' : 'إضافة الحصة'}
            </WsBtn>
          </footer>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ session, open, onCancel, onConfirm, isSubmitting }: ConfirmDeleteDialogProps) {
  if (!open) return null

  return (
    <div className="ws-modal" style={{ zIndex: 60 }} role="alertdialog" onClick={onCancel}>
      <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">حذف الحصة</h3>
        </header>
        <div className="ws-modal__body">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9 }}>
            سيتم حذف الحصة الخاصة بمادة <b>{session.subject?.name}</b> للصف <b>{session.grade}</b> فصل{' '}
            <b>{session.class_name}</b>. لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onCancel} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}

interface QuickEditDialogProps {
  session: ClassSessionRecord | null
  open: boolean
  onCancel: () => void
  onConfirm: (teacherId: number, subjectId: number) => void
  onDelete: () => void
  isSubmitting: boolean
  isDeleting: boolean
  teacherOptions: TeacherRecord[]
  subjectOptions: SubjectRecord[]
}

function QuickEditDialog({ session, open, onCancel, onConfirm, onDelete, isSubmitting, isDeleting, teacherOptions, subjectOptions }: QuickEditDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(0)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0)

  useEffect(() => {
    if (session) {
      setSelectedTeacherId(session.teacher?.id ?? 0)
      setSelectedSubjectId(session.subject?.id ?? 0)
    }
  }, [session])

  if (!open || !session) return null

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
            الحصة: {session.grade} - {session.class_name} | {session.day} | الحصة {session.period_number}
          </p>
        </header>

        <div className="ws-modal__body">
          <WsField label="المعلم" htmlFor="quick-edit-teacher">
            <WsSelect
              id="quick-edit-teacher"
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

          <WsField label="المادة" htmlFor="quick-edit-subject">
            <WsSelect
              id="quick-edit-subject"
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

export function AdminClassSessionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSessionRecord | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<ClassSessionRecord | null>(null)
  const [sessionToQuickEdit, setSessionToQuickEdit] = useState<ClassSessionRecord | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(daysOfWeek[0])
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
    return { total, active, uniqueTeachers }
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

  const handleQuickEdit = (teacherId: number, subjectId: number) => {
    if (!sessionToQuickEdit) return

    // نرسل جميع بيانات الحصة مع تغيير المعلم والمادة فقط
    const payload = {
      teacher_id: teacherId,
      subject_id: subjectId,
      grade: sessionToQuickEdit.grade,
      class_name: sessionToQuickEdit.class_name,
      day: sessionToQuickEdit.day,
      period_number: sessionToQuickEdit.period_number,
      start_time: toTimeInputValue(sessionToQuickEdit.start_time),
      end_time: toTimeInputValue(sessionToQuickEdit.end_time),
      status: sessionToQuickEdit.status,
      notes: sessionToQuickEdit.notes ?? null,
    }

    updateSessionMutation.mutate(
      {
        id: sessionToQuickEdit.id,
        payload: payload as unknown as Partial<ClassSessionRecord>,
      },
      {
        onSuccess: () => {
          setSessionToQuickEdit(null)
        },
      },
    )
  }

  const handleSelectDay = (day: string) => {
    setSelectedDay(day)
    setDayDialogFilters({
      grade: 'all',
      class_name: 'all',
      teacherId: 'all',
      subjectId: 'all',
      query: '',
    })
  }

  return (
    <WsPage>
      <WsHeader
        title="إدارة الحصص"
        badge="الجدول الأسبوعي"
        actions={
          <>
            <WsBtn icon={RefreshCcw} onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'جاري التحديث...' : 'تحديث'}
            </WsBtn>
            <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
              إضافة حصة
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardList} label="إجمالي الحصص:">
              {stats.total.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact label="نشطة:">{stats.active.toLocaleString('ar-SA-u-nu-latn')}</WsFact>
            <WsFact icon={Users} label="معلمون مشاركون:">
              {stats.uniqueTeachers.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          </>
        }
      />

      {isError && <WsAlert>حدث خطأ أثناء تحميل الحصص. الرجاء المحاولة لاحقًا.</WsAlert>}

      <WsToolbar>
        <WsField label="بحث في اليوم" htmlFor="sessions-search" grow>
          <WsInput
            id="sessions-search"
            type="search"
            value={dayDialogFilters.query}
            onChange={(event) => setDayDialogFilters((prev) => ({ ...prev, query: event.target.value }))}
            placeholder="صف، فصل، معلم أو مادة..."
          />
        </WsField>
        <WsField label="الصف" htmlFor="sessions-grade">
          <WsSelect
            id="sessions-grade"
            value={dayDialogFilters.grade}
            onChange={(event) =>
              setDayDialogFilters((prev) => ({ ...prev, grade: event.target.value, class_name: 'all' }))
            }
          >
            <option value="all">جميع الصفوف</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="الفصل" htmlFor="sessions-class">
          <WsSelect
            id="sessions-class"
            value={dayDialogFilters.class_name}
            onChange={(event) => setDayDialogFilters((prev) => ({ ...prev, class_name: event.target.value }))}
            disabled={dayDialogFilters.grade === 'all'}
          >
            <option value="all">جميع الفصول</option>
            {(dayDialogFilters.grade === 'all' ? [] : classOptionsByGrade[dayDialogFilters.grade] ?? []).map(
              (className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ),
            )}
          </WsSelect>
        </WsField>
        <WsField label="المعلم" htmlFor="sessions-teacher">
          <WsSelect
            id="sessions-teacher"
            value={dayDialogFilters.teacherId === 'all' ? 'all' : String(dayDialogFilters.teacherId)}
            onChange={(event) =>
              setDayDialogFilters((prev) => ({
                ...prev,
                teacherId: event.target.value === 'all' ? 'all' : Number(event.target.value),
              }))
            }
          >
            <option value="all">جميع المعلمين</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="المادة" htmlFor="sessions-subject">
          <WsSelect
            id="sessions-subject"
            value={dayDialogFilters.subjectId === 'all' ? 'all' : String(dayDialogFilters.subjectId)}
            onChange={(event) =>
              setDayDialogFilters((prev) => ({
                ...prev,
                subjectId: event.target.value === 'all' ? 'all' : Number(event.target.value),
              }))
            }
          >
            <option value="all">جميع المواد</option>
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </WsSelect>
        </WsField>
      </WsToolbar>

      <WsLayout>
        {/* العمود الأيمن: أيام الأسبوع */}
        <WsSideCol title="أيام الأسبوع" icon={CalendarDays} side="start" width={240} storageKey="ws:class-sessions:days">
          <WsBlock fill scroll>
            <div>
              {daysOfWeek.map((day) => {
                const stat = dayStats.get(day)
                const total = stat?.total ?? 0
                const classesCount = stat?.classes.size ?? 0
                const teachersCount = stat?.teachers.size ?? 0
                const isSelected = selectedDay === day

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'right',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--ws-hairline)',
                      background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 700, color: 'var(--ws-text)' }}>{day}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: isSelected ? 'var(--ws-accent-2)' : 'var(--ws-text-2)' }}>
                        {total.toLocaleString('ar-SA-u-nu-latn')}
                      </span>
                    </span>
                    <span style={{ display: 'inline-flex', gap: 4, marginTop: 5 }}>
                      <WsChip>{classesCount} فصل</WsChip>
                      <WsChip>{teachersCount} معلم</WsChip>
                    </span>
                  </button>
                )
              })}
            </div>
          </WsBlock>
        </WsSideCol>

        {/* الوسط: حصص اليوم المحدد */}
        <WsMain>
          <WsBlock
            title={selectedDay ? `حصص يوم ${selectedDay}` : 'حصص اليوم'}
            icon={Clock3}
            count={selectedDaySessions.length.toLocaleString('ar-SA-u-nu-latn')}
            tools={<span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>انقر أي حصة للتعديل السريع</span>}
            fill
          >
            {isLoading ? (
              <WsEmpty loading>جاري تحميل الحصص...</WsEmpty>
            ) : sessions.length === 0 ? (
              <WsEmpty icon={ClipboardList}>
                لا توجد حصص مسجلة حالياً — ابدأ بإنشاء الجدول الأسبوعي.
                <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
                  إضافة حصة جديدة
                </WsBtn>
              </WsEmpty>
            ) : selectedDaySessions.length === 0 ? (
              <WsEmpty icon={CalendarDays}>لا توجد حصص تطابق الفلاتر في هذا اليوم.</WsEmpty>
            ) : (
              <WsTable className="is-clickable">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>الحصة</th>
                    <th>الوقت</th>
                    <th>المادة</th>
                    <th>المعلم</th>
                    <th>الصف / الفصل</th>
                    <th>الحالة</th>
                    <th style={{ width: 90 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDaySessions.map((session) => (
                    <tr key={session.id} onClick={() => setSessionToQuickEdit(session)}>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--ws-accent-2)' }}>#{session.period_number}</span>
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                          {formatTimeLabel(session.start_time)} - {formatTimeLabel(session.end_time)}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                          <BookOpen style={{ width: 12, height: 12, color: 'var(--ws-text-2)' }} />
                          {session.subject?.name ?? 'مادة غير محددة'}
                        </span>
                        {session.notes ? <span className="ws-cell-sub" style={{ display: 'block' }}>{session.notes}</span> : null}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <UserRound style={{ width: 12, height: 12, color: 'var(--ws-text-2)' }} />
                          {session.teacher?.name ?? 'غير معروف'}
                        </span>
                      </td>
                      <td>
                        {session.grade} - {session.class_name}
                      </td>
                      <td>
                        <WsChip tone={session.status === 'active' ? 'green' : undefined}>
                          {session.status === 'active' ? 'نشطة' : 'متوقفة'}
                        </WsChip>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <WsBtn
                            size="sm"
                            icon={Pencil}
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingSession(session)
                              setIsFormOpen(true)
                            }}
                          >
                            تعديل
                          </WsBtn>
                          <WsBtn
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSessionToDelete(session)
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

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

      <QuickEditDialog
        open={Boolean(sessionToQuickEdit)}
        session={sessionToQuickEdit}
        onCancel={() => setSessionToQuickEdit(null)}
        onConfirm={handleQuickEdit}
        onDelete={() => {
          if (sessionToQuickEdit) {
            setSessionToDelete(sessionToQuickEdit)
            setSessionToQuickEdit(null)
          }
        }}
        isSubmitting={updateSessionMutation.isPending}
        isDeleting={false}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
      />
    </WsPage>
  )
}
