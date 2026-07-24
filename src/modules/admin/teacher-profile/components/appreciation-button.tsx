import { useState, type CSSProperties } from 'react'
import { Heart, Send, Info } from 'lucide-react'
import { WsAlert, WsBtn, WsModal, WsTextarea } from '@/shared/workspace'
import { useAppreciationTemplates, useSendAppreciation } from '../hooks'
import { useToast } from '@/shared/feedback/use-toast'

interface AppreciationButtonProps {
  teacherId: number | null
  teacherPhone: string | null
}

/** زر «أرسل شكراً» وموداله — بنَفَس ws بعد أن كان بطاقة بيضاء طائرة */
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

  const choiceStyle = (active: boolean): CSSProperties => ({
    width: '100%',
    textAlign: 'right',
    fontFamily: 'inherit',
    fontSize: 12,
    lineHeight: 1.7,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${active ? 'var(--ws-accent)' : 'var(--ws-hairline)'}`,
    background: active ? 'var(--ws-accent-soft)' : 'var(--ws-surface)',
    color: 'var(--ws-text)',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease',
  })

  return (
    <>
      <WsBtn size="sm" icon={Heart} onClick={handleOpen}>
        أرسل شكراً
      </WsBtn>

      <WsModal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Heart style={{ width: 15, height: 15, color: 'var(--ws-accent)' }} />
            أرسل شكراً الآن
          </span>
        }
        sub={
          templates?.teacher_name ? `${templates.teacher_name} · ${teacherPhone}` : teacherPhone
        }
        footer={
          <>
            <WsBtn
              variant="primary"
              icon={Send}
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? 'جاري الإرسال...' : 'أرسل الآن'}
            </WsBtn>
            <WsBtn onClick={() => setOpen(false)}>إلغاء</WsBtn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* تلميح آخر شكر */}
          {daysSinceLast !== null && daysSinceLast <= 3 && (
            <WsAlert tone="info" boxed icon={Info}>
              لقد شكرت هذا المعلم قبل{' '}
              {daysSinceLast === 0 ? 'اليوم' : `${daysSinceLast} ${daysSinceLast === 1 ? 'يوم' : 'أيام'}`}، استمر في
              دعمه!
            </WsAlert>
          )}

          {/* القوالب المقترحة */}
          {loadingTemplates ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="ws-skeleton" style={{ height: 40, borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ws-text-2)' }}>
                اختر قالباً أو اكتب رسالتك:
              </p>
              {templates?.templates.map((tpl, i) => (
                <button key={i} type="button" onClick={() => setMessage(tpl)} style={choiceStyle(message === tpl)}>
                  {tpl}
                </button>
              ))}
            </div>
          )}

          {/* حقل الرسالة */}
          <WsTextarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            rows={3}
            maxLength={500}
            style={{ resize: 'none' }}
          />
        </div>
      </WsModal>
    </>
  )
}
