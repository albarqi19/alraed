import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from 'recharts'
import {
  ClipboardList,
  Activity,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Link2,
  Users,
} from 'lucide-react'
import { fetchTreatmentEffectiveness, fetchAttendanceCorrelation } from '@/modules/admin/behavior/api'
import type { AnalyticsFilterParams } from '@/modules/admin/behavior/api'

interface TreatmentEffectivenessTabProps {
  filters: AnalyticsFilterParams
  activeTab: string
}

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  completed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  on_hold: '#8b5cf6',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  critical: '#991b1b',
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']

const CORRELATION_CONFIG: Record<
  'strong' | 'moderate' | 'weak' | 'none',
  { label: string; badgeClass: string; description: string }
> = {
  strong: {
    label: 'قوية',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    description: 'هناك علاقة قوية بين الغياب والمخالفات السلوكية',
  },
  moderate: {
    label: 'متوسطة',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'هناك علاقة متوسطة بين الغياب والمخالفات السلوكية',
  },
  weak: {
    label: 'ضعيفة',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'هناك علاقة ضعيفة بين الغياب والمخالفات السلوكية',
  },
  none: {
    label: 'لا يوجد',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    description: 'لا توجد علاقة واضحة بين الغياب والمخالفات السلوكية',
  },
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
            className="h-28 animate-pulse rounded-xl border bg-slate-100"
          />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[380px] animate-pulse rounded-xl border bg-slate-100" />
        <div className="h-[380px] animate-pulse rounded-xl border bg-slate-100" />
      </div>
      {/* Correlation section skeleton */}
      <div className="h-[420px] animate-pulse rounded-xl border bg-slate-100" />
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

// --- Scatter Custom Tooltip ---

function ScatterTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload
    if (!data) return null
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-1.5 text-xs font-semibold text-slate-900">{data.name}</p>
        <p className="text-[11px] text-slate-500">{data.grade}</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-slate-600">نسبة الغياب:</span>
            <span className="font-bold text-slate-900">{data.absenceRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-slate-600">المخالفات:</span>
            <span className="font-bold text-slate-900">{data.violations}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-slate-600">التأخر:</span>
            <span className="font-bold text-slate-900">{data.lateCount}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// --- Main Component ---

export default function TreatmentEffectivenessTab({ filters, activeTab }: TreatmentEffectivenessTabProps) {
  const { data: treatmentData, isLoading: treatmentLoading } = useQuery({
    queryKey: ['behavior-treatment', filters],
    queryFn: () => fetchTreatmentEffectiveness(filters),
    enabled: activeTab === 'treatment',
  })

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['behavior-attendance-correlation', filters],
    queryFn: () => fetchAttendanceCorrelation(filters),
    enabled: activeTab === 'treatment',
  })

  if (treatmentLoading || attendanceLoading) {
    return <LoadingSkeleton />
  }

  if (!treatmentData && !attendanceData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500" dir="rtl">
        <AlertTriangle className="mb-3 h-12 w-12 text-slate-300" />
        <p className="text-sm">لا توجد بيانات</p>
      </div>
    )
  }

  const summary = treatmentData?.summary
  const beforeAfter = treatmentData?.beforeAfter ?? []
  const plansByStatus = Array.isArray(treatmentData?.plansByStatus) ? treatmentData.plansByStatus : []
  const plansByPriority = Array.isArray(treatmentData?.plansByPriority) ? treatmentData.plansByPriority : []

  const scatterData = attendanceData?.scatterData ?? []
  const highRiskStudents = attendanceData?.highRiskStudents ?? []
  const correlationStrength = attendanceData?.correlationStrength ?? 'none'
  const correlationValue = attendanceData?.correlation ?? 0
  const correlationConfig = CORRELATION_CONFIG[correlationStrength]

  const summaryCards = [
    {
      label: 'إجمالي الخطط',
      value: summary?.totalPlans ?? 0,
      icon: ClipboardList,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
    },
    {
      label: 'الخطط النشطة',
      value: summary?.activePlans ?? 0,
      icon: Activity,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-700',
    },
    {
      label: 'الخطط المكتملة',
      value: summary?.completedPlans ?? 0,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
    },
    {
      label: 'نسبة النجاح',
      value: `${summary?.successRate ?? 0}%`,
      icon: TrendingUp,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      textColor: 'text-violet-700',
    },
  ]

  // Build bar chart data for before/after comparison
  const barChartData = beforeAfter.map((item) => ({
    name: item.studentName,
    'قبل العلاج': item.before,
    'بعد العلاج': item.after,
    improved: item.improved,
  }))

  // Build pie data for plans by status with Arabic labels
  const statusLabels: Record<string, string> = {
    active: 'نشطة',
    completed: 'مكتملة',
    pending: 'معلقة',
    cancelled: 'ملغاة',
    on_hold: 'موقوفة',
  }

  const statusPieData = plansByStatus.map((item) => ({
    name: statusLabels[item.status] ?? item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] ?? '#94a3b8',
  }))

  const priorityLabels: Record<string, string> = {
    critical: 'حرج',
    high: 'مرتفعة',
    medium: 'متوسطة',
    low: 'منخفضة',
  }

  const priorityPieData = plansByPriority.map((item) => ({
    name: priorityLabels[item.priority] ?? item.priority,
    value: item.count,
    fill: PRIORITY_COLORS[item.priority] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6" dir="rtl">
      {/* Section 1: Treatment Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => {
          const IconComp = card.icon
          return (
            <div
              key={card.label}
              className="glass-card relative overflow-hidden p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className={`mt-1.5 text-2xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                  <IconComp className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Section 2: Before/After Comparison */}
      <section className="glass-card flex flex-col p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">مقارنة قبل وبعد العلاج</h2>
            <p className="text-xs text-muted">عدد المخالفات قبل وبعد تطبيق خطة العلاج لكل طالب</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              قبل العلاج
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              بعد العلاج
            </span>
          </div>
        </header>
        <div className="h-[320px] w-full">
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dy={10}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="قبل العلاج"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                  name="قبل العلاج"
                />
                <Bar
                  dataKey="بعد العلاج"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                  name="بعد العلاج"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">لا توجد بيانات مقارنة متاحة</p>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Plans by Status + Plans by Priority */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plans by Status Pie */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">الخطط حسب الحالة</h2>
            <p className="text-xs text-muted">توزيع خطط العلاج حسب حالتها الحالية</p>
          </header>
          <div className="flex h-[280px] items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell
                        key={`status-${index}`}
                        fill={entry.fill}
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
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm">لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>
        </section>

        {/* Plans by Priority Pie */}
        <section className="glass-card flex flex-col p-6">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">الخطط حسب الأولوية</h2>
            <p className="text-xs text-muted">توزيع خطط العلاج حسب مستوى الأولوية</p>
          </header>
          <div className="flex h-[280px] items-center justify-center">
            {priorityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell
                        key={`priority-${index}`}
                        fill={entry.fill}
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
              <div className="flex h-full flex-col items-center justify-center text-slate-400">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm">لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Section 4: Attendance Correlation */}
      <section className="glass-card flex flex-col p-6">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ربط الحضور بالسلوك</h2>
              <p className="text-xs text-muted">تحليل العلاقة بين الغياب والمخالفات السلوكية</p>
            </div>
          </div>
        </header>

        {/* Correlation Strength Badge + Coefficient */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">قوة الارتباط:</span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${correlationConfig.badgeClass}`}
            >
              {correlationConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">معامل الارتباط:</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-800">
              {correlationValue.toFixed(3)}
            </span>
          </div>
          <p className="w-full text-xs text-slate-500 md:w-auto">{correlationConfig.description}</p>
        </div>

        {/* Scatter Chart */}
        <div className="h-[350px] w-full">
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="absenceRate"
                  type="number"
                  name="نسبة الغياب"
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{
                    value: 'نسبة الغياب (%)',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fill: '#475569', fontSize: 12, fontWeight: 500 },
                  }}
                />
                <YAxis
                  dataKey="violations"
                  type="number"
                  name="المخالفات"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  allowDecimals={false}
                  label={{
                    value: 'عدد المخالفات',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    style: { fill: '#475569', fontSize: 12, fontWeight: 500 },
                  }}
                />
                <ZAxis
                  dataKey="lateCount"
                  type="number"
                  range={[40, 400]}
                  name="التأخر"
                />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter
                  name="الطلاب"
                  data={scatterData}
                  fill="#6366f1"
                  fillOpacity={0.7}
                  strokeWidth={1}
                  stroke="#4f46e5"
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <Users className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">لا توجد بيانات ارتباط متاحة</p>
            </div>
          )}
        </div>
      </section>

      {/* Section 5: High Risk Students Table */}
      {highRiskStudents.length > 0 && (
        <section className="glass-card flex flex-col p-6">
          <header className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">طلاب عالي المخاطر</h2>
              <p className="text-xs text-muted">
                الطلاب الذين يعانون من نسبة غياب مرتفعة ومخالفات سلوكية متكررة
              </p>
            </div>
          </header>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    الطالب
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    الصف
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    نسبة الغياب
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    المخالفات
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    التأخر
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highRiskStudents.map((student, index) => (
                  <tr
                    key={`${student.name}-${index}`}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.grade}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          student.absenceRate >= 20
                            ? 'bg-red-100 text-red-700'
                            : student.absenceRate >= 10
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.absenceRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          student.violations >= 5
                            ? 'bg-red-100 text-red-700'
                            : student.violations >= 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.violations}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          student.lateCount >= 5
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {student.lateCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
