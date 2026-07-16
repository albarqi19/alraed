/**
 * لوحة تفاصيل تأخير معلم (Sheet)
 */

import { AlertTriangle, ArrowLeftRight, Calendar, Check, Eye, FileWarning, Printer } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useTeacherDelayDetailsQuery } from '../hooks'
import type { DelayActionType, DelayActionRecord } from '../types'
import {
  WsAlert,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFactRow,
  WsFactsList,
} from '@/shared/workspace'

interface TeacherDelayDetailsSheetProps {
  userId: number | null
  fiscalYear?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordAction: (action: { type: DelayActionType; userId: number; teacherName: string }) => void
  onPrint: (actionId: number) => void
  /** وضع العرض فقط - يخفي أزرار تسجيل الإجراءات */
  readOnly?: boolean
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA')
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  }
}

function ActionHistoryItem({ action, onPrint }: { action: DelayActionRecord; onPrint: (id: number) => void }) {
  const isWarning = action.action_type === 'warning'
  const isDeduction = action.action_type === 'deduction'
  const hasCarriedOver = isDeduction && action.carried_over_minutes > 0

  return (
    <div
      style={{
        padding: '7px 10px',
        borderBottom: '1px solid var(--ws-hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, minWidth: 0 }}>
          {isWarning ? (
            <AlertTriangle style={{ width: 12, height: 12, color: 'var(--ws-amber)' }} />
          ) : (
            <FileWarning style={{ width: 12, height: 12, color: 'var(--ws-red)' }} />
          )}
          {action.action_type_label} #{action.sequence_number}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {action.is_signed && (
            <WsChip tone="green" icon={Check}>
              موقع
            </WsChip>
          )}
          <WsBtn size="sm" icon={Printer} onClick={() => onPrint(action.id)}>
            طباعة
          </WsBtn>
        </span>
      </div>
      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
        {formatDate(action.created_at)}
      </span>
      {hasCarriedOver && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <WsChip tone="sky" icon={ArrowLeftRight}>
            مرحّل للدورة القادمة: {action.formatted_carried_over}
          </WsChip>
        </span>
      )}
    </div>
  )
}

