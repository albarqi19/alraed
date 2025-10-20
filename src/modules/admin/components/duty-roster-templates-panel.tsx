import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowUp, CalendarCog, CheckCircle2, Loader2, Plus, RefreshCcw, Trash2 } from 'lucide-react'

import {
  useCreateDutyRosterTemplateMutation,
  useDeleteDutyRosterTemplateMutation,
  useDutyRosterTemplatesQuery,
  useTeachersQuery,
  useUpdateDutyRosterTemplateMutation,
} from '@/modules/admin/hooks'
import {
  DUTY_ROSTER_WEEKDAYS,
  type DutyRosterTemplateRecord,
  type DutyRosterWeekday,
  type TeacherRecord,
} from '@/modules/admin/types'
import { useToast } from '@/shared/feedback/use-toast'

type DayAssignment = {
  user_id: number
  name: string
  phone?: string | null
}

type TemplateFormState = {
  id?: number | null
  name: string
  shiftType: string
  windowStart: string
  windowEnd: string
  triggerOffset: string
  isActive: boolean
  weekdayAssignments: Record<DutyRosterWeekday, DayAssignment[]>
}

const WEEKDAY_LABELS: Record<DutyRosterWeekday, string> = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
}

function createEmptyAssignments(): Record<DutyRosterWeekday, DayAssignment[]> {
  return DUTY_ROSTER_WEEKDAYS.reduce((accumulator, weekday) => {
    accumulator[weekday] = []
    return accumulator
  }, {} as Record<DutyRosterWeekday, DayAssignment[]>)
}

function buildEmptyForm(): TemplateFormState {
  return {
    id: undefined,
    name: '',
    shiftType: '',
    windowStart: '',
    windowEnd: '',
    triggerOffset: '90',
    isActive: true,
    weekdayAssignments: createEmptyAssignments(),
  }
}

function mapTemplateToForm(
  template: DutyRosterTemplateRecord,
  teacherMap: Map<number, TeacherRecord>,
): TemplateFormState {
  const assignments = createEmptyAssignments()

  for (const weekday of DUTY_ROSTER_WEEKDAYS) {
    const dayAssignments = template.weekday_assignments[weekday] ?? []

    assignments[weekday] = dayAssignments.map((record) => {
      const teacher = teacherMap.get(record.user_id)
      const displayName = teacher?.name ?? record.user?.name ?? `#${record.user_id}`
      return {
        user_id: record.user_id,
        name: displayName,
        phone: teacher?.phone ?? record.user?.phone ?? null,
      }
    })
  }

  return {
    id: template.id,
    name: template.name,
    shiftType: template.shift_type,
    windowStart: template.window_start ?? '',
    windowEnd: template.window_end ?? '',
    triggerOffset:
      template.trigger_offset_minutes !== null && template.trigger_offset_minutes !== undefined
        ? String(template.trigger_offset_minutes)
        : '',
    isActive: Boolean(template.is_active),
    weekdayAssignments: assignments,
  }
}

