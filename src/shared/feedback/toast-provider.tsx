import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'classnames'
import { ToastContext } from './toast-context'
import type { ToastOptions } from './toast-types'

interface ToastInternal extends ToastOptions {
  id: string
  createdAt: number
}

function ToastRegion({ toasts, dismiss }: { toasts: ToastInternal[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 left-6 z-[1000] flex w-full max-w-sm flex-col gap-3 text-right md:left-auto md:right-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-2xl backdrop-blur transition',
            toast.type === 'success' && 'border-emerald-200',
            toast.type === 'error' && 'border-rose-200',
            toast.type === 'warning' && 'border-amber-200',
            toast.type === 'info' && 'border-sky-200',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.description ? (
                <p className="text-xs leading-relaxed text-slate-600">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-xs text-slate-400 transition hover:text-slate-600"
            >
              إغلاق
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? crypto.randomUUID()
      const nextToast: ToastInternal = {
        id,
        title: options.title,
        description: options.description,
        type: options.type ?? 'info',
        duration: options.duration ?? 4000,
        createdAt: Date.now(),
      }

      setToasts((prev) => [...prev, nextToast])

      if (nextToast.duration && nextToast.duration > 0) {
        window.setTimeout(() => dismiss(id), nextToast.duration)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}
