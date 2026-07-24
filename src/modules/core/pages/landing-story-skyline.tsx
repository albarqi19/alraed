import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from 'react'

/* ══════════════════════════════════════════════════════════════
   أفق «قصّة يوم مدرسي» — الشريط السفلي لصفحة /story

   القواعد التي بُني عليها:
   ١) ثلاث طبقات عمق: البعيدة شبه شفافة فتكتسب لون السماء (منظور
      جوّي حقيقي)، والقريبة معتمة تماماً فتبقى حادّة الحدّ.
   ٢) لا قصّ: preserveAspectRatio="meet" — لا تُقطع قمّة مئذنة ولا
      برج مهما اتّسعت الشاشة، ونسختان بتوجيه فنّي مختلف لكل مقاس.
   ٣) كل قطعة مرسومة في إحداثيات محلّية (0,0 = نقطة ملامسة الأرض)
      ثم تُوضع بـ translate/scale — فتُعاد في النسختين بلا تكرار.
   ٤) شبكات النوافذ محسوبة لا مُخمَّنة: bays() توزّع خانات بهوامش
      متطابقة، والمدخل يحتلّ خانات محجوزة له فلا يتقاطع مع نافذة.
   ٥) المشهد مربوط بمحرك الشمس: هالة الغروب وحدّ الضوء على الحرف
      العلوي يتبعان موضع الشمس ولونها، والنوافذ تُضاء تدريجياً،
      وعقارب برج الساعة تتبع ساعة القصّة.
   ══════════════════════════════════════════════════════════════ */

/* ─── لوح الألوان ─── */

const FAR = 'rgba(10,18,44,0.26)' // الطبقة البعيدة: تكتسب لون السماء
const MID = 'rgba(10,18,44,0.62)' // الوسطى
const NEAR = '#0a1229' // القريبة: معتمة، حدّها حادّ
const FRONT = '#060d20' // رصيف المقدّمة
const GLASS = '#1b2749' // زجاج نهاري
const GLASS_FAINT = 'rgba(27,39,73,0.75)'
const LIT = '#ffcf72' // زجاج مضاء ليلاً
const FLAG = '#1f6440'
const DIAL = '#ecdfc4' // وجه ساعة البرج
const MOON_RGB: Rgb = [166, 186, 222]

/* ─── مساعدات ─── */

type Rgb = [number, number, number]
type Mode = 'fill' | 'crest'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

/** توزيع خانات متساوية على مجال — الهامش الأيمن = الأيسر بالضبط */
function bays(from: number, to: number, count: number, width: number) {
  const gap = (to - from - count * width) / (count + 1)
  return Array.from({ length: count }, (_, i) => from + gap + i * (width + gap))
}

/** جدول إضاءة ثابت: القيمة = لحظة الإضاءة (٠→١ داخل الليل)، و‎-1 = تبقى مطفأة */
const LIT_SCHEDULE = [0.05, 0.31, -1, 0.14, 0.47, 0.08, -1, 0.38, 0.2, 0.02, 0.26, -1, 0.44, 0.11, 0.35, 0.17, -1, 0.29]
const litAt = (index: number) => LIT_SCHEDULE[((index % LIT_SCHEDULE.length) + LIT_SCHEDULE.length) % LIT_SCHEDULE.length]

/** متغيّر CSS يحمل لحظة إضاءة هذه النافذة بعينها */
const litStyle = (on: number) => ({ ['--lp3-on']: String(on) }) as CSSProperties

/** يضع قطعة بإحداثياتها المحلّية في مكانها من المشهد */
function Place({ x, y, s = 1, children }: { x: number; y: number; s?: number; children: React.ReactNode }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{children}</g>
}

/* ─── نوافذ ─── */

function Win({ x, y, w, h, rx = 2.5, on, glass = GLASS }: { x: number; y: number; w: number; h: number; rx?: number; on: number; glass?: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={glass} />
      {on >= 0 && <rect className="lp3-lit" style={litStyle(on)} x={x} y={y} width={w} height={h} rx={rx} fill={LIT} />}
    </>
  )
}

