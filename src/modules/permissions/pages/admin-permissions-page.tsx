import { useState, useEffect, useMemo } from 'react'
import { getRoles, getRolePermissions, updateRolePermissions } from '../api'
import type { Permission, RoleInfo, RolePermission } from '../types'
import { Check, Grid2x2, KeyRound, Lock, PenLine, RotateCcw, Save, Search, Users } from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'

type LensKey = 'all' | 'diff' | 'held' | 'dirty'

const ACTION_LABELS: Record<string, string> = {
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

/** صلاحية «إدارة الصلاحيات» تُحجب عن مدير المدرسة منعاً للتلاعب — الحارس الأصلي حرفياً */
const isBlocked = (role: string, slug: string) => role === 'school_principal' && slug === 'admin.permissions'

export function AdminPermissionsPage() {
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [saving, setSaving] = useState(false)

  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [enabledPermissions, setEnabledPermissions] = useState<Map<number, RolePermission>>(new Map())

  /* لقطة آخر تحميل للدور المركّز — لحساب «غير محفوظة» وزر التراجع (عميل خالص) */
  const [baseline, setBaseline] = useState<Map<number, RolePermission>>(new Map())

  /* خرائط بقية الأدوار — قراءة فقط، تُغذّي أعمدة المقارنة في المصفوفة */
  const [otherRoles, setOtherRoles] = useState<Record<string, Set<number>>>({})

  /* حالات عرض */
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [lens, setLens] = useState<LensKey>('all')
  const [focusedPermission, setFocusedPermission] = useState<Permission | null>(null)

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
        setBaseline(new Map(permMap))
      }
    } catch (error) {
      console.error('Error loading role permissions:', error)
      alert('فشل تحميل صلاحيات الدور')
    } finally {
      setLoadingPermissions(false)
    }
  }

  /* قراءة بقية الأدوار للمقارنة — نفس نداء القراءة القائم، بلا كتابة */
  useEffect(() => {
    if (roles.length === 0) return
    let cancelled = false

    const loadOthers = async () => {
      for (const role of roles) {
        if (cancelled) return
        try {
          const data = await getRolePermissions(role.value)
          if (cancelled) return
          if (data.success) {
            setOtherRoles((prev) => ({
              ...prev,
              [role.value]: new Set(data.enabled_permissions.map((ep) => ep.permission_id)),
            }))
          }
        } catch {
          /* دور تعذّرت قراءته يبقى «؟» في المصفوفة — لا نخترع بيانات */
        }
      }
    }

    loadOthers()
    return () => { cancelled = true }
  }, [roles])

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

      newMap.set(permissionId, {
        ...current,
        actions: newActions,
      })
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
        // خريطة المقارنة للدور المحفوظ تُحدَّث كي لا يكذب عمودُه على نفسه
        setOtherRoles((prev) => ({
          ...prev,
          [selectedRole]: new Set(Array.from(enabledPermissions.keys())),
        }))
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      alert('فشل حفظ الصلاحيات ❌')
    } finally {
      setSaving(false)
    }
  }

  const selectedRoleInfo = roles.find(r => r.value === selectedRole)

  /* ── مشتقات العرض ── */
  const flatPermissions = useMemo(() => Object.values(allPermissions).flat(), [allPermissions])
  const totalPermissions = flatPermissions.length
  const heldCount = flatPermissions.filter((p) => enabledPermissions.has(p.id)).length
  const loadedRoles = Object.keys(otherRoles).length

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    Object.entries(allPermissions).forEach(([key, perms]) => {
      map.set(key, perms[0]?.category_ar || key)
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [allPermissions])

  /** أي صلاحية اختلف حاملوها عن الأساس؟ */
  const dirtyIds = useMemo(() => {
    const ids = new Set<number>()
    flatPermissions.forEach((p) => {
      const now = enabledPermissions.get(p.id)
      const before = baseline.get(p.id)
      if (Boolean(now) !== Boolean(before)) { ids.add(p.id); return }
      if (now && before) {
        const a = [...(now.actions ?? [])].sort().join(',')
        const b = [...(before.actions ?? [])].sort().join(',')
        if (a !== b) ids.add(p.id)
      }
    })
    return ids
  }, [flatPermissions, enabledPermissions, baseline])

  /** الصلاحية التي لا تتفق فيها الأدوار المقروءة — جوهر سؤال المقارنة */
  const isDiffAcrossRoles = (permissionId: number) => {
    const values = Object.entries(otherRoles).map(([roleValue, set]) => {
      const slug = flatPermissions.find((p) => p.id === permissionId)?.slug ?? ''
      if (isBlocked(roleValue, slug)) return null
      return set.has(permissionId)
    }).filter((v) => v !== null)
    if (values.length < 2) return false
    return values.some((v) => v !== values[0])
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.entries(allPermissions)
      .filter(([key]) => category === 'all' || key === category)
      .flatMap(([key, perms]) =>
        perms
          .filter((p) => {
            if (q && !`${p.name_ar} ${p.slug} ${p.description ?? ''}`.toLowerCase().includes(q)) return false
            if (lens === 'held' && !enabledPermissions.has(p.id)) return false
            if (lens === 'dirty' && !dirtyIds.has(p.id)) return false
            if (lens === 'diff' && !isDiffAcrossRoles(p.id)) return false
            return true
          })
          .map((p) => ({ permission: p, categoryKey: key, categoryAr: perms[0]?.category_ar || key })),
      )
  }, [allPermissions, category, search, lens, enabledPermissions, dirtyIds, otherRoles, flatPermissions])

  const focusedEnabled = focusedPermission ? enabledPermissions.get(focusedPermission.id) : undefined

  if (loading) {
    return (
      <WsPage>
        <WsHeader title="الصلاحيات" />
        <WsBlock fill>
          <WsEmpty loading>جاري تحميل البيانات...</WsEmpty>
        </WsBlock>
      </WsPage>
    )
  }

  return (
    <WsPage>
      <WsHeader
        title="الصلاحيات"
        badge={selectedRoleInfo?.label}
        actions={
          <>
            <WsBtn
              icon={RotateCcw}
              onClick={() => setEnabledPermissions(new Map(baseline))}
              disabled={dirtyIds.size === 0 || saving}
            >
              تراجع
            </WsBtn>
            <WsBtn variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : dirtyIds.size > 0 ? `حفظ ${dirtyIds.size} تغيير` : 'حفظ التغييرات'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={KeyRound} label="صلاحية">{totalPermissions}</WsFact>
            <WsFact icon={Users} label="أدوار">{roles.length}</WsFact>
            <WsFact icon={Check} label={`يحملها ${selectedRoleInfo?.label ?? '—'}`}>
              <span style={{ color: TONES.green.tx }}>{heldCount}/{totalPermissions}</span>
            </WsFact>
            {dirtyIds.size > 0 && (
              <WsFact icon={PenLine} label="غير محفوظة">
                <span className="ws-soft-pulse" style={{ color: TONES.amber.tx }}>{dirtyIds.size}</span>
              </WsFact>
            )}
            {loadedRoles < roles.length && (
              <WsFact icon={Grid2x2} label="أدوار مقروءة">{loadedRoles}/{roles.length}</WsFact>
            )}
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في 64 صلاحية بالاسم أو المعرّف..."
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
          </div>
        </WsField>

        <WsField label="الفئة">
          <WsSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">كل الفئات</option>
            {categories.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </WsSelect>
        </WsField>

        <WsField label="العدسة">
          <div className="ws-seg">
            {([
              ['all', 'الكل'],
              ['diff', 'المختلف بين الأدوار'],
              ['held', 'يحملها المركّز'],
              ['dirty', 'معدّلة'],
            ] as Array<[LensKey, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ws-seg__btn ${lens === value ? 'is-active' : ''}`}
                onClick={() => setLens(value)}
              >
                {label}
                {value === 'dirty' && dirtyIds.size > 0 && <span className="ws-count">{dirtyIds.size}</span>}
              </button>
            ))}
          </div>
        </WsField>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* ★ مصفوفة الحَمَلة — صلاحية × سبعة أدوار: الفرق بين دورين يُقرأ بالمسح البصري */}
          <WsBlock fill title="مصفوفة الحَمَلة" icon={Grid2x2} count={rows.length}>
            {loadingPermissions ? (
              <WsEmpty loading>جاري جلب قائمة الصلاحيات...</WsEmpty>
            ) : rows.length === 0 ? (
              <WsEmpty icon={KeyRound}>
                <p style={{ margin: 0 }}>لا صلاحيات مطابقة</p>
                {(search || category !== 'all' || lens !== 'all') && (
                  <WsBtn
                    size="sm"
                    icon={RotateCcw}
                    style={{ marginTop: 8 }}
                    onClick={() => { setSearch(''); setCategory('all'); setLens('all') }}
                  >
                    مسح المرشحات
                  </WsBtn>
                )}
              </WsEmpty>
            ) : (
              <div className="ws-tablewrap">
                <table className="ws-table ws-matrix">
                  <thead>
                    <tr>
                      <th className="ws-matrix__stick" style={{ minWidth: 240, textAlign: 'right' }}>الصلاحية</th>
                      {roles.map((role) => {
                        const isFocused = role.value === selectedRole
                        return (
                          <th key={role.value} style={{ minWidth: 68, padding: 3 }}>
                            {/* رأس الجدول هو منتقي الأدوار — فيسقط قسم كامل كان يفعل هذا بثلث الشاشة */}
                            <button
                              type="button"
                              onClick={() => setSelectedRole(role.value)}
                              title={role.label}
                              style={{
                                width: '100%',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 2px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 10,
                                fontWeight: isFocused ? 800 : 600,
                                lineHeight: 1.4,
                                background: isFocused ? 'var(--ws-accent)' : 'transparent',
                                color: isFocused ? '#fff' : 'var(--ws-text-2)',
                              }}
                            >
                              <span style={{ display: 'block', fontSize: 13 }}>{role.icon}</span>
                              <span style={{ display: 'block' }}>{role.label}</span>
                            </button>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ permission, categoryAr }) => {
                      const isFocusedRow = focusedPermission?.id === permission.id
                      const isDirty = dirtyIds.has(permission.id)
                      return (
                        <tr
                          key={permission.id}
                          className={`is-clickable ${isFocusedRow ? 'is-selected' : ''}`}
                          onClick={() => setFocusedPermission(permission)}
                          style={!isFocusedRow && isDirty ? { background: TONES.amber.bg } : undefined}
                        >
                          <td className="ws-matrix__stick" style={{ textAlign: 'right' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {permission.icon && <span style={{ fontSize: 13, flexShrink: 0 }}>{permission.icon}</span>}
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontWeight: 600 }}>{permission.name_ar}</span>
                                <span className="ws-cell-sub" style={{ direction: 'ltr', textAlign: 'right' }}>
                                  {permission.slug} · {categoryAr}
                                </span>
                              </span>
                              {isDirty && <PenLine style={{ width: 11, height: 11, color: TONES.amber.tx, flexShrink: 0 }} />}
                            </span>
                          </td>
                          {roles.map((role) => {
                            const blocked = isBlocked(role.value, permission.slug)
                            const isFocusedRole = role.value === selectedRole
                            const set = otherRoles[role.value]
                            const held = isFocusedRole ? enabledPermissions.has(permission.id) : set?.has(permission.id)
                            const unknown = !isFocusedRole && !set

                            return (
                              <td key={role.value} style={{ padding: 3 }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={!isFocusedRole || blocked}
                                  onClick={() => {
                                    if (!isFocusedRole || blocked) return
                                    togglePermission(permission.id, permission)
                                    setFocusedPermission(permission)
                                  }}
                                  title={
                                    blocked
                                      ? 'محجوبة عن مدير المدرسة منعاً للتلاعب'
                                      : unknown
                                        ? 'لم يُقرأ هذا الدور بعد'
                                        : `${role.label}: ${held ? 'يحملها' : 'لا يحملها'}${isFocusedRole ? ' — اضغط للتبديل' : ''}`
                                  }
                                  style={{
                                    width: '100%',
                                    minHeight: 28,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                    border: isFocusedRole ? '1px solid var(--ws-border)' : 'none',
                                    background: isFocusedRole && held ? TONES.green.bg : 'transparent',
                                    cursor: isFocusedRole && !blocked ? 'pointer' : 'default',
                                    padding: 0,
                                  }}
                                >
                                  {blocked ? (
                                    <Lock style={{ width: 11, height: 11, color: 'var(--ws-text-2)', opacity: 0.5 }} />
                                  ) : unknown ? (
                                    <span style={{ fontSize: 10, color: 'var(--ws-text-2)', opacity: 0.4 }}>؟</span>
                                  ) : held ? (
                                    /* نقطة صلبة = يحملها */
                                    <span
                                      style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        background: isFocusedRole ? TONES.green.tx : 'var(--ws-text-2)',
                                        opacity: isFocusedRole ? 1 : 0.55,
                                      }}
                                    />
                                  ) : (
                                    /* حلقة فارغة = لا يحملها */
                                    <span
                                      style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        border: '1px solid var(--ws-border)',
                                      }}
                                    />
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* الإجراءات الفرعية للصلاحية المركّزة — كانت مبعثرة تحت 64 بطاقة */}
        <WsSideCol
          side="end"
          title={focusedPermission ? focusedPermission.name_ar : 'الإجراءات'}
          icon={KeyRound}
          storageKey="ws:permissions:sidecol"
          width={320}
        >
          <WsBlock fill scroll>
            {!focusedPermission ? (
              <WsEmpty icon={KeyRound}>اضغط صلاحية في المصفوفة لضبط إجراءاتها</WsEmpty>
            ) : (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800 }}>{focusedPermission.name_ar}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'monospace', color: 'var(--ws-text-2)', direction: 'ltr', textAlign: 'right' }}>
                    {focusedPermission.slug}
                  </p>
                  {focusedPermission.description && (
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
                      {focusedPermission.description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    border: '1px solid var(--ws-border)',
                    borderRadius: 10,
                    padding: 9,
                    background: focusedEnabled ? TONES.green.bg : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {selectedRoleInfo?.label} {focusedEnabled ? 'يحملها' : 'لا يحملها'}
                  </span>
                  {isBlocked(selectedRole ?? '', focusedPermission.slug) ? (
                    <ToneChip tone={TONES.gray}>محجوبة</ToneChip>
                  ) : (
                    <WsBtn
                      size="sm"
                      icon={focusedEnabled ? Check : undefined}
                      onClick={() => togglePermission(focusedPermission.id, focusedPermission)}
                      style={focusedEnabled
                        ? { color: TONES.green.tx, borderColor: TONES.green.bd, background: TONES.green.bg }
                        : undefined}
                    >
                      {focusedEnabled ? 'مفعّلة' : 'تفعيل'}
                    </WsBtn>
                  )}
                </div>

                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>الإجراءات الفرعية</p>
                  {focusedPermission.actions && focusedPermission.actions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, opacity: focusedEnabled ? 1 : 0.45 }}>
                      {focusedPermission.actions.map((action) => {
                        const isActive = (focusedEnabled?.actions ?? []).includes(action)
                        return (
                          <button
                            key={action}
                            type="button"
                            className="ws-chip"
                            disabled={!focusedEnabled}
                            onClick={() => focusedEnabled && toggleAction(focusedPermission.id, action)}
                            style={isActive
                              ? { background: TONES.green.bg, borderColor: TONES.green.tx, color: TONES.green.tx }
                              : undefined}
                          >
                            {ACTION_LABELS[action] || action}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>لا توجد إجراءات فرعية</p>
                  )}
                  {!focusedEnabled && (
                    <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      فعّل الصلاحية أولاً لضبط إجراءاتها
                    </p>
                  )}
                </div>

                {/* من يحملها من الأدوار — الجواب الذي جاء المدير لأجله */}
                <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 8 }}>
                  <p className="ws-label" style={{ marginBottom: 5 }}>من يحملها</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {roles.map((role) => {
                      const blocked = isBlocked(role.value, focusedPermission.slug)
                      const set = otherRoles[role.value]
                      const isFocusedRole = role.value === selectedRole
                      const held = isFocusedRole ? enabledPermissions.has(focusedPermission.id) : set?.has(focusedPermission.id)
                      const unknown = !isFocusedRole && !set
                      return (
                        <span
                          key={role.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11.5,
                            padding: '3px 5px',
                            borderRadius: 6,
                            background: isFocusedRole ? 'var(--ws-accent-soft)' : 'transparent',
                          }}
                        >
                          {blocked ? (
                            <Lock style={{ width: 10, height: 10, color: 'var(--ws-text-2)', opacity: 0.5, flexShrink: 0 }} />
                          ) : unknown ? (
                            <span style={{ width: 8, height: 8, flexShrink: 0, textAlign: 'center', fontSize: 9, color: 'var(--ws-text-2)' }}>؟</span>
                          ) : (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: held ? TONES.green.tx : 'transparent',
                                border: held ? 'none' : '1px solid var(--ws-border)',
                              }}
                            />
                          )}
                          <span style={{ flex: 1, color: isFocusedRole ? 'var(--ws-accent)' : undefined, fontWeight: isFocusedRole ? 700 : 400 }}>
                            {role.label}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
