/**
 * نسخُ نصٍّ إلى الحافظة — بثلاث طبقاتٍ لا بواحدة.
 *
 * ══ لماذا لا يكفي `navigator.clipboard` وحده؟ ══
 * الواجهةُ الحديثة **لا توجد أصلاً** خارج السياق الآمن: صفحةٌ تُفتح على
 * `http://` أو على عنوان IP في شبكة المدرسة لا ترى `navigator.clipboard`، فيرمي
 * الاستدعاء أو يُرجع `undefined`. وصفحةُ بيانات الدخول تُفتح مرّةً واحدة — فإن
 * سقط زرُّ النسخ صامتاً هناك، ضاعت كلمةُ المرور على صاحبها.
 *
 * فالطبقات:
 *   ١) `navigator.clipboard.writeText` في السياق الآمن — الطريق الصحيح.
 *   ٢) `document.execCommand('copy')` على حقلٍ مخفيّ — مهجورٌ لكنّه يعمل حيث
 *      لا تعمل الأولى، وهو آخرُ ما يملكه متصفّحٌ قديمٌ أو صفحةٌ غير مؤمَّنة.
 *   ٣) `false` — يُعلَن للمستخدم صراحةً فيحدّد النصّ وينسخه بيده. الفشلُ
 *      المُعلَن أرحمُ من زرٍّ يقول «تمّ» ولم يتمّ شيء.
 *
 * ══ حذارِ ══
 * لا يُسجَّل النصُّ المنسوخ في أيّ مكان — لا console ولا تتبّع. هذه الدالّة
 * تمرّ بها كلماتُ المرور.
 */
export async function copyText(value: string): Promise<boolean> {
  if (!value) return false

  // (١) الطريق الصحيح — السياق الآمن وحده
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // نمضي إلى الاحتياط: الإذن قد يكون مرفوضاً أو الصفحة غير مركَّزة
  }

  // (٢) الاحتياط اليدويّ — حقلٌ خارج الشاشة يُحدَّد ويُنسخ ثمّ يُزال فوراً
  try {
    if (typeof document === 'undefined') return false

    const holder = document.createElement('textarea')
    holder.value = value
    // خارج الشاشة لا `display:none`: المخفيُّ بالكامل لا يُحدَّد نصُّه
    holder.setAttribute('readonly', '')
    holder.style.position = 'fixed'
    holder.style.top = '-1000px'
    holder.style.opacity = '0'
    // منعُ قفزة التمرير التي يُحدثها التركيز على عنصرٍ خارج الإطار
    holder.style.pointerEvents = 'none'

    document.body.appendChild(holder)
    holder.select()
    holder.setSelectionRange(0, holder.value.length)

    const copied = document.execCommand('copy')

    // المسحُ قبل الإزالة: لا يبقى نصُّ كلمة المرور في تحديد المستخدم
    holder.value = ''
    document.body.removeChild(holder)

    return copied
  } catch {
    return false
  }
}
