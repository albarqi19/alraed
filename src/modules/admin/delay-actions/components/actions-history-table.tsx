/**
 * جدول سجل الإجراءات (تنبيهات وحسومات)
 */

import { useState } from 'react'
import { AlertTriangle, FileWarning, Check, Printer, ChevronLeft, ChevronRight, ArrowLeftRight, Inbox } from 'lucide-react'
import type { DelayActionRecord, PaginationMeta } from '../types'
import { fetchAndOpenPrintPage } from '../api'
import { WsBtn, WsChip, WsEmpty, WsField, WsInput, WsModal, WsTable } from '@/shared/workspace'

interface ActionsHistoryTableProps {
  data: DelayActionRecord[]
  meta: PaginationMeta | undefined
  isLoading: boolean
  onPageChange: (page: number) => void
  onMarkSigned: (actionId: number) => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA')
  }
}

function ActionTypeChip({ type, label }: { type: 'warning' | 'deduction'; label: string }) {
  return (
    <WsChip tone={type === 'warning' ? 'amber' : 'red'} icon={type === 'warning' ? AlertTriangle : FileWarning}>
      {label}
    </WsChip>
  )
}

function SignedChip({ isSigned, signedByName }: { isSigned: boolean; signedByName?: string | null }) {
  if (isSigned) {
    return (
      <WsChip tone="green" icon={Check} title={signedByName ? `موقع بواسطة: ${signedByName}` : undefined}>
        موقع
      </WsChip>
    )
  }

  return <WsChip>غير موقع</WsChip>
}

function SignDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  isSubmitting: boolean
}) {
  const [signedByName, setSignedByName] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (signedByName.trim()) {
      onConfirm(signedByName.trim())
      setSignedByName('')
    }
  }

  const handleClose = () => {
    setSignedByName('')
    onClose()
  }

  return (
    <WsModal
      open={isOpen}
      onClose={() => !isSubmitting && handleClose()}
      title="تأكيد التوقيع"
      footer={
        <>
          <WsBtn onClick={handleClose} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="primary" icon={Check} onClick={handleSubmit} disabled={isSubmitting || !signedByName.trim()}>
            {isSubmitting ? 'جاري الحفظ...' : 'تأكيد التوقيع'}
          </WsBtn>
        </>
      }
    >
      <WsField label="اسم الموقّع" htmlFor="signed-by-name">
        <WsInput
          id="signed-by-name"
          type="text"
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
          placeholder="أدخل اسم الموقّع..."
          disabled={isSubmitting}
        />
      </WsField>
    </WsModal>
  )
}

export function ActionsHistoryTable({
  data,
  meta,
  isLoading,
  onPageChange,
  onMarkSigned,
}: ActionsHistoryTableProps) {
  const [signDialogActionId, setSignDialogActionId] = useState<number | null>(null)
  const [isSignSubmitting, setIsSignSubmitting] = useState(false)

  const handlePrint = (actionId: number) => {
    void fetchAndOpenPrintPage(actionId)
  }

  const handleMarkSigned = async (_name: string) => {
    if (!signDialogActionId) return
    setIsSignSubmitting(true)
    try {
      onMarkSigned(signDialogActionId)
      setSignDialogActionId(null)
    } finally {
      setIsSignSubmitting(false)
    }
  }

  if (isLoading) {
    return <WsEmpty loading>جاري تحميل البيانات...</WsEmpty>
  }

  if (data.length === 0) {
    return <WsEmpty icon={Inbox}>لا يوجد إجراءات مسجلة.</WsEmpty>
  }

  return (
    <>
      <WsTable>
        <thead>
          <tr>
            <th>النوع</th>
            <th>المعلم</th>
            <th>إجمالي التأخير</th>
            <th>المرحّل</th>
            <th>الرقم التسلسلي</th>
            <th>تاريخ التسجيل</th>
            <th>الحالة</th>
            <th>بواسطة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((action) => (
            <tr key={action.id}>
              <td>
                <ActionTypeChip type={action.action_type} label={action.action_type_label} />
              </td>
              <td style={{ fontWeight: 600 }}>{action.teacher_name ?? '—'}</td>
              <td>{action.formatted_delay}</td>
              <td>
                {action.action_type === 'deduction' && action.carried_over_minutes > 0 ? (
                  <WsChip tone="sky" icon={ArrowLeftRight}>
                    {action.formatted_carried_over}
                  </WsChip>
                ) : (
                  <span style={{ color: 'var(--ws-text-2)' }}>—</span>
                )}
              </td>
              <td>
                <WsChip>#{action.sequence_number}</WsChip>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(action.created_at)}</td>
              <td>
                <SignedChip isSigned={action.is_signed} signedByName={action.signed_by_name} />
              </td>
              <td style={{ color: 'var(--ws-text-2)', fontSize: 11.5 }}>{action.performed_by?.name ?? '—'}</td>
              <td>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <WsBtn size="sm" icon={Printer} onClick={() => handlePrint(action.id)}>
                    طباعة
                  </WsBtn>
                  {!action.is_signed && (
                    <WsBtn size="sm" icon={Check} onClick={() => setSignDialogActionId(action.id)}>
                      توقيع
                    </WsBtn>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </WsTable>

      {/* ترقيم الصفحات */}
      {meta && meta.last_page > 1 && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '7px 14px',
            borderTop: '1px solid var(--ws-hairline)',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>
            عرض {(meta.current_page - 1) * meta.per_page + 1} -{' '}
            {Math.min(meta.current_page * meta.per_page, meta.total)} من {meta.total.toLocaleString('ar-SA')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <WsBtn
              size="sm"
              icon={ChevronRight}
              onClick={() => onPageChange(meta.current_page - 1)}
              disabled={meta.current_page <= 1}
            >
              السابق
            </WsBtn>
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>
              {meta.current_page.toLocaleString('ar-SA')} / {meta.last_page.toLocaleString('ar-SA')}
            </span>
            <WsBtn
              size="sm"
              icon={ChevronLeft}
              onClick={() => onPageChange(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page}
            >
              التالي
            </WsBtn>
          </span>
        </div>
      )}

      {/* Sign Dialog */}
      <SignDialog
        isOpen={signDialogActionId !== null}
        onClose={() => setSignDialogActionId(null)}
        onConfirm={handleMarkSigned}
        isSubmitting={isSignSubmitting}
      />
    </>
  )
}
