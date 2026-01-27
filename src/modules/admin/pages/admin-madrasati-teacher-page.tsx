import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  ArrowRight,
  User,
  BookOpen,
  FileCheck,
  FileText,
  Activity,
  Sparkles,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { useMadrasatiTeacherBenchmark } from '../madrasati/hooks'

const CHART_COLORS = {
  green: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  violet: '#8b5cf6',
}

export function AdminMadrasatiTeacherPage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useMadrasatiTeacherBenchmark(teacherId ?? '')

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <User className="h-8 w-8 text-rose-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">لم يتم العثور على بيانات المعلم</h2>
        <p className="mt-2 text-sm text-slate-500">تأكد من صحة رابط المعلم أو عد للقائمة</p>
        <button
          onClick={() => navigate('/admin/madrasati-report')}
          className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          العودة للتقرير
        </button>
      </div>
    )
  }

  const { teacher, score, benchmark, coverage_metrics } = data

  // بيانات المقارنة مع المتوسط
  const comparisonData = [
    {
      name: 'الواجبات',
      teacher: teacher.homework_count,
      average: benchmark.school_avg_homework,
    },
    {
      name: 'الاختبارات',
      teacher: teacher.tests_count,
      average: benchmark.school_avg_tests,
    },
    {
      name: 'الأنشطة',
      teacher: teacher.total_activities,
      average: benchmark.school_avg_activities,
    },
  ]

  // بيانات الرادار
  const radarData = [
    { subject: 'الواجبات', value: Math.min((teacher.homework_count / 50) * 100, 100), fullMark: 100 },
    { subject: 'التغطية', value: coverage_metrics.class_coverage, fullMark: 100 },
    { subject: 'الاختبارات', value: Math.min((teacher.tests_count / 20) * 100, 100), fullMark: 100 },
    { subject: 'الأنشطة', value: Math.min((teacher.total_activities / 20) * 100, 100), fullMark: 100 },
    { subject: 'الإثراءات', value: Math.min((teacher.enrichments_count / 30) * 100, 100), fullMark: 100 },
    { subject: 'التفاعل', value: Math.min(((teacher.discussion_topics + teacher.teacher_replies) / 20) * 100, 100), fullMark: 100 },
  ]

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/madrasati-report')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{teacher.teacher_name}</h1>
            <p className="text-sm text-slate-500">
              {teacher.subjects_count} مقرر | {teacher.students_count} طالب
            </p>
          </div>
        </div>

        {/* Performance Score Badge */}
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl px-4 py-2 ${
            benchmark.vs_average === 'above' ? 'bg-emerald-100' :
            benchmark.vs_average === 'below' ? 'bg-rose-100' : 'bg-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              {benchmark.vs_average === 'above' && <TrendingUp className="h-4 w-4 text-emerald-600" />}
              {benchmark.vs_average === 'below' && <TrendingDown className="h-4 w-4 text-rose-600" />}
              {benchmark.vs_average === 'equal' && <Minus className="h-4 w-4 text-slate-600" />}
              <span className={`text-sm font-bold ${
                benchmark.vs_average === 'above' ? 'text-emerald-700' :
                benchmark.vs_average === 'below' ? 'text-rose-700' : 'text-slate-700'
              }`}>
                {benchmark.vs_average === 'above' ? 'أعلى' :
                 benchmark.vs_average === 'below' ? 'أقل' : 'مساوٍ'} من المتوسط
                {benchmark.difference_percent !== 0 && ` بـ ${Math.abs(benchmark.difference_percent)}%`}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 px-4 py-2 text-white shadow-lg">
            <p className="text-xs font-medium opacity-80">درجة الأداء</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="الواجبات"
          value={teacher.homework_count}
          subtitle={`منشورة: ${teacher.homework_published}`}
          icon={FileCheck}
          color="emerald"
          benchmark={benchmark.school_avg_homework}
        />
        <StatCard
          title="كثافة التصحيح"
          value={coverage_metrics.correction_intensity}
          subtitle={`متوسط طالب/واجب`}
          icon={Activity}
          color="sky"
          benchmark={benchmark.school_avg_intensity}
        />
        <StatCard
          title="تغطية الفصل"
          value={`${coverage_metrics.class_coverage}%`}
          subtitle={`${coverage_metrics.coverage_status.label}`}
          icon={User}
          color="violet"
          benchmark={benchmark.school_avg_coverage}
          isBenchmarkPercent
        />
        <StatCard
          title="الاختبارات"
          value={teacher.tests_count}
          subtitle={`منشورة: ${teacher.tests_published}`}
          icon={FileText}
          color="amber"
          benchmark={benchmark.school_avg_tests}
        />
        <StatCard
          title="الأنشطة"
          value={teacher.total_activities}
          subtitle={`منشورة: ${teacher.activities_published}`}
          icon={Sparkles}
          color="rose"
          benchmark={benchmark.school_avg_activities}
        />
        <StatCard
          title="الإثراءات"
          value={teacher.enrichments_count}
          subtitle={`تفاعل: ${teacher.discussion_topics + teacher.teacher_replies}`}
          icon={MessageCircle}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comparison Bar Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">مقارنة مع متوسط المدرسة</h2>
            <p className="text-xs text-slate-500">أداء المعلم مقارنة بمتوسط زملائه</p>
          </header>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<ComparisonTooltip />} />
                <Bar dataKey="teacher" name="المعلم" fill={CHART_COLORS.green} radius={[6, 6, 0, 0]} />
                <Bar dataKey="average" name="متوسط المدرسة" fill={CHART_COLORS.amber} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: CHART_COLORS.green }} />
              <span className="text-slate-600">المعلم</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded" style={{ backgroundColor: CHART_COLORS.amber }} />
              <span className="text-slate-600">متوسط المدرسة</span>
            </div>
          </div>
        </section>

        {/* Radar Chart */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">ملف الأداء الشامل</h2>
            <p className="text-xs text-slate-500">توزيع الجهد على مختلف المجالات</p>
          </header>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar
                  name="الأداء"
                  dataKey="value"
                  stroke={CHART_COLORS.green}
                  fill={CHART_COLORS.green}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Subjects Accordion */}
      <section className="rounded-2xl border bg-white shadow-sm">
        <header className="border-b p-4">
          <h2 className="text-lg font-bold text-slate-900">تفاصيل المقررات</h2>
          <p className="text-xs text-slate-500">إحصائيات كل مقرر على حدة</p>
        </header>
        <div className="divide-y">
          {teacher.subjects.map((subject) => (
            <SubjectAccordion key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      {/* Extraction Info */}
      <div className="text-center text-xs text-slate-400">
        تاريخ استخراج البيانات: {new Date(teacher.extracted_at).toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
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
  benchmark?: number
  isBenchmarkPercent?: boolean
}

function StatCard({ title, value, subtitle, icon: Icon, color, benchmark, isBenchmarkPercent }: StatCardProps) {
  const colorClasses = {
    emerald: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
    sky: 'border-sky-200 bg-sky-500/10 text-sky-700',
    violet: 'border-violet-200 bg-violet-500/10 text-violet-700',
    amber: 'border-amber-200 bg-amber-500/10 text-amber-700',
    rose: 'border-rose-200 bg-rose-500/10 text-rose-700',
    blue: 'border-blue-200 bg-blue-500/10 text-blue-700',
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const isAbove = benchmark !== undefined && numValue > benchmark
  const isBelow = benchmark !== undefined && numValue < benchmark

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
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{subtitle}</span>
        {benchmark !== undefined && (
          <span className={`flex items-center gap-1 font-medium ${
            isAbove ? 'text-emerald-600' : isBelow ? 'text-rose-600' : 'text-slate-500'
          }`}>
            {isAbove && <TrendingUp className="h-3 w-3" />}
            {isBelow && <TrendingDown className="h-3 w-3" />}
            <span>م: {benchmark}{isBenchmarkPercent ? '%' : ''}</span>
          </span>
        )}
      </div>
    </article>
  )
}

function SubjectAccordion({ subject }: { subject: any }) {
  const [isOpen, setIsOpen] = useState(false)

  // استخراج اسم المادة من الاسم الكامل
  const subjectName = subject.subject_name.split(' - ').pop() || subject.subject_name

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-right transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{subjectName}</p>
            <p className="text-xs text-slate-500">{subject.students_count} طالب</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden gap-4 text-xs sm:flex">
            <span className="text-slate-500">واجبات: <span className="font-semibold text-slate-700">{subject.homework_count}</span></span>
            <span className="text-slate-500">اختبارات: <span className="font-semibold text-slate-700">{subject.tests_count}</span></span>
            <span className="text-slate-500">أنشطة: <span className="font-semibold text-slate-700">{subject.total_activities}</span></span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="border-t bg-slate-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">الواجبات</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{subject.homework_count}</p>
              <p className="text-xs text-slate-400">منشورة: {subject.homework_published} | مصححة: {subject.lesson_homework_corrected}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">الاختبارات</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{subject.tests_count}</p>
              <p className="text-xs text-slate-400">منشورة: {subject.tests_published}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">الأنشطة</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{subject.total_activities}</p>
              <p className="text-xs text-slate-400">منشورة: {subject.activities_published}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">الإثراءات</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{subject.enrichments_count}</p>
              <p className="text-xs text-slate-400">دروس: {subject.sync_lessons + subject.async_lessons}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 rounded-2xl border bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[360px] rounded-2xl border bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border bg-slate-100" />
    </div>
  )
}

// --- Tooltip Components ---

function ComparisonTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5">
        <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded" style={{ backgroundColor: entry.fill }} />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
