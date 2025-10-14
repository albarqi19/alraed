import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useSendWhatsappBulkMessagesMutation,
  useWhatsappAbsentStudentsQuery,
  useWhatsappStatisticsQuery,
  useWhatsappStudentsQuery,
  useWhatsappTemplatesQuery,
} from '../hooks'
import type { WhatsappTargetStudent, WhatsappTemplateVariable } from '../types'
import { sanitizeWhatsappVariableKey } from '../utils/whatsapp-templates'
import { useToast } from '@/shared/feedback/use-toast'
type AbsenceFilterOption = {
  value: 'all' | number
  label: string
}

const ABSENCE_FILTER_OPTIONS: AbsenceFilterOption[] = [
  { value: 'all', label: 'جميع الطلاب' },
  { value: 1, label: 'يوم واحد فأكثر' },
  { value: 2, label: 'يومان فأكثر' },
  { value: 3, label: '3 أيام فأكثر' },
  { value: 5, label: '5 أيام فأكثر' },
  { value: 7, label: 'أسبوع فأكثر' },
  { value: 10, label: '10 أيام فأكثر' },
  { value: 15, label: '15 يوم فأكثر' },
]

const DEFAULT_PLACEHOLDER_TOKENS = [
  { token: '{الاسم}', description: 'اسم الطالب' },
  { token: '{الصف}', description: 'الصف الدراسي' },
  { token: '{الفصل}', description: 'الشعبة / الفصل' },
  { token: '{ايام_الغياب}', description: 'عدد أيام الغياب' },
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPlaceholderRegexFromSanitizedKey(sanitizedKey: string): RegExp | null {
  if (!sanitizedKey) {
    return null
  }

  const patternParts = sanitizedKey
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => escapeRegExp(part))

  if (patternParts.length === 0) {
    return null
  }

  const flexiblePattern = patternParts.join('[\\s_]*')
  return new RegExp(`({{\\s*${flexiblePattern}\\s*}}|{\\s*${flexiblePattern}\\s*})`, 'gi')
}

function personalizeMessage(
  template: string,
  student: WhatsappTargetStudent,
  customValues: Record<string, string> = {},
) {
  const absenceValue =
    student.absence_days ?? student.total_absences ?? (student.last_absence_date ? 1 : undefined) ?? 0

  const replacements = new Map<string, string>()

  const assignValue = (keys: string[], rawValue: string | number | null | undefined) => {
    if (rawValue === null || rawValue === undefined) {
      return
    }

    const value = String(rawValue)
    keys.forEach((rawKey) => {
      const sanitized = sanitizeWhatsappVariableKey(rawKey)
      if (!sanitized || replacements.has(sanitized)) {
        return
      }
      replacements.set(sanitized, value)
    })
  }

  assignValue(['الاسم', 'name', 'student_name', 'اسم_الطالب'], student.name)
  assignValue(['الصف', 'grade'], student.grade ?? 'غير محدد')
  assignValue(['الفصل', 'class', 'class_name'], student.class_name ?? 'غير محدد')
  assignValue(['ايام_الغياب', 'absence_days', 'total_absences'], absenceValue)
  assignValue(['هوية_الطالب', 'national_id'], student.national_id)
  assignValue(['اسم_ولي_الأمر', 'guardian_name', 'parent_name'], student.parent_name)
  assignValue(['رقم_ولي_الأمر', 'guardian_phone', 'parent_phone'], student.parent_phone)
  assignValue(['آخر_غياب', 'اخر_غياب', 'last_absence_date'], student.last_absence_date)

  Object.entries(customValues).forEach(([rawKey, rawValue]) => {
    const sanitized = sanitizeWhatsappVariableKey(rawKey)
    if (!sanitized) {
      return
    }

    const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue)
    if (!value) {
      return
    }

    replacements.set(sanitized, value)
  })

  let result = template

  replacements.forEach((replacement, sanitizedKey) => {
    const regex = buildPlaceholderRegexFromSanitizedKey(sanitizedKey)
    if (!regex) {
      return
    }
    result = result.replace(regex, replacement)
  })

  return result
}

