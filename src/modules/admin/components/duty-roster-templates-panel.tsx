import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, ArrowUp, CalendarCog, CheckCircle2, Loader2, Plus, Printer, RefreshCcw, Settings, Trash2, X } from 'lucide-react'

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

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<TemplateFormState>(() => buildEmptyForm())
  const [isDirty, setIsDirty] = useState(false)
  const previousSelectedRef = useRef<number | null>(null)
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [newTemplateForm, setNewTemplateForm] = useState<TemplateFormState>(() => buildEmptyForm())

  const isSubmitting = createTemplateMutation.isPending || updateTemplateMutation.isPending || deleteTemplateMutation.isPending
  const isLoading = templatesQuery.isLoading || teachersQuery.isLoading
  const isFetching = templatesQuery.isFetching

  // تحديد أول قالب تلقائياً (مرة واحدة فقط)
  useEffect(() => {
    if (templates.length > 0 && selectedId === null && previousSelectedRef.current === null) {
      setSelectedId(templates[0].id)
    }
  }, [templates.length, selectedId])

  // تحميل بيانات القالب المختار
  useEffect(() => {
    if (selectedId === previousSelectedRef.current) {
      return
    }

    if (selectedId === null) {
      setForm(buildEmptyForm())
      setIsDirty(false)
      previousSelectedRef.current = null
      return
    }

    const match = templates.find((template) => template.id === selectedId)

    if (match) {
      setForm(mapTemplateToForm(match, teacherMap))
      setIsDirty(false)
      previousSelectedRef.current = selectedId
    }
  }, [selectedId, templates, teacherMap])

  const selectedTemplate = selectedId ? templates.find((template) => template.id === selectedId) ?? null : null

  const totalAssignments = useMemo(() => {
    return Object.values(form.weekdayAssignments).reduce((total, list) => total + list.length, 0)
  }, [form.weekdayAssignments])

  // ألوان تظليل المعلمين المكررين
  const HIGHLIGHT_COLORS = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
    { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
    { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
  ]

  // حساب المعلمين المكررين عبر الأيام وتعيين ألوان لهم
  const repeatedTeacherColors = useMemo(() => {
    const teacherDayCount = new Map<number, number>()

    // حساب عدد الأيام لكل معلم
    for (const weekday of DUTY_ROSTER_WEEKDAYS) {
      const seenInDay = new Set<number>()
      for (const assignment of form.weekdayAssignments[weekday]) {
        if (!seenInDay.has(assignment.user_id)) {
          seenInDay.add(assignment.user_id)
          teacherDayCount.set(assignment.user_id, (teacherDayCount.get(assignment.user_id) ?? 0) + 1)
        }
      }
    }

    // تصفية المعلمين المكررين فقط (يظهرون في أكثر من يوم)
    const repeatedTeachers = Array.from(teacherDayCount.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]) // ترتيب بالأكثر تكراراً

    // تعيين لون لكل معلم مكرر
    const colorMap = new Map<number, typeof HIGHLIGHT_COLORS[0]>()
    repeatedTeachers.forEach(([userId], index) => {
      colorMap.set(userId, HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length])
    })

    return colorMap
  }, [form.weekdayAssignments])

  const handleFieldChange = <K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setIsDirty(true)
  }

  const handleToggleActive = () => {
    setForm((previous) => ({ ...previous, isActive: !previous.isActive }))
    setIsDirty(true)
  }

  const handleAddTeacher = (weekday: DutyRosterWeekday, teacherId: number) => {
    if (!Number.isFinite(teacherId) || teacherId <= 0) return

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
          { user_id: teacher.id, name: teacher.name, phone: teacher.phone ?? null },
        ],
      }

      setIsDirty(true)
      return { ...previous, weekdayAssignments: updatedAssignments }
    })
  }

  const handleRemoveTeacher = (weekday: DutyRosterWeekday, index: number) => {
    setForm((previous) => {
      const current = previous.weekdayAssignments[weekday]
      if (!current[index]) return previous

      const updatedDay = current.filter((_, position) => position !== index)
      setIsDirty(true)
      return {
        ...previous,
        weekdayAssignments: { ...previous.weekdayAssignments, [weekday]: updatedDay },
      }
    })
  }

  const handleMoveTeacher = (weekday: DutyRosterWeekday, index: number, offset: -1 | 1) => {
    setForm((previous) => {
      const current = previous.weekdayAssignments[weekday]
      const targetIndex = index + offset

      if (!current[index] || targetIndex < 0 || targetIndex >= current.length) return previous

      const reordered = [...current]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)

      setIsDirty(true)
      return {
        ...previous,
        weekdayAssignments: { ...previous.weekdayAssignments, [weekday]: reordered },
      }
    })
  }

  const handleSelectTemplate = (templateId: number) => {
    if (isSubmitting) return
    setSelectedId(templateId)
  }

  const handleOpenSettings = (templateId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedId(templateId)
    setIsSettingsModalOpen(true)
  }

  const handlePrintTemplate = async (template: DutyRosterTemplate) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')

    const WEEKDAY_LABELS_AR: Record<string, string> = {
      sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء', thursday: 'الخميس',
    }

    // بناء صفوف الجدول
    let tableRows = ''
    for (const weekday of DUTY_ROSTER_WEEKDAYS) {
      const assignments = template.weekday_assignments[weekday] ?? []
      const dayLabel = WEEKDAY_LABELS_AR[weekday] ?? weekday
      const teacherNames = assignments.length > 0
        ? assignments.map((a, i: number) => `${i + 1}. ${a.user?.name ?? 'غير محدد'}`).join('<br/>')
        : '—'
      tableRows += `<tr style="background: ${DUTY_ROSTER_WEEKDAYS.indexOf(weekday) % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; vertical-align: top;">${dayLabel}</td>
        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.8;">${teacherNames}</td>
      </tr>`
    }

    // إنشاء iframe مخفي
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; height: 1123px; border: none;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }

    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; }
    body { background: #fff; direction: rtl; text-align: right; color: #0f172a; }
  </style>
</head>
<body>
  <div id="content" style="padding: 22mm 18mm; width: 210mm;">
    <div style="text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #111827;">${template.name}</h1>
      <p style="font-size: 15px; color: #1e293b;">${template.shift_type} • ${template.window_start || ''} - ${template.window_end || ''}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="background: #1e293b; color: #fff; padding: 12px; text-align: right; font-size: 14px; font-weight: 600; width: 18%;">اليوم</th>
          <th style="background: #1e293b; color: #fff; padding: 12px; text-align: right; font-size: 14px; font-weight: 600;">المعلمون</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #64748b;">
      تم توليد هذا التقرير عبر نظام الرائد للإدارة المدرسية
    </div>
  </div>
</body>
</html>`)
    iframeDoc.close()

    await new Promise(r => setTimeout(r, 400))

    try {
      const element = iframeDoc.getElementById('content')
      if (!element) throw new Error('Element not found')

      const canvas = await html2canvas(element, {
        scale: 1.5, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false, foreignObjectRendering: true,
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, pdfWidth, imgHeight)
      pdf.save(`قالب_${template.name}.pdf`)
    } catch (error) {
      console.error('خطأ في توليد PDF:', error)
    } finally {
      document.body.removeChild(iframe)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف القالب "${selectedTemplate.name}"؟\n\nسيتم حذف جميع توزيعات المعلمين المرتبطة بهذا القالب.`
    )

    if (!confirmed) return

    await deleteTemplateMutation.mutateAsync(selectedTemplate.id)
    setSelectedId(null)
    setIsSettingsModalOpen(false)
  }

  const validateAndBuildPayload = (formData: TemplateFormState) => {
    if (!formData.name.trim()) {
      toast({ type: 'error', title: 'أدخل اسم القالب الأسبوعي' })
      return null
    }

    if (!formData.shiftType.trim()) {
      toast({ type: 'error', title: 'حدد نوع الإشراف' })
      return null
    }

    if (!formData.windowStart || !formData.windowEnd) {
      toast({ type: 'error', title: 'حدد وقت البداية والنهاية' })
      return null
    }

    if (formData.windowStart >= formData.windowEnd) {
      toast({ type: 'error', title: 'وقت النهاية يجب أن يكون بعد وقت البداية' })
      return null
    }

    const sanitizedAssignments = DUTY_ROSTER_WEEKDAYS.reduce(
      (accumulator, weekday) => {
        const uniqueIds = Array.from(
          new Set(formData.weekdayAssignments[weekday].map((assignment) => assignment.user_id)),
        ).filter((value) => Number.isInteger(value) && value > 0)
        accumulator[weekday] = uniqueIds
        return accumulator
      },
      {} as Partial<Record<DutyRosterWeekday, number[]>>,
    )

    let triggerOffset: number | null = null
    const trimmedOffset = formData.triggerOffset.trim()

    if (trimmedOffset) {
      const parsed = Number.parseInt(trimmedOffset, 10)
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast({ type: 'error', title: 'قيمة التذكير يجب أن تكون رقماً أكبر أو يساوي صفر' })
        return null
      }
      triggerOffset = parsed
    }

    return {
      name: formData.name.trim(),
      shift_type: formData.shiftType.trim(),
      window_start: formData.windowStart,
      window_end: formData.windowEnd,
      trigger_offset_minutes: triggerOffset,
      is_active: formData.isActive,
      weekday_assignments: sanitizedAssignments,
    }
  }

  const handleSubmitSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = validateAndBuildPayload(form)
    if (!payload) return

    try {
      if (form.id) {
        const updated = await updateTemplateMutation.mutateAsync({ id: form.id, payload })
        setForm(mapTemplateToForm(updated, teacherMap))
        setSelectedId(updated.id)
      }
      setIsDirty(false)
      setIsSettingsModalOpen(false)
      toast({ type: 'success', title: 'تم تحديث إعدادات القالب' })
    } catch (error) {
      console.error(error)
    }
  }

  const handleSaveAssignments = async () => {
    const payload = validateAndBuildPayload(form)
    if (!payload) return

    try {
      if (form.id) {
        const updated = await updateTemplateMutation.mutateAsync({ id: form.id, payload })
        setForm(mapTemplateToForm(updated, teacherMap))
        setSelectedId(updated.id)
      }
      setIsDirty(false)
      toast({ type: 'success', title: 'تم حفظ توزيع المعلمين' })
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateNewTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = validateAndBuildPayload(newTemplateForm)
    if (!payload) return

    const totalSelected = Object.values(payload.weekday_assignments).reduce(
      (total, list) => total + (list?.length ?? 0),
      0,
    )

    if (totalSelected === 0) {
      toast({ type: 'error', title: 'أضف معلماً واحداً على الأقل قبل الحفظ' })
      return
    }

    try {
      const created = await createTemplateMutation.mutateAsync(payload)
      setSelectedId(created.id)
      setIsNewTemplateModalOpen(false)
      setNewTemplateForm(buildEmptyForm())
    } catch (error) {
      console.error(error)
    }
  }

  const handleNewTemplateFieldChange = <K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) => {
    setNewTemplateForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleNewTemplateAddTeacher = (weekday: DutyRosterWeekday, teacherId: number) => {
    if (!Number.isFinite(teacherId) || teacherId <= 0) return

    const teacher = teacherMap.get(teacherId)
    if (!teacher) return

    setNewTemplateForm((previous) => {
      const existing = previous.weekdayAssignments[weekday]
      if (existing.some((a) => a.user_id === teacherId)) return previous

      return {
        ...previous,
        weekdayAssignments: {
          ...previous.weekdayAssignments,
          [weekday]: [...existing, { user_id: teacher.id, name: teacher.name, phone: teacher.phone ?? null }],
        },
      }
    })
  }

  const handleNewTemplateRemoveTeacher = (weekday: DutyRosterWeekday, index: number) => {
    setNewTemplateForm((previous) => {
      const current = previous.weekdayAssignments[weekday]
      if (!current[index]) return previous
      return {
        ...previous,
        weekdayAssignments: {
          ...previous.weekdayAssignments,
          [weekday]: current.filter((_, i) => i !== index),
        },
      }
    })
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">قوالب الإشراف الأسبوعية</h2>
          <p className="text-sm text-muted">
            جهز جدولاً أسبوعياً ثابتاً، وحدد المعلمين لكل يوم.
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
            تحديث
          </button>
          <button
            type="button"
            onClick={() => {
              setNewTemplateForm(buildEmptyForm())
              setIsNewTemplateModalOpen(true)
            }}
            className="button-primary flex items-center gap-2"
            disabled={isSubmitting}
          >
            <Plus className="h-5 w-5" />
            إضافة قالب
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,280px),minmax(0,1fr)]">
        {/* قائمة القوالب */}
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">القوالب المحفوظة</p>
            <h3 className="text-base font-bold text-slate-900">اختر قالباً لتوزيع المعلمين</h3>
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-muted">
              <p>لم يتم إنشاء أي قوالب بعد.</p>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="mt-2 text-indigo-600 hover:underline"
              >
                أنشئ قالبك الأول
              </button>
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
                    <div
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`cursor-pointer rounded-2xl border px-4 py-3 text-right transition ${isSelected
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{template.name}</p>
                            <button
                              type="button"
                              onClick={(e) => handleOpenSettings(template.id, e)}
                              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                              title="إعدادات القالب"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePrintTemplate(template)
                              }}
                              className="rounded-full p-1 text-slate-400 transition hover:bg-emerald-100 hover:text-emerald-600"
                              title="طباعة القالب"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-muted">{template.shift_type}</p>
                          {template.window_start && template.window_end && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {template.window_start} - {template.window_end}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                              }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {template.is_active ? 'مفعل' : 'متوقف'}
                          </span>
                          <span className="text-[10px] text-muted">{count} معلم</span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* توزيع المعلمين */}
        {selectedTemplate ? (
          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-right">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <CalendarCog className="h-5 w-5 text-indigo-500" />
                    توزيع المعلمين: {selectedTemplate.name}
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedTemplate.shift_type} • {selectedTemplate.window_start} - {selectedTemplate.window_end}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      تغييرات غير محفوظة
                    </span>
                  )}
                  <span className="text-xs text-muted">إجمالي: {totalAssignments} معلم</span>
                </div>
              </header>

              <div className="grid gap-4 lg:grid-cols-2">
                {DUTY_ROSTER_WEEKDAYS.map((weekday) => {
                  const assignments = form.weekdayAssignments[weekday]
                  const assignedIds = new Set(assignments.map((a) => a.user_id))
                  const availableTeachers = teachers.filter((t) => !assignedIds.has(t.id))

                  return (
                    <section key={weekday} className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                      <header className="flex items-center justify-between gap-2">
                        <div className="text-right">
                          <h4 className="text-base font-semibold text-slate-900">{WEEKDAY_LABELS[weekday]}</h4>
                          <p className="text-xs text-muted">
                            {assignments.length > 0 ? `${assignments.length} معلم` : 'لم يتم تعيين أي معلم'}
                          </p>
                        </div>
                        <select
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none"
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value, 10)
                            if (Number.isFinite(value)) handleAddTeacher(weekday, value)
                            e.target.value = ''
                          }}
                          defaultValue=""
                          disabled={isSubmitting || availableTeachers.length === 0}
                        >
                          <option value="">+ إضافة معلم</option>
                          {availableTeachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                          ))}
                        </select>
                      </header>

                      {assignments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-center text-xs text-muted">
                          لم يتم اختيار معلمين لهذا اليوم.
                        </div>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {assignments.map((assignment, index) => {
                            const highlightColor = repeatedTeacherColors.get(assignment.user_id)
                            const isRepeated = !!highlightColor

                            return (
                              <li
                                key={assignment.user_id}
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 shadow-sm ${isRepeated
                                  ? `${highlightColor.bg} ${highlightColor.border}`
                                  : 'border-slate-200 bg-white'
                                  }`}
                              >
                                <div className="text-right">
                                  <p className={`font-semibold ${isRepeated ? highlightColor.text : 'text-slate-800'}`}>
                                    {assignment.name}
                                    {isRepeated && <span className="mr-1 text-xs opacity-60">●</span>}
                                  </p>
                                  {assignment.phone && <p className="text-[11px] text-muted">{assignment.phone}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => handleMoveTeacher(weekday, index, -1)} className="rounded-full border border-slate-200 p-1 text-muted hover:text-indigo-600 disabled:opacity-40" disabled={index === 0 || isSubmitting}>
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button type="button" onClick={() => handleMoveTeacher(weekday, index, 1)} className="rounded-full border border-slate-200 p-1 text-muted hover:text-indigo-600 disabled:opacity-40" disabled={index === assignments.length - 1 || isSubmitting}>
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                  <button type="button" onClick={() => handleRemoveTeacher(weekday, index)} className="rounded-full border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-40" disabled={isSubmitting}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </section>
                  )
                })}
              </div>
            </article>

            {isDirty && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  className="button-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التوزيع'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
            <CalendarCog className="h-12 w-12 text-slate-300" />
            <p className="font-semibold">اختر قالباً من القائمة لتوزيع المعلمين</p>
            <p className="text-xs">أو أنشئ قالباً جديداً</p>
            <button
              type="button"
              onClick={() => setIsNewTemplateModalOpen(true)}
              className="mt-2 button-primary"
            >
              <Plus className="inline h-4 w-4 ml-1" />
              إضافة قالب جديد
            </button>
          </div>
        )}
      </div>

      {/* Modal إعدادات القالب */}
      {isSettingsModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsSettingsModalOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Settings className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">إعدادات القالب</h2>
                  <p className="text-xs text-muted">{selectedTemplate.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSubmitSettings} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">اسم القالب</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">نوع الإشراف</label>
                  <input
                    type="text"
                    value={form.shiftType}
                    onChange={(event) => handleFieldChange('shiftType', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">يبدأ من</label>
                  <input
                    type="time"
                    value={form.windowStart}
                    onChange={(event) => handleFieldChange('windowStart', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">ينتهي عند</label>
                  <input
                    type="time"
                    value={form.windowEnd}
                    onChange={(event) => handleFieldChange('windowEnd', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600">حالة القالب</label>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm font-semibold transition ${form.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  disabled={isSubmitting}
                >
                  {form.isActive ? 'القالب مفعل' : 'القالب متوقف'}
                </button>
              </div>

              <footer className="flex justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-50 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {deleteTemplateMutation.isPending ? 'جارٍ الحذف...' : 'حذف القالب'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="button-secondary"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="button-primary min-w-[100px] disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    {updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal لإضافة قالب جديد */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsNewTemplateModalOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">إضافة قالب جديد</h2>
                  <p className="text-xs text-muted">أنشئ قالب إشراف أسبوعي جديد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleCreateNewTemplate} className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">اسم القالب *</label>
                  <input
                    type="text"
                    value={newTemplateForm.name}
                    onChange={(e) => handleNewTemplateFieldChange('name', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="مثال: إشراف بداية الدوام"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">نوع الإشراف *</label>
                  <input
                    type="text"
                    value={newTemplateForm.shiftType}
                    onChange={(e) => handleNewTemplateFieldChange('shiftType', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="مثال: متابعة البوابة"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">يبدأ من *</label>
                  <input
                    type="time"
                    value={newTemplateForm.windowStart}
                    onChange={(e) => handleNewTemplateFieldChange('windowStart', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-xs font-semibold text-slate-600">ينتهي عند *</label>
                  <input
                    type="time"
                    value={newTemplateForm.windowEnd}
                    onChange={(e) => handleNewTemplateFieldChange('windowEnd', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* توزيع المعلمين في Modal */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">توزيع المعلمين على أيام الأسبوع</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {DUTY_ROSTER_WEEKDAYS.map((weekday) => {
                    const assignments = newTemplateForm.weekdayAssignments[weekday]
                    const assignedIds = new Set(assignments.map((a) => a.user_id))
                    const availableTeachers = teachers.filter((t) => !assignedIds.has(t.id))

                    return (
                      <div key={weekday} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-semibold text-slate-700">{WEEKDAY_LABELS[weekday]}</span>
                          <select
                            className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                            onChange={(e) => {
                              const value = Number.parseInt(e.target.value, 10)
                              if (Number.isFinite(value)) handleNewTemplateAddTeacher(weekday, value)
                              e.target.value = ''
                            }}
                            defaultValue=""
                          >
                            <option value="">+ إضافة</option>
                            {availableTeachers.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        {assignments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {assignments.map((a, i) => (
                              <span key={a.user_id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                                {a.name}
                                <button type="button" onClick={() => handleNewTemplateRemoveTeacher(weekday, i)} className="text-indigo-400 hover:text-rose-600">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <footer className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="button-secondary"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary min-w-[120px] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ القالب'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
