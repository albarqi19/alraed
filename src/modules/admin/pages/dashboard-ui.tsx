import { useEffect, useRef, useState } from 'react'
import { TONES } from '@/shared/workspace'
import type { AdminDashboardStats } from '@/modules/admin/types'

/* ═══════════════════════════════════════════════════════════
   وحدات «نظرة عامة» — طابور الصباح
   ═══════════════════════════════════════════════════════════ */

export type WeekDay = NonNullable<AdminDashboardStats['weekly_attendance']>[number]

/** Y-m-d محلي بلا انجراف UTC — الخادم يصوغ date بتوقيت الرياض (config/app.php) */
export const todayIso = () => new Date().toLocaleDateString('sv-SE')

/**
 * يوم اليوم يُقرأ بمطابقة `date` لا بالفهرس [0].
 * الحلقة في الخادم تتخطى الجمعة والسبت بـcontinue، فيوم الجمعة يكون [0]
 * هو **الخميس الماضي** — أي قراءة من الفهرس صفر تكذب يومين في كل أسبوع.
 */
export function findToday(days: WeekDay[]): WeekDay | null {
  const iso = todayIso()
  return days.find((d) => d.date === iso) ?? null
}

/**
 * الصمت العنيد: عدد الطلاب الذين لم يُرصدوا في **أي** يوم مكتمل هذا الأسبوع.
 *
 * رياضياً: unrecorded(d) = T − recorded(d) بمقام واحد T،
 * إذن min(unrecorded) = T − max(recorded).
 *
 * تُعتمد الكمية ويُرفض تفسيرها: ثلاث حالات تنتجها (مستوردٌ جديد، منسحبٌ ما زال
 * active، فصلٌ بلا معلم) — فالتسمية الصادقة هي وصفها الحرفي بلا اتهام.
 * الاسم هو ما يجعل الرقم صادقاً أو كاذباً، لا الحساب.
 */
export function chronicSilence(days: WeekDay[]): number {
  const completed = days.filter((d) => d.date !== todayIso())
  if (completed.length < 3) return 0
  return Math.min(...completed.map((d) => d.unrecorded_students))
}

