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
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Inbox,
  Info,
  ListChecks,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  StickyNote,
  Timer,
} from 'lucide-react'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsSwitch,
  WsTable,
  WsTextarea,
  WsToolbar,
} from '@/shared/workspace'

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
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn', options)
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })
  }
}

function MessageStatusChip({ sent, sentAt }: { sent: boolean; sentAt?: string | null }) {
  if (sent) {
    return (
      <WsChip tone="green" icon={CheckCircle2}>
        أُرسلت {sentAt ? `(${formatTime(sentAt)})` : ''}
      </WsChip>
    )
  }
  return (
    <WsChip tone="amber" icon={Clock3}>
      بانتظار الإرسال
    </WsChip>
  )
}

interface LateArrivalFormDialogProps {
  open: boolean
  defaultDate: string
  onClose: () => void
  onSubmit: (payload: { student_ids: number[]; late_date: string; notes?: string | null }) => void
  isSubmitting: boolean
  students: StudentRecord[] | undefined
  lateArrivals: LateArrivalRecord[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

// مودال تسجيل التأخير الجماعي — منتقي طلاب بتجميع الفصول (يستخدم كلاسات ws-modal الخام لأنه نموذج form)
function LateArrivalFormDialog({
  open,
  defaultDate,
  onClose,
  onSubmit,
  isSubmitting,
  students,
  lateArrivals,
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

  // حساب عدد التأخيرات لكل طالب
  const lateCountByStudent = useMemo(() => {
    const counts = new Map<number, number>()
    if (!lateArrivals) return counts

    for (const record of lateArrivals) {
      const currentCount = counts.get(record.student_id) ?? 0
      counts.set(record.student_id, currentCount + 1)
    }

    return counts
  }, [lateArrivals])

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
    <div className="ws-modal" onClick={() => !isSubmitting && onClose()}>
      <form
        className="ws-modal__panel"
        style={{ maxWidth: 920 }}
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">تسجيل تأخير جديد</h3>
          <p className="ws-modal__sub">
            اختر تاريخ التأخير، حدّد الطلاب من أي فصل، وسيتم إرسال رسائل واتساب تلقائياً بعد التسجيل.
          </p>
        </header>

        <div className="ws-modal__body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)',
              gap: 14,
            }}
          >
            {/* عمود الإعدادات والفلاتر */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <WsField label="تاريخ التأخير" htmlFor="late-arrival-date">
                <WsInput
                  id="late-arrival-date"
                  type="date"
                  value={lateDate}
                  onChange={(event) => setLateDate(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </WsField>

              <WsField label="تصفية بالفصل" htmlFor="late-arrival-class-filter">
                <WsSelect
                  id="late-arrival-class-filter"
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                  disabled={isSubmitting || classOptions.length === 0}
                >
                  <option value="">جميع الفصول</option>
                  {classOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </WsSelect>
              </WsField>

              <WsField label="البحث بالاسم أو الهوية" htmlFor="late-arrival-search">
                <WsInput
                  id="late-arrival-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="اسم الطالب أو رقم الهوية"
                  disabled={isSubmitting}
                />
              </WsField>

              <WsField label="ملاحظات (اختياري)" htmlFor="late-arrival-notes">
                <WsTextarea
                  id="late-arrival-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="مثال: تأخر بسبب مواصلات"
                  rows={3}
                  disabled={isSubmitting}
                />
              </WsField>

              <WsFactsList
                style={{
                  border: '1px solid var(--ws-hairline)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'var(--ws-surface-2)',
                }}
              >
                <WsFactRow label="المحددون">{selectedCount.toLocaleString('ar-SA-u-nu-latn')}</WsFactRow>
                <WsFactRow label="النتائج الحالية">{filteredStudents.length.toLocaleString('ar-SA-u-nu-latn')}</WsFactRow>
                <WsFactRow label="إجمالي القائمة">{(students?.length ?? 0).toLocaleString('ar-SA-u-nu-latn')}</WsFactRow>
              </WsFactsList>
            </div>

            {/* عمود قائمة الطلاب */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="ws-block__title">قائمة الطلاب</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <WsBtn size="sm" onClick={handleToggleFiltered} disabled={filteredIds.length === 0 || isSubmitting}>
                    {allFilteredSelected ? 'إلغاء تحديد النتائج' : 'تحديد كل النتائج'}
                  </WsBtn>
                  <WsChip>{selectedCount.toLocaleString('ar-SA-u-nu-latn')} محدد</WsChip>
                </span>
              </div>

              <div
                style={{
                  height: '48vh',
                  overflowY: 'auto',
                  border: '1px dashed var(--ws-border)',
                  borderRadius: 8,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {isLoading ? (
                  <WsEmpty loading>جاري تحميل قائمة الطلاب...</WsEmpty>
                ) : isError ? (
                  <WsEmpty icon={AlertTriangle}>
                    تعذر تحميل الطلاب
                    <WsBtn size="sm" onClick={onRetry} disabled={isSubmitting}>
                      إعادة المحاولة
                    </WsBtn>
                  </WsEmpty>
                ) : filteredStudents.length === 0 ? (
                  <WsEmpty icon={Search}>
                    لا توجد نتائج مطابقة للمعايير الحالية.
                    {students && students.length > 0 ? (
                      <WsBtn
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => {
                          setClassFilter('')
                          setSearch('')
                        }}
                        disabled={isSubmitting}
                      >
                        إعادة تعيين البحث
                      </WsBtn>
                    ) : null}
                  </WsEmpty>
                ) : (
                  groupedStudents.map(([className, classStudents]) => {
                    const classSelected =
                      classStudents.length > 0 && classStudents.every((student) => selectedIds.has(student.id))
                    return (
                      <div key={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            position: 'sticky',
                            top: 0,
                            background: 'var(--ws-surface)',
                            padding: '2px 0',
                            zIndex: 2,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <WsChip tone="green">{className}</WsChip>
                            <span className="ws-fact">{classStudents.length.toLocaleString('ar-SA-u-nu-latn')} طالب</span>
                          </span>
                          <WsBtn size="sm" onClick={() => handleToggleClass(className)} disabled={isSubmitting}>
                            {classSelected ? 'إلغاء تحديد الفصل' : 'تحديد الفصل'}
                          </WsBtn>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                            gap: 6,
                          }}
                        >
                          {classStudents.map((student) => {
                            const checked = selectedIds.has(student.id)
                            const lateCount = lateCountByStudent.get(student.id) ?? 0
                            return (
                              <label
                                key={student.id}
                                htmlFor={`late-student-${student.id}`}
                                className={`ws-pick ${checked ? 'is-checked' : ''}`}
                              >
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
                                    <span className="ws-pick__name">{student.name}</span>
                                    {lateCount > 0 && (
                                      <WsChip tone="red" title={`عدد مرات التأخر: ${lateCount}`}>
                                        {lateCount}
                                      </WsChip>
                                    )}
                                  </span>
                                  <span className="ws-pick__sub">
                                    {student.national_id ? `هوية: ${student.national_id}` : 'بدون رقم هوية'}
                                  </span>
                                </span>
                                <input
                                  id={`late-student-${student.id}`}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleStudent(student.id)}
                                  disabled={isSubmitting}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="ws-modal__foot">
          {validationError ? (
            <span className="ws-fact" style={{ marginInlineEnd: 'auto', color: 'var(--ws-red)' }}>
              {validationError}
            </span>
          ) : (
            <span className="ws-fact" style={{ marginInlineEnd: 'auto' }}>
              سيتم إرسال رسائل واتساب تلقائياً للأرقام المتوفرة بعد إتمام التسجيل.
            </span>
          )}
          <WsBtn onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="primary" icon={Timer} type="submit" disabled={isSubmitting || filteredStudents.length === 0}>
            {isSubmitting ? 'جاري التسجيل...' : 'تسجيل التأخير'}
          </WsBtn>
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

  // جلب كل التأخيرات (بدون فلاتر) لحساب العدد الكلي لكل طالب
  const allLateArrivalsQuery = useLateArrivalsQuery({})

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
    <WsPage>
      <WsHeader
        title="إدارة التأخير"
        badge="متابعة يومية"
        actions={
          <WsBtn variant="primary" icon={Plus} onClick={handleOpenCreate} disabled={createLateArrivalMutation.isPending}>
            تسجيل تأخير جديد
          </WsBtn>
        }
        facts={
          <>
            {statsQuery.isSuccess && (
              <>
                <WsFact icon={Timer} label="تأخر اليوم:">
                  {statsQuery.data.today.toLocaleString('ar-SA-u-nu-latn')}
                </WsFact>
                <WsFact icon={ClipboardList} label="إجمالي الأسبوع:">
                  {statsQuery.data.week.toLocaleString('ar-SA-u-nu-latn')}
                </WsFact>
                <WsFact icon={MessageSquare} label="رسائل مرسلة اليوم:">
                  {statsQuery.data.messages_sent.toLocaleString('ar-SA-u-nu-latn')}
                </WsFact>
              </>
            )}
            <WsFact icon={Clock3} label="بانتظار الإشعار:">
              {summaries.pendingMessages.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={StickyNote} label="بها ملاحظات:">
              {summaries.noteCount.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          </>
        }
      >
        <WsChip icon={RefreshCw} title="تُحدَّث القائمة تلقائياً">
          تحديث تلقائي كل دقيقة
        </WsChip>
      </WsHeader>

      <WsToolbar>
        <WsField label="تاريخ المتابعة" htmlFor="ws-late-date">
          <WsInput
            id="ws-late-date"
            type="date"
            value={filters.date}
            onChange={(event) => handleFilterChange('date', event.target.value)}
          />
        </WsField>

        <WsField label="الفصل" htmlFor="ws-late-class">
          <WsSelect
            id="ws-late-class"
            value={filters.className}
            onChange={(event) => handleFilterChange('className', event.target.value)}
          >
            <option value="">جميع الفصول</option>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="بحث بالاسم أو الفصل" htmlFor="ws-late-search" grow>
          <WsInput
            id="ws-late-search"
            type="search"
            value={filters.search}
            onChange={(event) => handleFilterChange('search', event.target.value)}
            placeholder="مثال: محمد سعيد"
          />
        </WsField>

        <span className="ws-fact" style={{ height: 30, alignSelf: 'flex-end' }}>
          <WsSwitch
            checked={filters.onlyWithoutMessage}
            onChange={(checked) => handleFilterChange('onlyWithoutMessage', checked)}
          />
          <span>بدون رسائل فقط</span>
        </span>
      </WsToolbar>

      {isError && (
        <WsAlert>
          تعذر تحميل قائمة التأخر.
          <WsBtn size="sm" icon={RotateCcw} onClick={() => lateArrivalsQuery.refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}

      <WsLayout>
        <WsMain>
          <WsBlock title="حالات التأخر" icon={Timer} count={filteredRecords.length.toLocaleString('ar-SA-u-nu-latn')} fill>
            {isLoading ? (
              <WsEmpty loading>جاري تحميل بيانات التأخر...</WsEmpty>
            ) : filteredRecords.length === 0 ? (
              <WsEmpty icon={Inbox}>لا توجد حالات تأخر بالمعايير الحالية.</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الفصل</th>
                    <th>تاريخ التأخر</th>
                    <th>وقت التسجيل</th>
                    <th>الملاحظات</th>
                    <th>حالة الرسالة</th>
                    <th>الإجراء</th>
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
                        onClick={() => setSelectedId(record.id)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{record.student_name}</span>
                          <span className="ws-cell-sub">{record.student_id}</span>
                        </td>
                        <td>{record.student_class}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(record.late_date)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatTime(record.recorded_at)}</td>
                        <td style={{ color: 'var(--ws-text-2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {record.notes ?? '—'}
                        </td>
                        <td>
                          <MessageStatusChip sent={record.whatsapp_sent} sentAt={record.whatsapp_sent_at} />
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <WsBtn
                              size="sm"
                              icon={Send}
                              onClick={() => handleSendMessage(record)}
                              disabled={record.whatsapp_sent || isSending}
                            >
                              {isSending ? 'جارٍ ...' : 'إرسال'}
                            </WsBtn>
                            <WsBtn size="sm" icon={CheckCircle2} onClick={() => handleResolve(record)} disabled={isDeleting}>
                              {isDeleting ? 'جارٍ ...' : 'تمت'}
                            </WsBtn>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol title="تفاصيل الحالة" icon={ListChecks} storageKey="ws:late-arrivals:sidecol">
          {selectedRecord ? (
            <>
              <WsBlock padded>
                <WsFactsList>
                  <WsFactRow label="الطالب">{selectedRecord.student_name}</WsFactRow>
                  <WsFactRow label="الفصل">{selectedRecord.student_class}</WsFactRow>
                  <WsFactRow label="تاريخ التأخر">{formatDate(selectedRecord.late_date)}</WsFactRow>
                  <WsFactRow label="وقت التسجيل">
                    {formatDate(selectedRecord.recorded_at)} — {formatTime(selectedRecord.recorded_at)}
                  </WsFactRow>
                  <WsFactRow label="المعرّف">
                    {selectedRecord.id} — الطالب #{selectedRecord.student_id}
                  </WsFactRow>
                </WsFactsList>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <WsBtn
                    variant="primary"
                    icon={Send}
                    onClick={() => handleSendMessage(selectedRecord)}
                    disabled={selectedRecord.whatsapp_sent || isSendingSelected}
                    style={{ flex: 1 }}
                  >
                    {isSendingSelected ? 'جارٍ الإرسال...' : 'إرسال تنبيه'}
                  </WsBtn>
                  <WsBtn
                    icon={CheckCircle2}
                    onClick={() => handleResolve(selectedRecord)}
                    disabled={isDeletingSelected}
                    style={{ flex: 1 }}
                  >
                    {isDeletingSelected ? 'جارٍ المعالجة...' : 'معالجة التأخر'}
                  </WsBtn>
                </div>
              </WsBlock>

              <WsBlock title="حالة الإشعار" padded>
                <MessageStatusChip sent={selectedRecord.whatsapp_sent} sentAt={selectedRecord.whatsapp_sent_at} />
              </WsBlock>

              <WsBlock title="الملاحظات" icon={StickyNote} padded fill>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: 'var(--ws-text)' }}>
                  {selectedRecord.notes ? selectedRecord.notes : 'لا توجد ملاحظات مسجلة.'}
                </p>
              </WsBlock>
            </>
          ) : (
            <WsEmpty icon={Info}>اختر حالة من الجدول لمراجعة التفاصيل.</WsEmpty>
          )}
        </WsSideCol>
      </WsLayout>

      <LateArrivalFormDialog
        open={isCreateOpen}
        defaultDate={filters.date || today}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
        isSubmitting={createLateArrivalMutation.isPending}
        students={studentsQuery.data}
        lateArrivals={allLateArrivalsQuery.data}
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError ?? false}
        onRetry={() => {
          void studentsQuery.refetch()
        }}
      />
    </WsPage>
  )
}
