import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Send,
  UserMinus,
  Users,
  X
} from 'lucide-react'

// =====================================================
// Types
// =====================================================

type Teacher = {
  id: number
  name: string
  phone?: string | null
}

type StandbyTeacher = {
  id: number
  name: string
  phone?: string | null
}

type PeriodInfo = {
  period: number
  class: string
  subject: string
  session_id?: number
  standby1?: string | null
  standby2?: string | null
  standby3?: string | null
  standby4?: string | null
  standby5?: string | null
  standby6?: string | null
  standby7?: string | null
  standby1_id?: number | null
  standby2_id?: number | null
  standby3_id?: number | null
  standby4_id?: number | null
  standby5_id?: number | null
  standby6_id?: number | null
  standby7_id?: number | null
  selectedStandby?: StandbyTeacher | null
}

type SimulateAbsenceResponse = {
  success: boolean
  data: {
    teacher: Teacher
    day: string
    sessions: PeriodInfo[]
  }
}

type PresentTeachersResponse = {
  success: boolean
  data: Array<{
    id: number
    name: string
    check_in_time?: string
  }>
}

type AllStaffResponse = {
  success: boolean
  data: Array<{
    id: number
    name: string
    phone: string | null
    role: string
  }>
}

type DistributePayload = {
  date: string
  distributions: Array<{
    absent_teacher_id: number
    period_number: number
    standby_teacher_id: number
    class_session_id: number | null
    class_name: string
  }>
}

type TodayAssignmentsResponse = {
  success: boolean
  data: {
    assigned_teacher_ids: number[]
  }
}

// =====================================================
// API Functions
// =====================================================

async function fetchPresentTeachers(targetDate: string): Promise<PresentTeachersResponse> {
  const { data } = await apiClient.get(`/attendance/teacher-hudori/today`, {
    params: { date: targetDate, status: 'present' }
  })
  // تحويل البيانات لتنسيق مناسب - الـ API يرجع records مباشرة
  const records = data?.records || data?.data?.records || []
  return {
    success: true,
    data: records
      .filter((record: { user?: { id: number }; is_matched?: boolean }) => record.user?.id && record.is_matched)
      .map((record: { user: { id: number; name?: string }; employee_name?: string; check_in_time?: string }) => ({
        id: record.user.id,
        name: record.employee_name || record.user?.name || 'غير معروف',
        check_in_time: record.check_in_time
      }))
  }
}

async function simulateTeacherAbsence(teacherId: number): Promise<SimulateAbsenceResponse> {
  const { data } = await apiClient.get(`/admin/teacher-standby/simulate-absence?teacher_id=${teacherId}`)
  return data
}

async function fetchAllStaff(): Promise<AllStaffResponse> {
  const { data } = await apiClient.get('/admin/teacher-standby/all-staff')
  return data
}

async function fetchTodayAssignments(): Promise<TodayAssignmentsResponse> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await apiClient.get(`/admin/teacher-standby/daily-absences?date=${today}`)
  // استخراج IDs المعلمين الذين تم تعيينهم كبدلاء اليوم
  const assignedIds: number[] = []
  if (data.data?.absent_teachers) {
    for (const teacher of data.data.absent_teachers) {
      for (const period of teacher.periods || []) {
        if (period.selectedStandby?.id) {
          assignedIds.push(period.selectedStandby.id)
        }
      }
    }
  }
  return { success: true, data: { assigned_teacher_ids: [...new Set(assignedIds)] } }
}

async function distributeStandby(payload: DistributePayload): Promise<{ success: boolean; data: { schedule_id: number; assignments_count: number } }> {
  const { data } = await apiClient.post('/admin/teacher-standby/distribute', payload)
  return data
}

async function approveAndNotify(scheduleId: number): Promise<{ success: boolean; data: { schedule_id: number; messages_queued: number; estimated_time_minutes: number } }> {
  const { data } = await apiClient.post('/admin/teacher-standby/approve-notify', { schedule_id: scheduleId })
  return data
}

// =====================================================
// Component
// =====================================================

type LeaveRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  date?: string
}

const PERIOD_NAMES: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
}

