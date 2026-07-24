import { STEP_INFO } from '../../constants'
import type { StepComponentProps } from '../../types'

export function WelcomeStep({ onComplete, isCompleting }: Omit<StepComponentProps, 'onSkip' | 'isSkipping'>) {
  const stepsPreview = [
    { key: 'students', icon: 'bi-people' },
    { key: 'whatsapp', icon: 'bi-whatsapp' },
    { key: 'schedule', icon: 'bi-clock' },
    { key: 'teachers', icon: 'bi-person-badge' },
    { key: 'extension', icon: 'bi-puzzle' },
    { key: 'import_schedule', icon: 'bi-table' },
  ] as const

  const benefits = [
    'إدارة متكاملة للحضور والغياب',
    'إشعارات فورية لأولياء الأمور',
    'تقارير وإحصائيات شاملة',
    'تكامل مع نظام نور ومدرستي',
  ] as const

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      <div className="space-y-1.5 text-center">
        <div className="text-3xl leading-none">👋</div>
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          مرحباً بك في نظام الرائد!
        </h3>
        <p className="mx-auto max-w-lg text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          نحن سعداء بانضمامك إلينا. لنبدأ معاً رحلة إعداد مدرستك في بضع خطوات بسيطة.
        </p>
      </div>

      {/* Steps Preview */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <span className="ws-panel__title">الخطوات القادمة</span>
          <span className="ws-count">{stepsPreview.length}</span>
        </div>
        <div className="ws-panel__body">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stepsPreview.map((step, index) => (
              <div
                key={step.key}
                className="flex items-center gap-2.5 rounded-lg p-2.5"
                style={{
                  border: '1px solid var(--color-hairline)',
                  background: 'var(--color-surface-2)',
                }}
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[14px]"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  <i className={step.icon} />
                </span>
                <div className="text-right leading-tight">
                  <span className="block text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    الخطوة {index + 1}
                  </span>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {STEP_INFO[step.key].shortTitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <span className="ws-panel__title">ماذا ستحصل عليه؟</span>
        </div>
        <div className="ws-panel__body">
          <div className="grid gap-2 text-[13px] sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <i className="bi bi-check-circle-fill text-[13px]" style={{ color: 'var(--color-primary-dark)' }} />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center pt-0.5">
        <button type="button" onClick={() => onComplete()} disabled={isCompleting} className="ws-btn ws-btn--primary">
          {isCompleting ? (
            <>
              <span className="ws-spinner" />
              جاري البدء...
            </>
          ) : (
            <>
              لنبدأ الإعداد
              <i className="bi bi-arrow-left" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
