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
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="ws-empty">
          <div className="ws-spinner" />
          <p className="m-0">جارٍ تحميل معالج الإعداد…</p>
        </div>
      </div>
    )
  }

  // حالة الخطأ
  if (error) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center px-4"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="ws-panel w-full max-w-sm">
          <div className="ws-panel__body text-center">
            <i className="bi bi-exclamation-triangle mb-2 block text-2xl" style={{ color: 'var(--ws-red)' }} />
            <h2 className="m-0 text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
              تعذّر تحميل معالج الإعداد
            </h2>
            <p className="mb-4 mt-1 text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
              تحقّق من الاتصال ثم أعد المحاولة.
            </p>
            <button type="button" onClick={() => refetch()} className="ws-btn ws-btn--primary mx-auto">
              <i className="bi bi-arrow-clockwise" />
              إعادة المحاولة
            </button>
          </div>
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
