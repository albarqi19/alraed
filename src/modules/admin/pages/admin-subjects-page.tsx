import { useEffect, useMemo, useState } from 'react'
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useSubjectsQuery,
  useUpdateSubjectMutation,
} from '../hooks'
import type { SubjectRecord } from '../types'
import { Plus, Search, RefreshCw, Pen, Trash2, BookOpen, BookCheck, BookDashed, X, AlertTriangle } from 'lucide-react'

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
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-50 text-slate-500 border-slate-200'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold ${tone}`}>
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
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50 rounded-t-lg">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {subject ? `تعديل المادة: ${subject.name}` : 'إضافة مادة جديدة'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded hover:bg-slate-200/50 p-1.5 text-slate-400 transition hover:text-slate-600"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          className="p-5 space-y-4"
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
          <div className="grid gap-1.5 text-right">
            <label htmlFor="subject-name" className="text-[13px] font-bold text-slate-700">
              اسم المادة (عربي)
            </label>
            <input
              id="subject-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="مثال: الرياضيات"
              disabled={isSubmitting}
              autoFocus
            />
            {errors.name ? <span className="text-xs font-bold text-rose-600">{errors.name}</span> : null}
          </div>

          <div className="grid gap-1.5 text-right">
            <label htmlFor="subject-name-en" className="text-[13px] font-bold text-slate-700">
              اسم المادة (إنجليزي)
            </label>
            <input
              id="subject-name-en"
              name="name_en"
              type="text"
              value={values.name_en}
              onChange={(event) => setValues((prev) => ({ ...prev, name_en: event.target.value }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="مثال: Mathematics"
              disabled={isSubmitting}
            />
            {errors.name_en ? <span className="text-xs font-bold text-rose-600">{errors.name_en}</span> : null}
          </div>

          <div className="grid gap-1.5 text-right">
            <label htmlFor="subject-description" className="text-[13px] font-bold text-slate-700">
              الوصف (اختياري)
            </label>
            <textarea
              id="subject-description"
              name="description"
              value={values.description}
              onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
              className="h-24 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="ملاحظات عن المادة أو أهدافها"
              disabled={isSubmitting}
            />
            {errors.description ? <span className="text-xs font-bold text-rose-600">{errors.description}</span> : null}
          </div>

          <div className="grid gap-1.5 text-right">
            <label htmlFor="subject-status" className="text-[13px] font-bold text-slate-700">
              حالة المادة
            </label>
            <select
              id="subject-status"
              name="status"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as SubjectStatus }))}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              disabled={isSubmitting}
            >
              <option value="active">نشطة</option>
              <option value="inactive">غير نشطة</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 mt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-md border border-teal-600 bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700 hover:border-teal-700 disabled:opacity-50 sm:w-auto"
              disabled={isSubmitting}
            >
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
      <div className="w-full max-w-sm rounded-lg bg-white p-5 text-right shadow-xl">
        <header className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-right sm:items-start mb-4">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-rose-100 p-3 h-10 w-10">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-6">حذف مادة</h2>
            <p className="text-[13px] text-slate-500 mt-1.5">
              هل أنت متأكد من رغبتك في حذف <strong className="text-slate-800">({subject.name})</strong>؟ 
              هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </p>
          </div>
        </header>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 hover:border-rose-700 disabled:opacity-50 sm:w-auto"
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
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-md border border-dashed border-slate-300 bg-slate-50">
      <BookDashed className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm font-bold text-slate-700">لا توجد مواد مسجلة</p>
      <p className="mt-1 text-xs text-slate-500">ابدأ بإضافة المواد الدراسية لتتمكن من إدارتها واستخدامها في الجداول.</p>
      <button 
        type="button" 
        onClick={onAdd} 
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
      >
        <Plus className="h-4 w-4" /> إضافة أول مادة
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <tbody>
      {[...Array(4)].map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-slate-100">
          <td className="px-3 py-1.5">
            <div className="h-3 w-24 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-1.5">
            <div className="h-3 w-28 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-1.5">
            <div className="h-3 w-40 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-1.5">
            <div className="h-5 w-16 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-1.5">
            <div className="h-3 w-20 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-1.5 text-left">
            <div className="flex justify-end gap-1">
              <div className="h-7 w-7 rounded bg-slate-200" />
              <div className="h-7 w-7 rounded bg-slate-200" />
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
      { 
        label: 'إجمالي المواد', 
        value: total,
        theme: 'bg-sky-50 border border-sky-100',
        textAccent: 'text-sky-900',
        titleAccent: 'text-sky-700',
        icon: <BookOpen className="h-5 w-5 text-sky-600" />
      },
      { 
        label: 'مواد نشطة', 
        value: active,
        theme: 'bg-emerald-50 border border-emerald-100',
        textAccent: 'text-emerald-900',
        titleAccent: 'text-emerald-700',
        icon: <BookCheck className="h-5 w-5 text-emerald-600" />
      },
      { 
        label: 'مواد غير نشطة', 
        value: inactive,
        theme: 'bg-slate-50 border border-slate-200',
        textAccent: 'text-slate-700',
        titleAccent: 'text-slate-600',
        icon: <BookDashed className="h-5 w-5 text-slate-500" />
      },
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
        }
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
        }
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
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">إدارة المواد</h1>
            <p className="text-sm text-slate-500 mt-1">
              تحكم بأسماء وبيانات المناهج الدراسية المستخدمة للربط في الجداول ونماذج الإعداد
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleAdd} 
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> مادة جديدة
          </button>
        </div>
        {isError && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 font-medium flex items-center justify-between">
            <span>حدث خطأ أثناء تحميل قائمة المواد. الرجاء المحاولة مرة أخرى.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50"
            >
              <RefreshCw className="h-3 w-3" /> إعادة المحاولة
            </button>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {/* شريط الإحصائيات (KPIs) */}
        <section className="grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <article
              key={item.label}
              className={`rounded-md shadow-sm transition-shadow hover:shadow-md overflow-hidden ${item.theme}`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-inherit bg-white/40">
                <p className={`text-xs font-bold ${item.titleAccent}`}>{item.label}</p>
                {item.icon}
              </div>
              <div className="px-3 py-3">
                <p className={`text-2xl font-bold ${item.textAccent}`}>
                  {item.value.toLocaleString('en-US')}
                </p>
              </div>
            </article>
          ))}
        </section>

        {/* أدوات التحكم (بحث وفلترة) */}
        <section className="flex flex-col sm:flex-row flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex w-full sm:w-auto flex-1 items-center gap-2 rounded border border-slate-300 bg-slate-50/50 px-3 py-1.5 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-teal-500">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم المادة أو الوصف..."
              className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full sm:w-auto rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة</option>
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex shrink-0 items-center justify-center rounded border border-slate-300 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-teal-700"
              title="تحديث القائمة"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </section>

        {/* الجدول */}
        <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-32rem)]">
            <table className="w-full text-right text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr className="divide-x divide-x-reverse divide-slate-200">
                  <th className="px-3 py-2">اسم المادة</th>
                  <th className="px-3 py-2">الاسم الإنجليزي</th>
                  <th className="px-3 py-2">الوصف</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">آخر تحديث</th>
                  <th className="px-3 py-1.5 text-left">الإجراءات</th>
                </tr>
              </thead>
              {isLoading ? (
                <LoadingState />
              ) : filteredSubjects.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                      لا توجد مواد مطابقة لخيارات البحث أو الفلترة.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors divide-x divide-x-reverse divide-slate-100">
                      <td className="px-3 py-1.5 text-sm font-bold text-slate-800">{subject.name}</td>
                      <td className="px-3 py-1.5 text-sm text-slate-600 font-medium">{subject.name_en ?? '—'}</td>
                      <td className="px-3 py-1.5 text-xs text-slate-500 truncate max-w-[200px]" title={subject.description ?? undefined}>
                        {subject.description ?? '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        <SubjectStatusBadge status={subject.status} />
                      </td>
                      <td className="px-3 py-1.5 text-xs font-semibold text-slate-500">
                        {formatDate(subject.updated_at ?? subject.created_at)}
                      </td>
                      <td className="px-3 py-1.5 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(subject)}
                            className="rounded p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition"
                            title="تعديل المادة"
                          >
                            <Pen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubjectToDelete(subject)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="حذف المادة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>

        {!isLoading && subjects.length === 0 && <EmptyState onAdd={handleAdd} />}
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


