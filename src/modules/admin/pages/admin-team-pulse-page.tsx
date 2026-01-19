import { useQuery } from '@tanstack/react-query'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { Heart, TrendingUp, Users, Smile } from 'lucide-react'
import { fetchMoodAnalytics, fetchMoodTrend } from '@/modules/admin/mood/api'
import { MOOD_CHART_COLORS } from '@/modules/admin/mood/types'

export function AdminTeamPulsePage() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['mood-analytics'],
    queryFn: () => fetchMoodAnalytics(),
  })

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['mood-trend', 7],
    queryFn: () => fetchMoodTrend(7),
  })

  const isLoading = analyticsLoading || trendLoading

  // Prepare distribution data for pie chart
  const distributionData = analytics?.distribution
    ? Object.entries(analytics.distribution).map(([, value]) => ({
        name: value.label,
        emoji: value.emoji,
        value: value.count,
        percentage: value.percentage,
      }))
    : []

  // Prepare trend data for area chart
  const weeklyTrend = trendData?.trend.map((day) => ({
    name: day.day_name,
    score: day.happiness_score ?? 0,
    participants: day.participants,
  })) ?? []

  // Calculate happiness level text
  const getHappinessLevel = (score: number | null): { text: string; color: string } => {
    if (score === null) return { text: 'لا توجد بيانات', color: 'text-slate-500' }
    if (score >= 80) return { text: 'ممتاز', color: 'text-emerald-600' }
    if (score >= 60) return { text: 'جيد', color: 'text-sky-600' }
    if (score >= 40) return { text: 'متوسط', color: 'text-amber-600' }
    return { text: 'يحتاج اهتمام', color: 'text-rose-600' }
  }

  const happinessLevel = getHappinessLevel(analytics?.happiness_score ?? null)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-9 w-48 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-200" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-32 rounded bg-slate-200" />
                  <div className="h-8 w-20 rounded bg-slate-200" />
                </div>
                <div className="h-12 w-12 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-6 space-y-2">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="h-3 w-60 rounded bg-slate-200" />
              </div>
              <div className="h-[300px] rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-200">
            <Heart className="h-6 w-6 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">نبض الفريق</h1>
            <p className="text-sm text-slate-500">
              مؤشرات الحالة النفسية للفريق التعليمي - بيانات مجهولة المصدر
            </p>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Happiness Score */}
        <article className="rounded-2xl border border-emerald-200 bg-emerald-500/10 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700">مؤشر السعادة</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {analytics?.happiness_score !== null ? `${Math.round(analytics?.happiness_score ?? 0)}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 shadow-sm">
              <Smile className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className={`font-bold ${happinessLevel.color}`}>{happinessLevel.text}</span>
          </div>
        </article>

        {/* Participation Rate */}
        <article className="rounded-2xl border border-sky-200 bg-sky-500/10 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700">نسبة المشاركة</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {analytics?.participation_rate ?? 0}%
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 shadow-sm">
              <TrendingUp className="h-5 w-5 text-sky-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">
              {analytics?.participants ?? 0} من {analytics?.total_teachers ?? 0} معلم
            </span>
          </div>
        </article>

        {/* Total Teachers */}
        <article className="rounded-2xl border border-violet-200 bg-violet-500/10 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-700">إجمالي المعلمين</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {analytics?.total_teachers ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 shadow-sm">
              <Users className="h-5 w-5 text-violet-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">المعلمين النشطين</span>
          </div>
        </article>

        {/* Today's Participants */}
        <article className="rounded-2xl border border-amber-200 bg-amber-500/10 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700">شاركوا اليوم</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {analytics?.participants ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 shadow-sm">
              <Heart className="h-5 w-5 text-amber-700" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">سجلوا حالتهم المزاجية</span>
          </div>
        </article>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mood Distribution Pie Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">توزيع المزاج اليوم</h2>
            <p className="text-xs text-slate-500">نسب الحالات المزاجية للمعلمين</p>
          </header>
          <div className="flex h-[300px] items-center justify-center">
            {distributionData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={(props: { payload?: { emoji?: string; percentage?: number } }) =>
                      `${props.payload?.emoji ?? ''} ${props.payload?.percentage ?? 0}%`
                    }
                    labelLine={false}
                  >
                    {distributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MOOD_CHART_COLORS[index % MOOD_CHART_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<MoodTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Smile className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">لا توجد بيانات حتى الآن</p>
                <p className="text-xs text-slate-500">لم يسجل أي معلم حالته المزاجية اليوم</p>
              </div>
            )}
          </div>
          {/* Legend */}
          {distributionData.some((d) => d.value > 0) && (
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {distributionData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: MOOD_CHART_COLORS[index % MOOD_CHART_COLORS.length] }}
                  />
                  <span className="text-slate-600">
                    {item.emoji} {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Weekly Trend Area Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">اتجاهات الأسبوع</h2>
              <p className="text-xs text-slate-500">مؤشر السعادة خلال الأيام السبعة الأخيرة</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> مؤشر السعادة
              </span>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHappiness" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHappiness)"
                    name="مؤشر السعادة"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">لا توجد بيانات كافية</p>
                <p className="text-xs text-slate-500">ستظهر الاتجاهات بعد تجميع بيانات كافية</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
            <Heart className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">ملاحظة حول الخصوصية</h3>
            <p className="mt-1 text-xs text-slate-500">
              جميع البيانات المعروضة هنا مجهولة المصدر ولا يمكن ربطها بأي معلم بعينه.
              الهدف هو فهم الصحة النفسية العامة للفريق دون المساس بخصوصية الأفراد.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Tooltip Components ---

function MoodTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-1 text-sm font-semibold text-slate-900">
          {data.emoji} {data.name}
        </p>
        <p className="text-xs text-slate-600">
          {data.value} معلم ({data.percentage}%)
        </p>
      </div>
    )
  }
  return null
}

function TrendTooltip({ active, payload, label }: any) {
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
            <span className="text-slate-600">مؤشر السعادة:</span>
            <span className="font-bold text-slate-900">{entry.value}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
