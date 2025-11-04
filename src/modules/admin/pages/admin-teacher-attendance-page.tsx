import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
import type {
  TeacherHudoriAttendanceFilters,
  TeacherHudoriAttendanceLoginMethod,
  TeacherHudoriAttendanceRecord,
  TeacherHudoriAttendanceStatus,
  TeacherDelayStatus,
  TeacherAttendanceDelayFilters,
  TeacherAttendanceDelayRecord,
  TeacherAttendanceSettingsPayload,
} from '../types'

const statusOptions: Array<{ value: TeacherHudoriAttendanceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'present', label: 'حضور مؤكد' },
  { value: 'departed', label: 'انصراف مسجل' },
  { value: 'failed', label: 'فشل التعرف' },
  { value: 'unknown', label: 'غير معروف' },
]

const fallbackAttendanceStatusLabels: Record<TeacherHudoriAttendanceStatus, string> = {
  present: 'حاضر',
  departed: 'انصرف',
  failed: 'فشل التحقق',
  unknown: 'غير محدد',
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
}

const delayStatusOptions: Array<{ value: TeacherDelayStatus | 'all'; label: string }> = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'delayed', label: delayStatusLabels.delayed },
  { value: 'on_time', label: delayStatusLabels.on_time },
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
  start_date: string
  end_date: string
  search: string
  page: number
  per_page: number
  order: 'asc' | 'desc'
}

type InquiryTemplateData = {
  schoolName: string
  teacherName: string
  nationalId: string
  attendanceDayName: string
  attendanceDateHijri: string
  attendanceDateGregorian: string
  checkInTime: string
  workStartTime: string
  delayMinutesText: string
  issueDateHijri: string
  issueDateGregorian: string
}

type InquiryDialogState = {
  record: TeacherAttendanceDelayRecord
  data: InquiryTemplateData
}

type BulkInquiryDialogState = {
  entries: Array<{
    record: TeacherAttendanceDelayRecord
    data: InquiryTemplateData
  }>
}

