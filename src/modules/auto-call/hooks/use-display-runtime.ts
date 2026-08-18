import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * بوّابةُ الصوت: المتصفّحُ لا ينطق قبل أن يلمس أحدٌ الصفحة.
 *
 * Chrome و Edge و Safari تمنع `speechSynthesis.speak()` في صفحةٍ لم يتفاعل معها
 * المستخدم بعد (Autoplay Policy) — تُقبل الدعوةُ صامتةً ولا يخرج صوت. وشاشةُ
 * البوّابة هي بالضبط الصفحةُ التي لا يلمسها أحد: تُفتح صباحاً على تلفازٍ معلّق
 * وتُترك. فكان النطقُ في أغلب التركيبات لا يعمل أصلاً، **بلا أيّ خطأٍ ظاهر** —
 * وهو أسوأُ أنواع العطل: كلُّ شيءٍ يبدو سليماً والشاشةُ صامتة.
 *
 * الحلُّ صريح: تراكبٌ يطلب لمسةً واحدةً عند فتح الشاشة، ثمّ نتحقّق فعليّاً أن
 * الصوت خرج. ولا نكتفي بتسجيل «لمس المستخدم»: بعضُ الأجهزة تكون مكتومةً أو بلا
 * صوتٍ عربيّ، فنتحقّق عبر `onstart` من أن المُركِّب بدأ فعلاً.
 */
export function useAudioGate() {
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unlock = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // لا مُركِّبَ صوتٍ في هذا المتصفّح: الشاشة تعمل صامتةً بالعرض وحده، ولا
      // معنى لحبسها خلف تراكبٍ لن يفتحه شيء.
      setIsAudioReady(true)
      setError('هذا المتصفح لا يدعم النطق الآلي — الشاشة ستعمل بالعرض فقط')
      return
    }

    setIsUnlocking(true)
    setError(null)

    // نطقٌ اختباريٌّ قصيرٌ داخل معالج النقر نفسه: هذا هو التفاعلُ الذي يفتح
    // البوّابة، وتأجيلُه إلى `setTimeout` يُفقده صفتَه عند المتصفّح.
    const probe = new SpeechSynthesisUtterance('تم تفعيل النداء الصوتي')
    probe.lang = 'ar-SA'
    probe.volume = 1
    probe.rate = 1

    let settled = false

    const succeed = () => {
      if (settled) return
      settled = true
      setIsAudioReady(true)
      setIsUnlocking(false)
    }

    probe.onstart = succeed
    probe.onend = succeed
    probe.onerror = () => {
      if (settled) return
      settled = true
      setIsUnlocking(false)
      setError('تعذّر تشغيل الصوت — تحقّق من مستوى الصوت في الجهاز ثم أعد المحاولة')
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(probe)

    // شبكةُ أمان: بعض المنصّات لا تُطلق `onstart` ولا `onerror` إن لم يكن ثمّة
    // صوتٌ مثبَّت. لا نحبس الشاشةَ إلى الأبد بانتظار حدثٍ قد لا يأتي.
    window.setTimeout(succeed, 2500)
  }, [])

  return { isAudioReady, isUnlocking, error, unlock }
}

/**
 * إبقاءُ الشاشة مضاءة.
 *
 * شاشةُ البوّابة تُترك ساعاتٍ بلا لمس، فينطفئ العرضُ بعد دقائق حسب إعدادات
 * الجهاز ويقف أولياءُ الأمور أمام سوادٍ بينما النظامُ يعمل خلفه. و`WakeLock`
 * يسقط تلقائيّاً كلّما غابت الصفحةُ عن الرؤية (تبديلُ تبويب، إطفاءُ الشاشة
 * يدويّاً)، فلا بدّ من إعادة طلبه عند العودة — وإلا فأوّلُ تبديلِ تبويبٍ يُنهي
 * الحماية لبقيّة اليوم.
 */
export function useScreenWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let cancelled = false

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        sentinelRef.current = sentinel
      } catch {
        // رفضُ الإذن أو متصفّحٌ لا يدعمه: الشاشة تعمل، وتنطفئ إضاءتُها فقط.
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel) {
        void sentinel.release().catch(() => {})
      }
    }
  }, [active])
}
