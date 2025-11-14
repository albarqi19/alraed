import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  useTeacherScheduleQuery,
  useTeacherScheduleSummaryQuery,
  useTeacherScheduleMovePreviewMutation,
  useTeacherScheduleMoveMutation,
  useTeacherScheduleDayLimitsQuery,
  useUpdateTeacherScheduleDayLimitsMutation,
} from '../hooks'
import { TeacherScheduleMoveDialog } from '../components/teacher-schedule-move-dialog'
import { TeacherDayLimitsDialog } from '../components/teacher-day-limits-dialog'
import { previewTeacherScheduleMove } from '../api'
import type {
  TeacherScheduleGrid,
  TeacherScheduleSlot,
  TeacherScheduleSummary,
  TeacherScheduleMovePreviewResult,
  TeacherScheduleMovePreviewPayload,
  TeacherScheduleMoveResolution,
  TeacherScheduleDayLimits,
  TeacherScheduleConflictPriority,
  TeacherScheduleMoveSuggestion,
  TeacherScheduleMoveSuggestionStep,
} from '../types'

const daysOfWeek: string[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const defaultPeriods = Array.from({ length: 8 }, (_, index) => index + 1)

const priorityLabels: Record<TeacherScheduleConflictPriority, string> = {
  P1: 'تعارض مانع',
  P2: 'تحذير',
  P3: 'توصية',
}

const priorityStyles: Record<TeacherScheduleConflictPriority, string> = {
  P1: 'bg-rose-100 text-rose-700 border border-rose-200',
  P2: 'bg-amber-100 text-amber-700 border border-amber-200',
  P3: 'bg-sky-100 text-sky-700 border border-sky-200',
}

const strategyLabels: Record<string, string> = {
  chain_swap: 'سلسلة ذكية',
  single_swap: 'مبادلة مباشرة',
  delay: 'إعادة جدولة',
}

function formatTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.slice(0, 5)
    return timePart ?? ''
  }
  return value.slice(0, 5)
}

