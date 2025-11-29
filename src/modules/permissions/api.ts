import { apiClient } from '@/services/api/client'
import type { Permission, RolePermission, RoleInfo } from './types'

export async function getAllPermissions() {
  const response = await apiClient.get('/admin/permissions')
  return response.data
}

export async function getRoles() {
  const response = await apiClient.get('/admin/permissions/roles')
  return response.data as { success: boolean; roles: RoleInfo[] }
}

export async function getRolePermissions(role: string) {
  const response = await apiClient.get(`/admin/permissions/roles/${role}`)
  return response.data as {
    success: boolean
    role: string
    all_permissions: Record<string, Permission[]>
    enabled_permissions: RolePermission[]
  }
}

export async function updateRolePermissions(role: string, permissions: { permission_id: number; actions: string[]; is_enabled: boolean }[]) {
  const response = await apiClient.put(`/admin/permissions/roles/${role}`, {
    permissions,
  })
  return response.data
}

export async function getMyPermissions() {
  const response = await apiClient.get('/admin/permissions/my-permissions')
  return response.data as {
    success: boolean
    role: string
    permissions: string[]
  }
}
