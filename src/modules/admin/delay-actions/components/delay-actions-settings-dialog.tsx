/**
 * نافذة إعدادات إجراءات التأخير
 */

import { useEffect, useState } from 'react'
import { MessageCircle, Settings } from 'lucide-react'
import { useDelayActionsSettingsQuery, useUpdateDelayActionsSettingsMutation } from '../hooks'
import { WsAlert, WsBtn, WsModal, WsSpinner, WsSwitch } from '@/shared/workspace'

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
    <WsModal
      open={open}
      onClose={handleClose}
      title="إعدادات إجراءات التأخير"
      sub="تخصيص إشعارات التنبيهات والحسومات."
      footer={
        <>
          <WsBtn onClick={handleClose} disabled={updateMutation.isPending}>
            إلغاء
          </WsBtn>
          <WsBtn
            variant="primary"
            icon={Settings}
            onClick={handleSave}
            disabled={updateMutation.isPending || settingsQuery.isLoading}
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </WsBtn>
        </>
      }
    >
      {settingsQuery.isLoading ? (
        <WsAlert tone="info" icon={null} boxed>
          <WsSpinner style={{ width: 13, height: 13 }} />
          جاري تحميل الإعدادات...
        </WsAlert>
      ) : settingsQuery.isError ? (
        <WsAlert boxed>تعذر تحميل الإعدادات.</WsAlert>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '8px 10px',
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              background: 'var(--ws-surface-2)',
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                <MessageCircle style={{ width: 13, height: 13, color: 'var(--ws-green)' }} />
                إرسال رسالة واتساب للمعلم
              </span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                عند تسجيل تنبيه أو حسم، تُرسل رسالة تلقائية للمعلم.
              </span>
            </span>
            <WsSwitch checked={sendWhatsApp} onChange={setSendWhatsApp} disabled={updateMutation.isPending} />
          </div>

          <WsAlert tone="info" boxed>
            عند تفعيل هذا الخيار، سيتم إرسال رسالة واتساب تلقائية للمعلم عند تسجيل أي تنبيه أو قرار حسم جديد.
          </WsAlert>
        </>
      )}
    </WsModal>
  )
}