type TemplateVariableMetaEntry = {
  sanitizedKey: string
  normalizedKey: string
  variable: WhatsappTemplateVariable
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('ar-SA')
}

function getAbsenceBadgeClass(absenceDays?: number | null) {
  if (!absenceDays || absenceDays <= 0) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  }

  if (absenceDays >= 10) {
    return 'bg-rose-50 text-rose-700 border border-rose-200'
  }

  if (absenceDays >= 5) {
    return 'bg-amber-50 text-amber-700 border border-amber-200'
  }

  return 'bg-sky-50 text-sky-700 border border-sky-200'
}

function StatsCard({
  icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: string
  label: string
  value: number
  tone: 'primary' | 'success' | 'danger' | 'warning'
  loading?: boolean
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: 'from-indigo-500 to-indigo-600',
    success: 'from-emerald-500 to-emerald-600',
    danger: 'from-rose-500 to-rose-600',
    warning: 'from-amber-500 to-amber-600',
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? <span className="inline-block h-6 w-20 animate-pulse rounded-full bg-slate-200" /> : formatNumber(value)}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${toneClasses[tone]}`}>
          <i className={`bi ${icon} text-xl`}></i>
        </div>
      </div>
    </div>
  )
}

function TemplateBadge({ token, description }: { token: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{token}</p>
      <p className="mt-1 text-[11px] text-slate-500">{description}</p>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <i className={`bi ${icon} text-3xl`}></i>
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-700">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}

export function WhatsAppSendPage() {
  const toast = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [absenceFilter, setAbsenceFilter] = useState<AbsenceFilterOption['value']>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | 'custom' | null>(null)
  const [messageText, setMessageText] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set())
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerGrade, setPickerGrade] = useState<string | null>(null)
  const [pickerClass, setPickerClass] = useState<string | null>(null)
  const [templateVariableValues, setTemplateVariableValues] = useState<Record<string, string>>({})

  const templateSelectValue = selectedTemplateId === 'custom' ? 'custom' : selectedTemplateId != null ? String(selectedTemplateId) : ''

  const statisticsQuery = useWhatsappStatisticsQuery()
  const studentsQuery = useWhatsappStudentsQuery()
  const templatesQuery = useWhatsappTemplatesQuery()
  const absenceDays = typeof absenceFilter === 'number' ? absenceFilter : null
  const absentQuery = useWhatsappAbsentStudentsQuery(absenceDays ?? 0, { enabled: absenceDays !== null })
  const sendBulkMutation = useSendWhatsappBulkMessagesMutation()

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const studentPool = useMemo(() => {
    const map = new Map<number, WhatsappTargetStudent>()
    ;(studentsQuery.data ?? []).forEach((student) => map.set(student.id, student))
    ;(absentQuery.data ?? []).forEach((student) => map.set(student.id, student))
    return map
  }, [studentsQuery.data, absentQuery.data])

  const allStudents = useMemo(() => {
    const all = Array.from(studentPool.values())
    return all
  }, [studentPool])

  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    allStudents.forEach((student) => {
      set.add(student.grade ?? 'غير محدد')
    })
    const options = Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
    return options
  }, [allStudents])

  const classOptionsForGrade = useMemo(() => {
    if (!pickerGrade) return []
    const set = new Set<string>()
    allStudents.forEach((student) => {
      const gradeKey = student.grade ?? 'غير محدد'
      if (gradeKey === pickerGrade) {
        set.add(student.class_name ?? 'غير محدد')
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [allStudents, pickerGrade])

  useEffect(() => {
    if (!isPickerOpen) {
      setPickerGrade(null)
      setPickerClass(null)
      return
    }

    if (!pickerGrade && gradeOptions.length) {
      setPickerGrade(gradeOptions[0])
    }
  }, [gradeOptions, isPickerOpen, pickerGrade])

  useEffect(() => {
    if (!pickerGrade) {
      setPickerClass(null)
      return
    }

    if (!pickerClass && classOptionsForGrade.length) {
      setPickerClass(classOptionsForGrade[0])
    }
  }, [classOptionsForGrade, pickerClass, pickerGrade])

  const pickerStudents = useMemo(() => {
    let filtered = allStudents
    if (pickerGrade) {
      filtered = filtered.filter((student) => (student.grade ?? 'غير محدد') === pickerGrade)
    }
    if (pickerClass) {
      filtered = filtered.filter((student) => (student.class_name ?? 'غير محدد') === pickerClass)
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [allStudents, pickerClass, pickerGrade])

  useEffect(() => {
    setSelectedStudentIds((current) => {
      const next = new Set<number>()
      current.forEach((id) => {
        if (studentPool.has(id)) {
          next.add(id)
        }
      })
      return next
    })
  }, [studentPool])

  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      return templates.find((template) => template.id === selectedTemplateId) ?? null
    }
    return null
  }, [selectedTemplateId, templates])

  const templateVariableMeta = useMemo<TemplateVariableMetaEntry[]>(() => {
    if (!selectedTemplate?.variables?.length) {
      return []
    }

    return selectedTemplate.variables
      .map((variable) => {
        const sanitizedKey = sanitizeWhatsappVariableKey(variable.key)
        if (!sanitizedKey) {
          return null
        }

        const normalizedKey = sanitizedKey.replace(/[\s_]+/g, '_').toLocaleLowerCase('ar')

        return {
          sanitizedKey,
          normalizedKey,
          variable,
        }
      })
      .filter((entry): entry is TemplateVariableMetaEntry => entry !== null)
  }, [selectedTemplate])

  const templateVariableMetaByKey = useMemo(() => {
    const map: Record<string, TemplateVariableMetaEntry> = {}
    templateVariableMeta.forEach((entry) => {
      map[entry.sanitizedKey] = entry
    })
    return map
  }, [templateVariableMeta])

  useEffect(() => {
    if (!templateVariableMeta.length) {
      setTemplateVariableValues({})
      return
    }

    setTemplateVariableValues((current) => {
      const next: Record<string, string> = {}
      templateVariableMeta.forEach((entry) => {
        next[entry.sanitizedKey] = current?.[entry.sanitizedKey] ?? ''
      })
      return next
    })
  }, [templateVariableMeta])

  const appointmentVariableKeys = useMemo(() => {
    if (!templateVariableMeta.length) {
      return { dateKeys: [] as string[], timeKeys: [] as string[] }
    }

    const isDateKey = (key: string) => key.includes('تاريخ') || key.includes('date')
    const isTimeKey = (key: string) => key.includes('وقت') || key.includes('time') || key.includes('clock')

    const dateKeys = templateVariableMeta
      .filter((entry) => isDateKey(entry.normalizedKey))
      .map((entry) => entry.sanitizedKey)

    const timeKeys = templateVariableMeta
      .filter((entry) => isTimeKey(entry.normalizedKey))
      .map((entry) => entry.sanitizedKey)

    return { dateKeys, timeKeys }
  }, [templateVariableMeta])

  const isAppointmentTemplate = appointmentVariableKeys.dateKeys.length > 0 || appointmentVariableKeys.timeKeys.length > 0
  const uniqueDateKeys = useMemo(() => Array.from(new Set(appointmentVariableKeys.dateKeys)), [appointmentVariableKeys])
  const uniqueTimeKeys = useMemo(() => Array.from(new Set(appointmentVariableKeys.timeKeys)), [appointmentVariableKeys])

  const handleFieldWrapperClick = useCallback((inputId: string) => {
    const element = document.getElementById(inputId) as HTMLInputElement | null
    if (!element) {
      return
    }

    if (typeof element.showPicker === 'function') {
      element.showPicker()
      return
    }

    element.focus()
  }, [])

  const availableStudents = useMemo(() => {
    const base = studentsQuery.data ?? []
    let source: WhatsappTargetStudent[]

    if (absenceDays !== null) {
      if (absentQuery.data && absentQuery.data.length) {
        source = absentQuery.data
      } else {
        source = base.filter((student) => {
          const days = student.absence_days ?? student.total_absences ?? 0
          return days >= absenceDays
        })
      }
    } else {
      source = base
    }

    const query = searchTerm.trim()
    if (!query) return source

    const normalized = query.toLocaleLowerCase('ar')

    return source.filter((student) => {
      const nameMatch = student.name?.toLocaleLowerCase('ar').includes(normalized)
      const nationalIdMatch = student.national_id?.toLocaleLowerCase('ar').includes(normalized)
      const gradeMatch = student.grade?.toLocaleLowerCase('ar').includes(normalized)
      const classMatch = student.class_name?.toLocaleLowerCase('ar').includes(normalized)
      return Boolean(nameMatch || nationalIdMatch || gradeMatch || classMatch)
    })
  }, [absenceDays, absentQuery.data, studentsQuery.data, searchTerm])

  const selectedStudents = useMemo(() => {
    const entries: WhatsappTargetStudent[] = []
    selectedStudentIds.forEach((id) => {
      const record = studentPool.get(id)
      if (record) {
        entries.push(record)
      }
    })
    return entries
  }, [selectedStudentIds, studentPool])

  const hasStudentBase = Boolean(studentsQuery.data?.length)
  const hasAbsentData = Boolean(absentQuery.data?.length)

  const isStudentsLoading =
    studentsQuery.isLoading ||
    (absenceDays !== null && !hasAbsentData && !hasStudentBase && absentQuery.isLoading)
  const isStudentsFetching = studentsQuery.isFetching || absentQuery.isFetching

  const messagePreview = useMemo(() => {
    if (!messageText.trim() || !selectedStudents.length) return ''
    return personalizeMessage(messageText, selectedStudents[0], templateVariableValues)
  }, [messageText, selectedStudents, templateVariableValues])

  useEffect(() => {
    if (selectedTemplate) {
      setMessageText(selectedTemplate.body ?? '')
    }
  }, [selectedTemplate])

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(availableStudents.map((student) => student.id)))
  }

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set())
  }

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'custom') {
      setSelectedTemplateId('custom')
      return
    }

    const parsed = Number(templateId)
    if (Number.isFinite(parsed)) {
      setSelectedTemplateId(parsed)
    } else {
      setSelectedTemplateId(null)
    }
  }

  const handleTemplateVariableValueChange = (key: string, value: string) => {
    const sanitizedKey = sanitizeWhatsappVariableKey(key)
    if (!sanitizedKey) {
      return
    }

    setTemplateVariableValues((current) => ({
      ...current,
      [sanitizedKey]: value,
    }))
  }

  const handleSend = async () => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage) {
      toast({ type: 'warning', title: 'يرجى كتابة نص الرسالة أولًا' })
      return
    }

    if (!selectedStudents.length) {
      toast({ type: 'warning', title: 'يرجى اختيار طالب واحد على الأقل' })
      return
    }

    const requiredVariableKeys = new Set<string>([...appointmentVariableKeys.dateKeys, ...appointmentVariableKeys.timeKeys])
    const missingVariableLabels: string[] = []

    requiredVariableKeys.forEach((key) => {
      if (!(templateVariableValues[key]?.trim())) {
        const label = templateVariableMetaByKey[key]?.variable.label ?? key
        missingVariableLabels.push(label)
      }
    })

    if (missingVariableLabels.length) {
      toast({
        type: 'warning',
        title: 'أكمل بيانات الموعد قبل الإرسال',
        description: `الحقول المطلوبة: ${missingVariableLabels.join(' ، ')}`,
      })
      return
    }

    const studentsWithoutPhone = selectedStudents.filter((student) => !student.parent_phone)
    if (studentsWithoutPhone.length) {
      toast({
        type: 'warning',
        title: 'بعض الطلاب لا يوجد لديهم رقم ولي الأمر',
        description: `لن يتم إرسال الرسالة إلى ${studentsWithoutPhone.length} من الطلاب بسبب نقص البيانات`,
      })
    }

    const messages = selectedStudents
      .map((student) => ({
        student_id: student.id,
        student_name: student.name,
        phone: student.parent_phone ?? undefined,
        message: personalizeMessage(trimmedMessage, student, templateVariableValues),
      }))
      .filter((message) => Boolean(message.phone && message.message))

    if (!messages.length) {
      toast({ type: 'error', title: 'لم يتم العثور على طلاب لديهم أرقام صالحة للإرسال' })
      return
    }

    const confirmMessage = `سيتم إرسال ${messages.length.toLocaleString('ar-SA')} رسالة، هل أنت متأكد؟`
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await sendBulkMutation.mutateAsync({
        template_id: typeof selectedTemplateId === 'number' ? selectedTemplateId : undefined,
        messages,
      })

      setMessageText('')
      setSelectedStudentIds(new Set())
      setSelectedTemplateId(null)
    } catch (error) {
      console.error(error)
    }
  }

  const templatesVariables = useMemo(() => {
    if (!selectedTemplate) return DEFAULT_PLACEHOLDER_TOKENS
    if (!selectedTemplate.variables?.length) return DEFAULT_PLACEHOLDER_TOKENS

    return selectedTemplate.variables.map((variable) => ({
      token: variable.key.startsWith('{') ? variable.key : `{${variable.key}}`,
      description: variable.label,
    }))
  }, [selectedTemplate])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">إرسال رسائل الواتساب</h1>
        <p className="text-sm text-slate-600">اختر الطلاب، طبّق الفلاتر، وخصص الرسالة قبل إرسالها لأولياء الأمور.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatsCard icon="bi-send" label="رسائل مرسلة" value={statisticsQuery.data?.total_sent ?? 0} tone="primary" loading={statisticsQuery.isLoading} />
        <StatsCard icon="bi-check-circle" label="وصلت بنجاح" value={statisticsQuery.data?.total_failed != null ? (statisticsQuery.data.total_sent - statisticsQuery.data.total_failed) : statisticsQuery.data?.total_sent ?? 0} tone="success" loading={statisticsQuery.isLoading} />
        <StatsCard icon="bi-x-circle" label="فشلت" value={statisticsQuery.data?.total_failed ?? 0} tone="danger" loading={statisticsQuery.isLoading} />
        <StatsCard icon="bi-clock-history" label="بانتظار الإرسال" value={statisticsQuery.data?.queue_size ?? 0} tone="warning" loading={statisticsQuery.isLoading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="glass-card space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:w-64">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">البحث</label>
                <div className="relative mt-2">
                  <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="ابحث بالاسم، الهوية، أو الصف..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-12 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="w-full sm:w-56">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">تصفية الغياب</label>
                <select
                  value={absenceFilter === 'all' ? 'all' : String(absenceFilter)}
                  onChange={(event) => {
                    const { value } = event.target
                    setAbsenceFilter(value === 'all' ? 'all' : Number(value))
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {ABSENCE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value === 'all' ? 'all' : option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex w-full justify-end sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100"
                >
                  <i className="bi bi-people"></i>
                  اختيار طالب
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full bg-indigo-100 px-2 text-xs font-semibold text-indigo-700">
                  {availableStudents.length.toLocaleString('ar-SA')}
                </span>
                <span>طالباً في القائمة الحالية</span>
                {isStudentsFetching ? <span className="flex items-center gap-1 text-indigo-500"><span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></span> يجري التحديث...</span> : null}
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                  onClick={handleSelectAll}
                >
                  تحديد الكل
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                  onClick={handleClearSelection}
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-3xl border border-slate-200 bg-white/60">
              {isStudentsLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                  <p className="text-sm font-medium">جاري تحميل قائمة الطلاب...</p>
                </div>
              ) : availableStudents.length === 0 ? (
                <EmptyState icon="bi-people" title="لا توجد نتائج" description="جرب تعديل البحث أو تغيير فلاتر الغياب" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {availableStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id)
                    const absenceDaysValue = student.absence_days ?? student.total_absences ?? 0
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => handleToggleStudent(student.id)}
                          className={`flex w-full items-center gap-4 px-5 py-4 text-right transition ${
                            isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-lg border text-sm font-semibold ${
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-slate-400'
                            }`}
                          >
                            {isSelected ? <i className="bi bi-check"></i> : ''}
                          </span>
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                              {absenceDaysValue ? (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${getAbsenceBadgeClass(absenceDaysValue)}`}>
                                  <i className="bi bi-exclamation-diamond-fill"></i>
                                  {absenceDaysValue} يوم غياب
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500">
                              {student.grade ? `${student.grade}` : '—'}
                              {student.class_name ? ` • ${student.class_name}` : ''}
                              {student.national_id ? ` • ${student.national_id}` : ''}
                            </p>
                            {student.parent_phone ? (
                              <p className="text-xs font-medium text-slate-500">
                                <i className="bi bi-phone me-1"></i>
                                {student.parent_phone}
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-amber-600">
                                <i className="bi bi-info-circle me-1"></i>
                                لا يوجد رقم ولي أمر
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="glass-card space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="whatsapp-template-select">
                    اختيار قالب جاهز
                  </label>
                  {isAppointmentTemplate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <i className="bi bi-calendar-event"></i>
                      موعد
                    </span>
                  ) : null}
                </div>
                <select
                  id="whatsapp-template-select"
                  value={templateSelectValue}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">— بدون قالب —</option>
                  <option value="custom">رسالة مخصصة</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {isAppointmentTemplate ? (
                  <p className="text-[11px] font-medium text-emerald-600">
                    هذا القالب يحتوي على بيانات موعد. أكمل الحقول الجانبية قبل الإرسال.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">عدد المحددين</label>
                <div className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-700">
                  {selectedStudents.length.toLocaleString('ar-SA')}
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {templatesVariables.map((variable) => (
                <TemplateBadge key={variable.token} token={variable.token} description={variable.description} />
              ))}
            </div>

            <div className={`grid gap-6 ${isAppointmentTemplate ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="whatsapp-message-body">
                    نص الرسالة
                  </label>
                  <textarea
                    id="whatsapp-message-body"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    rows={8}
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="اكتب رسالتك هنا باستخدام المتغيرات المتاحة..."
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>عدد الأحرف: {messageText.length.toLocaleString('ar-SA')}</span>
                  <span>سيتم إرسال نسخة مخصصة لكل ولي أمر</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-indigo-700">
                    <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full bg-white/80 px-3 text-sm text-indigo-700 shadow-sm">
                      {selectedStudents.length.toLocaleString('ar-SA')}
                    </span>
                    <span>جاهز للإرسال</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sendBulkMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {sendBulkMutation.isPending ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill"></i>
                        إرسال الرسائل الآن
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  تظهر الرسائل في قائمة الانتظار فوراً، ويمكن متابعة تقدم الإرسال من صفحة مركز الواتساب.
                </p>

                {messagePreview ? (
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-700">
                    <div className="mb-2 flex items-center gap-2 text-indigo-600">
                      <i className="bi bi-eye"></i>
                      <span className="font-semibold">معاينة لأوّل طالب محدد:</span>
                      <span className="text-xs text-slate-500">{selectedStudents[0]?.name}</span>
                    </div>
                    <p className="whitespace-pre-line leading-7">{messagePreview}</p>
                  </div>
                ) : null}
              </div>

              {isAppointmentTemplate ? (
                <div className="space-y-6 rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <i className="bi bi-calendar-event"></i>
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">تفاصيل الموعد</p>
                        <p className="text-xs text-slate-500">اختر التاريخ والوقت ليتم استبدالهما داخل القالب لكل رسالة.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      <i className="bi bi-check2-circle"></i> مطلوب
                    </span>
                  </header>

                  <div className="space-y-4">
                    {uniqueDateKeys.map((key) => {
                      const meta = templateVariableMetaByKey[key]
                      const label = meta?.variable.label ?? 'تاريخ الموعد'
                      const example = meta?.variable.example
                      const inputId = `appointment-date-${key}`
                      return (
                        <div key={`date-${key}`} className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor={inputId}>
                            {label}
                          </label>
                          <div
                            className="group relative rounded-2xl border border-emerald-200 bg-white shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60"
                            onClick={() => handleFieldWrapperClick(inputId)}
                          >
                            <input
                              id={inputId}
                              type="date"
                              value={templateVariableValues[key] ?? ''}
                              onChange={(event) => handleTemplateVariableValueChange(key, event.target.value)}
                              className="w-full cursor-pointer rounded-2xl border-none bg-transparent py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-0"
                            />
                            <i className="bi bi-calendar3 pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"></i>
                          </div>
                          <p className="text-[11px] text-slate-400">{example ? `مثال: ${example}` : 'صيغة مقترحة: 2025-10-15'}</p>
                        </div>
                      )
                    })}

                    {uniqueTimeKeys.map((key) => {
                      const meta = templateVariableMetaByKey[key]
                      const label = meta?.variable.label ?? 'وقت الموعد'
                      const example = meta?.variable.example
                      const inputId = `appointment-time-${key}`
                      return (
                        <div key={`time-${key}`} className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor={inputId}>
                            {label}
                          </label>
                          <div
                            className="group relative rounded-2xl border border-emerald-200 bg-white shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60"
                            onClick={() => handleFieldWrapperClick(inputId)}
                          >
                            <input
                              id={inputId}
                              type="time"
                              value={templateVariableValues[key] ?? ''}
                              onChange={(event) => handleTemplateVariableValueChange(key, event.target.value)}
                              className="w-full cursor-pointer rounded-2xl border-none bg-transparent py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-0"
                              step={300}
                            />
                            <i className="bi bi-clock-history pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"></i>
                          </div>
                          <p className="text-[11px] text-slate-400">{example ? `مثال: ${example}` : 'صيغة مقترحة: 10:30'}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
                    <i className="bi bi-lightbulb me-1"></i>
                    يمكنك تحديث هذه القيم قبل كل دفعة إرسال لضمان دقة المواعيد المعروضة لأولياء الأمور.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-card space-y-4 p-6">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">
                  <i className="bi bi-info-circle"></i>
                </span>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">نصائح الإرسال</p>
                  <ul className="space-y-1 text-xs text-slate-200">
                    <li>• تأكد من دقة أرقام أولياء الأمور قبل الإرسال.</li>
                    <li>• استخدم المتغيرات لضمان تخصيص الرسائل تلقائياً.</li>
                    <li>• الرسائل ترسل إلى قائمة الانتظار وتتم معالجتها خلال دقائق.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <div className="flex items-center gap-3 text-indigo-600">
                <i className="bi bi-chat-quote text-xl"></i>
                <p className="font-semibold">تذكير قبل الإرسال</p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                راجع محتوى الرسالة وأرقام أولياء الأمور قبل الضغط على زر الإرسال، واحرص على أن تكون اللغة واضحة ومحترفة لضمان وصول الرسالة بالشكل المطلوب.
              </p>
            </div>
          </div>

          
        </aside>
      </div>

      {isPickerOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setIsPickerOpen(false)}></div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <div className="space-y-6 p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900">اختيار الطلاب للإرسال</h2>
                    <p className="text-sm text-slate-500">
                      اختر الصف والفصل لاستعراض الطلاب وتحديدهم بشكل أسرع. يمكنك تحديد أكثر من طالب واحد في كل مرة.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <i className="bi bi-person-check"></i>
                    {selectedStudentIds.size.toLocaleString('ar-SA')} مختار حالياً
                  </div>
                </header>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">الصفوف الدراسية</p>
                    <span className="text-xs text-slate-400">{gradeOptions.length.toLocaleString('ar-SA')} صف</span>
                  </div>
                  {gradeOptions.length === 0 ? (
                    <EmptyState icon="bi-journals" title="لا توجد صفوف" description="لم يتم جلب بيانات الطلاب بعد." />
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {gradeOptions.map((grade) => {
                        const isActive = pickerGrade === grade
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => {
                              setPickerGrade(grade)
                              setPickerClass(null)
                            }}
                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              isActive
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60'
                            }`}
                          >
                            <span>{grade}</span>
                            {isActive ? <i className="bi bi-check-circle-fill text-indigo-500"></i> : <i className="bi bi-door-open text-slate-300"></i>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                {pickerGrade ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">الفصول والشُعب</p>
                      <span className="text-xs text-slate-400">{classOptionsForGrade.length.toLocaleString('ar-SA')} فصل</span>
                    </div>
                    {classOptionsForGrade.length === 0 ? (
                      <EmptyState icon="bi-grid" title="لا توجد فصول" description="اختر صفاً آخر لعرض الفصول المرتبطة." />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {classOptionsForGrade.map((className) => {
                          const isActive = pickerClass === className
                          return (
                            <button
                              key={className}
                              type="button"
                              onClick={() => setPickerClass(className)}
                              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60'
                              }`}
                            >
                              {className}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">الطلاب</p>
                    <span className="text-xs text-slate-400">{pickerStudents.length.toLocaleString('ar-SA')} طالب</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50/60">
                    {pickerStudents.length === 0 ? (
                      <EmptyState icon="bi-people" title="لا يوجد طلاب" description="جرب اختيار صف أو فصل مختلف." />
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {pickerStudents.map((student) => {
                          const isSelected = selectedStudentIds.has(student.id)
                          return (
                            <li key={student.id}>
                              <button
                                type="button"
                                onClick={() => handleToggleStudent(student.id)}
                                className={`flex w-full items-center gap-4 px-5 py-4 text-right transition ${
                                  isSelected ? 'bg-indigo-50/90' : 'hover:bg-white'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-lg border text-sm font-semibold ${
                                    isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-slate-400'
                                  }`}
                                >
                                  {isSelected ? <i className="bi bi-check"></i> : ''}
                                </span>
                                <div className="flex flex-1 flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                                    {student.absence_days || student.total_absences ? (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${getAbsenceBadgeClass(student.absence_days ?? student.total_absences ?? 0)}`}>
                                        <i className="bi bi-exclamation-diamond-fill"></i>
                                        {(student.absence_days ?? student.total_absences ?? 0).toLocaleString('ar-SA')} يوم غياب
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {(student.grade ?? '—') + (student.class_name ? ` • ${student.class_name}` : '')}
                                  </p>
                                  {student.parent_phone ? (
                                    <p className="text-xs font-medium text-slate-500">
                                      <i className="bi bi-phone me-1"></i>
                                      {student.parent_phone}
                                    </p>
                                  ) : (
                                    <p className="text-xs font-medium text-amber-600">
                                      <i className="bi bi-info-circle me-1"></i>
                                      لا يوجد رقم ولي أمر
                                    </p>
                                  )}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    يمكنك مواصلة اختيار الطلاب من أكثر من فصل ثم إغلاق هذه النافذة لمتابعة إعداد الرسالة.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      تم الاختيار
                      <i className="bi bi-check-circle"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(() => new Set())}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      مسح التحديد
                    </button>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
