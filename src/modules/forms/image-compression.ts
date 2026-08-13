/**
 * ضغطُ الصور **في المتصفّح** قبل الرفع — لا بعده.
 *
 * ثلاثةُ مكاسبَ في عمليّةٍ واحدة:
 *  • المساحة على الخادم، وهي المطلوب الأوّل.
 *  • زمنُ الرفع: وليُّ الأمر على شبكة جوّال، ورفعُ أربعة ميجابايت قد يفشل مرّتين
 *    قبل أن ينجح؛ وأربعمئة كيلوبايت تمرّ من أوّل محاولة.
 *  • **HEIC** — صيغةُ كاميرا الآيفون الافتراضية. مكتبةُ GD على الخادم لا تفكّها
 *    إطلاقاً، فلو وصلته بقيت بلا ضغطٍ إلى الأبد، ومتصفّحُ المدير لا يعرضها أصلاً
 *    فيرى مربّعاً مكسوراً مكان صورة. المتصفّح هنا هو الموضع الوحيد الذي تُفكّ فيه
 *    وتُعاد ترميزاً JPEG.
 *
 * وثلاثُ قواعدَ تحكم الملفّ كلَّه:
 *  ١) الضغطُ **تحسينٌ لا شرط**: أيُّ تعثّرٍ — صيغةٌ لا يفكّها المتصفّح، سياقُ رسمٍ
 *     مرفوض، ترميزٌ فاشل — يُعيد الأصلَ نفسه ليُرفع كما هو. لا يُمنع رفعٌ قطّ.
 *  ٢) **لا تكبير**: `Math.min(1, ...)` في كلّ حساب مقياس، فصورةٌ أصغر من الحدّ
 *     تُترك بأبعادها لا تُنفخ.
 *  ٣) **إن كبُر الناتج أو لم يُجدِ، أعِد الأصل**: إعادةُ ترميزٍ تخسر جودةً وتربح
 *     صفرَ بايتات صفقةٌ خاسرة.
 *
 * الوجهةُ JPEG لا WebP عمداً: خادمُ الإنتاج يقرأ JPEG وPNG وGIF وحدها، فناتجٌ
 * WebP يصل سليماً ثم يعجز الخادم عن لمسه لاحقاً.
 */

/** ما نجرؤ على فكّه وإعادة ترميزه. ما عداه يمرّ بلا لمس — انظر تعليق الخريطة أدناه */
type SourceKind = 'jpeg' | 'png' | 'webp' | 'heic' | 'bmp' | 'unsupported'

/**
 * الصيغُ المستبعَدة عمداً وليست سهواً:
 *  • **GIF** — رسمُها على لوحةٍ يُبقي أوّل إطارٍ ويرمي الحركة كلَّها. صورةٌ ساكنة
 *    مكان صورةٍ متحرّكة ليست ضغطاً بل إتلاف.
 *  • **SVG** — متّجهةٌ أصلاً وحجمها كيلوباتٌ معدودة، ورسمُها يحوّلها بكسلاتٍ
 *    تفقد حدّتها عند أيّ تكبير.
 *  • **AVIF** — أكفأ من JPEG أصلاً، فتحويلها إليه يزيدها لا ينقصها.
 */
const MIME_KINDS: Record<string, SourceKind> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
}

/**
 * الامتداد شبكةُ أمانٍ خلف نوع MIME لا بديلٌ عنه: ملفّ HEIC من الآيفون يصل
 * أحياناً بنوعٍ فارغ أو `application/octet-stream`، فلولا الامتداد لعُدّ «ليس صورة»
 * ومرّ بلا تحويل — وهو أحوجُ الصيَغ إليه.
 */
const EXTENSION_KINDS: Record<string, SourceKind> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
  bmp: 'bmp',
}

