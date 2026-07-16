/* عناصر بصرية مشتركة لعائلة «الحالات الطلابية»
   (القائمة + التفاصيل + النموذج) — عرض فقط، لا منطق */
import type { ReactNode } from 'react'

type Severity = 'low' | 'medium' | 'high' | 'critical'
type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'

/* اللوحة الهادئة المعتمدة: خلفية فاتحة + حد أفتح + نص مشبع من نفس العائلة */
export interface Tone {
  bg: string
  bd: string
  tx: string
}

export const TONES: Record<string, Tone> = {
  green: { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46' },
  amber: { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A' },
  sky: { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E' },
  purple: { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9' },
  red: { bg: '#FBEAEA', bd: '#EFC5C5', tx: '#C43D3D' },
  gray: { bg: '#F3F4F6', bd: '#E5E7EB', tx: '#6B7280' },
}

/* الأولوية كمقياس حرارة متصاعد: أخضر → سماوي → كهرماني → أحمر */
export const SEVERITY_META: Record<Severity, { label: string; tone: Tone; level: number }> = {
  low: { label: 'منخفضة', tone: TONES.green, level: 1 },
  medium: { label: 'متوسطة', tone: TONES.sky, level: 2 },
  high: { label: 'عالية', tone: TONES.amber, level: 3 },
  critical: { label: 'عاجلة', tone: TONES.red, level: 4 },
}

export const STATUS_META: Record<CaseStatus, { label: string; tone: Tone }> = {
  open: { label: 'مفتوحة', tone: TONES.sky },
  in_progress: { label: 'قيد المعالجة', tone: TONES.purple },
  on_hold: { label: 'معلقة', tone: TONES.gray },
  closed: { label: 'مغلقة', tone: TONES.green },
}

export const CATEGORY_TONES: Record<string, Tone> = {
  سلوكية: TONES.red,
  أكاديمية: TONES.sky,
  اجتماعية: TONES.green,
  نفسية: TONES.purple,
  صحية: TONES.amber,
  أخرى: TONES.gray,
}

export const categoryTone = (category: string): Tone => CATEGORY_TONES[category] ?? TONES.gray

/** شريحة بلون هادئ من اللوحة المعتمدة */
export function ToneChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="ws-chip" style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}>
      {children}
    </span>
  )
}

/** مقياس شدة الأولوية: أربعة أعمدة متصاعدة تمتلئ حسب الدرجة */
export function SeverityMeter({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity]
  return (
    <span
      className={severity === 'critical' ? 'ws-soft-pulse' : undefined}
      title={`الأولوية: ${meta.label}`}
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}
    >
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          style={{
            width: 4,
            height: 4 + step * 2.5,
            borderRadius: 2,
            background: step <= meta.level ? meta.tone.tx : 'var(--ws-border)',
          }}
        />
      ))}
    </span>
  )
}

/** أولوية كاملة: مقياس + تسمية ملونة */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <SeverityMeter severity={severity} />
      <span style={{ color: meta.tone.tx, fontWeight: 700, fontSize: 11.5 }}>{meta.label}</span>
    </span>
  )
}

/** دائرة الحرف الأول بلون تصنيف الحالة */
export function InitialAvatar({ name, tone, size = 24 }: { name: string; tone: Tone; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.44,
        fontWeight: 800,
        background: tone.bg,
        color: tone.tx,
        border: `1px solid ${tone.bd}`,
      }}
    >
      {name ? name[0] : '؟'}
    </span>
  )
}
