import { useState, useMemo, useEffect } from 'react'
import {
  useClassesForManualAbsenceQuery,
  useStudentsForManualAbsenceQuery,
  useCreateManualAbsenceMutation,
} from '../hooks'
import type { StudentForManualAbsence } from '../api'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface ManualAbsenceModalProps {
  open: boolean
  onClose: () => void
}

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'مستأذن',
}

const attendanceStatusColors: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500 hover:bg-emerald-600',
  absent: 'bg-rose-500 hover:bg-rose-600',
  late: 'bg-amber-500 hover:bg-amber-600',
  excused: 'bg-sky-500 hover:bg-sky-600',
}

export function ManualAbsenceModal({ open, onClose }: ManualAbsenceModalProps) {
  const [step, setStep] = useState<'select-class' | 'record-attendance'>('select-class')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [studentStatuses, setStudentStatuses] = useState<Record<number, AttendanceStatus>>({})
  const [notes, setNotes] = useState('')

  // استعلامات البيانات
  const classesQuery = useClassesForManualAbsenceQuery({ enabled: open })
  const studentsQuery = useStudentsForManualAbsenceQuery(selectedGrade, selectedClassName, {
    enabled: open && Boolean(selectedGrade) && Boolean(selectedClassName),
  })
  const createMutation = useCreateManualAbsenceMutation()

  // إعادة تعيين الحالة عند فتح/إغلاق النافذة
  useEffect(() => {
    if (open) {
      setStep('select-class')
      setSelectedGrade(null)
      setSelectedClassName(null)
      setStudentStatuses({})
      setNotes('')
    }
  }, [open])

  // تعيين حالة افتراضية (حاضر) لجميع الطلاب عند تحميلهم
  useEffect(() => {
    if (studentsQuery.data?.students) {
      const initialStatuses: Record<number, AttendanceStatus> = {}
      studentsQuery.data.students.forEach((student) => {
        initialStatuses[student.id] = 'present'
      })
      setStudentStatuses(initialStatuses)
    }
  }, [studentsQuery.data])

  // قائمة الفصول للصف المحدد
  const availableClasses = useMemo(() => {
    if (!selectedGrade || !classesQuery.data) return []
    const gradeData = classesQuery.data.find((g) => g.grade === selectedGrade)
    return gradeData?.classes ?? []
  }, [selectedGrade, classesQuery.data])

  // تغيير حالة طالب واحد
  const handleStudentStatusChange = (studentId: number, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({ ...prev, [studentId]: status }))
  }

  // تغيير حالة جميع الطلاب
  const handleBulkStatusChange = (status: AttendanceStatus) => {
    if (studentsQuery.data?.students) {
      const newStatuses: Record<number, AttendanceStatus> = {}
      studentsQuery.data.students.forEach((student) => {
        newStatuses[student.id] = status
      })
      setStudentStatuses(newStatuses)
    }
  }

  // إحصائيات الحضور
  const stats = useMemo(() => {
    const statuses = Object.values(studentStatuses)
    return {
      present: statuses.filter((s) => s === 'present').length,
      absent: statuses.filter((s) => s === 'absent').length,
      late: statuses.filter((s) => s === 'late').length,
      excused: statuses.filter((s) => s === 'excused').length,
      total: statuses.length,
    }
  }, [studentStatuses])

  // إرسال البيانات
  const handleSubmit = () => {
    if (!selectedGrade || !selectedClassName) return

    const attendanceData = Object.entries(studentStatuses).map(([studentId, status]) => ({
      student_id: Number(studentId),
      status,
    }))

    createMutation.mutate(
      {
        grade: selectedGrade,
        class_name: selectedClassName,
        attendance_date: attendanceDate,
        attendance: attendanceData,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  // الانتقال للخطوة الثانية
  const handleProceedToAttendance = () => {
    if (selectedGrade && selectedClassName) {
      setStep('record-attendance')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold text-slate-900">إضافة غياب يدوي</h2>
                <p className="text-sm text-muted">
                  {step === 'select-class'
                    ? 'اختر الفصل والتاريخ لتسجيل الغياب'
                    : `تسجيل حضور فصل ${selectedGrade} ${selectedClassName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100"
              aria-label="إغلاق"
              disabled={createMutation.isPending}
            >
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select-class' ? (
            <div className="space-y-6">
              {/* اختيار التاريخ */}
              <div className="space-y-2 text-right">
                <label className="text-sm font-semibold text-slate-700">تاريخ الغياب</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* اختيار الصف */}
              <div className="space-y-2 text-right">
                <label className="text-sm font-semibold text-slate-700">الصف الدراسي</label>
                {classesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {classesQuery.data?.map((gradeData) => (
                      <button
                        key={gradeData.grade}
                        type="button"
                        onClick={() => {
                          setSelectedGrade(gradeData.grade)
                          setSelectedClassName(null)
                        }}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                          selectedGrade === gradeData.grade
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {gradeData.grade}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* اختيار الفصل */}
              {selectedGrade && (
                <div className="space-y-2 text-right">
                  <label className="text-sm font-semibold text-slate-700">الفصل</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {availableClasses.map((classData) => (
                      <button
                        key={classData.class_name}
                        type="button"
                        onClick={() => setSelectedClassName(classData.class_name)}
                        className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
                          selectedClassName === classData.class_name
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">{classData.class_name}</span>
                        <span className="mt-1 block text-xs text-slate-500">{classData.student_count} طالب</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظات */}
              <div className="space-y-2 text-right">
                <label className="text-sm font-semibold text-slate-700">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات تود تسجيلها..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* شريط الإجراءات الجماعية */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">تعيين الكل كـ:</p>
                    <p className="text-xs text-slate-500">اختر حالة لتطبيقها على جميع الطلاب</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleBulkStatusChange(status)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${attendanceStatusColors[status]}`}
                      >
                        الكل {attendanceStatusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
                  <p className="text-xs font-semibold text-emerald-600">حاضر</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">{stats.absent}</p>
                  <p className="text-xs font-semibold text-rose-600">غائب</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
                  <p className="text-xs font-semibold text-amber-600">متأخر</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-center">
                  <p className="text-2xl font-bold text-sky-700">{stats.excused}</p>
                  <p className="text-xs font-semibold text-sky-600">مستأذن</p>
                </div>
              </div>

              {/* قائمة الطلاب */}
              {studentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                </div>
              ) : studentsQuery.data?.students && studentsQuery.data.students.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">اسم الطالب</th>
                        <th className="px-4 py-3 font-semibold">رقم الهوية</th>
                        <th className="px-4 py-3 font-semibold">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsQuery.data.students.map((student: StudentForManualAbsence, index: number) => (
                        <tr
                          key={student.id}
                          className={`border-t border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                          <td className="px-4 py-3 text-slate-600">{student.national_id || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map((status) => {
                                const isSelected = studentStatuses[student.id] === status
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleStudentStatusChange(student.id, status)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                      isSelected
                                        ? `${attendanceStatusColors[status]} text-white shadow-sm`
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {attendanceStatusLabels[status]}
                                  </button>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                  <p className="text-amber-800">لا يوجد طلاب في هذا الفصل</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {step === 'record-attendance' && studentsQuery.data
                ? `إجمالي الطلاب: ${studentsQuery.data.total_count}`
                : selectedGrade && selectedClassName
                  ? `${selectedGrade} ${selectedClassName}`
                  : 'اختر الفصل للمتابعة'}
            </p>
            <div className="flex gap-2">
              {step === 'record-attendance' && (
                <button
                  type="button"
                  onClick={() => setStep('select-class')}
                  className="button-secondary text-sm"
                  disabled={createMutation.isPending}
                >
                  السابق
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="button-secondary text-sm"
                disabled={createMutation.isPending}
              >
                إلغاء
              </button>
              {step === 'select-class' ? (
                <button
                  type="button"
                  onClick={handleProceedToAttendance}
                  className="button-primary text-sm"
                  disabled={!selectedGrade || !selectedClassName}
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="button-primary text-sm"
                  disabled={createMutation.isPending || Object.keys(studentStatuses).length === 0}
                >
                  {createMutation.isPending ? (
                    <>
                      <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ وإضافة للاعتماد'
                  )}
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