function WinArch({ d, on, glass = GLASS }: { d: string; on: number; glass?: string }) {
  return (
    <>
      <path d={d} fill={glass} />
      {on >= 0 && <path className="lp3-lit" style={litStyle(on)} d={d} fill={LIT} />}
    </>
  )
}

/** قوس نافذة: عرض w وارتفاع جسم body وسهم قوس rise */
const archD = (x: number, baseY: number, w: number, body: number, rise: number) =>
  `M${x} ${baseY} L${x} ${baseY - body} Q${x + w / 2} ${baseY - body - rise * 2} ${x + w} ${baseY - body} L${x + w} ${baseY} Z`

/* ══ المسجد ══
   القبّة نصف دائرية مدبّبة (ارتفاع ٩٨ على قاعدة ١٣٠ = نسبة ٠٧٥.)،
   والمئذنة ملاصقة لجسم المسجد لا طائرة بعيداً عنه، والهلال متّصل
   بسنانه لا معلّق في الهواء. */
function Mosque({ mode }: { mode: Mode }) {
  if (mode === 'crest') {
    return (
      <>
        <path d="M65 -116 C65 -164 100 -194 130 -214 C160 -194 195 -164 195 -116" />
        <path d="M12 -86 C12 -108 24 -122 37 -128 C50 -122 62 -108 62 -86" />
        <path d="M198 -86 C198 -108 210 -122 223 -128 C236 -122 248 -108 248 -86" />
        <path d="M264 -240 C264 -256 272 -268 280 -272 C288 -268 296 -256 296 -240" />
        <path d="M256 -200 L304 -200" />
        <path d="M0 -86 L260 -86" />
      </>
    )
  }
  return (
    <>
      {/* بيت الصلاة */}
      <rect x="0" y="-86" width="260" height="86" />
      {/* قبّتان صغيرتان على السطح */}
      <path d="M12 -86 C12 -108 24 -122 37 -128 C50 -122 62 -108 62 -86 Z" />
      <path d="M198 -86 C198 -108 210 -122 223 -128 C236 -122 248 -108 248 -86 Z" />
      {/* رقبة القبّة ثم القبّة */}
      <rect x="65" y="-116" width="130" height="30" />
      <rect x="59" y="-122" width="142" height="10" rx="4" />
      <path d="M65 -116 C65 -164 100 -194 130 -214 C160 -194 195 -164 195 -116 Z" />
      {/* سنان القبّة وكرتها — متّصلان */}
      <rect x="127" y="-234" width="6" height="24" />
      <circle cx="130" cy="-240" r="8" />
      {/* المئذنة — ملاصقة للجسم، بجذع متدرّج */}
      <path d="M262 0 L268 -186 L292 -186 L298 0 Z" />
      <rect x="256" y="-200" width="48" height="14" rx="3" />
      <rect x="268" y="-240" width="24" height="40" />
      <path d="M264 -240 C264 -256 272 -268 280 -272 C288 -268 296 -256 296 -240 Z" />
      <rect x="278" y="-292" width="4" height="22" />
      {/* الهلال — مرسوم بقوسين، متّصل بالسنان */}
      <g transform="translate(280 -302) rotate(-125)">
        <path d="M2 -10.8 A11 11 0 0 0 -11 0 A11 11 0 0 0 2 10.8 A12.7 12.7 0 0 1 -4 0 A12.7 12.7 0 0 1 2 -10.8 Z" />
      </g>
      {/* مشكاة المئذنة — تتوهّج ليلاً */}
      <Win x={272} y={-232} w={16} h={22} rx={7} on={0.03} />
      {/* عقود بيت الصلاة: مدخل في المنتصف ونافذتان قوسيّتان */}
      <WinArch d={archD(110, 0, 40, 34, 12)} on={0.08} />
      <WinArch d={archD(40, -30, 26, 20, 8)} on={0.22} />
      <WinArch d={archD(194, -30, 26, 20, 8)} on={0.12} />
    </>
  )
}

