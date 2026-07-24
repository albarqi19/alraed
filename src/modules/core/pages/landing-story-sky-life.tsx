/* ══════════════════════════════════════════════════════════════
   حياة السماء في صفحة /story — السحاب والطيور

   القواعد:
   ١) السحاب ينساب في اتجاه واحد كالريح، لا يتذبذب ذهاباً وإياباً،
      والحركة على transform وحده (المُركِّب) لا على margin/right.
   ٢) لكل سحابة صورة ظلّية مرسومة مختلفة — لا نتوءات متطابقة.
   ٣) السحاب يكتسب لون الشمس: أبيض في الضحى، ذهبيّ عند الفجر
      والغروب — المتغيّران ‎--lp3-cloud-tint/shade يضبطهما محرك السماء.
   ٤) الطيور تخفق أجنحتها فعلاً (كل جناح يدور حول كتفه)، وتطير
      سرباً بتشكيل V مع فارق طور بين أفرادها كالسرب الحقيقي.
   ══════════════════════════════════════════════════════════════ */

/* ─── صور السحاب الظلّية — قاعدة مسطّحة ونتوءات متفاوتة ─── */

const CLOUD_SHAPES = [
  // عريضة متعدّدة الطبقات
  {
    vb: '-10 0 196 74',
    d: 'M10 68 C-4 68 -6 54 8 50 C6 36 20 28 34 32 C40 16 64 10 80 20 C92 6 120 8 130 26 C146 18 166 30 162 48 C178 50 180 68 166 68 Z',
  },
  // صغيرة بنتوءين
  {
    vb: '-8 12 116 52',
    d: 'M6 60 C-4 60 -6 48 6 45 C4 33 18 26 30 31 C38 18 60 16 68 28 C82 26 92 38 88 50 C100 52 100 60 88 60 Z',
  },
  // طويلة رقيقة
  {
    vb: '-10 4 148 40',
    d: 'M4 40 C-6 40 -8 30 4 27 C6 16 24 12 36 18 C48 8 74 10 82 22 C98 18 116 26 116 36 C130 36 132 40 118 40 Z',
  },
] as const

interface CloudSpec {
  shape: 0 | 1 | 2
  top: string
  width: number
  opacity: number
  blur: number
  duration: string
  delay: string
  rest: string
}

/** ست سحابات: الأبعد أصغر وأشفّ وأكثر ضبابية، والأقرب أكبر وأوضح */
const CLOUDS: CloudSpec[] = [
  { shape: 0, top: '11%', width: 300, opacity: 0.9, blur: 0.6, duration: '104s', delay: '-6s', rest: '18vw' },
  { shape: 2, top: '19%', width: 220, opacity: 0.62, blur: 1.4, duration: '138s', delay: '-52s', rest: '46vw' },
  { shape: 1, top: '26%', width: 150, opacity: 0.52, blur: 1.8, duration: '156s', delay: '-96s', rest: '72vw' },
  { shape: 0, top: '8%', width: 208, opacity: 0.68, blur: 1.1, duration: '124s', delay: '-72s', rest: '62vw' },
  { shape: 1, top: '33%', width: 118, opacity: 0.42, blur: 2.2, duration: '172s', delay: '-24s', rest: '30vw' },
  { shape: 2, top: '15%', width: 340, opacity: 0.82, blur: 0.5, duration: '92s', delay: '-46s', rest: '84vw' },
]