// دالة لتحديد الحصة الحالية بناءً على الوقت
function getCurrentPeriodNumber(): number {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  // أوقات الحصص التقريبية (يمكن تعديلها)
  const periodTimes = [
    { period: 1, start: 7 * 60, end: 7 * 60 + 45 },
    { period: 2, start: 7 * 60 + 50, end: 8 * 60 + 35 },
    { period: 3, start: 8 * 60 + 40, end: 9 * 60 + 25 },
    { period: 4, start: 9 * 60 + 45, end: 10 * 60 + 30 },
    { period: 5, start: 10 * 60 + 35, end: 11 * 60 + 20 },
    { period: 6, start: 11 * 60 + 25, end: 12 * 60 + 10 },
    { period: 7, start: 12 * 60 + 15, end: 13 * 60 },
  ]

  for (const pt of periodTimes) {
    if (currentTime >= pt.start && currentTime <= pt.end) {
      return pt.period
    }
  }

  // إذا كان بعد آخر حصة، نعيد 7
  if (currentTime > 13 * 60) return 7
  // إذا كان قبل أول حصة، نعيد 1
  return 1
}

export function LeaveRequestModal({ isOpen, onClose, date }: LeaveRequestModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [periods, setPeriods] = useState<PeriodInfo[]>([])
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null)
  const [fromPeriod, setFromPeriod] = useState<number>(1)

  const today = date || new Date().toISOString().split('T')[0]

  // Queries
  const presentTeachersQuery = useQuery<PresentTeachersResponse>({
    queryKey: ['present-teachers-for-leave', today],
    queryFn: () => fetchPresentTeachers(today),
    enabled: isOpen && step === 1,
  })

  const simulateQuery = useQuery({
    queryKey: ['simulate-absence', selectedTeacher?.id],
    queryFn: () => simulateTeacherAbsence(selectedTeacher!.id),
    enabled: isOpen && !!selectedTeacher && step === 2,
  })

  const staffQuery = useQuery({
    queryKey: ['standby-all-staff'],
    queryFn: fetchAllStaff,
    enabled: isOpen && step === 2,
  })

  const todayAssignmentsQuery = useQuery({
    queryKey: ['today-standby-assignments'],
    queryFn: fetchTodayAssignments,
    enabled: isOpen && step === 2,
  })

  // Mutations
  const distributeMutation = useMutation({
    mutationFn: distributeStandby,
    onSuccess: (result) => {
      setScheduleId(result.data.schedule_id)
      setStep(3)
      toast({ type: 'success', title: `تم حفظ ${result.data.assignments_count} تعيين` })
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في حفظ التوزيع' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveAndNotify(id),
    onSuccess: (result) => {
      const queued = result.data.messages_queued || 0
      const estimatedTime = result.data.estimated_time_minutes || 0

      toast({
        type: 'success',
        title: `تم الاعتماد والجدولة`,
        description: `تم جدولة ${queued} رسالة للإرسال (الوقت المتوقع: ${estimatedTime} دقيقة)`
      })
      queryClient.invalidateQueries({ queryKey: ['standby-daily-absences'] })
      onClose()
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في الاعتماد' })
    },
  })

  // تحديد الحصة الحالية عند فتح Modal
  useEffect(() => {
    if (isOpen) {
      setFromPeriod(getCurrentPeriodNumber())
    }
  }, [isOpen])

  // Initialize periods when simulate data loads
  useEffect(() => {
    if (simulateQuery.data?.data?.sessions) {
      const assignedIds = todayAssignmentsQuery.data?.data?.assigned_teacher_ids || []

      const sessionsWithStandby = simulateQuery.data.data.sessions
        .filter(s => s.period >= fromPeriod) // فلترة الحصص المتبقية فقط
        .map(session => {
          // اختيار أول منتظر متاح لم يُعيَّن اليوم
          let selectedStandby: StandbyTeacher | null = null

          for (let i = 1; i <= 7; i++) {
            const idKey = `standby${i}_id` as keyof typeof session
            const nameKey = `standby${i}` as keyof typeof session
            const sId = session[idKey] as number | null | undefined
            const sName = session[nameKey] as string | null | undefined
            if (sId && !assignedIds.includes(sId)) {
              selectedStandby = { id: sId, name: sName || '' }
              break
            }
          }
          if (!selectedStandby && session.standby1_id) {
            // إذا كل المنتظرين معينين، اختر الأول
            selectedStandby = { id: session.standby1_id, name: session.standby1 || '' }
          }

          return {
            ...session,
            selectedStandby,
          }
        })

      setPeriods(sessionsWithStandby)
    }
  }, [simulateQuery.data, todayAssignmentsQuery.data, fromPeriod])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedTeacher(null)
      setSearchQuery('')
      setPeriods([])
      setScheduleId(null)
      setEditingPeriod(null)
    }
  }, [isOpen])

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    const teachers = presentTeachersQuery.data?.data || []
    if (!searchQuery.trim()) return teachers
    return teachers.filter((t: { id: number; name: string; check_in_time?: string }) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [presentTeachersQuery.data, searchQuery])

  // Computed distributions
  const allDistributions = useMemo(() => {
    if (!selectedTeacher) return []

    return periods
      .filter(p => p.selectedStandby)
      .map(p => ({
        absent_teacher_id: selectedTeacher.id,
        period_number: p.period,
        standby_teacher_id: p.selectedStandby!.id,
        class_session_id: p.session_id || null,
        class_name: p.class,
      }))
  }, [periods, selectedTeacher])

  // Handlers
  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setStep(2)
  }

  const updatePeriodStandby = (periodNumber: number, standby: StandbyTeacher | null) => {
    setPeriods(prev => prev.map(p =>
      p.period === periodNumber ? { ...p, selectedStandby: standby } : p
    ))
    setEditingPeriod(null)
  }

  const handleDistribute = () => {
    if (allDistributions.length === 0) {
      toast({ type: 'error', title: 'لا توجد تعيينات للحفظ' })
      return
    }
    distributeMutation.mutate({ date: today, distributions: allDistributions })
  }

  const handleApprove = () => {
    if (!scheduleId) return
    approveMutation.mutate(scheduleId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-orange-50 px-6 py-4">
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-orange-600" />
              استئذان معلم
            </h2>
            <p className="text-sm text-muted">تسجيل استئذان وتوزيع الحصص المتبقية</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${step === s
                    ? 'bg-orange-600 text-white'
                    : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                    }`}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {step === 1 ? (
            /* Step 1: Select teacher */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">اختر المعلم المستأذن</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                  {filteredTeachers.length} معلم حاضر
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن معلم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* من أي حصة */}
              <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <label className="text-sm font-medium text-orange-800">الاستئذان من الحصة:</label>
                <select
                  value={fromPeriod}
                  onChange={(e) => setFromPeriod(Number(e.target.value))}
                  className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(p => (
                    <option key={p} value={p}>{PERIOD_NAMES[p]} ({p})</option>
                  ))}
                </select>
                <span className="text-xs text-orange-600">وما بعدها</span>
              </div>

              {/* Teachers list */}
              {presentTeachersQuery.isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  جاري تحميل المعلمين...
                </div>
              ) : presentTeachersQuery.isError ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-rose-600">
                  <AlertCircle className="h-8 w-8" />
                  حدث خطأ في تحميل البيانات
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
                  <Users className="h-12 w-12 text-slate-300" />
                  <p>لا يوجد معلمين حاضرين</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-200">
                  <div className="divide-y divide-slate-100">
                    {filteredTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        onClick={() => handleSelectTeacher(teacher)}
                        className="flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-orange-50"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{teacher.name}</p>
                          {teacher.check_in_time && (
                            <p className="text-xs text-muted">حضر الساعة {teacher.check_in_time}</p>
                          )}
                        </div>
                        <ChevronLeft className="h-5 w-5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : step === 2 ? (
            /* Step 2: Review and modify substitutes */
            <div className="space-y-4">
              {simulateQuery.isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  جاري تحميل حصص المعلم...
                </div>
              ) : simulateQuery.isError ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-rose-600">
                  <AlertCircle className="h-8 w-8" />
                  حدث خطأ في تحميل البيانات
                </div>
              ) : periods.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
                  <Check className="h-12 w-12 text-emerald-500" />
                  <p className="text-lg font-semibold text-slate-700">لا توجد حصص متبقية</p>
                  <p className="text-sm">لا توجد حصص للمعلم من الحصة {PERIOD_NAMES[fromPeriod]} وما بعدها</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                    <UserMinus className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">{selectedTeacher?.name}</span>
                    <span className="text-sm text-orange-700">— {periods.length} حصة متبقية</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="w-24 px-4 py-3 text-right font-semibold text-slate-600">الحصة</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600">الصف</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600">المادة</th>
                          <th className="w-56 px-4 py-3 text-right font-semibold text-slate-600">البديل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((period) => (
                          <tr key={period.period} className="border-b last:border-b-0 hover:bg-slate-50">
                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                              {PERIOD_NAMES[period.period] || period.period}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{period.class}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{period.subject}</td>
                            <td className="px-4 py-3">
                              {editingPeriod === period.period ? (
                                <select
                                  autoFocus
                                  className="w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  value={period.selectedStandby?.id ?? ''}
                                  onChange={(e) => {
                                    const id = Number(e.target.value)
                                    const staff = staffQuery.data?.data.find(s => s.id === id)
                                    updatePeriodStandby(
                                      period.period,
                                      staff ? { id: staff.id, name: staff.name, phone: staff.phone } : null
                                    )
                                  }}
                                  onBlur={() => setEditingPeriod(null)}
                                >
                                  <option value="">-- اختر بديل --</option>
                                  {([1,2,3,4,5,6,7] as const).map(i => {
                                    const sId = period[`standby${i}_id` as keyof PeriodInfo] as number | null | undefined
                                    const sName = period[`standby${i}` as keyof PeriodInfo] as string | null | undefined
                                    if (!sId) return null
                                    return (
                                      <option key={i} value={sId}>
                                        {todayAssignmentsQuery.data?.data?.assigned_teacher_ids?.includes(sId) ? '⚠️' : '⭐'} {sName} (منتظر {i})
                                      </option>
                                    )
                                  })}
                                  <optgroup label="جميع المعلمين">
                                    {staffQuery.data?.data.map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              ) : (
                                <button
                                  onClick={() => setEditingPeriod(period.period)}
                                  className={`w-full rounded-lg border px-3 py-2 text-sm text-right transition ${period.selectedStandby
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                >
                                  {period.selectedStandby?.name ?? 'لا يوجد بديل - اضغط للاختيار'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-muted">
                    <span className="text-orange-600">⚠️</span> = تم تعيينه سابقاً اليوم &nbsp;&nbsp;
                    <span className="text-yellow-600">⭐</span> = منتظر من الجدول الأسبوعي
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Step 3: Confirmation */
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <Check className="mx-auto mb-2 h-12 w-12 text-emerald-600" />
                <h3 className="text-xl font-bold text-emerald-800">تم حفظ الاستئذان بنجاح</h3>
                <p className="text-emerald-600">{allDistributions.length} حصة جاهزة للاعتماد</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-semibold text-slate-900">ملخص التوزيع - {selectedTeacher?.name}</h4>
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">الحصة</th>
                      <th className="px-3 py-2">الفصل</th>
                      <th className="px-3 py-2">البديل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.filter(p => p.selectedStandby).map((period) => (
                      <tr key={period.period} className="border-t border-slate-100">
                        <td className="px-3 py-2">{PERIOD_NAMES[period.period] || period.period}</td>
                        <td className="px-3 py-2">{period.class}</td>
                        <td className="px-3 py-2 font-semibold">{period.selectedStandby?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            {step > 1 && step < 3 && (
              <button
                onClick={() => {
                  if (step === 2) {
                    setSelectedTeacher(null)
                    setPeriods([])
                  }
                  setStep((step - 1) as 1 | 2)
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 2 && periods.length > 0 && (
              <button
                onClick={handleDistribute}
                disabled={distributeMutation.isPending || allDistributions.length === 0}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {distributeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    حفظ التوزيع
                    <ChevronLeft className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    اعتماد وإرسال واتساب
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
