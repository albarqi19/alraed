import { useEffect } from 'react'
import { CheckCircle2, Clock3, RefreshCw, UserRound, XCircle } from 'lucide-react'
import { useMissingSessionsQuery } from '../hooks'
import { WsBlock, WsChip, WsEmpty, WsIconBtn } from '@/shared/workspace'

interface MissingSessionData {
  class_session_id: number | null
  grade: string
  class_name: string
  subject_name: string
  teacher_name: string
  teacher_id: number | null
  period_number: number | null
  start_time: string
  end_time: string
  time_since_start: string
  minutes_since_start: number
  status: string
  is_current: boolean
  student_count: number | null
  note?: string
}

// لون شدة التأخر (خط جانبي على البطاقة)
function severityColor(status: string): string {
  switch (status) {
    case 'very_late':
      return 'var(--ws-red)'
    case 'late':
      return 'var(--ws-amber)'
    case 'slightly_late':
      return 'var(--ws-amber)'
    default:
      return 'var(--ws-border)'
  }
}

/** بانل حي للفصول التي لم ترسل التحضير — يتحدث تلقائياً كل دقيقة (عمود يمين في صفحة الاعتماد) */
export function MissingSessionsPanel() {
  const { data, isLoading, refetch, isFetching } = useMissingSessionsQuery({ enabled: true })
  const stats = data?.data
  const missingSessions: MissingSessionData[] = stats?.missing_sessions ?? []

  // تحديث البيانات كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 60000)
    return () => clearInterval(interval)
  }, [refetch])

  return (
    <>
      <WsBlock padded>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
            <WsChip tone="green" icon={CheckCircle2}>
              أرسل {Number(stats?.submitted ?? 0).toLocaleString('ar-SA')}
            </WsChip>
            <WsChip tone="red" icon={XCircle}>
              لم يُرسل {Number(stats?.missing ?? 0).toLocaleString('ar-SA')}
            </WsChip>
          </span>
          <WsIconBtn icon={RefreshCw} label="تحديث الآن" onClick={() => refetch()} disabled={isFetching} />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
          آخر تحديث: {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString('ar-SA') : '—'} — يتحدث تلقائياً كل
          دقيقة
        </p>
      </WsBlock>

      <WsBlock
        title="الفصول المتأخرة"
        count={missingSessions.length.toLocaleString('ar-SA')}
        fill
        scroll
      >
        {isLoading ? (
          <WsEmpty loading>جاري تحميل حالة الحصص...</WsEmpty>
        ) : !data?.success || !stats ? (
          <WsEmpty icon={Clock3}>لا توجد بيانات متاحة.</WsEmpty>
        ) : missingSessions.length === 0 ? (
          <WsEmpty icon={CheckCircle2}>ممتاز! جميع المعلمين أرسلوا التحضير في الوقت المحدد.</WsEmpty>
        ) : (
          <div>
            {missingSessions.map((session) => (
              <div
                key={session.class_session_id ?? `${session.teacher_id ?? 'teacher'}-${session.start_time}`}
                style={{
                  padding: '7px 12px',
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>
                    {session.grade} {session.class_name} — {session.subject_name}
                  </span>
                  {session.is_current && <WsChip tone="sky">الآن</WsChip>}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginTop: 3,
                    fontSize: 11,
                    color: 'var(--ws-text-2)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <UserRound style={{ width: 11, height: 11 }} />
                    {session.teacher_name}
                  </span>
                  {session.period_number ? <span>الحصة {session.period_number}</span> : null}
                  <span style={{ direction: 'ltr' }}>
                    {session.start_time} - {session.end_time}
                  </span>
                </div>
                {session.minutes_since_start > 0 && session.time_since_start !== 'لم يُرسل اليوم' && (
                  <p
                    style={{
                      margin: '3px 0 0',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: severityColor(session.status),
                    }}
                  >
                    لم يُرسل منذ: {session.time_since_start}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </WsBlock>
    </>
  )
}
