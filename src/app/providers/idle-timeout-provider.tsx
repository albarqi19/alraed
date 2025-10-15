import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/modules/auth/store/auth-store'

interface IdleTimeoutProviderProps {
  children: React.ReactNode
}

/**
 * Idle Timeout Provider
 * - Admin: 4 hours of inactivity → auto logout
 * - Teacher: No idle timeout (session managed by JWT only)
 */
export function IdleTimeoutProvider({ children }: IdleTimeoutProviderProps) {
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const timeoutRef = useRef<number | null>(null)

  // Only apply idle timeout for admin role
  const shouldApplyIdleTimeout = user?.role === 'admin' || user?.role === 'super_admin'
  const IDLE_TIMEOUT = 4 * 60 * 60 * 1000 // 4 hours in milliseconds

  useEffect(() => {
    if (!shouldApplyIdleTimeout) {
      return
    }

    const resetTimeout = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        // Auto logout after idle timeout
        clearAuth()
        window.location.href = '/auth/admin'
      }, IDLE_TIMEOUT)
    }

    const handleActivity = () => {
      resetTimeout()
    }

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Initialize timeout
    resetTimeout()

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [shouldApplyIdleTimeout, clearAuth])

  return <>{children}</>
}
