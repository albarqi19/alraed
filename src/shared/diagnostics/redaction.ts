/**
 * سياسة التقنيع — الملفّ الوحيد الذي يقرّر ما يُلتقط وما يُحجب.
 *
 * ─── لماذا هذا الملفّ موجود، ولماذا وحده ───────────────────────────────────
 *
 * فتات المسار يُجمع من متصفّحات مستخدمين حقيقيّين في مدارس حقيقيّة: معلّمون
 * وأولياء أمور وطلاب لم يوافق أحدٌ منهم على أن يُقرأ ما يكتبه. فالتقنيع هنا
 * **في المنبع** — قبل أن تدخل القيمة حلقة الذاكرة أصلاً — لا عند العرض ولا عند
 * الإرسال. القاعدة: ما لم يُلتقط لا يمكن أن يتسرّب، لا في سجلّ، ولا في نسخةٍ
 * احتياطيّة، ولا في لقطة شاشةٍ لمن يفتح اللوحة.
 *
 * وهي في ملفٍّ واحد لأن السياسة المبعثرة في الكود تموت: تُنسى في الموضع الثالث،
 * ثم يُضاف حقلٌ حسّاس جديد فلا يعرف أحدٌ أين يسجّله. توسيع القوائم أدناه سطرٌ
 * واحد، وهذا مقصود.
 *
 * ─── تحذيرٌ لمن يقرأ بعد سنة ───────────────────────────────────────────────
 *
 * إن جاءك يومٌ تظنّ فيه أن التشخيص سيصير أسهل «لو التقطنا القيمة فقط هذه
 * المرّة» — فتوقّف. التوسّع في الالتقاط **قرار خصوصيّةٍ** لا تحسين تشخيص، ولا
 * يملكه مطوّرٌ منفرد. الغرض من الفتات أن يجيب: «ماذا ضغط المستخدم؟ وهل كان
 * الحقل مملوءاً؟» — لا «ماذا كتب؟». والفرق بين السؤالين هو الفرق بين أداة دعمٍ
 * وأداة مراقبة.
 */

/** حدودٌ عدديّة موحّدة — أيّ قصٍّ في النظام يقرأ من هنا لا من رقمٍ مبعثر */
export const REDACTION_LIMITS = {
  /** أقصى طول لأيّ قيمةٍ نصّية نسمح بمرورها (مثل قيمة مُقنَّعة في مسار) */
  value: 200,
  /** أقصى عدد عناصر في أيّ مصفوفة (تكرار مفتاحٍ في المسار · حلقة الفتات) */
  arrayItems: 20,
  /** أقصى طول نصّ عنصرٍ نلتقطه — ما زاد عليه يُرفض لا يُقصّ (انظر أدناه) */
  elementText: 60,
  /** أقصى طول اسم حقلٍ نسجّله */
  fieldName: 60,
} as const

/**
 * حقولٌ تُحذف كلّياً — بمطابقة **اسم** الحقل لا قيمته.
 *
 * لا تظهر قيمتها ولا اسمها في الفتات. نُبقي أثر الحدث نفسه (بلا اسم) لأن تسلسل
 * الأحداث هو القصّة: «ملأ حقلاً محجوباً ثم ضغط دخول ثم ارتدّ 401» تشخيصٌ كامل
 * بلا كلمة سرّ ولا شظيّةٍ منها.
 */
export const DROPPED_FIELD_NAMES = [
  'password',
  'passwd',
  'password_confirmation',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key',
  'apikey',
  'otp',
  'authorization',
  'cookie',
  'credit',
  'card',
  'cvv',
  'cvc',
  'pin',
] as const

/**
 * حقولٌ تُقنَّع جزئيّاً: أوّل محرفين وآخر محرفين (1234567890 ⇒ 12******90).
 *
 * الغرض تمييز «هل أدخل رقماً مختلفاً عن الذي في السجلّ؟» لا معرفة الرقم. وهذا
 * يكفي تماماً للتشخيص: الخطأ الشائع أن يُدخل المستخدم هويّة طالبٍ آخر، والقناع
 * يكشف الاختلاف دون كشف الهويّة.
 *
 * ملاحظة: القيم لا تُلتقط من الحقول أصلاً (انظر `breadcrumbs.ts`)؛ هذه القائمة
 * تحرس ما قد يظهر في **مسارات الشبكة** — `?national_id=1234567890` مثلاً.
 */
export const MASKED_FIELD_NAMES = [
  'national_id',
  'nationalid',
  'identity_number',
  'identity',
  'iqama',
  'iqama_number',
  'phone',
  'phone_number',
  'mobile',
  'whatsapp',
  'tel',
  'email',
] as const

