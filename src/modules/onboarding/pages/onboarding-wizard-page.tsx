import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStatus, useCompleteStep, useSkipStep } from '../hooks'
import { OnboardingLayout } from '../components/onboarding-layout'
import { WelcomeStep } from '../components/steps/welcome-step'
import { StudentsImportStep } from '../components/steps/students-import-step'
import { WhatsappSetupStep } from '../components/steps/whatsapp-setup-step'
import { ScheduleSetupStep } from '../components/steps/schedule-setup-step'
import { TeachersAddStep } from '../components/steps/teachers-add-step'
import { ExtensionDownloadStep } from '../components/steps/extension-download-step'
import { ImportScheduleStep } from '../components/steps/import-schedule-step'
import { CompletionStep } from '../components/steps/completion-step'
import type { OnboardingStepKey } from '../types'

const STEP_COMPONENTS: Record<OnboardingStepKey, React.ComponentType<any>> = {
  welcome: WelcomeStep,
  students: StudentsImportStep,
  whatsapp: WhatsappSetupStep,
  schedule: ScheduleSetupStep,
  teachers: TeachersAddStep,
  extension: ExtensionDownloadStep,
  import_schedule: ImportScheduleStep,
  complete: CompletionStep,
}

export function OnboardingWizardPage() {
  const navigate = useNavigate()
  const { data: status, isLoading, error, refetch } = useOnboardingStatus()
  const completeMutation = useCompleteStep()
  const skipMutation = useSkipStep()

  // إذا اكتمل الإعداد، انتقل للوحة التحكم
  useEffect(() => {
    if (status?.onboarding_completed) {
      navigate('/admin', { replace: true })
    }
  }, [status?.onboarding_completed, navigate])

  // الخطوة الحالية
  const currentStepKey = useMemo(() => {
    if (!status) return 'welcome'
    return status.current_step as OnboardingStepKey
  }, [status])

  // معلومات الخطوة الحالية
  const currentStepInfo = useMemo(() => {
    if (!status?.steps) return null
    return status.steps.find((s) => s.key === currentStepKey)
  }, [status?.steps, currentStepKey])

  // مكون الخطوة الحالية
  const StepComponent = STEP_COMPONENTS[currentStepKey] || WelcomeStep

  // إكمال الخطوة الحالية
  const handleCompleteStep = async (metadata?: Record<string, any>) => {
    try {
      await completeMutation.mutateAsync({
        stepKey: currentStepKey,
        metadata,
      })
      // إعادة جلب الحالة للحصول على الخطوة التالية
      await refetch()
    } catch (error) {
      console.error('Failed to complete step:', error)
    }
  }

  // تخطي الخطوة الحالية (للتجربة)
  const handleSkipStep = async () => {
    try {
      await skipMutation.mutateAsync({
        stepKey: currentStepKey,
      })
      // إعادة جلب الحالة للحصول على الخطوة التالية
      await refetch()
    } catch (error) {
      console.error('Failed to skip step:', error)
    }
  }

  // حالة التحميل
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-lg text-slate-600">جاري تحميل معالج الإعداد...</p>
        </div>
      </div>
    )
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <i className="bi bi-exclamation-triangle text-3xl text-rose-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-800">حدث خطأ</h2>
          <p className="mb-6 text-slate-600">تعذر تحميل معالج الإعداد. يرجى المحاولة مرة أخرى.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl bg-teal-500 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // لا توجد بيانات
  if (!status) {
    return null
  }

  return (
    <OnboardingLayout
      steps={status.steps}
      currentStep={currentStepKey}
      progress={status.progress}
    >
      <StepComponent
        onComplete={handleCompleteStep}
        onSkip={handleSkipStep}
        stats={status.stats}
        isCompleting={completeMutation.isPending}
        isSkipping={skipMutation.isPending}
        stepInfo={currentStepInfo}
      />
    </OnboardingLayout>
  )
}
