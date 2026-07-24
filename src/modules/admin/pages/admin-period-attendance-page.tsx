import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Grid3X3,
  Info,
  ListChecks,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react'
import {
  usePeriodAttendanceGridQuery,
  usePeriodAttendanceDetailsQuery,
  usePeriodAbsenceAlertsQuery,
  usePeriodAttendanceGradesQuery,
  useUpdatePeriodStatusMutation,
  useUpdatePeriodAlertStatusMutation,
} from '../hooks/period-attendance-hooks'
import type { PeriodCell, ClassPeriodRow } from '../types'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsSpinner,
} from '@/shared/workspace'

function formatToday(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

// شارة حالة الطالب (يومي/حصة)
function StatusChip({ status, lateMinutes }: { status: string | null; lateMinutes?: number | null }) {
  if (!status) return <span style={{ color: 'var(--ws-text-2)', fontSize: 11 }}>—</span>

  if (status === 'present') {
    return (
      <WsChip tone="green" icon={CheckCircle2}>
        حاضر
      </WsChip>
    )
  }
  if (status === 'absent') {
    return (
      <WsChip tone="red" icon={XCircle}>
        غائب
      </WsChip>
    )
  }
  if (status === 'late') {
    return (
      <WsChip tone="amber" icon={Clock3}>
        {lateMinutes ? `متأخر (${lateMinutes} د)` : 'متأخر'}
      </WsChip>
    )
  }
  return <span style={{ fontSize: 11 }}>{status}</span>
}

export function AdminPeriodAttendancePage() {
  const [date, setDate] = useState(formatToday())
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedCell, setSelectedCell] = useState<{
    grade: string
    className: string
    periodNumber: number
  } | null>(null)

  const gradesQuery = usePeriodAttendanceGradesQuery()
  const gridQuery = usePeriodAttendanceGridQuery(date, selectedGrade === 'all' ? undefined : selectedGrade)
  const alertsQuery = usePeriodAbsenceAlertsQuery(date)

  const detailsQuery = usePeriodAttendanceDetailsQuery(
    date,
    selectedCell?.grade ?? '',
    selectedCell?.className ?? '',
    selectedCell?.periodNumber ?? 0,
    { enabled: !!selectedCell },
  )

  const updateStatusMutation = useUpdatePeriodStatusMutation()
  const updateAlertMutation = useUpdatePeriodAlertStatusMutation()

  const grid = gridQuery.data
  const alerts = alertsQuery.data
  const newAlerts = alerts?.alerts.filter((a) => a.alert_status === 'new') ?? []

  function handleCellClick(row: ClassPeriodRow, periodNumber: number, cell: PeriodCell) {
    if (cell.status === 'no_session' || cell.status === 'not_submitted') return
    setSelectedCell({
      grade: row.grade,
      className: row.class_name,
      periodNumber,
    })
  }

  function handleStatusChange(attendanceId: number, newStatus: 'present' | 'absent' | 'late') {
    updateStatusMutation.mutate({ attendanceId, status: newStatus })
  }

  function getCellStyle(cell: PeriodCell): CSSProperties {
    if (cell.status === 'no_session') return { background: 'var(--ws-surface-2)', color: 'var(--ws-text-2)' }
    if (cell.status === 'not_submitted') return { background: 'var(--ws-surface-2)', color: 'var(--ws-text-2)' }
    if (cell.alerts_count > 0) return { background: 'var(--ws-amber-bg)', cursor: 'pointer' }
    if (cell.attendance_type === 'daily') return { background: 'var(--ws-green-bg)', cursor: 'pointer' }
    return { background: 'var(--ws-sky-bg)', cursor: 'pointer' }
  }

  function renderCellContent(cell: PeriodCell) {
    if (cell.status === 'no_session') return <span style={{ fontSize: 11 }}>—</span>
    if (cell.status === 'not_submitted') return <span style={{ fontSize: 10.5 }}>لم يُحضّر</span>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <WsChip tone={cell.attendance_type === 'daily' ? 'green' : 'sky'}>
          {cell.attendance_type === 'daily' ? 'يومي' : 'حصة'}
        </WsChip>
        <span style={{ fontSize: 10.5, fontWeight: 700 }}>
          <span style={{ color: 'var(--ws-green)' }}>{cell.present}</span>
          {cell.absent > 0 && <span style={{ color: 'var(--ws-red)' }}> / {cell.absent}</span>}
          {cell.late > 0 && <span style={{ color: 'var(--ws-amber)' }}> / {cell.late}</span>}
        </span>
        {cell.alerts_count > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--ws-amber)',
            }}
          >
            <AlertTriangle style={{ width: 10, height: 10 }} />
            {cell.alerts_count}
          </span>
        )}
        {cell.subject_name && (
          <span
            style={{
              fontSize: 9.5,
              color: 'var(--ws-text-2)',
              maxWidth: 80,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cell.subject_name}
          </span>
        )}
      </div>
    )
  }

  return (
    <WsPage>
      <WsHeader
        title="تحضير الحصص"
        badge="متابعة الحصص"
        actions={
          <WsBtn
            icon={RefreshCw}
            onClick={() => {
              gridQuery.refetch()
              alertsQuery.refetch()
            }}
            disabled={gridQuery.isFetching}
          >
            تحديث
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Grid3X3} label="الفصول:">
              {(grid?.classes.length ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={BellRing} label="تنبيهات جديدة:">
              {(alerts?.counts.new ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            {grid?.day_name && (
              <WsFact icon={CalendarDays} label="اليوم:">
                {grid.day_name}
              </WsFact>
            )}
          </>
        }
      >
        {/* مفتاح الألوان */}
        <WsChip tone="green">يومي</WsChip>
        <WsChip tone="sky">حصة</WsChip>
        <WsChip>لم يُحضّر</WsChip>
        <WsChip tone="amber" icon={AlertTriangle}>
          تنبيه
        </WsChip>
      </WsHeader>

      <div className="ws-toolbar">
        <WsField label="التاريخ" htmlFor="ws-period-date">
          <WsInput id="ws-period-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </WsField>
        <WsField label="الصف" htmlFor="ws-period-grade">
          <WsSelect id="ws-period-grade" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
            <option value="all">جميع الصفوف</option>
            {gradesQuery.data?.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </WsSelect>
        </WsField>
      </div>

      <WsLayout>
        {/* العمود الأيمن: التنبيهات العاجلة */}
        <WsSideCol
          title="تنبيهات عاجلة"
          icon={BellRing}
          side="start"
          width={290}
          storageKey="ws:period-attendance:alerts"
        >
          <WsBlock padded style={{ background: 'var(--ws-amber-bg)' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-amber)', fontWeight: 600 }}>
              طلاب حاضرون في التحضير اليومي لكنهم غائبون في حصة — تحقق من وضعهم.
            </p>
          </WsBlock>
          <WsBlock title="بانتظار الاطلاع" count={newAlerts.length.toLocaleString('ar-SA-u-nu-latn')} fill scroll>
            {alertsQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل التنبيهات...</WsEmpty>
            ) : newAlerts.length === 0 ? (
              <WsEmpty icon={CheckCircle2}>لا توجد تنبيهات جديدة لهذا اليوم.</WsEmpty>
            ) : (
              <div>
                {newAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '7px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>{alert.student_name}</span>
                      <WsBtn
                        size="sm"
                        onClick={() => updateAlertMutation.mutate({ alertId: alert.id, alertStatus: 'seen' })}
                        disabled={updateAlertMutation.isPending}
                      >
                        تم الاطلاع
                      </WsBtn>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                      {alert.grade} {alert.class_name} — الحصة {alert.period_number}
                      {alert.subject_name && ` (${alert.subject_name})`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: شبكة الفصول × الحصص */}
        <WsMain>
          <WsBlock title="شبكة التحضير" icon={Grid3X3} count={(grid?.classes.length ?? 0).toLocaleString('ar-SA-u-nu-latn')} fill>
            {gridQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الشبكة...</WsEmpty>
            ) : !grid || grid.classes.length === 0 ? (
              <WsEmpty icon={Clock3}>
                لا توجد حصص لهذا اليوم.
                <span style={{ fontSize: 11 }}>تأكد من وجود جدول دراسي وأن اليوم يوم عمل.</span>
              </WsEmpty>
            ) : (
              <div className="ws-tablewrap">
                <table className="ws-matrix">
                  <thead>
                    <tr>
                      <th className="ws-matrix__stick" style={{ minWidth: 140 }}>
                        الفصل
                      </th>
                      {grid.period_headers.map((h) => (
                        <th key={h.period_number} style={{ minWidth: 90 }}>
                          <span style={{ display: 'block', fontWeight: 700 }}>{h.name}</span>
                          {h.start_time && (
                            <span style={{ display: 'block', fontSize: 9.5, fontWeight: 400, direction: 'ltr' }}>
                              {h.start_time} - {h.end_time}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.classes.map((row, idx) => (
                      <tr key={idx}>
                        <td className="ws-matrix__stick" style={{ minWidth: 140 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12 }}>
                            <Users style={{ width: 12, height: 12, color: 'var(--ws-text-2)' }} />
                            {row.grade} {row.class_name}
                          </span>
                        </td>
                        {grid.period_headers.map((h) => {
                          const cell = row.periods[h.period_number]
                          if (!cell) {
                            return (
                              <td key={h.period_number} style={{ background: 'var(--ws-surface-2)', color: 'var(--ws-text-2)' }}>
                                —
                              </td>
                            )
                          }
                          const isSelectedCell =
                            selectedCell &&
                            selectedCell.grade === row.grade &&
                            selectedCell.className === row.class_name &&
                            selectedCell.periodNumber === h.period_number
                          return (
                            <td
                              key={h.period_number}
                              style={{
                                ...getCellStyle(cell),
                                padding: '4px 6px',
                                ...(isSelectedCell ? { boxShadow: 'inset 0 0 0 2px var(--ws-accent-2)' } : null),
                              }}
                              onClick={() => handleCellClick(row, h.period_number, cell)}
                            >
                              {renderCellContent(cell)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* اليسار: تفاصيل الحصة المحددة — بدل المودال */}
        <WsSideCol title="تفاصيل الحصة" icon={ListChecks} storageKey="ws:period-attendance:details" width={360}>
          {!selectedCell ? (
            <WsEmpty icon={Info}>اضغط على خلية محضَّرة من الشبكة لعرض تفاصيلها هنا.</WsEmpty>
          ) : detailsQuery.isLoading ? (
            <WsEmpty loading>جاري تحميل التفاصيل...</WsEmpty>
          ) : detailsQuery.data ? (
            <>
              <WsBlock padded>
                <WsFactsList>
                  <WsFactRow label="الفصل">
                    {detailsQuery.data.session_info?.grade} {detailsQuery.data.session_info?.class_name}
                  </WsFactRow>
                  <WsFactRow label="الحصة">{detailsQuery.data.session_info?.period_number}</WsFactRow>
                  {detailsQuery.data.session_info?.subject_name && (
                    <WsFactRow label="المادة">{detailsQuery.data.session_info.subject_name}</WsFactRow>
                  )}
                </WsFactsList>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  <WsChip icon={Users}>إجمالي {detailsQuery.data.summary.total}</WsChip>
                  <WsChip tone="green" icon={CheckCircle2}>
                    حاضر {detailsQuery.data.summary.present}
                  </WsChip>
                  <WsChip tone="red" icon={XCircle}>
                    غائب {detailsQuery.data.summary.absent}
                  </WsChip>
                  <WsChip tone="amber" icon={Clock3}>
                    متأخر {detailsQuery.data.summary.late}
                  </WsChip>
                </div>
              </WsBlock>

              <WsBlock
                title="طلاب الحصة"
                count={detailsQuery.data.students.length.toLocaleString('ar-SA-u-nu-latn')}
                fill
                scroll
              >
                <div>
                  {detailsQuery.data.students.map((student) => (
                    <div
                      key={student.id}
                      style={{
                        padding: '7px 12px',
                        borderBottom: '1px solid var(--ws-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}>{student.student_name}</span>
                        {student.has_alert && (
                          <WsChip tone="amber" icon={AlertTriangle}>
                            تنبيه
                          </WsChip>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 5,
                          marginTop: 4,
                        }}
                      >
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>اليومي:</span>
                        <StatusChip status={student.daily_status} />
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>الحصة:</span>
                        <StatusChip status={student.period_status} lateMinutes={student.late_minutes} />
                        {student.period_status === 'absent' && student.attendance_type === 'period' && (
                          <WsBtn
                            size="sm"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? <WsSpinner style={{ width: 11, height: 11 }} /> : 'تغيير لحاضر'}
                          </WsBtn>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </WsBlock>
            </>
          ) : null}
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
