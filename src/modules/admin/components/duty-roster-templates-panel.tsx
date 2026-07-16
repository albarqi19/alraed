import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CalendarCog,
  CheckCircle2,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import {
  useCreateDutyRosterTemplateMutation,
  useDeleteDutyRosterTemplateMutation,
  useDutyRosterTemplatesQuery,
  useTeachersQuery,
  useUpdateDutyRosterTemplateMutation,
} from '@/modules/admin/hooks'
import {
  DUTY_ROSTER_WEEKDAYS,
  type DutyRosterTemplateAssignmentRecord,
  type DutyRosterTemplateRecord,
  type DutyRosterWeekday,
  type TeacherRecord,
} from '@/modules/admin/types'
import { useToast } from '@/shared/feedback/use-toast'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsField,
  WsIconBtn,
  WsInput,
  WsMain,
  WsSelect,
  WsSideCol,
  WsSwitch,
} from '@/shared/workspace'

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

// ألوان تظليل المعلمين المكررين عبر الأيام (تطعيمات هادئة)
const HIGHLIGHT_COLORS = [
  { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E' },
  { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46' },
  { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9' },
  { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A' },
  { bg: '#FBEAEA', bd: '#EFC5C5', tx: '#C43D3D' },
  { bg: '#E4F5F5', bd: '#BCE4E4', tx: '#1D7A7A' },
  { bg: '#FBEEE4', bd: '#F0D2B8', tx: '#B05E1D' },
  { bg: '#EAF0EE', bd: '#C8D8D2', tx: '#3F6F55' },
]

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handlePrintTemplate = async (template: DutyRosterTemplateRecord) => {
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
        ? assignments.map((a: DutyRosterTemplateAssignmentRecord, i: number) => `${i + 1}. ${a.user?.name ?? 'غير محدد'}`).join('<br/>')
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
    <>
      {/* العمود الأيمن: القوالب المحفوظة — ثابت بتمرير داخلي */}
      <WsSideCol
        title="القوالب المحفوظة"
        icon={CalendarCog}
        side="start"
        width={280}
        storageKey="ws:duty-templates:list"
        tools={<WsIconBtn icon={RefreshCcw} label="تحديث القوالب" onClick={() => templatesQuery.refetch()} disabled={isFetching} />}
      >
        {/* زر الإضافة بالأعلى */}
        <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
          <WsBtn
            variant="primary"
            icon={Plus}
            onClick={() => {
              setNewTemplateForm(buildEmptyForm())
              setIsNewTemplateModalOpen(true)
            }}
            disabled={isSubmitting}
            style={{ width: '100%' }}
          >
            إضافة قالب جديد
          </WsBtn>
        </div>

        <WsBlock title="القوالب" count={templates.length.toLocaleString('ar-SA')} fill scroll>
          {templatesQuery.isError ? (
            <WsAlert boxed style={{ margin: 10 }}>
              تعذر تحميل القوالب. حاول مرة أخرى.
            </WsAlert>
          ) : isLoading ? (
            <WsEmpty loading style={{ padding: 20 }}>
              جاري التحميل...
            </WsEmpty>
          ) : templates.length === 0 ? (
            <WsEmpty icon={CalendarCog} style={{ padding: 20 }}>
              لم يتم إنشاء أي قوالب بعد.
              <WsBtn size="sm" icon={Plus} onClick={() => setIsNewTemplateModalOpen(true)}>
                أنشئ قالبك الأول
              </WsBtn>
            </WsEmpty>
          ) : (
            <div>
              {templates.map((template) => {
                const count = DUTY_ROSTER_WEEKDAYS.reduce(
                  (total, weekday) => total + (template.weekday_assignments[weekday]?.length ?? 0),
                  0,
                )
                const isSelected = selectedId === template.id

                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                      background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 0 }}>{template.name}</span>
                      <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                        <WsIconBtn icon={Settings} label="إعدادات القالب" onClick={(e) => handleOpenSettings(template.id, e)} />
                        <WsIconBtn
                          icon={Printer}
                          label="طباعة القالب"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePrintTemplate(template)
                          }}
                        />
                      </span>
                    </div>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                      {template.shift_type}
                      {template.window_start && template.window_end && (
                        <span style={{ direction: 'ltr', display: 'inline-block', marginInlineStart: 6 }}>
                          {template.window_start} - {template.window_end}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'inline-flex', gap: 4, marginTop: 4 }}>
                      <WsChip tone={template.is_active ? 'green' : undefined} icon={CheckCircle2}>
                        {template.is_active ? 'مفعل' : 'متوقف'}
                      </WsChip>
                      <WsChip icon={Users}>{count} معلم</WsChip>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </WsBlock>
      </WsSideCol>

      {/* الوسط: توزيع المعلمين — يتمرر داخلياً */}
      <WsMain>
        <WsBlock
          title={selectedTemplate ? `توزيع المعلمين: ${selectedTemplate.name}` : 'توزيع المعلمين'}
          icon={Users}
          count={selectedTemplate ? `${totalAssignments} معلم` : undefined}
          tools={
            selectedTemplate ? (
              <>
                {isDirty && (
                  <WsChip tone="amber" className="ws-soft-pulse">
                    تغييرات غير محفوظة
                  </WsChip>
                )}
                {isDirty && (
                  <WsBtn variant="primary" size="sm" icon={Save} onClick={handleSaveAssignments} disabled={isSubmitting}>
                    {updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التوزيع'}
                  </WsBtn>
                )}
              </>
            ) : undefined
          }
          fill
          scroll
        >
          {selectedTemplate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
              {/* معلومات القالب */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '7px 12px',
                  border: '1px solid var(--ws-hairline)',
                  borderRadius: 10,
                  background: 'var(--ws-accent-softer)',
                }}
              >
                <WsChip tone="green">{selectedTemplate.shift_type}</WsChip>
                <WsChip>
                  <span style={{ direction: 'ltr' }}>
                    {selectedTemplate.window_start} - {selectedTemplate.window_end}
                  </span>
                </WsChip>
                <WsChip tone={selectedTemplate.is_active ? 'green' : undefined} icon={CheckCircle2}>
                  {selectedTemplate.is_active ? 'مفعل' : 'متوقف'}
                </WsChip>
              </div>

              {/* شبكة الأيام */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {DUTY_ROSTER_WEEKDAYS.map((weekday) => {
                const assignments = form.weekdayAssignments[weekday]
                const assignedIds = new Set(assignments.map((a) => a.user_id))
                const availableTeachers = teachers.filter((t) => !assignedIds.has(t.id))

                return (
                  <div
                    key={weekday}
                    style={{
                      border: '1px solid var(--ws-border)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: 'var(--ws-surface)',
                    }}
                  >
                    <div className="ws-block__head">
                      <span className="ws-block__title">
                        {WEEKDAY_LABELS[weekday]}
                        <span className="ws-count">{assignments.length}</span>
                      </span>
                      <WsSelect
                        style={{ height: 26, fontSize: 11.5 }}
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
                      </WsSelect>
                    </div>

                    {assignments.length === 0 ? (
                      <p style={{ margin: 0, padding: '14px 12px', fontSize: 11, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                        لم يتم اختيار معلمين لهذا اليوم.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
                        {assignments.map((assignment, index) => {
                          const highlightColor = repeatedTeacherColors.get(assignment.user_id)
                          const isRepeated = !!highlightColor

                          return (
                            <div
                              key={assignment.user_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: `1px solid ${isRepeated ? highlightColor.bd : 'var(--ws-hairline)'}`,
                                background: isRepeated ? highlightColor.bg : 'var(--ws-surface)',
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isRepeated ? highlightColor.tx : 'var(--ws-text)',
                                  }}
                                >
                                  {assignment.name}
                                  {isRepeated && <span style={{ marginInlineStart: 4, fontSize: 9, opacity: 0.7 }}>●</span>}
                                </span>
                                {assignment.phone && (
                                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                    {assignment.phone}
                                  </span>
                                )}
                              </span>
                              <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                                <WsIconBtn
                                  icon={ArrowUp}
                                  label="تقديم"
                                  onClick={() => handleMoveTeacher(weekday, index, -1)}
                                  disabled={index === 0 || isSubmitting}
                                />
                                <WsIconBtn
                                  icon={ArrowDown}
                                  label="تأخير"
                                  onClick={() => handleMoveTeacher(weekday, index, 1)}
                                  disabled={index === assignments.length - 1 || isSubmitting}
                                />
                                <WsIconBtn
                                  icon={Trash2}
                                  label="إزالة"
                                  style={{ color: 'var(--ws-red)' }}
                                  onClick={() => handleRemoveTeacher(weekday, index)}
                                  disabled={isSubmitting}
                                />
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          ) : (
            <WsEmpty icon={CalendarCog}>
              اختر قالباً من القائمة لتوزيع المعلمين، أو أنشئ قالباً جديداً.
              <WsBtn size="sm" icon={Plus} onClick={() => setIsNewTemplateModalOpen(true)}>
                إضافة قالب جديد
              </WsBtn>
            </WsEmpty>
          )}
        </WsBlock>
      </WsMain>

      {/* Modal إعدادات القالب */}
      {isSettingsModalOpen && selectedTemplate && (
        <div className="ws-modal" onClick={() => setIsSettingsModalOpen(false)}>
          <form
            className="ws-modal__panel"
            style={{ maxWidth: 460 }}
            onSubmit={handleSubmitSettings}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إعدادات القالب</h3>
              <p className="ws-modal__sub">{selectedTemplate.name}</p>
            </header>

            <div className="ws-modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <WsField label="اسم القالب">
                  <WsInput
                    type="text"
                    value={form.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    disabled={isSubmitting}
                  />
                </WsField>
                <WsField label="نوع الإشراف">
                  <WsInput
                    type="text"
                    value={form.shiftType}
                    onChange={(event) => handleFieldChange('shiftType', event.target.value)}
                    disabled={isSubmitting}
                  />
                </WsField>
                <WsField label="يبدأ من">
                  <WsInput
                    type="time"
                    value={form.windowStart}
                    onChange={(event) => handleFieldChange('windowStart', event.target.value)}
                    disabled={isSubmitting}
                  />
                </WsField>
                <WsField label="ينتهي عند">
                  <WsInput
                    type="time"
                    value={form.windowEnd}
                    onChange={(event) => handleFieldChange('windowEnd', event.target.value)}
                    disabled={isSubmitting}
                  />
                </WsField>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '7px 10px',
                  border: '1px solid var(--ws-hairline)',
                  borderRadius: 8,
                  background: 'var(--ws-surface-2)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {form.isActive ? 'القالب مفعل' : 'القالب متوقف'}
                </span>
                <WsSwitch checked={form.isActive} onChange={handleToggleActive} disabled={isSubmitting} />
              </div>
            </div>

            <footer className="ws-modal__foot">
              <WsBtn
                variant="danger"
                icon={Trash2}
                onClick={handleDeleteTemplate}
                disabled={isSubmitting}
                style={{ marginInlineEnd: 'auto' }}
              >
                {deleteTemplateMutation.isPending ? 'جارٍ الحذف...' : 'حذف القالب'}
              </WsBtn>
              <WsBtn onClick={() => setIsSettingsModalOpen(false)}>إلغاء</WsBtn>
              <WsBtn variant="primary" icon={Save} type="submit" disabled={isSubmitting}>
                {updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
              </WsBtn>
            </footer>
          </form>
        </div>
      )}

      {/* Modal لإضافة قالب جديد */}
      {isNewTemplateModalOpen && (
        <div className="ws-modal" onClick={() => setIsNewTemplateModalOpen(false)}>
          <form
            className="ws-modal__panel"
            style={{ maxWidth: 680 }}
            onSubmit={handleCreateNewTemplate}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إضافة قالب جديد</h3>
              <p className="ws-modal__sub">أنشئ قالب إشراف أسبوعي جديد.</p>
            </header>

            <div className="ws-modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <WsField label="اسم القالب *">
                  <WsInput
                    type="text"
                    value={newTemplateForm.name}
                    onChange={(e) => handleNewTemplateFieldChange('name', e.target.value)}
                    placeholder="مثال: إشراف بداية الدوام"
                  />
                </WsField>
                <WsField label="نوع الإشراف *">
                  <WsInput
                    type="text"
                    value={newTemplateForm.shiftType}
                    onChange={(e) => handleNewTemplateFieldChange('shiftType', e.target.value)}
                    placeholder="مثال: متابعة البوابة"
                  />
                </WsField>
                <WsField label="يبدأ من *">
                  <WsInput
                    type="time"
                    value={newTemplateForm.windowStart}
                    onChange={(e) => handleNewTemplateFieldChange('windowStart', e.target.value)}
                  />
                </WsField>
                <WsField label="ينتهي عند *">
                  <WsInput
                    type="time"
                    value={newTemplateForm.windowEnd}
                    onChange={(e) => handleNewTemplateFieldChange('windowEnd', e.target.value)}
                  />
                </WsField>
              </div>

              {/* توزيع المعلمين */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="ws-label">توزيع المعلمين على أيام الأسبوع</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
                  {DUTY_ROSTER_WEEKDAYS.map((weekday) => {
                    const assignments = newTemplateForm.weekdayAssignments[weekday]
                    const assignedIds = new Set(assignments.map((a) => a.user_id))
                    const availableTeachers = teachers.filter((t) => !assignedIds.has(t.id))

                    return (
                      <div key={weekday} style={{ border: '1px solid var(--ws-hairline)', borderRadius: 8, padding: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{WEEKDAY_LABELS[weekday]}</span>
                          <WsSelect
                            style={{ height: 26, fontSize: 11.5 }}
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
                          </WsSelect>
                        </div>
                        {assignments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {assignments.map((a, i) => (
                              <WsChip key={a.user_id} tone="green">
                                {a.name}
                                <button
                                  type="button"
                                  onClick={() => handleNewTemplateRemoveTeacher(weekday, i)}
                                  style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                  title="إزالة"
                                >
                                  <X style={{ width: 10, height: 10 }} />
                                </button>
                              </WsChip>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setIsNewTemplateModalOpen(false)}>إلغاء</WsBtn>
              <WsBtn variant="primary" icon={Save} type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ القالب'}
              </WsBtn>
            </footer>
          </form>
        </div>
      )}
    </>
  )
}