const INQUIRY_TEMPLATE_CSS = `
  @page {
    size: A4;
    margin: 10mm;
  }

  body {
    font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
    direction: rtl;
    text-align: right;
    background: #e2e8f0;
    color: #0f172a;
    margin: 0;
    padding: 0;
  }

  .inquiry-sheet {
    width: 100%;
    max-width: calc(210mm - 20mm);
    min-height: calc(297mm - 20mm);
    margin: 0 auto;
    background: #fff;
    border: 1px solid #cbd5f5;
    padding: 10mm 12mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6mm;
  }

  .inquiry-header {
    border-bottom: 2px solid #0f766e;
    padding-bottom: 4mm;
  }

  .inquiry-header-line {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    color: #0f766e;
    font-size: 11px;
  }

  .inquiry-top-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }

  .inquiry-top-table th,
  .inquiry-top-table td {
    border: 1px solid #cbd5f5;
    padding: 5px 7px;
  }

  .inquiry-top-table th {
    background: #f8fafc;
    font-weight: 700;
    width: 22%;
  }

  .inquiry-top-table td {
    width: 28%;
    font-weight: 600;
  }

  .inquiry-section {
    font-size: 11.5px;
    line-height: 1.7;
  }

  .inquiry-section p {
    margin: 2px 0;
  }

  .inquiry-section .field {
    display: inline-block;
    min-width: 68px;
    border-bottom: 1px dotted #94a3b8;
    padding: 0 3px;
    font-weight: 600;
  }

  .inquiry-section .field.wide {
    min-width: 110px;
  }

  .inquiry-options {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .inquiry-option {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .inquiry-checkbox {
    font-size: 13px;
    font-weight: 700;
    width: 16px;
    text-align: center;
    color: #dc2626;
  }

  .inquiry-checkbox.unchecked {
    color: #64748b;
  }

  .signature-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }

  .signature-block {
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11.5px;
  }

  .signature-line {
    height: 1px;
    background: #94a3b8;
    margin: 3px 0 5px;
  }

  .signature-inline-row {
    display: flex;
    gap: 12px;
    margin-top: 10px;
    font-size: 11.5px;
  }

  .signature-inline-row span {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .signature-inline-row span:last-child {
    flex: 0.9;
  }

  .inline-line {
    flex: 1;
    border-bottom: 1px dotted #94a3b8;
    height: 1px;
  }

  .inline-line.short {
    flex: 0 0 70px;
  }

  .page-break {
    display: block;
    height: 0;
    margin: 0;
    border: 0;
    page-break-after: always;
  }

  .reason-lines {
    margin: 8px 0 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .reason-lines .line {
    height: 1px;
    background: repeating-linear-gradient(90deg, #94a3b8, #94a3b8 10px, transparent 10px, transparent 16px);
  }

  .decision-row {
    display: flex;
    gap: 14px;
    align-items: center;
    margin: 6px 0;
    font-size: 11.5px;
  }

  .note {
    font-size: 10.5px;
    color: #475569;
    margin-top: 4px;
  }

  .inquiry-footer {
    margin-top: auto;
  }

  .inquiry-footer-divider {
    height: 1px;
    background: #cbd5f5;
    margin-bottom: 6px;
  }

  .inquiry-footer-line {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  @media print {
    body {
      background: #fff;
    }
  }
`

  function InquiryFormTemplate({ data }: { data: InquiryTemplateData }) {
    return (
      <div className="inquiry-sheet">
        <div className="inquiry-header">
          <div className="inquiry-header-line">
            <span>نموذج رقم (18)</span>
            <span>اسم النموذج: تنبيه على تأخر / انصراف</span>
            <span>رمز النموذج (و.و.م.ن-02-3)</span>
          </div>
        </div>

        <table className="inquiry-top-table">
          <tbody>
            <tr>
              <th>المدرسة</th>
              <td>{data.schoolName}</td>
              <th>السجل المدني</th>
              <td>{data.nationalId}</td>
            </tr>
            <tr>
              <th>الاسم</th>
              <td>{data.teacherName}</td>
              <th>التخصص</th>
              <td>____________________</td>
            </tr>
            <tr>
              <th>المستوى/المرتبة</th>
              <td>____________________</td>
              <th>الوظيفة</th>
              <td>____________________</td>
            </tr>
            <tr>
              <th>العمل الحالي</th>
              <td>____________________</td>
              <th>رقم الوظيفة</th>
              <td>____________________</td>
            </tr>
          </tbody>
        </table>

        <section className="inquiry-section">
          <p>
            المكرم المعلم : <span className="field wide">{data.teacherName}</span>
          </p>
          <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
          <p>
            إشارة إلى يوم
            <span className="field">{data.attendanceDayName}</span>
            الموافق
            <span className="field">{data.attendanceDateHijri}</span>
            هـ، نأمل توضيح ما يلي:
          </p>

          <ul className="inquiry-options">
            <li className="inquiry-option">
              <span className="inquiry-checkbox">☑</span>
              <span>
                تأخركم من بداية العمل (الساعة
                <span className="field">{data.workStartTime}</span>
                ) وحضوركم الساعة
                <span className="field">{data.checkInTime}</span>
                — بمقدار
                <span className="field">{data.delayMinutesText}</span>
              </span>
            </li>
            <li className="inquiry-option">
              <span className="inquiry-checkbox unchecked">☐</span>
              <span>
                غيابكم أثناء العمل من الساعة
                <span className="field">__________</span>
                إلى الساعة
                <span className="field">__________</span>
              </span>
            </li>
            <li className="inquiry-option">
              <span className="inquiry-checkbox unchecked">☐</span>
              <span>
                انصرافكم مبكرًا قبل نهاية العمل من الساعة
                <span className="field">__________</span>
              </span>
            </li>
          </ul>

          <p>عليه نأمل توضيح أسباب ذلك مع إرفاق ما يثبت عذركم ،،، ولكم تحياتي ..</p>

          <div className="signature-row">
            <div className="signature-block">
              <p>قائد المدرسة :</p>
              <div className="signature-line" />
              <p>
                التاريخ :
                <span className="field">{data.issueDateHijri}</span>
                هـ
              </p>
            </div>
          </div>
        </section>

        <section className="inquiry-section">
          <p>المكرم قائد المدرسة</p>
          <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
          <p>أفيدكم أن أسباب ذلك ما يلي :</p>
          <div className="reason-lines">
            <span className="line" />
            <span className="line" />
            <span className="line" />
            <span className="line" />
          </div>
          <div className="signature-inline-row">
            <span>
              الاسم:
              <span className="inline-line" />
            </span>
            <span>
              التوقيع:
              <span className="inline-line" />
            </span>
            <span>
              التاريخ:
              <span className="inline-line short" />
            </span>
          </div>
        </section>

        <section className="inquiry-section">
          <p>رأي قائد المدرسة :</p>
          <div className="decision-row">
            <span className="inquiry-footer-line">
              <span className="inquiry-checkbox unchecked">☐</span>
              عذر مقبول
            </span>
            <span className="inquiry-footer-line">
              <span className="inquiry-checkbox unchecked">☐</span>
              عذر غير مقبول ويحسم عليه
            </span>
          </div>
          <div className="signature-row">
            <div className="signature-block">
              <p>قائد المدرسة :</p>
              <div className="signature-line" />
              <p>التاريخ : ____________</p>
            </div>
          </div>
        </section>

        <div className="inquiry-footer">
          <div className="inquiry-footer-divider" />
          <p className="note">
            ملاحظة: تُرفق بطاقة المسائلة مع أصل القرار في حالة عدم قبول العذر لحفظها بملفه بالإدارة، وأصلها بملفه في المدرسة.
          </p>
        </div>
      </div>
    )
  }

  function buildInquiryDocumentHtml(data: InquiryTemplateData) {
    const markup = renderToStaticMarkup(<InquiryFormTemplate data={data} />)
    return `<!DOCTYPE html>
  <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>مسائلة تأخر - ${data.teacherName}</title>
      <style>${INQUIRY_TEMPLATE_CSS}</style>
    </head>
    <body>
      ${markup}
    </body>
  </html>`
  }

  function formatHijriDateForTemplate(value?: string | Date | null) {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const locales = ['ar-SA-u-ca-islamic-umalqura', 'ar-SA-u-ca-islamic', 'ar-SA']
    for (const locale of locales) {
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)
      } catch {
        continue
      }
    }
    return date.toLocaleDateString('ar-SA')
  }

  function formatGregorianDateForTemplate(value?: string | Date | null) {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    try {
      return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(date)
    } catch {
      return date.toLocaleDateString('ar-SA')
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
      return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date)
    } catch {
      try {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long' }
        return date.toLocaleDateString('ar-SA', options)
      } catch {
        return '—'
      }
    }
  }

  function createInquiryTemplateData(
    record: TeacherAttendanceDelayRecord,
    options: { schoolName: string; workStartTime?: string | null; issueDate?: Date },
  ): InquiryTemplateData {
    const issueDate = options.issueDate ?? new Date()
    const teacherName = record.teacher_name?.trim() || record.user?.name?.trim() || '—'
    const nationalId = record.national_id?.trim() || '—'
    const attendanceDate = record.attendance_date ?? null

    const delayMinutesText =
      typeof record.delay_minutes === 'number'
        ? `${new Intl.NumberFormat('ar-SA').format(Math.max(record.delay_minutes, 0))} دقيقة`
        : '—'

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
    }
  }

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA', options)
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
    return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date)
  } catch {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  }
}