export function TeacherDelayDetailsSheet({
  userId,
  fiscalYear,
  open,
  onOpenChange,
  onRecordAction,
  onPrint,
  readOnly = false,
}: TeacherDelayDetailsSheetProps) {
  const { data, isLoading, isError } = useTeacherDelayDetailsQuery(userId, fiscalYear)

  const canRecordWarning =
    data &&
    data.delay_summary.total_minutes >= data.thresholds.warning &&
    data.delay_summary.total_minutes < data.thresholds.deduction

  const canRecordDeduction = data && data.delay_summary.total_minutes >= data.thresholds.deduction

  const progressColor = data
    ? data.delay_summary.total_minutes >= data.thresholds.deduction
      ? 'var(--ws-red)'
      : data.delay_summary.total_minutes >= data.thresholds.warning
        ? 'var(--ws-amber)'
        : 'var(--ws-green)'
    : 'var(--ws-green)'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="text-right" style={{ padding: '12px 16px', borderBottom: '1px solid var(--ws-hairline)', background: 'var(--ws-surface-2)' }}>
          <SheetTitle style={{ fontSize: 14 }}>تفاصيل التأخير</SheetTitle>
          <SheetDescription style={{ fontSize: 12 }}>معلومات تفصيلية عن تأخير المعلم</SheetDescription>
        </SheetHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
          {isLoading ? (
            <WsEmpty loading>جاري تحميل البيانات...</WsEmpty>
          ) : isError || !data ? (
            <WsEmpty icon={AlertTriangle}>تعذر تحميل بيانات المعلم.</WsEmpty>
          ) : (
            <>
              {/* معلومات المعلم */}
              <WsFactsList
                style={{
                  border: '1px solid var(--ws-hairline)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'var(--ws-surface-2)',
                }}
              >
                <WsFactRow label="المعلم">{data.teacher.name}</WsFactRow>
                {data.teacher.phone && <WsFactRow label="الجوال">{data.teacher.phone}</WsFactRow>}
                {data.teacher.national_id && <WsFactRow label="الهوية">{data.teacher.national_id}</WsFactRow>}
              </WsFactsList>

              {/* ملخص التأخير */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="ws-label">ملخص التأخير</span>

                {/* شريط التقدم مع العتبات */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    <span>0</span>
                    <span style={{ color: 'var(--ws-amber)' }}>{data.thresholds.warning} د (تنبيه)</span>
                    <span style={{ color: 'var(--ws-red)' }}>{data.thresholds.deduction} د (حسم)</span>
                  </div>
                  <span className="ws-progressbar" style={{ display: 'block', marginTop: 3, height: 8 }}>
                    <span
                      style={{
                        width: `${Math.min(100, (data.delay_summary.total_minutes / data.thresholds.deduction) * 100)}%`,
                        background: progressColor,
                      }}
                    />
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  <WsChip tone="sky">إجمالي التأخير: {data.delay_summary.formatted_delay}</WsChip>
                  <WsChip>{data.delay_summary.records_count.toLocaleString('ar-SA')} يوم تأخير</WsChip>
                </div>

                {/* تفاصيل التأخير الجديد والمرحّل */}
                {(data.delay_summary.carried_over_minutes > 0 || data.delay_summary.new_delay_minutes > 0) && (
                  <WsFactsList
                    style={{
                      border: '1px solid var(--ws-sky-bd)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      background: 'var(--ws-sky-bg)',
                    }}
                  >
                    <WsFactRow label="تأخير جديد">
                      {data.delay_summary.formatted_new_delay || data.delay_summary.formatted_delay}
                    </WsFactRow>
                    <WsFactRow label="مرحّل من حسم سابق">
                      {data.delay_summary.formatted_carried_over || '0 دقيقة'}
                    </WsFactRow>
                  </WsFactsList>
                )}

                <span className="ws-fact">
                  <Calendar />
                  <span>
                    من {formatDate(data.delay_summary.calculation_start_date)} إلى{' '}
                    {formatDate(data.delay_summary.calculation_end_date)}
                  </span>
                </span>
              </div>

              {/* سجل أيام التأخير */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="ws-label">سجل أيام التأخير</span>
                {data.delay_records.length === 0 ? (
                  <WsAlert tone="info" boxed>
                    لا توجد سجلات تأخير.
                  </WsAlert>
                ) : (
                  <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid var(--ws-hairline)', borderRadius: 8 }}>
                    <table className="ws-table">
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>وقت الحضور</th>
                          <th>التأخير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.delay_records.map((record, index) => (
                          <tr key={index}>
                            <td>{formatDate(record.date)}</td>
                            <td>{record.check_in_time ? formatTime(record.check_in_time) : '—'}</td>
                            <td style={{ color: 'var(--ws-red)', fontWeight: 700 }}>{record.delay_minutes} دقيقة</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* الإجراءات السابقة */}
              {data.actions_history.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="ws-label">الإجراءات السابقة</span>
                  <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 8, overflow: 'hidden' }}>
                    {data.actions_history.map((action) => (
                      <ActionHistoryItem key={action.id} action={action} onPrint={onPrint} />
                    ))}
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              {readOnly ? (
                <WsAlert tone="warn" icon={Eye} boxed>
                  وضع العرض فقط — لا يمكن تسجيل إجراءات للسنة السابقة.
                </WsAlert>
              ) : (
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--ws-hairline)', paddingTop: 10 }}>
                  {canRecordWarning && (
                    <WsBtn
                      variant="primary"
                      icon={AlertTriangle}
                      onClick={() =>
                        onRecordAction({
                          type: 'warning',
                          userId: data.teacher.id,
                          teacherName: data.teacher.name,
                        })
                      }
                      style={{ flex: 1 }}
                    >
                      تسجيل تنبيه
                    </WsBtn>
                  )}
                  {canRecordDeduction && (
                    <WsBtn
                      variant="danger"
                      icon={FileWarning}
                      onClick={() =>
                        onRecordAction({
                          type: 'deduction',
                          userId: data.teacher.id,
                          teacherName: data.teacher.name,
                        })
                      }
                      style={{ flex: 1 }}
                    >
                      تسجيل حسم
                    </WsBtn>
                  )}
                  {!canRecordWarning && !canRecordDeduction && (
                    <span style={{ fontSize: 12, color: 'var(--ws-text-2)', margin: '0 auto' }}>
                      لا يوجد إجراء مستحق حالياً
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
