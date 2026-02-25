import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { Shield, UserCheck } from 'lucide-react'
import type { TeacherDutiesResponse, TeacherCoverageResponse } from '../types'

const DUTY_TYPE_MAP: Record<string, { label: string; className: string }> = {
  duty_schedule: { label: 'مناوبة فصلية', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  duty_shift: { label: 'مناوبة يومية', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  standby: { label: 'انتظار', className: 'border-amber-200 bg-amber-50 text-amber-700' },
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'مجدول', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  notified: { label: 'تم الإبلاغ', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  completed: { label: 'مكتمل', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  absent: { label: 'غائب', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  assigned: { label: 'معيّن', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  pending: { label: 'معلق', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  cancelled: { label: 'ملغي', className: 'border-slate-200 bg-slate-50 text-slate-500' },
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
    <div className="space-y-6">
      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{duties.summary.duty_schedule_count}</p>
          <p className="text-xs text-slate-500">مناوبة فصلية</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{duties.summary.duty_shift_count}</p>
          <p className="text-xs text-slate-500">مناوبة يومية</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{duties.summary.standby_count}</p>
          <p className="text-xs text-slate-500">انتظار</p>
        </div>
        {coverage && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{coverage.summary.total}</p>
            <p className="text-xs text-slate-500">طلبات تغطية</p>
          </div>
        )}
      </div>

      {/* قائمة المناوبات */}
      {duties.duties.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Shield className="h-4 w-4" />
            سجل المناوبات والإشراف
          </h4>
          <div className="space-y-2">
            {duties.duties.map((duty) => {
              const typeInfo = DUTY_TYPE_MAP[duty.type] ?? DUTY_TYPE_MAP.duty_schedule
              const statusInfo = STATUS_MAP[duty.status] ?? STATUS_MAP.pending
              const date = duty.duty_date ?? duty.schedule_date

              return (
                <div
                  key={`${duty.type}-${duty.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={typeInfo.className}>{typeInfo.label}</Badge>
                    <span className="text-sm font-medium text-slate-700">
                      {date ? new Date(date).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                    </span>
                    {duty.period_number && (
                      <span className="text-xs text-slate-500">الحصة {duty.period_number}</span>
                    )}
                    {duty.duty_type && (
                      <span className="text-xs text-slate-500">
                        {duty.duty_type === 'morning' ? 'صباحي' : 'مسائي'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {duty.replacing_teacher && (
                      <span className="text-xs text-slate-500">بدلاً عن: {duty.replacing_teacher}</span>
                    )}
                    <Badge variant="outline" className={statusInfo.className}>{statusInfo.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* طلبات التغطية */}
      {coverage && coverage.requests.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserCheck className="h-4 w-4" />
            طلبات التغطية
          </h4>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحصص</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">السبب</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {coverage.requests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(req.request_date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {req.from_period} - {req.to_period}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-500">
                      {req.reason ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={STATUS_MAP[req.status]?.className ?? ''}>
                        {STATUS_MAP[req.status]?.label ?? req.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
