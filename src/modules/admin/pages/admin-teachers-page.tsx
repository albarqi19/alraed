import { Users, UserCheck, UserX } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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

const ROLE_BADGE_STYLES: Record<string, string> = {
  teacher: 'bg-slate-100 text-slate-600 border-slate-200',
  school_principal: 'bg-blue-50 text-blue-700 border-blue-200',
  deputy_teachers: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  deputy_students: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  student_counselor: 'bg-green-50 text-green-700 border-green-200',
  administrative_staff: 'bg-slate-100 text-slate-500 border-slate-200',
  learning_resources_admin: 'bg-amber-50 text-amber-700 border-amber-200',
  health_counselor: 'bg-rose-50 text-rose-700 border-rose-200',
}

function getRoleBadgeStyle(role: string): string {
  return ROLE_BADGE_STYLES[role] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

const ROLE_LEGEND = [
  { role: 'school_principal', label: 'مدير', style: ROLE_BADGE_STYLES.school_principal },
  { role: 'deputy_teachers', label: 'وكيل المدرسة', style: ROLE_BADGE_STYLES.deputy_teachers },
  { role: 'deputy_students', label: 'وكيل الطلاب', style: ROLE_BADGE_STYLES.deputy_students },
  { role: 'student_counselor', label: 'موجه طلابي', style: ROLE_BADGE_STYLES.student_counselor },
  { role: 'learning_resources_admin', label: 'أمين مصادر', style: ROLE_BADGE_STYLES.learning_resources_admin },
  { role: 'health_counselor', label: 'موجه صحي', style: ROLE_BADGE_STYLES.health_counselor },
  { role: 'teacher', label: 'معلم', style: ROLE_BADGE_STYLES.teacher },
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

function TeacherStatusBadge({ status }: { status: TeacherStatus }) {
  const isActive = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
      {isActive ? 'نشط' : 'موقوف'}
    </span>
  )
}

function TeacherFormDialog({ open, onClose, onSubmit, isSubmitting, teacher }: TeacherFormDialogProps) {
  const defaultValues: TeacherFormValues = {
    name: teacher?.name ?? '',
    national_id: teacher?.national_id ?? '',
    phone: teacher?.phone ?? '',
    role: teacher?.role ?? 'teacher',
    secondary_role: teacher?.secondary_role ?? null,
    status: teacher?.status ?? 'active',
  }

  const [values, setValues] = useState<TeacherFormValues>(defaultValues)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="relative w-full max-w-lg rounded-md bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-slate-50/50 rounded-t-md">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {teacher ? `تعديل: ${teacher.name}` : 'إضافة معلم جديد'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {teacher ? 'تحديث البيانات' : 'سيتم إنشاء كلمة مرور افتراضية تلقائياً'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded hover:bg-slate-200/50 p-1.5 text-slate-400 transition hover:text-slate-600"
            disabled={isSubmitting}
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </header>

        <form className="p-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-name" className="text-[13px] font-bold text-slate-700">
              اسم المعلم
            </label>
            <input
              id="teacher-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
              placeholder="مثال: أحمد محمد"
              autoFocus
            />
            {errors.name ? <span className="text-xs font-medium text-rose-600">{errors.name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-national-id" className="text-[13px] font-bold text-slate-700">
              رقم الهوية
            </label>
            <input
              id="teacher-national-id"
              name="national_id"
              type="text"
              inputMode="numeric"
              value={values.national_id}
              onChange={(event) => setValues((prev) => ({ ...prev, national_id: event.target.value }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
              placeholder="10 أرقام"
            />
            {errors.national_id ? (
              <span className="text-xs font-medium text-rose-600">{errors.national_id}</span>
            ) : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-phone" className="text-[13px] font-bold text-slate-700">
              رقم الجوال
            </label>
            <input
              id="teacher-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
              placeholder="05XXXXXXXX"
            />
            {errors.phone ? <span className="text-xs font-medium text-rose-600">{errors.phone}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-role" className="text-[13px] font-bold text-slate-700">
              الدور الوظيفي
            </label>
            <select
              id="teacher-role"
              name="role"
              value={values.role}
              onChange={(event) => setValues((prev) => ({ ...prev, role: event.target.value as StaffRole }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role ? <span className="text-xs font-medium text-rose-600">{errors.role}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-secondary-role" className="text-[13px] font-bold text-slate-700">
              الدور الثانوي (اختياري)
              <span className="mr-1 text-xs text-slate-500">يتم توليد كلمة مرور منفصلة</span>
            </label>
            <select
              id="teacher-secondary-role"
              name="secondary_role"
              value={values.secondary_role ?? ''}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  secondary_role: event.target.value ? (event.target.value as StaffRole) : null,
                }))
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
            >
              <option value="">بدون دور ثانوي</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value} disabled={role.value === values.role}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.secondary_role ? (
              <span className="text-xs font-medium text-rose-600">{errors.secondary_role}</span>
            ) : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-status" className="text-[13px] font-bold text-slate-700">
              حالة المعلم
            </label>
            <select
              id="teacher-status"
              name="status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as TeacherStatus }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
            >
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="rounded-md border border-teal-600 bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700 hover:border-teal-700 disabled:opacity-50 sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : teacher ? 'حفظ التعديلات' : 'إضافة المعلم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TeacherCredentialsPanel({
  entries,
  selectedTeacher,
  onCopy,
  onClear,
}: {
  entries: CredentialsEntry[]
  selectedTeacher: TeacherRecord | null
  onCopy: (entry: CredentialsEntry) => void
  onClear: () => void
}) {
  const [startY, setStartY] = React.useState<number>(0)
  const [currentY, setCurrentY] = React.useState<number>(0)
  const [isDragging, setIsDragging] = React.useState(false)

  // منع التمرير على الصفحة الخلفية عندما يكون المكون مفتوح (للجوال فقط)
  React.useEffect(() => {
    if (selectedTeacher && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedTeacher])

  const handleClose = () => {
    const event = new CustomEvent('closeTeacherPanel')
    window.dispatchEvent(event)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - startY
    if (diff > 0) {
      setCurrentY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    // إذا تم السحب لأكثر من 100 بكسل، أغلق المكون
    if (currentY > 100) {
      handleClose()
    }
    setCurrentY(0)
  }

  return (
    <>
      {/* للجوال: مكون منبثق من الأسفل */}
      {selectedTeacher && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={handleClose}
        >
          {/* خلفية شفافة */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* المحتوى المنبثق */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
            style={{
              transform: `translateY(${currentY}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* مقبض السحب */}
            <div className="sticky top-0 z-10 flex justify-center bg-white pt-3 pb-2 border-b border-slate-100 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            <div className="p-4 space-y-4">
              {/* معلومات المعلم */}
              <div className="space-y-3">
                <header className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">تفاصيل المعلم</h2>
                    <p className="text-xs text-muted">معلومات المعلم المحدد والفصول التي يدرسها</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full p-2 hover:bg-slate-100 text-slate-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </header>

                <div className="space-y-3">
                  {/* بطاقة معلومات المعلم */}
                  <div className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">الاسم</p>
                        <p className="text-base font-bold text-slate-900">{selectedTeacher.name}</p>
                      </div>
                      <div className="grid gap-2 text-xs">
                        <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                          <span className="text-slate-600">رقم الهوية</span>
                          <span className="font-mono font-semibold text-slate-900">{selectedTeacher.national_id}</span>
                        </div>
                        <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                          <span className="text-slate-600">الدور الوظيفي</span>
                          <span className="font-semibold text-slate-900">{getRoleLabel(selectedTeacher.role)}</span>
                        </div>
                        {selectedTeacher.secondary_role && (
                          <div className="flex items-center justify-between rounded border border-teal-200 bg-teal-50 px-2.5 py-1.5">
                            <span className="text-teal-700">الدور الثانوي</span>
                            <span className="font-semibold text-teal-900">{getRoleLabel(selectedTeacher.secondary_role)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                          <span className="text-slate-600">رقم الجوال</span>
                          <span className="font-semibold text-slate-900">{selectedTeacher.phone ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                          <span className="text-slate-600">الحالة</span>
                          <TeacherStatusBadge status={selectedTeacher.status} />
                        </div>
                        {selectedTeacher.generated_password && (
                          <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                            <span className="text-amber-700">كلمة المرور الأساسية</span>
                            <span className="font-mono font-semibold text-amber-900">{selectedTeacher.generated_password}</span>
                          </div>
                        )}
                        {selectedTeacher.secondary_generated_password && (
                          <div className="flex items-center justify-between rounded border border-teal-200 bg-teal-50 px-2.5 py-1.5">
                            <span className="text-teal-700">كلمة المرور الثانوية</span>
                            <span className="font-mono font-semibold text-teal-900">{selectedTeacher.secondary_generated_password}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* قسم الفصول */}
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-600">الفصول والمواد</p>
                    <p className="mt-1 text-xs text-muted">
                      سيتم عرض الفصول والمواد التي يدرسها المعلم هنا قريباً.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* للشاشات الكبيرة: الشريط الجانبي الثابت */}
      <aside className="hidden lg:flex sticky top-20 self-start rounded-md border border-slate-200 bg-white p-3 shadow-sm flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {/* Teacher Details Section */}
        {selectedTeacher && (
          <div className="space-y-3">
            <header className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">تفاصيل المعلم</h2>
                <p className="text-xs text-muted">معلومات المعلم المحدد والفصول التي يدرسها</p>
              </div>
            </header>

            <div className="space-y-3">
              {/* Teacher Info Card */}
              <div className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">الاسم</p>
                    <p className="text-base font-bold text-slate-900">{selectedTeacher.name}</p>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <span className="text-slate-600">رقم الهوية</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedTeacher.national_id}</span>
                    </div>
                    <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <span className="text-slate-600">الدور الوظيفي</span>
                      <span className="font-semibold text-slate-900">{getRoleLabel(selectedTeacher.role)}</span>
                    </div>
                    {selectedTeacher.secondary_role && (
                      <div className="flex items-center justify-between rounded border border-teal-200 bg-teal-50 px-2.5 py-1.5">
                        <span className="text-teal-700">الدور الثانوي</span>
                        <span className="font-semibold text-teal-900">{getRoleLabel(selectedTeacher.secondary_role)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <span className="text-slate-600">رقم الجوال</span>
                      <span className="font-semibold text-slate-900">{selectedTeacher.phone ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                      <span className="text-slate-600">الحالة</span>
                      <TeacherStatusBadge status={selectedTeacher.status} />
                    </div>
                    {selectedTeacher.generated_password && (
                      <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                        <span className="text-amber-700">كلمة المرور الأساسية</span>
                        <span className="font-mono font-semibold text-amber-900">{selectedTeacher.generated_password}</span>
                      </div>
                    )}
                    {selectedTeacher.secondary_generated_password && (
                      <div className="flex items-center justify-between rounded border border-teal-200 bg-teal-50 px-2.5 py-1.5">
                        <span className="text-teal-700">كلمة المرور الثانوية</span>
                        <span className="font-mono font-semibold text-teal-900">{selectedTeacher.secondary_generated_password}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Classes Section - Placeholder for future API */}
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600">الفصول والمواد</p>
                <p className="mt-1 text-xs text-muted">
                  سيتم عرض الفصول والمواد التي يدرسها المعلم هنا قريباً.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Log Section */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <p className="text-[11px] font-bold text-slate-500">كلمات المرور الحديثة</p>
          {entries.length > 0 && (
            <button type="button" onClick={onClear} className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 transition">مسح</button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-400">
            ستظهر هنا كلمات المرور بعد الإضافة أو إعادة التعيين.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-slate-100 bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-slate-800">{entry.teacherName}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(entry.issuedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(entry)}
                    className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-teal-600 hover:bg-teal-50 transition"
                  >
                    نسخ
                  </button>
                </div>
                <div className="mt-1.5 grid gap-1 text-[11px]">
                  <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 font-mono text-slate-600">
                    <span>المعرف</span>
                    <span>{entry.credentials.national_id}</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 font-mono text-slate-600">
                    <span>كلمة المرور</span>
                    <span>{entry.credentials.password}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-xs font-bold text-slate-600">لا توجد بيانات مطابقة</p>
      <p className="mt-1 text-[11px] text-slate-400">عدّل البحث أو أضف معلمين جدد</p>
      <button type="button" onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition">
        إضافة معلم
      </button>
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

  useEffect(() => {
    const handleClose = () => setSelectedTeacher(null)
    window.addEventListener('closeTeacherPanel', handleClose)
    return () => window.removeEventListener('closeTeacherPanel', handleClose)
  }, [])

  const { data, isLoading, isError, refetch, isFetching } = useTeachersQuery()
  const teachers = useMemo(() => data ?? [], [data])

  const createTeacherMutation = useCreateTeacherMutation()
  const updateTeacherMutation = useUpdateTeacherMutation()
  const deleteTeacherMutation = useDeleteTeacherMutation()
  const resetPasswordMutation = useResetTeacherPasswordMutation()

  const stats = useMemo(() => {
    const total = teachers.length
    const active = teachers.filter((teacher) => teacher.status === 'active').length
    const inactive = total - active
    return [
      { 
        title: 'إجمالي المعلمين', 
        value: total, 
        icon: <Users className="h-5 w-5 text-sky-600" />,
        theme: 'bg-sky-50 border border-sky-100', 
        textAccent: 'text-sky-900', 
        titleAccent: 'text-sky-700',
      },
      { 
        title: 'معلمون نشطون', 
        value: active, 
        icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
        theme: 'bg-emerald-50 border border-emerald-100', 
        textAccent: 'text-emerald-900', 
        titleAccent: 'text-emerald-700',
      },
      { 
        title: 'معلمون موقوفون', 
        value: inactive, 
        icon: <UserX className="h-5 w-5 text-rose-600" />,
        theme: 'bg-rose-50 border border-rose-100', 
        textAccent: 'text-rose-900', 
        titleAccent: 'text-rose-700',
      },
    ]
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

  if (isLoading) {
    return (
      <section className="space-y-4">
        <header className="border-b border-slate-200 pb-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة المعلمين</h1>
          <p className="text-xs text-slate-500 mt-1">جاري تحميل البيانات...</p>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-4">
        <header className="border-b border-slate-200 pb-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة المعلمين</h1>
        </header>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-xs font-semibold text-rose-700">تعذر تحميل قائمة المعلمين</p>
          <button type="button" onClick={() => refetch()} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition">
            إعادة المحاولة
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة المعلمين</h1>
            <p className="text-xs text-slate-500 mt-1">إدارة الحسابات وكلمات المرور وحالات المعلمين</p>
          </div>
          <button type="button" onClick={handleAdd} className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700">
            <i className="bi bi-plus-lg text-xs" /> إضافة معلم
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3 min-w-0">
          {/* الإحصائيات - مطابقة لصفحة نظرة عامة تماماً */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((card) => (
              <article
                key={card.title}
                className={`rounded-md shadow-sm transition-shadow hover:shadow-md overflow-hidden ${card.theme}`}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-inherit bg-white/40">
                  <p className={`text-xs font-bold ${card.titleAccent}`}>{card.title}</p>
                  {card.icon}
                </div>
                <div className="px-3 py-3">
                  <p className={`text-2xl font-bold ${card.textAccent}`}>
                    {card.value.toLocaleString('en-US')}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* الجدول */}
          <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* شريط البحث */}
            <div className="flex flex-col sm:flex-row items-center gap-2 border-b border-slate-100 px-3 py-2.5 bg-slate-50/50">
              <div className="flex flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 w-full sm:w-auto">
                <i className="bi bi-search text-xs text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full border-none bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="بحث بالاسم أو الهوية أو الجوال..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 focus:border-teal-500 focus:outline-none w-full sm:w-auto"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">موقوف</option>
              </select>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex shrink-0 items-center justify-center rounded border border-slate-300 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-teal-700"
                title="تحديث القائمة"
              >
                <i className={`bi bi-arrow-clockwise text-xs ${isFetching ? 'animate-spin text-teal-600' : ''}`} />
              </button>
            </div>

            {filteredTeachers.length === 0 ? (
              <EmptyState onAdd={handleAdd} />
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-28rem)]">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr className="divide-x divide-x-reverse divide-slate-200">
                      <th className="px-3 py-2.5">المعلم</th>
                      <th className="px-3 py-2.5">الهوية</th>
                      <th className="px-3 py-2.5">الدور</th>
                      <th className="px-3 py-2.5">الجوال</th>
                      <th className="px-3 py-2.5">الحالة</th>
                      <th className="px-3 py-2.5">آخر تحديث</th>
                      <th className="px-3 py-2.5 text-left text-xs">إجراءات</th>
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

                      return (
                        <tr
                          key={teacher.id}
                          onClick={(e) => {
                            if (window.innerWidth >= 1024) {
                              setSelectedTeacher(teacher)
                            } else {
                              if (!(e.target as HTMLElement).closest('button')) {
                                setSelectedTeacher(teacher)
                              }
                            }
                          }}
                          className={`border-b border-slate-100 last:border-0 hover:bg-teal-50/40 transition-colors lg:cursor-pointer divide-x divide-x-reverse divide-slate-100 ${teacher.secondary_role ? 'bg-orange-50/40' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <span className="text-[13px] font-bold text-slate-800">{teacher.name}</span>
                            {teacher.needs_password_change ? (
                              <span className="mr-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">تغيير مرور</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 font-mono text-[12px] text-slate-600">{teacher.national_id}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${getRoleBadgeStyle(teacher.role)}`}>
                              {getRoleLabel(teacher.role)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-slate-600">{teacher.phone ?? '—'}</td>
                          <td className="px-3 py-2">
                            <TeacherStatusBadge status={teacher.status} />
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-400">{formatDate(teacher.updated_at ?? teacher.created_at)}</td>
                          <td className="px-3 py-2 text-left" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => handleEdit(teacher)} className="rounded p-1 text-teal-500 hover:bg-teal-50 transition" title="تعديل">
                                <i className="bi bi-pencil text-xs" />
                              </button>
                              <button type="button" onClick={() => handleResetPassword(teacher)} className="rounded p-1 text-sky-500 hover:bg-sky-50 transition" title="إعادة كلمة المرور" disabled={isResetting}>
                                <i className="bi bi-key text-xs" />
                              </button>
                              <button type="button" onClick={() => handleToggleStatus(teacher)} className="rounded p-1 text-amber-500 hover:bg-amber-50 transition" title={teacher.status === 'active' ? 'إيقاف' : 'تفعيل'} disabled={isToggling}>
                                <i className={`bi ${teacher.status === 'active' ? 'bi-pause-circle' : 'bi-play-circle'} text-xs`} />
                              </button>
                              <button type="button" onClick={() => handleDelete(teacher)} className="rounded p-1 text-rose-400 hover:bg-rose-50 transition" title="حذف" disabled={isDeleting}>
                                <i className="bi bi-trash3 text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ملحق الألوان */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 bg-slate-50/30">
              {ROLE_LEGEND.map((item) => (
                <span key={item.role} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm border ${item.style}`} />
                  {item.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mr-2 border-r border-slate-200 pr-3">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-orange-50 border border-orange-200" />
                دور مزدوج
              </span>
            </div>
          </div>
        </div>

        <TeacherCredentialsPanel
          entries={credentialsLog}
          selectedTeacher={selectedTeacher}
          onCopy={handleCopyCredentials}
          onClear={() => setCredentialsLog([])}
        />
      </div>

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
    </section>
  )
}
