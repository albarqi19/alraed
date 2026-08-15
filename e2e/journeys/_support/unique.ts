/**
 * مولّدُ الأسماء المميّزة للجولة.
 *
 * ══ لماذا؟ ══
 * رحلةٌ تُنشئ «الطالب محمد» تنجح مرّةً وتفشل في الثانية: الهويّة مكرّرة، أو
 * الجدول فيه صفّان بالاسم نفسه فلا يعرف المحدِّد أيَّهما يقصد. ورحلةٌ تعتمد
 * على أثر رحلةٍ سابقة تنكسر حين تُشغَّل وحدها، ويصير ترتيبُها شرطاً خفيّاً.
 *
 * فكلُّ رحلةٍ **تُنشئ ما يخصّها** بأسماءٍ لا تتكرّر، وتقرأ من البذرة ما تحتاج
 * قراءته. وبهذا تُشغَّل كلُّ رحلةٍ وحدَها، وبأيّ ترتيب، وألفَ مرّة.
 *
 * ══ الوسم ══
 * كلُّ ما تُنشئه الرحلات يحمل «تجريبي» ووسمَ الجولة، فيستطيع المالك أن يجد
 * مخلَّفات أيّ تشغيلٍ ويحذفها بأمانٍ بلا خوفٍ من ملامسة بياناتٍ حقيقية.
 */

/** وسمُ الجولة: يوم-ساعة-دقيقة + أربعةُ أرقامٍ عشوائية. ثابتٌ طوال العملية. */
export const RUN_TAG: string = (() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const salt = String(Math.floor(Math.random() * 9000) + 1000)
  return `${stamp}-${salt}`
})()

/** عدّادٌ تصاعديّ داخل الجولة — يفصل بين عنصرين أُنشئا في الدقيقة نفسها */
let counter = 0
function nextIndex(): string {
  counter += 1
  return String(counter).padStart(2, '0')
}

/** لاحقةٌ فريدةٌ لكل نداء: «0815-1432-7391-01» */
export function uniqueSuffix(): string {
  return `${RUN_TAG}-${nextIndex()}`
}

/**
 * هويّةٌ وطنيةٌ من عشرة أرقام تبدأ بـ«٢».
 *
 * البدءُ بـ٢ مقصود: هويّاتُ البذرة تبدأ بـ١٩، وهويّاتُ السعوديين الحقيقية
 * تبدأ بـ١، والمقيمين بـ٢. فاختيارُ ٢ مع تسعةِ أرقامٍ عشوائية يجعل التصادم
 * مع بذرةٍ أو ببيانٍ حقيقيٍّ بعيداً، ويُبقي الرقمَ صالحاً في نظر التحقّق
 * (عشرةُ أرقام).
 */
export function uniqueNationalId(): string {
  let digits = ''
  for (let i = 0; i < 9; i += 1) digits += Math.floor(Math.random() * 10)
  return `2${digits}`
}

/** جوّالٌ سعوديٌّ صالحُ الشكل — والأرقام بعد 05 عشوائية فلا يخصّ أحداً */
export function uniquePhone(): string {
  let digits = ''
  for (let i = 0; i < 8; i += 1) digits += Math.floor(Math.random() * 10)
  return `05${digits}`
}

/** اسمُ طالبٍ مميَّزٌ للجولة — يُبحث عنه بالنصّ في الجدول */
export function uniqueStudentName(): string {
  return `طالب تجريبي ${uniqueSuffix()}`
}

/** اسمُ وليّ أمرٍ مميَّز — تستعمله رحلةُ التعديل قيمةً جديدةً تُثبت ثبات التغيير */
export function uniqueParentName(): string {
  return `ولي أمر تجريبي ${uniqueSuffix()}`
}

/** اسمُ مدرسةٍ مميَّز — ويولّد نطاقاً فرعياً لاتينياً يقبله التحقّق */
export function uniqueSchoolName(): string {
  return `مدرسة تجريبية ${uniqueSuffix()}`
}

/** نطاقٌ فرعيٌّ لاتينيّ (التحقّق يقبل [a-z0-9-] فقط) */
export function uniqueSubdomain(): string {
  return `e2e-journey-${uniqueSuffix().replace(/[^a-z0-9-]/gi, '')}`.toLowerCase()
}

/** اسمُ مديرٍ مميَّز */
export function uniqueAdminName(): string {
  return `مدير تجريبي ${uniqueSuffix()}`
}

/** رقمٌ وزاريٌّ مميَّز — ثمانيةُ أرقام كما في المثال داخل النموذج */
export function uniqueMinistryNumber(): string {
  let digits = ''
  for (let i = 0; i < 8; i += 1) digits += Math.floor(Math.random() * 10)
  return digits
}
