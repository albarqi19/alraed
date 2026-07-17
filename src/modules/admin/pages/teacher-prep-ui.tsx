import { TONES } from '@/shared/workspace'

/* ═══════════════════════════════════════════════════════════
   وحدات تحضير مدرستي — «مِشط الجرس»
   جرس المدرسة واحدٌ يتقاسمه كل المعلمين. كل حصة غير محضّرة تحمل
   موعداً نهائياً، والصفحة لقطةٌ تتعفّن مع الساعة. المشط يفرش الجرس
   تحت كل صف، ويمرّر خطّين — لحظةَ تجمّد اللقطة، والآنَ الحيّ —
   فينقسم عمل المدير إلى ما يُنقَذ وما فات، بلا حساب واحد.
   ═══════════════════════════════════════════════════════════ */

export type PrepStatus = 'prepared' | 'waiting' | 'warning' | 'activity' | 'empty'

export interface BellPeriod {
  period: number
  from_min: number | null
  to_min: number | null
}

export interface PrepLesson {
  period_number: number
  status: PrepStatus
  subject: string | null
  class_name: string | null
}

/**
 * waiting وwarning تنهاران إلى unprepared: warning ⟺ بدأت الحصة لحظة
 * السحب، فهما ترميزٌ زائد لساعة اللقطة لا شدّة. قابلية الإنقاذ تُحسب
 * مقابل «الآن» الحيّ لا مقابل لحظة السحب المجمّدة.
 */
export const isUnprepared = (s: PrepStatus) => s === 'waiting' || s === 'warning'

/** الآن بالدقائق منذ منتصف الليل (توقيت الجهاز = الرياض لكل المستخدمين) */
export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function isoToMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

export function minLabel(min: number | null): string {
  if (min == null) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface BellScale {
  lo: number
  hi: number
  span: number
  cellW: number
  width: number
}

const CELL_W = 22

export function bellScale(bell: BellPeriod[]): BellScale | null {
  const froms = bell.map((b) => b.from_min).filter((x): x is number => x != null)
  const tos = bell.map((b) => b.to_min).filter((x): x is number => x != null)
  if (!froms.length || !tos.length) return null
  const lo = Math.min(...froms)
  const hi = Math.max(...tos)
  const span = Math.max(1, hi - lo)
  return { lo, hi, span, cellW: CELL_W, width: bell.length * CELL_W }
}

/** موضع لحظة على المحور من الحافة اليمنى (RTL) */
export function xOf(scale: BellScale, min: number): number {
  return Math.min(scale.width, Math.max(0, ((min - scale.lo) / scale.span) * scale.width))
}

/** هل اللقطة حيّة اليوم؟ */
export function isSnapshotLive(weekday: string | null, extractionDate: string, todayIso: string): boolean {
  if (extractionDate !== todayIso) return false
  // day يطابق يوم اليوم — لكن سحبات المساء تقرأ جدول الغد، فالتطابق شرط
  return Boolean(weekday && weekday === todayArabicWeekday())
}

export function todayArabicWeekday(): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return days[new Date().getDay()]
}

