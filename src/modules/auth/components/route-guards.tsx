import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '../types'
import { useAuthStore } from '../store/auth-store'
import { hasManagementAccess } from '../constants/roles'

interface RequireAuthProps {
  children?: ReactNode
  role?: UserRole
  requireManagement?: boolean
}

export function RequireAuth({ children, role, requireManagement }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated || !user) {
    let fallback = '/auth/teacher'
    if (role === 'admin' || role === 'school_principal' || requireManagement) {
      fallback = '/auth/admin'
    } else if (role === 'super_admin') {
      fallback = '/auth/platform'
    }
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  // التحقق من الدور المحدد
  if (role && user.role !== role) {
    const destination = getUserDashboard(user.role)
    return <Navigate to={destination} replace />
  }

  // التحقق من صلاحيات الإدارة
  if (requireManagement && !hasManagementAccess(user.role) && user.role !== 'super_admin') {
    const destination = getUserDashboard(user.role)
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticated && user) {
    const destination = getUserDashboard(user.role)
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}

function getUserDashboard(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/platform/overview'
    case 'admin':
    case 'school_principal':
    case 'deputy_teachers':
    case 'deputy_students':
    case 'administrative_staff':
    case 'student_counselor':
    case 'learning_resources_admin':
      return '/admin/dashboard'
    case 'teacher':
    default:
      return '/teacher/dashboard'
  }
}
