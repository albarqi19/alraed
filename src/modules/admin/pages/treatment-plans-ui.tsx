/* عناصر بصرية مشتركة لعائلة «الخطط العلاجية»
   (القائمة + التفاصيل + النموذج) — عرض فقط، لا منطق */
import { AlertTriangle, BookOpen, Brain, HeartPulse, Layers, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GoalStatus, ProblemType, TreatmentPlanStatus } from '@/modules/guidance/types'
import { TONES, ToneChip, type Tone } from './student-cases-ui'

export const PLAN_STATUS_META: Record<TreatmentPlanStatus, { label: string; tone: Tone }> = {
  draft: { label: 'مسودة', tone: TONES.gray },
  active: { label: 'نشطة', tone: TONES.green },
  suspended: { label: 'معلقة', tone: TONES.amber },
  completed: { label: 'مكتملة', tone: TONES.sky },
  cancelled: { label: 'ملغاة', tone: TONES.red },
  on_hold: { label: 'معلقة', tone: TONES.amber },
}

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; tone: Tone }> = {
  not_started: { label: 'لم تبدأ', tone: TONES.gray },
  in_progress: { label: 'قيد التنفيذ', tone: TONES.sky },
  achieved: { label: 'تحققت', tone: TONES.green },
  partially_achieved: { label: 'تحققت جزئياً', tone: TONES.amber },
  not_achieved: { label: 'لم تتحقق', tone: TONES.red },
}

/* نفس ألوان تصنيفات الحالات الطلابية للاتساق البصري */
export const PROBLEM_META: Record<ProblemType, { icon: LucideIcon; tone: Tone }> = {
  سلوكية: { icon: AlertTriangle, tone: TONES.red },
  دراسية: { icon: BookOpen, tone: TONES.sky },
  نفسية: { icon: Brain, tone: TONES.purple },
  اجتماعية: { icon: Users, tone: TONES.green },
  صحية: { icon: HeartPulse, tone: TONES.amber },
  مختلطة: { icon: Layers, tone: TONES.gray },
}

export const EFFECTIVENESS_META: Array<{ value: string; label: string; tone: Tone }> = [
  { value: 'highly_effective', label: 'فعالة جداً', tone: TONES.green },
  { value: 'effective', label: 'فعالة', tone: TONES.green },
  { value: 'moderately_effective', label: 'فعالة نسبياً', tone: TONES.amber },
  { value: 'slightly_effective', label: 'فعالة قليلاً', tone: TONES.amber },
  { value: 'not_effective', label: 'غير فعالة', tone: TONES.red },
]

/** حلقة تقدم دائرية — التوقيع البصري لصفحات الخطط العلاجية */
export function ProgressRing({ value, size = 44, stroke = 5, title }: { value: number; size?: number; stroke?: number; title?: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = clamped >= 75 ? TONES.green.tx : clamped >= 50 ? TONES.sky.tx : clamped > 0 ? TONES.amber.tx : 'var(--ws-text-2)'
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', flexShrink: 0 }} title={title}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ws-border)" strokeWidth={stroke} opacity={0.6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={clamped > 0 ? color : 'transparent'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.26,
          fontWeight: 800,
          color,
        }}
      >
        {clamped}%
      </span>
    </span>
  )
}

/** شريحة المدة المتبقية للخطة: متأخر / ينتهي اليوم / X يوم متبقي */
export function DaysRemainingChip({ endDate }: { endDate?: string | null }) {
  if (!endDate) return null
  const diff = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return <ToneChip tone={TONES.red}>متأخر {Math.abs(diff)} يوم</ToneChip>
  if (diff === 0) return <ToneChip tone={TONES.amber}>ينتهي اليوم</ToneChip>
  if (diff <= 7) return <ToneChip tone={TONES.amber}>{diff} يوم متبقي</ToneChip>
  return <ToneChip tone={TONES.gray}>{diff} يوم متبقي</ToneChip>
}