/** «حُسب ٧:٠٤ · قبل ٢١ دقيقة» — الصمت المعروض يحمل ساعته */
export function freshnessLabel(generatedAt?: string): string | null {
  if (!generatedAt) return null
  const then = new Date(generatedAt)
  if (Number.isNaN(then.getTime())) return null
  const mins = Math.floor((Date.now() - then.getTime()) / 60000)
  const clock = then.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  if (mins < 1) return `حُسب ${clock} · الآن`
  if (mins === 1) return `حُسب ${clock} · قبل دقيقة`
  if (mins < 60) return `حُسب ${clock} · قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  return `حُسب ${clock} · قبل ${hrs} ساعة`
}

export const arNum = (n: number) => n.toLocaleString('ar-SA')

/* ═══ ★ لمسة التوقيع: طابور الصباح ═══
   انقلاب الحبر — الحبر لا يُصرف إلا على ما لم يُرصد.
   المرصود رمادي صامت، واليوم المكتمل شبكةٌ بلا لون.

   ولماذا لا أخضر لـ«حاضر»: --ws-accent-2 يتبع أساس المظهر النشط
   (ست قيم، منها برتقالي #E8953B في مظهر warm) — فبناء محور دلالي
   على الأخضر يصطدم بالكروم. الطابور لا يرث شيئاً: ألوانه صريحة في
   <rect fill> فينجو تحت المظاهر الستة كلها. */

const SQ = 6
const GAP = 3
const PITCH = SQ + GAP
const MAX_NODES = 2400

interface MorningQueueProps {
  total: number
  recorded: number
  chronic: number
}

export function MorningQueue({ total, recorded, chronic }: MorningQueueProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const per = Math.max(1, Math.ceil(total / MAX_NODES))
  const units = Math.ceil(total / per)
  const cols = Math.max(24, Math.floor((width || 900) / PITCH))
  const rows = Math.ceil(units / cols)
  const height = Math.max(PITCH, rows * PITCH - GAP)

  // التوزيع يحفظ المجموع بلا انجراف تقريب
  const recU = Math.min(Math.round(recorded / per), units)
  const chrU = Math.min(Math.round(chronic / per), Math.max(units - recU, 0))
  const silU = Math.max(units - recU - chrU, 0)

  // الترتيب من اليمين: [رُصد] ثم [لم يُرصد بعد] ثم [صامت الأسبوع] في الذيل.
  // الذيل مقصود: المهشّر يستقرّ في النهاية ولا يتحرّك، فتذوب الصفرة أمامه
  // ويبقى وحده — الحركة تُنتج الاكتشاف بلا شرح.
  const pos = (i: number) => ({
    x: (width || 900) - SQ - (i % cols) * PITCH,
    y: Math.floor(i / cols) * PITCH,
  })

  const cells = (from: number, count: number, fill: string, stroke?: string) => {
    const out = []
    for (let k = 0; k < count; k++) {
      const { x, y } = pos(from + k)
      out.push(
        <rect
          key={from + k}
          x={x}
          y={y}
          width={SQ}
          height={SQ}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 1 : undefined}
        />,
      )
    }
    return out
  }

  return (
    <div ref={hostRef} style={{ width: '100%' }}>
      <svg width={width || '100%'} height={height} shapeRendering="crispEdges" role="img"
        aria-label={`${arNum(recorded)} من ${arNum(total)} رُصدوا · ${arNum(total - recorded)} لم يُرصدوا بعد`}>
        <defs>
          <pattern id="ws-mq-hatch" width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={4} height={4} fill="transparent" />
            <line x1={0} y1={0} x2={0} y2={4} stroke={TONES.gray.tx} strokeWidth={1} opacity={0.55} />
          </pattern>
        </defs>
        {/* رُصد — رمادي مصمت: نطق، أياً كانت حالته */}
        {cells(0, recU, TONES.gray.bd)}
        {/* لم يُرصد بعد — الصمت القابل للإصلاح، يذوب مع الصباح */}
        {cells(recU, silU, TONES.amber.bg)}
        {/* صامت طوال الأسبوع — الصمت العنيد، لا يذوب. تهشير لا لون ثانٍ */}
        {cells(recU + silU, chrU, 'url(#ws-mq-hatch)', TONES.gray.bd)}
      </svg>
    </div>
  )
}

export function QueueLegend({ recorded, silent, chronic, total }: {
  recorded: number
  silent: number
  chronic: number
  total: number
}) {
  const items = [
    { key: 'rec', label: 'رُصد', count: recorded, swatch: <span style={{ width: 9, height: 9, borderRadius: 2, background: TONES.gray.bd, display: 'inline-block' }} /> },
    { key: 'sil', label: 'لم يُرصد بعد', count: silent, swatch: <span style={{ width: 9, height: 9, borderRadius: 2, background: TONES.amber.bg, border: `1px solid ${TONES.amber.bd}`, display: 'inline-block' }} /> },
  ]
  if (chronic > 0) {
    items.push({
      key: 'chr',
      label: 'لم يُرصدوا في أي يوم هذا الأسبوع',
      count: chronic,
      swatch: (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 2,
            border: `1px solid ${TONES.gray.bd}`,
            background: `repeating-linear-gradient(45deg, ${TONES.gray.bd} 0 1px, transparent 1px 3px)`,
            display: 'inline-block',
          }}
        />
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 9 }}>
      {items.map((it) => (
        <span key={it.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
          {it.swatch}
          {it.label}
          <b style={{ color: it.key === 'sil' && it.count > 0 ? TONES.amber.tx : 'var(--ws-text)' }}>{arNum(it.count)}</b>
        </span>
      ))}
      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', marginInlineStart: 'auto' }}>
        من {arNum(total)} طالباً نشطاً
      </span>
    </div>
  )
}
