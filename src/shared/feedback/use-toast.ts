import { useToastInternal } from './toast-context'
import type { ToastOptions } from './toast-types'

export function useToast() {
  const { pushToast } = useToastInternal()
  return (options: ToastOptions) => pushToast(options)
}
