import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Hook للتحكم في تثبيت PWA
 */
export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // التحقق من أن التطبيق مثبت
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // @ts-expect-error - navigator.standalone for iOS
      const isIOSStandalone = window.navigator.standalone === true
      return isStandalone || isIOSStandalone
    }

    if (checkIfInstalled()) {
      setIsInstalled(true)
      return
    }

    // الاستماع لحدث beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
      console.log('✅ PWA ready to install')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // التحقق من نجاح التثبيت
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
      console.log('✅ PWA installed successfully')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('❌ No install prompt available')
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('✅ User accepted install')
        setIsInstalled(true)
        setCanInstall(false)
        setDeferredPrompt(null)
        return true
      } else {
        console.log('❌ User dismissed install')
        return false
      }
    } catch (error) {
      console.error('Error during PWA installation:', error)
      return false
    }
  }

  // إعادة تعيين (للتجربة فقط)
  const reset = () => {
    localStorage.removeItem('pwa_prompt_last_shown')
    localStorage.removeItem('pwa_prompt_dismissed')
    console.log('🔄 PWA prompt reset - reload page to see prompt again')
  }

  return {
    isInstalled,
    canInstall,
    install,
    reset,
  }
}
