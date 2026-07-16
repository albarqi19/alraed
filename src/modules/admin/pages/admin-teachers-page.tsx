import { useMemo, useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import {
  KeyRound,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UserX,
  Info,
  AlertTriangle,
} from 'lucide-react'
import {
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
  useResetTeacherPasswordMutation,
  useTeachersQuery,
  useUpdateTeacherMutation,
} from '../hooks'
import type { TeacherCredentials, TeacherRecord, TeacherStatus, StaffRole } from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import { ROLE_OPTIONS, getRoleLabel } from '@/modules/auth/constants/roles'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'

// ألوان الأدوار بدرجات النظام (theme-safe)
const ROLE_TONES: Record<string, WsChipTone | undefined> = {
  teacher: undefined,
  school_principal: 'sky',
  deputy_teachers: 'sky',
  deputy_students: 'sky',
  student_counselor: 'green',
  administrative_staff: undefined,
  learning_resources_admin: 'amber',
  health_counselor: 'red',
}

const ROLE_LEGEND = [
  { role: 'school_principal', label: 'مدير' },
  { role: 'deputy_teachers', label: 'وكيل المدرسة' },
  { role: 'deputy_students', label: 'وكيل الطلاب' },
  { role: 'student_counselor', label: 'موجه طلابي' },
  { role: 'learning_resources_admin', label: 'أمين مصادر' },
  { role: 'health_counselor', label: 'موجه صحي' },
  { role: 'teacher', label: 'معلم' },
]

type StatusFilter = 'all' | TeacherStatus

interface TeacherFormValues {
  name: string
  national_id: string
  phone: string
  role: StaffRole
  secondary_role?: StaffRole | null
  status: TeacherStatus
}

interface TeacherFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: TeacherFormValues) => void
  isSubmitting: boolean
  teacher?: TeacherRecord | null
}

