/**
 * لوحة تفاصيل تأخير معلم (Sheet)
 */

import { Phone, User, Calendar, AlertTriangle, FileWarning, Check, Printer, ArrowLeftRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useTeacherDelayDetailsQuery } from '../hooks'
import type { DelayActionType, DelayActionRecord } from '../types'

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
      className={`rounded-xl border p-3 ${
        isWarning ? 'border-amber-200 bg-amber-50/50' : 'border-rose-200 bg-rose-50/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isWarning ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <FileWarning className="h-4 w-4 text-rose-600" />
          )}
          <div>
            <p className="text-sm font-medium">{action.action_type_label} #{action.sequence_number}</p>
            <p className="text-xs text-slate-500">{formatDate(action.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action.is_signed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <Check className="h-3 w-3" />
              موقع
            </span>
          )}
          <button
            type="button"
            onClick={() => onPrint(action.id)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <Printer className="h-3 w-3" />
            طباعة
          </button>
        </div>
      </div>
      {/* عرض المرحّل للحسومات */}
      {hasCarriedOver && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1 text-[11px]">
          <ArrowLeftRight className="h-3 w-3 text-violet-600" />
          <span className="text-slate-600">مرحّل للدورة القادمة:</span>
          <span className="font-semibold text-violet-700">{action.formatted_carried_over}</span>
        </div>
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-right">
          <SheetTitle>تفاصيل التأخير</SheetTitle>
          <SheetDescription>معلومات تفصيلية عن تأخير المعلم</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              جاري تحميل البيانات...
            </div>
          ) : isError || !data ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-sm text-rose-600">
              <i className="bi bi-exclamation-triangle text-3xl" />
              تعذر تحميل بيانات المعلم
            </div>
          ) : (
            <>
              {/* معلومات المعلم */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <User className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="text-lg font-bold text-slate-900">{data.teacher.name}</h3>
                    {data.teacher.phone && (
                      <p className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="h-3.5 w-3.5" />
                        {data.teacher.phone}
                      </p>
                    )}
                    {data.teacher.national_id && (
                      <p className="text-xs text-slate-400">هوية: {data.teacher.national_id}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* ملخص التأخير */}
              <section className="rounded-2xl border border-slate-200 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">ملخص التأخير</h4>

                {/* شريط التقدم */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span className="text-amber-600">{data.thresholds.warning} د (تنبيه)</span>
                    <span className="text-rose-600">{data.thresholds.deduction} د (حسم)</span>
                  </div>
                  <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all ${
                        data.delay_summary.total_minutes >= data.thresholds.deduction
                          ? 'bg-rose-500'
                          : data.delay_summary.total_minutes >= data.thresholds.warning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (data.delay_summary.total_minutes / data.thresholds.deduction) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <p className="text-2xl font-bold text-indigo-700">{data.delay_summary.formatted_delay}</p>
                    <p className="text-xs text-indigo-600">إجمالي التأخير</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-2xl font-bold text-slate-700">
                      {data.delay_summary.records_count.toLocaleString('ar-SA')}
                    </p>
                    <p className="text-xs text-slate-500">يوم تأخير</p>
                  </div>
                </div>

                {/* تفاصيل التأخير الجديد والمرحّل */}
                {(data.delay_summary.carried_over_minutes > 0 || data.delay_summary.new_delay_minutes > 0) && (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 mb-2">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      تفاصيل حساب التأخير
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">تأخير جديد:</span>
                        <span className="font-medium text-slate-900">
                          {data.delay_summary.formatted_new_delay || data.delay_summary.formatted_delay}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">مرحّل من حسم سابق:</span>
                        <span className="font-medium text-violet-700">
                          {data.delay_summary.formatted_carried_over || '0 دقيقة'}
                        </span>
                      </div>
                    </div>
                    {data.delay_summary.carried_over_minutes > 0 && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        * المرحّل هو الفائض من الحسم السابق (الإجمالي - 7 ساعات)
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    من {formatDate(data.delay_summary.calculation_start_date)} إلى{' '}
                    {formatDate(data.delay_summary.calculation_end_date)}
                  </span>
                </div>
              </section>

              {/* سجل أيام التأخير */}
              <section className="rounded-2xl border border-slate-200 p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">سجل أيام التأخير</h4>
                {data.delay_records.length === 0 ? (
                  <p className="text-center text-sm text-slate-400">لا توجد سجلات تأخير</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white text-[11px] text-slate-500">
                        <tr>
                          <th className="px-2 py-1.5 text-right">التاريخ</th>
                          <th className="px-2 py-1.5 text-right">وقت الحضور</th>
                          <th className="px-2 py-1.5 text-right">التأخير</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.delay_records.map((record, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-2 py-2 text-slate-700">{formatDate(record.date)}</td>
                            <td className="px-2 py-2 text-slate-600">
                              {record.check_in_time ? formatTime(record.check_in_time) : '—'}
                            </td>
                            <td className="px-2 py-2 font-medium text-rose-600">
                              {record.delay_minutes} دقيقة
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* الإجراءات السابقة */}
              {data.actions_history.length > 0 && (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">الإجراءات السابقة</h4>
                  <div className="space-y-2">
                    {data.actions_history.map((action) => (
                      <ActionHistoryItem key={action.id} action={action} onPrint={onPrint} />
                    ))}
                  </div>
                </section>
              )}

              {/* أزرار الإجراءات */}
              {readOnly ? (
                <section className="flex items-center justify-center gap-2 border-t border-slate-200 pt-4 text-sm text-amber-600">
                  <i className="bi bi-eye text-lg" />
                  <span>وضع العرض فقط - لا يمكن تسجيل إجراءات للسنة السابقة</span>
                </section>
              ) : (
                <section className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4">
                  {canRecordWarning && (
                    <button
                      type="button"
                      onClick={() =>
                        onRecordAction({
                          type: 'warning',
                          userId: data.teacher.id,
                          teacherName: data.teacher.name,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      تسجيل تنبيه
                    </button>
                  )}
                  {canRecordDeduction && (
                    <button
                      type="button"
                      onClick={() =>
                        onRecordAction({
                          type: 'deduction',
                          userId: data.teacher.id,
                          teacherName: data.teacher.name,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <FileWarning className="h-4 w-4" />
                      تسجيل حسم
                    </button>
                  )}
                  {!canRecordWarning && !canRecordDeduction && (
                    <p className="text-sm text-slate-400">لا يوجد إجراء مستحق حالياً</p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
