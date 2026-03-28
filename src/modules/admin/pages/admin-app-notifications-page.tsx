import { useState, useMemo } from 'react'
import {
  useNotificationStatsQuery,
  useTeachersAppStatusQuery,
  useNotificationHistoryQuery,
  useSendNotificationMutation,
} from '../app-notifications/hooks'
import type { TeacherAppStatus, TeacherFilterStatus, SendNotificationPayload, NotificationLogEntry } from '../app-notifications/types'

const roleLabels: Record<string, string> = {
  teacher: 'معلم',
  school_principal: 'مدير المدرسة',
  deputy_teachers: 'وكيل شؤون المعلمين',
  deputy_students: 'وكيل شؤون الطلاب',
  student_counselor: 'مرشد طلابي',
  administrative_staff: 'إداري',
}

const platformIcons: Record<string, string> = {
  web: 'bi-globe',
  android: 'bi-phone',
  ios: 'bi-apple',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} د`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-SA')
}

function deliveryColor(rate: number): string {
  if (rate >= 90) return 'text-emerald-600'
  if (rate >= 70) return 'text-amber-600'
  return 'text-rose-600'
}

const recipientTypeLabels: Record<string, { label: string; color: string }> = {
  individual: { label: 'فردي', color: 'bg-sky-100 text-sky-700' },
  bulk_selected: { label: 'مجموعة', color: 'bg-violet-100 text-violet-700' },
  bulk_all: { label: 'الكل', color: 'bg-teal-100 text-teal-700' },
}

export default function AdminAppNotificationsPage() {
  // ========== State ==========
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [recipientType, setRecipientType] = useState<'bulk_all' | 'bulk_selected'>('bulk_all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())

  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherFilter, setTeacherFilter] = useState<TeacherFilterStatus>('all')

  const [historyPage, setHistoryPage] = useState(1)
  const [detailLog, setDetailLog] = useState<NotificationLogEntry | null>(null)

  // ========== Queries ==========
  const statsQuery = useNotificationStatsQuery()
  const teachersQuery = useTeachersAppStatusQuery({ search: teacherSearch, status: teacherFilter })
  const historyQuery = useNotificationHistoryQuery(historyPage)
  const sendMutation = useSendNotificationMutation()

  const stats = statsQuery.data
  const teachers = teachersQuery.data ?? []
  const history = historyQuery.data

  // المعلمون اللي عندهم التطبيق (لقائمة الاختيار)
  const installableTeachers = useMemo(
    () => teachers.filter((t) => t.has_app),
    [teachers],
  )

  // ========== Handlers ==========
  const toggleTeacher = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInstalled = () => {
    setSelectedUserIds(new Set(installableTeachers.map((t) => t.id)))
  }

  const deselectAll = () => {
    setSelectedUserIds(new Set())
  }

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return
    if (recipientType === 'bulk_selected' && selectedUserIds.size === 0) return

    const payload: SendNotificationPayload = {
      title: title.trim(),
      body: body.trim(),
      image: imageUrl.trim() || undefined,
      recipient_type: recipientType,
      user_ids: recipientType === 'bulk_selected' ? Array.from(selectedUserIds) : undefined,
    }

    sendMutation.mutate(payload, {
      onSuccess: () => {
        setTitle('')
        setBody('')
        setImageUrl('')
        setSelectedUserIds(new Set())
      },
    })
  }

  return (
    <section className="space-y-6">
      {/* ===== Header ===== */}
      <header className="space-y-1 text-right">
        <h1 className="text-3xl font-bold text-slate-900">إشعارات التطبيق</h1>
        <p className="text-sm text-muted">
          إدارة إشعارات التطبيق، متابعة حالة التثبيت، وإرسال إشعارات جماعية أو فردية للمعلمين.
        </p>
      </header>

      {/* ===== A: بطاقات الإحصائيات ===== */}
      <section className="glass-card space-y-4">
        {statsQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="إجمالي المعلمين" value={stats.total_teachers} />
              <StatCard label="مثبتو التطبيق" value={stats.with_app} accent="emerald" />
              <StatCard label="لم يثبتوا" value={stats.without_app} accent="rose" />
              <StatCard label="نسبة التثبيت" value={`${stats.app_install_rate}%`} accent="sky" />
              <StatCard label="نسبة التوصيل (30 يوم)" value={`${stats.delivery_rate_30d}%`} accent="amber" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="font-semibold text-slate-700">{stats.total_notifications_30d} إشعار آخر 30 يوم</span>
              <span className="inline-flex items-center gap-1">
                <i className="bi bi-globe" /> ويب: {stats.platforms.web}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="bi bi-phone" /> أندرويد: {stats.platforms.android}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="bi bi-apple" /> iOS: {stats.platforms.ios}
              </span>
            </div>
          </>
        ) : null}
      </section>

      {/* ===== B: إرسال إشعار جديد ===== */}
      <section className="glass-card space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">إرسال إشعار جديد</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* العنوان */}
          <div className="grid gap-2 text-right">
            <label htmlFor="notif-title" className="text-sm font-medium text-slate-800">
              عنوان الإشعار
            </label>
            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="مثال: تذكير بالاجتماع"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={sendMutation.isPending}
            />
            <span className="text-xs text-muted">{title.length}/100</span>
          </div>

          {/* رابط الصورة */}
          <div className="grid gap-2 text-right">
            <label htmlFor="notif-image" className="text-sm font-medium text-slate-800">
              رابط الصورة <span className="text-xs text-muted font-normal">(اختياري)</span>
            </label>
            <input
              id="notif-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              disabled={sendMutation.isPending}
            />
          </div>
        </div>

        {/* النص */}
        <div className="grid gap-2 text-right">
          <label htmlFor="notif-body" className="text-sm font-medium text-slate-800">
            نص الإشعار
          </label>
          <textarea
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="اكتب نص الإشعار هنا..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            disabled={sendMutation.isPending}
          />
          <span className="text-xs text-muted">{body.length}/500</span>
        </div>

        {/* اختيار المستلمين */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-800">المستلمون</span>
          <div className="flex flex-wrap gap-2">
            {(['bulk_all', 'bulk_selected'] as const).map((type) => {
              const isActive = recipientType === type
              const label = type === 'bulk_all' ? 'جميع المعلمين' : 'معلمين محددين'
              return (
                <label
                  key={type}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recipient-type"
                    value={type}
                    checked={isActive}
                    onChange={() => setRecipientType(type)}
                    className="sr-only"
                    disabled={sendMutation.isPending}
                  />
                  {label}
                </label>
              )
            })}
          </div>

          {recipientType === 'bulk_selected' ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {selectedUserIds.size} محدد من {installableTeachers.length} معلم
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllInstalled} className="text-xs font-semibold text-teal-600 hover:underline">
                    تحديد الكل
                  </button>
                  <button type="button" onClick={deselectAll} className="text-xs font-semibold text-slate-500 hover:underline">
                    إلغاء الكل
                  </button>
                </div>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {teachers.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      t.has_app ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(t.id)}
                        onChange={() => toggleTeacher(t.id)}
                        disabled={!t.has_app || sendMutation.isPending}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-800">{t.name}</span>
                    </div>
                    {!t.has_app ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                        لم يثبت التطبيق
                      </span>
                    ) : (
                      <span className="flex gap-1">
                        {t.platforms.map((p) => (
                          <i key={p} className={`${platformIcons[p]} text-slate-400 text-xs`} />
                        ))}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* معاينة + إرسال */}
        {title.trim() || body.trim() ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
            <p className="mb-2 text-xs font-semibold text-muted">معاينة الإشعار</p>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                  <i className="bi bi-bell-fill" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-slate-900">{title || 'عنوان الإشعار'}</p>
                  <p className="mt-1 text-sm text-slate-600">{body || 'نص الإشعار'}</p>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="mt-2 max-h-32 w-full rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">الآن</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={
              sendMutation.isPending ||
              !title.trim() ||
              !body.trim() ||
              (recipientType === 'bulk_selected' && selectedUserIds.size === 0)
            }
            className="button-primary"
          >
            {sendMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <i className="bi bi-arrow-repeat animate-spin" /> جاري الإرسال...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <i className="bi bi-send-fill" /> إرسال الإشعار
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ===== C: حالة تثبيت التطبيق ===== */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">حالة تثبيت التطبيق</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <i className="bi bi-search text-slate-400" />
            <input
              type="search"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="بحث بالاسم..."
              className="w-40 border-none bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value as TeacherFilterStatus)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="all">جميع المعلمين</option>
            <option value="installed">مثبتو التطبيق</option>
            <option value="not_installed">لم يثبتوا</option>
          </select>
        </div>

        {teachersQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
            لا يوجد معلمون مطابقون.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">المعلم</th>
                  <th className="px-4 py-3">الدور</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">المنصة</th>
                  <th className="px-4 py-3">الأجهزة</th>
                  <th className="px-4 py-3">آخر نشاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <TeacherRow key={t.id} teacher={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== D: سجل الإشعارات ===== */}
      <section className="glass-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">سجل الإشعارات المرسلة</h2>

        {historyQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !history || history.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
            لا يوجد إشعارات مرسلة حتى الآن.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-right text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">الإشعار</th>
                    <th className="px-4 py-3">المستلمون</th>
                    <th className="px-4 py-3">التوصيل</th>
                    <th className="px-4 py-3">النسبة</th>
                    <th className="px-4 py-3">المرسل</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.data.map((log) => {
                    const rate =
                      log.total_tokens > 0
                        ? Math.round((log.delivered_count / log.total_tokens) * 100)
                        : 0
                    const typeMeta = recipientTypeLabels[log.recipient_type] ?? {
                      label: log.recipient_type,
                      color: 'bg-slate-100 text-slate-600',
                    }
                    return (
                      <tr key={log.id} className="text-right hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 truncate max-w-[200px]">{log.title}</p>
                          <p className="text-xs text-muted truncate max-w-[200px]">{log.body}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeMeta.color}`}>
                            {typeMeta.label}
                          </span>
                          {log.recipient_type === 'individual' && log.recipients.length === 1 ? (
                            <p className="mt-1 text-xs font-medium text-slate-700">{log.recipients[0].name}</p>
                          ) : (
                            <p className="mt-1 text-xs text-muted">{log.total_recipients} معلم</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {log.delivered_count}/{log.total_tokens}
                        </td>
                        <td className={`px-4 py-3 font-bold ${deliveryColor(rate)}`}>
                          {log.total_tokens > 0 ? `${rate}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{log.sender?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted">{timeAgo(log.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDetailLog(log)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            تفاصيل
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {history.meta.last_page > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="button-secondary text-xs"
                >
                  السابق
                </button>
                <span className="text-sm text-muted">
                  {history.meta.current_page} / {history.meta.last_page}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.min(history.meta.last_page, p + 1))}
                  disabled={historyPage >= history.meta.last_page}
                  className="button-secondary text-xs"
                >
                  التالي
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* ===== نافذة تفاصيل الإشعار ===== */}
      {detailLog ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailLog(null) }}
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">تفاصيل الإشعار</h3>
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* محتوى الإشعار */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-right">
              <p className="font-semibold text-slate-800">{detailLog.title}</p>
              <p className="text-sm text-slate-600">{detailLog.body}</p>
              {detailLog.image ? (
                <img src={detailLog.image} alt="" className="mt-2 max-h-32 rounded-lg object-cover" />
              ) : null}
            </div>

            {/* إحصائيات */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-muted">المستلمون</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{detailLog.total_recipients}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs text-muted">وصل</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{detailLog.delivered_count}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                <p className="text-xs text-muted">فشل</p>
                <p className="mt-1 text-lg font-bold text-rose-700">{detailLog.failed_count}</p>
              </div>
            </div>

            {/* قائمة المستلمين */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">المستلمون ({detailLog.recipients.length})</p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                {detailLog.recipients.length > 0 ? (
                  detailLog.recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-800">{r.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-center text-xs text-muted">لا توجد بيانات مستلمين</p>
                )}
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>المرسل: <strong className="text-slate-700">{detailLog.sender?.name ?? '—'}</strong></span>
              <span>التاريخ: <strong className="text-slate-700">{new Date(detailLog.created_at).toLocaleString('ar-SA')}</strong></span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

// ========== Sub-components ==========

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'emerald' | 'rose' | 'sky' | 'amber'
}) {
  const accentStyles: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50/50',
    rose: 'border-rose-200 bg-rose-50/50',
    sky: 'border-sky-200 bg-sky-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
  }
  const valueStyles: Record<string, string> = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    sky: 'text-sky-700',
    amber: 'text-amber-700',
  }

  return (
    <article
      className={`rounded-2xl border p-4 text-right shadow-sm ${
        accent ? accentStyles[accent] : 'border-slate-100 bg-white/70'
      }`}
    >
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? valueStyles[accent] : 'text-slate-900'}`}>
        {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
      </p>
    </article>
  )
}

function TeacherRow({ teacher: t }: { teacher: TeacherAppStatus }) {
  return (
    <tr className="text-right hover:bg-slate-50/50">
      <td className="px-4 py-3 font-semibold text-slate-800">{t.name}</td>
      <td className="px-4 py-3 text-slate-600">{roleLabels[t.role] ?? t.role}</td>
      <td className="px-4 py-3">
        {t.has_app ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <i className="bi bi-check-circle-fill text-[10px]" /> مثبت
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            <i className="bi bi-x-circle text-[10px]" /> غير مثبت
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="flex gap-1.5">
          {t.platforms.length > 0
            ? t.platforms.map((p) => (
                <i key={p} className={`${platformIcons[p]} text-slate-500`} title={p} />
              ))
            : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{t.devices_count || '—'}</td>
      <td className="px-4 py-3 text-xs text-muted">{timeAgo(t.last_active_at)}</td>
    </tr>
  )
}
