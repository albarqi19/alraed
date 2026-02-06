import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Loader2, Trash2, BookOpen, X } from 'lucide-react'
import {
  useSessionEvaluationConfig,
  useStudentEvaluations,
  useSaveEvaluationMutation,
  useBulkEvaluationMutation,
  useRemoveEvaluationMutation,
  useCreateSubjectSkillMutation,
} from '../hooks'
import type { BehaviorType, SubjectSkill, StudentEvaluation } from '../types'
import { DESCRIPTIVE_GRADES } from '../types'
import type { TeacherSessionStudent } from '../../types'

/* ─────── Spring Config (مثل mood tracker) ─────── */
const springConfig = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
}

/* ─────── الأيقونات التعبيرية ─────── */
const ICON_EMOJI_MAP: Record<string, string> = {
  hand: '✋',
  'book-x': '📕',
  moon: '😴',
  'message-circle': '💬',
  star: '⭐',
  'alert-triangle': '⚠️',
  heart: '❤️',
  zap: '⚡',
}

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', activeBg: 'bg-emerald-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', activeBg: 'bg-rose-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', activeBg: 'bg-amber-100' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', activeBg: 'bg-sky-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', activeBg: 'bg-purple-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', activeBg: 'bg-slate-100' },
}

/* ─────── Props ─────── */
interface StudentEvaluationSheetProps {
  isOpen: boolean
  onClose: () => void
  students: TeacherSessionStudent[]
  sessionId: number
  subjectId?: number
}

/* ─────── GradePicker ─────── */
function GradePicker({
  gradeType,
  maxGrade,
  value,
  onChange,
}: {
  gradeType: 'numeric' | 'descriptive' | null
  maxGrade: number | null
  value: { numeric?: number | null; descriptive?: string | null }
  onChange: (v: { numeric?: number | null; descriptive?: string | null }) => void
}) {
  if (gradeType === 'descriptive') {
    return (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {DESCRIPTIVE_GRADES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ descriptive: value.descriptive === g ? null : g })}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              value.descriptive === g
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    )
  }

  if (gradeType === 'numeric') {
    return (
      <div className="flex items-center gap-2 pt-1">
        <input
          type="number"
          value={value.numeric ?? ''}
          onChange={(e) => onChange({ numeric: e.target.value ? Number(e.target.value) : null })}
          className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-center text-sm focus:border-teal-500 focus:outline-none"
          placeholder="0"
          min="0"
          max={maxGrade ?? 100}
          step="0.5"
        />
        <span className="text-xs text-slate-400">/ {maxGrade ?? 100}</span>
      </div>
    )
  }

  return null
}

/* ─────── QuickActionButton ─────── */
function QuickActionButton({
  behavior,
  isActive,
  isPending,
  onClick,
}: {
  behavior: BehaviorType
  isActive: boolean
  isPending: boolean
  onClick: () => void
}) {
  const colors = COLOR_CLASSES[behavior.color ?? 'slate'] ?? COLOR_CLASSES.slate
  const emoji = ICON_EMOJI_MAP[behavior.icon ?? ''] ?? '📌'

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border-2 px-3 py-2 transition ${
        isActive
          ? `${colors.activeBg} ${colors.border} ${colors.text} shadow-sm`
          : `border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100`
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span className="whitespace-nowrap text-[10px] font-medium">{behavior.name}</span>
    </button>
  )
}

