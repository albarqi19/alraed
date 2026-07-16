import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Braces,
  CheckCheck,
  Eye,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  useCreateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
  useUpdateWhatsappTemplateMutation,
  useWhatsappTemplatesQuery,
} from '../hooks'
import type { WhatsappTemplate } from '../types'
import {
  extractWhatsappPlaceholders,
  formatWhatsappVariableKey,
  humanizeWhatsappVariableKey,
  sanitizeWhatsappVariableKey,
} from '../utils/whatsapp-templates'
import type { WhatsappPlaceholder } from '../utils/whatsapp-templates'
import { WhatsappVariablesDialog } from '../components/whatsapp-variables-dialog'
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
  WsTextarea,
} from '@/shared/workspace'

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** يستبدل المتغيرات بأمثلتها لعرض معاينة واقعية (يدعم {} و {{}} والمسافات) */
function previewWithExamples(body: string, variables: TemplateFormState['variables']): string {
  const placeholders = extractPlaceholdersFromBody(body)
  let result = body

  placeholders.forEach(({ key }) => {
    const existing = variables.find((variable) => sanitizeVariableKey(variable.key) === key)
    const quick = QUICK_VARIABLE_LOOKUP[key]
    const replacement =
      existing?.example?.trim() || quick?.example || existing?.label?.trim() || quick?.label || beautifyPlaceholderLabel(key)

    const patternParts = key
      .split('_')
      .filter((part) => part.length > 0)
      .map((part) => escapeRegExp(part))
    if (patternParts.length === 0) return

    const flexiblePattern = patternParts.join('[\\s_]*')
    const regex = new RegExp(`({{\\s*${flexiblePattern}\\s*}}|{\\s*${flexiblePattern}\\s*})`, 'gi')
    result = result.replace(regex, replacement)
  })

  return result
}

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  category: '',
  status: 'active',
  body: '',
  variables: [],
}

