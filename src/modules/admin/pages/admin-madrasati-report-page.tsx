import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import {
  BarChart3,
  Users,
  BookOpen,
  FileCheck,
  Sparkles,
  Activity,
  FileText,
  AlertTriangle,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useMadrasatiSchoolMetrics, useMadrasatiSubjects } from '../madrasati/hooks'
import type { MadrasatiTeacherRanking } from '../madrasati/types'

const CHART_COLORS = {
  green: '#10b981',
  red: '#f43f5e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
}

export function AdminMadrasatiReportPage() {
  const navigate = useNavigate()
  const [subjectFilter, setSubjectFilter] = useState<string>('')

  const { data: metrics, isLoading } = useMadrasatiSchoolMetrics({
    subject: subjectFilter || undefined,
  })

  const { data: subjects } = useMadrasatiSubjects()

  // بيانات رسم توزيع تغطية الفصل بين المعلمين
  const coverageDistribution = metrics
    ? (() => {
        const teachers = metrics.teacher_rankings.all_teachers
        const excellent = teachers.filter((t) => t.class_coverage >= 70).length
        const good = teachers.filter((t) => t.class_coverage >= 40 && t.class_coverage < 70).length
        const average = teachers.filter((t) => t.class_coverage >= 20 && t.class_coverage < 40).length
        const needsAttention = teachers.filter((t) => t.class_coverage < 20).length
        return [
          { name: 'ممتاز (≥70%)', value: excellent, color: CHART_COLORS.green },
          { name: 'جيد (40-69%)', value: good, color: CHART_COLORS.blue },
          { name: 'متوسط (20-39%)', value: average, color: CHART_COLORS.amber },
          { name: 'يحتاج متابعة (<20%)', value: needsAttention, color: CHART_COLORS.red },
        ].filter((d) => d.value > 0)
      })()
    : []

  // بيانات رسم أفضل المعلمين
  const topTeachersData = metrics?.teacher_rankings.top_performers.slice(0, 10).map((t) => ({
    name: t.teacher_name.split(' ').slice(0, 2).join(' '),
    score: t.score,
    fullName: t.teacher_name,
    teacherId: t.teacher_id,
  })) ?? []

  // حساب متوسط الدرجات
  const avgScore = topTeachersData.length > 0
    ? topTeachersData.reduce((sum, t) => sum + t.score, 0) / topTeachersData.length
    : 0

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">تقرير مدرستي</h1>
            <p className="text-sm text-slate-500">
              إحصائيات أداء المعلمين على منصة مدرستي
            </p>
          </div>
        </div>

        {/* فلترة المادة */}
        <div className="flex items-center gap-3">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">جميع المواد</option>
            {subjects?.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="المعلمين بواجبات"
          value={`${metrics?.homework_metrics.teachers_with_homework_percent ?? 0}%`}
          subtitle={`${metrics?.homework_metrics.teachers_with_homework ?? 0} من ${metrics?.overview.total_teachers ?? 0}`}
          icon={Users}
          color="emerald"
          trend={(metrics?.homework_metrics.teachers_with_homework_percent ?? 0) >= 80 ? 'up' : 'down'}
        />
        <StatCard
          title="تغطية الفصل"
          value={`${metrics?.homework_metrics.class_coverage ?? 0}%`}
          subtitle={`نسبة الطلاب المستفيدين من التصحيح`}
          icon={FileCheck}
          color="sky"
          trend={(metrics?.homework_metrics.class_coverage ?? 0) >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="كثافة التصحيح"
          value={`${metrics?.homework_metrics.correction_intensity ?? 0}`}
          subtitle={`متوسط طالب/واجب`}
          icon={Activity}
          color="violet"
        />
        <StatCard
          title="إجمالي الدروس"
          value={metrics?.overview.total_lessons ?? 0}
          subtitle="متزامنة + غير متزامنة"
          icon={BookOpen}
          color="amber"
        />
        <StatCard
          title="معدل الأنشطة"
          value={metrics?.activities_metrics.avg_per_teacher ?? 0}
          subtitle={`إجمالي ${metrics?.activities_metrics.total_activities ?? 0}`}
          icon={Sparkles}
          color="rose"
        />
        <StatCard
          title="معدل الاختبارات"
          value={metrics?.tests_metrics.avg_per_teacher ?? 0}
          subtitle={`إجمالي ${metrics?.tests_metrics.total_tests ?? 0}`}
          icon={FileText}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coverage Distribution Pie Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">توزيع تغطية الفصل</h2>
            <p className="text-xs text-slate-500">حالة المعلمين حسب نسبة تغطية طلابهم</p>
          </header>
          <div className="flex h-[300px] items-center justify-center">
            {coverageDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={coverageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {coverageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CoverageDistTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={FileCheck} message="لا توجد بيانات" />
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {coverageDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600">{item.name}: {item.value} معلم</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top Teachers Bar Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">أفضل 10 معلمين</h2>
              <p className="text-xs text-slate-500">حسب درجة الأداء الشاملة</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
              <span>المتوسط</span>
            </div>
          </header>
          <div className="h-[300px] w-full">
            {topTeachersData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTeachersData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip content={<TeacherScoreTooltip />} />
                  <ReferenceLine x={avgScore} stroke={CHART_COLORS.amber} strokeDasharray="5 5" strokeWidth={2} />
                  <Bar
                    dataKey="score"
                    radius={[0, 6, 6, 0]}
                    fill={CHART_COLORS.green}
                    cursor="pointer"
                    onClick={(data) => {
                      const payload = data as unknown as { teacherId?: string }
                      if (payload.teacherId) navigate(`/admin/madrasati-report/${payload.teacherId}`)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Users} message="لا توجد بيانات معلمين" />
            )}
          </div>
        </section>
      </div>

      {/* Inactive Teachers Alert */}
      {metrics && metrics.teacher_rankings.inactive_count > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800">
                {metrics.teacher_rankings.inactive_count} معلم بدون نشاط
              </h3>
              <p className="mt-1 text-xs text-amber-700">
                هؤلاء المعلمين ليس لديهم واجبات أو اختبارات أو أنشطة مسجلة
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {metrics.teacher_rankings.inactive_teachers.slice(0, 5).map((t) => (
                  <button
                    key={t.teacher_id}
                    onClick={() => navigate(`/admin/madrasati-report/${t.teacher_id}`)}
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-200"
                  >
                    {t.teacher_name}
                  </button>
                ))}
                {metrics.teacher_rankings.inactive_count > 5 && (
                  <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-600">
                    +{metrics.teacher_rankings.inactive_count - 5} آخرين
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      <section className="rounded-2xl border bg-white shadow-sm">
        <header className="border-b p-4">
          <h2 className="text-lg font-bold text-slate-900">جدول المعلمين</h2>
          <p className="text-xs text-slate-500">انقر على أي معلم لعرض تفاصيله</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-slate-600">المعلم</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">الطلاب</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">الواجبات</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">التصحيحات</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">تغطية الفصل</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">الاختبارات</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600">الأنشطة</th>
                <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.teacher_rankings.all_teachers.map((teacher) => (
                <TeacherTableRow
                  key={teacher.teacher_id}
                  teacher={teacher}
                  onClick={() => navigate(`/admin/madrasati-report/${teacher.teacher_id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {metrics?.teacher_rankings.all_teachers && metrics.teacher_rankings.all_teachers.length > 0 && (
          <div className="border-t p-4 text-center text-xs text-slate-500">
            إجمالي {metrics.teacher_rankings.all_teachers.length} معلم
          </div>
        )}
      </section>

      {/* Last Extraction Info */}
      {metrics?.last_extraction && (
        <div className="text-center text-xs text-slate-400">
          آخر تحديث للبيانات: {new Date(metrics.last_extraction).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  )
}

// --- Helper Components ---

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  color: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'blue'
  trend?: 'up' | 'down'
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    emerald: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
    sky: 'border-sky-200 bg-sky-500/10 text-sky-700',
    violet: 'border-violet-200 bg-violet-500/10 text-violet-700',
    amber: 'border-amber-200 bg-amber-500/10 text-amber-700',
    rose: 'border-rose-200 bg-rose-500/10 text-rose-700',
    blue: 'border-blue-200 bg-blue-500/10 text-blue-700',
  }

  return (
    <article className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend && (
          trend === 'up'
            ? <TrendingUp className="h-3 w-3 text-emerald-600" />
            : <TrendingDown className="h-3 w-3 text-rose-600" />
        )}
        <span className="font-medium text-slate-600">{subtitle}</span>
      </div>
    </article>
  )
}

function CoverageBadge({ coverage, status }: { coverage: number; status: MadrasatiTeacherRanking['coverage_status'] }) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses[status.color]}`}>
        {coverage}%
      </span>
      <span className="text-[10px] text-slate-400">{status.label}</span>
    </div>
  )
}

function TeacherTableRow({ teacher, onClick }: { teacher: MadrasatiTeacherRanking; onClick: () => void }) {
  return (
    <tr
      className="cursor-pointer transition hover:bg-slate-50"
      onClick={onClick}
    >
      <td className="whitespace-nowrap px-4 py-3">
        <div className="font-medium text-slate-900">{teacher.teacher_name}</div>
        <div className="text-xs text-slate-400">{teacher.subjects_count} مقرر</div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600">
        {teacher.students_count}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600">
        {teacher.homework_count}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <div className="text-sm font-medium text-slate-700">{teacher.homework_corrected}</div>
        <div className="text-[10px] text-slate-400">
          متوسط {teacher.correction_intensity} طالب/واجب
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <CoverageBadge coverage={teacher.class_coverage} status={teacher.coverage_status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600">
        {teacher.tests_count}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600">
        {teacher.activities_count}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-center">
        <ChevronLeft className="h-4 w-4 text-slate-400" />
      </td>
    </tr>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 rounded-2xl border bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[400px] rounded-2xl border bg-slate-100" />
        ))}
      </div>
      <div className="h-96 rounded-2xl border bg-slate-100" />
    </div>
  )
}

// --- Tooltip Components ---

function CoverageDistTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-1 text-sm font-semibold text-slate-900">{data.name}</p>
        <p className="text-xs text-slate-600">{data.value} معلم</p>
      </div>
    )
  }
  return null
}

function TeacherScoreTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-1 text-sm font-semibold text-slate-900">{data.fullName}</p>
        <p className="text-xs text-slate-600">درجة الأداء: <span className="font-bold">{data.score}</span></p>
      </div>
    )
  }
  return null
}
