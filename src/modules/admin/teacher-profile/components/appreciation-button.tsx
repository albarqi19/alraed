import { useState } from 'react'
import { Heart, Send, Loader2, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppreciationTemplates, useSendAppreciation } from '../hooks'
import { useToast } from '@/shared/feedback/use-toast'

interface AppreciationButtonProps {
  teacherId: number | null
  teacherPhone: string | null
}

export function AppreciationButton({ teacherId, teacherPhone }: AppreciationButtonProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const toast = useToast()

  const { data: templates, isLoading: loadingTemplates } = useAppreciationTemplates(
    teacherId,
    { enabled: open && Boolean(teacherId) },
  )

  const sendMutation = useSendAppreciation()

  const handleOpen = () => {
    setMessage('')
    setOpen(true)
  }

  const handleSend = async () => {
    if (!teacherId || !message.trim()) return
    try {
      await sendMutation.mutateAsync({ teacherId, message: message.trim() })
      toast({ title: 'تم الإرسال', description: 'تم إرسال رسالة الشكر بنجاح', type: 'success' })
      setOpen(false)
      setMessage('')
    } catch {
      toast({ title: 'خطأ', description: 'فشل إرسال الرسالة. حاول مرة أخرى.', type: 'error' })
    }
  }

  // حساب عدد الأيام منذ آخر شكر
  const lastSentAt = templates?.last_appreciation?.sent_at
  const daysSinceLast = lastSentAt
    ? Math.floor((Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  if (!teacherPhone) return null

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
      >
        <Heart className="ml-1.5 h-3.5 w-3.5" />
        أرسل شكراً
      </Button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" dir="rtl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">أرسل شكراً الآن</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* معلومات المستلم */}
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-semibold">{templates?.teacher_name}</span>
              <span className="mr-2 text-slate-400">{teacherPhone}</span>
            </div>

            {/* تلميح آخر شكر */}
            {daysSinceLast !== null && daysSinceLast <= 3 && (
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  لقد شكرت هذا المعلم قبل {daysSinceLast === 0 ? 'اليوم' : `${daysSinceLast} ${daysSinceLast === 1 ? 'يوم' : 'أيام'}`}، استمر في دعمه!
                </span>
              </div>
            )}

            {/* القوالب المقترحة */}
            {loadingTemplates ? (
              <div className="mb-3 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <div className="mb-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500">اختر قالباً أو اكتب رسالتك:</p>
                {templates?.templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(tpl)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-right text-xs leading-relaxed transition ${
                      message === tpl
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            )}

            {/* حقل الرسالة */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="mb-4 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
              rows={3}
              maxLength={500}
            />

            {/* أزرار */}
            <div className="flex gap-2">
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="ml-1.5 h-3.5 w-3.5" />
                )}
                أرسل الآن
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
