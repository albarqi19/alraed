import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Plus,
  RadioTower,
  ScanFace,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import {
  useBiometricDevicesQuery,
  useBiometricPunchesQuery,
  useBiometricStatsQuery,
  useClaimBiometricDeviceMutation,
  useUpdateBiometricDeviceMutation,
  useDeleteBiometricDeviceMutation,
} from '../biometric/hooks'
import type { BiometricDevice, PunchIgnoreReason } from '../biometric/types'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
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

const todayIso = () => new Date().toLocaleDateString('sv-SE')

/** عنوانُ الخادم كما يُكتب في الجهاز — مشتقٌّ من عنوان الـ API لا مكتوبٌ يدوياً. */
const ADMS_HOST = (() => {
  try {
    const base = import.meta.env.VITE_API_BASE_URL ?? window.location.origin
    return new URL(base, window.location.origin).host
  } catch {
    return window.location.host
  }
})()

const DEVICE_STATUS: Record<BiometricDevice['status'], { label: string; tone: typeof TONES.green }> = {
  active: { label: 'معتمد', tone: TONES.green },
  pending: { label: 'بانتظار الاعتماد', tone: TONES.amber },
  disabled: { label: 'معطّل', tone: TONES.gray },
}

const IGNORE_LABEL: Record<PunchIgnoreReason, string> = {
  device_not_active: 'الجهاز غير معتمد',
  student_inactive: 'الطالب غير نشط',
  biometric_disabled: 'البصمة غير مفعّلة',
  test_mode: 'وضع الاختبار',
  non_working_day: 'ليس يوم عمل',
  holiday: 'إجازة في التقويم',
  subsequent_punch: 'بصمة تالية (سُجّل الوصول الأول)',
  excused_not_overridden: 'له عذر معتمد',
  earlier_arrival_wins: 'وصولٌ أبكر مسجَّل',
}

