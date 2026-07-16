import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  Users,
  Eye,
  UserX,
  Phone,
  Settings,
  UserPlus,
  RefreshCcw,
  Clock3,
  CheckCircle2,
  Send,
  FileText,
  TrendingUp,
  Calendar,
  Sunset,
  Sunrise,
  AlertTriangle,
  Image,
} from 'lucide-react'

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
import { useTeachersQuery, useSendDutyScheduleRemindersMutation } from '@/modules/admin/hooks'
import { openDailySupervisionReport } from '@/modules/admin/utils/open-daily-supervision-report'
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
  WsModal,
  WsPage,
  WsProgress,
  WsSideCol,
  WsToolbar,
} from '@/shared/workspace'

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
}

// ألوان أنواع البطاقات في التايم لاين (تطعيمات لونية بهوية النظام)
const TIMELINE_TONES = {
  supervision: { color: 'var(--ws-accent)', accent: 'var(--ws-accent-2)', bg: 'var(--ws-accent-soft)', wash: 'var(--ws-accent-softer)' },
  morning: { color: 'var(--ws-sky)', accent: 'var(--ws-sky)', bg: 'var(--ws-sky-bg)', wash: 'var(--ws-sky-bg)' },
  afternoon: { color: 'var(--ws-amber)', accent: 'var(--ws-amber)', bg: 'var(--ws-amber-bg)', wash: 'var(--ws-amber-bg)' },
} as const

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

  // نبضة الوقت الحي: يتحدث كل 30 ثانية لتحريك خط «الآن» وحالات التايم لاين
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const sendRemindersMutation = useSendDutyScheduleRemindersMutation()
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
      // مزامنة مع المتابعة المباشرة
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-tracker'] })
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
    | { type: 'supervision'; data: TodaySupervisionItem; sortTime: number; endTime: number }
    | { type: 'duty'; data: DutyScheduleTodayItem; sortTime: number; endTime: number }

  const sortedTimeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []

    // إضافة الإشراف
    for (const sup of supervisions) {
      items.push({
        type: 'supervision',
        data: sup,
        sortTime: timeToMinutes(sup.window_start),
        endTime: timeToMinutes(sup.window_end),
      })
    }

    // إضافة المناوبات
    for (const duty of dutySchedules) {
      items.push({
        type: 'duty',
        data: duty,
        sortTime: timeToMinutes(duty.start_time),
        endTime: timeToMinutes(duty.end_time),
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

  // الوقت الحالي بالدقائق + هل التاريخ المعروض هو اليوم؟
  const isViewingToday = selectedDate === new Date(nowTick).toISOString().slice(0, 10)
  const nowMinutes = useMemo(() => {
    const now = new Date(nowTick)
    return now.getHours() * 60 + now.getMinutes()
  }, [nowTick])
  const nowLabel = useMemo(() => {
    const now = new Date(nowTick)
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }, [nowTick])

  // موضع خط «الآن» في التايم لاين: قبل أول عنصر لم يبدأ بعد
  const nowLineIndex = useMemo(() => {
    if (!isViewingToday) return -1
    const index = sortedTimeline.findIndex((item) => item.sortTime > nowMinutes)
    return index === -1 ? sortedTimeline.length : index
  }, [isViewingToday, sortedTimeline, nowMinutes])

  // حالة العنصر الزمنية: ماضٍ / جارٍ الآن / قادم
  const getItemPhase = (item: TimelineItem): 'past' | 'current' | 'upcoming' => {
    if (!isViewingToday) return 'upcoming'
    if (item.endTime > 0 && item.endTime < nowMinutes) return 'past'
    if (item.sortTime <= nowMinutes && (item.endTime === 0 || nowMinutes <= item.endTime)) return 'current'
    return 'upcoming'
  }

  // القادم قريباً
  const upcomingSupervision = useMemo(() => {
    const now = new Date(nowTick)
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const upcoming = sortedSupervisions.find(s => s.window_start && s.window_start > currentTime)
    if (!upcoming) return null

    // حساب الوقت المتبقي
    const [upcomingHour, upcomingMin] = upcoming.window_start!.split(':').map(Number)
    const upcomingDate = new Date(nowTick)
    upcomingDate.setHours(upcomingHour, upcomingMin, 0, 0)
    const diffMs = upcomingDate.getTime() - now.getTime()
    const diffMins = Math.max(0, Math.floor(diffMs / 60000))

    return { ...upcoming, minutesUntil: diffMins }
  }, [sortedSupervisions, nowTick])

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
    if (sendRemindersMutation.isPending) return

    if (!window.confirm('هل تريد إرسال تذكيرات واتساب لجميع المعلمين المكلفين بالمناوبة في هذا التاريخ؟')) {
      return
    }

    sendRemindersMutation.mutate({ date: selectedDate })
  }

  const handleExportPDF = () => {
    openDailySupervisionReport({
      date: selectedDate,
      supervisions,
      dutySchedules,
      format: 'pdf',
    })
  }

  const handleExportImage = () => {
    openDailySupervisionReport({
      date: selectedDate,
      supervisions,
      dutySchedules,
      format: 'image',
    })
  }

  // خط «الآن»
  const NowLine = (
    <div className="ws-timeline__now">
      <span className="ws-timeline__now-label">
        <span className="ws-pulse ws-pulse--red" />
        الآن {nowLabel}
      </span>
      <span className="ws-timeline__now-line" />
    </div>
  )

  return (
    <WsPage>
      <WsHeader
        title="الإشراف اليومي"
        badge={meta?.weekday ? WEEKDAY_LABELS[meta.weekday] : 'المتابعة'}
        actions={
          <>
            <WsBtn variant="primary" icon={Calendar} onClick={() => setIsDutyScheduleOpen(true)}>
              المناوبة
            </WsBtn>
            <WsBtn icon={Settings} onClick={() => setIsSettingsOpen(true)}>
              الإعدادات
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="المكلفون:">
              {stats.totalTeachers.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={CheckCircle2} label="حضروا:">
              {stats.totalPresent.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={UserX} label="لم يحضروا:">
              {stats.totalAbsent.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={UserPlus} label="بدلاء:">
              {stats.replacementsAssigned.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={TrendingUp} label="نسبة الحضور:">
              {stats.attendanceRate}%
            </WsFact>
          </>
        }
      >
        {isViewingToday && (
          <WsChip tone="green">
            <span className="ws-pulse" />
            مباشر
          </WsChip>
        )}
      </WsHeader>

      <WsToolbar>
        <div className="ws-seg" style={{ alignSelf: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setActiveView('today')}
            className={`ws-seg__btn ${activeView === 'today' ? 'is-active' : ''}`}
          >
            <Eye style={{ width: 12, height: 12 }} />
            إشراف اليوم
          </button>
          <button
            type="button"
            onClick={() => setActiveView('templates')}
            className={`ws-seg__btn ${activeView === 'templates' ? 'is-active' : ''}`}
          >
            <Users style={{ width: 12, height: 12 }} />
            قوالب الأسبوع
          </button>
        </div>

        {activeView === 'today' && (
          <>
            <div className="ws-field">
              <label className="ws-label" htmlFor="ws-duty-date">
                التاريخ
              </label>
              <WsInput
                id="ws-duty-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <WsBtn
              icon={RefreshCcw}
              onClick={() => supervisionsQuery.refetch()}
              disabled={supervisionsQuery.isFetching}
              style={{ alignSelf: 'flex-end' }}
            >
              تحديث
            </WsBtn>
          </>
        )}
      </WsToolbar>

      <DutyRosterSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DutyScheduleModal open={isDutyScheduleOpen} onClose={() => setIsDutyScheduleOpen(false)} />

      <WsLayout>
        {activeView === 'templates' ? (
          <DutyRosterTemplatesPanel />
        ) : (
          <>
        {/* العمود الأيمن: ملخص اليوم */}
        <WsSideCol title="ملخص اليوم" icon={TrendingUp} side="start" width={290} storageKey="ws:duty-rosters:summary">
          <WsBlock padded>
            <WsProgress
              value={stats.attendanceRate}
              label={
                <>
                  نسبة الحضور: <b>{stats.attendanceRate}%</b>
                </>
              }
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              <WsChip icon={Users}>المكلفون {stats.totalTeachers.toLocaleString('ar-SA')}</WsChip>
              <WsChip tone="green" icon={CheckCircle2}>
                حضروا {stats.totalPresent.toLocaleString('ar-SA')}
              </WsChip>
              <WsChip tone="red" icon={UserX}>
                لم يحضروا {stats.totalAbsent.toLocaleString('ar-SA')}
              </WsChip>
              {stats.replacementsAssigned > 0 && (
                <WsChip tone="amber" icon={UserPlus}>
                  بديل معين {stats.replacementsAssigned.toLocaleString('ar-SA')}
                </WsChip>
              )}
            </div>
          </WsBlock>

          {/* القادم قريباً */}
          {upcomingSupervision && (
            <WsBlock title="القادم قريباً" icon={Clock3} padded style={{ background: 'var(--ws-accent-softer)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{upcomingSupervision.name}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-accent)', fontWeight: 700 }}>
                    {upcomingSupervision.shift_type} • {upcomingSupervision.window_start}
                  </span>
                </span>
                <WsChip tone="green" className="ws-soft-pulse">
                  بعد {upcomingSupervision.minutesUntil} دقيقة
                </WsChip>
              </div>
            </WsBlock>
          )}

          {/* إجراءات سريعة */}
          <WsBlock title="إجراءات سريعة" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <WsBtn
                variant="primary"
                icon={Send}
                onClick={handleSendReminders}
                disabled={sendRemindersMutation.isPending}
              >
                {sendRemindersMutation.isPending ? 'جارٍ الإرسال...' : 'إرسال التذكيرات الآن'}
              </WsBtn>
              <div style={{ display: 'flex', gap: 6 }}>
                <WsBtn icon={FileText} onClick={handleExportPDF} style={{ flex: 1 }}>
                  PDF
                </WsBtn>
                <WsBtn icon={Image} onClick={handleExportImage} style={{ flex: 1 }}>
                  صورة
                </WsBtn>
              </div>
            </div>
          </WsBlock>

          {/* معلومات اليوم */}
          <WsBlock padded fill>
            <span className="ws-fact">
              <Calendar />
              <span>{formatDate(selectedDate)}</span>
            </span>
            <span className="ws-fact" style={{ marginTop: 6 }}>
              <CalendarClock />
              <span>
                <b>{stats.totalSupervisions.toLocaleString('ar-SA')}</b> إشراف مجدول
              </span>
            </span>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          {activeView === 'today' ? (
            <WsBlock title="خط سير اليوم" icon={CalendarClock} count={sortedTimeline.length.toLocaleString('ar-SA')} fill scroll>
              {isError ? (
                <WsEmpty icon={AlertTriangle}>
                  {errorMessage}
                  <WsBtn size="sm" icon={RefreshCcw} onClick={() => supervisionsQuery.refetch()}>
                    إعادة المحاولة
                  </WsBtn>
                </WsEmpty>
              ) : isLoading ? (
                <WsEmpty loading>جارٍ تحميل إشراف اليوم...</WsEmpty>
              ) : sortedTimeline.length === 0 ? (
                <WsEmpty icon={CalendarClock}>
                  لا توجد إشرافات أو مناوبات لهذا اليوم.
                  <span style={{ fontSize: 11 }}>
                    تأكد من إنشاء قوالب أسبوعية وتعيين معلمين ليوم {WEEKDAY_LABELS[meta?.weekday ?? ''] || 'هذا اليوم'}.
                  </span>
                  <WsBtn size="sm" icon={Users} onClick={() => setActiveView('templates')}>
                    إدارة قوالب الأسبوع
                  </WsBtn>
                </WsEmpty>
              ) : (
                <div className="ws-timeline">
                  {sortedTimeline.map((item, index) => {
                    const phase = getItemPhase(item)
                    const showNowLine = index === nowLineIndex

                    if (item.type === 'supervision') {
                      const supervision = item.data
                      const tone = TIMELINE_TONES.supervision
                      return (
                        <div key={`sup-${supervision.template_id}`}>
                          {showNowLine && NowLine}
                          <div
                            className={`ws-timeline__item ${phase === 'past' ? 'is-past' : phase === 'current' ? 'is-current' : ''}`}
                            style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
                          >
                            {/* عقدة الوقت */}
                            <div className="ws-timeline__node">
                              <span className="ws-timeline__dot" style={{ background: tone.bg, color: tone.color }}>
                                <Clock3 />
                              </span>
                              <span className="ws-timeline__time">{supervision.window_start || '—'}</span>
                            </div>

                            {/* بطاقة الإشراف */}
                            <div className="ws-timeline__card" style={{ borderInlineStartColor: tone.accent }}>
                              <div className="ws-timeline__card-head" style={{ background: tone.wash }}>
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{supervision.name}</span>
                                  <span style={{ display: 'block', fontSize: 10.5, color: tone.color, fontWeight: 700 }}>
                                    {supervision.shift_type}
                                  </span>
                                </span>
                                <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
                                  {phase === 'current' && (
                                    <WsChip tone="green">
                                      <span className="ws-pulse" />
                                      جارٍ الآن
                                    </WsChip>
                                  )}
                                  <WsChip>
                                    <span style={{ direction: 'ltr' }}>
                                      {supervision.window_start} - {supervision.window_end}
                                    </span>
                                  </WsChip>
                                  <WsChip tone="green" icon={Users}>
                                    {supervision.teachers.length} معلم
                                  </WsChip>
                                </span>
                              </div>

                              {/* قائمة المعلمين — بطاقات متنفّسة */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
                                {supervision.teachers.map((teacher) => {
                                  const absent = isTeacherAbsent(supervision, teacher.user_id)
                                  const absenceRecord = getAbsenceRecord(supervision, teacher.user_id)

                                  return (
                                    <div
                                      key={teacher.user_id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        flexWrap: 'wrap',
                                        padding: '8px 12px',
                                        borderRadius: 9,
                                        border: `1px solid ${absent ? 'var(--ws-red-bd)' : 'var(--ws-hairline)'}`,
                                        background: absent ? 'var(--ws-red-bg)' : 'var(--ws-surface)',
                                      }}
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        {/* دائرة الحرف الأول بحالة المعلم */}
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 30,
                                            height: 30,
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            fontSize: 13,
                                            fontWeight: 800,
                                            background: absent ? 'var(--ws-red)' : 'var(--ws-accent-soft)',
                                            color: absent ? '#fff' : 'var(--ws-accent)',
                                            border: `1px solid ${absent ? 'var(--ws-red)' : 'var(--ws-accent-2)'}`,
                                          }}
                                        >
                                          {teacher.name.trim().charAt(0)}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <button
                                              type="button"
                                              onClick={() => setTeacherStatsModal({ userId: teacher.user_id, userName: teacher.name })}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                fontSize: 12.5,
                                                fontWeight: 700,
                                                color: 'var(--ws-text)',
                                              }}
                                              title="عرض إحصائيات المعلم"
                                            >
                                              {teacher.name}
                                            </button>
                                            <WsChip tone={absent ? 'red' : 'green'}>{absent ? 'لم يحضر' : 'حاضر'}</WsChip>
                                          </span>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                                            {teacher.phone && (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                                <Phone style={{ width: 10, height: 10 }} />
                                                {teacher.phone}
                                              </span>
                                            )}
                                            {absenceRecord?.reason && (
                                              <span style={{ fontSize: 10.5, color: 'var(--ws-red)' }}>
                                                السبب: {absenceRecord.reason}
                                              </span>
                                            )}
                                            {absenceRecord?.replacement_user_name && (
                                              <WsChip tone="amber" icon={UserPlus}>
                                                البديل: {absenceRecord.replacement_user_name}
                                              </WsChip>
                                            )}
                                          </span>
                                        </span>
                                      </span>

                                      {/* أزرار الإجراءات */}
                                      <span style={{ display: 'inline-flex', gap: 6, marginInlineStart: 'auto' }}>
                                        {!absent ? (
                                          <>
                                            <WsBtn
                                              size="sm"
                                              icon={UserX}
                                              onClick={() => handleRecordAbsence(supervision, teacher)}
                                              disabled={recordAbsenceMutation.isPending}
                                              style={{ color: 'var(--ws-red)' }}
                                            >
                                              عدم الحضور
                                            </WsBtn>
                                            <WsBtn size="sm" icon={UserPlus} onClick={() => handleAssignReplacement(supervision, teacher)}>
                                              بديل
                                            </WsBtn>
                                          </>
                                        ) : !absenceRecord?.replacement_user_name ? (
                                          <WsBtn size="sm" icon={UserPlus} onClick={() => handleAssignReplacement(supervision, teacher)}>
                                            تعيين بديل
                                          </WsBtn>
                                        ) : (
                                          <WsChip>تم التعيين</WsChip>
                                        )}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      // المناوبة
                      const duty = item.data
                      const tone = duty.duty_type === 'afternoon' ? TIMELINE_TONES.afternoon : TIMELINE_TONES.morning
                      const DutyIcon = duty.duty_type === 'afternoon' ? Sunset : Sunrise
                      return (
                        <div key={`duty-${duty.id}`}>
                          {showNowLine && NowLine}
                          <div
                            className={`ws-timeline__item ${phase === 'past' ? 'is-past' : phase === 'current' ? 'is-current' : ''}`}
                            style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
                          >
                            <div className="ws-timeline__node">
                              <span className="ws-timeline__dot" style={{ background: tone.bg, color: tone.color }}>
                                <DutyIcon />
                              </span>
                              <span className="ws-timeline__time">{duty.start_time || '—'}</span>
                            </div>

                            <div className="ws-timeline__card" style={{ borderInlineStartColor: tone.accent }}>
                              <div className="ws-timeline__card-head" style={{ background: tone.wash }}>
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{duty.duty_type_name}</span>
                                  <span style={{ display: 'block', fontSize: 10.5, color: tone.color, fontWeight: 700 }}>
                                    مناوبة فصلية
                                  </span>
                                </span>
                                <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
                                  {phase === 'current' && (
                                    <WsChip tone="green">
                                      <span className="ws-pulse" />
                                      جارية الآن
                                    </WsChip>
                                  )}
                                  <WsChip>
                                    <span style={{ direction: 'ltr' }}>
                                      {duty.start_time} - {duty.end_time}
                                    </span>
                                  </WsChip>
                                  <WsChip tone={duty.duty_type === 'afternoon' ? 'amber' : 'sky'} icon={Calendar}>
                                    مناوبة
                                  </WsChip>
                                </span>
                              </div>

                              {/* المعلم المكلف — بطاقة متنفّسة */}
                              <div style={{ padding: 10 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    flexWrap: 'wrap',
                                    padding: '8px 12px',
                                    borderRadius: 9,
                                    border: `1px solid ${duty.status === 'absent' ? 'var(--ws-red-bd)' : 'var(--ws-hairline)'}`,
                                    background: duty.status === 'absent' ? 'var(--ws-red-bg)' : 'var(--ws-surface)',
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        fontSize: 13,
                                        fontWeight: 800,
                                        background: duty.status === 'absent' ? 'var(--ws-red)' : tone.bg,
                                        color: duty.status === 'absent' ? '#fff' : tone.color,
                                        border: `1px solid ${duty.status === 'absent' ? 'var(--ws-red)' : tone.accent}`,
                                      }}
                                    >
                                      {(duty.user_name ?? '؟').trim().charAt(0)}
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => duty.user_id && setTeacherStatsModal({ userId: duty.user_id, userName: duty.user_name ?? '' })}
                                        disabled={!duty.user_id}
                                        style={{
                                          display: 'block',
                                          background: 'none',
                                          border: 'none',
                                          padding: 0,
                                          cursor: duty.user_id ? 'pointer' : 'default',
                                          fontFamily: 'inherit',
                                          fontSize: 12.5,
                                          fontWeight: 700,
                                          color: 'var(--ws-text)',
                                        }}
                                      >
                                        {duty.user_name ?? 'غير محدد'}
                                      </button>
                                      {duty.user_phone && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 3 }}>
                                          <Phone style={{ width: 10, height: 10 }} />
                                          {duty.user_phone}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  <WsChip
                                    tone={
                                      duty.status === 'completed'
                                        ? 'green'
                                        : duty.status === 'absent'
                                          ? 'red'
                                          : duty.status === 'notified'
                                            ? 'sky'
                                            : undefined
                                    }
                                  >
                                    {duty.status_name}
                                  </WsChip>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })}
                  {/* خط «الآن» بعد آخر عنصر إذا انتهى اليوم */}
                  {isViewingToday && nowLineIndex === sortedTimeline.length && sortedTimeline.length > 0 && NowLine}
                </div>
              )}
            </WsBlock>
          ) : null}
        </WsMain>
          </>
        )}
      </WsLayout>

      {/* Modal تعيين بديل */}
      {replacementModalData && (
        <WsModal
          open
          onClose={closeReplacementModal}
          title="تعيين بديل"
          sub={`اختر معلماً بديلاً عن ${replacementModalData.teacher.name}`}
          footer={<WsBtn onClick={closeReplacementModal}>إلغاء</WsBtn>}
        >
          <div style={{ maxHeight: '48vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {allTeachers
              .filter((t) => t.id !== replacementModalData.teacher.user_id)
              .map((teacher) => (
                <button
                  key={teacher.id}
                  type="button"
                  className="ws-pick"
                  style={{ width: '100%', textAlign: 'right' }}
                  onClick={() => {
                    toast({ type: 'info', title: `سيتم تعيين ${teacher.name} كبديل` })
                    closeReplacementModal()
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="ws-pick__name">{teacher.name}</span>
                    {teacher.phone && <span className="ws-pick__sub">{teacher.phone}</span>}
                  </span>
                  <UserPlus style={{ width: 14, height: 14, color: 'var(--ws-amber)', flexShrink: 0 }} />
                </button>
              ))}
          </div>
        </WsModal>
      )}

      {/* نافذة إحصائيات المعلم */}
      <TeacherStatsModal
        open={!!teacherStatsModal}
        onClose={() => setTeacherStatsModal(null)}
        userId={teacherStatsModal?.userId ?? 0}
        userName={teacherStatsModal?.userName ?? ''}
      />
    </WsPage>
  )
}

export default AdminDutyRostersPage