/* ══ مبنى المدرسة ══
   شبكة ٩ خانات بهامش ٢٢ من كل جهة، والمدخل يحجز الخانات ٣-٥ في
   الصفّين فلا يتقاطع مع أي نافذة، والمظلّة تجلس تحت رواق ثلاثي. */
const SCHOOL_BAYS = bays(30, 610, 9, 40)
const RESERVED = [3, 4, 5]

function School({ mode }: { mode: Mode }) {
  if (mode === 'crest') {
    return (
      <>
        <path d="M-14 -180 L654 -180" />
        <path d="M240 -212 L400 -212" />
        <path d="M-6 -96 L646 -96" />
      </>
    )
  }
  return (
    <>
      {/* الكتلة الرئيسية */}
      <rect x="0" y="-166" width="640" height="166" />
      {/* حزام السطح */}
      <rect x="-14" y="-180" width="668" height="16" rx="3" />
      {/* الواجهة الوسطى المرتفعة */}
      <rect x="240" y="-212" width="160" height="34" rx="4" />
      {/* سارية العلم والعلم */}
      <rect x="318" y="-268" width="4" height="58" />
      <path
        className="lp3-flag"
        d="M322 -264 C352 -272 372 -256 396 -262 L396 -232 C372 -226 352 -242 322 -234 Z"
        fill={FLAG}
      />
      {/* كورنيش يفصل الطابقين */}
      <rect x="-6" y="-96" width="652" height="8" />
      {/* الطابق العلوي */}
      {SCHOOL_BAYS.map((x, i) =>
        RESERVED.includes(i) ? null : <Win key={`u${i}`} x={x} y={-140} w={40} h={40} on={litAt(i)} />,
      )}
      {/* الطابق الأرضي */}
      {SCHOOL_BAYS.map((x, i) =>
        RESERVED.includes(i) ? null : <Win key={`d${i}`} x={x} y={-78} w={40} h={40} on={litAt(i + 5)} />,
      )}
      {/* الرواق الثلاثي فوق المدخل */}
      {[264, 304, 344].map((x, i) => (
        <WinArch key={x} d={archD(x, -116, 32, 24, 7)} on={i === 1 ? 0.01 : 0.18} />
      ))}
      {/* مظلّة المدخل ثم البوّابة المقوّسة */}
      <rect x="246" y="-118" width="148" height="12" rx="3" />
      <WinArch d="M256 0 L256 -74 Q320 -138 384 -74 L384 0 Z" on={0.0} />
    </>
  )
}

/* ══ برج الساعة ══ عقاربه تدور مع ساعة القصّة */
function ClockTower({ mode }: { mode: Mode }) {
  if (mode === 'crest') {
    return (
      <>
        <path d="M2 -252 L40 -304 L78 -252" />
        <path d="M-10 -212 L90 -212" />
      </>
    )
  }
  return (
    <>
      {/* الجذع بتدرّج طفيف */}
      <path d="M0 0 L4 -196 L76 -196 L80 0 Z" />
      {/* الكورنيش وغرفة الجرس */}
      <rect x="-10" y="-212" width="100" height="16" rx="3" />
      <rect x="8" y="-252" width="64" height="40" />
      {/* السقف الهرمي والسنان */}
      <path d="M2 -252 L40 -304 L78 -252 Z" />
      <rect x="38" y="-322" width="4" height="20" />
      {/* فتحتا غرفة الجرس */}
      <WinArch d={archD(18, -216, 18, 16, 6)} on={0.06} />
      <WinArch d={archD(44, -216, 18, 16, 6)} on={0.06} />
      {/* وجه الساعة */}
      <circle cx="40" cy="-150" r="30" fill={DIAL} />
      <circle cx="40" cy="-150" r="30" fill="none" stroke={NEAR} strokeWidth="4" />
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x="39" y="-178" width="2" height="7" fill={NEAR} transform={`rotate(${a} 40 -150)`} />
      ))}
      {/* العقارب: الحركة تُضبط من محرك التمرير */}
      <g transform="translate(40 -150)">
        <g data-hand="hour" transform="rotate(0)">
          <rect x="-2" y="-17" width="4" height="19" rx="2" fill={NEAR} />
        </g>
        <g data-hand="minute" transform="rotate(0)">
          <rect x="-1.5" y="-24" width="3" height="26" rx="1.5" fill={NEAR} />
        </g>
        <circle cx="0" cy="0" r="2.6" fill={NEAR} />
      </g>
      {/* نافذة السلّم */}
      <Win x={31} y={-104} w={18} h={44} rx={9} on={0.36} />
    </>
  )
}

