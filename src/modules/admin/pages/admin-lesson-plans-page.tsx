import { useState, useMemo } from 'react'
import clsx from 'classnames'
import { BookOpenCheck, CheckCircle2, Loader2, X, ChevronDown } from 'lucide-react'
import { useWeeksSummary, useWeekTeachers, useApprovePlanMutation, useApproveAllMutation } from '../lesson-plans/hooks'
import type { WeekSummary, TeacherWeekPlan } from '../lesson-plans/api'

const STATUS_COLORS: Record<string, string> = {
  not_submitted: 'bg-slate-100 text-slate-400',
  draft: 'bg-gray-100 text-gray-600',
  teacher_approved: 'bg-amber-100 text-amber-700',
  admin_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  not_submitted: 'لم تُقدم',
  draft: 'مسودة',
  teacher_approved: 'بانتظار',
  admin_approved: 'معتمد',
  rejected: 'مرفوض',
}

export function AdminLessonPlansPage() {
  const { data: weeks, isLoading } = useWeeksSummary()
  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>()

  // ترتيب: الحالي/المستقبلي أولاً، ثم الماضي بالعكس
  const sortedWeeks = useMemo(() => {
    if (!weeks?.length) return []
    const today = new Date().toISOString().slice(0, 10)

    const upcoming = weeks.filter((w) => w.end_date >= today).sort((a, b) => a.week_number - b.week_number)
    const past = weeks.filter((w) => w.end_date < today).sort((a, b) => b.week_number - a.week_number)

    return [...upcoming, ...past]
  }, [weeks])

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">الخطط الأسبوعية</h1>
        <p className="text-sm text-muted">متابعة واعتماد خطط المعلمين</p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : sortedWeeks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">لا توجد أسابيع في الفصل الحالي</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedWeeks.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              onOpen={() => setSelectedWeekId(week.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedWeekId && (
        <WeekDetailModal
          weekId={selectedWeekId}
          week={weeks?.find((w) => w.id === selectedWeekId)}
          onClose={() => setSelectedWeekId(undefined)}
        />
      )}
    </section>
  )
}

// ═══════════ بطاقة الأسبوع ═══════════

function WeekCard({ week, onOpen }: { week: WeekSummary; onOpen: () => void }) {
  const hasPlans = week.plans_count > 0
  const allApproved = hasPlans && week.approved_count === week.plans_count
  const hasPending = week.pending_count > 0

  // لون الشريط الجانبي
  const barColor = allApproved
    ? 'bg-green-500'
    : hasPending
      ? 'bg-amber-500'
      : hasPlans
        ? 'bg-cyan-500'
        : 'bg-slate-300'

  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-right transition-all',
        'hover:shadow-md hover:border-cyan-200',
        week.is_current && 'ring-2 ring-cyan-500/20',
        week.is_past && 'opacity-75',
      )}
    >
      {/* شريط جانبي ملون */}
      <div className={clsx('h-12 w-1.5 shrink-0 rounded-full', barColor)} />

      {/* المعلومات */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">الأسبوع {week.week_number}</span>
          {week.is_current && (
            <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700">الحالي</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted">{week.date_range}</p>
      </div>

      {/* الإحصائيات */}
      <div className="flex items-center gap-2 shrink-0">
        {hasPlans ? (
          <div className="flex items-center gap-1.5">
            <span className={clsx(
              'rounded-lg px-2 py-1 text-xs font-bold',
              allApproved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700',
            )}>
              {week.approved_count}/{week.plans_count}
            </span>
            {hasPending && (
              <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                {week.pending_count} بانتظار
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">لا توجد خطط</span>
        )}
        <ChevronDown className="h-4 w-4 text-slate-300 -rotate-90 rtl:rotate-90" />
      </div>
    </button>
  )
}

// ═══════════ نافذة تفاصيل الأسبوع ═══════════

function WeekDetailModal({
  weekId,
  week,
  onClose,
}: {
  weekId: number
  week: WeekSummary | undefined
  onClose: () => void
}) {
  const { data: teachers, isLoading } = useWeekTeachers(weekId)
  const approveMutation = useApprovePlanMutation()
  const approveAllMutation = useApproveAllMutation()

  const pendingCount = teachers?.reduce((sum, t) => sum + t.pending_count, 0) ?? 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              الأسبوع {week?.week_number}
            </h2>
            <p className="text-xs text-muted">{week?.date_range}</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => approveAllMutation.mutate(weekId)}
                disabled={approveAllMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveAllMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                اعتماد الجميع ({pendingCount})
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : !teachers?.length ? (
            <div className="py-10 text-center">
              <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">لا توجد خطط مقدمة لهذا الأسبوع</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <TeacherRow
                  key={teacher.teacher_id}
                  teacher={teacher}
                  onApprove={(planId) => approveMutation.mutate(planId)}
                  isApproving={approveMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════ صف المعلم ═══════════

function TeacherRow({
  teacher,
  onApprove,
  isApproving,
}: {
  teacher: TeacherWeekPlan
  onApprove: (planId: number) => void
  isApproving: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const allApproved = teacher.submitted_count > 0 && teacher.approved_count === teacher.total_subjects
  const hasPending = teacher.pending_count > 0
  const noneSubmitted = teacher.submitted_count === 0

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      allApproved ? 'border-green-200 bg-green-50/30' : noneSubmitted ? 'border-slate-200 bg-slate-50/30' : 'border-slate-200 bg-white',
    )}>
      {/* المعلم */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3.5"
      >
        {/* أيقونة الحالة */}
        <div className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          allApproved ? 'bg-green-100 text-green-600' : hasPending ? 'bg-amber-100 text-amber-600' : noneSubmitted ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500',
        )}>
          {allApproved ? '✓' : teacher.total_subjects}
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-semibold text-slate-900">{teacher.teacher_name}</p>
          <p className="text-[11px] text-muted">
            {teacher.plans.map((p) => p.subject_name).join(' • ')}
          </p>
        </div>

        {/* حالة + زر اعتماد */}
        <div className="flex items-center gap-2 shrink-0">
          {hasPending && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                teacher.plans
                  .filter((p) => p.status === 'teacher_approved' && p.id)
                  .forEach((p) => onApprove(p.id!))
              }}
              disabled={isApproving}
              className="rounded-lg bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              اعتماد
            </button>
          )}
          <span className={clsx(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            allApproved ? 'bg-green-100 text-green-700' : noneSubmitted ? 'bg-slate-100 text-slate-400' : hasPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
          )}>
            {allApproved ? 'معتمد' : noneSubmitted ? 'لم تُقدم' : `${teacher.submitted_count}/${teacher.total_subjects}`}
          </span>
          <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* تفاصيل الخطط */}
      {expanded && (
        <div className="border-t px-3.5 py-3 space-y-2">
          {teacher.plans.map((plan, idx) => (
            <div key={plan.id ?? `ns-${idx}`} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{plan.subject_name}</span>
                  <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] text-slate-500">{plan.grade}</span>
                </div>
                <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[plan.status])}>
                  {STATUS_LABELS[plan.status]}
                </span>
              </div>
              {plan.status === 'not_submitted' ? (
                <p className="text-[11px] text-slate-400 mt-1">لم يقدم المعلم خطة لهذه المادة</p>
              ) : (
                plan.sessions.map((s) => (
                  <div key={s.session_number} className="flex items-start gap-2 mt-1.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[9px] font-bold text-cyan-700 mt-0.5">
                      {s.session_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-700">{s.topic || '—'}</p>
                      {s.homework && <p className="text-[10px] text-cyan-600">الواجب: {s.homework}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
