import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudOff,
  CloudUpload,
  Eye,
  Info,
  Laptop,
  ListChecks,
  Star,
  Upload,
  UserRound,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import {
  useRemoteDaysOverview,
  useRemoteDayDetails,
  useRemoteUploadDetails,
} from '../remote-attendance/hooks'
import { RemoteDayActivationModal } from '../components/remote-day-activation-modal'
import type { RemoteDaySession } from '../remote-attendance/types'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsHeader,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsProgress,
  WsSideCol,
  WsTable,
} from '@/shared/workspace'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} س`)
  if (m > 0) parts.push(`${m} د`)
  if (s > 0 || parts.length === 0) parts.push(`${s} ث`)
  return parts.join(' ')
}

interface TeacherSummary {
  teacher_id: number
  teacher_name: string
  total_sessions: number
  uploaded_sessions: number
  total_participants: number
  sessions: RemoteDaySession[]
}

export default function AdminRemoteAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>()
  const [selectedUploadId, setSelectedUploadId] = useState<number | undefined>()
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)

  const overviewQuery = useRemoteDaysOverview()
  const dayDetailsQuery = useRemoteDayDetails(selectedDate)
  const uploadDetailsQuery = useRemoteUploadDetails(selectedUploadId)

  const handleSelectDay = (date: string) => {
    setSelectedDate(date)
    setSelectedTeacherId(undefined)
    setSelectedUploadId(undefined)
  }

  const overview = overviewQuery.data
  if (overview?.length && !selectedDate) {
    setSelectedDate(overview[0].date)
  }

  const dayDetails = dayDetailsQuery.data

  // تجميع الحصص حسب المعلم
  const teacherSummaries = useMemo<TeacherSummary[]>(() => {
    if (!dayDetails?.sessions) return []
    const map = new Map<number, TeacherSummary>()
    for (const s of dayDetails.sessions) {
      let t = map.get(s.teacher_id)
      if (!t) {
        t = {
          teacher_id: s.teacher_id,
          teacher_name: s.teacher_name,
          total_sessions: 0,
          uploaded_sessions: 0,
          total_participants: 0,
          sessions: [],
        }
        map.set(s.teacher_id, t)
      }
      t.total_sessions++
      if (s.is_uploaded) {
        t.uploaded_sessions++
        t.total_participants += s.total_participants
      }
      t.sessions.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      // اللي ما رفعوا أولاً
      const aRatio = a.total_sessions ? a.uploaded_sessions / a.total_sessions : 0
      const bRatio = b.total_sessions ? b.uploaded_sessions / b.total_sessions : 0
      return aRatio - bRatio
    })
  }, [dayDetails?.sessions])

  const selectedTeacher = teacherSummaries.find(
    (t) => t.teacher_id === selectedTeacherId,
  )

  return (
    <WsPage>
      <WsHeader
        title="متابعة الدوام عن بعد"
        badge="ملفات تيمز"
        actions={
          <WsBtn variant="primary" icon={Laptop} onClick={() => setIsActivateModalOpen(true)}>
            تحويل يوم إلى عن بعد
          </WsBtn>
        }
        facts={
          dayDetails ? (
            <>
              <WsFact icon={Users} label="المعلمون الكلي:">
                {dayDetails.stats.total_teachers.toLocaleString('ar-SA')}
              </WsFact>
              <WsFact icon={CloudUpload} label="رفعوا الملفات:">
                {dayDetails.stats.teachers_uploaded.toLocaleString('ar-SA')}
              </WsFact>
              <WsFact icon={CloudOff} label="لم يرفعوا:">
                {dayDetails.stats.teachers_not_uploaded.toLocaleString('ar-SA')}
              </WsFact>
              <WsFact icon={UserRound} label="إجمالي المشاركين:">
                {dayDetails.stats.total_participants.toLocaleString('ar-SA')}
              </WsFact>
            </>
          ) : undefined
        }
      />

      <WsLayout>
        {/* العمود الأيمن: أيام الدوام عن بعد */}
        <WsSideCol
          title="أيام الدوام عن بعد"
          icon={CalendarDays}
          side="start"
          width={270}
          storageKey="ws:remote-attendance:days"
        >
          <WsBlock fill scroll>
            {overviewQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الأيام...</WsEmpty>
            ) : !overview?.length ? (
              <WsEmpty icon={Laptop}>
                لا توجد أيام دوام عن بعد حتى الآن.
                <span style={{ fontSize: 11 }}>حوّل يوماً من الزر بالأعلى.</span>
              </WsEmpty>
            ) : (
              <div>
                {overview.map((day) => {
                  const isSelected = selectedDate === day.date
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleSelectDay(day.date)}
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
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text)' }}>
                        {day.date_formatted}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 3,
                          fontSize: 11,
                          color: 'var(--ws-text-2)',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ws-accent)' }}>
                          <Upload style={{ width: 11, height: 11 }} />
                          {day.uploads_count} رفع
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Users style={{ width: 11, height: 11 }} />
                          {day.total_participants} مشارك
                        </span>
                      </span>
                      {day.note && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 10.5,
                            color: 'var(--ws-text-2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {day.note}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: المعلمون وحالة رفعهم */}
        <WsMain>
          <WsBlock
            title="المعلمون"
            icon={Users}
            count={teacherSummaries.length.toLocaleString('ar-SA')}
            fill
            scroll
          >
            {dayDetailsQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل تفاصيل اليوم...</WsEmpty>
            ) : !dayDetails ? (
              <WsEmpty icon={Laptop}>اختر يوماً من القائمة اليمنى.</WsEmpty>
            ) : teacherSummaries.length === 0 ? (
              <WsEmpty icon={Users}>لا توجد حصص مسجلة لهذا اليوم.</WsEmpty>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: 8,
                  padding: 12,
                }}
              >
                {teacherSummaries.map((teacher) => {
                  const ratio = teacher.total_sessions > 0 ? teacher.uploaded_sessions / teacher.total_sessions : 0
                  const isSelected = teacher.teacher_id === selectedTeacherId
                  const StatusIcon = ratio === 1 ? CheckCircle2 : ratio > 0 ? AlertCircle : XCircle
                  const statusColor = ratio === 1 ? 'var(--ws-green)' : ratio > 0 ? 'var(--ws-amber)' : 'var(--ws-red)'
                  return (
                    <button
                      key={teacher.teacher_id}
                      type="button"
                      onClick={() => setSelectedTeacherId(teacher.teacher_id)}
                      className={`ws-pick ${isSelected ? 'is-checked' : ''}`}
                      style={{ alignItems: 'flex-start', padding: '8px 10px' }}
                    >
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
                          <StatusIcon style={{ width: 13, height: 13, color: statusColor, flexShrink: 0 }} />
                          <span className="ws-pick__name">{teacher.teacher_name}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                          <WsProgress value={ratio * 100} style={{ flex: 1 }} />
                          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', flexShrink: 0 }}>
                            {teacher.uploaded_sessions}/{teacher.total_sessions}
                          </span>
                        </span>
                        {teacher.total_participants > 0 && (
                          <span className="ws-pick__sub">
                            {teacher.total_participants.toLocaleString('ar-SA')} مشارك
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* اليسار: حصص المعلم المحدد — بدل المودال */}
        <WsSideCol title="حصص المعلم" icon={ListChecks} storageKey="ws:remote-attendance:teacher" width={340}>
          {!selectedTeacher ? (
            <WsEmpty icon={Info}>اختر معلماً من الوسط لعرض حصصه وملفات الرفع.</WsEmpty>
          ) : (
            <>
              <WsBlock padded>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{selectedTeacher.teacher_name}</span>
                  <WsChip
                    tone={
                      selectedTeacher.uploaded_sessions === selectedTeacher.total_sessions
                        ? 'green'
                        : selectedTeacher.uploaded_sessions > 0
                          ? 'amber'
                          : 'red'
                    }
                  >
                    {selectedTeacher.uploaded_sessions} / {selectedTeacher.total_sessions} رُفعت
                  </WsChip>
                </div>
              </WsBlock>

              <WsBlock title="الحصص" count={selectedTeacher.sessions.length} fill scroll>
                <div>
                  {selectedTeacher.sessions
                    .slice()
                    .sort((a, b) => (a.period_number ?? 0) - (b.period_number ?? 0))
                    .map((session) => (
                      <div
                        key={session.session_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 12px',
                          borderBottom: '1px solid var(--ws-hairline)',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            flexShrink: 0,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: session.is_uploaded ? 'var(--ws-green-bg)' : 'var(--ws-surface-2)',
                            color: session.is_uploaded ? 'var(--ws-green)' : 'var(--ws-text-2)',
                          }}
                        >
                          {session.period_number ?? '-'}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{session.subject_name}</span>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                            {session.grade} - {session.class_name}
                          </span>
                        </span>
                        {session.is_uploaded ? (
                          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <span style={{ fontSize: 10.5, color: 'var(--ws-green)', fontWeight: 700 }}>
                              {session.total_participants} مشارك
                              {session.avg_duration_seconds > 0 && (
                                <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>
                                  {' '}
                                  • {formatDuration(session.avg_duration_seconds)}
                                </span>
                              )}
                            </span>
                            {session.upload_id && (
                              <WsBtn size="sm" icon={Eye} onClick={() => setSelectedUploadId(session.upload_id!)}>
                                عرض
                              </WsBtn>
                            )}
                          </span>
                        ) : (
                          <WsChip icon={Clock3}>لم يُرفع</WsChip>
                        )}
                      </div>
                    ))}
                </div>
              </WsBlock>
            </>
          )}
        </WsSideCol>
      </WsLayout>

      {/* نافذة تفاصيل الرفع (المشاركون) */}
      {selectedUploadId && uploadDetailsQuery.data && (
        <UploadDetailsModal
          details={uploadDetailsQuery.data}
          onClose={() => setSelectedUploadId(undefined)}
        />
      )}
      {selectedUploadId && uploadDetailsQuery.isLoading && (
        <div className="ws-modal">
          <div className="ws-modal__panel" style={{ maxWidth: 120, padding: 24, textAlign: 'center' }}>
            <span className="ws-spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      )}

      {/* نافذة تحويل الدوام عن بعد */}
      <RemoteDayActivationModal
        isOpen={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        date={new Date().toISOString().slice(0, 10)}
        allowDateChange
        onSuccess={() => overviewQuery.refetch()}
      />
    </WsPage>
  )
}

/* ========== نافذة تفاصيل الرفع (المشاركون) ========== */
function UploadDetailsModal({
  details,
  onClose,
}: {
  details: NonNullable<ReturnType<typeof useRemoteUploadDetails>['data']>
  onClose: () => void
}) {
  const formatTime = (dt: string | null) => {
    if (!dt) return '-'
    return new Date(dt).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const attendees = details.participants.filter((p) => p.role === 'attendee')
  const organizer = details.participants.find((p) => p.role === 'organizer')

  return (
    <WsModal
      open
      onClose={onClose}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Video style={{ width: 15, height: 15, color: 'var(--ws-accent-2)' }} />
          {details.upload.meeting_title ?? 'تفاصيل الاجتماع'}
        </span>
      }
      sub={`${details.upload.teacher_name} — ${details.session.subject_name} (${details.session.grade} - ${details.session.class_name})`}
      maxWidth={680}
      footer={
        <WsBtn variant="primary" onClick={onClose}>
          إغلاق
        </WsBtn>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <WsChip tone="green" icon={Users}>
          {details.stats.total_attendees} مشارك
        </WsChip>
        <WsChip tone="sky" icon={Clock3}>
          متوسط المدة {formatDuration(details.stats.avg_duration_seconds)}
        </WsChip>
        <WsChip icon={Video}>مدة الاجتماع {details.upload.meeting_duration ?? '—'}</WsChip>
        {organizer && (
          <WsChip tone="amber" icon={Star}>
            المنظم: {organizer.name}
          </WsChip>
        )}
      </div>

      <div style={{ maxHeight: '48vh', overflowY: 'auto', border: '1px solid var(--ws-hairline)', borderRadius: 8 }}>
        <WsTable>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>المدة</th>
              <th>أول دخول</th>
              <th>آخر خروج</th>
              <th>مرات الدخول</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((p, i) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--ws-text-2)' }}>{i + 1}</td>
                <td>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.email && (
                    <span className="ws-cell-sub" style={{ direction: 'ltr', textAlign: 'right' }}>
                      {p.email}
                    </span>
                  )}
                </td>
                <td>{p.duration_text ?? formatDuration(p.total_duration_seconds)}</td>
                <td style={{ color: 'var(--ws-text-2)' }}>{formatTime(p.first_join_time)}</td>
                <td style={{ color: 'var(--ws-text-2)' }}>{formatTime(p.last_leave_time)}</td>
                <td>
                  {p.join_leave_count > 1 ? (
                    <WsChip tone="amber">{p.join_leave_count}</WsChip>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>1</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </WsTable>
      </div>
    </WsModal>
  )
}
