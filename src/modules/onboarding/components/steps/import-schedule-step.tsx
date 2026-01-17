import { useState } from 'react'
import type { StepComponentProps } from '../../types'

const STEPS = [
  {
    title: 'افتح منصة مدرستي',
    description: 'سجل دخولك على منصة مدرستي بحسابك الرسمي',
    icon: 'bi-box-arrow-in-right',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'اذهب للجدول الدراسي',
    description: 'من القائمة الجانبية، اختر "الجدول الدراسي"',
    icon: 'bi-calendar-week',
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'فعّل إضافة الرائد',
    description: 'اضغط على أيقونة الإضافة في شريط المتصفح',
    icon: 'bi-puzzle',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'اختر استيراد الجدول',
    description: 'من قائمة الإضافة، اختر "استيراد الجدول الدراسي"',
    icon: 'bi-download',
    color: 'from-amber-500 to-orange-500',
  },
  {
    title: 'تم الاستيراد!',
    description: 'ستجد الجدول في نظام الرائد جاهزاً للاستخدام',
    icon: 'bi-check-circle',
    color: 'from-teal-500 to-cyan-500',
  },
]

export function ImportScheduleStep({ onComplete, onSkip, isCompleting, isSkipping }: StepComponentProps) {
  const [hasRead, setHasRead] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/20">
          <i className="bi bi-table text-2xl" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">استيراد الجدول الدراسي</h3>
        <p className="mt-2 text-slate-500">طريقة استيراد الجدول من منصة مدرستي باستخدام إضافة الرائد</p>
      </div>

      {/* Steps */}
      <div className="relative space-y-4">
        {/* Connecting Line */}
        <div className="absolute right-6 top-8 h-[calc(100%-4rem)] w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />

        {STEPS.map((step, index) => (
          <div key={step.title} className="relative flex gap-4">
            {/* Step Number */}
            <div
              className={`z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
            >
              <i className={`${step.icon} text-lg`} />
            </div>

            {/* Step Content */}
            <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {index + 1}
                </span>
                <h4 className="font-semibold text-slate-700">{step.title}</h4>
              </div>
              <p className="mt-1 text-sm text-slate-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Important Notes */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <h4 className="mb-2 font-semibold text-amber-800">
          <i className="bi bi-lightbulb ml-2" />
          ملاحظات مهمة
        </h4>
        <ul className="space-y-1 text-sm text-amber-700">
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

      {/* Video Tutorial Placeholder */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-400">
          <i className="bi bi-play-circle text-3xl" />
        </div>
        <p className="font-medium text-slate-600">فيديو شرح مفصّل</p>
        <p className="text-sm text-slate-400">قريباً...</p>
      </div>

      {/* Confirmation */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300">
        <input
          type="checkbox"
          checked={hasRead}
          onChange={(e) => setHasRead(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-slate-700">
          قرأت التعليمات وفهمت كيفية استيراد الجدول من منصة مدرستي
        </span>
      </label>

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete({ understood: true })}
          disabled={!hasRead || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يرجى قراءة التعليمات والموافقة للمتابعة
        </p>
      )}
    </div>
  )
}
