import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { FileText, Award, AlertOctagon } from 'lucide-react'
import type { TeacherReferralsResponse, TeacherPointsResponse } from '../types'

const REFERRAL_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  academic_weakness: { label: 'ضعف أكاديمي', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  behavioral_violation: { label: 'مخالفة سلوكية', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  student_absence: { label: 'غياب طالب', className: 'border-amber-200 bg-amber-50 text-amber-700' },
}

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  low: { label: 'منخفضة', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  medium: { label: 'متوسطة', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  high: { label: 'عالية', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  urgent: { label: 'عاجلة', className: 'border-rose-200 bg-rose-50 text-rose-700' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  received: 'تم الاستلام',
  in_progress: 'قيد المعالجة',
  transferred: 'محولة',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
}

interface ReferralsReportsSectionProps {
  referrals: TeacherReferralsResponse | undefined
  points: TeacherPointsResponse | undefined
}

export function ReferralsReportsSection({ referrals, points }: ReferralsReportsSectionProps) {
  const hasReferrals = referrals && referrals.referrals.length > 0
  const hasPoints = points && points.transactions.length > 0

  if (!hasReferrals && !hasPoints) {
    return (
      <EmptyState
        icon={FileText}
        title="لا توجد بيانات"
        description="لا توجد إحالات أو نقاط في الفترة المحددة"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* النقاط */}
      {points && hasPoints && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Award className="h-4 w-4" />
            النقاط (مكافآت ومخالفات)
          </h4>

          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{points.summary.total_rewards}</p>
              <p className="text-xs text-slate-500">{points.summary.rewards_count} مكافأة</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
              <p className="text-xl font-bold text-rose-700">{points.summary.total_violations}</p>
              <p className="text-xs text-slate-500">{points.summary.violations_count} مخالفة</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">النوع</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">النقاط</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">الطالب</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">السبب</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {points.transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={
                          tx.type === 'reward'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }
                      >
                        {tx.type === 'reward' ? 'مكافأة' : 'مخالفة'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-700">{tx.amount}</td>
                    <td className="px-3 py-2 text-slate-600">{tx.student_name ?? '-'}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-500">
                      {tx.reason ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('ar-SA') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الإحالات */}
      {referrals && hasReferrals && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertOctagon className="h-4 w-4" />
            الإحالات
          </h4>

          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{referrals.summary.total}</p>
              <p className="text-xs text-slate-500">إجمالي</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{referrals.summary.by_type.academic_weakness ?? 0}</p>
              <p className="text-xs text-slate-500">ضعف أكاديمي</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{referrals.summary.by_type.behavioral_violation ?? 0}</p>
              <p className="text-xs text-slate-500">سلوكية</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{referrals.summary.by_type.student_absence ?? 0}</p>
              <p className="text-xs text-slate-500">غياب</p>
            </div>
          </div>

          <div className="space-y-2">
            {referrals.referrals.map((ref) => {
              const typeInfo = REFERRAL_TYPE_LABELS[ref.referral_type] ?? REFERRAL_TYPE_LABELS.academic_weakness
              const priorityInfo = PRIORITY_MAP[ref.priority] ?? PRIORITY_MAP.medium

              return (
                <div
                  key={ref.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={typeInfo.className}>{typeInfo.label}</Badge>
                    <span className="text-sm font-medium text-slate-700">{ref.title}</span>
                    {ref.student_name && (
                      <span className="text-xs text-slate-500">· {ref.student_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityInfo.className}>{priorityInfo.label}</Badge>
                    <span className="text-xs text-slate-500">
                      {STATUS_LABELS[ref.status] ?? ref.status}
                    </span>
                    {ref.created_at && (
                      <span className="text-xs text-slate-400">
                        {new Date(ref.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
