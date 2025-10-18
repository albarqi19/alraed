import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  FormField,
  FormFieldOption,
  FormResponsesPayload,
  PublicFormDetails,
} from '@/modules/forms/types'
import { useSubmitGuardianFormMutation } from '@/modules/forms/hooks'
import type { GuardianFormSubmissionPayload, FormResponseValue } from '@/modules/forms/types'
import { useToast } from '@/shared/feedback/use-toast'

interface GuardianFormRendererProps {
  form: PublicFormDetails
  nationalId: string
  onSubmitted: () => void
}

type FieldErrorMap = Record<string, string>

const UNSUPPORTED_TYPES = new Set<FormField['type']>(['repeater', 'matrix'])
const NON_INPUT_TYPES = new Set<FormField['type']>(['section_break'])

function isNumericType(type: FormField['type']) {
  return type === 'number' || type === 'rating'
}

function defaultValueForField(field: FormField): FormResponseValue {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'phone':
    case 'email':
    case 'date':
    case 'time':
    case 'datetime':
    case 'select':
    case 'radio':
    case 'signature':
      return ''
    case 'number':
    case 'rating':
      return null
    case 'multi_select':
      return []
    case 'checkbox':
    case 'yesno':
      return null
    case 'file':
      return null
    case 'section_break':
    case 'repeater':
    case 'matrix':
    default:
      return null
  }
}

function normalizeNumeric(value: FormResponseValue): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function evaluateVisibility(field: FormField, responses: FormResponsesPayload): boolean {
  const rules = field.visibility_rules ?? []
  if (!rules || rules.length === 0) return true

  return rules.every((rule) => {
    const otherValue = responses[rule.field_key]
    switch (rule.operator) {
      case 'equals':
        return otherValue === rule.value
      case 'not_equals':
        return otherValue !== rule.value
      case 'in':
        if (Array.isArray(rule.value)) {
          return rule.value.includes(otherValue as never)
        }
        return false
      case 'not_in':
        if (Array.isArray(rule.value)) {
          return !rule.value.includes(otherValue as never)
        }
        return true
      case 'contains':
        if (Array.isArray(otherValue)) {
          return otherValue.includes(rule.value as never)
        }
        if (typeof otherValue === 'string') {
          return otherValue.includes(String(rule.value ?? ''))
        }
        return false
      default:
        return true
    }
  })
}

