import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
  RefreshCw,
  UserX,
  Users,
  UserRoundX,
  Clock,
  EyeOff,
} from 'lucide-react'
import { useAdminDashboardStatsQuery } from '@/modules/admin/hooks'
import { OnboardingProgressCard } from '../components/onboarding-progress-card'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsAlert,
  WsEmpty,
  TONES,
} from '@/shared/workspace'
import {
  MorningQueue,
  QueueLegend,
  findToday,
  chronicSilence,
  freshnessLabel,
  arNum,
  type WeekDay,
} from './dashboard-ui'

/** لا صفَّ بلا وجهة — والوجهة تُملأ من رقم يعرفه المدير */
interface CallRow {
  to: string
  label: string
  sub: string
  icon: typeof Users
  count?: number
  hot?: boolean
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDashboardStatsQuery()

  const days: WeekDay[] = data?.weekly_attendance ?? []
  const today = findToday(days)
  const chronic = chronicSilence(days)
  const fresh = freshnessLabel(data?.generated_at)

  // الفشل يُقال ولا يُرسم أصفاراً واثقة: انتهاء الاشتراك يردّ 402 برسالة حقيقية
  if (isError) {
    return (
      <WsPage>
        <WsHeader title="نظرة عامة" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsAlert tone="error" boxed>
                {(error as Error)?.message ?? 'تعذّر تحميل الإحصائيات'}
                <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>
                  إعادة المحاولة
                </WsBtn>
              </WsAlert>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  const total = today?.total_students ?? 0
  const recorded = today?.recorded_students ?? 0
  const unrecorded = today?.unrecorded_students ?? 0
  const silentNow = Math.max(unrecorded - chronic, 0)

  const callRows: CallRow[] = [
    {
      to: '/admin/attendance-report',
      label: 'كشف الغياب',
      sub: 'أسماء الغائبين اليوم',
      icon: UserX,
      count: data?.absent_today,
      hot: (data?.absent_today ?? 0) > 0,
    },
    { to: '/admin/approval', label: 'اعتماد التحضير', sub: 'مراجعة ما سلّمه المعلمون', icon: ClipboardCheck },
    { to: '/admin/late-arrivals', label: 'المتأخرون', sub: 'تأخّر الصباح', icon: Clock, count: data?.late_today },
    { to: '/admin/whatsapp', label: 'مركز الواتساب', sub: 'إرسال ومتابعة الرسائل', icon: ListChecks },
  ]

  return (
    <WsPage>
      <WsHeader
        title="نظرة عامة"
        badge={
          !today && !isLoading
            ? days[0]
              ? `عطلة — آخر يوم دراسي: ${days[0].day}`
              : 'عطلة'
            : fresh ?? undefined
        }
        actions={
          <WsBtn icon={RefreshCw} onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'جارٍ التحديث...' : 'تحديث'}
          </WsBtn>
        }
        facts={
          <>
            {/* الرقم الذي لم يكن أحد يقوله: كم رأساً لم يُرصد بعد */}
            {today && (
              <WsFact icon={EyeOff} label="لم يُرصد بعد">
                <span style={{ color: unrecorded > 0 ? TONES.amber.tx : undefined }}>{arNum(unrecorded)}</span>
              </WsFact>
            )}
            <WsFact icon={UserX} label="غائب">{arNum(data?.absent_today ?? 0)}</WsFact>
            <WsFact icon={Clock} label="متأخر">{arNum(data?.late_today ?? 0)}</WsFact>
            {today && (
              <WsFact icon={UserRoundX} label="معلمون غائبون">{arNum(today.absent_teachers)}</WsFact>
            )}
            <WsFact icon={CalendarCheck} label="حصص اليوم">{arNum(data?.today_classes ?? 0)}</WsFact>
            <WsFact icon={GraduationCap} label="طلاب نشطون">{arNum(data?.total_students ?? 0)}</WsFact>
          </>
        }
      />

      <WsLayout>
        <WsMain>
          {/* ★ طابور الصباح — سؤال السابعة والنصف: من لم ينطق بعد؟ */}
          <WsBlock padded title="طابور الصباح" icon={Users}>
            {isLoading ? (
              <div style={{ height: 48, borderRadius: 6, background: 'var(--ws-surface-2)' }} />
            ) : !today ? (
              <WsEmpty icon={CalendarDays}>لا يوم دراسي اليوم</WsEmpty>
            ) : total === 0 ? (
              <WsEmpty icon={Users}>لا طلاب مسجّلون</WsEmpty>
            ) : (
              <>
                <MorningQueue total={total} recorded={recorded} chronic={chronic} />
                <QueueLegend recorded={recorded} silent={silentNow} chronic={chronic} total={total} />
              </>
            )}
          </WsBlock>

          {/* لوحة النداء — لا صفَّ بلا وجهة */}
          <WsBlock fill scroll title="لوحة النداء" icon={ListChecks}>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {callRows.map((row) => {
                const Icon = row.icon
                return (
                  <Link
                    key={row.to}
                    to={row.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--ws-hairline)',
                      textDecoration: 'none',
                      color: 'var(--ws-text)',
                      background: row.hot ? TONES.amber.bg : undefined,
                    }}
                  >
                    <Icon
                      style={{ width: 15, height: 15, flexShrink: 0, color: row.hot ? TONES.amber.tx : 'var(--ws-text-2)' }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{row.label}</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>{row.sub}</span>
                    </span>
                    {row.count != null && row.count > 0 && (
                      <b style={{ flexShrink: 0, color: row.hot ? TONES.amber.tx : 'var(--ws-text-2)' }}>
                        {arNum(row.count)}
                      </b>
                    )}
                  </Link>
                )
              })}
            </div>
          </WsBlock>
        </WsMain>

        {/* الأسبوع — أعداد لا نِسَب: الكميات المطلقة الماضية صادقة، والنِسَب الماضية كاذبة */}
        <WsSideCol side="end" title="الأسبوع" icon={CalendarDays} storageKey="ws:dashboard:sidecol" width={300}>
          <WsBlock fill scroll>
            {isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : days.length === 0 ? (
              <WsEmpty icon={CalendarDays}>لا أيام دراسية</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th style={{ width: 40 }}>حاضر</th>
                    <th style={{ width: 40 }}>غائب</th>
                    <th style={{ width: 40 }}>متأخر</th>
                    <th style={{ width: 40 }} title="معلمون غائبون">معلمون</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} style={d.date === today?.date ? { background: 'var(--ws-accent-soft)' } : undefined}>
                      <td style={{ whiteSpace: 'nowrap' }}>{d.day}</td>
                      <td>{arNum(d.present)}</td>
                      <td>{arNum(d.absent)}</td>
                      <td>{arNum(d.late)}</td>
                      <td style={{ color: d.absent_teachers > 0 ? TONES.amber.tx : 'var(--ws-text-2)' }}>
                        {arNum(d.absent_teachers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </WsTable>
            )}
            <div style={{ padding: '8px 10px' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
                أعداد مطلقة رُصدت في يومها — لا نِسَب. مقام الأيام الماضية هو كشف اليوم،
                فأي نسبة تاريخية تتحرك كلما تغيّر الكشف.
              </p>
            </div>
            <OnboardingProgressCard />
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
