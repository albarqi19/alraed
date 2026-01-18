import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '../types'
import { useAuthStore } from '../store/auth-store'
import { hasManagementAccess } from '../constants/roles'

interface RequireAuthProps {
  children?: ReactNode
  role?: UserRole
  requireManagement?: boolean
  skipOnboardingCheck?: boolean
}

export function RequireAuth({ children, role, requireManagement, skipOnboardingCheck }: RequireAuthProps) {
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

  // التحقق من الحاجة لإكمال الإعداد (للمدير ومساعده)
  // يجب أن تكون needs_onboarding === true صراحةً وليس مجرد truthy
  if (
    !skipOnboardingCheck &&
    user.needs_onboarding === true &&
    (user.role === 'school_principal' || user.role === 'admin') &&
    !location.pathname.startsWith('/onboarding')
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (isAuthenticated && user) {
    // التوجيه للإعداد إذا لم يكتمل
    if (user.needs_onboarding && (user.role === 'school_principal' || user.role === 'admin')) {
      return <Navigate to="/onboarding" replace />
    }
    const destination = getUserDashboard(user.role)
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}

/**
 * حماية صفحة الإعداد - تتطلب مستخدم مسجل دخول ويحتاج إعداد
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  // غير مسجل دخول
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/admin" replace />
  }

  // ليس مدير المدرسة أو مساعده
  if (user.role !== 'school_principal' && user.role !== 'admin') {
    return <Navigate to={getUserDashboard(user.role)} replace />
  }

  // اكتمل الإعداد بالفعل
  if (!user.needs_onboarding) {
    return <Navigate to="/admin/dashboard" replace />
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
    case 'health_counselor':
      return '/admin/dashboard'
    case 'teacher':
    default:
      return '/teacher/dashboard'
  }
}
