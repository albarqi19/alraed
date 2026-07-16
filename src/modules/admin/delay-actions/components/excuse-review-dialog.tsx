/**
 * نافذة مراجعة عذر التأخير
 * عرض تفاصيل العذر مع إمكانية القبول أو الرفض
 */

import { useState, useEffect } from 'react'
import { X, Check, Clock3, FileText } from 'lucide-react'
import type { DelayExcuse } from '../types'
import {
  WsAlert,
  WsBtn,
  WsChip,
  WsFactRow,
  WsFactsList,
  WsField,
  WsModal,
  WsTextarea,
} from '@/shared/workspace'

interface ExcuseReviewDialogProps {
  excuse: DelayExcuse | null
  action: 'approve' | 'reject' | null
  isSubmitting: boolean
  onConfirm: (notes?: string) => void
  onCancel: () => void
  readOnly?: boolean
}

export function ExcuseReviewDialog({
  excuse,
  action,
  isSubmitting,
  onConfirm,
  onCancel,
  readOnly = false,
}: ExcuseReviewDialogProps) {
  const [notes, setNotes] = useState('')

  // إعادة تعيين الملاحظات عند فتح النافذة
  useEffect(() => {
    if (excuse) {
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excuse?.id])

  if (!excuse) return null

  const isViewOnly = action === null || readOnly
  const isApprove = action === 'approve'

  return (
    <WsModal
      open
      onClose={() => !isSubmitting && onCancel()}
      title={isViewOnly ? 'تفاصيل العذر' : isApprove ? 'قبول العذر' : 'رفض العذر'}
      sub={excuse.teacher_name}
      footer={
        <>
          <WsBtn onClick={onCancel} disabled={isSubmitting}>
            {isViewOnly ? 'إغلاق' : 'إلغاء'}
          </WsBtn>
          {!isViewOnly && (
            <WsBtn
              variant={isApprove ? 'primary' : 'danger'}
              icon={isApprove ? Check : X}
              onClick={() => onConfirm(notes || undefined)}
              disabled={isSubmitting || (!isApprove && !notes.trim())}
            >
              {isSubmitting ? 'جاري المعالجة...' : isApprove ? 'قبول العذر' : 'رفض العذر'}
            </WsBtn>
          )}
        </>
      }
    >
      {/* معلومات المعلم والتأخير */}
      <WsFactsList
        style={{
          border: '1px solid var(--ws-hairline)',
          borderRadius: 8,
          padding: '8px 10px',
          background: 'var(--ws-surface-2)',
        }}
      >
        <WsFactRow label="المعلم">{excuse.teacher_name}</WsFactRow>
        {excuse.national_id && <WsFactRow label="الهوية">{excuse.national_id}</WsFactRow>}
        {excuse.teacher_phone && <WsFactRow label="الجوال">{excuse.teacher_phone}</WsFactRow>}
        <WsFactRow label="تاريخ التأخير">{excuse.delay_date_formatted}</WsFactRow>
        <WsFactRow label="تاريخ التقديم">{new Date(excuse.submitted_at).toLocaleString('ar-SA')}</WsFactRow>
      </WsFactsList>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <WsChip tone="red" icon={Clock3}>
          مدة التأخير {excuse.delay_minutes} دقيقة
        </WsChip>
        {excuse.attendance?.check_in_time && (
          <WsChip tone="amber" icon={Clock3}>
            وقت الحضور {excuse.attendance.check_in_time}
          </WsChip>
        )}
      </div>

      {/* نص العذر */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="ws-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <FileText style={{ width: 12, height: 12 }} />
          نص العذر
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.7,
            padding: '8px 10px',
            border: '1px solid var(--ws-hairline)',
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {excuse.excuse_text}
        </p>
      </div>

      {/* معلومات المراجعة (إذا تمت) */}
      {excuse.reviewed_at && (
        <WsAlert tone={excuse.status === 'approved' ? 'success' : 'error'} boxed>
          <span>
            <b>{excuse.status === 'approved' ? 'تم القبول' : 'تم الرفض'}</b> بواسطة {excuse.reviewer_name} بتاريخ{' '}
            {new Date(excuse.reviewed_at).toLocaleString('ar-SA')}
            {excuse.review_notes ? ` — الملاحظات: ${excuse.review_notes}` : ''}
          </span>
        </WsAlert>
      )}

      {/* حقل الملاحظات (فقط عند المراجعة) */}
      {!isViewOnly && (
        <WsField label={isApprove ? 'ملاحظات (اختياري)' : 'سبب الرفض (مطلوب)'}>
          <WsTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={isApprove ? 'ملاحظات اختيارية...' : 'يرجى كتابة سبب الرفض...'}
            style={!isApprove && !notes.trim() ? { borderColor: 'var(--ws-red)' } : undefined}
          />
        </WsField>
      )}

      {/* تنبيه أثر القرار */}
      {!isViewOnly && (
        <WsAlert tone={isApprove ? 'success' : 'error'} boxed>
          {isApprove
            ? 'عند قبول العذر، لن تُحتسب دقائق التأخير هذه ضمن إجمالي التأخير للمعلم.'
            : 'عند رفض العذر، ستُحتسب دقائق التأخير ضمن إجمالي التأخير للمعلم.'}
        </WsAlert>
      )}
    </WsModal>
  )
}
