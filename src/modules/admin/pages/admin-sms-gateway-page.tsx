import { Fragment, useState } from 'react'
import {
  useSmsStatisticsQuery,
  useSmsDevicesQuery,
  useSmsMessagesQuery,
  useSendSmsMutation,
  useDeleteSmsDeviceMutation,
  useToggleSmsDeviceStatusMutation,
} from '../hooks'
import type { SmsRegisteredDevice, SmsMessage } from '../types'

type TabKey = 'overview' | 'devices' | 'messages' | 'send'

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'overview', label: 'نظرة عامة', icon: 'bi-speedometer2' },
  { key: 'devices', label: 'الأجهزة المسجلة', icon: 'bi-phone' },
  { key: 'messages', label: 'سجل الرسائل', icon: 'bi-chat-dots' },
  { key: 'send', label: 'إرسال رسالة', icon: 'bi-send' },
]

const PANEL_CLASS = 'rounded-3xl border border-slate-200 bg-white'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function StatusBadge({ tone, icon, label }: { tone: 'success' | 'warning' | 'danger' | 'info'; icon: string; label: string }) {
  const toneClasses = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
  } as const

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <i className={`bi ${icon}`} />
      {label}
    </span>
  )
}

function DeviceStatusBadge({ status }: { status: SmsRegisteredDevice['status'] }) {
  switch (status) {
    case 'active':
      return <StatusBadge tone="success" icon="bi-check-circle" label="نشط" />
    case 'blocked':
      return <StatusBadge tone="danger" icon="bi-shield-x" label="محظور" />
    default:
      return <StatusBadge tone="warning" icon="bi-pause-circle" label="غير نشط" />
  }
}

function MessageStatusBadge({ status }: { status: SmsMessage['status'] }) {
  switch (status) {
    case 'sent':
      return <StatusBadge tone="success" icon="bi-check-circle" label="تم الإرسال" />
    case 'failed':
      return <StatusBadge tone="danger" icon="bi-x-circle" label="فشل" />
    case 'processing':
      return <StatusBadge tone="info" icon="bi-arrow-repeat" label="قيد المعالجة" />
    case 'cancelled':
      return <StatusBadge tone="warning" icon="bi-ban" label="ملغي" />
    default:
      return <StatusBadge tone="warning" icon="bi-clock" label="قيد الانتظار" />
  }
}