/** الصيَغ التي قد تحمل قناةَ شفافية، فتُفحص قبل اختيار وجهة الترميز */
const ALPHA_CAPABLE_KINDS = new Set<SourceKind>(['png', 'webp', 'heic', 'bmp'])

/** أقصى بُعدٍ للضلع الأطول — يطابق ما تفرضه طبقةُ الخادم فلا تتنازع الطبقتان */
const DEFAULT_MAX_DIMENSION = 1920

/**
 * جودةُ JPEG — **الرقمُ نفسه** الذي تفرضه طبقةُ الخادم (`JPEG_QUALITY = 80`)، لا
 * رقمٌ يقاربه. وسُلَّمُ المتصفّح هو سُلَّم libjpeg نفسه، فـ0.8 هنا هي ٨٠ هناك.
 *
 * والفارق ليس تجميلاً: لو رفعنا هنا فوق ما هناك لوجد الخادمُ في إعادة الترميز
 * مكسباً ظاهرياً فاستبدل الملفّ بجيلٍ ثانٍ من الضغط مقابل بضعة بالمئة. (والخادم
 * يحرس ذلك بعتبة مكسبٍ أيضاً، وهذا الحزام الثاني.)
 */
const DEFAULT_QUALITY = 0.8

/** دون هذا الحجم لا تستحقّ الصورةُ عناءَ إعادة ترميزٍ تخسر فيها جودةً بلا مقابل */
const DEFAULT_SKIP_UNDER_BYTES = 200 * 1024

/** لا نقبل الناتج ما لم يوفّر عُشرَ الحجم على الأقلّ حين لا تتغيّر الصيغة */
const DEFAULT_MIN_GAIN_RATIO = 0.9

/**
 * لوحةُ الفحص صغيرةٌ عمداً: كشفُ الشفافية على أبعادٍ كاملة يحجز ثمانية ميجابايت
 * من الذاكرة لصورةٍ بحجم 1920×1080 ويمسحها بايتاً بايتاً. أربعةٌ وستّون بكسلاً
 * تكفي: التصغير يمزج الشفافيةَ فيما حولها فتظهر ألفاً دون 255 حيثما وُجدت.
 */
const ALPHA_PROBE_SIZE = 64

/** سقفُ انتظارِ فكِّ صورةٍ واحدة قبل أن نُسلّم ونرفعَ الأصل — انظر `decodeViaElement` */
const DECODE_TIMEOUT_MS = 12_000

export interface ImageCompressionOptions {
  /** أقصى بُعدٍ للضلع الأطول بالبكسل */
  maxDimension?: number
  /** جودة JPEG بين 0 و1 */
  quality?: number
  /** سقفُ حجمٍ يُلاحَق بمحاولاتٍ متدرّجة — عادةً `max_size_kb` للحقل */
  maxBytes?: number | null
  /**
   * امتدادات الحقل المسموحة. الخادم يفحص **امتدادَ الاسم** لا محتوى الملفّ، فصورةٌ
   * حوّلناها JPEG وحقلٌ لا يسمح إلّا بـPNG تُرفض بعد الرفع. حين لا يسع الناتجَ
   * امتدادٌ مسموح نترك الأصل كما هو.
   */
  allowedExtensions?: readonly string[] | null
  /** عتبة «صغيرةٌ فلا تُلمس» */
  skipUnderBytes?: number
  /** أدنى نسبة توفيرٍ تُقبل حين لا تتغيّر الصيغة */
  minGainRatio?: number
}

export type ImageCompressionSkipReason =
  | 'not-an-image'
  | 'already-small'
  | 'target-not-allowed'
  | 'decode-failed'
  | 'encode-failed'
  | 'no-gain'

export interface ImageCompressionResult {
  /** ما يُرفع فعلاً: المضغوط إن أفاد الضغط، وإلّا **الأصل نفسه** بعينه */
  file: File
  originalSize: number
  size: number
  compressed: boolean
  /** سببُ ترك الأصل — للتشخيص لا للعرض على وليّ الأمر */
  skipReason?: ImageCompressionSkipReason
}

