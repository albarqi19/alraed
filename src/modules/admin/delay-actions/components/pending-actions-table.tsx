/**
 * جدول المعلمين الذين ينتظرون إجراء (تنبيه أو حسم)
 */

import { Printer, Eye, ArrowLeftRight } from 'lucide-react'
import type { TeacherDelayData, DelayActionType } from '../types'

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
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA')
  }
}

function ActionBadge({ type, label }: { type: DelayActionType | null; label: string | null }) {
  if (!type || !label) return <span className="text-slate-400">—</span>

  const styles =
    type === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      {label}
    </span>
  )
}

function LastActionInfo({
  lastWarning,
  lastDeduction,
}: {
  lastWarning: TeacherDelayData['last_warning']
  lastDeduction: TeacherDelayData['last_deduction']
}) {
  const last = lastDeduction ?? lastWarning

  if (!last) return <span className="text-slate-400">—</span>

  const type = lastDeduction ? 'حسم' : 'تنبيه'
  const date = formatDate(last.created_at)
  const signed = last.is_signed

  return (
    <div className="text-xs">
      <span className="font-medium">{type}</span>
      <span className="mx-1 text-slate-400">•</span>
      <span className="text-slate-500">{date}</span>
      {signed && (
        <span className="mr-1 inline-flex items-center text-emerald-600">
          <i className="bi bi-check-circle text-[10px]" />
        </span>
      )}
    </div>
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
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        جاري تحميل البيانات...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
        <i className="bi bi-check-circle text-4xl text-emerald-300" />
        <p>لا يوجد معلمون ينتظرون إجراء حالياً</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
      <table className="w-full min-w-[800px] text-right text-sm">
        <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">المعلم</th>
            <th className="px-4 py-3 font-semibold">التأخير الجديد</th>
            <th className="px-4 py-3 font-semibold">المرحّل</th>
            <th className="px-4 py-3 font-semibold">الإجمالي</th>
            <th className="px-4 py-3 font-semibold">عدد الأيام</th>
            <th className="px-4 py-3 font-semibold">الإجراء المستحق</th>
            <th className="px-4 py-3 font-semibold">آخر إجراء</th>
            <th className="px-4 py-3 font-semibold">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((teacher) => (
            <tr
              key={teacher.user_id}
              className="border-t border-slate-100 text-[13px] transition hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onTeacherClick(teacher.user_id)}
                  className="text-right font-semibold text-slate-900 transition hover:text-indigo-600"
                >
                  {teacher.teacher_name}
                </button>
                {teacher.national_id && (
                  <p className="text-[11px] text-muted">{teacher.national_id}</p>
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {teacher.formatted_new_delay || teacher.formatted_delay}
              </td>
              <td className="px-4 py-3">
                {teacher.carried_over_minutes > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                    <ArrowLeftRight className="h-3 w-3" />
                    {teacher.formatted_carried_over}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-900">{teacher.formatted_delay}</td>
              <td className="px-4 py-3 text-slate-600">
                {teacher.records_count.toLocaleString('ar-SA')} يوم
              </td>
              <td className="px-4 py-3">
                <ActionBadge type={teacher.pending_action} label={teacher.pending_action_label} />
              </td>
              <td className="px-4 py-3">
                <LastActionInfo
                  lastWarning={teacher.last_warning}
                  lastDeduction={teacher.last_deduction}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onTeacherClick(teacher.user_id)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    title="عرض التفاصيل"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    تفاصيل
                  </button>
                  {!readOnly && teacher.pending_action && (
                    <button
                      type="button"
                      onClick={() =>
                        onRecordAction({
                          type: teacher.pending_action!,
                          userId: teacher.user_id,
                          teacherName: teacher.teacher_name,
                        })
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        teacher.pending_action === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {teacher.pending_action === 'warning' ? 'تسجيل تنبيه' : 'تسجيل حسم'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
