import { useState, useMemo, useEffect } from 'react'
import clsx from 'classnames'
import {
  BookOpenCheck, CheckCircle2, Loader2, X, ChevronDown, ChevronUp,
  ClipboardList, Clock, UserCheck, FileX2, Users, Settings, Download,
  Mail, Save, MessageSquare,
} from 'lucide-react'
import {
  useWeeksSummary, useWeekTeachers, useApprovePlanMutation, useApproveAllMutation,
  useLessonPlanSettings, useUpdateLessonPlanSettingsMutation, useSendToParentsMutation,
  useWeekGrades,
} from '../lesson-plans/hooks'
import { downloadWeekPdf } from '../lesson-plans/api'
import type { WeekSummary, TeacherWeekPlan, LessonPlanSettings } from '../lesson-plans/api'

const STATUS_COLORS: Record<string, string> = {
  not_submitted: 'bg-slate-100 text-slate-400',
  draft: 'bg-gray-100 text-gray-600',
  teacher_approved: 'bg-amber-100 text-amber-700',
  admin_approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
}
const STATUS_LABELS: Record<string, string> = {
  not_submitted: 'لم تُقدم',
  draft: 'مسودة',
  teacher_approved: 'بانتظار',
  admin_approved: 'معتمد',
  rejected: 'مرفوض',
}

const DAY_OPTIONS = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الإثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
]

export function AdminLessonPlansPage() {
  const { data: weeks, isLoading } = useWeeksSummary()
  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>()
  const [showSettings, setShowSettings] = useState(false)

  // إحصائيات إجمالية
  const totals = useMemo(() => {
    if (!weeks?.length) return { plans: 0, approved: 0, pending: 0, teachers: 0 }
    return {
      plans: weeks.reduce((s, w) => s + w.plans_count, 0),
      approved: weeks.reduce((s, w) => s + w.approved_count, 0),
      pending: weeks.reduce((s, w) => s + w.pending_count, 0),
      teachers: weeks[0]?.total_teachers ?? 0,
    }
  }, [weeks])

  // ترتيب: الحالي/المستقبلي أولاً، ثم الماضي
  const sortedWeeks = useMemo(() => {
    if (!weeks?.length) return []
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = weeks.filter((w) => w.end_date >= today).sort((a, b) => a.week_number - b.week_number)
    const past = weeks.filter((w) => w.end_date < today).sort((a, b) => b.week_number - a.week_number)
    return [...upcoming, ...past]
  }, [weeks])

  return (
    <div className="space-y-8">
      {/* ═══════════ Header ═══════════ */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20">
            <BookOpenCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الخطط الأسبوعية</h1>
            <p className="text-sm text-slate-500">متابعة واعتماد خطط المعلمين</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={clsx(
            'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            showSettings
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </button>
      </header>

      {/* ═══════════ Settings Panel ═══════════ */}
      {showSettings && <SettingsPanel />}

      {/* ═══════════ Stats Cards ═══════════ */}
      {!isLoading && weeks?.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="المعلمين" value={totals.teachers} icon={Users} color="sky" />
          <StatCard title="إجمالي الخطط" value={totals.plans} icon={ClipboardList} color="violet" />
          <StatCard title="بانتظار الاعتماد" value={totals.pending} icon={Clock} color="amber" />
          <StatCard title="معتمدة" value={totals.approved} icon={UserCheck} color="emerald" />
        </div>
      ) : null}

      {/* ═══════════ Loading ═══════════ */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : sortedWeeks.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BookOpenCheck className="h-8 w-8 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-700">لا توجد أسابيع في الفصل الحالي</p>
        </div>
      ) : (
        /* ═══════════ Weeks Grid ═══════════ */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedWeeks.map((week) => (
            <WeekCard key={week.id} week={week} onOpen={() => setSelectedWeekId(week.id)} />
          ))}
        </div>
      )}

      {/* ═══════════ Modal ═══════════ */}
      {selectedWeekId && (
        <WeekDetailModal
          weekId={selectedWeekId}
          week={weeks?.find((w) => w.id === selectedWeekId)}
          onClose={() => setSelectedWeekId(undefined)}
        />
      )}
    </div>
  )
}

// ═══════════ لوحة الإعدادات ═══════════

