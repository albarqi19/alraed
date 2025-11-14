import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type {
  TeacherScheduleMovePreviewResult,
  TeacherScheduleMoveResolution,
  TeacherScheduleMoveSuggestion,
  TeacherScheduleConflictPriority,
  TeacherScheduleMoveSuggestionStep,
} from '../types'

const priorityLabels: Record<TeacherScheduleConflictPriority, string> = {
  P1: 'تعارض مانع',
  P2: 'تحذير',
  P3: 'توصية',
}

const priorityColors: Record<TeacherScheduleConflictPriority, string> = {
  P1: 'bg-rose-100 text-rose-800 border border-rose-200',
  P2: 'bg-amber-100 text-amber-800 border border-amber-200',
  P3: 'bg-sky-100 text-sky-800 border border-sky-200',
}

const strategyLabels: Record<string, string> = {
  single_swap: 'مبادلة مباشرة',
  chain_swap: 'سلسلة ذكية',
  delay: 'إعادة جدولة',
}

interface TeacherScheduleMoveDialogProps {
  open: boolean
  preview: TeacherScheduleMovePreviewResult | null
  isLoading?: boolean
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (resolution?: TeacherScheduleMoveResolution) => void
}

export function TeacherScheduleMoveDialog({
  open,
  preview,
  isLoading = false,
  onClose,
}: TeacherScheduleMoveDialogProps) {
  const directOption: TeacherScheduleMoveSuggestion | null = useMemo(() => {
    if (!preview) return null
    return {
      id: 'direct-move',
      title: preview.can_move ? 'نقل مباشر' : 'نقل مباشر (غير متاح)',
      description: preview.can_move
        ? 'سيتم نقل الحصة كما هي دون الحاجة لأي مبادلات.'
        : 'هناك تعارضات مانعة يجب حلها قبل النقل المباشر.',
      priority: preview.can_move ? 'P3' : 'P1',
      resolution: { mode: 'direct' },
      resolves_conflicts: preview.can_move,
    }
  }, [preview])

  const suggestions = useMemo(() => {
    if (!preview) return []
    const list: TeacherScheduleMoveSuggestion[] = []
    if (directOption) {
      list.push(directOption)
    }
    return [...list, ...preview.suggestions]
  }, [directOption, preview])

  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null)
  const [showBetaWarning, setShowBetaWarning] = useState(false)

  useEffect(() => {
    if (!preview) {
      setSelectedSuggestionId(null)
      return
    }
    if (preview.can_move) {
      setSelectedSuggestionId('direct-move')
      return
    }
    if (preview.suggestions.length > 0) {
      setSelectedSuggestionId(preview.suggestions[0].id)
    } else {
      setSelectedSuggestionId(null)
    }
  }, [preview])

  const hasBlockingConflicts = preview?.conflicts?.some((conflict) => conflict.priority === 'P1')

  const renderSuggestionSteps = (steps?: TeacherScheduleMoveSuggestionStep[]) => {
    if (!steps || steps.length === 0) return null

    return (
      <ul className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={`${step.session_id}-${index}`} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-xs">
            <div className="flex flex-row-reverse items-center justify-between">
              <span className="font-bold text-slate-900">
                الخطوة {index + 1}
              </span>
              <div className="flex flex-row-reverse items-center gap-2">
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                  {step.subject_name ?? 'حصة'}
                </span>
                {step.teacher_name && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {step.teacher_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-row-reverse items-center gap-2 text-slate-600">
              <span className="flex-1">
                الصف {step.grade}/{step.class_name}
              </span>
            </div>
            <div className="flex flex-row-reverse items-center gap-2">
              <span className="rounded bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                من: {step.from_day} • الحصة {step.from_period}
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                إلى: {step.to_day} • الحصة {step.to_period}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (!open) return null

  const handleBackdrop = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    onClose()
  }

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6"
      role="dialog"
      aria-modal
      onClick={handleBackdrop}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={handleContainerClick}
      >
        <header className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-1 text-right">
            <p className="text-xs font-semibold text-slate-500">نقل ذكي للحصة</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {preview?.source_session.subject_name ?? 'حصة'} إلى {preview?.target_slot.day} - الحصة {preview?.target_slot.period_number}
            </h2>
            {preview?.metrics ? (
              <p className="text-sm text-muted">
                سيصبح لدى {preview?.target_slot.teacher_name} {preview.metrics.teacher_day_load_after_move} حصص في هذا اليوم،
                والصف {preview?.source_session.grade}/{preview?.source_session.class_name} سيصل إلى {preview.metrics.class_day_load_after_move} حصص.
                {typeof preview.metrics.day_max_periods === 'number'
                  ? ` الحد الأعلى المعتمد ليوم ${preview.target_slot.day} هو ${preview.metrics.day_max_periods} حصص.`
                  : ''}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="absolute left-6 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="إغلاق"
            onClick={onClose}
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="flex max-h-[70vh] flex-col divide-y divide-slate-100 overflow-y-auto">
          <section className="space-y-4 px-6 py-5">
            <div className="rounded-2xl bg-slate-50 p-4 text-right text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">المعلم:</span> {preview?.target_slot.teacher_name}
              </p>
              <p>
                <span className="font-semibold text-slate-900">الحصة الحالية:</span> {preview?.source_session.day} - الحصة {preview?.source_session.period_number}
              </p>
              {preview?.target_slot.existing_session ? (
                <p className="text-rose-600">
                  هذه الحصة ستستبدل الحصة الحالية للصف {preview.target_slot.existing_session.grade}/{preview.target_slot.existing_session.class_name}.
                </p>
              ) : (
                <p className="text-emerald-600">الخانة المستهدفة فارغة لهذا المعلم.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-right">
                <h3 className="text-lg font-semibold text-slate-900">التعارضات والتوصيات</h3>
                {hasBlockingConflicts ? (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">يوجد تعارض مانع</span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">لا توجد تعارضات مانعة</span>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4">
                    <div className="flex flex-row-reverse items-center gap-3">
                      <div className="flex-1 space-y-2 text-right">
                        <p className="text-sm font-semibold text-teal-900">جارٍ التحليل الذكي للجدول...</p>
                        <p className="text-xs text-teal-700">
                          يقوم النظام بتحليل كامل الجدول المدرسي (1000+ حصة) باستخدام خوارزميات البرمجة القيدية للعثور على أفضل حلول النقل.
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center">
                        <svg className="h-8 w-8 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : preview && preview.conflicts.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {preview.conflicts.map((conflict) => (
                    <li key={`${conflict.code}-${conflict.priority}`} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                      <div className="flex flex-row-reverse items-center justify-between">
                        <p className="text-right text-slate-800">{conflict.message}</p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${priorityColors[conflict.priority]}`}>
                          {priorityLabels[conflict.priority]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-sm text-emerald-700">
                  لا توجد تعارضات في الوقت الحالي.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 px-6 py-5">
            <div className="flex items-center justify-between text-right">
              <h3 className="text-lg font-semibold text-slate-900">خيارات التنفيذ</h3>
              <p className="text-xs text-muted">اختر الطريقة الأنسب لمعالجة التعارضات</p>
            </div>
            <div className="grid gap-3">
              {suggestions.map((suggestion) => (
                <label
                  key={suggestion.id}
                  className={`flex flex-col gap-2 rounded-2xl border p-4 text-right transition ${
                    selectedSuggestionId === suggestion.id
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-teal-300'
                  } ${!suggestion.resolves_conflicts && suggestion.id === 'direct-move' ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-row-reverse items-start justify-between gap-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-base font-bold text-slate-900">{suggestion.title}</span>
                      {suggestion.strategy ? (
                        <div className="flex flex-row-reverse items-center gap-2 text-[11px]">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {strategyLabels[suggestion.strategy] ?? 'اقتراح ذكي'}
                          </span>
                          {typeof suggestion.metadata?.chain_length === 'number' ? (
                            <span className="text-slate-500">• {suggestion.metadata.chain_length} خطوة</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${priorityColors[suggestion.priority]}`}>
                      {priorityLabels[suggestion.priority]}
                    </span>
                  </div>
                  
                  {suggestion.steps?.length ? (
                    renderSuggestionSteps(suggestion.steps)
                  ) : (
                    <p className="text-sm text-slate-600">{suggestion.description}</p>
                  )}
                  
                  <div className="flex flex-row-reverse items-center gap-2 pt-2">
                    <input
                      type="radio"
                      className="h-4 w-4"
                      name="move-resolution"
                      checked={selectedSuggestionId === suggestion.id}
                      onChange={() => setSelectedSuggestionId(suggestion.id)}
                      disabled={suggestion.id === 'direct-move' && !preview?.can_move}
                    />
                    <span className="text-xs text-slate-600">
                      {suggestion.resolves_conflicts ? '✓ يعالج التعارض الحالي' : 'خيار مرن'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-right sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {hasBlockingConflicts
              ? 'لا يمكن نقل الحصة بدون معالجة التعارضات ذات الأولوية P1.'
              : 'بمجرد الموافقة سيتم تحديث جداول المعلمين والفصول فورًا.'}
          </div>
          <div className="flex flex-row-reverse gap-2">
            <button type="button" className="button-secondary" onClick={handleBackdrop}>
              إلغاء
            </button>
            <button
              type="button"
              className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowBetaWarning(true)}
            >
              اعتماد النقل
            </button>
          </div>
        </footer>
      </div>

      {/* Beta Warning Dialog */}
      {showBetaWarning && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setShowBetaWarning(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-row-reverse items-center gap-3">
              <div className="flex-1 text-right">
                <h3 className="text-xl font-bold text-amber-900">⚠️ تحت التجربة</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <span className="text-2xl">🚧</span>
              </div>
            </div>
            <p className="mb-6 text-right text-sm leading-relaxed text-slate-700">
              هذه الخدمة تحت التجربة حالياً. لا يمكن تطبيق النقل في الوقت الحالي، سيتم تفعيل الميزة بشكل كامل بعد اكتمال الاختبارات والتأكد من دقة النتائج.
            </p>
            <div className="flex flex-row-reverse gap-2">
              <button
                type="button"
                className="button-primary"
                onClick={() => setShowBetaWarning(false)}
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
