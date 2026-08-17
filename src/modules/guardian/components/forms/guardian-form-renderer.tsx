import { useEffect, useMemo, useRef, useState } from 'react'
// أيقونات lucide لا Bootstrap: الأخيرة محارفُ خطٍّ يأتي من CDN خارجيّ، فإن حُجب
// أو تأخّر رأى وليُّ الأمر مربّعاتٍ فارغة مكان النجوم وزرّ الإزالة — وهي هنا
// عناصرُ تحكّمٍ لا زينة. وlucide مُحزَّمةٌ مع التطبيق فلا تعتمد على شبكةٍ ثانية.
import {
  CircleCheck,
  ImageDown,
  ImageIcon,
  Loader2,
  Paperclip,
  RotateCcw,
  Star,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  buildFileAccept,
  fieldTypeStoresAnswer,
  getFieldTypeDefaults,
  isAttachmentFieldType,
} from '@/modules/forms/constants'
import { compressImageFiles, isCompressibleImage } from '@/modules/forms/image-compression'
import { useSubmitGuardianFormMutation } from '@/modules/forms/hooks'
import type {
  FormField,
  FormFieldOption,
  FormResponseValue,
  FormResponsesPayload,
  GuardianFormSubmissionPayload,
  PublicFormDetails,
} from '@/modules/forms/types'
import { getErrorMessage } from '@/services/api/errors'
import { useToast } from '@/shared/feedback/use-toast'

/**
 * الراسم يخدم غرضين: تعبئةُ وليّ الأمر الحقيقية، ومعاينةٌ حيّة داخل مصمّم الأدمن.
 *
 * الاتّحاد المميَّز لا يزيّن التوقيع بل يحرسه: في وضع التعبئة لا يصحّ نموذجٌ بلا
 * هويّة طالب ولا بلا معالجٍ لما بعد الإرسال، وفي وضع المعاينة لا وجود لهما أصلاً.
 * فبدل خاصيّتين اختياريّتين يُنسى فحصهما، يفرض المترجم كلّاً في موضعه.
 */
export type GuardianFormRendererProps =
  | {
      form: PublicFormDetails
      /** معاينةٌ لا تُرسل: المدخلات معطّلة وزرّ الإرسال محجوب */
      readOnly: true
      nationalId?: string
      onSubmitted?: () => void
    }
  | {
      form: PublicFormDetails
      readOnly?: false
      nationalId: string
      onSubmitted: () => void
    }

type FieldErrorMap = Record<string, string>

/**
 * أنواعٌ يقبلها الخادم ولا يرسمها هذا الملفّ. الحجب في لوحة المصمّم
 * (`paletteVisible: false`) يمنع إنشاءها اليوم، وهذا الحارس يلتقط ما أنشأته
 * نماذجُ الأمس: نموذجٌ فيه سؤالٌ لا يستطيع وليّ الأمر الإجابة عليه يُحجَب كلُّه
 * بدل أن يُرسَل ناقصاً ثم يُرفَض.
 */
const UNSUPPORTED_TYPES = new Set<FormField['type']>(['repeater', 'matrix'])

/** سقفٌ للنجوم كي لا يرسم خطأٌ في الإعدادات ألفَ نجمةٍ في صفحة جوّال */
const MAX_RATING_STARS = 10

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
    case 'multi_select':
      return []
    // المرفقات تعيش في `filesMap` لا في الإجابات، والباقي يبدأ بلا قيمة
    default:
      return null
  }
}

function normalizeNumeric(value: FormResponseValue): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * حدود حقل المرفق بعد حقن افتراضات نوعه.
 *
 * الخادم يحقن الافتراضات نفسها قبل أن يصدّر الحقل (`fileFieldSettings`)، فالقيَم
 * تصل مضبوطةً في الغالب؛ لكنّ المعاينة في المصمّم تعرض حقلاً لم يمرّ بالخادم بعد،
 * فنُعيد الحقن هنا كي يرى المصمّم القيود نفسها التي سيراها وليّ الأمر.
 */
function attachmentLimits(field: FormField) {
  const defaults = getFieldTypeDefaults(field.type)
  const configured = field.settings?.allowed_types
  const allowedSource = configured?.length ? configured : (defaults.allowed_types ?? [])

  return {
    allowedTypes: allowedSource.map((extension) => extension.replace(/^\./, '').trim().toLowerCase()),
    maxSizeKb: field.settings?.max_size_kb ?? defaults.max_size_kb ?? 5120,
    maxFiles: Math.max(1, field.settings?.max_files ?? defaults.max_files ?? 1),
  }
}

