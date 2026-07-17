import { useMemo, useState } from 'react'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Link2,
  RefreshCw,
  Settings,
  Timer,
  Users,
} from 'lucide-react'
import {
  useFarisSettingsQuery,
  useSaveFarisSettingsMutation,
  useTestFarisConnectionMutation,
  useTriggerDailySyncMutation,
  useTriggerFullSyncMutation,
  useSyncStatusQuery,
  useSyncLogsQuery,
  useReconciliationQuery,
} from '../faris/hooks'
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
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsProgress,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import { LeaveClip, syncStatusMeta, relTime, ABSENCE_REASON_AR } from './faris-ui'

export default function AdminFarisPage() {
  const [selectedNatId, setSelectedNatId] = useState<string | null>(null)
  const [farisStatus, setFarisStatus] = useState('')
  const [page, setPage] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: settings } = useFarisSettingsQuery()
  const syncStatus = useSyncStatusQuery(true)
  const { data: logs } = useSyncLogsQuery()
  const triggerDaily = useTriggerDailySyncMutation()
  const triggerFull = useTriggerFullSyncMutation()

  const { data, isLoading, isError, refetch } = useReconciliationQuery({
    faris_status: farisStatus || undefined,
    national_id: selectedNatId || undefined,
    per_page: 50,
    page,
  })

  const status = syncStatus.data?.sync_log
  const isRunning = status?.status === 'running' || status?.status === 'pending'
  const stats = data?.stats
  const absences = useMemo(() => data?.absences?.data ?? [], [data])
  const meta = data?.absences?.meta

  const lastFull = useMemo(
    () => logs?.logs?.find((l) => l.sync_type === 'full_year' && l.status === 'completed'),
    [logs],
  )

  const cacheAgeDays = useMemo(() => {
    if (!lastFull?.completed_at) return null
    return Math.floor((Date.now() - Date.parse(lastFull.completed_at)) / 86_400_000)
  }, [lastFull])

  // شجرة المعلمين مشتقّة من الغيابات المعروضة
  const teachers = useMemo(() => {
    const map = new Map<string, { name: string; natId: string; total: number; noLeave: number }>()
    for (const a of absences) {
      const natId = a.national_id
      if (!map.has(natId)) {
        map.set(natId, { name: a.user?.name ?? a.employee_name ?? natId, natId, total: 0, noLeave: 0 })
      }
      const t = map.get(natId)!
      t.total += 1
      if (a.faris_sync_status === 'no_leave') t.noLeave += 1
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [absences])

  const dur = (log: typeof lastFull) => {
    if (!log?.started_at || !log?.completed_at) return '—'
    const s = Math.round((Date.parse(log.completed_at) - Date.parse(log.started_at)) / 1000)
    if (s < 60) return `${s} ث`
    return `${Math.floor(s / 60)} د ${s % 60} ث`
  }

  const STATUS_FILTERS: Array<{ value: string; label: string }> = [
    { value: '', label: 'الكل' },
    { value: 'matched', label: 'مطابق' },
    { value: 'no_leave', label: 'بلا إجازة' },
    { value: 'pending_leave', label: 'طلب معلّق' },
    { value: 'not_synced', label: 'غير مزامن' },
  ]

  return (
    <WsPage>
      <WsHeader
        title="ربط فارس"
        badge={
          <span style={{ color: settings?.enabled ? TONES.green.tx : 'var(--ws-text-2)' }}>
            {settings?.enabled ? 'مفعّل' : 'معطّل'}
          </span>
        }
        actions={
          <>
            <WsBtn icon={RefreshCw} onClick={() => triggerDaily.mutate()} disabled={isRunning || triggerDaily.isPending}>
              مزامنة يومية
            </WsBtn>
            <WsBtn variant="primary" icon={RefreshCw} onClick={() => triggerFull.mutate(undefined)} disabled={isRunning || triggerFull.isPending}>
              مزامنة شاملة
            </WsBtn>
            <WsIconBtn icon={Settings} label="إعدادات الاتصال" onClick={() => setSettingsOpen(true)} />
          </>
        }
        facts={
          <>
            <WsFact icon={CalendarRange} label="إجمالي الغيابات">{stats?.total_absences ?? 0}</WsFact>
            <WsFact icon={Database} label="آخر مزامنة شاملة">{relTime(lastFull?.completed_at)}</WsFact>
            <WsFact icon={Timer} label="استغرقت">{dur(lastFull)}</WsFact>
            <WsFact icon={Layers} label="إجازات في الكاش">{lastFull?.leaves_cached ?? '—'}</WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="حالة فارس">
          <div className="ws-seg">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.value === 'matched'
                  ? stats?.matched
                  : f.value === 'no_leave'
                    ? stats?.no_leave
                    : f.value === 'pending_leave'
                      ? stats?.pending_leave
                      : f.value === 'not_synced'
                        ? stats?.not_synced
                        : stats?.total_absences
              return (
                <button
                  key={f.value}
                  type="button"
                  className={`ws-seg__btn ${farisStatus === f.value ? 'is-active' : ''}`}
                  onClick={() => {
                    setFarisStatus(f.value)
                    setPage(1)
                  }}
                >
                  {f.label}
                  {count != null && count > 0 && <span className="ws-count">{count}</span>}
                </button>
              )
            })}
          </div>
        </WsField>
      </WsToolbar>

      {isRunning && status && (
        <WsBlock padded>
          <WsProgress
            value={status.progress_total > 0 ? (status.progress_current / status.progress_total) * 100 : 0}
            label={status.progress_message ?? 'جارٍ المزامنة...'}
          />
        </WsBlock>
      )}

      {cacheAgeDays != null && cacheAgeDays > 30 && (
        <WsAlert tone="warn" boxed>
          آخر مزامنة شاملة منذ {cacheAgeDays} يوماً — قد لا تعكس المطابقة أحدث إجازات فارس.
        </WsAlert>
      )}

      <WsLayout>
        <WsSideCol side="start" title="المعلمون" icon={Users} storageKey="ws:faris:sidecol" width={280}>
          <WsBlock fill scroll>
            <div style={{ padding: 8 }}>
              <button
                type="button"
                className={`ws-pick ${selectedNatId === null ? 'is-checked' : ''}`}
                onClick={() => {
                  setSelectedNatId(null)
                  setPage(1)
                }}
                style={{ width: '100%', textAlign: 'right', marginBottom: 4 }}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="ws-pick__name">كل المعلمين</span>
                  <span className="ws-pick__sub">{teachers.length} معلماً في هذه الصفحة</span>
                </span>
              </button>
              {teachers.map((t) => (
                <button
                  key={t.natId}
                  type="button"
                  className={`ws-pick ${selectedNatId === t.natId ? 'is-checked' : ''}`}
                  onClick={() => {
                    setSelectedNatId(t.natId)
                    setPage(1)
                  }}
                  style={{ width: '100%', textAlign: 'right', marginBottom: 2 }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="ws-pick__name">{t.name}</span>
                    <span className="ws-pick__sub">
                      {t.total} غياباً
                      {t.noLeave > 0 && ` · ${t.noLeave} بلا إجازة`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <WsBlock
            fill
            scroll
            title="الغيابات"
            icon={CalendarRange}
            count={meta?.total ?? absences.length}
            tools={
              meta && meta.last_page > 1 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    صفحة {meta.current_page} من {meta.last_page}
                  </span>
                  <WsIconBtn icon={ChevronRight} label="السابق" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                  <WsIconBtn icon={ChevronLeft} label="التالي" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} />
                </span>
              ) : undefined
            }
          >
            {isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل تقرير المطابقة.
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>إعادة المحاولة</WsBtn>
                </WsAlert>
              </div>
            ) : isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : absences.length === 0 ? (
              <WsEmpty icon={CalendarRange}>لا غيابات مطابقة للفلتر</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th style={{ width: 96 }}>التاريخ</th>
                    <th style={{ width: 120 }}>سبب الغياب</th>
                    <th style={{ width: 210 }}>مطابقة الإجازة</th>
                    <th style={{ width: 96 }}>حالة فارس</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((absence) => {
                    const sm = syncStatusMeta(absence.faris_sync_status)
                    return (
                      <tr key={absence.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>
                            {absence.user?.name || absence.employee_name || absence.national_id}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>
                          {absence.attendance_date.slice(0, 10)}
                        </td>
                        <td style={{ color: 'var(--ws-text-2)' }}>
                          {absence.absence_reason
                            ? ABSENCE_REASON_AR[absence.absence_reason] ?? absence.absence_reason
                            : '—'}
                        </td>
                        <td>
                          <LeaveClip absence={absence} />
                        </td>
                        <td>
                          <ToneChip tone={sm.tone}>{sm.label}</ToneChip>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </WsPage>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data: settings } = useFarisSettingsQuery()
  const save = useSaveFarisSettingsMutation()
  const test = useTestFarisConnectionMutation()

  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [username, setUsername] = useState(settings?.username ?? '')
  const [password, setPassword] = useState('')

  return (
    <div className="ws-modal" onClick={onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">إعدادات الاتصال بفارس</h3>
          <p className="ws-modal__sub">
            {settings?.has_password ? 'كلمة المرور محفوظة — اتركها فارغة للإبقاء عليها' : 'أدخل بيانات الدخول'}
          </p>
        </header>
        <div className="ws-modal__body">
          <WsField label="تفعيل ربط فارس">
            <WsSwitch checked={enabled} onChange={setEnabled} />
          </WsField>
          <WsField label="اسم المستخدم (رقم الهوية)" htmlFor="faris-user">
            <WsInput id="faris-user" value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" />
          </WsField>
          <WsField label="كلمة المرور" htmlFor="faris-pass">
            <WsInput
              id="faris-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              placeholder={settings?.has_password ? '••••••••' : ''}
            />
          </WsField>
          <WsBtn size="sm" icon={Link2} onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? 'جارٍ الاختبار...' : 'اختبار الاتصال'}
          </WsBtn>
          {test.data && (
            <div style={{ marginTop: 8 }}>
              <WsAlert tone={test.data.success ? 'success' : 'error'} boxed>
                {test.data.message}
                {test.data.employees_count != null && ` (${test.data.employees_count} موظف)`}
              </WsAlert>
            </div>
          )}
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose}>إلغاء</WsBtn>
          <WsBtn
            variant="primary"
            disabled={save.isPending}
            onClick={() => save.mutate({ enabled, username, password: password || undefined }, { onSuccess: onClose })}
          >
            {save.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}
