import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  MapPin,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsTextarea,
  WsAlert,
  WsEmpty,
  WsSpinner,
  TONES,
  ToneChip,
  InitialAvatar,
  type Tone,
} from '@/shared/workspace'
import { getActivityPdfUrl, getActivityReportImageUrl, getActivityReportPrintUrl } from '@/services/api/client'
import {
  useActivities,
  useActivityStats,
  useAvailableGrades,
  useDeleteActivity,
  useActivityDetails,
  useApproveReport,
  useRejectReport,
} from '../hooks'
import { ActivityCreateModal } from '../components/activity-create-modal'
import type { ActivityStatus, ReportStatus } from '../types'

const STATUS_META: Record<ActivityStatus, { label: string; tone: Tone }> = {
  draft: { label: 'مسودة', tone: TONES.amber },
  active: { label: 'نشط', tone: TONES.green },
  completed: { label: 'مكتمل', tone: TONES.sky },
  cancelled: { label: 'ملغي', tone: TONES.gray },
}

const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: Tone }> = {
  pending: { label: 'تحت المراجعة', tone: TONES.amber },
  approved: { label: 'معتمد', tone: TONES.green },
  rejected: { label: 'مرفوض', tone: TONES.red },
}

/** لون خلية المصفوفة: سلّم واعتُمد / بانتظار / مرفوض / لم يسلّم */
const cellTone = (hasReport: boolean, status: ReportStatus | null): Tone =>
  !hasReport ? TONES.gray : status ? REPORT_STATUS_META[status].tone : TONES.gray

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminActivitiesPage() {
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  /* مراجعة التقرير: مقيمة في العمود الأيسر بدل مودال فوق مودال */
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [rejectingReportId, setRejectingReportId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null)

  const { data: activitiesData, isLoading: isLoadingActivities } = useActivities({
    status: statusFilter === 'all' ? undefined : statusFilter
  })
  const { data: stats } = useActivityStats()
  const { data: grades } = useAvailableGrades()
  const deleteActivity = useDeleteActivity()

  const activities = activitiesData?.data ?? []

  // أول نشاط يُنتقى تلقائياً حتى لا تبدأ الشاشة فارغة
  useEffect(() => {
    if (selectedActivityId === null && activities.length > 0) {
      setSelectedActivityId(activities[0].id)
    }
    if (selectedActivityId !== null && activities.length > 0 && !activities.some((a) => a.id === selectedActivityId)) {
      setSelectedActivityId(activities[0].id)
    }
  }, [activities, selectedActivityId])

  const { data: details, isLoading: isLoadingDetails } = useActivityDetails(selectedActivityId ?? 0)
  const approveReport = useApproveReport()
  const rejectReport = useRejectReport()

  const activity = details?.activity
  const targetTeachers = details?.target_teachers ?? []
  const targetGrades = details?.target_grades ?? []
  const detailStats = details?.stats

  /**
   * مكان التنفيذ نصّاً — مهما أرسل الخادم.
   *
   * `ActivityReport` يحمل عموداً اسمه `execution_location` وعلاقةً اسمها
   * `executionLocation`، و`toArray()` في لارافيل يدمج العلاقات بعد الأعمدة —
   * فالعلاقة المحمَّلة مسبقاً تدهس النصّ بكائن. وتصييرُ كائنٍ في JSX يرمي
   * React #31 ويُفرغ الصفحة كلّها لا هذا السطر وحده.
   *
   * أُصلح الجذر في الخادم (ActivityController يُرجع نصّاً دائماً ويوفّر
   * `execution_location_name`)، وهذا حارسٌ لأن ثمن الخطأ هنا غير متناسب:
   * حقلٌ واحد يُسقط شاشة المراجعة كاملة.
   */
  const locationText = (report: { execution_location_name?: string | null; execution_location?: unknown }): string => {
    if (typeof report.execution_location_name === 'string') return report.execution_location_name
    if (typeof report.execution_location === 'string') return report.execution_location

    // كائنٌ وصل رغم كل ما سبق: نقرأ منه الاسم العربي بدل أن ننهار
    const raw = report.execution_location
    if (raw && typeof raw === 'object' && 'name_ar' in raw && typeof (raw as { name_ar: unknown }).name_ar === 'string') {
      return (raw as { name_ar: string }).name_ar
    }

    return ''
  }

  /* التقرير المعروض في عمود المراجعة + اسم معلمه وصفه */
  const selectedReport = useMemo(() => {
    if (!selectedReportId || !activity?.reports) return null
    const report = activity.reports.find((r) => r.id === selectedReportId)
    if (!report) return null
    const owner = targetTeachers.find((t) => t.grade_reports.some((g) => g.report_id === selectedReportId))
    return owner ? { ...report, teacher: { id: owner.id, name: owner.name } } : report
  }, [selectedReportId, activity, targetTeachers])

  const reportImageUrls = useMemo(() => {
    if (!selectedReport?.images?.length || !activity) return []
    return selectedReport.images.map((_, index) => getActivityReportImageUrl(activity.id, selectedReport.id, index, false))
  }, [selectedReport, activity])

  // إغلاق لوحة المراجعة عند تبديل النشاط
  useEffect(() => {
    setSelectedReportId(null)
    setRejectingReportId(null)
    setRejectionReason('')
  }, [selectedActivityId])

  const handleDelete = async (activityId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا النشاط؟')) return

    setDeletingId(activityId)
    try {
      await deleteActivity.mutateAsync(activityId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeletingId(null)
    }
  }

  const handleApprove = async (reportId: number) => {
    if (!activity) return
    try {
      await approveReport.mutateAsync({ activityId: activity.id, reportId })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const handleReject = async () => {
    if (!activity || !rejectingReportId || !rejectionReason.trim()) {
      alert('يرجى كتابة سبب الرفض')
      return
    }

    try {
      await rejectReport.mutateAsync({
        activityId: activity.id,
        reportId: rejectingReportId,
        rejectionReason: rejectionReason.trim(),
      })
      setRejectingReportId(null)
      setRejectionReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <WsPage>
      <WsHeader
        title="إدارة الأنشطة"
        badge="الأنشطة الطلابية"
        actions={<WsBtn variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>نشاط جديد</WsBtn>}
        facts={
          <>
            <WsFact icon={Sparkles} label="إجمالي الأنشطة">{stats?.total_activities ?? 0}</WsFact>
            <WsFact icon={CheckCircle2} label="نشطة">
              <span style={{ color: TONES.green.tx }}>{stats?.active_activities ?? 0}</span>
            </WsFact>
            <WsFact icon={Clock} label="تقارير معلقة">
              <span
                className={(stats?.pending_reports ?? 0) > 0 ? 'ws-soft-pulse' : undefined}
                style={{ color: (stats?.pending_reports ?? 0) > 0 ? TONES.amber.tx : undefined }}
              >
                {stats?.pending_reports ?? 0}
              </span>
            </WsFact>
            <WsFact icon={ClipboardCheck} label="تقارير معتمدة">
              <span style={{ color: TONES.sky.tx }}>{stats?.approved_reports ?? 0}</span>
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          {(['all', 'active', 'draft', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`ws-seg__btn ${statusFilter === status ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'الكل' : STATUS_META[status].label}
            </button>
          ))}
        </div>
        <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--ws-text-2)' }}>
          اختر نشاطاً من القائمة لعرض مصفوفة التسليم ومراجعة التقارير
        </span>
      </WsToolbar>

      <WsLayout>
        {/* قائمة الأنشطة — عمود مقيم بدل شبكة تملأ الشاشة */}
        <WsSideCol side="start" title="الأنشطة" icon={Sparkles} storageKey="ws:activities:list" width={290}>
          <WsBlock fill scroll>
            {isLoadingActivities ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : activities.length === 0 ? (
              <WsEmpty icon={CalendarDays}>لا توجد أنشطة مطابقة للفلتر الحالي</WsEmpty>
            ) : (
              activities.map((item) => {
                const meta = STATUS_META[item.status]
                const isSelected = selectedActivityId === item.id
                const pending = item.pending_reports_count ?? 0
                const approved = item.approved_reports_count ?? 0
                const rejected = item.rejected_reports_count ?? 0
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivityId(item.id)}
                    style={{
                      padding: '9px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                      boxShadow: isSelected ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: isSelected ? 'var(--ws-accent)' : undefined,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </span>
                      <ToneChip tone={meta.tone}>{meta.label}</ToneChip>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      {formatDate(item.start_date)} ← {formatDate(item.end_date)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: TONES.amber.tx }}>
                          <Clock style={{ width: 11, height: 11 }} />{pending}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: TONES.green.tx }}>
                          <CheckCircle2 style={{ width: 11, height: 11 }} />{approved}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: TONES.red.tx }}>
                          <X style={{ width: 11, height: 11 }} />{rejected}
                        </span>
                      </span>
                      <span onClick={(e) => e.stopPropagation()}>
                        <WsIconBtn
                          icon={Trash2}
                          label="حذف النشاط"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          style={{ color: TONES.red.tx }}
                        />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </WsBlock>
        </WsSideCol>

        {/* تفاصيل النشاط + مصفوفة التسليم */}
        <WsMain>
          {!selectedActivityId ? (
            <WsBlock fill>
              <WsEmpty icon={Sparkles}>اختر نشاطاً لعرض تفاصيله ومصفوفة تسليم المعلمين</WsEmpty>
            </WsBlock>
          ) : isLoadingDetails || !activity ? (
            <WsBlock fill>
              <WsEmpty loading>جاري تحميل تفاصيل النشاط...</WsEmpty>
            </WsBlock>
          ) : (
            <>
              <WsBlock
                title={activity.title}
                icon={Sparkles}
                tools={
                  <>
                    <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                      {formatDate(activity.start_date)} ← {formatDate(activity.end_date)}
                    </span>
                    {activity.pdf_file && (
                      <a
                        href={getActivityPdfUrl(activity.id, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ws-btn ws-btn--sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <FileText style={{ width: 12, height: 12 }} />
                        ملف النشاط
                      </a>
                    )}
                  </>
                }
                padded
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                  {activity.description && (
                    <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 5 }}>الوصف</p>
                      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{activity.description}</p>
                    </div>
                  )}
                  {activity.objectives && Array.isArray(activity.objectives) && activity.objectives.length > 0 && (
                    <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ListChecks style={{ width: 12, height: 12 }} /> الأهداف ({activity.objectives.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {activity.objectives.map((objective, index) => (
                          <span key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9,
                                fontWeight: 800,
                                background: TONES.sky.bg,
                                color: TONES.sky.tx,
                              }}
                            >
                              {index + 1}
                            </span>
                            {objective}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {activity.examples && (
                    <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Lightbulb style={{ width: 12, height: 12 }} /> أمثلة تطبيقية
                      </p>
                      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{activity.examples}</p>
                    </div>
                  )}
                </div>
              </WsBlock>

              {/* ★ مصفوفة التسليم: معلم × صف — من سلّم ومن تأخر بنظرة واحدة */}
              <WsBlock
                fill
                title="مصفوفة التسليم"
                icon={Users}
                count={detailStats ? `${detailStats.submitted_count}/${detailStats.expected_reports}` : undefined}
                tools={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10.5 }}>
                    {([
                      ['approved', 'معتمد'],
                      ['pending', 'بانتظار'],
                      ['rejected', 'مرفوض'],
                    ] as Array<[ReportStatus, string]>).map(([key, label]) => (
                      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ws-text-2)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: REPORT_STATUS_META[key].tone.bg, border: `1px solid ${REPORT_STATUS_META[key].tone.tx}` }} />
                        {label}
                      </span>
                    ))}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ws-text-2)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: TONES.gray.bg, border: `1px solid ${TONES.gray.bd}` }} />
                      لم يسلّم
                    </span>
                  </span>
                }
              >
                {targetTeachers.length === 0 ? (
                  <WsEmpty icon={Users}>لا يوجد معلمون مرتبطون بهذا النشاط</WsEmpty>
                ) : (
                  <div className="ws-tablewrap">
                    <table className="ws-table ws-matrix">
                      <thead>
                        <tr>
                          <th className="ws-matrix__stick" style={{ minWidth: 170, textAlign: 'right' }}>المعلم</th>
                          {targetGrades.map((grade) => (
                            <th key={grade} style={{ minWidth: 78 }}>{grade}</th>
                          ))}
                          <th style={{ minWidth: 96 }}>التقدم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetTeachers.map((teacher) => {
                          const total = teacher.total_grades
                          const app = teacher.grade_reports.filter(g => g.has_report && g.report_status === 'approved').length
                          const pen = teacher.grade_reports.filter(g => g.has_report && g.report_status === 'pending').length
                          const rej = teacher.grade_reports.filter(g => g.has_report && g.report_status === 'rejected').length
                          const allApproved = total > 0 && teacher.submitted_grades === total && teacher.grade_reports.every(
                            g => g.has_report && g.report_status === 'approved'
                          )
                          return (
                            <tr key={teacher.id}>
                              <td className="ws-matrix__stick" style={{ textAlign: 'right' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                  <InitialAvatar name={teacher.name} tone={allApproved ? TONES.green : TONES.gray} size={24} />
                                  <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontWeight: 600 }}>{teacher.name}</span>
                                    <span className="ws-cell-sub">
                                      سلّم {teacher.submitted_grades} من {total}
                                      {allApproved && <span style={{ color: TONES.green.tx, fontWeight: 700 }}> • مكتمل</span>}
                                    </span>
                                  </span>
                                </span>
                              </td>
                              {targetGrades.map((grade) => {
                                const cell = teacher.grade_reports.find((g) => g.grade === grade)
                                if (!cell) {
                                  return <td key={grade} style={{ background: 'var(--ws-surface-2)', opacity: 0.4 }}>—</td>
                                }
                                const tone = cellTone(cell.has_report, cell.report_status)
                                const isSelected = cell.report_id != null && cell.report_id === selectedReportId
                                const canOpen = cell.has_report && cell.report_id != null
                                return (
                                  <td key={grade} style={{ padding: 3 }}>
                                    <button
                                      type="button"
                                      disabled={!canOpen}
                                      onClick={() => canOpen && setSelectedReportId(cell.report_id)}
                                      title={
                                        cell.has_report
                                          ? `${grade} — ${REPORT_STATUS_META[cell.report_status!].label}`
                                          : `${grade} — لم يسلّم`
                                      }
                                      className={cell.report_status === 'pending' ? 'ws-soft-pulse' : undefined}
                                      style={{
                                        width: '100%',
                                        minHeight: 30,
                                        borderRadius: 7,
                                        border: `1px solid ${isSelected ? tone.tx : tone.bd}`,
                                        background: cell.has_report ? tone.bg : 'transparent',
                                        color: tone.tx,
                                        fontFamily: 'inherit',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: canOpen ? 'pointer' : 'default',
                                        boxShadow: isSelected ? `0 0 0 1.5px ${tone.tx}` : undefined,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: cell.has_report ? 1 : 0.55,
                                      }}
                                    >
                                      {cell.has_report ? (
                                        cell.report_status === 'approved' ? <Check style={{ width: 13, height: 13 }} />
                                          : cell.report_status === 'rejected' ? <X style={{ width: 13, height: 13 }} />
                                            : <Clock style={{ width: 13, height: 13 }} />
                                      ) : '·'}
                                    </button>
                                  </td>
                                )
                              })}
                              <td style={{ padding: '4px 8px' }}>
                                {/* شريط تقدم مقسوم بألوان الحالات */}
                                <span
                                  style={{
                                    display: 'flex',
                                    height: 7,
                                    width: 80,
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    background: 'var(--ws-border)',
                                  }}
                                >
                                  {app > 0 && <span style={{ height: '100%', width: `${(app / total) * 100}%`, background: TONES.green.tx }} title={`معتمد: ${app}`} />}
                                  {pen > 0 && <span style={{ height: '100%', width: `${(pen / total) * 100}%`, background: TONES.amber.tx }} title={`بانتظار: ${pen}`} />}
                                  {rej > 0 && <span style={{ height: '100%', width: `${(rej / total) * 100}%`, background: TONES.red.tx }} title={`مرفوض: ${rej}`} />}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </WsBlock>
            </>
          )}
        </WsMain>

        {/* لوحة مراجعة التقرير — مقيمة بدل مودال فوق مودال */}
        <WsSideCol side="end" title="مراجعة التقرير" icon={ClipboardCheck} storageKey="ws:activities:review" width={330}>
          <WsBlock fill scroll>
            {!selectedReport ? (
              <WsEmpty icon={ClipboardCheck}>اضغط خلية في المصفوفة لمراجعة تقريرها</WsEmpty>
            ) : (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InitialAvatar
                    name={selectedReport.teacher?.name || '؟'}
                    tone={REPORT_STATUS_META[selectedReport.status].tone}
                    size={34}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>{selectedReport.teacher?.name || 'معلم'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      {selectedReport.grade ? `${selectedReport.grade} • ` : ''}{formatDateTime(selectedReport.created_at)}
                    </p>
                  </div>
                  <WsIconBtn icon={X} label="إغلاق المراجعة" onClick={() => setSelectedReportId(null)} />
                </div>

                <ToneChip tone={REPORT_STATUS_META[selectedReport.status].tone}>
                  {REPORT_STATUS_META[selectedReport.status].label}
                </ToneChip>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ border: '1px solid var(--ws-border)', borderRadius: 8, padding: 8 }}>
                    <p className="ws-label" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin style={{ width: 11, height: 11 }} /> مكان التنفيذ
                    </p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{locationText(selectedReport) || '—'}</p>
                  </div>
                  <div style={{ border: '1px solid var(--ws-border)', borderRadius: 8, padding: 8 }}>
                    <p className="ws-label" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users style={{ width: 11, height: 11 }} /> الطلاب المشاركون
                    </p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ws-accent)' }}>{selectedReport.students_count}</p>
                  </div>
                </div>

                <div>
                  <p className="ws-label" style={{ marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Target style={{ width: 11, height: 11 }} /> الأهداف المحققة
                  </p>
                  {selectedReport.achieved_objectives && Array.isArray(selectedReport.achieved_objectives) && selectedReport.achieved_objectives.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selectedReport.achieved_objectives.map((objective, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 6,
                            fontSize: 11.5,
                            background: TONES.green.bg,
                            border: `1px solid ${TONES.green.bd}`,
                            color: TONES.green.tx,
                            borderRadius: 7,
                            padding: '6px 8px',
                          }}
                        >
                          <span style={{ fontWeight: 800, flexShrink: 0 }}>{index + 1}.</span>
                          {objective}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)' }}>لم يتم تحديد أهداف</p>
                  )}
                </div>

                {selectedReport.rejection_reason && (
                  <WsAlert tone="error" boxed>
                    <span><b>سبب الرفض السابق: </b>{selectedReport.rejection_reason}</span>
                  </WsAlert>
                )}

                {reportImageUrls.length > 0 && (
                  <div>
                    <p className="ws-label" style={{ marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ImageIcon style={{ width: 11, height: 11 }} /> صور التوثيق ({reportImageUrls.length})
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                      {reportImageUrls.map((img, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setViewingImageIndex(index)}
                          title={`تكبير صورة ${index + 1}`}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid var(--ws-border)',
                            padding: 0,
                            cursor: 'zoom-in',
                            background: 'var(--ws-surface-2)',
                            position: 'relative',
                          }}
                        >
                          <img src={img} alt={`صورة ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.reviewed_at && (
                  <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                    تمت المراجعة في {formatDateTime(selectedReport.reviewed_at)}
                  </p>
                )}

                {/* سبب الرفض يُكتب هنا مباشرة بدل مودال ثالث */}
                {rejectingReportId === selectedReport.id ? (
                  <div style={{ background: TONES.red.bg, border: `1px solid ${TONES.red.bd}`, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p className="ws-label" style={{ margin: 0, color: TONES.red.tx }}>سبب الرفض (إجباري)</p>
                    <WsTextarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      placeholder="اكتب سبب رفض التقرير..."
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <WsBtn
                        size="sm"
                        onClick={() => {
                          setRejectingReportId(null)
                          setRejectionReason('')
                        }}
                      >
                        إلغاء
                      </WsBtn>
                      <WsBtn
                        size="sm"
                        variant="danger"
                        icon={rejectReport.isPending ? undefined : X}
                        onClick={handleReject}
                        disabled={rejectReport.isPending || !rejectionReason.trim()}
                      >
                        {rejectReport.isPending ? <WsSpinner /> : 'تأكيد الرفض'}
                      </WsBtn>
                    </div>
                  </div>
                ) : selectedReport.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <WsBtn
                      variant="primary"
                      icon={Check}
                      onClick={() => handleApprove(selectedReport.id)}
                      disabled={approveReport.isPending}
                      style={{ flex: 1 }}
                    >
                      {approveReport.isPending ? 'جارٍ...' : 'اعتماد'}
                    </WsBtn>
                    <WsBtn icon={X} onClick={() => setRejectingReportId(selectedReport.id)} style={{ flex: 1, color: TONES.red.tx }}>
                      رفض
                    </WsBtn>
                  </div>
                ) : null}

                {selectedReport.status === 'approved' && activity && (
                  <a
                    href={getActivityReportPrintUrl(activity.id, selectedReport.id, false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-btn"
                    style={{ textDecoration: 'none', justifyContent: 'center' }}
                  >
                    <FileText style={{ width: 12, height: 12 }} />
                    ملف التقرير
                  </a>
                )}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* عارض الصور بملء الشاشة */}
      {viewingImageIndex !== null && reportImageUrls.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              صورة {viewingImageIndex + 1} من {reportImageUrls.length}
            </span>
            <button
              type="button"
              onClick={() => setViewingImageIndex(null)}
              title="إغلاق"
              style={{ border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: 8, cursor: 'pointer', display: 'inline-flex' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, position: 'relative' }}>
            {viewingImageIndex > 0 && (
              <button
                type="button"
                onClick={() => setViewingImageIndex(viewingImageIndex - 1)}
                title="السابق"
                style={{ position: 'absolute', insetInlineEnd: 14, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: 10, cursor: 'pointer', display: 'inline-flex' }}
              >
                <ChevronRight style={{ width: 20, height: 20 }} />
              </button>
            )}
            <img
              src={reportImageUrls[viewingImageIndex]}
              alt={`صورة ${viewingImageIndex + 1}`}
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 10 }}
            />
            {viewingImageIndex < reportImageUrls.length - 1 && (
              <button
                type="button"
                onClick={() => setViewingImageIndex(viewingImageIndex + 1)}
                title="التالي"
                style={{ position: 'absolute', insetInlineStart: 14, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: 10, cursor: 'pointer', display: 'inline-flex' }}
              >
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </button>
            )}
          </div>
          {reportImageUrls.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 14 }}>
              {reportImageUrls.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setViewingImageIndex(index)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    overflow: 'hidden',
                    padding: 0,
                    cursor: 'pointer',
                    border: index === viewingImageIndex ? '2px solid #fff' : '2px solid transparent',
                    opacity: index === viewingImageIndex ? 1 : 0.5,
                    background: 'transparent',
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ActivityCreateModal
          grades={grades ?? []}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </WsPage>
  )
}
