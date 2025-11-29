import { useState, useEffect } from 'react'
import { getRoles, getRolePermissions, updateRolePermissions } from '../api'
import type { Permission, RoleInfo, RolePermission } from '../types'
import { Loader2, Check, X, Shield } from 'lucide-react'

export function AdminPermissionsPage() {
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [saving, setSaving] = useState(false)

  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [enabledPermissions, setEnabledPermissions] = useState<Map<number, RolePermission>>(new Map())

  useEffect(() => {
    loadRoles()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole)
    }
  }, [selectedRole])

  async function loadRoles() {
    try {
      setLoading(true)
      const data = await getRoles()
      if (data.success) {
        setRoles(data.roles)
        if (data.roles.length > 0) {
          setSelectedRole(data.roles[0].value)
        }
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      alert('فشل تحميل الأدوار')
    } finally {
      setLoading(false)
    }
  }

  async function loadRolePermissions(role: string) {
    try {
      setLoadingPermissions(true)
      const data = await getRolePermissions(role)
      if (data.success) {
        setAllPermissions(data.all_permissions)
        
        // تحويل القائمة إلى Map للوصول السريع
        const permMap = new Map<number, RolePermission>()
        data.enabled_permissions.forEach(ep => {
          permMap.set(ep.permission_id, ep)
        })
        setEnabledPermissions(permMap)
      }
    } catch (error) {
      console.error('Error loading role permissions:', error)
      alert('فشل تحميل صلاحيات الدور')
    } finally {
      setLoadingPermissions(false)
    }
  }

  function togglePermission(permissionId: number, permission: Permission) {
    const newMap = new Map(enabledPermissions)
    
    if (newMap.has(permissionId)) {
      newMap.delete(permissionId)
    } else {
      newMap.set(permissionId, {
        id: 0,
        permission_id: permissionId,
        permission_slug: permission.slug,
        actions: permission.actions || [],
        is_enabled: true,
      })
    }
    
    setEnabledPermissions(newMap)
  }

  function toggleAction(permissionId: number, action: string, _allActions: string[]) {
    const newMap = new Map(enabledPermissions)
    const current = newMap.get(permissionId)
    
    if (!current) {
      // إذا لم تكن الصلاحية مفعّلة، نفعّلها مع هذا الإجراء
      newMap.set(permissionId, {
        id: 0,
        permission_id: permissionId,
        permission_slug: '',
        actions: [action],
        is_enabled: true,
      })
    } else {
      const currentActions = current.actions || []
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action]
      
      if (newActions.length === 0) {
        newMap.delete(permissionId)
      } else {
        newMap.set(permissionId, {
          ...current,
          actions: newActions,
        })
      }
    }
    
    setEnabledPermissions(newMap)
  }

  async function handleSave() {
    if (!selectedRole) return

    try {
      setSaving(true)
      
      // تحضير البيانات للإرسال
      const allPermissionsList = Object.values(allPermissions).flat()
      const permissionsData = allPermissionsList.map(perm => {
        const enabled = enabledPermissions.get(perm.id)
        return {
          permission_id: perm.id,
          actions: enabled?.actions || [],
          is_enabled: !!enabled,
        }
      })

      const data = await updateRolePermissions(selectedRole, permissionsData)
      
      if (data.success) {
        alert('تم حفظ الصلاحيات بنجاح ✅')
        // إعادة تحميل الصلاحيات
        loadRolePermissions(selectedRole)
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      alert('فشل حفظ الصلاحيات ❌')
    } finally {
      setSaving(false)
    }
  }

  const selectedRoleInfo = roles.find(r => r.value === selectedRole)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-500" />
            إدارة الصلاحيات
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            تحديد الصفحات والإجراءات المتاحة لكل دور
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              حفظ التغييرات
            </>
          )}
        </button>
      </div>

      {/* Role Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-3">اختر الدور</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {roles.map(role => (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`
                p-4 rounded-lg border-2 transition-all text-center hover:scale-105
                ${selectedRole === role.value
                  ? `border-${role.color}-500 bg-${role.color}-50`
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <div className="text-3xl mb-2">{role.icon}</div>
              <div className={`text-sm font-medium ${selectedRole === role.value ? `text-${role.color}-700` : 'text-slate-700'}`}>
                {role.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions List */}
      {selectedRoleInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className={`p-4 bg-gradient-to-r from-${selectedRoleInfo.color}-500 to-${selectedRoleInfo.color}-600 text-white`}>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">{selectedRoleInfo.icon}</span>
              صلاحيات {selectedRoleInfo.label}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              حدد الصفحات والإجراءات المتاحة لهذا الدور
            </p>
          </div>

          {loadingPermissions ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {Object.entries(allPermissions).map(([category, permissions]) => {
                const categoryAr = permissions[0]?.category_ar || category
                
                return (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-200 pb-2">
                      {categoryAr}
                    </h3>
                    
                    <div className="space-y-2">
                      {permissions.map(permission => {
                        const isEnabled = enabledPermissions.has(permission.id)
                        const enabledActions = enabledPermissions.get(permission.id)?.actions || []
                        
                        // إخفاء صلاحية "إدارة الصلاحيات" عند مدير المدرسة
                        const isSchoolPrincipal = selectedRole === 'school_principal'
                        const isPermissionsManagement = permission.slug === 'admin.permissions'
                        
                        if (isSchoolPrincipal && isPermissionsManagement) {
                          return null
                        }
                        
                        return (
                          <div
                            key={permission.id}
                            className={`
                              p-4 rounded-lg border-2 transition-all
                              ${isEnabled ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}
                            `}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="text-2xl">{permission.icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-slate-900">{permission.name_ar}</h4>
                                    <span className="text-xs text-slate-500">({permission.name})</span>
                                  </div>
                                  {permission.description && (
                                    <p className="text-sm text-slate-600">{permission.description}</p>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => togglePermission(permission.id, permission)}
                                className={`
                                  p-2 rounded-lg transition-colors shrink-0
                                  ${isEnabled ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-slate-300 text-slate-600 hover:bg-slate-400'}
                                `}
                              >
                                {isEnabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                              </button>
                            </div>

                            {/* Actions */}
                            {isEnabled && permission.actions && permission.actions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <label className="block text-xs font-medium text-slate-700 mb-2">الإجراءات المتاحة:</label>
                                <div className="flex flex-wrap gap-2">
                                  {permission.actions.map(action => {
                                    const actionLabels: Record<string, string> = {
                                      view: 'عرض',
                                      create: 'إضافة',
                                      edit: 'تعديل',
                                      delete: 'حذف',
                                      approve: 'اعتماد',
                                      reject: 'رفض',
                                      send: 'إرسال',
                                      import: 'استيراد',
                                      export: 'تصدير',
                                    }
                                    
                                    const hasAction = enabledActions.includes(action)
                                    
                                    return (
                                      <button
                                        key={action}
                                        onClick={() => toggleAction(permission.id, action, permission.actions)}
                                        className={`
                                          px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                                          ${hasAction
                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                          }
                                        `}
                                      >
                                        {actionLabels[action] || action}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
