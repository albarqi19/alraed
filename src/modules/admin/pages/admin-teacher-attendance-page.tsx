import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTeacherHudoriAttendanceQuery } from '../hooks'
import type {
  TeacherHudoriAttendanceFilters,
  TeacherHudoriAttendanceLoginMethod,
  TeacherHudoriAttendanceRecord,
  TeacherHudoriAttendanceStatus,
} from '../types'

const statusOptions: Array<{ value: TeacherHudoriAttendanceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'present', label: 'حضور مؤكد' },
  { value: 'departed', label: 'انصراف مسجل' },
  { value: 'failed', label: 'فشل التعرف' },
  { value: 'unknown', label: 'غير معروف' },
]

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

type FilterState = {
  date: string
  status: TeacherHudoriAttendanceStatus | 'all'
  matched: 'all' | 'matched' | 'unmatched'
  login_method: TeacherHudoriAttendanceLoginMethod | 'all'
  search: string
}

type AttendanceSettingsState = {
  startTime: string
  endTime: string
  autoCalculateDelay: boolean
  sendWhatsappForDelay: boolean
  includeDelayNotice: boolean
  allowESignature: boolean
  remindCheckIn: boolean
  remindCheckout: boolean
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
  const [settingsFlash, setSettingsFlash] = useState<string | null>(null)
  const [settingsForm, setSettingsForm] = useState<AttendanceSettingsState>({
    startTime: '07:00',
    endTime: '14:00',
    autoCalculateDelay: true,
    sendWhatsappForDelay: false,
    includeDelayNotice: false,
    allowESignature: true,
    remindCheckIn: true,
    remindCheckout: false,
  })

  useEffect(() => {
    if (!settingsFlash) return
    const timeoutId = window.setTimeout(() => setSettingsFlash(null), 6000)
    return () => window.clearTimeout(timeoutId)
  }, [settingsFlash])

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

  const records = attendanceQuery.data?.records ?? []
  const stats = attendanceQuery.data?.stats
  const unmatchedRecords = useMemo(
    () => records.filter((record) => !record.is_matched),
    [records],
  )

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
    setIsSettingsModalOpen(false)
    setSettingsFlash('تم حفظ إعدادات الحضور مؤقتاً. سيتم ربطها بالخادم لاحقاً.')
    console.table(settingsForm)
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
        {settingsFlash ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 text-sm text-indigo-700">
            {settingsFlash}
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

      {isSettingsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between">
              <div className="space-y-1 text-right">
                <h2 className="text-2xl font-bold text-slate-900">إعدادات حضور المعلمين</h2>
                <p className="text-sm text-muted">
                  يمكن تعديل الإعدادات الآن، وسيتم ربطها بقاعدة البيانات في مرحلة لاحقة.
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">وقت بداية الدوام</span>
                  <input
                    type="time"
                    value={settingsForm.startTime}
                    onChange={(event) => updateSettingsForm('startTime', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-600">وقت نهاية الدوام</span>
                  <input
                    type="time"
                    value={settingsForm.endTime}
                    onChange={(event) => updateSettingsForm('endTime', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>حساب التأخير بشكل تلقائي</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.autoCalculateDelay}
                    onChange={(event) => updateSettingsForm('autoCalculateDelay', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرسال رسالة واتساب للتأخير</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.sendWhatsappForDelay}
                    onChange={(event) => updateSettingsForm('sendWhatsappForDelay', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>إرسال مسائلة تأخر مباشرة ضمن الرسالة</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.includeDelayNotice}
                    onChange={(event) => updateSettingsForm('includeDelayNotice', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>السماح بالتوقيع الإلكتروني</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowESignature}
                    onChange={(event) => updateSettingsForm('allowESignature', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>التذكير بالتحضير</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.remindCheckIn}
                    onChange={(event) => updateSettingsForm('remindCheckIn', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <span>التذكير بالانصراف</span>
                  <input
                    type="checkbox"
                    checked={settingsForm.remindCheckout}
                    onChange={(event) => updateSettingsForm('remindCheckout', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <footer className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="button-secondary flex-1"
                >
                  إلغاء
                </button>
                <button type="submit" className="button-primary flex-1">
                  حفظ الإعدادات
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
