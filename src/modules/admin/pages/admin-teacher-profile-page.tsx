import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Eye, CalendarCheck, Clock, BookOpen, Shield,
  MessageCircle, ClipboardCheck, FileText, UserCircle,
  AlertCircle, UserRound, Users,
} from 'lucide-react'

import { ProfileHeader } from '../teacher-profile/components/profile-header'
import { SummaryCards } from '../teacher-profile/components/summary-cards'
import { BadgesSection } from '../teacher-profile/components/badges-section'
import { AIInsightsCard } from '../teacher-profile/components/ai-insights-card'
import { AttendanceSection } from '../teacher-profile/components/attendance-section'
import { DelaysSection } from '../teacher-profile/components/delays-section'
import { ScheduleSection } from '../teacher-profile/components/schedule-section'
import { DutiesSection } from '../teacher-profile/components/duties-section'
import { MessagesSection } from '../teacher-profile/components/messages-section'
import { PreparationSection } from '../teacher-profile/components/preparation-section'
import { PeriodActionsSection } from '../teacher-profile/components/period-actions-section'
import { ReferralsReportsSection } from '../teacher-profile/components/referrals-section'
import { PdfExportButton } from '../teacher-profile/components/pdf-export-button'
import { TeacherReportPrintDialog } from '../components/teacher-report-print-dialog'
import { EmptyState } from '../teacher-profile/components/empty-state'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsEmpty,
  WsFact,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
  WsToolbar,
} from '@/shared/workspace'
import { useTeachersQuery } from '../hooks'
import type { TeacherRecord } from '../types'

// تطبيع النص العربي للبحث (تجاهل الهمزات والتشكيل)
function normalizeArabicText(value: string) {
  return value
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

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
  useTeacherBadges,
  useTeacherProfilePrefetch,
} from '../teacher-profile/hooks'
import type { ProfileTabKey, DateRangeFilter } from '../teacher-profile/types'

type PeriodKey = 'semester' | '7d' | '30d' | '90d' | 'custom'

const PERIOD_LABELS: Record<PeriodKey, string> = {
  semester: 'الفصل الحالي',
  '7d': '7 أيام',
  '30d': '30 يوم',
  '90d': '90 يوم',
  custom: 'مخصص',
}