export function AdminBiometricPage() {
  const [dayIso, setDayIso] = useState(todayIso())
  const [statusFilter, setStatusFilter] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [serial, setSerial] = useState('')
  const [deviceName, setDeviceName] = useState('')

  const { data: devices = [] } = useBiometricDevicesQuery()
  const { data: stats } = useBiometricStatsQuery()
  const { data: punches = [], isLoading } = useBiometricPunchesQuery({
    date: dayIso,
    status: statusFilter || undefined,
  })

  const claimDevice = useClaimBiometricDeviceMutation()
  const updateDevice = useUpdateBiometricDeviceMutation()
  const deleteDevice = useDeleteBiometricDeviceMutation()

  const pendingDevices = useMemo(
    () => devices.filter((d) => d.status === 'pending'),
    [devices],
  )

  const unmatchedCount = stats?.unmatched_count ?? 0

  const dayOptions = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push(d.toLocaleDateString('sv-SE'))
    }
    return out
  }, [])

  const handleClaim = () => {
    if (!serial.trim()) return

    claimDevice.mutate(
      { serial_number: serial.trim(), name: deviceName.trim() || undefined },
      {
        onSuccess: () => {
          setShowClaim(false)
          setSerial('')
          setDeviceName('')
        },
      },
    )
  }

  return (
    <WsPage>
      <WsHeader
        title="حضور البصمة"

        actions={
          <>
            <WsBtn icon={BookOpen} onClick={() => setShowGuide((v) => !v)}>
              {showGuide ? 'إخفاء دليل الربط' : 'دليل الربط'}
            </WsBtn>
            <WsBtn variant="primary" icon={Plus} onClick={() => setShowClaim(true)}>
              اعتماد جهاز
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ScanFace} label="بصمات اليوم">{stats?.total_punches ?? 0}</WsFact>
            <WsFact icon={Check} label="سُجّل حضورها">{stats?.matched_count ?? 0}</WsFact>
            <WsFact icon={TriangleAlert} label="بلا طالب">
              <span style={{ color: unmatchedCount > 0 ? TONES.red.tx : undefined }}>
                {unmatchedCount}
              </span>
            </WsFact>
            <WsFact icon={RadioTower} label="أجهزة متصلة">
              {stats?.devices_online ?? 0} / {stats?.devices_total ?? 0}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="اليوم">
          <WsSelect value={dayIso} onChange={(e) => setDayIso(e.target.value)}>
            {dayOptions.map((iso) => (
              <option key={iso} value={iso}>
                {iso === todayIso() ? `اليوم · ${iso}` : iso}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="الحالة">
          <WsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">الكل</option>
            <option value="matched">سُجّل حضورها</option>
            <option value="unmatched">بلا طالب</option>
            <option value="ignored">مُهملة</option>
          </WsSelect>
        </WsField>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {(pendingDevices.length > 0 || unmatchedCount > 0) && (
            <WsBlock padded>
              {pendingDevices.length > 0 && (
                <WsAlert tone="warn" boxed>
                  {pendingDevices.length} جهاز اتّصل بالمنصّة ولم يُعتمد بعد — بصماته تُحفظ ولا
                  تُسجَّل حضوراً. اعتمده من قائمة الأجهزة.
                </WsAlert>
              )}
              {unmatchedCount > 0 && (
                <WsAlert tone="warn" boxed>
                  {unmatchedCount} بصمة لرقمٍ لا يقابل أيَّ طالب. غالباً رقم المستخدم على الجهاز
                  ليس رقم هوية الطالب، أو الطالب غير مسجّل في النظام.
                </WsAlert>
              )}
            </WsBlock>
          )}

          {showGuide && <ConnectionGuide />}

          {showClaim && (
            <WsBlock title="اعتماد جهاز" icon={Plus} padded>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
                الرقم التسلسلي مطبوعٌ على ظهر الجهاز، وتجده أيضاً في شاشته:
                القائمة ← معلومات النظام. يعمل قبل توصيل الجهاز وبعده.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <WsField label="الرقم التسلسلي">
                  <WsInput
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    placeholder="مثال: CGXH224060123"
                  />
                </WsField>
                <WsField label="اسم وصفي (اختياري)">
                  <WsInput
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="البوابة الرئيسية"
                  />
                </WsField>
                <div style={{ display: 'flex', gap: 6 }}>
                  <WsBtn variant="primary" onClick={handleClaim} disabled={!serial.trim() || claimDevice.isPending}>
                    {claimDevice.isPending ? 'جارٍ...' : 'اعتماد'}
                  </WsBtn>
                  <WsBtn onClick={() => setShowClaim(false)}>إلغاء</WsBtn>
                </div>
              </div>
            </WsBlock>
          )}

          <WsBlock title={`سجلّ البصمات · ${dayIso}`} icon={ScanFace} padded>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
              هذا ما قاله الجهاز، لا ما استقرّ في الحضور. بينهما تُقرأ الأعطال: رقمٌ يبصم بلا
              طالب، أو بصمةٌ وصلت وأُهملت ولها سبب.
            </p>

            {isLoading ? (
              <WsEmpty icon={ScanFace}>جارٍ التحميل...</WsEmpty>
            ) : punches.length === 0 ? (
              <WsEmpty icon={ScanFace}>لا بصمات في هذا اليوم</WsEmpty>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'start', color: 'var(--ws-text-2)', fontSize: 11 }}>
                      <th style={thStyle}>الوقت</th>
                      <th style={thStyle}>الطالب</th>
                      <th style={thStyle}>الرقم</th>
                      <th style={thStyle}>التحقّق</th>
                      <th style={thStyle}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {punches.map((p) => (
                      <tr key={p.id} style={{ borderTop: '1px solid var(--ws-hairline)' }}>
                        <td style={tdStyle}>{p.time?.slice(0, 5) ?? '—'}</td>
                        <td style={tdStyle}>
                          {p.student_name ?? <span style={{ color: TONES.red.tx }}>غير معروف</span>}
                          {p.student_class && (
                            <span style={{ color: 'var(--ws-text-2)', fontSize: 10 }}> · {p.student_class}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', direction: 'ltr', textAlign: 'end' }}>
                          {p.external_user_id}
                        </td>
                        <td style={tdStyle}>{p.verify_label}</td>
                        <td style={tdStyle}>
                          {p.status === 'matched' && <ToneChip tone={TONES.green}>سُجّل حضوره</ToneChip>}
                          {p.status === 'unmatched' && <ToneChip tone={TONES.red}>بلا طالب</ToneChip>}
                          {p.status === 'ignored' && (
                            <ToneChip tone={TONES.gray}>
                              {p.ignore_reason ? IGNORE_LABEL[p.ignore_reason] ?? 'مُهملة' : 'مُهملة'}
                            </ToneChip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol
          side="end"
          title="الأجهزة"
          icon={RadioTower}
          storageKey="ws:biometric:devices"
          width={320}
          tools={<WsIconBtn icon={Plus} label="اعتماد جهاز" onClick={() => setShowClaim(true)} />}
        >
          <WsBlock fill scroll>
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {devices.length === 0 ? (
                <WsEmpty icon={RadioTower}>لا أجهزة بعد</WsEmpty>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 6 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{device.name ?? device.serial_number}</div>
                          <div style={{ fontSize: 10, color: 'var(--ws-text-2)', fontFamily: 'monospace', direction: 'ltr' }}>
                            {device.serial_number}
                          </div>
                        </div>
                        <ToneChip tone={st.tone}>{st.label}</ToneChip>
                      </div>

                      <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                        <div>
                          {device.is_online ? (
                            <span style={{ color: TONES.green.tx }}>● متصل الآن</span>
                          ) : (
                            <span>آخر اتصال: {device.last_seen_at?.slice(0, 16) ?? 'لم يتصل بعد'}</span>
                          )}
                        </div>
                        {device.device_model && <div>الطراز: {device.device_model}</div>}
                        <div>البصمات: {device.total_punches}</div>
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        {device.status !== 'active' && (
                          <WsBtn
                            size="sm"
                            onClick={() => updateDevice.mutate({ id: device.id, payload: { status: 'active' } })}
                          >
                            اعتماد
                          </WsBtn>
                        )}
                        {device.status === 'active' && (
                          <WsBtn
                            size="sm"
                            onClick={() => updateDevice.mutate({ id: device.id, payload: { status: 'disabled' } })}
                          >
                            تعطيل
                          </WsBtn>
                        )}
                        <WsIconBtn
                          icon={Trash2}
                          label="حذف"
                          onClick={() => deleteDevice.mutate(device.id)}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}

/**
 * دليلُ الربط في مكانه: المدرسةُ تقرأ الخطوات حيث تعتمد الجهاز، لا في ملفٍّ
 * منفصلٍ يضيع.
 */
function ConnectionGuide() {
  return (
    <WsBlock title="كيف تربط جهاز البصمة" icon={BookOpen} padded>
      <ol style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, lineHeight: 2.1 }}>
        <li>
          <strong>تأكّد أن أرقام الطلاب على الجهاز هي أرقام الهوية.</strong> هذا هو الربط كلّه:
          النظام يطابق البصمة بالطالب عبر رقم الهوية، فلا حاجة لأي ربطٍ يدوي.
        </li>
        <li>
          على الجهاز افتح: <code style={codeStyle}>القائمة ← الاتصالات ← Cloud Server / ADMS</code>
        </li>
        <li>
          فعّل <code style={codeStyle}>Enable Domain Name</code> واكتب عنوان الخادم:
          <div style={{ margin: '6px 0', padding: '8px 10px', background: 'var(--ws-surface-2)', borderRadius: 7, fontFamily: 'monospace', direction: 'ltr', fontSize: 12 }}>
            {ADMS_HOST}
          </div>
          وإن طلب الجهاز منفذاً منفصلاً فاكتب <code style={codeStyle}>80</code> للاتصال العادي
          أو <code style={codeStyle}>443</code> إن كان جهازك يدعم HTTPS.
        </li>
        <li>
          اترك <code style={codeStyle}>Enable Proxy Server</code> معطّلاً، واحفظ ثم أعد تشغيل الجهاز.
        </li>
        <li>
          خلال دقيقة سيظهر الجهاز في قائمة «الأجهزة» على يسار هذه الصفحة بحالة
          «بانتظار الاعتماد» — اضغط «اعتماد» وابدأ.
        </li>
        <li>
          فعّل «حضور البصمة» من <strong>إعدادات حضور البوابة</strong> — ومنها أيضاً تُضبط بداية
          الدوام ومهلة التأخير ووقت رصد الغياب، وهي مشتركة بين البصمة والباركود.
        </li>
      </ol>

      <WsAlert tone="info" boxed>
        الجهاز يتّصل بنا صادراً من شبكة المدرسة، فلا يحتاج عنواناً ثابتاً ولا فتح منافذ في
        الراوتر. وإن انقطع الإنترنت فالبصمات تُحفظ في ذاكرة الجهاز وتصل عند عودته — ويُحسب
        الحضور على وقتها الحقيقي لا وقت وصولها.
      </WsAlert>
    </WsBlock>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'start',
  padding: '6px 8px',
  fontWeight: 500,
}

const tdStyle: React.CSSProperties = {
  padding: '7px 8px',
  verticalAlign: 'middle',
}

const codeStyle: React.CSSProperties = {
  background: 'var(--ws-surface-2)',
  padding: '1px 5px',
  borderRadius: 4,
  fontSize: 11,
}
