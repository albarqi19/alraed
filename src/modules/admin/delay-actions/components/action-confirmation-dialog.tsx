/**
 * نافذة تأكيد تسجيل إجراء (تنبيه أو حسم)
 */

import { useState } from 'react'
import { AlertTriangle, FileWarning, MessageCircle, Printer } from 'lucide-react'
import type { DelayActionType } from '../types'

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ${
          isWarning ? 'border-t-4 border-amber-500' : 'border-t-4 border-rose-500'
        }`}
      >
        {/* Header */}
        <div className="mb-4 flex items-start gap-4 text-right">
          <div
            className={`rounded-full p-3 ${
              isWarning ? 'bg-amber-100' : 'bg-rose-100'
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <FileWarning className="h-6 w-6 text-rose-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {/* Teacher Name */}
        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-right">
          <p className="text-xs text-slate-500">المعلم</p>
          <p className="text-lg font-semibold text-slate-900">{action.teacherName}</p>
        </div>

        {/* Notes */}
        <div className="mb-4 space-y-2 text-right">
          <label htmlFor="action-notes" className="text-sm font-medium text-slate-700">
            ملاحظات (اختياري)
          </label>
          <textarea
            id="action-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أضف ملاحظات إن وجدت..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-right shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={isSubmitting}
          />
        </div>

        {/* Send Notification Toggle */}
        <label className="mb-6 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex-1 text-right">
            <p className="font-medium text-slate-700">إرسال إشعار واتساب</p>
            <p className="text-xs text-slate-500">إرسال رسالة للمعلم عبر الواتساب</p>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              disabled={isSubmitting}
            />
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              isWarning
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري التسجيل...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                تأكيد وطباعة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
