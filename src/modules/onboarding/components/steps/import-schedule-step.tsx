import { useState } from 'react'
import type { StepComponentProps } from '../../types'

const STEPS = [
  {
    title: 'افتح منصة مدرستي',
    description: 'سجل دخولك على منصة مدرستي بحسابك الرسمي',
    icon: 'bi-box-arrow-in-right',
  },
  {
    title: 'اذهب للجدول الدراسي',
    description: 'من القائمة الجانبية، اختر "الجدول الدراسي"',
    icon: 'bi-calendar-week',
  },
  {
    title: 'فعّل إضافة الرائد',
    description: 'اضغط على أيقونة الإضافة في شريط المتصفح',
    icon: 'bi-puzzle',
  },
  {
    title: 'اختر استيراد الجدول',
    description: 'من قائمة الإضافة، اختر "استيراد الجدول الدراسي"',
    icon: 'bi-download',
  },
  {
    title: 'تم الاستيراد!',
    description: 'ستجد الجدول في نظام الرائد جاهزاً للاستخدام',
    icon: 'bi-check-circle',
  },
]

export function ImportScheduleStep({ onComplete, onSkip, isCompleting, isSkipping }: StepComponentProps) {
  const [hasRead, setHasRead] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-primary-dark)]">
          <i className="bi bi-table text-xl" />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--color-text-primary)]">استيراد الجدول الدراسي</h3>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
          طريقة استيراد الجدول من منصة مدرستي باستخدام إضافة الرائد
        </p>
      </div>

      {/* Steps */}
      <div className="relative space-y-2">
        {/* Connecting Line */}
        <div className="absolute right-5 top-6 h-[calc(100%-3rem)] w-px bg-[var(--color-hairline)]" />

        {STEPS.map((step, index) => (
          <div key={step.title} className="relative flex gap-3">
            {/* Step Number */}
            <div className="z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-primary-dark)]">
              <i className={`${step.icon} text-base`} />
            </div>

            {/* Step Content */}
            <div className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-sunken)] text-[11px] font-bold text-[var(--color-text-secondary)]">
                  {index + 1}
                </span>
                <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{step.title}</h4>
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Important Notes */}
      <div className="ws-alert ws-alert--warn ws-alert--boxed">
        <div className="w-full">
          <h4 className="mb-1 text-[13px] font-semibold">
            <i className="bi bi-lightbulb ml-2" />
            ملاحظات مهمة
          </h4>
          <ul className="space-y-1 text-[12px]">
            <li>
              <i className="bi bi-check ml-1" />
              تأكد من أن الجدول محدّث في منصة مدرستي قبل الاستيراد
            </li>
            <li>
              <i className="bi bi-check ml-1" />
              يمكنك إعادة الاستيراد في أي وقت لتحديث الجدول
            </li>
            <li>
              <i className="bi bi-check ml-1" />
              سيتم ربط المعلمين والمواد تلقائياً إن كانوا موجودين
            </li>
          </ul>
        </div>
      </div>

      {/* Video Tutorial Placeholder */}
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-sunken)] text-[var(--color-text-secondary)]">
          <i className="bi bi-play-circle text-2xl" />
        </div>
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">فيديو شرح مفصّل</p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">قريباً...</p>
      </div>

      {/* Confirmation */}
      <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]">
        <input
          type="checkbox"
          checked={hasRead}
          onChange={(e) => setHasRead(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-primary-dark)]"
        />
        <span className="text-[13px] text-[var(--color-text-primary)]">
          قرأت التعليمات وفهمت كيفية استيراد الجدول من منصة مدرستي
        </span>
      </label>

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
        {/* تخطي — الخطوات الإلزامية تمر بتأكيد من المعالج */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-[12px] text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي — سأفعلها لاحقاً'}
        </button>

        <button
          type="button"
          onClick={() => onComplete({ understood: true })}
          disabled={!hasRead || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="ws-spinner" />
              جاري الحفظ...
            </>
          ) : (
            <>
              فهمت، التالي
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!hasRead && (
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          <span>يرجى قراءة التعليمات والموافقة للمتابعة</span>
        </div>
      )}
    </div>
  )
}
