import { sileo } from 'sileo'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  id?: string
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

export function useToast() {
  return (options: ToastOptions) => {
    const opts = {
      title: options.title,
      description: options.description,
      duration: options.duration ?? 5000,
      id: options.id ?? `toast-${Date.now()}`,
    }

    switch (options.type) {
      case 'success': sileo.success(opts); break
      case 'error': sileo.error(opts); break
      case 'warning': sileo.warning(opts); break
      default: sileo.info(opts); break
    }
  }
}
