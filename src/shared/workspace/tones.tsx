/* ======================================================
   اللوحة اللونية الهادئة — Workspace Tones
   ------------------------------------------------------
   لوحة التطعيمات المعتمدة لصفحات الأدمن (2026-07-16):
   خلفية فاتحة + حد أفتح + نص مشبع من نفس العائلة.
   تُستخدم للحالات والتصنيفات والمقاييس عبر كل الصفحات
   حتى يبقى نفس اللون يعني نفس الشيء في كل مكان.
   ممنوع: الشريط الجانبي الملوّن على حافة العنصر.
   ====================================================== */
import type { ReactNode } from 'react'

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

/** شريحة بلون هادئ من اللوحة المعتمدة */
export function ToneChip({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={className ? `ws-chip ${className}` : 'ws-chip'} style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}>
      {children}
    </span>
  )
}

/** دائرة الحرف الأول بلون مشتق من سياق العنصر */
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
