import { useState } from 'react'
import {
  MessageSquare,
  RefreshCcw,
  Send,
  ShieldOff,
  Smartphone,
  Trash2,
} from 'lucide-react'
import {
  useSmsStatisticsQuery,
  useSmsDevicesQuery,
  useSmsMessagesQuery,
  useSendSmsMutation,
  useDeleteSmsDeviceMutation,
  useToggleSmsDeviceStatusMutation,
} from '../hooks'
import type { SmsRegisteredDevice, SmsMessage } from '../types'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsTextarea,
} from '@/shared/workspace'
import type { WsChipTone } from '@/shared/workspace'

type TabKey = 'messages' | 'send'

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

const DEVICE_STATUS_META: Record<string, { tone: WsChipTone | undefined; label: string; dot: string; pulse: boolean }> = {
  active: { tone: 'green', label: 'نشط', dot: 'var(--ws-green)', pulse: true },
  blocked: { tone: 'red', label: 'محظور', dot: 'var(--ws-red)', pulse: false },
  inactive: { tone: 'amber', label: 'غير نشط', dot: 'var(--ws-amber)', pulse: false },
}

const MESSAGE_STATUS_META: Record<string, { tone: WsChipTone; label: string }> = {
  sent: { tone: 'green', label: 'تم الإرسال' },
  failed: { tone: 'red', label: 'فشل' },
  processing: { tone: 'sky', label: 'قيد المعالجة' },
  cancelled: { tone: 'amber', label: 'ملغي' },
  pending: { tone: 'amber', label: 'قيد الانتظار' },
}

function MessageStatusBadge({ status }: { status: SmsMessage['status'] }) {
  const meta = MESSAGE_STATUS_META[status] ?? MESSAGE_STATUS_META.pending
  return <WsChip tone={meta.tone}>{meta.label}</WsChip>
}