/* ══ نخلة ══ سعف مرسوم مرّة واحدة ويُدار حول قلب التاج */
const FROND = 'M0 0 C26 -16 60 -20 88 -6 C60 -1 28 6 0 0 Z'
const FROND_ANGLES = [-158, -128, -100, -72, -40, -12, 18, 168]

function Palm() {
  return (
    <>
      <path d="M-9 0 C-6 -46 -4 -96 1 -140 L13 -140 C9 -96 7 -46 9 0 Z" />
      {[-24, -52, -80, -108].map((y) => (
        <rect key={y} x={-8 + (y + 140) * -0.045} y={y} width="16" height="4" rx="2" />
      ))}
      <g transform="translate(7 -142)">
        {FROND_ANGLES.map((a) => (
          <path key={a} d={FROND} transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="9" />
        {/* عرجون بلح */}
        <path d="M4 4 C16 12 22 22 20 32 C12 26 4 16 4 4 Z" />
      </g>
    </>
  )
}

/* ══ شجرة ذات تاج متكتّل — لا قطع ناقص على عود ══ */
function LeafTree() {
  return (
    <>
      <path d="M-6 0 C-3 -30 -2 -50 -6 -70 L4 -78 L8 -70 C5 -50 5 -30 8 0 Z" />
      <path d="M0 -70 C-34 -70 -52 -92 -46 -112 C-50 -134 -28 -150 -4 -146 C14 -160 44 -152 50 -130 C68 -122 66 -92 44 -80 C30 -66 12 -64 0 -70 Z" />
    </>
  )
}

/* ══ شجيرة ══ */
function Bush() {
  return <path d="M0 0 C-22 0 -30 -12 -24 -20 C-26 -32 -8 -38 4 -30 C18 -38 34 -28 30 -16 C36 -6 22 0 0 0 Z" />
}

/* ══ عمود إنارة ══ يسكب بركة ضوء ليلاً */
function Lamp({ uid }: { uid: string }) {
  return (
    <>
      <rect x="-7" y="-9" width="14" height="9" rx="2" />
      <rect x="-3" y="-88" width="6" height="80" />
      <path d="M-3 -86 C-3 -104 8 -114 26 -114 L26 -106 C6 -106 5 -96 5 -86 Z" />
      <path d="M14 -114 L38 -114 L42 -98 L10 -98 Z" />
      {/* الضوء نفسه ثم بركته على الأرض */}
      <ellipse className="lp3-lit" style={litStyle(0.1)} cx="26" cy="-104" rx="30" ry="20" fill={`url(#lp3-lampGlow-${uid})`} />
      <ellipse className="lp3-lit" style={litStyle(0.1)} cx="26" cy="0" rx="62" ry="12" fill={`url(#lp3-lampGlow-${uid})`} />
    </>
  )
}

/* ══ خزّان الماء ══ */
function WaterTower({ mode }: { mode: Mode }) {
  if (mode === 'crest') return <path d="M-42 -128 L-30 -166 L30 -166 L42 -128" />
  return (
    <>
      <rect x="-6" y="-130" width="12" height="130" />
      <path d="M-24 -20 L-4 -110 L4 -110 L24 -20 Z" opacity="0.5" />
      <path d="M-42 -128 L-30 -166 L30 -166 L42 -128 Z" />
      <rect x="-46" y="-132" width="92" height="10" rx="4" />
    </>
  )
}

/* ══ كتلة سكنية للطبقة الوسطى ══ */
function MidBlock({ x, w, h, seed }: { x: number; w: number; h: number; seed: number }) {
  const cols = Math.max(2, Math.round((w - 16) / 26))
  const xs = bays(x + 8, x + w - 8, cols, 11)
  const rows = Math.max(1, Math.floor((h - 26) / 26))
  return (
    <>
      <rect x={x} y={-h} width={w} height={h} />
      <rect x={x - 5} y={-h - 8} width={w + 10} height={10} rx="2" />
      {Array.from({ length: rows }, (_, r) =>
        xs.map((wx, c) => (
          <Win
            key={`${r}-${c}`}
            x={wx}
            y={-h + 20 + r * 26}
            w={11}
            h={14}
            rx={1.5}
            glass={GLASS_FAINT}
            on={litAt(seed + r * 3 + c * 5)}
          />
        )),
      )}
    </>
  )
}

/* ══ سور المدرسة وبوّابتها ══ يمرّ في المقدّمة فيوحّد المشهد ══ */
function WallRun({ width, gateAt, mode }: { width: number; gateAt: number; mode: Mode }) {
  const pitch = 148
  const posts: number[] = []
  for (let x = 24; x < width - 18; x += pitch) {
    if (Math.abs(x + 13 - gateAt) < 118) continue // نفتح مكان البوّابة
    posts.push(x)
  }
  if (mode === 'crest') {
    return (
      <>
        <path d={`M0 254 L${gateAt - 78} 254`} />
        <path d={`M${gateAt + 78} 254 L${width} 254`} />
        <path d={`M${gateAt - 82} 214 L${gateAt + 82} 214`} />
      </>
    )
  }
  return (
    <>
      <rect x="0" y="254" width={width} height="22" />
      {posts.map((x) => (
        <rect key={x} x={x} y="242" width="26" height="34" rx="2" />
      ))}
      {/* عمودا البوّابة ولوحة اسم المدرسة */}
      {[gateAt - 78, gateAt + 46].map((x) => (
        <g key={x}>
          <rect x={x} y="222" width="32" height="54" rx="2" />
          <rect x={x - 5} y="214" width="42" height="10" rx="3" />
        </g>
      ))}
      <path d={`M${gateAt - 82} 214 L${gateAt + 82} 214 L${gateAt + 82} 226 L${gateAt - 82} 226 Z`} />
      <rect x={gateAt - 44} y="230" width="88" height="4" rx="2" opacity="0.45" />
    </>
  )
}

/* ══ ردم الأفق البعيد ══ */
function FarRidge({ width }: { width: number }) {
  const step = width / 8
  let d = `M0 266 L0 248`
  for (let i = 0; i < 8; i += 1) {
    const x0 = i * step
    const dip = i % 2 === 0 ? 234 : 252
    d += ` C${x0 + step * 0.35} ${dip} ${x0 + step * 0.65} ${dip + 10} ${x0 + step} ${i % 2 === 0 ? 246 : 238}`
  }
  return <path d={`${d} L${width} 266 Z`} />
}

/* ─── تخطيط النسختين ─── */

interface Layout {
  vb: number
  mosque: { x: number; s: number }
  school: { x: number; s: number }
  tower: { x: number; s: number }
  palms: Array<{ x: number; s: number }>
  trees: Array<{ x: number; s: number }>
  bushes: Array<{ x: number; s: number }>
  lamps: Array<{ x: number; s: number }>
  water: { x: number; s: number }
  mid: Array<{ x: number; w: number; h: number }>
  far: Array<{ x: number; w: number; h: number }>
  minaretFar: number
}

/** سطح الأرض لكل طبقة — البعيدة أعلى قليلاً فتبدو أبعد */
const NEAR_Y = 276
const MID_Y = 272
const FAR_Y = 266

const WIDE: Layout = {
  vb: 2220,
  mosque: { x: 300, s: 0.76 },
  school: { x: 1000, s: 0.82 },
  tower: { x: 1525, s: 0.74 },
  palms: [
    { x: 180, s: 0.85 },
    { x: 640, s: 1 },
    { x: 760, s: 0.72 },
    { x: 1780, s: 0.95 },
    { x: 2080, s: 0.8 },
  ],
  trees: [
    { x: 1660, s: 0.9 },
    { x: 1930, s: 0.75 },
  ],
  bushes: [
    { x: 120, s: 1 },
    { x: 560, s: 0.8 },
    { x: 880, s: 1.1 },
    { x: 1620, s: 0.9 },
    { x: 2000, s: 1 },
    { x: 2170, s: 0.8 },
  ],
  lamps: [
    { x: 150, s: 1 },
    { x: 900, s: 1 },
    { x: 1615, s: 1 },
    { x: 2110, s: 1 },
  ],
  water: { x: 950, s: 0.9 },
  mid: [
    { x: 60, w: 110, h: 68 },
    { x: 182, w: 80, h: 50 },
    { x: 560, w: 120, h: 88 },
    { x: 692, w: 86, h: 62 },
    { x: 790, w: 104, h: 76 },
    { x: 1600, w: 140, h: 80 },
    { x: 1752, w: 110, h: 58 },
    { x: 1874, w: 96, h: 92 },
    { x: 2042, w: 130, h: 70 },
  ],
  far: [
    { x: 40, w: 74, h: 52 },
    { x: 126, w: 50, h: 36 },
    { x: 860, w: 70, h: 46 },
    { x: 1978, w: 64, h: 46 },
    { x: 2056, w: 86, h: 60 },
    { x: 2156, w: 52, h: 38 },
  ],
  minaretFar: 2130,
}

const NARROW: Layout = {
  vb: 900,
  mosque: { x: 34, s: 0.64 },
  school: { x: 320, s: 0.6 },
  tower: { x: 704, s: 0.54 },
  palms: [
    { x: 262, s: 0.68 },
    { x: 828, s: 0.6 },
  ],
  trees: [{ x: 876, s: 0.58 }],
  bushes: [
    { x: 118, s: 0.85 },
    { x: 296, s: 0.7 },
    { x: 792, s: 0.8 },
  ],
  lamps: [
    { x: 172, s: 0.82 },
    { x: 790, s: 0.82 },
  ],
  water: { x: 246, s: 0.5 },
  mid: [
    { x: 132, w: 74, h: 54 },
    { x: 216, w: 56, h: 38 },
    { x: 786, w: 82, h: 62 },
    { x: 858, w: 54, h: 42 },
  ],
  far: [
    { x: 20, w: 56, h: 40 },
    { x: 84, w: 40, h: 28 },
    { x: 836, w: 48, h: 34 },
  ],
  minaretFar: 800,
}

/* ─── المشهد ─── */

function Scene({ layout, uid }: { layout: Layout; uid: string }) {
  const { vb } = layout
  const gateAt = layout.school.x + layout.school.s * 320

  const near = (mode: Mode) => (
    <>
      <Place x={layout.mosque.x} y={NEAR_Y} s={layout.mosque.s}>
        <Mosque mode={mode} />
      </Place>
      <Place x={layout.school.x} y={NEAR_Y} s={layout.school.s}>
        <School mode={mode} />
      </Place>
      <Place x={layout.tower.x} y={NEAR_Y} s={layout.tower.s}>
        <ClockTower mode={mode} />
      </Place>
      {mode === 'fill' && (
        <>
          {layout.trees.map((t) => (
            <Place key={t.x} x={t.x} y={NEAR_Y} s={t.s}>
              <LeafTree />
            </Place>
          ))}
          {layout.palms.map((p) => (
            <Place key={p.x} x={p.x} y={NEAR_Y} s={p.s}>
              <Palm />
            </Place>
          ))}
        </>
      )}
      <WallRun width={vb} gateAt={gateAt} mode={mode} />
      {mode === 'fill' && (
        <>
          {layout.bushes.map((b) => (
            <Place key={b.x} x={b.x} y={NEAR_Y + 2} s={b.s}>
              <Bush />
            </Place>
          ))}
          {layout.lamps.map((l) => (
            <Place key={l.x} x={l.x} y={NEAR_Y} s={l.s}>
              <Lamp uid={uid} />
            </Place>
          ))}
        </>
      )}
    </>
  )

  return (
    <>
      <defs>
        <radialGradient id={`lp3-halo-${uid}`}>
          <stop offset="0%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="0.85" />
          <stop offset="45%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`lp3-lampGlow-${uid}`}>
          <stop offset="0%" stopColor={LIT} stopOpacity="0.5" />
          <stop offset="100%" stopColor={LIT} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`lp3-rim-${uid}`} gradientUnits="userSpaceOnUse" data-sunx={vb} cx={vb * 0.5} cy="276" r={vb * 0.34}>
          <stop offset="0%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="1" />
          <stop offset="55%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--lp3-warm, #f2a35c)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* هالة الشمس خلف الأفق — مركزها يتبع الشمس */}
      <g style={{ opacity: 'var(--lp3-halo, 0.2)' }}>
        <ellipse data-sunx={vb} cx={vb * 0.5} cy="290" rx={vb * 0.3} ry="230" fill={`url(#lp3-halo-${uid})`} />
        <ellipse data-sunx={vb} cx={vb * 0.5} cy="284" rx={vb * 0.12} ry="120" fill={`url(#lp3-halo-${uid})`} />
      </g>

      {/* الطبقة البعيدة — شبه شفافة فتكتسب لون السماء */}
      <g fill={FAR}>
        <FarRidge width={vb} />
        {layout.far.map((b) => (
          <rect key={b.x} x={b.x} y={FAR_Y - b.h} width={b.w} height={b.h} />
        ))}
        <g transform={`translate(${layout.minaretFar} ${FAR_Y})`}>
          <rect x="-5" y="-84" width="10" height="84" />
          <path d="M-9 -84 C-9 -96 -4 -104 0 -108 C4 -104 9 -96 9 -84 Z" />
        </g>
      </g>

      {/* الطبقة الوسطى */}
      <g fill={MID}>
        <g transform={`translate(0 ${MID_Y})`}>
          {layout.mid.map((b) => (
            <MidBlock key={b.x} x={b.x} w={b.w} h={b.h} seed={b.x % 11} />
          ))}
        </g>
        <Place x={layout.water.x} y={MID_Y} s={layout.water.s}>
          <WaterTower mode="fill" />
        </Place>
      </g>

      {/* الطبقة القريبة — معتمة تماماً، حدّها حادّ */}
      <g fill={NEAR}>{near('fill')}</g>

      {/* رصيف المقدّمة */}
      <rect x="0" y={NEAR_Y} width={vb} height={300 - NEAR_Y} fill={FRONT} />

      {/* حدّ الضوء على الحرف العلوي — يشتدّ عند الأفق ويتبع الشمس */}
      <g
        className="lp3-crest"
        fill="none"
        stroke={`url(#lp3-rim-${uid})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 'var(--lp3-rim, 0)' }}
      >
        {near('crest')}
        <Place x={layout.water.x} y={MID_Y} s={layout.water.s}>
          <WaterTower mode="crest" />
        </Place>
        {layout.mid.map((b) => (
          <path key={b.x} d={`M${b.x - 5} ${MID_Y - b.h - 8} L${b.x + b.w + 5} ${MID_Y - b.h - 8}`} opacity="0.55" />
        ))}
      </g>
    </>
  )
}

/* ─── الواجهة العامة ─── */

export interface StorySkylineState {
  /** ٠→١ من أول الصفحة إلى آخرها */
  progress: number
  /** موضع الشمس كما تستخدمه الصفحة: right بالنسبة المئوية */
  sunRightPct: number
  /** لون الشمس الحالي */
  sunRgb: Rgb
  /** دقائق ساعة القصّة — لتدوير عقارب البرج */
  minutes: number
}

export interface StorySkylineHandle {
  update(state: StorySkylineState): void
}

export const StorySkyline = forwardRef<StorySkylineHandle>(function StorySkyline(_props, ref) {
  const rootRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      update({ progress, sunRightPct, sunRgb, minutes }) {
        const root = rootRef.current
        if (!root) return

        // الليل: من ٠ إلى ١ بين ٨٠٪ و٩٦٪ من الصفحة
        const night = clamp01((progress - 0.8) / 0.16)
        // انخفاض الشمس: ١ عند الأفق (فجراً وغروباً) · ٠ عند الذروة
        const low = 1 - Math.sin(Math.min(1, progress / 0.85) * Math.PI)
        const halo = 0.14 + 0.86 * low ** 1.7 * (1 - night * 0.72)
        const rim = low ** 2.1 * (1 - night * 0.86)
        const [r, g, b] = mix(sunRgb, MOON_RGB, night * 0.9)

        root.style.setProperty('--lp3-night', night.toFixed(3))
        root.style.setProperty('--lp3-halo', halo.toFixed(3))
        root.style.setProperty('--lp3-rim', rim.toFixed(3))
        root.style.setProperty('--lp3-warm', `rgb(${r},${g},${b})`)

        // الهالة وحدّ الضوء يتبعان الشمس أفقياً داخل فضاء كل نسخة
        const fromLeft = 1 - sunRightPct / 100
        root.querySelectorAll<SVGElement>('[data-sunx]').forEach((el) => {
          const vb = Number(el.dataset.sunx)
          el.setAttribute('cx', String(Math.round(vb * fromLeft)))
        })

        // عقارب برج الساعة تتبع ساعة القصّة
        const hour = ((minutes % 720) / 720) * 360
        const minute = ((minutes % 60) / 60) * 360
        root.querySelectorAll<SVGElement>('[data-hand="hour"]').forEach((el) => {
          el.setAttribute('transform', `rotate(${hour.toFixed(1)})`)
        })
        root.querySelectorAll<SVGElement>('[data-hand="minute"]').forEach((el) => {
          el.setAttribute('transform', `rotate(${minute.toFixed(1)})`)
        })
      },
    }),
    [],
  )

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-0 select-none" aria-hidden>
      <style>{`
        /* نافذة تُضاء عند لحظتها الخاصة داخل الليل — بلا أي عمل لكل إطار */
        .lp3-lit { opacity: clamp(0, calc((var(--lp3-night, 0) - var(--lp3-on, 0)) * 6), 1); transition: opacity 380ms linear; }
        @keyframes lp3-flag-wave { 0%, 100% { transform: skewY(-2.6deg) scaleY(1); } 50% { transform: skewY(2.4deg) scaleY(0.93); } }
        .lp3-flag { transform-box: fill-box; transform-origin: left center; animation: lp3-flag-wave 3.6s ease-in-out infinite; }
        .lp3-skyline-wrap { height: min(clamp(112px, 33vw, 250px), 32vh); }
        @media (min-width: 768px) { .lp3-skyline-wrap { height: min(clamp(150px, 13.5vw, 340px), 34vh); } }
        /* شريط الأرض يمتدّ لحدّ الشاشة على الشاشات فائقة العرض */
        .lp3-ground { background: linear-gradient(180deg, ${NEAR} 0 47.8%, ${FRONT} 47.8% 100%); }
      `}</style>

      <div className="lp3-skyline-wrap relative w-full">
        <div className="lp3-ground absolute inset-x-0 bottom-0 h-[15.4%]" />
        <svg
          className="absolute inset-0 h-full w-full md:hidden"
          viewBox={`0 0 ${NARROW.vb} 300`}
          preserveAspectRatio="xMidYMax meet"
          fill="none"
        >
          <Scene layout={NARROW} uid="n" />
        </svg>
        <svg
          className="absolute inset-0 hidden h-full w-full md:block"
          viewBox={`0 0 ${WIDE.vb} 300`}
          preserveAspectRatio="xMidYMax meet"
          fill="none"
        >
          <Scene layout={WIDE} uid="w" />
        </svg>
      </div>
    </div>
  )
})
