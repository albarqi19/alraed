export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  id?: string
  title: string
  description?: string
  type?: ToastType
  duration?: number
}
