import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Clock,
  GraduationCap,
  ListChecks,
  RefreshCw,
  Sun,
  UserCheck,
  UserRoundX,
  Users,
  UserX,
} from 'lucide-react'
import { useAdminDashboardStatsQuery, useMissingSessionsQuery } from '@/modules/admin/hooks'
import { fetchAbsenceMessagesStats } from '@/modules/admin/api'
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
  type Tone,
} from '@/shared/workspace'
import {
  MorningQueue,
  QueueLegend,
  DayCard,
  chip,
  WeekSpark,
  CoverageArc,
  weekPulse,
  todayGreetingLine,
  findToday,
  chronicSilence,
  freshnessLabel,
  todayIso,
  arNum,
  type WeekDay,
} from './dashboard-ui'

interface CallRow {
  to: string
  label: string
  sub: string
  icon: typeof Users
  count?: number
  tone?: Tone
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDashboardStatsQuery()

  const days: WeekDay[] = data?.weekly_attendance ?? []
  const today = findToday(days)
  const chronic = chronicSilence(days)
  const fresh = freshnessLabel(data?.generated_at)
  const line = useMemo(() => todayGreetingLine(), [])

  // إغناءان اختياريان — هوكان جاهزان بكاش مشترك، ولا يكسر فشلُهما شيئاً
  const missing = useMissingSessionsQuery({ enabled: !!today })
  const msgStats = useQuery({
    queryKey: ['admin', 'absence-messages-stats', todayIso()],
    queryFn: () => fetchAbsenceMessagesStats(todayIso()),
    enabled: !!today,
    staleTime: 60_000,
  })

  // المعلَّق يُحسب من مصفوفة الطلاب لا من messages_pending (قد يكون سالباً — طرح صفوف من طلاب)
  const pendingMsgs = useMemo(() => {
    const students = msgStats.data?.students ?? []
    return students.filter((s) => s.message_status !== 'sent' && s.message_status !== 'delivered').length
  }, [msgStats.data])

