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
    let fallback = '/auth/teacher'
    if (role === 'admin') {
      fallback = '/auth/admin'
    } else if (role === 'super_admin') {
      fallback = '/auth/platform'
    }
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    let destination = '/teacher/dashboard'
    if (user.role === 'admin') {
      destination = '/admin/dashboard'
    } else if (user.role === 'super_admin') {
      destination = '/platform/overview'
    }
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticated && user) {
    let destination = '/teacher/dashboard'
    if (user.role === 'admin') {
      destination = '/admin/dashboard'
    } else if (user.role === 'super_admin') {
      destination = '/platform/overview'
    }
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
