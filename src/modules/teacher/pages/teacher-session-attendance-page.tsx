import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'classnames'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'
import {
  useSubmitAttendanceMutation,
  useTeacherSessionStudentsQuery,
  useSubmittedAttendanceQuery,
} from '../hooks'
import { useSessionEvaluationsSummary } from '../evaluation/hooks'
import {
  StudentEvaluationSheet,
  EvaluationBadges,
} from '../evaluation/components/student-evaluation-sheet'
import { EvaluationOnboardingSheet } from '../evaluation/components/evaluation-onboarding-sheet'
import type { AttendanceFormState, AttendanceStatus, TeacherSession, TeacherSessionStudent } from '../types'

function buildDefaultAttendance(students: Array<{ id: number }>): AttendanceFormState {
  return students.reduce<AttendanceFormState>((accumulator, student) => {
    accumulator[student.id] = 'present'
    return accumulator
  }, {})
}

function extractSessionTime(session: TeacherSession) {
  const start = session.formatted_start_time ?? session.start_time
  const end = session.formatted_end_time ?? session.end_time
  return start && end ? `${start} – ${end}` : 'غير محدد'
}

function getSubjectName(session: TeacherSession): string {
  if (session.subject && typeof session.subject === 'object' && 'name' in session.subject) {
    return session.subject.name || 'مادة غير محددة'
  }
  return 'مادة غير محددة'
}

function getSubjectId(session: TeacherSession): number | undefined {
  if (session.subject && typeof session.subject === 'object' && 'id' in session.subject) {
    return (session.subject as { id: number }).id
  }
  return undefined
}

/* ─────── Long Press Hook ─────── */
function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => callbackRef.current(), ms)
  }, [ms])

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
  }
}

