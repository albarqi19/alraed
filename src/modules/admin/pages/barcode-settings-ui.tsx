import { useMemo } from 'react'
import { TONES } from '@/shared/workspace'
import type { BarcodeScanRecord } from '../barcode/types'

/* ═══════════════════════════════════════════════════════════
   وحدات إعدادات البوابة — «الصباح المُعاد»
   أنت لا تضبط عتبة، بل تُعيد محاكمة صباحٍ وقع فعلاً — والأثر يُرى
   قبل الحفظ، من بيانات حقيقية، بلا مغادرة الصفحة.
   ═══════════════════════════════════════════════════════════ */

/** "07:15:23" → 435 دقيقة. scan_time يصل نصاً خاماً بلا cast */
export const toMin = (t: string): number => {
  if (!t || t.length < 5) return 0
  return +t.slice(0, 2) * 60 + +t.slice(3, 5)
}

export const minToLabel = (m: number): string => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export interface ReplayModel {
  t0: number
  t1: number
  span: number
  buckets: number[] // عدد الوصول في كل شريحة ٥ دقائق
  maxBucket: number
  startMin: number
  lateMin: number
  cutMin: number
  nowMin: number | null
  // العواقب المُعاد حسابها بالإعداد غير المحفوظ
  present: number
  late: number
  afterCut: number
  x: (m: number) => number
}

/**
 * إعادة الحساب — مرآة BarcodeAttendanceService.php:85-88 بالضبط.
 * greaterThan: أكبر تماماً لا أكبر-أو-يساوي — مسحة عند العتبة بالثانية = حاضر.
 */
export function buildReplay(
  scans: BarcodeScanRecord[],
  draft: {
    barcode_school_start_time: string
    barcode_late_threshold_minutes: number
    barcode_absence_cutoff_time: string
  },
  todayIso: string,
  dayIso: string,
): ReplayModel {
  const startMin = toMin(draft.barcode_school_start_time)
  const lateMin = startMin + Math.round(draft.barcode_late_threshold_minutes)
  const cutMin = toMin(draft.barcode_absence_cutoff_time)

  const arrivals = scans
    .filter((s) => s.scan_result === 'present' || s.scan_result === 'late')
    .map((s) => toMin(s.scan_time))
    .filter((m) => m > 0)

  const lo = Math.min(startMin - 20, ...(arrivals.length ? arrivals : [startMin - 20]))
  const hi = Math.max(cutMin + 15, ...(arrivals.length ? arrivals : [cutMin + 15]))
  const t0 = Math.floor(lo / 5) * 5
  const t1 = Math.ceil(hi / 5) * 5
  const span = Math.max(5, t1 - t0)
  const nB = Math.round(span / 5)

  const buckets = new Array(nB).fill(0)
  let present = 0
  let late = 0
  let afterCut = 0
  for (const m of arrivals) {
    const idx = Math.min(nB - 1, Math.max(0, Math.floor((m - t0) / 5)))
    buckets[idx] += 1
    if (m >= cutMin) afterCut += 1
    else if (m > lateMin) late += 1
    else present += 1
  }

  const nowMin = dayIso === todayIso ? new Date().getHours() * 60 + new Date().getMinutes() : null
  const x = (m: number) => ((m - t0) / span) * 100

  return {
    t0,
    t1,
    span,
    buckets,
    maxBucket: Math.max(1, ...buckets),
    startMin,
    lateMin,
    cutMin,
    nowMin: nowMin != null && nowMin >= t0 && nowMin <= t1 ? nowMin : null,
    present,
    late,
    afterCut,
    x,
  }
}

