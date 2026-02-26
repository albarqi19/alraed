import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Eye, CalendarCheck, Clock, BookOpen, Shield,
  MessageCircle, ClipboardCheck, FileText, Loader2, UserCircle,
  AlertCircle,
} from 'lucide-react'

import { TeacherSelector } from '../teacher-profile/components/teacher-selector'
import { ProfileHeader } from '../teacher-profile/components/profile-header'
import { SummaryCards } from '../teacher-profile/components/summary-cards'
import { AttendanceSection } from '../teacher-profile/components/attendance-section'
import { DelaysSection } from '../teacher-profile/components/delays-section'
import { ScheduleSection } from '../teacher-profile/components/schedule-section'
import { DutiesSection } from '../teacher-profile/components/duties-section'
import { MessagesSection } from '../teacher-profile/components/messages-section'
import { PreparationSection } from '../teacher-profile/components/preparation-section'
import { PeriodActionsSection } from '../teacher-profile/components/period-actions-section'
import { ReferralsReportsSection } from '../teacher-profile/components/referrals-section'
import { PdfExportButton } from '../teacher-profile/components/pdf-export-button'
import { EmptyState } from '../teacher-profile/components/empty-state'

import {
  useTeacherProfileSummary,
  useTeacherProfileAttendance,
  useTeacherProfileDelays,
  useTeacherProfileDelayActions,
  useTeacherProfileSchedule,
  useTeacherProfileDuties,
  useTeacherProfileMessages,
  useTeacherProfilePreparation,
  useTeacherProfileReferrals,
  useTeacherProfilePoints,
  useTeacherProfileCoverage,
  useTeacherStudentAttendanceStats,
  useTeacherPeriodActions,
  useTeacherBenchmarks,
  useTeacherProfilePrefetch,
} from '../teacher-profile/hooks'
import type { ProfileTabKey, DateRangeFilter } from '../teacher-profile/types'

type PeriodKey = 'semester' | '7d' | '30d' | '90d' | 'custom'

const TABS: { key: ProfileTabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: Eye },
  { key: 'attendance', label: 'الحضور', icon: CalendarCheck },
  { key: 'delays', label: 'التأخرات', icon: Clock },
  { key: 'period-actions', label: 'الحصص والطابور', icon: AlertCircle },
  { key: 'teaching', label: 'التدريس', icon: BookOpen },
  { key: 'duties', label: 'الإشراف', icon: Shield },
  { key: 'messages', label: 'التواصل', icon: MessageCircle },
  { key: 'preparation', label: 'التحضير', icon: ClipboardCheck },
  { key: 'referrals-reports', label: 'الإحالات والتقارير', icon: FileText },
]

