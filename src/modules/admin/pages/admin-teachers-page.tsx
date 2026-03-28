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
  const tone = isActive
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-rose-50 text-rose-700 border border-rose-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
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
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{teacher ? 'تعديل المعلم' : 'إضافة معلم'} </p>
          <h2 className="text-2xl font-bold text-slate-900">{teacher ? `تحديث بيانات ${teacher.name}` : 'إضافة معلم جديد'}</h2>
          <p className="text-sm text-muted">
            أضف أو عدّل بيانات المعلم. سيتم إرسال كلمة مرور افتراضية تلقائيًا في حالة الإضافة.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-name" className="text-sm font-medium text-slate-800">
              اسم المعلم
            </label>
            <input
              id="teacher-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: أحمد محمد"
              autoFocus
            />
            {errors.name ? <span className="text-xs font-medium text-rose-600">{errors.name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-national-id" className="text-sm font-medium text-slate-800">
              رقم الهوية
            </label>
            <input
              id="teacher-national-id"
              name="national_id"
              type="text"
              inputMode="numeric"
              value={values.national_id}
              onChange={(event) => setValues((prev) => ({ ...prev, national_id: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="10 أرقام"
            />
            {errors.national_id ? (
              <span className="text-xs font-medium text-rose-600">{errors.national_id}</span>
            ) : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-phone" className="text-sm font-medium text-slate-800">
              رقم الجوال
            </label>
            <input
              id="teacher-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="05XXXXXXXX"
            />
            {errors.phone ? <span className="text-xs font-medium text-rose-600">{errors.phone}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="teacher-role" className="text-sm font-medium text-slate-800">
              الدور الوظيفي
            </label>
            <select
              id="teacher-role"
              name="role"
              value={values.role}
              onChange={(event) => setValues((prev) => ({ ...prev, role: event.target.value as StaffRole }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
            <label htmlFor="teacher-secondary-role" className="text-sm font-medium text-slate-800">
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
            <label htmlFor="teacher-status" className="text-sm font-medium text-slate-800">
              حالة المعلم
            </label>
            <select
              id="teacher-status"
              name="status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as TeacherStatus }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting}>
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
                  <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">الاسم</p>
                        <p className="text-base font-bold text-slate-900">{selectedTeacher.name}</p>
                      </div>
                      <div className="grid gap-2 text-xs">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">رقم الهوية</span>
                          <span className="font-mono font-semibold text-slate-900">{selectedTeacher.national_id}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">الدور الوظيفي</span>
                          <span className="font-semibold text-slate-900">{getRoleLabel(selectedTeacher.role)}</span>
                        </div>
                        {selectedTeacher.secondary_role && (
                          <div className="flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2 border border-teal-200">
                            <span className="text-teal-700">الدور الثانوي</span>
                            <span className="font-semibold text-teal-900">{getRoleLabel(selectedTeacher.secondary_role)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">رقم الجوال</span>
                          <span className="font-semibold text-slate-900">{selectedTeacher.phone ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">الحالة</span>
                          <TeacherStatusBadge status={selectedTeacher.status} />
                        </div>
                        {selectedTeacher.generated_password && (
                          <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 border border-amber-200">
                            <span className="text-amber-700">كلمة المرور الأساسية</span>
                            <span className="font-mono font-semibold text-amber-900">{selectedTeacher.generated_password}</span>
                          </div>
                        )}
                        {selectedTeacher.secondary_generated_password && (
                          <div className="flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2 border border-teal-200">
                            <span className="text-teal-700">كلمة المرور الثانوية</span>
                            <span className="font-mono font-semibold text-teal-900">{selectedTeacher.secondary_generated_password}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* قسم الفصول */}
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
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
      <aside className="hidden lg:flex sticky top-20 self-start glass-card flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
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
              <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">الاسم</p>
                    <p className="text-base font-bold text-slate-900">{selectedTeacher.name}</p>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">رقم الهوية</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedTeacher.national_id}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">الدور الوظيفي</span>
                      <span className="font-semibold text-slate-900">{getRoleLabel(selectedTeacher.role)}</span>
                    </div>
                    {selectedTeacher.secondary_role && (
                      <div className="flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2 border border-teal-200">
                        <span className="text-teal-700">الدور الثانوي</span>
                        <span className="font-semibold text-teal-900">{getRoleLabel(selectedTeacher.secondary_role)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">رقم الجوال</span>
                      <span className="font-semibold text-slate-900">{selectedTeacher.phone ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">الحالة</span>
                      <TeacherStatusBadge status={selectedTeacher.status} />
                    </div>
                    {selectedTeacher.generated_password && (
                      <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 border border-amber-200">
                        <span className="text-amber-700">كلمة المرور الأساسية</span>
                        <span className="font-mono font-semibold text-amber-900">{selectedTeacher.generated_password}</span>
                      </div>
                    )}
                    {selectedTeacher.secondary_generated_password && (
                      <div className="flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2 border border-teal-200">
                        <span className="text-teal-700">كلمة المرور الثانوية</span>
                        <span className="font-mono font-semibold text-teal-900">{selectedTeacher.secondary_generated_password}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Classes Section - Placeholder for future API */}
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600">الفصول والمواد</p>
                <p className="mt-1 text-xs text-muted">
                  سيتم عرض الفصول والمواد التي يدرسها المعلم هنا قريباً.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Log Section */}
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">كلمات المرور الحديثة</h2>
            <p className="text-xs text-muted">يتم حفظ أحدث كلمات المرور التي تم إنشاؤها لإعادة استخدامها.</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
            disabled={entries.length === 0}
          >
            مسح
          </button>
        </header>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-muted">
            ستظهر هنا كلمات المرور المولدة حديثًا بعد إضافة المعلمين أو إعادة تعيين كلمات المرور.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{entry.teacherName}</p>
                    <p className="text-xs text-muted">
                      {formatDate(entry.issuedAt)} — الهوية: {entry.credentials.national_id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(entry)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-teal-600 transition hover:border-teal-200 hover:bg-teal-50"
                  >
                    نسخ
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 font-mono text-slate-700">
                    <span>المعرف</span>
                    <span>{entry.credentials.national_id}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 font-mono text-slate-700">
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
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-16 text-center">
      <p className="text-lg font-semibold text-slate-700">لا توجد بيانات للعرض حالياً</p>
      <p className="mt-2 text-sm text-muted">ابدأ بإضافة المعلمين، أو قم بتعديل البحث والتصفية الحالية.</p>
      <button type="button" onClick={onAdd} className="button-primary mt-6">
        إضافة معلم جديد
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

  // للاستماع لحدث إغلاق اللوحة من الجوال
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
      { label: 'إجمالي المعلمين', value: total },
      { label: 'معلمون نشطون', value: active },
      { label: 'معلمون موقوفون', value: inactive },
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
    console.log('🔍 Form values on submit:', values)
    console.log('🔍 Secondary role value:', values.secondary_role)
    console.log('🔍 Secondary role type:', typeof values.secondary_role)

    if (editingTeacher) {
      updateTeacherMutation.mutate(
        {
          id: editingTeacher.id,
          payload: {
            name: values.name,
            national_id: values.national_id,
            phone: values.phone ? values.phone : null,
            role: values.role,
            secondary_role: values.secondary_role || null, // تحويل سلسلة فارغة إلى null
            status: values.status,
          },
        },
        {
          onSuccess: (response) => {
            setIsFormOpen(false)
            setEditingTeacher(null)
            // إذا تم توليد كلمة مرور للدور الثانوي، نعرضها
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
          secondary_role: values.secondary_role || undefined, // تحويل سلسلة فارغة إلى undefined
        },
        {
          onSuccess: (response) => {
            setIsFormOpen(false)
            if (response.login_credentials) {
              appendCredentials(response.teacher.name, response.login_credentials)
            }
            // إذا كان هناك دور ثانوي، نعرض بياناته أيضاً
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
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">إدارة المعلمين</h1>
          <p className="text-sm text-muted">جاري تحميل بيانات المعلمين...</p>
        </header>
        <div className="glass-card text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
          <p className="mt-4 text-sm text-muted">قد يستغرق ذلك بضع ثوانٍ...</p>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">إدارة المعلمين</h1>
          <p className="text-sm text-muted">حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.</p>
        </header>
        <div className="glass-card text-center">
          <p className="text-sm font-semibold text-rose-600">تعذر تحميل قائمة المعلمين</p>
          <button type="button" onClick={() => refetch()} className="button-primary mt-4">
            إعادة المحاولة
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">إدارة المعلمين</h1>
        <p className="text-sm text-muted">
          تحكم في قائمة المعلمين، أعد ضبط كلمات المرور، وفعّل أو عطّل حساباتهم بسهولة.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-3 gap-4 min-w-0">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card flex flex-col items-center gap-2 text-center min-w-0">
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-sm text-muted">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="glass-card space-y-4 min-w-0 overflow-hidden">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="ابحث بالاسم، الهوية أو رقم الجوال"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:w-48"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">موقوف</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="button-secondary"
                  disabled={isFetching}
                >
                  {isFetching ? 'جاري التحديث...' : 'تحديث القائمة'}
                </button>
                <button type="button" onClick={handleAdd} className="button-primary">
                  إضافة معلم
                </button>
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <EmptyState onAdd={handleAdd} />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">المعلم</th>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">رقم الهوية</th>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">الدور الوظيفي</th>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">رقم الجوال</th>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">الحالة</th>
                        <th scope="col" className="px-4 py-2 text-right tracking-wider">آخر تحديث</th>
                        <th scope="col" className="px-4 py-2 text-right">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
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
                              // على الشاشات الكبيرة فقط
                              if (window.innerWidth >= 1024) {
                                setSelectedTeacher(teacher)
                              } else {
                                // على الجوال: فتح مكون منبثق من الأسفل
                                if (!(e.target as HTMLElement).closest('button')) {
                                  setSelectedTeacher(teacher)
                                }
                              }
                            }}
                            className="transition hover:bg-teal-50/50 lg:cursor-pointer"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-900">{teacher.name}</span>
                                {teacher.needs_password_change ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                                    يحتاج لتغيير كلمة المرور
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-sm text-slate-700">{teacher.national_id}</td>
                            <td className="px-4 py-2.5 text-sm">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                {getRoleLabel(teacher.role)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-600">{teacher.phone ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <TeacherStatusBadge status={teacher.status} />
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted">{formatDate(teacher.updated_at ?? teacher.created_at)}</td>
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(teacher)}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(teacher)}
                                  className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-600 transition hover:bg-teal-50"
                                  disabled={isResetting}
                                >
                                  {isResetting ? 'جاري...' : 'إعادة كلمة المرور'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(teacher)}
                                  className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                                  disabled={isToggling}
                                >
                                  {teacher.status === 'active' ? 'إيقاف' : 'تفعيل'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(teacher)}
                                  className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'جاري...' : 'حذف'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
