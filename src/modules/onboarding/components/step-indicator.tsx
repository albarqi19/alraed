import { STEP_INFO } from '../constants'
import type { OnboardingStep, OnboardingStepKey } from '../types'

interface StepIndicatorProps {
  steps: OnboardingStep[]
  currentStep: OnboardingStepKey
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="w-full">
      {/* شريط التقدم للشاشات الكبيرة */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep
            const isCompleted = step.is_completed
            // index > currentIndex indicates pending steps

            return (
              <div key={step.key} className="flex flex-1 items-center">
                {/* الدائرة */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isActive
                          ? 'border-teal-500 bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                          : 'border-slate-300 bg-white text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <i className="bi bi-check text-lg" />
                    ) : (
                      <i className={`${STEP_INFO[step.key].icon} text-sm`} />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted ? 'text-emerald-600' : isActive ? 'text-teal-600' : 'text-slate-400'
                    }`}
                  >
                    {STEP_INFO[step.key].shortTitle}
                  </span>
                </div>

                {/* الخط الواصل */}
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* شريط التقدم للشاشات الصغيرة */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4">
          <span className="text-sm font-medium text-slate-600">
            الخطوة {currentIndex + 1} من {steps.length}
          </span>
          <span className="text-sm font-bold text-teal-600">{STEP_INFO[currentStep].shortTitle}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-l from-teal-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
