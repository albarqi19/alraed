/**
 * نافذة مراجعة عذر التأخير
 * عرض تفاصيل العذر مع إمكانية القبول أو الرفض
 */

import { useState, useEffect } from 'react'
import { X, Check, Clock, User, Calendar, FileText, AlertCircle } from 'lucide-react'
import type { DelayExcuse } from '../types'

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
  }, [excuse?.id])

  if (!excuse) return null

  const isViewOnly = action === null || readOnly
  const isApprove = action === 'approve'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between rounded-t-2xl px-6 py-4 ${
          isViewOnly
            ? 'bg-slate-50'
            : isApprove
            ? 'bg-emerald-50'
            : 'bg-red-50'
        }`}>
          <h2 className={`text-lg font-bold ${
            isViewOnly
              ? 'text-slate-900'
              : isApprove
              ? 'text-emerald-900'
              : 'text-red-900'
          }`}>
            {isViewOnly
              ? 'تفاصيل العذر'
              : isApprove
              ? 'قبول العذر'
              : 'رفض العذر'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* معلومات المعلم */}
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <User className="mt-0.5 h-5 w-5 text-slate-400" />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{excuse.teacher_name}</div>
              {excuse.national_id && (
                <div className="text-sm text-slate-500">هوية: {excuse.national_id}</div>
              )}
              {excuse.teacher_phone && (
                <div className="text-sm text-slate-500">جوال: {excuse.teacher_phone}</div>
              )}
            </div>
          </div>

          {/* تفاصيل التأخير */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">تاريخ التأخير</div>
                <div className="font-semibold text-slate-900">{excuse.delay_date_formatted}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-xs text-red-600">مدة التأخير</div>
                <div className="font-semibold text-red-700">{excuse.delay_minutes} دقيقة</div>
              </div>
            </div>
          </div>

          {/* وقت الحضور */}
          {excuse.attendance?.check_in_time && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-xs text-amber-600">وقت الحضور</div>
                <div className="font-semibold text-amber-700">{excuse.attendance.check_in_time}</div>
              </div>
            </div>
          )}

          {/* نص العذر */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4" />
              نص العذر
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
              {excuse.excuse_text}
            </div>
          </div>

          {/* معلومات التقديم */}
          <div className="text-xs text-slate-500">
            تم التقديم: {new Date(excuse.submitted_at).toLocaleString('ar-SA')}
          </div>

          {/* معلومات المراجعة (إذا تمت) */}
          {excuse.reviewed_at && (
            <div className={`rounded-xl p-4 ${
              excuse.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-semibold ${
                excuse.status === 'approved' ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {excuse.status === 'approved' ? 'تم القبول' : 'تم الرفض'} بواسطة: {excuse.reviewer_name}
              </div>
              <div className="text-xs text-slate-500">
                بتاريخ: {new Date(excuse.reviewed_at).toLocaleString('ar-SA')}
              </div>
              {excuse.review_notes && (
                <div className="mt-2 text-sm text-slate-600">
                  الملاحظات: {excuse.review_notes}
                </div>
              )}
            </div>
          )}

          {/* حقل الملاحظات (فقط عند المراجعة) */}
          {!isViewOnly && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                ملاحظات {!isApprove && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={isApprove ? 'ملاحظات اختيارية...' : 'يرجى كتابة سبب الرفض...'}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {/* تحذير عند القبول */}
          {isApprove && !isViewOnly && (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="text-sm text-emerald-700">
                عند قبول العذر، لن تُحتسب دقائق التأخير هذه ضمن إجمالي التأخير للمعلم.
              </div>
            </div>
          )}

          {/* تحذير عند الرفض */}
          {!isApprove && !isViewOnly && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">
                عند رفض العذر، ستُحتسب دقائق التأخير ضمن إجمالي التأخير للمعلم.
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isViewOnly ? 'إغلاق' : 'إلغاء'}
          </button>
          {!isViewOnly && (
            <button
              type="button"
              onClick={() => onConfirm(notes || undefined)}
              disabled={isSubmitting || (!isApprove && !notes.trim())}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  {isApprove ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {isApprove ? 'قبول العذر' : 'رفض العذر'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
