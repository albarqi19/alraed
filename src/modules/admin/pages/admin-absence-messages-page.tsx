import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAbsenceMessagesStats, resendAbsenceMessages } from '../api'
import { useToast } from '@/shared/feedback/use-toast'
import { Check, X, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react'

export function AdminAbsenceMessagesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [skipSent, setSkipSent] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const statsQuery = useQuery({
    queryKey: ['admin', 'absence-messages-stats', selectedDate],
    queryFn: () => fetchAbsenceMessagesStats(selectedDate),
    refetchInterval: 30000,
  })

  const resendMutation = useMutation({
    mutationFn: (payload: { date: string; skip_sent: boolean }) => resendAbsenceMessages(payload),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: `تم إرسال ${result.messages_sent} رسالة بنجاح`,
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-messages-stats'] })
      setShowConfirmDialog(false)
    },
    onError: () => {
      toast({
        type: 'error',
        title: 'فشل في إرسال الرسائل',
      })
    },
  })

  const stats = statsQuery.data

  const handleResend = () => {
    resendMutation.mutate({
      date: selectedDate,
      skip_sent: skipSent,
    })
  }

  const studentsWithoutMessages = stats?.students.filter((s) => !s.has_message) ?? []
  const studentsWithMessages = stats?.students.filter((s) => s.has_message) ?? []

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">إدارة رسائل الغياب</h1>
        <p className="text-sm text-muted">راجع وأعد إرسال رسائل واتساب للطلاب الغائبين</p>
      </header>

      {/* الإعدادات والإحصائيات */}
      <div className="glass-card space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* اختيار التاريخ */}
          <div className="space-y-2 text-right">
            <label className="text-sm font-semibold text-slate-700">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* خيار تخطي المرسلة */}
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <input
                type="checkbox"
                checked={skipSent}
                onChange={(e) => setSkipSent(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-sm font-semibold text-slate-700">تخطي الطلاب الذين تم إرسال رسائل لهم</span>
            </label>
          </div>
        </div>

        {/* الإحصائيات */}
        {statsQuery.isLoading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-sm text-muted">جاري تحميل الإحصائيات...</span>
            </div>
          </div>
        ) : statsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span className="text-sm font-semibold text-rose-700">فشل تحميل الإحصائيات</span>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">إجمالي الغياب</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total_absent}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-semibold uppercase text-emerald-600">تم الإرسال</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.messages_sent}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-semibold uppercase text-amber-600">قيد الانتظار</p>
                </div>
                <p className="mt-2 text-3xl font-bold text-amber-700">{stats.messages_pending}</p>
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={resendMutation.isPending || stats.total_absent === 0}
                  className="button-primary flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  إعادة إرسال الرسائل
                </button>
              </div>
            </div>

            {/* جدول التفاصيل */}
            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">تفاصيل الطلاب</h3>
              </div>
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-right text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">اسم الطالب</th>
                      <th className="px-4 py-3 font-semibold">رقم الهاتف</th>
                      <th className="px-4 py-3 font-semibold">حالة الرسالة</th>
                      <th className="px-4 py-3 font-semibold">تاريخ الإرسال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsWithoutMessages.map((student) => (
                      <tr key={`${student.student_id}-${student.class_session_id}`} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">{student.student_name}</td>
                        <td className="px-4 py-3 text-slate-600">{student.student_phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            <X className="h-3 w-3" />
                            لم يتم الإرسال
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">—</td>
                      </tr>
                    ))}
                    {studentsWithMessages.map((student) => (
                      <tr key={`${student.student_id}-${student.class_session_id}`} className="border-t border-slate-100 bg-emerald-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-900">{student.student_name}</td>
                        <td className="px-4 py-3 text-slate-600">{student.student_phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <Check className="h-3 w-3" />
                            تم الإرسال
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {student.message_sent_at
                            ? new Date(student.message_sent_at).toLocaleString('ar-SA', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* مربع التأكيد */}
      {showConfirmDialog && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-right shadow-xl">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تأكيد الإجراء</p>
              <h2 className="text-xl font-semibold text-slate-900">إعادة إرسال رسائل الغياب</h2>
              <p className="text-sm text-muted">
                هل أنت متأكد من إعادة إرسال رسائل الغياب لتاريخ{' '}
                {new Date(selectedDate).toLocaleDateString('ar-SA', { dateStyle: 'long' })}؟
              </p>
            </header>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي الغياب:</span>
                  <span className="font-bold text-slate-900">{stats.total_absent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">تم إرسال رسائل:</span>
                  <span className="font-bold text-emerald-700">{stats.messages_sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">قيد الانتظار:</span>
                  <span className="font-bold text-amber-700">{stats.messages_pending}</span>
                </div>
                {skipSent && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                    <p className="text-xs text-indigo-800">سيتم تخطي الطلاب الذين تم إرسال رسائل لهم مسبقاً</p>
                  </div>
                )}
              </div>
            </div>

            {resendMutation.isPending && (
              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-indigo-900">جاري إرسال الرسائل...</p>
                    <p className="text-xs text-indigo-700">يرجى الانتظار، قد يستغرق هذا بعض الوقت</p>
                  </div>
                </div>
              </div>
            )}

            <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowConfirmDialog(false)}
                disabled={resendMutation.isPending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={handleResend}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? 'جارٍ الإرسال...' : 'تأكيد الإرسال'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
