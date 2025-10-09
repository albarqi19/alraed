import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useCreateLateArrivalMutation,
  useDeleteLateArrivalMutation,
  useLateArrivalStatsQuery,
  useLateArrivalsQuery,
  useStudentsQuery,
  useSendLateArrivalMessageMutation,
} from '../hooks'
import type { LateArrivalRecord, StudentRecord } from '../types'

type FilterState = {
  date: string
  className: string
  search: string
  onlyWithoutMessage: boolean
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA', options)
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  }
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className={`rounded-2xl px-4 py-4 text-right shadow-sm ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString('ar-SA')}</p>
    </article>
  )
}

function MessageStatusBadge({ sent, sentAt }: { sent: boolean; sentAt?: string | null }) {
  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <i className="bi bi-check-circle" /> أُرسلت {sentAt ? `(${formatTime(sentAt)})` : ''}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
      <i className="bi bi-clock-history" /> بانتظار الإرسال
    </span>
  )
}

interface LateArrivalFormDialogProps {
  open: boolean
  defaultDate: string
  onClose: () => void
  onSubmit: (payload: { student_ids: number[]; late_date: string; notes?: string | null }) => void
  isSubmitting: boolean
  students: StudentRecord[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function LateArrivalFormDialog({
  open,
  defaultDate,
  onClose,
  onSubmit,
  isSubmitting,
  students,
  isLoading,
  isError,
  onRetry,
}: LateArrivalFormDialogProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [lateDate, setLateDate] = useState<string>(defaultDate || today)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLateDate(defaultDate || today)
    setNotes('')
    setSearch('')
    setClassFilter('')
    setSelectedIds(new Set())
    setValidationError(null)
  }, [defaultDate, open, today])

  const classOptions = useMemo(() => {
    if (!students) return [] as string[]
    const unique = new Set(students.map((student) => student.class_name).filter(Boolean) as string[])
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [students])

  const filteredStudents = useMemo(() => {
    if (!students) return []
    const normalizedSearch = search.trim().toLowerCase()
    return students
      .filter((student) => (classFilter ? student.class_name === classFilter : true))
      .filter((student) => {
        if (!normalizedSearch) return true
        const haystack = [student.name, student.national_id, student.parent_name].join(' ').toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [students, classFilter, search])

  const groupedStudents = useMemo(() => {
    const groups = new Map<string, StudentRecord[]>()
    for (const student of filteredStudents) {
      const groupKey = student.class_name || 'غير محدد'
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(student)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'))
  }, [filteredStudents])

  const filteredIds = useMemo(() => filteredStudents.map((student) => student.id), [filteredStudents])
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))
  const selectedCount = selectedIds.size

  const handleToggleStudent = (studentId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleToggleClass = (className: string) => {
    const classStudents = groupedStudents.find(([key]) => key === className)?.[1] ?? []
    if (classStudents.length === 0) return

    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = classStudents.every((student) => next.has(student.id))
      classStudents.forEach((student) => {
        if (allSelected) {
          next.delete(student.id)
        } else {
          next.add(student.id)
        }
      })
      return next
    })
  }

  const handleToggleFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedCount === 0) {
      setValidationError('يرجى اختيار طالب واحد على الأقل لتسجيل التأخير')
      return
    }
    setValidationError(null)
    const payload = {
      student_ids: Array.from(selectedIds),
      late_date: lateDate,
      notes: notes.trim() ? notes.trim() : undefined,
    }
    onSubmit(payload)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <form
        className="relative w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl"
        onSubmit={handleSubmit}
        noValidate
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تسجيل تأخير جديد</p>
          <h2 className="text-2xl font-bold text-slate-900">حدّد الطلاب المتأخرين وأرسل تنبيهاتهم فوراً</h2>
          <p className="text-sm text-muted">
            اختر تاريخ التأخير، حدّد الطلاب من أي فصل، وسيتم إرسال رسائل واتساب تلقائياً بعد التسجيل.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
          <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm">
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="late-arrival-date">
                تاريخ التأخير
              </label>
              <input
                id="late-arrival-date"
                type="date"
                value={lateDate}
                onChange={(event) => setLateDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="late-arrival-class-filter">
                تصفية بالفصل
              </label>
              <select
                id="late-arrival-class-filter"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting || classOptions.length === 0}
              >
                <option value="">جميع الفصول</option>
                {classOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="late-arrival-search">
                البحث بالاسم أو الهوية
              </label>
              <input
                id="late-arrival-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="أدخل اسم الطالب أو رقم الهوية"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600" htmlFor="late-arrival-notes">
                ملاحظات (اختياري)
              </label>
              <textarea
                id="late-arrival-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="مثال: تأخر بسبب مواصلات"
                rows={5}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSubmitting}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
              <p>عدد الطلاب المحددين: {selectedCount.toLocaleString('ar-SA')}</p>
              <p>النتائج الحالية: {filteredStudents.length.toLocaleString('ar-SA')}</p>
              <p>إجمالي القائمة: {(students?.length ?? 0).toLocaleString('ar-SA')}</p>
            </div>
          </section>

          <section className="flex h-[520px] flex-col rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">قائمة الطلاب</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFiltered}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  disabled={filteredIds.length === 0 || isSubmitting}
                >
                  {allFilteredSelected ? 'إلغاء تحديد النتائج' : 'تحديد كل النتائج'}
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  تم اختيار {selectedCount.toLocaleString('ar-SA')} طالب
                </span>
              </div>
            </div>

            <div className="grow overflow-y-auto rounded-2xl border border-dashed border-slate-200 bg-white/60 p-3">
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  جاري تحميل قائمة الطلاب...
                </div>
              ) : isError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-rose-700">
                  <i className="bi bi-exclamation-triangle text-3xl" />
                  تعذر تحميل الطلاب
                  <button
                    type="button"
                    onClick={onRetry}
                    className="button-secondary"
                    disabled={isSubmitting}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted">
                  <i className="bi bi-search text-3xl text-slate-300" />
                  لا توجد نتائج مطابقة للمعايير الحالية.
                  {students && students.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setClassFilter('')
                        setSearch('')
                      }}
                      className="button-secondary"
                      disabled={isSubmitting}
                    >
                      إعادة تعيين البحث
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedStudents.map(([className, classStudents]) => {
                    const classSelected = classStudents.length > 0 && classStudents.every((student) => selectedIds.has(student.id))
                    return (
                      <article
                        key={className}
                        className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm"
                      >
                        <header className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                              {className}
                            </span>
                            <span className="text-[11px] text-muted">
                              {classStudents.length.toLocaleString('ar-SA')} طالب
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleClass(className)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                            disabled={isSubmitting}
                          >
                            {classSelected ? 'إلغاء تحديد الفصل' : 'تحديد الفصل'}
                          </button>
                        </header>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {classStudents.map((student) => {
                            const checked = selectedIds.has(student.id)
                            return (
                              <label
                                key={student.id}
                                htmlFor={`late-student-${student.id}`}
                                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-right text-sm transition ${
                                  checked
                                    ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700'
                                    : 'border-slate-200 bg-white/60 hover:border-indigo-200'
                                }`}
                              >
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{student.name}</p>
                                  <p className="text-xs text-muted">
                                    {student.national_id ? `هوية: ${student.national_id}` : 'بدون رقم هوية'}
                                  </p>
                                </div>
                                <input
                                  id={`late-student-${student.id}`}
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={checked}
                                  onChange={() => handleToggleStudent(student.id)}
                                  disabled={isSubmitting}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {validationError ? (
            <p className="text-xs font-semibold text-rose-600">{validationError}</p>
          ) : (
            <p className="text-xs text-muted">
              سيتم إرسال رسائل واتساب تلقائياً للأرقام المتوفرة بعد إتمام التسجيل.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="button-secondary"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button type="submit" className="button-primary" disabled={isSubmitting || filteredStudents.length === 0}>
              {isSubmitting ? 'جاري التسجيل...' : 'تسجيل التأخير'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}

export function AdminLateArrivalsPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filters, setFilters] = useState<FilterState>({ date: today, className: '', search: '', onlyWithoutMessage: false })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const queryFilters = useMemo(
    () => ({
      date: filters.date || undefined,
      className: filters.className || undefined,
    }),
    [filters.className, filters.date],
  )

  const lateArrivalsQuery = useLateArrivalsQuery(queryFilters)
  const statsQuery = useLateArrivalStatsQuery()
  const studentsQuery = useStudentsQuery()

  const deleteMutation = useDeleteLateArrivalMutation()
  const sendMessageMutation = useSendLateArrivalMessageMutation()
  const createLateArrivalMutation = useCreateLateArrivalMutation()

  const handleOpenCreate = () => {
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    if (createLateArrivalMutation.isPending) return
    setIsCreateOpen(false)
  }

  const handleSubmitCreate = (payload: { student_ids: number[]; late_date: string; notes?: string | null }) => {
    createLateArrivalMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false)
        setFilters((prev) => ({ ...prev, date: payload.late_date || prev.date }))
      },
    })
  }

  const records = useMemo(() => lateArrivalsQuery.data ?? [], [lateArrivalsQuery.data])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return records.filter((record) => {
      const matchesSearch = normalizedSearch
        ? record.student_name.toLowerCase().includes(normalizedSearch) ||
          record.student_class.toLowerCase().includes(normalizedSearch)
        : true
      const matchesMessage = filters.onlyWithoutMessage ? !record.whatsapp_sent : true
      return matchesSearch && matchesMessage
    })
  }, [filters.onlyWithoutMessage, filters.search, records])

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(filteredRecords[0].id)
    }
  }, [filteredRecords, selectedId])

  const selectedRecord = useMemo<LateArrivalRecord | null>(() => {
    if (!selectedId) return null
    return records.find((record) => record.id === selectedId) ?? null
  }, [records, selectedId])

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(records.map((record) => record.student_class).filter(Boolean)))
    return unique.sort((a, b) => a.localeCompare(b, 'ar'))
  }, [records])

  const summaries = useMemo(() => {
    const total = records.length
    const pendingMessages = records.filter((record) => !record.whatsapp_sent).length
    const noteCount = records.filter((record) => Boolean(record.notes)).length
    return { total, pendingMessages, noteCount }
  }, [records])

  const handleFilterChange = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResolve = (record: LateArrivalRecord) => {
    deleteMutation.mutate(record.id, {
      onSuccess: () => {
        if (selectedId === record.id) {
          setSelectedId(null)
        }
      },
    })
  }

  const handleSendMessage = (record: LateArrivalRecord) => {
    sendMessageMutation.mutate(record.id)
  }

  const isSendingSelected = selectedRecord
    ? sendMessageMutation.isPending && sendMessageMutation.variables === selectedRecord.id
    : false
  const isDeletingSelected = selectedRecord
    ? deleteMutation.isPending && deleteMutation.variables === selectedRecord.id
    : false

  const isLoading = lateArrivalsQuery.isLoading
  const isError = lateArrivalsQuery.isError

  return (
    <>
      <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">إدارة التأخير</h1>
            <p className="text-sm text-muted">
              راقب حالات التأخر اليومية، أرسل تنبيهات لأولياء الأمور، وحدث حالة الطلاب بعد المعالجة.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="button-primary"
              disabled={createLateArrivalMutation.isPending}
            >
              <i className="bi bi-plus-circle" /> تسجيل تأخير جديد
            </button>
            <div className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
              يتم التحديث تلقائياً كل دقيقة
            </div>
          </div>
        </div>
        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            تعذر تحميل قائمة التأخر.
            <button
              type="button"
              onClick={() => lateArrivalsQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section className="glass-card space-y-6">
        <div className="grid gap-3 lg:grid-cols-4">
          {statsQuery.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))
            : statsQuery.isSuccess
              ? [
                  <StatCard
                    key="today"
                    label="تأخر اليوم"
                    value={statsQuery.data.today}
                    tone="bg-amber-50 text-amber-700 border border-amber-200"
                  />,
                  <StatCard
                    key="week"
                    label="إجمالي الأسبوع"
                    value={statsQuery.data.week}
                    tone="bg-slate-100 text-slate-700 border border-slate-200"
                  />,
                  <StatCard
                    key="messages"
                    label="رسائل مرسلة اليوم"
                    value={statsQuery.data.messages_sent}
                    tone="bg-emerald-50 text-emerald-700 border border-emerald-200"
                  />,
                ]
              : [
                  <div
                    key="error"
                    className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700"
                  >
                    تعذر تحميل إحصائيات التأخر.
                  </div>,
                ]}
          <article className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">ملخص اليوم</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>إجمالي الحالات: {summaries.total.toLocaleString('ar-SA')}</li>
              <li>بانتظار الإشعار: {summaries.pendingMessages.toLocaleString('ar-SA')}</li>
              <li>بها ملاحظات: {summaries.noteCount.toLocaleString('ar-SA')}</li>
            </ul>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">تاريخ المتابعة</label>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => handleFilterChange('date', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">الفصل</label>
            <select
              value={filters.className}
              onChange={(event) => handleFilterChange('className', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">جميع الفصول</option>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">بحث بالاسم أو الفصل</label>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              placeholder="مثال: محمد سعيد"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <label className="mt-7 flex items-center justify-end gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm">
            <input
              type="checkbox"
              checked={filters.onlyWithoutMessage}
              onChange={(event) => handleFilterChange('onlyWithoutMessage', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            عرض الحالات التي لم تُرسل رسائلها
          </label>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),420px]">
          <div className="rounded-3xl border border-slate-100 bg-white/80 shadow-sm">
            {isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                جاري تحميل بيانات التأخر...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-inboxes text-3xl text-slate-300" />
                لا توجد حالات تأخر بالمعايير الحالية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[880px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">الطالب</th>
                      <th className="px-4 py-2.5 font-semibold">الفصل</th>
                      <th className="px-4 py-2.5 font-semibold">تاريخ التأخر</th>
                      <th className="px-4 py-2.5 font-semibold">وقت التسجيل</th>
                      <th className="px-4 py-2.5 font-semibold">الملاحظات</th>
                      <th className="px-4 py-2.5 font-semibold">حالة الرسالة</th>
                      <th className="px-4 py-2.5 font-semibold">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => {
                      const isSelected = record.id === selectedId
                      const isDeleting = deleteMutation.isPending && deleteMutation.variables === record.id
                      const isSending = sendMessageMutation.isPending && sendMessageMutation.variables === record.id
                      return (
                        <tr
                          key={record.id}
                          className={`border-t border-slate-100 text-[13px] transition ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-2 align-middle">
                            <button
                              type="button"
                              onClick={() => setSelectedId(record.id)}
                              className="text-[13px] font-semibold text-slate-900 transition hover:text-indigo-600"
                            >
                              {record.student_name}
                            </button>
                            <p className="text-[11px] leading-4 text-muted">معرّف الطالب: {record.student_id}</p>
                          </td>
                          <td className="px-4 py-2 text-[13px] text-slate-600">{record.student_class}</td>
                          <td className="px-4 py-2 text-[13px] text-slate-600">{formatDate(record.late_date)}</td>
                          <td className="px-4 py-2 text-[13px] text-slate-600">{formatTime(record.recorded_at)}</td>
                          <td className="px-4 py-2 text-[12px] text-slate-500">{record.notes ?? '—'}</td>
                          <td className="px-4 py-2 align-middle">
                            <MessageStatusBadge sent={record.whatsapp_sent} sentAt={record.whatsapp_sent_at} />
                          </td>
                          <td className="px-4 py-2 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => handleSendMessage(record)}
                                disabled={record.whatsapp_sent || isSending}
                              >
                                <i className="bi bi-send" />
                                {isSending ? 'جارٍ الإرسال' : 'إعادة الإرسال'}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => handleResolve(record)}
                                disabled={isDeleting}
                              >
                                <i className="bi bi-check-circle" />
                                {isDeleting ? 'جارٍ المعالجة' : 'تمت المعالجة'}
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
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-100 bg-white/70 p-5 shadow-sm">
            {selectedRecord ? (
              <div className="space-y-4">
                <header className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تفاصيل الحالة</p>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedRecord.student_name}</h3>
                  <p className="text-xs text-muted">
                    {selectedRecord.student_class} • تم التسجيل {formatDate(selectedRecord.recorded_at, {
                      dateStyle: 'medium',
                    })}{' '}
                    عند {formatTime(selectedRecord.recorded_at)}
                  </p>
                  <p className="text-xs text-muted">تاريخ التأخر: {formatDate(selectedRecord.late_date)}</p>
                </header>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleSendMessage(selectedRecord)}
                    disabled={selectedRecord.whatsapp_sent || isSendingSelected}
                  >
                    <i className="bi bi-send" /> {isSendingSelected ? 'جارٍ الإرسال...' : 'إرسال تنبيه'}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleResolve(selectedRecord)}
                    disabled={isDeletingSelected}
                  >
                    <i className="bi bi-check2-circle" /> {isDeletingSelected ? 'جارٍ المعالجة...' : 'معالجة التأخر'}
                  </button>
                </div>

                <section className="space-y-3 text-xs">
                  <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold text-slate-500">حالة الإشعار</p>
                    <MessageStatusBadge sent={selectedRecord.whatsapp_sent} sentAt={selectedRecord.whatsapp_sent_at} />
                    <p className="text-[11px] text-muted">
                      المعرّف: {selectedRecord.id} — الطالب #{selectedRecord.student_id}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500">الملاحظات</p>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[13px] text-slate-700">
                      {selectedRecord.notes ? selectedRecord.notes : 'لا توجد ملاحظات مسجلة.'}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-arrow-left-circle text-3xl text-slate-300" />
                اختر حالة من الجدول لمراجعة التفاصيل.
              </div>
            )}
          </aside>
        </div>
      </section>
      </section>
      <LateArrivalFormDialog
        open={isCreateOpen}
        defaultDate={filters.date || today}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
        isSubmitting={createLateArrivalMutation.isPending}
        students={studentsQuery.data}
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError ?? false}
        onRetry={() => {
          void studentsQuery.refetch()
        }}
      />
    </>
  )
}
