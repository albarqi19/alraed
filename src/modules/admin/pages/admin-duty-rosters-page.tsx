import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Users, Loader2, Eye, UserX, AlertCircle, Phone, Settings, UserPlus, RefreshCcw, Clock, CheckCircle2, Send, FileText, TrendingUp, Calendar, Sunset } from 'lucide-react'

import { DutyRosterSettingsModal } from '@/modules/admin/components/duty-roster-settings-panel'
import { DutyRosterTemplatesPanel } from '@/modules/admin/components/duty-roster-templates-panel'
import { DutyScheduleModal } from '@/modules/admin/components/duty-schedule-modal'
import { TeacherStatsModal } from '@/modules/admin/components/teacher-stats-modal'
import {
  fetchTodaySupervisions,
  recordSupervisionAbsence,
  fetchTodayDutySchedules,
  type TodaySupervisionItem,
  type TodaySupervisionTeacher,
  type RecordSupervisionAbsencePayload,
  type DutyScheduleTodayItem,
} from '@/modules/admin/api'
import { useToast } from '@/shared/feedback/use-toast'
import { useTeachersQuery } from '@/modules/admin/hooks'
import { openDailySupervisionReport } from '@/modules/admin/utils/open-daily-supervision-report'

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
}

export function AdminDutyRostersPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<'today' | 'templates'>('today')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDutyScheduleOpen, setIsDutyScheduleOpen] = useState(false)
  const [teacherStatsModal, setTeacherStatsModal] = useState<{ userId: number; userName: string } | null>(null)
  const [replacementModalData, setReplacementModalData] = useState<{
    supervision: TodaySupervisionItem
    teacher: TodaySupervisionTeacher
  } | null>(null)

  const teachersQuery = useTeachersQuery()
  const allTeachers = teachersQuery.data ?? []

  const supervisionsQuery = useQuery({
    queryKey: ['admin', 'duty-rosters', 'today', selectedDate],
    queryFn: () => fetchTodaySupervisions(selectedDate),
    staleTime: 30_000,
  })

  // جلب مناوبات التاريخ المحدد (المناوبة الفصلية)
  const dutySchedulesQuery = useQuery({
    queryKey: ['admin', 'duty-schedules', 'today', selectedDate],
    queryFn: () => fetchTodayDutySchedules(selectedDate),
    staleTime: 30_000,
  })

  const recordAbsenceMutation = useMutation({
    mutationFn: (payload: RecordSupervisionAbsencePayload) => recordSupervisionAbsence(payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تسجيل عدم الحضور بنجاح' })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'duty-rosters', 'today'] })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'فشل تسجيل عدم الحضور',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    },
  })

  const handleRecordAbsence = async (supervision: TodaySupervisionItem, teacher: TodaySupervisionTeacher) => {
    const reason = window.prompt(`سبب عدم حضور ${teacher.name} (اختياري):`)
    await recordAbsenceMutation.mutateAsync({
      template_id: supervision.template_id,
      user_id: teacher.user_id,
      date: selectedDate,
      reason: reason || null,
    })
  }

  const handleAssignReplacement = (supervision: TodaySupervisionItem, teacher: TodaySupervisionTeacher) => {
    setReplacementModalData({ supervision, teacher })
  }

  const closeReplacementModal = () => {
    setReplacementModalData(null)
  }

  const supervisions = supervisionsQuery.data?.data ?? []
  const dutySchedules = dutySchedulesQuery.data?.data ?? []
  const meta = supervisionsQuery.data?.meta

  const isLoading = supervisionsQuery.isLoading
  const isError = supervisionsQuery.isError
  const errorMessage = supervisionsQuery.error instanceof Error ? supervisionsQuery.error.message : 'حدث خطأ غير متوقع'

  // تحويل الوقت بصيغة 12 ساعة إلى دقائق للمقارنة
  const timeToMinutes = (timeStr: string | null | undefined): number => {
    if (!timeStr) return 0
    // إزالة ص/م وتحويل الوقت
    const cleaned = timeStr.replace(/\s*[صم]\s*$/g, '').trim()
    const isPM = timeStr.includes('م')
    const isAM = timeStr.includes('ص')
    const [hourStr, minStr] = cleaned.split(':')
    let hour = parseInt(hourStr, 10) || 0
    const min = parseInt(minStr, 10) || 0

    // تحويل لـ 24 ساعة
    if (isPM && hour !== 12) hour += 12
    if (isAM && hour === 12) hour = 0

    return hour * 60 + min
  }

  // دمج الإشراف والمناوبات في قائمة واحدة مرتبة
  type TimelineItem =
    | { type: 'supervision'; data: TodaySupervisionItem; sortTime: number }
    | { type: 'duty'; data: DutyScheduleTodayItem; sortTime: number }

  const sortedTimeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []

    // إضافة الإشراف
    for (const sup of supervisions) {
      items.push({
        type: 'supervision',
        data: sup,
        sortTime: timeToMinutes(sup.window_start),
      })
    }

    // إضافة المناوبات
    for (const duty of dutySchedules) {
      items.push({
        type: 'duty',
        data: duty,
        sortTime: timeToMinutes(duty.start_time),
      })
    }

    // ترتيب حسب الوقت
    return items.sort((a, b) => a.sortTime - b.sortTime)
  }, [supervisions, dutySchedules])

  // ترتيب الإشرافات حسب وقت البداية (للاستخدام في أماكن أخرى)
  const sortedSupervisions = useMemo(() => {
    return [...supervisions].sort((a, b) => {
      const timeA = a.window_start || '00:00'
      const timeB = b.window_start || '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [supervisions])

  // إحصائيات
  const stats = useMemo(() => {
    const totalSupervisions = supervisions.length
    const totalTeachers = supervisions.reduce((sum, s) => sum + s.teachers.length, 0)
    const totalAbsent = supervisions.reduce((sum, s) => sum + s.absence_records.length, 0)
    const totalPresent = totalTeachers - totalAbsent
    const attendanceRate = totalTeachers > 0 ? Math.round((totalPresent / totalTeachers) * 100) : 0
    const replacementsAssigned = supervisions.reduce(
      (sum, s) => sum + s.absence_records.filter(r => r.replacement_user_name).length, 0
    )
    return { totalSupervisions, totalTeachers, totalAbsent, totalPresent, attendanceRate, replacementsAssigned }
  }, [supervisions])

  // القادم قريباً
  const upcomingSupervision = useMemo(() => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const upcoming = sortedSupervisions.find(s => s.window_start && s.window_start > currentTime)
    if (!upcoming) return null

    // حساب الوقت المتبقي
    const [upcomingHour, upcomingMin] = upcoming.window_start!.split(':').map(Number)
    const upcomingDate = new Date()
    upcomingDate.setHours(upcomingHour, upcomingMin, 0, 0)
    const diffMs = upcomingDate.getTime() - now.getTime()
    const diffMins = Math.max(0, Math.floor(diffMs / 60000))

    return { ...upcoming, minutesUntil: diffMins }
  }, [sortedSupervisions])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const isTeacherAbsent = (supervision: TodaySupervisionItem, userId: number) => {
    return supervision.absence_records.some(
      (record) => record.user_id === userId && (record.status === 'absent' || record.status === 'replacement_assigned')
    )
  }

  const getAbsenceRecord = (supervision: TodaySupervisionItem, userId: number) => {
    return supervision.absence_records.find((r) => r.user_id === userId)
  }

  const handleSendReminders = () => {
    toast({ type: 'info', title: 'جارٍ إرسال التذكيرات...', description: 'سيتم إرسال رسائل واتساب للمعلمين المكلفين' })
  }

  const handleExportReport = () => {
    openDailySupervisionReport({
      date: selectedDate,
      supervisions,
      dutySchedules,
    })
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-right">
          <h1 className="text-3xl font-bold text-slate-900">الإشراف اليومي</h1>
          <p className="text-sm text-muted">
            عرض جدول الإشراف اليومي مباشرة من القوالب الأسبوعية.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="inline-flex rounded-3xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('today')}
              className={`rounded-3xl px-4 py-1.5 font-semibold transition ${activeView === 'today'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Eye className="inline-block h-4 w-4 ml-1" />
              إشراف اليوم
            </button>
            <button
              type="button"
              onClick={() => setActiveView('templates')}
              className={`rounded-3xl px-4 py-1.5 font-semibold transition ${activeView === 'templates'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Users className="inline-block h-4 w-4 ml-1" />
              قوالب الأسبوع
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDutyScheduleOpen(true)}
              className="button-primary flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              المناوبة
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="button-secondary flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              الإعدادات
            </button>
            {activeView === 'today' && (
              <>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  className="button-secondary flex items-center gap-2 disabled:opacity-60"
                  onClick={() => supervisionsQuery.refetch()}
                  disabled={supervisionsQuery.isFetching}
                >
                  {supervisionsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  تحديث
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <DutyRosterSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DutyScheduleModal open={isDutyScheduleOpen} onClose={() => setIsDutyScheduleOpen(false)} />

      {activeView === 'today' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          {/* Timeline الرئيسي */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {isError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-sm text-rose-700">
                <AlertCircle className="h-8 w-8" />
                <p className="font-semibold">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => supervisionsQuery.refetch()}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                جارٍ تحميل إشراف اليوم...
              </div>
            ) : sortedSupervisions.length === 0 && (!dutySchedulesQuery.data?.data || dutySchedulesQuery.data.data.length === 0) ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <CalendarClock className="h-12 w-12 text-slate-300" />
                <p className="font-semibold">لا توجد إشرافات أو مناوبات لهذا اليوم</p>
                <p className="text-xs">تأكد من إنشاء قوالب أسبوعية وتعيين معلمين ليوم {WEEKDAY_LABELS[meta?.weekday ?? ''] || 'هذا اليوم'}</p>
                <button
                  type="button"
                  onClick={() => setActiveView('templates')}
                  className="mt-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  إدارة قوالب الأسبوع
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* خط الـ Timeline */}
                <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-300 to-indigo-200" />

                <div className="space-y-6">
                  {sortedTimeline.map((item) => {
                    if (item.type === 'supervision') {
                      const supervision = item.data
                      return (
                        <div key={`sup-${supervision.template_id}`} className="relative pr-14">
                          {/* نقطة الوقت */}
                          <div className="absolute right-0 flex flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm border-4 border-white">
                              <Clock className="h-5 w-5" />
                            </div>
                            <span className="mt-1 text-xs font-bold text-indigo-600">
                              {supervision.window_start || '—'}
                            </span>
                          </div>

                          {/* بطاقة الإشراف */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                            {/* رأس البطاقة */}
                            <div className="bg-gradient-to-l from-indigo-50 to-white px-5 py-3 border-b border-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="text-right">
                                  <h3 className="text-lg font-bold text-slate-900">{supervision.name}</h3>
                                  <p className="text-xs text-indigo-600">{supervision.shift_type}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                                    {supervision.window_start} - {supervision.window_end}
                                  </span>
                                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    {supervision.teachers.length} معلم
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* قائمة المعلمين */}
                            <div className="divide-y divide-slate-100">
                              {supervision.teachers.map((teacher) => {
                                const absent = isTeacherAbsent(supervision, teacher.user_id)
                                const absenceRecord = getAbsenceRecord(supervision, teacher.user_id)

                                return (
                                  <div
                                    key={teacher.user_id}
                                    className={`flex items-center justify-between px-5 py-3 ${absent ? 'bg-rose-50/50' : 'bg-white'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${absent ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {absent ? <UserX className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                      </div>
                                      <div className="text-right">
                                        <button
                                          type="button"
                                          className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline transition-colors cursor-pointer"
                                          onClick={() => setTeacherStatsModal({ userId: teacher.user_id, userName: teacher.name })}
                                        >
                                          {teacher.name}
                                        </button>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          {teacher.phone && (
                                            <span className="flex items-center gap-1 text-xs text-muted">
                                              <Phone className="h-3 w-3" />
                                              {teacher.phone}
                                            </span>
                                          )}
                                          {absenceRecord?.reason && (
                                            <span className="text-xs text-rose-500">السبب: {absenceRecord.reason}</span>
                                          )}
                                          {absenceRecord?.replacement_user_name && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                              <UserPlus className="h-3 w-3" />
                                              البديل: {absenceRecord.replacement_user_name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* أزرار الإجراءات */}
                                    <div className="flex items-center gap-2">
                                      {!absent ? (
                                        <>
                                          <button
                                            type="button"
                                            className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-60"
                                            onClick={() => handleRecordAbsence(supervision, teacher)}
                                            disabled={recordAbsenceMutation.isPending}
                                          >
                                            {recordAbsenceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'عدم الحضور'}
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                                            onClick={() => handleAssignReplacement(supervision, teacher)}
                                          >
                                            <UserPlus className="inline h-3 w-3 ml-1" />
                                            بديل
                                          </button>
                                        </>
                                      ) : !absenceRecord?.replacement_user_name ? (
                                        <button
                                          type="button"
                                          className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                                          onClick={() => handleAssignReplacement(supervision, teacher)}
                                        >
                                          <UserPlus className="inline h-3 w-3 ml-1" />
                                          تعيين بديل
                                        </button>
                                      ) : (
                                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-500">تم التعيين</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      // المناوبة
                      const duty = item.data
                      return (
                        <div key={`duty-${duty.id}`} className="relative pr-14">
                          {/* نقطة الوقت - لون برتقالي للمناوبة */}
                          <div className="absolute right-0 flex flex-col items-center">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm border-4 border-white ${duty.duty_type === 'afternoon'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-blue-100 text-blue-600'
                              }`}>
                              <Sunset className="h-5 w-5" />
                            </div>
                            <span className={`mt-1 text-xs font-bold ${duty.duty_type === 'afternoon' ? 'text-orange-600' : 'text-blue-600'
                              }`}>
                              {duty.start_time || '—'}
                            </span>
                          </div>

                          {/* بطاقة المناوبة */}
                          <div className={`rounded-2xl border overflow-hidden ${duty.duty_type === 'afternoon'
                            ? 'border-orange-200 bg-orange-50/50'
                            : 'border-blue-200 bg-blue-50/50'
                            }`}>
                            {/* رأس البطاقة */}
                            <div className={`px-5 py-3 border-b ${duty.duty_type === 'afternoon'
                              ? 'bg-gradient-to-l from-orange-100 to-white border-orange-100'
                              : 'bg-gradient-to-l from-blue-100 to-white border-blue-100'
                              }`}>
                              <div className="flex items-center justify-between">
                                <div className="text-right">
                                  <h3 className="text-lg font-bold text-slate-900">{duty.duty_type_name}</h3>
                                  <p className={`text-xs ${duty.duty_type === 'afternoon' ? 'text-orange-600' : 'text-blue-600'}`}>
                                    مناوبة فصلية
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                                    {duty.start_time} - {duty.end_time}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${duty.duty_type === 'afternoon'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    <Calendar className="inline h-3 w-3 ml-1" />
                                    مناوبة
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* المعلم المكلف */}
                            <div className="px-5 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${duty.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : duty.status === 'absent'
                                      ? 'bg-rose-100 text-rose-600'
                                      : duty.duty_type === 'afternoon'
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {duty.status === 'completed' ? (
                                      <CheckCircle2 className="h-5 w-5" />
                                    ) : duty.status === 'absent' ? (
                                      <UserX className="h-5 w-5" />
                                    ) : (
                                      <Users className="h-5 w-5" />
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <button
                                      type="button"
                                      className="font-semibold text-slate-900 hover:text-orange-600 hover:underline transition-colors cursor-pointer"
                                      onClick={() => duty.user_id && setTeacherStatsModal({ userId: duty.user_id, userName: duty.user_name ?? '' })}
                                      disabled={!duty.user_id}
                                    >
                                      {duty.user_name ?? 'غير محدد'}
                                    </button>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      {duty.user_phone && (
                                        <span className="flex items-center gap-1 text-xs text-muted">
                                          <Phone className="h-3 w-3" />
                                          {duty.user_phone}
                                        </span>
                                      )}
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${duty.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : duty.status === 'absent'
                                          ? 'bg-rose-100 text-rose-700'
                                          : duty.status === 'notified'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {duty.status_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            )}
          </section>

          {/* العمود الجانبي */}
          <aside className="space-y-4">
            {/* ملخص اليوم */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                ملخص اليوم
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">إجمالي المكلفين</span>
                  <span className="text-lg font-bold text-slate-900">{stats.totalTeachers}</span>
                </div>

                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${stats.attendanceRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <p className="text-2xl font-bold text-emerald-600">{stats.totalPresent}</p>
                    <p className="text-[10px] text-emerald-600">حضروا</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-2xl font-bold text-rose-600">{stats.totalAbsent}</p>
                    <p className="text-[10px] text-rose-600">لم يحضروا</p>
                  </div>
                </div>

                {stats.replacementsAssigned > 0 && (
                  <div className="rounded-2xl bg-amber-50 p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{stats.replacementsAssigned}</p>
                    <p className="text-[10px] text-amber-600">بديل معين</p>
                  </div>
                )}
              </div>
            </div>

            {/* القادم قريباً */}
            {upcomingSupervision && (
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-900 mb-3">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  القادم قريباً
                </h3>

                <div className="text-right">
                  <p className="font-semibold text-indigo-900">{upcomingSupervision.name}</p>
                  <p className="text-xs text-indigo-600">{upcomingSupervision.shift_type}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-indigo-600">{upcomingSupervision.window_start}</span>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                      بعد {upcomingSupervision.minutesUntil} دقيقة
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* إجراءات سريعة */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">إجراءات سريعة</h3>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSendReminders}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-200 transition"
                >
                  <Send className="h-4 w-4" />
                  إرسال التذكيرات الآن
                </button>
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  <FileText className="h-4 w-4" />
                  تصدير تقرير اليوم
                </button>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-4 text-right">
              <p className="text-xs text-muted">
                📅 {meta?.weekday ? WEEKDAY_LABELS[meta.weekday] : ''} • {formatDate(selectedDate)}
              </p>
              <p className="text-xs text-muted mt-1">
                {stats.totalSupervisions} إشراف مجدول
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <DutyRosterTemplatesPanel />
      )}

      {/* Modal تعيين بديل */}
      {replacementModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeReplacementModal} />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">تعيين بديل</h2>
                  <p className="text-xs text-muted">اختر معلماً بديلاً عن {replacementModalData.teacher.name}</p>
                </div>
              </div>
              <button type="button" onClick={closeReplacementModal} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
            </header>

            <div className="max-h-[400px] overflow-y-auto p-6">
              <div className="space-y-2">
                {allTeachers
                  .filter((t) => t.id !== replacementModalData.teacher.user_id)
                  .map((teacher) => (
                    <button
                      key={teacher.id}
                      type="button"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-right hover:border-amber-300 hover:bg-amber-50"
                      onClick={() => {
                        toast({ type: 'info', title: `سيتم تعيين ${teacher.name} كبديل` })
                        closeReplacementModal()
                      }}
                    >
                      <p className="font-semibold text-slate-900">{teacher.name}</p>
                      {teacher.phone && <p className="mt-1 text-xs text-muted">{teacher.phone}</p>}
                    </button>
                  ))}
              </div>
            </div>

            <footer className="border-t border-slate-200 px-6 py-4">
              <button type="button" onClick={closeReplacementModal} className="w-full button-secondary">إلغاء</button>
            </footer>
          </div>
        </div>
      )}

      {/* نافذة إحصائيات المعلم */}
      <TeacherStatsModal
        open={!!teacherStatsModal}
        onClose={() => setTeacherStatsModal(null)}
        userId={teacherStatsModal?.userId ?? 0}
        userName={teacherStatsModal?.userName ?? ''}
      />
    </section>
  )
}

export default AdminDutyRostersPage
