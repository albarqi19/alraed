import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { fetchBehaviorAnalytics } from '@/modules/admin/behavior/api'

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981']

export function AdminBehaviorAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['behavior-analytics'],
    queryFn: fetchBehaviorAnalytics,
  })

  const stats = data?.summary ?? {
    totalViolations: 0,
    avgScore: 100,
    improvementRate: 0,
    committedStudents: 0,
  }

  const monthlyTrend = data?.monthlyTrend ?? []
  const violationTypes = data?.violationTypes ?? []
  const gradeDistribution = data?.gradeDistribution ?? []
  const alerts = data?.alerts ?? []
  const recommendations = data?.recommendations ?? []
  const hasActiveProgram = data?.hasActiveProgram ?? false

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-9 w-48 bg-slate-200 rounded"></div>
          <div className="h-4 w-96 bg-slate-200 rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-3 w-32 bg-slate-200 rounded"></div>
                  <div className="h-8 w-20 bg-slate-200 rounded"></div>
                </div>
                <div className="h-12 w-12 bg-slate-200 rounded-xl"></div>
              </div>
              <div className="mt-4 h-3 w-40 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="mb-6 space-y-2">
                <div className="h-5 w-40 bg-slate-200 rounded"></div>
                <div className="h-3 w-60 bg-slate-200 rounded"></div>
              </div>
              <div className="h-[300px] bg-slate-100 rounded-lg"></div>
            </div>
          ))}
        </div>

        {/* Alerts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                <div className="h-5 w-32 bg-slate-200 rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-3 bg-slate-50 rounded-xl">
                    <div className="h-4 w-3/4 bg-slate-200 rounded mb-2"></div>
                    <div className="h-3 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
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
        <h1 className="text-3xl font-bold text-slate-900">مؤشرات السلوك</h1>
        <p className="text-sm text-muted">
          لوحة تحليلية شاملة لرصد الاتجاهات السلوكية، قياس أثر البرامج، ومتابعة مؤشرات الأداء.
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="مؤشر السلوك العام"
          value={`${stats.avgScore}%`}
          trend={stats.improvementRate >= 0 ? `+${stats.improvementRate}%` : `${stats.improvementRate}%`}
          trendUp={stats.improvementRate >= 0}
          icon={<Activity className="h-5 w-5" />}
          accent="bg-emerald-500/10 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="إجمالي المخالفات (فصلي)"
          value={stats.totalViolations}
          trend={stats.improvementRate >= 0 ? "تحسن" : "تراجع"}
          trendUp={stats.improvementRate >= 0}
          trendLabel="مقارنة بالشهر الماضي"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="bg-rose-500/10 text-rose-700 border-rose-200"
        />
        <StatCard
          title="نسبة التحسن"
          value={`${Math.abs(stats.improvementRate)}%`}
          trend="مقارنة بالشهر الماضي"
          trendUp={stats.improvementRate >= 0}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="bg-sky-500/10 text-sky-700 border-sky-200"
        />
        <StatCard
          title="الطلاب الملتزمين"
          value={`${stats.committedStudents}%`}
          trend="من إجمالي الطلاب"
          trendUp={true}
          icon={<Users className="h-5 w-5" />}
          accent="bg-violet-500/10 text-violet-700 border-violet-200"
        />
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">اتجاهات السلوك (شهري)</h2>
              <p className="text-xs text-muted">مقارنة عدد المخالفات مع درجة السلوك العام</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> درجة السلوك
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> المخالفات
              </span>
            </div>
          </header>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
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
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  name="درجة السلوك"
                />
                <Area
                  type="monotone"
                  dataKey="violations"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorViolations)"
                  name="عدد المخالفات"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Violation Types Pie Chart */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">توزيع أنواع المخالفات</h2>
            <p className="text-xs text-muted">تحليل نسب المخالفات حسب التصنيف</p>
          </header>
          <div className="flex h-[300px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {violationTypes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-medium text-slate-600 ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Main Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Impact Measurement */}
        <section className="glass-card col-span-2 flex flex-col p-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">قياس أثر البرامج الوقائية</h2>
              <p className="text-xs text-muted">مقارنة معدلات المخالفات قبل وبعد تطبيق البرامج الوقائية</p>
            </div>
            {hasActiveProgram ? (
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                برنامج نشط
              </div>
            ) : (
              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                غير مفعل
              </div>
            )}
          </header>
          <div className="flex h-[250px] w-full items-center justify-center">
            {hasActiveProgram ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* Add chart here when program data is available */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">بيانات البرنامج ستظهر هنا</p>
                  <p className="text-xs text-muted">بعد تفعيل البرنامج لفترة كافية</p>
                </div>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <AlertTriangle className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">لا يوجد برنامج نشط</p>
                <p className="text-xs text-muted">ليتم قياس أثره يجب تفعيل برنامج وقائي أولاً</p>
              </div>
            )}
          </div>
        </section>

        {/* Grade Distribution */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">المخالفات حسب الصف</h2>
            <p className="text-xs text-muted">توزيع المخالفات على المراحل الدراسية</p>
          </header>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} name="عدد المخالفات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Recommendations & Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="glass-card p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">تنبيهات استباقية</h2>
          </header>
          <ul className="space-y-3">
            {alerts.map((alert, index) => (
              <li
                key={index}
                className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                  alert.type === 'danger'
                    ? 'bg-rose-50/50 text-rose-900'
                    : alert.type === 'warning'
                      ? 'bg-amber-50/50 text-amber-900'
                      : alert.type === 'info'
                        ? 'bg-sky-50/50 text-sky-900'
                        : 'bg-emerald-50/50 text-emerald-900'
                }`}
              >
                <span
                  className={`mt-0.5 h-2 w-2 rounded-full ${
                    alert.type === 'danger'
                      ? 'bg-rose-500'
                      : alert.type === 'warning'
                        ? 'bg-amber-500'
                        : alert.type === 'info'
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                  }`}
                />
                <div>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-xs opacity-80">{alert.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">توصيات التحسين</h2>
          </header>
          <ul className="space-y-3">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                  rec.type === 'danger'
                    ? 'bg-rose-50/50 text-rose-900'
                    : rec.type === 'warning'
                      ? 'bg-amber-50/50 text-amber-900'
                      : rec.type === 'info'
                        ? 'bg-sky-50/50 text-sky-900'
                        : 'bg-emerald-50/50 text-emerald-900'
                }`}
              >
                <span
                  className={`mt-0.5 h-2 w-2 rounded-full ${
                    rec.type === 'danger'
                      ? 'bg-rose-500'
                      : rec.type === 'warning'
                        ? 'bg-amber-500'
                        : rec.type === 'info'
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'
                  }`}
                />
                <div>
                  <p className="font-semibold">{rec.title}</p>
                  <p className="text-xs opacity-80">{rec.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

// --- Helper Components ---

function StatCard({
  title,
  value,
  trend,
  trendUp,
  trendLabel,
  icon,
  accent,
}: {
  title: string
  value: string | number
  trend: string
  trendUp: boolean
  trendLabel?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <article className={`rounded-2xl border bg-white/80 p-5 shadow-sm transition hover:shadow-md ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold opacity-80">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2.5 shadow-sm">{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span
          className={`flex items-center gap-0.5 font-bold ${
            trendUp ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trend}
        </span>
        <span className="text-muted">{trendLabel || 'من الفترة السابقة'}</span>
      </div>
    </article>
  )
}

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