/* ─────── SkillItem ─────── */
function SkillItem({
  skill,
  evaluation,
  isPending,
  onToggle,
  onGradeChange,
}: {
  skill: SubjectSkill
  evaluation: StudentEvaluation | undefined
  isPending: boolean
  onToggle: () => void
  onGradeChange: (v: { numeric?: number | null; descriptive?: string | null }) => void
}) {
  const isActive = !!evaluation

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        isActive ? 'border-teal-200 bg-teal-50/50' : 'border-slate-100 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-slate-700"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md text-xs transition ${
              isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'
            }`}
          >
            {isActive ? '✓' : ''}
          </span>
          {skill.name}
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            skill.category === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {skill.category === 'positive' ? 'إيجابي' : 'سلبي'}
        </span>
      </div>

      {isActive && skill.requires_grade && (
        <div className="mt-2 ps-7">
          <GradePicker
            gradeType={skill.grade_type}
            maxGrade={skill.max_grade}
            value={{
              numeric: evaluation?.numeric_grade,
              descriptive: evaluation?.descriptive_grade,
            }}
            onChange={onGradeChange}
          />
        </div>
      )}
    </div>
  )
}

/* ─────── AddSkillInline ─────── */
function AddSkillInline({
  subjectId,
  onCreated,
}: {
  subjectId: number
  onCreated: () => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const createMutation = useCreateSubjectSkillMutation(subjectId)

  const handleSubmit = () => {
    if (!name.trim()) return
    createMutation.mutate(
      { name: name.trim(), category: 'positive' },
      {
        onSuccess: () => {
          setName('')
          setIsAdding(false)
          onCreated()
        },
      },
    )
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-xs text-slate-400 transition hover:border-teal-300 hover:text-teal-500"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة مهارة جديدة
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 p-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
        placeholder="اسم المهارة..."
        autoFocus
      />
      <button
        type="button"
        disabled={createMutation.isPending || !name.trim()}
        onClick={handleSubmit}
        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'إضافة'}
      </button>
      <button
        type="button"
        onClick={() => { setIsAdding(false); setName('') }}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ─────── EvaluationBadges (شارات التقييم على كارد الطالب) ─────── */
export function EvaluationBadges({ evaluations }: { evaluations: StudentEvaluation[] }) {
  if (evaluations.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {evaluations.map((ev) => {
        const label = ev.behavior_type?.name ?? ev.subject_skill?.name ?? ''
        const color = ev.behavior_type?.color
        const colors = COLOR_CLASSES[color ?? 'slate'] ?? COLOR_CLASSES.slate
        const emoji = ICON_EMOJI_MAP[ev.behavior_type?.icon ?? ''] ?? ''

        return (
          <span
            key={ev.id}
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
          >
            {emoji && <span className="text-xs">{emoji}</span>}
            {label}
          </span>
        )
      })}
    </div>
  )
}

/* ═══════════ المكون الرئيسي ═══════════ */
export function StudentEvaluationSheet({
  isOpen,
  onClose,
  students,
  sessionId,
  subjectId,
}: StudentEvaluationSheetProps) {
  const [activeTab, setActiveTab] = useState<'behaviors' | 'skills'>('behaviors')
  const isBulk = students.length > 1
  const singleStudent = students[0]

  // Queries
  const configQuery = useSessionEvaluationConfig(sessionId)
  const studentEvaluationsQuery = useStudentEvaluations(
    isBulk ? undefined : sessionId,
    isBulk ? undefined : singleStudent?.id,
  )

  // Mutations
  const saveMutation = useSaveEvaluationMutation(sessionId)
  const bulkMutation = useBulkEvaluationMutation(sessionId)
  const removeMutation = useRemoveEvaluationMutation(sessionId)

  const behaviorTypes = configQuery.data?.behavior_types ?? []
  const subjectSkills = configQuery.data?.subject_skills ?? []
  const evaluations = studentEvaluationsQuery.data ?? []

  // تحديد أي سلوكيات مفعّلة حالياً
  const activeBehaviorIds = useMemo(() => {
    return new Set(evaluations.filter((e) => e.evaluation_type === 'behavior').map((e) => e.behavior_type_id))
  }, [evaluations])

  // خريطة المهارات المقيّمة
  const skillEvaluationMap = useMemo(() => {
    const map = new Map<number, StudentEvaluation>()
    evaluations.filter((e) => e.evaluation_type === 'skill').forEach((e) => {
      if (e.subject_skill_id) map.set(e.subject_skill_id, e)
    })
    return map
  }, [evaluations])

  // إغلاق تلقائي بعد التقييم
  const autoClose = useCallback(() => {
    setTimeout(() => onClose(), 350)
  }, [onClose])

  // ═══ أزرار السلوك السريعة ═══
  const handleBehaviorToggle = (behavior: BehaviorType) => {
    if (isBulk) {
      bulkMutation.mutate(
        {
          student_ids: students.map((s) => s.id),
          evaluation_type: 'behavior',
          behavior_type_id: behavior.id,
        },
        { onSuccess: autoClose },
      )
    } else {
      saveMutation.mutate(
        {
          studentId: singleStudent.id,
          payload: {
            evaluation_type: 'behavior',
            behavior_type_id: behavior.id,
          },
        },
        { onSuccess: autoClose },
      )
    }
  }

  // ═══ تبديل مهارة ═══
  const handleSkillToggle = (skill: SubjectSkill) => {
    if (isBulk) {
      bulkMutation.mutate(
        {
          student_ids: students.map((s) => s.id),
          evaluation_type: 'skill',
          subject_skill_id: skill.id,
        },
        { onSuccess: autoClose },
      )
    } else {
      saveMutation.mutate(
        {
          studentId: singleStudent.id,
          payload: {
            evaluation_type: 'skill',
            subject_skill_id: skill.id,
          },
        },
        { onSuccess: autoClose },
      )
    }
  }

  // ═══ تحديث درجة مهارة ═══
  const handleSkillGradeChange = (skill: SubjectSkill, value: { numeric?: number | null; descriptive?: string | null }) => {
    if (isBulk) return
    saveMutation.mutate({
      studentId: singleStudent.id,
      payload: {
        evaluation_type: 'skill',
        subject_skill_id: skill.id,
        numeric_grade: value.numeric,
        descriptive_grade: value.descriptive,
      },
    })
  }

  const isPending = saveMutation.isPending || bulkMutation.isPending

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="px-5 pb-2 pt-3 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-bold text-slate-900"
              >
                {isBulk ? `${students.length} طلاب محددين` : singleStudent?.name ?? ''}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-sm text-slate-500"
              >
                {isBulk ? 'تقييم جماعي' : configQuery.data?.subject_name ?? ''}
              </motion.p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {configQuery.isLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                  <p className="text-xs text-slate-500">جاري تحميل إعدادات التقييم...</p>
                </div>
              ) : (
                <>
                  {/* ═══ أزرار السلوك السريعة ═══ */}
                  {behaviorTypes.length > 0 && (
                    <div className="mb-4">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="mb-2 text-xs font-medium text-slate-500"
                      >
                        تقييم سريع
                      </motion.p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {behaviorTypes.map((bt) => (
                          <QuickActionButton
                            key={bt.id}
                            behavior={bt}
                            isActive={!isBulk && activeBehaviorIds.has(bt.id)}
                            isPending={isPending}
                            onClick={() => handleBehaviorToggle(bt)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ═══ تبويبات ═══ */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab('behaviors')}
                      className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                        activeTab === 'behaviors'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      التقييمات
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('skills')}
                      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
                        activeTab === 'skills'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      المهارات
                      {subjectSkills.length > 0 && (
                        <span className="rounded-full bg-teal-100 px-1.5 text-[10px] text-teal-600">
                          {subjectSkills.length}
                        </span>
                      )}
                    </button>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {/* ═══ تبويب التقييمات ═══ */}
                    {activeTab === 'behaviors' && (
                      <motion.div
                        key="behaviors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        {!isBulk && evaluations.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500">
                              تقييمات اليوم ({evaluations.length})
                            </p>
                            {evaluations.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {ICON_EMOJI_MAP[ev.behavior_type?.icon ?? ''] ?? '📋'}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">
                                      {ev.behavior_type?.name ?? ev.subject_skill?.name ?? 'تقييم'}
                                    </p>
                                    {(ev.descriptive_grade || ev.numeric_grade !== null) && (
                                      <p className="text-xs text-slate-500">
                                        {ev.descriptive_grade ?? `${ev.numeric_grade}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={removeMutation.isPending}
                                  onClick={() =>
                                    removeMutation.mutate({
                                      studentId: singleStudent.id,
                                      evaluationId: ev.id,
                                    })
                                  }
                                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : !isBulk ? (
                          <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <span className="text-3xl">📋</span>
                            <p className="text-sm text-slate-500">
                              لا توجد تقييمات بعد. استخدم الأزرار أعلاه
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <span className="text-3xl">👥</span>
                            <p className="text-sm text-slate-500">
                              اضغط على أي زر أعلاه لتطبيقه على {students.length} طالب
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ═══ تبويب المهارات ═══ */}
                    {activeTab === 'skills' && (
                      <motion.div
                        key="skills"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        {subjectSkills.length > 0 ? (
                          subjectSkills.map((skill) => (
                            <SkillItem
                              key={skill.id}
                              skill={skill}
                              evaluation={isBulk ? undefined : skillEvaluationMap.get(skill.id)}
                              isPending={isPending}
                              onToggle={() => handleSkillToggle(skill)}
                              onGradeChange={(v) => handleSkillGradeChange(skill, v)}
                            />
                          ))
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <BookOpen className="h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">لا توجد مهارات لهذه المادة</p>
                            <p className="text-xs text-slate-400">أضف مهارات خاصة بك من الزر أدناه</p>
                          </div>
                        )}

                        {/* إضافة مهارة جديدة */}
                        {subjectId && (
                          <AddSkillInline
                            subjectId={subjectId}
                            onCreated={() => configQuery.refetch()}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* ═══ حالة الحفظ ═══ */}
            {isPending && (
              <div className="border-t border-slate-100 px-4 py-2 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-teal-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ...
                </div>
              </div>
            )}

            {/* Safe area */}
            <div className="h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
