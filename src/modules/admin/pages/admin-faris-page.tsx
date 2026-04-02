import { useState } from 'react'
import { Link2, Settings, FileCheck, Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

/** تحويل تاريخ ISO/UTC إلى تاريخ ميلادي مقروء (YYYY-MM-DD) بتوقيت السعودية */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    // تحويل لتوقيت السعودية (+3)
    const offset = d.getTimezoneOffset() + 180 // 180 = +3 hours in minutes
    d.setMinutes(d.getMinutes() + offset)
    return d.toISOString().split('T')[0]
  } catch {
    return dateStr.split('T')[0] || dateStr
  }
}

/** خريطة أسباب الغياب إلى العربية */
const ABSENCE_REASON_AR: Record<string, string> = {
  unjustified: 'غير مبرر',
  delegated: 'مكلف',
  annual_leave: 'إجازة عادية',
  sick_leave: 'إجازة مرضية',
  emergency_leave: 'إجازة اضطرارية',
  exceptional_leave: 'إجازة استثنائية',
  deduction: 'حسم',
  companion_leave: 'إجازة مرافقة',
  training_course: 'دورة تدريبية',
  workshop: 'ورشة عمل',
  makeup: 'مكمل',
  bereavement_leave: 'إجازة وفاة',
  maternity_leave: 'إجازة وضع',
  exam_leave: 'إجازة امتحانات',
  paternity_leave: 'إجازة أبوة',
  motherhood_leave: 'إجازة أمومة',
  disaster: 'كارثة',
  sports_leave: 'إجازة رياضية',
  dialysis_leave: 'إجازة غسيل كلى',
  disability_care_leave: 'إجازة رعاية ذوي إعاقة',
  patient_companion_leave: 'إجازة مرافقة مريض',
  international_sports_leave: 'إجازة رياضية خارجية',
  accident_sick_leave: 'إجازة مرضية حادث',
  pending: 'تحت الإجراء',
  remote_work: 'دوام عن بعد',
}
import {
  useFarisSettingsQuery,
  useSaveFarisSettingsMutation,
  useTestFarisConnectionMutation,
  useSyncStatusQuery,
  useTriggerDailySyncMutation,
  useTriggerFullSyncMutation,
  useReconciliationQuery,
  useFarisLeavesQuery,
  useFarisPendingQuery,
  useSyncLogsQuery,
} from '../faris/hooks'
import type { FarisSyncLog } from '../faris/types'

type Tab = 'settings' | 'reconciliation' | 'leaves' | 'pending'

export default function AdminFarisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reconciliation')

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'settings', label: 'الإعدادات', icon: Settings },
    { key: 'reconciliation', label: 'تقرير المطابقة', icon: FileCheck },
    { key: 'leaves', label: 'إجازات فارس', icon: Link2 },
    { key: 'pending', label: 'الطلبات المعلقة', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">ربط فارس</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'reconciliation' && <ReconciliationTab />}
      {activeTab === 'leaves' && <LeavesTab />}
      {activeTab === 'pending' && <PendingTab />}
    </div>
  )
}

// ========================================
// تبويب الإعدادات
// ========================================