export function AdminSmsGatewayPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('messages')
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
    <WsPage>
      <WsHeader
        title="بوابة الرسائل SMS"
        badge="عبر مساعد الرائد"
        actions={
          <WsBtn
            icon={RefreshCcw}
            onClick={() => {
              statsQuery.refetch()
              devicesQuery.refetch()
              messagesQuery.refetch()
            }}
          >
            تحديث
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Smartphone} label="الأجهزة:">
              {stats?.active_devices ?? 0} / {stats?.total_devices ?? 0} نشط
            </WsFact>
            <WsFact icon={MessageSquare} label="اليوم:">
              {stats?.messages_today ?? 0}
            </WsFact>
            <WsFact label="بالانتظار:">{stats?.pending_messages ?? 0}</WsFact>
            <WsFact label="مرسلة:">{stats?.sent_messages ?? 0}</WsFact>
            <WsFact label="فاشلة:">{stats?.failed_messages ?? 0}</WsFact>
          </>
        }
      >
        {(stats?.active_devices ?? 0) === 0 && devices.length > 0 ? <WsChip tone="red">لا أجهزة نشطة!</WsChip> : null}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: الأجهزة المسجلة */}
        <WsSideCol title="الأجهزة المسجلة" icon={Smartphone} side="start" width={300} storageKey="ws:sms-gateway:devices">
          <WsBlock fill scroll count={devices.length.toLocaleString('ar-SA')} title="الأجهزة">
            {devicesQuery.isLoading ? (
              <WsEmpty loading>جارٍ تحميل الأجهزة...</WsEmpty>
            ) : devices.length === 0 ? (
              <WsEmpty icon={Smartphone}>
                لا توجد أجهزة مسجلة — ثبّت تطبيق «مساعد الرائد» على جوال المدرسة لبدء الإرسال.
              </WsEmpty>
            ) : (
              <div>
                {devices.map((device: SmsRegisteredDevice) => {
                  const meta = DEVICE_STATUS_META[device.status] ?? DEVICE_STATUS_META.inactive
                  return (
                    <div key={device.id} style={{ padding: '9px 12px', borderBottom: '1px solid var(--ws-hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span
                            className={meta.pulse ? 'ws-pulse' : undefined}
                            style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{device.device_name || 'جهاز غير مسمى'}</span>
                        </span>
                        <WsChip tone={meta.tone}>{meta.label}</WsChip>
                      </div>
                      <span className="ws-cell-sub" style={{ display: 'block', marginTop: 3 }}>
                        {device.device_model || '—'} • {device.device_id}
                      </span>
                      <span className="ws-cell-sub" style={{ display: 'block' }}>
                        آخر نشاط: {formatDateTime(device.last_active)} • أرسل {device.total_sent ?? 0} رسالة
                      </span>
                      <span style={{ display: 'inline-flex', gap: 4, marginTop: 5 }}>
                        <WsBtn size="sm" icon={ShieldOff} onClick={() => toggleMutation.mutate(device.device_id)}>
                          {device.status === 'active' ? 'حظر' : 'تفعيل'}
                        </WsBtn>
                        <WsBtn
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
                              deleteMutation.mutate(device.device_id)
                            }
                          }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: السجل / الإرسال */}
        <WsMain>
          <WsBlock
            title={
              <span className="ws-seg" style={{ display: 'inline-flex' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('messages')}
                  className={`ws-seg__btn ${activeTab === 'messages' ? 'is-active' : ''}`}
                >
                  <MessageSquare style={{ width: 12, height: 12 }} />
                  سجل الرسائل
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('send')}
                  className={`ws-seg__btn ${activeTab === 'send' ? 'is-active' : ''}`}
                >
                  <Send style={{ width: 12, height: 12 }} />
                  إرسال رسالة
                </button>
              </span>
            }
            tools={
              activeTab === 'messages' ? (
                <>
                  <WsSelect
                    value={messageFilters.status}
                    onChange={(e) => setMessageFilters({ ...messageFilters, status: e.target.value })}
                  >
                    <option value="all">كل الحالات</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="sent">تم الإرسال</option>
                    <option value="failed">فشل</option>
                  </WsSelect>
                  <WsSelect
                    value={messageFilters.type}
                    onChange={(e) => setMessageFilters({ ...messageFilters, type: e.target.value })}
                  >
                    <option value="all">كل الأنواع</option>
                    <option value="absence">غياب</option>
                    <option value="late_arrival">تأخر</option>
                    <option value="behavior">سلوك</option>
                    <option value="general">عام</option>
                  </WsSelect>
                  <WsInput
                    type="text"
                    value={messageFilters.search}
                    onChange={(e) => setMessageFilters({ ...messageFilters, search: e.target.value })}
                    placeholder="بحث برقم الجوال..."
                    style={{ width: 160 }}
                  />
                </>
              ) : undefined
            }
            fill
          >
            {activeTab === 'messages' &&
              (messagesQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل الرسائل...</WsEmpty>
              ) : messages.length === 0 ? (
                <WsEmpty icon={MessageSquare}>لا توجد رسائل بالمعايير الحالية.</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>رقم الجوال</th>
                      <th>الرسالة</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message: SmsMessage) => (
                      <tr key={message.id}>
                        <td>
                          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                            {message.phone}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: 11.5,
                              color: 'var(--ws-text-2)',
                              lineHeight: 1.6,
                              maxWidth: 420,
                            }}
                          >
                            {message.message}
                          </span>
                        </td>
                        <td>
                          <MessageStatusBadge status={message.status} />
                        </td>
                        <td>
                          <span className="ws-cell-sub">{formatDateTime(message.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </WsTable>
              ))}

            {activeTab === 'send' && (
              <div style={{ padding: 14, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <WsField label="رقم الجوال" htmlFor="sms-phone">
                    <WsInput
                      id="sms-phone"
                      type="text"
                      value={sendForm.phone}
                      onChange={(e) => setSendForm({ ...sendForm, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                    />
                  </WsField>
                  <WsField label="نص الرسالة" htmlFor="sms-message">
                    <WsTextarea
                      id="sms-message"
                      value={sendForm.message}
                      onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                      rows={5}
                      placeholder="اكتب رسالتك هنا..."
                    />
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: sendForm.message.length > 160 ? 'var(--ws-red)' : 'var(--ws-text-2)',
                      }}
                    >
                      {sendForm.message.length} / 160 حرف
                      {sendForm.message.length > 160 ? ' — قد تُرسل كأكثر من رسالة' : ''}
                    </span>
                  </WsField>
                  <WsBtn
                    variant="primary"
                    icon={Send}
                    onClick={handleSendMessage}
                    disabled={!sendForm.phone || !sendForm.message || sendMutation.isPending}
                    style={{ justifyContent: 'center' }}
                  >
                    {sendMutation.isPending ? 'جارِ الإرسال...' : 'إرسال الرسالة'}
                  </WsBtn>
                  <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                    تُرسل الرسالة عبر أقرب جهاز نشط من أجهزة «مساعد الرائد» على اليمين.
                  </p>
                </div>
              </div>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}
