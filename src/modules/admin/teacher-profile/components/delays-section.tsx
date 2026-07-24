import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, ProfileTable, StatGrid, StatMini, toneBg } from './profile-ui'
import type { TeacherDelaysResponse, TeacherDelayActionsResponse } from '../types'

const EXCUSE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'قيد المراجعة', tone: TONES.amber },
  approved: { label: 'مقبول', tone: TONES.green },
  rejected: { label: 'مرفوض', tone: TONES.red },
}

interface DelaysSectionProps {
  delays: TeacherDelaysResponse
  actions: TeacherDelayActionsResponse | undefined
}

export function DelaysSection({ delays, actions }: DelaysSectionProps) {
  if (delays.records.length === 0 && (!actions || actions.actions.length === 0)) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="التزام كامل بالمواعيد"
        description="لم يُسجَّل أي تأخر في الفترة المحددة"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ملخص التأخرات */}
      <StatGrid>
        <StatMini label="مرات التأخر" value={delays.summary.total_delays} tone={TONES.amber} />
        <StatMini
          label="إجمالي التأخر"
          value={delays.summary.total_hours}
          suffix=" س"
          sub={`${delays.summary.total_minutes} دقيقة`}
          tone={TONES.amber}
        />
        <StatMini label="أعذار مقبولة" value={delays.summary.excused_count} tone={TONES.green} />
        <StatMini label="أعذار معلقة" value={delays.summary.pending_excuses} tone={TONES.sky} />
        {actions && (
          <StatMini label="تنبيه / حسم" value={`${actions.summary.warnings} / ${actions.summary.deductions}`} />
        )}
      </StatGrid>

      {/* سجل التأخرات */}
      {delays.records.length > 0 && (
        <ProfilePanel title="سجل التأخرات" icon={Clock} padded={false}>
          <ProfileTable>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>دقائق التأخر</th>
                <th>وقت الحضور</th>
                <th>العذر</th>
                <th>الاستفسار</th>
              </tr>
            </thead>
            <tbody className="ws-tbl-rise">
              {delays.records.map((record) => (
                <tr key={record.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(record.attendance_date).toLocaleDateString('ar-SA-u-nu-latn', { month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: TONES.amber.tx }}>{record.delay_minutes} د</span>
                  </td>
                  <td>
                    {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td>
                    {record.excuse ? (
                      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
                        <ToneChip tone={EXCUSE_STATUS[record.excuse.status]?.tone ?? TONES.gray}>
                          {EXCUSE_STATUS[record.excuse.status]?.label ?? record.excuse.status}
                        </ToneChip>
                        {record.excuse.excuse_text && (
                          <span
                            className="ws-cell-sub"
                            style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={record.excuse.excuse_text}
                          >
                            {record.excuse.excuse_text}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="ws-cell-sub">-</span>
                    )}
                  </td>
                  <td>
                    {record.inquiry ? (
                      <ToneChip tone={TONES.sky}>
                        {record.inquiry.status === 'responded' ? 'تم الرد' : 'في الانتظار'}
                      </ToneChip>
                    ) : (
                      <span className="ws-cell-sub">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ProfileTable>
        </ProfilePanel>
      )}

      {/* التنبيهات والحسميات */}
      {actions && actions.actions.length > 0 && (
        <ProfilePanel title="الإجراءات الإدارية" icon={AlertTriangle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.actions.map((action) => {
              const tone = action.action_type === 'warning' ? TONES.amber : TONES.red
              return (
                <div
                  key={action.id}
                  className="ws-lrow"
                  style={{ borderColor: tone.bd, background: toneBg(tone) }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <ToneChip tone={tone}>
                      {action.action_type === 'warning' ? 'تنبيه' : 'حسم'} #{action.sequence_number}
                    </ToneChip>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ws-text)' }}>{action.formatted_delay}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ws-text-2)' }}>
                    {action.is_printed && <ToneChip tone={TONES.gray}>مطبوع</ToneChip>}
                    {action.is_signed && <ToneChip tone={TONES.green}>موقّع</ToneChip>}
                    {action.created_at && <span>{new Date(action.created_at).toLocaleDateString('ar-SA-u-nu-latn')}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </ProfilePanel>
      )}
    </div>
  )
}
