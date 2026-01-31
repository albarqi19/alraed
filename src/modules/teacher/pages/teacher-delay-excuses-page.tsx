import { useState } from 'react'
import {
  useMyExcusesQuery,
  useExcusableDelaysQuery,
  useExcuseSettingsQuery,
  useSubmitExcuseMutation,
} from '../delay-excuses/hooks'
import type { DelayExcuse, ExcusableDelay, ExcuseStatus } from '../delay-excuses/types'

const STATUS_STYLES: Record<ExcuseStatus, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'bi-clock' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', icon: 'bi-check2-circle' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: 'bi-x-circle' },
}

function StatusBadge({ status, label }: { status: ExcuseStatus; label: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      <i className={`${style.icon}`} />
      {label}
    </span>
  )
}

function ExcuseCard({ excuse }: { excuse: DelayExcuse }) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{excuse.delay_date_formatted}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            تأخير: {excuse.delay_minutes} دقيقة
            {excuse.attendance?.check_in_time && ` • الدخول: ${excuse.attendance.check_in_time}`}
          </p>
        </div>
        <StatusBadge status={excuse.status} label={excuse.status_label} />
      </div>

      <p className="text-sm text-slate-600 line-clamp-2">{excuse.excuse_text}</p>

      {excuse.review_notes && (
        <div className={`p-2 rounded-lg text-sm ${
          excuse.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <span className="font-medium">ملاحظات المراجع:</span> {excuse.review_notes}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
        <span>تقديم: {excuse.submitted_at ? new Date(excuse.submitted_at).toLocaleDateString('ar-SA') : '-'}</span>
        {excuse.reviewed_at && (
          <span>مراجعة: {new Date(excuse.reviewed_at).toLocaleDateString('ar-SA')}</span>
        )}
      </div>
    </div>
  )
}

function ExcusableDelayCard({
  delay,
  onSubmit,
  isSubmitting,
}: {
  delay: ExcusableDelay
  onSubmit: (attendanceId: number, text: string) => void
  isSubmitting: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [excuseText, setExcuseText] = useState('')

  const handleSubmit = () => {
    if (excuseText.trim().length < 10) {
      alert('يرجى كتابة عذر لا يقل عن 10 أحرف')
      return
    }
    onSubmit(delay.id, excuseText.trim())
    setShowForm(false)
    setExcuseText('')
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900">{delay.attendance_date_formatted}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            تأخير: {delay.delay_minutes} دقيقة
            {delay.check_in_time && ` • الدخول: ${delay.check_in_time}`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
          <i className="bi-clock-history" />
          بانتظار العذر
        </span>
      </div>

      {!delay.can_submit && delay.submit_reason && (
        <div className="p-2 rounded-lg bg-slate-50 text-sm text-slate-600">
          <i className="bi-info-circle ml-1" />
          {delay.submit_reason}
        </div>
      )}

      {delay.can_submit && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 text-sm font-medium text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <i className="bi-pencil-square ml-1" />
          تقديم عذر
        </button>
      )}

      {showForm && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <textarea
            value={excuseText}
            onChange={(e) => setExcuseText(e.target.value)}
            placeholder="اكتب سبب التأخير..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none resize-none"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || excuseText.trim().length < 10}
              className="flex-1 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <i className="bi-hourglass-split ml-1 animate-spin" />
                  جارٍ الإرسال...
                </>
              ) : (
                <>
                  <i className="bi-send ml-1" />
                  إرسال
                </>
              )}
            </button>
            <button
              onClick={() => { setShowForm(false); setExcuseText(''); }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TeacherDelayExcusesPage() {
  const { data: settings, isLoading: loadingSettings } = useExcuseSettingsQuery()
  const { data: excusableDelays, isLoading: loadingDelays } = useExcusableDelaysQuery()
  const { data: myExcuses, isLoading: loadingExcuses } = useMyExcusesQuery()
  const submitMutation = useSubmitExcuseMutation()

  const handleSubmitExcuse = async (attendanceId: number, excuseText: string) => {
    try {
      await submitMutation.mutateAsync({ attendance_id: attendanceId, excuse_text: excuseText })
      alert('تم تقديم العذر بنجاح')
    } catch (err) {
      console.error('Error submitting excuse:', err)
      alert('حدث خطأ أثناء تقديم العذر')
    }
  }

  const isLoading = loadingSettings || loadingDelays || loadingExcuses

  // إذا كانت الميزة معطلة
  if (!loadingSettings && settings && !settings.enabled) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">أعذار التأخير</h1>
          <p className="text-sm text-slate-500">تقديم أعذار عن التأخير</p>
        </div>
        <div className="glass-card p-12 text-center">
          <i className="bi bi-slash-circle text-5xl text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">الميزة غير متاحة</p>
          <p className="mt-1 text-sm text-slate-400">
            ميزة تقديم أعذار التأخير غير مفعلة حالياً
          </p>
        </div>
      </section>
    )
  }

  // إحصائيات
  const pendingCount = myExcuses?.filter(e => e.status === 'pending').length || 0
  const approvedCount = myExcuses?.filter(e => e.status === 'approved').length || 0
  const rejectedCount = myExcuses?.filter(e => e.status === 'rejected').length || 0

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">أعذار التأخير</h1>
        <p className="text-sm text-slate-500">تقديم أعذار عن التأخير</p>
      </div>

      {/* Status Banner */}
      {settings && !settings.can_submit_now && settings.can_submit_reason && (
        <div className="glass-card p-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-800">
            <i className="bi bi-exclamation-triangle" />
            <span className="text-sm">{settings.can_submit_reason}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-slate-500">قيد المراجعة</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-slate-500">مقبول</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          <p className="text-xs text-slate-500">مرفوض</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          {/* Excusable Delays Section */}
          {excusableDelays && excusableDelays.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <i className="bi bi-clock-history text-orange-500" />
                تأخيرات تحتاج عذر
                <span className="text-xs font-normal text-slate-500">
                  ({excusableDelays.length})
                </span>
              </h2>
              <div className="space-y-3">
                {excusableDelays.map((delay) => (
                  <ExcusableDelayCard
                    key={delay.id}
                    delay={delay}
                    onSubmit={handleSubmitExcuse}
                    isSubmitting={submitMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My Excuses Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <i className="bi bi-list-check text-teal-500" />
              أعذاري المقدمة
              <span className="text-xs font-normal text-slate-500">
                ({myExcuses?.length || 0})
              </span>
            </h2>

            {myExcuses && myExcuses.length > 0 ? (
              <div className="space-y-3">
                {myExcuses.map((excuse) => (
                  <ExcuseCard key={excuse.id} excuse={excuse} />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <i className="bi bi-inbox text-4xl text-slate-300" />
                <p className="mt-3 text-slate-600">لم تقدم أي أعذار بعد</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
