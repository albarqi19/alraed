import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  useCreateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
  useUpdateWhatsappTemplateMutation,
  useWhatsappTemplatesQuery,
} from '../hooks'
import type { WhatsappTemplate, WhatsappTemplateVariable } from '../types'
import {
  extractWhatsappPlaceholders,
  formatWhatsappVariableKey,
  humanizeWhatsappVariableKey,
  sanitizeWhatsappVariableKey,
} from '../utils/whatsapp-templates'
import type { WhatsappPlaceholder } from '../utils/whatsapp-templates'

type TemplateFormState = {
  name: string
  category: string
  status: 'active' | 'inactive'
  body: string
  variables: Array<{ key: string; label: string; example: string }>
}

type QuickVariable = {
  key: string
  placeholder: string
  label: string
  description?: string
  example?: string
}

const sanitizeVariableKey = sanitizeWhatsappVariableKey
const formatKeyForDisplay = formatWhatsappVariableKey

function createQuickVariable(rawKey: string, label: string, description?: string, example?: string): QuickVariable {
  const key = sanitizeVariableKey(rawKey)
  return {
    key,
    placeholder: `{{${key}}}`,
    label,
    description,
    example,
  }
}

const QUICK_VARIABLE_GROUPS: Array<{ title: string; variables: QuickVariable[] }> = [
  {
    title: 'بيانات الطالب',
    variables: [
      createQuickVariable('اسم_الطالب', 'اسم الطالب', 'يستبدل بالاسم الكامل للطالب', 'محمد بن أحمد'),
      createQuickVariable('هوية_الطالب', 'هوية الطالب', 'الهوية الوطنية أو السجل المدني', '1022334455'),
      createQuickVariable('رقم_الطالب', 'رقم الطالب الداخلي', 'الرقم التسلسلي المعتمد داخل النظام', 'ST-2043'),
      createQuickVariable('الصف', 'الصف الدراسي', 'مثل الصف الثالث متوسط', 'الصف الثالث متوسط'),
      createQuickVariable('الفصل', 'الفصل أو الشعبة', 'مثل الفصل (أ)', 'الشعبة (أ)'),
    ],
  },
  {
    title: 'بيانات ولي الأمر',
    variables: [
      createQuickVariable('اسم_ولي_الأمر', 'اسم ولي الأمر', 'الاسم المسجل في النظام', 'أحمد العتيبي'),
      createQuickVariable('رقم_ولي_الأمر', 'رقم التواصل لولي الأمر', undefined, '0551234567'),
      createQuickVariable('صلة_القرابة', 'صلة القرابة', 'أب، أم، أخ...', 'أب'),
    ],
  },
  {
    title: 'المواعيد والأوقات',
    variables: [
      createQuickVariable('التاريخ', 'تاريخ الموعد', 'تاريخ يتم اختياره عند الإرسال', '2025-10-15'),
      createQuickVariable('تاريخ_اليوم', 'تاريخ اليوم', 'يُستبدل بتاريخ اليوم الحالي تلقائياً', '2025-10-14'),
      createQuickVariable('الوقت', 'وقت الموعد', 'وقت يحدده الموظف عند الإرسال', '10:30 صباحاً'),
      createQuickVariable('الوقت_الآن', 'الوقت الحالي', 'يُستبدل بالوقت أثناء الإرسال', '08:45 صباحاً'),
    ],
  },
  {
    title: 'بيانات المدرسة والنظام',
    variables: [
      createQuickVariable('اسم_المدرسة', 'اسم المدرسة', undefined, 'مدرسة  الابتدائية '),
      createQuickVariable('رابط_النظام', 'رابط النظام', 'رابط لوحة ولي الأمر أو منصة المدرسة', 'https://school.example.com'),
      createQuickVariable('رابط_التقرير', 'رابط تقرير مخصص', 'يمكن تعديله قبل الإرسال', 'https://school.example.com/report'),
    ],
  },
]

const QUICK_VARIABLE_LOOKUP: Record<string, QuickVariable> = QUICK_VARIABLE_GROUPS.reduce((acc, group) => {
  group.variables.forEach((variable) => {
    acc[variable.key] = variable
  })
  return acc
}, {} as Record<string, QuickVariable>)

function beautifyPlaceholderLabel(key: string): string {
  return humanizeWhatsappVariableKey(key)
}

function extractPlaceholdersFromBody(body: string): WhatsappPlaceholder[] {
  return extractWhatsappPlaceholders(body)
}