function mergeFields(form: PublicFormDetails): FormField[] {
  const standalone = [...(form.fields ?? [])]
  const sectionFields = (form.sections ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((section) =>
      section.fields
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((field) => ({ ...field, section_id: section.id })),
    )

  return [...standalone.sort((a, b) => a.sort_order - b.sort_order), ...sectionFields]
}

function isEmpty(value: FormResponseValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function GuardianFormRenderer({ form, nationalId, onSubmitted }: GuardianFormRendererProps) {
  const toast = useToast()
  const submitMutation = useSubmitGuardianFormMutation(form.id)
  const [responses, setResponses] = useState<FormResponsesPayload>({})
  const [filesMap, setFilesMap] = useState<Record<string, File[]>>({})
  const [errors, setErrors] = useState<FieldErrorMap>({})
  const [completed, setCompleted] = useState(false)

  const mergedFields = useMemo(() => mergeFields(form), [form])
  const hasUnsupportedFields = useMemo(
    () => mergedFields.some((field) => UNSUPPORTED_TYPES.has(field.type)),
    [mergedFields],
  )

  useEffect(() => {
    const initial: FormResponsesPayload = {}
    mergedFields.forEach((field) => {
      initial[field.field_key] = defaultValueForField(field)
    })
    setResponses(initial)
    setFilesMap({})
    setErrors({})
    setCompleted(false)
  }, [form.id, mergedFields])

  const handleValueChange = (field: FormField, value: FormResponseValue) => {
    setResponses((prev) => ({
      ...prev,
      [field.field_key]: value,
    }))
    setErrors((prev) => {
      if (!prev[field.field_key]) {
        return prev
      }
      const next = { ...prev }
      delete next[field.field_key]
      return next
    })
  }

  const handleFileChange = (field: FormField, fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : []
    setFilesMap((prev) => ({
      ...prev,
      [field.field_key]: files,
    }))
    setErrors((prev) => {
      if (!prev[field.field_key]) {
        return prev
      }
      const next = { ...prev }
      delete next[field.field_key]
      return next
    })
  }

  const handleSignatureChange = (field: FormField, dataUrl: string | null) => {
    handleValueChange(field, dataUrl ? dataUrl : '')
  }

  const validate = (): boolean => {
    const nextErrors: FieldErrorMap = {}

    mergedFields.forEach((field) => {
      if (NON_INPUT_TYPES.has(field.type)) {
        return
      }

      if (!evaluateVisibility(field, responses)) {
        return
      }

      if (UNSUPPORTED_TYPES.has(field.type)) {
        nextErrors[field.field_key] = 'هذا النوع من الحقول غير مدعوم حالياً.'
        return
      }

      if (field.type === 'file') {
        const currentFiles = filesMap[field.field_key] ?? []
        if (field.is_required && currentFiles.length === 0) {
          nextErrors[field.field_key] = 'هذا الحقل مطلوب.'
        }
        return
      }

      const value = responses[field.field_key]
      if (field.is_required && isEmpty(value)) {
        nextErrors[field.field_key] = 'هذا الحقل مطلوب.'
        return
      }

      if (!isEmpty(value)) {
        if (field.type === 'email' && typeof value === 'string') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailPattern.test(value)) {
            nextErrors[field.field_key] = 'صيغة البريد الإلكتروني غير صحيحة.'
            return
          }
        }

        if (field.type === 'phone' && typeof value === 'string') {
          const digits = value.replace(/[^0-9]/g, '')
          if (digits.length < 9) {
            nextErrors[field.field_key] = 'يرجى إدخال رقم هاتف صالح.'
            return
          }
        }

        if (isNumericType(field.type)) {
          const numeric = normalizeNumeric(value)
          if (numeric === null) {
            nextErrors[field.field_key] = 'أدخل قيمة رقمية صحيحة.'
            return
          }
          const maxValue = field.settings?.maxValue
          const minValue = field.settings?.minValue
          if (typeof minValue === 'number' && numeric < minValue) {
            nextErrors[field.field_key] = `القيمة يجب أن تكون أكبر من أو تساوي ${minValue}.`
            return
          }
          if (typeof maxValue === 'number' && numeric > maxValue) {
            nextErrors[field.field_key] = `القيمة يجب أن تكون أقل من أو تساوي ${maxValue}.`
          }
        }
      }
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const getVisibleFields = () => mergedFields.filter((field) => evaluateVisibility(field, responses))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitMutation.isPending) return

    if (!validate()) {
      toast({ type: 'warning', title: 'يرجى مراجعة الحقول المطلوبة قبل الإرسال' })
      return
    }

    const visibleFields = getVisibleFields()
    const payloadResponses: FormResponsesPayload = {}
    visibleFields.forEach((field) => {
      if (field.type === 'file') {
        return
      }
      payloadResponses[field.field_key] = responses[field.field_key]
    })

    const payloadFiles: Record<string, File | File[]> = {}
    visibleFields.forEach((field) => {
      if (field.type !== 'file') {
        return
      }
      const currentFiles = filesMap[field.field_key] ?? []
      if (currentFiles.length === 0) {
        return
      }
      const maxFiles = field.settings?.maxFiles ?? 5
      const limited = currentFiles.slice(0, maxFiles)
      payloadFiles[field.field_key] = maxFiles <= 1 ? limited[0] : limited
    })

    const payload: GuardianFormSubmissionPayload = {
      national_id: nationalId,
      responses: payloadResponses,
      ...(Object.keys(payloadFiles).length > 0 ? { files: payloadFiles } : {}),
    }

    try {
      await submitMutation.mutateAsync(payload)
      setCompleted(true)
      toast({ type: 'success', title: 'تم إرسال النموذج بنجاح' })
      onSubmitted()
      if (!form.allow_multiple_submissions) {
        return
      }
      // Allow additional submissions after success
      setResponses((prev) => ({ ...prev }))
    } catch (error) {
      toast({ type: 'error', title: 'تعذر إرسال النموذج', description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleResetForNewSubmission = () => {
    const initial: FormResponsesPayload = {}
    mergedFields.forEach((field) => {
      initial[field.field_key] = defaultValueForField(field)
    })
    setResponses(initial)
    setFilesMap({})
    setErrors({})
    setCompleted(false)
  }

  if (hasUnsupportedFields) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-sm text-amber-800">
        بعض الحقول في هذا النموذج تستخدم أنواعاً غير مدعومة في واجهة ولي الأمر حالياً. يرجى التواصل مع إدارة المدرسة لتحديث النموذج.
      </div>
    )
  }

  const visibleFields = getVisibleFields()

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="space-y-4">
        {visibleFields.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-muted">
            لا توجد حقول متاحة في هذا النموذج حالياً.
          </div>
        ) : (
          visibleFields.map((field) => (
            <GuardianFieldControl
              key={field.field_key}
              field={field}
              value={responses[field.field_key]}
              files={filesMap[field.field_key]}
              error={errors[field.field_key]}
              disabled={submitMutation.isPending || (completed && !form.allow_multiple_submissions)}
              onChange={(value) => handleValueChange(field, value)}
              onFileChange={(fileList) => handleFileChange(field, fileList)}
              onSignatureChange={(dataUrl) => handleSignatureChange(field, dataUrl)}
            />
          ))
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {completed ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <i className="bi bi-check-circle-fill text-lg" />
            تم إرسال النموذج بنجاح.
          </p>
        ) : (
          <p className="text-xs text-muted">تأكد من مراجعة إجاباتك قبل الإرسال. جميع البيانات تخضع لمراجعة المدرسة.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {completed && form.allow_multiple_submissions ? (
            <button
              type="button"
              onClick={handleResetForNewSubmission}
              className="rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
              disabled={submitMutation.isPending}
            >
              إرسال رد جديد
            </button>
          ) : null}
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={submitMutation.isPending || (completed && !form.allow_multiple_submissions)}
          >
            {submitMutation.isPending ? 'جاري الإرسال...' : completed ? 'إعادة الإرسال' : 'إرسال النموذج'}
          </button>
        </div>
      </footer>
    </form>
  )
}

interface GuardianFieldControlProps {
  field: FormField
  value: FormResponseValue
  files?: File[]
  error?: string
  disabled?: boolean
  onChange: (value: FormResponseValue) => void
  onFileChange: (files: FileList | null) => void
  onSignatureChange: (dataUrl: string | null) => void
}

function GuardianFieldControl({
  field,
  value,
  files,
  error,
  disabled = false,
  onChange,
  onFileChange,
  onSignatureChange,
}: GuardianFieldControlProps) {
  const options = (field.settings?.options ?? []) as FormFieldOption[]
  const maxFiles = field.settings?.maxFiles ?? 5
  const ratingMax = typeof field.settings?.maxValue === 'number' ? field.settings?.maxValue : 5

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'date':
      case 'time':
      case 'datetime': {
        const inputType =
          field.type === 'phone'
            ? 'tel'
            : field.type === 'datetime'
              ? 'datetime-local'
              : field.type
        const textValue = typeof value === 'string' ? value : value == null ? '' : String(value)
        return (
          <input
            type={inputType}
            value={textValue}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={disabled}
          />
        )
      }
      case 'number': {
        const numericValue = value === null || value === '' ? '' : Number(value)
        return (
          <input
            type="number"
            value={numericValue}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={disabled}
          />
        )
      }
      case 'textarea':
        return (
          <textarea
            value={typeof value === 'string' ? value : value == null ? '' : String(value)}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={disabled}
          />
        )
      case 'select':
        {
          const selectValue = typeof value === 'string' ? value : value == null ? '' : String(value)
        return (
          <select
            value={selectValue}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            disabled={disabled}
          >
            <option value="">اختر خياراً</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
        }
      case 'multi_select':
        {
          const current = Array.isArray(value)
            ? (value as Array<string | number | boolean>).map((item) => String(item))
            : []
        return (
          <div className="space-y-2">
            {options.length === 0 ? (
              <p className="text-xs text-muted">لم يتم تعريف خيارات لهذا الحقل.</p>
            ) : (
              options.map((option) => {
                const checked = current.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
                  >
                    <span className="font-semibold text-slate-700">{option.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => {
                        const next = new Set<string>(current)
                        if (event.target.checked) {
                          next.add(option.value)
                        } else {
                          next.delete(option.value)
                        }
                        onChange(Array.from(next))
                      }}
                    />
                  </label>
                )
              })
            )}
          </div>
        )
        }
      case 'radio':
        {
          const radioValue = typeof value === 'string' ? value : value == null ? '' : String(value)
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm"
              >
                <span className="font-semibold text-slate-700">{option.label}</span>
                <input
                  type="radio"
                  name={field.field_key}
                  className="h-4 w-4 border border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={radioValue === option.value}
                  disabled={disabled}
                  onChange={() => onChange(option.value)}
                />
              </label>
            ))}
          </div>
        )
        }
      case 'checkbox':
      case 'yesno':
        {
          const boolValue = value === true
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                boolValue
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
              }`}
              disabled={disabled}
            >
              نعم
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                value === false
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
              }`}
              disabled={disabled}
            >
              لا
            </button>
          </div>
        )
        }
      case 'rating':
        {
          const currentRating = Number(value ?? 0)
        return (
          <div className="flex items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {[...Array(ratingMax)].map((_, index) => {
              const ratingValue = index + 1
              const active = currentRating >= ratingValue
              return (
                <button
                  type="button"
                  key={ratingValue}
                  onClick={() => onChange(ratingValue)}
                  className={`text-lg transition ${active ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                  disabled={disabled}
                >
                  <i className="bi bi-star-fill" />
                </button>
              )
            })}
          </div>
        )
        }
      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              multiple={maxFiles > 1}
              onChange={(event) => onFileChange(event.target.files)}
              className="block w-full text-sm text-slate-600 file:me-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
              disabled={disabled}
            />
            {files && files.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-500">
                {files.map((file) => (
                  <li key={file.name} className="flex items-center gap-2">
                    <i className="bi bi-paperclip" /> {file.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      case 'signature':
        return (
          <SignaturePad
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(dataUrl) => onSignatureChange(dataUrl)}
          />
        )
      case 'section_break':
        return (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            {field.description || '---'}
          </p>
        )
      default:
        return (
          <p className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">
            هذا الحقل غير مدعوم في الواجهة الحالية.
          </p>
        )
    }
  }

  return (
    <article className="space-y-3 rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
      <header className="space-y-1 text-right">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{field.label}</h3>
          {field.is_required ? (
            <span className="text-xs font-semibold text-rose-500">مطلوب</span>
          ) : null}
        </div>
        {field.description ? (
          <p className="text-xs text-muted">{field.description}</p>
        ) : null}
      </header>

      <div>{renderInput()}</div>

      {field.helper_text ? (
        <p className="text-[11px] text-slate-400">{field.helper_text}</p>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </article>
  )
}

interface SignaturePadProps {
  value: string
  disabled?: boolean
  onChange: (dataUrl: string | null) => void
}

function SignaturePad({ value, disabled = false, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const resize = () => {
      const { width } = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = width * ratio
      canvas.height = 180 * ratio
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.scale(ratio, ratio)
      context.lineWidth = 2
      context.lineJoin = 'round'
      context.lineCap = 'round'
      context.strokeStyle = '#1d4ed8'
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (value) {
        const image = new Image()
        image.onload = () => context.drawImage(image, 0, 0, width, 180)
        image.src = value
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [value])

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    setIsDrawing(true)
    context.beginPath()
    const rect = canvas.getBoundingClientRect()
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top)
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawing) return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const rect = canvas.getBoundingClientRect()
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    context.stroke()
  }

  const endDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    onChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-2">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-manipulation rounded-xl bg-white"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          disabled={disabled}
        >
          مسح التوقيع
        </button>
      </div>
    </div>
  )
}
