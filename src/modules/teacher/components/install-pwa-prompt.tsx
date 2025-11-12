import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // التحقق من أن التطبيق مثبت بالفعل
    const checkIfInstalled = () => {
      // التحقق من standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // @ts-expect-error - navigator.standalone for iOS
      const isIOSStandalone = window.navigator.standalone === true
      
      return isStandalone || isIOSStandalone
    }

    if (checkIfInstalled()) {
      setIsInstalled(true)
      return
    }

    // التحقق من آخر مرة تم عرض التنبيه
    const lastShown = localStorage.getItem('pwa_prompt_last_shown')
    const promptDismissed = localStorage.getItem('pwa_prompt_dismissed')
    
    if (promptDismissed === 'true') {
      return
    }

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000 // يوم واحد
    
    if (lastShown && now - parseInt(lastShown) < oneDay) {
      return
    }

    // الاستماع لحدث beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // عرض التنبيه بعد 3 ثواني من تحميل الصفحة
      setTimeout(() => {
        setShowPrompt(true)
        localStorage.setItem('pwa_prompt_last_shown', Date.now().toString())
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // التحقق من نجاح التثبيت
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      localStorage.removeItem('pwa_prompt_dismissed')
      localStorage.removeItem('pwa_prompt_last_shown')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setIsInstalled(true)
        localStorage.removeItem('pwa_prompt_dismissed')
        localStorage.removeItem('pwa_prompt_last_shown')
      } else {
        handleDismiss()
      }
    } catch (error) {
      console.error('Error during PWA installation:', error)
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  const handleLater = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_last_shown', Date.now().toString())
  }

  if (!showPrompt || isInstalled) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={handleLater} />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header with icon */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-teal-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">ثبّت التطبيق</h3>
            <p className="text-xs text-white/90">للحصول على تجربة أفضل</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            ثبّت التطبيق على جهازك للاستفادة من المميزات التالية:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50">
                <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">تذكير بالحصص</p>
                <p className="text-xs text-slate-500">إشعارات فورية قبل بداية كل حصة</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50">
                <svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">أداء سريع</p>
                <p className="text-xs text-slate-500">فتح فوري دون الحاجة للمتصفح</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">وصول سهل</p>
                <p className="text-xs text-slate-500">أيقونة مباشرة على الشاشة الرئيسية</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">نماذج جاهزة</p>
                <p className="text-xs text-slate-500">الوصول للنماذج بسرعة ودون اتصال</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
          >
            لا شكرًا
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleLater}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            لاحقًا
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:shadow-xl hover:shadow-teal-500/40"
          >
            تثبيت الآن
          </button>
        </div>
      </div>
    </div>
  )
}
