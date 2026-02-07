import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  ClipboardList,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  fetchBehaviorAnalytics,
  fetchAvailableFilters,
} from '@/modules/admin/behavior/api'
import type { AnalyticsFilterParams } from '@/modules/admin/behavior/api'

import AnalyticsFilterBar from '@/modules/admin/behavior/components/analytics/AnalyticsFilterBar'
import OverviewTab from '@/modules/admin/behavior/components/analytics/OverviewTab'
import ViolationsAnalysisTab from '@/modules/admin/behavior/components/analytics/ViolationsAnalysisTab'
import StudentsTab from '@/modules/admin/behavior/components/analytics/StudentsTab'
import EvaluationsTab from '@/modules/admin/behavior/components/analytics/EvaluationsTab'
import TreatmentEffectivenessTab from '@/modules/admin/behavior/components/analytics/TreatmentEffectivenessTab'
import AIInsightsTab from '@/modules/admin/behavior/components/analytics/AIInsightsTab'

const DEFAULT_FILTERS: AnalyticsFilterParams = {
  period: 'month',
}

export function AdminBehaviorAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilterParams>(DEFAULT_FILTERS)
  const [activeTab, setActiveTab] = useState('overview')

  const handleFiltersChange = useCallback((newFilters: AnalyticsFilterParams) => {
    setFilters(newFilters)
  }, [])

  // Main analytics data (for overview + violations tabs)
  const { data, isLoading } = useQuery({
    queryKey: ['behavior-analytics', filters],
    queryFn: () => fetchBehaviorAnalytics(filters),
  })

  // Available filters (grades + classes)
  const { data: availableFilters } = useQuery({
    queryKey: ['behavior-available-filters', filters.grade],
    queryFn: () => fetchAvailableFilters(filters.grade),
  })

  const stats = data?.summary ?? {
    totalViolations: 0,
    avgScore: 100,
    improvementRate: 0,
    committedStudents: 0,
    totalStudents: 0,
    studentsWithViolations: 0,
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">مؤشرات السلوك</h1>
        <p className="text-sm text-muted">
          لوحة تحليلية شاملة لرصد الاتجاهات السلوكية، قياس أثر البرامج، ومتابعة مؤشرات الأداء.
        </p>
      </header>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableGrades={availableFilters?.grades ?? []}
        availableClasses={availableFilters?.classNames ?? []}
      />

      {/* Summary Cards - Always visible */}
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
          title="إجمالي المخالفات"
          value={stats.totalViolations}
          trend={stats.improvementRate >= 0 ? 'تحسن' : 'تراجع'}
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
          trend={`${stats.totalStudents - stats.studentsWithViolations} من ${stats.totalStudents}`}
          trendUp={true}
          icon={<Users className="h-5 w-5" />}
          accent="bg-violet-500/10 text-violet-700 border-violet-200"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full justify-start overflow-x-auto bg-white/80 border rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="violations" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4" />
            تحليل المخالفات
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            الطلاب
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4" />
            التقييمات
          </TabsTrigger>
          <TabsTrigger value="treatment" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4" />
            البرامج والعلاج
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm">
            <Bot className="h-4 w-4" />
            رؤى ذكية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {data && <OverviewTab data={data} />}
        </TabsContent>

        <TabsContent value="violations" className="mt-6">
          {data && <ViolationsAnalysisTab data={data} />}
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentsTab filters={filters} activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="evaluations" className="mt-6">
          <EvaluationsTab filters={filters} activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="treatment" className="mt-6">
          <TreatmentEffectivenessTab filters={filters} activeTab={activeTab} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIInsightsTab activeTab={activeTab} />
        </TabsContent>
      </Tabs>
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-96 bg-slate-200 rounded" />
      </div>

      <div className="h-12 bg-slate-100 rounded-xl" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 w-32 bg-slate-200 rounded" />
                <div className="h-8 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-12 w-12 bg-slate-200 rounded-xl" />
            </div>
            <div className="mt-4 h-3 w-40 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      <div className="h-10 bg-slate-100 rounded-xl" />

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="mb-6 space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-60 bg-slate-200 rounded" />
            </div>
            <div className="h-[300px] bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
