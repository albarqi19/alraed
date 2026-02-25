import {
  CheckCircle, XCircle, Clock, AlertTriangle, BookOpen,
  MessageCircle, ClipboardCheck, FileText, TrendingUp, TrendingDown
} from 'lucide-react'
import type { TeacherProfileSummary, BenchmarkValues } from '../types'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  benchmark?: number
  /** true = أعلى أفضل, false = أقل أفضل */
  higherIsBetter?: boolean
}

function StatCard({ title, value, subtitle, icon: Icon, color, benchmark, higherIsBetter = true }: StatCardProps) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-100 bg-emerald-50/50',
    rose: 'border-rose-100 bg-rose-50/50',
    amber: 'border-amber-100 bg-amber-50/50',
    sky: 'border-sky-100 bg-sky-50/50',
    violet: 'border-violet-100 bg-violet-50/50',
    blue: 'border-blue-100 bg-blue-50/50',
    slate: 'border-slate-100 bg-slate-50/50',
    orange: 'border-orange-100 bg-orange-50/50',
  }

  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    violet: 'text-violet-600',
    blue: 'text-blue-600',
    slate: 'text-slate-600',
    orange: 'text-orange-600',
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  const isBetter = benchmark !== undefined
    ? (higherIsBetter ? numValue >= benchmark : numValue <= benchmark)
    : null

  return (
    <article className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${colorMap[color] ?? colorMap.slate}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2 shadow-sm">
          <Icon className={`h-5 w-5 ${iconColorMap[color] ?? iconColorMap.slate}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        {subtitle && <span className="font-medium text-slate-500">{subtitle}</span>}
        {benchmark !== undefined && (
          <span
            className={`flex items-center gap-1 font-medium ${
              isBetter ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isBetter ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            م: {benchmark}
          </span>
        )}
      </div>
    </article>
  )
}

interface SummaryCardsProps {
  data: TeacherProfileSummary
  benchmarks: BenchmarkValues | null
}

export function SummaryCards({ data, benchmarks }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <StatCard
        title="أيام الحضور"
        value={data.attendance.present_days}
        subtitle={`من ${data.attendance.total_records}`}
        icon={CheckCircle}
        color="emerald"
        benchmark={benchmarks?.avg_present_days}
        higherIsBetter={true}
      />
      <StatCard
        title="أيام الغياب"
        value={data.attendance.absent_days}
        icon={XCircle}
        color="rose"
        benchmark={benchmarks?.avg_absent_days}
        higherIsBetter={false}
      />
      <StatCard
        title="أيام التأخر"
        value={data.attendance.delayed_days}
        icon={Clock}
        color="amber"
        benchmark={benchmarks?.avg_delayed_days}
        higherIsBetter={false}
      />
      <StatCard
        title="ساعات التأخر"
        value={data.attendance.total_delay_hours}
        subtitle={`${data.attendance.total_delay_minutes} دقيقة`}
        icon={Clock}
        color="orange"
        benchmark={benchmarks ? Math.round(benchmarks.avg_delay_minutes / 60 * 10) / 10 : undefined}
        higherIsBetter={false}
      />
      <StatCard
        title="التنبيهات"
        value={data.delay_actions.warnings_count}
        subtitle={`${data.delay_actions.deductions_count} حسم`}
        icon={AlertTriangle}
        color="rose"
      />
      <StatCard
        title="الحصص"
        value={data.schedule.total_sessions}
        subtitle={`${data.schedule.subjects_count} مادة · ${data.schedule.classes_count} فصل`}
        icon={BookOpen}
        color="blue"
      />
      <StatCard
        title="الرسائل المرسلة"
        value={data.messages.total_sent}
        subtitle={`${data.messages.replies_count} رد`}
        icon={MessageCircle}
        color="sky"
        benchmark={benchmarks?.avg_messages_per_teacher}
        higherIsBetter={true}
      />
      <StatCard
        title="نسبة التحضير"
        value={data.preparation.is_linked ? `${data.preparation.rate}%` : 'غير مرتبط'}
        subtitle={data.preparation.is_linked ? `${data.preparation.prepared}/${data.preparation.total}` : undefined}
        icon={ClipboardCheck}
        color="violet"
        benchmark={data.preparation.is_linked ? benchmarks?.school_preparation_rate : undefined}
        higherIsBetter={true}
      />
      <StatCard
        title="الإحالات"
        value={data.referrals_count}
        icon={FileText}
        color="slate"
        benchmark={benchmarks?.avg_referrals_per_teacher}
      />
    </div>
  )
}
