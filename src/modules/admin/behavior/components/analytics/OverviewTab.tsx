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
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { BehaviorAnalytics } from '@/modules/admin/behavior/api'

const COLORS = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981']

interface OverviewTabProps {
  data: BehaviorAnalytics
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const monthlyTrend = data.monthlyTrend ?? []
  const violationTypes = data.violationTypes ?? []
  const gradeDistribution = data.gradeDistribution ?? []
  const alerts = data.alerts ?? []
  const recommendations = data.recommendations ?? []

  return (
    <div className="space-y-6">
      {/* Row 1: Monthly Trend + Violation Types Pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">اتجاهات السلوك (شهري)</h2>
              <p className="text-xs text-muted">مقارنة عدد المخالفات مع درجة السلوك العام</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                درجة السلوك
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                المخالفات
              </span>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overviewColorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="overviewColorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
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
                    fill="url(#overviewColorScore)"
                    name="درجة السلوك"
                  />
                  <Area
                    type="monotone"
                    dataKey="violations"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#overviewColorViolations)"
                    name="عدد المخالفات"
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

        {/* Violation Types Pie Chart */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">توزيع أنواع المخالفات</h2>
            <p className="text-xs text-muted">تحليل نسب المخالفات حسب التصنيف</p>
          </header>
          <div className="flex h-[300px] items-center justify-center">
            {violationTypes.length > 0 ? (
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="mr-2 text-xs font-medium text-slate-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                لا توجد بيانات متاحة
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Grade Distribution */}
      <section className="glass-card p-6">
        <header className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">المخالفات حسب الصف</h2>
          <p className="text-xs text-muted">توزيع المخالفات على المراحل الدراسية</p>
        </header>
        <div className="h-[300px] w-full">
          {gradeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
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
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="#f43f5e"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  name="عدد المخالفات"
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

      {/* Row 3: Alerts + Recommendations */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Alerts */}
        <section className="glass-card p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">تنبيهات استباقية</h2>
          </header>
          {alerts.length > 0 ? (
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
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
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
          ) : (
            <p className="py-6 text-center text-sm text-muted">لا توجد تنبيهات حالياً</p>
          )}
        </section>

        {/* Recommendations */}
        <section className="glass-card p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">توصيات التحسين</h2>
          </header>
          {recommendations.length > 0 ? (
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
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
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
          ) : (
            <p className="py-6 text-center text-sm text-muted">لا توجد توصيات حالياً</p>
          )}
        </section>
      </div>
    </div>
  )
}

// --- Shared Tooltip ---

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