function SettingsPanel() {
  const { data: settings, isLoading } = useLessonPlanSettings()
  const updateMutation = useUpdateLessonPlanSettingsMutation()

  const [form, setForm] = useState<LessonPlanSettings>({
    reminder_enabled: false,
    reminder_day: 'wednesday',
    reminder_time: '10:00',
    reminder_message: 'عزيزي المعلم/ة، نذكرك بتقديم الخطة الأسبوعية قبل نهاية الأسبوع.',
  })

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-white border border-slate-200 p-6">
        <div className="h-6 w-40 rounded bg-slate-100" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <MessageSquare className="h-5 w-5 text-cyan-600" />
        <h3 className="text-base font-bold text-slate-900">إعدادات تذكير المعلمين بالواتساب</h3>
      </div>

      <div className="space-y-4">
        {/* التفعيل */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.reminder_enabled}
              onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-cyan-600 transition" />
            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium text-slate-700">تفعيل تذكير المعلمين الذين لم يقدموا الخطة</span>
        </label>

        {form.reminder_enabled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pr-14">
            {/* اليوم */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">يوم الإرسال</label>
              <select
                value={form.reminder_day}
                onChange={(e) => setForm({ ...form, reminder_day: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* الوقت */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">وقت الإرسال</label>
              <input
                type="time"
                value={form.reminder_time}
                onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* نص الرسالة */}
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">نص الرسالة</label>
              <textarea
                value={form.reminder_message}
                onChange={(e) => setForm({ ...form, reminder_message: e.target.value })}
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
              />
            </div>
          </div>
        )}

        {/* زر الحفظ */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════ بطاقة إحصائية ═══════════

const COLOR_MAP = {
  emerald: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
  sky: 'border-sky-200 bg-sky-500/10 text-sky-700',
  violet: 'border-violet-200 bg-violet-500/10 text-violet-700',
  amber: 'border-amber-200 bg-amber-500/10 text-amber-700',
  rose: 'border-rose-200 bg-rose-500/10 text-rose-700',
}

function StatCard({
  title, value, icon: Icon, color,
}: {
  title: string; value: number; icon: typeof Users; color: keyof typeof COLOR_MAP
}) {
  return (
    <div className={clsx('rounded-2xl border p-4 shadow-sm transition hover:shadow-md', COLOR_MAP[color])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold opacity-80">{title}</p>
        <Icon className="h-5 w-5 opacity-40" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

// ═══════════ بطاقة الأسبوع ═══════════

function WeekCard({ week, onOpen }: { week: WeekSummary; onOpen: () => void }) {
  const [showGrades, setShowGrades] = useState(false)
  const total = week.total_teachers
  const submitted = week.plans_count
  const { approved_count, pending_count, draft_count, rejected_count } = week

  // نسب الشريط (من إجمالي المعلمين)
  const pApproved = total > 0 ? (approved_count / total) * 100 : 0
  const pPending = total > 0 ? (pending_count / total) * 100 : 0
  const pRejected = total > 0 ? (rejected_count / total) * 100 : 0

  return (
    <div className={clsx(
      'relative flex flex-col rounded-2xl border bg-white p-5 text-right shadow-sm transition-all hover:shadow-md',
      week.is_current ? 'border-cyan-300 ring-2 ring-cyan-100' : 'border-slate-200 hover:border-cyan-200',
      week.is_past && submitted === 0 && 'opacity-60',
    )}>
      <button type="button" onClick={onOpen} className="flex-1 text-right">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">الأسبوع {week.week_number}</span>
            {week.is_current && (
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700">الحالي</span>
            )}
          </div>
          <span className="text-xs text-slate-400">{week.date_range}</span>
        </div>

        {/* شريط التسليم متعدد الألوان */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>التسليم</span>
            <span className="font-semibold text-slate-700">{submitted} / {total}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            {pApproved > 0 && (
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pApproved}%` }} />
            )}
            {pPending > 0 && (
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${pPending}%` }} />
            )}
            {pRejected > 0 && (
              <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${pRejected}%` }} />
            )}
          </div>
        </div>

        {/* مربعات الأرقام */}
        <div className="mt-3 flex gap-1.5">
          <MiniStat value={approved_count} label="معتمد" bg="bg-emerald-50" text="text-emerald-700" border="border-emerald-200" />
          <MiniStat value={pending_count} label="بانتظار" bg="bg-amber-50" text="text-amber-700" border="border-amber-200" />
          {rejected_count > 0 && (
            <MiniStat value={rejected_count} label="مرفوض" bg="bg-rose-50" text="text-rose-700" border="border-rose-200" />
          )}
          <MiniStat value={draft_count} label="مسودة" bg="bg-slate-50" text="text-slate-500" border="border-slate-200" />
        </div>
      </button>

      {/* زر تنزيل PDF */}
      {approved_count > 0 && (
        <div className="relative mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowGrades(!showGrades) }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل PDF
            {showGrades ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showGrades && (
            <GradeDropdown weekId={week.id} onClose={() => setShowGrades(false)} />
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════ قائمة الصفوف للتنزيل ═══════════

function GradeDropdown({ weekId, onClose }: { weekId: number; onClose: () => void }) {
  const { data: grades, isLoading } = useWeekGrades(weekId)

  return (
    <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : !grades?.length ? (
        <p className="py-2 text-center text-xs text-slate-400">لا توجد صفوف</p>
      ) : (
        <div className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-medium text-slate-400">اختر الصف:</p>
          {grades.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => { downloadWeekPdf(weekId, grade); onClose() }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition"
            >
              <Download className="h-3 w-3" />
              {grade}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniStat({ value, label, bg, text, border }: {
  value: number; label: string; bg: string; text: string; border: string
}) {
  return (
    <div className={clsx('flex-1 rounded-lg border px-2 py-1.5 text-center', bg, border)}>
      <p className={clsx('text-sm font-bold leading-none', text)}>{value}</p>
      <p className={clsx('mt-0.5 text-[9px]', text, 'opacity-70')}>{label}</p>
    </div>
  )
}

// ═══════════ نافذة تفاصيل الأسبوع ═══════════

function WeekDetailModal({
  weekId, week, onClose,
}: {
  weekId: number; week: WeekSummary | undefined; onClose: () => void
}) {
  const { data: teachers, isLoading } = useWeekTeachers(weekId)
  const approveMutation = useApprovePlanMutation()
  const approveAllMutation = useApproveAllMutation()
  const sendToParentsMutation = useSendToParentsMutation()

  const pendingCount = teachers?.reduce((sum, t) => sum + t.pending_count, 0) ?? 0
  const hasApproved = (week?.approved_count ?? 0) > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50/50 px-5 py-4 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100">
              <BookOpenCheck className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">الأسبوع {week?.week_number}</h2>
              <p className="text-xs text-slate-500">{week?.date_range}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => approveAllMutation.mutate(weekId)}
                disabled={approveAllMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveAllMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                اعتماد الجميع ({pendingCount})
              </button>
            ) : hasApproved ? (
              <button
                type="button"
                onClick={() => sendToParentsMutation.mutate(weekId)}
                disabled={sendToParentsMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {sendToParentsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                إرسال لأولياء الأمور
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : !teachers?.length ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FileX2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">لا يوجد معلمين بحصص مسندة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <TeacherRow
                  key={teacher.teacher_id}
                  teacher={teacher}
                  onApprove={(planId) => approveMutation.mutate(planId)}
                  isApproving={approveMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════ صف المعلم ═══════════

function TeacherRow({
  teacher, onApprove, isApproving,
}: {
  teacher: TeacherWeekPlan; onApprove: (id: number) => void; isApproving: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const allApproved = teacher.submitted_count > 0 && teacher.approved_count === teacher.total_subjects
  const hasPending = teacher.pending_count > 0
  const noneSubmitted = teacher.submitted_count === 0

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      allApproved ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white',
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3.5"
      >
        {/* أيقونة */}
        <div className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
          allApproved ? 'bg-emerald-100 text-emerald-600'
            : hasPending ? 'bg-amber-100 text-amber-600'
              : noneSubmitted ? 'bg-slate-100 text-slate-400'
                : 'bg-slate-100 text-slate-500',
        )}>
          {allApproved ? <CheckCircle2 className="h-4 w-4" /> : teacher.total_subjects}
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-semibold text-slate-900">{teacher.teacher_name}</p>
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {teacher.plans.map((p) => p.subject_name).join(' • ')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasPending && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                teacher.plans
                  .filter((p) => p.status === 'teacher_approved' && p.id)
                  .forEach((p) => onApprove(p.id!))
              }}
              disabled={isApproving}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              اعتماد
            </button>
          )}
          <span className={clsx(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            allApproved ? 'bg-emerald-100 text-emerald-700'
              : noneSubmitted ? 'bg-slate-100 text-slate-400'
                : 'bg-amber-100 text-amber-700',
          )}>
            {allApproved ? 'معتمد' : noneSubmitted ? 'لم تُقدم' : `${teacher.submitted_count}/${teacher.total_subjects}`}
          </span>
          <ChevronDown className={clsx('h-4 w-4 text-slate-300 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-3.5 py-3 space-y-2">
          {teacher.plans.map((plan, idx) => (
            <div key={plan.id ?? `ns-${idx}`} className={clsx(
              'rounded-lg p-3',
              plan.status === 'not_submitted' ? 'bg-slate-50 border border-dashed border-slate-200' : 'bg-slate-50',
            )}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{plan.subject_name}</span>
                  <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] text-slate-500">{plan.grade}</span>
                </div>
                <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[plan.status])}>
                  {STATUS_LABELS[plan.status]}
                </span>
              </div>
              {plan.status === 'not_submitted' ? (
                <p className="text-[11px] text-slate-400">لم يقدم خطة لهذه المادة</p>
              ) : (
                plan.sessions.map((s) => (
                  <div key={s.session_number} className="flex items-start gap-2 mt-1.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[9px] font-bold text-cyan-700 mt-0.5">
                      {s.session_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-700">{s.topic || '—'}</p>
                      {s.homework && <p className="text-[10px] text-cyan-600">الواجب: {s.homework}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
