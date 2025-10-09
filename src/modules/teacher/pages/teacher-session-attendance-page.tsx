import { useEffect, useMemo, useState } from 'react'
import clsx from 'classnames'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useSubmitAttendanceMutation,
  useTeacherSessionStudentsQuery,
  useSubmittedAttendanceQuery,
} from '../hooks'
import type { AttendanceFormState, AttendanceStatus, TeacherSession } from '../types'

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
  // محاولة الحصول على اسم المادة من مصادر متعددة
  if (session.subject && typeof session.subject === 'object' && 'name' in session.subject) {
    return session.subject.name || 'مادة غير محددة'
  }
  return 'مادة غير محددة'
}

export function TeacherSessionAttendancePage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const numericSessionId = sessionId ? Number.parseInt(sessionId, 10) : NaN
  const isValidSessionId = Number.isInteger(numericSessionId) && numericSessionId > 0

  const studentsQuery = useTeacherSessionStudentsQuery(isValidSessionId ? numericSessionId : undefined)
  const submittedAttendanceQuery = useSubmittedAttendanceQuery(isValidSessionId ? numericSessionId : undefined)
  const submitMutation = useSubmitAttendanceMutation(isValidSessionId ? numericSessionId : 0)

  const [attendance, setAttendance] = useState<AttendanceFormState>({})

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
          hydrated[numericId] = record.status === 'absent' ? 'absent' : 'present'
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

    Object.values(attendance).forEach((rawStatus) => {
      const status: AttendanceStatus = rawStatus === 'absent' ? 'absent' : 'present'
      counters[status] = (counters[status] ?? 0) + 1
    })

    return counters
  }, [attendance])

  const session = studentsQuery.data?.session
  const students = studentsQuery.data?.students ?? []
  const isLoading = studentsQuery.isLoading || submittedAttendanceQuery.isLoading
  const isError = studentsQuery.isError
  const hasSubmitted = submittedAttendanceQuery.data?.submitted === true

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
    if (!isValidSessionId) {
      return
    }
    submitMutation.mutate(attendance)
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
      <header className="space-y-3">
        <button type="button" className="button-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-right"></i>
          العودة
        </button>
        
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">تحضير الحصة</h1>
          <p className="text-sm text-muted">
            {getSubjectName(session)} — {session.grade} / {session.class_name}
          </p>
          <p className="text-xs text-slate-500">التوقيت: {extractSessionTime(session)}</p>
        </div>
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
            return (
              <article
                key={student.id}
                className="rounded-xl border border-slate-200 bg-white p-3 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                  </div>
                  <button
                    type="button"
                    disabled={hasSubmitted || submitMutation.isPending}
                    onClick={() => toggleStudentStatus(student.id)}
                    className={clsx(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition',
                      currentStatus === 'present'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-rose-500 bg-rose-50 text-rose-600',
                      submitMutation.isPending ? 'opacity-60' : 'hover:opacity-80',
                    )}
                    aria-pressed={currentStatus === 'absent'}
                  >
                    {currentStatus === 'present' ? '✓' : '✕'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-emerald-600">{summary.present}</p>
          <p className="text-xs text-muted">حاضر</p>
        </div>
        <div className="glass-card py-3 text-center">
          <p className="text-2xl font-semibold text-rose-600">{summary.absent}</p>
          <p className="text-xs text-muted">غائب</p>
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
    </section>
  )
}
