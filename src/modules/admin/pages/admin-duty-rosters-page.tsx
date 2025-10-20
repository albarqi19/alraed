import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CalendarClock, Users, BellRing, RotateCcw, Loader2 } from 'lucide-react'

import { DutyRosterSettingsPanel } from '@/modules/admin/components/duty-roster-settings-panel'
import { DutyRosterTemplatesPanel } from '@/modules/admin/components/duty-roster-templates-panel'

import {
  useAssignDutyRosterReplacementMutation,
  useCreateDutyRosterMutation,
  useDutyRostersQuery,
  useDutyRosterTemplatesQuery,
  useMarkDutyRosterAssignmentAbsentMutation,
} from '@/modules/admin/hooks'
import type {
  DutyRosterAssignmentRecord,
  DutyRosterAssignmentStatus,
  DutyRosterShiftRecord,
  DutyRosterStatus,
  DutyRosterTemplateAssignmentRecord,
  DutyRosterTemplateRecord,
  DutyRosterWeekday,
} from '@/modules/admin/types'
import { useToast } from '@/shared/feedback/use-toast'

type FilterState = {
  shiftType: string
  status: DutyRosterStatus | 'all'
  assignmentStatus: DutyRosterAssignmentStatus | 'all'
  date: string
}

const STATUS_LABELS: Record<DutyRosterAssignmentStatus, string> = {
  scheduled: 'مجدولة',
  absent: 'تم تسجيل غياب',
  replacement_assigned: 'بديل معين',
  completed: 'مكتملة',
}

const STATUS_BADGE_STYLES: Record<DutyRosterAssignmentStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600',
  absent: 'bg-rose-100 text-rose-700',
  replacement_assigned: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