export function TeacherSessionAttendancePage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const numericSessionId = sessionId ? Number.parseInt(sessionId, 10) : NaN
  const isValidSessionId = Number.isInteger(numericSessionId) && numericSessionId > 0

  const studentsQuery = useTeacherSessionStudentsQuery(isValidSessionId ? numericSessionId : undefined)
  const submittedAttendanceQuery = useSubmittedAttendanceQuery(isValidSessionId ? numericSessionId : undefined)
  const submitMutation = useSubmitAttendanceMutation(isValidSessionId ? numericSessionId : 0)
  const evaluationsSummary = useSessionEvaluationsSummary(
    isValidSessionId && !studentsQuery.data?.session?.is_standby ? numericSessionId : undefined,
  )

  const [attendance, setAttendance] = useState<AttendanceFormState>({})

  // ═══ حالة Bottom Sheet ═══
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetStudents, setSheetStudents] = useState<TeacherSessionStudent[]>([])

  // ═══ حالة الرصد الجماعي ═══
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (studentsQuery.data?.students && Object.keys(attendance).length === 0) {
      setAttendance(buildDefaultAttendance(studentsQuery.data.students))
    }
  }, [studentsQuery.data?.students, attendance])

  useEffect(() => {
    const payload = submittedAttendanceQuery.data
    if (payload && payload.submitted && 'attendance' in payload) {
      const hydrated: AttendanceFormState = {}
      Object.entries(payload.attendance).forEach(([studentId, record]) => {
        const numericId = Number.parseInt(studentId, 10)
        if (Number.isInteger(numericId)) {
          const validStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']
          hydrated[numericId] = validStatuses.includes(record.status as AttendanceStatus)
            ? (record.status as AttendanceStatus)
            : 'present'
        }
      })
      if (Object.keys(hydrated).length > 0) {
        setAttendance(hydrated)
      }
    }
  }, [submittedAttendanceQuery.data])

  const summary = useMemo(() => {
    const counters: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }
    Object.values(attendance).forEach((status) => {
      if (status in counters) {
        counters[status as AttendanceStatus] = (counters[status as AttendanceStatus] ?? 0) + 1
      }
    })
    return counters
  }, [attendance])

  const session = studentsQuery.data?.session
  const students = studentsQuery.data?.students ?? []
  const isLoading = studentsQuery.isLoading || submittedAttendanceQuery.isLoading
  const isError = studentsQuery.isError
  const hasSubmitted = submittedAttendanceQuery.data?.submitted === true
  const isStandby = session?.is_standby === true

  const toggleStudentStatus = (studentId: number) => {
    setAttendance((prev) => {
      const current = prev[studentId] ?? 'present'
      return {
        ...prev,
        [studentId]: current === 'present' ? 'absent' : 'present',
      }
    })
  }

  const handleSubmit = () => {
    if (!isValidSessionId) return
    submitMutation.mutate(attendance)
  }

  // ═══ فتح Bottom Sheet لطالب واحد ═══
  const openStudentSheet = (student: TeacherSessionStudent) => {
    if (isStandby) return // معلم الانتظار لا يقيّم
    if (selectionMode) {
      toggleSelection(student.id)
      return
    }
    setSheetStudents([student])
    setSheetOpen(true)
  }

  // ═══ دخول وضع التحديد (Long press) ═══
  const enterSelectionMode = (studentId: number) => {
    if (isStandby) return // معلم الانتظار لا يقيّم
    if (selectionMode) return
    setSelectionMode(true)
    setSelectedIds(new Set([studentId]))
  }

  // ═══ تبديل تحديد طالب ═══
  const toggleSelection = (studentId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
        if (next.size === 0) setSelectionMode(false)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  // ═══ فتح Bottom Sheet للرصد الجماعي ═══
  const openBulkSheet = () => {
    const selected = students.filter((s) => selectedIds.has(s.id))
    setSheetStudents(selected)
    setSheetOpen(true)
  }

  // ═══ إلغاء وضع التحديد ═══
  const cancelSelection = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  if (!isValidSessionId) {
    return (
      <div className="glass-card text-center">
        <p className="text-sm font-medium text-rose-600">معرف الحصة غير صالح</p>
        <button type="button" className="button-secondary mt-4" onClick={() => navigate(-1)}>
          العودة للخلف
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-4 text-sm text-muted">جاري تحميل تفاصيل الحصة والطلاب...</p>
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="glass-card text-center">
        <p className="text-sm font-medium text-rose-600">تعذر تحميل بيانات الحصة</p>
        <button type="button" className="button-secondary mt-4" onClick={() => studentsQuery.refetch()}>
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* ═══ شريط الرصد الجماعي ═══ */}
      {selectionMode && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            <span className="text-sm font-semibold text-teal-800">
              تم تحديد {selectedIds.size} طالب
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openBulkSheet}
              disabled={selectedIds.size === 0}
              className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              تقييم
            </button>
            <button
              type="button"
              onClick={cancelSelection}
              className="rounded-lg p-1.5 text-teal-600 transition hover:bg-teal-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">الحصة</h1>
        <p className="text-sm text-muted">
          {getSubjectName(session)} — {session.grade} / {session.class_name}
        </p>
        <p className="text-xs text-slate-500">التوقيت: {extractSessionTime(session)}</p>
      </header>

      <div className="glass-card">
        <header className="mb-3 flex items-center justify-between text-sm text-muted">
          <span>عدد الطلاب: {students.length}</span>
          <button type="button" className="text-xs underline" onClick={() => setAttendance(buildDefaultAttendance(students))}>
            إعادة ضبط الكل إلى حاضر
          </button>
        </header>

        <div className="space-y-2">
          {students.map((student) => {
            const currentStatus = attendance[student.id] ?? 'present'
            const isAdminStatus = currentStatus === 'late' || currentStatus === 'excused'
            const isSelected = selectionMode && selectedIds.has(student.id)

            const statusConfig = {
              present: { bgColor: 'border-emerald-500 bg-emerald-50 text-emerald-600', icon: '✓', label: 'حاضر' },
              absent: { bgColor: 'border-rose-500 bg-rose-50 text-rose-600', icon: '✕', label: 'غائب' },
              late: { bgColor: 'border-amber-500 bg-amber-50 text-amber-600', icon: '⚠', label: 'متأخر (من الإدارة)' },
              excused: { bgColor: 'border-sky-500 bg-sky-50 text-sky-600', icon: 'ℹ', label: 'مستأذن (من الإدارة)' },
            }
            const config = statusConfig[currentStatus as AttendanceStatus] || statusConfig.present

            // شارات التقييم
            const studentEvaluations = evaluationsSummary.data?.[student.id] ?? []

            return (
              <StudentCard
                key={student.id}
                student={student}
                config={config}
                isAdminStatus={isAdminStatus}
                isSelected={isSelected}
                selectionMode={selectionMode}
                hasSubmitted={hasSubmitted}
                isPending={submitMutation.isPending}
                evaluations={isStandby ? [] : studentEvaluations}
                onNameClick={isStandby ? undefined : () => openStudentSheet(student)}
                onStatusToggle={() => toggleStudentStatus(student.id)}
                onLongPress={isStandby ? undefined : () => enterSelectionMode(student.id)}
              />
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{summary.present}</p>
          <p className="text-xs text-muted">حاضر</p>
        </div>
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-rose-600">{summary.absent}</p>
          <p className="text-xs text-muted">غائب</p>
        </div>
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-amber-600">{summary.late}</p>
          <p className="text-xs text-muted">متأخر</p>
        </div>
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-sky-600">{summary.excused}</p>
          <p className="text-xs text-muted">مستأذن</p>
        </div>
      </div>

      <button
        type="button"
        className="button-primary w-full py-3 text-base"
        onClick={handleSubmit}
        disabled={hasSubmitted || submitMutation.isPending}
      >
        {hasSubmitted ? 'تم إرسال التحضير مسبقًا' : submitMutation.isPending ? 'جاري الحفظ...' : 'حفظ الحضور'}
      </button>

      {hasSubmitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-700">
          تم إرسال تحضير هذه الحصة بالفعل. يمكن مراجعة الحالة أو تعديلها من خلال إدارة النظام.
        </div>
      ) : null}

      {/* ═══ Bottom Sheet التقييم (مخفي لمعلم الانتظار) ═══ */}
      {!isStandby && (
        <>
          <StudentEvaluationSheet
            isOpen={sheetOpen}
            onClose={() => {
              setSheetOpen(false)
              setSheetStudents([])
              if (selectionMode) cancelSelection()
            }}
            students={sheetStudents}
            sessionId={numericSessionId}
            subjectId={getSubjectId(session)}
          />
          <EvaluationOnboardingSheet />
        </>
      )}
    </section>
  )
}

/* ═══════════ مكون كارد الطالب ═══════════ */
function StudentCard({
  student,
  config,
  isAdminStatus,
  isSelected,
  selectionMode,
  hasSubmitted,
  isPending,
  evaluations,
  onNameClick,
  onStatusToggle,
  onLongPress,
}: {
  student: TeacherSessionStudent
  config: { bgColor: string; icon: string; label: string }
  isAdminStatus: boolean
  isSelected: boolean
  selectionMode: boolean
  hasSubmitted: boolean
  isPending: boolean
  evaluations: Array<{ id: number; behavior_type?: { name: string; icon: string | null; color: string | null } | null; subject_skill?: { name: string } | null; descriptive_grade?: string | null; numeric_grade?: number | null; evaluation_type: string; behavior_type_id?: number | null; subject_skill_id?: number | null }>
  onNameClick?: (() => void) | undefined
  onStatusToggle: () => void
  onLongPress?: (() => void) | undefined
}) {
  const longPressHandlers = useLongPress(onLongPress ?? (() => {}), 500)

  return (
    <article
      className={clsx(
        'rounded-xl border p-3 transition',
        isSelected
          ? 'border-teal-500 bg-teal-50/50 shadow-sm'
          : isAdminStatus
          ? 'border-slate-300 bg-slate-50'
          : 'border-slate-200 bg-white',
      )}
      {...(onLongPress ? longPressHandlers : {})}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* اسم الطالب (قابل للضغط إذا ليس انتظار) */}
          <button
            type="button"
            onClick={onNameClick}
            disabled={!onNameClick}
            className={clsx(
              'text-sm font-semibold text-slate-900 transition',
              onNameClick ? 'hover:text-teal-600 active:text-teal-700' : 'cursor-default',
            )}
          >
            {selectionMode && (
              <span
                className={clsx(
                  'me-1.5 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] transition',
                  isSelected
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-slate-300 bg-white',
                )}
              >
                {isSelected ? '✓' : ''}
              </span>
            )}
            {student.name}
          </button>

          {isAdminStatus && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <i className="bi bi-lock-fill"></i>
              {config.label}
            </p>
          )}

          {/* شارات التقييم */}
          {evaluations.length > 0 && (
            <div className="mt-1">
              <EvaluationBadges evaluations={evaluations as any} />
            </div>
          )}
        </div>

        {isAdminStatus ? (
          <div
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${config.bgColor} cursor-not-allowed opacity-70`}
            title={`${config.label} - لا يمكن التعديل`}
          >
            {config.icon}
          </div>
        ) : (
          <button
            type="button"
            disabled={hasSubmitted || isPending}
            onClick={(e) => {
              e.stopPropagation()
              onStatusToggle()
            }}
            className={clsx(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition',
              config.bgColor,
              isPending ? 'opacity-60' : 'hover:opacity-80',
            )}
            aria-pressed={config.icon === '✕'}
          >
            {config.icon}
          </button>
        )}
      </div>
    </article>
  )
}
