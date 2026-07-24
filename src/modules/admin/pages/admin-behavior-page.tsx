import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
import { ViolationBadge } from '@/modules/admin/behavior/components/violation-badge'
import {
  BEHAVIOR_DEGREE_OPTIONS,
  BEHAVIOR_GRADES,
  BEHAVIOR_LOCATIONS,
  BEHAVIOR_REPORTERS,
  BEHAVIOR_STATUSES,
} from '@/modules/admin/behavior/constants'
import type {
  BehaviorDegree,
  BehaviorProcedureDefinition,
  BehaviorStatus,
  BehaviorStudent,
} from '@/modules/admin/behavior/types'
import type { CreateBehaviorViolationPayload } from '@/modules/admin/behavior/api'
import { useBehaviorStore } from '@/modules/admin/behavior/store/use-behavior-store'
import { useBehaviorConfigStore } from '@/modules/admin/behavior/store/use-behavior-config-store'
import {
  TONES,
  ToneChip,
  WsAlert,
  WsBlock,
  WsBtn,
  WsEmpty,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsTextarea,
  WsToolbar,
  type Tone,
} from '@/shared/workspace'
import { DayCard, chip } from './dashboard-ui'

type RecordStep = 1 | 2 | 3 | 4 | 5

const RECORD_STEPS: { id: RecordStep; label: string }[] = [
  { id: 1, label: 'اختيار الطالب' },
  { id: 2, label: 'نوع المخالفة' },
  { id: 3, label: 'تفاصيل الحالة' },
  { id: 4, label: 'الإجراءات المقترحة' },
  { id: 5, label: 'المراجعة والتأكيد' },
]

const ITEMS_PER_PAGE = 10

const clampRecordStep = (value: number): RecordStep =>
  Math.min(5, Math.max(1, value)) as RecordStep

/** الحالة تلبس نغمتها في كل الصفحة — نفس عائلة TONES المعتمدة */
const STATUS_TONES: Record<BehaviorStatus, Tone> = {
  'قيد المعالجة': TONES.amber,
  'جاري التنفيذ': TONES.sky,
  مكتملة: TONES.green,
  ملغاة: TONES.gray,
}

/** سلّم خطورة الدرجات: الأولى هادئة والخامسة حمراء */
const DEGREE_TONES: Record<number, Tone> = {
  1: TONES.green,
  2: TONES.sky,
  3: TONES.amber,
  4: TONES.red,
  5: TONES.red,
}

type ProcedureAssignment = {
  student: BehaviorStudent
  occurrence: number
  procedure: BehaviorProcedureDefinition
}

type ProcedureGroup = {
  procedure: BehaviorProcedureDefinition
  students: ProcedureAssignment[]
}

const initialDetails = () => ({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  location: '',
  description: '',
  reporter: BEHAVIOR_REPORTERS[0],
})