export function DutyRosterTemplatesPanel() {
  const toast = useToast()
  const templatesQuery = useDutyRosterTemplatesQuery()
  const teachersQuery = useTeachersQuery()
  const createTemplateMutation = useCreateDutyRosterTemplateMutation()
  const updateTemplateMutation = useUpdateDutyRosterTemplateMutation()
  const deleteTemplateMutation = useDeleteDutyRosterTemplateMutation()

  const templates = templatesQuery.data ?? []
  const teachers = teachersQuery.data ?? []
  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers])

  const [selectedId, setSelectedId] = useState<number | 'new'>('new')
  const [form, setForm] = useState<TemplateFormState>(() => buildEmptyForm())
  const [isDirty, setIsDirty] = useState(false)
  const previousSelectedRef = useRef<number | 'new'>('new')

  const isSubmitting = createTemplateMutation.isPending || updateTemplateMutation.isPending || deleteTemplateMutation.isPending
  const isLoading = templatesQuery.isLoading || teachersQuery.isLoading
  const isFetching = templatesQuery.isFetching

  useEffect(() => {
    if (selectedId === 'new') {
      if (previousSelectedRef.current !== 'new') {
        setForm(buildEmptyForm())
        setIsDirty(false)
      }
      previousSelectedRef.current = 'new'
      return
    }

    const match = templates.find((template) => template.id === selectedId)

    if (match) {
      setForm(mapTemplateToForm(match, teacherMap))
      setIsDirty(false)
      previousSelectedRef.current = selectedId
      return
    }

    if (templates.length > 0) {
      const fallback = templates[0]
      setSelectedId(fallback.id)
    } else {
      previousSelectedRef.current = 'new'
      setSelectedId('new')
    }
  }, [selectedId, templates, teacherMap])

  const selectedTemplate = selectedId === 'new' ? null : templates.find((template) => template.id === selectedId) ?? null
  const totalAssignments = useMemo(() => {
    if (!selectedTemplate) {
      return Object.values(form.weekdayAssignments).reduce((total, list) => total + list.length, 0)
    }

    return DUTY_ROSTER_WEEKDAYS.reduce(
      (total, weekday) => total + (selectedTemplate.weekday_assignments[weekday]?.length ?? 0),
      0,
    )
  }, [form.weekdayAssignments, selectedTemplate])

  const handleFieldChange = <K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setIsDirty(true)
  }

  const handleToggleActive = () => {
    setForm((previous) => ({ ...previous, isActive: !previous.isActive }))
    setIsDirty(true)
  }

  const handleAddTeacher = (weekday: DutyRosterWeekday, teacherId: number) => {
    if (!Number.isFinite(teacherId) || teacherId <= 0) {
      return
    }

    const teacher = teacherMap.get(teacherId)
    if (!teacher) {
      toast({ type: 'error', title: 'تعذر العثور على بيانات المعلم' })
      return
    }

    setForm((previous) => {
      const existing = previous.weekdayAssignments[weekday]
      if (existing.some((assignment) => assignment.user_id === teacherId)) {
        return previous
      }

      const updatedAssignments = {
        ...previous.weekdayAssignments,
        [weekday]: [
          ...existing,
          {
            user_id: teacher.id,
            name: teacher.name,
            phone: teacher.phone ?? null,
          },
        ],
      }

      setIsDirty(true)
      return { ...previous, weekdayAssignments: updatedAssignments }
    })
  }

  const handleRemoveTeacher = (weekday: DutyRosterWeekday, index: number) => {
    setForm((previous) => {
      const current = previous.weekdayAssignments[weekday]
      if (!current[index]) {
        return previous
      }

      const updatedDay = current.filter((_, position) => position !== index)

      setIsDirty(true)
      return {
        ...previous,
        weekdayAssignments: {
          ...previous.weekdayAssignments,
          [weekday]: updatedDay,
        },
      }
    })
  }

  const handleMoveTeacher = (weekday: DutyRosterWeekday, index: number, offset: -1 | 1) => {
    setForm((previous) => {
      const current = previous.weekdayAssignments[weekday]
      const targetIndex = index + offset

      if (!current[index] || targetIndex < 0 || targetIndex >= current.length) {
        return previous
      }

      const reordered = [...current]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)

      setIsDirty(true)
      return {
        ...previous,
        weekdayAssignments: {
          ...previous.weekdayAssignments,
          [weekday]: reordered,
        },
      }
    })
  }

  const handleSelectTemplate = (templateId: number | 'new') => {
    if (isSubmitting) {
      return
    }
    setSelectedId(templateId)
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) {
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف القالب "${selectedTemplate.name}"؟\n\nسيتم حذف جميع توزيعات المعلمين المرتبطة بهذا القالب.`
    )

    if (!confirmed) {
      return
    }

    await deleteTemplateMutation.mutateAsync(selectedTemplate.id)
    setSelectedId('new')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      toast({ type: 'error', title: 'أدخل اسم القالب الأسبوعي' })
      return
    }

    if (!form.shiftType.trim()) {
      toast({ type: 'error', title: 'حدد نوع المناوبة' })
      return
    }

    if (!form.windowStart || !form.windowEnd) {
      toast({ type: 'error', title: 'حدد وقت البداية والنهاية' })
      return
    }

    if (form.windowStart >= form.windowEnd) {
      toast({ type: 'error', title: 'وقت النهاية يجب أن يكون بعد وقت البداية' })
      return
    }

    const sanitizedAssignments = DUTY_ROSTER_WEEKDAYS.reduce(
      (accumulator, weekday) => {
        const uniqueIds = Array.from(
          new Set(form.weekdayAssignments[weekday].map((assignment) => assignment.user_id)),
        ).filter((value) => Number.isInteger(value) && value > 0)

        accumulator[weekday] = uniqueIds
        return accumulator
      },
      {} as Partial<Record<DutyRosterWeekday, number[]>>,
    )

    const totalSelected = Object.values(sanitizedAssignments).reduce(
      (total, list) => total + (list?.length ?? 0),
      0,
    )

    if (totalSelected === 0) {
      toast({ type: 'error', title: 'أضف معلماً واحداً على الأقل قبل الحفظ' })
      return
    }

    let triggerOffset: number | null = null
    const trimmedOffset = form.triggerOffset.trim()

    if (trimmedOffset) {
      const parsed = Number.parseInt(trimmedOffset, 10)
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast({ type: 'error', title: 'قيمة التذكير يجب أن تكون رقماً أكبر أو يساوي صفر' })
        return
      }
      triggerOffset = parsed
    }

    const payload = {
      name: form.name.trim(),
      shift_type: form.shiftType.trim(),
      window_start: form.windowStart,
      window_end: form.windowEnd,
      trigger_offset_minutes: triggerOffset,
      is_active: form.isActive,
      weekday_assignments: sanitizedAssignments,
    }

    try {
      if (form.id) {
        const updated = await updateTemplateMutation.mutateAsync({ id: form.id, payload })
        setForm(mapTemplateToForm(updated, teacherMap))
        setSelectedId(updated.id)
      } else {
        const created = await createTemplateMutation.mutateAsync(payload)
        setSelectedId(created.id)
      }
      setIsDirty(false)
    } catch (error) {
      // تم التعامل مع رسائل الخطأ من خلال هوكس React Query الخاصة بالإنشاء/التحديث.
      console.error(error)
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">قوالب المناوبة الأسبوعية</h2>
          <p className="text-sm text-muted">
            جهز جدولا أسبوعياً ثابتاً، وحدد المعلمين لكل يوم ليتم توليد المناوبات اليومية تلقائياً.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => templatesQuery.refetch()}
            className="button-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            تحديث قائمة القوالب
          </button>
          <button
            type="button"
            onClick={() => handleSelectTemplate('new')}
            className="button-primary flex items-center gap-2"
            disabled={isSubmitting}
          >
            <Plus className="h-5 w-5" />
            قالب أسبوعي جديد
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,260px),minmax(0,1fr)]">
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">القوالب المحفوظة</p>
            <h3 className="text-base font-bold text-slate-900">اختر قالباً لعرض تفاصيله</h3>
          </header>

          {templatesQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
              تعذر تحميل القوالب. حاول مرة أخرى.
            </div>
          ) : isLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-muted">
              لم يتم إنشاء أي قوالب بعد.
            </div>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => {
                const count = DUTY_ROSTER_WEEKDAYS.reduce(
                  (total, weekday) => total + (template.weekday_assignments[weekday]?.length ?? 0),
                  0,
                )
                const isSelected = selectedId === template.id

                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{template.name}</p>
                          <p className="text-xs text-muted">{template.shift_type}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {template.is_active ? 'مفعل' : 'متوقف'}
                          </span>
                          <span className="text-muted">{count.toLocaleString('ar-SA')} معلم</span>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <form onSubmit={handleSubmit} className="space-y-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-right">
                <h3 className="flex items-center justify-end gap-2 text-lg font-bold text-slate-900">
                  <CalendarCog className="h-5 w-5 text-indigo-500" />
                  {selectedTemplate ? `تحرير: ${selectedTemplate.name}` : 'قالب أسبوعي جديد'}
                </h3>
                <p className="text-xs text-muted">
                  خصص الاسم ونوع المناوبة وساعات التذكير قبل توزيع المعلمين على أيام الأسبوع.
                </p>
              </div>
              {isDirty && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  توجد تغييرات غير محفوظة
                </span>
              )}
            </header>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600" htmlFor="template-name">
                  اسم القالب
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => handleFieldChange('name', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: مناوبات بداية الدوام"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600" htmlFor="template-shift-type">
                  نوع المناوبة
                </label>
                <input
                  id="template-shift-type"
                  type="text"
                  value={form.shiftType}
                  onChange={(event) => handleFieldChange('shiftType', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: متابعة البوابة الشرقية"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600" htmlFor="template-window-start">
                  يبدأ من
                </label>
                <input
                  id="template-window-start"
                  type="time"
                  value={form.windowStart}
                  onChange={(event) => handleFieldChange('windowStart', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600" htmlFor="template-window-end">
                  ينتهي عند
                </label>
                <input
                  id="template-window-end"
                  type="time"
                  value={form.windowEnd}
                  onChange={(event) => handleFieldChange('windowEnd', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600" htmlFor="template-trigger-offset">
                  تذكير قبل المناوبة (بالدقائق)
                </label>
                <input
                  id="template-trigger-offset"
                  type="number"
                  min={0}
                  value={form.triggerOffset}
                  onChange={(event) => handleFieldChange('triggerOffset', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: 90"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600">حالة القالب</label>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    form.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                  disabled={isSubmitting}
                >
                  {form.isActive ? 'القالب مفعل' : 'القالب متوقف حالياً'}
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-right">
                <h3 className="text-lg font-bold text-slate-900">توزيع المعلمين على أيام الأسبوع</h3>
                <p className="text-xs text-muted">
                  اسحب المعلمين لكل يوم بترتيب المناوبة. يمكن إعادة الترتيب أو الحذف بسهولة.
                </p>
              </div>
              <span className="text-xs text-muted">
                إجمالي المعلّمين المعينين: {totalAssignments.toLocaleString('ar-SA')}
              </span>
            </header>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {DUTY_ROSTER_WEEKDAYS.map((weekday) => {
                const assignments = form.weekdayAssignments[weekday]
                const assignedIds = new Set(assignments.map((assignment) => assignment.user_id))
                const availableTeachers = teachers.filter((teacher) => !assignedIds.has(teacher.id))

                return (
                  <section key={weekday} className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <header className="flex items-center justify-between gap-2">
                      <div className="text-right">
                        <h4 className="text-base font-semibold text-slate-900">{WEEKDAY_LABELS[weekday]}</h4>
                        <p className="text-xs text-muted">
                          {assignments.length > 0
                            ? `${assignments.length.toLocaleString('ar-SA')} معلم`
                            : 'لم يتم تعيين أي معلم بعد'}
                        </p>
                      </div>
                      <select
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value, 10)
                          if (Number.isFinite(value)) {
                            handleAddTeacher(weekday, value)
                          }
                          event.target.value = ''
                        }}
                        defaultValue=""
                        disabled={isSubmitting || availableTeachers.length === 0}
                      >
                        <option value="">إضافة معلم</option>
                        {availableTeachers.map((teacher) => (
                          <option key={`${weekday}-${teacher.id}`} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </header>

                    {assignments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-center text-xs text-muted">
                        لم يتم اختيار معلمين لهذا اليوم بعد.
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {assignments.map((assignment, index) => (
                          <li
                            key={`${weekday}-${assignment.user_id}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                          >
                            <div className="text-right">
                              <p className="font-semibold text-slate-800">{assignment.name}</p>
                              {assignment.phone && (
                                <p className="text-[11px] text-muted">{assignment.phone}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveTeacher(weekday, index, -1)}
                                className="rounded-full border border-slate-200 p-1 text-muted hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-40"
                                disabled={index === 0 || isSubmitting}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveTeacher(weekday, index, 1)}
                                className="rounded-full border border-slate-200 p-1 text-muted hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-40"
                                disabled={index === assignments.length - 1 || isSubmitting}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveTeacher(weekday, index)}
                                className="rounded-full border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                                disabled={isSubmitting}
                                title="إزالة المعلم من هذا اليوم"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              )}
            </div>
          </article>

          <div className="flex flex-wrap justify-end gap-2">
            {selectedTemplate && (
              <>
                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  title="حذف القالب نهائياً"
                >
                  {deleteTemplateMutation.isPending ? 'جارٍ الحذف...' : 'حذف القالب'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTemplate('new')}
                  className="button-secondary"
                  disabled={isSubmitting}
                >
                  إنشاء قالب جديد
                </button>
              </>
            )}
            <button
              type="submit"
              className="button-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جارٍ الحفظ...' : selectedTemplate ? 'تحديث القالب' : 'حفظ القالب'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
