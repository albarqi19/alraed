import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { CheckCircle, AlertCircle, Clock, LogOut, Flag } from 'lucide-react'
import type { TeacherPeriodActionsResponse } from '../types'

const ACTION_TYPE_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  absent: { label: 'غياب', className: 'border-rose-200 bg-rose-50 text-rose-700', icon: AlertCircle },
  late: { label: 'تأخر', className: 'border-amber-200 bg-amber-50 text-amber-700', icon: Clock },
  early_leave: { label: 'انصراف مبكر', className: 'border-blue-200 bg-blue-50 text-blue-700', icon: LogOut },
  duty_absent: { label: 'غياب مناوبة', className: 'border-violet-200 bg-violet-50 text-violet-700', icon: Flag },
}

const PERIOD_TYPE_MAP: Record<string, { label: string; className: string }> = {
  assembly: { label: 'الطابور', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  class: { label: 'حصة', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  break: { label: 'الفسحة', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  dismissal: { label: 'الانصراف', className: 'border-slate-200 bg-slate-50 text-slate-700' },
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
    <div className="space-y-5">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
          <p className="text-xl font-bold text-rose-700">{summary.class_absences}</p>
          <p className="text-xs text-slate-500">غياب عن الحصص</p>
          <p className="text-[10px] text-slate-400">{summary.class_absences_days} يوم</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{summary.class_late_count}</p>
          <p className="text-xs text-slate-500">تأخر عن الحصص</p>
          <p className="text-[10px] text-slate-400">{summary.class_late_total_minutes} دقيقة</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{summary.class_early_leaves}</p>
          <p className="text-xs text-slate-500">انصراف مبكر</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-center">
          <p className="text-xl font-bold text-indigo-700">{summary.assembly_absences}</p>
          <p className="text-xs text-slate-500">غياب عن الطابور</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center col-span-2 sm:col-span-1 lg:col-span-2">
          <p className="text-xl font-bold text-slate-900">{summary.total_actions}</p>
          <p className="text-xs text-slate-500">إجمالي الملاحظات</p>
        </div>
      </div>

      {/* جدول التفاصيل */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الفترة</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">نوع الإجراء</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">المدة</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الفصل</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => {
              const actionInfo = ACTION_TYPE_MAP[action.action_type] ?? ACTION_TYPE_MAP.absent
              const periodInfo = PERIOD_TYPE_MAP[action.period_type] ?? PERIOD_TYPE_MAP.class

              return (
                <tr key={action.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {new Date(action.action_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={periodInfo.className}>
                      {action.period_type_label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={actionInfo.className}>
                      {action.action_type_label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {action.formatted_minutes ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {action.class_display ?? '-'}
                  </td>
                  <td className="max-w-[150px] truncate px-3 py-2 text-xs text-slate-400">
                    {action.notes ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
