import { motion, AnimatePresence } from 'framer-motion'
import { X, Sun } from 'lucide-react'
import { MOOD_OPTIONS, type MoodType } from '../types'

interface MoodTrackerSheetProps {
  isOpen: boolean
  onSelect: (mood: MoodType) => void
  onSkip: () => void
}

// Spring animation config for elastic feel
const springConfig = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
}

export function MoodTrackerSheet({ isOpen, onSelect, onSkip }: MoodTrackerSheetProps) {
  const handleSelect = (mood: MoodType) => {
    // إرسال الطلب في الخلفية وإغلاق المكون فوراً
    onSelect(mood)
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onSkip}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[55vh] rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Skip button */}
            <div className="absolute left-4 top-4">
              <button
                type="button"
                onClick={onSkip}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                <span>تخطي</span>
              </button>
            </div>

            {/* Header with animated sun */}
            <div className="px-6 pb-4 pt-6 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springConfig, delay: 0.1 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Sun className="h-8 w-8 text-white" />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-bold text-slate-900"
              >
                صباح النور!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-1 text-sm text-slate-500"
              >
                تذكر أن ابتسامتك في وجه طلابك هي أقصر طريق لقلوبهم
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 text-base font-medium text-slate-700"
              >
                كيف حالك هذا الصباح؟
              </motion.p>
            </div>

            {/* Mood options */}
            <div className="px-4 pb-8">
              <div className="flex items-center justify-center gap-3">
                {MOOD_OPTIONS.map((mood, index) => (
                  <motion.button
                    key={mood.key}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...springConfig, delay: 0.3 + index * 0.05 }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(mood.key)}
                    className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-transparent bg-slate-50 p-3 transition-colors hover:border-slate-200 hover:bg-white"
                  >
                    <motion.span
                      className="text-4xl"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      {mood.emoji}
                    </motion.span>
                    <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-700">
                      {mood.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Safe area for bottom */}
            <div className="h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
