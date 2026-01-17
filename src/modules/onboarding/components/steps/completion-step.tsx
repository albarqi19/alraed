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
    <div className="space-y-8 text-center">
      {/* Celebration */}
      <div className="space-y-4">
        <div className="relative mx-auto w-fit">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-gradient-to-r from-teal-200 via-emerald-200 to-cyan-200 opacity-50 blur-lg" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-2xl shadow-teal-500/30">
            <i className="bi bi-check-lg text-5xl" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-slate-800">مبروك! 🎉</h3>
          <p className="text-lg text-slate-600">تم إعداد مدرستك بنجاح</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mx-auto max-w-md space-y-4">
        <h4 className="font-semibold text-slate-700">ملخص الإعداد</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-3xl font-bold text-teal-600">{stats.students_count}</div>
            <div className="text-sm text-slate-500">طالب</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{stats.teachers_count}</div>
            <div className="text-sm text-slate-500">معلم</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-3xl font-bold text-amber-600">{stats.schedules_count}</div>
            <div className="text-sm text-slate-500">جدول زمني</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div
              className={`text-3xl font-bold ${stats.whatsapp_connected ? 'text-green-600' : 'text-slate-400'}`}
            >
              {stats.whatsapp_connected ? (
                <i className="bi bi-check-circle-fill" />
              ) : (
                <i className="bi bi-x-circle" />
              )}
            </div>
            <div className="text-sm text-slate-500">واتساب</div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6 text-right">
        <h4 className="mb-4 font-semibold text-teal-800">ماذا بعد؟</h4>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <i className="bi bi-arrow-left-circle text-teal-500" />
            <span className="text-teal-700">استكشف لوحة التحكم</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="bi bi-arrow-left-circle text-teal-500" />
            <span className="text-teal-700">أضف المزيد من المعلمين والطلاب</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="bi bi-arrow-left-circle text-teal-500" />
            <span className="text-teal-700">استورد الجدول من مدرستي</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="bi bi-arrow-left-circle text-teal-500" />
            <span className="text-teal-700">خصص قوالب الرسائل</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleEnterDashboard}
        disabled={isCompleting}
        className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-l from-teal-500 to-emerald-500 px-10 py-5 text-xl font-bold text-white shadow-2xl shadow-teal-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/40 disabled:opacity-50"
      >
        {isCompleting ? (
          <>
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            جاري الإنهاء...
          </>
        ) : (
          <>
            الدخول إلى لوحة التحكم
            <i className="bi bi-arrow-left text-2xl" />
          </>
        )}
      </button>

      {/* Footer Note */}
      <p className="text-sm text-slate-400">
        يمكنك العودة لهذه الإعدادات في أي وقت من صفحة الإعدادات
      </p>
    </div>
  )
}
