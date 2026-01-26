import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Calendar,
  Users,
  Clock,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Sun,
  Sunset,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  Trash2,
  Printer,
} from 'lucide-react'
import {
  fetchDutyScheduleSemesters,
  fetchDutySchedule,
  fetchDutyScheduleAvailableStaff,
  generateDutySchedule,
  updateDutyScheduleAssignment,
  deleteDutyScheduleAssignments,
  type DutyScheduleSemester,
  type DutyScheduleAssignment,
  type DutyScheduleStaffCount,
} from '@/modules/admin/api'
import { useToast } from '@/shared/feedback/use-toast'
import { printDutySignatureSheet } from '@/modules/admin/utils/print-duty-signature-sheet'

interface DutyScheduleModalProps {
  open: boolean
  onClose: () => void
}

type DutyType = 'morning' | 'afternoon'
type ViewMode = 'settings' | 'schedule' | 'edit'

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
}

export function DutyScheduleModal({ open, onClose }: DutyScheduleModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  // الحالة
  const [selectedSemester, setSelectedSemester] = useState<DutyScheduleSemester | null>(null)
  const [selectedDutyType, setSelectedDutyType] = useState<DutyType>('afternoon')
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('settings')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [editingAssignment, setEditingAssignment] = useState<number | null>(null)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [printDutyType, setPrintDutyType] = useState<'morning' | 'afternoon' | 'all'>('all')

  // جلب الفصول الدراسية
  const semestersQuery = useQuery({
    queryKey: ['duty-schedules', 'semesters'],
    queryFn: fetchDutyScheduleSemesters,
    enabled: open,
    staleTime: 60_000,
  })

  // تعيين الفصل الحالي تلقائياً
  useMemo(() => {
    if (semestersQuery.data && !selectedSemester) {
      const current = semestersQuery.data.find((s) => s.is_current)
      if (current) setSelectedSemester(current)
    }
  }, [semestersQuery.data, selectedSemester])

  // جلب جدول المناوبة
  const scheduleQuery = useQuery({
    queryKey: ['duty-schedules', selectedSemester?.id, selectedDutyType],
    queryFn: () => fetchDutySchedule(selectedSemester!.id, selectedDutyType),
    enabled: open && !!selectedSemester,
    staleTime: 30_000,
  })

  // جلب المعلمين المتاحين
  const staffQuery = useQuery({
    queryKey: ['duty-schedules', 'available-staff'],
    queryFn: fetchDutyScheduleAvailableStaff,
    enabled: open,
    staleTime: 60_000,
  })

  // توليد الجدول
  const generateMutation = useMutation({
    mutationFn: generateDutySchedule,
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: 'تم توليد جدول المناوبة',
        description: `${result.assignments_count} تكليف لـ ${result.staff_count} معلم`,
      })
      void queryClient.invalidateQueries({ queryKey: ['duty-schedules'] })
      setViewMode('schedule')
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'فشل توليد الجدول',
        description: error instanceof Error ? error.message : 'حدث خطأ',
      })
    },
  })

  // تحديث تكليف
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number }) =>
      updateDutyScheduleAssignment(id, { user_id: userId }),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث التكليف' })
      void queryClient.invalidateQueries({ queryKey: ['duty-schedules'] })
      setEditingAssignment(null)
      setEditUserId(null)
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'فشل التحديث',
        description: error instanceof Error ? error.message : 'حدث خطأ',
      })
    },
  })

  // حذف المناوبات
  const deleteMutation = useMutation({
    mutationFn: ({ scheduleId, dutyType }: { scheduleId: number; dutyType?: 'morning' | 'afternoon' }) =>
      deleteDutyScheduleAssignments(scheduleId, dutyType),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: 'تم حذف المناوبات',
        description: `تم حذف ${result.deleted_count} تكليف`,
      })
      void queryClient.invalidateQueries({ queryKey: ['duty-schedules'] })
      setViewMode('settings')
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'فشل حذف المناوبات',
        description: error instanceof Error ? error.message : 'حدث خطأ',
      })
    },
  })

  // التعامل مع اختيار المعلمين
  const toggleStaff = useCallback((staffId: number) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    )
  }, [])

  const selectAllStaff = useCallback(() => {
    if (staffQuery.data) {
      setSelectedStaffIds(staffQuery.data.map((s) => s.id))
    }
  }, [staffQuery.data])

  const clearStaffSelection = useCallback(() => {
    setSelectedStaffIds([])
  }, [])

  // توليد الجدول
  const handleGenerate = () => {
    if (!selectedSemester) {
      toast({ type: 'error', title: 'اختر الفصل الدراسي' })
      return
    }
    if (selectedStaffIds.length === 0) {
      toast({ type: 'error', title: 'اختر معلماً واحداً على الأقل' })
      return
    }

    generateMutation.mutate({
      semester_id: selectedSemester.id,
      duty_type: selectedDutyType,
      staff_ids: selectedStaffIds,
    })
  }

  // حذف المناوبات
  const handleDelete = () => {
    if (!scheduleQuery.data?.schedule?.id) {
      toast({ type: 'error', title: 'لا يوجد جدول مناوبة للحذف' })
      return
    }
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (!scheduleQuery.data?.schedule?.id) return

    deleteMutation.mutate({
      scheduleId: scheduleQuery.data.schedule.id,
      dutyType: selectedDutyType,
    })
    setShowDeleteConfirm(false)
  }

  // تجميع التكليفات حسب التاريخ
  const groupedAssignments = useMemo(() => {
    if (!scheduleQuery.data?.assignments) return new Map<string, DutyScheduleAssignment[]>()

    const grouped = new Map<string, DutyScheduleAssignment[]>()
    for (const assignment of scheduleQuery.data.assignments) {
      const key = assignment.duty_date
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(assignment)
    }
    return grouped
  }, [scheduleQuery.data?.assignments])

  // toggle يوم
  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  // فتح/إغلاق الكل
  const expandAll = () => {
    setExpandedDays(new Set(groupedAssignments.keys()))
  }
  const collapseAll = () => {
    setExpandedDays(new Set())
  }

  if (!open) return null

  const hasSchedule = scheduleQuery.data?.schedule && scheduleQuery.data.assignments.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <Calendar className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">المناوبة الفصلية</h2>
              <p className="text-sm text-muted">توزيع المناوبة على أيام الفصل الدراسي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* اختيار الفصل ونوع المناوبة */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {/* الفصل الدراسي */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">الفصل الدراسي</label>
              {semestersQuery.isLoading ? (
                <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <select
                  value={selectedSemester?.id ?? ''}
                  onChange={(e) => {
                    const s = semestersQuery.data?.find((s) => s.id === Number(e.target.value))
                    setSelectedSemester(s ?? null)
                    setViewMode('settings')
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="">اختر الفصل</option>
                  {semestersQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_current ? '(الحالي)' : ''} - {s.academic_year}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* نوع المناوبة */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">نوع المناوبة</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDutyType('morning')
                    setViewMode('settings')
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${selectedDutyType === 'morning'
                      ? 'bg-blue-600 text-white shadow'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Sun className="h-4 w-4" />
                  بداية الدوام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDutyType('afternoon')
                    setViewMode('settings')
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${selectedDutyType === 'afternoon'
                      ? 'bg-orange-600 text-white shadow'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Sunset className="h-4 w-4" />
                  نهاية الدوام
                </button>
              </div>
            </div>
          </div>

          {/* معلومات الفصل */}
          {selectedSemester && (
            <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-muted">تاريخ البداية:</span>{' '}
                  <span className="font-semibold text-slate-900">{selectedSemester.start_date}</span>
                </div>
                <div>
                  <span className="text-muted">تاريخ النهاية:</span>{' '}
                  <span className="font-semibold text-slate-900">{selectedSemester.end_date}</span>
                </div>
                <div>
                  <span className="text-muted">عدد الأيام:</span>{' '}
                  <span className="font-semibold text-slate-900">{selectedSemester.total_days} يوم</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {scheduleQuery.isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="mt-3 text-sm text-muted">جارٍ تحميل جدول المناوبة...</p>
            </div>
          )}

          {/* إذا لم يوجد جدول - عرض واجهة التوليد */}
          {!scheduleQuery.isLoading && selectedSemester && !hasSchedule && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">لم يتم توليد جدول المناوبة بعد</p>
                    <p className="mt-1 text-sm text-amber-700">
                      اختر المعلمين المشاركين في المناوبة ثم اضغط "توليد الجدول"
                    </p>
                  </div>
                </div>
              </div>

              {/* اختيار المعلمين */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    المعلمون المشاركون ({selectedStaffIds.length} مختار)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllStaff}
                      className="text-xs font-medium text-orange-600 hover:underline"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearStaffSelection}
                      className="text-xs font-medium text-slate-500 hover:underline"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                {staffQuery.isLoading ? (
                  <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                    <div className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
                      {staffQuery.data?.map((staff) => (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => toggleStaff(staff.id)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-right text-sm transition ${selectedStaffIds.includes(staff.id)
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border ${selectedStaffIds.includes(staff.id)
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-slate-300 bg-white'
                              }`}
                          >
                            {selectedStaffIds.includes(staff.id) && <Check className="h-3 w-3" />}
                          </span>
                          <span className="truncate">{staff.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* زر التوليد */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || selectedStaffIds.length === 0}
                className="w-full rounded-2xl bg-orange-600 px-6 py-4 text-base font-bold text-white shadow transition hover:bg-orange-700 disabled:opacity-60"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="ml-2 inline h-5 w-5" />
                    توليد جدول المناوبة
                  </>
                )}
              </button>
            </div>
          )}

          {/* إذا وجد جدول - عرضه */}
          {!scheduleQuery.isLoading && hasSchedule && (
            <div className="space-y-4">
              {/* الإحصائيات */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {scheduleQuery.data?.stats.total_assignments ?? 0}
                  </p>
                  <p className="text-xs text-orange-600">إجمالي التكليفات</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-700">
                    {scheduleQuery.data?.stats.unique_staff ?? 0}
                  </p>
                  <p className="text-xs text-muted">معلم مشارك</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {scheduleQuery.data?.stats.by_status.completed ?? 0}
                  </p>
                  <p className="text-xs text-emerald-600">مكتملة</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4 text-center">
                  <p className="text-2xl font-bold text-rose-600">
                    {scheduleQuery.data?.stats.by_status.absent ?? 0}
                  </p>
                  <p className="text-xs text-rose-600">غياب</p>
                </div>
              </div>

              {/* إحصائيات المعلمين */}
              {scheduleQuery.data?.staff_counts && scheduleQuery.data.staff_counts.length > 0 && (
                <div className="rounded-xl border border-slate-300 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-200">
                        {[1, 2, 3, 4].map((col) => (
                          <React.Fragment key={col}>
                            <th className="px-2 py-1.5 text-right text-slate-700 font-semibold border-l border-slate-300 first:border-l-0">المعلم</th>
                            <th className="px-2 py-1.5 text-center text-slate-700 font-semibold border-l border-slate-300 w-10">#</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const staffList = scheduleQuery.data.staff_counts
                        const rows = []
                        for (let i = 0; i < staffList.length; i += 4) {
                          rows.push(staffList.slice(i, i + 4))
                        }
                        return rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.map((staff: DutyScheduleStaffCount) => (
                              <React.Fragment key={staff.user_id}>
                                <td className="px-2 py-1.5 text-slate-700 border-t border-l border-slate-200 first:border-l-0">
                                  {staff.name}
                                </td>
                                <td className="px-2 py-1.5 text-center font-bold text-orange-600 border-t border-l border-slate-200">
                                  {staff.total}
                                </td>
                              </React.Fragment>
                            ))}
                            {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, idx) => (
                              <React.Fragment key={`empty-${idx}`}>
                                <td className="px-2 py-1.5 border-t border-l border-slate-200"></td>
                                <td className="px-2 py-1.5 border-t border-l border-slate-200"></td>
                              </React.Fragment>
                            ))}
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* أزرار التحكم */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronDown className="ml-1 inline h-3 w-3" />
                    فتح الكل
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronUp className="ml-1 inline h-3 w-3" />
                    إغلاق الكل
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrintOptions(true)}
                    className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                  >
                    <Printer className="ml-1 inline h-3 w-3" />
                    طباعة الكشف
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('settings')}
                    className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-200"
                  >
                    <RefreshCw className="ml-1 inline h-3 w-3" />
                    إعادة التوليد
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="ml-1 inline h-3 w-3" />
                    )}
                    حذف المناوبات
                  </button>
                </div>
              </div>

              {/* جدول المناوبة */}
              <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                {Array.from(groupedAssignments.entries()).map(([date, assignments]) => {
                  const dayDate = new Date(date)
                  const dayName = WEEKDAY_NAMES[dayDate.getDay()] ?? ''
                  const isExpanded = expandedDays.has(date)
                  const isToday = new Date().toISOString().slice(0, 10) === date

                  return (
                    <div
                      key={date}
                      className={`rounded-xl border ${isToday ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100 bg-white'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDay(date)}
                        className="flex w-full items-center justify-between px-4 py-3 text-right"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isToday ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            <Clock className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {dayName} - {date}
                              {isToday && (
                                <span className="mr-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] text-white">
                                  اليوم
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted">
                              {assignments.length} مكلف •{' '}
                              {assignments[0]?.start_time} - {assignments[0]?.end_time}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <div className="space-y-2">
                            {assignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                              >
                                {editingAssignment === assignment.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <select
                                      value={editUserId ?? assignment.user_id}
                                      onChange={(e) => setEditUserId(Number(e.target.value))}
                                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                                    >
                                      {staffQuery.data?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editUserId && editUserId !== assignment.user_id) {
                                          updateAssignmentMutation.mutate({
                                            id: assignment.id,
                                            userId: editUserId,
                                          })
                                        } else {
                                          setEditingAssignment(null)
                                          setEditUserId(null)
                                        }
                                      }}
                                      disabled={updateAssignmentMutation.isPending}
                                      className="rounded-lg bg-emerald-500 p-1.5 text-white hover:bg-emerald-600"
                                    >
                                      {updateAssignmentMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAssignment(null)
                                        setEditUserId(null)
                                      }}
                                      className="rounded-lg bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm font-medium text-slate-800">
                                        {assignment.user_name ?? 'غير محدد'}
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${assignment.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : assignment.status === 'absent'
                                              ? 'bg-rose-100 text-rose-700'
                                              : assignment.status === 'notified'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-slate-100 text-slate-600'
                                          }`}
                                      >
                                        {assignment.status_name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAssignment(assignment.id)
                                        setEditUserId(assignment.user_id)
                                      }}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* إعادة التوليد */}
              {viewMode === 'settings' && (
                <div className="mt-4 space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-semibold text-orange-800">
                    ⚠️ إعادة التوليد ستحذف جميع التكليفات الحالية
                  </p>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-orange-700">
                      اختر المعلمين للتوليد الجديد
                    </label>
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-white p-2">
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {staffQuery.data?.map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => toggleStaff(staff.id)}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-right text-xs transition ${selectedStaffIds.includes(staff.id)
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border ${selectedStaffIds.includes(staff.id)
                                  ? 'border-orange-500 bg-orange-500 text-white'
                                  : 'border-slate-300'
                                }`}
                            >
                              {selectedStaffIds.includes(staff.id) && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span className="truncate">{staff.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending || selectedStaffIds.length === 0}
                    className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow transition hover:bg-orange-700 disabled:opacity-60"
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    ) : (
                      'إعادة توليد الجدول'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            إغلاق
          </button>
        </footer>
      </div>

      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="mb-6 text-slate-700">
              هل أنت متأكد من حذف جميع المناوبات{' '}
              <strong className="text-rose-600">
                {selectedDutyType === 'morning' ? 'الصباحية' : 'المسائية'}
              </strong>
              ؟
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  'نعم، احذف'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة اختيار نوع الكشف للطباعة */}
      {showPrintOptions && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Printer className="h-6 w-6 text-emerald-600" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">طباعة كشف التوقيع</h3>
                <p className="text-sm text-slate-500">اختر نوع المناوبة للطباعة</p>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="printDutyType"
                  value="morning"
                  checked={printDutyType === 'morning'}
                  onChange={() => setPrintDutyType('morning')}
                  className="h-4 w-4 accent-emerald-600"
                />
                <Sun className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-slate-700">بداية الدوام</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="printDutyType"
                  value="afternoon"
                  checked={printDutyType === 'afternoon'}
                  onChange={() => setPrintDutyType('afternoon')}
                  className="h-4 w-4 accent-emerald-600"
                />
                <Sunset className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-slate-700">نهاية الدوام</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="printDutyType"
                  value="all"
                  checked={printDutyType === 'all'}
                  onChange={() => setPrintDutyType('all')}
                  className="h-4 w-4 accent-emerald-600"
                />
                <Calendar className="h-5 w-5 text-slate-500" />
                <span className="font-medium text-slate-700">الكل</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPrintOptions(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scheduleQuery.data?.assignments) {
                    void printDutySignatureSheet({
                      assignments: scheduleQuery.data.assignments,
                      dutyType: printDutyType,
                      semesterName: selectedSemester?.name ?? '',
                    })
                  }
                  setShowPrintOptions(false)
                }}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Printer className="ml-1 inline h-4 w-4" />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DutyScheduleModal