interface CredentialsEntry {
  id: string
  teacherName: string
  credentials: TeacherCredentials
  issuedAt: string
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function TeacherStatusChip({ status }: { status: TeacherStatus }) {
  const isActive = status === 'active'
  return (
    <WsChip tone={isActive ? 'green' : 'red'} icon={isActive ? UserCheck : UserX}>
      {isActive ? 'نشط' : 'موقوف'}
    </WsChip>
  )
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return <span style={{ fontSize: 11, color: 'var(--ws-red)', fontWeight: 600 }}>{message}</span>
}

function TeacherFormDialog({ open, onClose, onSubmit, isSubmitting, teacher }: TeacherFormDialogProps) {
  const [values, setValues] = useState<TeacherFormValues>({
    name: teacher?.name ?? '',
    national_id: teacher?.national_id ?? '',
    phone: teacher?.phone ?? '',
    role: teacher?.role ?? 'teacher',
    secondary_role: teacher?.secondary_role ?? null,
    status: teacher?.status ?? 'active',
  })
  const [errors, setErrors] = useState<Record<keyof TeacherFormValues, string | null>>({
    name: null,
    national_id: null,
    phone: null,
    role: null,
    secondary_role: null,
    status: null,
  })

  useEffect(() => {
    if (open) {
      setValues({
        name: teacher?.name ?? '',
        national_id: teacher?.national_id ?? '',
        phone: teacher?.phone ?? '',
        role: teacher?.role ?? 'teacher',
        secondary_role: teacher?.secondary_role ?? null,
        status: teacher?.status ?? 'active',
      })
      setErrors({ name: null, national_id: null, phone: null, role: null, secondary_role: null, status: null })
    }
  }, [open, teacher])

  const validate = () => {
    const name = values.name.trim()
    const nationalId = values.national_id.trim()
    const phone = values.phone.trim()
    const nextErrors: Record<keyof TeacherFormValues, string | null> = {
      name: null,
      national_id: null,
      phone: null,
      role: null,
      secondary_role: null,
      status: null,
    }

    if (!name) {
      nextErrors.name = 'الرجاء إدخال اسم المعلم'
    } else if (name.length < 3) {
      nextErrors.name = 'اسم المعلم يجب أن يكون 3 أحرف أو أكثر'
    }

    if (!nationalId) {
      nextErrors.national_id = 'الرجاء إدخال رقم الهوية'
    } else if (!/^\d{10}$/.test(nationalId)) {
      nextErrors.national_id = 'رقم الهوية يجب أن يتكون من 10 أرقام'
    }

    if (phone && !/^\d{9,15}$/.test(phone)) {
      nextErrors.phone = 'رقم الجوال يجب أن يحتوي على أرقام فقط (9-15 خانة)'
    }

    setErrors(nextErrors)
    return Object.values(nextErrors).every((error) => !error)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    onSubmit({
      name: values.name.trim(),
      national_id: values.national_id.trim(),
      phone: values.phone.trim(),
      role: values.role,
      secondary_role: values.secondary_role,
      status: values.status,
    })
  }

  if (!open) return null

  const errorStyle = { borderColor: 'var(--ws-red)' }

  return (
    <div className="ws-modal" onClick={() => !isSubmitting && onClose()}>
      <form
        className="ws-modal__panel"
        style={{ maxWidth: 460 }}
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{teacher ? `تعديل: ${teacher.name}` : 'إضافة معلم جديد'}</h3>
          <p className="ws-modal__sub">
            {teacher ? 'تحديث البيانات' : 'سيتم إنشاء كلمة مرور افتراضية تلقائياً'}
          </p>
        </header>

        <div className="ws-modal__body">
          <WsField label="اسم المعلم" htmlFor="teacher-name">
            <WsInput
              id="teacher-name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              disabled={isSubmitting}
              placeholder="مثال: أحمد محمد"
              autoFocus
              style={errors.name ? errorStyle : undefined}
            />
            <FieldError message={errors.name} />
          </WsField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WsField label="رقم الهوية" htmlFor="teacher-national-id">
              <WsInput
                id="teacher-national-id"
                type="text"
                inputMode="numeric"
                value={values.national_id}
                onChange={(event) => setValues((prev) => ({ ...prev, national_id: event.target.value }))}
                disabled={isSubmitting}
                placeholder="10 أرقام"
                style={errors.national_id ? errorStyle : undefined}
              />
              <FieldError message={errors.national_id} />
            </WsField>

            <WsField label="رقم الجوال" htmlFor="teacher-phone">
              <WsInput
                id="teacher-phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
                disabled={isSubmitting}
                placeholder="05XXXXXXXX"
                style={errors.phone ? errorStyle : undefined}
              />
              <FieldError message={errors.phone} />
            </WsField>
          </div>

          <WsField label="الدور الوظيفي" htmlFor="teacher-role">
            <WsSelect
              id="teacher-role"
              value={values.role}
              onChange={(event) => setValues((prev) => ({ ...prev, role: event.target.value as StaffRole }))}
              disabled={isSubmitting}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </WsSelect>
          </WsField>

          <WsField label="الدور الثانوي (اختياري — تُولَّد له كلمة مرور منفصلة)" htmlFor="teacher-secondary-role">
            <WsSelect
              id="teacher-secondary-role"
              value={values.secondary_role ?? ''}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  secondary_role: event.target.value ? (event.target.value as StaffRole) : null,
                }))
              }
              disabled={isSubmitting}
            >
              <option value="">بدون دور ثانوي</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value} disabled={role.value === values.role}>
                  {role.label}
                </option>
              ))}
            </WsSelect>
          </WsField>

          <WsField label="حالة المعلم" htmlFor="teacher-status">
            <WsSelect
              id="teacher-status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as TeacherStatus }))}
              disabled={isSubmitting}
            >
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </WsSelect>
          </WsField>
        </div>

        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="primary" icon={teacher ? Pencil : Plus} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : teacher ? 'حفظ التعديلات' : 'إضافة المعلم'}
          </WsBtn>
        </footer>
      </form>
    </div>
  )
}

