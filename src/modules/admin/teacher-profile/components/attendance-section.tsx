import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { CalendarCheck } from 'lucide-react'
import type { TeacherAttendanceResponse } from '../types'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  on_time: { label: 'في الوقت', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  delayed: { label: 'متأخر', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  excused: { label: 'معذور', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  absent: { label: 'غائب', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  unknown: { label: 'غير محدد', className: 'border-slate-200 bg-slate-50 text-slate-700' },
}

const LOGIN_METHOD_MAP: Record<string, string> = {
  face: 'وجه',
  fingerprint: 'بصمة',
  card: 'بطاقة',
  voice: 'صوت',
  manual: 'يدوي',
  unknown: '-',
}

interface AttendanceSectionProps {
  data: TeacherAttendanceResponse
}

export function AttendanceSection({ data }: AttendanceSectionProps) {
  if (data.records.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="لا توجد سجلات حضور"
        description="لم يتم تسجيل أي حضور في الفترة المحددة"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'إجمالي', value: data.summary.total, color: 'slate' },
          { label: 'حاضر', value: data.summary.present, color: 'emerald' },
          { label: 'غائب', value: data.summary.absent, color: 'rose' },
          { label: 'متأخر', value: data.summary.delayed, color: 'amber' },
          { label: 'في الوقت', value: data.summary.on_time, color: 'blue' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border border-${stat.color}-100 bg-${stat.color}-50/50 p-3 text-center`}
          >
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* جدول */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحالة</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الحضور</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الانصراف</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التأخر</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الطريقة</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">سبب الغياب</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((record) => {
              const statusInfo = STATUS_MAP[record.delay_status] ?? STATUS_MAP.unknown
              return (
                <tr key={record.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {new Date(record.attendance_date).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {record.delay_minutes && record.delay_minutes > 0 ? (
                      <span className="font-medium text-amber-600">{record.delay_minutes} د</span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {LOGIN_METHOD_MAP[record.login_method ?? ''] ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {record.absence_reason_label ?? '-'}
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
