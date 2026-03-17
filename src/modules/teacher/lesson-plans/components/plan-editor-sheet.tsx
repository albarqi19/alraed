import { useState, useEffect } from 'react'
import clsx from 'classnames'
import { X, Save, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSuggestedTopics, useStorePlanMutation, useApprovePlanMutation } from '../hooks'
import type { WeeklyLessonPlan, LessonPlanSession, TeacherPlanSubject } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

interface Props {
  subject: TeacherPlanSubject
  weekId: number
  existingPlan: WeeklyLessonPlan | null
  onClose: () => void
}

export function PlanEditorSheet({ subject, weekId, existingPlan, onClose }: Props) {
  const { data: suggested, isLoading: loadingSuggestions } = useSuggestedTopics(
    subject.subject_id,
    subject.grade,
    weekId,
  )
  const storeMutation = useStorePlanMutation()
  const approveMutation = useApprovePlanMutation()

  const [sessions, setSessions] = useState<LessonPlanSession[]>([])
  const [expandedSession, setExpandedSession] = useState<number | null>(null)

  // تحميل البيانات: إما الخطة الموجودة أو الاقتراحات
  useEffect(() => {
    if (existingPlan?.sessions?.length) {
      setSessions(existingPlan.sessions)
    } else if (suggested?.suggested_topics?.length) {
      const initial = suggested.suggested_topics.map((t) => ({
        session_number: t.session_number,
        topic: t.topic,
        lesson_title: '',
        objectives: '',
        homework: '',
        notes: '',
      }))
      setSessions(initial)
    } else if (subject.sessions_per_week > 0 && !loadingSuggestions) {
      // إذا لا يوجد توزيع، نُنشئ حقول فارغة
      const empty: LessonPlanSession[] = Array.from(
        { length: subject.sessions_per_week },
        (_, i) => ({
          session_number: i + 1,
          topic: '',
          lesson_title: '',
          objectives: '',
          homework: '',
          notes: '',
        }),
      )
      setSessions(empty)
    }
  }, [existingPlan, suggested, loadingSuggestions, subject.sessions_per_week])

  const updateSession = (index: number, field: keyof LessonPlanSession, value: string) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const isEditable = !existingPlan || existingPlan.status === 'draft' || existingPlan.status === 'rejected'
  const canApprove = existingPlan && existingPlan.status === 'draft'

  const handleSave = () => {
    storeMutation.mutate({
      subject_id: subject.subject_id,
      grade: subject.grade,
      academic_week_id: weekId,
      sessions,
    })
  }

  const handleApprove = () => {
    if (existingPlan) {
      approveMutation.mutate(existingPlan.id, {
        onSuccess: () => onClose(),
      })
    }
  }

  const isSaving = storeMutation.isPending || approveMutation.isPending

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {subject.subject_name} - {subject.grade}
            </h2>
            {existingPlan && (
              <span
                className={clsx(
                  'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                  STATUS_COLORS[existingPlan.status],
                )}
              >
                {STATUS_LABELS[existingPlan.status]}
              </span>
            )}
            {existingPlan?.rejection_reason && (
              <p className="mt-1 text-xs text-red-600">سبب الرفض: {existingPlan.rejection_reason}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loadingSuggestions ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm text-muted">جاري تحميل المواضيع...</p>
            </div>
          ) : (
            sessions.map((session, index) => {
              const isExpanded = expandedSession === index
              return (
                <div
                  key={session.session_number}
                  className="rounded-xl border border-slate-200 bg-slate-50/50"
                >
                  {/* Session Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedSession(isExpanded ? null : index)}
                    className="flex w-full items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                        {session.session_number}
                      </span>
                      <span className="text-sm font-medium text-slate-800 line-clamp-1">
                        {session.topic || 'حصة بدون عنوان'}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {/* Expanded Fields */}
                  {isExpanded && (
                    <div className="space-y-3 border-t px-4 py-3">
                      <Field
                        label="الموضوع"
                        value={session.topic}
                        onChange={(v) => updateSession(index, 'topic', v)}
                        disabled={!isEditable}
                        placeholder="عنوان الموضوع"
                      />
                      <Field
                        label="عنوان الدرس"
                        value={session.lesson_title ?? ''}
                        onChange={(v) => updateSession(index, 'lesson_title', v)}
                        disabled={!isEditable}
                        placeholder="عنوان الدرس التفصيلي"
                      />
                      <Field
                        label="الأهداف"
                        value={session.objectives ?? ''}
                        onChange={(v) => updateSession(index, 'objectives', v)}
                        disabled={!isEditable}
                        multiline
                        placeholder="أهداف الدرس"
                      />
                      <Field
                        label="الواجبات"
                        value={session.homework ?? ''}
                        onChange={(v) => updateSession(index, 'homework', v)}
                        disabled={!isEditable}
                        placeholder="الواجب المنزلي"
                      />
                      <Field
                        label="ملاحظات"
                        value={session.notes ?? ''}
                        onChange={(v) => updateSession(index, 'notes', v)}
                        disabled={!isEditable}
                        placeholder="ملاحظات إضافية (اختياري)"
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}

          {suggested?.is_auto_suggested && !existingPlan && (
            <p className="text-center text-[11px] text-cyan-600">
              تم اقتراح المواضيع تلقائياً بناءً على آخر خطة لك
            </p>
          )}
        </div>

        {/* Footer Actions */}
        {isEditable && sessions.length > 0 && (
          <div className="flex gap-2 border-t px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {storeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ مسودة
            </button>

            {canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                اعتماد
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════ حقل إدخال ═══════════

function Field({
  label,
  value,
  onChange,
  disabled,
  multiline,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  multiline?: boolean
  placeholder?: string
}) {
  const commonProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    disabled,
    placeholder,
    className: clsx(
      'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition',
      'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
      'disabled:bg-slate-100 disabled:text-slate-500',
    ),
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {multiline ? (
        <textarea {...commonProps} rows={2} />
      ) : (
        <input type="text" {...commonProps} />
      )}
    </div>
  )
}
