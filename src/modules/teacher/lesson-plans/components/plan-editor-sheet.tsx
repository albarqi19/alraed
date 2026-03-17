import { useState, useEffect } from 'react'
import clsx from 'classnames'
import { X, Save, CheckCircle2, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react'
import { useSuggestedTopics, useStorePlanMutation, useApprovePlanMutation } from '../hooks'
import type { WeeklyLessonPlan, LessonPlanSession, TeacherPlanSubject } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

interface Props {
  subject: TeacherPlanSubject
  weekId: number
  existingPlan: WeeklyLessonPlan | null
  onClose: () => void
}

function makeEmptySession(num: number): LessonPlanSession {
  return { session_number: num, topic: '', homework: '' }
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

  // تحميل البيانات
  useEffect(() => {
    if (existingPlan?.sessions?.length) {
      setSessions(existingPlan.sessions)
      return
    }
    if (loadingSuggestions) return

    if (suggested?.suggested_topics?.length) {
      setSessions(
        suggested.suggested_topics.map((t) => ({
          session_number: t.session_number,
          topic: t.topic,
          homework: '',
        })),
      )
    } else {
      const count = subject.sessions_per_week || suggested?.sessions_per_week || 1
      setSessions(Array.from({ length: count }, (_, i) => makeEmptySession(i + 1)))
    }
  }, [existingPlan, suggested, loadingSuggestions, subject.sessions_per_week])

  const updateSession = (index: number, field: keyof LessonPlanSession, value: string) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const addSession = () => {
    setSessions((prev) => [...prev, makeEmptySession(prev.length + 1)])
  }

  const removeSession = (index: number) => {
    setSessions((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, session_number: i + 1 })),
    )
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
      approveMutation.mutate(existingPlan.id, { onSuccess: () => onClose() })
    }
  }

  const isSaving = storeMutation.isPending || approveMutation.isPending

  // قائمة الدروس من التوزيع مجمعة بالأسبوع
  const allTopics = suggested?.all_topics ?? []
  const hasTopics = allTopics.length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

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
              <p className="text-sm text-muted">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {sessions.map((session, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  {/* رقم الحصة + حذف */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                        {session.session_number}
                      </span>
                      <span className="text-xs font-medium text-slate-500">الحصة {session.session_number}</span>
                    </span>
                    {isEditable && sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSession(index)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* عنوان الدرس: dropdown + كتابة حرة */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">عنوان الدرس</label>
                    <TopicInput
                      value={session.topic}
                      onChange={(v) => updateSession(index, 'topic', v)}
                      disabled={!isEditable}
                      allTopics={allTopics}
                    />
                  </div>

                  {/* الواجب */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">الواجب</label>
                    <input
                      type="text"
                      value={session.homework ?? ''}
                      onChange={(e) => updateSession(index, 'homework', e.target.value)}
                      disabled={!isEditable}
                      placeholder="الواجب المنزلي (اختياري)"
                      className={clsx(
                        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition',
                        'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
                        'disabled:bg-slate-100 disabled:text-slate-500',
                      )}
                    />
                  </div>
                </div>
              ))}

              {/* زر إضافة حصة */}
              {isEditable && (
                <button
                  type="button"
                  onClick={addSession}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 transition hover:border-cyan-400 hover:text-cyan-600"
                >
                  <Plus className="h-4 w-4" />
                  إضافة حصة
                </button>
              )}

              {suggested?.is_auto_suggested && !existingPlan && hasTopics && (
                <p className="text-center text-[11px] text-cyan-600">
                  تم اقتراح المواضيع تلقائياً بناءً على توزيع المنهج
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {isEditable && sessions.length > 0 && (
          <div className="flex gap-2 border-t px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {storeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ مسودة
            </button>

            {canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                اعتماد
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════ حقل اختيار الدرس (dropdown + كتابة حرة) ═══════════

function TopicInput({
  value,
  onChange,
  disabled,
  allTopics,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  allTopics: Array<{ week_number: number; session_number: number; topic: string }>
}) {
  const [open, setOpen] = useState(false)

  if (!allTopics.length) {
    // لا يوجد توزيع → حقل كتابة عادي
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="اكتب عنوان الدرس"
        className={clsx(
          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition',
          'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
          'disabled:bg-slate-100 disabled:text-slate-500',
        )}
      />
    )
  }

  // تجميع المواضيع بالأسبوع
  const grouped: Record<number, typeof allTopics> = {}
  allTopics.forEach((t) => {
    if (!grouped[t.week_number]) grouped[t.week_number] = []
    grouped[t.week_number].push(t)
  })

  return (
    <div className="relative">
      {/* الحقل: يعرض القيمة الحالية + زر فتح القائمة */}
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="اختر أو اكتب عنوان الدرس"
          className={clsx(
            'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition',
            'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
            'disabled:bg-slate-100 disabled:text-slate-500',
          )}
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={clsx(
              'flex h-[38px] w-9 shrink-0 items-center justify-center rounded-lg border transition',
              open
                ? 'border-cyan-400 bg-cyan-50 text-cyan-600'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50',
            )}
          >
            <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* القائمة المنسدلة */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {Object.entries(grouped).map(([weekNum, topics]) => (
            <div key={weekNum}>
              <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-100">
                الأسبوع {weekNum}
              </div>
              {topics.map((t) => {
                const isSelected = value === t.topic
                return (
                  <button
                    key={`${t.week_number}-${t.session_number}`}
                    type="button"
                    onClick={() => {
                      onChange(t.topic)
                      setOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center gap-2 px-3 py-2 text-right text-xs transition',
                      isSelected
                        ? 'bg-cyan-50 text-cyan-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                      {t.session_number}
                    </span>
                    <span className="line-clamp-1">{t.topic}</span>
                    {isSelected && <span className="mr-auto text-cyan-500">✓</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
