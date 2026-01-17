import type { ReactNode } from 'react'
import { STEP_INFO } from '../constants'
import type { OnboardingStep, OnboardingStepKey } from '../types'
import { StepIndicator } from './step-indicator'

interface OnboardingLayoutProps {
  steps: OnboardingStep[]
  currentStep: OnboardingStepKey
  children: ReactNode
}

export function OnboardingLayout({ steps, currentStep, children }: OnboardingLayoutProps) {
  const stepInfo = STEP_INFO[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20">
                <span className="text-lg font-bold">R</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">الرائد</h1>
                <p className="text-xs text-slate-500">إعداد المدرسة</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b border-slate-100 bg-white/50 py-6">
        <div className="container mx-auto px-4">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Step Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-xl shadow-teal-500/20">
              <i className={`${stepInfo.icon} text-2xl`} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{stepInfo.title}</h2>
            <p className="mt-2 text-slate-500">{stepInfo.description}</p>
          </div>

          {/* Step Content */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100/50 sm:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white/50 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-slate-400">نظام الرائد لإدارة الحضور والغياب</p>
        </div>
      </footer>
    </div>
  )
}
