import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Trash2, BookOpen, ExternalLink, BarChart3, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useSessionEvaluationConfig,
  useStudentEvaluations,
  useSaveEvaluationMutation,
  useBulkEvaluationMutation,
  useRemoveEvaluationMutation,
  useStudentReport,
} from '../hooks'
import type { BehaviorType, SubjectSkill, StudentEvaluation, SkillSummaryItem } from '../types'
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
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', activeBg: 'bg-emerald-100 dark:bg-emerald-900' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', activeBg: 'bg-rose-100 dark:bg-rose-900' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', activeBg: 'bg-amber-100 dark:bg-amber-900' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-400', activeBg: 'bg-sky-100 dark:bg-sky-900' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', activeBg: 'bg-purple-100 dark:bg-purple-900' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-700/50', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', activeBg: 'bg-slate-100 dark:bg-slate-700' },
}

/* ─────── Props ─────── */
interface StudentEvaluationSheetProps {
  isOpen: boolean
  onClose: () => void
  students: TeacherSessionStudent[]
  sessionId: number
  subjectId?: number
}

/* ─────── تصنيف ذكي بالألوان ─────── */
function getEvaluationColor(
  gradeType: 'numeric' | 'descriptive' | 'mastery' | null,
  numericGrade?: number | null,
  maxGrade?: number | null,
  descriptiveGrade?: string | null,
  category?: 'positive' | 'negative',
): { bg: string; text: string; label: string } {
  // Mastery
  if (gradeType === 'mastery') {
    return descriptiveGrade === 'اتقن'
      ? { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-400', label: 'اتقن' }
      : { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-400', label: 'لم يتقن' }
  }

  // Numeric: percentage → color
  if (gradeType === 'numeric' && numericGrade != null) {
    const pct = (numericGrade / (maxGrade || 100)) * 100
    if (pct >= 67) return { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-400', label: 'متقدم' }
    if (pct >= 34) return { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-400', label: 'متوسط' }
    return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-400', label: 'مبتدئ' }
  }

  // Descriptive
  const descriptiveMap: Record<string, { bg: string; text: string }> = {
    'ممتاز': { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-400' },
    'جيد جدا': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-400' },
    'جيد': { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-400' },
    'مقبول': { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-400' },
    'ضعيف': { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-400' },
  }
  if (gradeType === 'descriptive' && descriptiveGrade && descriptiveMap[descriptiveGrade]) {
    return { ...descriptiveMap[descriptiveGrade], label: descriptiveGrade }
  }

  // Category fallback
  return category === 'positive'
    ? { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400', label: 'إيجابي' }
    : { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', label: 'سلبي' }
}

/* ─────── NumberGrid (بديل input number) ─────── */
function NumberGrid({
  maxGrade,
  value,
  onChange,
}: {
  maxGrade: number
  value: number | null
  onChange: (n: number | null) => void
}) {
  const max = Math.min(maxGrade, 20)
  const allValues = Array.from({ length: max + 1 }, (_, i) => i)

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {allValues.map((n) => {
        const isSelected = value === n
        const pct = (n / maxGrade) * 100
        const colorClass = isSelected
          ? pct >= 67
            ? 'bg-emerald-600 text-white shadow-sm'
            : pct >= 34
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-red-500 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(isSelected ? null : n)}
            className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-medium transition ${colorClass}`}
          >
            {n}
          </button>
        )
      })}
      <span className="flex items-center text-xs text-slate-400 dark:text-slate-500">/ {maxGrade}</span>
    </div>
  )
}

/* ─────── GradePicker ─────── */
function GradePicker({
  gradeType,
  maxGrade,
  value,
  onChange,
}: {
  gradeType: 'numeric' | 'descriptive' | 'mastery' | null
  maxGrade: number | null
  value: { numeric?: number | null; descriptive?: string | null }
  onChange: (v: { numeric?: number | null; descriptive?: string | null }) => void
}) {
  if (gradeType === 'mastery') {
    return (
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange({ descriptive: value.descriptive === 'اتقن' ? null : 'اتقن' })}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
            value.descriptive === 'اتقن'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900'
          }`}
        >
          ✓ اتقن
        </button>
        <button
          type="button"
          onClick={() => onChange({ descriptive: value.descriptive === 'لم يتقن' ? null : 'لم يتقن' })}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
            value.descriptive === 'لم يتقن'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900'
          }`}
        >
          ✗ لم يتقن
        </button>
      </div>
    )
  }

  if (gradeType === 'descriptive') {
    return (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {DESCRIPTIVE_GRADES.map((g) => {
          const color = getEvaluationColor('descriptive', null, null, g)
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ descriptive: value.descriptive === g ? null : g })}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                value.descriptive === g
                  ? `${color.bg} ${color.text} shadow-sm ring-1 ring-current/20`
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {g}
            </button>
          )
        })}
      </div>
    )
  }

  if (gradeType === 'numeric') {
    const max = maxGrade ?? 100
    // شبكة أرقام للقيم <= 20، وإلا slider
    if (max <= 20) {
      return (
        <NumberGrid
          maxGrade={max}
          value={value.numeric ?? null}
          onChange={(n) => onChange({ numeric: n })}
        />
      )
    }
    // للقيم الكبيرة: slider + رقم
    return (
      <div className="flex items-center gap-3 pt-1">
        <input
          type="range"
          min="0"
          max={max}
          step="1"
          value={value.numeric ?? 0}
          onChange={(e) => onChange({ numeric: Number(e.target.value) || null })}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700 accent-teal-600"
        />
        <span className="min-w-[3rem] rounded-lg bg-slate-100 dark:bg-slate-700 px-2 py-1 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
          {value.numeric ?? 0} / {max}
        </span>
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
          : `border-transparent bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`
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
  showGradePicker,
}: {
  skill: SubjectSkill
  evaluation: StudentEvaluation | undefined
  isPending: boolean
  onToggle: () => void
  onGradeChange: (v: { numeric?: number | null; descriptive?: string | null }) => void
  showGradePicker?: boolean
}) {
  const isActive = !!evaluation
  const hasGrade = evaluation?.numeric_grade != null || evaluation?.descriptive_grade != null

  // لون ذكي حسب الدرجة
  const evalColor = isActive && hasGrade
    ? getEvaluationColor(skill.grade_type, evaluation?.numeric_grade, skill.max_grade, evaluation?.descriptive_grade, skill.category)
    : null

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        evalColor
          ? `${evalColor.bg} border-current/10`
          : isActive
            ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/50'
            : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md text-xs transition ${
              isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
            }`}
          >
            {isActive ? '✓' : ''}
          </span>
          {skill.name}
        </button>
        <div className="flex items-center gap-1.5">
          {evalColor && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${evalColor.bg} ${evalColor.text}`}>
              {evalColor.label}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              skill.category === 'positive' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
            }`}
          >
            {skill.category === 'positive' ? 'إيجابي' : 'سلبي'}
          </span>
        </div>
      </div>

      {/* عرض GradePicker: إما المهارة مفعّلة + تتطلب درجة، أو showGradePicker مفعّل */}
      {((isActive && skill.requires_grade) || showGradePicker) && (
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

/* ─────── AddSkillRedirect ─────── */
function AddSkillRedirect({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => {
        onClose()
        navigate('/teacher/skills')
      }}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-2.5 text-xs text-slate-400 dark:text-slate-500 transition hover:border-teal-300 hover:text-teal-500"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      إضافة مهارة من صفحة إدارة المهارات
    </button>
  )
}

/* ─────── EvaluationBadges (شارات التقييم على كارد الطالب) ─────── */
export function EvaluationBadges({ evaluations }: { evaluations: StudentEvaluation[] }) {
  if (evaluations.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {evaluations.map((ev) => {
        const label = ev.behavior_type?.name ?? ev.subject_skill?.name ?? ''
        const emoji = ICON_EMOJI_MAP[ev.behavior_type?.icon ?? ''] ?? ''

        // تصنيف ذكي: إذا مهارة مع درجة → لون حسب الدرجة
        let badgeBg: string, badgeText: string
        if (ev.evaluation_type === 'skill' && ev.subject_skill && (ev.numeric_grade != null || ev.descriptive_grade)) {
          const ec = getEvaluationColor(ev.subject_skill.grade_type, ev.numeric_grade, ev.subject_skill.max_grade, ev.descriptive_grade, ev.subject_skill.category)
          badgeBg = ec.bg
          badgeText = ec.text
        } else {
          const color = ev.behavior_type?.color
          const colors = COLOR_CLASSES[color ?? 'slate'] ?? COLOR_CLASSES.slate
          badgeBg = colors.bg
          badgeText = colors.text
        }

        return (
          <span
            key={ev.id}
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeBg} ${badgeText}`}
          >
            {emoji && <span className="text-xs">{emoji}</span>}
            {label}
          </span>
        )
      })}
    </div>
  )
}

/* ─────── StudentReportPanel (كشف الطالب) ─────── */
function StudentReportPanel({ studentId, subjectId }: { studentId: number; subjectId?: number }) {
  const reportQuery = useStudentReport(studentId, subjectId)

  if (reportQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        <p className="text-xs text-slate-500 dark:text-slate-400">جاري تحميل الكشف...</p>
      </div>
    )
  }

  if (reportQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">تعذر تحميل الكشف</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">حدث خطأ أثناء جلب البيانات، حاول مرة أخرى</p>
      </div>
    )
  }

  if (!reportQuery.data) return null
  const { behavior_summary, total_positive, total_negative, skills_summary } = reportQuery.data

  const hasAnyData = total_positive > 0 || total_negative > 0 || skills_summary.length > 0

  if (!hasAnyData) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">لا يوجد كشف للطالب</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">لم يتم تسجيل أي تقييمات لهذا الطالب في الفصل الحالي</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* إحصائيات السلوك */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">إحصائيات السلوك (الفصل الحالي)</p>
        <div className="grid grid-cols-2 gap-2">
          {behavior_summary.filter((b) => b.count > 0 || b.category === 'positive').slice(0, 4).map((b) => {
            const emoji = ICON_EMOJI_MAP[b.icon ?? ''] ?? '📌'
            const colors = COLOR_CLASSES[b.color ?? 'slate'] ?? COLOR_CLASSES.slate
            return (
              <div key={b.type_id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${colors.bg} ${colors.border}`}>
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className={`text-lg font-bold ${colors.text}`}>{b.count}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{b.name}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <span className="text-emerald-600">إيجابي: {total_positive}</span>
          <span className="text-slate-300 dark:text-slate-500">|</span>
          <span className="text-red-600">سلبي: {total_negative}</span>
        </div>
      </div>

      {/* المهارات */}
      {skills_summary.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">المهارات ({skills_summary.length})</p>
          <div className="space-y-1.5">
            {skills_summary.map((s: SkillSummaryItem) => {
              const color = getSkillSummaryColor(s)
              return (
                <div key={s.skill_id} className={`flex items-center justify-between rounded-xl border p-2.5 ${color.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{s.count} مرة</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.badge} ${color.badgeText}`}>
                    {getSkillSummaryLabel(s)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function getSkillSummaryColor(s: SkillSummaryItem) {
  if (s.grade_type === 'mastery') {
    return s.last_mastery
      ? { bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900', badgeText: 'text-emerald-700 dark:text-emerald-400' }
      : { bg: 'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-800', dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900', badgeText: 'text-red-700 dark:text-red-400' }
  }
  if (s.grade_type === 'numeric' && s.avg_grade != null && s.max_grade) {
    const pct = (s.avg_grade / s.max_grade) * 100
    if (pct >= 67) return { bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900', badgeText: 'text-emerald-700 dark:text-emerald-400' }
    if (pct >= 34) return { bg: 'bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-800', dot: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-900', badgeText: 'text-amber-700 dark:text-amber-400' }
    return { bg: 'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-800', dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900', badgeText: 'text-red-700 dark:text-red-400' }
  }
  if (s.grade_type === 'descriptive') {
    const map: Record<string, typeof defaultColor> = {
      'ممتاز': { bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-800', dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900', badgeText: 'text-emerald-700 dark:text-emerald-400' },
      'جيد جدا': { bg: 'bg-green-50 dark:bg-green-950 border-green-100 dark:border-green-800', dot: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900', badgeText: 'text-green-700 dark:text-green-400' },
      'جيد': { bg: 'bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-800', dot: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-900', badgeText: 'text-amber-700 dark:text-amber-400' },
      'مقبول': { bg: 'bg-orange-50 dark:bg-orange-950 border-orange-100 dark:border-orange-800', dot: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-900', badgeText: 'text-orange-700 dark:text-orange-400' },
      'ضعيف': { bg: 'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-800', dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900', badgeText: 'text-red-700 dark:text-red-400' },
    }
    if (s.last_descriptive && map[s.last_descriptive]) return map[s.last_descriptive]
  }
  return defaultColor
}
const defaultColor = { bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700', dot: 'bg-slate-400', badge: 'bg-slate-100 dark:bg-slate-700', badgeText: 'text-slate-600 dark:text-slate-400' }

function getSkillSummaryLabel(s: SkillSummaryItem): string {
  if (s.grade_type === 'mastery') return s.last_mastery ? 'اتقن' : 'لم يتقن'
  if (s.grade_type === 'numeric' && s.avg_grade != null) return `${s.avg_grade}/${s.max_grade}`
  if (s.grade_type === 'descriptive' && s.last_descriptive) return s.last_descriptive
  return s.category === 'positive' ? 'إيجابي' : 'سلبي'
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
  const [showReport, setShowReport] = useState(false)
  const [activeSkillForGrade, setActiveSkillForGrade] = useState<SubjectSkill | null>(null)
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
    // إذا المهارة تتطلب درجة ولم يتم تقييمها بعد → افتح GradePicker بدون إغلاق
    if (skill.requires_grade && !isBulk) {
      const existing = skillEvaluationMap.get(skill.id)
      if (!existing) {
        // فتح picker للمهارة الجديدة
        setActiveSkillForGrade((prev) => (prev?.id === skill.id ? null : skill))
        return
      }
      // إذا موجودة → toggle off (حذف)
      saveMutation.mutate({
        studentId: singleStudent.id,
        payload: {
          evaluation_type: 'skill',
          subject_skill_id: skill.id,
        },
      })
      setActiveSkillForGrade(null)
      return
    }

    // مهارات بدون درجة أو bulk → toggle مباشر + auto-close
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
    // بعد اختيار الدرجة → إلغاء وضع الـ picker
    if (value.numeric != null || value.descriptive != null) {
      setActiveSkillForGrade(null)
    }
  }

  const isPending = saveMutation.isPending || bulkMutation.isPending

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="eval-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="eval-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className={`fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl bg-white dark:bg-slate-800 shadow-2xl transition-[max-height] duration-300 ${showReport ? 'max-h-[92vh]' : 'max-h-[85vh]'}`}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-5 pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    {isBulk ? `${students.length} طلاب محددين` : singleStudent?.name ?? ''}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm text-slate-500 dark:text-slate-400"
                  >
                    {isBulk ? 'تقييم جماعي' : configQuery.data?.subject_name ?? ''}
                  </motion.p>
                </div>
                {/* زر كشف الطالب */}
                {!isBulk && (
                  <button
                    type="button"
                    onClick={() => setShowReport((p) => !p)}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      showReport
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    كشف
                    <ChevronDown className={`h-3 w-3 transition ${showReport ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <AnimatePresence mode="wait">
                {/* ═══ وضع الكشف ═══ */}
                {showReport && !isBulk && singleStudent ? (
                  <motion.div
                    key="report"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StudentReportPanel studentId={singleStudent.id} subjectId={subjectId} />
                  </motion.div>
                ) : (
                  /* ═══ وضع التقييم ═══ */
                  <motion.div
                    key="evaluation"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {configQuery.isLoading ? (
                      <div className="flex flex-col items-center gap-3 py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">جاري تحميل إعدادات التقييم...</p>
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
                              className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400"
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
                          className="mb-3 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveTab('behaviors')}
                            className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                              activeTab === 'behaviors'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            التقييمات
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('skills')}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
                              activeTab === 'skills'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    تقييمات اليوم ({evaluations.length})
                                  </p>
                                  {evaluations.map((ev) => (
                                    <div
                                      key={ev.id}
                                      className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">
                                          {ICON_EMOJI_MAP[ev.behavior_type?.icon ?? ''] ?? '📋'}
                                        </span>
                                        <div>
                                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {ev.behavior_type?.name ?? ev.subject_skill?.name ?? 'تقييم'}
                                          </p>
                                          {(ev.descriptive_grade || ev.numeric_grade !== null) && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
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
                                        className="rounded-lg p-1.5 text-slate-300 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : !isBulk ? (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                  <span className="text-3xl">📋</span>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    لا توجد تقييمات بعد. استخدم الأزرار أعلاه
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                  <span className="text-3xl">👥</span>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
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
                                    showGradePicker={activeSkillForGrade?.id === skill.id}
                                  />
                                ))
                              ) : (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                  <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                                  <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد مهارات لهذه المادة</p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500">أضف مهارات من خدمات ← إدارة المهارات</p>
                                </div>
                              )}

                              {/* إضافة مهارة من صفحة إدارة المهارات */}
                              {subjectId && (
                                <AddSkillRedirect onClose={onClose} />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ═══ حالة الحفظ ═══ */}
            {isPending && (
              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 text-center">
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
