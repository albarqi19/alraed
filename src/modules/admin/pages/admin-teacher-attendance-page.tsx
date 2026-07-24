import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import {
  Calculator,
  CalendarX,
  CheckCircle2,
  Clock3,
  Download,
  FileQuestion,
  Fingerprint,
  Inbox,
  Link2,
  ListChecks,
  Printer,
  RefreshCw,
  Send,
  Settings,
  Timer,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import {
  useTeacherHudoriAttendanceQuery,
  useTeacherAttendanceSettingsQuery,
  useUpdateTeacherAttendanceSettingsMutation,
  useTeacherAttendanceDelaysQuery,
  useRecalculateTeacherAttendanceDelayMutation,
  useNotifyTeacherAttendanceDelayMutation,
  useUpdateTeacherAttendanceDelayStatusMutation,
  useAdminSettingsQuery,
} from '../hooks'
import { TeacherAttendanceStatsModal } from '../components/teacher-attendance-stats-modal'
import { TeacherAttendanceFloatingWidget } from '../components/teacher-attendance-floating-widget'
import { StandbyDistributionModal } from '../components/standby-distribution-modal'
import { LeaveRequestModal } from '../components/leave-request-modal'
import { RemoteDayActivationModal } from '../components/remote-day-activation-modal'
import { CoverageRequestsModal } from '../components/coverage-requests-modal'
import type {
  TeacherHudoriAttendanceFilters,
  TeacherHudoriAttendanceLoginMethod,
  TeacherHudoriAttendanceRecord,
  TeacherHudoriAttendanceStatus,
  TeacherDelayStatus,
  TeacherAbsenceReason,
  TeacherAttendanceDelayFilters,
  TeacherAttendanceDelayRecord,
  TeacherAttendanceDelayStatusUpdatePayload,
  TeacherAttendanceSettingsPayload,
} from '../types'
import {
  getInquiryTemplateMetadata,
  renderBulkInquiryDocument,
  renderInquiryDocument,
  type InquiryTemplateData,
  type TeacherInquiryTemplateKind,
} from './teacher-attendance-inquiry-templates'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsSelect,
  WsSideCol,
  WsSpinner,
  WsSwitch,
  WsTable,
  WsTextarea,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'

const statusOptions: Array<{ value: TeacherHudoriAttendanceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'present', label: 'حضور مؤكد' },
  { value: 'departed', label: 'انصراف مسجل' },
  { value: 'failed', label: 'فشل التعرف' },
  { value: 'unknown', label: 'غير معروف' },
  { value: 'absent', label: 'غياب مسجل' },
]

const fallbackAttendanceStatusLabels: Record<TeacherHudoriAttendanceStatus, string> = {
  present: 'حاضر',
  departed: 'انصرف',
  failed: 'فشل التحقق',
  unknown: 'غير محدد',
  absent: 'غائب',
}

const matchedOptions: Array<{ value: 'all' | 'matched' | 'unmatched'; label: string }> = [
  { value: 'all', label: 'كل السجلات' },
  { value: 'matched', label: 'مرتبطة بمعلم' },
  { value: 'unmatched', label: 'لم تُطابق بعد' },
]

const loginMethodOptions: Array<{ value: TeacherHudoriAttendanceLoginMethod | 'all'; label: string }> = [
  { value: 'all', label: 'جميع الطرق' },
  { value: 'face', label: 'بالبصمة الوجهية' },
  { value: 'fingerprint', label: 'ببصمة الإصبع' },
  { value: 'card', label: 'بالبطاقة' },
  { value: 'voice', label: 'بالتعرف الصوتي' },
  { value: 'manual', label: 'تسجيل يدوي' },
  { value: 'unknown', label: 'غير معروف' },
]

const delayStatusLabels: Record<TeacherDelayStatus, string> = {
  delayed: 'متأخر',
  excused: 'معذور',
  on_time: 'في الوقت المحدد',
  unknown: 'غير محدد',
  absent: 'غياب',
}

const absenceReasonLabels: Record<TeacherAbsenceReason, string> = {
  unjustified: 'غير مبرر',
  delegated: 'مكلف',
  annual_leave: 'الإجازة العادية',
  sick_leave: 'الإجازة المرضية',
  emergency_leave: 'إجازة اضطرارية',
  exceptional_leave: 'الإجازة الاستثنائية',
  deduction: 'حسم',
  companion_leave: 'إجازة المرافقة',
  training_course: 'دورة تدريبية',
  workshop: 'ورشة عمل',
  makeup: 'مكمل',
  bereavement_leave: 'إجازة الوفاة',
  maternity_leave: 'إجازة الوضع',
  exam_leave: 'إجازة الامتحانات',
  paternity_leave: 'إجازة الأبوة',
  motherhood_leave: 'إجازة الأمومة',
  disaster: 'وقوع كارثة',
  sports_leave: 'إجازة رياضية',
  dialysis_leave: 'إجازة غسيل كلى',
  disability_care_leave: 'إجازة رعاية ذوي الإعاقة',
  patient_companion_leave: 'إجازة مرافقة مريض',
  international_sports_leave: 'إجازة رياضية خارج المملكة',
  accident_sick_leave: 'إجازة مرضية بسبب حادث',
  pending: 'تحت الإجراء',
  remote_work: 'دوام عن بعد',
}

const absenceReasonOptions: Array<{ value: TeacherAbsenceReason | 'all'; label: string }> = [
  { value: 'all', label: 'جميع أسباب الغياب' },
  ...Object.entries(absenceReasonLabels).map(([value, label]) => ({ value: value as TeacherAbsenceReason, label })),
]

const delayStatusOptions: Array<{ value: TeacherDelayStatus | 'all'; label: string }> = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'absent', label: delayStatusLabels.absent },
  { value: 'delayed', label: delayStatusLabels.delayed },
  { value: 'excused', label: delayStatusLabels.excused },
  { value: 'unknown', label: delayStatusLabels.unknown },
]

type FilterState = {
  date: string
  status: TeacherHudoriAttendanceStatus | 'all'
  matched: 'all' | 'matched' | 'unmatched'
  login_method: TeacherHudoriAttendanceLoginMethod | 'all'
  search: string
}

type AttendanceSettingsState = {
  start_time: string
  end_time: string
  grace_minutes: number
  auto_calculate_delay: boolean
  send_whatsapp_for_delay: boolean
  include_delay_notice: boolean
  allow_e_signature: boolean
  remind_check_in: boolean
  remind_check_out: boolean
  delay_notification_template_id: number | null
}

type DelayFilterState = {
  status: TeacherDelayStatus | 'all'
  absence_reason: TeacherAbsenceReason | 'all'
  start_date: string
  end_date: string
  search: string
  page: number
  per_page: number
  order: 'asc' | 'desc'
}

type InquiryDialogState = {
  record: TeacherAttendanceDelayRecord
  data: InquiryTemplateData
  template: TeacherInquiryTemplateKind
}

type BulkInquiryDialogState = {
  template: TeacherInquiryTemplateKind
  entries: Array<{
    record: TeacherAttendanceDelayRecord
    data: InquiryTemplateData
  }>
}

type AbsenceDialogState = {
  record: TeacherAttendanceDelayRecord
  reason: TeacherAbsenceReason
  notes: string
  error: string | null
}

// تحويل الأرقام العربية إلى إنجليزية
function convertArabicNumeralsToEnglish(text: string): string {
  const arabicToEnglish: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }
  return text.replace(/[٠-٩]/g, (digit) => arabicToEnglish[digit] || digit)
}

function formatHijriDateForTemplate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const locales = ['ar-SA-u-ca-islamic-umalqura-nu-latn', 'ar-SA-u-ca-islamic-nu-latn', 'ar-SA-u-nu-latn']
  for (const locale of locales) {
    try {
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
      return convertArabicNumeralsToEnglish(formatted)
    } catch {
      continue
    }
  }
  const fallback = date.toLocaleDateString('ar-SA-u-nu-latn')
  return convertArabicNumeralsToEnglish(fallback)
}

function formatGregorianDateForTemplate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    const formatted = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'long' }).format(date)
    return convertArabicNumeralsToEnglish(formatted)
  } catch {
    const fallback = date.toLocaleDateString('ar-SA-u-nu-latn')
    return convertArabicNumeralsToEnglish(fallback)
  }
}

function normalizeTimeForTemplate(value?: string | null) {
  if (!value) return '—'
  const normalized = extractTimeInputValue(value)
  if (normalized) return normalized
  return value
}

function formatDayNameForTemplate(value?: string | Date | null) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long' }).format(date)
  } catch {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long' }
      return date.toLocaleDateString('ar-SA-u-nu-latn', options)
    } catch {
      return '—'
    }
  }
}

