import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '../types'
import { useAuthStore } from '../store/auth-store'

interface RequireAuthProps {
  children?: ReactNode
  role?: UserRole
}

export function RequireAuth({ children, role }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated || !user) {
    const fallback = role === 'admin' ? '/auth/admin' : '/auth/teacher'
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    const destination = user.role === 'teacher' ? '/teacher/dashboard' : '/admin/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticated && user) {
    const destination = user.role === 'teacher' ? '/teacher/dashboard' : '/admin/dashboard'
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
