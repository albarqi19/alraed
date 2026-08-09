import { useEffect, useMemo, useState } from 'react'
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
import { getErrorMessage } from '@/services/api/errors'
import type { OnboardingStep, OnboardingStepKey, StepComponentProps } from '../types'

const STEP_COMPONENTS: Record<OnboardingStepKey, React.ComponentType<StepComponentProps>> = {
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

  /** الخطوة التي ينتظر تخطّيها تأكيداً (إلزامية) */
  const [pendingSkip, setPendingSkip] = useState<OnboardingStep | null>(null)

  // إذا اكتمل الإعداد، انتقل للوحة التحكم
  useEffect(() => {
    if (status?.onboarding_completed) {
      navigate('/admin', { replace: true })
    }
  }, [status?.onboarding_completed, navigate])

  const currentStepKey = useMemo<OnboardingStepKey>(() => {
    if (!status) return 'welcome'
    return status.current_step
  }, [status])

  const currentStepInfo = useMemo(() => {
    if (!status?.steps) return null
    return status.steps.find((s) => s.key === currentStepKey) ?? null
  }, [status?.steps, currentStepKey])

  const StepComponent = STEP_COMPONENTS[currentStepKey] ?? WelcomeStep

  /**
   * الأخطاء تُعرض للمستخدم عبر onError في الـ hook (toast). هنا نبتلع الرفض
   * لمنع unhandled rejection فقط — لا لإخفاء الخطأ.
   */
  const handleCompleteStep = async (metadata?: Record<string, unknown>) => {
    try {
      await completeMutation.mutateAsync({ stepKey: currentStepKey, metadata })
      await refetch()
    } catch {
      /* عُرض الخطأ في onError */
    }
  }

  const runSkip = async (stepKey: OnboardingStepKey, confirm: boolean) => {
    try {
      await skipMutation.mutateAsync({ stepKey, confirm })
      await refetch()
    } catch {
      /* عُرض الخطأ في onError */
    } finally {
      setPendingSkip(null)
    }
  }

  const handleSkipStep = () => {
    // الخطوات الإلزامية تمرّ بحوار تأكيد: تخطّيها يترك المدرسة بإعداد ناقص
    if (currentStepInfo?.is_mandatory) {
      setPendingSkip(currentStepInfo)
      return
    }

    void runSkip(currentStepKey, false)
  }

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
              {getErrorMessage(error, 'تحقّق من الاتصال ثم أعد المحاولة.')}
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

  if (!status) {
    return null
  }

  return (
    <OnboardingLayout steps={status.steps} currentStep={currentStepKey}>
      <StepComponent
        onComplete={handleCompleteStep}
        onSkip={handleSkipStep}
        stats={status.stats}
        stepInfo={currentStepInfo}
        isCompleting={completeMutation.isPending}
        isSkipping={skipMutation.isPending}
      />

      {pendingSkip && (
        <SkipConfirmDialog
          step={pendingSkip}
          isSkipping={skipMutation.isPending}
          onCancel={() => setPendingSkip(null)}
          onConfirm={() => void runSkip(pendingSkip.key, true)}
        />
      )}
    </OnboardingLayout>
  )
}

interface SkipConfirmDialogProps {
  step: OnboardingStep
  isSkipping: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** حوار تأكيد تخطّي خطوة أساسية — يوضّح الأثر بدل أن يمرّ بضغطة عابرة */
function SkipConfirmDialog({ step, isSkipping, onCancel, onConfirm }: SkipConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, #000 45%, transparent)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-confirm-title"
    >
      <div className="ws-panel w-full max-w-md">
        <div className="ws-panel__head">
          <span className="ws-panel__title" id="skip-confirm-title">
            <i className="bi bi-exclamation-triangle" style={{ color: 'var(--ws-amber)' }} />
            تخطّي خطوة أساسية
          </span>
        </div>
        <div className="ws-panel__body space-y-3">
          <p className="m-0 text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
            أنت على وشك تخطّي خطوة «{step.title}».
          </p>
          <p className="m-0 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            النظام سيعمل، لكن الميزات المعتمدة على هذه البيانات تبقى معطّلة حتى تكملها. ستجد
            تذكيراً بها في لوحة التحكم.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="ws-btn" disabled={isSkipping}>
              رجوع
            </button>
            <button type="button" onClick={onConfirm} className="ws-btn ws-btn--danger" disabled={isSkipping}>
              {isSkipping ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  جاري التخطي...
                </>
              ) : (
                'نعم، تخطَّ الآن'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
