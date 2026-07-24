import { CheckCircle, AlertCircle, Clock, LogOut, Flag } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, ProfileTable, StatGrid, StatMini } from './profile-ui'
import type { TeacherPeriodActionsResponse } from '../types'

const ACTION_TYPE_MAP: Record<string, { label: string; tone: Tone; icon: React.ElementType }> = {
  absent: { label: 'غياب', tone: TONES.red, icon: AlertCircle },
  late: { label: 'تأخر', tone: TONES.amber, icon: Clock },
  early_leave: { label: 'انصراف مبكر', tone: TONES.sky, icon: LogOut },
  duty_absent: { label: 'غياب مناوبة', tone: TONES.purple, icon: Flag },
}

const PERIOD_TYPE_MAP: Record<string, { label: string; tone: Tone }> = {
  assembly: { label: 'الطابور', tone: TONES.purple },
  class: { label: 'حصة', tone: TONES.sky },
  break: { label: 'الفسحة', tone: TONES.green },
  dismissal: { label: 'الانصراف', tone: TONES.gray },
}

interface PeriodActionsSectionProps {
  data: TeacherPeriodActionsResponse
}

export function PeriodActionsSection({ data }: PeriodActionsSectionProps) {
  const { actions, summary } = data

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="التزام كامل بحضور الحصص والطابور"
        description="لم يُسجَّل أي ملاحظة على حضور الحصص أو الطابور في الفترة المحددة"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* بطاقات الإحصائيات */}
      <StatGrid>
        <StatMini label="غياب عن الحصص" value={summary.class_absences} sub={`${summary.class_absences_days} يوم`} tone={TONES.red} />
        <StatMini label="تأخر عن الحصص" value={summary.class_late_count} sub={`${summary.class_late_total_minutes} دقيقة`} tone={TONES.amber} />
        <StatMini label="انصراف مبكر" value={summary.class_early_leaves} tone={TONES.sky} />
        <StatMini label="غياب عن الطابور" value={summary.assembly_absences} tone={TONES.purple} />
        <StatMini label="إجمالي الملاحظات" value={summary.total_actions} />
      </StatGrid>

      {/* جدول التفاصيل */}
      <ProfilePanel title="سجل الملاحظات" icon={AlertCircle} padded={false}>
        <ProfileTable>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الفترة</th>
              <th>نوع الإجراء</th>
              <th>المدة</th>
              <th>الفصل</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody className="ws-tbl-rise">
            {actions.map((action) => {
              const actionInfo = ACTION_TYPE_MAP[action.action_type] ?? ACTION_TYPE_MAP.absent
              const periodInfo = PERIOD_TYPE_MAP[action.period_type] ?? PERIOD_TYPE_MAP.class

              return (
                <tr key={action.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(action.action_date).toLocaleDateString('ar-SA-u-nu-latn')}
                  </td>
                  <td>
                    <ToneChip tone={periodInfo.tone}>{action.period_type_label}</ToneChip>
                  </td>
                  <td>
                    <ToneChip tone={actionInfo.tone}>{action.action_type_label}</ToneChip>
                  </td>
                  <td className="ws-cell-sub">
                    {action.formatted_minutes ?? '-'}
                  </td>
                  <td className="ws-cell-sub">
                    {action.class_display ?? '-'}
                  </td>
                  <td
                    className="ws-cell-sub"
                    style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {action.notes ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </ProfileTable>
      </ProfilePanel>
    </div>
  )
}