function normalizeVariablesForPayload(body: string, variables: TemplateFormState['variables']) {
  const placeholders = extractPlaceholdersFromBody(body)
  if (placeholders.length === 0) {
    return []
  }

  return placeholders.map(({ key }) => {
    const existing = variables.find((variable) => sanitizeVariableKey(variable.key) === key)
    const quick = QUICK_VARIABLE_LOOKUP[key]

    const label = (existing?.label?.trim() || quick?.label || beautifyPlaceholderLabel(key)).trim()
    const exampleValue = existing?.example?.trim() || quick?.example || ''

    return {
      key,
      label,
      ...(exampleValue ? { example: exampleValue } : {}),
    }
  })
}

function upsertVariableList(
  current: TemplateFormState['variables'],
  placeholder: string,
): TemplateFormState['variables'] {
  const key = sanitizeVariableKey(placeholder)
  if (!key) {
    return current
  }

  const quick = QUICK_VARIABLE_LOOKUP[key]
  const fallbackLabel = quick?.label || beautifyPlaceholderLabel(key)
  const fallbackExample = quick?.example || ''
  const displayKey = quick?.placeholder ?? formatKeyForDisplay(key)

  const existingIndex = current.findIndex((variable) => sanitizeVariableKey(variable.key) === key)
  if (existingIndex >= 0) {
    const updated = [...current]
    const existing = updated[existingIndex]
    updated[existingIndex] = {
      ...existing,
      key: existing.key || displayKey,
      label: existing.label || fallbackLabel,
      example: existing.example || fallbackExample,
    }
    return updated
  }

  return [
    ...current,
    {
      key: displayKey,
      label: fallbackLabel,
      example: fallbackExample,
    },
  ]
}

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  category: '',
  status: 'active',
  body: '',
  variables: [],
}

function StatusPill({ status }: { status: WhatsappTemplate['status'] }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <i className="bi bi-lightning-charge"></i>
      مفعّل
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <i className="bi bi-pause-circle"></i>
      موقوف
    </span>
  )
}

function VariablesList({ variables }: { variables?: WhatsappTemplateVariable[] | null }) {
  if (!variables?.length) {
    return <p className="text-xs text-slate-400">لا توجد متغيرات لهذا القالب</p>
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {variables.map((variable) => (
        <li
          key={`${variable.key}-${variable.label}`}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600"
        >
          <p className="font-semibold text-slate-700">{formatKeyForDisplay(variable.key)}</p>
          <p className="text-[10px] text-slate-500">{variable.label}</p>
          {variable.example ? <p className="mt-1 text-[10px] text-slate-400">مثال: {variable.example}</p> : null}
        </li>
      ))}
    </ul>
  )
}

function TemplateDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  state,
  setState,
  mode,
}: {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
  state: TemplateFormState
  setState: (updater: (prev: TemplateFormState) => TemplateFormState) => void
  mode: 'create' | 'edit'
}) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const handleFieldChange = <Key extends keyof TemplateFormState>(key: Key, value: TemplateFormState[Key]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const handleVariableChange = (index: number, key: keyof TemplateFormState['variables'][number], value: string) => {
    setState((prev) => {
      const variables = [...prev.variables]
      variables[index] = { ...variables[index], [key]: value }
      return { ...prev, variables }
    })
  }

  const handleAddVariable = () => {
    setState((prev) => ({
      ...prev,
      variables: [...prev.variables, { key: '', label: '', example: '' }],
    }))
  }

  const handleRemoveVariable = (index: number) => {
    setState((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, variableIndex) => variableIndex !== index),
    }))
  }

  const handleInsertVariable = (placeholder: string) => {
    const textarea = bodyRef.current

    setState((prev) => {
      const baseBody = prev.body ?? ''
      const selectionStart = textarea?.selectionStart ?? baseBody.length
      const selectionEnd = textarea?.selectionEnd ?? selectionStart

      const nextBody =
        baseBody.slice(0, selectionStart) + placeholder + baseBody.slice(selectionEnd)

      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus()
          const caretPosition = selectionStart + placeholder.length
          textarea.setSelectionRange(caretPosition, caretPosition)
        }
      })

      return {
        ...prev,
        body: nextBody,
        variables: upsertVariableList(prev.variables, placeholder),
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <div className="mb-6 space-y-2 text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            {mode === 'create' ? 'إضافة قالب جديد' : 'تعديل القالب'}
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'إنشاء رسالة واتساب جاهزة' : `تحديث قالب ${state.name}`}
          </h2>
          <p className="text-sm text-slate-500">
            استخدم المتغيرات لتخصيص الرسالة آلياً حسب بيانات الطالب وولي الأمر.
          </p>
        </div>

        <form className="max-h-[65vh] space-y-5 overflow-y-auto pr-2" onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">اسم القالب</label>
              <input
                type="text"
                value={state.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                placeholder="مثال: تنبيه غياب ثلاثة أيام"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">التصنيف (اختياري)</label>
              <input
                type="text"
                value={state.category}
                onChange={(event) => handleFieldChange('category', event.target.value)}
                placeholder="مثال: الغياب, السلوك..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">الحالة</label>
              <select
                value={state.status}
                onChange={(event) => handleFieldChange('status', event.target.value as TemplateFormState['status'])}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="active">مفعّل</option>
                <option value="inactive">موقوف</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">نص الرسالة</label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">المتغيرات السريعة</span>
                <span>اضغط للإدراج في الموضع الحالي</span>
              </div>
              <div className="mt-2 space-y-2">
                {QUICK_VARIABLE_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-500">{group.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.variables.map((variable) => (
                        <button
                          key={variable.placeholder}
                          type="button"
                          onClick={() => handleInsertVariable(variable.placeholder)}
                          className="rounded-xl border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
                          title={variable.description}
                        >
                          {variable.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <textarea
              ref={bodyRef}
              value={state.body}
              onChange={(event) => handleFieldChange('body', event.target.value)}
              rows={8}
              required
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="اكتب نص الرسالة مع المتغيرات مثل {{اسم_الطالب}} و {{عدد_أيام_الغياب}}"
            />
            <p className="text-xs text-slate-400">
              استخدم الصيغة <code className="font-mono text-slate-500">{'{{اسم_المتغير}}'}</code> لإدراج المتغيرات التي سيتم استبدالها تلقائياً عند الإرسال.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">المتغيرات</p>
                <p className="text-xs text-slate-400">حدد المتغيرات المتاحة للمستخدمين ليتعرفوا على معانيها.</p>
              </div>
              <button
                type="button"
                onClick={handleAddVariable}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <i className="bi bi-plus-circle"></i>
                إضافة متغير
              </button>
            </div>

            {state.variables.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-400">
                لا توجد متغيرات إضافية. مثال: <code className="font-mono">{'{{اسم_ولي_الأمر}}'}</code>
              </p>
            ) : (
              <div className="space-y-3">
                {state.variables.map((variable, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[2fr_2fr_1.5fr_auto]">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">المفتاح</label>
                      <input
                        type="text"
                        value={variable.key}
                        onChange={(event) => handleVariableChange(index, 'key', event.target.value)}
                        placeholder="مثال: {{اسم_الطالب}}"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">الوصف</label>
                      <input
                        type="text"
                        value={variable.label}
                        onChange={(event) => handleVariableChange(index, 'label', event.target.value)}
                        placeholder="مثال: اسم الطالب"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">مثال (اختياري)</label>
                      <input
                        type="text"
                        value={variable.example}
                        onChange={(event) => handleVariableChange(index, 'example', event.target.value)}
                        placeholder="مثال: محمد"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="flex items-start justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariable(index)}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50" disabled={isSubmitting}>
              إلغاء
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الحفظ...' : mode === 'create' ? 'حفظ القالب' : 'تحديث القالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WhatsAppTemplatesPage() {
  const templatesQuery = useWhatsappTemplatesQuery()
  const createMutation = useCreateWhatsappTemplateMutation()
  const updateMutation = useUpdateWhatsappTemplateMutation()
  const deleteMutation = useDeleteWhatsappTemplateMutation()

  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null)

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  useEffect(() => {
    if (dialogMode === 'edit' && editingTemplate) {
      const initialVariables = editingTemplate.variables?.map((variable) => ({
        key: variable.key,
        label: variable.label,
        example: variable.example ?? '',
      })) ?? []

      const normalized = normalizeVariablesForPayload(editingTemplate.body, initialVariables)

      setFormState({
        name: editingTemplate.name,
        category: editingTemplate.category ?? '',
        status: editingTemplate.status,
        body: editingTemplate.body,
        variables: normalized.map((variable) => ({
          key: formatKeyForDisplay(variable.key),
          label: variable.label,
          example: variable.example ?? '',
        })),
      })
    }
  }, [dialogMode, editingTemplate])

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return templates
    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(query) ||
        (template.category?.toLowerCase()?.includes(query) ?? false) ||
        template.body.toLowerCase().includes(query)
      )
    })
  }, [searchTerm, templates])

  const activeCount = templates.filter((template) => template.status === 'active').length
  const inactiveCount = templates.length - activeCount

  const handleOpenCreate = () => {
    setDialogMode('create')
    setEditingTemplate(null)
    setFormState(DEFAULT_TEMPLATE_FORM)
    setDialogOpen(true)
  }

  const handleOpenEdit = (template: WhatsappTemplate) => {
    setDialogMode('edit')
    setEditingTemplate(template)
    setFormState({
      name: template.name,
      category: template.category ?? '',
      status: template.status,
      body: template.body,
      variables:
        template.variables?.map((variable) => ({
          key: formatKeyForDisplay(variable.key),
          label: variable.label,
          example: variable.example ?? '',
        })) ?? [],
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (createMutation.isPending || updateMutation.isPending) return
    setDialogOpen(false)
    setEditingTemplate(null)
    setFormState(DEFAULT_TEMPLATE_FORM)
  }

  const handleSubmit = () => {
    const normalizedVariables = normalizeVariablesForPayload(formState.body, formState.variables)

    setFormState((prev) => ({
      ...prev,
      variables: normalizedVariables.map((variable) => ({
        key: formatKeyForDisplay(variable.key),
        label: variable.label,
        example: variable.example ?? '',
      })),
    }))

    if (dialogMode === 'edit' && editingTemplate) {
      updateMutation.mutate(
        {
          id: editingTemplate.id,
          payload: {
            name: formState.name,
            category: formState.category || undefined,
            status: formState.status,
            body: formState.body,
            variables: normalizedVariables,
          },
        },
        {
          onSuccess: () => {
            closeDialog()
          },
        },
      )
      return
    }

    createMutation.mutate(
      {
        name: formState.name,
        category: formState.category || undefined,
        status: formState.status,
        body: formState.body,
        variables: normalizedVariables,
      },
      {
        onSuccess: () => {
          closeDialog()
        },
      },
    )
  }

  const handleDelete = (template: WhatsappTemplate) => {
    const confirmation = window.confirm(`هل تريد حذف القالب "${template.name}"؟`)
    if (!confirmation) return
    deleteMutation.mutate(template.id)
  }

  return (
    <Fragment>
      <TemplateDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        state={formState}
        setState={setFormState}
        mode={dialogMode}
      />

      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">قوالب رسائل الواتساب</h1>
            <p className="mt-2 text-sm text-slate-600">
              أنشئ قوالب احترافية وتابع استخدامها عبر النظام.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
          >
            <i className="bi bi-plus-circle"></i>
            إضافة قالب جديد
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">إجمالي القوالب</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{templates.length.toLocaleString('ar-SA')}</p>
            <p className="text-xs text-slate-400">عدد القوالب المتاحة للإرسال</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">القوالب المفعّلة</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">{activeCount.toLocaleString('ar-SA')}</p>
            <p className="text-xs text-emerald-500">جاهزة للاستخدام الفوري</p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">القوالب الموقوفة</p>
            <p className="mt-3 text-3xl font-bold text-amber-700">{inactiveCount.toLocaleString('ar-SA')}</p>
            <p className="text-xs text-amber-500">يمكن تفعيلها لاحقًا</p>
          </div>
        </section>

        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-80">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">البحث في القوالب</label>
              <div className="relative mt-2">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث بالاسم أو التصنيف أو نص الرسالة"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-12 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex h-8 items-center justify-center rounded-full bg-slate-100 px-3 font-semibold text-slate-600">
                {filteredTemplates.length.toLocaleString('ar-SA')}
              </span>
              <span>قالباً مطابقاً</span>
            </div>
          </div>

          {templatesQuery.isLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
              <p className="text-sm font-medium">جاري تحميل القوالب...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <i className="bi bi-inbox text-3xl"></i>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">لا توجد قوالب مطابقة</p>
              <p className="mt-1 text-xs text-slate-400">جرب تعديل معايير البحث أو أضف قالبًا جديدًا.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {template.category ? <span className="font-semibold text-indigo-500">{template.category}</span> : 'بدون تصنيف'}
                      </p>
                    </div>
                    <StatusPill status={template.status} />
                  </div>

                  <p className="mt-3 rounded-2xl bg-slate-50/90 p-3 text-[13px] leading-6 text-slate-700">
                    {template.body}
                  </p>

                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">المتغيرات</p>
                    <VariablesList variables={template.variables} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {template.created_at ? <span>أُنشئ في {new Date(template.created_at).toLocaleDateString('ar-SA')}</span> : null}
                    {template.updated_at ? <span>تم التعديل في {new Date(template.updated_at).toLocaleDateString('ar-SA')}</span> : null}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(template)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-[13px] font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <i className="bi bi-pencil-square"></i>
                      تعديل القالب
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-[13px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                      disabled={deleteMutation.isPending}
                    >
                      <i className="bi bi-trash"></i>
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  )
}
