import { useState } from 'react'
import clsx from 'classnames'
import { X, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useApprovePlanMutation, useRejectPlanMutation } from '../hooks'
import type { AdminWeeklyLessonPlan } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

interface Props {
  plan: AdminWeeklyLessonPlan
  onClose: () => void
}

export function PlanReviewSheet({ plan, onClose }: Props) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const approveMutation = useApprovePlanMutation()
  const rejectMutation = useRejectPlanMutation()

  const canReview = plan.status === 'teacher_approved'
  const isBusy = approveMutation.isPending || rejectMutation.isPending

  const handleApprove = () => {
    approveMutation.mutate(plan.id, { onSuccess: () => onClose() })
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) return
    rejectMutation.mutate({ id: plan.id, reason: rejectionReason }, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {plan.subject?.name} - {plan.grade}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted">المعلم: {plan.teacher?.name}</span>
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  STATUS_COLORS[plan.status],
                )}
              >
                {STATUS_LABELS[plan.status]}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {plan.sessions.map((session) => (
            <div key={session.session_number} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                  {session.session_number}
                </span>
                <span className="text-sm font-medium text-slate-900">{session.topic}</span>
              </div>
              {session.lesson_title && (
                <div className="text-xs text-slate-600">
                  <span className="font-medium">عنوان الدرس:</span> {session.lesson_title}
                </div>
              )}
              {session.objectives && (
                <div className="mt-1 text-xs text-slate-600">
                  <span className="font-medium">الأهداف:</span> {session.objectives}
                </div>
              )}
              {session.homework && (
                <div className="mt-1 text-xs text-slate-600">
                  <span className="font-medium">الواجبات:</span> {session.homework}
                </div>
              )}
              {session.notes && (
                <div className="mt-1 text-xs text-slate-400">
                  <span className="font-medium">ملاحظات:</span> {session.notes}
                </div>
              )}
            </div>
          ))}

          {plan.rejection_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-700">سبب الرفض السابق:</p>
              <p className="text-xs text-red-600">{plan.rejection_reason}</p>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2">
              <label className="text-xs font-medium text-red-700">سبب الرفض</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض..."
                rows={2}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        {canReview && (
          <div className="flex gap-2 border-t px-5 py-3">
            {showRejectForm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || isBusy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  تأكيد الرفض
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isBusy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  رفض
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isBusy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  اعتماد
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