/**
 * ما نحتاجه من سياق الرسم فعلاً.
 *
 * واجهةٌ ضيّقة تُوحّد `CanvasRenderingContext2D` و`OffscreenCanvasRenderingContext2D`:
 * اتّحادُ النوعين مباشرةً يُعجز المترجم عن اختيار الحمولة الصحيحة لـ`drawImage`،
 * وهذه تصفُ الحمولة الواحدة التي نستعملها فيقبلها الطرفان.
 */
interface DrawContext {
  imageSmoothingEnabled: boolean
  imageSmoothingQuality: ImageSmoothingQuality
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, width: number, height: number): void
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData
}

interface DrawTarget {
  context: DrawContext
  toBlob: (type: string, quality: number) => Promise<Blob | null>
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  /** تحريرُ ذاكرة الصورة المفكوكة — تُستدعى في كلّ مسار، نجاحاً وفشلاً */
  release: () => void
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  // `dot > 0` لا `>= 0`: ملفٌّ اسمه `.photo` كلُّه اسمٌ بلا امتداد
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function replaceExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}.${extension}`
}

function normalizeExtensions(extensions?: readonly string[] | null): string[] | null {
  if (!extensions || extensions.length === 0) return null
  const cleaned = extensions
    .map((extension) => extension.replace(/^\./, '').trim().toLowerCase())
    .filter((extension) => extension !== '')
  return cleaned.length > 0 ? cleaned : null
}

function detectKind(file: File): SourceKind {
  const byMime = MIME_KINDS[file.type.toLowerCase()]
  if (byMime) return byMime
  return EXTENSION_KINDS[extensionOf(file.name)] ?? 'unsupported'
}

/** أهذا الملفّ ممّا يُضغط أصلاً؟ حقل `file` يخلط الصورَ بالـPDF، وهذه تفرزها */
export function isCompressibleImage(file: File): boolean {
  return detectKind(file) !== 'unsupported'
}

/**
 * الامتدادُ الذي سيُسمّى به الناتج، أو `null` إن لم يسمح الحقلُ بأيٍّ منها.
 * `jpg` قبل `jpeg` لأنّها الأشيع، ويُقبل الثاني حين يكون وحده في القائمة.
 */
function pickTargetExtension(targetType: string, allowed: string[] | null): string | null {
  const candidates = targetType === 'image/png' ? ['png'] : ['jpg', 'jpeg']
  if (!allowed) return candidates[0]
  return candidates.find((candidate) => allowed.includes(candidate)) ?? null
}

function createDrawTarget(width: number, height: number): DrawTarget | null {
  // OffscreenCanvas أوّلاً: لوحةٌ بلا عقدةٍ في الشجرة، فلا تُقحم المتصفّحَ في
  // حسابِ تخطيطٍ ولا طلاءٍ لعنصرٍ لن يراه أحد، و`convertToBlob` غيرُ متزامنةٍ أصلاً.
  if (typeof OffscreenCanvas === 'function') {
    try {
      const canvas = new OffscreenCanvas(width, height)
      const context = canvas.getContext('2d')
      if (context) {
        return {
          context,
          toBlob: async (type, quality) => {
            try {
              return await canvas.convertToBlob({ type, quality })
            } catch {
              return null
            }
          },
        }
      }
    } catch {
      // متصفّحٌ يعلن الصنف ولا يُنشئه — نسقط إلى اللوحة العادية
    }
  }

  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  return {
    context,
    toBlob: (type, quality) =>
      new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality)
      }),
  }
}

/**
 * فكُّ الصورة مع **احترام اتّجاه EXIF**.
 *
 * هذه أخطرُ سطورِ الملفّ: صورةُ جوّالٍ بوضعٍ رأسيّ تُخزَّن أفقيّةً في الملفّ ومعها
 * وسمُ اتّجاهٍ يأمر بتدويرها تسعين درجة. فمن رسمها على لوحةٍ بلا `from-image` رسمها
 * على جنبها، فيصل المديرَ وجهُ طالبٍ مقلوب. والمسار الاحتياطيّ سليمٌ للسبب نفسه:
 * `image-orientation: from-image` صار سلوكَ `<img>` الافتراضيّ في المتصفّحات كلّها،
 * فـ`naturalWidth/naturalHeight` والرسم يخرجان مُدارَين.
 */
async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // صيغةٌ لا يفكّها هذا المتصفّح (HEIC خارج آبل) — نجرّب الاحتياط ثم نستسلم
    }
  }

  return decodeViaElement(file)
}

function decodeViaElement(file: File): Promise<DecodedImage | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    // الإبطالُ في المسارين معاً — نجاحاً وفشلاً. الرابط يبقى معلّقاً في ذاكرة
    // الصفحة حتى يُبطَل صراحةً، ووليُّ الأمر قد يبدّل صورته عشر مرّاتٍ قبل أن يرضى.
    // وإبطالُه بعد `onload` سليم: بيانات الصورة صارت في الذاكرة ولا تُعاد قراءتها.
    let done = false
    let timer = 0
    const settle = (value: DecodedImage | null) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(value)
    }

    /**
     * مهلةٌ قصوى للفكّ — الحارس الأخير لقاعدة «الضغط تحسينٌ لا شرط».
     *
     * `onload` و`onerror` يغطّيان النجاح والفشل، ولا يغطّيان **الصمت**: عنصرُ
     * صورةٍ لا يُطلق أيّاً منهما (صيغةٌ غريبة في وِب-ڤيو، أو ملفٌّ سُحب من تحته)
     * يترك هذا الوعدَ معلّقاً أبداً، فيبقى «جارٍ التجهيز» دائراً ومُدخلُ الملفّ
     * معطّلاً — فيعجز وليُّ الأمر عن إرسال نموذجه حتى يُنعش الصفحة. والانتهاء
     * بـ`null` يعني رفعَ الأصل كما هو، وهو أهونُ الأمرين بما لا يُقاس.
     */
    timer = window.setTimeout(() => {
      settle(null)
      // إيقافُ تحميلٍ لا ننتظره: بعد `settle` صار `done` حقّاً، فلو أطلق التفريغُ
      // `onerror` لم يُغيّر شيئاً — والوعد قد حُسم مرّةً واحدة لا غير.
      image.src = ''
    }, DECODE_TIMEOUT_MS)

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        settle(null)
        return
      }
      settle({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => {},
      })
    }
    image.onerror = () => settle(null)
    image.src = url
  })
}

/**
 * أفي الصورة شفافية؟
 *
 * تحويلُ PNG شفّافةٍ إلى JPEG يملأ الشفافَ **أسودَ** — شعارٌ أنيقٌ يصير لطخةً
 * سوداء. فما فيه شفافيةٌ يبقى PNG وإن كسبنا بايتاتٍ أقلّ.
 *
 * والفحصُ على لوحةٍ مصغّرة: بكسلٌ شفّافٌ وحيدٌ في صورةٍ ضخمة قد يذوب في المتوسّط
 * فيُقرأ معتماً، وثمنُ خطئه بكسلٌ أبيضُ واحد. أمّا كلُّ شفافيةٍ ذاتِ أثرٍ مرئيّ
 * فتُكشف. والشكُّ يُحسم شفافيةً: PNG أكبرُ حجماً أهونُ من سوادٍ مكان الفراغ.
 */
function hasTransparency(source: CanvasImageSource, width: number, height: number): boolean {
  const scale = Math.min(1, ALPHA_PROBE_SIZE / Math.max(width, height))
  const probeWidth = Math.max(1, Math.round(width * scale))
  const probeHeight = Math.max(1, Math.round(height * scale))

  const target = createDrawTarget(probeWidth, probeHeight)
  if (!target) return true

  try {
    target.context.drawImage(source, 0, 0, probeWidth, probeHeight)
    const { data } = target.context.getImageData(0, 0, probeWidth, probeHeight)
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) return true
    }
    return false
  } catch {
    return true
  }
}

interface EncodeAttempt {
  scale: number
  quality: number
}

/**
 * سلّمُ المحاولات حتى ننزل تحت السقف.
 *
 * بلا سقفٍ محاولةٌ واحدة. ومع سقفٍ: في JPEG نُنزل **الجودة** قبل الأبعاد — العين
 * تسامح ضجيجَ الضغط أكثر ممّا تسامح ضياعَ التفاصيل؛ وفي PNG لا مقبضَ جودةٍ أصلاً
 * فالتصغير وحده هو ما يُنقص البايتات.
 */
function buildAttempts(
  baseScale: number,
  quality: number,
  targetType: string,
  maxBytes: number | null,
): EncodeAttempt[] {
  const attempts: EncodeAttempt[] = [{ scale: baseScale, quality }]
  if (maxBytes === null) return attempts

  if (targetType === 'image/jpeg') {
    for (const step of [0.7, 0.6, 0.5]) {
      if (step < quality) attempts.push({ scale: baseScale, quality: step })
    }
    attempts.push({ scale: baseScale * 0.6, quality: 0.6 })
    return attempts
  }

  attempts.push({ scale: baseScale * 0.75, quality })
  attempts.push({ scale: baseScale * 0.5, quality })
  return attempts
}

async function encodeAttempt(
  source: CanvasImageSource,
  width: number,
  height: number,
  attempt: EncodeAttempt,
  targetType: string,
): Promise<Blob | null> {
  const scale = Math.min(1, attempt.scale)
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const target = createDrawTarget(targetWidth, targetHeight)
  if (!target) return null

  const { context } = target
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  if (targetType === 'image/jpeg') {
    // JPEG بلا قناة شفافية: ما لم نملأ الفراغ أبيضَ ملأه المتصفّح أسود. كشفُ
    // الشفافية أعلاه يمنع وصولَ صورةٍ شفّافة إلى هنا، وهذا حزامُ الأمان الثاني.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, targetWidth, targetHeight)
  }

  context.drawImage(source, 0, 0, targetWidth, targetHeight)

  const blob = await target.toBlob(targetType, attempt.quality)
  // المواصفة تسمح للمتصفّح بالارتداد إلى PNG حين يعجز عن الصيغة المطلوبة، فناتجٌ
  // بنوعٍ غير المطلوب ليس نجاحاً: اسمُه سيقول jpg وجسمُه png فيرفضه الخادم.
  if (!blob || blob.size === 0 || blob.type !== targetType) return null
  return blob
}

/**
 * يُعيد ملفّاً مضغوطاً، أو **الأصلَ نفسه** إن لم يُجدِ الضغط أو تعذّر.
 * لا يرمي أبداً: كلُّ مسارٍ فاشلٍ ينتهي بالأصل.
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult> {
  const keep = (skipReason: ImageCompressionSkipReason): ImageCompressionResult => ({
    file,
    originalSize: file.size,
    size: file.size,
    compressed: false,
    skipReason,
  })

  const kind = detectKind(file)
  if (kind === 'unsupported') return keep('not-an-image')

  const maxDimension = Math.max(1, options.maxDimension ?? DEFAULT_MAX_DIMENSION)
  const quality = Math.min(1, Math.max(0.3, options.quality ?? DEFAULT_QUALITY))
  const maxBytes = options.maxBytes ?? null
  const skipUnderBytes = options.skipUnderBytes ?? DEFAULT_SKIP_UNDER_BYTES
  const minGainRatio = options.minGainRatio ?? DEFAULT_MIN_GAIN_RATIO
  const allowed = normalizeExtensions(options.allowedExtensions)

  // HEIC مستثناةٌ من عتبة «صغيرةٌ فلا تُلمس» مهما صغُرت: قيمةُ تحويلها ليست في
  // البايتات بل في أن تُقرأ أصلاً — لا الخادمُ يفكّها ولا متصفّحُ المدير يعرضها.
  if (kind !== 'heic' && file.size <= skipUnderBytes) return keep('already-small')

  let decoded: DecodedImage | null = null

  try {
    decoded = await decodeImage(file)
    if (!decoded || !decoded.width || !decoded.height) return keep('decode-failed')

    const { source, width, height } = decoded

    const transparent = ALPHA_CAPABLE_KINDS.has(kind) && hasTransparency(source, width, height)
    const targetKind: SourceKind = transparent ? 'png' : 'jpeg'
    const targetType = transparent ? 'image/png' : 'image/jpeg'

    const targetExtension = pickTargetExtension(targetType, allowed)
    if (!targetExtension) return keep('target-not-allowed')

    const baseScale = Math.min(1, maxDimension / Math.max(width, height))
    const attempts = buildAttempts(baseScale, quality, targetType, maxBytes)

    let best: Blob | null = null
    for (const attempt of attempts) {
      const blob = await encodeAttempt(source, width, height, attempt, targetType)
      if (!blob) break
      if (!best || blob.size < best.size) best = blob
      if (maxBytes === null || blob.size <= maxBytes) break
    }

    if (!best) return keep('encode-failed')

    // سقفُ القبول يختلف باختلاف المكسب: حين تتغيّر الصيغة (HEIC ⇐ JPEG مثلاً)
    // فالمكسبُ قراءةُ الملفّ أصلاً، فيكفي ألّا يكبُر. وحين تبقى الصيغة نفسها فلا
    // مكسب إلّا البايتات، فلا نخسر جودةً مقابل توفيرٍ لا يُذكر.
    const ceiling = kind === targetKind ? file.size * minGainRatio : file.size
    if (best.size >= ceiling) return keep('no-gain')

    // الاسم يبقى ما دام امتدادُه يصف الناتجَ ويقبله الحقل — فلا يرى وليُّ الأمر
    // اسماً غير الذي اختاره إلّا حين تتغيّر الصيغة حقّاً.
    const currentExtension = extensionOf(file.name)
    const keepsName =
      EXTENSION_KINDS[currentExtension] === targetKind &&
      (allowed === null || allowed.includes(currentExtension))

    const compressed = new File([best], keepsName ? file.name : replaceExtension(file.name, targetExtension), {
      type: targetType,
      lastModified: file.lastModified,
    })

    return { file: compressed, originalSize: file.size, size: compressed.size, compressed: true }
  } catch {
    // أيُّ استثناءٍ غيرِ متوقَّع — ذاكرةٌ نفدت، سياقٌ ضاع — لا يمنع الرفع
    return keep('encode-failed')
  } finally {
    decoded?.release()
  }
}

/**
 * ضغطُ مجموعةِ ملفّاتٍ **بالتسلسل** لا بالتوازي.
 *
 * `Promise.all` على خمس صورٍ يفكّها كلَّها في الذاكرة معاً — مئةُ ميجابايت من
 * البكسلات على جوّالٍ متواضع — فينهار التبويب أو يتجمّد اللمس. والمهلةُ الصفريّة
 * بين صورةٍ وأخرى تُعيد الخيطَ إلى المتصفّح ليطلي، فتتحرّك حالة «جارٍ التجهيز»
 * بدل أن تتسمّر.
 */
export async function compressImageFiles(
  files: File[],
  options: ImageCompressionOptions = {},
): Promise<ImageCompressionResult[]> {
  const results: ImageCompressionResult[] = []

  for (const file of files) {
    results.push(await compressImageFile(file, options))
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  return results
}
