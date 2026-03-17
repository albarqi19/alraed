import { useState, useEffect } from 'react'
import clsx from 'classnames'
import { BookOpenCheck, ChevronLeft } from 'lucide-react'
import { useMySubjectsForPlanning, useWeeks, useWeekPlans } from '../lesson-plans/hooks'
import { WeekSelector } from '../lesson-plans/components/week-selector'
import { PlanEditorSheet } from '../lesson-plans/components/plan-editor-sheet'
import type { TeacherPlanSubject, WeeklyLessonPlan } from '../lesson-plans/types'
import { STATUS_LABELS, STATUS_COLORS } from '../lesson-plans/types'

export function TeacherLessonPlansPage() {
  const { data: subjects, isLoading: loadingSubjects } = useMySubjectsForPlanning()
  const { data: weeks, isLoading: loadingWeeks } = useWeeks()

  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>()
  const [editorSubject, setEditorSubject] = useState<TeacherPlanSubject | null>(null)

  // تحديد الأسبوع الحالي تلقائياً
  useEffect(() => {
    if (weeks?.length && !selectedWeekId) {
      const currentWeek = weeks.find((w) => w.is_current)
      setSelectedWeekId(currentWeek?.id ?? weeks[0]?.id)
    }
  }, [weeks, selectedWeekId])

  const { data: weekPlans } = useWeekPlans(selectedWeekId)

  // البحث عن خطة لمادة معينة
  const findPlanForSubject = (subjectId: number, grade: string): WeeklyLessonPlan | null => {
    return weekPlans?.find((p) => p.subject_id === subjectId && p.grade === grade) ?? null
  }

  const isLoading = loadingSubjects || loadingWeeks

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">الخطط الأسبوعية</h1>
        <p className="text-xs text-muted">إعداد واعتماد خطط الدروس الأسبوعية</p>
      </header>

      {/* Week Selector */}
      {loadingWeeks ? (
        <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ) : weeks?.length ? (
        <WeekSelector
          weeks={weeks}
          selectedWeekId={selectedWeekId}
          onSelect={setSelectedWeekId}
        />
      ) : (
        <div className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-700">
          لا توجد أسابيع دراسية في الفصل الحالي
        </div>
      )}

      {/* Subject Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : !subjects?.length ? (
        <div className="glass-card text-center">
          <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">لا توجد مواد مسجلة</p>
          <p className="text-xs text-muted">تأكد من وجود جدول حصص مُسند إليك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => {
            const plan = selectedWeekId ? findPlanForSubject(subject.subject_id, subject.grade) : null

            return (
              <button
                key={`${subject.subject_id}-${subject.grade}`}
                type="button"
                onClick={() => setEditorSubject(subject)}
                disabled={!selectedWeekId}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-right transition-all',
                  'hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-600/5',
                  'disabled:opacity-50',
                  plan ? 'border-slate-200' : 'border-dashed border-slate-300',
                )}
              >
                {/* Icon */}
                <div
                  className={clsx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    subject.has_curriculum ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400',
                  )}
                >
                  <BookOpenCheck className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{subject.subject_name}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {subject.grade}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {plan ? (
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          STATUS_COLORS[plan.status],
                        )}
                      >
                        {STATUS_LABELS[plan.status]}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted">
                        {subject.has_curriculum ? 'لم تُعد الخطة بعد' : 'لا يوجد توزيع منهج'}
                      </span>
                    )}
                    {subject.sessions_per_week > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {subject.sessions_per_week} حصص/أسبوع
                      </span>
                    )}
                  </div>
                </div>

                <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            )
          })}
        </div>
      )}

      {/* Plan Editor Sheet */}
      {editorSubject && selectedWeekId && (
        <PlanEditorSheet
          subject={editorSubject}
          weekId={selectedWeekId}
          existingPlan={findPlanForSubject(editorSubject.subject_id, editorSubject.grade)}
          onClose={() => setEditorSubject(null)}
        />
      )}
    </section>
  )
}