/* ★ مِشط الجرس — سبع خانات في مواضع ثابتة + قاطعان */
export function BellComb({
  lessons,
  bell,
  scale,
  extractedMin,
  nowMin,
  live,
}: {
  lessons: PrepLesson[]
  bell: BellPeriod[]
  scale: BellScale
  extractedMin: number | null
  nowMin: number | null
  live: boolean
}) {
  const byPeriod = new Map(lessons.map((l) => [l.period_number, l]))

  return (
    <div style={{ position: 'relative', display: 'inline-block', paddingBottom: 3 }}>
      <div style={{ display: 'flex', position: 'relative', height: 26 }}>
        {bell.map((b, i) => {
          const lesson = byPeriod.get(b.period)
          const w = b.from_min != null && b.to_min != null
            ? ((b.to_min - b.from_min) / scale.span) * scale.width
            : scale.cellW
          return (
            <span
              key={b.period}
              style={{
                width: w,
                height: 26,
                borderInlineEnd: i < bell.length - 1 ? '1px solid #EDEFF2' : undefined,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <BellCell lesson={lesson} periodStart={b.from_min} nowMin={nowMin} live={live} />
            </span>
          )
        })}

        {/* خط السحب — لحظة تجمّد اللقطة */}
        {extractedMin != null && (
          <span
            title={`سُحب ${minLabel(extractedMin)}`}
            style={{
              position: 'absolute',
              insetInlineStart: xOf(scale, extractedMin),
              top: 0,
              bottom: 0,
              width: 0,
              borderInlineStart: '1px dashed #9AA4B2',
            }}
          />
        )}

        {/* خط الآن — والمنطقة بينه وبين السحب هي التعفّن، مجاناً */}
        {live && nowMin != null && nowMin >= scale.lo && nowMin <= scale.hi && (
          <span
            title={`الآن ${minLabel(nowMin)}`}
            style={{
              position: 'absolute',
              insetInlineStart: xOf(scale, nowMin),
              top: -2,
              bottom: -2,
              width: 0,
              borderInlineStart: `1.5px solid ${TONES.sky.tx}`,
            }}
          />
        )}
      </div>
      {/* الأرضية */}
      <span style={{ display: 'block', height: 1, background: '#E5E7EB', width: scale.width }} />
    </div>
  )
}

function BellCell({
  lesson,
  periodStart,
  nowMin,
  live,
}: {
  lesson: PrepLesson | undefined
  periodStart: number | null
  nowMin: number | null
  live: boolean
}) {
  if (!lesson || lesson.status === 'empty') {
    // لا حصة — شريط رفيع
    return <span style={{ position: 'absolute', insetInline: 2, top: 12, height: 3, background: '#EFF1F3', borderRadius: 2 }} />
  }

  if (lesson.status === 'prepared') {
    return <span style={{ position: 'absolute', inset: '3px 1px', background: '#DDE1E6', borderRadius: 2 }} title={`الحصة ${lesson.period_number} · محضّرة`} />
  }

  if (lesson.status === 'activity') {
    return (
      <span
        title={`الحصة ${lesson.period_number} · نشاط (لا يُحضَّر)`}
        style={{ position: 'absolute', inset: '3px 1px', border: '1px dashed #CBD2D9', borderRadius: 2 }}
      />
    )
  }

  // غير محضّرة — تُنقَذ إن كانت حيّة والحصة لم تبدأ بعد بالنسبة لـ«الآن»
  const salvageable = live && periodStart != null && nowMin != null && periodStart > nowMin

  if (salvageable) {
    return (
      <span
        className="ws-soft-pulse"
        title={`الحصة ${lesson.period_number} · غير محضّرة — تُنقَذ، تبدأ ${minLabel(periodStart)}`}
        style={{ position: 'absolute', inset: '3px 1px', background: TONES.amber.bg, border: `1px solid ${TONES.amber.bd}`, borderRadius: 2 }}
      />
    )
  }

  // فاتت — فجوة رمادية (ثقب دائم، الرسالة عنها ضجيج)
  return (
    <span
      title={`الحصة ${lesson.period_number} · غير محضّرة — فاتت`}
      style={{ position: 'absolute', inset: '3px 1px', background: 'var(--ws-surface)', border: '1px solid #CBD2D9', borderRadius: 2 }}
    />
  )
}

export interface TeacherPrepMetrics {
  salvageable: number
  missed: number
  prepared: number
  total: number
}

export function teacherPrepMetrics(
  lessons: PrepLesson[],
  bell: BellPeriod[],
  nowMin: number | null,
  live: boolean,
): TeacherPrepMetrics {
  const startByPeriod = new Map(bell.map((b) => [b.period, b.from_min]))
  let salvageable = 0
  let missed = 0
  let prepared = 0
  for (const l of lessons) {
    if (l.status === 'prepared') prepared += 1
    else if (isUnprepared(l.status)) {
      const start = startByPeriod.get(l.period_number)
      if (live && start != null && nowMin != null && start > nowMin) salvageable += 1
      else missed += 1
    }
  }
  return { salvageable, missed, prepared, total: lessons.length }
}
