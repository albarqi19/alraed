import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  ListChecks,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
import { ViolationBadge } from '@/modules/admin/behavior/components/violation-badge'
import {
  BEHAVIOR_DEGREE_OPTIONS,
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

const STATUS_COLORS: Record<BehaviorStatus, string> = {
  'قيد المعالجة': 'bg-amber-50 text-amber-700 border border-amber-200',
  'جاري التنفيذ': 'bg-sky-50 text-sky-700 border border-sky-200',
  مكتملة: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ملغاة: 'bg-slate-50 text-slate-600 border border-slate-200',
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
  const [logPage, setLogPage] = useState(1)

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

      return matchesSearch && matchesDegree && matchesStatus
    })
  }, [violations, logSearch, logDegree, logStatus])

  useEffect(() => {
    setLogPage(1)
  }, [logSearch, logDegree, logStatus])

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / ITEMS_PER_PAGE))
  const pageSafe = Math.min(logPage, totalPages)
  const paginatedViolations = filteredViolations.slice(
    (pageSafe - 1) * ITEMS_PER_PAGE,
    pageSafe * ITEMS_PER_PAGE,
  )

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
    }
  }, [violations])

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
    <section className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">السلوك والمخالفات</h1>
          <p className="text-sm text-muted">
            لوحة موحدة لرصد المخالفات، البحث عن الطلاب، واستعراض السجل السلوكي في صفحة واحدة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProceduresModalOpen(true)}
            className="button-secondary flex items-center gap-2 text-sm"
          >
            <ListChecks className="h-5 w-5" />
            المخالفات والإجراءات
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="button-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            إضافة مخالفة سلوكية
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي المخالفات" value={dashboardStats.total} icon={<ClipboardList className="h-5 w-5" />} accent="bg-emerald-500/10 text-emerald-700 border border-emerald-200" />
        <StatCard title="قيد المعالجة" value={dashboardStats.byStatus['قيد المعالجة']} icon={<AlertCircle className="h-5 w-5" />} accent="bg-amber-500/10 text-amber-700 border border-amber-200" />
        <StatCard title="مكتملة" value={dashboardStats.byStatus['مكتملة']} icon={<CheckCircle className="h-5 w-5" />} accent="bg-sky-500/10 text-sky-700 border border-sky-200" />
        <StatCard title="عدد الطلاب" value={students.length} icon={<Users className="h-5 w-5" />} accent="bg-slate-500/10 text-slate-700 border border-slate-200" />
      </div>

      <div className="glass-card space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary-700">سجل المخالفات</p>
            <h2 className="text-xl font-bold text-slate-900">البحث والاستعراض</h2>
          </div>
          <button type="button" className="button-secondary flex items-center gap-2 text-sm" onClick={() => toast({ type: 'info', title: 'ميزة التصدير قيد التطوير' })}>
            <Download className="h-4 w-4" />
            تصدير البيانات
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="search"
                value={logSearch}
                placeholder="ابحث بالاسم، رقم الطالب، أو نوع المخالفة"
                onChange={(event) => setLogSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            </div>
          </div>
          <div>
            <select
              value={logDegree === 'all' ? '' : logDegree}
              onChange={(event) =>
                setLogDegree(event.target.value === '' ? 'all' : (Number(event.target.value) as BehaviorDegree))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">جميع الدرجات</option>
              {BEHAVIOR_DEGREE_OPTIONS.map((degree) => (
                <option key={degree} value={degree}>
                  الدرجة {degree}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={logStatus === 'all' ? '' : logStatus}
              onChange={(event) =>
                setLogStatus(event.target.value === '' ? 'all' : (event.target.value as BehaviorStatus))
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">جميع الحالات</option>
              {BEHAVIOR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 text-right">رقم المخالفة</th>
                <th scope="col" className="px-6 py-3 text-right">الطالب</th>
                <th scope="col" className="px-6 py-3 text-right">الدرجة</th>
                <th scope="col" className="px-6 py-3 text-right">نوع المخالفة</th>
                <th scope="col" className="px-6 py-3 text-right">التاريخ</th>
                <th scope="col" className="px-6 py-3 text-right">الحالة</th>
                <th scope="col" className="px-6 py-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedViolations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted">
                    لا توجد نتائج مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                paginatedViolations.map((violation) => (
                  <tr key={violation.id} className="transition hover:bg-primary/5">
                    <td className="px-6 py-4 font-mono text-xs text-muted" title={violation.id}>
                      {violation.id.split('-')[0]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{violation.studentName}</p>
                        <p className="text-xs text-muted">{violation.studentNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ViolationBadge degree={violation.degree} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-xs text-muted">{violation.type}</td>
                    <td className="px-6 py-4 text-xs text-muted">
                      <div className="space-y-1">
                        <p>{violation.date}</p>
                        <p>{violation.time}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[violation.status]}`}>
                        {violation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/behavior/${violation.id}`}
                          className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                          عرض التفاصيل
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteViolation(violation.id)}
                          disabled={deletingViolationId === violation.id}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredViolations.length > 0 ? (
          <Pagination
            page={pageSafe}
            totalPages={totalPages}
            onChange={(value) => setLogPage(value)}
          />
        ) : null}
      </div>

      {isProceduresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold text-primary-700">مرجع المخالفات والإجراءات</p>
                <h2 className="text-xl font-bold text-slate-900">المخالفات حسب الدرجة</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProceduresModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {BEHAVIOR_DEGREE_OPTIONS.map((degree) => {
                const violationsByDegree = getViolationsForDegree(degree)
                const proceduresByDegree = getProceduresForDegree(degree)

                return (
                  <section key={degree} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ViolationBadge degree={degree} size="md" />
                        <span className="text-sm font-semibold text-slate-700">الدرجة {degree}</span>
                      </div>
                      <span className="text-xs text-muted">
                        {violationsByDegree.length} مخالفة • {proceduresByDegree.length} إجراء
                      </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-700">أنواع المخالفات</p>
                        {violationsByDegree.length > 0 ? (
                          <ul className="mt-2 space-y-2 text-sm text-muted">
                            {violationsByDegree.map((violation) => (
                              <li key={violation} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                                <span>{violation}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted">لا توجد مخالفات محددة لهذه الدرجة.</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        {proceduresByDegree.length > 0 ? (
                          proceduresByDegree.map((procedure) => (
                            <ProcedureCard key={procedure.step} procedure={procedure} />
                          ))
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-muted shadow-sm">
                            لا توجد إجراءات محددة لهذه الدرجة.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding new violation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
              <div>
                <p className="text-xs font-semibold text-primary-700">رصد مخالفة جديدة</p>
                <h2 className="text-xl font-bold text-slate-900">نموذج الرصد الموحد</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={resetRecordForm} className="button-secondary text-sm">
                  إعادة التعيين
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              {/* مؤشر الخطوات */}
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/30">
                <div className="flex items-center justify-center gap-1.5">
                  {RECORD_STEPS.map((step, index) => {
                    const isActive = step.id === recordStep
                    const isDone = step.id < recordStep
                    return (
                      <div key={step.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRecordStep(step.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${isActive
                              ? 'bg-primary text-white shadow-sm'
                              : isDone
                                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          {step.id}
                        </button>
                        <span className={`text-[11px] font-semibold ${isActive ? 'text-primary-700' : 'text-muted'}`}>
                          {step.label}
                        </span>
                        {index !== RECORD_STEPS.length - 1 && (
                          <span className="h-px w-4 bg-slate-200 mx-0.5" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {recordStep === 1 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        اختيار الطلاب ({selectedStudentIds.length} محدد)
                      </p>
                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="text-xs text-primary hover:underline"
                        >
                          إلغاء التحديد
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="search"
                        value={recordStudentSearch}
                        placeholder="ابحث بالاسم أو رقم الطالب"
                        onChange={(event) => setRecordStudentSearch(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {isLoadingStudents ? (
                        <div className="col-span-full py-12 text-center">
                          <div className="inline-flex items-center gap-2 text-sm text-muted">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                            جاري تحميل الطلاب...
                          </div>
                        </div>
                      ) : recordStudentSearch.trim() === '' ? (
                        <div className="col-span-full py-16 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Search className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mb-2">ابحث عن الطالب</h3>
                          <p className="text-sm text-muted max-w-md mx-auto">
                            ابدأ بكتابة اسم الطالب أو رقمه في حقل البحث أعلاه لعرض النتائج واختيار الطلاب
                          </p>
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="col-span-full py-12 text-center">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                            <Search className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-muted">
                            لا توجد نتائج مطابقة لـ "<span className="font-semibold text-slate-700">{recordStudentSearch}</span>"
                          </p>
                          <p className="text-xs text-muted mt-1">جرب البحث باسم آخر أو رقم طالب مختلف</p>
                        </div>
                      ) : (
                        filteredStudents.map((student) => {
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
                              className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-right transition ${isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-primary/50'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                                  <p className="text-xs text-muted mt-0.5">{student.grade} • {student.class}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-slate-100">
                                <span>المخالفات: {student.violationsCount}</span>
                                <span>السلوك: {student.behaviorScore}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                {recordStep === 2 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">اختر درجة المخالفة</p>
                      <div className="grid gap-3 md:grid-cols-5">
                        {BEHAVIOR_DEGREE_OPTIONS.map((degree) => (
                          <button
                            key={degree}
                            type="button"
                            onClick={() => {
                              setSelectedDegree(degree)
                              setSelectedViolationType('')
                            }}
                            className={`rounded-2xl border px-3 py-3 transition ${selectedDegree === degree
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-primary/50'
                              }`}
                          >
                            <ViolationBadge degree={degree} size="sm" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDegree ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">نوع المخالفة</p>
                        <select
                          value={selectedViolationType}
                          onChange={(event) => setSelectedViolationType(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="" disabled>
                            اختر نوع المخالفة
                          </option>
                          {availableViolations.map((violation) => (
                            <option key={violation} value={violation}>
                              {violation}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {recordStep === 3 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">التاريخ</label>
                      <input
                        type="date"
                        value={recordDetails.date}
                        onChange={(event) => setRecordDetails((prev) => ({ ...prev, date: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الوقت</label>
                      <input
                        type="time"
                        value={recordDetails.time}
                        onChange={(event) => setRecordDetails((prev) => ({ ...prev, time: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الموقع</label>
                      <select
                        value={recordDetails.location}
                        onChange={(event) => setRecordDetails((prev) => ({ ...prev, location: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="" disabled>
                          اختر موقع المخالفة
                        </option>
                        {BEHAVIOR_LOCATIONS.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">المبلغ عن الحالة (المعلم)</label>
                      <select
                        value={selectedReporterId || ''}
                        onChange={(event) => setSelectedReporterId(event.target.value ? Number(event.target.value) : null)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="" disabled>
                          اختر المعلم المبلغ
                        </option>
                        {reporters.map((reporter) => (
                          <option key={reporter.id} value={reporter.id}>
                            {reporter.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الوصف التفصيلي</label>
                      <textarea
                        value={recordDetails.description}
                        onChange={(event) => setRecordDetails((prev) => ({ ...prev, description: event.target.value }))}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="أدخل وصفاً مختصراً للحالة"
                      />
                    </div>
                  </div>
                ) : null}

                {recordStep === 4 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-sm text-sky-700">
                      يتم تحديد الإجراء التالي تلقائياً بناءً على سجل كل طالب. يمكن تحديث حالة التنفيذ لاحقاً من صفحة تفاصيل المخالفة.
                    </div>
                    <div className="space-y-3">
                      {procedurePreview && procedurePreview.groups.length > 0 ? (
                        procedurePreview.groups.map(({ procedure, students }) => (
                          <div key={procedure.step} className="space-y-3">
                            <ProcedureCard procedure={procedure} />
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-muted">
                              <p className="font-semibold text-slate-600">
                                سيطبق على {students.length} {students.length === 1 ? 'طالباً' : 'طلاباً'}:
                              </p>
                              <ul className="mt-2 space-y-1">
                                {students.map(({ student, occurrence }) => (
                                  <li key={student.id} className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-slate-700">{student.name}</span>
                                    <span className="text-[11px] text-muted">المخالفة رقم {occurrence}</span>
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
                  </div>
                ) : null}

                {recordStep === 5 && selectedStudents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                      راجع البيانات التالية قبل الحفظ النهائي. سيتم تسجيل المخالفة لـ {selectedStudents.length} {selectedStudents.length === 1 ? 'طالب' : 'طلاب'}.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700">الطلاب المحددون ({selectedStudents.length})</h3>
                        <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                          {selectedStudents.map((student) => {
                            const assignment = procedureAssignmentsByStudentId[student.id]
                            return (
                              <div key={student.id} className="text-sm border-r-2 border-primary pr-3 py-1">
                                <p className="font-semibold text-slate-900">{student.name}</p>
                                <p className="text-xs text-muted">
                                  {student.studentId} • {student.grade} {student.class}
                                </p>
                                {assignment ? (
                                  <p className="text-[11px] text-muted">
                                    المخالفة رقم {assignment.occurrence} • الإجراء: {assignment.procedure.title}
                                  </p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700">تفاصيل المخالفة</h3>
                        <div className="mt-3 space-y-2 text-sm text-muted">
                          {selectedDegree ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">الدرجة:</span>
                              <ViolationBadge degree={selectedDegree} size="sm" />
                            </div>
                          ) : null}
                          <p>
                            <span className="font-semibold text-slate-900">النوع:</span> {selectedViolationType}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">التاريخ:</span> {recordDetails.date}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">الوقت:</span> {recordDetails.time}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">الموقع:</span> {recordDetails.location}
                          </p>
                          {selectedReporterId && (
                            <p>
                              <span className="font-semibold text-slate-900">المبلغ:</span>{' '}
                              {reporters.find(r => r.id === selectedReporterId)?.name || 'غير محدد'}
                            </p>
                          )}
                          {recordDetails.description ? (
                            <p>
                              <span className="font-semibold text-slate-900">الوصف:</span> {recordDetails.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700">الإجراءات ({procedureSummaryGroups.length})</h3>
                        {procedureSummaryGroups.length === 0 ? (
                          <p className="mt-3 text-sm text-muted">لا توجد إجراءات محددة لهذه الدرجة.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 pr-1 text-sm text-muted">
                            {procedureSummaryGroups.map(({ procedure, students }) => (
                              <li
                                key={procedure.step}
                                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                              >
                                <div className="font-semibold text-slate-900">{procedure.title}</div>
                                <p className="mt-1 text-xs text-muted">{procedure.description}</p>
                                {procedurePreview && students.length > 0 ? (
                                  <p className="mt-2 text-[11px] text-muted">
                                    يستهدف {students.length === 1 ? 'طالباً واحداً' : `${students.length} طلاب`}{' '}
                                    ({students
                                      .map(({ student, occurrence }) => `${student.name} - المخالفة رقم ${occurrence}`)
                                      .join('، ')})
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* أزرار التنقل */}
              <div className="border-t border-slate-200 px-6 py-3 bg-white rounded-b-3xl">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="button-secondary flex items-center gap-1 text-sm"
                    disabled={recordStep === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </button>
                  <div className="text-xs text-muted font-medium">
                    الخطوة {recordStep} من {RECORD_STEPS.length}
                  </div>
                  <button
                    type="button"
                    onClick={recordStep < 5 ? handleNextStep : handleSubmitViolation}
                    disabled={isCreating}
                    className={`button-primary flex items-center gap-1 text-sm ${recordStep === 5 ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                      } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCreating ? 'جاري الحفظ...' : recordStep === 5 ? 'تأكيد وحفظ' : 'التالي'}
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: ReactNode
  accent: string
}

function StatCard({ title, value, icon, accent }: StatCardProps) {
  return (
    <article className={`rounded-2xl border bg-white/80 p-5 shadow-sm ${accent}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString('en-US')}</p>
        </div>
        <span className="rounded-full bg-white/60 p-2 text-primary">{icon}</span>
      </div>
    </article>
  )
}

function ProcedureCard({ procedure }: { procedure: BehaviorProcedureDefinition }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {procedure.step}
        </span>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            {procedure.title}
            {procedure.mandatory ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                إلزامي
              </span>
            ) : (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                اختياري
              </span>
            )}
          </p>
          <p className="text-muted">{procedure.description}</p>
          {procedure.tasks && procedure.tasks.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {procedure.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                  <span>
                    {task.title}
                    {!task.mandatory ? (
                      <span className="mr-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        اختياري
                      </span>
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

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (value: number) => void }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 8)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        className="button-secondary flex items-center gap-1"
        disabled={page === 1}
      >
        <ChevronRight className="h-4 w-4" />
        السابق
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`h-10 w-10 rounded-full text-sm font-semibold transition ${item === page ? 'bg-primary text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-primary/10'
            }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="button-secondary flex items-center gap-1"
        disabled={page === totalPages}
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  )
}