function getPeriodTimeLabel(schedule: TeacherScheduleGrid | undefined, period: number) {
  if (!schedule) return ''
  for (const day of daysOfWeek) {
    const slot = schedule[day]?.[period]
    if (slot && slot.start_time && slot.end_time) {
      return `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
    }
  }
  return ''
}

function extractPeriods(schedule?: TeacherScheduleGrid | null) {
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

function countScheduledSessions(schedule?: TeacherScheduleGrid | null) {
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

type DraggedSlotMeta = {
  slot: TeacherScheduleSlot
  day: string
  period: number
}

type DropTargetMeta = {
  day: string
  period: number
}

type HoverPreviewState = {
  target: DropTargetMeta
  payload: TeacherScheduleMovePreviewPayload
  status: 'loading' | 'success' | 'error'
  result: TeacherScheduleMovePreviewResult | null
  error: string | null
}

export function AdminTeacherSchedulesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const movePreviewMutation = useTeacherScheduleMovePreviewMutation()
  const moveMutation = useTeacherScheduleMoveMutation()
  const [dragSource, setDragSource] = useState<DraggedSlotMeta | null>(null)
  const [dragHover, setDragHover] = useState<DropTargetMeta | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movePreview, setMovePreview] = useState<TeacherScheduleMovePreviewResult | null>(null)
  const [pendingMovePayload, setPendingMovePayload] = useState<TeacherScheduleMovePreviewPayload | null>(null)
  const [dayLimitsDialogOpen, setDayLimitsDialogOpen] = useState(false)
  const [hoverPreviewState, setHoverPreviewState] = useState<HoverPreviewState | null>(null)
  const [dragPointerPosition, setDragPointerPosition] = useState<{ x: number; y: number } | null>(null)
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({ width: 240, height: 160 })
  const dayLimitsQuery = useTeacherScheduleDayLimitsQuery({ enabled: dayLimitsDialogOpen })
  const updateDayLimitsMutation = useUpdateTeacherScheduleDayLimitsMutation()
  const dayLimitsError = dayLimitsQuery.error instanceof Error ? dayLimitsQuery.error.message : null
  const hoverPreviewRequestIdRef = useRef(0)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const hoverSuggestion = useMemo<TeacherScheduleMoveSuggestion | null>(() => {
    if (!hoverPreviewState || hoverPreviewState.status !== 'success' || !hoverPreviewState.result) return null
    const suggestions = hoverPreviewState.result.suggestions ?? []
    const chainSuggestion = suggestions.find((suggestion) => suggestion.strategy === 'chain_swap')
    if (chainSuggestion) return chainSuggestion
    if (hoverPreviewState.result.can_move) return null
    return suggestions[0] ?? null
  }, [hoverPreviewState])

  const hoverSuggestionSteps: TeacherScheduleMoveSuggestionStep[] = useMemo(() => {
    return hoverSuggestion?.steps ?? []
  }, [hoverSuggestion])

  const hoverSuggestionMetadata = hoverSuggestion?.metadata as { chain_length?: unknown } | undefined
  const hoverChainLength =
    hoverSuggestion?.strategy === 'chain_swap'
      ? typeof hoverSuggestionMetadata?.chain_length === 'number'
        ? hoverSuggestionMetadata.chain_length
        : hoverSuggestionSteps.length || null
      : null
  const hoverSuggestionTitle = hoverSuggestion
    ? strategyLabels[hoverSuggestion.strategy ?? ''] ?? hoverSuggestion.title
    : null
  const hoverPriorityLabel = hoverSuggestion ? priorityLabels[hoverSuggestion.priority] : null
  const hoverPriorityStyle = hoverSuggestion ? priorityStyles[hoverSuggestion.priority] : ''
  const displayedHoverSteps = hoverSuggestionSteps.slice(0, 3)
  const hasMoreHoverSteps = hoverSuggestionSteps.length > displayedHoverSteps.length
  const tooltipPosition = useMemo(() => {
    if (!dragPointerPosition) return null
    const offset = 12
    const margin = 8
    let top = dragPointerPosition.y + offset
    let left = dragPointerPosition.x + offset

    if (typeof window !== 'undefined') {
      const { innerWidth, innerHeight } = window
      const width = tooltipSize.width || 0
      const height = tooltipSize.height || 0

      if (left + width + margin > innerWidth) {
        left = Math.max(dragPointerPosition.x - width - offset, margin)
      }

      if (top + height + margin > innerHeight) {
        top = Math.max(dragPointerPosition.y - height - offset, margin)
      }

      left = Math.max(left, margin)
      top = Math.max(top, margin)
    }

    return { top, left }
  }, [dragPointerPosition, tooltipSize])

  useLayoutEffect(() => {
    if (!dragPointerPosition || !hoverPreviewState) return
    const handle = requestAnimationFrame(() => {
      const element = tooltipRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setTooltipSize((previous) => {
        if (previous.width === rect.width && previous.height === rect.height) {
          return previous
        }
        return { width: rect.width, height: rect.height }
      })
    })

    return () => cancelAnimationFrame(handle)
  }, [dragPointerPosition, hoverPreviewState])

  const handleSaveDayLimits = (limits: TeacherScheduleDayLimits) => {
    updateDayLimitsMutation.mutate(limits, {
      onSuccess: () => {
        setDayLimitsDialogOpen(false)
      },
    })
  }

  const summariesQuery = useTeacherScheduleSummaryQuery()

  const filteredTeachers = useMemo(() => {
    if (!summariesQuery.data) return []
    const term = searchTerm.trim().toLowerCase()
    const baseList = statusFilter === 'all'
      ? summariesQuery.data
      : summariesQuery.data.filter((item) => item.status === statusFilter)

    if (!term) return baseList

    return baseList.filter((item) => {
      const searchable = `${item.name} ${item.national_id ?? ''} ${item.phone ?? ''}`.toLowerCase()
      return searchable.includes(term)
    })
  }, [summariesQuery.data, searchTerm, statusFilter])

  useEffect(() => {
    if (filteredTeachers.length === 0) {
      setSelectedTeacherId(null)
      return
    }
    setSelectedTeacherId((current) => {
      if (current && filteredTeachers.some((teacher) => teacher.id === current)) {
        return current
      }
      return filteredTeachers[0].id
    })
  }, [filteredTeachers])

  const selectedTeacher: TeacherScheduleSummary | null = useMemo(() => {
    if (filteredTeachers.length === 0) return null
    return filteredTeachers.find((teacher) => teacher.id === selectedTeacherId) ?? filteredTeachers[0]
  }, [filteredTeachers, selectedTeacherId])

  const scheduleQuery = useTeacherScheduleQuery(selectedTeacher?.id)
  const periods = useMemo(() => extractPeriods(scheduleQuery.data?.schedule), [scheduleQuery.data?.schedule])
  const totalSessions = countScheduledSessions(scheduleQuery.data?.schedule)
  const summariesError = summariesQuery.error instanceof Error ? summariesQuery.error.message : 'تعذر تحميل قائمة المعلمين'
  const scheduleError = scheduleQuery.error instanceof Error ? scheduleQuery.error.message : 'تعذر تحميل جدول المعلم'
  const isFiltered = statusFilter !== 'all' || Boolean(searchTerm.trim())
  const dragLocked = scheduleQuery.isFetching || movePreviewMutation.isPending || moveMutation.isPending

  const clearHoverPreview = useCallback(() => {
    hoverPreviewRequestIdRef.current += 1
    setHoverPreviewState(null)
  }, [])

  const triggerHoverPreview = useCallback(
    (target: DropTargetMeta) => {
      if (!dragSource || !selectedTeacher) {
        clearHoverPreview()
        return
      }

      const slotAtTarget = scheduleQuery.data?.schedule?.[target.day]?.[target.period] ?? null
      if (slotAtTarget) {
        clearHoverPreview()
        return
      }

      const payload: TeacherScheduleMovePreviewPayload = {
        source_session_id: dragSource.slot.id,
        target_day: target.day,
        target_period: target.period,
        target_teacher_id: selectedTeacher.id,
      }

      const isSameRequest =
        hoverPreviewState &&
        hoverPreviewState.target.day === target.day &&
        hoverPreviewState.target.period === target.period &&
        hoverPreviewState.payload.source_session_id === payload.source_session_id

      if (isSameRequest && (hoverPreviewState.status === 'loading' || hoverPreviewState.status === 'success')) {
        return
      }

      const requestId = hoverPreviewRequestIdRef.current + 1
      hoverPreviewRequestIdRef.current = requestId

      setHoverPreviewState({
        target,
        payload,
        status: 'loading',
        result: null,
        error: null,
      })

      void previewTeacherScheduleMove(payload)
        .then((result) => {
          if (hoverPreviewRequestIdRef.current !== requestId) return
          setHoverPreviewState({
            target,
            payload,
            status: 'success',
            result,
            error: null,
          })
        })
        .catch((error: unknown) => {
          if (hoverPreviewRequestIdRef.current !== requestId) return
          const message = error instanceof Error ? error.message : 'تعذر تحميل السلسلة الذكية'
          setHoverPreviewState({
            target,
            payload,
            status: 'error',
            result: null,
            error: message,
          })
        })
    },
    [clearHoverPreview, dragSource, hoverPreviewState, scheduleQuery.data?.schedule, selectedTeacher],
  )

  const handleDragStart = (event: DragEvent<HTMLDivElement>, slot: TeacherScheduleSlot, day: string, period: number) => {
    if (!selectedTeacher || dragLocked) return
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    setDragSource({ slot, day, period })
    setDragHover(null)
    setDragPointerPosition({ x: event.clientX, y: event.clientY })
  }

  const handleDragEnd = () => {
    setDragSource(null)
    setDragHover(null)
    clearHoverPreview()
    setDragPointerPosition(null)
  }

  const handleDragOver = (event: DragEvent<HTMLTableCellElement>) => {
    if (!dragSource) return
    event.preventDefault()
    setDragPointerPosition({ x: event.clientX, y: event.clientY })
  }

  const handleDragEnter = (event: DragEvent<HTMLTableCellElement>, target: DropTargetMeta) => {
    if (!dragSource) return
    event.preventDefault()
    setDragHover(target)
    setDragPointerPosition({ x: event.clientX, y: event.clientY })
    triggerHoverPreview(target)
  }

    const handleDragLeave = (event: DragEvent<HTMLTableCellElement>, target: DropTargetMeta) => {
      if (!dragSource) return

      const currentTarget = event.currentTarget
      const related = event.relatedTarget as Node | null
      if (related && currentTarget.contains(related)) {
        return
      }

      if (dragHover && dragHover.day === target.day && dragHover.period === target.period) {
        setDragHover(null)
      }
      if (
        hoverPreviewState &&
        hoverPreviewState.target.day === target.day &&
        hoverPreviewState.target.period === target.period
      ) {
        clearHoverPreview()
      }
    }

  const requestMovePreview = (payload: TeacherScheduleMovePreviewPayload) => {
    setPendingMovePayload(payload)
    movePreviewMutation.mutate(payload, {
      onSuccess: (result) => {
        setMovePreview(result)
        setMoveDialogOpen(true)
      },
      onSettled: () => {
        setDragSource(null)
        setDragHover(null)
      },
    })
  }

  const handleDrop = (event: DragEvent<HTMLTableCellElement>, target: DropTargetMeta) => {
    if (!dragSource || !selectedTeacher) return
    event.preventDefault()
    setDragHover(null)
    clearHoverPreview()
    setDragPointerPosition(null)

    if (dragSource.day === target.day && dragSource.period === target.period) {
      setDragSource(null)
      return
    }

    const payload: TeacherScheduleMovePreviewPayload = {
      source_session_id: dragSource.slot.id,
      target_day: target.day,
      target_period: target.period,
      target_teacher_id: selectedTeacher.id,
    }

    requestMovePreview(payload)
  }

  const handleDialogClose = () => {
    setMoveDialogOpen(false)
    setMovePreview(null)
    setPendingMovePayload(null)
    setDragSource(null)
    setDragHover(null)
    clearHoverPreview()
    setDragPointerPosition(null)
  }

  const handleConfirmMove = (resolution?: TeacherScheduleMoveResolution) => {
    if (!pendingMovePayload) return

    const nextTargetDay = resolution?.next_target_day ?? pendingMovePayload.target_day
    const nextTargetPeriod = resolution?.next_target_period ?? pendingMovePayload.target_period
    const nextTargetTeacherId =
      resolution?.next_target_teacher_id ?? pendingMovePayload.target_teacher_id ?? selectedTeacher?.id ?? null

    moveMutation.mutate(
      {
        ...pendingMovePayload,
        target_day: nextTargetDay,
        target_period: nextTargetPeriod,
        target_teacher_id: nextTargetTeacherId,
        resolution,
        source_teacher_id: scheduleQuery.data?.teacher_info.id ?? selectedTeacher?.id ?? null,
      },
      {
        onSuccess: () => {
          handleDialogClose()
        },
      },
    )
  }

  return (
    <>
      <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">جداول المعلمين</h1>
        <p className="text-sm text-muted">
          استعرض توزيع حصص كل معلم عبر الأسبوع، وتحقق من التوازن بين الحصص والفصول من خلال واجهات <code>/admin/teacher-schedules/*</code>.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
        <aside className="glass-card flex min-h-[320px] flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-140px)] lg:overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">قائمة المعلمين</h2>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              {summariesQuery.isLoading
                ? '…'
                : `${filteredTeachers.length}${isFiltered ? ` / ${summariesQuery.data?.length ?? 0}` : ''}`}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="sm:w-40">
              <label htmlFor="teacher-status-filter" className="sr-only">
                تصفية حسب الحالة
              </label>
              <select
                id="teacher-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">معلمون نشطون</option>
                <option value="inactive">معلمون متوقفون</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="teacher-search" className="sr-only">
                بحث عن معلم
              </label>
              <input
                id="teacher-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث بالاسم أو الهوية أو رقم الجوال"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1 lg:pr-2 custom-scrollbar">
            {summariesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              ))
            ) : summariesQuery.isError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                <p>تعذر تحميل المعلمين: {summariesError}</p>
                <button
                  type="button"
                  onClick={() => summariesQuery.refetch()}
                  className="button-secondary mt-3"
                  disabled={summariesQuery.isFetching}
                >
                  {summariesQuery.isFetching ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
                </button>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                لا توجد نتائج مطابقة للبحث الحالي.
              </div>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSelected = selectedTeacher?.id === teacher.id
                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-right text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-900 shadow-sm'
                        : 'border-transparent bg-white/80 hover:border-teal-300 hover:bg-white'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{teacher.name}</span>
                      <span
                        className={`text-[11px] font-semibold ${teacher.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}
                      >
                        {teacher.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </div>
                    {teacher.national_id ? (
                      <p className="mt-1 text-xs text-slate-500">رقم الهوية: {teacher.national_id}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                        {teacher.sessions_count} حصص
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {teacher.classes_count} فصول
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <div className="glass-card space-y-6">
          {selectedTeacher ? (
            <>
              <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1 text-right">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedTeacher.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted md:justify-end">
                    <span className="inline-flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${selectedTeacher.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {selectedTeacher.status === 'active' ? 'متاح للتدريس' : 'غير متاح حالياً'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      {selectedTeacher.classes_count} فصول مختلفة
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      {selectedTeacher.sessions_count} حصص أسبوعية
                    </span>
                    {scheduleQuery.data?.teacher_info?.subjects_count ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        {scheduleQuery.data.teacher_info.subjects_count} مواد مسندة
                      </span>
                    ) : null}
                    {scheduleQuery.isFetching ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <span className="h-2 w-2 animate-ping rounded-full bg-teal-500" />
                        يتم تحديث البيانات...
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDayLimitsDialogOpen(true)}
                    className="button-primary"
                    disabled={updateDayLimitsMutation.isPending}
                  >
                    الحصص
                  </button>
                  <button
                    type="button"
                    onClick={() => scheduleQuery.refetch()}
                    className="button-secondary"
                    disabled={scheduleQuery.isFetching}
                  >
                    {scheduleQuery.isFetching ? 'جارٍ التحديث...' : 'تحديث الجدول'}
                  </button>
                </div>
              </header>

              {scheduleQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted">
                  <span className="h-12 w-12 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                  جاري تحميل جدول المعلم...
                </div>
              ) : scheduleQuery.isError ? (
                <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">
                  <p>تعذر تحميل جدول المعلم: {scheduleError}</p>
                  <button type="button" onClick={() => scheduleQuery.refetch()} className="button-primary mt-4">
                    إعادة المحاولة
                  </button>
                </div>
              ) : totalSessions === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-muted">
                  لا توجد حصص مجدولة لهذا المعلم حالياً.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[720px] border-collapse text-right text-xs md:text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="sticky right-0 w-28 border border-slate-200 bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
                            اليوم / الحصة
                          </th>
                          {periods.map((period) => {
                            const timeLabel = getPeriodTimeLabel(scheduleQuery.data?.schedule, period)
                            return (
                              <th key={period} className="border border-slate-200 px-2.5 py-2 text-[11px] font-semibold">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span>الحصة {period}</span>
                                  {timeLabel ? <span className="text-[10px] text-slate-500">{timeLabel}</span> : null}
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {daysOfWeek.map((day) => {
                          const daySessions = scheduleQuery.data?.schedule?.[day] ?? {}
                          return (
                            <tr key={day} className="bg-white even:bg-slate-50/70">
                              <th
                                scope="row"
                                className="sticky right-0 border border-slate-200 bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-700"
                              >
                                {day}
                              </th>
                              {periods.map((period) => {
                                const slot = daySessions?.[period] ?? null
                                const isHoverTarget = dragHover?.day === day && dragHover?.period === period
                                return (
                                  <td
                                    key={period}
                                    className={`border border-slate-200 p-0 transition ${
                                      isHoverTarget ? 'bg-teal-50 shadow-inner ring-1 ring-teal-400' : ''
                                    }`}
                                    onDragOver={(event) => handleDragOver(event)}
                                    onDragEnter={(event) => handleDragEnter(event, { day, period })}
                                    onDragLeave={(event) => handleDragLeave(event, { day, period })}
                                    onDrop={(event) => handleDrop(event, { day, period })}
                                  >
                                    {slot ? (
                                      <div
                                        className={`flex min-h-[70px] cursor-grab flex-col justify-center gap-1 px-3 py-2 transition hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500/40 ${
                                          dragSource?.slot.id === slot.id ? 'opacity-70 ring-1 ring-teal-500' : ''
                                        }`}
                                        draggable={!dragLocked}
                                        onDragStart={(event) => handleDragStart(event, slot, day, period)}
                                        onDragEnd={handleDragEnd}
                                        aria-grabbed={dragSource?.slot.id === slot.id}
                                        role="button"
                                        tabIndex={0}
                                        title="اسحب الحصة لتغيير وقتها"
                                      >
                                        <div className="flex flex-col gap-1">
                                          <p className="text-sm font-semibold leading-tight text-slate-900">{slot.subject_name}</p>
                                          <p className="text-xs text-slate-500">
                                            {slot.grade} / {slot.class_name}
                                          </p>
                                        </div>
                                        <span className="text-[11px] text-muted">
                                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex min-h-[70px] items-center justify-center border border-dashed border-slate-200 bg-white text-[11px] text-muted">
                                        لا يوجد حصة
                                      </div>
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
                  <p className="text-xs text-muted">
                    يتم احتساب الحصص بناءً على الجداول المعتمدة للفصول. أي تعديل على جداول الفصول ينعكس تلقائياً في عرض جداول المعلمين.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center text-sm text-muted">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">👩‍🏫</span>
              اختر معلمًا من القائمة لاستعراض جدول حصصه الأسبوعي.
            </div>
          )}
        </div>
      </div>
      </section>

      {dragPointerPosition && hoverPreviewState && tooltipPosition ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-50 w-60 max-w-[260px] rounded-xl border border-slate-200 bg-white/95 p-2.5 text-right text-[11px] shadow-xl backdrop-blur"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        >
          {hoverPreviewState.status === 'loading' ? (
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-slate-900">جارٍ تحليل السلسلة الذكية…</span>
              <p className="text-[11px] text-slate-600">نقوم بالتحقق من أفضل سلسلة مبادلات للحصة الحالية.</p>
            </div>
          ) : hoverPreviewState.status === 'error' ? (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-rose-700">تعذر تحليل السلسلة</span>
              <p className="text-[11px] text-rose-600">{hoverPreviewState.error ?? 'حاول مرة أخرى عند التمرير على خانة أخرى.'}</p>
            </div>
          ) : hoverPreviewState.status === 'success' && hoverPreviewState.result ? (
            hoverSuggestion ? (
              <div className="space-y-2">
                <div className="flex flex-row-reverse items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-900">{hoverSuggestionTitle ?? hoverSuggestion.title}</span>
                  {hoverPriorityLabel ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${hoverPriorityStyle}`}>
                      {hoverPriorityLabel}
                    </span>
                  ) : null}
                </div>

                {hoverSuggestion.strategy === 'chain_swap' && hoverChainLength ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-600">
                    {hoverChainLength} خطوة
                  </span>
                ) : null}

                {displayedHoverSteps.length ? (
                  <ul className="space-y-1.5">
                    {displayedHoverSteps.map((step, index) => (
                      <li
                        key={`${step.session_id ?? index}-hover-step`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                      >
                        <div className="flex flex-row-reverse items-center justify-between text-[10px] font-semibold text-slate-800">
                          <span>الخطوة {index + 1}</span>
                          <span>{step.subject_name ?? 'حصة'}</span>
                        </div>
                        {step.teacher_name ? (
                          <p className="text-[10px] text-slate-600">{step.teacher_name}</p>
                        ) : null}
                        <p className="text-[10px] text-slate-500">
                          الصف {step.grade}/{step.class_name}
                        </p>
                        <div className="mt-1 flex flex-row-reverse items-center gap-1 text-[9px] text-slate-600">
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">
                            من: {step.from_day} • {step.from_period}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                            إلى: {step.to_day} • {step.to_period}
                          </span>
                        </div>
                      </li>
                    ))}
                    {hasMoreHoverSteps ? (
                      <li className="text-center text-[9px] text-slate-400">… بقية الخطوات داخل النافذة المنبثقة.</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : hoverPreviewState.result.can_move ? (
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-emerald-700">الخانة متاحة للنقل المباشر</span>
                <p className="text-[11px] text-slate-600">لا توجد سلسلة ذكية مطلوبة لهذه الخانة.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-slate-900">تحليل الحصة</span>
                <p className="text-[11px] text-slate-600">
                  {hoverPreviewState.result.conflicts[0]?.message ?? 'لا توجد سلسلة ذكية متاحة حالياً.'}
                </p>
              </div>
            )
          ) : null}
        </div>
      ) : null}

      <TeacherDayLimitsDialog
        open={dayLimitsDialogOpen}
        data={dayLimitsQuery.data ?? null}
        isLoading={dayLimitsQuery.isFetching && !dayLimitsQuery.isFetched}
        isSaving={updateDayLimitsMutation.isPending}
        error={dayLimitsError}
        onClose={() => setDayLimitsDialogOpen(false)}
        onSubmit={handleSaveDayLimits}
        onRefresh={() => dayLimitsQuery.refetch()}
      />

      <TeacherScheduleMoveDialog
        open={moveDialogOpen && Boolean(movePreview)}
        preview={movePreview}
        isLoading={movePreviewMutation.isPending}
        isSubmitting={moveMutation.isPending}
        onClose={handleDialogClose}
        onConfirm={handleConfirmMove}
      />
    </>
  )
}
