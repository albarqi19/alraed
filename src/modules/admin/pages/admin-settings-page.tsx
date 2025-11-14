import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from '../hooks'
import { useQuery } from '@tanstack/react-query'
import { fetchWhatsappInstances } from '../api'
import { WhatsappInstancesManager } from '../components/whatsapp-instances-manager'

type FormState = {
  school_name: string
  school_phone: string
  attendance_notification: boolean
  weekly_report: boolean
  auto_approve_attendance: boolean
}

const EMPTY_FORM: FormState = {
  school_name: '',
  school_phone: '',
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
  const updateMutation = useUpdateAdminSettingsMutation()
  
  // جلب instances للعرض في حالة الاتصال
  const { data: instances = [] } = useQuery({
    queryKey: ['admin', 'whatsapp', 'instances'],
    queryFn: fetchWhatsappInstances,
    refetchInterval: 30000,
  })

  const originalSettings = useMemo(() => settingsQuery.data ?? null, [settingsQuery.data])

  const [activeTab, setActiveTab] = useState<'general' | 'whatsapp-instances'>('general')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (originalSettings) {
      setForm({
        school_name: originalSettings.school_name ?? '',
        school_phone: originalSettings.school_phone ?? '',
        attendance_notification: Boolean(originalSettings.attendance_notification),
        weekly_report: Boolean(originalSettings.weekly_report),
        auto_approve_attendance: Boolean(originalSettings.auto_approve_attendance),
      })
    }
  }, [originalSettings])

  const isLoading = settingsQuery.isLoading
  const isSaving = updateMutation.isPending

  const isDirty = useMemo(() => {
    if (!originalSettings) return false
    const normalizedOriginal: FormState = {
      school_name: originalSettings.school_name ?? '',
      school_phone: originalSettings.school_phone ?? '',
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

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === 'general'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الإعدادات العامة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp-instances')}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === 'whatsapp-instances'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أرقام الواتساب
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'whatsapp-instances' ? (
        <WhatsappInstancesManager />
      ) : (
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
              <p className="text-sm text-muted">عرض حالة أرقام الواتساب المرتبطة بالمدرسة</p>
            </header>

            <div className="space-y-3">
              {instances.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-muted">لا توجد أرقام واتساب مرتبطة</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp-instances')}
                    className="button-secondary mt-3 text-xs"
                  >
                    إضافة رقم الآن
                  </button>
                </div>
              ) : (
                <>
                  {instances.map((instance) => (
                    <div
                      key={instance.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{instance.instance_name}</p>
                          {instance.phone_number && (
                            <p className="text-xs text-slate-600">{instance.phone_number}</p>
                          )}
                          {instance.department && (
                            <p className="text-xs text-muted">{instance.department}</p>
                          )}
                        </div>
                        {instance.status === 'connected' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <i className="bi bi-check-circle" /> متصل
                          </span>
                        )}
                        {instance.status === 'connecting' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <i className="bi bi-arrow-repeat" /> جاري الاتصال
                          </span>
                        )}
                        {instance.status === 'disconnected' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                            <i className="bi bi-exclamation-circle" /> غير متصل
                          </span>
                        )}
                      </div>
                      
                      {instance.last_connected_at && (
                        <p className="mt-2 text-xs text-muted">
                          آخر اتصال: {new Date(instance.last_connected_at).toLocaleString('ar-SA')}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp-instances')}
                    className="button-secondary w-full text-xs"
                  >
                    إدارة الأرقام
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="glass-card space-y-3 text-right text-sm text-muted">
            <h3 className="text-lg font-semibold text-slate-900">إرشادات</h3>
            <ul className="space-y-2">
              <li>يمكنك إضافة أرقام واتساب متعددة لمدرستك من تبويب "أرقام الواتساب"</li>
              <li>كل رقم يعمل بشكل مستقل ويمكن تخصيصه لقسم معين</li>
              <li>عند تعطيل الموافقة التلقائية، ستظهر طلبات الاعتماد في تبويب التحضير</li>
            </ul>
          </section>
        </aside>
      </section>
      )}
    </section>
  )
}
