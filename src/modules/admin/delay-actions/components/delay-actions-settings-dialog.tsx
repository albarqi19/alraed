/**
 * نافذة إعدادات إجراءات التأخير
 */

import { useEffect, useState } from 'react'
import { Settings, MessageCircle, X, Loader2 } from 'lucide-react'
import { useDelayActionsSettingsQuery, useUpdateDelayActionsSettingsMutation } from '../hooks'

interface DelayActionsSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DelayActionsSettingsDialog({
  open,
  onOpenChange,
}: DelayActionsSettingsDialogProps) {
  const settingsQuery = useDelayActionsSettingsQuery({ enabled: open })
  const updateMutation = useUpdateDelayActionsSettingsMutation()

  const [sendWhatsApp, setSendWhatsApp] = useState(true)

  // تحديث الحالة عند تحميل البيانات
  useEffect(() => {
    if (settingsQuery.data) {
      setSendWhatsApp(settingsQuery.data.send_whatsapp_for_delay_actions)
    }
  }, [settingsQuery.data])

  if (!open) return null

  const handleSave = () => {
    updateMutation.mutate(
      { send_whatsapp_for_delay_actions: sendWhatsApp },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const handleClose = () => {
    if (updateMutation.isPending) return
    onOpenChange(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border-t-4 border-indigo-500 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            disabled={updateMutation.isPending}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 text-right">
            <div>
              <h2 className="text-lg font-bold text-slate-900">إعدادات إجراءات التأخير</h2>
              <p className="text-sm text-slate-500">تخصيص إشعارات التنبيهات والحسومات</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-3">
              <Settings className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        {settingsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : settingsQuery.isError ? (
          <div className="rounded-xl bg-rose-50 p-4 text-center text-rose-600">
            تعذر تحميل الإعدادات
          </div>
        ) : (
          <div className="space-y-4">
            {/* إرسال واتساب */}
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/50">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                disabled={updateMutation.isPending}
              />
              <div className="flex flex-1 items-center gap-3 text-right">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">إرسال رسالة واتساب للمعلم</p>
                  <p className="text-sm text-slate-500">
                    عند تسجيل تنبيه أو حسم، سيتم إرسال رسالة تلقائية للمعلم
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 p-2">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </label>

            {/* معلومات إضافية */}
            <div className="rounded-xl bg-blue-50 p-4 text-right text-sm text-blue-700">
              <p className="font-semibold">ملاحظة:</p>
              <p className="mt-1">
                عند تفعيل هذا الخيار، سيتم إرسال رسالة واتساب تلقائية للمعلم عند تسجيل أي تنبيه
                أو قرار حسم جديد.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            disabled={updateMutation.isPending}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            disabled={updateMutation.isPending || settingsQuery.isLoading}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ الإعدادات'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
