import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  Check,
  CheckCheck,
  Eye,
  Inbox,
  Lightbulb,
  MessageCircle,
  Send,
  Users,
  X,
} from 'lucide-react'
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
import type { WsChipTone } from '@/shared/workspace'

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

function absenceChipTone(absenceDays?: number | null): WsChipTone {
  if (!absenceDays || absenceDays <= 0) return 'green'
  if (absenceDays >= 10) return 'red'
  if (absenceDays >= 5) return 'amber'
  return 'sky'
}

export function WhatsAppSendPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

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

  useEffect(() => {
    const idsParam = searchParams.get('studentIds')
    if (!idsParam) {
      return
    }

    const parsedIds = idsParam
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((id) => Number.isFinite(id) && id > 0)

    if (!parsedIds.length) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('studentIds')
      setSearchParams(nextParams, { replace: true })
      return
    }

    setSelectedStudentIds((current) => {
      const next = new Set(current)
      parsedIds.forEach((id) => next.add(id))
      return next
    })

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('studentIds')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const studentPool = useMemo(() => {
    const map = new Map<number, WhatsappTargetStudent>()
      ; (studentsQuery.data ?? []).forEach((student) => map.set(student.id, student))
      ; (absentQuery.data ?? []).forEach((student) => map.set(student.id, student))
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

    const confirmMessage = `سيتم إرسال ${messages.length.toLocaleString('ar-SA-u-nu-latn')} رسالة، هل أنت متأكد؟`
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

  const deliveredCount =
    statisticsQuery.data?.total_failed != null
      ? statisticsQuery.data.total_sent - statisticsQuery.data.total_failed
      : statisticsQuery.data?.total_sent ?? 0

  return (
    <WsPage>
      <WsHeader
        title="إرسال رسائل واتساب"
        badge="رسالة مخصصة لكل ولي أمر"
        actions={
          <WsBtn
            variant="primary"
            icon={Send}
            onClick={handleSend}
            disabled={sendBulkMutation.isPending || selectedStudents.length === 0 || !messageText.trim()}
          >
            {sendBulkMutation.isPending
              ? 'جاري الإرسال...'
              : `إرسال (${selectedStudents.length.toLocaleString('ar-SA-u-nu-latn')})`}
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Send} label="مرسلة:">
              {(statisticsQuery.data?.total_sent ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact label="وصلت:">{deliveredCount.toLocaleString('ar-SA-u-nu-latn')}</WsFact>
            <WsFact label="فشلت:">{(statisticsQuery.data?.total_failed ?? 0).toLocaleString('ar-SA-u-nu-latn')}</WsFact>
            <WsFact icon={Inbox} label="بالانتظار:">
              {(statisticsQuery.data?.queue_size ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          </>
        }
      >
        {selectedStudents.length > 0 && (
          <WsChip tone="sky">{selectedStudents.length.toLocaleString('ar-SA-u-nu-latn')} محدد</WsChip>
        )}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: الجمهور */}
        <WsSideCol title="الجمهور" icon={Users} side="start" width={310} storageKey="ws:whatsapp-send:audience">
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              borderBottom: '1px solid var(--ws-hairline)',
            }}
          >
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم، الهوية أو الصف..."
            />
            <WsSelect
              value={absenceFilter === 'all' ? 'all' : String(absenceFilter)}
              onChange={(event) => {
                const { value } = event.target
                setAbsenceFilter(value === 'all' ? 'all' : Number(value))
              }}
            >
              {ABSENCE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value === 'all' ? 'all' : option.value}>
                  {option.label}
                </option>
              ))}
            </WsSelect>
            <div style={{ display: 'flex', gap: 4 }}>
              <WsBtn size="sm" icon={Users} onClick={() => setIsPickerOpen(true)} style={{ flex: 1, justifyContent: 'center' }}>
                من الفصول
              </WsBtn>
              <WsBtn size="sm" onClick={handleSelectAll}>
                تحديد الكل
              </WsBtn>
              <WsBtn size="sm" onClick={handleClearSelection}>
                مسح
              </WsBtn>
            </div>
          </div>

          <WsBlock
            title="الطلاب"
            count={`${availableStudents.length.toLocaleString('ar-SA-u-nu-latn')}`}
            tools={isStudentsFetching ? <WsChip tone="sky">تحديث...</WsChip> : undefined}
            fill
            scroll
          >
            {isStudentsLoading ? (
              <WsEmpty loading>جاري تحميل قائمة الطلاب...</WsEmpty>
            ) : availableStudents.length === 0 ? (
              <WsEmpty icon={Users}>لا توجد نتائج — جرب تعديل البحث أو فلتر الغياب.</WsEmpty>
            ) : (
              <div>
                {availableStudents.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id)
                  const absenceDaysValue = student.absence_days ?? student.total_absences ?? 0
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleToggleStudent(student.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        width: '100%',
                        textAlign: 'right',
                        padding: '7px 10px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 15,
                          height: 15,
                          marginTop: 2,
                          borderRadius: 4,
                          border: `1px solid ${isSelected ? 'var(--ws-accent-2)' : 'var(--ws-border)'}`,
                          background: isSelected ? 'var(--ws-accent-2)' : 'transparent',
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check style={{ width: 10, height: 10 }} />}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text)' }}>{student.name}</span>
                          {absenceDaysValue ? (
                            <WsChip tone={absenceChipTone(absenceDaysValue)}>{absenceDaysValue} غياب</WsChip>
                          ) : null}
                        </span>
                        <span className="ws-cell-sub" style={{ display: 'block', marginTop: 2 }}>
                          {student.grade && student.class_name ? `${student.grade} - ${student.class_name}` : student.grade || '—'}
                          {' • '}
                          {student.national_id}
                        </span>
                        {student.parent_phone ? (
                          <span className="ws-cell-sub" style={{ display: 'block' }} dir="ltr">
                            {student.parent_phone}
                          </span>
                        ) : (
                          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ws-red)' }}>
                            بدون رقم!
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: الرسالة */}
        <WsMain>
          <WsBlock
            title="الرسالة"
            icon={MessageCircle}
            tools={
              <>
                {isAppointmentTemplate && <WsChip tone="green" icon={Calendar}>قالب موعد</WsChip>}
                <WsSelect
                  value={templateSelectValue}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  style={{ minWidth: 170 }}
                >
                  <option value="">— بدون قالب —</option>
                  <option value="custom">رسالة مخصصة</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </WsSelect>
              </>
            }
            fill
            scroll
          >
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* شرائح المتغيرات */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 6 }}>
                  المتغيرات المتاحة — انقر أي متغير لإدراجه في النص
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {templatesVariables.map((variable) => (
                    <WsChip
                      key={variable.token}
                      onClick={() => {
                        setMessageText((prev) => prev + ' ' + variable.token)
                      }}
                    >
                      <b>{variable.token}</b>
                      <span style={{ opacity: 0.7 }}>{variable.description}</span>
                    </WsChip>
                  ))}
                </div>
              </div>

              {/* نص الرسالة */}
              <WsField label="نص الرسالة" htmlFor="whatsapp-message-body">
                <WsTextarea
                  id="whatsapp-message-body"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  rows={8}
                  placeholder="اكتب رسالتك هنا باستخدام المتغيرات المتاحة..."
                />
                <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  <span>عدد الأحرف: {messageText.length.toLocaleString('ar-SA-u-nu-latn')}</span>
                  <span>سيتم إرسال نسخة مخصصة لكل ولي أمر</span>
                </span>
              </WsField>

              {/* تفاصيل الموعد */}
              {isAppointmentTemplate && (
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--ws-green-bd)',
                    background: 'var(--ws-green-bg)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar style={{ width: 13, height: 13, color: 'var(--ws-green)' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-green)' }}>تفاصيل الموعد</span>
                    <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      — اختر التاريخ والوقت ليُستبدلا داخل القالب
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    {uniqueDateKeys.map((key) => {
                      const meta = templateVariableMetaByKey[key]
                      const label = meta?.variable.label ?? 'تاريخ الموعد'
                      const example = meta?.variable.example
                      const inputId = `appointment-date-${key}`
                      return (
                        <WsField key={`date-${key}`} label={label} htmlFor={inputId}>
                          <WsInput
                            id={inputId}
                            type="date"
                            value={templateVariableValues[key] ?? ''}
                            onChange={(event) => handleTemplateVariableValueChange(key, event.target.value)}
                            onClick={() => handleFieldWrapperClick(inputId)}
                          />
                          {example && <span style={{ fontSize: 9.5, color: 'var(--ws-text-2)' }}>مثال: {example}</span>}
                        </WsField>
                      )
                    })}
                    {uniqueTimeKeys.map((key) => {
                      const meta = templateVariableMetaByKey[key]
                      const label = meta?.variable.label ?? 'وقت الموعد'
                      const example = meta?.variable.example
                      const inputId = `appointment-time-${key}`
                      return (
                        <WsField key={`time-${key}`} label={label} htmlFor={inputId}>
                          <WsInput
                            id={inputId}
                            type="time"
                            value={templateVariableValues[key] ?? ''}
                            onChange={(event) => handleTemplateVariableValueChange(key, event.target.value)}
                            onClick={() => handleFieldWrapperClick(inputId)}
                            step={300}
                          />
                          {example && <span style={{ fontSize: 9.5, color: 'var(--ws-text-2)' }}>مثال: {example}</span>}
                        </WsField>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    <Lightbulb style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-2px' }} /> يمكنك تحديث
                    هذه القيم قبل كل دفعة إرسال لضمان دقة المواعيد.
                  </div>
                </div>
              )}

              {/* شريط الإرسال */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  borderRadius: 10,
                  border: '1px solid var(--ws-hairline)',
                  background: 'var(--ws-surface-2)',
                  padding: '10px 12px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      minWidth: 30,
                      height: 24,
                      borderRadius: 6,
                      background: 'var(--ws-accent-soft)',
                      color: 'var(--ws-accent-2)',
                      fontSize: 12,
                      padding: '0 8px',
                    }}
                  >
                    {selectedStudents.length.toLocaleString('ar-SA-u-nu-latn')}
                  </span>
                  طالب جاهز للإرسال
                </span>
                <WsBtn
                  variant="primary"
                  icon={Send}
                  onClick={handleSend}
                  disabled={sendBulkMutation.isPending}
                >
                  {sendBulkMutation.isPending ? 'جاري الإرسال...' : 'إرسال الرسائل الآن'}
                </WsBtn>
              </div>

              <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                تظهر الرسائل في قائمة الانتظار فوراً، ويمكن متابعة تقدم الإرسال من مركز الواتساب.
              </p>
            </div>
          </WsBlock>
        </WsMain>

        {/* العمود الأيسر: المعاينة الحية */}
        <WsSideCol title="المعاينة الحية" icon={Eye} width={300} storageKey="ws:whatsapp-send:preview">
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* فقاعة واتساب */}
            <div
              style={{
                flex: 1,
                padding: 14,
                background:
                  'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0 2px, transparent 2px) 0 0 / 26px 26px, var(--ws-surface-2)',
              }}
            >
              {messagePreview ? (
                <>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 8 }}>
                    كما ستصل لولي أمر: {selectedStudents[0]?.name}
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
                    {messagePreview}
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
                </>
              ) : (
                <WsEmpty icon={MessageCircle}>
                  اكتب رسالة وحدد طالباً واحداً على الأقل لتظهر المعاينة هنا كما ستصل فعلياً.
                </WsEmpty>
              )}
            </div>

            {/* نصائح */}
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--ws-hairline)', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                <Lightbulb style={{ width: 12, height: 12, color: 'var(--ws-amber)' }} />
                نصائح الإرسال
              </div>
              <ul style={{ margin: 0, paddingInlineStart: 16, display: 'grid', gap: 3, fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                <li>تأكد من دقة أرقام أولياء الأمور قبل الإرسال.</li>
                <li>استخدم المتغيرات لضمان تخصيص الرسائل تلقائياً.</li>
                <li>الرسائل تتم معالجتها خلال دقائق من الإرسال.</li>
                <li>راجِع المعاينة أعلاه — هي بالضبط ما سيصل ولي الأمر.</li>
              </ul>
            </div>
          </div>
        </WsSideCol>
      </WsLayout>

      {/* مودال اختيار الطلاب من الفصول */}
      {isPickerOpen ? (
        <div className="ws-modal" role="dialog" aria-modal onClick={() => setIsPickerOpen(false)}>
          <div
            className="ws-modal__panel"
            style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ws-modal__head" style={{ position: 'relative' }}>
              <h3 className="ws-modal__title">اختيار الطلاب من الفصول</h3>
              <p className="ws-modal__sub">اختر الصف ثم الشعبة لاستعراض الطلاب وتحديدهم بشكل أسرع — يمكنك الجمع من أكثر من فصل.</p>
              <span style={{ position: 'absolute', insetInlineEnd: 12, top: 12 }}>
                <WsChip tone="sky">{selectedStudentIds.size.toLocaleString('ar-SA-u-nu-latn')} مختار</WsChip>
              </span>
            </header>

            <div style={{ display: 'flex', height: '52vh', overflow: 'hidden' }}>
              {/* الصفوف والشعب */}
              <div style={{ width: '46%', overflowY: 'auto', borderInlineEnd: '1px solid var(--ws-hairline)', padding: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 6 }}>الصفوف الدراسية</div>
                {gradeOptions.length === 0 ? (
                  <WsEmpty icon={Users}>لم يتم جلب بيانات الطلاب بعد.</WsEmpty>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
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
                          className={`ws-choice ${isActive ? 'is-selected' : ''}`}
                        >
                          {grade}
                        </button>
                      )
                    })}
                  </div>
                )}

                {pickerGrade && (
                  <>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)', margin: '12px 0 6px' }}>
                      شعب {pickerGrade}
                    </div>
                    {classOptionsForGrade.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>لا توجد فصول — اختر صفاً آخر.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {classOptionsForGrade.map((className) => (
                          <WsChip
                            key={className}
                            tone={pickerClass === className ? 'sky' : undefined}
                            onClick={() => setPickerClass(className)}
                          >
                            {className}
                          </WsChip>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* طلاب الفصل */}
              <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    padding: '8px 12px',
                    background: 'var(--ws-surface-2)',
                    borderBottom: '1px solid var(--ws-hairline)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  قائمة الطلاب ({pickerStudents.length.toLocaleString('ar-SA-u-nu-latn')})
                </div>
                {pickerStudents.length === 0 ? (
                  <WsEmpty icon={Users}>جرب اختيار صف أو فصل مختلف.</WsEmpty>
                ) : (
                  <div>
                    {pickerStudents.map((student) => {
                      const isSelected = selectedStudentIds.has(student.id)
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleToggleStudent(student.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            textAlign: 'right',
                            padding: '7px 12px',
                            border: 'none',
                            borderBottom: '1px solid var(--ws-hairline)',
                            background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 15,
                              height: 15,
                              borderRadius: 4,
                              border: `1px solid ${isSelected ? 'var(--ws-accent-2)' : 'var(--ws-border)'}`,
                              background: isSelected ? 'var(--ws-accent-2)' : 'transparent',
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check style={{ width: 10, height: 10 }} />}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>
                              {student.name}
                            </span>
                            <span className="ws-cell-sub">
                              {student.grade || '—'}
                              {student.class_name ? ` • ${student.class_name}` : ''}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <footer className="ws-modal__foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <WsBtn variant="danger" icon={X} onClick={() => setSelectedStudentIds(() => new Set())}>
                مسح التحديد
              </WsBtn>
              <WsBtn variant="primary" icon={Check} onClick={() => setIsPickerOpen(false)}>
                حفظ الاختيار
              </WsBtn>
            </footer>
          </div>
        </div>
      ) : null}
    </WsPage>
  )
}