/* ★ اللمسة: مخطط إعادة المحاكمة — أعمدة الوصول، نصل التأخير، حافة القطع */
export function MorningReplay({ model }: { model: ReplayModel }) {
  const { buckets, maxBucket, x, startMin, lateMin, cutMin, nowMin, t0, span } = model

  // تسميات المحور: كل ١٥ دقيقة
  const ticks = useMemo(() => {
    const out: number[] = []
    const first = Math.ceil(t0 / 15) * 15
    for (let m = first; m <= t0 + span; m += 15) out.push(m)
    return out
  }, [t0, span])

  return (
    <div>
      <div
        style={{
          position: 'relative',
          height: 128,
          border: '1px solid var(--ws-hairline)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--ws-surface)',
        }}
      >
        {/* z0 — غسلتان: الحاضر (أخضر خفيف حتى نصل التأخير) وأرض التناقض (أحمر بعد القطع) */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineStart: `${x(startMin)}%`,
            width: `${x(lateMin) - x(startMin)}%`,
            background: TONES.green.bg,
          }}
        />
        <span
          title="أرض التناقض: كل طالب هنا يحمل صفّ غياب وصفّ تأخير معاً، ووليّه تلقّى رسالة غياب عن طفل مسح بطاقته"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineStart: `${x(cutMin)}%`,
            width: `${100 - x(cutMin)}%`,
            background: `repeating-linear-gradient(45deg, ${TONES.red.bg} 0 5px, transparent 5px 10px)`,
          }}
        />

        {/* z1 — أعمدة الوصول (الارتفاع كمّي، لا يُلوّن) */}
        <span
          style={{
            position: 'absolute',
            inset: '18px 0 0 0',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {buckets.map((count, i) => (
            <span
              key={i}
              title={count > 0 ? `${minToLabel(t0 + i * 5)} · ${count} وصول` : undefined}
              style={{
                flex: 1,
                height: `${(count / maxBucket) * 100}%`,
                background: 'var(--ws-text-2)',
                borderInlineEnd: '1px solid var(--ws-surface)',
                opacity: count > 0 ? 0.85 : 0,
              }}
            />
          ))}
        </span>

        {/* z2 — تكّة بداية الدوام */}
        <span
          title={`بداية الدوام ${minToLabel(startMin)}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineStart: `${x(startMin)}%`,
            borderInlineStart: '1px dashed var(--ws-border)',
          }}
        />

        {/* z3 — نصل التأخير */}
        <span
          title={`عتبة التأخير ${minToLabel(lateMin)}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineStart: `${x(lateMin)}%`,
            width: 2,
            background: TONES.amber.tx,
          }}
        />

        {/* z4 — إبرة «الآن» */}
        {nowMin != null && (
          <span
            title={`الآن ${minToLabel(nowMin)}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              insetInlineStart: `${x(nowMin)}%`,
              width: 2,
              background: TONES.sky.tx,
            }}
          />
        )}

        {/* محور التسميات */}
        {ticks.map((m) => (
          <span
            key={m}
            style={{
              position: 'absolute',
              bottom: 2,
              insetInlineStart: `${x(m)}%`,
              transform: 'translateX(50%)',
              fontSize: 9,
              color: 'var(--ws-text-2)',
              pointerEvents: 'none',
            }}
          >
            {minToLabel(m)}
          </span>
        ))}
      </div>

      {/* قسائم العواقب — تُحسب بالإعداد غير المحفوظ */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11 }}>
        <ConseqChip tone={TONES.green} label="حاضر" value={model.present} />
        <ConseqChip tone={TONES.amber} label="متأخر" value={model.late} />
        <ConseqChip tone={TONES.red} label="بعد القطع" value={model.afterCut} />
      </div>
    </div>
  )
}

function ConseqChip({ tone, label, value }: { tone: typeof TONES.green; label: string; value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 6,
        background: tone.bg,
        border: `1px solid ${tone.bd}`,
        color: tone.tx,
        fontWeight: 700,
      }}
    >
      {label}
      <b>{value.toLocaleString('ar-SA-u-nu-latn')}</b>
    </span>
  )
}

export const WEEK_DAYS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]