export function AdminTeacherProfilePage() {
  const { teacherId: paramTeacherId } = useParams<{ teacherId: string }>()
  const navigate = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)

  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    paramTeacherId ? Number(paramTeacherId) : null,
  )
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('overview')
  const [period, setPeriod] = useState<PeriodKey>('semester')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // حساب نطاق التاريخ
  const dateFilter: DateRangeFilter = useMemo(() => {
    if (period === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }
    if (period === '7d') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return { from: d.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
    }
    if (period === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return { from: d.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
    }
    if (period === '90d') {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      return { from: d.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }
    }
    // semester = افتراضي (يستخدم الفصل الحالي من الباك إند)
    return {}
  }, [period, customFrom, customTo])

  // تحديث الرابط عند تغيير المعلم
  const handleSelectTeacher = (id: number) => {
    setSelectedTeacherId(id)
    navigate(`/admin/teacher-profile/${id}`, { replace: true })
  }

  // إعادة التبويب عند تغيير المعلم
  useEffect(() => {
    setActiveTab('overview')
  }, [selectedTeacherId])

  // ========== Queries ==========
  const summaryQuery = useTeacherProfileSummary(selectedTeacherId, dateFilter)
  const benchmarksQuery = useTeacherBenchmarks(selectedTeacherId, dateFilter)

  // Lazy loading - فقط عند تفعيل التبويب
  const attendanceQuery = useTeacherProfileAttendance(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'attendance' || activeTab === 'overview',
  })
  const delaysQuery = useTeacherProfileDelays(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'delays',
  })
  const delayActionsQuery = useTeacherProfileDelayActions(selectedTeacherId, undefined, {
    enabled: activeTab === 'delays',
  })
  const periodActionsQuery = useTeacherPeriodActions(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'period-actions',
  })
  const scheduleQuery = useTeacherProfileSchedule(selectedTeacherId, {
    enabled: activeTab === 'teaching',
  })
  const studentStatsQuery = useTeacherStudentAttendanceStats(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'teaching',
  })
  const dutiesQuery = useTeacherProfileDuties(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'duties',
  })
  const coverageQuery = useTeacherProfileCoverage(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'duties',
  })
  const messagesQuery = useTeacherProfileMessages(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'messages',
  })
  const preparationQuery = useTeacherProfilePreparation(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'preparation',
  })
  const referralsQuery = useTeacherProfileReferrals(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'referrals-reports',
  })
  const pointsQuery = useTeacherProfilePoints(selectedTeacherId, dateFilter, {
    enabled: activeTab === 'referrals-reports',
  })

  // Prefetch on hover
  const { prefetchTab } = useTeacherProfilePrefetch(selectedTeacherId, dateFilter)

  // ========== Rendering ==========
  const isLoadingSection = (tab: ProfileTabKey): boolean => {
    switch (tab) {
      case 'overview': return summaryQuery.isLoading
      case 'attendance': return attendanceQuery.isLoading
      case 'delays': return delaysQuery.isLoading
      case 'period-actions': return periodActionsQuery.isLoading
      case 'teaching': return scheduleQuery.isLoading
      case 'duties': return dutiesQuery.isLoading
      case 'messages': return messagesQuery.isLoading
      case 'preparation': return preparationQuery.isLoading
      case 'referrals-reports': return referralsQuery.isLoading
      default: return false
    }
  }

  return (
    <div className="space-y-5" ref={printRef}>
      {/* الترويسة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ملف المعلم</h1>
          <p className="text-sm text-slate-500">عرض شامل لكل بيانات المعلم</p>
        </div>
        <div className="flex items-center gap-3">
          {summaryQuery.data && (
            <PdfExportButton summary={summaryQuery.data} printRef={printRef} />
          )}
          <TeacherSelector
            selectedId={selectedTeacherId}
            onSelect={handleSelectTeacher}
          />
        </div>
      </div>

      {/* حالة عدم اختيار معلم */}
      {!selectedTeacherId && (
        <EmptyState
          icon={UserCircle}
          title="اختر معلماً لعرض ملفه"
          description="استخدم القائمة أعلاه للبحث واختيار معلم"
        />
      )}

      {/* المحتوى */}
      {selectedTeacherId && (
        <>
          {/* بيانات المعلم + بطاقات الإحصائيات */}
          {summaryQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : summaryQuery.data ? (
            <div className="space-y-4">
              <ProfileHeader teacher={summaryQuery.data.teacher} />
              <SummaryCards
                data={summaryQuery.data}
                benchmarks={benchmarksQuery.data?.benchmarks ?? null}
              />
            </div>
          ) : null}

          {/* فلتر الفترة */}
          <div className="flex flex-wrap items-center gap-2">
            {(['semester', '7d', '30d', '90d', 'custom'] as PeriodKey[]).map((p) => {
              const labels: Record<PeriodKey, string> = {
                semester: 'الفصل الحالي',
                '7d': '7 أيام',
                '30d': '30 يوم',
                '90d': '90 يوم',
                custom: 'مخصص',
              }
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    period === p
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {labels[p]}
                </button>
              )
            })}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
                <span className="text-xs text-slate-400">إلى</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
              </div>
            )}
          </div>

          {/* التبويبات */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => prefetchTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* محتوى القسم */}
          <div className="min-h-[200px]">
            {isLoadingSection(activeTab) ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && summaryQuery.data && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      الفترة: من {summaryQuery.data.period.from} إلى {summaryQuery.data.period.to}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      اختر أحد الأقسام أعلاه لعرض التفاصيل الكاملة.
                    </p>
                  </div>
                )}

                {activeTab === 'attendance' && attendanceQuery.data && (
                  <AttendanceSection data={attendanceQuery.data} />
                )}

                {activeTab === 'delays' && delaysQuery.data && (
                  <DelaysSection
                    delays={delaysQuery.data}
                    actions={delayActionsQuery.data}
                  />
                )}

                {activeTab === 'period-actions' && periodActionsQuery.data && (
                  <PeriodActionsSection data={periodActionsQuery.data} />
                )}

                {activeTab === 'teaching' && scheduleQuery.data && (
                  <ScheduleSection
                    schedule={scheduleQuery.data}
                    studentStats={studentStatsQuery.data}
                  />
                )}

                {activeTab === 'duties' && dutiesQuery.data && (
                  <DutiesSection
                    duties={dutiesQuery.data}
                    coverage={coverageQuery.data}
                  />
                )}

                {activeTab === 'messages' && messagesQuery.data && (
                  <MessagesSection data={messagesQuery.data} />
                )}

                {activeTab === 'preparation' && preparationQuery.data && (
                  <PreparationSection data={preparationQuery.data} />
                )}

                {activeTab === 'referrals-reports' && (
                  <ReferralsReportsSection
                    referrals={referralsQuery.data}
                    points={pointsQuery.data}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
