import { USER_ROLES } from '@/modules/auth/constants/roles'
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
  Copy,
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
  TONES,
  InitialAvatar,
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
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
  type Tone,
  type WsChipTone,
} from '@/shared/workspace'
import { DayCard, chip } from './dashboard-ui'

/**
 * ألوانُ الأدوار — مشتقّةٌ من `USER_ROLES` لا مسرودةً هنا.
 *
 * `WsChipTone` يقبل أربعَ نبراتٍ فقط، فما خرج عنها (`purple` و`gray`) يسقط إلى
 * شريحةٍ محايدة — وهو ما كانت تفعله القائمةُ اليدويّة بـ`undefined`.
 */
const CHIP_TONES = new Set<string>(['green', 'red', 'amber', 'sky'])

const ROLE_TONES: Record<string, WsChipTone | undefined> = Object.fromEntries(
  Object.values(USER_ROLES).map((r) => [
    r.value,
    CHIP_TONES.has(r.color ?? '') ? (r.color as WsChipTone) : undefined,
  ]),
)

const ROLE_LEGEND = ROLE_OPTIONS.map((r) => ({ role: r.value as string, label: r.label }))

/** لون الصورة الرمزية يتبع لون الدور نفسه — العين تربط الاسم بدوره فوراً */
function roleAvatarTone(role: string): Tone {
  const chipTone = ROLE_TONES[role]
  return chipTone ? TONES[chipTone] : TONES.gray
}

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
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
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
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherRecord | null>(null)
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
    const dual = teachers.filter((teacher) => teacher.secondary_role).length
    const needsPassword = teachers.filter((teacher) => teacher.needs_password_change).length
    return { total, active, inactive: total - active, dual, needsPassword }
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
    setDeletingTeacher(teacher)
  }

  const confirmDelete = () => {
    if (!deletingTeacher) return
    deleteTeacherMutation.mutate(deletingTeacher.id, {
      onSuccess: () => {
        if (selectedTeacher?.id === deletingTeacher.id) setSelectedTeacher(null)
        setDeletingTeacher(null)
      },
    })
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
    await handleCopyText(
      `الهوية: ${entry.credentials.national_id}\nكلمة المرور: ${entry.credentials.password}`,
      'بيانات الدخول',
    )
  }

  /** نسخ نص واحد مع تغذية راجعة — يخدم أزرار النسخ الصغيرة في بطاقة المعلم */
  const handleCopyText = async (text: string, label: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast({ type: 'error', title: 'النسخ غير مدعوم في المتصفح الحالي' })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast({ type: 'success', title: `تم نسخ ${label}` })
    } catch {
      toast({ type: 'error', title: 'تعذر النسخ تلقائيًا، يرجى النسخ يدويًا' })
    }
  }

  const isFormSubmitting = createTeacherMutation.isPending || updateTeacherMutation.isPending

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="إدارة المعلمين"
        badge="الحسابات والصلاحيات"
        actions={
          <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
            إضافة معلم
          </WsBtn>
        }
      >
        {/* البحث والفلاتر في شريط العنوان نفسه — لا شريط منفصل تحته */}
        <span className="ws-header__filters">
          <WsInput
            id="ws-teachers-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="الاسم أو الهوية أو الجوال"
            aria-label="بحث بالاسم أو الهوية أو الجوال"
            style={{ width: 'min(230px, 60vw)' }}
          />
          <WsSelect
            id="ws-teachers-status"
            aria-label="فلتر الحالة"
            title="فلتر الحالة"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
          </WsSelect>
          <WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => refetch()} disabled={isFetching} />
        </span>
      </WsHeader>

      <WsLayout>
        <WsMain>
          {/* حصيلة الكادر — لغة الإغناء: باستيل + رقاقة بيضاء + علامة مائية */}
          <WsBlock padded>
            <div className="ws-dashboard-cards">
              <DayCard
                icon={Users}
                label="المعلمون"
                value={stats.total}
                tone={TONES.sky}
                hero
                context={stats.dual > 0 ? `منهم ${stats.dual} بدور مزدوج` : 'كادر المدرسة كاملاً'}
                zeroContext="لم يُسجَّل معلمون بعد"
              />
              <DayCard
                icon={UserCheck}
                label="نشطون"
                value={stats.active}
                tone={TONES.green}
                context="يستطيعون الدخول الآن"
                zeroContext="لا حسابات نشطة"
              />
              <DayCard
                icon={UserX}
                label="موقوفون"
                value={stats.inactive}
                tone={TONES.red}
                context="حساباتهم معلّقة عن الدخول"
                zeroContext="لا حسابات موقوفة"
              />
              <DayCard
                icon={KeyRound}
                label="لم يغيّروا كلمة المرور"
                value={stats.needsPassword}
                tone={TONES.amber}
                context="ما زالوا على الكلمة المولَّدة"
                zeroContext="الكل غيّر كلمته"
              />
            </div>
          </WsBlock>

          <WsBlock title="المعلمون" icon={Users} count={filteredTeachers.length.toLocaleString('ar-SA-u-nu-latn')} fill>
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
                  {filteredTeachers.map((teacher, i) => {
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
                        className={`is-clickable ws-tbl-rise ${isSelected ? 'is-selected' : ''}`}
                        style={{
                          animationDelay: `${Math.min(i * 25, 250)}ms`,
                          ...(!isSelected && teacher.secondary_role ? { background: chip(TONES.amber) } : null),
                        }}
                      >
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <InitialAvatar name={teacher.name} tone={roleAvatarTone(teacher.role)} size={26} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 600 }}>{teacher.name}</span>
                              {teacher.needs_password_change ? (
                                <span className="ws-cell-sub" style={{ color: 'var(--ws-amber)', fontWeight: 700 }}>
                                  يحتاج تغيير كلمة المرور
                                </span>
                              ) : null}
                            </span>
                          </span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <InitialAvatar name={selectedTeacher.name} tone={roleAvatarTone(selectedTeacher.role)} size={40} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{selectedTeacher.name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', marginTop: 1 }}>
                      {getRoleLabel(selectedTeacher.role)}
                      {selectedTeacher.secondary_role ? ` · ${getRoleLabel(selectedTeacher.secondary_role)}` : ''}
                    </span>
                  </span>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--ws-amber)' }}>
                          {selectedTeacher.generated_password}
                        </span>
                        <WsIconBtn
                          icon={Copy}
                          label="نسخ كلمة المرور الأساسية"
                          onClick={() =>
                            void handleCopyText(selectedTeacher.generated_password ?? '', 'كلمة المرور الأساسية')
                          }
                        />
                      </span>
                    </WsFactRow>
                  )}
                  {selectedTeacher.secondary_generated_password && (
                    <WsFactRow label="كلمة المرور الثانوية">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--ws-accent)' }}>
                          {selectedTeacher.secondary_generated_password}
                        </span>
                        <WsIconBtn
                          icon={Copy}
                          label="نسخ كلمة المرور الثانوية"
                          onClick={() =>
                            void handleCopyText(
                              selectedTeacher.secondary_generated_password ?? '',
                              'كلمة المرور الثانوية',
                            )
                          }
                        />
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
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
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
                {credentialsLog.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="ws-tbl-rise"
                    style={{ animationDelay: `${Math.min(i * 40, 240)}ms`, padding: '7px 12px', borderBottom: '1px solid var(--ws-hairline)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}>{entry.teacherName}</span>
                      <WsBtn size="sm" onClick={() => handleCopyCredentials(entry)}>
                        نسخ
                      </WsBtn>
                    </div>
                    <p style={{ margin: '2px 0 4px', fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                      {formatDate(entry.issuedAt)}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        fontFamily: 'monospace',
                        fontSize: 12.5,
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

      {/* مودال الحذف — يعرض البديل الأرحم (الإيقاف) قبل الفعلة النهائية */}
      {deletingTeacher && (
        <div
          className="ws-modal"
          onClick={() => {
            if (!deleteTeacherMutation.isPending) setDeletingTeacher(null)
          }}
        >
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف «{deletingTeacher.name}»</h3>
              <p className="ws-modal__sub">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="error" boxed icon={AlertTriangle}>
                سيُحذف حساب المعلم نهائياً من النظام. إن كان غيابه مؤقتاً فالإيقاف أرحم —
                يبقي الحساب ويمنع الدخول فقط.
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setDeletingTeacher(null)} disabled={deleteTeacherMutation.isPending}>
                إلغاء
              </WsBtn>
              <WsBtn
                onClick={() => {
                  handleToggleStatus(deletingTeacher)
                  setDeletingTeacher(null)
                }}
                disabled={deleteTeacherMutation.isPending}
              >
                {deletingTeacher.status === 'active' ? 'إيقاف بدل الحذف' : 'تفعيل'}
              </WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                onClick={confirmDelete}
                disabled={deleteTeacherMutation.isPending}
              >
                {deleteTeacherMutation.isPending ? 'جارٍ الحذف...' : 'حذف نهائي'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

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