  if (isError) {
    return (
      <WsPage className="ws-rich">
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
  const pulse = today ? weekPulse(days, today.absent) : null
  const missingData = missing.data?.data

  const callRows: CallRow[] = [
    {
      to: '/admin/attendance-report',
      label: 'كشف الغياب',
      sub: 'أسماء الغائبين اليوم',
      icon: UserX,
      count: data?.absent_today,
      tone: TONES.red,
    },
    {
      to: '/admin/approval',
      label: 'اعتماد التحضير',
      sub:
        missingData && missingData.total_classes > 0
          ? `سلّم ${arNum(missingData.submitted)} من ${arNum(missingData.total_classes)} فصلاً حتى الآن`
          : 'مراجعة ما سلّمه المعلمون',
      icon: ClipboardCheck,
      count: data?.pending_approvals,
      tone: TONES.purple,
    },
    {
      to: '/admin/late-arrivals',
      label: 'المتأخرون',
      sub: 'تأخّر الصباح',
      icon: Clock,
      count: data?.late_today,
      tone: TONES.amber,
    },
    {
      to: '/admin/absence-messages',
      label: 'رسائل الغياب',
      sub: pendingMsgs > 0 ? `${arNum(pendingMsgs)} رسالة غياب لم تصل البيت بعد` : 'إبلاغ أولياء الأمور',
      icon: ListChecks,
      count: pendingMsgs,
      tone: TONES.red,
    },
  ]

  const weekMax = Math.max(0, ...days.map((d) => d.absent))

  return (
    <WsPage className="ws-rich">
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
            {today && (
              <WsFact icon={UserRoundX} label="معلمون غائبون">
                <span style={{ color: today.absent_teachers > 0 ? TONES.amber.tx : undefined }}>
                  {arNum(today.absent_teachers)}
                </span>
                <span style={{ color: 'var(--ws-text-2)' }}> من {arNum(data?.total_teachers ?? 0)}</span>
              </WsFact>
            )}
            <WsFact icon={CalendarCheck} label="حصص اليوم">{arNum(data?.today_classes ?? 0)}</WsFact>
            <WsFact icon={GraduationCap} label="طلاب نشطون">{arNum(data?.total_students ?? 0)}</WsFact>
          </>
        }
      >
        {/* التحية — سطر إنساني: ساعة المتصفح، لا كذب ممكن */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ws-text-2)' }}>
          <Sun style={{ width: 16, height: 16, color: TONES.amber.tx }} />
          <b style={{ color: 'var(--ws-text)', fontWeight: 700 }}>{line.greeting}</b>
          {line.hijri} ({line.greg})
        </span>
      </WsHeader>

      <WsLayout>
        <WsMain>
          {/* ١ — حصيلة اليوم: الضربة الملوّنة الأولى */}
          <WsBlock padded>
            {isLoading ? (
              <div className="ws-dashboard-cards">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="ws-skeleton" style={{ height: 120, borderRadius: 10 }} />
                ))}
              </div>
            ) : !today ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--ws-surface-2)',
                  fontSize: 13.5,
                  color: 'var(--ws-text-2)',
                }}
              >
                لا يوم دراسي اليوم — آخر يوم دراسي: {days[0]?.day ?? '—'}
              </div>
            ) : (
              <div className="ws-dashboard-cards">
                <DayCard
                  icon={UserCheck}
                  label="حاضر"
                  value={data?.present_today ?? 0}
                  tone={TONES.green}
                  hero
                  context={`من ${arNum(recorded)} مرصوداً حتى الآن`}
                  zeroContext="لم يبدأ الرصد بعد"
                />
                <DayCard
                  icon={UserX}
                  label="غائب"
                  value={data?.absent_today ?? 0}
                  tone={TONES.red}
                  to="/admin/attendance-report"
                  context={
                    (today.excused ?? 0) > 0 ? `و${arNum(today.excused)} مستأذن بعذر موثّق` : undefined
                  }
                  zeroContext="لا غياب حتى الآن"
                  spark={<WeekSpark days={days} field="absent" tone={TONES.red} />}
                  extra={
                    pulse && (data?.absent_today ?? 0) > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12.5,
                          marginTop: 5,
                          color:
                            pulse.delta > 0 ? TONES.red.tx : pulse.delta < 0 ? TONES.green.tx : 'var(--ws-text-2)',
                        }}
                      >
                        {pulse.delta > 0 && <ArrowUp style={{ width: 12, height: 12 }} />}
                        {pulse.delta < 0 && <ArrowDown style={{ width: 12, height: 12 }} />}
                        {pulse.delta > 0
                          ? `فوق متوسط الأسبوع بـ${arNum(pulse.delta)}`
                          : pulse.delta < 0
                            ? `دون متوسط الأسبوع بـ${arNum(-pulse.delta)}`
                            : 'على متوسط الأسبوع'}
                      </span>
                    ) : undefined
                  }
                />
                <DayCard
                  icon={Clock}
                  label="متأخر"
                  value={data?.late_today ?? 0}
                  tone={TONES.amber}
                  to="/admin/late-arrivals"
                  zeroContext="لا تأخّر اليوم"
                  spark={<WeekSpark days={days} field="late" tone={TONES.amber} />}
                />
                <DayCard
                  icon={ClipboardCheck}
                  label="بانتظار الاعتماد"
                  value={data?.pending_approvals ?? 0}
                  tone={TONES.purple}
                  to="/admin/approval"
                  context="كشوف سلّمها المعلمون خلال ٧ أيام"
                  zeroContext="لا كشوف معلّقة"
                />
              </div>
            )}
          </WsBlock>

          {/* ٢ — طابور الصباح: اللمسة، ومعه قوس التغطية */}
          <WsBlock padded title="طابور الصباح" icon={Users}>
            {isLoading ? (
              <div className="ws-skeleton" style={{ height: 72, borderRadius: 6 }} />
            ) : !today ? (
              <WsEmpty icon={CalendarDays}>لا يوم دراسي اليوم</WsEmpty>
            ) : total === 0 ? (
              <WsEmpty icon={Users}>لا طلاب مسجّلون</WsEmpty>
            ) : (
              <>
                <MorningQueue
                  total={total}
                  segments={{
                    present: data?.present_today ?? 0,
                    late: data?.late_today ?? 0,
                    excused: today.excused ?? 0,
                    absent: data?.absent_today ?? 0,
                  }}
                  chronic={chronic}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <QueueLegend
                      segments={{
                        present: data?.present_today ?? 0,
                        late: data?.late_today ?? 0,
                        excused: today.excused ?? 0,
                        absent: data?.absent_today ?? 0,
                      }}
                      silent={silentNow}
                      chronic={chronic}
                      total={total}
                    />
                  </div>
                  {today.coverage_rate != null && <CoverageArc rate={today.coverage_rate} />}
                </div>
              </>
            )}
          </WsBlock>

          {/* ٣ — الأسبوع: أعداد لا نِسَب، وخلية الغياب تُغسل بثلاث درجات */}
          <WsBlock fill scroll title="الأسبوع" icon={CalendarDays}>
            {isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : days.length === 0 ? (
              <WsEmpty icon={CalendarDays}>لا أيام دراسية</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th style={{ width: 70 }}>حاضر</th>
                    <th style={{ width: 70 }}>غائب</th>
                    <th style={{ width: 70 }}>متأخر</th>
                    <th style={{ width: 110 }}>معلمون غائبون</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const wash =
                      weekMax > 0 && d.absent >= 0.66 * weekMax
                        ? TONES.red
                        : weekMax > 0 && d.absent > 0 && d.absent >= 0.33 * weekMax
                          ? TONES.amber
                          : null
                    return (
                      <tr key={d.date} style={d.date === today?.date ? { background: chip(TONES.sky) } : undefined}>
                        <td style={{ whiteSpace: 'nowrap' }}>{d.day}</td>
                        <td>{arNum(d.present)}</td>
                        <td style={wash ? { background: chip(wash), color: wash.tx, fontWeight: 700 } : undefined}>
                          {arNum(d.absent)}
                        </td>
                        <td>{arNum(d.late)}</td>
                        <td style={{ color: d.absent_teachers > 0 ? TONES.amber.tx : 'var(--ws-text-2)' }}>
                          {arNum(d.absent_teachers)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
            <div style={{ padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)', lineHeight: 1.65 }}>
                أعداد مطلقة رُصدت في يومها — لا نِسَب؛ مقام الأيام الماضية متحرك.
              </p>
            </div>
          </WsBlock>
        </WsMain>

        {/* لوحة النداء — أدوات اليوم في متناول اليد، بقرار المالك في العمود */}
        <WsSideCol side="end" title="لوحة النداء" icon={ListChecks} storageKey="ws:dashboard:sidecol" width={300}>
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {callRows.map((row) => {
                const Icon = row.icon
                const hot = (row.count ?? 0) > 0 && row.tone
                return (
                  <Link
                    key={row.to}
                    to={row.to}
                    className="ws-callrow"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 12px',
                      borderRadius: 8,
                      border: hot ? `1px solid ${row.tone!.bd}` : '1px solid var(--ws-hairline)',
                      textDecoration: 'none',
                      color: 'var(--ws-text)',
                      background: hot ? chip(row.tone!) : 'var(--ws-surface)',
                    }}
                  >
                    {/* اللون حبرٌ ورقاقة: الصف أبيض والرقاقة تحمل النغمة */}
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: hot ? 'var(--ws-surface)' : chip(TONES.gray),
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        style={{
                          width: 16,
                          height: 16,
                          color: hot ? row.tone!.tx : 'var(--ws-text-2)',
                        }}
                      />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{row.label}</span>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ws-text-2)', lineHeight: 1.4 }}>{row.sub}</span>
                    </span>
                    {row.count != null && row.count > 0 && (
                      <b
                        style={{
                          flexShrink: 0,
                          fontSize: 16,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: hot ? row.tone!.tx : 'var(--ws-text-2)',
                        }}
                      >
                        {arNum(row.count)}
                      </b>
                    )}
                  </Link>
                )
              })}
            </div>
            <OnboardingProgressCard />
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
