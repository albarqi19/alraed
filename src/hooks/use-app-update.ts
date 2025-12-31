import { useState, useEffect, useCallback, useRef } from 'react'

// مفتاح لتخزين إصدار الـ SW الحالي المُفعَّل
const CURRENT_SW_VERSION_KEY = 'app-sw-current-version'

interface AppUpdateState {
  isUpdateAvailable: boolean
  isUpdating: boolean
  currentVersion: string | null
  newVersion: string | null
  registration: ServiceWorkerRegistration | null
}

interface UseAppUpdateReturn extends AppUpdateState {
  applyUpdate: () => Promise<void>
  checkForUpdate: () => Promise<void>
  dismissUpdate: () => void
}

export const useAppUpdate = (): UseAppUpdateReturn => {
  const [state, setState] = useState<AppUpdateState>({
    isUpdateAvailable: false,
    isUpdating: false,
    currentVersion: null,
    newVersion: null,
    registration: null,
  })

  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const dismissedRef = useRef(false)
  const currentVersionRef = useRef<string | null>(null)

  // التحقق من التحديثات يدوياً
  const checkForUpdate = useCallback(async () => {
    if (state.registration) {
      try {
        await state.registration.update()
        console.log('[AppUpdate] Manual update check triggered')
      } catch (error) {
        console.error('[AppUpdate] Update check failed:', error)
      }
    }
  }, [state.registration])

  // تطبيق التحديث
  const applyUpdate = useCallback(async () => {
    if (!waitingWorkerRef.current) {
      console.warn('[AppUpdate] No waiting worker to activate')
      return
    }

    setState((prev) => ({ ...prev, isUpdating: true }))

    try {
      // أولاً: مسح الكاش من Cache Storage (لا يمس localStorage)
      console.log('[AppUpdate] Clearing caches...')

      // مسح كل الكاش من Service Worker
      const messageChannel = new MessageChannel()
      waitingWorkerRef.current.postMessage({ type: 'CLEAR_CACHE' }, [messageChannel.port2])

      // انتظار قليلاً للتأكد من مسح الكاش
      await new Promise((resolve) => setTimeout(resolve, 500))

      // إرسال رسالة skipWaiting للـ Service Worker الجديد
      console.log('[AppUpdate] Activating new worker...')
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' })

      // سنستمع لحدث controllerchange في useEffect
    } catch (error) {
      console.error('[AppUpdate] Apply update failed:', error)
      setState((prev) => ({ ...prev, isUpdating: false }))
    }
  }, [])

  // إخفاء إشعار التحديث مؤقتاً
  const dismissUpdate = useCallback(() => {
    dismissedRef.current = true
    setState((prev) => ({ ...prev, isUpdateAvailable: false }))

    // إعادة إظهار الإشعار بعد 5 دقائق
    setTimeout(() => {
      if (waitingWorkerRef.current) {
        dismissedRef.current = false
        setState((prev) => ({ ...prev, isUpdateAvailable: true }))
      }
    }, 5 * 60 * 1000)
  }, [])

  // تسجيل Service Worker والاستماع للتحديثات
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('[AppUpdate] Service Workers not supported')
      return
    }

    // جلب الإصدار المحفوظ محلياً
    const savedVersion = localStorage.getItem(CURRENT_SW_VERSION_KEY)
    console.log('[AppUpdate] Saved version:', savedVersion)

    let mounted = true

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none', // دائماً تحقق من وجود تحديث
        })

        if (!mounted) return

        console.log('[AppUpdate] Service Worker registered:', registration)
        setState((prev) => ({ ...prev, registration }))

        // جلب الإصدار الحالي من الـ SW النشط
        if (registration.active) {
          const messageChannel = new MessageChannel()
          messageChannel.port1.onmessage = (event) => {
            if (event.data?.version) {
              const activeVersion = event.data.version
              currentVersionRef.current = activeVersion
              setState((prev) => ({ ...prev, currentVersion: activeVersion }))
              console.log('[AppUpdate] Active SW version:', activeVersion)
              
              // حفظ الإصدار الحالي
              localStorage.setItem(CURRENT_SW_VERSION_KEY, activeVersion)
            }
          }
          registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2])
        }

        // دالة مساعدة للتحقق وإظهار التحديث
        const showUpdateIfNeeded = (newWorker: ServiceWorker) => {
          // جلب إصدار الـ Worker الجديد
          const messageChannel = new MessageChannel()
          messageChannel.port1.onmessage = (event) => {
            if (event.data?.version) {
              const newVersion = event.data.version
              const currentVersion = currentVersionRef.current || savedVersion
              
              console.log('[AppUpdate] Comparing versions:', { currentVersion, newVersion })
              
              // فقط أظهر الإشعار إذا كان الإصدار الجديد مختلف فعلاً
              if (newVersion && currentVersion && newVersion !== currentVersion) {
                console.log('[AppUpdate] Real update available!')
                setState((prev) => ({ ...prev, newVersion }))
                
                if (!dismissedRef.current && mounted) {
                  setState((prev) => ({ ...prev, isUpdateAvailable: true }))
                }
              } else {
                console.log('[AppUpdate] Same version, no update needed')
              }
            }
          }
          newWorker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2])
        }

        // التحقق إذا كان هناك Service Worker في انتظار التفعيل
        if (registration.waiting) {
          console.log('[AppUpdate] Found waiting worker on load')
          waitingWorkerRef.current = registration.waiting
          showUpdateIfNeeded(registration.waiting)
        }

        // الاستماع لتحديثات جديدة
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          console.log('[AppUpdate] New worker installing...')

          newWorker.addEventListener('statechange', () => {
            console.log('[AppUpdate] New worker state:', newWorker.state)

            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // هناك تحديث جديد جاهز
              console.log('[AppUpdate] New worker installed, checking version...')
              waitingWorkerRef.current = newWorker
              showUpdateIfNeeded(newWorker)
            }
          })
        })

        // الاستماع لتغيير الـ controller (عند تفعيل Worker جديد)
        let reloading = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return
          reloading = true
          
          console.log('[AppUpdate] Controller changed, reloading page...')
          
          // تحديث الإصدار المحفوظ قبل إعادة التحميل
          if (state.newVersion) {
            localStorage.setItem(CURRENT_SW_VERSION_KEY, state.newVersion)
          }
          
          // إعادة تحميل الصفحة للحصول على النسخة الجديدة
          window.location.reload()
        })

        // التحقق من التحديثات كل 5 دقائق
        const intervalId = setInterval(() => {
          console.log('[AppUpdate] Checking for updates...')
          registration.update().catch(console.error)
        }, 5 * 60 * 1000)

        return () => {
          clearInterval(intervalId)
        }
      } catch (error) {
        console.error('[AppUpdate] Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()

    return () => {
      mounted = false
    }
  }, [])

  return {
    ...state,
    applyUpdate,
    checkForUpdate,
    dismissUpdate,
  }
}

export default useAppUpdate