function SettingsTab() {
  const { data: settings, isLoading } = useFarisSettingsQuery()
  const saveMutation = useSaveFarisSettingsMutation()
  const testMutation = useTestFarisConnectionMutation()
  const { data: syncLogs } = useSyncLogsQuery()

  const [enabled, setEnabled] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (isLoading) return <LoadingSpinner />

  if (settings && !initialized) {
    setEnabled(settings.enabled)
    setUsername(settings.username)
    setInitialized(true)
  }

  const handleSave = () => {
    saveMutation.mutate({ enabled, username, password: password || undefined })
  }

  const handleTest = () => {
    testMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <h2 className="text-lg font-semibold">بيانات الاتصال بفارس</h2>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="peer sr-only" />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full"></div>
          </label>
          <span className="text-sm font-medium">تفعيل ربط فارس</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="رقم الهوية"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              كلمة المرور {settings?.has_password && <span className="text-green-600 text-xs">(محفوظة)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings?.has_password ? 'اتركه فارغاً للإبقاء على الحالية' : 'كلمة المرور'}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {testMutation.isPending ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </button>
        </div>

        {saveMutation.isSuccess && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">تم حفظ الإعدادات بنجاح</div>
        )}
        {testMutation.data && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${testMutation.data.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {testMutation.data.message}
            {testMutation.data.employees_count !== undefined && ` (${testMutation.data.employees_count} موظف)`}
          </div>
        )}
      </div>

      {/* سجل المزامنات */}
      {syncLogs?.logs && syncLogs.logs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">سجل المزامنات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">الموظفين</th>
                  <th className="px-4 py-3 text-right">مطابق</th>
                  <th className="px-4 py-3 text-right">الخطأ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncLogs.logs.map((log: FarisSyncLog) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">{log.sync_date}</td>
                    <td className="px-4 py-3">{log.sync_type === 'daily' ? 'يومية' : 'شاملة'}</td>
                    <td className="px-4 py-3"><SyncStatusBadge status={log.status} /></td>
                    <td className="px-4 py-3">{log.employees_found}</td>
                    <td className="px-4 py-3">{log.leaves_matched}</td>
                    <td className="px-4 py-3 text-red-600 text-xs max-w-48 truncate">{log.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ========================================
// تبويب تقرير المطابقة
// ========================================

function ReconciliationTab() {
  const [farisStatus, setFarisStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useReconciliationQuery({ faris_status: farisStatus || undefined, per_page: 50, page })
  const syncStatus = useSyncStatusQuery(true)
  const triggerDaily = useTriggerDailySyncMutation()
  const triggerFull = useTriggerFullSyncMutation()

  const isRunning = syncStatus.data?.sync_log?.status === 'running'

  return (
    <div className="space-y-6">
      {/* شريط التقدم */}
      {isRunning && syncStatus.data?.sync_log && (
        <SyncProgressBar log={syncStatus.data.sync_log} />
      )}

      {/* الإحصائيات */}
      {data?.stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="إجمالي الغيابات" value={data.stats.total_absences} color="slate" />
          <StatCard label="مطابق فارس" value={data.stats.matched} color="emerald" />
          <StatCard label="بدون إجازة" value={data.stats.no_leave} color="rose" />
          <StatCard label="طلب معلق" value={data.stats.pending_leave} color="amber" />
          <StatCard label="غير مزامن" value={data.stats.not_synced} color="gray" />
        </div>
      )}

      {/* أزرار المزامنة */}
      <div className="flex gap-3">
        <button
          onClick={() => triggerDaily.mutate()}
          disabled={isRunning || triggerDaily.isPending}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${triggerDaily.isPending ? 'animate-spin' : ''}`} />
          مزامنة يومية
        </button>
        <button
          onClick={() => triggerFull.mutate(undefined)}
          disabled={isRunning || triggerFull.isPending}
          className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${triggerFull.isPending ? 'animate-spin' : ''}`} />
          مزامنة شاملة
        </button>

        {/* فلتر حالة فارس */}
        <select
          value={farisStatus}
          onChange={(e) => setFarisStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="matched">مطابق فارس</option>
          <option value="no_leave">بدون إجازة</option>
          <option value="pending_leave">طلب معلق</option>
          <option value="not_synced">غير مزامن</option>
        </select>
      </div>

      {/* جدول المطابقة */}
      {isLoading ? <LoadingSpinner /> : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right">المعلم</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-right">سبب الغياب</th>
                  <th className="px-4 py-3 text-right">حالة فارس</th>
                  <th className="px-4 py-3 text-right">نوع الإجازة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.absences?.data?.map((absence) => (
                  <tr key={absence.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium">{absence.user?.name || absence.employee_name || absence.national_id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(absence.attendance_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{absence.absence_reason ? (ABSENCE_REASON_AR[absence.absence_reason] || absence.absence_reason) : '-'}</td>
                    <td className="px-4 py-3"><FarisSyncBadge status={absence.faris_sync_status} /></td>
                    <td className="px-4 py-3 text-slate-600">{absence.faris_leave?.faris_leave_type || '-'}</td>
                  </tr>
                ))}
                {(!data?.absences?.data || data.absences.data.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">لا توجد بيانات</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.absences?.meta && (
            <Pagination meta={data.absences.meta} page={page} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  )
}

// ========================================
// تبويب إجازات فارس
// ========================================

function LeavesTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useFarisLeavesQuery({ per_page: 50, page })

  if (isLoading) return <LoadingSpinner />

  const leaves = data?.data || []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right">الموظف</th>
              <th className="px-4 py-3 text-right">نوع الإجازة</th>
              <th className="px-4 py-3 text-right">من (هجري)</th>
              <th className="px-4 py-3 text-right">إلى (هجري)</th>
              <th className="px-4 py-3 text-right">من (ميلادي)</th>
              <th className="px-4 py-3 text-right">إلى (ميلادي)</th>
              <th className="px-4 py-3 text-right">الأيام</th>
              <th className="px-4 py-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{leave.employee_name || leave.national_id}</td>
                <td className="px-4 py-3">{leave.faris_leave_type}</td>
                <td className="px-4 py-3 text-slate-600">{leave.start_date_hijri || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{leave.end_date_hijri || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(leave.start_date)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(leave.end_date)}</td>
                <td className="px-4 py-3 text-center">{leave.duration_days}</td>
                <td className="px-4 py-3"><LeaveStatusBadge status={leave.leave_status} /></td>
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">لا توجد إجازات مخزنة. شغّل "مزامنة شاملة" أولاً.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data?.meta && (
        <Pagination meta={data.meta} page={page} onPageChange={setPage} />
      )}
    </div>
  )
}

// ========================================
// تبويب الطلبات المعلقة
// ========================================

function PendingTab() {
  const { data, isLoading } = useFarisPendingQuery()

  if (isLoading) return <LoadingSpinner />

  const pending = data?.pending || []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right">الموظف</th>
              <th className="px-4 py-3 text-right">نوع الإجازة</th>
              <th className="px-4 py-3 text-right">من</th>
              <th className="px-4 py-3 text-right">إلى</th>
              <th className="px-4 py-3 text-right">الأيام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pending.map((leave) => (
              <tr key={leave.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{leave.employee_name || leave.national_id}</td>
                <td className="px-4 py-3">{leave.faris_leave_type}</td>
                <td className="px-4 py-3 text-slate-600">{leave.start_date_hijri} ({formatDate(leave.start_date)})</td>
                <td className="px-4 py-3 text-slate-600">{leave.end_date_hijri} ({formatDate(leave.end_date)})</td>
                <td className="px-4 py-3 text-center">{leave.duration_days}</td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">لا توجد طلبات معلقة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========================================
// مكونات مساعدة
// ========================================

function FarisSyncBadge({ status }: { status: string | null }) {
  if (!status) return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">غير مزامن</span>
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
    matched: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'مطابق فارس', icon: CheckCircle2 },
    no_leave: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'بدون إجازة', icon: XCircle },
    pending_leave: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'طلب معلق', icon: AlertCircle },
  }
  const s = map[status] || { bg: 'bg-slate-100', text: 'text-slate-500', label: status, icon: AlertCircle }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      <Icon className="h-3 w-3" />{s.label}
    </span>
  )
}

function LeaveStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'معتمدة' },
    pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'معلقة' },
    rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'مرفوضة' },
  }
  const s = map[status] || { bg: 'bg-slate-100 text-slate-500', label: status }
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${s.bg}`}>{s.label}</span>
}

function SyncStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  const labels: Record<string, string> = { pending: 'قيد الانتظار', running: 'قيد التشغيل', completed: 'مكتمل', failed: 'فشل' }
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${map[status] || ''}`}>{labels[status] || status}</span>
}

function SyncProgressBar({ log }: { log: FarisSyncLog }) {
  const pct = log.progress_total > 0 ? Math.round((log.progress_current / log.progress_total) * 100) : 0
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-blue-700 font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          {log.progress_message || 'جارٍ المزامنة...'}
        </div>
        <span className="text-blue-600 text-xs">{log.progress_current} / {log.progress_total}</span>
      </div>
      <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-500',
  }
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  )
}

function Pagination({ meta, page, onPageChange }: { meta: { total: number; current_page: number; last_page: number }; page: number; onPageChange: (p: number) => void }) {
  if (meta.last_page <= 1) return null

  // حساب أرقام الصفحات المعروضة (أقصى 7 أزرار)
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    const last = meta.last_page
    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      const start = Math.max(2, page - 1)
      const end = Math.min(last - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < last - 2) pages.push('...')
      pages.push(last)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <span className="text-xs text-slate-500">
        صفحة {meta.current_page} من {meta.last_page} (إجمالي {meta.total})
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          ←
        </button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 py-1.5 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                p === page
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= meta.last_page}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  )
}