export function AdminBehaviorPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const students = useBehaviorStore((state) => state.students)
  const violations = useBehaviorStore((state) => state.violations)
  const reporters = useBehaviorStore((state) => state.reporters)
  const isLoadingStudents = useBehaviorStore((state) => state.isLoadingStudents)
  const fetchStudents = useBehaviorStore((state) => state.fetchStudents)
  const fetchViolations = useBehaviorStore((state) => state.fetchViolations)
  const fetchReporters = useBehaviorStore((state) => state.fetchReporters)
  const createViolations = useBehaviorStore((state) => state.createViolations)
  const deleteViolation = useBehaviorStore((state) => state.deleteViolation)
  const isCreating = useBehaviorStore((state) => state.isCreating)

  // Config Store - البيانات من قاعدة البيانات
  const loadConfig = useBehaviorConfigStore((state) => state.loadConfig)
  const loadViolationTypes = useBehaviorConfigStore((state) => state.loadViolationTypes)
  const loadProcedures = useBehaviorConfigStore((state) => state.loadProcedures)
  const getViolationsForDegree = useBehaviorConfigStore((state) => state.getViolationsForDegree)
  const getProceduresForDegree = useBehaviorConfigStore((state) => state.getProceduresForDegree)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProceduresModalOpen, setIsProceduresModalOpen] = useState(false)
  const [recordStep, setRecordStep] = useState<RecordStep>(1)
  const [recordStudentSearch, setRecordStudentSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedReporterId, setSelectedReporterId] = useState<number | null>(null)
  const [selectedDegree, setSelectedDegree] = useState<BehaviorDegree | null>(null)
  const [selectedViolationType, setSelectedViolationType] = useState('')
  const [recordDetails, setRecordDetails] = useState(() => initialDetails())
  const [deletingViolationId, setDeletingViolationId] = useState<string | null>(null)

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students],
  )

  // Load students, violations and config on mount
  useEffect(() => {
    fetchStudents()
    fetchViolations()
    loadConfig()
    loadViolationTypes()
    loadProcedures()
  }, [fetchStudents, fetchViolations, loadConfig, loadViolationTypes, loadProcedures])

  // Load reporters when modal is opened
  useEffect(() => {
    if (isModalOpen) {
      fetchReporters()
    }
  }, [isModalOpen, fetchReporters])

  const filteredStudents = useMemo(() => {
    const query = recordStudentSearch.trim()
    if (!query) return []
    return students
      .filter((student) => {
        return [student.name, student.studentId, student.grade]
          .filter(Boolean)
          .some((value) => value.includes(query))
      })
      .slice(0, 20)
  }, [recordStudentSearch, students])

  const [logSearch, setLogSearch] = useState('')
  const [logDegree, setLogDegree] = useState<'all' | BehaviorDegree>('all')
  const [logStatus, setLogStatus] = useState<'all' | BehaviorStatus>('all')
  const [logGrades, setLogGrades] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('behavior_selected_grades')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false)
  const gradeDropdownRef = useRef<HTMLDivElement>(null)
  const [logPage, setLogPage] = useState(1)

  // حفظ الصفوف المحددة في localStorage
  useEffect(() => {
    localStorage.setItem('behavior_selected_grades', JSON.stringify(logGrades))
  }, [logGrades])

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setIsGradeDropdownOpen(false)
      }
    }
    if (isGradeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isGradeDropdownOpen])

  // الحصول على البيانات من الـ Store (ديناميكي من قاعدة البيانات)
  const availableProcedures = selectedDegree ? getProceduresForDegree(selectedDegree) : []
  const availableViolations = selectedDegree ? getViolationsForDegree(selectedDegree) : []

  const procedurePreview = useMemo<{
    assignments: ProcedureAssignment[]
    groups: ProcedureGroup[]
    assignmentsByStudentId: Record<string, ProcedureAssignment>
  } | null>(() => {
    if (!selectedDegree || !selectedViolationType || selectedStudents.length === 0) {
      return null
    }

    const template = getProceduresForDegree(selectedDegree) ?? []
    if (template.length === 0) {
      return null
    }

    const assignments: ProcedureAssignment[] = selectedStudents.map((student) => {
      const occurrences = violations.filter(
        (violation) =>
          violation.studentId === student.id &&
          violation.degree === selectedDegree &&
          violation.type === selectedViolationType,
      ).length

      // نبحث عن الإجراء المناسب بناءً على التكرار
      const targetRepetition = occurrences + 1
      let targetProcedure = template.find(p => p.repetition === targetRepetition || p.step === targetRepetition)

      // إذا لم نجد، نأخذ آخر إجراء متاح
      if (!targetProcedure) {
        targetProcedure = template[template.length - 1]
      }

      return {
        student,
        occurrence: occurrences + 1,
        procedure: targetProcedure,
      }
    })

    const groupsMap = assignments.reduce((map, assignment) => {
      const step = assignment.procedure.step
      if (!map.has(step)) {
        map.set(step, {
          procedure: assignment.procedure,
          students: [] as ProcedureAssignment[],
        })
      }

      map.get(step)!.students.push(assignment)
      return map
    }, new Map<number, ProcedureGroup>())

    const groups = Array.from(groupsMap.values()).sort(
      (first, second) => first.procedure.step - second.procedure.step,
    )

    const assignmentsByStudentId = assignments.reduce<Record<string, ProcedureAssignment>>((acc, assignment) => {
      acc[assignment.student.id] = assignment
      return acc
    }, {})

    return {
      assignments,
      groups,
      assignmentsByStudentId,
    }
  }, [selectedStudents, selectedDegree, selectedViolationType, violations, getProceduresForDegree])

  const procedureSummaryGroups = useMemo<ProcedureGroup[]>(() => {
    if (procedurePreview) {
      return procedurePreview.groups
    }

    if (selectedDegree) {
      const template = getProceduresForDegree(selectedDegree) ?? []
      return template.map((procedure) => ({
        procedure,
        students: [],
      }))
    }

    return []
  }, [procedurePreview, selectedDegree, getProceduresForDegree])

  const procedureAssignmentsByStudentId = procedurePreview?.assignmentsByStudentId ??
    ({} as Record<string, ProcedureAssignment>)

  const filteredViolations = useMemo(() => {
    const query = logSearch.trim()
    return violations.filter((violation) => {
      const matchesSearch = !query
        ? true
        : [
          violation.studentName,
          violation.studentNumber,
          violation.type,
          violation.location,
          violation.reportedBy,
        ]
          .filter(Boolean)
          .some((value) => value.includes(query))

      const matchesDegree = logDegree === 'all' ? true : violation.degree === logDegree
      const matchesStatus = logStatus === 'all' ? true : violation.status === logStatus
      const matchesGrade = logGrades.length === 0 ? true : logGrades.includes(violation.grade)

      return matchesSearch && matchesDegree && matchesStatus && matchesGrade
    })
  }, [violations, logSearch, logDegree, logStatus, logGrades])

  useEffect(() => {
    setLogPage(1)
  }, [logSearch, logDegree, logStatus, logGrades])

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / ITEMS_PER_PAGE))
  const pageSafe = Math.min(logPage, totalPages)
  const paginatedViolations = filteredViolations.slice(
    (pageSafe - 1) * ITEMS_PER_PAGE,
    pageSafe * ITEMS_PER_PAGE,
  )

  // استخراج الصفوف الفعلية من المخالفات
  const availableGrades = useMemo(() => {
    const grades = new Set(violations.map((v) => v.grade).filter(Boolean))
    return Array.from(grades).sort()
  }, [violations])

  const dashboardStats = useMemo(() => {
    const byStatus: Record<BehaviorStatus, number> = {
      'قيد المعالجة': 0,
      'جاري التنفيذ': 0,
      مكتملة: 0,
      ملغاة: 0,
    }

    const byDegree = BEHAVIOR_DEGREE_OPTIONS.reduce<Record<BehaviorDegree, number>>((acc, degree) => {
      acc[degree] = 0
      return acc
    }, {} as Record<BehaviorDegree, number>)

    violations.forEach((violation) => {
      byStatus[violation.status] += 1
      if (violation.degree in byDegree) {
        byDegree[violation.degree] += 1
      }
    })

    return {
      total: violations.length,
      byStatus,
      byDegree,
      recent: violations.slice(0, 5),
      uniqueStudents: new Set(violations.map((v) => v.studentId)).size,
    }
  }, [violations])

  const maxDegreeCount = Math.max(1, ...Object.values(dashboardStats.byDegree))

  const handleNextStep = () => {
    if (recordStep === 1 && selectedStudentIds.length === 0) {
      toast({ type: 'error', title: 'يرجى اختيار طالب واحد على الأقل' })
      return
    }
    if (recordStep === 2) {
      if (!selectedDegree) {
        toast({ type: 'error', title: 'حدد درجة المخالفة' })
        return
      }
      if (!selectedViolationType) {
        toast({ type: 'error', title: 'اختر نوع المخالفة' })
        return
      }
    }
    if (recordStep === 3 && !recordDetails.location) {
      toast({ type: 'error', title: 'اختر موقع المخالفة' })
      return
    }
    setRecordStep((prev) => clampRecordStep(prev + 1))
  }

  const handlePrevStep = () => {
    setRecordStep((prev) => clampRecordStep(prev - 1))
  }

  const resetRecordForm = () => {
    setRecordStep(1)
    setRecordStudentSearch('')
    setSelectedStudentIds([])
    setSelectedReporterId(null)
    setSelectedDegree(null)
    setSelectedViolationType('')
    setRecordDetails(initialDetails())
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    resetRecordForm()
  }

  const handleSubmitViolation = async () => {
    if (selectedStudentIds.length === 0 || !selectedDegree || !selectedViolationType) {
      toast({ type: 'error', title: 'أكمل بيانات المخالفة قبل الحفظ' })
      return
    }

    if (!selectedReporterId) {
      toast({ type: 'error', title: 'يرجى اختيار المبلغ (المعلم)' })
      return
    }

    try {
      const payload: CreateBehaviorViolationPayload = {
        studentIds: selectedStudentIds.map(id => Number(id)),
        reportedById: selectedReporterId,
        degree: selectedDegree,
        type: selectedViolationType,
        date: recordDetails.date,
        time: recordDetails.time || '',
        location: recordDetails.location,
        description: recordDetails.description || `تفاصيل المخالفة: ${selectedViolationType}`,
      }

      await createViolations(payload)

      const studentCount = selectedStudentIds.length
      toast({
        type: 'success',
        title: `تم رصد المخالفة بنجاح لـ ${studentCount} ${studentCount === 1 ? 'طالب' : 'طلاب'}`
      })
      handleCloseModal()
    } catch (error) {
      console.error('Error creating violation:', error)
      toast({ type: 'error', title: 'حدث خطأ أثناء حفظ المخالفة' })
    }
  }

  const handleDeleteViolation = async (violationId: string) => {
    const violation = violations.find((item) => item.id === violationId)
    const studentName = violation?.studentName ?? 'الطالب'

    const confirmed = window.confirm(`سيتم حذف المخالفة المسجلة للطالب ${studentName}. هل تريد المتابعة؟`)
    if (!confirmed) {
      return
    }

    try {
      setDeletingViolationId(violationId)
      await deleteViolation(violationId)
      toast({ type: 'success', title: 'تم حذف المخالفة بنجاح' })
    } catch (error) {
      console.error('Error deleting violation:', error)
      toast({ type: 'error', title: 'تعذر حذف المخالفة' })
    } finally {
      setDeletingViolationId(null)
    }
  }

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="سجل المخالفات"
        badge="السلوك والمواظبة"
        actions={
          <>
            <WsBtn icon={ListChecks} onClick={() => setIsProceduresModalOpen(true)}>
              المخالفات والإجراءات
            </WsBtn>
            <WsBtn variant="primary" icon={Plus} onClick={handleOpenModal}>
              رصد مخالفة
            </WsBtn>
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث" htmlFor="bh-q" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              id="bh-q"
              type="search"
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
              placeholder="الاسم، رقم الطالب، نوع المخالفة، المبلّغ..."
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search
              style={{
                width: 13,
                height: 13,
                position: 'absolute',
                insetInlineStart: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ws-text-2)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </WsField>
        <WsField label="الدرجة" htmlFor="bh-deg">
          <WsSelect
            id="bh-deg"
            value={logDegree === 'all' ? '' : logDegree}
            onChange={(event) =>
              setLogDegree(event.target.value === '' ? 'all' : (Number(event.target.value) as BehaviorDegree))
            }
          >
            <option value="">جميع الدرجات</option>
            {BEHAVIOR_DEGREE_OPTIONS.map((degree) => (
              <option key={degree} value={degree}>
                الدرجة {degree}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="الحالة" htmlFor="bh-st">
          <WsSelect
            id="bh-st"
            value={logStatus === 'all' ? '' : logStatus}
            onChange={(event) =>
              setLogStatus(event.target.value === '' ? 'all' : (event.target.value as BehaviorStatus))
            }
          >
            <option value="">جميع الحالات</option>
            {BEHAVIOR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="الصفوف">
          <div style={{ position: 'relative' }} ref={gradeDropdownRef}>
            <button
              type="button"
              className="ws-input"
              onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                minWidth: 130,
                cursor: 'pointer',
                background: logGrades.length > 0 ? chip(TONES.sky) : undefined,
                borderColor: logGrades.length > 0 ? TONES.sky.bd : undefined,
                color: logGrades.length > 0 ? TONES.sky.tx : undefined,
                fontWeight: logGrades.length > 0 ? 700 : undefined,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {logGrades.length === 0 ? 'جميع الصفوف' : `${logGrades.length} صف محدد`}
              </span>
              <ChevronDown
                style={{
                  width: 13,
                  height: 13,
                  flexShrink: 0,
                  transform: isGradeDropdownOpen ? 'rotate(180deg)' : undefined,
                  transition: 'transform .15s',
                }}
              />
            </button>
            {isGradeDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  insetInlineStart: 0,
                  minWidth: 190,
                  maxHeight: 260,
                  overflowY: 'auto',
                  background: 'var(--ws-surface)',
                  border: '1px solid var(--ws-border)',
                  borderRadius: 8,
                  zIndex: 50,
                }}
              >
                <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => setLogGrades([])}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--ws-accent)',
                    }}
                  >
                    إلغاء التحديد
                  </button>
                </div>
                {(availableGrades.length > 0 ? availableGrades : BEHAVIOR_GRADES).map((grade) => (
                  <label
                    key={grade}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={logGrades.includes(grade)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLogGrades((prev) => [...prev, grade])
                        } else {
                          setLogGrades((prev) => prev.filter((g) => g !== grade))
                        }
                      }}
                      style={{ width: 14, height: 14, accentColor: 'var(--ws-accent-2)' }}
                    />
                    {grade}
                  </label>
                ))}
              </div>
            )}
          </div>
        </WsField>
        <WsBtn icon={Download} onClick={() => toast({ type: 'info', title: 'ميزة التصدير قيد التطوير' })}>
          تصدير
        </WsBtn>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* حصيلة السلوك — لغة الإغناء: باستيل + رقاقة بيضاء + علامة مائية */}
          <WsBlock padded>
            <div className="ws-dashboard-cards">
              <DayCard
                icon={ClipboardList}
                label="المخالفات المرصودة"
                value={dashboardStats.total}
                tone={TONES.sky}
                hero
                context={
                  dashboardStats.uniqueStudents > 0
                    ? `على ${dashboardStats.uniqueStudents} طالباً مختلفاً`
                    : undefined
                }
                zeroContext="لا مخالفات مرصودة"
              />
              <DayCard
                icon={AlertCircle}
                label="قيد المعالجة"
                value={dashboardStats.byStatus['قيد المعالجة']}
                tone={TONES.amber}
                context="تنتظر بدء الإجراءات"
                zeroContext="لا شيء ينتظر"
              />
              <DayCard
                icon={ListChecks}
                label="جاري التنفيذ"
                value={dashboardStats.byStatus['جاري التنفيذ']}
                tone={TONES.purple}
                context="إجراءاتها تُنفَّذ الآن"
                zeroContext="لا إجراءات جارية"
              />
              <DayCard
                icon={CheckCircle}
                label="مكتملة"
                value={dashboardStats.byStatus['مكتملة']}
                tone={TONES.green}
                context="أُغلقت إجراءاتها كاملة"
                zeroContext="لم تكتمل أي حالة بعد"
              />
            </div>
          </WsBlock>

          <WsBlock fill scroll title="السجل" icon={ClipboardList} count={filteredViolations.length}>
            {paginatedViolations.length === 0 ? (
              <WsEmpty icon={ClipboardList}>
                {violations.length === 0 ? 'لا مخالفات مرصودة بعد' : 'لا نتائج مطابقة للبحث الحالي'}
              </WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>الرقم</th>
                    <th>الطالب</th>
                    <th style={{ width: 120 }}>الدرجة</th>
                    <th>نوع المخالفة</th>
                    <th style={{ width: 100 }}>التاريخ</th>
                    <th style={{ width: 110 }}>الحالة</th>
                    <th style={{ width: 84 }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedViolations.map((violation) => {
                    const pending = violation.status === 'قيد المعالجة'
                    return (
                      <tr
                        key={violation.id}
                        className="is-clickable"
                        onClick={() => navigate(`/admin/behavior/${violation.id}`)}
                        style={pending ? { background: chip(TONES.amber) } : undefined}
                      >
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ws-text-2)' }} title={violation.id}>
                          {violation.id.split('-')[0]}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{violation.studentName}</span>
                          <span className="ws-cell-sub">
                            {violation.grade} · {violation.class}
                          </span>
                        </td>
                        <td>
                          <ViolationBadge degree={violation.degree} size="sm" />
                        </td>
                        <td>{violation.type}</td>
                        <td>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{violation.date}</span>
                          <span className="ws-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {violation.time}
                          </span>
                        </td>
                        <td>
                          <ToneChip tone={STATUS_TONES[violation.status] ?? TONES.gray}>{violation.status}</ToneChip>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <span style={{ display: 'inline-flex', gap: 3 }}>
                            <WsIconBtn
                              icon={Eye}
                              label="عرض التفاصيل"
                              onClick={() => navigate(`/admin/behavior/${violation.id}`)}
                            />
                            <WsIconBtn
                              icon={deletingViolationId === violation.id ? Loader2 : Trash2}
                              label="حذف"
                              style={{ color: 'var(--ws-red)' }}
                              onClick={() => void handleDeleteViolation(violation.id)}
                              disabled={deletingViolationId === violation.id}
                            />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}

            {/* ترقيم الصفحات */}
            {filteredViolations.length > ITEMS_PER_PAGE && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '8px 14px',
                  borderTop: '1px solid var(--ws-hairline)',
                }}
              >
                <WsIconBtn
                  icon={ChevronRight}
                  label="السابق"
                  onClick={() => setLogPage(Math.max(1, pageSafe - 1))}
                  disabled={pageSafe === 1}
                />
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(0, 8)
                  .map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLogPage(item)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: `1px solid ${item === pageSafe ? TONES.sky.bd : 'var(--ws-hairline)'}`,
                        background: item === pageSafe ? chip(TONES.sky) : 'var(--ws-surface)',
                        color: item === pageSafe ? TONES.sky.tx : 'var(--ws-text-2)',
                        fontSize: 12.5,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        cursor: 'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                <WsIconBtn
                  icon={ChevronLeft}
                  label="التالي"
                  onClick={() => setLogPage(Math.min(totalPages, pageSafe + 1))}
                  disabled={pageSafe === totalPages}
                />
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* القسم الثاني: خريطة الدرجات + أحدث الرصد */}
        <WsSideCol side="end" title="خريطة السجل" icon={ListChecks} storageKey="ws:behavior:sidecol" width={300}>
          <WsBlock title="حسب الدرجة" icon={ClipboardList} padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BEHAVIOR_DEGREE_OPTIONS.map((degree) => {
                const count = dashboardStats.byDegree[degree] ?? 0
                const tone = DEGREE_TONES[degree] ?? TONES.gray
                return (
                  <div key={degree}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <ViolationBadge degree={degree} size="sm" />
                      </span>
                      <b
                        style={{
                          fontSize: 14,
                          fontVariantNumeric: 'tabular-nums',
                          color: count > 0 ? tone.tx : 'var(--ws-text-2)',
                        }}
                      >
                        {count}
                      </b>
                    </div>
                    <div
                      style={{
                        height: 6,
                        marginTop: 4,
                        borderRadius: 3,
                        background: 'var(--ws-surface-2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.round((count / maxDegreeCount) * 100)}%`,
                          background: tone.bd,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </WsBlock>

          <WsBlock title="أحدث الرصد" icon={ClipboardList} count={dashboardStats.recent.length || undefined} fill scroll>
            {dashboardStats.recent.length === 0 ? (
              <WsEmpty icon={ClipboardList}>لا مخالفات بعد</WsEmpty>
            ) : (
              <div>
                {dashboardStats.recent.map((violation) => (
                  <button
                    key={violation.id}
                    type="button"
                    onClick={() => navigate(`/admin/behavior/${violation.id}`)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'start',
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--ws-hairline)',
                      background: 'transparent',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'var(--ws-text)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13.5,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {violation.studentName}
                      </span>
                      <ViolationBadge degree={violation.degree} size="sm" />
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--ws-text-2)' }}>
                      {violation.type} · {violation.date}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* مرجع المخالفات والإجراءات */}
      {isProceduresModalOpen && (
        <div className="ws-modal" onClick={() => setIsProceduresModalOpen(false)}>
          <div
            className="ws-modal__panel"
            style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">المخالفات حسب الدرجة</h3>
              <p className="ws-modal__sub">مرجع المخالفات والإجراءات المعتمد في النظام</p>
            </header>

            <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {BEHAVIOR_DEGREE_OPTIONS.map((degree) => {
                const violationsByDegree = getViolationsForDegree(degree)
                const proceduresByDegree = getProceduresForDegree(degree)

                return (
                  <section key={degree} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <ViolationBadge degree={degree} size="md" />
                      <span style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>
                        {violationsByDegree.length} مخالفة · {proceduresByDegree.length} إجراء
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                      <div
                        style={{
                          borderRadius: 8,
                          border: '1px solid var(--ws-hairline)',
                          background: 'var(--ws-surface-2)',
                          padding: 10,
                        }}
                      >
                        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>أنواع المخالفات</p>
                        {violationsByDegree.length > 0 ? (
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {violationsByDegree.map((violation) => (
                              <li key={violation} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: (DEGREE_TONES[degree] ?? TONES.gray).tx,
                                    flexShrink: 0,
                                    marginTop: 6,
                                  }}
                                />
                                {violation}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد مخالفات محددة لهذه الدرجة.</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {proceduresByDegree.length > 0 ? (
                          proceduresByDegree.map((procedure) => (
                            <ProcedureCard key={procedure.step} procedure={procedure} />
                          ))
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد إجراءات محددة لهذه الدرجة.</p>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setIsProceduresModalOpen(false)}>إغلاق</WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* معالج رصد مخالفة جديدة */}
      {isModalOpen && (
        <div className="ws-modal" onClick={handleCloseModal}>
          <div
            className="ws-modal__panel"
            style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '88vh' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ws-modal__head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <h3 className="ws-modal__title">رصد مخالفة جديدة</h3>
                <p className="ws-modal__sub">نموذج الرصد الموحد — خمس خطوات حتى الحفظ</p>
              </div>
              <WsBtn size="sm" onClick={resetRecordForm}>
                إعادة التعيين
              </WsBtn>
            </header>

            {/* مؤشر الخطوات — المنجَز أخضر والحالي سماوي */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 6,
                padding: '8px 16px',
                borderBottom: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface-2)',
              }}
            >
              {RECORD_STEPS.map((step, index) => {
                const isActive = step.id === recordStep
                const isDone = step.id < recordStep
                const tone = isDone ? TONES.green : isActive ? TONES.sky : null
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setRecordStep(step.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px 4px 6px',
                        borderRadius: 999,
                        border: `1px solid ${tone ? tone.bd : 'var(--ws-hairline)'}`,
                        background: tone ? chip(tone) : 'var(--ws-surface)',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11.5,
                          fontWeight: 800,
                          background: tone ? 'var(--ws-surface)' : 'transparent',
                          border: tone ? 'none' : `1px solid ${TONES.gray.bd}`,
                          color: tone ? tone.tx : 'var(--ws-text-2)',
                        }}
                      >
                        {isDone ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : step.id}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: tone ? tone.tx : 'var(--ws-text-2)',
                        }}
                      >
                        {step.label}
                      </span>
                    </button>
                    {index !== RECORD_STEPS.length - 1 && (
                      <span style={{ width: 14, height: 1, background: 'var(--ws-border)' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* المحتوى */}
            <div className="ws-modal__body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {recordStep === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                      اختيار الطلاب ({selectedStudentIds.length} محدد)
                    </p>
                    {selectedStudentIds.length > 0 && (
                      <WsBtn size="sm" onClick={() => setSelectedStudentIds([])}>
                        إلغاء التحديد
                      </WsBtn>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <WsInput
                      type="search"
                      value={recordStudentSearch}
                      placeholder="ابحث بالاسم أو رقم الطالب"
                      onChange={(event) => setRecordStudentSearch(event.target.value)}
                      style={{ width: '100%', paddingInlineStart: 26 }}
                      autoFocus
                    />
                    <Search
                      style={{
                        width: 13,
                        height: 13,
                        position: 'absolute',
                        insetInlineStart: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--ws-text-2)',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  {isLoadingStudents ? (
                    <WsEmpty loading>جاري تحميل الطلاب...</WsEmpty>
                  ) : recordStudentSearch.trim() === '' ? (
                    <WsEmpty icon={Search}>
                      ابدأ بكتابة اسم الطالب أو رقمه لعرض النتائج واختيار الطلاب.
                    </WsEmpty>
                  ) : filteredStudents.length === 0 ? (
                    <WsEmpty icon={Search}>
                      لا نتائج مطابقة لـ «{recordStudentSearch}» — جرّب اسماً آخر أو رقم طالب مختلفاً.
                    </WsEmpty>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.id)
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentIds(prev =>
                                isSelected
                                  ? prev.filter(id => id !== student.id)
                                  : [...prev, student.id]
                              )
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: `1px solid ${isSelected ? TONES.green.bd : 'var(--ws-hairline)'}`,
                              background: isSelected ? chip(TONES.green) : 'var(--ws-surface)',
                              cursor: 'pointer',
                              font: 'inherit',
                              textAlign: 'start',
                              color: 'var(--ws-text)',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{student.name}</span>
                                <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', marginTop: 1 }}>
                                  {student.grade} · {student.class}
                                </span>
                              </span>
                              {isSelected && (
                                <CheckCircle style={{ width: 16, height: 16, color: TONES.green.tx, flexShrink: 0 }} />
                              )}
                            </span>
                            <span
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11.5,
                                color: 'var(--ws-text-2)',
                                borderTop: '1px solid var(--ws-hairline)',
                                paddingTop: 5,
                              }}
                            >
                              <span>المخالفات: {student.violationsCount}</span>
                              <span>السلوك: {student.behaviorScore}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {recordStep === 2 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>اختر درجة المخالفة</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                      {BEHAVIOR_DEGREE_OPTIONS.map((degree) => {
                        const isSelected = selectedDegree === degree
                        return (
                          <button
                            key={degree}
                            type="button"
                            onClick={() => {
                              setSelectedDegree(degree)
                              setSelectedViolationType('')
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '10px 8px',
                              borderRadius: 8,
                              border: `1px solid ${isSelected ? TONES.sky.bd : 'var(--ws-hairline)'}`,
                              background: isSelected ? chip(TONES.sky) : 'var(--ws-surface)',
                              cursor: 'pointer',
                              font: 'inherit',
                            }}
                          >
                            <ViolationBadge degree={degree} size="sm" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {selectedDegree ? (
                    <WsField label="نوع المخالفة" htmlFor="bh-type">
                      <WsSelect
                        id="bh-type"
                        value={selectedViolationType}
                        onChange={(event) => setSelectedViolationType(event.target.value)}
                      >
                        <option value="" disabled>
                          اختر نوع المخالفة
                        </option>
                        {availableViolations.map((violation) => (
                          <option key={violation} value={violation}>
                            {violation}
                          </option>
                        ))}
                      </WsSelect>
                    </WsField>
                  ) : null}
                </div>
              ) : null}

              {recordStep === 3 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <WsField label="التاريخ" htmlFor="bh-date">
                    <WsInput
                      id="bh-date"
                      type="date"
                      value={recordDetails.date}
                      onChange={(event) => setRecordDetails((prev) => ({ ...prev, date: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="الوقت" htmlFor="bh-time">
                    <WsInput
                      id="bh-time"
                      type="time"
                      value={recordDetails.time}
                      onChange={(event) => setRecordDetails((prev) => ({ ...prev, time: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="الموقع" htmlFor="bh-loc">
                    <WsSelect
                      id="bh-loc"
                      value={recordDetails.location}
                      onChange={(event) => setRecordDetails((prev) => ({ ...prev, location: event.target.value }))}
                    >
                      <option value="" disabled>
                        اختر موقع المخالفة
                      </option>
                      {BEHAVIOR_LOCATIONS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </WsSelect>
                  </WsField>
                  <WsField label="المبلّغ عن الحالة" htmlFor="bh-rep">
                    <WsSelect
                      id="bh-rep"
                      value={selectedReporterId || ''}
                      onChange={(event) => setSelectedReporterId(event.target.value ? Number(event.target.value) : null)}
                    >
                      <option value="" disabled>
                        اختر المبلّغ
                      </option>
                      {reporters.map((reporter) => (
                        <option key={reporter.id} value={reporter.id}>
                          {reporter.name}
                        </option>
                      ))}
                    </WsSelect>
                  </WsField>
                  <WsField label="الوصف التفصيلي" htmlFor="bh-desc" style={{ gridColumn: '1 / -1' }}>
                    <WsTextarea
                      id="bh-desc"
                      rows={4}
                      value={recordDetails.description}
                      onChange={(event) => setRecordDetails((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="أدخل وصفاً مختصراً للحالة"
                    />
                  </WsField>
                </div>
              ) : null}

              {recordStep === 4 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <WsAlert tone="info" boxed>
                    يتحدد الإجراء التالي تلقائياً بناءً على سجل كل طالب — ويمكن تحديث حالة التنفيذ لاحقاً من صفحة التفاصيل.
                  </WsAlert>
                  {procedurePreview && procedurePreview.groups.length > 0 ? (
                    procedurePreview.groups.map(({ procedure, students }) => (
                      <div key={procedure.step} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <ProcedureCard procedure={procedure} />
                        <div
                          style={{
                            borderRadius: 8,
                            border: '1px solid var(--ws-hairline)',
                            background: 'var(--ws-surface-2)',
                            padding: '8px 12px',
                            fontSize: 12.5,
                          }}
                        >
                          <p style={{ margin: '0 0 4px', fontWeight: 700 }}>
                            سيطبق على {students.length} {students.length === 1 ? 'طالب' : 'طلاب'}:
                          </p>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {students.map(({ student, occurrence }) => (
                              <li key={student.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{student.name}</span>
                                <span style={{ color: 'var(--ws-text-2)', fontSize: 12 }}>المخالفة رقم {occurrence}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  ) : (
                    availableProcedures.map((procedure) => (
                      <ProcedureCard key={procedure.step} procedure={procedure} />
                    ))
                  )}
                </div>
              ) : null}

              {recordStep === 5 && selectedStudents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <WsAlert tone="success" boxed icon={CheckCircle2}>
                    راجع البيانات قبل الحفظ النهائي — ستُسجَّل المخالفة لـ {selectedStudents.length}{' '}
                    {selectedStudents.length === 1 ? 'طالب' : 'طلاب'}.
                  </WsAlert>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    <div style={{ borderRadius: 8, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>
                        الطلاب المحددون ({selectedStudents.length})
                      </h4>
                      <div style={{ maxHeight: 170, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedStudents.map((student) => {
                          const assignment = procedureAssignmentsByStudentId[student.id]
                          return (
                            <div
                              key={student.id}
                              style={{
                                borderRadius: 7,
                                background: chip(TONES.sky),
                                border: `1px solid ${TONES.sky.bd}`,
                                padding: '6px 10px',
                              }}
                            >
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{student.name}</p>
                              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                                {student.studentId} · {student.grade} {student.class}
                              </p>
                              {assignment ? (
                                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TONES.sky.tx }}>
                                  المخالفة رقم {assignment.occurrence} · الإجراء: {assignment.procedure.title}
                                </p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ borderRadius: 8, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>تفاصيل المخالفة</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 }}>
                        {selectedDegree ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <b>الدرجة:</b>
                            <ViolationBadge degree={selectedDegree} size="sm" />
                          </div>
                        ) : null}
                        <p style={{ margin: 0 }}><b>النوع:</b> {selectedViolationType}</p>
                        <p style={{ margin: 0 }}><b>التاريخ:</b> {recordDetails.date}</p>
                        <p style={{ margin: 0 }}><b>الوقت:</b> {recordDetails.time}</p>
                        <p style={{ margin: 0 }}><b>الموقع:</b> {recordDetails.location}</p>
                        {selectedReporterId && (
                          <p style={{ margin: 0 }}>
                            <b>المبلّغ:</b> {reporters.find(r => r.id === selectedReporterId)?.name || 'غير محدد'}
                          </p>
                        )}
                        {recordDetails.description ? (
                          <p style={{ margin: 0 }}><b>الوصف:</b> {recordDetails.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderRadius: 8, border: '1px solid var(--ws-hairline)', padding: 10 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700 }}>
                      الإجراءات ({procedureSummaryGroups.length})
                    </h4>
                    {procedureSummaryGroups.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>لا توجد إجراءات محددة لهذه الدرجة.</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {procedureSummaryGroups.map(({ procedure, students }) => (
                          <li
                            key={procedure.step}
                            style={{
                              borderRadius: 7,
                              border: '1px solid var(--ws-hairline)',
                              background: 'var(--ws-surface-2)',
                              padding: '8px 10px',
                            }}
                          >
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{procedure.title}</span>
                            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--ws-text-2)' }}>
                              {procedure.description}
                            </span>
                            {procedurePreview && students.length > 0 ? (
                              <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                                يستهدف {students.length === 1 ? 'طالباً واحداً' : `${students.length} طلاب`}{' '}
                                ({students
                                  .map(({ student, occurrence }) => `${student.name} - المخالفة رقم ${occurrence}`)
                                  .join('، ')})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* أزرار التنقل */}
            <footer className="ws-modal__foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <WsBtn icon={ChevronRight} onClick={handlePrevStep} disabled={recordStep === 1}>
                السابق
              </WsBtn>
              <span style={{ fontSize: 12, color: 'var(--ws-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                الخطوة {recordStep} من {RECORD_STEPS.length}
              </span>
              <WsBtn
                variant="primary"
                icon={recordStep === 5 ? CheckCircle2 : ChevronLeft}
                onClick={recordStep < 5 ? handleNextStep : () => void handleSubmitViolation()}
                disabled={isCreating}
              >
                {isCreating ? 'جاري الحفظ...' : recordStep === 5 ? 'تأكيد وحفظ' : 'التالي'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

/** بطاقة إجراء — رقم الخطوة رقاقة سماوية، والإلزامية تلبس الأحمر */
function ProcedureCard({ procedure }: { procedure: BehaviorProcedureDefinition }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--ws-hairline)',
        background: 'var(--ws-surface)',
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            background: chip(TONES.sky),
            color: TONES.sky.tx,
          }}
        >
          {procedure.step}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700 }}>
            {procedure.title}
            <ToneChip tone={procedure.mandatory ? TONES.red : TONES.sky}>
              {procedure.mandatory ? 'إلزامي' : 'اختياري'}
            </ToneChip>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ws-text-2)' }}>{procedure.description}</p>
          {procedure.tasks && procedure.tasks.length > 0 ? (
            <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {procedure.tasks.map((task) => (
                <li key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--ws-text-2)' }}>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--ws-accent-2)',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <span>
                    {task.title}
                    {!task.mandatory ? (
                      <span style={{ marginInlineStart: 4, fontSize: 10.5, color: 'var(--ws-text-2)' }}>(اختياري)</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
