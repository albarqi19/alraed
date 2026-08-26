import { useState, useMemo, useEffect } from 'react'
import { CheckCircle2, Clock3, DoorOpen, Users, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  useClassesForManualAbsenceQuery,
  useStudentsForManualAbsenceQuery,
  useCreateManualAbsenceMutation,
} from '../hooks'
import type { StudentForManualAbsence } from '../api'
import { getTodayRiyadh } from '@/lib/date-utils'
import {
  WsAlert,
  WsBtn,
  WsChip,
  WsEmpty,
  WsField,
  WsInput,
  WsModal,
  WsSpinner,
  WsTable,
  WsTextarea,
  type WsChipTone,
} from '@/shared/workspace'

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

const attendanceStatusTone: Record<AttendanceStatus, WsChipTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  excused: 'sky',
}

const attendanceStatusIcon: Record<AttendanceStatus, LucideIcon> = {
  present: CheckCircle2,
  absent: XCircle,
  late: Clock3,
  excused: DoorOpen,
}

const attendanceStatusList = Object.keys(attendanceStatusLabels) as AttendanceStatus[]

const arabicNumber = (value: number) => value.toLocaleString('ar-SA-u-nu-latn')

export function ManualAbsenceModal({ open, onClose }: ManualAbsenceModalProps) {
  const [step, setStep] = useState<'select-class' | 'record-attendance'>('select-class')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null)
  // توقيت الرياض بدل UTC لتفادي تسجيل الغياب على يوم خاطئ بين منتصف الليل و3 فجراً — B03
  const [attendanceDate, setAttendanceDate] = useState(getTodayRiyadh)
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

  const isPending = createMutation.isPending

  return (
    <WsModal
      open={open}
      onClose={() => !isPending && onClose()}
      title="إضافة غياب يدوي"
      sub={
        step === 'select-class'
          ? 'اختر الفصل والتاريخ لتسجيل الغياب'
          : `تسجيل حضور ${selectedGrade} — ${selectedClassName}`
      }
      maxWidth={760}
      footer={
        <>
          <span className="ws-fact ws-modal__foot-note">
            {step === 'record-attendance' && studentsQuery.data
              ? `إجمالي الطلاب: ${arabicNumber(studentsQuery.data.total_count)}`
              : selectedGrade && selectedClassName
                ? `${selectedGrade} — ${selectedClassName}`
                : 'اختر الفصل للمتابعة'}
          </span>
          {step === 'record-attendance' && (
            <WsBtn onClick={() => setStep('select-class')} disabled={isPending}>
              السابق
            </WsBtn>
          )}
          <WsBtn onClick={onClose} disabled={isPending}>
            إلغاء
          </WsBtn>
          {step === 'select-class' ? (
            <WsBtn
              variant="primary"
              onClick={handleProceedToAttendance}
              disabled={!selectedGrade || !selectedClassName}
            >
              التالي
            </WsBtn>
          ) : (
            <WsBtn
              variant="primary"
              onClick={handleSubmit}
              disabled={isPending || Object.keys(studentStatuses).length === 0}
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ وإضافة للاعتماد'}
            </WsBtn>
          )}
        </>
      }
    >
      {step === 'select-class' ? (
        <>
          <WsField label="تاريخ الغياب" htmlFor="manual-absence-date">
            <WsInput
              id="manual-absence-date"
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </WsField>

          <WsField label="الصف الدراسي">
            {classesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الصفوف...</WsEmpty>
            ) : (classesQuery.data?.length ?? 0) === 0 ? (
              <WsAlert tone="warn" boxed>
                لا توجد صفوف مسجلة في المدرسة.
              </WsAlert>
            ) : (
              <div className="ws-choice-grid ws-choice-grid--auto">
                {classesQuery.data?.map((gradeData) => (
                  <button
                    key={gradeData.grade}
                    type="button"
                    className={`ws-choice ${selectedGrade === gradeData.grade ? 'is-selected' : ''}`}
                    aria-pressed={selectedGrade === gradeData.grade}
                    onClick={() => {
                      setSelectedGrade(gradeData.grade)
                      setSelectedClassName(null)
                    }}
                  >
                    {gradeData.grade}
                  </button>
                ))}
              </div>
            )}
          </WsField>

          {selectedGrade && (
            <WsField label="الفصل">
              {availableClasses.length === 0 ? (
                <WsAlert tone="warn" boxed>
                  لا توجد فصول في هذا الصف.
                </WsAlert>
              ) : (
                <div className="ws-choice-grid ws-choice-grid--auto">
                  {availableClasses.map((classData) => (
                    <button
                      key={classData.class_name}
                      type="button"
                      className={`ws-choice ${selectedClassName === classData.class_name ? 'is-selected' : ''}`}
                      aria-pressed={selectedClassName === classData.class_name}
                      onClick={() => setSelectedClassName(classData.class_name)}
                    >
                      <Users />
                      {classData.class_name}
                      <span className="ws-count">{arabicNumber(classData.student_count)}</span>
                    </button>
                  ))}
                </div>
              )}
            </WsField>
          )}

          <WsField label="ملاحظات (اختياري)" htmlFor="manual-absence-notes">
            <WsTextarea
              id="manual-absence-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أضف أي ملاحظات تود تسجيلها..."
              rows={3}
            />
          </WsField>
        </>
      ) : (
        <>
          {/* الإجراءات الجماعية */}
          <div className="ws-bulkbar">
            <span className="ws-label">تعيين الكل كـ</span>
            <span className="ws-bulkbar__actions">
              {attendanceStatusList.map((status) => (
                <WsChip
                  key={status}
                  tone={attendanceStatusTone[status]}
                  icon={attendanceStatusIcon[status]}
                  onClick={() => handleBulkStatusChange(status)}
                  disabled={isPending}
                >
                  {attendanceStatusLabels[status]}
                </WsChip>
              ))}
            </span>
          </div>

          {/* إحصائيات سريعة */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {attendanceStatusList.map((status) => (
              <WsChip key={status} tone={attendanceStatusTone[status]} icon={attendanceStatusIcon[status]}>
                {attendanceStatusLabels[status]} {arabicNumber(stats[status])}
              </WsChip>
            ))}
          </div>

          {isPending && (
            <WsAlert tone="info" icon={null} boxed>
              <WsSpinner style={{ width: 13, height: 13 }} />
              جاري حفظ التحضير...
            </WsAlert>
          )}

          {/* قائمة الطلاب */}
          {studentsQuery.isLoading ? (
            <WsEmpty loading>جاري تحميل الطلاب...</WsEmpty>
          ) : studentsQuery.data?.students && studentsQuery.data.students.length > 0 ? (
            <div className="ws-modal__scroll">
              <WsTable className="ws-mstack">
                <thead>
                  <tr>
                    <th>اسم الطالب</th>
                    <th>رقم الهوية</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsQuery.data.students.map((student: StudentForManualAbsence) => {
                    const current = studentStatuses[student.id]
                    return (
                      <tr key={student.id}>
                        <td data-label="الطالب" style={{ fontWeight: 600 }}>
                          {student.name}
                        </td>
                        <td data-label="رقم الهوية" style={{ color: 'var(--ws-text-2)' }}>
                          {student.national_id || '—'}
                        </td>
                        <td className="ws-mstack__wide">
                          <span className="ws-statuspick">
                            {attendanceStatusList.map((status) => (
                              <WsChip
                                key={status}
                                tone={current === status ? attendanceStatusTone[status] : undefined}
                                icon={current === status ? attendanceStatusIcon[status] : undefined}
                                onClick={() => handleStudentStatusChange(student.id, status)}
                                disabled={isPending}
                                aria-pressed={current === status}
                              >
                                {attendanceStatusLabels[status]}
                              </WsChip>
                            ))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            </div>
          ) : (
            <WsAlert tone="warn" boxed>
              لا يوجد طلاب في هذا الفصل.
            </WsAlert>
          )}
        </>
      )}
    </WsModal>
  )
}
