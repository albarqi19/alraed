import { useState, useEffect } from 'react'
import { getRoles, getRolePermissions, updateRolePermissions } from '../api'
import type { Permission, RoleInfo, RolePermission } from '../types'
import { Loader2, Check, Shield, Save } from 'lucide-react'

// --- Components ---

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
                relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2
                ${checked ? 'bg-blue-600' : 'bg-slate-200'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            `}
    >
      <span
        aria-hidden="true"
        className={`
                    pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? '-translate-x-5' : 'translate-x-0'}
                `}
      />
    </button>
  )
}

// --- Main Page ---

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

  function toggleAction(permissionId: number, action: string) {
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
        // الخيار للمستخدم: هل يريد حذف الصلاحية كاملة عند إزالة كل الإجراءات؟
        // هنا سنبقي الصلاحية مفعلة ولكن بدون إجراءات (لأن بعض الصلاحيات للعرض فقط)
        newMap.set(permissionId, {
          ...current,
          actions: newActions,
        })
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-permissions-page p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <span className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Shield className="w-8 h-8" />
            </span>
            إدارة الصلاحيات
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            التحكم الكامل في الوصول والعمليات المتاحة لكل دور وظيفي
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              حفظ التغييرات
            </>
          )}
        </button>
      </header>

      {/* Role Selection */}
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">اختر الدور الوظيفي</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {roles.map(role => {
            const isSelected = selectedRole === role.value
            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`
                                    relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 group
                                    ${isSelected
                    ? `border-${role.color}-500 bg-${role.color}-50 shadow-md ring-2 ring-${role.color}-200 ring-offset-2`
                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }
                                `}
              >
                <div className={`
                                    text-4xl transition-transform duration-300 transform group-hover:scale-110
                                    ${isSelected ? 'scale-110' : ''}
                                `}>
                  {role.icon}
                </div>
                <span className={`
                                    font-bold text-sm text-center
                                    ${isSelected ? `text-${role.color}-700` : 'text-slate-600'}
                                `}>
                  {role.label}
                </span>
                {isSelected && (
                  <div className={`absolute top-3 inset-x-0 mx-auto w-1 h-1 rounded-full bg-${role.color}-500`} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Permissions List */}
      {selectedRoleInfo && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Section Header */}
          <div className={`
                        px-8 py-6 border-b border-slate-100 flex items-center gap-4
                        bg-gradient-to-l from-white via-white to-${selectedRoleInfo.color || 'blue'}-50
                    `}>
            <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm
                            bg-${selectedRoleInfo.color || 'blue'}-100 text-${selectedRoleInfo.color || 'blue'}-700
                        `}>
              {selectedRoleInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                تعديل صلاحيات {selectedRoleInfo.label}
              </h2>
              <p className="text-slate-500 text-sm">
                قم بتفعيل أو تعطيل الصلاحيات وتحديد مستوى الوصول بدقة
              </p>
            </div>
          </div>

          {loadingPermissions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500/50" />
              <p>جاري جلب قائمة الصلاحيات...</p>
            </div>
          ) : (
            <div className="p-8 space-y-10">
              {Object.entries(allPermissions).map(([category, permissions]) => {
                const categoryAr = permissions[0]?.category_ar || category

                return (
                  <div key={category} className="space-y-5">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-slate-800 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {categoryAr}
                      </h3>
                      <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {permissions.map(permission => {
                        const isEnabled = enabledPermissions.has(permission.id)
                        const enabledActions = enabledPermissions.get(permission.id)?.actions || []

                        // إخفاء صلاحية "إدارة الصلاحيات" عن مدير المدرسة لمنع التلاعب
                        const isSchoolPrincipal = selectedRole === 'school_principal'
                        const isPermissionsManagement = permission.slug === 'admin.permissions'

                        if (isSchoolPrincipal && isPermissionsManagement) return null

                        return (
                          <div
                            key={permission.id}
                            className={`
                                                            group relative flex flex-col p-5 rounded-2xl border transition-all duration-200
                                                            ${isEnabled
                                ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                              }
                                                        `}
                          >
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex gap-4">
                                <div className={`
                                                                    flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors
                                                                    ${isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}
                                                                `}>
                                  {permission.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-bold text-lg ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {permission.name_ar}
                                    </h4>
                                    {isEnabled && <Check className="w-4 h-4 text-blue-500" />}
                                  </div>
                                  <p className="text-slate-500 text-sm leading-relaxed mt-1">
                                    {permission.description || permission.name}
                                  </p>
                                </div>
                              </div>

                              <Switch
                                checked={isEnabled}
                                onChange={() => togglePermission(permission.id, permission)}
                              />
                            </div>

                            {/* Actions Area */}
                            <div className={`
                                                            mt-auto pt-4 border-t transition-all duration-200
                                                            ${isEnabled ? 'border-blue-200 opacity-100' : 'border-slate-100 opacity-50 grayscale pointer-events-none'}
                                                        `}>
                              <div className="flex flex-wrap gap-2">
                                {permission.actions && permission.actions.length > 0 ? (
                                  permission.actions.map(action => {
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
                                    const isActive = enabledActions.includes(action)

                                    return (
                                      <button
                                        key={action}
                                        onClick={() => isEnabled && toggleAction(permission.id, action)}
                                        disabled={!isEnabled}
                                        className={`
                                                                                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                                                                                    ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                          }
                                                                                `}
                                      >
                                        {actionLabels[action] || action}
                                      </button>
                                    )
                                  })
                                ) : (
                                  <span className="text-xs text-slate-400 italic px-2 py-1">
                                    لا توجد إجراءات فرعية
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
