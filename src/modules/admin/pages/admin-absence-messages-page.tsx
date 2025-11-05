import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAbsenceMessagesStats, resendAbsenceMessages } from '../api'
import { useToast } from '@/shared/feedback/use-toast'
import { Check, X, Clock, Send, AlertCircle, Loader2 } from 'lucide-react'

interface SendingProgress {
  totalMessages: number
  sentMessages: number
  failedMessages: number
  skippedMessages: number
  isOnBreak: boolean
  breakTimeRemaining: number
  currentOffset: number
  isCompleted: boolean
}

export function AdminAbsenceMessagesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [skipSent, setSkipSent] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [progress, setProgress] = useState<SendingProgress>({
    totalMessages: 0,
    sentMessages: 0,
    failedMessages: 0,
    skippedMessages: 0,
    isOnBreak: false,
    breakTimeRemaining: 0,
    currentOffset: 0,
    isCompleted: false,
  })
  
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null)

  // تنظيف المؤقت عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
      }
    }
  }, [])

  const statsQuery = useQuery({
    queryKey: ['admin', 'absence-messages-stats', selectedDate],
    queryFn: () => fetchAbsenceMessagesStats(selectedDate),
    refetchInterval: isSending ? false : 30000, // إيقاف التحديث أثناء الإرسال
  })

  const resendMutation = useMutation({
    mutationFn: (payload: { date: string; skip_sent: boolean; offset?: number }) => resendAbsenceMessages(payload),
  })

  // دالة الإرسال بالدفعات مع استراحة
  const sendInBatches = async (offset = 0) => {
    try {
      const result = await resendMutation.mutateAsync({
        date: selectedDate,
        skip_sent: skipSent,
        offset,
      })

      // تحديث التقدم
      setProgress((prev) => ({
        ...prev,
        totalMessages: result.total_absent,
        sentMessages: prev.sentMessages + result.messages_sent,
        failedMessages: prev.failedMessages + result.messages_failed,
        skippedMessages: prev.skippedMessages + result.messages_skipped,
        currentOffset: result.next_offset,
        isCompleted: !result.has_more,
      }))

      // إذا كانت هناك رسائل متبقية
      if (result.has_more) {
        // إذا كانت هناك حاجة لاستراحة (بعد 20 رسالة)
        if (result.needs_break) {
          // استراحة عشوائية بين 2-3 دقائق (120-180 ثانية)
          const breakDuration = Math.floor(Math.random() * 61) + 120 // 120-180 ثانية
          
          setProgress((prev) => ({
            ...prev,
            isOnBreak: true,
            breakTimeRemaining: breakDuration,
          }))

          // عد تنازلي للاستراحة
          let remainingTime = breakDuration
          breakTimerRef.current = setInterval(() => {
            remainingTime -= 1
            setProgress((prev) => ({
              ...prev,
              breakTimeRemaining: remainingTime,
            }))

            if (remainingTime <= 0) {
              if (breakTimerRef.current) {
                clearInterval(breakTimerRef.current)
              }
              setProgress((prev) => ({
                ...prev,
                isOnBreak: false,
                breakTimeRemaining: 0,
              }))
              // متابعة الإرسال بعد الاستراحة
              sendInBatches(result.next_offset)
            }
          }, 1000)
        } else {
          // متابعة فوراً إذا لم نصل لـ 20 رسالة بعد
          sendInBatches(result.next_offset)
        }
      } else {
        // اكتمل الإرسال - تنظيف Timer
        if (breakTimerRef.current) {
          clearInterval(breakTimerRef.current)
          breakTimerRef.current = null
        }
        
        setIsSending(false)
        setShowConfirmDialog(false)
        queryClient.invalidateQueries({ queryKey: ['admin', 'absence-messages-stats'] })
        
        toast({
          type: 'success',
          title: `✅ اكتمل الإرسال!`,
          description: `تم إرسال ${progress.sentMessages + result.messages_sent} رسالة بنجاح`,
        })
      }
    } catch {
      // تنظيف Timer في حالة الخطأ
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
        breakTimerRef.current = null
      }
      
      setIsSending(false)
      setProgress((prev) => ({ ...prev, isOnBreak: false, breakTimeRemaining: 0 }))
      
      toast({
        type: 'error',
        title: 'فشل في إرسال الرسائل',
        description: 'حدث خطأ أثناء عملية الإرسال',
      })
    }
  }

  const handleResend = () => {
    // إعادة تعيين التقدم
    setProgress({
      totalMessages: 0,
      sentMessages: 0,
      failedMessages: 0,
      skippedMessages: 0,
      isOnBreak: false,
      breakTimeRemaining: 0,
      currentOffset: 0,
      isCompleted: false,
    })
    
    setIsSending(true)
    setShowConfirmDialog(false)
    sendInBatches(0)
  }

  const handleCancel = () => {
    // إيقاف العملية
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current)
      breakTimerRef.current = null
    }
    
    setIsSending(false)
    setProgress({
      totalMessages: 0,
      sentMessages: 0,
      failedMessages: 0,
      skippedMessages: 0,
      isOnBreak: false,
      breakTimeRemaining: 0,
      currentOffset: 0,
      isCompleted: false,
    })
    
    toast({
      type: 'info',
      title: 'تم إيقاف الإرسال',
      description: 'تم إلغاء عملية الإرسال',
    })
  }

  const stats = statsQuery.data
  const studentsWithoutMessages = stats?.students.filter((s) => !s.has_message) ?? []
  const studentsWithMessages = stats?.students.filter((s) => s.has_message) ?? []

  return (
    <div className="space-y-6">
      {/* شريط التحذير والتقدم - يظهر أثناء الإرسال */}
      {isSending && (
        <div className="fixed left-0 right-0 top-0 z-50 shadow-lg">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <div className="container mx-auto">
              <div className="flex items-start gap-4">
                <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-white" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">⚠️ لا تغلق هذه النافذة - جاري الإرسال الآمن</p>
                      <p className="mt-1 text-sm text-amber-50">
                        للحفاظ على أمان حسابك من الحظر، دع هذه الصفحة تقوم بعملها في الإرسال التلقائي دون إغلاقها
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-2xl font-bold text-white">
                          {progress.sentMessages} / {progress.totalMessages}
                        </p>
                        <p className="text-xs text-amber-50">رسالة مرسلة</p>
                      </div>
                      <button
                        onClick={handleCancel}
                        className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
                      >
                        إيقاف
                      </button>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="space-y-2">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-500"
                        style={{
                          width: `${progress.totalMessages > 0 ? (progress.sentMessages / progress.totalMessages) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-white">
                      <span>
                        متبقي: {progress.totalMessages - progress.sentMessages} رسالة
                        {progress.failedMessages > 0 && ` • فشل: ${progress.failedMessages}`}
                        {progress.skippedMessages > 0 && ` • تم تخطي: ${progress.skippedMessages}`}
                      </span>
                      <span>
                        {progress.totalMessages > 0
                          ? Math.round((progress.sentMessages / progress.totalMessages) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>

                  {/* رسالة الاستراحة */}
                  {progress.isOnBreak && (
                    <div className="rounded-xl border-2 border-white/40 bg-white/20 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 animate-pulse text-white" />
                        <div className="flex-1">
                          <p className="font-semibold text-white">استراحة أمان - سيتم الاستئناف تلقائياً</p>
                          <p className="mt-1 text-sm text-amber-50">
                            متبقي: {Math.floor(progress.breakTimeRemaining / 60)} دقيقة و {progress.breakTimeRemaining % 60}{' '}
                            ثانية
                          </p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                      <p className="mt-2 text-xs text-amber-50">
                        💡 هذه الاستراحة ضرورية لحماية حسابك من الحظر من WhatsApp. يتم إرسال 20 رسالة ثم استراحة 2-3 دقائق
                      </p>
                    </div>
                  )}

                  {/* معلومات الإرسال الآمن */}
                  {!progress.isOnBreak && (
                    <div className="rounded-xl bg-white/10 p-2 text-xs text-white">
                      <p>🔒 الإرسال الآمن نشط: تأخير 10-15 ثانية بين كل رسالة • استراحة 2-3 دقائق كل 20 رسالة</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* العنوان */}
      <header className="space-y-2" style={{ marginTop: isSending ? '220px' : '0' }}>
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
                  disabled={isSending || stats.total_absent === 0}
                  className="button-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إعادة إرسال الرسائل
                    </>
                  )}
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

            {/* معلومات الإرسال الآمن */}
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-amber-900">⚠️ تنبيه: لا تغلق النافذة أثناء الإرسال</p>
                  <ul className="mr-4 list-disc space-y-1 text-amber-800">
                    <li>سيتم إرسال 20 رسالة في كل دفعة</li>
                    <li>تأخير عشوائي 10-15 ثانية بين كل رسالة</li>
                    <li>استراحة 2-3 دقائق بعد كل 20 رسالة</li>
                    <li>سيتم الاستئناف تلقائياً بعد الاستراحة</li>
                  </ul>
                  <p className="font-semibold text-amber-900">💡 هذا النظام يحمي حسابك من الحظر</p>
                </div>
              </div>
            </div>

            <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="button-primary flex items-center gap-2"
                onClick={handleResend}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    تأكيد الإرسال
                  </>
                )}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
