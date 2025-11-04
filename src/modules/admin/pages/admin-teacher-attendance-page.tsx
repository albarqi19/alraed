import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useTeacherHudoriAttendanceQuery,
  useTeacherAttendanceSettingsQuery,
  useUpdateTeacherAttendanceSettingsMutation,
  useTeacherAttendanceDelaysQuery,
  useRecalculateTeacherAttendanceDelayMutation,
  useNotifyTeacherAttendanceDelayMutation,
  useUpdateTeacherAttendanceDelayStatusMutation,
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

const actionableDelayStatuses: TeacherDelayStatus[] = ['delayed', 'on_time', 'excused', 'unknown']

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
    start_date: '',
    end_date: '',
    search: '',
    page: 1,
    per_page: 25,
    order: 'desc',
  })
  const [activeRecalculateId, setActiveRecalculateId] = useState<number | null>(null)
  const [activeNotifyId, setActiveNotifyId] = useState<number | null>(null)
  const [activeStatusUpdateId, setActiveStatusUpdateId] = useState<number | null>(null)

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
  const totalDelayPages = Math.max(1, delayMeta?.last_page ?? 1)
  const availableTemplates = settingsQuery.data?.available_templates ?? []
  const isSettingsLoading = settingsQuery.isLoading
  const isSavingSettings = updateSettingsMutation.isPending
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
    setActiveRecalculateId(record.id)
    recalcDelayMutation.mutate(record.id, {
      onSuccess: () => {
        delayQuery.refetch()
        attendanceQuery.refetch()
      },
      onSettled: () => setActiveRecalculateId(null),
    })
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

  const handleDelayStatusChange = (record: TeacherAttendanceDelayRecord, status: TeacherDelayStatus) => {
    if (status === record.delay_status) return
    setActiveStatusUpdateId(record.id)
    updateDelayStatusMutation.mutate(
      { attendanceId: record.id, payload: { status } },
      {
        onSuccess: () => {
          delayQuery.refetch()
          attendanceQuery.refetch()
        },
        onSettled: () => setActiveStatusUpdateId(null),
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
              متابعة مباشرة للقراءات المؤكدة من جهاز البصمة وموقع حضوري، مع إبراز حالات عدم المطابقة لتسريع الربط
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              <i className="bi bi-gear" /> إعدادات الحضور
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
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
                <table className="min-w-[960px] table-fixed text-right text-sm">
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
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-right">
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

        <div className="rounded-3xl border border-slate-100 bg-white/85 shadow-sm">
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
            <div className="overflow-x-auto">
              <table className="min-w-[960px] table-fixed text-right text-sm">
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
                            <select
                              value={delay.delay_status}
                              onChange={(event) => handleDelayStatusChange(delay, event.target.value as TeacherDelayStatus)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-[12px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              disabled={isUpdatingStatus}
                            >
                              {actionableDelayStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {delayStatusLabels[status]}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleDelayRecalculate(delay)}
                              className="button-secondary text-xs"
                              disabled={isRecalculating}
                            >
                              <i className="bi bi-calculator" /> {isRecalculating ? 'جارٍ الاحتساب...' : 'إعادة الاحتساب'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelayNotify(delay)}
                              className="button-secondary text-xs"
                              disabled={isNotifying}
                            >
                              <i className="bi bi-send" /> {isNotifying ? 'جارٍ الإرسال...' : 'إرسال التنبيه'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