export function AdminTeachersPage() {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null)
  const [credentialsLog, setCredentialsLog] = useState<CredentialsEntry[]>([])

  const { data, isLoading, isError, refetch, isFetching } = useTeachersQuery()
  const teachers = useMemo(() => data ?? [], [data])

  const createTeacherMutation = useCreateTeacherMutation()
  const updateTeacherMutation = useUpdateTeacherMutation()
  const deleteTeacherMutation = useDeleteTeacherMutation()
  const resetPasswordMutation = useResetTeacherPasswordMutation()

  const stats = useMemo(() => {
    const total = teachers.length
    const active = teachers.filter((teacher) => teacher.status === 'active').length
    return { total, active, inactive: total - active }
  }, [teachers])

  const filteredTeachers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return teachers.filter((teacher) => {
      const matchesQuery = !query
        ? true
        : [teacher.name, teacher.national_id, teacher.phone ?? '']
          .map((value) => value?.toLowerCase?.() ?? '')
          .some((value) => value.includes(query))
      const matchesStatus = statusFilter === 'all' ? true : teacher.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [teachers, searchTerm, statusFilter])

  const handleAdd = () => {
    setEditingTeacher(null)
    setIsFormOpen(true)
  }

  const handleEdit = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher)
    setIsFormOpen(true)
  }

  const appendCredentials = (teacherName: string, credentials: TeacherCredentials) => {
    setCredentialsLog((prev) => [
      {
        id: `${credentials.national_id}-${Date.now()}`,
        teacherName,
        credentials,
        issuedAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 8))
  }

  const handleFormSubmit = (values: TeacherFormValues) => {
    if (editingTeacher) {
      updateTeacherMutation.mutate(
        {
          id: editingTeacher.id,
          payload: {
            name: values.name,
            national_id: values.national_id,
            phone: values.phone ? values.phone : null,
            role: values.role,
            secondary_role: values.secondary_role || null,
            status: values.status,
          },
        },
        {
          onSuccess: (response) => {
            setIsFormOpen(false)
            setEditingTeacher(null)
            if (response.secondary_login_credentials) {
              appendCredentials(
                `${response.name} (${response.secondary_login_credentials.role})`,
                response.secondary_login_credentials,
              )
            }
          },
        },
      )
    } else {
      createTeacherMutation.mutate(
        {
          name: values.name,
          national_id: values.national_id,
          phone: values.phone ? values.phone : undefined,
          role: values.role,
          secondary_role: values.secondary_role || undefined,
        },
        {
          onSuccess: (response) => {
            setIsFormOpen(false)
            if (response.login_credentials) {
              appendCredentials(response.teacher.name, response.login_credentials)
            }
            if (response.secondary_login_credentials) {
              appendCredentials(
                `${response.teacher.name} (${response.secondary_login_credentials.role})`,
                response.secondary_login_credentials,
              )
            }
          },
        },
      )
    }
  }

  const handleDelete = (teacher: TeacherRecord) => {
    const confirmed = window.confirm(`هل ترغب بحذف المعلم ${teacher.name}؟ هذا الإجراء لا يمكن التراجع عنه.`)
    if (!confirmed) return
    deleteTeacherMutation.mutate(teacher.id)
  }

  const handleToggleStatus = (teacher: TeacherRecord) => {
    const nextStatus: TeacherStatus = teacher.status === 'active' ? 'inactive' : 'active'
    updateTeacherMutation.mutate({ id: teacher.id, payload: { status: nextStatus } })
  }

  const handleResetPassword = (teacher: TeacherRecord) => {
    resetPasswordMutation.mutate(teacher.id, {
      onSuccess: (credentials) => {
        appendCredentials(teacher.name, credentials)
      },
    })
  }

  const handleCopyCredentials = async (entry: CredentialsEntry) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast({ type: 'error', title: 'النسخ غير مدعوم في المتصفح الحالي' })
      return
    }
    try {
      await navigator.clipboard.writeText(`الهوية: ${entry.credentials.national_id}\nكلمة المرور: ${entry.credentials.password}`)
      toast({ type: 'success', title: 'تم نسخ بيانات الدخول' })
    } catch {
      toast({ type: 'error', title: 'تعذر النسخ تلقائيًا، يرجى النسخ يدويًا' })
    }
  }

  const isFormSubmitting = createTeacherMutation.isPending || updateTeacherMutation.isPending

  return (
    <WsPage>
      <WsHeader
        title="إدارة المعلمين"
        badge="الحسابات والصلاحيات"
        actions={
          <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
            إضافة معلم
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Users} label="الإجمالي:">
              {stats.total.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={UserCheck} label="نشطون:">
              {stats.active.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={UserX} label="موقوفون:">
              {stats.inactive.toLocaleString('ar-SA')}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث بالاسم أو الهوية أو الجوال" htmlFor="ws-teachers-search" grow>
          <WsInput
            id="ws-teachers-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="بحث..."
          />
        </WsField>
        <WsField label="الحالة" htmlFor="ws-teachers-status">
          <WsSelect
            id="ws-teachers-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
          </WsSelect>
        </WsField>
        <WsBtn icon={RefreshCw} onClick={() => refetch()} disabled={isFetching}>
          تحديث
        </WsBtn>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock title="المعلمون" icon={Users} count={filteredTeachers.length.toLocaleString('ar-SA')} fill>
            {isLoading ? (
              <WsEmpty loading>جاري تحميل قائمة المعلمين...</WsEmpty>
            ) : isError ? (
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل قائمة المعلمين.
                <WsBtn size="sm" icon={RefreshCw} onClick={() => refetch()}>
                  إعادة المحاولة
                </WsBtn>
              </WsEmpty>
            ) : filteredTeachers.length === 0 ? (
              <WsEmpty icon={Users}>
                لا توجد بيانات مطابقة — عدّل البحث أو أضف معلمين جدد.
                <WsBtn size="sm" icon={Plus} onClick={handleAdd}>
                  إضافة معلم
                </WsBtn>
              </WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th>الهوية</th>
                    <th>الدور</th>
                    <th>الجوال</th>
                    <th>الحالة</th>
                    <th>آخر تحديث</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => {
                    const isDeleting = deleteTeacherMutation.isPending && deleteTeacherMutation.variables === teacher.id
                    const isToggling =
                      updateTeacherMutation.isPending &&
                      (updateTeacherMutation.variables as { id: number } | undefined)?.id === teacher.id
                    const isResetting =
                      resetPasswordMutation.isPending && resetPasswordMutation.variables === teacher.id
                    const isSelected = selectedTeacher?.id === teacher.id

                    return (
                      <tr
                        key={teacher.id}
                        onClick={() => setSelectedTeacher(teacher)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                        style={!isSelected && teacher.secondary_role ? { background: 'var(--ws-amber-bg)' } : undefined}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{teacher.name}</span>
                          {teacher.needs_password_change ? (
                            <span className="ws-cell-sub" style={{ color: 'var(--ws-amber)', fontWeight: 700 }}>
                              يحتاج تغيير كلمة المرور
                            </span>
                          ) : null}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{teacher.national_id}</td>
                        <td>
                          <WsChip tone={ROLE_TONES[teacher.role]}>{getRoleLabel(teacher.role)}</WsChip>
                          {teacher.secondary_role && (
                            <span className="ws-cell-sub">+ {getRoleLabel(teacher.secondary_role)}</span>
                          )}
                        </td>
                        <td>{teacher.phone ?? '—'}</td>
                        <td>
                          <TeacherStatusChip status={teacher.status} />
                        </td>
                        <td style={{ color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>
                          {formatDate(teacher.updated_at ?? teacher.created_at)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <span style={{ display: 'inline-flex', gap: 2 }}>
                            <WsIconBtn icon={Pencil} label="تعديل" onClick={() => handleEdit(teacher)} />
                            <WsIconBtn
                              icon={KeyRound}
                              label="إعادة كلمة المرور"
                              style={{ color: 'var(--ws-sky)' }}
                              onClick={() => handleResetPassword(teacher)}
                              disabled={isResetting}
                            />
                            <WsIconBtn
                              icon={teacher.status === 'active' ? Pause : Play}
                              label={teacher.status === 'active' ? 'إيقاف' : 'تفعيل'}
                              style={{ color: 'var(--ws-amber)' }}
                              onClick={() => handleToggleStatus(teacher)}
                              disabled={isToggling}
                            />
                            <WsIconBtn
                              icon={Trash2}
                              label="حذف"
                              style={{ color: 'var(--ws-red)' }}
                              onClick={() => handleDelete(teacher)}
                              disabled={isDeleting}
                            />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}

            {/* مفتاح ألوان الأدوار */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 5,
                padding: '6px 14px',
                borderTop: '1px solid var(--ws-hairline)',
              }}
            >
              {ROLE_LEGEND.map((item) => (
                <WsChip key={item.role} tone={ROLE_TONES[item.role]}>
                  {item.label}
                </WsChip>
              ))}
              <WsChip tone="amber">صف بخلفية كهرمانية = دور مزدوج</WsChip>
            </div>
          </WsBlock>
        </WsMain>

        <WsSideCol title="تفاصيل المعلم" icon={ListChecks} storageKey="ws:teachers:sidecol">
          {selectedTeacher ? (
            <>
              <WsBlock padded>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{selectedTeacher.name}</span>
                  <TeacherStatusChip status={selectedTeacher.status} />
                </div>
                <WsFactsList>
                  <WsFactRow label="رقم الهوية">
                    <span style={{ fontFamily: 'monospace' }}>{selectedTeacher.national_id}</span>
                  </WsFactRow>
                  <WsFactRow label="الدور الوظيفي">{getRoleLabel(selectedTeacher.role)}</WsFactRow>
                  {selectedTeacher.secondary_role && (
                    <WsFactRow label="الدور الثانوي">{getRoleLabel(selectedTeacher.secondary_role)}</WsFactRow>
                  )}
                  <WsFactRow label="رقم الجوال">{selectedTeacher.phone ?? '—'}</WsFactRow>
                  {selectedTeacher.generated_password && (
                    <WsFactRow label="كلمة المرور الأساسية">
                      <span style={{ fontFamily: 'monospace', color: 'var(--ws-amber)' }}>
                        {selectedTeacher.generated_password}
                      </span>
                    </WsFactRow>
                  )}
                  {selectedTeacher.secondary_generated_password && (
                    <WsFactRow label="كلمة المرور الثانوية">
                      <span style={{ fontFamily: 'monospace', color: 'var(--ws-accent)' }}>
                        {selectedTeacher.secondary_generated_password}
                      </span>
                    </WsFactRow>
                  )}
                </WsFactsList>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <WsBtn icon={Pencil} onClick={() => handleEdit(selectedTeacher)} style={{ flex: 1 }}>
                    تعديل
                  </WsBtn>
                  <WsBtn
                    icon={KeyRound}
                    onClick={() => handleResetPassword(selectedTeacher)}
                    disabled={resetPasswordMutation.isPending}
                    style={{ flex: 1 }}
                  >
                    إعادة كلمة المرور
                  </WsBtn>
                </div>
              </WsBlock>

              <WsBlock title="الفصول والمواد" padded>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                  سيتم عرض الفصول والمواد التي يدرسها المعلم هنا قريباً.
                </p>
              </WsBlock>
            </>
          ) : (
            <WsBlock padded>
              <WsEmpty icon={UserRound} style={{ padding: 12 }}>
                اختر معلماً من الجدول لعرض تفاصيله.
              </WsEmpty>
            </WsBlock>
          )}

          {/* سجل كلمات المرور الحديثة */}
          <WsBlock
            title="كلمات المرور الحديثة"
            icon={KeyRound}
            count={credentialsLog.length || undefined}
            tools={
              credentialsLog.length > 0 ? (
                <WsBtn size="sm" onClick={() => setCredentialsLog([])}>
                  مسح
                </WsBtn>
              ) : undefined
            }
            fill
            scroll
          >
            {credentialsLog.length === 0 ? (
              <WsEmpty icon={Info} style={{ padding: 16 }}>
                ستظهر هنا كلمات المرور بعد الإضافة أو إعادة التعيين.
              </WsEmpty>
            ) : (
              <div>
                {credentialsLog.map((entry) => (
                  <div key={entry.id} style={{ padding: '7px 12px', borderBottom: '1px solid var(--ws-hairline)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>{entry.teacherName}</span>
                      <WsBtn size="sm" onClick={() => handleCopyCredentials(entry)}>
                        نسخ
                      </WsBtn>
                    </div>
                    <p style={{ margin: '2px 0 4px', fontSize: 10, color: 'var(--ws-text-2)' }}>
                      {formatDate(entry.issuedAt)}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        background: 'var(--ws-surface-2)',
                        border: '1px solid var(--ws-hairline)',
                        borderRadius: 7,
                        padding: '5px 8px',
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>المعرف</span>
                        <span>{entry.credentials.national_id}</span>
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>كلمة المرور</span>
                        <b>{entry.credentials.password}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      <TeacherFormDialog
        open={isFormOpen}
        onClose={() => {
          if (isFormSubmitting) return
          setIsFormOpen(false)
          setEditingTeacher(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
        teacher={editingTeacher}
      />
    </WsPage>
  )
}