function formatAbsenceDayCount(count: number): string {
  if (count === 1) return 'يوم واحد'
  if (count === 2) return 'يومان'
  if (count >= 3 && count <= 10) return `${count} أيام`
  return `${count} يوم`
}

function getTeacherKey(record: TeacherAttendanceDelayRecord): string {
  if (record.teacher_id) return `t-${record.teacher_id}`
  if (record.user?.id) return `u-${record.user.id}`
  return `r-${record.id}`
}

function areConsecutiveSchoolDays(dateA: string, dateB: string): boolean {
  const a = new Date(dateA)
  const b = new Date(dateB)
  const diffDays = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  if (diffDays === 1) return true
  // خميس(4) → أحد(0): فرق 3 أيام مع عطلة الجمعة والسبت
  if (diffDays === 3 && a.getDay() === 4) return true
  return false
}

type ConsecutiveAbsenceGroup = {
  records: TeacherAttendanceDelayRecord[]
  startDate: string
  endDate: string
  dayCount: number
}

function findConsecutiveGroupForRecord(
  record: TeacherAttendanceDelayRecord,
  allDelays: TeacherAttendanceDelayRecord[],
): ConsecutiveAbsenceGroup | null {
  if (record.delay_status !== 'absent' || !record.attendance_date) return null

  const teacherKey = getTeacherKey(record)

  // تصفية سجلات الغياب لنفس المعلم
  const sameTeacherAbsences = allDelays
    .filter((r) => r.delay_status === 'absent' && r.attendance_date && getTeacherKey(r) === teacherKey)
    .sort((a, b) => new Date(a.attendance_date!).getTime() - new Date(b.attendance_date!).getTime())

  // بناء مجموعة الأيام المتصلة التي تحتوي على السجل المطلوب
  let currentRun: TeacherAttendanceDelayRecord[] = [sameTeacherAbsences[0]]

  for (let i = 1; i < sameTeacherAbsences.length; i++) {
    if (areConsecutiveSchoolDays(sameTeacherAbsences[i - 1].attendance_date!, sameTeacherAbsences[i].attendance_date!)) {
      currentRun.push(sameTeacherAbsences[i])
    } else {
      if (currentRun.some((r) => r.id === record.id)) break
      currentRun = [sameTeacherAbsences[i]]
    }
  }

  if (!currentRun.some((r) => r.id === record.id)) return null

  return {
    records: currentRun,
    startDate: currentRun[0].attendance_date!,
    endDate: currentRun[currentRun.length - 1].attendance_date!,
    dayCount: currentRun.length,
  }
}

function createInquiryTemplateData(
  record: TeacherAttendanceDelayRecord,
  options: { schoolName: string; workStartTime?: string | null; issueDate?: Date; absenceDurationText?: string | null },
): InquiryTemplateData {
  const issueDate = options.issueDate ?? new Date()
  const teacherName = record.teacher_name?.trim() || record.user?.name?.trim() || '—'
  const nationalId = record.national_id?.trim() || '—'
  const attendanceDate = record.attendance_date ?? null

  const delayMinutesText =
    typeof record.delay_minutes === 'number'
      ? `${Math.max(record.delay_minutes, 0)} دقيقة`
      : '—'

  const absenceReasonLabel = record.absence_reason_label?.trim()
    || (record.absence_reason && absenceReasonLabels[record.absence_reason as TeacherAbsenceReason])
    || null
  const absenceNotes = record.absence_notes?.trim() || null
  const absenceDurationText = options.absenceDurationText ?? (record.delay_status === 'absent' ? 'يوم واحد' : null)

  return {
    schoolName: options.schoolName || '—',
    teacherName,
    nationalId,
    attendanceDayName: formatDayNameForTemplate(attendanceDate),
    attendanceDateHijri: formatHijriDateForTemplate(attendanceDate),
    attendanceDateGregorian: formatGregorianDateForTemplate(attendanceDate),
    checkInTime: normalizeTimeForTemplate(record.check_in_time),
    workStartTime: normalizeTimeForTemplate(options.workStartTime ?? null),
    delayMinutesText,
    issueDateHijri: formatHijriDateForTemplate(issueDate),
    issueDateGregorian: formatGregorianDateForTemplate(issueDate),
    absenceReasonLabel,
    absenceNotes,
    absenceDurationText,
  }
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn', options)
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    // الخادم قد يعيد التوقيت بتنسيق HH:mm
    return value
  }
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })
  }
}

const hudoriStatusTones: Record<TeacherHudoriAttendanceStatus, WsChipTone | undefined> = {
  present: 'green',
  departed: 'sky',
  failed: 'red',
  absent: 'red',
  unknown: undefined,
}

const loginMethodTones: Record<TeacherHudoriAttendanceLoginMethod, WsChipTone | undefined> = {
  face: 'sky',
  fingerprint: 'sky',
  card: 'amber',
  voice: 'sky',
  manual: undefined,
  unknown: undefined,
}

const delayStatusTones: Record<TeacherDelayStatus, WsChipTone | undefined> = {
  delayed: 'red',
  excused: 'green',
  on_time: 'green',
  absent: undefined,
  unknown: undefined,
}

function StatusChip({ record }: { record: TeacherHudoriAttendanceRecord }) {
  return (
    <WsChip tone={hudoriStatusTones[record.status]} icon={UserCheck}>
      {record.status_label}
    </WsChip>
  )
}

function LoginMethodChip({ record }: { record: TeacherHudoriAttendanceRecord }) {
  return (
    <WsChip tone={loginMethodTones[record.login_method]} icon={Fingerprint}>
      {record.login_method_label}
    </WsChip>
  )
}

function MatchChip({ record }: { record: TeacherHudoriAttendanceRecord }) {
  if (record.is_matched && record.user) {
    return (
      <WsChip tone="green" icon={Link2}>
        {record.user.name}
      </WsChip>
    )
  }

  return (
    <WsChip tone="red" icon={XCircle}>
      لم تُطابق بعد
    </WsChip>
  )
}

function DelayStatusChip({ status, label }: { status: TeacherDelayStatus; label?: string | null }) {
  return (
    <WsChip tone={delayStatusTones[status]} icon={status === 'excused' || status === 'on_time' ? CheckCircle2 : Clock3}>
      {label && label.trim() ? label : delayStatusLabels[status]}
    </WsChip>
  )
}

function extractTimeInputValue(raw?: string | null) {
  if (!raw) return ''
  const directMatch = String(raw).match(/([01]\d|2[0-3]):([0-5]\d)/)
  if (directMatch) return directMatch[0]
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(11, 16)
  }
  return ''
}

// صف مفتاح تبديل في إعدادات الحضور
function SettingsSwitchRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
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
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      <WsSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

type ActiveSection = 'delays' | 'records'

