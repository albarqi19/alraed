/**
 * قراءةُ المميّز الثاني (آخر أربعة من جوال وليّ الأمر) من الجلسة المحفوظة.
 *
 * لماذا ملفٌّ مستقلّ؟ لأنّ القارئ هو معترضُ axios في services/api/client.ts،
 * وهو طبقةٌ عامّة لا يجوز أن تعرف كيف تُخزَّن جلسةُ وليّ الأمر. فالمعترض
 * يسأل هذه الدالّة، وهي وحدها تعرف المفتاح والشكل — فإن تغيّر التخزين غداً
 * تغيّر هنا وحده.
 *
 * ولا يستوردها من `guardian-context.tsx` مباشرةً عمداً: ذاك ملفُّ React
 * يجرّ معه المكوّنات والخطّافات، واستيرادُه من طبقة الشبكة يصنع دورةً في
 * الاعتماديات (client → context → client) تظهر أخطاءً غامضةً وقت التشغيل.
 */

/** يجب أن يطابق STORAGE_KEY في modules/guardian/context/guardian-context.tsx */
const GUARDIAN_SESSION_KEY = 'guardian_session'

interface StoredChild {
  national_id?: string
  phone_last4?: string
}

interface StoredSession {
  children?: StoredChild[]
  expiresAt?: number
}

/**
 * يُرجع آخر أربعة أرقام لهذه الهويّة، أو null.
 *
 * المطابقة **بالهويّة لا بالطفل النشط**: الجلسة قد تحمل عدّة أبناء، والصفحة
 * قد تسأل عن أخٍ غير المعروض حالياً (بطاقةُ أخٍ في الرئيسية مثلاً). فإرجاعُ
 * رقم الطفل النشط لأخيه يُنتج رفضاً محيّراً: بياناتٌ صحيحة ومميّزٌ خاطئ.
 */
export function guardianPhoneLast4For(nationalId: string): string | null {
  if (!nationalId) return null

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(GUARDIAN_SESSION_KEY)
  } catch {
    // التخزين معطَّل (تصفّحٌ خاصّ في بعض المتصفّحات) — لا جلسةَ نقرؤها.
    return null
  }
  if (!raw) return null

  let session: StoredSession
  try {
    session = JSON.parse(raw) as StoredSession
  } catch {
    return null
  }

  // جلسةٌ منتهية لا تُستعمل: إرسال مميّزٍ من جلسةٍ ميّتة يُنتج رفضاً بلا معنى،
  // والأصحّ أن يصل الطلب بلا مميّز فيقول الخادم «سجّل الدخول».
  if (typeof session.expiresAt === 'number' && Date.now() > session.expiresAt) {
    return null
  }

  const match = (session.children ?? []).find((c) => c?.national_id === nationalId)
  const last4 = match?.phone_last4

  return typeof last4 === 'string' && last4.length === 4 ? last4 : null
}
