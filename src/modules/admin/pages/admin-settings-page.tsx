import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeftRight,
  BellOff,
  Globe,
  MessageSquare,
  Phone,
  RotateCcw,
  Save,
  School,
  Settings2,
  Snowflake,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
  type Tone,
} from '@/shared/workspace'
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from '../hooks'
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

const INSTANCE_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  connected: { label: 'متصل', tone: TONES.green },
  connecting: { label: 'جاري الاتصال', tone: TONES.amber },
  disconnected: { label: 'غير متصل', tone: TONES.red },
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

  /* ── مشتقات العرض ── */
  const connectedInstance = instances.find((i) => i.status === 'connected')
  const whatsappState = connectedInstance
    ? INSTANCE_STATUS_META.connected
    : instances.some((i) => i.status === 'connecting')
      ? INSTANCE_STATUS_META.connecting
      : INSTANCE_STATUS_META.disconnected
  const lastConnected = instances
    .map((i) => i.last_connected_at)
    .filter(Boolean)
    .sort()
    .pop()

  const nameDirty = (originalSettings?.school_name ?? '') !== form.school_name
  const phoneDirty = (originalSettings?.school_phone ?? '') !== form.school_phone

  return (
    <WsPage>
      <WsHeader
        title="الإعدادات العامة"
        /* الشارة القديمة كانت تقول «الإعدادات محدثة» بمجرد نجاح التحميل — حتى والنموذج متسخ */
        badge={isDirty ? <span style={{ color: TONES.amber.tx }}>تغييرات غير محفوظة</span> : undefined}
        actions={
          activeTab === 'general' ? (
            <>
              <WsBtn
                icon={RotateCcw}
                onClick={() => originalSettings && settingsQuery.refetch()}
                disabled={isSaving || isLoading}
              >
                إعادة التحميل
              </WsBtn>
              <WsBtn
                variant="primary"
                icon={Save}
                type="submit"
                form="settings-form"
                disabled={!isDirty || isSaving}
              >
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </WsBtn>
            </>
          ) : undefined
        }
        facts={
          <>
            <WsFact icon={School} label="الاسم المنشور">
              {originalSettings?.school_name || <span style={{ color: TONES.red.tx }}>لم يُضبط</span>}
            </WsFact>
            <WsFact icon={Phone} label="هاتف البوابة">
              {originalSettings?.school_phone || <span style={{ color: TONES.red.tx }}>فارغ</span>}
            </WsFact>
            <WsFact icon={MessageSquare} label="الواتساب">
              <span style={{ color: whatsappState.tone.tx }}>{whatsappState.label}</span>
            </WsFact>
            {lastConnected && (
              <WsFact icon={MessageSquare} label="آخر اتصال">
                {new Date(lastConnected).toLocaleString('ar-SA')}
              </WsFact>
            )}
          </>
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          <button
            type="button"
            className={`ws-seg__btn ${activeTab === 'general' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings2 style={{ width: 13, height: 13 }} />
            الإعدادات العامة
          </button>
          <button
            type="button"
            className={`ws-seg__btn ${activeTab === 'whatsapp-instances' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('whatsapp-instances')}
          >
            <MessageSquare style={{ width: 13, height: 13 }} />
            أرقام الواتساب
            {instances.length > 0 && <span className="ws-count">{instances.length}</span>}
          </button>
        </div>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {settingsQuery.isError && (
            <div style={{ padding: 10 }}>
              <WsAlert tone="error" boxed>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  تعذر تحميل الإعدادات. يرجى المحاولة مرة أخرى.
                  <WsBtn size="sm" icon={RotateCcw} onClick={() => settingsQuery.refetch()}>إعادة المحاولة</WsBtn>
                </span>
              </WsAlert>
            </div>
          )}

          {activeTab === 'whatsapp-instances' ? (
            /* المدير يبقى في WsMain لا في العمود: ثلاثة مودالات وحلقتا استطلاع،
               وWsSideCol يفصل أبناءه عند الطي */
            <WsBlock fill scroll>
              <WhatsappInstancesManager />
            </WsBlock>
          ) : (
            <WsBlock fill scroll>
              <form id="settings-form" onSubmit={handleSubmit}>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
                  {isLoading ? (
                    <WsEmpty loading>جارٍ تحميل الإعدادات...</WsEmpty>
                  ) : (
                    <>
                      <div>
                        <p className="ws-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <School style={{ width: 12, height: 12 }} /> هوية المدرسة
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <WsField label="اسم المدرسة *" htmlFor="school-name">
                            <WsInput
                              id="school-name"
                              type="text"
                              value={form.school_name}
                              onChange={(event) => handleInputChange('school_name', event.target.value)}
                              placeholder="مثال: مدرسة ذو النورين الابتدائية"
                              disabled={isSaving}
                              required
                            />
                          </WsField>
                          <WsField label="هاتف المدرسة" htmlFor="school-phone">
                            <WsInput
                              id="school-phone"
                              type="tel"
                              value={form.school_phone}
                              onChange={(event) => handleInputChange('school_phone', event.target.value)}
                              placeholder="مثال: 0501234567"
                              disabled={isSaving}
                              dir="ltr"
                              style={{ textAlign: 'right' }}
                            />
                            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                              يظهر في بوابة طلبات الاستئذان العلنية — وهي مستهلكه الوحيد.
                            </p>
                          </WsField>
                        </div>
                      </div>

                      <div>
                        <p className="ws-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <BellOff style={{ width: 12, height: 12 }} /> الإشعارات الآلية
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <ToggleRow
                            label="إشعارات الحضور الفورية"
                            description="إرسال تنبيه لولي الأمر عند تسجيل الغياب أو التأخير."
                            checked={form.attendance_notification}
                            onChange={(value) => handleInputChange('attendance_notification', value)}
                            disabled={isSaving}
                          />
                          <ToggleRow
                            label="التقرير الأسبوعي"
                            description="إرسال ملخص أسبوعي بالحضور إلى الإدارة وولي الأمر."
                            checked={form.weekly_report}
                            onChange={(value) => handleInputChange('weekly_report', value)}
                            disabled={isSaving}
                          />
                          <ToggleRow
                            label="الموافقة التلقائية على الحضور"
                            description="اعتماد التحضير المرسل من المعلمين تلقائياً عند عدم وجود ملاحظات."
                            checked={form.auto_approve_attendance}
                            onChange={(value) => handleInputChange('auto_approve_attendance', value)}
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </WsBlock>
          )}
        </WsMain>

        {/* ★ مصبّ الاسم — أين يذهب ما تكتبه، وأيّ الوجهات تتبعه وأيّها أخذ نسخة ومضى */}
        {activeTab === 'general' && (
          <WsSideCol side="end" title="مصبّ الاسم" icon={ArrowLeftRight} storageKey="ws:settings:sidecol" width={330}>
            <WsBlock title="كما تصل البوابة الآن" icon={Globe} padded>
              {/* البوابة العامة: الوجهة الوحيدة التي تجمع حيّة + علنية بلا مصادقة + تعرض
                  الاسم والهاتف معاً — فهي المعاينة الصادقة الوحيدة الممكنة */}
              <div
                style={{
                  border: `1px solid ${TONES.sky.bd}`,
                  background: TONES.sky.bg,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                {nameDirty && (
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: TONES.amber.tx }}>
                    {form.school_name || '—'}
                  </p>
                )}
                <p
                  style={{
                    margin: 0,
                    fontSize: nameDirty ? 11 : 13.5,
                    fontWeight: nameDirty ? 400 : 800,
                    color: nameDirty ? 'var(--ws-text-2)' : TONES.sky.tx,
                    textDecoration: nameDirty ? 'line-through' : undefined,
                  }}
                >
                  {originalSettings?.school_name || 'اسم المدرسة'}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: TONES.sky.tx }}>
                  طلب استئذان — للتواصل:{' '}
                  <span
                    dir="ltr"
                    style={{
                      fontWeight: 700,
                      color: phoneDirty ? TONES.amber.tx : TONES.sky.tx,
                    }}
                  >
                    {(phoneDirty ? form.school_phone : originalSettings?.school_phone) || 'بلا هاتف'}
                  </span>
                </p>
              </div>
              {(nameDirty || phoneDirty) && (
                <p style={{ margin: '6px 0 0', fontSize: 10.5, color: TONES.amber.tx, lineHeight: 1.7 }}>
                  البوابة ما زالت تخدم القديم حتى تضغط حفظ — الكهرماني معلّق، والمشطوب هو الحيّ الآن.
                </p>
              )}
            </WsBlock>

            <WsBlock title="إلى أين يذهب" icon={ArrowLeftRight} count={4} padded fill scroll>
              <p className="ws-label" style={{ marginBottom: 5 }}>يتبع الاسم — يقرأ عند كل طلب</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <DestinationRow
                  tone={TONES.sky}
                  title="البوابة العامة"
                  detail="الاسم + الهاتف — علنية بلا مصادقة"
                  live
                />
                <DestinationRow
                  tone={TONES.green}
                  title="مؤلّف رسائل المعلم"
                  detail="الاسم — يُقرأ لحظة التأليف"
                  live
                />
              </div>

              <p className="ws-label" style={{ margin: '10px 0 5px' }}>أخذ نسخة ومضى — مجمَّد</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <DestinationRow
                  tone={TONES.gray}
                  title="اسم رقم الواتساب"
                  detail="جُمّد لحظة إنشاء الرقم — لا يُعاد تسميته"
                />
                <DestinationRow
                  tone={TONES.gray}
                  title="رسائل معلمين مُرسلة"
                  detail="جُمّدت لكل رسالة لحظة إرسالها"
                />
              </div>

              <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8, borderTop: '1px solid var(--ws-hairline)', paddingTop: 8 }}>
                تعديل الاسم يغيّر البوابة فوراً، ولا يمسّ اسم رقم واتساب قائماً، ولا رسالةً أُرسلت.
              </p>
            </WsBlock>

            <WsBlock title="أرقام الواتساب" icon={MessageSquare} count={instances.length} padded>
              {instances.length === 0 ? (
                <>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)' }}>لا توجد أرقام مرتبطة</p>
                  <WsBtn
                    size="sm"
                    icon={MessageSquare}
                    onClick={() => setActiveTab('whatsapp-instances')}
                    style={{ marginTop: 6 }}
                  >
                    إضافة رقم الآن
                  </WsBtn>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {instances.map((instance) => {
                    const meta = INSTANCE_STATUS_META[instance.status] ?? INSTANCE_STATUS_META.disconnected
                    return (
                      <div
                        key={instance.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          border: '1px solid var(--ws-border)',
                          borderRadius: 8,
                          padding: '6px 8px',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {instance.instance_name}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                            {[instance.phone_number, instance.department].filter(Boolean).join(' • ') || '—'}
                          </span>
                        </span>
                        <ToneChip tone={meta.tone}>{meta.label}</ToneChip>
                      </div>
                    )
                  })}
                  <WsBtn size="sm" onClick={() => setActiveTab('whatsapp-instances')} style={{ justifyContent: 'center' }}>
                    إدارة الأرقام
                  </WsBtn>
                </div>
              )}
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>
    </WsPage>
  )
}

/** صف إعداد بمفتاح */
function ToggleRow({
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        border: '1px solid var(--ws-border)',
        borderRadius: 10,
        padding: 10,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>{description}</p>
      </div>
      <WsSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

/** وجهة في المصبّ — تتبع أم أخذت نسخة ومضت */
function DestinationRow({
  tone,
  title,
  detail,
  live,
}: {
  tone: Tone
  title: string
  detail: string
  live?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        border: `1px solid ${live ? tone.bd : 'var(--ws-border)'}`,
        background: live ? tone.bg : 'transparent',
        borderRadius: 8,
        padding: '6px 8px',
        opacity: live ? 1 : 0.75,
      }}
    >
      {live ? (
        <span className="ws-pulse" style={{ background: tone.tx, marginTop: 4, flexShrink: 0 }} />
      ) : (
        <Snowflake style={{ width: 11, height: 11, color: tone.tx, marginTop: 2, flexShrink: 0 }} />
      )}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: live ? tone.tx : 'var(--ws-text)' }}>
          {title}
        </span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)', lineHeight: 1.6 }}>{detail}</span>
      </span>
    </div>
  )
}
