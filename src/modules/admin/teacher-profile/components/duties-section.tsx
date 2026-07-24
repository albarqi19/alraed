import { Shield, UserCheck } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, ProfileTable, StatGrid, StatMini } from './profile-ui'
import type { TeacherDutiesResponse, TeacherCoverageResponse } from '../types'

const DUTY_TYPE_MAP: Record<string, { label: string; tone: Tone }> = {
  duty_schedule: { label: 'مناوبة فصلية', tone: TONES.sky },
  duty_shift: { label: 'مناوبة يومية', tone: TONES.purple },
  standby: { label: 'انتظار', tone: TONES.amber },
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: 'مجدول', tone: TONES.sky },
  notified: { label: 'تم الإبلاغ', tone: TONES.sky },
  completed: { label: 'مكتمل', tone: TONES.green },
  absent: { label: 'غائب', tone: TONES.red },
  assigned: { label: 'معيّن', tone: TONES.purple },
  pending: { label: 'معلق', tone: TONES.amber },
  cancelled: { label: 'ملغي', tone: TONES.gray },
}

interface DutiesSectionProps {
  duties: TeacherDutiesResponse
  coverage: TeacherCoverageResponse | undefined
}

export function DutiesSection({ duties, coverage }: DutiesSectionProps) {
  if (duties.duties.length === 0 && (!coverage || coverage.requests.length === 0)) {
    return (
      <EmptyState
        icon={Shield}
        title="لا توجد مناوبات"
        description="لم يتم تعيين أي مناوبة أو إشراف في الفترة المحددة"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ملخص */}
      <StatGrid>
        <StatMini label="مناوبة فصلية" value={duties.summary.duty_schedule_count} tone={TONES.sky} />
        <StatMini label="مناوبة يومية" value={duties.summary.duty_shift_count} tone={TONES.purple} />
        <StatMini label="انتظار" value={duties.summary.standby_count} tone={TONES.amber} />
        {coverage && <StatMini label="طلبات تغطية" value={coverage.summary.total} tone={TONES.green} />}
      </StatGrid>

      {/* قائمة المناوبات */}
      {duties.duties.length > 0 && (
        <ProfilePanel title="سجل المناوبات والإشراف" icon={Shield}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {duties.duties.map((duty) => {
              const typeInfo = DUTY_TYPE_MAP[duty.type] ?? DUTY_TYPE_MAP.duty_schedule
              const statusInfo = STATUS_MAP[duty.status] ?? STATUS_MAP.pending
              const date = duty.duty_date ?? duty.schedule_date

              return (
                <div key={`${duty.type}-${duty.id}`} className="ws-lrow">
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <ToneChip tone={typeInfo.tone}>{typeInfo.label}</ToneChip>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ws-text)' }}>
                      {date ? new Date(date).toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                    </span>
                    {duty.period_number && (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>الحصة {duty.period_number}</span>
                    )}
                    {duty.duty_type && (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                        {duty.duty_type === 'morning' ? 'صباحي' : 'مسائي'}
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {duty.replacing_teacher && (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>بدلاً عن: {duty.replacing_teacher}</span>
                    )}
                    <ToneChip tone={statusInfo.tone}>{statusInfo.label}</ToneChip>
                  </span>
                </div>
              )
            })}
          </div>
        </ProfilePanel>
      )}

      {/* طلبات التغطية */}
      {coverage && coverage.requests.length > 0 && (
        <ProfilePanel title="طلبات التغطية" icon={UserCheck} padded={false}>
          <ProfileTable>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحصص</th>
                <th>السبب</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody className="ws-tbl-rise">
              {coverage.requests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(req.request_date).toLocaleDateString('ar-SA-u-nu-latn')}
                  </td>
                  <td>
                    {req.from_period} - {req.to_period}
                  </td>
                  <td
                    className="ws-cell-sub"
                    style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {req.reason ?? '-'}
                  </td>
                  <td>
                    <ToneChip tone={STATUS_MAP[req.status]?.tone ?? TONES.gray}>
                      {STATUS_MAP[req.status]?.label ?? req.status}
                    </ToneChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </ProfileTable>
        </ProfilePanel>
      )}
    </div>
  )
}
