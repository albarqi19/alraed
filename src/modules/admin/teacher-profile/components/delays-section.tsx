import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import type { TeacherDelaysResponse, TeacherDelayActionsResponse } from '../types'

const EXCUSE_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'قيد المراجعة', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  approved: { label: 'مقبول', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rejected: { label: 'مرفوض', className: 'border-rose-200 bg-rose-50 text-rose-700' },
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
        title="لا توجد تأخرات مسجلة"
        description="أداء ممتاز! لا يوجد أي تأخر في الفترة المحددة"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* ملخص التأخرات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{delays.summary.total_delays}</p>
          <p className="text-xs text-slate-500">مرات التأخر</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{delays.summary.total_hours} س</p>
          <p className="text-xs text-slate-500">{delays.summary.total_minutes} دقيقة</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{delays.summary.excused_count}</p>
          <p className="text-xs text-slate-500">أعذار مقبولة</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{delays.summary.pending_excuses}</p>
          <p className="text-xs text-slate-500">أعذار معلقة</p>
        </div>
        {actions && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
            <p className="text-xl font-bold text-slate-900">
              {actions.summary.warnings} / {actions.summary.deductions}
            </p>
            <p className="text-xs text-slate-500">تنبيه / حسم</p>
          </div>
        )}
      </div>

      {/* سجل التأخرات */}
      {delays.records.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock className="h-4 w-4" />
            سجل التأخرات
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">دقائق التأخر</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">وقت الحضور</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">العذر</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الاستفسار</th>
                </tr>
              </thead>
              <tbody>
                {delays.records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {new Date(record.attendance_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-bold text-amber-600">{record.delay_minutes} د</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {record.excuse ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className={EXCUSE_STATUS[record.excuse.status]?.className}>
                            {EXCUSE_STATUS[record.excuse.status]?.label}
                          </Badge>
                          {record.excuse.excuse_text && (
                            <p className="max-w-[200px] truncate text-xs text-slate-400" title={record.excuse.excuse_text}>
                              {record.excuse.excuse_text}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {record.inquiry ? (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {record.inquiry.status === 'responded' ? 'تم الرد' : 'في الانتظار'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* التنبيهات والحسميات */}
      {actions && actions.actions.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertTriangle className="h-4 w-4" />
            التنبيهات والحسميات
          </h4>
          <div className="space-y-2">
            {actions.actions.map((action) => (
              <div
                key={action.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  action.action_type === 'warning'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={
                      action.action_type === 'warning'
                        ? 'border-amber-300 bg-amber-100 text-amber-800'
                        : 'border-rose-300 bg-rose-100 text-rose-800'
                    }
                  >
                    {action.action_type === 'warning' ? 'تنبيه' : 'حسم'} #{action.sequence_number}
                  </Badge>
                  <span className="text-sm text-slate-700">{action.formatted_delay}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {action.is_printed && <span className="rounded bg-slate-100 px-1.5 py-0.5">مطبوع</span>}
                  {action.is_signed && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">موقّع</span>}
                  {action.created_at && (
                    <span>{new Date(action.created_at).toLocaleDateString('ar-SA')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
