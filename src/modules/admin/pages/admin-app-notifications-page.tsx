import { useState, useMemo } from 'react'
import {
  Apple,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  History,
  Radio,
  Search,
  Send,
  Smartphone,
  Users,
  X,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsTextarea,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsTable,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  InitialAvatar,
  type Tone,
} from '@/shared/workspace'
import {
  useNotificationStatsQuery,
  useTeachersAppStatusQuery,
  useNotificationHistoryQuery,
  useSendNotificationMutation,
} from '../app-notifications/hooks'
import type { TeacherFilterStatus, SendNotificationPayload, NotificationLogEntry } from '../app-notifications/types'

const roleLabels: Record<string, string> = {
  teacher: 'معلم',
  school_principal: 'مدير المدرسة',
  deputy_teachers: 'وكيل شؤون المعلمين',
  deputy_students: 'وكيل شؤون الطلاب',
  student_counselor: 'مرشد طلابي',
  administrative_staff: 'إداري',
}

const PLATFORM_ICON: Record<string, typeof Globe> = {
  web: Globe,
  android: Smartphone,
  ios: Apple,
}

const RECIPIENT_TYPE_META: Record<string, { label: string; tone: Tone }> = {
  individual: { label: 'فردي', tone: TONES.sky },
  bulk_selected: { label: 'مجموعة', tone: TONES.purple },
  bulk_all: { label: 'الكل', tone: TONES.gray },
}

