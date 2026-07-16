import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useStudentsQuery,
  useUpdateStudentMutation,
} from '../hooks'
import type { StudentRecord } from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import {
  AlertTriangle,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from 'lucide-react'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsToolbar,
} from '@/shared/workspace'

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
    } else if (!/^(05\d{8}|9665\d{8})$/.test(parentPhone)) {
      nextErrors.parent_phone = 'رقم الجوال يجب أن يبدأ بـ 05 (10 أرقام) أو 9665 (12 رقم)'
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

  const fieldError = (key: keyof StudentFormValues) =>
    errors[key] ? (
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ws-red)' }}>{errors[key]}</span>
    ) : null

  return (
    <div className="ws-modal" role="dialog" aria-modal onClick={isSubmitting ? undefined : onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 620 }} onClick={(event) => event.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{student ? `تحديث بيانات ${student.name}` : 'إضافة طالب جديد'}</h3>
          <p className="ws-modal__sub">أدخل معلومات الطالب الأكاديمية وبيانات ولي الأمر لمتابعة التواصل.</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="ws-modal__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <WsField label="اسم الطالب" htmlFor="student-name" style={{ gridColumn: '1 / -1' }}>
                <WsInput
                  id="student-name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="مثال: محمد أحمد"
                  autoFocus
                />
                {fieldError('name')}
              </WsField>

              <WsField label="رقم الهوية" htmlFor="student-national-id">
                <WsInput
                  id="student-national-id"
                  name="national_id"
                  type="text"
                  inputMode="numeric"
                  value={values.national_id}
                  onChange={(event) => setValues((prev) => ({ ...prev, national_id: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="10 أرقام"
                />
                {fieldError('national_id')}
              </WsField>

              <WsField label="الصف الدراسي" htmlFor="student-grade">
                <WsInput
                  id="student-grade"
                  name="grade"
                  type="text"
                  list="student-grade-options"
                  value={values.grade}
                  onChange={(event) => setValues((prev) => ({ ...prev, grade: event.target.value, class_name: '' }))}
                  disabled={isSubmitting}
                  placeholder="مثال: الصف الأول"
                />
                <datalist id="student-grade-options">
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade} />
                  ))}
                </datalist>
                {fieldError('grade')}
              </WsField>

              <WsField label="الشعبة" htmlFor="student-class-name">
                <WsInput
                  id="student-class-name"
                  name="class_name"
                  type="text"
                  list="student-class-options"
                  value={values.class_name}
                  onChange={(event) => setValues((prev) => ({ ...prev, class_name: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="مثال: أ"
                />
                <datalist id="student-class-options">
                  {availableClasses.map((className) => (
                    <option key={className} value={className} />
                  ))}
                </datalist>
                {fieldError('class_name')}
              </WsField>

              <WsField label="اسم ولي الأمر *" htmlFor="student-parent-name">
                <WsInput
                  id="student-parent-name"
                  name="parent_name"
                  type="text"
                  value={values.parent_name}
                  onChange={(event) => setValues((prev) => ({ ...prev, parent_name: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="اسم ولي الأمر"
                  required
                />
                {fieldError('parent_name')}
              </WsField>

              <WsField label="رقم جوال ولي الأمر *" htmlFor="student-parent-phone">
                <WsInput
                  id="student-parent-phone"
                  name="parent_phone"
                  type="tel"
                  inputMode="tel"
                  value={values.parent_phone}
                  onChange={(event) => setValues((prev) => ({ ...prev, parent_phone: event.target.value }))}
                  disabled={isSubmitting}
                  placeholder="05XXXXXXXX"
                  required
                />
                {fieldError('parent_phone')}
              </WsField>
            </div>
          </div>

          <footer className="ws-modal__foot">
            <WsBtn onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : student ? 'حفظ التعديلات' : 'إضافة الطالب'}
            </WsBtn>
          </footer>
        </form>
      </div>
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

  // أعداد الطلاب لكل صف وشعبة — لعمود المستكشف
  const gradeCounts = useMemo(() => {
    const byGrade = new Map<string, number>()
    const byGradeClass = new Map<string, number>()
    students.forEach((student) => {
      if (!student.grade) return
      byGrade.set(student.grade, (byGrade.get(student.grade) ?? 0) + 1)
      if (student.class_name) {
        const key = `${student.grade}|${student.class_name}`
        byGradeClass.set(key, (byGradeClass.get(key) ?? 0) + 1)
      }
    })
    return { byGrade, byGradeClass }
  }, [students])

  useEffect(() => {
    setSelectedClass('all')
  }, [selectedGrade])

  const createStudentMutation = useCreateStudentMutation()
  const updateStudentMutation = useUpdateStudentMutation()
  const deleteStudentMutation = useDeleteStudentMutation()

  const totalClassesCount = useMemo(
    () => Object.values(classOptionsByGrade).reduce((acc, classes) => acc + classes.length, 0),
    [classOptionsByGrade],
  )

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onError: (error: unknown) => {
            console.error('❌ Update error:', error)
            if (isAxiosError(error)) {
              console.error('Error response:', error.response?.data)
            }
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
          onError: (error: unknown) => {
            console.error('❌ Create error:', error)
            if (isAxiosError(error)) {
              console.error('Error response:', error.response?.data)
              if (error.response?.data?.errors) {
                console.error('Validation errors:', error.response.data.errors)
              }
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
  const isFiltered = searchTerm.trim() !== '' || selectedGrade !== 'all' || selectedClass !== 'all'

  const pageHeader = (
    <WsHeader
      title="إدارة الطلاب"
      badge={`${students.length.toLocaleString('ar-SA')} طالب`}
      actions={
        <>
          <WsBtn icon={RefreshCcw} onClick={handleRefresh} disabled={isFetching}>
            {isFetching ? 'جاري التحديث...' : 'تحديث'}
          </WsBtn>
          <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
            إضافة طالب
          </WsBtn>
        </>
      }
      facts={
        <>
          <WsFact icon={Users} label="إجمالي الطلاب:">
            {students.length.toLocaleString('ar-SA')}
          </WsFact>
          <WsFact icon={GraduationCap} label="الصفوف:">
            {gradeOptions.length}
          </WsFact>
          <WsFact icon={Layers} label="الشعب:">
            {totalClassesCount}
          </WsFact>
          {isFiltered && (
            <WsFact label="نتيجة الفلترة:">
              {totalStudents.toLocaleString('ar-SA')}
            </WsFact>
          )}
        </>
      }
    />
  )

  if (isLoading) {
    return (
      <WsPage>
        {pageHeader}
        <WsLayout>
          <WsMain>
            <WsBlock fill>
              <WsEmpty loading>جاري تحميل بيانات الطلاب... قد يستغرق ذلك بضع ثوانٍ.</WsEmpty>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  if (isError) {
    return (
      <WsPage>
        {pageHeader}
        <WsLayout>
          <WsMain>
            <WsBlock fill>
              <WsEmpty icon={AlertTriangle}>
                تعذر تحميل قائمة الطلاب.
                <WsBtn icon={RefreshCcw} onClick={() => refetch()}>
                  إعادة المحاولة
                </WsBtn>
              </WsEmpty>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  return (
    <WsPage>
      {pageHeader}

      <WsToolbar>
        <WsField label="بحث" htmlFor="students-search" grow>
          <WsInput
            id="students-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ابحث بالاسم، الهوية أو بيانات ولي الأمر"
          />
        </WsField>
        <WsField label="عدد الصفوف بالصفحة" htmlFor="students-page-size">
          <WsSelect id="students-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.toLocaleString('ar-SA')} طالب
              </option>
            ))}
          </WsSelect>
        </WsField>
      </WsToolbar>

      <WsLayout>
        {/* العمود الأيمن: مستكشف الصفوف والشعب */}
        <WsSideCol title="الصفوف والشعب" icon={GraduationCap} side="start" width={250} storageKey="ws:students:grades">
          <WsBlock fill scroll>
            <div>
              <button
                type="button"
                onClick={() => setSelectedGrade('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  width: '100%',
                  textAlign: 'right',
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: '1px solid var(--ws-hairline)',
                  background: selectedGrade === 'all' ? 'var(--ws-accent-soft)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: selectedGrade === 'all' ? 700 : 600, color: 'var(--ws-text)' }}>
                  جميع الصفوف
                </span>
                <WsChip>{students.length.toLocaleString('ar-SA')}</WsChip>
              </button>

              {gradeOptions.map((grade) => {
                const isSelected = selectedGrade === grade
                const gradeClasses = classOptionsByGrade[grade] ?? []
                return (
                  <div key={grade} style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedGrade(isSelected ? 'all' : grade)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        width: '100%',
                        textAlign: 'right',
                        padding: '8px 12px',
                        border: 'none',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)', minWidth: 0 }}>
                        {grade}
                      </span>
                      <WsChip tone={isSelected ? 'sky' : undefined}>
                        {(gradeCounts.byGrade.get(grade) ?? 0).toLocaleString('ar-SA')}
                      </WsChip>
                    </button>

                    {/* شعب الصف المحدد */}
                    {isSelected && gradeClasses.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '2px 12px 10px' }}>
                        <WsChip
                          tone={selectedClass === 'all' ? 'sky' : undefined}
                          onClick={() => setSelectedClass('all')}
                        >
                          الكل
                        </WsChip>
                        {gradeClasses.map((className) => (
                          <WsChip
                            key={className}
                            tone={selectedClass === className ? 'sky' : undefined}
                            onClick={() => setSelectedClass(selectedClass === className ? 'all' : className)}
                          >
                            {className} ({(gradeCounts.byGradeClass.get(`${grade}|${className}`) ?? 0).toLocaleString('ar-SA')})
                          </WsChip>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </WsBlock>
        </WsSideCol>

        {/* الوسط: جدول الطلاب */}
        <WsMain>
          <WsBlock
            title={
              selectedGrade === 'all'
                ? 'كل الطلاب'
                : selectedClass === 'all'
                  ? selectedGrade
                  : `${selectedGrade} / ${selectedClass}`
            }
            icon={Users}
            count={totalStudents.toLocaleString('ar-SA')}
            fill
          >
            {filteredStudents.length === 0 ? (
              <WsEmpty icon={Users}>
                {isFiltered ? 'لا توجد نتائج مطابقة للفلاتر الحالية.' : 'لا توجد بيانات للعرض حالياً — ابدأ بإضافة الطلاب أو استيرادهم من Excel.'}
                {!isFiltered && (
                  <WsBtn variant="primary" icon={Plus} onClick={handleAdd}>
                    إضافة طالب جديد
                  </WsBtn>
                )}
              </WsEmpty>
            ) : (
              <>
                <WsTable>
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>رقم الهوية</th>
                      <th>الصف</th>
                      <th>الشعبة</th>
                      <th>ولي الأمر</th>
                      <th>آخر تحديث</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => {
                      const isDeleting =
                        deleteStudentMutation.isPending && deleteStudentMutation.variables === student.id
                      const isUpdating =
                        updateStudentMutation.isPending &&
                        (updateStudentMutation.variables as { id: number } | undefined)?.id === student.id

                      return (
                        <tr key={student.id}>
                          <td>
                            <span style={{ display: 'block', fontWeight: 700 }}>{student.name}</span>
                            <span className="ws-cell-sub">{student.id ? `#${student.id}` : ''}</span>
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{student.national_id}</td>
                          <td>{student.grade}</td>
                          <td>{student.class_name}</td>
                          <td>
                            <span style={{ display: 'block' }}>{student.parent_name || '—'}</span>
                            <span className="ws-cell-sub">{student.parent_phone || 'لا يوجد رقم جوال'}</span>
                          </td>
                          <td>
                            <span className="ws-cell-sub">{formatDate(student.updated_at ?? student.created_at)}</span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <WsBtn size="sm" icon={Pencil} onClick={() => handleEdit(student)}>
                                تعديل
                              </WsBtn>
                              <WsBtn size="sm" variant="danger" icon={Trash2} onClick={() => handleDelete(student)} disabled={isDeleting}>
                                {isDeleting ? 'جاري الحذف...' : 'حذف'}
                              </WsBtn>
                              {isUpdating && <WsChip tone="amber">يتم التحديث...</WsChip>}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>

                {/* شريط الترقيم */}
                {totalStudents > 0 && (
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '7px 12px',
                      borderTop: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                      عرض {(startIndex + 1).toLocaleString('ar-SA')} - {endIndex.toLocaleString('ar-SA')} من{' '}
                      {totalStudents.toLocaleString('ar-SA')} طالب
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <WsBtn size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                        الأولى
                      </WsBtn>
                      <WsBtn size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                        السابق
                      </WsBtn>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '0 6px' }}>
                        {page.toLocaleString('ar-SA')} / {totalPages.toLocaleString('ar-SA')}
                      </span>
                      <WsBtn size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                        التالي
                      </WsBtn>
                      <WsBtn size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                        الأخيرة
                      </WsBtn>
                    </span>
                  </div>
                )}
              </>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

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
    </WsPage>
  )
}