function getStatusTone(status: TeacherHudoriAttendanceStatus) {
  switch (status) {
    case 'present':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'departed':
      return 'bg-sky-50 text-sky-700 border border-sky-200'
    case 'failed':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

function getLoginTone(method: TeacherHudoriAttendanceLoginMethod) {
  switch (method) {
    case 'face':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    case 'fingerprint':
      return 'bg-violet-50 text-violet-700 border border-violet-200'
    case 'card':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'voice':
      return 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    case 'manual':
      return 'bg-slate-100 text-slate-600 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-500 border border-slate-200'
  }
}

function getDelayTone(status: TeacherDelayStatus) {
  switch (status) {
    case 'delayed':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    case 'excused':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'on_time':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

function StatusBadge({ record }: { record: TeacherHudoriAttendanceRecord }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusTone(record.status)}`}>
      <i className="bi bi-person-check" />
      {record.status_label}
    </span>
  )
}

function LoginMethodBadge({ record }: { record: TeacherHudoriAttendanceRecord }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${getLoginTone(record.login_method)}`}>
      <i className="bi bi-fingerprint" />
      {record.login_method_label}
    </span>
  )
}

function MatchBadge({ record }: { record: TeacherHudoriAttendanceRecord }) {
  if (record.is_matched && record.user) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
        <i className="bi bi-person-badge" />
        {record.user.name}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
      <i className="bi bi-exclamation-octagon" /> لم تُطابق بعد
    </span>
  )
}

