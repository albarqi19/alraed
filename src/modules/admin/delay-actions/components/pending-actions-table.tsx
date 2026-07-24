/**
 * جدول المعلمين الذين ينتظرون إجراء (تنبيه أو حسم)
 */

import { Printer, Eye, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import type { TeacherDelayData, DelayActionType } from '../types'
import { WsBtn, WsChip, WsEmpty, WsTable } from '@/shared/workspace'

interface PendingActionsTableProps {
  data: TeacherDelayData[]
  isLoading: boolean
  onTeacherClick: (userId: number) => void
  onRecordAction: (action: { type: DelayActionType; userId: number; teacherName: string }) => void
  /** وضع العرض فقط - يخفي أزرار تسجيل الإجراءات */
  readOnly?: boolean
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA-u-nu-latn')
  }
}

function ActionChip({ type, label }: { type: DelayActionType | null; label: string | null }) {
  if (!type || !label) return <span style={{ color: 'var(--ws-text-2)' }}>—</span>
  return <WsChip tone={type === 'warning' ? 'amber' : 'red'}>{label}</WsChip>
}

function LastActionInfo({
  lastWarning,
  lastDeduction,
}: {
  lastWarning: TeacherDelayData['last_warning']
  lastDeduction: TeacherDelayData['last_deduction']
}) {
  const last = lastDeduction ?? lastWarning

  if (!last) return <span style={{ color: 'var(--ws-text-2)' }}>—</span>

  const type = lastDeduction ? 'حسم' : 'تنبيه'
  const date = formatDate(last.created_at)
  const signed = last.is_signed

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
      <b>{type}</b>
      <span style={{ color: 'var(--ws-text-2)' }}>{date}</span>
      {signed && <CheckCircle2 style={{ width: 12, height: 12, color: 'var(--ws-green)' }} />}
    </span>
  )
}

export function PendingActionsTable({
  data,
  isLoading,
  onTeacherClick,
  onRecordAction,
  readOnly = false,
}: PendingActionsTableProps) {
  if (isLoading) {
    return <WsEmpty loading>جاري تحميل البيانات...</WsEmpty>
  }

  if (data.length === 0) {
    return <WsEmpty icon={CheckCircle2}>لا يوجد معلمون ينتظرون إجراء حالياً.</WsEmpty>
  }

  return (
    <WsTable>
      <thead>
        <tr>
          <th>المعلم</th>
          <th>التأخير الجديد</th>
          <th>المرحّل</th>
          <th>الإجمالي</th>
          <th>عدد الأيام</th>
          <th>الإجراء المستحق</th>
          <th>آخر إجراء</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {data.map((teacher) => (
          <tr key={teacher.user_id} className="is-clickable" onClick={() => onTeacherClick(teacher.user_id)}>
            <td>
              <span style={{ fontWeight: 600 }}>{teacher.teacher_name}</span>
              {teacher.national_id && <span className="ws-cell-sub">{teacher.national_id}</span>}
            </td>
            <td>{teacher.formatted_new_delay || teacher.formatted_delay}</td>
            <td>
              {teacher.carried_over_minutes > 0 ? (
                <WsChip tone="sky" icon={ArrowLeftRight}>
                  {teacher.formatted_carried_over}
                </WsChip>
              ) : (
                <span style={{ color: 'var(--ws-text-2)' }}>—</span>
              )}
            </td>
            <td style={{ fontWeight: 700 }}>{teacher.formatted_delay}</td>
            <td>{teacher.records_count.toLocaleString('ar-SA-u-nu-latn')} يوم</td>
            <td>
              <ActionChip type={teacher.pending_action} label={teacher.pending_action_label} />
            </td>
            <td>
              <LastActionInfo lastWarning={teacher.last_warning} lastDeduction={teacher.last_deduction} />
            </td>
            <td onClick={(event) => event.stopPropagation()}>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <WsBtn size="sm" icon={Eye} onClick={() => onTeacherClick(teacher.user_id)}>
                  تفاصيل
                </WsBtn>
                {!readOnly && teacher.pending_action && (
                  <WsBtn
                    size="sm"
                    variant={teacher.pending_action === 'warning' ? undefined : 'danger'}
                    icon={Printer}
                    onClick={() =>
                      onRecordAction({
                        type: teacher.pending_action!,
                        userId: teacher.user_id,
                        teacherName: teacher.teacher_name,
                      })
                    }
                    style={
                      teacher.pending_action === 'warning'
                        ? { color: 'var(--ws-amber)', borderColor: 'var(--ws-amber-bd)', background: 'var(--ws-amber-bg)' }
                        : undefined
                    }
                  >
                    {teacher.pending_action === 'warning' ? 'تسجيل تنبيه' : 'تسجيل حسم'}
                  </WsBtn>
                )}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </WsTable>
  )
}