const LOG_STATUS_META: Record<string, { label: string; tone: Tone; live?: boolean }> = {
  pending: { label: 'بالانتظار', tone: TONES.amber, live: true },
  sending: { label: 'يُرسَل', tone: TONES.amber, live: true },
  completed: { label: 'اكتمل', tone: TONES.green },
  failed: { label: 'فشل', tone: TONES.red },
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} د`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-SA-u-nu-latn')
}

export default function AdminAppNotificationsPage() {
  // ========== State ==========
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [recipientType, setRecipientType] = useState<'bulk_all' | 'bulk_selected'>('bulk_all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())

  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherFilter, setTeacherFilter] = useState<TeacherFilterStatus>('all')

  const [historyPage, setHistoryPage] = useState(1)
  const [detailLog, setDetailLog] = useState<NotificationLogEntry | null>(null)

  // ========== Queries ==========
  const statsQuery = useNotificationStatsQuery()
  const teachersQuery = useTeachersAppStatusQuery({ search: teacherSearch, status: teacherFilter })
  const historyQuery = useNotificationHistoryQuery(historyPage)
  const sendMutation = useSendNotificationMutation()

  const stats = statsQuery.data
  const teachers = teachersQuery.data ?? []
  const history = historyQuery.data

  // المعلمون اللي عندهم التطبيق (لقائمة الاختيار)
  const installableTeachers = useMemo(
    () => teachers.filter((t) => t.has_app),
    [teachers],
  )

  // ========== Handlers ==========
  const toggleTeacher = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInstalled = () => {
    setSelectedUserIds(new Set(installableTeachers.map((t) => t.id)))
  }

  const deselectAll = () => {
    setSelectedUserIds(new Set())
  }

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return
    if (recipientType === 'bulk_selected' && selectedUserIds.size === 0) return

    const payload: SendNotificationPayload = {
      title: title.trim(),
      body: body.trim(),
      image: imageUrl.trim() || undefined,
      recipient_type: recipientType,
      user_ids: recipientType === 'bulk_selected' ? Array.from(selectedUserIds) : undefined,
    }

    sendMutation.mutate(payload, {
      onSuccess: () => {
        setTitle('')
        setBody('')
        setImageUrl('')
        setSelectedUserIds(new Set())
      },
    })
  }

  /* ── ★ مدى الإذاعة: من سيسمعك ومن لن يسمعك ── */
  const reach = useMemo(() => {
    if (recipientType === 'bulk_all') {
      const total = stats?.total_teachers ?? 0
      const hear = stats?.with_app ?? 0
      return { total, hear, deaf: Math.max(0, total - hear) }
    }
    // مجموعة مختارة: كلهم مثبّتون بحكم القائمة، لكن نتحقق فعلاً
    const chosen = teachers.filter((t) => selectedUserIds.has(t.id))
    const hear = chosen.filter((t) => t.has_app).length
    return { total: chosen.length, hear, deaf: chosen.length - hear }
  }, [recipientType, stats, teachers, selectedUserIds])

  const hearPct = reach.total > 0 ? (reach.hear / reach.total) * 100 : 0
  const canSend = Boolean(title.trim() && body.trim()) && (recipientType === 'bulk_all' || selectedUserIds.size > 0)
  const hasStuck = (history?.data ?? []).some((log) => log.status === 'sending' || log.status === 'pending')

  return (
    <WsPage>
      <WsHeader
        title="إشعارات التطبيق"
        badge={hasStuck ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: TONES.amber.tx }}>
            <span className="ws-pulse" style={{ background: TONES.amber.tx }} />
            إرسال جارٍ
          </span>
        ) : undefined}
        facts={
          <>
            <WsFact icon={Users} label="المنسوبون">{stats?.total_teachers ?? 0}</WsFact>
            <WsFact icon={Bell} label="مثبتو التطبيق">
              <span style={{ color: TONES.green.tx }}>{stats?.with_app ?? 0}</span>
            </WsFact>
            {/* الرقم الذي لم يكن أحد يقوله: كم رأساً لن يسمع */}
            <WsFact icon={BellOff} label="لن يسمعوا">
              <span style={{ color: (stats?.without_app ?? 0) > 0 ? TONES.red.tx : undefined }}>
                {stats?.without_app ?? 0}
              </span>
            </WsFact>
            <WsFact icon={Radio} label="نسبة التثبيت">{stats?.app_install_rate ?? 0}%</WsFact>
            <WsFact icon={CheckCircle2} label="التوصيل (30 يوم)">{stats?.delivery_rate_30d ?? 0}%</WsFact>
            <WsFact icon={History} label="إشعارات (30 يوم)">{stats?.total_notifications_30d ?? 0}</WsFact>
            {stats && (
              <WsFact icon={Smartphone} label="الأجهزة">
                {stats.platforms.web + stats.platforms.android + stats.platforms.ios}
              </WsFact>
            )}
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث في المنسوبين" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              type="search"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="ابحث بالاسم..."
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
          </div>
        </WsField>
        <WsField label="حالة التطبيق">
          <div className="ws-seg">
            {([
              ['all', 'الكل'],
              ['installed', 'مثبّت'],
              ['not_installed', 'غير مثبّت'],
            ] as Array<[TeacherFilterStatus, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ws-seg__btn ${teacherFilter === value ? 'is-active' : ''}`}
                onClick={() => setTeacherFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </WsField>
        {selectedUserIds.size > 0 && (
          <WsBtn size="sm" icon={X} onClick={deselectAll}>
            إلغاء التحديد
            <span className="ws-count">{selectedUserIds.size}</span>
          </WsBtn>
        )}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* كشف واحد لا كشفان: القائمة نفسها تُشخّص وتُحدَّد */}
          <WsBlock
            fill
            title="المنسوبون وأجهزتهم"
            icon={Users}
            count={teachers.length}
            tools={
              recipientType === 'bulk_selected' ? (
                <WsBtn size="sm" icon={CheckCircle2} onClick={selectAllInstalled}>
                  تحديد كل المثبّتين ({installableTeachers.length})
                </WsBtn>
              ) : undefined
            }
          >
            {teachersQuery.isLoading ? (
              <WsEmpty loading>جارٍ تحميل المنسوبين...</WsEmpty>
            ) : teachers.length === 0 ? (
              <WsEmpty icon={Users}>لا يوجد منسوبون مطابقون</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    {recipientType === 'bulk_selected' && <th style={{ width: 36 }}></th>}
                    <th>الاسم</th>
                    <th>الدور</th>
                    <th>الأجهزة</th>
                    <th>المنصات</th>
                    <th>آخر نشاط</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const selected = selectedUserIds.has(teacher.id)
                    const selectable = recipientType === 'bulk_selected' && teacher.has_app
                    return (
                      <tr
                        key={teacher.id}
                        className={selectable ? 'is-clickable' : undefined}
                        onClick={() => selectable && toggleTeacher(teacher.id)}
                        /* الغسلة = عمل مطلوب: من لن يسمع وحده يُصبغ */
                        style={
                          selected
                            ? { background: 'var(--ws-accent-soft)' }
                            : !teacher.has_app
                              ? { background: TONES.red.bg }
                              : undefined
                        }
                      >
                        {recipientType === 'bulk_selected' && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!teacher.has_app}
                              onChange={() => toggleTeacher(teacher.id)}
                            />
                          </td>
                        )}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <InitialAvatar
                              name={teacher.name}
                              tone={teacher.has_app ? TONES.green : TONES.red}
                              size={22}
                            />
                            <span style={{ fontWeight: 600 }}>{teacher.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--ws-text-2)' }}>{roleLabels[teacher.role] ?? teacher.role}</td>
                        <td>
                          {teacher.has_app ? (
                            <b style={{ color: TONES.green.tx }}>{teacher.devices_count}</b>
                          ) : (
                            <ToneChip tone={TONES.red}>لن يسمع</ToneChip>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            {teacher.platforms.map((platform) => {
                              const Icon = PLATFORM_ICON[platform] ?? Globe
                              return (
                                <Icon
                                  key={platform}
                                  style={{ width: 13, height: 13, color: 'var(--ws-text-2)' }}
                                  aria-label={platform}
                                />
                              )
                            })}
                            {teacher.platforms.length === 0 && <span style={{ color: 'var(--ws-text-2)' }}>—</span>}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>{timeAgo(teacher.last_active_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>

          {/* سجل الإرسال */}
          <WsBlock
            fill
            scroll
            title="سجل الإرسال"
            icon={History}
            count={history?.meta?.total ?? history?.data?.length ?? 0}
            tools={
              history && history.meta && history.meta.last_page > 1 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    صفحة {history.meta.current_page} من {history.meta.last_page}
                  </span>
                  <WsIconBtn
                    icon={ChevronRight}
                    label="السابق"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  />
                  <WsIconBtn
                    icon={ChevronLeft}
                    label="التالي"
                    disabled={historyPage >= (history.meta.last_page ?? 1)}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  />
                </span>
              ) : undefined
            }
          >
            {historyQuery.isLoading ? (
              <WsEmpty loading>جارٍ تحميل السجل...</WsEmpty>
            ) : !history?.data?.length ? (
              <WsEmpty icon={History}>لم تُرسل إشعارات بعد</WsEmpty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10 }}>
                {history.data.map((log) => {
                  const rType = RECIPIENT_TYPE_META[log.recipient_type] ?? RECIPIENT_TYPE_META.individual
                  const st = LOG_STATUS_META[log.status] ?? LOG_STATUS_META.completed
                  /* الصدق: النسبة من عدد الرؤوس لا من عدد التوكنات
                     (كانت «٢٥/٢٥ = ١٠٠٪» أخضر بينما ٢٥ إنساناً لم يصلهم شيء) */
                  const heads = log.total_recipients || 0
                  const reachedPct = heads > 0 ? Math.round((log.delivered_count / heads) * 100) : 0
                  const silent = Math.max(0, heads - log.delivered_count)
                  const pctTone = reachedPct >= 90 ? TONES.green : reachedPct >= 70 ? TONES.amber : TONES.red
                  return (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setDetailLog(log)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        border: '1px solid var(--ws-border)',
                        borderRadius: 9,
                        padding: 9,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        background: 'transparent',
                        color: 'var(--ws-text)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.title}
                          </span>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.body}
                          </span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <ToneChip tone={rType.tone}>{rType.label}</ToneChip>
                          <span className={st.live ? 'ws-soft-pulse' : undefined}>
                            <ToneChip tone={st.tone}>{st.label}</ToneChip>
                          </span>
                        </span>
                      </span>

                      {/* شريط الوصول الصادق */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                        <span style={{ display: 'block', flex: 1, height: 5, borderRadius: 3, background: TONES.red.bg, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${reachedPct}%`, background: pctTone.tx }} />
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pctTone.tx, flexShrink: 0 }}>
                          {log.delivered_count}/{heads} رأس · {reachedPct}%
                        </span>
                        {silent > 0 && (
                          <span style={{ fontSize: 10, color: TONES.red.tx, flexShrink: 0 }}>{silent} لم يسمع</span>
                        )}
                        <span style={{ fontSize: 9.5, color: 'var(--ws-text-2)', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* ═══ المُذيع: مدى الإذاعة + المعاينة + الإرسال ═══ */}
        <WsSideCol side="end" title="إرسال إشعار" icon={Send} storageKey="ws:app-notifications:composer" width={350}>
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* ★ مدى الإذاعة */}
              <div>
                <p className="ws-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Radio style={{ width: 12, height: 12 }} /> مدى الإذاعة
                </p>
                <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--ws-border)' }}>
                  {reach.hear > 0 && (
                    <span
                      title={`${reach.hear} سيسمعون`}
                      style={{
                        width: `${hearPct}%`,
                        background: TONES.green.bg,
                        borderInlineEnd: reach.deaf > 0 ? `1px solid ${TONES.green.bd}` : undefined,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        color: TONES.green.tx,
                      }}
                    >
                      {reach.hear}
                    </span>
                  )}
                  {reach.deaf > 0 && (
                    <span
                      title={`${reach.deaf} لن يسمعوا — لا تطبيق مثبّت`}
                      style={{
                        width: `${100 - hearPct}%`,
                        background: `repeating-linear-gradient(45deg, ${TONES.red.bg} 0 4px, transparent 4px 8px)`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        color: TONES.red.tx,
                      }}
                    >
                      {reach.deaf}
                    </span>
                  )}
                  {reach.total === 0 && (
                    <span style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--ws-text-2)' }}>
                      لم تُحدد جمهوراً
                    </span>
                  )}
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 10.5, lineHeight: 1.7 }}>
                  <span style={{ color: TONES.green.tx, fontWeight: 700 }}>{reach.hear} سيسمعون</span>
                  {reach.deaf > 0 && (
                    <>
                      <span style={{ color: 'var(--ws-text-2)' }}> · </span>
                      <span style={{ color: TONES.red.tx, fontWeight: 700 }}>{reach.deaf} لن يسمعوا</span>
                      <span style={{ color: 'var(--ws-text-2)' }}> (لا تطبيق مثبّت)</span>
                    </>
                  )}
                </p>
              </div>

              {/* الجمهور */}
              <WsField label="الجمهور">
                <div className="ws-seg">
                  <button
                    type="button"
                    className={`ws-seg__btn ${recipientType === 'bulk_all' ? 'is-active' : ''}`}
                    onClick={() => setRecipientType('bulk_all')}
                  >
                    كل المنسوبين
                  </button>
                  <button
                    type="button"
                    className={`ws-seg__btn ${recipientType === 'bulk_selected' ? 'is-active' : ''}`}
                    onClick={() => setRecipientType('bulk_selected')}
                  >
                    مجموعة مختارة
                    {selectedUserIds.size > 0 && <span className="ws-count">{selectedUserIds.size}</span>}
                  </button>
                </div>
                {recipientType === 'bulk_selected' && selectedUserIds.size === 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 10.5, color: TONES.amber.tx }}>
                    حدّد منسوبين من الجدول — الصفوف الحمراء بلا تطبيق فلا تُحدَّد
                  </p>
                )}
              </WsField>

              <WsField label="عنوان الإشعار" htmlFor="notif-title">
                <WsInput
                  id="notif-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="مثال: تذكير بالاجتماع"
                />
                <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--ws-text-2)', textAlign: 'left' }}>
                  {title.length}/100
                </p>
              </WsField>

              <WsField label="نص الإشعار" htmlFor="notif-body">
                <WsTextarea
                  id="notif-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="اكتب نص الإشعار..."
                />
                <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--ws-text-2)', textAlign: 'left' }}>
                  {body.length}/500
                </p>
              </WsField>

              <WsField label="رابط صورة (اختياري)" htmlFor="notif-image">
                <WsInput
                  id="notif-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
              </WsField>

              {/* معاينة حيّة: ما سيظهر على شاشة الجوال فعلاً */}
              <div>
                <p className="ws-label" style={{ marginBottom: 5 }}>كما يظهر على الجوال</p>
                {title.trim() || body.trim() ? (
                  <div
                    style={{
                      border: '1px solid var(--ws-border)',
                      borderRadius: 12,
                      padding: 9,
                      background: 'var(--ws-surface-2)',
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        flexShrink: 0,
                        background: 'var(--ws-accent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Bell style={{ width: 14, height: 14, color: '#fff' }} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800 }}>{title.trim() || 'عنوان الإشعار'}</span>
                        <span style={{ fontSize: 9, color: 'var(--ws-text-2)', flexShrink: 0 }}>الآن</span>
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.6, marginTop: 2 }}>
                        {body.trim() || 'نص الإشعار...'}
                      </span>
                      {imageUrl.trim() && (
                        <img
                          src={imageUrl}
                          alt=""
                          style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 6, marginTop: 5 }}
                        />
                      )}
                    </span>
                  </div>
                ) : (
                  <WsEmpty icon={Bell}>اكتب لترى ما سيصل</WsEmpty>
                )}
              </div>

              {reach.deaf > 0 && canSend && (
                <WsAlert tone="warn" boxed>
                  {reach.deaf} من {reach.total} لن يصلهم هذا الإشعار — لم يثبّتوا التطبيق
                </WsAlert>
              )}

              <WsBtn
                variant="primary"
                icon={Send}
                onClick={handleSend}
                disabled={!canSend || sendMutation.isPending}
                style={{ justifyContent: 'center' }}
              >
                {sendMutation.isPending
                  ? 'جارٍ الإرسال...'
                  : reach.hear > 0
                    ? `إرسال إلى ${reach.hear}`
                    : 'إرسال'}
              </WsBtn>
              {!canSend && (
                <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                  {!title.trim() || !body.trim() ? 'أكمل العنوان والنص' : 'حدّد منسوبين أولاً'}
                </p>
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* تفاصيل سجل الإرسال */}
      {detailLog && (
        <div className="ws-modal" onClick={() => setDetailLog(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">{detailLog.title}</h3>
                  <p className="ws-modal__sub">{timeAgo(detailLog.created_at)}</p>
                </div>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => setDetailLog(null)} />
              </div>
            </header>
            <div className="ws-modal__body">
              <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 9, padding: 10 }}>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailLog.body}</p>
              </div>

              <WsFactsList>
                <WsFactRow label="الحالة">
                  <ToneChip tone={(LOG_STATUS_META[detailLog.status] ?? LOG_STATUS_META.completed).tone}>
                    {(LOG_STATUS_META[detailLog.status] ?? LOG_STATUS_META.completed).label}
                  </ToneChip>
                </WsFactRow>
                <WsFactRow label="الجمهور">
                  <ToneChip tone={(RECIPIENT_TYPE_META[detailLog.recipient_type] ?? RECIPIENT_TYPE_META.individual).tone}>
                    {(RECIPIENT_TYPE_META[detailLog.recipient_type] ?? RECIPIENT_TYPE_META.individual).label}
                  </ToneChip>
                </WsFactRow>
                <WsFactRow label="الرؤوس المستهدفة">{detailLog.total_recipients}</WsFactRow>
                <WsFactRow label="الأجهزة المستهدفة">{detailLog.total_tokens}</WsFactRow>
                <WsFactRow label="وصل">
                  <span style={{ color: TONES.green.tx, fontWeight: 700 }}>{detailLog.delivered_count}</span>
                </WsFactRow>
                <WsFactRow label="فشل">
                  <span style={{ color: detailLog.failed_count > 0 ? TONES.red.tx : undefined }}>{detailLog.failed_count}</span>
                </WsFactRow>
                {/* الرقم الصادق: كم رأساً لم يسمع فعلاً */}
                <WsFactRow label="لم يسمعوا">
                  <span style={{ color: TONES.red.tx, fontWeight: 700 }}>
                    {Math.max(0, detailLog.total_recipients - detailLog.delivered_count)}
                  </span>
                </WsFactRow>
                {detailLog.sender && <WsFactRow label="المرسِل">{detailLog.sender.name}</WsFactRow>}
                {detailLog.completed_at && (
                  <WsFactRow label="اكتمل في">{new Date(detailLog.completed_at).toLocaleString('ar-SA-u-nu-latn')}</WsFactRow>
                )}
              </WsFactsList>

              {detailLog.recipients?.length > 0 && (
                <div>
                  <p className="ws-label" style={{ marginBottom: 5 }}>المستلمون ({detailLog.recipients.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                    {detailLog.recipients.map((r) => (
                      <span key={r.id} className="ws-chip">{r.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WsPage>
  )
}
