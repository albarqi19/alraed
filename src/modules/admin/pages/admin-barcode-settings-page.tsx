import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  MessageSquare,
  Plus,
  Power,
  RefreshCw,
  Save,
  ScanLine,
  Smartphone,
  Sunrise,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  useBarcodeSettingsQuery,
  useUpdateBarcodeSettingsMutation,
  useScannerDevicesQuery,
  useCreateScannerDeviceMutation,
  useDeleteScannerDeviceMutation,
  useRegenerateDeviceTokenMutation,
  useUpdateScannerDeviceMutation,
  useBarcodeStatsQuery,
  useBarcodeTodayScansQuery,
} from '../barcode/hooks'
import type { BarcodeSettings, ScannerDevice } from '../barcode/types'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import { buildReplay, MorningReplay, toMin, minToLabel, WEEK_DAYS } from './barcode-settings-ui'

const todayIso = () => new Date().toLocaleDateString('sv-SE')

const DEVICE_STATUS: Record<ScannerDevice['status'], { label: string; tone: typeof TONES.green }> = {
  active: { label: 'نشط', tone: TONES.green },
  inactive: { label: 'معطّل', tone: TONES.gray },
  maintenance: { label: 'صيانة', tone: TONES.amber },
}

export function AdminBarcodeSettingsPage() {
  const [draft, setDraft] = useState<BarcodeSettings | null>(null)
  const [dayIso, setDayIso] = useState(todayIso())
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceType, setNewDeviceType] = useState('')
  const [tokenModal, setTokenModal] = useState<ScannerDevice | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: settings, isLoading, isError, refetch } = useBarcodeSettingsQuery()
  const { data: devices = [], isError: devicesError } = useScannerDevicesQuery()
  const { data: stats } = useBarcodeStatsQuery()
  const { data: scans = [] } = useBarcodeTodayScansQuery({ date: dayIso })

  const updateSettings = useUpdateBarcodeSettingsMutation()
  const createDevice = useCreateScannerDeviceMutation()
  const deleteDevice = useDeleteScannerDeviceMutation()
  const regenerateToken = useRegenerateDeviceTokenMutation()
  const updateDevice = useUpdateScannerDeviceMutation()

  useEffect(() => {
    if (settings && !draft) setDraft(settings)
  }, [settings, draft])

  const activeDevices = useMemo(() => devices.filter((d) => d.status === 'active').length, [devices])

  const dirtyKeys = useMemo(() => {
    if (!draft || !settings) return []
    return (Object.keys(draft) as Array<keyof BarcodeSettings>).filter(
      (k) => JSON.stringify(draft[k]) !== JSON.stringify(settings[k]),
    )
  }, [draft, settings])

  const replay = useMemo(
    () => (draft ? buildReplay(scans, draft, todayIso(), dayIso) : null),
    [scans, draft, dayIso],
  )

  // حرّاس اللغم — الحفظ يُعطَّل عند أيّها
  const cutBeforeStart = draft ? toMin(draft.barcode_absence_cutoff_time) <= toMin(draft.barcode_school_start_time) : false
  const noWorkingDays = draft ? (draft.barcode_working_days?.length ?? 0) === 0 : false
  const enabledNoDevice = draft ? draft.barcode_enabled && activeDevices === 0 : false
  const hasBlockingError = cutBeforeStart || noWorkingDays

  const patch = <K extends keyof BarcodeSettings>(key: K, value: BarcodeSettings[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  // clamp + round على المدخل الرقمي — مسح الصندوق يعطي 0 فيمرّ صامتاً
  const patchThreshold = (raw: string) => {
    const n = Math.round(Number(raw))
    patch('barcode_late_threshold_minutes', Number.isFinite(n) ? Math.min(120, Math.max(0, n)) : 0)
  }

  const toggleWorkingDay = (day: number) => {
    if (!draft) return
    const set = new Set(draft.barcode_working_days)
    set.has(day) ? set.delete(day) : set.add(day)
    patch('barcode_working_days', [...set].sort((a, b) => a - b))
  }

  const handleSave = () => {
    if (!draft || hasBlockingError) return
    updateSettings.mutate(draft)
  }

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) return
    createDevice.mutate(
      { device_name: newDeviceName.trim(), device_type: newDeviceType.trim() || undefined },
      {
        onSuccess: (device) => {
          setShowAddDevice(false)
          setNewDeviceName('')
          setNewDeviceType('')
          if (device) setTokenModal(device as ScannerDevice)
        },
      },
    )
  }

  // آخر ١٠ أيام عمل تراجعاً من اليوم — أي صباح يُعاد محاكمته
  const dayOptions = useMemo(() => {
    if (!draft) return []
    const wd = new Set(draft.barcode_working_days)
    const out: string[] = []
    const cur = new Date()
    for (let i = 0; i < 40 && out.length < 10; i++) {
      const iso = cur.toLocaleDateString('sv-SE')
      if (wd.has(cur.getDay())) out.push(iso)
      cur.setDate(cur.getDate() - 1)
    }
    return out
  }, [draft])

  if (isError) {
    return (
      <WsPage>
        <WsHeader title="إعدادات حضور البوابة" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsAlert tone="error" boxed>
                تعذّر تحميل الإعدادات.
                <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>إعادة المحاولة</WsBtn>
              </WsAlert>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  if (isLoading || !draft) {
    return (
      <WsPage>
        <WsHeader title="إعدادات حضور البوابة" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsEmpty loading>جارٍ تحميل الإعدادات...</WsEmpty>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  const isPast = dayIso !== todayIso()

  return (
    <WsPage>
      <WsHeader
        title="إعدادات حضور البوابة"
        badge={
          <span style={{ color: draft.barcode_enabled ? TONES.green.tx : 'var(--ws-text-2)' }}>
            {draft.barcode_enabled ? 'يعمل' : 'متوقف'}
          </span>
        }
        actions={
          <WsBtn
            variant="primary"
            icon={Save}
            onClick={handleSave}
            disabled={dirtyKeys.length === 0 || updateSettings.isPending || hasBlockingError}
          >
            {updateSettings.isPending
              ? 'جارٍ الحفظ...'
              : dirtyKeys.length
                ? `حفظ (${dirtyKeys.length})`
                : 'محفوظ'}
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Users} label="طالب نشط">
              {/* على يوم ماضٍ يُعرض «—»: total_students عدد الآن، فمقامٌ من زمن آخر */}
              {isPast ? '—' : (stats?.total_students ?? 0)}
            </WsFact>
            <WsFact icon={ScanLine} label="مسحوا اليوم">{isPast ? '—' : (stats?.scanned_count ?? 0)}</WsFact>
            <WsFact icon={Clock3} label="آخر مسح">
              {stats?.last_scan_time ? stats.last_scan_time.slice(0, 5) : '—'}
            </WsFact>
            <WsFact icon={Smartphone} label="بوابة تسجّل">
              <span style={{ color: activeDevices === 0 ? TONES.red.tx : undefined }}>{activeDevices}</span>
              {' / '}
              {devices.length}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="الصباح المعروض">
          <WsSelect value={dayIso} onChange={(e) => setDayIso(e.target.value)}>
            {dayOptions.map((iso) => (
              <option key={iso} value={iso}>
                {iso === todayIso() ? `اليوم · ${iso}` : iso}
              </option>
            ))}
          </WsSelect>
        </WsField>
        {isPast && (
          <WsBtn size="sm" onClick={() => setDayIso(todayIso())}>اليوم</WsBtn>
        )}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* صف الحراسة */}
          {(cutBeforeStart || noWorkingDays || enabledNoDevice || devicesError) && (
            <WsBlock padded>
              {cutBeforeStart && (
                <WsAlert tone="error" boxed>
                  وقت القطع {draft.barcode_absence_cutoff_time} يسبق أو يساوي بداية الدوام{' '}
                  {draft.barcode_school_start_time} — عند الحفظ يُسجَّل كل طلاب المدرسة غائبين قبل بدء
                  الدوام، وتُرسل رسالة لكل ولي أمر.
                </WsAlert>
              )}
              {noWorkingDays && (
                <WsAlert tone="error" boxed>
                  لم تختر يوم عمل — البوابة سترفض كل مسح، والغياب التلقائي يتوقف.
                </WsAlert>
              )}
              {enabledNoDevice && (
                <WsAlert tone="warn" boxed>
                  النظام مفعّل بلا بوابة نشطة — عند وقت القطع يُسجَّل كل طالب غائباً وتُرسل رسالة لكل ولي أمر.
                </WsAlert>
              )}
              {devicesError && (
                <WsAlert tone="warn" boxed>تعذّر تحميل البوابات — العدد أعلاه غير موثوق.</WsAlert>
              )}
            </WsBlock>
          )}

          {/* التشغيل */}
          <WsBlock title="التشغيل" icon={Power} padded>
            <WsField label="تفعيل نظام الباركود">
              <WsSwitch
                checked={draft.barcode_enabled}
                onChange={(v) => patch('barcode_enabled', v)}
              />
            </WsField>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
              عند وقت القطع يُنشئ النظام سجل غياب دائماً لكل طالب بلا حضور، ويُرسل رسالة لولي أمره.
            </p>
          </WsBlock>

          {/* ★ الصباح المُعاد */}
          <WsBlock title="الصباح المُعاد" icon={Sunrise} padded>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ws-text-2)' }}>
              لا تضبط عتبة — تُعيد محاكمة صباحٍ وقع فعلاً. الأعمدة وصولٌ حقيقي، والقسائم عواقب إعدادك
              غير المحفوظ ({scans.length} مسحة).
            </p>
            {scans.length === 0 ? (
              <WsEmpty icon={Sunrise}>لا مسحات في هذا الصباح — لا شيء يُعاد محاكمته</WsEmpty>
            ) : (
              replay && <MorningReplay model={replay} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
              <WsField label="بداية الدوام">
                <WsInput
                  type="time"
                  value={draft.barcode_school_start_time}
                  onChange={(e) => patch('barcode_school_start_time', e.target.value)}
                />
              </WsField>
              <WsField label="مهلة التأخير (دقيقة)">
                <WsInput
                  type="number"
                  min={0}
                  max={120}
                  value={draft.barcode_late_threshold_minutes}
                  onChange={(e) => patchThreshold(e.target.value)}
                />
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--ws-text-2)' }}>
                  يتأخر بعد {minToLabel(toMin(draft.barcode_school_start_time) + draft.barcode_late_threshold_minutes)}
                </p>
              </WsField>
              <WsField label="وقت القطع (غياب)">
                <WsInput
                  type="time"
                  value={draft.barcode_absence_cutoff_time}
                  onChange={(e) => patch('barcode_absence_cutoff_time', e.target.value)}
                />
              </WsField>
            </div>

            <div style={{ marginTop: 10 }}>
              <WsField label="الغياب التلقائي عند القطع">
                <WsSwitch
                  checked={draft.barcode_auto_absence_enabled}
                  onChange={(v) => patch('barcode_auto_absence_enabled', v)}
                />
              </WsField>
              <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                إطفاؤه يوقف إنشاء سجلات الغياب عند وقت القطع — والمنطقة الحمراء تصير تخطيطاً بلا أثر.
              </p>
            </div>
          </WsBlock>

          {/* أيام العمل */}
          <WsBlock title="أيام العمل" icon={CalendarDays} padded>
            <div className="ws-choice-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {WEEK_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`ws-choice ${draft.barcode_working_days.includes(d.value) ? 'is-selected' : ''}`}
                  onClick={() => toggleWorkingDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </WsBlock>

          {/* الرسائل */}
          <WsBlock title="الرسائل" icon={MessageSquare} padded>
            <WsField label="واتساب عند التأخير">
              <WsSwitch
                checked={draft.barcode_whatsapp_late_enabled}
                onChange={(v) => patch('barcode_whatsapp_late_enabled', v)}
              />
            </WsField>
            <WsField label="واتساب عند الغياب التلقائي">
              <WsSwitch
                checked={draft.barcode_whatsapp_absence_enabled}
                onChange={(v) => patch('barcode_whatsapp_absence_enabled', v)}
              />
            </WsField>
          </WsBlock>
        </WsMain>

        {/* البوابات */}
        <WsSideCol
          side="end"
          title="البوابات"
          icon={Smartphone}
          storageKey="ws:barcode-settings:devices"
          width={320}
          tools={<WsIconBtn icon={Plus} label="تسجيل بوابة" onClick={() => setShowAddDevice(true)} />}
        >
          <WsBlock fill scroll>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {devices.length === 0 ? (
                <WsEmpty icon={Smartphone}>لا بوابات مسجّلة</WsEmpty>
              ) : (
                devices.map((device) => {
                  const st = DEVICE_STATUS[device.status]
                  return (
                    <div
                      key={device.id}
                      style={{
                        border: '1px solid var(--ws-hairline)',
                        borderRadius: 9,
                        padding: 10,
                        background: device.status === 'active' ? undefined : 'var(--ws-surface-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          {device.is_online ? (
                            <Wifi style={{ width: 14, height: 14, color: TONES.green.tx }} />
                          ) : (
                            <WifiOff style={{ width: 14, height: 14, color: 'var(--ws-text-2)' }} />
                          )}
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{device.device_name}</span>
                        </span>
                        <ToneChip tone={st.tone}>{st.label}</ToneChip>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        {device.device_type ?? 'بوابة'} ·{' '}
                        {device.last_seen_at
                          ? `آخر اتصال ${new Date(device.last_seen_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`
                          : 'لم تتصل بعد'}
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        <WsSelect
                          value={device.status}
                          onChange={(e) => updateDevice.mutate({ id: device.id, status: e.target.value as ScannerDevice["status"] })}
                          style={{ flex: 1, minWidth: 90 }}
                        >
                          <option value="active">نشط</option>
                          <option value="inactive">معطّل</option>
                          <option value="maintenance">صيانة</option>
                        </WsSelect>
                        <WsIconBtn icon={Copy} label="عرض التوكن" onClick={() => setTokenModal(device)} />
                        <WsIconBtn
                          icon={RefreshCw}
                          label="تجديد التوكن"
                          onClick={() => regenerateToken.mutate(device.id)}
                        />
                        <WsIconBtn icon={Trash2} label="حذف" onClick={() => deleteDevice.mutate(device.id)} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* تسجيل بوابة */}
      {showAddDevice && (
        <div className="ws-modal" onClick={() => setShowAddDevice(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">تسجيل بوابة جديدة</h3>
            </header>
            <div className="ws-modal__body">
              <WsField label="اسم البوابة" htmlFor="dev-name">
                <WsInput
                  id="dev-name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="مثل: البوابة الرئيسية"
                />
              </WsField>
              <WsField label="النوع (اختياري)" htmlFor="dev-type">
                <WsInput
                  id="dev-type"
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  placeholder="ماسح · جوال"
                />
              </WsField>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setShowAddDevice(false)}>إلغاء</WsBtn>
              <WsBtn
                variant="primary"
                icon={Plus}
                disabled={!newDeviceName.trim() || createDevice.isPending}
                onClick={handleAddDevice}
              >
                تسجيل
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* توكن البوابة */}
      {tokenModal && (
        <div className="ws-modal" onClick={() => { setTokenModal(null); setCopied(false) }}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">توكن «{tokenModal.device_name}»</h3>
              <p className="ws-modal__sub">انسخه إلى تطبيق البوابة — لا يظهر كاملاً بعد الإغلاق</p>
            </header>
            <div className="ws-modal__body">
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  wordBreak: 'break-all',
                  direction: 'ltr',
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--ws-surface-2)',
                  border: '1px solid var(--ws-hairline)',
                }}
              >
                {tokenModal.device_token}
              </div>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => { setTokenModal(null); setCopied(false) }}>إغلاق</WsBtn>
              <WsBtn
                variant="primary"
                icon={copied ? Check : Copy}
                onClick={() => {
                  navigator.clipboard.writeText(tokenModal.device_token)
                  setCopied(true)
                }}
              >
                {copied ? 'نُسخ' : 'نسخ'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}
