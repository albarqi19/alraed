import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardX,
  Clock3,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  Info,
  ListChecks,
  Pencil,
  RotateCcw,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsProgress,
  WsSelect,
  WsSideCol,
  WsTable,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'
import {
  useAttendanceReportsQuery,
  useAttendanceSessionDetailsQuery,
  useExportAttendanceReportMutation,
  useUpdateAttendanceStatusMutation,
  useGradesWithClassesQuery,
} from '../hooks'
import type { AttendanceReportRecord, AttendanceSessionDetails } from '../types'
import { getTodayRiyadh, isToday as isTodayRiyadh } from '@/lib/date-utils'

type FilterState = {
  grade: string
  className: string
  status: 'all' | 'present' | 'absent' | 'late' | 'excused'
  fromDate: string
  toDate: string
  search: string
}

type StatusKey = 'present' | 'absent' | 'late' | 'excused'

const statusMeta: Record<StatusKey, { label: string; tone: WsChipTone; icon: LucideIcon }> = {
  present: { label: 'حاضر', tone: 'green', icon: CheckCircle2 },
  absent: { label: 'غائب', tone: 'red', icon: XCircle },
  late: { label: 'متأخر', tone: 'amber', icon: Clock3 },
  excused: { label: 'مستأذن', tone: 'sky', icon: DoorOpen },
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
  }
}

function StatusChip({ status, onClick, isEditable }: { status: StatusKey; onClick?: () => void; isEditable?: boolean }) {
  const meta = statusMeta[status]
  return (
    <WsChip
      tone={meta.tone}
      icon={meta.icon}
      onClick={isEditable ? onClick : undefined}
      title={isEditable ? 'اضغط لتغيير الحالة' : undefined}
    >
      {meta.label}
      {isEditable && <Pencil style={{ width: 9, height: 9, opacity: 0.6 }} />}
    </WsChip>
  )
}

