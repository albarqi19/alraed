import { createContext, useContext } from 'react'
import type { ToastOptions } from './toast-types'

interface ToastContextValue {
  pushToast: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToastInternal() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
