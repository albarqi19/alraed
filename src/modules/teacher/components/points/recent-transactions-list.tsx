import { useEffect, useState } from 'react'
import type { TeacherPointTransaction } from '@/modules/teacher/points/types'

interface RecentTransactionsListProps {
  transactions: TeacherPointTransaction[]
  onUndo: (transaction: TeacherPointTransaction) => void
  undoingId?: number | null
}

function formatDate(value: string) {
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('ar-SA', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date)
  } catch (error) {
    return value
  }
}

function formatParts(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function useUndoCountdown(undoableUntil?: string | null) {
  const [remaining, setRemaining] = useState(() => {
    if (!undoableUntil) return 0
    const diff = Math.floor((new Date(undoableUntil).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })

  useEffect(() => {
    if (!undoableUntil) return
    setRemaining(Math.max(0, Math.floor((new Date(undoableUntil).getTime() - Date.now()) / 1000)))

    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [undoableUntil])

  return remaining
}

function UndoTimer({ undoableUntil }: { undoableUntil?: string | null }) {
  const remaining = useUndoCountdown(undoableUntil)

  if (!undoableUntil || remaining <= 0) {
    return null
  }

  return (
    <span className="text-xs font-semibold text-amber-700">يتبقى {formatParts(remaining)}</span>
  )
}

export function RecentTransactionsList({ transactions, onUndo, undoingId }: RecentTransactionsListProps) {
  if (!transactions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-muted">
        لم يتم تسجيل أي عمليات اليوم بعد.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => {
        const isReward = transaction.type === 'reward'
        const undoable = transaction.is_undoable && !transaction.undone_at
        return (
          <li key={transaction.id} className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-right shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`grid h-8 w-8 place-items-center rounded-2xl ${isReward ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                    <i className={`bi ${isReward ? 'bi-stars' : 'bi-exclamation-diamond'}`} aria-hidden></i>
                  </span>
                  <span className="text-slate-900">{transaction.reason?.title ?? 'عملية بدون سبب'}</span>
                </div>
                <p className="text-xs text-muted">
                  {transaction.student?.name ?? 'طالب غير معروف'} • {transaction.student?.grade ?? '—'} —{' '}
                  {transaction.student?.class_name ?? '—'}
                </p>
                <p className="text-xs text-muted">{formatDate(transaction.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-4 py-1 text-sm font-bold ${
                    isReward ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {isReward ? '+' : '−'}
                  {Math.abs(transaction.amount).toLocaleString('ar-SA')} نقطة
                </span>
                {undoable ? (
                  <div className="flex items-center gap-3">
                    <UndoTimer undoableUntil={transaction.undoable_until} />
                    <button
                      type="button"
                      onClick={() => onUndo(transaction)}
                      disabled={undoingId === transaction.id}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                    >
                      تراجع
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