/**
 * حقولٌ حرّة طويلة — لا يُلتقط محتواها إطلاقاً، لا كاملاً ولا مقنَّعاً.
 *
 * ملاحظات المعلّم عن طالب، ورسالة وليّ الأمر، وعذر الغياب: هذه خصوصيّة الطالب
 * وأهله لا بيانات تشخيص. اسم الحقل وطولُ ما كُتب يجيبان كلّ سؤالٍ تقنيّ يُطرح
 * («هل تجاوز الحدّ؟ هل أرسل فارغاً؟») دون أن نقرأ حرفاً.
 */
export const FREE_TEXT_FIELD_NAMES = [
  'note',
  'notes',
  'message',
  'body',
  'content',
  'excuse',
  'reason',
  'description',
  'comment',
  'comments',
  'remarks',
  'details',
  'feedback',
] as const

/** تصنيف الحقل: ما الذي يُسمح به لهذا الاسم */
export type FieldClass = 'drop' | 'mask' | 'free' | 'plain'

/** النصّ البديل لاسم حقلٍ محجوب — يُبقي مكان الحدث في التسلسل بلا تسمية */
export const REDACTED_LABEL = '«محجوب»'

/**
 * توحيد اسم الحقل قبل المطابقة: حروفٌ صغيرة، وكلّ ما ليس حرفاً أو رقماً يصير
 * شرطةً سفليّة. فـ`nationalId` و`national-id` و`National ID` اسمٌ واحد.
 */
function normalizeName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * المطابقة بحدود المقاطع لا بالاحتواء الأعمى: `card` تطابق `credit_card` ولا
 * تطابق `discard`، و`pin` تطابق `pin_code` ولا تطابق `shipping`.
 */
function matchesAny(normalized: string, needles: readonly string[]): boolean {
  const padded = `_${normalized}_`
  return needles.some((needle) => padded.includes(`_${normalizeName(needle)}_`))
}

/** تصنيف اسم حقل — الحذف يسبق التقنيع يسبق الحقول الحرّة */
export function classifyFieldName(rawName: string | null | undefined): FieldClass {
  if (!rawName) return 'plain'

  const normalized = normalizeName(rawName)
  if (!normalized) return 'plain'

  if (matchesAny(normalized, DROPPED_FIELD_NAMES)) return 'drop'
  if (matchesAny(normalized, MASKED_FIELD_NAMES)) return 'mask'
  if (matchesAny(normalized, FREE_TEXT_FIELD_NAMES)) return 'free'

  return 'plain'
}

/** أوّل محرفين وآخر محرفين، وما بينهما نجوم. القصير كلّه نجوم. */
export function maskValue(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length)

  const middle = Math.min(value.length - 4, REDACTION_LIMITS.value)
  return `${value.slice(0, 2)}${'*'.repeat(middle)}${value.slice(-2)}`
}

/** قصُّ أيّ نصٍّ عند حدٍّ مع علامة قصّ — للأسماء والمسارات لا للقيم الحسّاسة */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * اسم حقلٍ صالحٌ للتسجيل: مقصوصٌ عند الحدّ، ومحجوبٌ إن كان من قائمة الحذف.
 * يُرجع null إن لم يكن للحقل اسمٌ أصلاً — فلا نسجّل حدثاً بلا معنى.
 */
export function redactFieldName(rawName: string | null | undefined): string | null {
  const name = rawName?.trim()
  if (!name) return null
  if (classifyFieldName(name) === 'drop') return REDACTED_LABEL

  return truncate(name, REDACTION_LIMITS.fieldName)
}

/**
 * تنظيف مسار الشبكة: الجزء بعد `?` قد يحمل هويّاتٍ وأرقام جوّال.
 *
 * الحذف يزيل الزوج كاملاً، والتقنيع يُبقي طرفَي القيمة، والحقول الحرّة تُستبدل
 * بطولها، وما عدا ذلك يُقصّ. والمفاتيح المكرّرة تُقصّ عند حدّ المصفوفات.
 */
export function redactUrl(rawUrl: string): string {
  const [path, query] = rawUrl.split('?')
  const safePath = truncate(path ?? '', REDACTION_LIMITS.value)
  if (!query) return safePath

  const parts: string[] = []
  let seen = 0

  for (const [key, value] of new URLSearchParams(query)) {
    if (seen >= REDACTION_LIMITS.arrayItems) {
      parts.push('…')
      break
    }
    seen += 1

    switch (classifyFieldName(key)) {
      case 'drop':
        break
      case 'mask':
        parts.push(`${key}=${maskValue(value)}`)
        break
      case 'free':
        parts.push(`${key}=«${value.length} محرف»`)
        break
      default:
        parts.push(`${key}=${truncate(value, 40)}`)
    }
  }

  return parts.length ? `${safePath}?${parts.join('&')}` : safePath
}