export function WhatsAppTemplatesPage() {
  const templatesQuery = useWhatsappTemplatesQuery()
  const createMutation = useCreateWhatsappTemplateMutation()
  const updateMutation = useUpdateWhatsappTemplateMutation()
  const deleteMutation = useDeleteWhatsappTemplateMutation()

  const [searchTerm, setSearchTerm] = useState('')
  const [selection, setSelection] = useState<number | 'new' | null>(null)
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM)
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const editingTemplate = useMemo(() => {
    if (selection === null || selection === 'new') return null
    return templates.find((template) => template.id === selection) ?? null
  }, [selection, templates])

  // تعبئة النموذج عند اختيار قالب
  useEffect(() => {
    if (selection === 'new') {
      setFormState(DEFAULT_TEMPLATE_FORM)
      return
    }

    if (editingTemplate) {
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
  }, [editingTemplate, selection])

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

  const isDirty = useMemo(() => {
    if (selection === null) return false
    if (selection === 'new') {
      return JSON.stringify(formState) !== JSON.stringify(DEFAULT_TEMPLATE_FORM)
    }
    if (!editingTemplate) return false
    return (
      formState.name !== editingTemplate.name ||
      formState.category !== (editingTemplate.category ?? '') ||
      formState.status !== editingTemplate.status ||
      formState.body !== editingTemplate.body
    )
  }, [editingTemplate, formState, selection])

  const handleFieldChange = <Key extends keyof TemplateFormState>(key: Key, value: TemplateFormState[Key]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const handleVariableChange = (index: number, key: keyof TemplateFormState['variables'][number], value: string) => {
    setFormState((prev) => {
      const variables = [...prev.variables]
      variables[index] = { ...variables[index], [key]: value }
      return { ...prev, variables }
    })
  }

  const handleAddVariable = () => {
    setFormState((prev) => ({
      ...prev,
      variables: [...prev.variables, { key: '', label: '', example: '' }],
    }))
  }

  const handleRemoveVariable = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, variableIndex) => variableIndex !== index),
    }))
  }

  const handleInsertVariable = (placeholder: string) => {
    if (!placeholder || typeof placeholder !== 'string') {
      return
    }

    const textarea = bodyRef.current
    const selectionStart = textarea?.selectionStart ?? 0
    const selectionEnd = textarea?.selectionEnd ?? 0

    setFormState((prev) => {
      const baseBody = prev.body ?? ''
      const actualStart = textarea ? selectionStart : baseBody.length
      const actualEnd = textarea ? selectionEnd : actualStart

      const nextBody = baseBody.slice(0, actualStart) + placeholder + baseBody.slice(actualEnd)

      // إعادة التركيز وضبط المؤشر بعد الإدراج
      setTimeout(() => {
        if (textarea) {
          textarea.focus()
          const caretPosition = actualStart + placeholder.length
          textarea.setSelectionRange(caretPosition, caretPosition)
        }
      }, 0)

      return {
        ...prev,
        body: nextBody,
      }
    })
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

    if (selection !== 'new' && editingTemplate) {
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
          onSuccess: (updated) => {
            setSelection(updated.id)
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
        onSuccess: (created) => {
          setSelection(created.id)
        },
      },
    )
  }

  const handleDelete = (template: WhatsappTemplate) => {
    const confirmation = window.confirm(`هل تريد حذف القالب "${template.name}"؟`)
    if (!confirmation) return
    deleteMutation.mutate(template.id, {
      onSuccess: () => {
        setSelection(null)
        setFormState(DEFAULT_TEMPLATE_FORM)
      },
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const livePreview = useMemo(
    () => (formState.body.trim() ? previewWithExamples(formState.body, formState.variables) : ''),
    [formState.body, formState.variables],
  )

  return (
    <WsPage>
      <WhatsappVariablesDialog
        open={variablesDialogOpen}
        onClose={() => setVariablesDialogOpen(false)}
        onInsert={handleInsertVariable}
      />

      <WsHeader
        title="قوالب رسائل الواتساب"
        badge="استوديو القوالب"
        actions={
          <WsBtn
            variant="primary"
            icon={Plus}
            onClick={() => {
              setSelection('new')
              setFormState(DEFAULT_TEMPLATE_FORM)
            }}
          >
            قالب جديد
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={FileText} label="الإجمالي:">
              {templates.length.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact label="مفعّلة:">{activeCount.toLocaleString('ar-SA')}</WsFact>
            <WsFact label="موقوفة:">{inactiveCount.toLocaleString('ar-SA')}</WsFact>
          </>
        }
      />

      <WsLayout>
        {/* العمود الأيمن: قائمة القوالب */}
        <WsSideCol title="القوالب" icon={FileText} side="start" width={270} storageKey="ws:whatsapp-templates:list">
          <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم أو التصنيف أو النص"
            />
          </div>
          <WsBlock title="القائمة" count={filteredTemplates.length.toLocaleString('ar-SA')} fill scroll>
            {templatesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل القوالب...</WsEmpty>
            ) : filteredTemplates.length === 0 ? (
              <WsEmpty icon={FileText}>لا توجد قوالب مطابقة — أضف قالباً جديداً.</WsEmpty>
            ) : (
              <div>
                {filteredTemplates.map((template) => {
                  const isSelected = selection === template.id
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelection(template.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)', minWidth: 0 }}>
                          {template.name}
                        </span>
                        <WsChip tone={template.status === 'active' ? 'green' : 'amber'}>
                          {template.status === 'active' ? 'مفعّل' : 'موقوف'}
                        </WsChip>
                      </span>
                      <span className="ws-cell-sub" style={{ display: 'block', marginTop: 2 }}>
                        {template.category ?? 'غير مصنف'}
                        {template.variables?.length ? ` • ${template.variables.length} متغير` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: استوديو التحرير */}
        <WsMain>
          <WsBlock
            title={
              selection === null
                ? 'استوديو القوالب'
                : selection === 'new'
                  ? 'قالب جديد'
                  : `تحرير: ${editingTemplate?.name ?? ''}`
            }
            icon={FileText}
            tools={
              selection !== null ? (
                <>
                  {isDirty && <WsChip tone="amber">غير محفوظ</WsChip>}
                  {selection !== 'new' && editingTemplate ? (
                    <WsBtn
                      size="sm"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => handleDelete(editingTemplate)}
                      disabled={deleteMutation.isPending}
                    />
                  ) : null}
                  <WsBtn size="sm" variant="primary" onClick={handleSubmit} disabled={isSubmitting || !formState.name.trim() || !formState.body.trim()}>
                    {isSubmitting ? 'جاري الحفظ...' : selection === 'new' ? 'حفظ القالب' : 'تحديث القالب'}
                  </WsBtn>
                </>
              ) : undefined
            }
            fill
            scroll
          >
            {selection === null ? (
              <WsEmpty icon={FileText}>
                اختر قالباً من القائمة اليمنى لتحريره، أو أنشئ قالباً جديداً — المعاينة الحية على اليسار.
              </WsEmpty>
            ) : (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr', gap: 8 }}>
                  <WsField label="اسم القالب">
                    <WsInput
                      type="text"
                      value={formState.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      placeholder="مثال: تنبيه غياب ثلاثة أيام"
                      required
                    />
                  </WsField>
                  <WsField label="التصنيف (اختياري)">
                    <WsInput
                      type="text"
                      value={formState.category}
                      onChange={(event) => handleFieldChange('category', event.target.value)}
                      placeholder="الغياب، السلوك..."
                    />
                  </WsField>
                  <WsField label="الحالة">
                    <WsSelect
                      value={formState.status}
                      onChange={(event) => handleFieldChange('status', event.target.value as TemplateFormState['status'])}
                    >
                      <option value="active">مفعّل</option>
                      <option value="inactive">موقوف</option>
                    </WsSelect>
                  </WsField>
                </div>

                {/* المتغيرات السريعة */}
                <div style={{ borderRadius: 10, border: '1px solid var(--ws-hairline)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>المتغيرات السريعة — انقر للإدراج عند موضع المؤشر</span>
                    <WsBtn size="sm" icon={Braces} onClick={() => setVariablesDialogOpen(true)}>
                      كل المتغيرات
                    </WsBtn>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {QUICK_VARIABLE_GROUPS.map((group) => (
                      <div key={group.title} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ws-text-2)', flexShrink: 0 }}>
                          {group.title}:
                        </span>
                        {group.variables.map((variable) => (
                          <WsChip key={variable.placeholder} onClick={() => handleInsertVariable(variable.placeholder)}>
                            {variable.label}
                          </WsChip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <WsField label="نص الرسالة">
                  <WsTextarea
                    ref={bodyRef}
                    value={formState.body}
                    onChange={(event) => handleFieldChange('body', event.target.value)}
                    rows={8}
                    required
                    placeholder="اكتب نص الرسالة مع المتغيرات مثل {{اسم_الطالب}} و {{عدد_أيام_الغياب}}"
                  />
                  <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                    استخدم الصيغة {'{{اسم_المتغير}}'} — تُستبدل تلقائياً عند الإرسال.
                  </span>
                </WsField>

                {/* محرر المتغيرات */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>
                      تعريفات المتغيرات
                      <span style={{ fontWeight: 400, color: 'var(--ws-text-2)' }}> — لتوضيح معانيها للمستخدمين</span>
                    </span>
                    <WsBtn size="sm" icon={Plus} onClick={handleAddVariable}>
                      متغير
                    </WsBtn>
                  </div>

                  {formState.variables.length === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px dashed var(--ws-border)',
                        fontSize: 10.5,
                        color: 'var(--ws-text-2)',
                      }}
                    >
                      لا توجد متغيرات إضافية — تُستخرج تلقائياً من نص الرسالة عند الحفظ.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {formState.variables.map((variable, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1.4fr 1fr auto',
                            gap: 6,
                            alignItems: 'center',
                            borderRadius: 8,
                            border: '1px solid var(--ws-hairline)',
                            padding: 8,
                          }}
                        >
                          <WsInput
                            type="text"
                            value={variable.key}
                            onChange={(event) => handleVariableChange(index, 'key', event.target.value)}
                            placeholder="المفتاح: {{اسم_الطالب}}"
                          />
                          <WsInput
                            type="text"
                            value={variable.label}
                            onChange={(event) => handleVariableChange(index, 'label', event.target.value)}
                            placeholder="الوصف: اسم الطالب"
                          />
                          <WsInput
                            type="text"
                            value={variable.example}
                            onChange={(event) => handleVariableChange(index, 'example', event.target.value)}
                            placeholder="مثال: محمد"
                          />
                          <WsBtn size="sm" variant="danger" icon={Trash2} onClick={() => handleRemoveVariable(index)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* العمود الأيسر: معاينة واتساب بالأمثلة */}
        <WsSideCol title="معاينة بالأمثلة" icon={Eye} width={290} storageKey="ws:whatsapp-templates:preview">
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 14,
              background:
                'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0 2px, transparent 2px) 0 0 / 26px 26px, var(--ws-surface-2)',
            }}
          >
            {selection !== null && livePreview ? (
              <>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 8 }}>
                  المتغيرات مستبدلة بأمثلتها الواقعية:
                </div>
                <div
                  style={{
                    maxWidth: '95%',
                    borderRadius: '10px 2px 10px 10px',
                    background: '#D5F5DF',
                    color: '#12261A',
                    padding: '9px 11px',
                    fontSize: 12,
                    lineHeight: 1.9,
                    whiteSpace: 'pre-line',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }}
                >
                  {livePreview}
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                      marginTop: 4,
                      fontSize: 9,
                      color: '#5a7a66',
                    }}
                  >
                    الآن
                    <CheckCheck style={{ width: 12, height: 12, color: '#4FA3DE' }} />
                  </span>
                </div>

                {/* المتغيرات المكتشفة */}
                {extractPlaceholdersFromBody(formState.body).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 5 }}>
                      المتغيرات المكتشفة في النص:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {extractPlaceholdersFromBody(formState.body).map(({ key }) => (
                        <WsChip key={key} tone="sky">
                          {formatKeyForDisplay(key)}
                        </WsChip>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <WsEmpty icon={Eye}>
                {selection === null
                  ? 'اختر قالباً أو أنشئ جديداً لتظهر المعاينة هنا.'
                  : 'اكتب نص الرسالة لتظهر المعاينة بالأمثلة الواقعية.'}
              </WsEmpty>
            )}
          </div>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
