import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type {
  FormAssignmentScope,
  FormFieldInput,
  FormFieldOption,
  FormFieldType,
  FormStatus,
  FormSummary,
  FormUpsertPayload,
} from '@/modules/forms/types'

interface FormDesignerProps {
  mode: 'create' | 'edit'
  initialForm?: FormSummary | null
  submitting?: boolean
  onSubmit: (payload: FormUpsertPayload) => Promise<void>
  onCancel?: () => void
}

interface GeneralState {
  title: string
  description: string
  status: FormStatus
  target_audience: FormAssignmentScope
  category: string
  max_responses: string
  allow_multiple_submissions: boolean
  allow_edit_after_submit: boolean
  requires_approval: boolean
  start_at: string
  end_at: string
}

type DraftField = FormFieldInput & {
  localId: string
  autoKey: boolean
  optionsText?: string
}

type FieldError = Partial<Record<'label' | 'field_key', string>>

type FieldTypeOption = {
  value: FormFieldType
  label: string
  description?: string
}

const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  { value: 'text', label: 'نص قصير', description: 'إجابة نصية حتى 255 حرفاً' },
  { value: 'textarea', label: 'نص طويل', description: 'إجابة نصية موسعة' },
  { value: 'number', label: 'رقم', description: 'أرقام فقط مع إمكانية تحديد الحدود' },
  { value: 'phone', label: 'رقم هاتف', description: 'يتحقق من صيغة رقم الجوال' },
  { value: 'email', label: 'بريد إلكتروني', description: 'يتحقق من صيغة البريد' },
  { value: 'date', label: 'تاريخ', description: 'اختيار تاريخ فقط' },
  { value: 'time', label: 'وقت', description: 'اختيار وقت فقط' },
  { value: 'datetime', label: 'تاريخ ووقت', description: 'اختيار تاريخ ووقت معاً' },
  { value: 'select', label: 'قائمة اختيار', description: 'اختيار عنصر واحد من قائمة' },
  { value: 'multi_select', label: 'قائمة متعددة', description: 'اختيار عدة عناصر من قائمة' },
  { value: 'radio', label: 'أزرار اختيار', description: 'اختيار عنصر واحد عبر أزرار' },
  { value: 'checkbox', label: 'خانة اختيار', description: 'خيار ثنائي نعم/لا' },
  { value: 'yesno', label: 'نعم / لا', description: 'سؤال بنعم أو لا' },
  { value: 'rating', label: 'تقييم', description: 'تقييم عددي بسرعة' },
  { value: 'file', label: 'رفع ملف', description: 'استقبال ملفات مرفقة' },
  { value: 'signature', label: 'توقيع رقمي', description: 'التقاط توقيع ولي الأمر أو الطالب' },
]

const STATUS_OPTIONS: Array<{ value: FormStatus; label: string }> = [
  { value: 'draft', label: 'مسودة' },
  { value: 'published', label: 'منشور' },
  { value: 'archived', label: 'مؤرشف' },
]

const AUDIENCE_OPTIONS: Array<{ value: FormAssignmentScope; label: string }> = [
  { value: 'all_students', label: 'جميع الطلاب' },
  { value: 'grade', label: 'صف محدد' },
  { value: 'class', label: 'فصل محدد' },
  { value: 'student', label: 'طالب محدد' },
  { value: 'group', label: 'مجموعة مخصصة' },
]

function slugifyKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
  const cleaned = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (!cleaned) {
    return `field_${Math.random().toString(36).slice(2, 6)}`
  }
  if (/^[0-9]/.test(cleaned)) {
    return `f_${cleaned}`
  }
  return cleaned
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

function toISOStringFromLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function readRequiresApproval(form?: FormSummary | null): boolean {
  if (!form) return false

  const direct = (form as { requires_approval?: unknown }).requires_approval
  if (typeof direct === 'boolean') {
    return direct
  }

  const settings = ((form.settings ?? {}) as Record<string, unknown>) || {}
  const candidates: Array<keyof typeof settings> = [
    'requires_approval',
    'requiresApproval',
    'require_approval',
    'requireApproval',
  ]

  for (const key of candidates) {
    const value = settings[key]
    if (typeof value === 'boolean') {
      return value
    }
  }

  return false
}

