import { useState, useEffect } from 'react'
import {
  Settings,
  Bell,
  Smartphone,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
  Save,
} from 'lucide-react'
import {
  useBarcodeSettingsQuery,
  useUpdateBarcodeSettingsMutation,
  useScannerDevicesQuery,
  useCreateScannerDeviceMutation,
  useDeleteScannerDeviceMutation,
  useRegenerateDeviceTokenMutation,
  useUpdateScannerDeviceMutation,
} from '../barcode/hooks'
import type { BarcodeSettings, ScannerDevice } from '../barcode/types'

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

// ==================== المكونات الفرعية ====================

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-0.5' : 'right-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function DeviceCard({
  device,
  onDelete,
  onRegenerate,
  onUpdate,
}: {
  device: ScannerDevice
  onDelete: (id: number) => void
  onRegenerate: (id: number) => void
  onUpdate: (id: number, data: Partial<ScannerDevice>) => void
}) {
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToken = () => {
    navigator.clipboard.writeText(device.device_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-full p-2 ${
              device.is_online ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {device.is_online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold">{device.device_name}</h4>
            <p className="text-xs text-gray-500">
              {device.device_type ?? 'جهاز ماسح'} &middot;{' '}
              {device.last_seen_at
                ? `آخر اتصال: ${new Date(device.last_seen_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                : 'لم يتصل بعد'}
            </p>
          </div>
        </div>
        <select
          value={device.status}
          onChange={(e) => onUpdate(device.id, { status: e.target.value as ScannerDevice['status'] })}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            device.status === 'active'
              ? 'bg-green-100 text-green-700'
              : device.status === 'maintenance'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          <option value="active">نشط</option>
          <option value="inactive">معطل</option>
          <option value="maintenance">صيانة</option>
        </select>
      </div>

      {/* التوكن */}
      <div className="mt-3 rounded-lg bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">التوكن (Token):</span>
          <div className="flex gap-1">
            <button
              onClick={copyToken}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              title="نسخ"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-xs text-primary hover:underline"
            >
              {showToken ? 'إخفاء' : 'عرض'}
            </button>
          </div>
        </div>
        {showToken && (
          <p className="mt-1 break-all font-mono text-xs text-gray-600" dir="ltr">
            {device.device_token}
          </p>
        )}
      </div>

      {/* الإجراءات */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRegenerate(device.id)}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          <RefreshCw className="h-3 w-3" />
          تجديد التوكن
        </button>
        <button
          onClick={() => onDelete(device.id)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
          حذف
        </button>
      </div>
    </div>
  )
}

// ==================== الصفحة الرئيسية ====================

export function AdminBarcodeSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'devices'>('general')
  const [localSettings, setLocalSettings] = useState<BarcodeSettings | null>(null)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceType, setNewDeviceType] = useState('')

  const { data: settings, isLoading: settingsLoading } = useBarcodeSettingsQuery()
  const { data: devices = [] } = useScannerDevicesQuery()
  const updateSettingsMutation = useUpdateBarcodeSettingsMutation()
  const createDeviceMutation = useCreateScannerDeviceMutation()
  const deleteDeviceMutation = useDeleteScannerDeviceMutation()
  const regenerateTokenMutation = useRegenerateDeviceTokenMutation()
  const updateDeviceMutation = useUpdateScannerDeviceMutation()

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings)
    }
  }, [settings, localSettings])

  const handleSave = () => {
    if (!localSettings) return
    updateSettingsMutation.mutate(localSettings)
  }

  const updateLocal = (key: keyof BarcodeSettings, value: unknown) => {
    setLocalSettings((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) return
    createDeviceMutation.mutate(
      { device_name: newDeviceName.trim(), device_type: newDeviceType.trim() || undefined },
      {
        onSuccess: () => {
          setShowAddDevice(false)
          setNewDeviceName('')
          setNewDeviceType('')
        },
      },
    )
  }

  if (settingsLoading || !localSettings) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        جاري التحميل...
      </div>
    )
  }

  const tabs = [
    { id: 'general' as const, label: 'عام', icon: Settings },
    { id: 'notifications' as const, label: 'الإشعارات', icon: Bell },
    { id: 'devices' as const, label: 'الأجهزة', icon: Smartphone },
  ]

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات حضور البوابة</h1>
          <p className="text-sm text-gray-500">تكوين نظام مسح الباركود</p>
        </div>
        {activeTab !== 'devices' && (
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        )}
      </div>

      {/* التبويبات */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      {activeTab === 'general' && (
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <ToggleField
            label="تفعيل نظام الباركود"
            description="تشغيل/إيقاف نظام تحضير الطلاب بالباركود"
            checked={localSettings.barcode_enabled}
            onChange={(v) => updateLocal('barcode_enabled', v)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">وقت بداية الدوام</label>
              <input
                type="time"
                value={localSettings.barcode_school_start_time}
                onChange={(e) => updateLocal('barcode_school_start_time', e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">حد التأخير (دقائق)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={localSettings.barcode_late_threshold_minutes}
                onChange={(e) => updateLocal('barcode_late_threshold_minutes', Number(e.target.value))}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-400">
                الطالب يُعتبر متأخراً إذا وصل بعد وقت البداية + هذا الحد
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">وقت تسجيل الغياب التلقائي</label>
              <input
                type="time"
                value={localSettings.barcode_absence_cutoff_time}
                onChange={(e) => updateLocal('barcode_absence_cutoff_time', e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-400">
                بعد هذا الوقت، يُسجل جميع الطلاب الذين لم يمسحوا كغائبين
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">التعامل مع المسح المكرر</label>
              <select
                value={localSettings.barcode_duplicate_scan_mode}
                onChange={(e) => updateLocal('barcode_duplicate_scan_mode', e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ignore">تجاهل</option>
                <option value="log_only">تسجيل فقط</option>
              </select>
            </div>
          </div>

          <ToggleField
            label="تفعيل الغياب التلقائي"
            description="تسجيل الطلاب الذين لم يمسحوا كغائبين تلقائياً"
            checked={localSettings.barcode_auto_absence_enabled}
            onChange={(v) => updateLocal('barcode_auto_absence_enabled', v)}
          />

          {/* أيام العمل */}
          <div>
            <label className="mb-2 block text-sm font-medium">أيام العمل</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const current = localSettings.barcode_working_days ?? []
                    const updated = current.includes(day.value)
                      ? current.filter((d) => d !== day.value)
                      : [...current, day.value]
                    updateLocal('barcode_working_days', updated)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                    (localSettings.barcode_working_days ?? []).includes(day.value)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <ToggleField
            label="إرسال واتساب عند التأخير"
            description="إرسال رسالة لولي الأمر عند تسجيل الطالب متأخراً"
            checked={localSettings.barcode_whatsapp_late_enabled}
            onChange={(v) => updateLocal('barcode_whatsapp_late_enabled', v)}
          />
          <ToggleField
            label="إرسال واتساب عند الغياب"
            description="إرسال رسالة لولي الأمر عند تسجيل الطالب غائباً تلقائياً"
            checked={localSettings.barcode_whatsapp_absence_enabled}
            onChange={(v) => updateLocal('barcode_whatsapp_absence_enabled', v)}
          />

          <hr />

          <h3 className="text-sm font-semibold text-gray-700">أصوات التنبيه</h3>
          <ToggleField
            label="صوت عند المسح الناجح"
            checked={localSettings.barcode_sound_on_success}
            onChange={(v) => updateLocal('barcode_sound_on_success', v)}
          />
          <ToggleField
            label="صوت عند التأخير"
            checked={localSettings.barcode_sound_on_late}
            onChange={(v) => updateLocal('barcode_sound_on_late', v)}
          />
          <ToggleField
            label="صوت عند الخطأ"
            checked={localSettings.barcode_sound_on_error}
            onChange={(v) => updateLocal('barcode_sound_on_error', v)}
          />
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* زر إضافة جهاز */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddDevice(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              إضافة جهاز
            </button>
          </div>

          {/* نموذج إضافة جهاز */}
          {showAddDevice && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">تسجيل جهاز جديد</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="اسم الجهاز (مثل: بوابة رئيسية)"
                  className="rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  placeholder="نوع الجهاز (اختياري)"
                  className="rounded-lg border px-4 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddDevice}
                  disabled={createDeviceMutation.isPending || !newDeviceName.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {createDeviceMutation.isPending ? 'جاري التسجيل...' : 'تسجيل'}
                </button>
                <button
                  onClick={() => setShowAddDevice(false)}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* قائمة الأجهزة */}
          {devices.length === 0 ? (
            <div className="rounded-xl border bg-white py-12 text-center text-gray-400">
              <Smartphone className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">لا توجد أجهزة مسجلة</p>
              <p className="text-xs mt-1">أضف جهاز ماسح للبدء</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onDelete={(id) => {
                    if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
                      deleteDeviceMutation.mutate(id)
                    }
                  }}
                  onRegenerate={(id) => {
                    if (confirm('تجديد التوكن سيلغي التوكن القديم. متابعة؟')) {
                      regenerateTokenMutation.mutate(id)
                    }
                  }}
                  onUpdate={(id, data) => updateDeviceMutation.mutate({ id, ...data })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
