import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import clsx from 'classnames'

interface MessageTemplate {
  id: number
  template_key: string
  title: string
  icon: string
  content: string
  color: string
  is_active: boolean
  sort_order: number
}

interface MessageSettings {
  id: number
  is_enabled: boolean
  daily_limit_per_teacher: number
  allowed_start_hour: number
  allowed_end_hour: number
}

export function AdminTeacherMessagesPage() {
  const queryClient = useQueryClient()
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin', 'teacher-message-templates'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/teacher-messages/templates')
      return response.data
    },
  })

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin', 'teacher-message-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/teacher-messages/settings')
      return response.data
    },
  })

  // Fetch statistics
  const { data: statisticsData } = useQuery({
    queryKey: ['admin', 'teacher-message-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/teacher-messages/statistics')
      return response.data
    },
  })

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const response = await apiClient.put(`/admin/teacher-messages/templates/${template.id}`, template)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-templates'] })
      setEditingTemplate(null)
    },
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<MessageSettings>) => {
      const response = await apiClient.put('/admin/teacher-messages/settings', settings)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-settings'] })
      setEditingSettings(false)
    },
  })

  const templates: MessageTemplate[] = templatesData?.templates || []
  const settings: MessageSettings = settingsData?.settings || {
    id: 1,
    is_enabled: true,
    daily_limit_per_teacher: 10,
    allowed_start_hour: 7,
    allowed_end_hour: 11,
  }
  const statistics = statisticsData?.statistics || {
    total_sent_today: 0,
    total_sent_this_week: 0,
    total_sent_this_month: 0,
    active_teachers_count: 0,
  }

  // Quick toggle system status
  const toggleSystemMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiClient.put('/admin/teacher-messages/settings', {
        is_enabled: enabled,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-settings'] })
      // Force refetch
      queryClient.refetchQueries({ queryKey: ['admin', 'teacher-message-settings'] })
    },
  })

  if (templatesLoading || settingsLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-4 text-sm text-muted">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {/* Header with Quick Toggle */}
      <header className="glass-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                console.log('Toggle clicked, current state:', settings.is_enabled)
                toggleSystemMutation.mutate(!settings.is_enabled)
              }}
              disabled={toggleSystemMutation.isPending}
              className={clsx(
                'relative inline-flex h-12 w-24 flex-shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
                toggleSystemMutation.isPending && 'animate-pulse',
                settings.is_enabled ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform duration-300',
                  settings.is_enabled ? 'translate-x-12' : 'translate-x-1'
                )}
              />
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {toggleSystemMutation.isPending ? 'جاري التحديث...' : settings.is_enabled ? 'النظام مفعّل ✓' : 'النظام معطّل'}
              </p>
              <p className="text-xs text-muted">
                {settings.is_enabled ? 'المعلمون يمكنهم إرسال الرسائل' : 'لا يمكن للمعلمين إرسال الرسائل'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-bold text-slate-900">إدارة رسائل المعلمين</h1>
            <p className="text-sm text-muted">تحكم في قوالب الرسائل والإعدادات</p>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 text-center">
          <div className="text-4xl font-bold text-blue-600">{statistics.total_sent_today}</div>
          <p className="mt-2 text-sm font-semibold text-blue-900">رسائل اليوم</p>
        </div>

        <div className="glass-card bg-gradient-to-br from-purple-50 to-purple-100 text-center">
          <div className="text-4xl font-bold text-purple-600">{statistics.total_sent_this_week}</div>
          <p className="mt-2 text-sm font-semibold text-purple-900">رسائل الأسبوع</p>
        </div>

        <div className="glass-card bg-gradient-to-br from-teal-50 to-teal-100 text-center">
          <div className="text-4xl font-bold text-teal-600">{statistics.total_sent_this_month}</div>
          <p className="mt-2 text-sm font-semibold text-teal-900">رسائل الشهر</p>
        </div>

        <div className="glass-card bg-gradient-to-br from-amber-50 to-amber-100 text-center">
          <div className="text-4xl font-bold text-amber-600">{statistics.active_teachers_count}</div>
          <p className="mt-2 text-sm font-semibold text-amber-900">معلمين نشطين</p>
        </div>
      </div>

      {/* Settings Card */}
      <div className="glass-card space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditingSettings(!editingSettings)}
            className="text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            {editingSettings ? 'إلغاء' : 'تعديل الإعدادات'}
          </button>
          <h2 className="text-xl font-semibold text-slate-900">إعدادات النظام</h2>
        </div>

        {editingSettings ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              updateSettingsMutation.mutate({
                is_enabled: formData.get('is_enabled') === 'on',
                daily_limit_per_teacher: Number(formData.get('daily_limit')),
                allowed_start_hour: Number(formData.get('start_hour')),
                allowed_end_hour: Number(formData.get('end_hour')),
              })
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  name="is_enabled"
                  defaultChecked={settings.is_enabled}
                  className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1 text-right">
                  <p className="font-semibold text-slate-900">تفعيل الميزة</p>
                  <p className="text-xs text-muted">السماح للمعلمين بإرسال الرسائل</p>
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-right text-sm font-semibold text-slate-900">
                  الحد اليومي لكل معلم
                </label>
                <input
                  type="number"
                  name="daily_limit"
                  defaultValue={settings.daily_limit_per_teacher}
                  min="1"
                  max="100"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-right text-sm font-semibold text-slate-900">
                  بداية الوقت المسموح
                </label>
                <input
                  type="number"
                  name="start_hour"
                  defaultValue={settings.allowed_start_hour}
                  min="0"
                  max="23"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-right text-sm font-semibold text-slate-900">
                  نهاية الوقت المسموح
                </label>
                <input
                  type="number"
                  name="end_hour"
                  defaultValue={settings.allowed_end_hour}
                  min="0"
                  max="23"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="button-primary w-full disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={clsx('rounded-xl border p-4 text-center', settings.is_enabled ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
              <p className="text-2xl font-bold">{settings.is_enabled ? 'مفعّل' : 'معطّل'}</p>
              <p className="text-sm text-muted">حالة النظام</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{settings.daily_limit_per_teacher}</p>
              <p className="text-sm text-muted">رسائل يومياً / معلم</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{settings.allowed_start_hour}:00</p>
              <p className="text-sm text-muted">بداية الوقت</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{settings.allowed_end_hour}:00</p>
              <p className="text-sm text-muted">نهاية الوقت</p>
            </div>
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="glass-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">
            <span className="font-semibold text-slate-900">{templates.length}</span> قالب مسجل •{' '}
            <span className="font-semibold text-emerald-600">{templates.filter(t => t.is_active).length}</span> مفعّل
          </div>
          <h2 className="text-xl font-semibold text-slate-900">قوالب الرسائل المتاحة</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={clsx(
                'group relative rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg',
                template.is_active 
                  ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' 
                  : 'border-slate-200 bg-slate-50 opacity-60 hover:opacity-80'
              )}
            >
              <div className="space-y-3 text-right">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(template)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition hover:bg-teal-50 hover:text-teal-700"
                  >
                    ✏️ تعديل
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-5xl drop-shadow-sm">{template.icon}</div>
                    <div className={clsx(
                      'mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-sm',
                      template.is_active 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-300 text-slate-700'
                    )}>
                      {template.is_active ? '✓ مفعّل' : '✕ معطّل'}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">{template.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{template.content}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted">
                  <span>الترتيب: {template.sort_order}</span>
                  <span className="font-mono">{template.template_key}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                updateTemplateMutation.mutate({
                  ...editingTemplate,
                  title: formData.get('title') as string,
                  icon: formData.get('icon') as string,
                  content: formData.get('content') as string,
                  is_active: formData.get('is_active') === 'on',
                })
              }}
              className="space-y-4 text-right"
            >
              <h2 className="text-2xl font-bold text-slate-900">تعديل القالب</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-900">العنوان</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingTemplate.title}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">الأيقونة (Emoji)</label>
                <input
                  type="text"
                  name="icon"
                  defaultValue={editingTemplate.icon}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-3xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">محتوى الرسالة</label>
                <textarea
                  name="content"
                  defaultValue={editingTemplate.content}
                  required
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editingTemplate.is_active}
                  className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-semibold text-slate-900">تفعيل هذا القالب</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="button-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateTemplateMutation.isPending}
                  className="button-primary flex-1 disabled:opacity-50"
                >
                  {updateTemplateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
