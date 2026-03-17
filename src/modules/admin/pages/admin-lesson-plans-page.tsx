import { useState, useEffect } from 'react'
import clsx from 'classnames'
import { BookOpenCheck, Filter, ChevronLeft, Loader2 } from 'lucide-react'
import { useLessonPlans, useLessonPlanStats } from '../lesson-plans/hooks'
import { PlanReviewSheet } from '../lesson-plans/components/plan-review-sheet'
import type { AdminWeeklyLessonPlan } from '../lesson-plans/types'
import { STATUS_LABELS, STATUS_COLORS } from '../lesson-plans/types'

// ═══════════ hooks for weeks ═══════════
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'

function useAcademicWeeks() {
  return useQuery({
    queryKey: ['admin', 'lesson-plans', 'weeks'],
    queryFn: async () => {
      // إعادة استخدام نفس endpoint المعلم (بنفس الـ middleware)
      const { data } = await apiClient.get<
        ApiResponse<Array<{ id: number; week_number: number; start_date: string; date_range: string; is_current: boolean }>>
      >('/teacher/lesson-plans/weeks')
      if (!data.success) return []
      return data.data ?? []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ═══════════ الصفحة الرئيسية ═══════════

export function AdminLessonPlansPage() {
  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [reviewPlan, setReviewPlan] = useState<AdminWeeklyLessonPlan | null>(null)
  const [page, setPage] = useState(1)

  const { data: weeks } = useAcademicWeeks()

  useEffect(() => {
    if (weeks?.length && !selectedWeekId) {
      const current = weeks.find((w) => w.is_current)
      if (current) { setSelectedWeekId(current.id); return }
      const today = new Date().toISOString().slice(0, 10)
      const upcoming = weeks.find((w) => w.start_date > today)
      if (upcoming) { setSelectedWeekId(upcoming.id); return }
      setSelectedWeekId(weeks[weeks.length - 1]?.id)
    }
  }, [weeks, selectedWeekId])

  const { data: stats } = useLessonPlanStats(selectedWeekId)
  const { data: plansData, isLoading } = useLessonPlans({
    academic_week_id: selectedWeekId,
    status: statusFilter || undefined,
    page,
  })

  const plans = plansData?.data ?? []
  const selectedWeek = weeks?.find((w) => w.id === selectedWeekId)

  return (
    <section className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-xl font-bold text-slate-900">الخطط الأسبوعية</h1>
        <p className="text-sm text-muted">مراجعة واعتماد خطط المعلمين</p>
      </header>

      {/* Week Selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {weeks?.map((week) => (
          <button
            key={week.id}
            type="button"
            onClick={() => { setSelectedWeekId(week.id); setPage(1) }}
            className={clsx(
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition',
              week.id === selectedWeekId
                ? 'bg-cyan-600 text-white'
                : week.is_current
                  ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            أسبوع {week.week_number}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="الإجمالي" value={stats.total} color="bg-slate-100 text-slate-700" />
          <StatCard label="بانتظار الاعتماد" value={stats.pending_approval} color="bg-amber-100 text-amber-700" />
          <StatCard label="معتمد" value={stats.approved} color="bg-green-100 text-green-700" />
          <StatCard label="مرفوض" value={stats.rejected} color="bg-red-100 text-red-700" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none"
        >
          <option value="">جميع الحالات</option>
          <option value="draft">مسودة</option>
          <option value="teacher_approved">بانتظار الاعتماد</option>
          <option value="admin_approved">معتمد</option>
          <option value="rejected">مرفوض</option>
        </select>

        {selectedWeek && (
          <span className="text-xs text-muted">
            {selectedWeek.date_range}
          </span>
        )}
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
          <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">لا توجد خطط لهذا الأسبوع</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setReviewPlan(plan)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-right transition hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
                <BookOpenCheck className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{plan.subject?.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {plan.grade}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted">{plan.teacher?.name}</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      STATUS_COLORS[plan.status],
                    )}
                  >
                    {STATUS_LABELS[plan.status]}
                  </span>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {plansData && plansData.last_page > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: plansData.last_page }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={clsx(
                'rounded-lg px-3 py-1 text-xs font-medium transition',
                p === page ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Review Sheet */}
      {reviewPlan && (
        <PlanReviewSheet plan={reviewPlan} onClose={() => setReviewPlan(null)} />
      )}
    </section>
  )
}

// ═══════════ بطاقة إحصائية ═══════════

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={clsx('rounded-xl p-3 text-center', color)}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px]">{label}</p>
    </div>
  )
}
