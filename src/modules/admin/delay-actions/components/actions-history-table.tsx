/**
 * جدول سجل الإجراءات (تنبيهات وحسومات)
 */

import { useState } from 'react'
import { AlertTriangle, FileWarning, Check, Printer, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import type { DelayActionRecord, PaginationMeta } from '../types'
import { fetchAndOpenPrintPage } from '../api'

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

function ActionTypeBadge({ type, label }: { type: 'warning' | 'deduction'; label: string }) {
  const styles =
    type === 'warning'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200'

  const Icon = type === 'warning' ? AlertTriangle : FileWarning

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function SignedBadge({ isSigned, signedByName }: { isSigned: boolean; signedByName?: string | null }) {
  if (isSigned) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
        title={signedByName ? `موقع بواسطة: ${signedByName}` : undefined}
      >
        <Check className="h-3 w-3" />
        موقع
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
      غير موقع
    </span>
  )
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-slate-900 text-right">تأكيد التوقيع</h3>
        <div className="mb-4 space-y-2 text-right">
          <label htmlFor="signed-by-name" className="text-sm font-medium text-slate-700">
            اسم الموقّع
          </label>
          <input
            id="signed-by-name"
            type="text"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            placeholder="أدخل اسم الموقّع..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-right shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={isSubmitting}
          />
        </div>
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            disabled={isSubmitting || !signedByName.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                تأكيد التوقيع
              </>
            )}
          </button>
        </div>
      </div>
    </div>
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
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        جاري تحميل البيانات...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
        <i className="bi bi-inbox text-4xl text-slate-300" />
        <p>لا يوجد إجراءات مسجلة</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">النوع</th>
              <th className="px-4 py-3 font-semibold">المعلم</th>
              <th className="px-4 py-3 font-semibold">إجمالي التأخير</th>
              <th className="px-4 py-3 font-semibold">المرحّل</th>
              <th className="px-4 py-3 font-semibold">الرقم التسلسلي</th>
              <th className="px-4 py-3 font-semibold">تاريخ التسجيل</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">بواسطة</th>
              <th className="px-4 py-3 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.map((action) => (
              <tr
                key={action.id}
                className="border-t border-slate-100 text-[13px] transition hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <ActionTypeBadge type={action.action_type} label={action.action_type_label} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{action.teacher_name ?? '—'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{action.formatted_delay}</td>
                <td className="px-4 py-3">
                  {action.action_type === 'deduction' && action.carried_over_minutes > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      <ArrowLeftRight className="h-3 w-3" />
                      {action.formatted_carried_over}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    #{action.sequence_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(action.created_at)}</td>
                <td className="px-4 py-3">
                  <SignedBadge isSigned={action.is_signed} signedByName={action.signed_by_name} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {action.performed_by?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrint(action.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                      title="طباعة"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      طباعة
                    </button>
                    {!action.is_signed && (
                      <button
                        type="button"
                        onClick={() => setSignDialogActionId(action.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        title="تأكيد التوقيع"
                      >
                        <Check className="h-3.5 w-3.5" />
                        توقيع
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            عرض {(meta.current_page - 1) * meta.per_page + 1} -{' '}
            {Math.min(meta.current_page * meta.per_page, meta.total)} من {meta.total.toLocaleString('ar-SA')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(meta.current_page - 1)}
              disabled={meta.current_page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </button>
            <span className="px-3 text-slate-600">
              {meta.current_page.toLocaleString('ar-SA')} / {meta.last_page.toLocaleString('ar-SA')}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
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
