/* عناصر بصرية مشتركة لعائلة «الحالات الطلابية»
   (القائمة + التفاصيل + النموذج) — عرض فقط، لا منطق
   اللوحة اللونية نفسها تعيش في @/shared/workspace وتُعاد تصديرها هنا للتوافق */
import { TONES, type Tone } from '@/shared/workspace'

export { TONES, ToneChip, InitialAvatar, type Tone } from '@/shared/workspace'

type Severity = 'low' | 'medium' | 'high' | 'critical'
type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'

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

