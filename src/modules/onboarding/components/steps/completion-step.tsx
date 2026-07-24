import { useNavigate } from 'react-router-dom'
import type { StepComponentProps } from '../../types'

export function CompletionStep({ onComplete, stats, isCompleting }: Omit<StepComponentProps, 'onSkip' | 'isSkipping'>) {
  const navigate = useNavigate()

  const handleEnterDashboard = () => {
    onComplete()
    // سيتم التوجيه تلقائياً من الـ wizard بعد إكمال الخطوة
    navigate('/admin')
  }

  return (
    <div className="space-y-5 text-center">
      {/* Celebration */}
      <div className="space-y-3">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border"
          style={{
            borderColor: 'var(--color-primary-dark)',
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-primary-dark)',
          }}
        >
          <i className="bi bi-check-lg text-[22px]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            مبروك! 🎉
          </h3>
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            تم إعداد مدرستك بنجاح
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="ws-panel mx-auto max-w-md text-right">
        <div className="ws-panel__head">
          <h4 className="ws-panel__title">ملخص الإعداد</h4>
        </div>
        <div className="ws-panel__body">
          <div className="ws-statgrid">
            <div className="ws-stat">
              <div className="ws-stat__label">طالب</div>
              <div className="ws-stat__value">{stats.students_count}</div>
            </div>
            <div className="ws-stat">
              <div className="ws-stat__label">معلم</div>
              <div className="ws-stat__value">{stats.teachers_count}</div>
            </div>
            <div className="ws-stat">
              <div className="ws-stat__label">جدول زمني</div>
              <div className="ws-stat__value">{stats.schedules_count}</div>
            </div>
            <div className="ws-stat">
              <div className="ws-stat__label">واتساب</div>
              <div className="ws-stat__value">
                {stats.whatsapp_connected ? (
                  <span className="ws-chip ws-chip--green">
                    <i className="bi bi-check-circle-fill" />
                  </span>
                ) : (
                  <span className="ws-chip">
                    <i className="bi bi-x-circle" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="ws-panel mx-auto max-w-md text-right">
        <div className="ws-panel__head">
          <h4 className="ws-panel__title">ماذا بعد؟</h4>
        </div>
        <div className="ws-panel__body">
          <div className="grid gap-2 text-[12.5px] sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <i
                className="bi bi-arrow-left-circle"
                style={{ color: 'var(--color-primary-dark)' }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>استكشف لوحة التحكم</span>
            </div>
            <div className="flex items-start gap-2">
              <i
                className="bi bi-arrow-left-circle"
                style={{ color: 'var(--color-primary-dark)' }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>
                أضف المزيد من المعلمين والطلاب
              </span>
            </div>
            <div className="flex items-start gap-2">
              <i
                className="bi bi-arrow-left-circle"
                style={{ color: 'var(--color-primary-dark)' }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>استورد الجدول من مدرستي</span>
            </div>
            <div className="flex items-start gap-2">
              <i
                className="bi bi-arrow-left-circle"
                style={{ color: 'var(--color-primary-dark)' }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>خصص قوالب الرسائل</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleEnterDashboard}
        disabled={isCompleting}
        className="ws-btn ws-btn--primary ws-btn--lg mx-auto"
      >
        {isCompleting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            جاري الإنهاء...
          </>
        ) : (
          <>
            الدخول إلى لوحة التحكم
            <i className="bi bi-arrow-left text-[15px]" />
          </>
        )}
      </button>

      {/* Footer Note */}
      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
        يمكنك العودة لهذه الإعدادات في أي وقت من صفحة الإعدادات
      </p>
    </div>
  )
}
