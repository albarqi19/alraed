import { FileText, Award, AlertOctagon } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, ProfileTable, StatGrid, StatMini } from './profile-ui'
import type { TeacherReferralsResponse, TeacherPointsResponse } from '../types'

const REFERRAL_TYPE_LABELS: Record<string, { label: string; tone: Tone }> = {
  academic_weakness: { label: 'دعم أكاديمي', tone: TONES.sky },
  behavioral_violation: { label: 'متابعة سلوكية', tone: TONES.amber },
  student_absence: { label: 'غياب طالب', tone: TONES.gray },
}

const PRIORITY_MAP: Record<string, { label: string; tone: Tone }> = {
  low: { label: 'منخفضة', tone: TONES.gray },
  medium: { label: 'متوسطة', tone: TONES.sky },
  high: { label: 'عالية', tone: TONES.amber },
  urgent: { label: 'عاجلة', tone: TONES.red },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  received: 'تم الاستلام',
  in_progress: 'قيد المعالجة',
  transferred: 'محولة',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
}

interface ReferralsReportsSectionProps {
  referrals: TeacherReferralsResponse | undefined
  points: TeacherPointsResponse | undefined
}

export function ReferralsReportsSection({ referrals, points }: ReferralsReportsSectionProps) {
  const hasReferrals = referrals && referrals.referrals.length > 0
  const hasPoints = points && points.transactions.length > 0

  if (!hasReferrals && !hasPoints) {
    return (
      <EmptyState
        icon={FileText}
        title="لا توجد بيانات"
        description="لا توجد إحالات أو نقاط في الفترة المحددة"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* النقاط */}
      {points && hasPoints && (
        <ProfilePanel title="نقاط الأداء" icon={Award}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatGrid>
              <StatMini label="مكافآت" value={points.summary.total_rewards} sub={`${points.summary.rewards_count} مكافأة`} tone={TONES.green} />
              <StatMini label="ملاحظات" value={points.summary.total_violations} sub={`${points.summary.violations_count} ملاحظة`} tone={TONES.red} />
            </StatGrid>

            <ProfileTable>
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>النقاط</th>
                  <th>الطالب</th>
                  <th>السبب</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody className="ws-tbl-rise">
                {points.transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <ToneChip tone={tx.type === 'reward' ? TONES.green : TONES.gray}>
                        {tx.type === 'reward' ? 'مكافأة' : 'ملاحظة'}
                      </ToneChip>
                    </td>
                    <td style={{ fontWeight: 700 }}>{tx.amount}</td>
                    <td>{tx.student_name ?? '-'}</td>
                    <td
                      className="ws-cell-sub"
                      style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {tx.reason ?? '-'}
                    </td>
                    <td className="ws-cell-sub">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('ar-SA-u-nu-latn') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ProfileTable>
          </div>
        </ProfilePanel>
      )}

      {/* الإحالات */}
      {referrals && hasReferrals && (
        <ProfilePanel title="الإحالات" icon={AlertOctagon}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatGrid>
              <StatMini label="إجمالي" value={referrals.summary.total} />
              <StatMini label="دعم أكاديمي" value={referrals.summary.by_type.academic_weakness ?? 0} tone={TONES.sky} />
              <StatMini label="متابعة سلوكية" value={referrals.summary.by_type.behavioral_violation ?? 0} tone={TONES.amber} />
              <StatMini label="غياب" value={referrals.summary.by_type.student_absence ?? 0} tone={TONES.gray} />
            </StatGrid>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {referrals.referrals.map((ref) => {
                const typeInfo = REFERRAL_TYPE_LABELS[ref.referral_type] ?? REFERRAL_TYPE_LABELS.academic_weakness
                const priorityInfo = PRIORITY_MAP[ref.priority] ?? PRIORITY_MAP.medium

                return (
                  <div key={ref.id} className="ws-lrow">
                    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <ToneChip tone={typeInfo.tone}>{typeInfo.label}</ToneChip>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ws-text)' }}>{ref.title}</span>
                      {ref.student_name && (
                        <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>· {ref.student_name}</span>
                      )}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <ToneChip tone={priorityInfo.tone}>{priorityInfo.label}</ToneChip>
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                        {STATUS_LABELS[ref.status] ?? ref.status}
                      </span>
                      {ref.created_at && (
                        <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                          {new Date(ref.created_at).toLocaleDateString('ar-SA-u-nu-latn')}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </ProfilePanel>
      )}
    </div>
  )
}
