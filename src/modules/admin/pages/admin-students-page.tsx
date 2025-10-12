import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useStudentsQuery,
  useUpdateStudentMutation,
} from '../hooks'
import type { StudentRecord } from '../types'
import { useToast } from '@/shared/feedback/use-toast'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

interface StudentFormValues {
  name: string
  national_id: string
  grade: string
  class_name: string
  parent_name: string
  parent_phone: string
}

interface StudentFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: StudentFormValues) => void
  isSubmitting: boolean
  student?: StudentRecord | null
  gradeOptions: string[]
  classOptionsByGrade: Record<string, string[]>
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

function StudentFormDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  student,
  gradeOptions,
  classOptionsByGrade,
}: StudentFormDialogProps) {
  const defaultValues: StudentFormValues = {
    name: student?.name ?? '',
    national_id: student?.national_id ?? '',
    grade: student?.grade ?? '',
    class_name: student?.class_name ?? '',
    parent_name: student?.parent_name ?? '',
    parent_phone: student?.parent_phone ?? '',
  }

  const [values, setValues] = useState<StudentFormValues>(defaultValues)
  const [errors, setErrors] = useState<Record<keyof StudentFormValues, string | null>>({
    name: null,
    national_id: null,
    grade: null,
    class_name: null,
    parent_name: null,
    parent_phone: null,
  })

  useEffect(() => {
    if (open) {
      setValues({
        name: student?.name ?? '',
        national_id: student?.national_id ?? '',
        grade: student?.grade ?? '',
        class_name: student?.class_name ?? '',
        parent_name: student?.parent_name ?? '',
        parent_phone: student?.parent_phone ?? '',
      })
      setErrors({
        name: null,
        national_id: null,
        grade: null,
        class_name: null,
        parent_name: null,
        parent_phone: null,
      })
    }
  }, [open, student])

  const availableClasses = useMemo(() => classOptionsByGrade[values.grade] ?? [], [classOptionsByGrade, values.grade])

  const validate = () => {
    const name = values.name.trim()
    const nationalId = values.national_id.trim()
    const grade = values.grade.trim()
    const className = values.class_name.trim()
    const parentName = values.parent_name.trim()
    const parentPhone = values.parent_phone.trim()

    const nextErrors: Record<keyof StudentFormValues, string | null> = {
      name: null,
      national_id: null,
      grade: null,
      class_name: null,
      parent_name: null,
      parent_phone: null,
    }

    if (!name) {
      nextErrors.name = 'الرجاء إدخال اسم الطالب'
    } else if (name.length < 3) {
      nextErrors.name = 'اسم الطالب يجب أن يكون 3 أحرف أو أكثر'
    }

    if (!nationalId) {
      nextErrors.national_id = 'الرجاء إدخال رقم الهوية'
    } else if (!/^\d{10}$/.test(nationalId)) {
      nextErrors.national_id = 'رقم الهوية يجب أن يتكون من 10 أرقام'
    }

    if (!grade) {
      nextErrors.grade = 'الرجاء تحديد الصف'
    }

    if (!className) {
      nextErrors.class_name = 'الرجاء تحديد الشعبة'
    }

    // parent_name is required by backend
    if (!parentName) {
      nextErrors.parent_name = 'الرجاء إدخال اسم ولي الأمر'
    } else if (parentName.length < 2) {
      nextErrors.parent_name = 'اسم ولي الأمر يجب أن يكون حرفين أو أكثر'
    }

    // parent_phone is required by backend with specific format
    if (!parentPhone) {
      nextErrors.parent_phone = 'الرجاء إدخال رقم جوال ولي الأمر'
    } else if (!/^05\d{8}$/.test(parentPhone)) {
      nextErrors.parent_phone = 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'
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
      grade: values.grade.trim(),
      class_name: values.class_name.trim(),
      parent_name: values.parent_name.trim(),
      parent_phone: values.parent_phone.trim(),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{student ? 'تعديل الطالب' : 'إضافة طالب'} </p>
          <h2 className="text-2xl font-bold text-slate-900">{student ? `تحديث بيانات ${student.name}` : 'إضافة طالب جديد'}</h2>
          <p className="text-sm text-muted">أدخل معلومات الطالب الأكاديمية وبيانات ولي الأمر لمتابعة التواصل.</p>
        </header>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <div className="col-span-2 grid gap-2 text-right">
            <label htmlFor="student-name" className="text-sm font-medium text-slate-800">
              اسم الطالب
            </label>
            <input
              id="student-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: محمد أحمد"
              autoFocus
            />
            {errors.name ? <span className="text-xs font-medium text-rose-600">{errors.name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="student-national-id" className="text-sm font-medium text-slate-800">
              رقم الهوية
            </label>
            <input
              id="student-national-id"
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
            <label htmlFor="student-grade" className="text-sm font-medium text-slate-800">
              الصف الدراسي
            </label>
            <input
              id="student-grade"
              name="grade"
              type="text"
              list="student-grade-options"
              value={values.grade}
              onChange={(event) => setValues((prev) => ({ ...prev, grade: event.target.value, class_name: '' }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: الصف الأول"
            />
            <datalist id="student-grade-options">
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade} />
              ))}
            </datalist>
            {errors.grade ? <span className="text-xs font-medium text-rose-600">{errors.grade}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="student-class-name" className="text-sm font-medium text-slate-800">
              الشعبة
            </label>
            <input
              id="student-class-name"
              name="class_name"
              type="text"
              list="student-class-options"
              value={values.class_name}
              onChange={(event) => setValues((prev) => ({ ...prev, class_name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="مثال: أ"
            />
            <datalist id="student-class-options">
              {availableClasses.map((className) => (
                <option key={className} value={className} />
              ))}
            </datalist>
            {errors.class_name ? <span className="text-xs font-medium text-rose-600">{errors.class_name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="student-parent-name" className="text-sm font-medium text-slate-800">
              اسم ولي الأمر <span className="text-rose-600">*</span>
            </label>
            <input
              id="student-parent-name"
              name="parent_name"
              type="text"
              value={values.parent_name}
              onChange={(event) => setValues((prev) => ({ ...prev, parent_name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="اسم ولي الأمر"
              required
            />
            {errors.parent_name ? <span className="text-xs font-medium text-rose-600">{errors.parent_name}</span> : null}
          </div>

          <div className="grid gap-2 text-right">
            <label htmlFor="student-parent-phone" className="text-sm font-medium text-slate-800">
              رقم جوال ولي الأمر <span className="text-rose-600">*</span>
            </label>
            <input
              id="student-parent-phone"
              name="parent_phone"
              type="tel"
              inputMode="tel"
              value={values.parent_phone}
              onChange={(event) => setValues((prev) => ({ ...prev, parent_phone: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={isSubmitting}
              placeholder="05XXXXXXXX"
              required
            />
            {errors.parent_phone ? <span className="text-xs font-medium text-rose-600">{errors.parent_phone}</span> : null}
          </div>

          <div className="col-span-2 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="button-secondary sm:w-auto" disabled={isSubmitting}>
              إلغاء
            </button>
            <button type="submit" className="button-primary sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : student ? 'حفظ التعديلات' : 'إضافة الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-16 text-center">
      <p className="text-lg font-semibold text-slate-700">لا توجد بيانات للعرض حالياً</p>
      <p className="mt-2 text-sm text-muted">ابدأ بإضافة الطلاب أو قم باستيرادهم من ملف Excel.</p>
      <button type="button" onClick={onAdd} className="button-primary mt-6">
        إضافة طالب جديد
      </button>
    </div>
  )
}

export function AdminStudentsPage() {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<'all' | string>('all')
  const [selectedClass, setSelectedClass] = useState<'all' | string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[1])

  const { data, isLoading, isError, isFetching, refetch } = useStudentsQuery()

  const students = useMemo(() => data ?? [], [data])

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach((student) => {
      if (student.grade) set.add(student.grade)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [students])

  const classOptionsByGrade = useMemo(() => {
    const map = new Map<string, Set<string>>()
    students.forEach((student) => {
      if (!student.grade) return
      if (!map.has(student.grade)) {
        map.set(student.grade, new Set<string>())
      }
      if (student.class_name) {
        map.get(student.grade)?.add(student.class_name)
      }
    })
    const record: Record<string, string[]> = {}
    map.forEach((set, grade) => {
      record[grade] = Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
    })
    return record
  }, [students])

  const classFilterOptions = useMemo(() => {
    if (selectedGrade === 'all') {
      const set = new Set<string>()
      students.forEach((student) => {
        if (student.class_name) set.add(student.class_name)
      })
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
    }
    return classOptionsByGrade[selectedGrade] ?? []
  }, [classOptionsByGrade, selectedGrade, students])

  useEffect(() => {
    setSelectedClass('all')
  }, [selectedGrade])

  const createStudentMutation = useCreateStudentMutation()
  const updateStudentMutation = useUpdateStudentMutation()
  const deleteStudentMutation = useDeleteStudentMutation()

  const stats = useMemo(() => {
    const total = students.length
    const gradesCount = gradeOptions.length
    const classCount = Object.values(classOptionsByGrade).reduce((acc, classes) => acc + classes.length, 0)
    return [
      { label: 'إجمالي الطلاب', value: total },
      { label: 'عدد الصفوف', value: gradesCount },
      { label: 'عدد الشعب', value: classCount },
    ]
  }, [students.length, gradeOptions.length, classOptionsByGrade])

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return students.filter((student) => {
      const matchesQuery = !query
        ? true
        : [student.name, student.national_id, student.parent_name ?? '', student.parent_phone ?? '', student.grade, student.class_name]
            .map((value) => value?.toLowerCase?.() ?? '')
            .some((value) => value.includes(query))
      const matchesGrade = selectedGrade === 'all' ? true : student.grade === selectedGrade
      const matchesClass = selectedClass === 'all' ? true : student.class_name === selectedClass
      return matchesQuery && matchesGrade && matchesClass
    })
  }, [students, searchTerm, selectedGrade, selectedClass])

  const totalStudents = filteredStudents.length
  const totalPages = totalStudents ? Math.max(1, Math.ceil(totalStudents / pageSize)) : 1

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
    }
  }, [searchTerm, selectedGrade, selectedClass, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const startIndex = totalStudents ? (page - 1) * pageSize : 0
  const endIndex = totalStudents ? Math.min(startIndex + pageSize, totalStudents) : 0
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex)

  const handleAdd = () => {
    setEditingStudent(null)
    setIsFormOpen(true)
  }

  const handleEdit = (student: StudentRecord) => {
    setEditingStudent(student)
    setIsFormOpen(true)
  }

  const handleDelete = (student: StudentRecord) => {
    const confirmed = window.confirm(`هل ترغب بحذف الطالب ${student.name}؟ سيتم فقد جميع البيانات المتعلقة به.`)
    if (!confirmed) return
    deleteStudentMutation.mutate(student.id)
  }

  const handleFormSubmit = (values: StudentFormValues) => {
    const payload = {
      name: values.name,
      national_id: values.national_id,
      grade: values.grade,
      class_name: values.class_name,
      parent_name: values.parent_name,
      parent_phone: values.parent_phone,
    }
    
    console.log('📝 Submitting student data:', payload)
    
    if (editingStudent) {
      updateStudentMutation.mutate(
        {
          id: editingStudent.id,
          payload,
        },
        {
          onSuccess: () => {
            setIsFormOpen(false)
            setEditingStudent(null)
          },
          onError: (error: any) => {
            console.error('❌ Update error:', error)
            console.error('Error response:', error.response?.data)
          },
        },
      )
    } else {
      createStudentMutation.mutate(
        payload,
        {
          onSuccess: () => {
            setIsFormOpen(false)
            setEditingStudent(null)
          },
          onError: (error: any) => {
            console.error('❌ Create error:', error)
            console.error('Error response:', error.response?.data)
            if (error.response?.data?.errors) {
              console.error('Validation errors:', error.response.data.errors)
            }
          },
        },
      )
    }
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      toast({ type: 'success', title: 'تم تحديث قائمة الطلاب' })
    } catch {
      toast({ type: 'error', title: 'تعذر تحديث القائمة حالياً' })
    }
  }

  const isFormSubmitting = createStudentMutation.isPending || updateStudentMutation.isPending

  if (isLoading) {
    return (
      <section className="w-full space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">إدارة الطلاب</h1>
          <p className="text-sm text-muted">جاري تحميل بيانات الطلاب...</p>
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
      <section className="w-full space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">إدارة الطلاب</h1>
          <p className="text-sm text-muted">حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.</p>
        </header>
        <div className="glass-card text-center">
          <p className="text-sm font-semibold text-rose-600">تعذر تحميل قائمة الطلاب</p>
          <button type="button" onClick={() => refetch()} className="button-primary mt-4">
            إعادة المحاولة
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">إدارة الطلاب</h1>
        <p className="text-sm text-muted">تابع بيانات الطلاب، حدّث معلومات الاتصال، وحرّكهم بين الصفوف بسهولة.</p>
      </header>

      <div className="glass-card grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-slate-100 bg-white/80 p-5 text-center shadow-sm">
            <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
            <p className="text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="ابحث بالاسم، الهوية أو بيانات ولي الأمر"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedGrade}
                onChange={(event) => setSelectedGrade(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:w-48"
              >
                <option value="all">جميع الصفوف</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>

              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:w-48"
                disabled={classFilterOptions.length === 0}
              >
                <option value="all">كل الشعب</option>
                {classFilterOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRefresh} className="button-secondary" disabled={isFetching}>
              {isFetching ? 'جاري التحديث...' : 'تحديث القائمة'}
            </button>
            <button type="button" onClick={handleAdd} className="button-primary">
              إضافة طالب
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">الطالب</th>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">رقم الهوية</th>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">الصف</th>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">الشعبة</th>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">ولي الأمر</th>
                  <th scope="col" className="px-6 py-3 text-right tracking-wider">آخر تحديث</th>
                  <th scope="col" className="px-6 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedStudents.map((student) => {
                  const isDeleting =
                    deleteStudentMutation.isPending && deleteStudentMutation.variables === student.id
                  const isUpdating =
                    updateStudentMutation.isPending &&
                    (updateStudentMutation.variables as { id: number } | undefined)?.id === student.id

                  return (
                    <tr key={student.id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-900">{student.name}</span>
                          <span className="text-xs text-muted">{student.id ? `#${student.id}` : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-700">{student.national_id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.grade}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{student.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.parent_name ? <span>{student.parent_name}</span> : <span className="text-muted">—</span>}
                        <div className="text-xs text-muted">
                          {student.parent_phone ? student.parent_phone : 'لا يوجد رقم'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted">{formatDate(student.updated_at ?? student.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(student)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(student)}
                            className="rounded-full border border-transparent bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-rose-600"
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'جاري الحذف...' : 'حذف'}
                          </button>
                          {isUpdating ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              يتم التحديث...
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalStudents > 0 ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/70 px-4 py-4 text-sm text-slate-600 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.toLocaleString('ar-SA')}
                  </option>
                ))}
              </select>
              <span>طالب لكل صفحة</span>
              <span className="text-xs text-slate-400 sm:text-sm">
                عرض {startIndex + 1} - {endIndex} من إجمالي {totalStudents.toLocaleString('ar-SA')} طالب
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="rounded-2xl border border-slate-200 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                الأولى
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-2xl border border-slate-200 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                السابق
              </button>
              <span className="rounded-2xl bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                الصفحة {page.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-2xl border border-slate-200 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                التالي
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="rounded-2xl border border-slate-200 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                الأخيرة
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <StudentFormDialog
        open={isFormOpen}
        onClose={() => {
          if (isFormSubmitting) return
          setIsFormOpen(false)
          setEditingStudent(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
        student={editingStudent}
        gradeOptions={gradeOptions}
        classOptionsByGrade={classOptionsByGrade}
      />
    </section>
  )
}
