import { FolderOpen } from 'lucide-react'

import { TONES, ToneChip } from '@/shared/workspace'

import type { LdVerdict } from '../types'

/**
 * نبراتُ الحكم. واللفظُ استفهامٌ لا حكم: «لها ظِلّ» لا «مرفوضة» — الصفُّ
 * يبقى قابلاً لكلّ إجراء.
 */
const VERDICT_TONES: Record<LdVerdict, keyof typeof TONES> = {
  specific_consensus: 'red',
  specific_single: 'amber',
  shadowed: 'sky',
  general: 'gray',
  below: 'gray',
}

interface VerdictChipProps {
  verdict: LdVerdict
  label: string
  reason?: string
  followed?: boolean
  ownerName?: string | null
}

export function VerdictChip({ verdict, label, reason, followed, ownerName }: VerdictChipProps) {
  const tone = TONES[VERDICT_TONES[verdict] ?? 'gray']

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={reason}>
      <ToneChip tone={tone}>{label}</ToneChip>

      {followed && (
        <span
          title={ownerName ? `متابَع سلفاً لدى: ${ownerName}` : 'متابَع سلفاً — أخذُه يزدوج الجهد'}
          style={{ display: 'inline-flex', color: 'var(--ws-text-2)' }}
        >
          <FolderOpen size={13} aria-label="متابَع سلفاً" />
        </span>
      )}
    </span>
  )
}

const SEVERITY_TONES = {
  high: TONES.red,
  medium: TONES.amber,
  low: TONES.green,
} as const

/**
 * الشدّة: الزوجُ خاماً دائماً — لا نسبةٌ عارية.
 *
 * واللونُ يُقرأ من `severity` التي حسبها الخادمُ بعتبات النموذج نفسِه، ولا
 * يُعاد اشتقاقُه هنا: العتبةُ تصل صفراً قبل تحميل النماذج، و`score >= 0`
 * صحيحٌ دائماً فيُصبغ كلُّ طالبٍ بالأحمر.
 */
export function SeverityBar({
  score,
  max,
  severity,
  thresholdHigh = 0,
}: {
  score: number
  max: number
  severity: 'low' | 'medium' | 'high'
  /** نسبةٌ مئويّة (0–100) من مدى النسخة — تُرسم علامةً على الشريط لا سقفاً له. */
  thresholdHigh?: number
}) {
  const ceiling = Math.max(max, 1)
  const tone = SEVERITY_TONES[severity] ?? TONES.green
  const marker = thresholdHigh > 0 && thresholdHigh <= 100 ? thresholdHigh : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: tone.tx, fontVariantNumeric: 'tabular-nums' }}>
        {score} / {max}
      </span>
      <div
        style={{
          position: 'relative',
          width: 96,
          height: 4,
          background: 'var(--ws-sunken)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (score / ceiling) * 100)}%`,
            height: '100%',
            background: tone.tx,
          }}
        />
        {marker !== null && (
          <span
            title={`العتبة الحمراء ${marker}%`}
            style={{
              position: 'absolute',
              insetInlineStart: `${marker}%`,
              top: 0,
              width: 1,
              height: '100%',
              background: TONES.red.tx,
              opacity: 0.6,
            }}
          />
        )}
      </div>
    </div>
  )
}
