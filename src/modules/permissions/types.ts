export interface Permission {
  id: number
  name: string
  name_ar: string
  slug: string
  category: string
  category_ar: string
  description?: string
  icon?: string
  order: number
  actions: string[]
  is_active: boolean
}

export interface RolePermission {
  id: number
  permission_id: number
  permission_slug: string
  actions: string[]
  is_enabled: boolean
}

export interface RoleInfo {
  value: string
  label: string
  icon: string
  color: string
}

export interface PermissionCategory {
  category: string
  category_ar: string
  permissions: Permission[]
}
