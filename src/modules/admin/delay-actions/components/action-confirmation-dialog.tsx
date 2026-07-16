/**
 * نافذة تأكيد تسجيل إجراء (تنبيه أو حسم)
 */

import { useState } from 'react'
import { MessageCircle, Printer } from 'lucide-react'
import type { DelayActionType } from '../types'
import { WsAlert, WsBtn, WsFactRow, WsFactsList, WsField, WsModal, WsSwitch, WsTextarea } from '@/shared/workspace'

interface ActionConfirmationDialogProps {
  action: { type: DelayActionType; userId: number; teacherName: string } | null
  isSubmitting: boolean
  onConfirm: (payload: { userId: number; notes?: string; sendNotification: boolean }) => void
  onCancel: () => void
}

export function ActionConfirmationDialog({
  action,
  isSubmitting,
  onConfirm,
  onCancel,
}: ActionConfirmationDialogProps) {
  const [notes, setNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)

  if (!action) return null

  const isWarning = action.type === 'warning'
  const title = isWarning ? 'تأكيد تسجيل تنبيه' : 'تأكيد تسجيل قرار حسم'
  const description = isWarning
    ? 'سيتم تسجيل تنبيه رسمي للمعلم بسبب التأخر عن الدوام الرسمي.'
    : 'سيتم تسجيل قرار حسم يوم واحد من الراتب بسبب التأخر عن الدوام الرسمي.'

  const handleSubmit = () => {
    onConfirm({
      userId: action.userId,
      notes: notes.trim() || undefined,
      sendNotification,
    })
  }

  const handleClose = () => {
    if (isSubmitting) return
    setNotes('')
    setSendNotification(true)
    onCancel()
  }

  return (
    <WsModal
      open
      onClose={handleClose}
      title={title}
      sub={description}
      footer={
        <>
          <WsBtn onClick={handleClose} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn
            variant={isWarning ? 'primary' : 'danger'}
            icon={Printer}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري التسجيل...' : 'تأكيد وطباعة'}
          </WsBtn>
        </>
      }
    >
      <WsFactsList
        style={{
          border: '1px solid var(--ws-hairline)',
          borderRadius: 8,
          padding: '8px 10px',
          background: 'var(--ws-surface-2)',
        }}
      >
        <WsFactRow label="المعلم">{action.teacherName}</WsFactRow>
        <WsFactRow label="نوع الإجراء">{isWarning ? 'تنبيه' : 'قرار حسم'}</WsFactRow>
      </WsFactsList>

      <WsField label="ملاحظات (اختياري)" htmlFor="action-notes">
        <WsTextarea
          id="action-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أضف ملاحظات إن وجدت..."
          rows={3}
          disabled={isSubmitting}
        />
      </WsField>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '7px 10px',
          border: '1px solid var(--ws-hairline)',
          borderRadius: 8,
          background: 'var(--ws-surface-2)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
          <MessageCircle style={{ width: 13, height: 13, color: 'var(--ws-green)' }} />
          إرسال إشعار واتساب للمعلم
        </span>
        <WsSwitch checked={sendNotification} onChange={setSendNotification} disabled={isSubmitting} />
      </div>

      {!isWarning && (
        <WsAlert tone="warn" boxed>
          قرار الحسم إجراء رسمي لا يمكن التراجع عنه بعد التسجيل — تأكد من البيانات قبل المتابعة.
        </WsAlert>
      )}
    </WsModal>
  )
}
