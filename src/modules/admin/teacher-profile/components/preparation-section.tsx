import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { ClipboardCheck, Link2Off } from 'lucide-react'
import type { TeacherPreparationResponse } from '../types'

const PREP_STATUS_MAP: Record<string, { label: string; className: string }> = {
  prepared: { label: 'محضّر', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  waiting: { label: 'لم يحضّر', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  warning: { label: 'تحذير', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  activity: { label: 'نشاط', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  empty: { label: 'فارغ', className: 'border-slate-200 bg-slate-50 text-slate-500' },
}

interface PreparationSectionProps {
  data: TeacherPreparationResponse
}

export function PreparationSection({ data }: PreparationSectionProps) {
  if (!data.is_linked) {
    return (
      <EmptyState
        icon={Link2Off}
        title="المعلم غير مرتبط بمنصة مدرستي"
        description="يجب ربط المعلم بحسابه في منصة مدرستي لتتبع التحضير"
      />
    )
  }

  if (data.records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="لا توجد بيانات تحضير"
        description="لم يتم استيراد أي بيانات تحضير في الفترة المحددة"
      />
    )
  }

  const summary = data.summary!

  return (
    <div className="space-y-4">
      {/* معلومات الربط */}
      {data.madrasati_name && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-700">
          حساب مدرستي: <span className="font-semibold">{data.madrasati_name}</span>
        </div>
      )}

      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{summary.total}</p>
          <p className="text-xs text-slate-500">إجمالي الحصص</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{summary.prepared}</p>
          <p className="text-xs text-slate-500">محضّر</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{summary.unprepared}</p>
          <p className="text-xs text-slate-500">لم يحضّر</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{summary.rate}%</p>
          <p className="text-xs text-slate-500">نسبة التحضير</p>
        </div>
      </div>

      {/* شريط النسبة */}
      <div className="overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-3 rounded-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all duration-500"
          style={{ width: `${summary.rate}%` }}
        />
      </div>

      {/* جدول */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">اليوم</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحصة</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الفصل</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الدرس</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((record) => {
              const statusInfo = PREP_STATUS_MAP[record.status] ?? PREP_STATUS_MAP.empty
              return (
                <tr key={record.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-700">
                    {new Date(record.extraction_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{record.day}</td>
                  <td className="px-3 py-2 text-slate-600">{record.period_number}</td>
                  <td className="px-3 py-2 text-slate-600">{record.class_name}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-600" title={record.lesson_title}>
                    {record.lesson_title || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
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