function formatSizeLimit(maxSizeKb: number): string {
  if (maxSizeKb >= 1024) {
    const megabytes = maxSizeKb / 1024
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} ميجابايت`
  }
  return `${maxSizeKb} كيلوبايت`
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`
}

/** تمييزُ المفرد والمثنّى والجمع في سطر التوفير — «صُغِّرت 2 صور» عربيةٌ عرجاء */
function describeImageCount(count: number): string {
  if (count === 1) return 'الصورة'
  if (count === 2) return 'الصورتان'
  if (count <= 10) return `${count} صور`
  return `${count} صورة`
}

/**
 * فحصُ الاختيار في المتصفّح **قبل** الرفع، بنفس حدود الخادم وترتيبها
 * (`FormPublicController::validateFiles`): العدد ثمّ الحجم ثمّ الصيغة.
 *
 * بلا هذا الفحص يرفع وليّ الأمر صورةً من كاميرا الجوّال — عشرة ميجابايت على شبكة
 * جوّال — لتُرفَض بعد أن تصل كاملةً إلى الخادم.
 */
function validateAttachmentSelection(field: FormField, files: File[]): string | null {
  if (files.length === 0) return null

  const { allowedTypes, maxSizeKb, maxFiles } = attachmentLimits(field)

  if (files.length > maxFiles) {
    return maxFiles === 1
      ? 'يمكن رفع ملفّ واحد فقط لهذا الحقل.'
      : `يمكن رفع ${maxFiles} ملفّات كحدٍّ أقصى.`
  }

  for (const file of files) {
    if (file.size / 1024 > maxSizeKb) {
      return `حجم «${file.name}» يتجاوز الحد المسموح (${formatSizeLimit(maxSizeKb)}).`
    }

    const extension = file.name.includes('.') ? (file.name.split('.').pop() ?? '').toLowerCase() : ''
    if (allowedTypes.length > 0 && !allowedTypes.includes(extension)) {
      return `صيغة «${file.name}» غير مدعومة. المسموح: ${allowedTypes.join('، ')}.`
    }
  }

  return null
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

/**
 * ردّ رسائل الخادم إلى حقولها.
 *
 * `ValidationException::withMessages` في البوّابة العامّة يجعل مفتاحَ الخطأ هو
 * `field_key` نفسه، فبدل بانرٍ واحدٍ يقول «صيغة التاريخ غير صحيحة» ولا يقول أين،
 * تجلس كلُّ رسالةٍ تحت سؤالها. وما لا يطابق حقلاً (`form` · `national_id`) يُترك
 * للبانر العامّ الذي يستخرجه `getErrorMessage`.
 *
 * الشكل يُقرأ بالبطّة لا بـ`AxiosError`: ما يلزمنا جسمُ الاستجابة، وجرُّ صنف
 * أخطاء الشبكة إلى مكوّن واجهةٍ يربطه بمكتبةٍ لا شأن له بها.
 */
function extractServerFieldErrors(error: unknown, knownKeys: Set<string>): FieldErrorMap {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data
  if (!data || typeof data !== 'object') return {}

  const errors = (data as { errors?: unknown }).errors
  if (!errors || typeof errors !== 'object') return {}

  const mapped: FieldErrorMap = {}

  Object.entries(errors as Record<string, unknown>).forEach(([key, value]) => {
    if (!knownKeys.has(key)) return
    const message = Array.isArray(value) ? value[0] : value
    if (typeof message === 'string' && message.trim() !== '') {
      mapped[key] = message
    }
  })

  return mapped
}

export function GuardianFormRenderer({ form, nationalId, onSubmitted, readOnly = false }: GuardianFormRendererProps) {
  const toast = useToast()
  const submitMutation = useSubmitGuardianFormMutation(form.id)
  const [responses, setResponses] = useState<FormResponsesPayload>({})
  const [filesMap, setFilesMap] = useState<Record<string, File[]>>({})
  const [errors, setErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const mergedFields = useMemo(() => mergeFields(form), [form])
  const hasUnsupportedFields = useMemo(
    () => mergedFields.some((field) => UNSUPPORTED_TYPES.has(field.type)),
    [mergedFields],
  )

  const returnNotice =
    form.existing_submission?.status === 'returned'
      ? (form.existing_submission.review_notes ?? 'يرجى مراجعة إجاباتك وتعديل ما يلزم.')
      : null

  /**
   * الحقولُ التي تمنع الإرسال، بأسمائها كما يقرؤها وليّ الأمر.
   *
   * «يرجى مراجعة الحقول المطلوبة» رسالةٌ عمياء: تترك وليَّ الأمر يمسح أربعين
   * حقلاً بحثاً عمّا منعه — وهي أوّلُ شكوى وصلت من المدارس. الحصرُ هنا يسمّي
   * الحقلَ ويُمرّر إليه بالنقر.
   */
  const missingSummary = useMemo(
    () =>
      mergedFields
        .filter((field) => errors[field.field_key])
        .map((field) => ({
          key: field.field_key,
          label: field.label || field.field_key,
          message: errors[field.field_key] as string,
        })),
    [mergedFields, errors],
  )

  /** يُمرّر الشاشةَ إلى الحقل ويضع المؤشّر فيه — النقرُ على اسمٍ يجب أن يصل إليه */
  const focusField = (fieldKey: string) => {
    const node = document.querySelector<HTMLElement>(`[data-field-key="${CSS.escape(fieldKey)}"]`)

    if (!node) return

    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    node.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true })
  }

  /**
   * بصمةُ بنية النموذج لا هويّة كائنه: في المعاينة داخل المصمّم يُعاد بناء كائن
   * النموذج مع كلّ حرفٍ يكتبه الأدمن في عنوان سؤال، فربطُ التصفير بالكائن نفسه
   * يمسح ما جرّبه في المعاينة عند كلّ ضغطة مفتاح. المفاتيح والأنواع هي وحدها ما
   * يُبطل الإجابات المحفوظة.
   */
  const fieldsSignature = useMemo(
    () => mergedFields.map((field) => `${field.field_key}:${field.type}`).join('|'),
    [mergedFields],
  )

  const resetForm = (fields: FormField[]) => {
    const initial: FormResponsesPayload = {}
    const previous = form.existing_submission?.answers ?? {}

    fields.forEach((field) => {
      // الإجابةُ السابقة تسبق الافتراض: ردٌّ أُعيد للتصحيح يُفتح محمَّلاً، فيصحّح
      // وليُّ الأمر ما نُبّه إليه بدل أن يُعيد كتابة النموذج كلِّه.
      // و`hasOwnProperty` لا `??` — لأنّ `false` و`0` إجابتان صحيحتان تسقطان معه.
      initial[field.field_key] = Object.prototype.hasOwnProperty.call(previous, field.field_key)
        && previous[field.field_key] !== null
        ? previous[field.field_key]
        : defaultValueForField(field)
    })

    setResponses(initial)
    setFilesMap({})
    setErrors({})
    setFormError(null)
    setCompleted(false)
  }

  useEffect(() => {
    resetForm(mergedFields)
    // البصمة هي المقصودة لا المصفوفة: انظر تعليق `fieldsSignature`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id, fieldsSignature])

  const clearFieldError = (fieldKey: string) => {
    setErrors((prev) => {
      if (!prev[fieldKey]) {
        return prev
      }
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }

  const handleValueChange = (field: FormField, value: FormResponseValue) => {
    setResponses((prev) => ({
      ...prev,
      [field.field_key]: value,
    }))
    clearFieldError(field.field_key)
  }

  /**
   * الاختيار المرفوض لا يُحفَظ أصلاً: إبقاؤه في الحالة مع رسالة خطأ يُغري بالضغط
   * على «إرسال» ثانيةً، ويجعل زرّ الإزالة هو المخرج الوحيد من حالةٍ لا تصلح.
   */
  const handleFilesChange = (field: FormField, files: File[]) => {
    const rejection = validateAttachmentSelection(field, files)

    setFilesMap((prev) => ({
      ...prev,
      [field.field_key]: rejection ? [] : files,
    }))

    if (rejection) {
      setErrors((prev) => ({ ...prev, [field.field_key]: rejection }))
      return
    }

    clearFieldError(field.field_key)
  }

  const handleSignatureChange = (field: FormField, dataUrl: string | null) => {
    handleValueChange(field, dataUrl ? dataUrl : '')
  }

  const validate = (): boolean => {
    const nextErrors: FieldErrorMap = {}

    mergedFields.forEach((field) => {
      // الزينة لا تُطالَب بإجابة: `section_break` وحده اليوم
      if (!fieldTypeStoresAnswer(field.type)) {
        return
      }

      if (!evaluateVisibility(field, responses)) {
        return
      }

      if (UNSUPPORTED_TYPES.has(field.type)) {
        nextErrors[field.field_key] = 'هذا النوع من الحقول غير مدعوم حالياً.'
        return
      }

      if (isAttachmentFieldType(field.type)) {
        const currentFiles = filesMap[field.field_key] ?? []
        if (field.is_required && currentFiles.length === 0) {
          nextErrors[field.field_key] =
            field.type === 'image' ? 'يرجى اختيار صورة.' : 'يرجى إرفاق ملف.'
          return
        }

        const rejection = validateAttachmentSelection(field, currentFiles)
        if (rejection) {
          nextErrors[field.field_key] = rejection
        }
        return
      }

      const value = responses[field.field_key]

      // خانة الموافقة مطلوبةً تعني «مُعلَّمة» لا «مُجاب عنها»: إقرارٌ رُفض ليس إقراراً
      if (field.type === 'checkbox' && field.is_required && value !== true) {
        nextErrors[field.field_key] = 'يلزم تعليم هذه الموافقة للمتابعة.'
        return
      }

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

        if (typeof value === 'string' && (field.type === 'text' || field.type === 'textarea')) {
          const minLength = field.settings?.min_length
          const maxLength = field.settings?.max_length
          if (typeof minLength === 'number' && value.trim().length < minLength) {
            nextErrors[field.field_key] = `أدخل ${minLength} أحرف على الأقل.`
            return
          }
          if (typeof maxLength === 'number' && value.trim().length > maxLength) {
            nextErrors[field.field_key] = `الحد الأقصى ${maxLength} حرفاً.`
            return
          }
        }

        if (isNumericType(field.type)) {
          const numeric = normalizeNumeric(value)
          if (numeric === null) {
            nextErrors[field.field_key] = 'أدخل قيمة رقمية صحيحة.'
            return
          }
          // snake_case لأنّها المفاتيح التي يكتبها المصمّم ويقرؤها الخادم؛
          // كانت تُقرأ minValue/maxValue فلا تُطبَّق حدودٌ قطّ.
          const minValue = field.settings?.min
          const maxValue = field.settings?.max
          if (typeof minValue === 'number' && numeric < minValue) {
            nextErrors[field.field_key] = `القيمة يجب أن تكون أكبر من أو تساوي ${minValue}.`
            return
          }
          if (typeof maxValue === 'number' && numeric > maxValue) {
            nextErrors[field.field_key] = `القيمة يجب أن تكون أقل من أو تساوي ${maxValue}.`
            return
          }
        }

        // نمطٌ يكتبه المصمّم ولا يفرضه الخادم — فرضُه هنا خيرٌ من ألّا يُفرض أصلاً
        const pattern = field.validation?.pattern
        if (typeof value === 'string' && typeof pattern === 'string' && pattern.trim() !== '') {
          try {
            if (!new RegExp(pattern).test(value)) {
              nextErrors[field.field_key] = field.validation?.message || 'القيمة لا تطابق الصيغة المطلوبة.'
            }
          } catch {
            // نمطٌ مشوّه من المصمّم لا يجوز أن يقفل النموذج في وجه وليّ الأمر
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
    if (readOnly || submitMutation.isPending) return

    if (!nationalId) {
      setFormError('تعذّر تحديد هوية الطالب. أعد الدخول إلى البوابة ثم حاول مجدداً.')
      return
    }

    setFormError(null)

    if (!validate()) {
      toast({ type: 'warning', title: 'يرجى مراجعة الحقول المطلوبة قبل الإرسال' })
      return
    }

    const visibleFields = getVisibleFields()
    const payloadResponses: FormResponsesPayload = {}

    visibleFields.forEach((field) => {
      if (!fieldTypeStoresAnswer(field.type)) {
        return
      }

      if (isAttachmentFieldType(field.type)) {
        // مرساةٌ لا إجابة: المرفق يسافر في `files[...]`، والخادم لا يقرأ قيمة حقل
        // المرفق من `responses` إطلاقاً. لكنّ نموذجاً كلُّ حقوله مرفقات كان يصل بلا
        // مفتاح `responses` رأساً — إذ لا يُسلسِل multipart كائناً خاوياً — فيرتدّ
        // قبل أن يبلغ الحقول. سلسلةٌ فارغة تضمن وصول المفتاح، ويطرحها التطبيع في
        // الخادم `null` فلا تترك أثراً في الإجابات.
        payloadResponses[field.field_key] = ''
        return
      }

      payloadResponses[field.field_key] = responses[field.field_key] ?? null
    })

    const payloadFiles: Record<string, File | File[]> = {}
    visibleFields.forEach((field) => {
      if (!isAttachmentFieldType(field.type)) {
        return
      }
      const currentFiles = filesMap[field.field_key] ?? []
      if (currentFiles.length === 0) {
        return
      }
      const { maxFiles } = attachmentLimits(field)
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
      onSubmitted?.()
    } catch (error) {
      // التنبيه من مسؤولية الـhook وحده؛ ما نضيفه هنا رسالةٌ **باقية** أمام العين:
      // التنبيه يذوب بعد ثوانٍ، وسببُ الرفض يلزم وليَّ الأمر حتى يصلح ما رُفض.
      const knownKeys = new Set(mergedFields.map((field) => field.field_key))
      const serverFieldErrors = extractServerFieldErrors(error, knownKeys)

      if (Object.keys(serverFieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...serverFieldErrors }))
      }

      setFormError(getErrorMessage(error, 'تعذر إرسال النموذج. يرجى المحاولة مرة أخرى.'))
    }
  }

  const handleResetForNewSubmission = () => {
    resetForm(mergedFields)
  }

  if (hasUnsupportedFields) {
    return (
      <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950 p-6 text-sm text-amber-800 dark:text-amber-200">
        بعض الحقول في هذا النموذج تستخدم أنواعاً غير مدعومة في واجهة ولي الأمر حالياً. يرجى التواصل مع إدارة المدرسة لتحديث النموذج.
      </div>
    )
  }

  const visibleFields = getVisibleFields()
  const inputsDisabled = readOnly || submitMutation.isPending || (completed && !form.allow_multiple_submissions)
  // تعديلٌ لا ردٌّ ثانٍ: الخادم يمحو إجابات الردّ السابق ويكتب مكانها
  const replacesPreviousAnswer = form.allow_edit_after_submit && !form.allow_multiple_submissions

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* سببُ الإعادة فوق كل شيء: هو المقصودُ من فتح النموذج مرّةً أخرى */}
      {returnNotice ? (
        <section className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            أُعيد النموذج إليك للتعديل
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            {returnNotice}
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            إجاباتك السابقة محفوظة أدناه — عدّل ما يلزم ثمّ أعد الإرسال.
          </p>
        </section>
      ) : null}

      {/* حصرُ الناقص فوق النموذج: «راجع الحقول المطلوبة» وحدها تترك وليَّ الأمر
          يبحث في أربعين حقلاً عن الحقل الذي منعه */}
      {missingSummary.length > 0 ? (
        <section className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {missingSummary.length === 1
              ? 'حقلٌ واحدٌ يمنع الإرسال'
              : `${missingSummary.length} حقول تمنع الإرسال`}
          </p>
          <ul className="mt-2 space-y-1">
            {missingSummary.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => focusField(item.key)}
                  className="text-start text-sm font-semibold text-rose-700 dark:text-rose-300 underline underline-offset-4 hover:text-rose-900 dark:hover:text-rose-100"
                >
                  {item.label}
                </button>
                <span className="text-xs text-rose-600 dark:text-rose-400"> — {item.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        {visibleFields.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700 p-6 text-center text-sm text-muted">
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
              disabled={inputsDisabled}
              onChange={(value) => handleValueChange(field, value)}
              onFilesChange={(files) => handleFilesChange(field, files)}
              onSignatureChange={(dataUrl) => handleSignatureChange(field, dataUrl)}
            />
          ))
        )}
      </section>

      {formError ? (
        <p className="flex items-start gap-2 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </p>
      ) : null}

      {readOnly ? (
        <footer className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-xs text-muted">
            معاينة كما يراها ولي الأمر — لا يمكن الإرسال من هذه الشاشة.
          </p>
        </footer>
      ) : (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
          {completed ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-500">
              <CircleCheck className="h-5 w-5 shrink-0" aria-hidden />
              تم إرسال النموذج بنجاح.
            </p>
          ) : (
            <p className="text-xs text-muted">
              {replacesPreviousAnswer
                ? 'راجع إجاباتك قبل الإرسال. إن سبق أن أرسلت هذا النموذج فإرسالك الآن يحل محل ردك السابق.'
                : 'تأكد من مراجعة إجاباتك قبل الإرسال. جميع البيانات تخضع لمراجعة المدرسة.'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {completed && form.allow_multiple_submissions ? (
              <button
                type="button"
                onClick={handleResetForNewSubmission}
                className="rounded-full border border-slate-300 dark:border-slate-600 px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
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
      )}
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
  onFilesChange: (files: File[]) => void
  onSignatureChange: (dataUrl: string | null) => void
}

function GuardianFieldControl({
  field,
  value,
  files,
  error,
  disabled = false,
  onChange,
  onFilesChange,
  onSignatureChange,
}: GuardianFieldControlProps) {
  const options = (field.settings?.options ?? []) as FormFieldOption[]
  const ratingMax = Math.min(
    MAX_RATING_STARS,
    Math.max(1, typeof field.settings?.max_rating === 'number' ? field.settings.max_rating : 5),
  )

  // الفاصل ليس سؤالاً: لا شارة «مطلوب» ولا إطار بطاقة ولا رسالة خطأ
  if (field.type === 'section_break') {
    return (
      <div className="flex items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <div className="max-w-[70%] text-center">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{field.label}</h3>
          {field.description ? (
            <p className="mt-0.5 text-xs text-muted">{field.description}</p>
          ) : null}
        </div>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }

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
            placeholder={field.placeholder ?? undefined}
            maxLength={field.type === 'text' && typeof field.settings?.max_length === 'number' ? field.settings.max_length : undefined}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
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
            placeholder={field.placeholder ?? undefined}
            min={typeof field.settings?.min === 'number' ? field.settings.min : undefined}
            max={typeof field.settings?.max === 'number' ? field.settings.max : undefined}
            step={typeof field.settings?.step === 'number' ? field.settings.step : undefined}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
            disabled={disabled}
          />
        )
      }
      case 'textarea':
        return (
          <textarea
            value={typeof value === 'string' ? value : value == null ? '' : String(value)}
            placeholder={field.placeholder ?? undefined}
            maxLength={typeof field.settings?.max_length === 'number' ? field.settings.max_length : undefined}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
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
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500"
            disabled={disabled}
          >
            <option value="">{field.placeholder || 'اختر خياراً'}</option>
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
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm shadow-sm"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{option.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
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
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm shadow-sm"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">{option.label}</span>
                <input
                  type="radio"
                  name={field.field_key}
                  className="h-4 w-4 border border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  checked={radioValue === option.value}
                  disabled={disabled}
                  onChange={() => onChange(option.value)}
                />
              </label>
            ))}
          </div>
        )
        }
      // خانة موافقةٍ واحدة للإقرارات — لا زرَّي نعم/لا: «لم يُعلَّم» ليس «لا»
      case 'checkbox':
        return (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm shadow-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              checked={value === true}
              disabled={disabled}
              onChange={(event) => onChange(event.target.checked)}
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {field.placeholder?.trim() || 'أوافق'}
            </span>
          </label>
        )
      case 'yesno':
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                value === true
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-200 hover:text-emerald-600 dark:hover:text-emerald-500'
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
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-200 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
              disabled={disabled}
            >
              لا
            </button>
          </div>
        )
      case 'rating':
        {
          const currentRating = Number(value ?? 0)
        return (
          <div className="flex items-center justify-between gap-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
            {[...Array(ratingMax)].map((_, index) => {
              const ratingValue = index + 1
              const active = currentRating >= ratingValue
              return (
                <button
                  type="button"
                  key={ratingValue}
                  onClick={() => onChange(ratingValue)}
                  aria-label={`${ratingValue} من ${ratingMax}`}
                  className={`transition ${active ? 'text-amber-500' : 'text-slate-300 dark:text-slate-500 hover:text-amber-400'}`}
                  disabled={disabled}
                >
                  {/* النجمةُ المختارة مملوءةٌ والباقية مفرَّغة: الفرق يجب أن يُرى
                      بالشكل لا باللون وحده، فذوو عمى الألوان يقرؤون التقييم أيضاً */}
                  <Star className="h-5 w-5" fill={active ? 'currentColor' : 'none'} aria-hidden />
                </button>
              )
            })}
          </div>
        )
        }
      case 'file':
      case 'image':
        return (
          <AttachmentField
            field={field}
            files={files ?? []}
            disabled={disabled}
            onFilesChange={onFilesChange}
          />
        )
      case 'signature':
        return (
          <SignaturePad
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(dataUrl) => onSignatureChange(dataUrl)}
          />
        )
      default:
        return (
          <p className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            هذا الحقل غير مدعوم في الواجهة الحالية.
          </p>
        )
    }
  }

  return (
    <article
      // المرساةُ يقفز إليها حصرُ الناقص فوق النموذج
      data-field-key={field.field_key}
      className={`space-y-3 rounded-3xl border px-4 py-5 shadow-sm transition-colors ${
        error
          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      <header className="space-y-1 text-right">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
            {field.label}
            {/* النجمةُ مع الكلمة لا بدلاً منها: النجمةُ وحدها اصطلاحٌ لا يعرفه
                كلُّ وليّ أمر، والكلمةُ وحدها تضيع في الصفّ الطويل */}
            {field.is_required ? (
              <span className="ms-1 text-rose-500" aria-hidden>
                *
              </span>
            ) : null}
          </h3>

          {field.is_required ? (
            <span className="shrink-0 rounded-full bg-rose-50 dark:bg-rose-950 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              مطلوب
            </span>
          ) : (
            /* «اختياري» مكتوبةٌ صراحةً: صمتُ الحقل يجعل وليَّ الأمر يظنّ الكلَّ
               مطلوباً فيتوقّف عند سؤالٍ لا يعنيه */
            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              اختياري
            </span>
          )}
        </div>
        {field.description ? (
          <p className="text-xs leading-relaxed text-muted">{field.description}</p>
        ) : null}
      </header>

      <div>{renderInput()}</div>

      {field.helper_text ? (
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          {field.helper_text}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </article>
  )
}

interface AttachmentFieldProps {
  field: FormField
  files: File[]
  disabled: boolean
  onFilesChange: (files: File[]) => void
}

/**
 * حقلا `file` و`image` — مُدخلٌ واحد بسلوكين.
 *
 * الفرق كلُّه في العين لا في التخزين: الصورة تُقبل بـ`accept="image/*"` كي تفتح
 * الكاميرا على الجوّال، وتُعرض معاينةً مصغّرة قبل الإرسال؛ والملفّ يُعرض سطراً
 * باسمه وحجمه. وكلاهما يُظهر حدوده مكتوبةً **قبل** الاختيار.
 *
 * وكلاهما يمرّ بضاغط الصور: `image` صورةٌ دائماً، و`file` تخرج منه الصورُ وحدها
 * ويمرّ الـPDF كما هو بلا لمس.
 */
function AttachmentField({ field, files, disabled, onFilesChange }: AttachmentFieldProps) {
  const isImage = field.type === 'image'
  const { allowedTypes, maxSizeKb, maxFiles } = attachmentLimits(field)
  const [previews, setPreviews] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)

  /**
   * حصيلةُ الضغط مربوطةٌ بالملفّ نفسه لا بموضعه في المصفوفة: الفهارس تنزاح مع كلّ
   * إزالة فتُنسب حصيلةُ صورةٍ إلى أختها. و`WeakMap` تُخلي مدخلَ الملفّ المُزال
   * وحدها فلا يتراكم سجلٌّ لملفّاتٍ لم تعد موجودة.
   *
   * قراءتها أثناء الرسم آمنة: القيمة تابعةٌ لهويّة الملفّ لا لزمن القراءة، ولا
   * تتغيّر إلّا مع مجموعةٍ جديدةٍ تُعيد الرسم أصلاً.
   */
  const savingsRef = useRef<WeakMap<File, { from: number; to: number }>>(new WeakMap())

  /**
   * عدّادُ الطلبات ومِرقابُ الحياة: الضغط غيرُ متزامن، فقد يبدّل وليُّ الأمر اختياره
   * قبل أن ينتهي، أو يغادر الصفحة. بلا الحارسين تكتب نتيجةٌ قديمة فوق اختيارٍ جديد.
   */
  const requestRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isImage || files.length === 0) {
      // إبقاءُ المرجع نفسه حين تكون القائمة فارغةً أصلاً: `[]` جديدةٌ في كلّ مرّة
      // تُحدِث رسمةً لا تغيّر شيئاً على الشاشة.
      setPreviews((previous) => (previous.length === 0 ? previous : []))
      return
    }

    // المعاينة تُبنى من الملفّ نفسه بلا رفع — وهو **الملفّ المضغوط** لا الأصل، فيرى
    // وليُّ الأمر ما سيصل المدرسةَ حقّاً. وصورةُ الآيفون HEIC لا يعرضها متصفّحه إلّا
    // بعد أن يحوّلها الضاغط JPEG، فالمعاينة نفسها ثمرةٌ من ثمرات الضغط.
    // والرابط يبقى معلّقاً في ذاكرة الصفحة حتى يُبطَل صراحةً، فتبديلُ صورةٍ عشرين
    // مرّة يترك عشرين نسخةً حيّة لولا هذا.
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files, isImage])

  /**
   * الضغط **عند الاختيار** لا عند الإرسال.
   *
   * فيرى وليُّ الأمر المعاينةَ والحجم النهائي فوراً بدل مفاجأةٍ عند الإرسال، ويجري
   * التحقّقُ من الحدّ على ما سيُرفع فعلاً: صورةُ ثمانية ميجابايت تصير أربعمئة
   * كيلوبايت، فردُّها قبل ضغطها ظلمٌ لا داعي له.
   */
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    // تفريغ قيمة المدخل فوراً: الحالة هي المصدر الوحيد، وبلا التفريغ لا يُطلق
    // المتصفّح `change` حين يُعاد اختيار الملفّ نفسه بعد إزالته.
    event.target.value = ''

    if (selected.length === 0) {
      onFilesChange([])
      return
    }

    const requestId = ++requestRef.current
    // حالةُ الانتظار لا تُعرض إلّا حين يكون فيها عمل: مرفقُ PDF يمرّ فوراً بلا
    // وميضِ «جارٍ التجهيز» يربك أكثر ممّا يطمئن.
    const hasWork = selected.some((file) => isCompressibleImage(file))
    if (hasWork) setPreparing(true)

    let prepared = selected

    try {
      const results = await compressImageFiles(selected, {
        // امتدادات الحقل تُملي وجهةَ التحويل: الخادم يفحص امتدادَ الاسم، فناتجٌ
        // بامتدادٍ خارج القائمة يُرفض بعد أن يُرفع كاملاً.
        allowedExtensions: allowedTypes,
        maxBytes: maxSizeKb * 1024,
      })

      prepared = results.map((result) => {
        if (result.compressed) {
          savingsRef.current.set(result.file, { from: result.originalSize, to: result.size })
        }
        return result.file
      })
    } catch {
      // الضغط تحسينٌ لا شرط: ما تعذّر ضغطه يُرفع كما اختاره وليُّ الأمر
    }

    // اختيارٌ أحدثُ سبقنا، أو غادر المستخدم الصفحة: نتيجتنا لاغيةٌ ولا تُكتب
    if (!mountedRef.current || requestId !== requestRef.current) return

    setPreparing(false)
    onFilesChange(prepared)
  }

  const removeAt = (index: number) => {
    onFilesChange(files.filter((_, position) => position !== index))
  }

  /**
   * أزرارُ الإزالة تُقفل مع المدخل أثناء التجهيز: القائمة المعروضة حينها هي
   * الاختيار **السابق**، والجديد في الطريق ليحلّ محلّها — فحذفٌ منها يُلغى بعد
   * لحظاتٍ وحده، فيبدو للمستخدم أنّ الزرّ لم يعمل.
   */
  const controlsLocked = disabled || preparing

  const limitsLine = [
    allowedTypes.length > 0 ? allowedTypes.join('، ').toUpperCase() : null,
    `حتى ${formatSizeLimit(maxSizeKb)}`,
    maxFiles === 1 ? (isImage ? 'صورة واحدة' : 'ملف واحد') : `حتى ${maxFiles} ${isImage ? 'صور' : 'ملفات'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  // حصيلةُ ما ضُغط من المجموعة الحاليّة وحدها — ما أُزيل لا يُحتسب
  const savings = files
    .map((file) => savingsRef.current.get(file))
    .filter((entry): entry is { from: number; to: number } => entry !== undefined)
  const savedFrom = savings.reduce((total, entry) => total + entry.from, 0)
  const savedTo = savings.reduce((total, entry) => total + entry.to, 0)
  const savingsLine =
    savings.length === 0 || savedTo >= savedFrom
      ? null
      : `صُغِّرت ${describeImageCount(savings.length)} قبل الرفع: ${formatFileSize(savedFrom)} ← ${formatFileSize(savedTo)}`

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept={buildFileAccept(field.type, allowedTypes)}
        multiple={maxFiles > 1}
        onChange={handleChange}
        className="block w-full text-sm text-slate-600 dark:text-slate-400 file:me-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || preparing}
      />

      {/* منطقةٌ حيّة: التبديل بين القيود والحالة والحصيلة يُنطَق للقارئ الصوتيّ
          بلا أن يسرق التركيز من المدخل */}
      <div aria-live="polite">
        {preparing ? (
          <p className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            جارٍ تجهيز الصور وتصغير حجمها قبل الرفع…
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{limitsLine}</p>
        )}

        {savingsLine && !preparing ? (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ImageDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {savingsLine}
          </p>
        ) : null}
      </div>

      {files.length === 0 ? null : isImage ? (
        <ul className="flex flex-wrap gap-3">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}`}
              className="relative w-24 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
            >
              {previews[index] ? (
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="h-24 w-24 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center text-slate-300 dark:text-slate-600">
                  <ImageIcon className="h-7 w-7" aria-hidden />
                </div>
              )}
              <p className="truncate px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400" title={file.name}>
                {formatFileSize(file.size)}
              </p>
              {controlsLocked ? null : (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`إزالة ${file.name}`}
                  className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-xs text-white transition hover:bg-rose-600"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate" title={file.name}>{file.name}</span>
                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                  {formatFileSize(file.size)}
                </span>
              </span>
              {controlsLocked ? null : (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`إزالة ${file.name}`}
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                >
                  إزالة
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700 p-2">
        <canvas
          ref={canvasRef}
          className="h-44 w-full touch-manipulation rounded-xl bg-white dark:bg-slate-800"
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
          className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
          disabled={disabled}
        >
          مسح التوقيع
        </button>
      </div>
    </div>
  )
}
