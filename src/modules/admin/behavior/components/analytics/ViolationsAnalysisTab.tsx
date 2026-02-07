import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { BarChart3, Clock, ClipboardCheck, Users, GraduationCap } from 'lucide-react'
import type { BehaviorAnalytics } from '@/modules/admin/behavior/api'

interface ViolationsAnalysisTabProps {
  data: BehaviorAnalytics
}

export default function ViolationsAnalysisTab({ data }: ViolationsAnalysisTabProps) {
  const degreeDistribution = data.degreeDistribution ?? []
  const weekdayPatterns = data.timePatterns?.weekday ?? []
  const hourlyPatterns = data.timePatterns?.hourly ?? []
  const procedureCompletion = data.procedureCompletion
  const reporterDistribution = data.reporterDistribution ?? []
  const classComparison = data.classComparison ?? []

  const maxReporterCount = Math.max(...reporterDistribution.map((r) => r.count), 1)

  return (
    <div className="space-y-6">
      {/* Row 1: Degree Distribution + Time Patterns (Weekday) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Degree Distribution */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">توزيع الدرجات</h2>
              <p className="text-xs text-muted">المخالفات حسب درجة الخطورة (1-4)</p>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {degreeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={degreeDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40} name="عدد المخالفات">
                    {degreeDistribution.map((item, index) => (
                      <Cell key={`degree-${index}`} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        {/* Weekday Distribution */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">التوزيع الأسبوعي</h2>
              <p className="text-xs text-muted">المخالفات حسب أيام الأسبوع</p>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {weekdayPatterns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayPatterns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="#0ea5e9"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                    name="عدد المخالفات"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Hourly Distribution + Procedure Completion */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Distribution */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">التوزيع بالساعات</h2>
              <p className="text-xs text-muted">المخالفات حسب ساعات الدوام</p>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {hourlyPatterns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyPatterns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    name="عدد المخالفات"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        {/* Procedure Completion */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إنجاز الإجراءات</h2>
              <p className="text-xs text-muted">نسبة اكتمال الإجراءات المتخذة</p>
            </div>
          </header>
          {procedureCompletion && procedureCompletion.total > 0 ? (
            <div className="flex flex-1 flex-col justify-center space-y-6">
              {/* Completion Rate Display */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl font-bold text-emerald-600">
                  {Math.round(procedureCompletion.completionRate)}%
                </div>
                <p className="text-sm font-medium text-slate-600">نسبة الإنجاز</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full">
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  {/* Completed */}
                  <div className="flex h-full">
                    {procedureCompletion.completed > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${(procedureCompletion.completed / procedureCompletion.total) * 100}%`,
                        }}
                      />
                    )}
                    {procedureCompletion.inProgress > 0 && (
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{
                          width: `${(procedureCompletion.inProgress / procedureCompletion.total) * 100}%`,
                        }}
                      />
                    )}
                    {procedureCompletion.pending > 0 && (
                      <div
                        className="h-full bg-slate-300 transition-all duration-500"
                        style={{
                          width: `${(procedureCompletion.pending / procedureCompletion.total) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center rounded-xl bg-emerald-50/50 p-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="mt-2 text-lg font-bold text-emerald-700">
                    {procedureCompletion.completed}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600">مكتمل</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-amber-50/50 p-3">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="mt-2 text-lg font-bold text-amber-700">
                    {procedureCompletion.inProgress}
                  </span>
                  <span className="text-[11px] font-medium text-amber-600">قيد التنفيذ</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-slate-50 p-3">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span className="mt-2 text-lg font-bold text-slate-700">
                    {procedureCompletion.pending}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">معلق</span>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500">
                الإجمالي: {procedureCompletion.total} إجراء
              </p>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>

      {/* Row 3: Reporter Distribution + Class Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reporter Distribution */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">توزيع المبلّغين</h2>
              <p className="text-xs text-muted">أكثر المبلّغين عن المخالفات</p>
            </div>
          </header>
          {reporterDistribution.length > 0 ? (
            <div className="flex-1 space-y-3">
              {reporterDistribution.map((reporter, index) => (
                <div key={index} className="group">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{reporter.name}</span>
                    <span className="font-bold text-slate-900">{reporter.count}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{
                        width: `${(reporter.count / maxReporterCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Class Comparison */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">مقارنة الفصول</h2>
              <p className="text-xs text-muted">عدد المخالفات لكل فصل</p>
            </div>
          </header>
          {classComparison.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">الصف</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">الفصل</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">المخالفات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classComparison.map((row, index) => {
                    const intensity = row.violationCount / Math.max(...classComparison.map((c) => c.violationCount), 1)
                    const bgColor =
                      intensity > 0.75
                        ? 'bg-rose-50/60'
                        : intensity > 0.5
                          ? 'bg-amber-50/60'
                          : intensity > 0.25
                            ? 'bg-yellow-50/40'
                            : 'bg-white'
                    return (
                      <tr key={index} className={`transition-colors hover:bg-slate-50/50 ${bgColor}`}>
                        <td className="px-4 py-3 text-xs font-medium text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.grade}</td>
                        <td className="px-4 py-3 text-slate-600">{row.className}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-rose-100 px-2 text-xs font-semibold text-rose-700">
                            {row.violationCount}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
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

// --- Empty State ---

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      لا توجد بيانات متاحة
    </div>
  )
}
