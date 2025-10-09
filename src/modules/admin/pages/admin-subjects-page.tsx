import { useEffect, useMemo, useState } from 'react'
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useSubjectsQuery,
  useUpdateSubjectMutation,
} from '../hooks'
import type { SubjectRecord } from '../types'

type SubjectStatus = SubjectRecord['status']
type StatusFilter = 'all' | SubjectStatus

interface SubjectFormValues {
  name: string
  name_en: string
  description: string
  status: SubjectStatus
}

interface SubjectFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: SubjectFormValues) => void
  isSubmitting: boolean
  subject?: SubjectRecord | null
}

interface ConfirmDeleteDialogProps {
  subject: SubjectRecord
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
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

function SubjectStatusBadge({ status }: { status: SubjectStatus }) {
  const isActive = status === 'active'
  const tone = isActive
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-500 border border-slate-200'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {isActive ? 'نشطة' : 'غير نشطة'}
    </span>
  )
}

function SubjectFormDialog({ open, onClose, onSubmit, isSubmitting, subject }: SubjectFormDialogProps) {
  const defaultValues: SubjectFormValues = {
    name: subject?.name ?? '',
    name_en: subject?.name_en ?? '',
    description: subject?.description ?? '',
    status: subject?.status ?? 'active',
  }

  const [values, setValues] = useState<SubjectFormValues>(defaultValues)
  const [errors, setErrors] = useState<Record<keyof SubjectFormValues, string | null>>({
    name: null,
    name_en: null,
    description: null,
    status: null,
  })

  useEffect(() => {
    if (open) {
      setValues({
        name: subject?.name ?? '',
        name_en: subject?.name_en ?? '',
        description: subject?.description ?? '',
        status: subject?.status ?? 'active',
      })
      setErrors({ name: null, name_en: null, description: null, status: null })
    }
  }, [open, subject])

  const validate = () => {
    const nextErrors: Record<keyof SubjectFormValues, string | null> = {
      name: null,
      name_en: null,
      description: null,
      status: null,
    }

    if (!values.name.trim()) {
      nextErrors.name = 'الرجاء إدخال اسم المادة بالعربية'
    } else if (values.name.trim().length < 2) {
      nextErrors.name = 'اسم المادة يجب أن يكون حرفين على الأقل'
    }

    if (!values.name_en.trim()) {
      nextErrors.name_en = 'الرجاء إدخال الاسم الإنجليزي للمادة'
    } else if (values.name_en.trim().length < 2) {
      nextErrors.name_en = 'الاسم الإنجليزي يجب أن يكون حرفين على الأقل'
    }

    if (values.description && values.description.length > 255) {
      nextErrors.description = 'الوصف يجب ألا يتجاوز 255 حرفًا'
    }

    setErrors(nextErrors)
    return Object.values(nextErrors).every((error) => !error)
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
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
            {subject ? 'تحديث مادة' : 'إضافة مادة'}
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            {subject ? `تعديل ${subject.name}` : 'إضافة مادة دراسية جديدة'}
          </h2>
          <p className="text-sm text-muted">
            أدخل تفاصيل المادة باللغة العربية والإنجليزية لتكون واضحة في الجداول والتقارير.
          </p>
        </header>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!validate()) return
            onSubmit({
              name: values.name.trim(),
              name_en: values.name_en.trim(),
              description: values.description.trim(),
              status: values.status,
            })
          }}
          noValidate
        >
          <div className="grid gap-2 text-right">
            <label htmlFor="subject-name" className="text-sm font-medium text-slate-800">
              اسم المادة (عربي)
            </label>
            <input
              id="subject-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="مثال: الرياضيات"
              disabled={isSubmitting}
              autoFocus
            />
            {errors.name ? <span className="text-xs font-medium text-rose-600">{errors.name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="subject-name-en" className="text-sm font-medium text-slate-800">
              اسم المادة (إنجليزي)
            </label>
            <input
              id="subject-name-en"
              name="name_en"
              type="text"
              value={values.name_en}
              onChange={(event) => setValues((prev) => ({ ...prev, name_en: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="مثال: Mathematics"
              disabled={isSubmitting}
            />
            {errors.name_en ? <span className="text-xs font-medium text-rose-600">{errors.name_en}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="subject-description" className="text-sm font-medium text-slate-800">
              الوصف (اختياري)
            </label>
            <textarea
              id="subject-description"
              name="description"
              value={values.description}
              onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="ملاحظات عن المادة أو أهدافها"
              disabled={isSubmitting}
            />
            {errors.description ? <span className="text-xs font-medium text-rose-600">{errors.description}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="subject-status" className="text-sm font-medium text-slate-800">
              حالة المادة
            </label>
            <select
              id="subject-status"
              name="status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as SubjectStatus }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
            >
              <option value="active">نشطة</option>
              <option value="inactive">غير نشطة</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : subject ? 'حفظ التعديلات' : 'إضافة المادة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteDialog({ subject, open, onCancel, onConfirm, isSubmitting }: ConfirmDeleteDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">حذف مادة</h2>
          <p className="text-sm text-muted">
            هل أنت متأكد من رغبتك في حذف مادة <strong className="text-slate-800">{subject.name}</strong>؟ هذا الإجراء لا يمكن
            التراجع عنه وقد يؤثر على الحصص المرتبطة بها.
          </p>
        </header>
        <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="button-secondary sm:w-auto" disabled={isSubmitting}>
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="button-primary sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-16 text-center">
      <p className="text-lg font-semibold text-slate-700">لا توجد مواد مسجلة حالياً</p>
      <p className="mt-2 text-sm text-muted">ابدأ بإضافة المواد الدراسية أو استيرادها من النظام القديم.</p>
      <button type="button" onClick={onAdd} className="button-primary mt-6">
        إضافة مادة جديدة
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <tbody>
      {[...Array(4)].map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="p-4">
            <div className="h-4 w-24 rounded-full bg-slate-100" />
          </td>
          <td className="p-4">
            <div className="h-4 w-28 rounded-full bg-slate-100" />
          </td>
          <td className="p-4">
            <div className="h-4 w-48 rounded-full bg-slate-100" />
          </td>
          <td className="p-4">
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </td>
          <td className="p-4">
            <div className="h-4 w-32 rounded-full bg-slate-100" />
          </td>
          <td className="p-4 text-left">
            <div className="ml-auto flex w-24 gap-2">
              <div className="h-9 flex-1 rounded-full bg-slate-100" />
              <div className="h-9 flex-1 rounded-full bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export function AdminSubjectsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null)
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectRecord | null>(null)

  const { data, isLoading, isFetching, isError, refetch } = useSubjectsQuery()

  const subjects = useMemo(() => data ?? [], [data])

  const createSubjectMutation = useCreateSubjectMutation()
  const updateSubjectMutation = useUpdateSubjectMutation()
  const deleteSubjectMutation = useDeleteSubjectMutation()

  const stats = useMemo(() => {
    const total = subjects.length
    const active = subjects.filter((subject) => subject.status === 'active').length
    const inactive = total - active
    return [
      { label: 'إجمالي المواد', value: total },
      { label: 'مواد نشطة', value: active },
      { label: 'مواد غير نشطة', value: inactive },
    ]
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return subjects.filter((subject) => {
      const matchesQuery = !query
        ? true
        : [subject.name, subject.name_en ?? '', subject.description ?? '']
            .map((value) => value?.toLowerCase?.() ?? '')
            .some((value) => value.includes(query))
      const matchesStatus = statusFilter === 'all' ? true : subject.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [subjects, searchTerm, statusFilter])

  const handleAdd = () => {
    setEditingSubject(null)
    setIsFormOpen(true)
  }

  const handleEdit = (subject: SubjectRecord) => {
    setEditingSubject(subject)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (values: SubjectFormValues) => {
    if (editingSubject) {
      updateSubjectMutation.mutate(
        {
          id: editingSubject.id,
          payload: {
            name: values.name,
            name_en: values.name_en,
            description: values.description || null,
            status: values.status,
          },
        },
        {
          onSuccess: () => {
            setIsFormOpen(false)
            setEditingSubject(null)
          },
        },
      )
    } else {
      createSubjectMutation.mutate(
        {
          name: values.name,
          name_en: values.name_en,
          description: values.description || null,
          status: values.status,
        },
        {
          onSuccess: () => {
            setIsFormOpen(false)
          },
        },
      )
    }
  }

  const handleDelete = () => {
    if (!subjectToDelete) return
    deleteSubjectMutation.mutate(subjectToDelete.id, {
      onSuccess: () => {
        setSubjectToDelete(null)
      },
    })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إدارة المواد</h1>
            <p className="text-sm text-muted">
              تحكم كامل بالمناهج الدراسية مع دعم إضافة المواد، تعديلها، وتفعيلها أو إيقافها.
            </p>
          </div>
          <button type="button" onClick={handleAdd} className="button-primary">
            <i className="bi bi-plus-lg" /> مادة جديدة
          </button>
        </div>
        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            حدث خطأ أثناء تحميل قائمة المواد. الرجاء المحاولة مرة أخرى.
            <button
              type="button"
              onClick={() => refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <div className="glass-card space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{item.value.toLocaleString('ar-SA')}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <i className="bi bi-search text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم المادة أو الوصف"
              className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
          >
            <i className={`bi bi-arrow-repeat ${isFetching ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </section>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white/80 shadow-sm">
          <table className="w-full table-fixed text-right text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">اسم المادة</th>
                <th className="px-4 py-3 font-semibold">الاسم الإنجليزي</th>
                <th className="px-4 py-3 font-semibold">الوصف</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">آخر تحديث</th>
                <th className="px-4 py-3 font-semibold text-left">الإجراءات</th>
              </tr>
            </thead>
            {isLoading ? (
              <LoadingState />
            ) : filteredSubjects.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted">
                    لا توجد مواد مطابقة لخيارات البحث الحالية.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">{subject.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{subject.name_en ?? '—'}</td>
                    <td className="px-4 py-4 text-xs text-muted">{subject.description ?? '—'}</td>
                    <td className="px-4 py-4">
                      <SubjectStatusBadge status={subject.status} />
                    </td>
                    <td className="px-4 py-4 text-xs text-muted">{formatDate(subject.updated_at ?? subject.created_at)}</td>
                    <td className="px-4 py-4 text-left">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(subject)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
                        >
                          <i className="bi bi-pencil" /> تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectToDelete(subject)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-200"
                        >
                          <i className="bi bi-trash" /> حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {!isLoading && subjects.length === 0 ? <EmptyState onAdd={handleAdd} /> : null}
      </div>

      <SubjectFormDialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSubject(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={createSubjectMutation.isPending || updateSubjectMutation.isPending}
        subject={editingSubject}
      />

      <ConfirmDeleteDialog
        open={Boolean(subjectToDelete)}
        subject={subjectToDelete as SubjectRecord}
        onCancel={() => setSubjectToDelete(null)}
        onConfirm={handleDelete}
        isSubmitting={deleteSubjectMutation.isPending}
      />
    </section>
  )
}

