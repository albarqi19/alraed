import { STEP_INFO } from '../../constants'
import type { StepComponentProps } from '../../types'

export function WelcomeStep({ onComplete, isCompleting }: Omit<StepComponentProps, 'onSkip' | 'isSkipping'>) {
  const stepsPreview = [
    { key: 'students', icon: 'bi-people', color: 'from-blue-500 to-indigo-500' },
    { key: 'whatsapp', icon: 'bi-whatsapp', color: 'from-green-500 to-emerald-500' },
    { key: 'schedule', icon: 'bi-clock', color: 'from-amber-500 to-orange-500' },
    { key: 'teachers', icon: 'bi-person-badge', color: 'from-purple-500 to-pink-500' },
    { key: 'extension', icon: 'bi-puzzle', color: 'from-cyan-500 to-blue-500' },
    { key: 'import_schedule', icon: 'bi-table', color: 'from-rose-500 to-red-500' },
  ] as const

  return (
    <div className="space-y-8 text-center">
      {/* Welcome Message */}
      <div className="space-y-4">
        <div className="text-6xl">👋</div>
        <h3 className="text-2xl font-bold text-slate-800">مرحباً بك في نظام الرائد!</h3>
        <p className="mx-auto max-w-lg text-slate-600">
          نحن سعداء بانضمامك إلينا. لنبدأ معاً رحلة إعداد مدرستك في بضع خطوات بسيطة.
        </p>
      </div>

      {/* Steps Preview */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">الخطوات القادمة</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stepsPreview.map((step, index) => (
            <div
              key={step.key}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-white"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
              >
                <i className={step.icon} />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">الخطوة {index + 1}</span>
                <p className="font-semibold text-slate-700">{STEP_INFO[step.key].shortTitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6">
        <h4 className="mb-4 font-semibold text-teal-800">ماذا ستحصل عليه؟</h4>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-teal-700">
            <i className="bi bi-check-circle-fill text-teal-500" />
            <span>إدارة متكاملة للحضور والغياب</span>
          </div>
          <div className="flex items-center gap-2 text-teal-700">
            <i className="bi bi-check-circle-fill text-teal-500" />
            <span>إشعارات فورية لأولياء الأمور</span>
          </div>
          <div className="flex items-center gap-2 text-teal-700">
            <i className="bi bi-check-circle-fill text-teal-500" />
            <span>تقارير وإحصائيات شاملة</span>
          </div>
          <div className="flex items-center gap-2 text-teal-700">
            <i className="bi bi-check-circle-fill text-teal-500" />
            <span>تكامل مع نظام نور ومدرستي</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={() => onComplete()}
        disabled={isCompleting}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-teal-500 to-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-teal-500/30 transition-all hover:shadow-2xl hover:shadow-teal-500/40 disabled:opacity-50"
      >
        {isCompleting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
  )
}
