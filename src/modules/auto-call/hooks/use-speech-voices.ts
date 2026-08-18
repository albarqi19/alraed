import { useEffect, useState } from 'react'

/**
 * أصواتُ المتصفّح — بعد أن تصل.
 *
 * `speechSynthesis.getVoices()` تعود **مصفوفةً فارغة** عند أوّل استدعاءٍ في
 * Chrome و Edge: القائمةُ تُحمَّل غيرَ متزامنةٍ ويُطلق بعدها `voiceschanged`.
 * وشاشةُ البوّابة كانت تستدعيها داخل معالج النطق مباشرةً، أي في اللحظة التي
 * تُفتح فيها الصفحةُ وتصل أوّلُ حمولة — فلا تجد صوتاً عربيّاً، فتنطق باللكنة
 * الافتراضيّة للنظام (إنجليزيّةً في أغلب أجهزة الويندوز)، والأسماءُ العربيّة
 * تُقرأ حروفاً مبعثرةً لا يفهمها واقفٌ عند البوّابة.
 *
 * الاشتراكُ هنا مرّةً واحدةً في الصفحة، والنتيجةُ تُشارَك: القائمةُ تُحدَّث حين
 * تصل فعلاً، ويُعاد الرسمُ فتُلتقط في النداء التالي.
 */
export function useSpeechVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const read = () => {
      const available = window.speechSynthesis.getVoices()
      if (available.length > 0) {
        setVoices(available)
      }
    }

    read()
    window.speechSynthesis.addEventListener('voiceschanged', read)

    // بعضُ إصدارات Chrome لا تُطلق `voiceschanged` إن كانت القائمة جاهزةً
    // سلفاً، وبعضُها يتأخّر. محاولةٌ ثانيةٌ بعد لحظةٍ أرخص من شاشةٍ تنطق
    // بالإنجليزيّة طوال اليوم.
    const retry = window.setTimeout(read, 1200)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', read)
      window.clearTimeout(retry)
    }
  }, [])

  return voices
}

/**
 * اختيارُ الصوت الأنسب للُّغة والجنس المطلوبين.
 *
 * الترتيب: عربيٌّ بالجنس المطلوب ⇐ أيُّ عربيّ ⇐ لا شيء (فيتولّى المتصفّح).
 * وأسماءُ الأصوات تختلف بين المنصّات اختلافاً كاملاً — «Microsoft Hamed» في
 * ويندوز و«Maged» في macOS و«ar-xa-x-arc-local» في أندرويد — فلا يصحّ البحث
 * عن كلمة `male` في الاسم وحدها كما كان: أكثرُ الأصوات العربيّة لا تحمل في
 * اسمها كلمةً إنجليزيّةً أصلاً، فكان الشرطُ يفشل دائماً ويسقط إلى الافتراضيّ.
 */
const KNOWN_MALE_VOICES = ['hamed', 'maged', 'majed', 'naayf', 'male', 'tarik', 'mehdi']
const KNOWN_FEMALE_VOICES = ['hoda', 'salma', 'zariyah', 'laila', 'female', 'amina']

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
  gender: 'male' | 'female' | 'auto'
): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null
  }

  const arabic = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('ar'))

  if (arabic.length === 0) {
    return null
  }

  // مطابقةُ اللهجة المطلوبة (ar-SA) قبل أيّ عربيّةٍ أخرى (ar-EG).
  const languageTag = locale.split('-').slice(0, 2).join('-').toLowerCase()
  const sameLocale = arabic.filter((voice) => voice.lang.toLowerCase().startsWith(languageTag))
  const pool = sameLocale.length > 0 ? sameLocale : arabic

  if (gender === 'auto') {
    return pool[0]
  }

  const wanted = gender === 'male' ? KNOWN_MALE_VOICES : KNOWN_FEMALE_VOICES
  const matched = pool.find((voice) => {
    const name = voice.name.toLowerCase()
    return wanted.some((needle) => name.includes(needle))
  })

  return matched ?? pool[0]
}
