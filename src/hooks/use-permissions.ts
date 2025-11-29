import { useAuthStore } from '@/modules/auth/store/auth-store'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const permissions = user?.permissions || []

  function hasPermission(permissionSlug: string): boolean {
    return permissions.includes(permissionSlug)
  }

  function hasAnyPermission(permissionSlugs: string[]): boolean {
    return permissionSlugs.some(slug => permissions.includes(slug))
  }

  function hasAllPermissions(permissionSlugs: string[]): boolean {
    return permissionSlugs.every(slug => permissions.includes(slug))
  }

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