function DelayStatusBadge({ status, label }: { status: TeacherDelayStatus; label?: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${getDelayTone(status)}`}>
      <i className="bi bi-clock-history" />
      {label && label.trim() ? label : delayStatusLabels[status]}
    </span>
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

export function AdminTeacherAttendancePage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filters, setFilters] = useState<FilterState>({
    date: today,
    status: 'all',
    matched: 'all',
    login_method: 'all',
    search: '',
  })
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
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
    status: 'delayed',
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

  const delayQueryFilters = useMemo<TeacherAttendanceDelayFilters>(() => {
    const payload: TeacherAttendanceDelayFilters = {
      page: delayFilters.page,
      per_page: delayFilters.per_page,
      order: delayFilters.order,
    }

    if (delayFilters.status !== 'all') payload.status = delayFilters.status
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
  const delayAnalytics = useMemo(() => {
    if (!delays.length) {
      return {
        delayedCount: 0,
        excusedCount: 0,
        averageDelay: null as number | null,
      }
    }

    let delayedCount = 0
    let excusedCount = 0
    let totalDelayedMinutes = 0
    let countedDelayedRecords = 0

    for (const record of delays) {
      if (record.delay_status === 'delayed') {
        delayedCount += 1
      }
      if (record.delay_status === 'excused') {
        excusedCount += 1
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
      averageDelay,
    }
  }, [delays])
  const inquiryDocumentHtml = useMemo(() => {
    if (!inquiryDialog) return null
    return buildInquiryDocumentHtml(inquiryDialog.data)
  }, [inquiryDialog])
  const bulkInquiryDocumentHtml = useMemo(() => {
    if (!bulkInquiryDialog || bulkInquiryDialog.entries.length === 0) return null
    const sheets = bulkInquiryDialog.entries
      .map((entry, index) => {
        const markup = renderToStaticMarkup(<InquiryFormTemplate data={entry.data} />)
        const separator = index === bulkInquiryDialog.entries.length - 1 ? '' : '<div class="page-break"></div>'
        return `${markup}${separator}`
      })
      .join('\n')

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>مجموعة مسائلات التأخر</title>
    <style>${INQUIRY_TEMPLATE_CSS}</style>
  </head>
  <body>
    ${sheets}
  </body>
</html>`
  }, [bulkInquiryDialog])
  const totalDelayPages = Math.max(1, delayMeta?.last_page ?? 1)
  const availableTemplates = settingsQuery.data?.available_templates ?? []
  const isSettingsLoading = settingsQuery.isLoading
  const isSavingSettings = updateSettingsMutation.isPending
  const isSubmittingExcuse =
    !!excuseDialog && updateDelayStatusMutation.isPending && activeStatusUpdateId === excuseDialog.record.id
  const isSubmittingRecalculate =
    !!recalculateDialog && recalcDelayMutation.isPending && activeRecalculateId === recalculateDialog.record.id
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
    const data = createInquiryTemplateData(record, {
      schoolName,
      workStartTime,
      issueDate: new Date(),
    })
    setInquiryDialog({ record, data })
  }

  const handleInquiryClose = () => setInquiryDialog(null)

  const handleInquiryPrint = () => {
    if (!inquiryDialog) return
    if (typeof window === 'undefined') return
    const html = buildInquiryDocumentHtml(inquiryDialog.data)
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
    const html = buildInquiryDocumentHtml(inquiryDialog.data)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `inquiry-${inquiryDialog.record.id}.html`
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
    setBulkInquiryDialog({ entries })
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
    anchor.download = `inquiries-${Date.now()}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const mutateDelayStatus = (
    record: TeacherAttendanceDelayRecord,
    payload: { status: TeacherDelayStatus; notes?: string | null; clear_notification?: boolean },
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

    if (status === record.delay_status) return
    mutateDelayStatus(record, { status, notes: null })
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

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">حضور المعلمين (حضوري)</h1>
            <p className="text-sm text-muted">
              متابعة مباشرة للقراءات المؤكدة من جهاز البصمة وموقع حضوري
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => document
                .getElementById('teacher-delay-header')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="button-secondary"
            >
              المتأخرين
            </button>
            <button
              type="button"
              className="button-primary"
              disabled
            >
              <i className="bi bi-plus-circle" /> إضافة جهاز
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="button-secondary"
            >
              <i className="bi bi-gear" /> الإعدادات
            </button>
            <button
              type="button"
              onClick={() => attendanceQuery.refetch()}
              className="button-secondary"
              disabled={attendanceQuery.isFetching}
            >
              <i className="bi bi-arrow-repeat" />{' '}
              {attendanceQuery.isFetching ? 'جارٍ التحديث...' : 'تحديث الآن'}
            </button>
            <div className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
              يتم التحديث تلقائياً كل 60 ثانية
            </div>
          </div>
        </div>
        {attendanceQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            تعذر تحميل سجلات الحضور.
            <button
              type="button"
              onClick={() => attendanceQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section className="glass-card space-y-6">
        <div className="grid gap-4 lg:grid-cols-5">
          <article className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">إجمالي السجلات</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats ? stats.total.toLocaleString('ar-SA') : '—'}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">سجلات مرتبطة</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{stats ? stats.matched.toLocaleString('ar-SA') : '—'}</p>
          </article>
          <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">بحاجة للربط</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{stats ? stats.unmatched.toLocaleString('ar-SA') : '—'}</p>
          </article>
          <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">حالات الحضور</p>
            <p className="mt-2 text-2xl font-bold text-sky-700">{stats ? stats.present.toLocaleString('ar-SA') : '—'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">آخر تحديث</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{refreshedAtLabel ?? '—'}</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="teacher-attendance-date">
              تاريخ المتابعة
            </label>
            <input
              id="teacher-attendance-date"
              type="date"
              value={filters.date}
              onChange={(event) => updateFilters('date', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="teacher-attendance-status">
              حالة السجل
            </label>
            <select
              id="teacher-attendance-status"
              value={filters.status}
              onChange={(event) => updateFilters('status', event.target.value as FilterState['status'])}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="teacher-attendance-match">
              حالة المطابقة
            </label>
            <select
              id="teacher-attendance-match"
              value={filters.matched}
              onChange={(event) => updateFilters('matched', event.target.value as FilterState['matched'])}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {matchedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="teacher-attendance-login-method">
              طريقة تسجيل الدخول
            </label>
            <select
              id="teacher-attendance-login-method"
              value={filters.login_method}
              onChange={(event) => updateFilters('login_method', event.target.value as FilterState['login_method'])}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {loginMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600" htmlFor="teacher-attendance-search">
              بحث بالاسم أو الهوية
            </label>
            <input
              id="teacher-attendance-search"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilters('search', event.target.value)}
              placeholder="مثال: أحمد / 1010"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-3xl border border-slate-100 bg-white/85 shadow-sm">
            {attendanceQuery.isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                جاري تحميل بيانات الحضور...
              </div>
            ) : records.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-inboxes text-3xl text-slate-300" />
                لا توجد سجلات للمعايير الحالية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[880px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">المعلم</th>
                      <th className="px-4 py-2.5 font-semibold">حالة السجل</th>
                      <th className="px-4 py-2.5 font-semibold">وقت العملية</th>
                      <th className="px-4 py-2.5 font-semibold">الدخول / الانصراف</th>
                      <th className="px-4 py-2.5 font-semibold">التأخير</th>
                      <th className="px-4 py-2.5 font-semibold">البوابة والمصدر</th>
                      <th className="px-4 py-2.5 font-semibold">المطابقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-t border-slate-100 text-[13px] transition hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{record.employee_name}</p>
                            <p className="text-[11px] text-muted">الهوية: {record.national_id}</p>
                            {record.job_number ? (
                              <p className="text-[11px] text-muted">الرقم الوظيفي: {record.job_number}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-2">
                            <StatusBadge record={record} />
                            <LoginMethodBadge record={record} />
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              <i className="bi bi-arrow-left-right" />
                              {record.transaction_type === 'check_in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
                            </span>
                            {record.result ? (
                              <p className="text-[11px] text-muted">النتيجة: {record.result}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-[12px] text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-700">وقت العملية:</span>{' '}
                              {formatTime(record.transaction_time)}
                            </p>
                            <p className="text-[11px] text-muted">التاريخ: {formatDate(record.attendance_date)}</p>
                            {record.page_number ? (
                              <p className="text-[11px] text-muted">رقم الصفحة: {record.page_number}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-[12px] text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-700">حضور:</span> {formatTime(record.check_in_time)}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">انصراف:</span> {formatTime(record.check_out_time)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {record.delay_status ? (
                            <div className="space-y-2">
                              <DelayStatusBadge status={record.delay_status} label={record.delay_status_label} />
                              {typeof record.delay_minutes === 'number' ? (
                                <p className="text-[11px] text-muted">
                                  دقائق التأخير: {record.delay_minutes.toLocaleString('ar-SA')}
                                </p>
                              ) : null}
                              {record.delay_notified_at ? (
                                <p className="text-[11px] text-muted">
                                  آخر إشعار: {formatTime(record.delay_notified_at)} — {formatDate(record.delay_notified_at)}
                                </p>
                              ) : null}
                              {record.delay_notes ? (
                                <p className="text-[11px] text-muted">ملاحظة: {record.delay_notes}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted">لا توجد بيانات تأخير</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-[12px] text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-700">البوابة:</span> {record.gate_name ?? '—'}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">الموقع:</span> {record.location ?? '—'}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">المصدر:</span> {record.source ?? '—'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-2">
                            <MatchBadge record={record} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-3xl border border-rose-100 bg-rose-50/70 p-5 shadow-sm">
            <header className="space-y-1 text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">حالات غير مرتبطة</p>
              <h3 className="text-lg font-semibold text-rose-700">{unmatchedRecords.length.toLocaleString('ar-SA')} معلم بحاجة للربط</h3>
              <p className="text-xs text-rose-600">
                استخدم الرقم الوظيفي أو الهوية للبحث عن المعلم وربطه في النظام لضمان ظهور حضوره في لوحة الأداء.
              </p>
            </header>

            {unmatchedRecords.length === 0 ? (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-3 text-sm text-rose-600">
                <i className="bi bi-check-circle text-2xl" />
                جميع السجلات مرتبطة بمعلمين.
              </div>
            ) : (
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {unmatchedRecords.map((record) => (
                  <article
                    key={`unmatched-${record.id}`}
                    className="space-y-1 rounded-2xl border border-rose-200 bg-white/70 p-3 text-right shadow-sm"
                  >
                    <p className="text-sm font-semibold text-rose-700">{record.employee_name}</p>
                    <p className="text-[11px] text-muted">الهوية: {record.national_id}</p>
                    {record.job_number ? (
                      <p className="text-[11px] text-muted">الرقم الوظيفي: {record.job_number}</p>
                    ) : null}
                    <p className="text-[11px] text-muted">
                      آخر ظهور: {formatTime(record.transaction_time)} — {formatDate(record.attendance_date)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                      {record.login_method_label} • {record.status_label}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="glass-card space-y-6">
  <header id="teacher-delay-header" className="space-y-3 scroll-mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2 text-right">
              <h2 className="text-2xl font-bold text-slate-900">إدارة حالات التأخر</h2>
              <p className="text-sm text-muted">
                راجع حالات التأخر المكتشفة، أعد احتسابها، أو أعد إرسال التنبيهات مباشرة.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => delayQuery.refetch()}
                className="button-secondary"
                disabled={delayQuery.isFetching}
              >
                <i className="bi bi-arrow-repeat" /> {delayQuery.isFetching ? 'جارٍ التحديث...' : 'تحديث القائمة'}
              </button>
              <button
                type="button"
                onClick={handleBulkInquiryOpen}
                className="button-secondary"
                disabled={delayAnalytics.delayedCount === 0}
              >
                <i className="bi bi-printer" /> طباعة المسائلة
              </button>
              <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
                إجمالي {delayMeta?.total?.toLocaleString('ar-SA') ?? '0'} حالة
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">حالة التأخر</span>
              <select
                value={delayFilters.status}
                onChange={(event) => updateDelayFilters('status', event.target.value as DelayFilterState['status'])}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {delayStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">من تاريخ</span>
              <input
                type="date"
                value={delayFilters.start_date}
                onChange={(event) => updateDelayFilters('start_date', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">إلى تاريخ</span>
              <input
                type="date"
                value={delayFilters.end_date}
                onChange={(event) => updateDelayFilters('end_date', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">بحث بالاسم أو الهوية</span>
              <input
                type="search"
                value={delayFilters.search}
                onChange={(event) => updateDelayFilters('search', event.target.value)}
                placeholder="مثال: أحمد / 1010"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">ترتيب النتائج</span>
              <select
                value={delayFilters.order}
                onChange={(event) => updateDelayFilters('order', event.target.value as DelayFilterState['order'])}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="desc">الأحدث أولًا</option>
                <option value="asc">الأقدم أولًا</option>
              </select>
            </label>
          </div>
        </header>

        {delayQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            تعذر تحميل حالات التأخر. حاول مرة أخرى.
          </div>
        ) : null}

        <div
          id="teacher-delay-table-section"
          className="rounded-3xl border border-slate-100 bg-white/85 shadow-sm"
        >
          {delayQuery.isLoading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              جاري تحميل حالات التأخر...
            </div>
          ) : delays.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted">
              <i className="bi bi-inboxes text-3xl text-slate-300" />
              لا توجد حالات تأخر مطابقة للمعايير الحالية.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="overflow-x-auto">
                <table className="min-w-[880px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">المعلم</th>
                      <th className="px-4 py-2.5 font-semibold">التاريخ والوقت</th>
                      <th className="px-4 py-2.5 font-semibold">بيانات التأخر</th>
                      <th className="px-4 py-2.5 font-semibold">حالة الحضور</th>
                      <th className="px-4 py-2.5 font-semibold">الإشعارات</th>
                      <th className="px-4 py-2.5 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delays.map((delay) => {
                      const isRecalculating = recalcDelayMutation.isPending && activeRecalculateId === delay.id
                      const isNotifying = notifyDelayMutation.isPending && activeNotifyId === delay.id
                      const isUpdatingStatus = updateDelayStatusMutation.isPending && activeStatusUpdateId === delay.id
                      const actionStatus: 'delayed' | 'excused' = delay.delay_status === 'excused' ? 'excused' : 'delayed'

                      return (
                        <tr key={delay.id} className="border-t border-slate-100 text-[13px] transition hover:bg-slate-50/70">
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{delay.teacher_name ?? '—'}</p>
                              <p className="text-[11px] text-muted">الهوية: {delay.national_id ?? '—'}</p>
                              {delay.teacher_phone ? (
                                <p className="text-[11px] text-muted">الهاتف: {delay.teacher_phone}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1 text-[12px] text-slate-600">
                              <p>
                                <span className="font-semibold text-slate-700">التاريخ:</span> {formatDate(delay.attendance_date)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">وقت الحضور:</span> {formatTime(delay.check_in_time)}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">آخر احتساب:</span> {formatDate(delay.delay_evaluated_at)}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-2">
                              <DelayStatusBadge status={delay.delay_status} label={delay.delay_status_label} />
                              {typeof delay.delay_minutes === 'number' ? (
                                <p className="text-[11px] text-muted">
                                  دقائق التأخر: {delay.delay_minutes.toLocaleString('ar-SA')}
                                </p>
                              ) : null}
                              {delay.delay_notes ? (
                                <p className="text-[11px] text-muted">ملاحظة: {delay.delay_notes}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1 text-[12px] text-slate-600">
                              <p>
                                <span className="font-semibold text-slate-700">الحالة:</span>{' '}
                                {delay.status_label ?? (delay.status ? fallbackAttendanceStatusLabels[delay.status] : 'غير محدد')}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">نوع العملية:</span>{' '}
                                {delay.transaction_type === 'check_out' ? 'انصراف' : 'تسجيل حضور'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1 text-[12px] text-slate-600">
                              <p>
                                <span className="font-semibold text-slate-700">آخر إشعار:</span>{' '}
                                {delay.delay_notified_at ? formatDate(delay.delay_notified_at) : 'لم يتم الإشعار بعد'}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-700">القناة:</span> {delay.delay_notice_channel ?? '—'}
                              </p>
                              {delay.delay_inquiry ? (
                                <p className="text-[11px] text-muted">
                                  مسائلة: {delay.delay_inquiry.status}
                                  {delay.delay_inquiry.responded_at
                                    ? ` • تم الرد ${formatDate(delay.delay_inquiry.responded_at)}`
                                    : ''}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-2">
                              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => handleDelayStatusChange(delay, 'delayed')}
                                  className={`flex-1 rounded-2xl px-3 py-1 text-[12px] font-semibold transition ${
                                    actionStatus === 'delayed'
                                      ? 'bg-rose-600 text-white shadow'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                  disabled={isUpdatingStatus}
                                >
                                  متأخر
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelayStatusChange(delay, 'excused')}
                                  className={`flex-1 rounded-2xl px-3 py-1 text-[12px] font-semibold transition ${
                                    actionStatus === 'excused'
                                      ? 'bg-amber-500 text-white shadow'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                  disabled={isUpdatingStatus}
                                >
                                  بعذر
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelayRecalculate(delay)}
                                className="button-secondary text-xs"
                                disabled={isRecalculating}
                              >
                                <i className="bi bi-calculator" /> {isRecalculating ? 'جارٍ الاحتساب...' : 'إعادة الاحتساب'}
                              </button>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDelayNotify(delay)}
                                  className="button-secondary text-xs"
                                  disabled={isNotifying}
                                >
                                  <i className="bi bi-send" /> {isNotifying ? 'جارٍ الإرسال...' : 'إرسال'}
                                </button>
                                <button
                                  type="button"
                                  className="button-secondary text-xs"
                                  onClick={() => handleInquiryOpen(delay)}
                                >
                                  <i className="bi bi-chat-dots" /> مسائلة
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <aside className="flex h-full flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-right shadow-inner">
                <header className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">إحصائيات فورية</p>
                  <h3 className="text-lg font-bold text-slate-800">نظرة على حالات التأخر</h3>
                </header>
                <article className="rounded-2xl border border-rose-200 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-rose-600">مجموع المتأخرين</p>
                  <p className="mt-1 text-xl font-bold text-rose-700">
                    {delayAnalytics.delayedCount.toLocaleString('ar-SA')}
                  </p>
                </article>
                <article className="rounded-2xl border border-amber-200 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-amber-600">حالات بعذر</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">
                    {delayAnalytics.excusedCount.toLocaleString('ar-SA')}
                  </p>
                </article>
                <article className="rounded-2xl border border-indigo-200 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-600">متوسط دقائق التأخر</p>
                  <p className="mt-1 text-xl font-bold text-indigo-700">
                    {delayAnalytics.averageDelay !== null
                      ? delayAnalytics.averageDelay.toLocaleString('ar-SA')
                      : '—'}
                  </p>
                  <p className="text-[11px] text-muted">محسوبة على السجلات المتأخرة فقط</p>
                </article>
              </aside>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            صفحة {delayFilters.page.toLocaleString('ar-SA')} من {totalDelayPages.toLocaleString('ar-SA')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="button-secondary text-xs"
              onClick={() => handleDelayPageChange(delayFilters.page - 1)}
              disabled={delayFilters.page <= 1}
            >
              <i className="bi bi-chevron-right" /> السابق
            </button>
            <button
              type="button"
              className="button-secondary text-xs"
              onClick={() => handleDelayPageChange(delayFilters.page + 1)}
              disabled={delayFilters.page >= totalDelayPages}
            >
              التالي <i className="bi bi-chevron-left" />
            </button>
          </div>
        </footer>
      </section>

      {excuseDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3 text-right">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">تسجيل عذر للتأخر</h3>
                <p className="text-sm text-muted">
                  اختر سبب العذر أو اكتبه، يتم حفظه مع السجل وإعادة ضبط دقائق التأخير لهذا اليوم.
                </p>
              </div>
              <button
                type="button"
                onClick={closeExcuseDialog}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <i className="bi bi-x" aria-hidden />
                <span className="sr-only">إغلاق</span>
              </button>
            </header>

            <div className="space-y-4 text-right">
              <article className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{excuseDialog.record.teacher_name ?? '—'}</p>
                <p className="text-[11px] text-muted">التاريخ: {formatDate(excuseDialog.record.attendance_date)}</p>
                <p className="text-[11px] text-muted">وقت الحضور: {formatTime(excuseDialog.record.check_in_time)}</p>
              </article>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  سبب العذر
                </legend>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm transition hover:border-indigo-400">
                  <span className="text-sm font-semibold text-slate-800">مشاكل تقنية</span>
                  <input
                    type="radio"
                    className="h-4 w-4"
                    name="delay-excuse-reason"
                    value="technical_issue"
                    checked={excuseDialog.reason === 'technical_issue'}
                    onChange={() => handleExcuseReasonChange('technical_issue')}
                  />
                </label>
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">أسباب أخرى</span>
                    <input
                      type="radio"
                      className="h-4 w-4"
                      name="delay-excuse-reason"
                      value="other"
                      checked={excuseDialog.reason === 'other'}
                      onChange={() => handleExcuseReasonChange('other')}
                    />
                  </label>
                  <textarea
                    rows={3}
                    value={excuseDialog.notes}
                    onChange={(event) => handleExcuseNotesChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                    placeholder="اكتب سبب العذر هنا"
                    disabled={excuseDialog.reason !== 'other'}
                  />
                </div>
              </fieldset>

              {excuseDialog.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-700">
                  {excuseDialog.error}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeExcuseDialog}
                  className="button-secondary"
                  disabled={isSubmittingExcuse}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleExcuseSubmit}
                  className="button-primary"
                  disabled={isSubmittingExcuse}
                >
                  {isSubmittingExcuse ? 'جارٍ الحفظ...' : 'حفظ العذر'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {inquiryDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3 text-right">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  نموذج مسائلة تأخر — {inquiryDialog.data.teacherName}
                </h3>
                <p className="text-sm text-muted">
                  راجع البيانات ثم استخدم خيارات الطباعة أو التنزيل لإصدار النموذج الرسمي.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInquiryClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <i className="bi bi-x-lg" />
              </button>
            </header>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className="button-secondary text-xs" onClick={handleInquiryDownload}>
                  <i className="bi bi-download" /> تنزيل النموذج
                </button>
                <button type="button" className="button-primary text-xs" onClick={handleInquiryPrint}>
                  <i className="bi bi-printer" /> طباعة النموذج
                </button>
              </div>

              <div className="overflow-auto rounded-3xl border border-slate-200 bg-slate-100 p-2">
                <iframe
                  title={`نموذج مسائلة ${inquiryDialog.data.teacherName}`}
                  srcDoc={inquiryDocumentHtml ?? ''}
                  className="h-[70vh] w-full min-w-[520px] rounded-2xl bg-white shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bulkInquiryDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3 text-right">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">نموذج مسائلة تأخر — جميع المتأخرين</h3>
                <p className="text-sm text-muted">تم تضمين جميع حالات التأخر الحالية ضمن نموذج واحد للطباعة أو التنزيل.</p>
              </div>
              <button
                type="button"
                onClick={handleBulkInquiryClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <i className="bi bi-x-lg" />
              </button>
            </header>

            {bulkInquiryDialog.entries.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-700">
                لا توجد سجلات متأخرة حالياً لتوليد مسائلات مطبوعة.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button type="button" className="button-secondary text-xs" onClick={handleBulkInquiryDownload}>
                    <i className="bi bi-download" /> تنزيل الكل
                  </button>
                  <button type="button" className="button-primary text-xs" onClick={handleBulkInquiryPrint}>
                    <i className="bi bi-printer" /> طباعة الكل
                  </button>
                </div>

                <div className="overflow-auto rounded-3xl border border-slate-200 bg-slate-100 p-2">
                  <iframe
                    title="مجموعة نماذج المسائلة"
                    srcDoc={bulkInquiryDocumentHtml ?? ''}
                    className="h-[70vh] w-full min-w-[520px] rounded-2xl bg-white shadow-inner"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {recalculateDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3 text-right">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">إدخال وقت حضور يدوي</h3>
                <p className="text-sm text-muted">
                  أدخل التوقيت الفعلي لوصول المعلم، وسيعاد احتساب دقائق التأخر مباشرة.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRecalculateDialog}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <i className="bi bi-x" aria-hidden />
                <span className="sr-only">إغلاق</span>
              </button>
            </header>

            <div className="space-y-4 text-right">
              <article className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{recalculateDialog.record.teacher_name ?? '—'}</p>
                <p className="text-[11px] text-muted">التاريخ: {formatDate(recalculateDialog.record.attendance_date)}</p>
                <p className="text-[11px] text-muted">التوقيت المسجل: {formatTime(recalculateDialog.record.check_in_time)}</p>
              </article>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-600">وقت الحضور اليدوي</span>
                <input
                  type="time"
                  step={60}
                  value={recalculateDialog.timeValue}
                  onChange={(event) => handleRecalculateDialogTimeChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </label>

              {recalculateDialog.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-700">
                  {recalculateDialog.error}
                </div>
              ) : null}

              <p className="text-[11px] text-muted">
                يتم حفظ الوقت في السجل وإعادة تقييم التأخير وإشعاراته بناءً على التوقيت المدخل.
              </p>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeRecalculateDialog}
                  className="button-secondary"
                  disabled={isSubmittingRecalculate}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleRecalculateDialogSubmit}
                  className="button-primary"
                  disabled={isSubmittingRecalculate}
                >
                  {isSubmittingRecalculate ? 'جارٍ إعادة الاحتساب...' : 'حفظ وإعادة الاحتساب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isSettingsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-4">
              <div className="space-y-1 text-right">
                <h2 className="text-2xl font-bold text-slate-900">إعدادات حضور المعلمين</h2>
                <p className="text-sm text-muted">
                  اضبط فترة الدوام وآلية حساب التأخير ورسائل التنبيه الخاصة بالمعلمين.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <i className="bi bi-x" aria-hidden />
                <span className="sr-only">إغلاق</span>
              </button>
            </header>

            <form onSubmit={handleSaveSettings} className="space-y-5 text-right">
              {settingsErrorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {settingsErrorMessage}
                </div>
              ) : null}

              {isSettingsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-muted">
                  جارٍ تحميل الإعدادات الحالية...
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">وقت بداية الدوام</span>
                  <input
                    type="time"
                    value={settingsForm.start_time}
                    onChange={(event) => updateSettingsForm('start_time', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">وقت نهاية الدوام</span>
                  <input
                    type="time"
                    value={settingsForm.end_time}
                    onChange={(event) => updateSettingsForm('end_time', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">دقائق السماح قبل اعتبار المعلم متأخرًا</span>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={settingsForm.grace_minutes}
                    onChange={(event) =>
                      updateSettingsForm('grace_minutes', Math.max(0, Number(event.target.value) || 0))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                  <p className="text-[11px] text-muted">الحد الموصى به بين 5 و 20 دقيقة.</p>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">قالب رسالة واتساب للتأخير</span>
                  <select
                    value={settingsForm.delay_notification_template_id ?? ''}
                    onChange={(event) =>
                      updateSettingsForm(
                        'delay_notification_template_id',
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    disabled={isSettingsLoading || isSavingSettings || availableTemplates.length === 0}
                  >
                    <option value="">بدون رسالة محددة</option>
                    {availableTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted">
                    {availableTemplates.length === 0
                      ? 'لا توجد قوالب نشطة مرتبطة بهذه المدرسة.'
                      : 'سيتم إرسال هذا القالب تلقائيًا عند اكتشاف حالة تأخير.'}
                  </p>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>حساب التأخير تلقائيًا بناءً على وقت الحضور</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.auto_calculate_delay}
                    onChange={(event) => updateSettingsForm('auto_calculate_delay', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرسال رسالة واتساب تلقائيًا عند التأخر</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.send_whatsapp_for_delay}
                    onChange={(event) => updateSettingsForm('send_whatsapp_for_delay', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرفاق مسائلة التأخر ضمن رسالة الواتساب</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.include_delay_notice}
                    onChange={(event) => updateSettingsForm('include_delay_notice', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>السماح بالتوقيع الإلكتروني على المسائلة</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.allow_e_signature}
                    onChange={(event) => updateSettingsForm('allow_e_signature', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرسال تذكير للمعلم بالتسجيل عند بداية الدوام</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.remind_check_in}
                    onChange={(event) => updateSettingsForm('remind_check_in', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرسال تذكير بالانصراف عند نهاية الدوام</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.remind_check_out}
                    onChange={(event) => updateSettingsForm('remind_check_out', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={isSettingsLoading || isSavingSettings}
                  />
                </label>
              </div>

              <footer className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="button-secondary flex-1"
                  disabled={isSavingSettings}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary flex-1"
                  disabled={isSavingSettings || isSettingsLoading}
                >
                  {isSavingSettings ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