export function StoryClouds() {
  return (
    <>
      <style>{`
        /* عبور في اتجاه واحد — مدى ١٨٠vw يضمن خروجاً كاملاً قبل العودة */
        @keyframes lp3-cloud-cross { from { transform: translate3d(122vw, 0, 0); } to { transform: translate3d(-58vw, 0, 0); } }
        .lp3-cloud {
          position: absolute; left: 0; will-change: transform;
          animation-name: lp3-cloud-cross; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        .lp3-cloud svg { display: block; width: 100%; height: auto; }
        /* عند تعطيل الحركة: تستقرّ كل سحابة في موضعها المعلن */
        @media (prefers-reduced-motion: reduce) {
          .lp3-cloud { transform: translateX(var(--lp3-rest, 40vw)); }
        }
      `}</style>
      {CLOUDS.map((cloud, index) => {
        const shape = CLOUD_SHAPES[cloud.shape]
        return (
          <div
            key={index}
            className="lp3-cloud"
            style={{
              top: cloud.top,
              width: cloud.width,
              opacity: cloud.opacity,
              filter: `blur(${cloud.blur}px)`,
              animationDuration: cloud.duration,
              animationDelay: cloud.delay,
              ['--lp3-rest' as string]: cloud.rest,
            }}
          >
            <svg viewBox={shape.vb} fill="none">
              <defs>
                <linearGradient id={`lp3-cloudFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--lp3-cloud-tint, #ffffff)" />
                  <stop offset="62%" stopColor="var(--lp3-cloud-tint, #ffffff)" />
                  <stop offset="100%" stopColor="var(--lp3-cloud-shade, #d8e5f6)" />
                </linearGradient>
              </defs>
              <path d={shape.d} fill={`url(#lp3-cloudFill-${index})`} />
            </svg>
          </div>
        )
      })}
    </>
  )
}

/* ─── الطيور ─── */

/** طير واحد: جسم وجناحان يدور كلٌّ حول كتفه فيخفقان فعلاً */
function Bird({ scale, phase }: { scale: number; phase: string }) {
  return (
    <svg width={36 * scale} height={22 * scale} viewBox="0 0 36 22" fill="#16283f" style={{ overflow: 'visible' }}>
      <ellipse cx="18" cy="12.6" rx="3.4" ry="1.6" />
      <path className="lp3-wing-l" style={{ animationDelay: phase }} d="M16.5 12 C11 4 6 3 1.5 6 C6 8.5 11.5 10.5 16.5 13.6 Z" />
      <path className="lp3-wing-r" style={{ animationDelay: phase }} d="M19.5 12 C25 4 30 3 34.5 6 C30 8.5 24.5 10.5 19.5 13.6 Z" />
    </svg>
  )
}

/** تشكيل V: القائد في المقدّمة (يساراً، جهة الطيران) وصفّان يتخلّفانه */
const FLOCK = [
  { dx: 0, dy: 0, scale: 1, phase: '0s' },
  { dx: 20, dy: -10, scale: 0.94, phase: '-0.09s' },
  { dx: 40, dy: -19, scale: 0.88, phase: '-0.17s' },
  { dx: 20, dy: 11, scale: 0.95, phase: '-0.13s' },
  { dx: 41, dy: 21, scale: 0.86, phase: '-0.21s' },
]

export function StoryBirds() {
  return (
    <>
      <style>{`
        @keyframes lp3-bird-cross { from { transform: translate3d(122vw, 0, 0); } to { transform: translate3d(-42vw, 0, 0); } }
        /* ارتفاع لطيف أثناء العبور — لا تطير الطيور على مسطرة */
        @keyframes lp3-bird-rise { 0% { transform: translateY(14px); } 45% { transform: translateY(-20px); } 100% { transform: translateY(6px); } }
        /* الخفقان: كل جناح يدور حول كتفه، والإشارتان معكوستان */
        @keyframes lp3-wing-l { 0%, 100% { transform: rotate(7deg); } 50% { transform: rotate(-33deg); } }
        @keyframes lp3-wing-r { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(33deg); } }
        .lp3-bird { position: absolute; left: 0; will-change: transform; animation-name: lp3-bird-cross; animation-timing-function: linear; animation-iteration-count: infinite; }
        .lp3-bird-rise { animation-name: lp3-bird-rise; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .lp3-wing-l, .lp3-wing-r { transform-box: fill-box; animation-duration: 0.46s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .lp3-wing-l { transform-origin: 100% 85%; animation-name: lp3-wing-l; }
        .lp3-wing-r { transform-origin: 0% 85%; animation-name: lp3-wing-r; }
        @media (prefers-reduced-motion: reduce) {
          .lp3-bird { transform: translateX(var(--lp3-rest, 40vw)); }
        }
      `}</style>

      {/* السرب — التأخيرات موزّعة على مدى العبور فلا تتجمّع المجموعات في بقعة واحدة */}
      <div
        className="lp3-bird"
        style={{ top: '17%', animationDuration: '58s', animationDelay: '-31s', ['--lp3-rest' as string]: '35vw' }}
      >
        <div className="lp3-bird-rise" style={{ animationDuration: '58s', animationDelay: '-31s' }}>
          <div className="relative h-0 w-0">
            {FLOCK.map((bird, index) => (
              <div key={index} className="absolute" style={{ left: bird.dx * 1.2, top: bird.dy * 1.2 }}>
                <Bird scale={bird.scale * 1.18} phase={bird.phase} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* طائران منفردان — أحدهما أقرب والآخر أبعد */}
      <div
        className="lp3-bird"
        style={{ top: '11%', animationDuration: '44s', animationDelay: '-13s', ['--lp3-rest' as string]: '74vw' }}
      >
        <div className="lp3-bird-rise" style={{ animationDuration: '44s', animationDelay: '-13s' }}>
          <Bird scale={1.55} phase="-0.05s" />
        </div>
      </div>
      <div
        className="lp3-bird"
        style={{ top: '25%', animationDuration: '76s', animationDelay: '-51s', ['--lp3-rest' as string]: '13vw' }}
      >
        <div className="lp3-bird-rise" style={{ animationDuration: '76s', animationDelay: '-51s' }}>
          <Bird scale={0.78} phase="-0.19s" />
        </div>
      </div>
    </>
  )
}
