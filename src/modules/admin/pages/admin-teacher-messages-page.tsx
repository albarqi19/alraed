import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CalendarRange,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react'
import { apiClient } from '@/services/api/client'
import { fetchTeacherMessagesByPeriod } from '../api'
import { TeacherMessagesModal } from '../components/teacher-messages-modal'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
  WsSwitch,
  WsTextarea,
} from '@/shared/workspace'

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
  ai_review_enabled: boolean
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

/** صف إعداد بمفتاح checkbox داخل نموذج FormData */
function SettingCheckboxRow({
  name,
  defaultChecked,
  title,
  sub,
}: {
  name: string
  defaultChecked: boolean
  title: string
  sub: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderRadius: 8,
        border: '1px solid var(--ws-hairline)',
        padding: '9px 12px',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        style={{ width: 15, height: 15, accentColor: 'var(--ws-accent-2)', flexShrink: 0 }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>{sub}</span>
      </span>
    </label>
  )
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
    ai_review_enabled: true,
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

  const isLoadingCore = templatesLoading || settingsLoading

  const pulseStats: Array<{ period: 'today' | 'week' | 'month' | 'active'; title: string; value: number; icon: typeof CalendarDays }> = [
    { period: 'today', title: 'رسائل اليوم', value: statistics.total_sent_today, icon: CalendarDays },
    { period: 'week', title: 'رسائل الأسبوع', value: statistics.total_sent_this_week, icon: CalendarRange },
    { period: 'month', title: 'رسائل الشهر', value: statistics.total_sent_this_month, icon: MessageSquare },
    { period: 'active', title: 'معلمون نشطون', value: statistics.active_teachers_count, icon: Users },
  ]

  const filteredOverrides = (() => {
    const search = overridesSearch.trim().toLowerCase()
    const all = overridesData?.teachers ?? []
    return all
      .filter(t => overridesShowAll || t.has_override)
      .filter(t => {
        if (!search) return true
        return (
          t.teacher_name.toLowerCase().includes(search) ||
          (t.teacher_national_id ?? '').toLowerCase().includes(search)
        )
      })
  })()

  return (
    <WsPage>
      <WsHeader
        title="إدارة رسائل المعلمين"
        badge="قناة المعلم ← ولي الأمر"
        actions={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>
              {toggleSystemMutation.isPending ? 'جاري التحديث...' : settings.is_enabled ? 'النظام مفعّل' : 'النظام معطّل'}
            </span>
            <WsSwitch
              checked={settings.is_enabled}
              onChange={(next) => toggleSystemMutation.mutate(next)}
              disabled={toggleSystemMutation.isPending}
            />
          </div>
        }
        facts={
          <>
            <WsFact icon={MessageSquare} label="اليوم:">
              {statistics.total_sent_today}
            </WsFact>
            <WsFact label="الأسبوع:">{statistics.total_sent_this_week}</WsFact>
            <WsFact label="الشهر:">{statistics.total_sent_this_month}</WsFact>
            <WsFact icon={Users} label="نشطون:">
              {statistics.active_teachers_count}
            </WsFact>
          </>
        }
      >
        {settings.is_enabled ? (
          <WsChip tone="green">
            <span className="ws-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ws-green)' }} />
            يستقبل الرسائل
          </WsChip>
        ) : (
          <WsChip tone="red">القناة موقوفة</WsChip>
        )}
        {settings.ai_review_enabled && <WsChip tone="sky" icon={ShieldCheck}>مراجعة ذكية</WsChip>}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: نبض القناة */}
        <WsSideCol title="نبض القناة" icon={MessageSquare} side="start" width={250} storageKey="ws:teacher-messages:pulse">
          <WsBlock fill scroll>
            <div>
              {pulseStats.map(({ period, title, value, icon: Icon }) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => handleCardClick(period, title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    textAlign: 'right',
                    padding: '11px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--ws-hairline)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: 'var(--ws-accent-soft)',
                      color: 'var(--ws-accent-2)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 15, height: 15 }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>{title}</span>
                    <span className="ws-cell-sub">انقر للتفاصيل</span>
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ws-accent-2)' }}>
                    {value.toLocaleString('ar-SA')}
                  </span>
                </button>
              ))}
            </div>
          </WsBlock>
        </WsSideCol>

        {/* الوسط: الإعدادات + القوالب */}
        <WsMain>
          {isLoadingCore ? (
            <WsBlock fill>
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            </WsBlock>
          ) : (
            <>
              {/* الإعدادات */}
              <WsBlock
                title="إعدادات النظام"
                icon={Settings2}
                tools={
                  <WsBtn size="sm" onClick={() => setEditingSettings(!editingSettings)}>
                    {editingSettings ? 'إلغاء' : 'تعديل الإعدادات'}
                  </WsBtn>
                }
              >
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
                        ai_review_enabled: formData.get('ai_review_enabled') === 'on',
                      })
                    }}
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <SettingCheckboxRow
                        name="is_enabled"
                        defaultChecked={settings.is_enabled}
                        title="تفعيل الميزة"
                        sub="السماح للمعلمين بإرسال الرسائل"
                      />
                      <WsField label="الحد اليومي العام لكل معلم" htmlFor="tm-daily-limit">
                        <WsInput id="tm-daily-limit" type="number" name="daily_limit" defaultValue={settings.daily_limit_per_teacher} min="1" max="500" />
                        <span style={{ fontSize: 9.5, color: 'var(--ws-amber)', lineHeight: 1.7 }}>
                          ⚠️ يطبّق على الجميع افتراضياً — الأرقام العالية قد تعرّض رقم المدرسة للتقييد من واتساب.
                        </span>
                      </WsField>
                      <WsField label="بداية الوقت المسموح" htmlFor="tm-start-hour">
                        <WsInput id="tm-start-hour" type="number" name="start_hour" defaultValue={settings.allowed_start_hour} min="0" max="23" />
                      </WsField>
                      <WsField label="نهاية الوقت المسموح" htmlFor="tm-end-hour">
                        <WsInput id="tm-end-hour" type="number" name="end_hour" defaultValue={settings.allowed_end_hour} min="0" max="23" />
                      </WsField>
                      <SettingCheckboxRow
                        name="enable_replies"
                        defaultChecked={settings.enable_replies}
                        title="تفعيل ردود أولياء الأمور"
                        sub="إضافة رابط رد سحري للرسائل"
                      />
                      <WsField label="صلاحية رابط الرد (أيام)" htmlFor="tm-expiry">
                        <WsInput id="tm-expiry" type="number" name="reply_expiry_days" defaultValue={settings.reply_expiry_days} min="1" max="30" />
                      </WsField>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <SettingCheckboxRow
                          name="allow_custom_messages"
                          defaultChecked={settings.allow_custom_messages}
                          title="السماح بالرسائل المخصصة"
                          sub="يتيح للمعلمين كتابة رسائل خاصة بدلاً من القوالب الجاهزة"
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <SettingCheckboxRow
                          name="ai_review_enabled"
                          defaultChecked={settings.ai_review_enabled}
                          title="🛡️ المراجعة الذكية للرسائل المخصصة"
                          sub="تفحص الرسائل المخصصة قبل الإرسال: تُمرّر النظيفة كما هي، وتُهذّب المخالفة تلقائياً (إخفاء أسماء الطلاب، تلطيف الألفاظ، تحسين النبرة). لا تتأثر القوالب الجاهزة."
                        />
                      </div>
                    </div>
                    <WsBtn type="submit" variant="primary" disabled={updateSettingsMutation.isPending} style={{ justifyContent: 'center' }}>
                      {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </WsBtn>
                  </form>
                ) : (
                  <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
                    {[
                      { label: 'حالة النظام', value: settings.is_enabled ? 'مفعّل' : 'معطّل', tone: settings.is_enabled ? 'var(--ws-green)' : 'var(--ws-red)' },
                      { label: 'رسائل يومياً / معلم', value: String(settings.daily_limit_per_teacher), tone: 'var(--ws-text)' },
                      { label: 'الوقت المسموح', value: `${settings.allowed_start_hour}:00 — ${settings.allowed_end_hour}:00`, tone: 'var(--ws-text)' },
                      { label: 'ردود أولياء الأمور', value: settings.enable_replies ? 'مفعّلة' : 'معطّلة', tone: settings.enable_replies ? 'var(--ws-green)' : 'var(--ws-text-2)' },
                      { label: 'صلاحية رابط الرد', value: `${settings.reply_expiry_days} أيام`, tone: 'var(--ws-text)' },
                      { label: 'الرسائل المخصصة', value: settings.allow_custom_messages ? 'مسموحة' : 'ممنوعة', tone: settings.allow_custom_messages ? 'var(--ws-green)' : 'var(--ws-text-2)' },
                      { label: '🛡️ المراجعة الذكية', value: settings.ai_review_enabled ? 'مفعّلة' : 'معطّلة', tone: settings.ai_review_enabled ? 'var(--ws-sky)' : 'var(--ws-text-2)' },
                    ].map(({ label, value, tone }) => (
                      <div key={label} style={{ borderRadius: 8, border: '1px solid var(--ws-hairline)', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: tone }}>{value}</div>
                        <div style={{ fontSize: 10, color: 'var(--ws-text-2)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </WsBlock>

              {/* القوالب */}
              <WsBlock
                title="قوالب الرسائل المتاحة"
                icon={FileText}
                count={`${templates.length} • ${templates.filter(t => t.is_active).length} مفعّل`}
                tools={
                  <WsBtn size="sm" variant="primary" icon={Plus} onClick={() => setCreatingTemplate(true)}>
                    قالب جديد
                  </WsBtn>
                }
                fill
                scroll
              >
                {templates.length === 0 ? (
                  <WsEmpty icon={FileText}>لا توجد قوالب بعد — أضف أول قالب لرسائل المعلمين.</WsEmpty>
                ) : (
                  <div>
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--ws-hairline)',
                          opacity: template.is_active ? 1 : 0.55,
                        }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'var(--ws-surface-2)',
                            fontSize: 19,
                            flexShrink: 0,
                          }}
                        >
                          {template.icon}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{template.title}</span>
                            <WsChip tone={template.is_active ? 'green' : undefined}>
                              {template.is_active ? 'مفعّل' : 'معطّل'}
                            </WsChip>
                            <span className="ws-cell-sub">#{template.sort_order} • {template.template_key}</span>
                          </span>
                          <span
                            className="ws-cell-sub"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              marginTop: 3,
                              lineHeight: 1.7,
                            }}
                          >
                            {template.content}
                          </span>
                        </span>
                        <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                          <WsBtn size="sm" icon={Pencil} onClick={() => setEditingTemplate(template)}>
                            تعديل
                          </WsBtn>
                          <WsBtn
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={() => {
                              if (confirm(`هل تريد حذف قالب "${template.title}"؟\n\nملاحظة: الرسائل المرسلة سابقاً تبقى محفوظة في السجل.`)) {
                                deleteTemplateMutation.mutate(template.id)
                              }
                            }}
                            disabled={deleteTemplateMutation.isPending}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </WsBlock>
            </>
          )}
        </WsMain>

        {/* العمود الأيسر: الحدود الخاصة */}
        <WsSideCol title="حدود خاصة للمعلمين" icon={SlidersHorizontal} width={310} storageKey="ws:teacher-messages:overrides">
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
              type="text"
              value={overridesSearch}
              onChange={(e) => setOverridesSearch(e.target.value)}
              placeholder="ابحث باسم المعلم أو الهوية..."
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                الحد العام: <b style={{ color: 'var(--ws-text)' }}>{overridesData?.general_limit ?? settings.daily_limit_per_teacher}</b>/يوم
                {' • '}
                <b style={{ color: 'var(--ws-amber)' }}>{overridesData?.teachers.filter(t => t.has_override).length ?? 0}</b> بحد خاص
              </span>
              <WsChip tone={overridesShowAll ? 'sky' : undefined} onClick={() => setOverridesShowAll(!overridesShowAll)}>
                {overridesShowAll ? 'الكل' : 'الخاص فقط'}
              </WsChip>
            </div>
          </div>

          <WsBlock fill scroll>
            {overridesLoading ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : filteredOverrides.length === 0 ? (
              <WsEmpty icon={SlidersHorizontal}>
                {overridesShowAll
                  ? 'لا يوجد معلمون مطابقون للبحث.'
                  : 'لا حدود خاصة حالياً — اعرض «الكل» لتعيين حد خاص لمعلم.'}
              </WsEmpty>
            ) : (
              <div>
                {filteredOverrides.map((t) => (
                  <div
                    key={t.teacher_id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                      background: t.has_override ? 'var(--ws-amber-bg)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>{t.teacher_name}</span>
                      <WsChip tone={t.has_override ? 'amber' : undefined}>
                        {t.effective_limit} رسالة{t.has_override ? ' • خاص' : ''}
                      </WsChip>
                    </div>
                    {t.teacher_national_id && (
                      <span className="ws-cell-sub" style={{ display: 'block', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                        {t.teacher_national_id}
                      </span>
                    )}
                    {t.note && (
                      <span className="ws-cell-sub" style={{ display: 'block', color: 'var(--ws-amber)' }}>📝 {t.note}</span>
                    )}
                    <span style={{ display: 'inline-flex', gap: 4, marginTop: 5 }}>
                      <WsBtn size="sm" onClick={() => setEditingOverride(t)}>
                        {t.has_override ? 'تعديل الحد' : 'تعيين حد خاص'}
                      </WsBtn>
                      {t.has_override && (
                        <WsBtn
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`هل تريد حذف الحد الخاص للمعلم "${t.teacher_name}" والعودة للحد العام؟`)) {
                              deleteOverrideMutation.mutate(t.teacher_id)
                            }
                          }}
                          disabled={deleteOverrideMutation.isPending}
                        >
                          حذف
                        </WsBtn>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* مودال الحد الخاص */}
      {editingOverride && (
        <div className="ws-modal" onClick={() => setEditingOverride(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
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
            >
              <header className="ws-modal__head">
                <h3 className="ws-modal__title">
                  {editingOverride.has_override ? 'تعديل الحد الخاص' : 'تعيين حد خاص'}
                </h3>
              </header>
              <div className="ws-modal__body">
                <WsFactsList>
                  <WsFactRow label="المعلم">{editingOverride.teacher_name}</WsFactRow>
                  {editingOverride.teacher_national_id && (
                    <WsFactRow label="الهوية">{editingOverride.teacher_national_id}</WsFactRow>
                  )}
                  <WsFactRow label="الحد العام الحالي">{overridesData?.general_limit} رسالة/يوم</WsFactRow>
                </WsFactsList>

                <WsField label="الحد اليومي الخاص" htmlFor="override-limit">
                  <WsInput
                    id="override-limit"
                    type="number"
                    name="daily_limit"
                    defaultValue={editingOverride.override_limit ?? editingOverride.effective_limit}
                    required
                    min="1"
                    max="500"
                    style={{ textAlign: 'center', fontWeight: 800, fontSize: 15 }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                    عدد الرسائل التي يستطيع هذا المعلم إرسالها يومياً (يلغي الحد العام).
                  </span>
                </WsField>

                <WsField label="ملاحظة (اختياري)" htmlFor="override-note">
                  <WsInput
                    id="override-note"
                    type="text"
                    name="note"
                    defaultValue={editingOverride.note ?? ''}
                    maxLength={255}
                    placeholder="مثلاً: مرشد طلابي يحتاج حد أعلى"
                  />
                </WsField>

                {upsertOverrideMutation.isError && (
                  <span style={{ fontSize: 11, color: 'var(--ws-red)' }}>حدث خطأ أثناء الحفظ. حاول مرة أخرى.</span>
                )}
              </div>
              <footer className="ws-modal__foot">
                <WsBtn onClick={() => setEditingOverride(null)}>إلغاء</WsBtn>
                <WsBtn type="submit" variant="primary" disabled={upsertOverrideMutation.isPending}>
                  {upsertOverrideMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* مودال تعديل القالب */}
      {editingTemplate && (
        <div className="ws-modal" onClick={() => setEditingTemplate(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
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
            >
              <header className="ws-modal__head">
                <h3 className="ws-modal__title">تعديل القالب</h3>
              </header>
              <div className="ws-modal__body">
                <WsField label="العنوان" htmlFor="edit-template-title">
                  <WsInput id="edit-template-title" type="text" name="title" defaultValue={editingTemplate.title} required />
                </WsField>
                <WsField label="الأيقونة (Emoji)" htmlFor="edit-template-icon">
                  <WsInput
                    id="edit-template-icon"
                    type="text"
                    name="icon"
                    defaultValue={editingTemplate.icon}
                    required
                    style={{ textAlign: 'center', fontSize: 20 }}
                  />
                </WsField>
                <WsField label="محتوى الرسالة" htmlFor="edit-template-content">
                  <WsTextarea id="edit-template-content" name="content" defaultValue={editingTemplate.content} required rows={4} />
                </WsField>
                <SettingCheckboxRow
                  name="is_active"
                  defaultChecked={editingTemplate.is_active}
                  title="تفعيل هذا القالب"
                  sub="يظهر للمعلمين كخيار إرسال سريع"
                />
              </div>
              <footer className="ws-modal__foot">
                <WsBtn onClick={() => setEditingTemplate(null)}>إلغاء</WsBtn>
                <WsBtn type="submit" variant="primary" disabled={updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* مودال إنشاء قالب */}
      {creatingTemplate && (
        <div className="ws-modal" onClick={() => setCreatingTemplate(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
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
            >
              <header className="ws-modal__head">
                <h3 className="ws-modal__title">قالب جديد</h3>
                <p className="ws-modal__sub">سيُضاف هذا القالب لمدرستك فقط، ولن يظهر في المدارس الأخرى.</p>
              </header>
              <div className="ws-modal__body">
                <WsField label="العنوان" htmlFor="create-template-title">
                  <WsInput
                    id="create-template-title"
                    type="text"
                    name="title"
                    required
                    maxLength={255}
                    placeholder="مثلاً: تنبيه سلوكي"
                    autoFocus
                  />
                </WsField>
                <WsField label="الأيقونة (Emoji)" htmlFor="create-template-icon">
                  <WsInput
                    id="create-template-icon"
                    type="text"
                    name="icon"
                    required
                    maxLength={10}
                    defaultValue="📌"
                    style={{ textAlign: 'center', fontSize: 20 }}
                  />
                </WsField>
                <WsField label="محتوى الرسالة" htmlFor="create-template-content">
                  <WsTextarea
                    id="create-template-content"
                    name="content"
                    required
                    rows={4}
                    placeholder="اكتب نص الرسالة الذي سيظهر لولي الأمر..."
                  />
                </WsField>
                <SettingCheckboxRow
                  name="is_active"
                  defaultChecked
                  title="تفعيل القالب فور إنشائه"
                  sub="يظهر للمعلمين مباشرة بعد الحفظ"
                />
                {createTemplateMutation.isError && (
                  <span style={{ fontSize: 11, color: 'var(--ws-red)' }}>حدث خطأ أثناء الحفظ. حاول مرة أخرى.</span>
                )}
              </div>
              <footer className="ws-modal__foot">
                <WsBtn onClick={() => setCreatingTemplate(false)}>إلغاء</WsBtn>
                <WsBtn type="submit" variant="primary" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? 'جاري الإضافة...' : 'إضافة القالب'}
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* مودال رسائل الفترة */}
      {modalState && (
        <>
          {modalLoading ? (
            <div className="ws-modal">
              <div className="ws-modal__panel" style={{ maxWidth: 320 }}>
                <div className="ws-modal__body">
                  <WsEmpty loading>جاري تحميل البيانات...</WsEmpty>
                </div>
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
    </WsPage>
  )
}