// مودال تغيير حالة الطالب
function ChangeStatusModal({
  student,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  isToday,
}: {
  student: AttendanceSessionDetails['students'][number] | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (newStatus: StatusKey) => void
  isLoading: boolean
  isToday: boolean
}) {
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null)

  useEffect(() => {
    if (student) {
      setSelectedStatus(null)
    }
  }, [student])

  if (!isOpen || !student) return null

  const currentStatus = student.status
  const availableStatuses: StatusKey[] = ['present', 'absent', 'late', 'excused']

  // رسالة التحذير حسب التغيير
  const getWarningMessage = () => {
    if (!selectedStatus) return null

    if (currentStatus === 'absent' && selectedStatus === 'present') {
      return 'سيتم إرسال رسالة تصحيح لولي الأمر تفيد بأن ابنه حاضر وليس غائباً.'
    }
    if ((currentStatus === 'present' || currentStatus === 'late') && selectedStatus === 'absent') {
      return 'سيتم إرسال رسالة غياب لولي الأمر.'
    }
    if (selectedStatus === 'late' && currentStatus !== 'late') {
      return 'سيتم إرسال رسالة تأخر لولي الأمر.'
    }
    return null
  }

  return (
    <WsModal
      open={isOpen}
      onClose={onClose}
      title="تغيير حالة الطالب"
      sub={student.name}
      footer={
        <>
          <WsBtn onClick={onClose}>إلغاء</WsBtn>
          {isToday && (
            <WsBtn
              variant="primary"
              onClick={() => selectedStatus && onConfirm(selectedStatus)}
              disabled={!selectedStatus || isLoading}
            >
              {isLoading ? 'جاري التحديث...' : 'تأكيد التغيير'}
            </WsBtn>
          )}
        </>
      }
    >
      {!isToday ? (
        <WsAlert boxed>لا يمكن تعديل سجلات الحضور لأيام سابقة — التعديل متاح فقط لسجلات اليوم الحالي.</WsAlert>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="ws-label">الحالة الحالية</span>
            <StatusChip status={currentStatus} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="ws-label">اختر الحالة الجديدة</span>
            <div className="ws-choice-grid">
              {availableStatuses.map((status) => {
                const meta = statusMeta[status]
                const Icon = meta.icon
                const isSelected = selectedStatus === status
                const isCurrent = currentStatus === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => !isCurrent && setSelectedStatus(status)}
                    disabled={isCurrent}
                    className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                  >
                    <Icon />
                    {meta.label}
                    {isCurrent && <span style={{ fontSize: 10 }}>(الحالية)</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {getWarningMessage() && (
            <WsAlert tone="warn" boxed>
              {getWarningMessage()}
            </WsAlert>
          )}
        </>
      )}
    </WsModal>
  )
}

export function AdminAttendancePage() {
  const today = getTodayRiyadh() // تاريخ اليوم بصيغة YYYY-MM-DD بتوقيت الرياض

  const [filters, setFilters] = useState<FilterState>({
    grade: '',
    className: '',
    status: 'all',
    fromDate: today,
    toDate: today,
    search: '',
  })
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<AttendanceSessionDetails['students'][number] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const queryFilters = useMemo(() => {
    const entries: Record<string, string> = {}
    if (filters.grade) entries.grade = filters.grade
    if (filters.className) entries.class_name = filters.className
    if (filters.status !== 'all') entries.status = filters.status
    if (filters.fromDate) entries.date = filters.fromDate // استخدام 'date' بدلاً من 'from_date'
    if (filters.toDate && filters.toDate !== filters.fromDate) entries.to_date = filters.toDate
    if (filters.search.trim()) entries.search = filters.search.trim()
    return entries
  }, [filters])

  const gradesWithClassesQuery = useGradesWithClassesQuery()
  const gradeOptions = useMemo(() => gradesWithClassesQuery.data ?? [], [gradesWithClassesQuery.data])
  const classOptions = useMemo(() => {
    if (!filters.grade) return []
    const found = gradeOptions.find((g) => g.grade === filters.grade)
    return found?.classes ?? []
  }, [gradeOptions, filters.grade])

  const reportsQuery = useAttendanceReportsQuery(queryFilters)
  const exportMutation = useExportAttendanceReportMutation()
  const updateStatusMutation = useUpdateAttendanceStatusMutation()

  const records = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])

  useEffect(() => {
    if (records.length === 0) {
      setSelectedRecordId(null)
      return
    }
    if (!selectedRecordId || !records.some((record) => record.first_id === selectedRecordId || record.id === selectedRecordId)) {
      setSelectedRecordId(records[0].first_id || records[0].id || null)
    }
  }, [records, selectedRecordId])

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null
    return records.find((record) => (record.first_id || record.id) === selectedRecordId) ?? null
  }, [records, selectedRecordId])

  const detailsQuery = useAttendanceSessionDetailsQuery(selectedRecord?.first_id || selectedRecord?.id)

  // التحقق مما إذا كان التاريخ المحدد هو اليوم (بتوقيت الرياض)
  const isSelectedDateToday = useMemo(() => {
    if (!selectedRecord?.attendance_date) return false
    return isTodayRiyadh(selectedRecord.attendance_date)
  }, [selectedRecord])

  // حقائق الترويسة
  const totalStudents = useMemo(
    () => records.reduce((sum, record: AttendanceReportRecord) => sum + (record.students_count || 0), 0),
    [records],
  )
  const activeTeachers = useMemo(() => new Set(records.map((r) => r.teacher_id)).size, [records])
  const dateRangeLabel = useMemo(() => {
    if (filters.fromDate === today && (filters.toDate === today || !filters.toDate)) return 'اليوم'
    if (!filters.toDate || filters.toDate === filters.fromDate) return formatDate(filters.fromDate)
    return `${formatDate(filters.fromDate)} — ${formatDate(filters.toDate)}`
  }, [filters.fromDate, filters.toDate, today])

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'grade') next.className = ''
      return next
    })
  }

  const handleResetFilters = () => {
    const today = getTodayRiyadh()
    setFilters({ grade: '', className: '', status: 'all', fromDate: today, toDate: today, search: '' })
  }

  const handleExport = (format: 'excel' | 'pdf') => {
    exportMutation.mutate(
      { format, filters: queryFilters },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = format === 'excel' ? 'attendance-report.xlsx' : 'attendance-report.pdf'
          document.body.appendChild(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
        },
      },
    )
  }

  const handleStudentClick = (student: AttendanceSessionDetails['students'][number]) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  const handleStatusChange = (newStatus: StatusKey) => {
    if (!selectedStudent) return

    updateStatusMutation.mutate(
      {
        attendanceId: selectedStudent.attendance_id,
        sessionDetailId: selectedRecord?.first_id || selectedRecord?.id,
        status: newStatus,
      },
      {
        onSuccess: () => {
          setIsModalOpen(false)
          setSelectedStudent(null)
        },
      },
    )
  }

  return (
    <WsPage>
      <WsHeader
        title="تقارير الحضور"
        badge="الحضور اليومي"
        actions={
          <>
            <WsBtn icon={FileSpreadsheet} onClick={() => handleExport('excel')} disabled={exportMutation.isPending}>
              تصدير Excel
            </WsBtn>
            <WsBtn icon={FileText} onClick={() => handleExport('pdf')} disabled={exportMutation.isPending}>
              تصدير PDF
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardList} label="السجلات:">
              {records.length.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={Users} label="الطلاب:">
              {totalStudents.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={UserRound} label="معلمون نشطون:">
              {activeTeachers.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={CalendarDays} label="المدى:">
              {dateRangeLabel}
            </WsFact>
          </>
        }
      >
        {isSelectedDateToday && (
          <WsChip tone="green" icon={Pencil}>
            التعديل متاح لسجلات اليوم
          </WsChip>
        )}
      </WsHeader>

      <WsToolbar>
        <WsField label="الصف الدراسي" htmlFor="ws-att-grade">
          <WsSelect
            id="ws-att-grade"
            value={filters.grade}
            onChange={(event) => handleFilterChange('grade', event.target.value)}
          >
            <option value="">جميع الصفوف</option>
            {gradeOptions.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.grade}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="الفصل" htmlFor="ws-att-class">
          <WsSelect
            id="ws-att-class"
            value={filters.className}
            onChange={(event) => handleFilterChange('className', event.target.value)}
            disabled={!filters.grade}
          >
            <option value="">جميع الفصول</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="حالة السجل" htmlFor="ws-att-status">
          <WsSelect
            id="ws-att-status"
            value={filters.status}
            onChange={(event) => handleFilterChange('status', event.target.value as FilterState['status'])}
          >
            <option value="all">جميع الحالات</option>
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="excused">مستأذن</option>
          </WsSelect>
        </WsField>

        <WsField label="من تاريخ" htmlFor="ws-att-from">
          <WsInput
            id="ws-att-from"
            type="date"
            value={filters.fromDate}
            onChange={(event) => handleFilterChange('fromDate', event.target.value)}
          />
        </WsField>

        <WsField label="إلى تاريخ" htmlFor="ws-att-to">
          <WsInput
            id="ws-att-to"
            type="date"
            value={filters.toDate}
            onChange={(event) => handleFilterChange('toDate', event.target.value)}
          />
        </WsField>

        <WsField label="بحث سريع" htmlFor="ws-att-search" grow>
          <WsInput
            id="ws-att-search"
            type="search"
            value={filters.search}
            onChange={(event) => handleFilterChange('search', event.target.value)}
            placeholder="اسم الطالب أو المعلم"
          />
        </WsField>

        <WsBtn icon={RotateCcw} onClick={handleResetFilters}>
          إعادة التعيين
        </WsBtn>
      </WsToolbar>

      {reportsQuery.isError && (
        <WsAlert>
          حدث خطأ أثناء تحميل السجلات. حاول مجددًا أو تحقق من الاتصال.
          <WsBtn size="sm" icon={RotateCcw} onClick={() => reportsQuery.refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}

      <WsLayout>
        <WsMain>
          <WsBlock title="سجلات التحضير" icon={ClipboardList} count={records.length.toLocaleString('ar-SA-u-nu-latn')} fill>
            {reportsQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل سجلات الحضور...</WsEmpty>
            ) : records.length === 0 ? (
              <WsEmpty icon={ClipboardX}>لا توجد سجلات مطابقة لمعايير البحث الحالية.</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th>الصف / الفصل</th>
                    <th>عدد الطلاب</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const recordId = record.first_id || record.id || 0
                    const isSelected = recordId === selectedRecordId
                    return (
                      <tr
                        key={recordId}
                        onClick={() => setSelectedRecordId(recordId)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{record.teacher_name}</span>
                          <span className="ws-cell-sub">{record.teacher_id_number}</span>
                        </td>
                        <td>
                          {record.grade} - {record.class_name}
                        </td>
                        <td>
                          <WsChip icon={Users}>{record.students_count}</WsChip>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(record.attendance_date)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol title="تفاصيل السجل" icon={ListChecks} storageKey="ws:attendance:sidecol">
          {selectedRecord ? (
            <>
              {isSelectedDateToday && (
                <WsAlert tone="info" icon={Info} style={{ flexShrink: 0 }}>
                  اضغط على حالة الطالب لتغييرها
                </WsAlert>
              )}

              <WsBlock padded>
                <WsFactsList>
                  <WsFactRow label="الصف والفصل">
                    {selectedRecord.grade} - {selectedRecord.class_name}
                  </WsFactRow>
                  <WsFactRow label="المعلم">{selectedRecord.teacher_name}</WsFactRow>
                  <WsFactRow label="رقم الهوية">{selectedRecord.teacher_id_number || '—'}</WsFactRow>
                  <WsFactRow label="التاريخ">
                    {formatDate(selectedRecord.attendance_date, { dateStyle: 'full' })}
                  </WsFactRow>
                </WsFactsList>
              </WsBlock>

              {detailsQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل قائمة الطلاب...</WsEmpty>
              ) : detailsQuery.isError ? (
                <WsEmpty icon={AlertTriangle}>تعذر تحميل قائمة الطلاب. حاول مرة أخرى.</WsEmpty>
              ) : detailsQuery.data ? (
                <>
                  <WsBlock title="إحصائيات الحصة" padded>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        <WsChip tone="green" icon={CheckCircle2}>
                          حاضر {detailsQuery.data.statistics.present_count.toLocaleString('ar-SA-u-nu-latn')}
                        </WsChip>
                        <WsChip tone="red" icon={XCircle}>
                          غائب {detailsQuery.data.statistics.absent_count.toLocaleString('ar-SA-u-nu-latn')}
                        </WsChip>
                        <WsChip tone="amber" icon={Clock3}>
                          متأخر {detailsQuery.data.statistics.late_count.toLocaleString('ar-SA-u-nu-latn')}
                        </WsChip>
                        <WsChip tone="sky" icon={DoorOpen}>
                          مستأذن {detailsQuery.data.statistics.excused_count.toLocaleString('ar-SA-u-nu-latn')}
                        </WsChip>
                      </div>
                      <WsProgress
                        value={detailsQuery.data.statistics.attendance_rate}
                        label={
                          <>
                            نسبة الحضور: <b>{Math.round(detailsQuery.data.statistics.attendance_rate)}%</b>
                          </>
                        }
                      />
                    </div>
                  </WsBlock>

                  <WsBlock
                    title="قائمة الطلاب"
                    count={detailsQuery.data.students.length.toLocaleString('ar-SA-u-nu-latn')}
                    fill
                    scroll
                  >
                    <ul className="ws-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {detailsQuery.data.students.map((student) => (
                        <li
                          key={student.attendance_id}
                          className="ws-row"
                          style={isSelectedDateToday ? { cursor: 'pointer' } : undefined}
                          onClick={() => isSelectedDateToday && handleStudentClick(student)}
                        >
                          <span className="ws-row__name">{student.name}</span>
                          <StatusChip
                            status={student.status}
                            isEditable={isSelectedDateToday}
                            onClick={() => handleStudentClick(student)}
                          />
                        </li>
                      ))}
                    </ul>
                  </WsBlock>
                </>
              ) : null}
            </>
          ) : (
            <WsEmpty icon={Info}>اختر سجلًا من الجدول لعرض التفاصيل هنا.</WsEmpty>
          )}
        </WsSideCol>
      </WsLayout>

      {/* مودال تغيير الحالة */}
      <ChangeStatusModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedStudent(null)
        }}
        onConfirm={handleStatusChange}
        isLoading={updateStatusMutation.isPending}
        isToday={isSelectedDateToday}
      />
    </WsPage>
  )
}