function parseOptions(text: string): FormFieldOption[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const [labelPart, valuePart] = line.split('|').map((part) => part.trim())
      const label = labelPart || `خيار ${index + 1}`
      const value = valuePart || slugifyKey(label)
      return { label, value }
    })
}

function buildOptionsText(options: FormFieldOption[] | undefined): string {
  if (!options || options.length === 0) return ''
  return options.map((option) => `${option.label} | ${option.value}`).join('\n')
}

function mapFormToDraftFields(form?: FormSummary | null): DraftField[] {
  if (!form) return []
  const baseFields = form.fields ?? []
  const sectionFields = (form.sections ?? []).flatMap((section) =>
    section.fields.map((field) => ({ ...field, section_id: section.id ?? null })),
  )
  const allFields = [...baseFields, ...sectionFields]
  return allFields
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((field) => ({
      ...field,
      localId: `field-${field.id ?? Math.random().toString(36).slice(2, 8)}`,
      autoKey: false,
      section_id: null,
      optionsText: buildOptionsText(field.settings?.options),
    }))
}

function getDefaultGeneralState(mode: 'create' | 'edit', initialForm?: FormSummary | null): GeneralState {
  if (mode === 'edit' && initialForm) {
    return {
      title: initialForm.title,
      description: initialForm.description ?? '',
      status: initialForm.status,
      target_audience: initialForm.target_audience ?? 'all_students',
      category: initialForm.category ?? '',
      max_responses: initialForm.max_responses ? String(initialForm.max_responses) : '',
      allow_multiple_submissions: Boolean(initialForm.allow_multiple_submissions),
      allow_edit_after_submit: Boolean(initialForm.allow_edit_after_submit),
      requires_approval: readRequiresApproval(initialForm),
      start_at: toDateTimeLocal(initialForm.start_at),
      end_at: toDateTimeLocal(initialForm.end_at),
    }
  }

  return {
    title: '',
    description: '',
    status: 'draft',
    target_audience: 'all_students',
    category: '',
    max_responses: '',
    allow_multiple_submissions: false,
    allow_edit_after_submit: false,
    requires_approval: false,
    start_at: '',
    end_at: '',
  }
}

const selectionTypes: FormFieldType[] = ['select', 'multi_select', 'radio', 'checkbox']

