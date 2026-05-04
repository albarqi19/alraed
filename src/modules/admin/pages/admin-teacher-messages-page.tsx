import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { fetchTeacherMessagesByPeriod } from '../api'
import { TeacherMessagesModal } from '../components/teacher-messages-modal'
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
  enable_replies: boolean
  reply_expiry_days: number
  allow_custom_messages: boolean
}

interface TeacherOverrideRow {
  teacher_id: number
  teacher_name: string
  teacher_national_id: string | null
  has_override: boolean
  effective_limit: number
  override_limit: number | null
  note: string | null
}

interface TeacherOverridesResponse {
  success: boolean
  general_limit: number
  teachers: TeacherOverrideRow[]
}

export function AdminTeacherMessagesPage() {
  const queryClient = useQueryClient()
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)
  const [overridesSearch, setOverridesSearch] = useState('')
  const [overridesShowAll, setOverridesShowAll] = useState(false)
  const [editingOverride, setEditingOverride] = useState<TeacherOverrideRow | null>(null)
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    period: 'today' | 'week' | 'month' | 'active'
    title: string
  } | null>(null)

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

  // Fetch detailed messages when modal is opened
  const { data: modalData, isLoading: modalLoading } = useQuery({
    queryKey: ['admin', 'teacher-messages-by-period', modalState?.period],
    queryFn: () => fetchTeacherMessagesByPeriod(modalState!.period),
    enabled: modalState !== null,
  })

  const handleCardClick = (period: 'today' | 'week' | 'month' | 'active', title: string) => {
    setModalState({ isOpen: true, period, title })
  }

  const handleCloseModal = () => {
    setModalState(null)
  }

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

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: { title: string; icon: string; content: string; color?: string; is_active?: boolean }) => {
      const response = await apiClient.post('/admin/teacher-messages/templates', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-templates'] })
      setCreatingTemplate(false)
    },
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/admin/teacher-messages/templates/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-templates'] })
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

  // Fetch teachers with override info
  const { data: overridesData, isLoading: overridesLoading } = useQuery<TeacherOverridesResponse>({
    queryKey: ['admin', 'teacher-message-overrides'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/teacher-messages/teacher-overrides')
      return response.data
    },
  })

  // Upsert override mutation
  const upsertOverrideMutation = useMutation({
    mutationFn: async (payload: { teacher_id: number; daily_limit: number; note?: string | null }) => {
      const response = await apiClient.post('/admin/teacher-messages/teacher-overrides', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-overrides'] })
      setEditingOverride(null)
    },
  })

  // Delete override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const response = await apiClient.delete(`/admin/teacher-messages/teacher-overrides/${teacherId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-message-overrides'] })
    },
  })

  const templates: MessageTemplate[] = templatesData?.templates || []
  const settings: MessageSettings = settingsData?.settings || {
    id: 1,
    is_enabled: true,
    daily_limit_per_teacher: 10,
    allowed_start_hour: 7,
    allowed_end_hour: 11,
    enable_replies: false,
    reply_expiry_days: 3,
    allow_custom_messages: false,
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
        <button
          type="button"
          onClick={() => handleCardClick('today', 'رسائل اليوم')}
          className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 text-center transition-all duration-300 hover:scale-105 hover:border-blue-400 hover:shadow-2xl cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-200/50 blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="text-5xl font-extrabold text-blue-600">{statistics.total_sent_today}</div>
            <p className="mt-3 text-sm font-bold text-blue-900">رسائل اليوم</p>
            <p className="mt-2 text-xs font-semibold text-blue-700">انقر للتفاصيل</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('week', 'رسائل الأسبوع')}
          className="group relative overflow-hidden rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 text-center transition-all duration-300 hover:scale-105 hover:border-purple-400 hover:shadow-2xl cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-200/50 blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="text-5xl font-extrabold text-purple-600">{statistics.total_sent_this_week}</div>
            <p className="mt-3 text-sm font-bold text-purple-900">رسائل الأسبوع</p>
            <p className="mt-2 text-xs font-semibold text-purple-700">انقر للتفاصيل</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('month', 'رسائل الشهر')}
          className="group relative overflow-hidden rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 p-6 text-center transition-all duration-300 hover:scale-105 hover:border-teal-400 hover:shadow-2xl cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-teal-200/50 blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="text-5xl font-extrabold text-teal-600">{statistics.total_sent_this_month}</div>
            <p className="mt-3 text-sm font-bold text-teal-900">رسائل الشهر</p>
            <p className="mt-2 text-xs font-semibold text-teal-700">انقر للتفاصيل</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleCardClick('active', 'المعلمين النشطين')}
          className="group relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-6 text-center transition-all duration-300 hover:scale-105 hover:border-amber-400 hover:shadow-2xl cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/50 blur-2xl transition-all group-hover:scale-150" />
          <div className="relative">
            <div className="text-5xl font-extrabold text-amber-600">{statistics.active_teachers_count}</div>
            <p className="mt-3 text-sm font-bold text-amber-900">معلمين نشطين</p>
            <p className="mt-2 text-xs font-semibold text-amber-700">انقر للتفاصيل</p>
          </div>
        </button>
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
                enable_replies: formData.get('enable_replies') === 'on',
                reply_expiry_days: Number(formData.get('reply_expiry_days')),
                allow_custom_messages: formData.get('allow_custom_messages') === 'on',
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

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <label className="block text-right text-sm font-semibold text-slate-900">
                  الحد اليومي العام لكل معلم
                </label>
                <input
                  type="number"
                  name="daily_limit"
                  defaultValue={settings.daily_limit_per_teacher}
                  min="1"
                  max="500"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
                <p className="text-xs text-amber-700 mt-2 text-right">
                  ⚠️ هذا الحد يطبّق على جميع المعلمين افتراضياً. يمكن تخصيص حد أعلى لمعلمين محددين من قسم "حدود خاصة للمعلمين" أدناه. تنبه: الأرقام العالية قد تعرّض رقم المدرسة لخطر التقييد من واتساب.
                </p>
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

              <label className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <input
                  type="checkbox"
                  name="enable_replies"
                  defaultChecked={settings.enable_replies}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 text-right">
                  <p className="font-semibold text-slate-900">تفعيل ردود أولياء الأمور</p>
                  <p className="text-xs text-muted">إضافة رابط رد سحري للرسائل</p>
                </div>
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-right text-sm font-semibold text-slate-900">
                  صلاحية رابط الرد (أيام)
                </label>
                <input
                  type="number"
                  name="reply_expiry_days"
                  defaultValue={settings.reply_expiry_days}
                  min="1"
                  max="30"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  name="allow_custom_messages"
                  defaultChecked={settings.allow_custom_messages}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 text-right">
                  <p className="font-semibold text-slate-900">السماح بالرسائل المخصصة</p>
                  <p className="text-xs text-muted">يتيح للمعلمين كتابة رسائل خاصة بدلاً من القوالب الجاهزة</p>
                </div>
              </label>
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

            <div className={clsx('rounded-xl border p-4 text-center', settings.enable_replies ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
              <p className="text-2xl font-bold">{settings.enable_replies ? 'مفعّل' : 'معطّل'}</p>
              <p className="text-sm text-muted">ردود أولياء الأمور</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{settings.reply_expiry_days} أيام</p>
              <p className="text-sm text-muted">صلاحية الرابط</p>
            </div>

            <div className={clsx('rounded-xl border p-4 text-center', settings.allow_custom_messages ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50')}>
              <p className="text-2xl font-bold">{settings.allow_custom_messages ? 'مفعّل' : 'معطّل'}</p>
              <p className="text-sm text-muted">الرسائل المخصصة</p>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Overrides */}
      <div className="glass-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            الحد العام: <span className="font-semibold text-slate-900">{overridesData?.general_limit ?? settings.daily_limit_per_teacher}</span> رسالة/يوم
            {' • '}
            <span className="font-semibold text-amber-600">
              {overridesData?.teachers.filter(t => t.has_override).length ?? 0}
            </span>
            {' '}معلم بحد خاص
          </div>
          <h2 className="text-xl font-semibold text-slate-900">حدود خاصة للمعلمين</h2>
        </div>

        <p className="text-xs text-muted text-right">
          يمكنك زيادة (أو تقليل) الحد اليومي لمعلمين محددين دون التأثير على الباقي. عند حذف الحد الخاص، يعود المعلم تلقائياً للحد العام.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={overridesSearch}
            onChange={(e) => setOverridesSearch(e.target.value)}
            placeholder="ابحث باسم المعلم أو الهوية..."
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-right"
          />
          <button
            type="button"
            onClick={() => setOverridesShowAll(!overridesShowAll)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {overridesShowAll ? 'عرض الذين لديهم حد خاص فقط' : 'عرض كل المعلمين'}
          </button>
        </div>

        {overridesLoading ? (
          <div className="text-center py-6 text-sm text-muted">جاري التحميل...</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">المعلم</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">الهوية</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">الحد الفعلي</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">الحالة</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {(() => {
                  const search = overridesSearch.trim().toLowerCase()
                  const all = overridesData?.teachers ?? []
                  const filtered = all
                    .filter(t => overridesShowAll || t.has_override)
                    .filter(t => {
                      if (!search) return true
                      return (
                        t.teacher_name.toLowerCase().includes(search) ||
                        (t.teacher_national_id ?? '').toLowerCase().includes(search)
                      )
                    })

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted">
                          {overridesShowAll
                            ? 'لا يوجد معلمون مطابقون للبحث.'
                            : 'لا يوجد معلمون لديهم حد خاص حالياً. اضغط "عرض كل المعلمين" لتعيين حد خاص.'}
                        </td>
                      </tr>
                    )
                  }

                  return filtered.map((t) => (
                    <tr key={t.teacher_id} className={t.has_override ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{t.teacher_name}</p>
                        {t.note && (
                          <p className="mt-0.5 text-xs text-amber-700">📝 {t.note}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{t.teacher_national_id ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('font-bold', t.has_override ? 'text-amber-700' : 'text-slate-900')}>
                          {t.effective_limit}
                        </span>
                        <span className="text-xs text-muted"> رسالة</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.has_override ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            حد خاص
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            الحد العام
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingOverride(t)}
                            className="rounded-md border border-teal-300 bg-white px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                          >
                            {t.has_override ? 'تعديل الحد' : 'تعيين حد خاص'}
                          </button>
                          {t.has_override && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل تريد حذف الحد الخاص للمعلم "${t.teacher_name}" والعودة للحد العام؟`)) {
                                  deleteOverrideMutation.mutate(t.teacher_id)
                                }
                              }}
                              disabled={deleteOverrideMutation.isPending}
                              className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Override Modal */}
      {editingOverride && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setEditingOverride(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                upsertOverrideMutation.mutate({
                  teacher_id: editingOverride.teacher_id,
                  daily_limit: Number(formData.get('daily_limit')),
                  note: (formData.get('note') as string) || null,
                })
              }}
              className="space-y-4 text-right"
            >
              <h2 className="text-2xl font-bold text-slate-900">
                {editingOverride.has_override ? 'تعديل الحد الخاص' : 'تعيين حد خاص'}
              </h2>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">{editingOverride.teacher_name}</p>
                {editingOverride.teacher_national_id && (
                  <p className="text-xs text-muted font-mono">{editingOverride.teacher_national_id}</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  الحد العام الحالي: <span className="font-semibold">{overridesData?.general_limit}</span> رسالة/يوم
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">الحد اليومي الخاص</label>
                <input
                  type="number"
                  name="daily_limit"
                  defaultValue={editingOverride.override_limit ?? editingOverride.effective_limit}
                  required
                  min="1"
                  max="500"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-lg font-bold"
                />
                <p className="mt-1 text-xs text-muted">عدد الرسائل التي يستطيع هذا المعلم إرسالها يومياً (يلغي الحد العام).</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  name="note"
                  defaultValue={editingOverride.note ?? ''}
                  maxLength={255}
                  placeholder="مثلاً: مرشد طلابي يحتاج حد أعلى"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              {upsertOverrideMutation.isError && (
                <p className="text-sm text-rose-600">حدث خطأ أثناء الحفظ. حاول مرة أخرى.</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingOverride(null)}
                  className="button-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={upsertOverrideMutation.isPending}
                  className="button-primary flex-1 disabled:opacity-50"
                >
                  {upsertOverrideMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="glass-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreatingTemplate(true)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              ➕ قالب جديد
            </button>
            <div className="text-sm text-muted">
              <span className="font-semibold text-slate-900">{templates.length}</span> قالب •{' '}
              <span className="font-semibold text-emerald-600">{templates.filter(t => t.is_active).length}</span> مفعّل
            </div>
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
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(template)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition hover:bg-teal-50 hover:text-teal-700"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل تريد حذف قالب "${template.title}"؟\n\nملاحظة: الرسائل المرسلة سابقاً تبقى محفوظة في السجل.`)) {
                          deleteTemplateMutation.mutate(template.id)
                        }
                      }}
                      disabled={deleteTemplateMutation.isPending}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      🗑️ حذف
                    </button>
                  </div>
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

      {/* Create Template Modal */}
      {creatingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setCreatingTemplate(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                createTemplateMutation.mutate({
                  title: formData.get('title') as string,
                  icon: formData.get('icon') as string,
                  content: formData.get('content') as string,
                  is_active: formData.get('is_active') === 'on',
                })
              }}
              className="space-y-4 text-right"
            >
              <h2 className="text-2xl font-bold text-slate-900">قالب جديد</h2>
              <p className="text-xs text-muted">سيُضاف هذا القالب لمدرستك فقط، ولن يظهر في المدارس الأخرى.</p>

              <div>
                <label className="block text-sm font-semibold text-slate-900">العنوان</label>
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={255}
                  placeholder="مثلاً: تنبيه سلوكي"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">الأيقونة (Emoji)</label>
                <input
                  type="text"
                  name="icon"
                  required
                  maxLength={10}
                  defaultValue="📌"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-3xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">محتوى الرسالة</label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  placeholder="اكتب نص الرسالة الذي سيظهر لولي الأمر..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked
                  className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-semibold text-slate-900">تفعيل القالب فور إنشائه</span>
              </label>

              {createTemplateMutation.isError && (
                <p className="text-sm text-rose-600">حدث خطأ أثناء الحفظ. حاول مرة أخرى.</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreatingTemplate(false)}
                  className="button-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending}
                  className="button-primary flex-1 disabled:opacity-50"
                >
                  {createTemplateMutation.isPending ? 'جاري الإضافة...' : 'إضافة القالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Messages Modal */}
      {modalState && (
        <>
          {modalLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
                <p className="mt-4 text-lg font-semibold text-slate-900">جاري تحميل البيانات...</p>
              </div>
            </div>
          ) : (
            <TeacherMessagesModal
              isOpen={true}
              onClose={handleCloseModal}
              data={modalData || null}
              title={modalState.title}
            />
          )}
        </>
      )}
    </section>
  )
}
