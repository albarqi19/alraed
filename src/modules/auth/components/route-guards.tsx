import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '../types'
import { useAuthStore } from '../store/auth-store'
import { getRolePortal, hasManagementAccess } from '../constants/roles'

interface RequireAuthProps {
  children?: ReactNode
  /**
   * الأدوارُ المسموح لها. قائمةٌ لا قيمةً واحدة عن قصد.
   *
   * كانت `role?: UserRole` تُقارَن بمساواةٍ صارمة، فبوّابةُ المعلّم كانت مغلقةً
   * أمام كلِّ دورٍ سوى `teacher` حرفيّاً. ومساعدُ المعلّم كان يُطرَد منها إلى
   * `getUserDashboard('teacher_assistant')` وهي نفسُها `/teacher/dashboard` —
   * فيرفضه الحارسُ ثانيةً ويعيد الكرّة: حلقةٌ مغلقةٌ لا تُرسَم فيها الشاشة أبداً.
   */
  roles?: UserRole | UserRole[]
  requireManagement?: boolean
  skipOnboardingCheck?: boolean
}

export function RequireAuth({ children, roles, requireManagement, skipOnboardingCheck }: RequireAuthProps) {
  const allowed = roles === undefined ? undefined : Array.isArray(roles) ? roles : [roles]
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated || !user) {
    let fallback = '/auth/teacher'
    if (requireManagement || allowed?.some((r) => getRolePortal(r) === 'admin')) {
      fallback = '/auth/admin'
    } else if (allowed?.some((r) => getRolePortal(r) === 'platform')) {
      fallback = '/auth/platform'
    }
    return <Navigate to={fallback} state={{ from: location }} replace />
  }

  // التحقق من الدور المحدد
  if (allowed && !allowed.includes(user.role)) {
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

/**
 * الوجهةُ التي يستقرّ فيها كلُّ دورٍ بعد الدخول.
 *
 * كانت `switch` تسرد الأدوارَ يدويّاً و`default` يرمي ما لم يُذكَر إلى بوّابة
 * المعلّم. فدورٌ إداريٌّ جديدٌ نُسي في السرد كان يُرسَل إلى `/teacher/dashboard`،
 * وحارسُها يردّه إلى `getUserDashboard` فيعيده إليها — حلقةٌ لا نهاية لها.
 *
 * صارت مشتقّةً من البوّابة نفسها، فلا `default` قاتلٌ ولا سردَ يُنسى.
 *
 * ومُصدَّرةٌ الآن لأنّ `useLoginMutation` كان يكرّر منطقَها بشرطٍ ثلاثيٍّ مختلف.
 */
export function getUserDashboard(role: UserRole): string {
  switch (getRolePortal(role)) {
    case 'platform':
      return '/platform/overview'
    case 'admin':
      return '/admin/dashboard'
    case 'teacher':
    default:
      return '/teacher/dashboard'
  }
}
