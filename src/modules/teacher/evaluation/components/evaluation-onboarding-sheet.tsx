import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'evaluation_onboarding_seen'

const springConfig = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
}

export function EvaluationOnboardingSheet() {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  const goToSkills = () => {
    dismiss()
    navigate('/teacher/skills')
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-[60] bg-black/40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className="fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-white px-6 pb-8 pt-4 shadow-2xl"
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-300" />

            {/* Content */}
            <div className="text-center">
              <span className="text-4xl">🎉</span>
              <h2 className="mt-3 text-lg font-bold text-slate-900">ميزة جديدة وصلتك!</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                الحين تقدر تقيّم طلابك من داخل الحصة بضغطة وحدة!
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-right text-sm text-slate-700">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-2.5">
                <span className="text-xl">✋</span>
                <span>سجّل مشاركة الطالب</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-2.5">
                <span className="text-xl">😴</span>
                <span>نبّه على النوم بالحصة</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-2.5">
                <span className="text-xl">📕</span>
                <span>تابع اللي ما جاب كتابه</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-2.5">
                <span className="text-xl">💬</span>
                <span>وضيف المهارات اللي تبيها لمادتك</span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              تقدر تضيف مهارات خاصة بمادتك من صفحة
              <button
                type="button"
                onClick={goToSkills}
                className="mx-1 font-bold text-teal-600 underline"
              >
                خدمات &larr; إدارة المهارات
              </button>
            </p>

            <p className="mt-3 text-center text-sm text-slate-500">
              اضغط على اسم أي طالب وجرّب 👇
            </p>

            {/* CTA */}
            <button
              type="button"
              onClick={dismiss}
              className="mt-5 w-full rounded-2xl bg-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-200 transition active:scale-[0.98]"
            >
              فهمت، هيا نبدأ! ✨
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