export function AdminTeacherAttendancePage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [activeSection, setActiveSection] = useState<ActiveSection>('delays')
  const [filters, setFilters] = useState<FilterState>({
    date: today,
    status: 'all',
    matched: 'all',
    login_method: 'all',
    search: '',
  })
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState<AttendanceSettingsState>({
    start_time: '',
    end_time: '',
    grace_minutes: 15,
    auto_calculate_delay: true,
    send_whatsapp_for_delay: false,
    include_delay_notice: false,
    allow_e_signature: true,
    remind_check_in: false,
    remind_check_out: false,
    delay_notification_template_id: null,
  })
  const [delayFilters, setDelayFilters] = useState<DelayFilterState>({
    status: 'all',
    absence_reason: 'all',
    start_date: today,
    end_date: today,
    search: '',
    page: 1,
    per_page: 25,
    order: 'desc',
  })
  const [activeRecalculateId, setActiveRecalculateId] = useState<number | null>(null)
  const [activeNotifyId, setActiveNotifyId] = useState<number | null>(null)
  const [activeStatusUpdateId, setActiveStatusUpdateId] = useState<number | null>(null)
  const [excuseDialog, setExcuseDialog] = useState<
    | {
      record: TeacherAttendanceDelayRecord
      reason: 'technical_issue' | 'other'
      notes: string
      error: string | null
    }
    | null
  >(null)
  const [absenceDialog, setAbsenceDialog] = useState<AbsenceDialogState | null>(null)
  const [recalculateDialog, setRecalculateDialog] = useState<
    | {
      record: TeacherAttendanceDelayRecord
      timeValue: string
      error: string | null
    }
    | null
  >(null)
  const [inquiryDialog, setInquiryDialog] = useState<InquiryDialogState | null>(null)
  const [bulkInquiryDialog, setBulkInquiryDialog] = useState<BulkInquiryDialogState | null>(null)
  const [isStandbyModalOpen, setIsStandbyModalOpen] = useState(false)
  const [isRemoteDayModalOpen, setIsRemoteDayModalOpen] = useState(false)
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false)
  const [isCoverageRequestsModalOpen, setIsCoverageRequestsModalOpen] = useState(false)

  const queryFilters = useMemo<TeacherHudoriAttendanceFilters>(() => {
    const payload: TeacherHudoriAttendanceFilters = {}
    if (filters.date) payload.date = filters.date
    if (filters.status !== 'all') payload.status = filters.status
    if (filters.matched !== 'all') payload.matched = filters.matched
    if (filters.login_method !== 'all') payload.login_method = filters.login_method
    if (filters.search.trim()) payload.search = filters.search.trim()
    return payload
  }, [filters])

  const attendanceQuery = useTeacherHudoriAttendanceQuery(queryFilters, { refetchInterval: 60_000 })
  const settingsQuery = useTeacherAttendanceSettingsQuery()
  const updateSettingsMutation = useUpdateTeacherAttendanceSettingsMutation()
  const adminSettingsQuery = useAdminSettingsQuery()

  // عدد طلبات التأمين المعلقة
  const pendingCoverageCountQuery = useQuery({
    queryKey: ['admin-coverage-pending-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/coverage/requests/pending/count')
      return data.count as number
    },
    refetchInterval: 30_000,
  })

  const delayQueryFilters = useMemo<TeacherAttendanceDelayFilters>(() => {
    const payload: TeacherAttendanceDelayFilters = {
      page: delayFilters.page,
      per_page: delayFilters.per_page,
      order: delayFilters.order,
    }

    if (delayFilters.status !== 'all') payload.status = delayFilters.status
    if (delayFilters.absence_reason !== 'all') payload.absence_reason = delayFilters.absence_reason
    if (delayFilters.start_date) payload.start_date = delayFilters.start_date
    if (delayFilters.end_date) payload.end_date = delayFilters.end_date
    if (delayFilters.search.trim()) payload.search = delayFilters.search.trim()

    return payload
  }, [delayFilters])

  const delayQuery = useTeacherAttendanceDelaysQuery(delayQueryFilters)
  const recalcDelayMutation = useRecalculateTeacherAttendanceDelayMutation()
  const notifyDelayMutation = useNotifyTeacherAttendanceDelayMutation()
  const updateDelayStatusMutation = useUpdateTeacherAttendanceDelayStatusMutation()

  useEffect(() => {
    if (!settingsQuery.data) return

    setSettingsForm({
      start_time: settingsQuery.data.start_time ?? '',
      end_time: settingsQuery.data.end_time ?? '',
      grace_minutes: settingsQuery.data.grace_minutes ?? 0,
      auto_calculate_delay: settingsQuery.data.auto_calculate_delay,
      send_whatsapp_for_delay: settingsQuery.data.send_whatsapp_for_delay,
      include_delay_notice: settingsQuery.data.include_delay_notice,
      allow_e_signature: settingsQuery.data.allow_e_signature,
      remind_check_in: settingsQuery.data.remind_check_in,
      remind_check_out: settingsQuery.data.remind_check_out,
      delay_notification_template_id: settingsQuery.data.delay_notification_template_id ?? null,
    })
  }, [settingsQuery.data])

  const records = attendanceQuery.data?.records ?? []
  const stats = attendanceQuery.data?.stats
  const unmatchedRecords = useMemo(
    () => records.filter((record) => !record.is_matched),
    [records],
  )

  const delays = delayQuery.data?.data ?? []
  const delayMeta = delayQuery.data?.meta

  const sortedDelays = useMemo(() => {
    // ترتيب السجلات: الغائبين أولاً ثم المتأخرين ثم المعذورين ثم الباقي
    const statusOrder: Record<TeacherDelayStatus, number> = {
      absent: 1,
      delayed: 2,
      excused: 3,
      on_time: 4,
      unknown: 5,
    }

    return [...delays].sort((a, b) => {
      const orderA = statusOrder[a.delay_status] ?? 999
      const orderB = statusOrder[b.delay_status] ?? 999
      return orderA - orderB
    })
  }, [delays])

  const delayAnalytics = useMemo(() => {
    if (!delays.length) {
      return {
        delayedCount: 0,
        excusedCount: 0,
        absenceCount: 0,
        averageDelay: null as number | null,
      }
    }

    let delayedCount = 0
    let excusedCount = 0
    let absenceCount = 0
    let totalDelayedMinutes = 0
    let countedDelayedRecords = 0

    for (const record of delays) {
      if (record.delay_status === 'delayed') {
        delayedCount += 1
      }
      if (record.delay_status === 'excused') {
        excusedCount += 1
      }
      if (record.delay_status === 'absent') {
        absenceCount += 1
      }
      if (typeof record.delay_minutes === 'number') {
        if (record.delay_status === 'delayed') {
          totalDelayedMinutes += record.delay_minutes
          countedDelayedRecords += 1
        }
      }
    }

    const averageDelay = countedDelayedRecords ? Math.round(totalDelayedMinutes / countedDelayedRecords) : null

    return {
      delayedCount,
      excusedCount,
      absenceCount,
      averageDelay,
    }
  }, [delays])

  const inquiryDocumentHtml = useMemo(() => {
    if (!inquiryDialog) return null
    return renderInquiryDocument(inquiryDialog.template, inquiryDialog.data)
  }, [inquiryDialog])

  const bulkInquiryDocumentHtml = useMemo(() => {
    if (!bulkInquiryDialog || bulkInquiryDialog.entries.length === 0) return null
    return renderBulkInquiryDocument(
      bulkInquiryDialog.template,
      bulkInquiryDialog.entries.map((entry) => entry.data),
    )
  }, [bulkInquiryDialog])
  const inquiryTemplateMetadata = inquiryDialog ? getInquiryTemplateMetadata(inquiryDialog.template) : null
  const bulkInquiryTemplateMetadata = bulkInquiryDialog ? getInquiryTemplateMetadata(bulkInquiryDialog.template) : null
  const totalDelayPages = Math.max(1, delayMeta?.last_page ?? 1)
  const availableTemplates = settingsQuery.data?.available_templates ?? []
  const isSettingsLoading = settingsQuery.isLoading
  const isSavingSettings = updateSettingsMutation.isPending
  const isSubmittingExcuse =
    !!excuseDialog && updateDelayStatusMutation.isPending && activeStatusUpdateId === excuseDialog.record.id
  const isSubmittingRecalculate =
    !!recalculateDialog && recalcDelayMutation.isPending && activeRecalculateId === recalculateDialog.record.id
  const isSubmittingAbsence =
    !!absenceDialog && updateDelayStatusMutation.isPending && activeStatusUpdateId === absenceDialog.record.id
  const settingsErrorMessage =
    settingsQuery.isError && settingsQuery.error instanceof Error ? settingsQuery.error.message : null

  const refreshedAtLabel = attendanceQuery.data?.metadata?.refreshed_at
    ? `${formatDate(attendanceQuery.data.metadata.refreshed_at, { dateStyle: 'medium' })}، ${formatTime(attendanceQuery.data.metadata.refreshed_at)}`
    : null

  const updateFilters = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const updateSettingsForm = <Key extends keyof AttendanceSettingsState>(
    key: Key,
    value: AttendanceSettingsState[Key],
  ) => {
    setSettingsForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: TeacherAttendanceSettingsPayload = {
      start_time: settingsForm.start_time.trim() ? settingsForm.start_time : null,
      end_time: settingsForm.end_time.trim() ? settingsForm.end_time : null,
      grace_minutes: Math.max(0, Math.trunc(settingsForm.grace_minutes)),
      auto_calculate_delay: settingsForm.auto_calculate_delay,
      send_whatsapp_for_delay: settingsForm.send_whatsapp_for_delay,
      include_delay_notice: settingsForm.include_delay_notice,
      allow_e_signature: settingsForm.allow_e_signature,
      remind_check_in: settingsForm.remind_check_in,
      remind_check_out: settingsForm.remind_check_out,
      delay_notification_template_id: settingsForm.delay_notification_template_id ?? null,
    }

    updateSettingsMutation.mutate(payload, {
      onSuccess: () => setIsSettingsModalOpen(false),
    })
  }

  const updateDelayFilters = <Key extends keyof DelayFilterState>(key: Key, value: DelayFilterState[Key]) => {
    setDelayFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key !== 'page') {
        next.page = 1
      }
      return next
    })
  }

  const handleDelayPageChange = (page: number) => {
    setDelayFilters((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, totalDelayPages)),
    }))
  }

  const handleDelayRecalculate = (record: TeacherAttendanceDelayRecord) => {
    setRecalculateDialog({
      record,
      timeValue: extractTimeInputValue(record.check_in_time),
      error: null,
    })
  }

  const handleRecalculateDialogTimeChange = (value: string) => {
    setRecalculateDialog((prev) => (prev ? { ...prev, timeValue: value, error: null } : prev))
  }

  const closeRecalculateDialog = () => {
    if (recalculateDialog && recalcDelayMutation.isPending && activeRecalculateId === recalculateDialog.record.id) return
    setRecalculateDialog(null)
  }

  const handleRecalculateDialogSubmit = () => {
    if (!recalculateDialog) return
    const normalizedTime = recalculateDialog.timeValue.trim()
    if (!normalizedTime) {
      setRecalculateDialog((prev) => (prev ? { ...prev, error: 'يرجى إدخال وقت الحضور' } : prev))
      return
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedTime)) {
      setRecalculateDialog((prev) => (prev ? { ...prev, error: 'استخدم تنسيق HH:MM مثل 07:30' } : prev))
      return
    }

    setRecalculateDialog((prev) => (prev ? { ...prev, error: null } : prev))
    setActiveRecalculateId(recalculateDialog.record.id)
    recalcDelayMutation.mutate(
      { attendanceId: recalculateDialog.record.id, payload: { check_in_time: normalizedTime } },
      {
        onSuccess: () => {
          delayQuery.refetch()
          attendanceQuery.refetch()
          setRecalculateDialog(null)
        },
        onSettled: () => setActiveRecalculateId(null),
      },
    )
  }

  const handleDelayNotify = (record: TeacherAttendanceDelayRecord) => {
    setActiveNotifyId(record.id)
    notifyDelayMutation.mutate(record.id, {
      onSuccess: () => {
        delayQuery.refetch()
        attendanceQuery.refetch()
      },
      onSettled: () => setActiveNotifyId(null),
    })
  }

  const handleInquiryOpen = (record: TeacherAttendanceDelayRecord) => {
    const schoolName = adminSettingsQuery.data?.school_name?.trim() || '—'
    const workStartTime = settingsQuery.data?.start_time ?? null
    const template: TeacherInquiryTemplateKind = record.delay_status === 'absent' ? 'absence' : 'delay'

    if (template === 'absence') {
      const group = findConsecutiveGroupForRecord(record, delays)

      if (group && group.dayCount > 1) {
        const baseRecord = group.records[0]
        const lastRecord = group.records[group.records.length - 1]
        const data = createInquiryTemplateData(baseRecord, {
          schoolName,
          workStartTime,
          issueDate: new Date(),
          absenceDurationText: formatAbsenceDayCount(group.dayCount),
        })
        data.attendanceEndDayName = formatDayNameForTemplate(lastRecord.attendance_date)
        data.attendanceEndDateHijri = formatHijriDateForTemplate(lastRecord.attendance_date)
        data.attendanceEndDateGregorian = formatGregorianDateForTemplate(lastRecord.attendance_date)
        data.isDateRange = true
        setInquiryDialog({ record: baseRecord, data, template })
      } else {
        const data = createInquiryTemplateData(record, {
          schoolName,
          workStartTime,
          issueDate: new Date(),
          absenceDurationText: 'يوم واحد',
        })
        setInquiryDialog({ record, data, template })
      }
    } else {
      const data = createInquiryTemplateData(record, {
        schoolName,
        workStartTime,
        issueDate: new Date(),
      })
      setInquiryDialog({ record, data, template })
    }
  }

  const handleInquiryClose = () => setInquiryDialog(null)

  const handleInquiryPrint = () => {
    if (!inquiryDialog) return
    if (typeof window === 'undefined') return
    const html = renderInquiryDocument(inquiryDialog.template, inquiryDialog.data)
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleInquiryDownload = () => {
    if (!inquiryDialog) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const html = renderInquiryDocument(inquiryDialog.template, inquiryDialog.data)
    const meta = getInquiryTemplateMetadata(inquiryDialog.template)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${meta.downloadPrefix}-${inquiryDialog.record.id}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handleBulkInquiryOpen = () => {
    const schoolName = adminSettingsQuery.data?.school_name?.trim() || '—'
    const workStartTime = settingsQuery.data?.start_time ?? null
    const issueDate = new Date()
    const delayedRecords = delays.filter((record) => record.delay_status === 'delayed')
    const entries = delayedRecords.map((record) => ({
      record,
      data: createInquiryTemplateData(record, {
        schoolName,
        workStartTime,
        issueDate,
      }),
    }))
    setBulkInquiryDialog({ template: 'delay', entries })
  }

  const handleBulkInquiryClose = () => setBulkInquiryDialog(null)

  const handleBulkInquiryPrint = () => {
    if (!bulkInquiryDialog || !bulkInquiryDialog.entries.length) return
    if (typeof window === 'undefined') return
    const html = bulkInquiryDocumentHtml
    if (!html) return
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleBulkInquiryDownload = () => {
    if (!bulkInquiryDialog || !bulkInquiryDialog.entries.length) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const html = bulkInquiryDocumentHtml
    if (!html) return
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const meta = getInquiryTemplateMetadata(bulkInquiryDialog.template)
    anchor.download = `${meta.downloadPrefix}-bulk-${Date.now()}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const mutateDelayStatus = (
    record: TeacherAttendanceDelayRecord,
    payload: TeacherAttendanceDelayStatusUpdatePayload,
    options: { onSuccess?: () => void } = {},
  ) => {
    setActiveStatusUpdateId(record.id)
    updateDelayStatusMutation.mutate(
      { attendanceId: record.id, payload },
      {
        onSuccess: () => {
          delayQuery.refetch()
          attendanceQuery.refetch()
          options.onSuccess?.()
        },
        onSettled: () => setActiveStatusUpdateId(null),
      },
    )
  }

  const openAbsenceDialog = (record: TeacherAttendanceDelayRecord) => {
    const fallbackReason: TeacherAbsenceReason =
      record.absence_reason && absenceReasonLabels[record.absence_reason as TeacherAbsenceReason]
        ? (record.absence_reason as TeacherAbsenceReason)
        : 'unjustified'

    setAbsenceDialog({
      record,
      reason: fallbackReason,
      notes: record.absence_notes ?? '',
      error: null,
    })
  }

  const handleDelayStatusChange = (record: TeacherAttendanceDelayRecord, status: TeacherDelayStatus) => {
    if (status === 'excused') {
      const currentNote = record.delay_notes?.trim() ?? ''
      const reason: 'technical_issue' | 'other' = currentNote
        ? currentNote === 'مشاكل تقنية'
          ? 'technical_issue'
          : 'other'
        : 'technical_issue'
      setExcuseDialog({
        record,
        reason,
        notes: reason === 'other' ? currentNote : '',
        error: null,
      })
      return
    }

    if (status === 'absent') {
      openAbsenceDialog(record)
      return
    }

    if (status === record.delay_status) return

    const payload: TeacherAttendanceDelayStatusUpdatePayload = {
      status,
      notes: null,
    }

    if (status === 'on_time') {
      payload.attendance_status = 'present'
      payload.clear_notification = true
    } else if (status === 'delayed') {
      payload.attendance_status = record.status === 'departed' ? 'departed' : 'present'
    }

    mutateDelayStatus(record, payload)
  }

  const handleExcuseReasonChange = (reason: 'technical_issue' | 'other') => {
    setExcuseDialog((prev) => (prev ? { ...prev, reason, error: null } : prev))
  }

  const handleExcuseNotesChange = (value: string) => {
    setExcuseDialog((prev) => (prev ? { ...prev, notes: value, error: null } : prev))
  }

  const closeExcuseDialog = () => {
    if (excuseDialog && updateDelayStatusMutation.isPending && activeStatusUpdateId === excuseDialog.record.id) return
    setExcuseDialog(null)
  }

  const handleExcuseSubmit = () => {
    if (!excuseDialog) return
    const { record, reason } = excuseDialog
    const trimmedNotes = excuseDialog.notes.trim()
    const notes = reason === 'technical_issue' ? 'مشاكل تقنية' : trimmedNotes

    if (reason === 'other' && trimmedNotes.length < 3) {
      setExcuseDialog((prev) => (prev ? { ...prev, error: 'يرجى كتابة سبب العذر بشكل أوضح' } : prev))
      return
    }

    setExcuseDialog((prev) => (prev ? { ...prev, error: null } : prev))
    mutateDelayStatus(
      record,
      { status: 'excused', notes: notes || null },
      {
        onSuccess: () => setExcuseDialog(null),
      },
    )
  }

  const handleAbsenceReasonChange = (reason: TeacherAbsenceReason) => {
    setAbsenceDialog((prev) => (prev ? { ...prev, reason, error: null } : prev))
  }

  const handleAbsenceNotesChange = (value: string) => {
    setAbsenceDialog((prev) => (prev ? { ...prev, notes: value, error: null } : prev))
  }

  const closeAbsenceDialog = () => {
    if (absenceDialog && updateDelayStatusMutation.isPending && activeStatusUpdateId === absenceDialog.record.id) return
    setAbsenceDialog(null)
  }

  const handleAbsenceSubmit = () => {
    if (!absenceDialog) return
    const trimmedNotes = absenceDialog.notes.trim()

    setAbsenceDialog((prev) => (prev ? { ...prev, error: null } : prev))

    mutateDelayStatus(
      absenceDialog.record,
      {
        status: 'absent',
        absence_reason: absenceDialog.reason,
        absence_notes: trimmedNotes || null,
      },
      {
        onSuccess: () => setAbsenceDialog(null),
      },
    )
  }

  return (
    <WsPage>
      <WsHeader
        title="حضور المعلمين"
        badge={
          <>
            <span className="ws-pulse" />
            حضوري — مباشر
          </>
        }
        actions={
          <>
            <WsBtn variant="primary" icon={Users} onClick={() => setIsStandbyModalOpen(true)}>
              توزيع الانتظار
            </WsBtn>
            <WsBtn icon={Settings} onClick={() => setIsSettingsModalOpen(true)}>
              الإعدادات
            </WsBtn>
            <WsBtn icon={RefreshCw} onClick={() => attendanceQuery.refetch()} disabled={attendanceQuery.isFetching}>
              {attendanceQuery.isFetching ? 'جارٍ التحديث...' : 'تحديث'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ListChecks} label="إجمالي السجلات:">
              {stats ? stats.total.toLocaleString('ar-SA-u-nu-latn') : '—'}
            </WsFact>
            <WsFact icon={Link2} label="مرتبطة:">
              {stats ? stats.matched.toLocaleString('ar-SA-u-nu-latn') : '—'}
            </WsFact>
            <WsFact icon={XCircle} label="بحاجة للربط:">
              {stats ? stats.unmatched.toLocaleString('ar-SA-u-nu-latn') : '—'}
            </WsFact>
            <WsFact icon={UserCheck} label="حالات الحضور:">
              {stats ? stats.present.toLocaleString('ar-SA-u-nu-latn') : '—'}
            </WsFact>
            <WsFact icon={Clock3} label="آخر تحديث:">
              {refreshedAtLabel ?? '—'}
            </WsFact>
          </>
        }
      >
        <WsChip icon={RefreshCw}>تحديث تلقائي كل 60 ثانية</WsChip>
      </WsHeader>

      {attendanceQuery.isError && (
        <WsAlert>
          تعذر تحميل سجلات الحضور.
          <WsBtn size="sm" icon={RefreshCw} onClick={() => attendanceQuery.refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}

      <WsToolbar>
        {/* التبديل بين قسمي الصفحة */}
        <div className="ws-seg" style={{ alignSelf: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setActiveSection('delays')}
            className={`ws-seg__btn ${activeSection === 'delays' ? 'is-active' : ''}`}
          >
            حالات التأخر والغياب
            {delayMeta?.total ? <span className="ws-count">{delayMeta.total.toLocaleString('ar-SA-u-nu-latn')}</span> : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('records')}
            className={`ws-seg__btn ${activeSection === 'records' ? 'is-active' : ''}`}
          >
            سجلات حضوري التفصيلية
            <span className="ws-count">{records.length.toLocaleString('ar-SA-u-nu-latn')}</span>
          </button>
        </div>

        {activeSection === 'delays' ? (
          <>
            <WsField label="الحالة" htmlFor="ws-ta-delay-status">
              <WsSelect
                id="ws-ta-delay-status"
                value={delayFilters.status}
                onChange={(event) => updateDelayFilters('status', event.target.value as DelayFilterState['status'])}
              >
                {delayStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="سبب الغياب" htmlFor="ws-ta-absence-reason">
              <WsSelect
                id="ws-ta-absence-reason"
                value={delayFilters.absence_reason}
                onChange={(event) =>
                  updateDelayFilters('absence_reason', event.target.value as DelayFilterState['absence_reason'])
                }
              >
                {absenceReasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="من تاريخ" htmlFor="ws-ta-start">
              <WsInput
                id="ws-ta-start"
                type="date"
                value={delayFilters.start_date}
                onChange={(event) => updateDelayFilters('start_date', event.target.value)}
              />
            </WsField>
            <WsField label="إلى تاريخ" htmlFor="ws-ta-end">
              <WsInput
                id="ws-ta-end"
                type="date"
                value={delayFilters.end_date}
                onChange={(event) => updateDelayFilters('end_date', event.target.value)}
              />
            </WsField>
            <WsField label="بحث بالاسم أو الهوية" htmlFor="ws-ta-delay-search" grow>
              <WsInput
                id="ws-ta-delay-search"
                type="search"
                value={delayFilters.search}
                onChange={(event) => updateDelayFilters('search', event.target.value)}
                placeholder="مثال: أحمد / 1010"
              />
            </WsField>
            <WsField label="الترتيب" htmlFor="ws-ta-order">
              <WsSelect
                id="ws-ta-order"
                value={delayFilters.order}
                onChange={(event) => updateDelayFilters('order', event.target.value as DelayFilterState['order'])}
              >
                <option value="desc">الأحدث أولًا</option>
                <option value="asc">الأقدم أولًا</option>
              </WsSelect>
            </WsField>
          </>
        ) : (
          <>
            <WsField label="تاريخ المتابعة" htmlFor="ws-ta-date">
              <WsInput
                id="ws-ta-date"
                type="date"
                value={filters.date}
                onChange={(event) => updateFilters('date', event.target.value)}
              />
            </WsField>
            <WsField label="حالة السجل" htmlFor="ws-ta-status">
              <WsSelect
                id="ws-ta-status"
                value={filters.status}
                onChange={(event) => updateFilters('status', event.target.value as FilterState['status'])}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="المطابقة" htmlFor="ws-ta-match">
              <WsSelect
                id="ws-ta-match"
                value={filters.matched}
                onChange={(event) => updateFilters('matched', event.target.value as FilterState['matched'])}
              >
                {matchedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="طريقة التسجيل" htmlFor="ws-ta-login">
              <WsSelect
                id="ws-ta-login"
                value={filters.login_method}
                onChange={(event) => updateFilters('login_method', event.target.value as FilterState['login_method'])}
              >
                {loginMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="بحث بالاسم أو الهوية" htmlFor="ws-ta-search" grow>
              <WsInput
                id="ws-ta-search"
                type="search"
                value={filters.search}
                onChange={(event) => updateFilters('search', event.target.value)}
                placeholder="مثال: أحمد / 1010"
              />
            </WsField>
          </>
        )}
      </WsToolbar>

      <WsLayout>
        {/* العمود الأيمن: السجلات غير المرتبطة */}
        <WsSideCol
          title="بحاجة للربط"
          icon={Link2}
          side="start"
          width={280}
          storageKey="ws:teacher-attendance:unmatched"
        >
          <WsBlock padded style={{ background: 'var(--ws-red-bg)' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-red)', fontWeight: 600 }}>
              سجلات من جهاز البصمة لم تُربط بمعلم في النظام — اربطها بالهوية أو الرقم الوظيفي لضمان ظهورها في لوحة
              الأداء.
            </p>
          </WsBlock>
          <WsBlock
            title="سجلات غير مرتبطة"
            count={unmatchedRecords.length.toLocaleString('ar-SA-u-nu-latn')}
            fill
            scroll
          >
            {unmatchedRecords.length === 0 ? (
              <WsEmpty icon={CheckCircle2}>جميع السجلات مرتبطة بمعلمين.</WsEmpty>
            ) : (
              <div>
                {unmatchedRecords.map((record) => (
                  <div
                    key={`unmatched-${record.id}`}
                    style={{
                      padding: '7px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{record.employee_name}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      الهوية: {record.national_id}
                      {record.job_number ? ` • وظيفي: ${record.job_number}` : ''}
                    </span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      آخر ظهور: {formatTime(record.transaction_time)} — {formatDate(record.attendance_date)}
                    </span>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ws-red)', marginTop: 2 }}>
                      {record.login_method_label} • {record.status_label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        <WsMain>
          {activeSection === 'delays' ? (
            <WsBlock
              title="حالات التأخر والغياب"
              icon={Clock3}
              count={delayMeta?.total?.toLocaleString('ar-SA-u-nu-latn') ?? '0'}
              tools={
                <>
                  <WsBtn
                    size="sm"
                    icon={Printer}
                    onClick={handleBulkInquiryOpen}
                    disabled={delayAnalytics.delayedCount === 0}
                  >
                    طباعة المسائلة
                  </WsBtn>
                  <WsIconBtn
                    icon={RefreshCw}
                    label="تحديث البيانات"
                    onClick={() => delayQuery.refetch()}
                    disabled={delayQuery.isFetching}
                  />
                </>
              }
              fill
            >
              {/* شريط التحليلات الفورية */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 5,
                  padding: '6px 14px',
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <WsChip tone="red" icon={Clock3}>
                  متأخرون {delayAnalytics.delayedCount.toLocaleString('ar-SA-u-nu-latn')}
                </WsChip>
                <WsChip tone="green" icon={CheckCircle2}>
                  بعذر {delayAnalytics.excusedCount.toLocaleString('ar-SA-u-nu-latn')}
                </WsChip>
                <WsChip icon={CalendarX}>غياب {delayAnalytics.absenceCount.toLocaleString('ar-SA-u-nu-latn')}</WsChip>
                <WsChip tone="sky" icon={Timer}>
                  متوسط التأخر{' '}
                  {delayAnalytics.averageDelay !== null
                    ? `${delayAnalytics.averageDelay.toLocaleString('ar-SA-u-nu-latn')} دقيقة`
                    : '—'}
                </WsChip>
              </div>

              {delayQuery.isError && <WsAlert>تعذر تحميل حالات التأخر. حاول مرة أخرى.</WsAlert>}

              {delayQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل حالات التأخر...</WsEmpty>
              ) : delays.length === 0 ? (
                <WsEmpty icon={Inbox}>لا توجد حالات تأخر مطابقة للمعايير الحالية.</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>المعلم</th>
                      <th>وقت الحضور</th>
                      <th>بيانات التأخر</th>
                      <th>حالة الحضور</th>
                      <th>الإشعارات</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDelays.map((delay) => {
                      const isRecalculating = recalcDelayMutation.isPending && activeRecalculateId === delay.id
                      const isNotifying = notifyDelayMutation.isPending && activeNotifyId === delay.id
                      const isUpdatingStatus = updateDelayStatusMutation.isPending && activeStatusUpdateId === delay.id
                      const isAbsent = delay.delay_status === 'absent'
                      const actionStatus: 'delayed' | 'excused' = delay.delay_status === 'excused' ? 'excused' : 'delayed'
                      const absenceReasonLabel = delay.absence_reason_label?.trim()
                        || (delay.absence_reason
                          ? absenceReasonLabels[delay.absence_reason as TeacherAbsenceReason]
                          : null)
                      const absenceActionLabel = absenceReasonLabel ?? absenceReasonLabels.unjustified
                      const hasCustomAbsenceReason = Boolean(absenceReasonLabel)

                      return (
                        <tr
                          key={delay.id}
                          style={
                            isAbsent
                              ? { background: 'var(--ws-red-bg)' }
                              : delay.delay_status === 'delayed'
                                ? { background: 'var(--ws-amber-bg)' }
                                : undefined
                          }
                        >
                          <td>
                            <span style={{ fontWeight: 600 }} title={`الهوية: ${delay.national_id ?? '—'}`}>
                              {delay.teacher_name ?? '—'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatTime(delay.check_in_time)}</td>
                          <td>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                              {delay.delay_status !== 'delayed' && !isAbsent ? (
                                <DelayStatusChip status={delay.delay_status} label={delay.delay_status_label} />
                              ) : null}
                              {isAbsent ? (
                                <>
                                  {delay.faris_sync_status === 'matched' ? (
                                    <WsChip tone="green" icon={CheckCircle2}>
                                      {delay.faris_leave_type || 'مطابق فارس'}
                                    </WsChip>
                                  ) : delay.faris_sync_status === 'pending_leave' ? (
                                    <WsChip tone="amber" icon={Clock3}>
                                      طلب معلق في فارس
                                    </WsChip>
                                  ) : delay.faris_sync_status === 'no_leave' ? (
                                    <WsChip tone="red" icon={XCircle}>
                                      لا يوجد إجازة في فارس
                                    </WsChip>
                                  ) : (
                                    <WsChip tone={hasCustomAbsenceReason ? 'green' : 'red'}>
                                      سبب الغياب: {absenceActionLabel}
                                    </WsChip>
                                  )}
                                  {delay.absence_notes ? (
                                    <span className="ws-cell-sub">ملاحظات: {delay.absence_notes}</span>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  {typeof delay.delay_minutes === 'number' ? (
                                    <WsChip tone="red" icon={Timer}>
                                      {delay.delay_minutes.toLocaleString('ar-SA-u-nu-latn')} دقيقة تأخير
                                    </WsChip>
                                  ) : null}
                                  {delay.delay_notes ? (
                                    <span className="ws-cell-sub">ملاحظة: {delay.delay_notes}</span>
                                  ) : null}
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            <span
                              title={`نوع العملية: ${delay.transaction_type === 'check_out' ? 'انصراف' : 'تسجيل حضور'}`}
                            >
                              {delay.status_label ?? (delay.status ? fallbackAttendanceStatusLabels[delay.status] : 'غير محدد')}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'block', fontSize: 11.5 }}>
                              {delay.delay_notified_at ? formatDate(delay.delay_notified_at) : 'لم يتم الإشعار بعد'}
                            </span>
                            {delay.delay_inquiry ? (
                              <span className="ws-cell-sub">
                                مسائلة: {delay.delay_inquiry.status}
                                {delay.delay_inquiry.responded_at
                                  ? ` • تم الرد ${formatDate(delay.delay_inquiry.responded_at)}`
                                  : ''}
                              </span>
                            ) : null}
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {/* حالة الحضور/الغياب كشرائح مدمجة */}
                              {isAbsent ? (
                                <span className="ws-seg">
                                  <button type="button" className="ws-seg__btn is-active" disabled>
                                    غائب
                                  </button>
                                  <button
                                    type="button"
                                    className="ws-seg__btn"
                                    onClick={() => openAbsenceDialog(delay)}
                                    disabled={isUpdatingStatus}
                                    title={absenceActionLabel}
                                  >
                                    {hasCustomAbsenceReason ? absenceActionLabel : '+ السبب'}
                                  </button>
                                </span>
                              ) : (
                                <span className="ws-seg">
                                  <button
                                    type="button"
                                    className={`ws-seg__btn ${actionStatus === 'delayed' ? 'is-active' : ''}`}
                                    onClick={() => handleDelayStatusChange(delay, 'delayed')}
                                    disabled={isUpdatingStatus}
                                  >
                                    متأخر
                                  </button>
                                  <button
                                    type="button"
                                    className={`ws-seg__btn ${actionStatus === 'excused' ? 'is-active' : ''}`}
                                    onClick={() => handleDelayStatusChange(delay, 'excused')}
                                    disabled={isUpdatingStatus}
                                  >
                                    بعذر
                                  </button>
                                </span>
                              )}

                              {!isAbsent && (
                                <WsIconBtn
                                  icon={Calculator}
                                  label="إعادة الاحتساب"
                                  onClick={() => handleDelayRecalculate(delay)}
                                  disabled={isRecalculating}
                                />
                              )}
                              {isNotifying ? (
                                <WsSpinner style={{ width: 14, height: 14 }} />
                              ) : (
                                <WsIconBtn
                                  icon={Send}
                                  label="إرسال إشعار"
                                  onClick={() => handleDelayNotify(delay)}
                                  disabled={isNotifying}
                                />
                              )}
                              <WsIconBtn icon={FileQuestion} label="طلب مسائلة" onClick={() => handleInquiryOpen(delay)} />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              )}

              {/* ترقيم الصفحات */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderTop: '1px solid var(--ws-hairline)',
                }}
              >
                <WsBtn size="sm" onClick={() => handleDelayPageChange(delayFilters.page - 1)} disabled={delayFilters.page <= 1}>
                  السابق
                </WsBtn>
                <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                  صفحة {delayFilters.page.toLocaleString('ar-SA-u-nu-latn')} من {totalDelayPages.toLocaleString('ar-SA-u-nu-latn')}
                </span>
                <WsBtn
                  size="sm"
                  onClick={() => handleDelayPageChange(delayFilters.page + 1)}
                  disabled={delayFilters.page >= totalDelayPages}
                >
                  التالي
                </WsBtn>
              </div>
            </WsBlock>
          ) : (
            <WsBlock
              title="سجلات حضوري التفصيلية"
              icon={Fingerprint}
              count={records.length.toLocaleString('ar-SA-u-nu-latn')}
              fill
            >
              {attendanceQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل بيانات الحضور...</WsEmpty>
              ) : records.length === 0 ? (
                <WsEmpty icon={Inbox}>لا توجد سجلات للمعايير الحالية.</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>المعلم</th>
                      <th>حالة السجل</th>
                      <th>وقت العملية</th>
                      <th>الدخول / الانصراف</th>
                      <th>التأخير</th>
                      <th>البوابة والمصدر</th>
                      <th>المطابقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{record.employee_name}</span>
                          <span className="ws-cell-sub">
                            الهوية: {record.national_id}
                            {record.job_number ? ` • وظيفي: ${record.job_number}` : ''}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                            <StatusChip record={record} />
                            <LoginMethodChip record={record} />
                            <WsChip>{record.transaction_type === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}</WsChip>
                            {record.result ? <span className="ws-cell-sub">النتيجة: {record.result}</span> : null}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'block' }}>{formatTime(record.transaction_time)}</span>
                          <span className="ws-cell-sub">{formatDate(record.attendance_date)}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'block', fontSize: 11.5 }}>
                            حضور: <b>{formatTime(record.check_in_time)}</b>
                          </span>
                          <span style={{ display: 'block', fontSize: 11.5 }}>
                            انصراف: <b>{formatTime(record.check_out_time)}</b>
                          </span>
                        </td>
                        <td>
                          {record.delay_status ? (
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                              <DelayStatusChip status={record.delay_status} label={record.delay_status_label} />
                              {typeof record.delay_minutes === 'number' ? (
                                <span className="ws-cell-sub">دقائق التأخير: {record.delay_minutes.toLocaleString('ar-SA-u-nu-latn')}</span>
                              ) : null}
                              {record.delay_notified_at ? (
                                <span className="ws-cell-sub">
                                  آخر إشعار: {formatTime(record.delay_notified_at)} — {formatDate(record.delay_notified_at)}
                                </span>
                              ) : null}
                              {record.delay_notes ? <span className="ws-cell-sub">ملاحظة: {record.delay_notes}</span> : null}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>لا توجد بيانات تأخير</span>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'block', fontSize: 11.5 }}>البوابة: {record.gate_name ?? '—'}</span>
                          <span style={{ display: 'block', fontSize: 11.5 }}>الموقع: {record.location ?? '—'}</span>
                          <span style={{ display: 'block', fontSize: 11.5 }}>المصدر: {record.source ?? '—'}</span>
                        </td>
                        <td>
                          <MatchChip record={record} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </WsTable>
              )}
            </WsBlock>
          )}
        </WsMain>
      </WsLayout>

      {/* مودال اعتماد سبب الغياب */}
      {absenceDialog && (
        <WsModal
          open
          onClose={closeAbsenceDialog}
          title="اعتماد سبب الغياب"
          sub="اختر سبب الغياب وأضف ملاحظات إن لزم، سيُحفظ السبب مع السجل ويُعامل الغياب بعذر عند اعتماده."
          footer={
            <>
              <WsBtn onClick={closeAbsenceDialog} disabled={isSubmittingAbsence}>
                إلغاء
              </WsBtn>
              <WsBtn variant="primary" icon={CalendarX} onClick={handleAbsenceSubmit} disabled={isSubmittingAbsence}>
                {isSubmittingAbsence ? 'جارٍ الحفظ...' : 'تسجيل الغياب'}
              </WsBtn>
            </>
          }
        >
          <WsFactsList
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: '8px 10px',
              background: 'var(--ws-surface-2)',
            }}
          >
            <WsFactRow label="المعلم">{absenceDialog.record.teacher_name ?? '—'}</WsFactRow>
            <WsFactRow label="التاريخ">{formatDate(absenceDialog.record.attendance_date)}</WsFactRow>
            <WsFactRow label="أقرب حالة مسجلة">
              {delayStatusLabels[absenceDialog.record.delay_status as TeacherDelayStatus] ?? 'غير محدد'}
            </WsFactRow>
          </WsFactsList>

          <WsField label="سبب الغياب">
            <WsSelect
              value={absenceDialog.reason}
              onChange={(event) => handleAbsenceReasonChange(event.target.value as TeacherAbsenceReason)}
              disabled={isSubmittingAbsence}
            >
              {Object.entries(absenceReasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </WsSelect>
          </WsField>

          <WsField label="ملاحظات إضافية (اختياري)">
            <WsTextarea
              rows={3}
              value={absenceDialog.notes}
              onChange={(event) => handleAbsenceNotesChange(event.target.value)}
              placeholder="أدخل تفاصيل داعمة مثل رقم المعاملة أو الجهة المعنية"
              disabled={isSubmittingAbsence}
            />
          </WsField>

          {absenceDialog.error && <WsAlert boxed>{absenceDialog.error}</WsAlert>}
        </WsModal>
      )}

      {/* مودال تسجيل عذر التأخر */}
      {excuseDialog && (
        <WsModal
          open
          onClose={closeExcuseDialog}
          title="تسجيل عذر للتأخر"
          sub="اختر سبب العذر أو اكتبه، يتم حفظه مع السجل وإعادة ضبط دقائق التأخير لهذا اليوم."
          footer={
            <>
              <WsBtn onClick={closeExcuseDialog} disabled={isSubmittingExcuse}>
                إلغاء
              </WsBtn>
              <WsBtn variant="primary" icon={CheckCircle2} onClick={handleExcuseSubmit} disabled={isSubmittingExcuse}>
                {isSubmittingExcuse ? 'جارٍ الحفظ...' : 'حفظ العذر'}
              </WsBtn>
            </>
          }
        >
          <WsFactsList
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: '8px 10px',
              background: 'var(--ws-surface-2)',
            }}
          >
            <WsFactRow label="المعلم">{excuseDialog.record.teacher_name ?? '—'}</WsFactRow>
            <WsFactRow label="التاريخ">{formatDate(excuseDialog.record.attendance_date)}</WsFactRow>
            <WsFactRow label="وقت الحضور">{formatTime(excuseDialog.record.check_in_time)}</WsFactRow>
          </WsFactsList>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="ws-label">سبب العذر</span>
            <label className={`ws-pick ${excuseDialog.reason === 'technical_issue' ? 'is-checked' : ''}`}>
              <span className="ws-pick__name">مشاكل تقنية</span>
              <input
                type="radio"
                name="delay-excuse-reason"
                value="technical_issue"
                checked={excuseDialog.reason === 'technical_issue'}
                onChange={() => handleExcuseReasonChange('technical_issue')}
              />
            </label>
            <label className={`ws-pick ${excuseDialog.reason === 'other' ? 'is-checked' : ''}`}>
              <span className="ws-pick__name">أسباب أخرى</span>
              <input
                type="radio"
                name="delay-excuse-reason"
                value="other"
                checked={excuseDialog.reason === 'other'}
                onChange={() => handleExcuseReasonChange('other')}
              />
            </label>
            <WsTextarea
              rows={3}
              value={excuseDialog.notes}
              onChange={(event) => handleExcuseNotesChange(event.target.value)}
              placeholder="اكتب سبب العذر هنا"
              disabled={excuseDialog.reason !== 'other'}
            />
          </div>

          {excuseDialog.error && <WsAlert boxed>{excuseDialog.error}</WsAlert>}
        </WsModal>
      )}

      {/* مودال نموذج المسائلة */}
      {inquiryDialog && (
        <WsModal
          open
          onClose={handleInquiryClose}
          title={
            inquiryTemplateMetadata
              ? `${inquiryTemplateMetadata.heading} — ${inquiryDialog.data.teacherName}`
              : `نموذج مسائلة — ${inquiryDialog.data.teacherName}`
          }
          sub={
            inquiryTemplateMetadata?.description ??
            'راجع البيانات ثم استخدم خيارات الطباعة أو التنزيل لإصدار النموذج الرسمي.'
          }
          maxWidth={860}
          footer={
            <>
              <WsBtn icon={Download} onClick={handleInquiryDownload}>
                تنزيل النموذج
              </WsBtn>
              <WsBtn variant="primary" icon={Printer} onClick={handleInquiryPrint}>
                طباعة النموذج
              </WsBtn>
            </>
          }
        >
          <iframe
            title={`${inquiryTemplateMetadata?.heading ?? 'نموذج مسائلة'} — ${inquiryDialog.data.teacherName}`}
            srcDoc={inquiryDocumentHtml ?? ''}
            style={{
              height: '62vh',
              width: '100%',
              minWidth: 480,
              borderRadius: 8,
              border: '1px solid var(--ws-hairline)',
              background: '#fff',
            }}
          />
        </WsModal>
      )}

      {/* مودال نماذج المسائلة الجماعية */}
      {bulkInquiryDialog && (
        <WsModal
          open
          onClose={handleBulkInquiryClose}
          title={bulkInquiryTemplateMetadata?.bulkHeading ?? 'نماذج المسائلة الحالية'}
          sub={
            bulkInquiryTemplateMetadata?.bulkDescription ??
            'تم تضمين جميع السجلات الحالية ضمن مستند واحد للطباعة أو التنزيل.'
          }
          maxWidth={920}
          footer={
            bulkInquiryDialog.entries.length > 0 ? (
              <>
                <WsBtn icon={Download} onClick={handleBulkInquiryDownload}>
                  تنزيل الكل
                </WsBtn>
                <WsBtn variant="primary" icon={Printer} onClick={handleBulkInquiryPrint}>
                  طباعة الكل
                </WsBtn>
              </>
            ) : (
              <WsBtn onClick={handleBulkInquiryClose}>إغلاق</WsBtn>
            )
          }
        >
          {bulkInquiryDialog.entries.length === 0 ? (
            <WsAlert tone="info" boxed>
              لا توجد سجلات متأخرة حالياً لتوليد مسائلات مطبوعة.
            </WsAlert>
          ) : (
            <iframe
              title={bulkInquiryTemplateMetadata?.bulkHeading ?? 'مجموعة نماذج المسائلة'}
              srcDoc={bulkInquiryDocumentHtml ?? ''}
              style={{
                height: '62vh',
                width: '100%',
                minWidth: 480,
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: '#fff',
              }}
            />
          )}
        </WsModal>
      )}

      {/* مودال إدخال وقت حضور يدوي */}
      {recalculateDialog && (
        <WsModal
          open
          onClose={closeRecalculateDialog}
          title="إدخال وقت حضور يدوي"
          sub="أدخل التوقيت الفعلي لوصول المعلم، وسيعاد احتساب دقائق التأخر مباشرة."
          footer={
            <>
              <WsBtn onClick={closeRecalculateDialog} disabled={isSubmittingRecalculate}>
                إلغاء
              </WsBtn>
              <WsBtn
                variant="primary"
                icon={Calculator}
                onClick={handleRecalculateDialogSubmit}
                disabled={isSubmittingRecalculate}
              >
                {isSubmittingRecalculate ? 'جارٍ إعادة الاحتساب...' : 'حفظ وإعادة الاحتساب'}
              </WsBtn>
            </>
          }
        >
          <WsFactsList
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: '8px 10px',
              background: 'var(--ws-surface-2)',
            }}
          >
            <WsFactRow label="المعلم">{recalculateDialog.record.teacher_name ?? '—'}</WsFactRow>
            <WsFactRow label="التاريخ">{formatDate(recalculateDialog.record.attendance_date)}</WsFactRow>
            <WsFactRow label="التوقيت المسجل">{formatTime(recalculateDialog.record.check_in_time)}</WsFactRow>
          </WsFactsList>

          <WsField label="وقت الحضور اليدوي">
            <WsInput
              type="time"
              step={60}
              value={recalculateDialog.timeValue}
              onChange={(event) => handleRecalculateDialogTimeChange(event.target.value)}
              required
            />
          </WsField>

          {recalculateDialog.error && <WsAlert boxed>{recalculateDialog.error}</WsAlert>}

          <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>
            يتم حفظ الوقت في السجل وإعادة تقييم التأخير وإشعاراته بناءً على التوقيت المدخل.
          </p>
        </WsModal>
      )}

      {/* مودال إعدادات حضور المعلمين */}
      <WsModal
        open={isSettingsModalOpen}
        onClose={() => !isSavingSettings && setIsSettingsModalOpen(false)}
        title="إعدادات حضور المعلمين"
        sub="اضبط فترة الدوام وآلية حساب التأخير ورسائل التنبيه الخاصة بالمعلمين."
        maxWidth={560}
        footer={
          <>
            <WsBtn onClick={() => setIsSettingsModalOpen(false)} disabled={isSavingSettings}>
              إلغاء
            </WsBtn>
            <WsBtn
              variant="primary"
              icon={Settings}
              type="submit"
              form="ws-teacher-attendance-settings-form"
              disabled={isSavingSettings || isSettingsLoading}
            >
              {isSavingSettings ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
            </WsBtn>
          </>
        }
      >
        <form
          id="ws-teacher-attendance-settings-form"
          onSubmit={handleSaveSettings}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {settingsErrorMessage && <WsAlert boxed>{settingsErrorMessage}</WsAlert>}
          {isSettingsLoading && (
            <WsAlert tone="info" icon={null} boxed>
              <WsSpinner style={{ width: 13, height: 13 }} />
              جارٍ تحميل الإعدادات الحالية...
            </WsAlert>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WsField label="وقت بداية الدوام">
              <WsInput
                type="time"
                value={settingsForm.start_time}
                onChange={(event) => updateSettingsForm('start_time', event.target.value)}
                disabled={isSettingsLoading || isSavingSettings}
              />
            </WsField>
            <WsField label="وقت نهاية الدوام">
              <WsInput
                type="time"
                value={settingsForm.end_time}
                onChange={(event) => updateSettingsForm('end_time', event.target.value)}
                disabled={isSettingsLoading || isSavingSettings}
              />
            </WsField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WsField label="دقائق السماح قبل التأخير">
              <WsInput
                type="number"
                min={0}
                max={180}
                value={settingsForm.grace_minutes}
                onChange={(event) => updateSettingsForm('grace_minutes', Math.max(0, Number(event.target.value) || 0))}
                disabled={isSettingsLoading || isSavingSettings}
              />
              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>الحد الموصى به بين 5 و 20 دقيقة.</span>
            </WsField>
            <WsField label="قالب رسالة واتساب للتأخير">
              <WsSelect
                value={settingsForm.delay_notification_template_id ?? ''}
                onChange={(event) =>
                  updateSettingsForm(
                    'delay_notification_template_id',
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                disabled={isSettingsLoading || isSavingSettings || availableTemplates.length === 0}
              >
                <option value="">بدون رسالة محددة</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </WsSelect>
              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                {availableTemplates.length === 0
                  ? 'لا توجد قوالب نشطة مرتبطة بهذه المدرسة.'
                  : 'يُرسل هذا القالب تلقائيًا عند اكتشاف حالة تأخير.'}
              </span>
            </WsField>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SettingsSwitchRow
              label="حساب التأخير تلقائيًا بناءً على وقت الحضور"
              checked={settingsForm.auto_calculate_delay}
              onChange={(checked) => updateSettingsForm('auto_calculate_delay', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
            <SettingsSwitchRow
              label="إرسال رسالة واتساب تلقائيًا عند التأخر"
              checked={settingsForm.send_whatsapp_for_delay}
              onChange={(checked) => updateSettingsForm('send_whatsapp_for_delay', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
            <SettingsSwitchRow
              label="إرفاق مسائلة التأخر ضمن رسالة الواتساب"
              checked={settingsForm.include_delay_notice}
              onChange={(checked) => updateSettingsForm('include_delay_notice', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
            <SettingsSwitchRow
              label="السماح بالتوقيع الإلكتروني على المسائلة"
              checked={settingsForm.allow_e_signature}
              onChange={(checked) => updateSettingsForm('allow_e_signature', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
            <SettingsSwitchRow
              label="إرسال تذكير للمعلم بالتسجيل عند بداية الدوام"
              checked={settingsForm.remind_check_in}
              onChange={(checked) => updateSettingsForm('remind_check_in', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
            <SettingsSwitchRow
              label="إرسال تذكير بالانصراف عند نهاية الدوام"
              checked={settingsForm.remind_check_out}
              onChange={(checked) => updateSettingsForm('remind_check_out', checked)}
              disabled={isSettingsLoading || isSavingSettings}
            />
          </div>
        </form>
      </WsModal>

      {/* نافذة الإحصائيات */}
      <TeacherAttendanceStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      {/* الويدجت العائم */}
      <TeacherAttendanceFloatingWidget
        onStatsClick={() => setIsStatsModalOpen(true)}
        onRefresh={() => attendanceQuery.refetch()}
        onStandbyClick={() => setIsStandbyModalOpen(true)}
        onLeaveRequestClick={() => setIsLeaveRequestModalOpen(true)}
        onCoverageRequestsClick={() => setIsCoverageRequestsModalOpen(true)}
        pendingCoverageCount={pendingCoverageCountQuery.data ?? 0}
        isRefreshing={attendanceQuery.isFetching}
      />

      {/* نافذة توزيع الانتظار */}
      <StandbyDistributionModal
        isOpen={isStandbyModalOpen}
        onClose={() => setIsStandbyModalOpen(false)}
        date={delayFilters.start_date || today}
      />

      {/* نافذة طلب الاستئذان */}
      <LeaveRequestModal
        isOpen={isLeaveRequestModalOpen}
        onClose={() => setIsLeaveRequestModalOpen(false)}
        date={delayFilters.start_date || today}
      />

      {/* نافذة طلبات التأمين */}
      <CoverageRequestsModal
        isOpen={isCoverageRequestsModalOpen}
        onClose={() => setIsCoverageRequestsModalOpen(false)}
      />

      {/* نافذة تحويل الدوام عن بعد */}
      <RemoteDayActivationModal
        isOpen={isRemoteDayModalOpen}
        onClose={() => setIsRemoteDayModalOpen(false)}
        date={delayFilters.start_date || today}
      />
    </WsPage>
  )
}
