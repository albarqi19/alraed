import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'android_app_banner_dismissed'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=site.brqq.alraed'

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (!val) return false
    const ts = parseInt(val, 10)
    // يظهر مرة أخرى بعد 7 أيام
    return Date.now() - ts < 7 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

const features = [
  { icon: 'bi-bell-fill', text: 'إشعارات تذكير بالحصص' },
  { icon: 'bi-speedometer2', text: 'أداء أسرع وأخف' },
  { icon: 'bi-phone-fill', text: 'تجربة تطبيق أصلي' },
]

export function AndroidAppBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isAndroid() && !isDismissed()) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch { /* ignore */ }
  }

  const openStore = () => {
    window.open(PLAY_STORE_URL, '_blank')
    dismiss()
  }

  return (
    <AnimatePresence>
      {visible ? (
        <>
          {/* الخلفية */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* البانر من الأسفل */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          >
            {/* المقبض */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-300" />

            {/* الأيقونة والعنوان */}
            <div className="flex items-center gap-4 text-right">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2, damping: 15 }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-teal-500/25"
              >
                <i className="bi bi-google-play text-2xl text-white" />
              </motion.div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">تطبيق الرائد متاح الآن!</h3>
                <p className="mt-1 text-sm text-slate-500">حمّل التطبيق واستمتع بتجربة أفضل</p>
              </div>
            </div>

            {/* المميزات */}
            <div className="mt-5 space-y-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-right"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <i className={`bi ${f.icon} text-sm`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{f.text}</span>
                </motion.div>
              ))}
            </div>

            {/* الأزرار */}
            <div className="mt-6 flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={openStore}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition active:shadow-md"
              >
                <i className="bi bi-download" />
                تحميل التطبيق
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={dismiss}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
              >
                لاحقاً
              </motion.button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