const SHIFT_STATUS_LABELS: Record<DutyRosterStatus, string> = {
  scheduled: 'مجدولة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

const DUTY_ROSTER_WEEKDAY_KEYS: DutyRosterWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function getDutyRosterWeekdayKey(dateString: string): DutyRosterWeekday {
  const date = new Date(dateString)
  const dayIndex = Number.isNaN(date.getTime()) ? 0 : date.getDay()
  return DUTY_ROSTER_WEEKDAY_KEYS[dayIndex] ?? 'sunday'
}

type TemplateAutoCreatePlan = {
  key: string
  template: DutyRosterTemplateRecord
  targetDate: string
  weekdayKey: DutyRosterWeekday
  assignments: DutyRosterTemplateAssignmentRecord[]
}

export function AdminDutyRostersPage() {
  const toast = useToast()
  const [activeView, setActiveView] = useState<'shifts' | 'templates'>('shifts')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    shiftType: '',
    status: 'all',
    assignmentStatus: 'all',
    date: '',
  })

  const dutyRostersQuery = useDutyRostersQuery()
  const markAbsentMutation = useMarkDutyRosterAssignmentAbsentMutation()
  const assignReplacementMutation = useAssignDutyRosterReplacementMutation()
  const dutyRosterTemplatesQuery = useDutyRosterTemplatesQuery({}, { enabled: activeView === 'shifts' })

  const shifts = useMemo<DutyRosterShiftRecord[]>(
    () => dutyRostersQuery.data?.items ?? [],
    [dutyRostersQuery.data],
  )
  const isLoading = dutyRostersQuery.isLoading
  const isFetching = dutyRostersQuery.isFetching
  const isError = dutyRostersQuery.isError
  const errorMessage = dutyRostersQuery.error instanceof Error ? dutyRostersQuery.error.message : 'حدث خطأ غير متوقع'

  const filteredShifts = useMemo<DutyRosterShiftRecord[]>(() => {
    return shifts.filter((shift) => {
      if (filters.shiftType && !shift.shift_type.toLowerCase().includes(filters.shiftType.toLowerCase())) {
        return false
      }
      if (filters.status !== 'all' && shift.status !== filters.status) {
        return false
      }
      if (filters.date && shift.shift_date !== filters.date) {
        return false
      }
      if (filters.assignmentStatus !== 'all') {
        const hasMatchingAssignment = shift.assignments.some(
          (assignment) => assignment.status === filters.assignmentStatus,
        )
        if (!hasMatchingAssignment) return false
      }
      return true
    })
  }, [shifts, filters])

  const upcomingCount = filteredShifts.filter((shift) => shift.status === 'scheduled').length
  const absenceCount = filteredShifts.reduce((sum, shift) => {
    const absentAssignments = shift.assignments.filter((assignment) => assignment.status === 'absent').length
    return sum + absentAssignments
  }, 0)
  const replacementCount = filteredShifts.reduce((sum, shift) => {
    const replacementAssignments = shift.assignments.filter(
      (assignment) => assignment.status === 'replacement_assigned',
    ).length
    return sum + replacementAssignments
  }, 0)

  const templateAutoCreatePlans = useMemo<TemplateAutoCreatePlan[]>(
    () => {
      if (!dutyRosterTemplatesQuery.data || activeView !== 'shifts') return []

      const statusMatches = filters.status === 'all' || filters.status === 'scheduled'
      const assignmentStatusMatches =
        filters.assignmentStatus === 'all' || filters.assignmentStatus === 'scheduled'

      if (!statusMatches || !assignmentStatusMatches) return []

      const normalizedShiftType = filters.shiftType.trim().toLowerCase()
      const targetDate =
        filters.date && filters.date.trim().length > 0 ? filters.date : new Date().toISOString().slice(0, 10)
      const weekdayKey = getDutyRosterWeekdayKey(targetDate)
      
      // Create a more comprehensive key check based on date + shift_type (matching DB unique constraint)
      const existingKeys = new Set(
        shifts.map((shift) => `${shift.shift_date}::${shift.shift_type.toLowerCase()}`),
      )

      return dutyRosterTemplatesQuery.data
        .filter((template) => template.is_active)
        .filter((template) =>
          !normalizedShiftType || template.shift_type.toLowerCase().includes(normalizedShiftType),
        )
        .map((template) => {
          const assignments = (template.weekday_assignments[weekdayKey] ?? []) as DutyRosterTemplateAssignmentRecord[]
          const activeAssignments = assignments.filter((assignment) => assignment.is_active)
          const key = `${targetDate}::${template.shift_type.toLowerCase()}`

          return {
            key,
            template,
            targetDate,
            weekdayKey,
            assignments: activeAssignments,
          }
        })
        .filter((plan) => plan.assignments.length > 0 && !existingKeys.has(plan.key))
    },
    [
      dutyRosterTemplatesQuery.data,
      activeView,
      shifts,
      filters.status,
      filters.assignmentStatus,
      filters.shiftType,
      filters.date,
    ],
  )

  const autoCreateDutyRosterMutation = useCreateDutyRosterMutation()
  const autoCreateAttemptsRef = useRef<Set<string>>(new Set())
  const hasAutoCreatedRef = useRef(false)

  // Automatically create daily shifts from active templates when no concrete shift exists for the filtered date.
  useEffect(() => {
    if (activeView !== 'shifts') return
    if (templateAutoCreatePlans.length === 0) {
      hasAutoCreatedRef.current = false
      return
    }
    
    // Prevent running auto-creation more than once per mount
    if (hasAutoCreatedRef.current) return
    hasAutoCreatedRef.current = true

    let isCancelled = false

    const runAutoCreation = async () => {
      for (const plan of templateAutoCreatePlans) {
        if (autoCreateAttemptsRef.current.has(plan.key)) continue

        const assignmentsPayload = plan.assignments.map((assignment) => ({
          user_id: assignment.user_id,
          assignment_role: assignment.assignment_role,
        }))

        if (assignmentsPayload.length === 0) {
          continue
        }

        autoCreateAttemptsRef.current.add(plan.key)

        const windowStart = plan.template.window_start ?? '07:00'
        const windowEnd = plan.template.window_end ?? '08:00'
        const formattedTargetDate = new Date(plan.targetDate).toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        try {
          await autoCreateDutyRosterMutation.mutateAsync({
            shift_type: plan.template.shift_type,
            shift_date: plan.targetDate,
            window_start: windowStart,
            window_end: windowEnd,
            trigger_time: null,
            status: 'scheduled' as DutyRosterStatus,
            reminder_offset_minutes: plan.template.trigger_offset_minutes ?? 120,
            template_id: plan.template.id,
            assignments: assignmentsPayload,
          })

          if (isCancelled) return

          // Refetch to get the newly created shift
          await dutyRostersQuery.refetch()
          
          // Don't show success toast since the shift was created (even with server error)
        } catch (error: unknown) {
          if (isCancelled) return

          // Check if it's an axios error with response
          const isAxiosError = error && typeof error === 'object' && 'response' in error
          const statusCode = isAxiosError ? (error as { response?: { status?: number } }).response?.status : null

          // If 500 error, the shift might still be created - refetch to check
          if (statusCode === 500) {
            await dutyRostersQuery.refetch()
            // Don't remove from attempts - it might have been created
          } else {
            // For other errors, allow retry
            autoCreateAttemptsRef.current.delete(plan.key)
            
            toast({
              type: 'error',
              title: 'تعذر إنشاء المناوبة من القالب',
              description: `${plan.template.name} - ${formattedTargetDate}`,
            })
          }
        }
      }
    }

    void runAutoCreation()

    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeView,
    // Only re-run when the plan keys change, not the entire object
    templateAutoCreatePlans.map((p) => p.key).join(','),
  ])

  const isAutoCreating = autoCreateDutyRosterMutation.isPending

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleMarkAbsent = async (shift: DutyRosterShiftRecord, assignment: DutyRosterAssignmentRecord) => {
    try {
      await markAbsentMutation.mutateAsync({
        shiftId: shift.id,
        assignmentId: assignment.id,
      })
      toast({ type: 'success', title: 'تم تسجيل الغياب بنجاح' })
    } catch {
      toast({ type: 'error', title: 'فشل تسجيل الغياب' })
    }
  }

  const handleAssignReplacement = async (shift: DutyRosterShiftRecord, assignment: DutyRosterAssignmentRecord) => {
    const replacementUserId = window.prompt('أدخل معرف المعلم البديل:')
    if (!replacementUserId) return

    const userId = Number(replacementUserId)
    if (!Number.isInteger(userId) || userId <= 0) {
      toast({ type: 'error', title: 'معرف المعلم غير صالح' })
      return
    }

    try {
      await assignReplacementMutation.mutateAsync({
        shiftId: shift.id,
        assignmentId: assignment.id,
        payload: { replacement_user_id: userId },
      })
      toast({ type: 'success', title: 'تم تعيين البديل بنجاح' })
    } catch {
      toast({ type: 'error', title: 'فشل تعيين البديل' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatWindow = (shift: DutyRosterShiftRecord) => {
    return `${shift.window_start} - ${shift.window_end}`
  }

  const formatTriggerTime = (shift: DutyRosterShiftRecord) => {
    return shift.trigger_time ?? 'غير محدد'
  }

  const getAssignmentNotes = (assignment: DutyRosterAssignmentRecord) => {
    if (assignment.status === 'absent' && assignment.marked_absent_at) {
      return `غائب منذ ${new Date(assignment.marked_absent_at).toLocaleTimeString('ar-SA')}`
    }
    if (assignment.status === 'replacement_assigned' && assignment.replacement_user) {
      return `البديل: ${assignment.replacement_user.name}`
    }
    return '—'
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-right">
          <h1 className="text-3xl font-bold text-slate-900">مناوبات المعلمين</h1>
          <p className="text-sm text-muted">
            خطط المناوبات اليومية، عين المعلمين، وتابع إشعارات الواتساب وحالات التأكيد أو الاستبدال تلقائياً.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="inline-flex rounded-3xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('shifts')}
              className={`rounded-3xl px-4 py-1.5 font-semibold transition ${
                activeView === 'shifts'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              المناوبات اليومية
            </button>
            <button
              type="button"
              onClick={() => setActiveView('templates')}
              className={`rounded-3xl px-4 py-1.5 font-semibold transition ${
                activeView === 'templates'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              قوالب الأسبوع
            </button>
          </div>

          {activeView === 'shifts' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="button-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => dutyRostersQuery.refetch()}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                مزامنة الآن
              </button>
              <button
                type="button"
                className="button-primary flex items-center gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <CalendarClock className="h-5 w-5" />
                إنشاء مناوبة جديدة
              </button>
            </div>
          )}
        </div>
      </header>

      <DutyRosterSettingsPanel />

      {activeView === 'shifts' ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-3xl border border-slate-100 bg-white/70 p-5 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">مناوبات قادمة</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{upcomingCount.toLocaleString('ar-SA')}</p>
              <p className="mt-1 text-xs text-muted">ضمن المرشحات الحالية</p>
            </article>
            <article className="rounded-3xl border border-rose-100 bg-rose-50/70 p-5 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">تم تسجيل غياب</p>
              <p className="mt-2 text-3xl font-bold text-rose-700">{absenceCount.toLocaleString('ar-SA')}</p>
              <p className="mt-1 text-xs text-rose-700/80">تأكد من تعيين بديل وتحويل المناوبة</p>
            </article>
            <article className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">بدلاء معينون</p>
              <p className="mt-2 text-3xl font-bold text-indigo-700">{replacementCount.toLocaleString('ar-SA')}</p>
              <p className="mt-1 text-xs text-indigo-700/80">البريد والواتساب يتضمنان تفاصيل المناوبة</p>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-600">نوع المناوبة</label>
                <input
                  type="search"
                  value={filters.shiftType}
                  onChange={(event) => handleFilterChange('shiftType', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: مناوبة الفسحة"
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-600">حالة المناوبة</label>
                <select
                  value={filters.status}
                  onChange={(event) => handleFilterChange('status', event.target.value as FilterState['status'])}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">كل الحالات</option>
                  {(Object.keys(SHIFT_STATUS_LABELS) as DutyRosterStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {SHIFT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-600">حالة المعلم</label>
                <select
                  value={filters.assignmentStatus}
                  onChange={(event) =>
                    handleFilterChange('assignmentStatus', event.target.value as FilterState['assignmentStatus'])
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">كل الحالات</option>
                  <option value="scheduled">مجدولة</option>
                  <option value="absent">تم تسجيل غياب</option>
                  <option value="replacement_assigned">بديل معين</option>
                  <option value="completed">مكتملة</option>
                </select>
              </div>
              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-600">التاريخ</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(event) => handleFilterChange('date', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-600">خيارات سريعة</label>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    حفظ كقالب يومي
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    تصدير CSV
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <section className="space-y-4">
              {isError ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-center text-sm text-rose-700">
                  <p className="font-semibold">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => dutyRostersQuery.refetch()}
                    className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : isLoading ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  جارٍ تحميل المناوبات...
                </div>
              ) : filteredShifts.length === 0 ? (
                dutyRosterTemplatesQuery.isLoading || isAutoCreating ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-muted">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    جارٍ إنشاء المناوبات اليومية من القوالب الأسبوعية...
                    <p className="text-xs text-slate-500">سيتم تحديث القائمة تلقائياً فور اكتمال المعالجة.</p>
                  </div>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 text-sm text-muted">
                    <i className="bi bi-calendar2-week text-3xl text-slate-300" />
                    لا توجد مناوبات مطابقة للمرشحات الحالية.
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {filteredShifts.map((shift) => {
                    const weekdayKey = getDutyRosterWeekdayKey(shift.shift_date)
                    const templateAssignments = (
                      shift.template?.weekday_assignments?.[weekdayKey] ?? []
                    ) as DutyRosterTemplateAssignmentRecord[]
                    const templateAssignmentNames = templateAssignments
                      .map((assignment) => assignment.user?.name ?? null)
                      .filter((name): name is string => Boolean(name))

                    return (
                      <article key={shift.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <header className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-indigo-600">{shift.shift_type}</p>
                            <h3 className="text-lg font-bold text-slate-900">{formatDate(shift.shift_date)}</h3>
                            <p className="text-xs text-muted">المدة: {formatWindow(shift)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {shift.template?.name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                قالب الأسبوع:
                                <span className="font-bold text-indigo-900">{shift.template.name}</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              <BellRing className="h-4 w-4" />
                              الإرسال التلقائي: {formatTriggerTime(shift)}
                            </span>
                            <button
                              type="button"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                              disabled
                              title="سيتم تفعيل التذكير الفوري مع تكامل تنبيهات الواتساب"
                            >
                              جدولة تذكير إضافي
                            </button>
                          </div>
                        </header>

                        {shift.template?.name && templateAssignmentNames.length > 0 && (
                          <div className="rounded-2xl bg-indigo-50/70 px-4 py-2 text-xs text-indigo-700">
                            <p className="font-semibold text-indigo-800">المعينون من القالب لهذا اليوم:</p>
                            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                              {templateAssignmentNames.map((name, index) => (
                                <span
                                  key={`${shift.id}-template-${index}`}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="min-w-full table-fixed text-right text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-3 py-2 font-semibold">المعلم</th>
                                <th className="px-3 py-2 font-semibold">الهاتف</th>
                                <th className="px-3 py-2 font-semibold">الحالة</th>
                                <th className="px-3 py-2 font-semibold">ملاحظات</th>
                                <th className="px-3 py-2 font-semibold">الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {shift.assignments.map((assignment) => (
                                <tr key={assignment.id} className="bg-white">
                                  <td className="px-3 py-2 text-sm font-semibold text-slate-900">{assignment.user.name}</td>
                                  <td className="px-3 py-2 text-sm text-slate-700">
                                    {assignment.user.phone ?? '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[assignment.status]}`}
                                    >
                                      <Users className="h-3.5 w-3.5" />
                                      {STATUS_LABELS[assignment.status]}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted">{getAssignmentNotes(assignment)}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <button
                                        type="button"
                                        className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => handleMarkAbsent(shift, assignment)}
                                        disabled={assignment.status === 'absent' || markAbsentMutation.isPending}
                                      >
                                        عدم الحضور
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled
                                        title="سيتم تفعيل التذكير الفوري بعد ربط تنبيهات الواتساب"
                                      >
                                        تذكير فوري
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() => handleAssignReplacement(shift, assignment)}
                                        disabled={assignReplacementMutation.isPending}
                                      >
                                        تعيين بديل مؤقت
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="space-y-1 text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">مسار العمل</p>
                <h2 className="text-lg font-bold text-slate-900">قائمة التهيئة القادمة</h2>
                <p className="text-xs text-muted">سنربط هذه القائمة بالمهام الفعلية ونتائج الـ Redis قريباً.</p>
              </header>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  1. إعداد أنواع المناوبات وقوالبها الأسبوعية.
                </li>
                <li className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  2. ربط المناوبات بالمعلمين مع دعم التتابع التلقائي.
                </li>
                <li className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  3. تفعيل إشعارات الواتساب عبر الطوابير واختبار الرسائل التجريبية.
                </li>
                <li className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  4. بناء شاشة إعدادات المناوبات لاستقبال التبديلات والبدلاء.
                </li>
              </ul>
            </aside>
          </div>

          <CreateDutyRosterDialog
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            toast={toast}
          />
        </>
      ) : (
        <DutyRosterTemplatesPanel />
      )}
    </section>
  )
}

export default AdminDutyRostersPage

type CreateDutyRosterDialogProps = {
  open: boolean
  onClose: () => void
  toast: ReturnType<typeof useToast>
}

type CreateDutyRosterFormState = {
  shiftType: string
  shiftDate: string
  windowStart: string
  windowEnd: string
  triggerTime: string
  reminderMinutes: string
  status: DutyRosterStatus
  assignmentIds: string
}

function getInitialCreateFormState(): CreateDutyRosterFormState {
  return {
    shiftType: '',
    shiftDate: '',
    windowStart: '',
    windowEnd: '',
    triggerTime: '',
    reminderMinutes: '120',
    status: 'scheduled',
    assignmentIds: '',
  }
}

function CreateDutyRosterDialog({ open, onClose, toast }: CreateDutyRosterDialogProps) {
  const [form, setForm] = useState<CreateDutyRosterFormState>(getInitialCreateFormState)
  const createDutyRosterMutation = useCreateDutyRosterMutation()

  useEffect(() => {
    if (open) {
      setForm(getInitialCreateFormState())
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.shiftType.trim()) {
      toast({ type: 'error', title: 'حدد نوع المناوبة' })
      return
    }

    if (!form.shiftDate) {
      toast({ type: 'error', title: 'حدد تاريخ المناوبة' })
      return
    }

    if (!form.windowStart || !form.windowEnd) {
      toast({ type: 'error', title: 'حدد وقت البداية والنهاية' })
      return
    }

    const assignmentIds = form.assignmentIds
      .split(/[,\s]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)

    if (assignmentIds.length === 0) {
      toast({ type: 'error', title: 'أدخل معرفاً واحداً على الأقل للمعلم' })
      return
    }

    const reminderValue = Number.parseInt(form.reminderMinutes, 10)
    const reminderMinutes = Number.isFinite(reminderValue) && reminderValue >= 0 ? reminderValue : 120

    try {
      await createDutyRosterMutation.mutateAsync({
        shift_type: form.shiftType.trim(),
        shift_date: form.shiftDate,
        window_start: form.windowStart,
        window_end: form.windowEnd,
        trigger_time: form.triggerTime ? form.triggerTime : undefined,
        reminder_offset_minutes: reminderMinutes,
        status: form.status,
        assignments: assignmentIds.map((id) => ({
          user_id: id,
          assignment_role: 'teacher' as const,
        })),
      })

      onClose()
  } catch {
      // الرسالة يتم عرضها من الهوك نفسه، فقط نحافظ على الهدوء هنا
    }
  }

  const handleCancel = () => {
    if (createDutyRosterMutation.isPending) return
    onClose()
  }

  const isSubmitting = createDutyRosterMutation.isPending

  return (
    <DialogBase onClose={handleCancel}>
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-4 text-right">
          <h2 className="text-xl font-bold text-slate-900">إنشاء مناوبة جديدة</h2>
          <p className="text-sm text-muted">
            أدخل تفاصيل المناوبة وحدد المعلمين المكلفين بها. يمكن تعديل التفاصيل لاحقاً من نفس الشاشة.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-shift-type">
                نوع المناوبة
              </label>
              <input
                id="duty-roster-shift-type"
                type="text"
                value={form.shiftType}
                onChange={(event) => setForm((prev) => ({ ...prev, shiftType: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="مثال: مناوبة بداية الدوام"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-shift-date">
                تاريخ المناوبة
              </label>
              <input
                id="duty-roster-shift-date"
                type="date"
                value={form.shiftDate}
                onChange={(event) => setForm((prev) => ({ ...prev, shiftDate: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-window-start">
                يبدأ من
              </label>
              <input
                id="duty-roster-window-start"
                type="time"
                value={form.windowStart}
                onChange={(event) => setForm((prev) => ({ ...prev, windowStart: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-window-end">
                ينتهي عند
              </label>
              <input
                id="duty-roster-window-end"
                type="time"
                value={form.windowEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, windowEnd: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-trigger-time">
                وقت التذكير الأولي (اختياري)
              </label>
              <input
                id="duty-roster-trigger-time"
                type="time"
                value={form.triggerTime}
                onChange={(event) => setForm((prev) => ({ ...prev, triggerTime: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted">يُستخدم لجدولة رسالة الواتساب التلقائية قبل الموعد.</p>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-reminder">
                تذكير إضافي قبل (بالدقائق)
              </label>
              <input
                id="duty-roster-reminder"
                type="number"
                min={0}
                value={form.reminderMinutes}
                onChange={(event) => setForm((prev) => ({ ...prev, reminderMinutes: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-status">
                حالة المناوبة
              </label>
              <select
                id="duty-roster-status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as DutyRosterStatus }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              >
                {(Object.keys(SHIFT_STATUS_LABELS) as DutyRosterStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {SHIFT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="duty-roster-assignments">
              معرفات المعلمين المكلفين
            </label>
            <textarea
              id="duty-roster-assignments"
              value={form.assignmentIds}
              onChange={(event) => setForm((prev) => ({ ...prev, assignmentIds: event.target.value }))}
              className="min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="أدخل المعرفات مفصولة بفاصلة أو سطر جديد (مثال: 45, 82, 91)"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted">
              سنضيف لاحقاً اختياراً بصرياً للمعلمين. حالياً، أدخل معرف النظام لكل معلم مكلف بالمناوبة.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="button-secondary min-w-[110px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="button-primary min-w-[140px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ المناوبة'}
            </button>
          </div>
        </form>
      </div>
    </DialogBase>
  )
}

function DialogBase({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto">{children}</div>
    </div>
  )
}
