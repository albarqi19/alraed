import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { TONES } from '@/shared/workspace'
import type { BarcodeStudentRecord } from '../barcode/types'

/* ═══════════════════════════════════════════════════════════
   وحدات طباعة الباركود — «الرصّة»
   الأطروحة: هذه الصفحة الوحيدة في النظام منتَجها وَرَق، ويقرؤه
   ليزر لا إنسان. فلتُرَ الورقة، لا جدول الطلاب.
   ═══════════════════════════════════════════════════════════ */

export type PrintFormat = 'card' | 'label' | 'list'

/**
 * هندسة الورقة — كل رقم مشتقّ من barcode-cards.blade.php ومن
 * BarcodeGeneratorController:130-133، لا من الخيال.
 *
 * الأعمدة ليست تخميناً: chunk(2) في blade:120 و chunk(3) في blade:139.
 * والسعة مقيسة بتصيير mPDF حقيقي، وتقسم على الأعمدة بلا كسر:
 * 18/2 = 9 و 33/3 = 11 — الهندسة تصادق على نفسها.
 */
export const SHEET: Record<PrintFormat, { perPage: number; cols: number; label: string }> = {
  card: { perPage: 18, cols: 2, label: 'بطاقة' },
  label: { perPage: 33, cols: 3, label: 'ملصق' },
  list: { perPage: 17, cols: 1, label: 'قائمة' },
}

/** CODE128 لا يفكّ رموزاً خارج ASCII — والماسح على الباب لن يشتكي، سيصمت */
export function isScannable(nationalId: string | null | undefined): boolean {
  if (!nationalId) return false
  const v = nationalId.trim()
  if (v.length === 0) return false
  // CODE128 (B/C) يغطّي ASCII 32..126
  return /^[\x20-\x7E]+$/.test(v)
}

export interface StackModel {
  sheets: number
  lastSheetUsed: number
  perPage: number
  cols: number
  rows: number
  unscannable: number
}

export function buildStack(count: number, format: PrintFormat, unscannable: number): StackModel {
  const { perPage, cols } = SHEET[format]
  const sheets = count === 0 ? 0 : Math.ceil(count / perPage)
  const lastSheetUsed = count === 0 ? 0 : count - (sheets - 1) * perPage
  return { sheets, lastSheetUsed, perPage, cols, rows: Math.ceil(perPage / cols), unscannable }
}

/* ── باركود حقيقي، وعلامة مرئية عند الفشل بدل catch فارغ ── */
export function BarcodeSvg({ value, width = 1.5, height = 34 }: { value: string; width?: number; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const failed = useRef(false)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue: true,
        fontSize: 11,
        margin: 2,
        font: 'monospace',
      })
      failed.current = false
    } catch {
      // الفشل يُرى: catch الفارغ كان يترك svg خالياً بلا أي أثر
      failed.current = true
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [value, width, height])

  if (!isScannable(value)) {
    return (
      <span
        title="رقم لا يمكن ترميزه بـCODE128 — الماسح لن يقرأه"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          padding: '0 6px',
          borderRadius: 3,
          background: TONES.red.bg,
          color: TONES.red.tx,
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        لن يُقرأ
      </span>
    )
  }

  return <svg ref={ref} />
}

/* ═══ ★ لمسة التوقيع: الرصّة ═══
   الورقة بمقياس A4 حقيقي (k = W/210)، وعليها شبكة الخانات كما
   سيصفّها القالب — والورقة الأخيرة تُظهر ما بقي فارغاً. */

const A4_W = 210
const A4_H = 297
const MARGIN_MM = 10
const HEADER_MM = 15.3

export function SheetFace({
  format,
  filled,
  width = 240,
  showHeader = true,
}: {
  format: PrintFormat
  /** كم خانة مشغولة في هذه الورقة */
  filled: number
  width?: number
  showHeader?: boolean
}) {
  const { perPage, cols } = SHEET[format]
  const rows = Math.ceil(perPage / cols)
  const k = width / A4_W
  const height = A4_H * k
  const inset = MARGIN_MM * k
  const headerH = showHeader ? HEADER_MM * k : 0
  const contentW = width - inset * 2
  const contentH = height - inset * 2 - headerH
  const cellW = contentW / cols
  const cellH = contentH / rows

  const cells = []
  for (let i = 0; i < perPage; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    const on = i < filled
    cells.push(
      <span
        key={i}
        style={{
          position: 'absolute',
          // RTL: الخانة الأولى يميناً
          insetInlineStart: c * cellW + 1,
          top: r * cellH + 1,
          width: cellW - 2,
          height: cellH - 2,
          borderRadius: 2,
          background: on ? TONES.gray.bd : 'transparent',
          border: on ? 'none' : `1px dashed var(--ws-hairline)`,
        }}
      />,
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        border: '1px solid var(--ws-border)',
        borderRadius: 4,
        background: 'var(--ws-surface)',
        flexShrink: 0,
      }}
    >
      {showHeader && (
        <span
          style={{
            position: 'absolute',
            insetInline: inset,
            top: inset,
            height: headerH - 4,
            borderBottom: '1px solid var(--ws-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 7,
            color: 'var(--ws-text-2)',
          }}
        >
          ترويسة المدرسة
        </span>
      )}
      <span
        style={{
          position: 'absolute',
          insetInlineStart: inset,
          insetInlineEnd: inset,
          top: inset + headerH,
          height: contentH,
        }}
      >
        <span style={{ position: 'relative', display: 'block', width: contentW, height: contentH }}>{cells}</span>
      </span>
    </div>
  )
}

/** الرصّة: أوراق متراكبة + الورقة الأخيرة مكشوفة */
export function Stack({ stack, format }: { stack: StackModel; format: PrintFormat }) {
  if (stack.sheets === 0) {
    return null
  }
  const behind = Math.min(stack.sheets - 1, 4)

  return (
    <div style={{ position: 'relative', paddingTop: behind * 4, paddingInlineEnd: behind * 4 }}>
      {/* الأوراق الممتلئة خلف — إيحاء الرصّة */}
      {Array.from({ length: behind }, (_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: (behind - 1 - i) * 4,
            insetInlineEnd: (behind - 1 - i) * 4,
            width: 240,
            height: (A4_H * 240) / A4_W,
            border: '1px solid var(--ws-border)',
            borderRadius: 4,
            background: 'var(--ws-surface-2)',
          }}
        />
      ))}
      {/* الورقة الأخيرة مكشوفة — وهي وحدها التي قد تكون ناقصة */}
      <div style={{ position: 'relative' }}>
        <SheetFace format={format} filled={stack.lastSheetUsed} />
      </div>
    </div>
  )
}

export function studentLine(s: BarcodeStudentRecord): string {
  return `${s.grade} · ${s.class_name}`
}

/** مفتاح النطاق مركّب: «الفصل 4» وحده يخلط ٦ صفوف مختلفة */
export const scopeKey = (grade: string, className: string) => `${grade}|${className}`

export const GRADE_ORDER: Record<string, number> = {
  'الصف الأول': 1,
  'الصف الثاني': 2,
  'الصف الثالث': 3,
  'الصف الرابع': 4,
  'الصف الخامس': 5,
  'الصف السادس': 6,
  'أول متوسط': 7,
  'ثاني متوسط': 8,
  'ثالث متوسط': 9,
  'أول ثانوي': 10,
  'ثاني ثانوي': 11,
  'ثالث ثانوي': 12,
}
