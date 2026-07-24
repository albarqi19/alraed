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
import { ScheduleMatchingDialog } from '../components/schedule-matching-dialog'
import { previewTeacherScheduleMove, fetchMasterSchedule, fetchTeacherSchedule } from '../api'
import { printMasterSchedule } from '../utils/print-master-schedule'
import { printTeacherSchedule, printAllTeacherSchedules } from '../utils/print-teacher-schedule'
import { useAuthStore } from '@/modules/auth/store/auth-store'
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
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Layers,
  Printer,
  RefreshCcw,
  Settings2,
  Users,
  UserRound,
  AlertTriangle,
} from 'lucide-react'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
} from '@/shared/workspace'

const daysOfWeek: string[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const defaultPeriods = Array.from({ length: 8 }, (_, index) => index + 1)

const priorityLabels: Record<TeacherScheduleConflictPriority, string> = {
  P1: 'تعارض مانع',
  P2: 'تحذير',
  P3: 'توصية',
}

const priorityToneStyles: Record<TeacherScheduleConflictPriority, { bg: string; bd: string; tx: string }> = {
  P1: { bg: 'var(--ws-red-bg)', bd: 'var(--ws-red-bd)', tx: 'var(--ws-red)' },
  P2: { bg: 'var(--ws-amber-bg)', bd: 'var(--ws-amber-bd)', tx: 'var(--ws-amber)' },
  P3: { bg: 'var(--ws-sky-bg)', bd: 'var(--ws-sky-bd)', tx: 'var(--ws-sky)' },
}

const strategyLabels: Record<string, string> = {
  chain_swap: 'سلسلة ذكية',
  single_swap: 'مبادلة مباشرة',
  delay: 'إعادة جدولة',
}

// لوحة ألوان المواد (تطعيمات هادئة — كل مادة لون ثابت عبر الجدول)
const SUBJECT_COLORS: Array<{ bg: string; bd: string; tx: string }> = [
  { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46' },
  { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E' },
  { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9' },
  { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A' },
  { bg: '#FBEAEA', bd: '#EFC5C5', tx: '#C43D3D' },
  { bg: '#E4F5F5', bd: '#BCE4E4', tx: '#1D7A7A' },
  { bg: '#FBEEE4', bd: '#F0D2B8', tx: '#B05E1D' },
  { bg: '#EAF0EE', bd: '#C8D8D2', tx: '#3F6F55' },
]

function subjectColor(name?: string | null) {
  if (!name) return SUBJECT_COLORS[7]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
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
  const [selectedDay, setSelectedDay] = useState<{ day: string; sessions: Record<number, TeacherScheduleSlot> } | null>(null)
  const [showDaysPanel, setShowDaysPanel] = useState(false)
  const movePreviewMutation = useTeacherScheduleMovePreviewMutation()
  const moveMutation = useTeacherScheduleMoveMutation()
  const [dragSource, setDragSource] = useState<DraggedSlotMeta | null>(null)
  const [dragHover, setDragHover] = useState<DropTargetMeta | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movePreview, setMovePreview] = useState<TeacherScheduleMovePreviewResult | null>(null)
  const [pendingMovePayload, setPendingMovePayload] = useState<TeacherScheduleMovePreviewPayload | null>(null)
  const [dayLimitsDialogOpen, setDayLimitsDialogOpen] = useState(false)
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false)
  const [isPrintingMaster, setIsPrintingMaster] = useState(false)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [hoverPreviewState, setHoverPreviewState] = useState<HoverPreviewState | null>(null)
  const [dragPointerPosition, setDragPointerPosition] = useState<{ x: number; y: number } | null>(null)
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({ width: 240, height: 160 })
  const dayLimitsQuery = useTeacherScheduleDayLimitsQuery({ enabled: dayLimitsDialogOpen })
  const updateDayLimitsMutation = useUpdateTeacherScheduleDayLimitsMutation()
  const dayLimitsError = dayLimitsQuery.error instanceof Error ? dayLimitsQuery.error.message : null
  const hoverPreviewRequestIdRef = useRef(0)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  // الاستماع لفتح قائمة الأيام
  useEffect(() => {
    const handleOpenDays = () => setShowDaysPanel(true)
    window.addEventListener('openDaysPanel', handleOpenDays)
    return () => window.removeEventListener('openDaysPanel', handleOpenDays)
  }, [])

  // الاستماع لفتح جدول اليوم
  useEffect(() => {
    const handleOpenDay = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setSelectedDay(detail)
      setShowDaysPanel(false)
    }
    window.addEventListener('openDaySchedule', handleOpenDay)
    return () => window.removeEventListener('openDaySchedule', handleOpenDay)
  }, [])

  // منع تمرير الخلفية
  useEffect(() => {
    if (selectedDay || showDaysPanel) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedDay, showDaysPanel])

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
  const hoverPriorityTone = hoverSuggestion ? priorityToneStyles[hoverSuggestion.priority] : null
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

  const handlePrintMasterSchedule = async () => {
    setIsPrintingMaster(true)
    try {
      const data = await fetchMasterSchedule()
      printMasterSchedule(data)
    } catch (err) {
      console.error('خطأ في طباعة الجدول العام:', err)
    } finally {
      setIsPrintingMaster(false)
    }
  }

  const handlePrintTeacher = () => {
    if (!scheduleQuery.data?.schedule || !selectedTeacher) return
    const schoolName = useAuthStore.getState().user?.school?.name ?? ''
    printTeacherSchedule(scheduleQuery.data.schedule, selectedTeacher.name, schoolName)
  }

  const handlePrintAllTeachers = async () => {
    if (!summariesQuery.data || summariesQuery.data.length === 0) return
    setIsPrintingAll(true)
    try {
      const schoolName = useAuthStore.getState().user?.school?.name ?? ''
      const results = await Promise.all(
        summariesQuery.data.map((t) => fetchTeacherSchedule(t.id)),
      )
      const teacherData = results
        .filter((r) => r.schedule && Object.keys(r.schedule).length > 0)
        .map((r) => ({
          teacherName: r.teacher_info.name,
          schedule: r.schedule,
        }))
      printAllTeacherSchedules(teacherData, schoolName)
    } catch (err) {
      console.error('خطأ في طباعة جداول المعلمين:', err)
    } finally {
      setIsPrintingAll(false)
    }
  }

  return (
    <WsPage>
      <WsHeader
        title="جداول المعلمين"
        badge="سحب وإفلات ذكي"
        actions={
          <>
            <WsBtn icon={ArrowLeftRight} onClick={() => setMatchingDialogOpen(true)}>
              المطابقة اليدوية
            </WsBtn>
            <WsBtn icon={Layers} onClick={handlePrintMasterSchedule} disabled={isPrintingMaster}>
              {isPrintingMaster ? 'جارٍ التحضير...' : 'الجدول العام'}
            </WsBtn>
            <WsBtn icon={Printer} onClick={handlePrintAllTeachers} disabled={isPrintingAll || summariesQuery.isLoading}>
              {isPrintingAll ? 'جارٍ التحضير...' : 'طباعة الكل'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="المعلمون:">
              {(summariesQuery.data?.length ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            {selectedTeacher && (
              <>
                <WsFact icon={UserRound} label="المحدد:">
                  {selectedTeacher.name}
                </WsFact>
                <WsFact icon={CalendarDays} label="حصصه:">
                  {selectedTeacher.sessions_count}
                </WsFact>
                <WsFact icon={GraduationCap} label="فصوله:">
                  {selectedTeacher.classes_count}
                </WsFact>
                {scheduleQuery.data?.teacher_info?.subjects_count ? (
                  <WsFact icon={BookOpen} label="مواده:">
                    {scheduleQuery.data.teacher_info.subjects_count}
                  </WsFact>
                ) : null}
              </>
            )}
          </>
        }
      >
        {dragLocked && scheduleQuery.isFetching && <WsChip tone="sky">جارٍ التحديث...</WsChip>}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: قائمة المعلمين */}
        <WsSideCol title="المعلمون" icon={Users} side="start" width={280} storageKey="ws:teacher-schedules:list">
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              borderBottom: '1px solid var(--ws-hairline)',
            }}
          >
            <div className="ws-seg" style={{ display: 'flex' }}>
              {([
                { value: 'all', label: 'الكل' },
                { value: 'active', label: 'نشطون' },
                { value: 'inactive', label: 'موقوفون' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`ws-seg__btn ${statusFilter === option.value ? 'is-active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم أو الهوية أو الجوال"
            />
          </div>

          <WsBlock
            title="القائمة"
            count={
              summariesQuery.isLoading
                ? '…'
                : `${filteredTeachers.length}${isFiltered ? ` / ${summariesQuery.data?.length ?? 0}` : ''}`
            }
            fill
            scroll
          >
            {summariesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل المعلمين...</WsEmpty>
            ) : summariesQuery.isError ? (
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل المعلمين: {summariesError}
                <WsBtn size="sm" icon={RefreshCcw} onClick={() => summariesQuery.refetch()} disabled={summariesQuery.isFetching}>
                  {summariesQuery.isFetching ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
                </WsBtn>
              </WsEmpty>
            ) : filteredTeachers.length === 0 ? (
              <WsEmpty icon={Users}>لا توجد نتائج مطابقة للبحث الحالي.</WsEmpty>
            ) : (
              <div>
                {filteredTeachers.map((teacher) => {
                  const isSelected = selectedTeacher?.id === teacher.id
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(teacher.id)
                        // على الجوال: فتح نافذة الأيام مباشرة
                        if (window.innerWidth < 768) {
                          setTimeout(() => {
                            const event = new CustomEvent('openDaysPanel')
                            window.dispatchEvent(event)
                          }, 100)
                        }
                      }}
                      aria-pressed={isSelected}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)', minWidth: 0 }}>
                          {teacher.name}
                        </span>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: teacher.status === 'active' ? 'var(--ws-green)' : 'var(--ws-text-2)',
                          }}
                          title={teacher.status === 'active' ? 'نشط' : 'موقوف'}
                        />
                      </span>
                      {teacher.national_id ? (
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                          {teacher.national_id}
                        </span>
                      ) : null}
                      <span style={{ display: 'inline-flex', gap: 4, marginTop: 4 }}>
                        <WsChip tone="sky">{teacher.sessions_count} حصص</WsChip>
                        <WsChip tone="amber">{teacher.classes_count} فصول</WsChip>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: جدول المعلم */}
        <WsMain>
          <WsBlock
            title={selectedTeacher ? `جدول ${selectedTeacher.name}` : 'جدول المعلم'}
            icon={CalendarDays}
            count={selectedTeacher ? `${totalSessions} حصة` : undefined}
            tools={
              selectedTeacher ? (
                <>
                  <WsBtn
                    size="sm"
                    icon={Printer}
                    onClick={handlePrintTeacher}
                    disabled={!scheduleQuery.data?.schedule || totalSessions === 0}
                  >
                    طباعة
                  </WsBtn>
                  <WsBtn size="sm" icon={RefreshCcw} onClick={() => scheduleQuery.refetch()} disabled={scheduleQuery.isFetching}>
                    تحديث
                  </WsBtn>
                  <WsBtn
                    size="sm"
                    variant="primary"
                    icon={Settings2}
                    onClick={() => setDayLimitsDialogOpen(true)}
                    disabled={updateDayLimitsMutation.isPending}
                  >
                    الحصص
                  </WsBtn>
                </>
              ) : undefined
            }
            fill
          >
            {!selectedTeacher ? (
              <WsEmpty icon={UserRound}>اختر معلمًا من القائمة اليمنى لاستعراض جدول حصصه الأسبوعي.</WsEmpty>
            ) : scheduleQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل جدول المعلم...</WsEmpty>
            ) : scheduleQuery.isError ? (
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل جدول المعلم: {scheduleError}
                <WsBtn size="sm" icon={RefreshCcw} onClick={() => scheduleQuery.refetch()}>
                  إعادة المحاولة
                </WsBtn>
              </WsEmpty>
            ) : totalSessions === 0 ? (
              <WsEmpty icon={CalendarDays}>لا توجد حصص مجدولة لهذا المعلم حالياً.</WsEmpty>
            ) : (
              <>
                {/* الجدول للشاشات الكبيرة — سحب وإفلات */}
                <div className="ws-tablewrap hidden md:block">
                  <table className="ws-matrix">
                    <thead>
                      <tr>
                        <th className="ws-matrix__stick" style={{ minWidth: 88 }}>
                          اليوم / الحصة
                        </th>
                        {periods.map((period) => {
                          const timeLabel = getPeriodTimeLabel(scheduleQuery.data?.schedule, period)
                          return (
                            <th key={period} style={{ minWidth: 118 }}>
                              <span style={{ display: 'block', fontWeight: 700 }}>الحصة {period}</span>
                              {timeLabel ? (
                                <span style={{ display: 'block', fontSize: 9.5, fontWeight: 400, direction: 'ltr' }}>
                                  {timeLabel}
                                </span>
                              ) : null}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map((day) => {
                        const daySessions = scheduleQuery.data?.schedule?.[day] ?? {}
                        return (
                          <tr key={day}>
                            <td className="ws-matrix__stick" style={{ fontWeight: 700, fontSize: 12 }}>
                              {day}
                            </td>
                            {periods.map((period) => {
                              const slot = daySessions?.[period] ?? null
                              const isHoverTarget = dragHover?.day === day && dragHover?.period === period
                              const isDragSourceCell = dragSource?.day === day && dragSource?.period === period
                              const tone = slot ? subjectColor(slot.subject_name) : null
                              return (
                                <td
                                  key={period}
                                  style={{
                                    padding: 3,
                                    verticalAlign: 'stretch',
                                    ...(isHoverTarget
                                      ? { background: 'var(--ws-accent-soft)', boxShadow: 'inset 0 0 0 2px var(--ws-accent-2)' }
                                      : null),
                                  }}
                                  onDragOver={(event) => handleDragOver(event)}
                                  onDragEnter={(event) => handleDragEnter(event, { day, period })}
                                  onDragLeave={(event) => handleDragLeave(event, { day, period })}
                                  onDrop={(event) => handleDrop(event, { day, period })}
                                >
                                  {slot && tone ? (
                                    <div
                                      draggable={!dragLocked}
                                      onDragStart={(event) => handleDragStart(event, slot, day, period)}
                                      onDragEnd={handleDragEnd}
                                      aria-grabbed={dragSource?.slot.id === slot.id}
                                      role="button"
                                      tabIndex={0}
                                      title="اسحب الحصة لتغيير وقتها"
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: 2,
                                        minHeight: 62,
                                        padding: '6px 9px',
                                        borderRadius: 8,
                                        border: `1px solid ${tone.bd}`,
                                        background: tone.bg,
                                        cursor: dragLocked ? 'wait' : 'grab',
                                        textAlign: 'right',
                                        ...(isDragSourceCell || dragSource?.slot.id === slot.id
                                          ? { opacity: 0.55, borderStyle: 'dashed' }
                                          : null),
                                      }}
                                    >
                                      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: tone.tx }}>
                                        {slot.subject_name}
                                      </span>
                                      <span style={{ fontSize: 10.5, color: 'var(--ws-text)' }}>
                                        {slot.grade} / {slot.class_name}
                                      </span>
                                      <span style={{ fontSize: 9.5, color: 'var(--ws-text-2)', direction: 'ltr', textAlign: 'right' }}>
                                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: 62,
                                        borderRadius: 8,
                                        border: '1px dashed var(--ws-hairline)',
                                        fontSize: 10,
                                        color: 'var(--ws-text-2)',
                                        opacity: isHoverTarget ? 0 : 0.8,
                                      }}
                                    >
                                      —
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

                {/* ملاحظة */}
                <div
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderTop: '1px solid var(--ws-hairline)',
                    fontSize: 10.5,
                    color: 'var(--ws-text-2)',
                  }}
                  className="hidden md:block"
                >
                  اسحب أي حصة لخانة فارغة لتغيير وقتها — النظام يحلل التعارضات ويقترح سلاسل مبادلات ذكية أثناء السحب. أي
                  تعديل على جداول الفصول ينعكس تلقائياً هنا.
                </div>

                {/* عرض الجوال: زر فتح الأيام */}
                <div className="md:hidden" style={{ padding: 14 }}>
                  <WsBtn
                    variant="primary"
                    icon={CalendarDays}
                    onClick={() => setShowDaysPanel(true)}
                    style={{ width: '100%' }}
                  >
                    عرض أيام الأسبوع
                  </WsBtn>
                </div>
              </>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* تلميح السحب الحي — تحليل السلسلة الذكية */}
      {dragPointerPosition && hoverPreviewState && tooltipPosition ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-50"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            width: 250,
            maxWidth: 260,
            background: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
            padding: 10,
            textAlign: 'right',
            fontSize: 11,
          }}
        >
          {hoverPreviewState.status === 'loading' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="ws-spinner" style={{ width: 12, height: 12 }} />
                جارٍ تحليل السلسلة الذكية…
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                نتحقق من أفضل سلسلة مبادلات للحصة الحالية.
              </span>
            </div>
          ) : hoverPreviewState.status === 'error' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-red)' }}>تعذر تحليل السلسلة</span>
              <span style={{ fontSize: 10.5, color: 'var(--ws-red)' }}>
                {hoverPreviewState.error ?? 'حاول مرة أخرى عند التمرير على خانة أخرى.'}
              </span>
            </div>
          ) : hoverPreviewState.status === 'success' && hoverPreviewState.result ? (
            hoverSuggestion ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{hoverSuggestionTitle ?? hoverSuggestion.title}</span>
                  {hoverPriorityLabel && hoverPriorityTone ? (
                    <span
                      className="ws-chip"
                      style={{ background: hoverPriorityTone.bg, borderColor: hoverPriorityTone.bd, color: hoverPriorityTone.tx }}
                    >
                      {hoverPriorityLabel}
                    </span>
                  ) : null}
                </div>

                {hoverSuggestion.strategy === 'chain_swap' && hoverChainLength ? (
                  <span className="ws-chip ws-chip--green" style={{ alignSelf: 'flex-start' }}>
                    {hoverChainLength} خطوة
                  </span>
                ) : null}

                {displayedHoverSteps.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {displayedHoverSteps.map((step, index) => (
                      <div
                        key={`${step.session_id ?? index}-hover-step`}
                        style={{
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 8,
                          padding: '5px 8px',
                          background: 'var(--ws-surface-2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontWeight: 700 }}>
                          <span>الخطوة {index + 1}</span>
                          <span>{step.subject_name ?? 'حصة'}</span>
                        </div>
                        {step.teacher_name ? (
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>{step.teacher_name}</span>
                        ) : null}
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                          الصف {step.grade}/{step.class_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 9 }}>
                          <span
                            style={{
                              borderRadius: 5,
                              padding: '1px 6px',
                              fontWeight: 600,
                              background: 'var(--ws-red-bg)',
                              color: 'var(--ws-red)',
                            }}
                          >
                            من: {step.from_day} • {step.from_period}
                          </span>
                          <span style={{ color: 'var(--ws-text-2)' }}>←</span>
                          <span
                            style={{
                              borderRadius: 5,
                              padding: '1px 6px',
                              fontWeight: 600,
                              background: 'var(--ws-green-bg)',
                              color: 'var(--ws-green)',
                            }}
                          >
                            إلى: {step.to_day} • {step.to_period}
                          </span>
                        </div>
                      </div>
                    ))}
                    {hasMoreHoverSteps ? (
                      <span style={{ textAlign: 'center', fontSize: 9, color: 'var(--ws-text-2)' }}>
                        … بقية الخطوات داخل النافذة المنبثقة.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : hoverPreviewState.result.can_move ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-green)' }}>الخانة متاحة للنقل المباشر</span>
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>لا توجد سلسلة ذكية مطلوبة لهذه الخانة.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>تحليل الحصة</span>
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  {hoverPreviewState.result.conflicts[0]?.message ?? 'لا توجد سلسلة ذكية متاحة حالياً.'}
                </span>
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

      {/* نافذة قائمة الأيام للجوال */}
      {showDaysPanel && scheduleQuery.data?.schedule && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowDaysPanel(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl"
            style={{ background: 'var(--ws-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2" style={{ background: 'var(--ws-surface)', borderBottom: '1px solid var(--ws-hairline)' }}>
              <div className="h-1.5 w-12 rounded-full" style={{ background: 'var(--ws-border)' }} />
            </div>

            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>أيام الأسبوع</h2>
                  <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>اختر يوماً لعرض حصصه</p>
                </div>
                <WsBtn size="sm" onClick={() => setShowDaysPanel(false)}>
                  إغلاق
                </WsBtn>
              </header>

              <div className="space-y-2">
                {daysOfWeek.map((day) => {
                  const daySessions = scheduleQuery.data.schedule?.[day] ?? {}
                  const sessionsCount = Object.values(daySessions).filter(s => s !== null).length
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const event = new CustomEvent('openDaySchedule', { detail: { day, sessions: daySessions } })
                        window.dispatchEvent(event)
                      }}
                      className="ws-pick"
                      style={{ width: '100%' }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span className="ws-pick__name">{day}</span>
                        <span className="ws-pick__sub">{sessionsCount} حصة</span>
                      </span>
                      <CalendarDays style={{ width: 14, height: 14, color: 'var(--ws-accent-2)', flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض حصص اليوم للجوال */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSelectedDay(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl"
            style={{ background: 'var(--ws-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2" style={{ background: 'var(--ws-surface)', borderBottom: '1px solid var(--ws-hairline)' }}>
              <div className="h-1.5 w-12 rounded-full" style={{ background: 'var(--ws-border)' }} />
            </div>

            <div className="p-4 space-y-4">
              <header className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedDay.day}</h2>
                  <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>
                    {Object.values(selectedDay.sessions).filter(s => s !== null).length} حصة
                  </p>
                </div>
                <WsBtn size="sm" onClick={() => setSelectedDay(null)}>
                  إغلاق
                </WsBtn>
              </header>

              <div className="space-y-2">
                {Object.values(selectedDay.sessions).filter(slot => slot !== null).map((slot) => {
                  const tone = subjectColor(slot.subject_name)
                  return (
                    <div
                      key={slot.id}
                      style={{
                        borderRadius: 9,
                        border: `1px solid ${tone.bd}`,
                        background: tone.bg,
                        padding: '9px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: tone.tx }}>الحصة {slot.period_number}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', direction: 'ltr' }}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{slot.subject_name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)', marginTop: 2 }}>
                        {slot.grade} / {slot.class_name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <ScheduleMatchingDialog
        isOpen={matchingDialogOpen}
        onClose={() => setMatchingDialogOpen(false)}
      />
    </WsPage>
  )
}