export function FormDesigner({ mode, initialForm, submitting = false, onSubmit, onCancel }: FormDesignerProps) {
  const navigate = useNavigate()
  const [general, setGeneral] = useState<GeneralState>(() => getDefaultGeneralState(mode, initialForm))
  const [fields, setFields] = useState<DraftField[]>(() => mapFormToDraftFields(initialForm))
  const [generalErrors, setGeneralErrors] = useState<Partial<Record<'title' | 'fields', string>>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({})

  useEffect(() => {
    if (mode === 'edit' && initialForm) {
      setGeneral(getDefaultGeneralState('edit', initialForm))
      setFields(mapFormToDraftFields(initialForm))
    }
  }, [initialForm?.id, mode])

  const isSelectionType = useMemo(() => {
    const selectionSet = new Set(selectionTypes)
    return (type: FormFieldType) => selectionSet.has(type)
  }, [])

  const handleGeneralChange = <K extends keyof GeneralState>(key: K, value: GeneralState[K]) => {
    setGeneral((prev) => ({
      ...prev,
      [key]: value,
    }))
    setGeneralErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleAddField = () => {
    const newFieldIndex = fields.length + 1
    const newField: DraftField = {
      localId: `field-${Date.now()}-${newFieldIndex}`,
      autoKey: true,
      field_key: `field_${newFieldIndex}`,
      type: 'text',
      label: `حقل جديد ${newFieldIndex}`,
      description: '',
      placeholder: '',
      helper_text: '',
      is_required: false,
      settings: {},
      validation: {},
      visibility_rules: [],
      sort_order: newFieldIndex - 1,
      optionsText: '',
    }
    setFields((prev) => [...prev, newField])
  }

  const handleRemoveField = (localId: string) => {
    setFields((prev) => prev.filter((field) => field.localId !== localId))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[localId]
      return next
    })
  }

  const handleMoveField = (localId: string, direction: 'up' | 'down') => {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.localId === localId)
      if (index === -1) return prev
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const updateField = <K extends keyof DraftField>(localId: string, key: K, value: DraftField[K]) => {
    setFields((prev) =>
      prev.map((field) => {
        if (field.localId !== localId) return field

        if (key === 'label') {
          const nextLabel = (value as string) ?? ''
          const nextFieldKey = field.autoKey ? slugifyKey(nextLabel) : field.field_key
          return {
            ...field,
            label: nextLabel,
            field_key: nextFieldKey,
          }
        }

        if (key === 'field_key') {
          const nextValue = (value as string).trim()
          return {
            ...field,
            field_key: nextValue,
            autoKey: false,
          }
        }

        if (key === 'type') {
          const nextType = value as FormFieldType
          const isSelection = isSelectionType(nextType)
          const nextOptionsText = isSelection ? field.optionsText ?? 'خيار 1 | option_1\nخيار 2 | option_2' : ''
          return {
            ...field,
            type: nextType,
            optionsText: nextOptionsText,
            settings: isSelection ? { ...(field.settings ?? {}), options: parseOptions(nextOptionsText) } : {},
          }
        }

        if (key === 'optionsText') {
          const textValue = String(value ?? '')
          return {
            ...field,
            optionsText: textValue,
            settings: {
              ...(field.settings ?? {}),
              options: parseOptions(textValue),
            },
          }
        }

        if (key === 'is_required') {
          return {
            ...field,
            is_required: Boolean(value),
          }
        }

        return {
          ...field,
          [key]: value,
        }
      }),
    )

    setFieldErrors((prev) => ({ ...prev, [localId]: {} }))
  }

  const validate = (): boolean => {
    const nextGeneralErrors: Partial<Record<'title' | 'fields', string>> = {}
    const nextFieldErrors: Record<string, FieldError> = {}

    if (!general.title.trim()) {
      nextGeneralErrors.title = 'أدخل عنواناً واضحاً للنموذج'
    }

    if (fields.length === 0) {
      nextGeneralErrors.fields = 'أضف على الأقل حقلاً واحداً قبل الحفظ'
    }

    const seenKeys = new Map<string, string>()

    fields.forEach((field) => {
      const errors: FieldError = {}

      if (!field.label.trim()) {
        errors.label = 'العنوان مطلوب'
      }

      const trimmedKey = field.field_key.trim()
      if (!trimmedKey) {
        errors.field_key = 'مفتاح الحقل مطلوب'
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedKey)) {
        errors.field_key = 'استخدم أحرفاً لاتينية وأرقاماً وشرطة سفلية فقط، ولا تبدأ برقم'
      } else if (seenKeys.has(trimmedKey)) {
        errors.field_key = 'المفتاح مستخدم في حقل آخر'
      } else {
        seenKeys.set(trimmedKey, field.localId)
      }

      if (Object.keys(errors).length > 0) {
        nextFieldErrors[field.localId] = errors
      }
    })

    setGeneralErrors(nextGeneralErrors)
    setFieldErrors(nextFieldErrors)

    return Object.keys(nextGeneralErrors).length === 0 && Object.keys(nextFieldErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!validate()) {
      return
    }

    const previousSettings = (initialForm?.settings as Record<string, unknown> | null) ?? null
    const mergedSettings = {
      ...(previousSettings ?? {}),
      requires_approval: general.requires_approval,
    }

    const payload: FormUpsertPayload = {
      title: general.title.trim(),
      description: general.description.trim() || null,
      status: general.status,
      category: general.category.trim() || null,
      target_audience: general.target_audience,
      max_responses: general.max_responses ? Number(general.max_responses) : null,
      allow_multiple_submissions: general.allow_multiple_submissions,
      allow_edit_after_submit: general.allow_edit_after_submit,
      requires_approval: general.requires_approval,
      start_at: toISOStringFromLocal(general.start_at),
      end_at: toISOStringFromLocal(general.end_at),
      settings: mergedSettings,
      sections: [],
      fields: fields.map((field, index) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { localId: _localId, autoKey: _autoKey, optionsText: _optionsText, ...rest } = field
        return {
          ...rest,
          field_key: rest.field_key.trim(),
          description: rest.description?.trim() || null,
          placeholder: rest.placeholder?.trim() || null,
          helper_text: rest.helper_text?.trim() || null,
          settings: rest.settings && Object.keys(rest.settings).length > 0 ? rest.settings : undefined,
          validation: rest.validation && Object.keys(rest.validation).length > 0 ? rest.validation : undefined,
          sort_order: index,
          section_id: null,
        }
      }),
      assignments: [],
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      console.error('Failed to submit form payload', error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    navigate('/admin/forms')
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            {mode === 'create' ? 'إنشاء نموذج جديد' : 'تعديل النموذج'}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {mode === 'create' ? 'صمم النموذج الإلكتروني ووزعه على الفئات المستهدفة' : general.title || initialForm?.title || 'تعديل النموذج'}
          </h1>
          <p className="text-sm text-muted">
            حدّد الحقول المطلوبة، المواعيد، والخيارات المتقدمة قبل نشر النموذج.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
            disabled={submitting}
          >
            إلغاء والعودة
          </button>
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={submitting}
          >
            {submitting ? 'جاري الحفظ...' : mode === 'create' ? 'حفظ النموذج' : 'تحديث النموذج'}
          </button>
        </div>
      </header>

      <section className="glass-card space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">معلومات عامة</h2>
          <p className="text-xs text-muted">املأ تفاصيل النموذج الأساسية التي تظهر للمديرين والأولياء.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-title">
              عنوان النموذج *
            </label>
            <input
              id="form-title"
              type="text"
              value={general.title}
              onChange={(event) => handleGeneralChange('title', event.target.value)}
              className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${generalErrors.title ? 'border-rose-300' : 'border-slate-200'}`}
              placeholder="مثال: استبيان الزيارات الطبية"
              disabled={submitting}
            />
            {generalErrors.title ? <p className="text-xs text-rose-600">{generalErrors.title}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-category">
              التصنيف (اختياري)
            </label>
            <input
              id="form-category"
              type="text"
              value={general.category}
              onChange={(event) => handleGeneralChange('category', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="مثال: الصحة المدرسية"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600" htmlFor="form-description">
            وصف مختصر
          </label>
          <textarea
            id="form-description"
            value={general.description}
            onChange={(event) => handleGeneralChange('description', event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="اشرح الهدف من هذا النموذج وأي تعليمات مهمة."
            disabled={submitting}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-status">
              حالة النموذج
            </label>
            <select
              id="form-status"
              value={general.status}
              onChange={(event) => handleGeneralChange('status', event.target.value as FormStatus)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={submitting}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-target">
              الجمهور المستهدف
            </label>
            <select
              id="form-target"
              value={general.target_audience}
              onChange={(event) => handleGeneralChange('target_audience', event.target.value as FormAssignmentScope)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={submitting}
            >
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-max-responses">
              حد الردود (اختياري)
            </label>
            <input
              id="form-max-responses"
              type="number"
              min="0"
              value={general.max_responses}
              onChange={(event) => handleGeneralChange('max_responses', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="اتركه فارغاً لعدد غير محدود"
              disabled={submitting}
            />
          </div>
        </div>
      </section>

      <section className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">مدة التوافر</h2>
            <p className="text-xs text-muted">حدد تاريخ البداية والنهاية لعرض النموذج للمستفيدين.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            onClick={() => {
              handleGeneralChange('start_at', '')
              handleGeneralChange('end_at', '')
            }}
            disabled={submitting}
          >
            مسح التاريخين
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-start">
              تاريخ البداية
            </label>
            <input
              id="form-start"
              type="datetime-local"
              value={general.start_at}
              onChange={(event) => handleGeneralChange('start_at', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600" htmlFor="form-end">
              تاريخ الانتهاء
            </label>
            <input
              id="form-end"
              type="datetime-local"
              value={general.end_at}
              onChange={(event) => handleGeneralChange('end_at', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={submitting}
            />
          </div>
        </div>
      </section>

      <section className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">الحقول والأسئلة</h2>
            <p className="text-xs text-muted">رتب الحقول كما ستظهر للمستفيد واضبط إعداد كل حقل على حدة.</p>
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            disabled={submitting}
          >
            <i className="bi bi-plus-circle" /> إضافة حقل
          </button>
        </header>

        {generalErrors.fields ? (
          <p className="text-xs text-rose-600">{generalErrors.fields}</p>
        ) : null}

        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-muted">
            لم تتم إضافة أي حقول بعد. ابدأ بإضافة حقل جديد وتحديد نوعه.
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => {
              const errors = fieldErrors[field.localId] ?? {}
              const selectionMode = isSelectionType(field.type)
              return (
                <article key={field.localId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">الحقل #{index + 1}</p>
                      <h3 className="text-lg font-bold text-slate-900">{field.label || `حقل بدون عنوان`}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        onClick={() => handleMoveField(field.localId, 'up')}
                        disabled={index === 0 || submitting}
                      >
                        <i className="bi bi-arrow-up" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        onClick={() => handleMoveField(field.localId, 'down')}
                        disabled={index === fields.length - 1 || submitting}
                      >
                        <i className="bi bi-arrow-down" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 px-3 py-1 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                        onClick={() => handleRemoveField(field.localId)}
                        disabled={submitting}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </header>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">عنوان الحقل *</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(event) => updateField(field.localId, 'label', event.target.value)}
                        className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.label ? 'border-rose-300' : 'border-slate-200'}`}
                        placeholder="مثال: سبب الطلب"
                        disabled={submitting}
                      />
                      {errors.label ? <p className="text-xs text-rose-600">{errors.label}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">مفتاح الحقل *</label>
                      <input
                        type="text"
                        value={field.field_key}
                        onChange={(event) => updateField(field.localId, 'field_key', event.target.value)}
                        className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.field_key ? 'border-rose-300' : 'border-slate-200'}`}
                        placeholder="مثال: request_reason"
                        disabled={submitting}
                      />
                      {errors.field_key ? <p className="text-xs text-rose-600">{errors.field_key}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">نوع الحقل</label>
                      <select
                        value={field.type}
                        onChange={(event) => updateField(field.localId, 'type', event.target.value as FormFieldType)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        disabled={submitting}
                      >
                        {FIELD_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-muted">{FIELD_TYPE_OPTIONS.find((opt) => opt.value === field.type)?.description}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">نص مساعد (اختياري)</label>
                      <input
                        type="text"
                        value={field.helper_text ?? ''}
                        onChange={(event) => updateField(field.localId, 'helper_text', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="مثال: اذكر التفاصيل إن وجدت"
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">نص بديل (placeholder)</label>
                      <input
                        type="text"
                        value={field.placeholder ?? ''}
                        onChange={(event) => updateField(field.localId, 'placeholder', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="مثال: أدخل السبب هنا"
                        disabled={submitting}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(event) => updateField(field.localId, 'is_required', event.target.checked)}
                          className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          disabled={submitting}
                        />
                        هذا الحقل إجباري
                      </label>
                    </div>
                  </div>

                  {selectionMode ? (
                    <div className="mt-4 space-y-2">
                      <label className="text-xs font-semibold text-slate-600">
                        خيارات القائمة (اكتب كل خيار في سطر، ويمكنك استخدام "label | value")
                      </label>
                      <textarea
                        value={field.optionsText ?? ''}
                        onChange={(event) => updateField(field.localId, 'optionsText', event.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder={'مثال:\nموافق | yes\nغير موافق | no'}
                        disabled={submitting}
                      />
                      <p className="text-[11px] text-muted">
                        سيتم إنشاء القيم تلقائياً إذا تركت الجزء بعد الخط العمودي فارغاً.
                      </p>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="glass-card space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">خيارات الردود</h2>
          <p className="text-xs text-muted">تحكم في عدد مرات الإرسال وإمكانية تعديل الردود بعد الإرسال.</p>
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={general.allow_multiple_submissions}
              onChange={(event) => handleGeneralChange('allow_multiple_submissions', event.target.checked)}
              className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
              disabled={submitting}
            />
            السماح بأكثر من رد واحد لكل مستخدم
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={general.allow_edit_after_submit}
              onChange={(event) => handleGeneralChange('allow_edit_after_submit', event.target.checked)}
              className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
              disabled={submitting}
            />
            السماح بتعديل الرد بعد الإرسال
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={general.requires_approval}
              onChange={(event) => handleGeneralChange('requires_approval', event.target.checked)}
              className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
              disabled={submitting}
            />
            يتطلب اعتماد الإدارة قبل قبول الرد
          </label>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-end gap-2">
        <Link
          to="/admin/forms"
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          العودة للقائمة
        </Link>
        <button
          type="submit"
          className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          disabled={submitting}
        >
          {submitting ? 'جاري الحفظ...' : mode === 'create' ? 'حفظ النموذج' : 'تحديث النموذج'}
        </button>
      </footer>
    </form>
  )
}
