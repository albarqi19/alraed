import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ThumbsUp, ThumbsDown, Users, BarChart3 } from 'lucide-react'
import { fetchEvaluationAnalytics } from '@/modules/admin/behavior/api'
import type { AnalyticsFilterParams } from '@/modules/admin/behavior/api'

interface EvaluationsTabProps {
  filters: AnalyticsFilterParams
  activeTab: string
}

export default function EvaluationsTab({ filters, activeTab }: EvaluationsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['behavior-evaluations', filters],
    queryFn: () => fetchEvaluationAnalytics(filters),
    enabled: activeTab === 'evaluations',
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500" dir="rtl">
        <BarChart3 className="mb-3 h-12 w-12 text-slate-300" />
        <p className="text-sm">لا توجد بيانات تقييمات</p>
      </div>
    )
  }

  const { summary, topBehaviors, dailyTrend, teacherParticipation } = data

  const negativeBehaviors = topBehaviors.filter((b) => b.category === 'negative')
  const positiveBehaviors = topBehaviors.filter((b) => b.category === 'positive')

  const maxNegativeCount = negativeBehaviors.length > 0
    ? Math.max(...negativeBehaviors.map((b) => b.count))
    : 1
  const maxPositiveCount = positiveBehaviors.length > 0
    ? Math.max(...positiveBehaviors.map((b) => b.count))
    : 1

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Evaluations */}
        <div className="glass-card flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">إجمالي التقييمات</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">تقييم</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-2">
            <BarChart3 className="h-5 w-5 text-slate-600" />
          </div>
        </div>

        {/* Positive Count */}
        <div className="glass-card flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-medium text-emerald-600">تقييمات إيجابية</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.positive}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">تقييم</p>
          </div>
          <div className="rounded-lg bg-emerald-100 p-2">
            <ThumbsUp className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Negative Count */}
        <div className="glass-card flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-medium text-rose-600">تقييمات سلبية</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{summary.negative}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">تقييم</p>
          </div>
          <div className="rounded-lg bg-rose-100 p-2">
            <ThumbsDown className="h-5 w-5 text-rose-600" />
          </div>
        </div>

        {/* Positive Rate */}
        <div className="glass-card flex items-start justify-between p-4">
          <div>
            <p className="text-xs font-medium text-sky-600">نسبة الإيجابية</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">
              {summary.positiveRate}%
            </p>
            <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${Math.min(summary.positiveRate, 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg bg-sky-100 p-2">
            <Users className="h-5 w-5 text-sky-600" />
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <section className="glass-card flex flex-col p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">الاتجاه اليومي للتقييمات</h2>
            <p className="text-xs text-muted">مقارنة التقييمات الإيجابية والسلبية يومياً</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              إيجابي
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              سلبي
            </span>
          </div>
        </header>
        <div className="h-[300px] w-full">
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="evalColorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="evalColorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                  reversed
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  orientation="right"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="positive"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#evalColorPositive)"
                  name="إيجابي"
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#evalColorNegative)"
                  name="سلبي"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </section>

      {/* Top Behaviors - Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Negative Behaviors */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ThumbsDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">السلوكيات السلبية الأكثر</h2>
              <p className="text-xs text-muted">أكثر السلوكيات السلبية تكراراً</p>
            </div>
          </header>
          {negativeBehaviors.length > 0 ? (
            <div className="space-y-3">
              {negativeBehaviors.map((behavior, index) => (
                <div key={index} className="group">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{behavior.name}</span>
                    <span className="text-xs font-semibold text-rose-600">{behavior.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-rose-50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(behavior.count / maxNegativeCount) * 100}%`,
                        backgroundColor: behavior.color || '#f43f5e',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted">
              لا توجد سلوكيات سلبية
            </div>
          )}
        </section>

        {/* Positive Behaviors */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ThumbsUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">السلوكيات الإيجابية الأكثر</h2>
              <p className="text-xs text-muted">أكثر السلوكيات الإيجابية تكراراً</p>
            </div>
          </header>
          {positiveBehaviors.length > 0 ? (
            <div className="space-y-3">
              {positiveBehaviors.map((behavior, index) => (
                <div key={index} className="group">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{behavior.name}</span>
                    <span className="text-xs font-semibold text-emerald-600">{behavior.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(behavior.count / maxPositiveCount) * 100}%`,
                        backgroundColor: behavior.color || '#10b981',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted">
              لا توجد سلوكيات إيجابية
            </div>
          )}
        </section>
      </div>

      {/* Teacher Participation */}
      <section className="glass-card p-6">
        <header className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">مشاركة المعلمين</h2>
            <p className="text-xs text-muted">عدد التقييمات لكل معلم</p>
          </div>
        </header>
        <div className="h-[300px] w-full">
          {teacherParticipation.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teacherParticipation}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                  width={100}
                  orientation="right"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="evaluation_count"
                  fill="#6366f1"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  name="عدد التقييمات"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// --- Loading Skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-slate-100"
          />
        ))}
      </div>
      {/* Chart placeholders */}
      <div className="h-[360px] animate-pulse rounded-xl border bg-slate-100" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[280px] animate-pulse rounded-xl border bg-slate-100" />
        <div className="h-[280px] animate-pulse rounded-xl border bg-slate-100" />
      </div>
    </div>
  )
}

// --- Custom Tooltip ---

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-2 text-xs font-semibold text-slate-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
