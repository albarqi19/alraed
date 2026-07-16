import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { WsBtn, WsChip, WsSpinner } from '@/shared/workspace'
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

const priorityTones: Record<TeacherScheduleConflictPriority, { bg: string; bd: string; tx: string }> = {
  P1: { bg: 'var(--ws-red-bg)', bd: 'var(--ws-red-bd)', tx: 'var(--ws-red)' },
  P2: { bg: 'var(--ws-amber-bg)', bd: 'var(--ws-amber-bd)', tx: 'var(--ws-amber)' },
  P3: { bg: 'var(--ws-sky-bg)', bd: 'var(--ws-sky-bd)', tx: 'var(--ws-sky)' },
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

function PriorityChip({ priority }: { priority: TeacherScheduleConflictPriority }) {
  const tone = priorityTones[priority]
  return (
    <span
      className="ws-chip"
      style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx, flexShrink: 0 }}
    >
      {priorityLabels[priority]}
    </span>
  )
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
        {steps.map((step, index) => (
          <div
            key={`${step.session_id}-${index}`}
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: '6px 10px',
              background: 'var(--ws-surface)',
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>الخطوة {index + 1}</span>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                <WsChip tone="green">{step.subject_name ?? 'حصة'}</WsChip>
                {step.teacher_name ? <WsChip>{step.teacher_name}</WsChip> : null}
              </span>
            </div>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
              الصف {step.grade}/{step.class_name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 10 }}>
              <span
                style={{
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontWeight: 600,
                  background: 'var(--ws-red-bg)',
                  color: 'var(--ws-red)',
                }}
              >
                من: {step.from_day} • الحصة {step.from_period}
              </span>
              <span style={{ color: 'var(--ws-text-2)' }}>←</span>
              <span
                style={{
                  borderRadius: 5,
                  padding: '2px 7px',
                  fontWeight: 600,
                  background: 'var(--ws-green-bg)',
                  color: 'var(--ws-green)',
                }}
              >
                إلى: {step.to_day} • الحصة {step.to_period}
              </span>
            </div>
          </div>
        ))}
      </div>
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
    <div className="ws-modal" role="dialog" aria-modal onClick={handleBackdrop}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={handleContainerClick}
      >
        <header className="ws-modal__head" style={{ position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--ws-accent-2)' }}>
            <ArrowLeftRight style={{ width: 12, height: 12 }} />
            نقل ذكي للحصة
          </span>
          <h3 className="ws-modal__title" style={{ fontSize: 15 }}>
            {preview?.source_session.subject_name ?? 'حصة'} إلى {preview?.target_slot.day} - الحصة{' '}
            {preview?.target_slot.period_number}
          </h3>
          {preview?.metrics ? (
            <p className="ws-modal__sub">
              سيصبح لدى {preview?.target_slot.teacher_name} {preview.metrics.teacher_day_load_after_move} حصص في هذا
              اليوم، والصف {preview?.source_session.grade}/{preview?.source_session.class_name} سيصل إلى{' '}
              {preview.metrics.class_day_load_after_move} حصص.
              {typeof preview.metrics.day_max_periods === 'number'
                ? ` الحد الأعلى المعتمد ليوم ${preview.target_slot.day} هو ${preview.metrics.day_max_periods} حصص.`
                : ''}
            </p>
          ) : null}
          <button
            type="button"
            className="ws-icon-btn"
            style={{ position: 'absolute', insetInlineEnd: 12, top: 10 }}
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X />
          </button>
        </header>

        <div className="ws-modal__body" style={{ overflowY: 'auto', maxHeight: '62vh' }}>
          {/* ملخص المصدر والهدف */}
          <div
            style={{
              borderRadius: 8,
              border: '1px solid var(--ws-hairline)',
              background: 'var(--ws-surface-2)',
              padding: '9px 12px',
              fontSize: 11.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <span>
              <b>المعلم:</b> {preview?.target_slot.teacher_name}
            </span>
            <span>
              <b>الحصة الحالية:</b> {preview?.source_session.day} - الحصة {preview?.source_session.period_number}
            </span>
            {preview?.target_slot.existing_session ? (
              <span style={{ color: 'var(--ws-red)' }}>
                هذه الحصة ستستبدل الحصة الحالية للصف {preview.target_slot.existing_session.grade}/
                {preview.target_slot.existing_session.class_name}.
              </span>
            ) : (
              <span style={{ color: 'var(--ws-green)' }}>الخانة المستهدفة فارغة لهذا المعلم.</span>
            )}
          </div>

          {/* التعارضات */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>التعارضات والتوصيات</span>
              {hasBlockingConflicts ? (
                <WsChip tone="red">يوجد تعارض مانع</WsChip>
              ) : (
                <WsChip tone="green">لا توجد تعارضات مانعة</WsChip>
              )}
            </div>

            {isLoading ? (
              <div
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--ws-accent-bd, var(--ws-hairline))',
                  background: 'var(--ws-accent-soft)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <WsSpinner />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>جارٍ التحليل الذكي للجدول...</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    يقوم النظام بتحليل كامل الجدول المدرسي باستخدام خوارزميات البرمجة القيدية للعثور على أفضل حلول
                    النقل.
                  </span>
                </span>
              </div>
            ) : preview && preview.conflicts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {preview.conflicts.map((conflict) => {
                  const tone = priorityTones[conflict.priority]
                  return (
                    <div
                      key={`${conflict.code}-${conflict.priority}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        borderRadius: 8,
                        border: `1px solid ${tone.bd}`,
                        background: tone.bg,
                        padding: '7px 10px',
                        fontSize: 11.5,
                      }}
                    >
                      <span style={{ textAlign: 'right' }}>{conflict.message}</span>
                      <PriorityChip priority={conflict.priority} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--ws-green-bd)',
                  background: 'var(--ws-green-bg)',
                  color: 'var(--ws-green)',
                  padding: '8px 12px',
                  fontSize: 11.5,
                }}
              >
                لا توجد تعارضات في الوقت الحالي.
              </div>
            )}
          </div>

          {/* خيارات التنفيذ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>خيارات التنفيذ</span>
              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>اختر الطريقة الأنسب لمعالجة التعارضات</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((suggestion) => {
                const isSelected = selectedSuggestionId === suggestion.id
                const isDisabledDirect = suggestion.id === 'direct-move' && !preview?.can_move
                return (
                  <label
                    key={suggestion.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      borderRadius: 9,
                      border: isSelected ? '1px solid var(--ws-accent-2)' : '1px solid var(--ws-hairline)',
                      background: isSelected ? 'var(--ws-accent-soft)' : 'var(--ws-surface)',
                      padding: '9px 12px',
                      cursor: isDisabledDirect ? 'not-allowed' : 'pointer',
                      opacity: isDisabledDirect ? 0.55 : 1,
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{suggestion.title}</span>
                        {suggestion.strategy ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <WsChip>{strategyLabels[suggestion.strategy] ?? 'اقتراح ذكي'}</WsChip>
                            {typeof suggestion.metadata?.chain_length === 'number' ? (
                              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                • {suggestion.metadata.chain_length} خطوة
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                      <PriorityChip priority={suggestion.priority} />
                    </div>

                    {suggestion.steps?.length ? (
                      renderSuggestionSteps(suggestion.steps)
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>{suggestion.description}</span>
                    )}

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
                      <input
                        type="radio"
                        style={{ width: 13, height: 13, accentColor: 'var(--ws-accent-2)' }}
                        name="move-resolution"
                        checked={isSelected}
                        onChange={() => setSelectedSuggestionId(suggestion.id)}
                        disabled={isDisabledDirect}
                      />
                      <span style={{ fontSize: 10.5, color: suggestion.resolves_conflicts ? 'var(--ws-green)' : 'var(--ws-text-2)' }}>
                        {suggestion.resolves_conflicts ? '✓ يعالج التعارض الحالي' : 'خيار مرن'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <footer className="ws-modal__foot" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'right' }}>
            {hasBlockingConflicts
              ? 'لا يمكن نقل الحصة بدون معالجة التعارضات ذات الأولوية P1.'
              : 'بمجرد الموافقة سيتم تحديث جداول المعلمين والفصول فورًا.'}
          </span>
          <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
            <WsBtn onClick={handleBackdrop}>إلغاء</WsBtn>
            <WsBtn variant="primary" onClick={() => setShowBetaWarning(true)}>
              اعتماد النقل
            </WsBtn>
          </span>
        </footer>
      </div>

      {/* تنبيه: الميزة تحت التجربة */}
      {showBetaWarning && (
        <div
          className="ws-modal"
          style={{ zIndex: 60 }}
          onClick={(event) => {
            event.stopPropagation()
            setShowBetaWarning(false)
          }}
        >
          <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head" style={{ background: 'var(--ws-amber-bg)' }}>
              <h3 className="ws-modal__title" style={{ color: 'var(--ws-amber)' }}>
                🚧 تحت التجربة
              </h3>
            </header>
            <div className="ws-modal__body">
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>
                هذه الخدمة تحت التجربة حالياً. لا يمكن تطبيق النقل في الوقت الحالي، سيتم تفعيل الميزة بشكل كامل بعد
                اكتمال الاختبارات والتأكد من دقة النتائج.
              </p>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn variant="primary" onClick={() => setShowBetaWarning(false)}>
                فهمت
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