export function AdminSmsGatewayPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [messageFilters, setMessageFilters] = useState({ status: 'all', type: 'all', search: '' })
  const [sendForm, setSendForm] = useState({ phone: '', message: '', message_type: 'general' as const })

  const statsQuery = useSmsStatisticsQuery()
  const devicesQuery = useSmsDevicesQuery()
  const messagesQuery = useSmsMessagesQuery(messageFilters.status !== 'all' || messageFilters.type !== 'all' ? messageFilters : undefined)

  const sendMutation = useSendSmsMutation()
  const deleteMutation = useDeleteSmsDeviceMutation()
  const toggleMutation = useToggleSmsDeviceStatusMutation()

  const stats = statsQuery.data
  const devices = devicesQuery.data ?? []
  const messages = messagesQuery.data?.data ?? []

  const handleSendMessage = () => {
    if (!sendForm.phone || !sendForm.message) return
    sendMutation.mutate(sendForm, {
      onSuccess: () => {
        setSendForm({ phone: '', message: '', message_type: 'general' })
      },
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">بوابة الرسائل SMS</h1>
          <p className="mt-1 text-sm text-slate-500">إدارة الأجهزة وإرسال الرسائل النصية عبر مساعد الرائد</p>
        </div>
        <button
          type="button"
          onClick={() => {
            statsQuery.refetch()
            devicesQuery.refetch()
            messagesQuery.refetch()
          }}
          className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <i className="bi bi-arrow-clockwise" />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className={`${PANEL_CLASS} p-2`}>
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <i className={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className={`${PANEL_CLASS} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">إجمالي الأجهزة</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{stats?.total_devices ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-violet-100 p-4">
                <i className="bi bi-phone text-2xl text-violet-600" />
              </div>
            </div>
          </div>

          <div className={`${PANEL_CLASS} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">الأجهزة النشطة</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{stats?.active_devices ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-emerald-100 p-4">
                <i className="bi bi-check-circle text-2xl text-emerald-600" />
              </div>
            </div>
          </div>

          <div className={`${PANEL_CLASS} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">رسائل قيد الانتظار</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">{stats?.pending_messages ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-amber-100 p-4">
                <i className="bi bi-clock text-2xl text-amber-600" />
              </div>
            </div>
          </div>

          <div className={`${PANEL_CLASS} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">رسائل اليوم</p>
                <p className="mt-2 text-3xl font-bold text-sky-600">{stats?.messages_today ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-sky-100 p-4">
                <i className="bi bi-send text-2xl text-sky-600" />
              </div>
            </div>
          </div>

          <div className={`${PANEL_CLASS} col-span-full p-6`}>
            <h3 className="mb-4 text-lg font-bold text-slate-800">إحصائيات الإرسال</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-sm text-slate-600">إجمالي الرسائل</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{stats?.total_messages ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">تم الإرسال</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{stats?.sent_messages ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600">فشل الإرسال</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">{stats?.failed_messages ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab - Part 1 continues in next section... */}
      {activeTab === 'devices' && (
        <div className={`${PANEL_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الجهاز</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الموديل</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الحالة</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">آخر نشاط</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الرسائل المرسلة</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <i className="bi bi-phone mb-2 block text-4xl" />
                      <p>لا توجد أجهزة مسجلة</p>
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">{device.device_name || 'جهاز غير مسمى'}</p>
                          <p className="text-xs text-slate-500">{device.device_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{device.device_model || '—'}</td>
                      <td className="px-6 py-4">
                        <DeviceStatusBadge status={device.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(device.last_active)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{device.total_sent ?? 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(device.device_id)}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            {device.status === 'active' ? 'حظر' : 'تفعيل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
                                deleteMutation.mutate(device.device_id)
                              }
                            }}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className={`${PANEL_CLASS} p-4`}>
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={messageFilters.status}
                onChange={(e) => setMessageFilters({ ...messageFilters, status: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2"
              >
                <option value="all">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="sent">تم الإرسال</option>
                <option value="failed">فشل</option>
              </select>
              <select
                value={messageFilters.type}
                onChange={(e) => setMessageFilters({ ...messageFilters, type: e.target.value })}
                className="rounded-xl border border-slate-300 px-4 py-2"
              >
                <option value="all">كل الأنواع</option>
                <option value="absence">غياب</option>
                <option value="late_arrival">تأخر</option>
                <option value="behavior">سلوك</option>
                <option value="general">عام</option>
              </select>
              <input
                type="text"
                value={messageFilters.search}
                onChange={(e) => setMessageFilters({ ...messageFilters, search: e.target.value })}
                placeholder="بحث برقم الجوال..."
                className="rounded-xl border border-slate-300 px-4 py-2"
              />
            </div>
          </div>

          <div className={`${PANEL_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">رقم الجوال</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الرسالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        <i className="bi bi-chat-dots mb-2 block text-4xl" />
                        <p>لا توجد رسائل</p>
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-800">{message.phone}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{message.message.substring(0, 50)}...</td>
                        <td className="px-6 py-4">
                          <MessageStatusBadge status={message.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(message.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Send Tab */}
      {activeTab === 'send' && (
        <div className={`${PANEL_CLASS} p-6`}>
          <h3 className="mb-6 text-xl font-bold text-slate-800">إرسال رسالة جديدة</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">رقم الجوال</label>
              <input
                type="text"
                value={sendForm.phone}
                onChange={(e) => setSendForm({ ...sendForm, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">نص الرسالة</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                rows={5}
                placeholder="اكتب رسالتك هنا..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <p className="mt-1 text-xs text-slate-500">{sendForm.message.length} / 160 حرف</p>
            </div>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!sendForm.phone || !sendForm.message || sendMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {sendMutation.isPending ? 'جارِ الإرسال...' : 'إرسال الرسالة'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