const TABS: { key: ProfileTabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: Eye },
  { key: 'attendance', label: 'الحضور', icon: CalendarCheck },
  { key: 'delays', label: 'المواعيد', icon: Clock },
  { key: 'period-actions', label: 'الحصص والطابور', icon: AlertCircle },
  { key: 'teaching', label: 'التدريس', icon: BookOpen },
  { key: 'duties', label: 'الإشراف', icon: Shield },
  { key: 'messages', label: 'التواصل', icon: MessageCircle },
  { key: 'preparation', label: 'التحضير', icon: ClipboardCheck },
  { key: 'referrals-reports', label: 'المتابعة والتقارير', icon: FileText },
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
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')

  // قائمة المعلمين للعمود الجانبي
  const teachersQuery = useTeachersQuery()
  const teachers: TeacherRecord[] = useMemo(() => teachersQuery.data ?? [], [teachersQuery.data])
  const filteredTeachers = useMemo(() => {
    const q = normalizeArabicText(teacherSearch)
    if (!q) return teachers
    return teachers.filter(
      (t) => normalizeArabicText(t.name).includes(q) || t.national_id?.includes(teacherSearch),
    )
  }, [teachers, teacherSearch])

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
  const badgesQuery = useTeacherBadges(selectedTeacherId, dateFilter)

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

  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? ''

  return (
    <WsPage>
      <WsHeader
        title="ملف المعلم"
        badge="عرض شامل"
        actions={
          <>
            {selectedTeacherId && (
              <WsBtn icon={FileText} onClick={() => setReportDialogOpen(true)}>
                طباعة تقرير شامل
              </WsBtn>
            )}
            {summaryQuery.data && <PdfExportButton summary={summaryQuery.data} printRef={printRef} />}
          </>
        }
        facts={
          summaryQuery.data ? (
            <>
              <WsFact icon={UserRound} label="المعلم:">
                {summaryQuery.data.teacher?.name ?? '—'}
              </WsFact>
              <WsFact icon={CalendarCheck} label="نسبة الحضور:">
                {summaryQuery.data.attendance?.attendance_rate != null
                  ? `${summaryQuery.data.attendance.attendance_rate}%`
                  : '—'}
              </WsFact>
              <WsFact icon={Clock} label="الفترة:">
                {summaryQuery.data.period ? `${summaryQuery.data.period.from} → ${summaryQuery.data.period.to}` : '—'}
              </WsFact>
            </>
          ) : undefined
        }
      >
        {/* فلتر الفترة في شريط العنوان نفسه — كبقية الصفحات */}
        <span className="ws-header__filters">
          <span className="ws-seg">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`ws-seg__btn ${period === p ? 'is-active' : ''}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </span>
          {period === 'custom' && (
            <>
              <WsInput
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <WsInput
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
        </span>
      </WsHeader>

      <WsToolbar>
        {/* التبويبات */}
        {selectedTeacherId && (
          <div className="ws-seg" style={{ flexWrap: 'wrap' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => prefetchTab(tab.key)}
                  className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                >
                  <Icon style={{ width: 12, height: 12 }} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}
      </WsToolbar>

      <WsLayout>
        {/* العمود الأيمن: قائمة المعلمين */}
        <WsSideCol title="المعلمون" icon={Users} side="start" width={260} storageKey="ws:teacher-profile:list">
          <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
            <WsInput
              type="search"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهوية..."
              style={{ width: '100%' }}
            />
          </div>
          <WsBlock count={filteredTeachers.length.toLocaleString('ar-SA-u-nu-latn')} title="القائمة" fill scroll>
            {teachersQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل المعلمين...</WsEmpty>
            ) : filteredTeachers.length === 0 ? (
              <WsEmpty icon={Users}>لا توجد نتائج.</WsEmpty>
            ) : (
              <div>
                {filteredTeachers.map((teacher) => {
                  const isSelected = teacher.id === selectedTeacherId
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => handleSelectTeacher(teacher.id)}
                      className="ws-rankrow"
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '7px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : undefined,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 12, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)' }}>
                        {teacher.name}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        {teacher.national_id}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <WsBlock title={selectedTeacherId ? activeTabLabel : 'ملف المعلم'} icon={UserCircle} fill scroll>
            <div ref={printRef} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* حالة عدم اختيار معلم */}
              {!selectedTeacherId && (
                <>
                  <EmptyState
                    icon={UserCircle}
                    title="اختر معلماً لعرض ملفه"
                    description="استخدم القائمة أعلاه للبحث واختيار معلم"
                  />
                  <WsAlert tone="warn" boxed>
                    <span>
                      <b>تنبيه مهم:</b> البيانات المعروضة في ملف المعلم مبنية على ما تم إدخاله في النظام فقط، وقد لا
                      تعكس الصورة الكاملة لأداء المعلم الفعلي. كثير من الجهود والأعمال قد تكون موثقة ورقياً أو لم تُدخل
                      بعد، لذا لا ينبغي الاعتماد على هذه البيانات وحدها في تقييم أداء المعلم. الهدف من هذه الصفحة هو
                      إتاحة فرصة للتطوير والتحسين المستمر، وليس إصدار أحكام نهائية. كذلك فإن <b>«تحليل الأداء»</b>{' '}
                      المولّد بالذكاء الاصطناعي يميل إلى نظرة تفاؤلية وتشجيعية، وقد لا يعبّر بدقة عن الواقع.
                    </span>
                  </WsAlert>
                </>
              )}

              {/* المحتوى */}
              {selectedTeacherId && (
                <>
                  {/* بيانات المعلم + بطاقات الإحصائيات */}
                  {summaryQuery.isLoading ? (
                    <WsEmpty loading>جاري تحميل ملف المعلم...</WsEmpty>
                  ) : summaryQuery.data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <ProfileHeader
                        teacher={summaryQuery.data.teacher}
                        attendanceRate={summaryQuery.data.attendance.attendance_rate}
                        teacherId={selectedTeacherId}
                      />
                      <BadgesSection
                        badges={badgesQuery.data?.badges ?? []}
                        isLoading={badgesQuery.isLoading}
                      />
                      <SummaryCards
                        data={summaryQuery.data}
                        benchmarks={benchmarksQuery.data?.benchmarks ?? null}
                      />
                    </div>
                  ) : null}

                  {/* محتوى القسم */}
                  {isLoadingSection(activeTab) ? (
                    <WsEmpty loading>جاري تحميل {activeTabLabel}...</WsEmpty>
                  ) : (
                    <>
                      {activeTab === 'overview' && summaryQuery.data && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <AIInsightsCard
                            teacherId={selectedTeacherId}
                            filters={dateFilter}
                            enabled={activeTab === 'overview'}
                          />
                          <WsAlert tone="info" boxed>
                            الفترة: من {summaryQuery.data.period.from} إلى {summaryQuery.data.period.to} — اختر أحد
                            الأقسام أعلاه لعرض التفاصيل الكاملة.
                          </WsAlert>
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
                </>
              )}
            </div>
          </WsBlock>
        </WsMain>
      </WsLayout>

      <TeacherReportPrintDialog
        teacherId={selectedTeacherId}
        teacherName={summaryQuery.data?.teacher?.name ?? null}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </WsPage>
  )
}
