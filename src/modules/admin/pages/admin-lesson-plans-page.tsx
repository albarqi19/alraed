import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Clock,
  Download,
  FileX2,
  MessageSquare,
  Save,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import {
  useWeeksSummary,
  useWeekTeachers,
  useApprovePlanMutation,
  useApproveAllMutation,
  useRejectPlanMutation,
  useLessonPlanSettings,
  useUpdateLessonPlanSettingsMutation,
} from '../lesson-plans/hooks'
import { downloadWeekPdf } from '../lesson-plans/api'
import type { TeacherWeekPlan } from '../lesson-plans/api'
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
import { ProofSheet, planMetrics, teacherDebt, statusMeta } from './lesson-plans-ui'

const DAY_OPTIONS = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الإثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
]

type StatusFilter = 'all' | 'not_submitted' | 'teacher_approved' | 'admin_approved'

export function AdminLessonPlansPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: weeks, isLoading: weeksLoading } = useWeeksSummary()

  const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>(() => {
    const w = searchParams.get('week')
    return w ? Number(w) : undefined
  })
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedTeacher, setExpandedTeacher] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // اختيار الأسبوع الحالي تلقائياً
  useEffect(() => {
    if (selectedWeekId == null && weeks?.length) {
      const current = weeks.find((w) => w.is_current) ?? weeks[0]
      setSelectedWeekId(current.id)
    }
  }, [weeks, selectedWeekId])

  // مزامنة الأسبوع مع الـURL
  useEffect(() => {
    if (selectedWeekId != null) {
      const next = new URLSearchParams(searchParams)
      next.set('week', String(selectedWeekId))
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId])

  const { data: teachers, isLoading: teachersLoading, isError, refetch } = useWeekTeachers(selectedWeekId)

  const approve = useApprovePlanMutation()
  const approveAll = useApproveAllMutation()
  const reject = useRejectPlanMutation()

  const week = weeks?.find((w) => w.id === selectedWeekId)

  // فرز المعلمين بالدَّين (الفجوة)
  const rankedTeachers = useMemo(() => {
    let list = teachers ?? []
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((t) => t.teacher_name.toLowerCase().includes(q))
    if (gradeFilter) list = list.map((t) => ({ ...t, plans: t.plans.filter((p) => p.grade === gradeFilter) })).filter((t) => t.plans.length)
    if (statusFilter !== 'all') {
      list = list
        .map((t) => ({ ...t, plans: t.plans.filter((p) => p.status === statusFilter) }))
        .filter((t) => t.plans.length)
    }
    return [...list].sort((a, b) => teacherDebt(b) - teacherDebt(a))
  }, [teachers, search, gradeFilter, statusFilter])

  const grades = useMemo(() => {
    const set = new Set<string>()
    teachers?.forEach((t) => t.plans.forEach((p) => set.add(p.grade)))
    return [...set].sort()
  }, [teachers])

  // حقائق الأسبوع
  const facts = useMemo(() => {
    let required = 0
    let pending = 0
    let notSubmitted = 0
    let unlinked = 0
    teachers?.forEach((t) =>
      t.plans.forEach((p) => {
        required += 1
        if (p.status === 'teacher_approved') pending += 1
        if (p.status === 'not_submitted') notSubmitted += 1
        if (p.prescribed_sessions == null) unlinked += 1
      }),
    )
    return { required, pending, notSubmitted, unlinked }
  }, [teachers])

  return (
    <WsPage>
      <WsHeader
        title="الخطط الأسبوعية"
        badge={week ? `الأسبوع ${week.week_number}` : undefined}
        actions={
          <>
            {facts.pending > 0 && selectedWeekId != null && (
              <WsBtn
                variant="primary"
                icon={Check}
                onClick={() => approveAll.mutate(selectedWeekId)}
                disabled={approveAll.isPending}
              >
                اعتماد المعلّق ({facts.pending})
              </WsBtn>
            )}
            {selectedWeekId != null && (
              <WsIconBtn icon={Download} label="تنزيل PDF" onClick={() => downloadWeekPdf(selectedWeekId, gradeFilter)} />
            )}
            <WsIconBtn icon={Settings} label="إعدادات التذكير" onClick={() => setSettingsOpen(true)} />
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardList} label="مطلوب هذا الأسبوع">{facts.required}</WsFact>
            <WsFact icon={Clock} label="بانتظار اعتمادك">
              <span style={{ color: facts.pending > 0 ? TONES.amber.tx : undefined }}>{facts.pending}</span>
            </WsFact>
            <WsFact icon={FileX2} label="لم تُسلّم">
              <span style={{ color: facts.notSubmitted > 0 ? TONES.red.tx : undefined }}>{facts.notSubmitted}</span>
            </WsFact>
            <WsFact icon={BookOpenCheck} label="بلا توزيع منهج">
              <span style={{ color: facts.unlinked > 0 ? TONES.amber.tx : undefined }}>{facts.unlinked}</span>
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث" htmlFor="lp-q" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              id="lp-q"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اسم المعلم"
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
          </div>
        </WsField>
        <WsField label="الصف">
          <WsSelect value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </WsSelect>
        </WsField>
        <WsField label="الحالة">
          <div className="ws-seg">
            {([
              ['all', 'الكل'],
              ['not_submitted', 'لم يسلّم'],
              ['teacher_approved', 'بانتظارك'],
              ['admin_approved', 'معتمد'],
            ] as Array<[StatusFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ws-seg__btn ${statusFilter === value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </WsField>
      </WsToolbar>

      <WsLayout>
        {/* الأسابيع */}
        <WsSideCol side="start" title="الأسابيع" icon={CalendarDays} storageKey="ws:lesson-plans:weeks" width={230}>
          <WsBlock fill scroll>
            <div style={{ padding: 8 }}>
              {weeksLoading ? (
                <WsEmpty loading>جارٍ التحميل...</WsEmpty>
              ) : (
                weeks?.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`ws-pick ${selectedWeekId === w.id ? 'is-checked' : ''}`}
                    onClick={() => setSelectedWeekId(w.id)}
                    style={{ width: '100%', textAlign: 'right', marginBottom: 2 }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="ws-pick__name">
                        الأسبوع {w.week_number}
                        {w.is_current && <b style={{ color: TONES.sky.tx }}> · الحالي</b>}
                      </span>
                      <span className="ws-pick__sub">
                        {w.date_range}
                        {w.pending_count > 0 && ` · ${w.pending_count} بانتظارك`}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <WsBlock fill scroll title="معلمو الأسبوع" icon={Users} count={rankedTeachers.length}>
            {isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل الخطط.
                  <WsBtn size="sm" onClick={() => void refetch()}>إعادة المحاولة</WsBtn>
                </WsAlert>
              </div>
            ) : teachersLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : !selectedWeekId ? (
              <WsEmpty icon={CalendarDays}>اختر أسبوعاً</WsEmpty>
            ) : rankedTeachers.length === 0 ? (
              <WsEmpty icon={Users}>لا معلمين مطابقين</WsEmpty>
            ) : (
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {rankedTeachers.map((teacher) => (
                  <TeacherRow
                    key={teacher.teacher_id}
                    teacher={teacher}
                    expanded={expandedTeacher === teacher.teacher_id}
                    onToggle={() =>
                      setExpandedTeacher((prev) => (prev === teacher.teacher_id ? null : teacher.teacher_id))
                    }
                    onApprove={(id) => approve.mutate(id)}
                    onReject={(id, name) => {
                      setRejectTarget({ id, name })
                      setRejectReason('')
                    }}
                    busy={approve.isPending}
                  />
                ))}
              </div>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* مودال الرفض */}
      {rejectTarget && (
        <div className="ws-modal" onClick={() => setRejectTarget(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">رفض خطة «{rejectTarget.name}»</h3>
              <p className="ws-modal__sub">سيصل السبب للمعلم ليصحّح</p>
            </header>
            <div className="ws-modal__body">
              <WsField label="سبب الرفض" htmlFor="rej-reason">
                <textarea
                  id="rej-reason"
                  className="ws-input"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ما الذي يحتاج تصحيحاً؟"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </WsField>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setRejectTarget(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate(
                    { id: rejectTarget.id, reason: rejectReason.trim() },
                    { onSuccess: () => setRejectTarget(null) },
                  )
                }
              >
                رفض
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </WsPage>
  )
}

function TeacherRow({
  teacher,
  expanded,
  onToggle,
  onApprove,
  onReject,
  busy,
}: {
  teacher: TeacherWeekPlan
  expanded: boolean
  onToggle: () => void
  onApprove: (id: number) => void
  onReject: (id: number, name: string) => void
  busy: boolean
}) {
  const debt = teacherDebt(teacher)
  const pending = teacher.plans.filter((p) => p.status === 'teacher_approved').length

  return (
    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 9, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '9px 11px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'right',
        }}
      >
        <ChevronLeft
          style={{ width: 14, height: 14, flexShrink: 0, transition: 'transform .15s', transform: expanded ? 'rotate(-90deg)' : undefined, color: 'var(--ws-text-2)' }}
        />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{teacher.teacher_name}</span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
            {teacher.total_subjects} مادة · {teacher.submitted_count} مسلّمة
          </span>
        </span>
        {debt > 0 && <ToneChip tone={TONES.amber}>فجوة {debt}</ToneChip>}
        {pending > 0 && <ToneChip tone={TONES.amber}>{pending} بانتظارك</ToneChip>}
      </button>

      {expanded && (
        <div style={{ padding: '4px 11px 11px', borderTop: '1px solid var(--ws-surface-2)' }}>
          {teacher.plans.map((plan, i) => {
            const meta = statusMeta(plan.status)
            const m = planMetrics(plan)
            return (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < teacher.plans.length - 1 ? '1px solid var(--ws-surface-2)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                    {plan.subject_name} · {plan.grade}
                  </span>
                  <ToneChip tone={meta.tone}>{meta.label}</ToneChip>
                  {m.gap > 0 && <span style={{ fontSize: 10.5, color: TONES.amber.tx }}>فجوة {m.gap}</span>}
                  <span style={{ flex: 1 }} />
                  {plan.status === 'teacher_approved' && plan.id != null && (
                    <>
                      <WsBtn size="sm" icon={Check} disabled={busy} onClick={() => onApprove(plan.id!)}>
                        اعتماد ونشر
                      </WsBtn>
                      <WsBtn size="sm" variant="danger" onClick={() => onReject(plan.id!, teacher.teacher_name)}>
                        رفض
                      </WsBtn>
                    </>
                  )}
                </div>
                {plan.status !== 'not_submitted' ? (
                  <ProofSheet plan={plan} />
                ) : (
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>لم يسلّم المعلم خطة هذه المادة بعد.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data: settings } = useLessonPlanSettings()
  const update = useUpdateLessonPlanSettingsMutation()

  const [enabled, setEnabled] = useState(settings?.reminder_enabled ?? false)
  const [day, setDay] = useState(settings?.reminder_day ?? 'thursday')
  const [time, setTime] = useState(settings?.reminder_time ?? '10:00')
  const [message, setMessage] = useState(settings?.reminder_message ?? '')

  return (
    <div className="ws-modal" onClick={onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">إعدادات تذكير المعلمين</h3>
        </header>
        <div className="ws-modal__body">
          <WsField label="تفعيل التذكير الأسبوعي">
            <WsSwitch checked={enabled} onChange={setEnabled} />
          </WsField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WsField label="اليوم">
              <WsSelect value={day} onChange={(e) => setDay(e.target.value)}>
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="الوقت">
              <WsInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </WsField>
          </div>
          <WsField label="نص التذكير" htmlFor="lp-msg">
            <textarea
              id="lp-msg"
              className="ws-input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </WsField>
          <WsAlert tone="info" boxed icon={MessageSquare}>
            يُرسَل التذكير للمعلمين الذين لم يُسلّموا خطط الأسبوع بعد.
          </WsAlert>
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose}>إلغاء</WsBtn>
          <WsBtn
            variant="primary"
            icon={Save}
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { reminder_enabled: enabled, reminder_day: day, reminder_time: time, reminder_message: message },
                { onSuccess: onClose },
              )
            }
          >
            حفظ
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}
