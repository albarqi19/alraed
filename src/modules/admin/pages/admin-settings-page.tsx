import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  useAdminSettingsQuery,
  useTestWebhookMutation,
  useUpdateAdminSettingsMutation,
  useTestWhatsappConnectionMutation,
  useWhatsappSettingsQuery,
} from '../hooks'

type FormState = {
  school_name: string
  school_phone: string
  whatsapp_webhook_url: string
  attendance_notification: boolean
  weekly_report: boolean
  auto_approve_attendance: boolean
}

const EMPTY_FORM: FormState = {
  school_name: '',
  school_phone: '',
  whatsapp_webhook_url: '',
  attendance_notification: false,
  weekly_report: false,
  auto_approve_attendance: false,
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-indigo-200">
      <span className="space-y-1 text-right">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <span className="flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="h-5 w-10 cursor-pointer rounded-full border border-slate-300 bg-slate-200 accent-indigo-600 transition focus:ring-indigo-500"
        />
      </span>
    </label>
  )
}

export function AdminSettingsPage() {
  const settingsQuery = useAdminSettingsQuery()
  const whatsappSettingsQuery = useWhatsappSettingsQuery()
  const updateMutation = useUpdateAdminSettingsMutation()
  const testWebhookMutation = useTestWebhookMutation()
  const testWhatsappConnectionMutation = useTestWhatsappConnectionMutation()

  const originalSettings = useMemo(() => settingsQuery.data ?? null, [settingsQuery.data])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (originalSettings) {
      setForm({
        school_name: originalSettings.school_name ?? '',
        school_phone: originalSettings.school_phone ?? '',
        whatsapp_webhook_url: originalSettings.whatsapp_webhook_url ?? '',
        attendance_notification: Boolean(originalSettings.attendance_notification),
        weekly_report: Boolean(originalSettings.weekly_report),
        auto_approve_attendance: Boolean(originalSettings.auto_approve_attendance),
      })
    }
  }, [originalSettings])

  const isLoading = settingsQuery.isLoading
  const isSaving = updateMutation.isPending
  const isTestingWebhook = testWebhookMutation.isPending
  const isTestingConnection = testWhatsappConnectionMutation.isPending

  const isDirty = useMemo(() => {
    if (!originalSettings) return false
    const normalizedOriginal: FormState = {
      school_name: originalSettings.school_name ?? '',
      school_phone: originalSettings.school_phone ?? '',
      whatsapp_webhook_url: originalSettings.whatsapp_webhook_url ?? '',
      attendance_notification: Boolean(originalSettings.attendance_notification),
      weekly_report: Boolean(originalSettings.weekly_report),
      auto_approve_attendance: Boolean(originalSettings.auto_approve_attendance),
    }
    return JSON.stringify(form) !== JSON.stringify(normalizedOriginal)
  }, [form, originalSettings])

  const handleInputChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isDirty || isSaving) return
    updateMutation.mutate(form)
  }

  return (
    <section className="w-full space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">إعدادات النظام</h1>
            <p className="text-sm text-muted">
              عدّل بيانات المدرسة، تحكم بالإشعارات الآلية، وتأكد من تكامل الويب هوك مع منصة الواتساب.
            </p>
          </div>
          {originalSettings ? (
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              الإعدادات محدثة
            </div>
          ) : null}
        </div>
        {settingsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            تعذر تحميل الإعدادات. يرجى المحاولة مرة أخرى.
            <button
              type="button"
              onClick={() => settingsQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(360px,1fr)]">
        <form onSubmit={handleSubmit} className="glass-card space-y-6">
          <header className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">بيانات المدرسة</p>
            <h2 className="text-xl font-semibold text-slate-900">معلومات عامة</h2>
            <p className="text-sm text-muted">سيتم حفظ التعديلات فورًا عند الضغط على زر الحفظ.</p>
          </header>

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600">اسم المدرسة</label>
                <input
                  type="text"
                  value={form.school_name}
                  onChange={(event) => handleInputChange('school_name', event.target.value)}
                  placeholder="مثال: مدرسة ذو النورين الابتدائية"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600">هاتف المدرسة</label>
                <input
                  type="tel"
                  value={form.school_phone}
                  onChange={(event) => handleInputChange('school_phone', event.target.value)}
                  placeholder="مثال: 0501234567"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-600">رابط الويب هوك للواتساب</label>
                <input
                  type="url"
                  value={form.whatsapp_webhook_url}
                  onChange={(event) => handleInputChange('whatsapp_webhook_url', event.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isSaving}
                />
              </div>

              <ToggleField
                label="إشعارات الحضور الفورية"
                description="إرسال تنبيه لولي الأمر عند تسجيل الغياب أو التأخير."
                checked={form.attendance_notification}
                onChange={(value) => handleInputChange('attendance_notification', value)}
                disabled={isSaving}
              />

              <ToggleField
                label="التقرير الأسبوعي"
                description="إرسال ملخص أسبوعي بالحضور إلى الإدارة وولي الأمر."
                checked={form.weekly_report}
                onChange={(value) => handleInputChange('weekly_report', value)}
                disabled={isSaving}
              />

              <ToggleField
                label="الموافقة التلقائية على الحضور"
                description="اعتماد التحضير المرسل من المعلمين تلقائيًا عند عدم وجود ملاحظات."
                checked={form.auto_approve_attendance}
                onChange={(value) => handleInputChange('auto_approve_attendance', value)}
                disabled={isSaving}
              />
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="button-secondary" onClick={() => originalSettings && settingsQuery.refetch()} disabled={isSaving || isLoading}>
              إعادة التحميل
            </button>
            <button type="submit" className="button-primary" disabled={!isDirty || isSaving}>
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </footer>
        </form>

        <aside className="space-y-6">
          <section className="glass-card space-y-4">
            <header className="space-y-1 text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">تكامل الواتساب</p>
              <h2 className="text-lg font-semibold text-slate-900">حالة الاتصال</h2>
              <p className="text-sm text-muted">اختبر الاتصال بالمنصة وتأكد من صحة بيانات الويب هوك.</p>
            </header>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm">
              {whatsappSettingsQuery.isLoading ? (
                <div className="space-y-2 text-muted">
                  <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ) : whatsappSettingsQuery.data ? (
                <ul className="space-y-2 text-right text-sm text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-500">اسم الجلسة:</span>{' '}
                    {whatsappSettingsQuery.data.instance_name ?? 'غير محدد'}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-500">رقم الهاتف:</span>{' '}
                    {whatsappSettingsQuery.data.phone_number ?? '—'}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-500">الحالة:</span>{' '}
                    {whatsappSettingsQuery.data.is_connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <i className="bi bi-check-circle" /> متصل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        <i className="bi bi-exclamation-circle" /> غير متصل
                      </span>
                    )}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-500">آخر مزامنة:</span>{' '}
                    {whatsappSettingsQuery.data.last_sync_at ?? '—'}
                  </li>
                </ul>
              ) : (
                <p className="text-xs text-muted">تعذر تحميل حالة الاتصال.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={() => testWebhookMutation.mutate()}
                disabled={isTestingWebhook || isLoading}
              >
                {isTestingWebhook ? 'جارٍ الاختبار...' : 'اختبار الويب هوك'}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => testWhatsappConnectionMutation.mutate()}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? 'جارٍ التحقق...' : 'اختبار الاتصال'}
              </button>
            </div>

            {testWebhookMutation.isError ? (
              <p className="text-xs text-rose-600">فشل اختبار الويب هوك. تأكد من صحة الرابط.</p>
            ) : null}
          </section>

          <section className="glass-card space-y-3 text-right text-sm text-muted">
            <h3 className="text-lg font-semibold text-slate-900">إرشادات</h3>
            <ul className="space-y-2">
              <li>تأكد من أن رقم الهاتف بصيغة دولية صحيحة لرسائل الواتساب.</li>
              <li>يجب أن يكون رابط الويب هوك متاحًا ويستقبل الطلبات من الخادم.</li>
              <li>عند تعطيل الموافقة التلقائية، ستظهر طلبات الاعتماد في تبويب التحضير.</li>
            </ul>
          </section>
        </aside>
      </section>
    </section>
  )
}
