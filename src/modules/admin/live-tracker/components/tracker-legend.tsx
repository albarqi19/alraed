// =============================================
// دليل الألوان
// Tracker Legend Component
// =============================================

import { CheckCircle, XCircle, BookOpen, Hourglass, AlertTriangle, Eye, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TrackerLegend() {
  const slotTypes = [
    { color: 'bg-emerald-50', label: 'حصة', icon: null },
    { color: 'bg-emerald-100', label: 'فراغ', icon: null },
    { color: 'bg-amber-50', label: 'انتظار', icon: null },
    { color: 'bg-sky-50', label: 'إشراف فسحة', icon: Eye },
    { color: 'bg-purple-50', label: 'مناوبة انصراف', icon: Flag },
  ]

  const preparationStatuses = [
    { color: 'border-emerald-500', label: 'تم التحضير', icon: BookOpen, iconColor: 'text-emerald-600' },
    { color: 'border-amber-500', label: 'في انتظار التحضير', icon: Hourglass, iconColor: 'text-amber-500' },
    { color: 'border-red-500', label: 'لم يتم التحضير', icon: AlertTriangle, iconColor: 'text-red-500' },
    { color: 'border-blue-500', label: 'نشاط', icon: BookOpen, iconColor: 'text-blue-500' },
  ]

  const attendanceStatuses = [
    { icon: CheckCircle, color: 'text-emerald-600', label: 'حاضر' },
    { icon: XCircle, color: 'text-red-500', label: 'غائب' },
  ]

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">دليل الألوان والرموز</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* أنواع الخانات */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">أنواع الخانات</p>
          <div className="flex flex-wrap gap-2">
            {slotTypes.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={cn('h-4 w-4 rounded border', item.color)} />
                <span className="text-xs text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* حالة التحضير */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">حالة التحضير</p>
          <div className="flex flex-wrap gap-2">
            {preparationStatuses.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={cn('flex h-4 w-4 items-center justify-center rounded border-r-2', item.color)}>
                    <Icon className={cn('h-3 w-3', item.iconColor)} />
                  </div>
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* حالة الحضور */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">حالة الحضور (الطابور)</p>
          <div className="flex flex-wrap gap-2">
            {attendanceStatuses.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <Icon className={cn('h-4 w-4', item.color)} />
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ملاحظة */}
      <div className="mt-3 flex items-center gap-2 rounded bg-indigo-50 px-3 py-2">
        <div className="h-4 w-4 rounded ring-2 ring-indigo-500 ring-offset-1" />
        <span className="text-xs text-indigo-700">الفترة الحالية محددة بإطار أزرق</span>
      </div>
    </div>
  )
}
