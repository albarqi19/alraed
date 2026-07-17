import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import {
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsField,
  WsSelect,
  WsTextarea,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  InitialAvatar,
  type Tone,
} from '@/shared/workspace'
import {
  useAbsenceReferralsQuery,
  useAbsenceReferralStatsQuery,
  useViolationStudentsQuery,
  useLateStudentsQuery,
  useProcessAbsencesMutation,
  useUpdateAbsenceActionMutation,
} from '../hooks'
import { buildLadder, nextRung, isLastOpenRung, OFF_LADDER_ACTION, type Rung } from '../absence-ladder'
import type { AbsenceReferral, WatchListMeta } from '../types'

type SystemSubTab = 'consecutive' | 'repeated' | 'violations' | 'lateness'

const SUB_TABS: Array<{ key: SystemSubTab; label: string; icon: typeof CalendarRange; description: string }> = [
  {
    key: 'consecutive',
    label: 'غياب متواصل',
    icon: CalendarRange,
    description: 'طلاب غابوا 3 أيام أو أكثر متتالية — يتطلب مخاطبة مركز حماية الطفل وفقاً للدليل الإجرائي',
  },
  {
    key: 'repeated',
    label: 'غياب متكرر',
    icon: CalendarDays,
    description: 'طلاب تجاوز إجمالي غيابهم 3 أيام (متصلة أو منفصلة)',
  },
  {
    key: 'lateness',
    label: 'الأكثر تأخراً',
    icon: Clock,
    description: 'طلاب تأخروا 5 مرات أو أكثر في الفصل الدراسي — يتطلب إحالة للموجه الطلابي',
  },
  {
    key: 'violations',
    label: 'الأكثر مخالفة',
    icon: AlertTriangle,
    description: 'طلاب لديهم أكثر من 3 مخالفات سلوكية',
  },
]

const ACTION_LEVEL_LABELS: Record<string, string> = {
  warning: 'إحالة للموجه',
  parent_summon: 'استدعاء ولي أمر',
  committee: 'لجنة التوجيه',
}

const GATE_ROWS: Array<{ key: '3days' | '5days' | '10days'; label: string; hint: string }> = [
  { key: '3days', label: '٣ أيام', hint: 'تستيقظ عندها: إحالة للموجه ووضع خطة تعلم' },
  { key: '5days', label: '٥ أيام', hint: 'تستيقظ عندها: استدعاء ولي الأمر وأخذ تعهد خطي' },
  { key: '10days', label: '١٠ أيام', hint: 'تستيقظ عندها: بلاغ 1919 وإشعار إدارة التعليم' },
]

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ar-SA') : '—')

/* ═══════════════════════════════════════════════════════════
   ★ لمسة التوقيع: سُلَّم الدليل
   درجٌ ببواباتٍ تفتحها أيامُ الغياب وحدها.
   الارتفاع مطلق بالفهرس لا مُطبَّع بالطول — فيعلو درج العشرة
   أيام على درج الثلاثة، والخامل مسطّح لأنه لم يُولَد بعد.
   ═══════════════════════════════════════════════════════════ */

function rungTone(rung: Rung): Tone {
  if (rung.done) return TONES.green
  if (!rung.open) return TONES.gray
  return rung.external ? TONES.red : TONES.amber
}

function DirectiveLadder({ rungs }: { rungs: Rung[] }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {rungs.map((rung, index) => {
        const tone = rungTone(rung)
        return (
          <span
            key={rung.key}
            title={
              rung.done
                ? `${rung.label} · تم في ${fmtDate(rung.at)}`
                : rung.open
                  ? `${rung.label} · مستحق الآن`
                  : `${rung.label} · يستيقظ عند اليوم ${rung.gate}`
            }
            style={{
              width: 5,
              // الخامل مسطّح: الارتفاع نفسه قناة غير لونية، فيُقرأ السلّم عند عمى الألوان
              height: rung.open ? 6 + index * 2.2 : 4,
              borderRadius: 2,
              background: rung.open ? tone.tx : TONES.gray.bd,
            }}
          />
        )
      })}
    </span>
  )
}

/* لوح السلّم في المودال — نفس buildLadder، أركان مسمّاة بتواريخها وأزرارها */
function LadderBoard({
  rungs,
  referralId,
  onAction,
  isPending,
}: {
  rungs: Rung[]
  referralId: number
  onAction: (action: string, notes?: string) => void
  isPending: boolean
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rungs.map((rung, index) => {
        const tone = rungTone(rung)
        const isLast = isLastOpenRung(rungs, rung.key)
        const isConfirming = confirming === rung.key
        return (
          <div
            key={rung.key}
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: 9,
              background: rung.done ? TONES.green.bg : !rung.open ? 'var(--ws-surface-2)' : undefined,
              opacity: rung.open ? 1 : 0.7,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: rung.done ? TONES.green.tx : rung.open ? tone.bg : 'transparent',
                    border: rung.done ? undefined : `1px solid ${rung.open ? tone.bd : TONES.gray.bd}`,
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: rung.done ? '#fff' : rung.open ? tone.tx : 'var(--ws-text-2)',
                  }}
                >
                  {rung.done ? <Check style={{ width: 11, height: 11 }} /> : rung.open ? index + 1 : '–'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
                    {rung.label}
                    {rung.external && !rung.done && rung.open && (
                      <ShieldAlert
                        style={{ width: 11, height: 11, color: TONES.red.tx, verticalAlign: '-1px', marginInlineStart: 4 }}
                      />
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--ws-text-2)' }}>
                    {rung.done
                      ? `تم في ${fmtDate(rung.at)}`
                      : rung.open
                        ? 'مستحق الآن'
                        : `يستيقظ عند اليوم ${rung.gate}`}
                  </p>
                </div>
              </div>
              {rung.open && !rung.done && !isConfirming && (
                <WsBtn
                  size="sm"
                  icon={Check}
                  disabled={isPending}
                  onClick={() => {
                    // الاحتكاك لا يُفرض على الروتيني، بل على ما يخرج من أسوار المدرسة
                    if (rung.external) {
                      setConfirming(rung.key)
                      setNoteText('')
                    } else {
                      onAction(rung.key)
                    }
                  }}
                >
                  تم التنفيذ
                </WsBtn>
              )}
            </div>

            {/* آخر رُكن مستحق: بإتمامه يُقفل الخادم الملف ويختفي الصف */}
            {isLast && rung.open && !rung.done && (
              <div style={{ marginTop: 6 }}>
                <WsAlert tone="warn" boxed>
                  بإتمام هذه الخطوة يكتمل السلّم فيُقفل الملف تلقائياً وتُكمَل الإحالة، وتختفي الحالة من القائمة
                </WsAlert>
              </div>
            )}

            {/* قسيمة القصد على الرُكنين الخارجيين — وهي بيت notes الذي كان ميتاً في ثلاث طبقات */}
            {isConfirming && (
              <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <WsAlert tone="error" boxed>
                  هذا إجراء يخرج من المدرسة إلى جهة خارجية ولا يُتراجع عنه.
                </WsAlert>
                {/* الخادم يكتب notes في عمود واحد يُستبدل لا يُلحَق — فلا يُوعَد بأرشيف */}
                <WsField label="بمَ نُفِّذ؟ (يُحفظ مع السجل)" htmlFor={`note-${referralId}-${rung.key}`}>
                  <WsTextarea
                    id={`note-${referralId}-${rung.key}`}
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="رقم البلاغ، اسم المستلم، تاريخ الخطاب..."
                  />
                </WsField>
                <div style={{ display: 'flex', gap: 5 }}>
                  <WsBtn
                    variant="danger"
                    size="sm"
                    icon={Check}
                    disabled={isPending}
                    onClick={() => {
                      onAction(rung.key, noteText.trim() || undefined)
                      setConfirming(null)
                    }}
                  >
                    تأكيد التنفيذ
                  </WsBtn>
                  <WsBtn size="sm" onClick={() => setConfirming(null)}>
                    إلغاء
                  </WsBtn>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   اللوحة — تُخرج عمودها بنفسها، بلا props وبلا رفع حالة
   ═══════════════════════════════════════════════════════════ */

export function AbsenceReferralsPanel() {
  const navigate = useNavigate()
  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>('consecutive')
  // الكائن يُشتق من القائمة لا يُلتقط لقطةً جامدة — فالإبطال يُحدّث المودال مجاناً
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // صفحة لكل تبويب: كانت واحدة تقود ثلاثة استعلامات متزامنة
  const [pages, setPages] = useState<Record<SystemSubTab, number>>({
    consecutive: 1,
    repeated: 1,
    violations: 1,
    lateness: 1,
  })
  const [actionLevel, setActionLevel] = useState<'' | '3days' | '5days' | '10days'>('')
  const [requiringAction, setRequiringAction] = useState(false)
  const [recordStatus, setRecordStatus] = useState<'active' | 'resolved'>('active')
  const [minViolations, setMinViolations] = useState(3)
  const [minLate, setMinLate] = useState(5)
  const [scanResult, setScanResult] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null)

  const isAbsenceTab = activeSubTab === 'consecutive' || activeSubTab === 'repeated'
  const currentPage = pages[activeSubTab]
  const setPage = (page: number) => setPages((prev) => ({ ...prev, [activeSubTab]: page }))

  const { data: stats } = useAbsenceReferralStatsQuery()
  const {
    data: referrals,
    isLoading,
    isError,
    refetch,
  } = useAbsenceReferralsQuery(
    {
      absence_type: isAbsenceTab ? activeSubTab : undefined,
      status: recordStatus,
      action_level: actionLevel || undefined,
      requiring_action: requiringAction || undefined,
      page: currentPage,
      per_page: 15,
    },
    // كان يعمل على تبويبَي الرصد بـ absence_type: undefined فيجلب النوعين ليعرض لا شيء
    { enabled: isAbsenceTab },
  )
  // بالمفاتيح لا بـ enabled: meta.total يغذّي شارتَي التبويبين فتعطيلهما يُطفئ العدّادين
  const { data: violationStudents, isLoading: isLoadingViolations, isError: violationsError } =
    useViolationStudentsQuery(pages.violations, minViolations)
  const { data: lateStudents, isLoading: isLoadingLate, isError: lateError } =
    useLateStudentsQuery(pages.lateness, minLate)

  const processAbsences = useProcessAbsencesMutation()
  const updateAction = useUpdateAbsenceActionMutation()

  const selected = useMemo(
    () => referrals?.items.find((item) => item.id === selectedId) ?? null,
    [referrals, selectedId],
  )

  /**
   * الإقفال يُقرأ من ردّ الخادم وحده (fresh() فيه status صراحةً).
   * ولا يُستنتج من اختفاء الصف عن القائمة: الصف يختفي لأسباب أخرى كثيرة —
   * فلتر `requiring_action` مثلاً يفحص خمسة فروع فقط بينما السلّم سبعة،
   * فسجلٌ بقي عليه «أخذ تعهد خطي» يسقط من القائمة والملف ما زال نشطاً.
   * استنتاج الإقفال من الغياب كان سيقول «اكتمل السلّم» على سلّم لم يكتمل.
   */
  const [resolvedNotice, setResolvedNotice] = useState(false)

  // تبدّل التبويب أو الفلتر يُنهي الجلسة على السجل — لا يومض المودال خارج الوجود ثم يعود بادعاء
  useEffect(() => {
    setSelectedId(null)
    setResolvedNotice(false)
  }, [activeSubTab, actionLevel, requiringAction, recordStatus])

  // الفلتر يغيّر مجموعة النتائج كلها — البقاء على صفحة ٧ يُخرج قائمة فارغة بلا شريط ترقيم يُعيدك
  useEffect(() => {
    setPages((prev) => ({ ...prev, consecutive: 1, repeated: 1 }))
  }, [actionLevel, requiringAction, recordStatus])
  useEffect(() => {
    setPages((prev) => ({ ...prev, violations: 1 }))
  }, [minViolations])
  useEffect(() => {
    setPages((prev) => ({ ...prev, lateness: 1 }))
  }, [minLate])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null)
        setResolvedNotice(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  const handleProcessNow = async () => {
    setScanResult(null)
    try {
      const result = await processAbsences.mutateAsync()
      const consecutive = result?.data?.consecutive_referrals ?? 0
      const repeated = result?.data?.repeated_referrals ?? 0
      // الرقم الوحيد الذي يبرّر وجود الزر كان يُرمى ويُستبدل بـ«تم»
      setScanResult(
        consecutive + repeated > 0
          ? { tone: 'success', text: `الفحص اكتشف ${consecutive} متواصل و${repeated} متكرر جديدة` }
          : { tone: 'info', text: 'لم يجد الفحص حالات جديدة' },
      )
    } catch {
      setScanResult({ tone: 'error', text: 'تعذّر فحص سجلات الغياب' })
    }
  }

  const handleAction = async (action: string, notes?: string) => {
    if (!selected) return
    setScanResult(null)
    try {
      const result = await updateAction.mutateAsync({ id: selected.id, action, notes })
      // الخادم وحده يقول إن الملف أُقفل — الشيفرة لا تخمّن
      if (result?.data?.status === 'resolved') setResolvedNotice(true)
    } catch {
      setScanResult({ tone: 'error', text: 'تعذّر تحديث الإجراء' })
    }
  }

  const activeMeta = SUB_TABS.find((t) => t.key === activeSubTab)!
  const listMeta: WatchListMeta | undefined = isAbsenceTab
    ? referrals?.meta
    : activeSubTab === 'violations'
      ? violationStudents?.meta
      : lateStudents?.meta

  const subTabCount = (key: SystemSubTab) =>
    key === 'consecutive'
      ? stats?.consecutive?.total ?? 0
      : key === 'repeated'
        ? stats?.repeated?.total ?? 0
        : key === 'violations'
          ? violationStudents?.meta?.total ?? 0
          : lateStudents?.meta?.total ?? 0

  return (
    <>
      {/* نفس الجهة والعرض والمفتاح كعمود الأب — العمود لا يقفز، بل يغيّر ما يقيسه */}
      <WsSideCol side="start" title="التوزيع" icon={BarChart3} storageKey="ws:referrals:breakdown" width={260}>
        <WsBlock fill scroll>
          {isAbsenceTab ? (
            <>
              {/* بوابات الدليل — الأرقام الستة التي كانت تُجلب ويُقرأ .total وحده */}
              <WsBlock title="بوابات الدليل" count={3} padded>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {GATE_ROWS.map((gate) => {
                    const bucket = stats?.[activeSubTab]
                    const count = bucket?.[gate.key] ?? 0
                    const max = Math.max(bucket?.['3days'] ?? 0, bucket?.['5days'] ?? 0, bucket?.['10days'] ?? 0, 1)
                    const active = actionLevel === gate.key
                    const tone = gate.key === '10days' ? TONES.red : gate.key === '5days' ? TONES.amber : null
                    return (
                      <button
                        key={gate.key}
                        type="button"
                        title={gate.hint}
                        onClick={() => setActionLevel(active ? '' : gate.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          width: '100%',
                          textAlign: 'right',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 6px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 11.5,
                          background: active ? 'var(--ws-accent-soft)' : 'transparent',
                          color: active ? 'var(--ws-accent)' : 'var(--ws-text)',
                          boxShadow: active ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>{gate.label}</span>
                        {/* الأشرطة رمادية دائماً: كمّيات لا حالات */}
                        <span style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--ws-surface-2)', overflow: 'hidden' }}>
                          <span
                            style={{
                              display: 'block',
                              height: '100%',
                              width: `${(count / max) * 100}%`,
                              background: TONES.gray.tx,
                            }}
                          />
                        </span>
                        <span style={{ fontWeight: 700, color: tone && count > 0 ? tone.tx : undefined }}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </WsBlock>

              <WsBlock title="بؤرة" padded>
                <button
                  type="button"
                  className={`ws-pick ${requiringAction ? 'is-checked' : ''}`}
                  onClick={() => setRequiringAction((prev) => !prev)}
                  style={{ width: '100%', textAlign: 'right' }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="ws-pick__name">يتطلب إجراء الآن</span>
                    {/* إفصاح إلزامي: scopeRequiringAction لا يُقيَّد بنوع الغياب */}
                    <span className="ws-pick__sub">النوعان معاً — لا يطابق التبويب الجاري</span>
                  </span>
                  <b style={{ flexShrink: 0, color: (stats?.requiring_action ?? 0) > 0 ? TONES.amber.tx : undefined }}>
                    {stats?.requiring_action ?? 0}
                  </b>
                </button>
              </WsBlock>

              <WsBlock title="حالة السجل" padded>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button
                    type="button"
                    className={`ws-pick ${recordStatus === 'active' ? 'is-checked' : ''}`}
                    onClick={() => setRecordStatus('active')}
                    style={{ width: '100%', textAlign: 'right' }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="ws-pick__name">نشط</span>
                      <span className="ws-pick__sub">ما زال عليه دَين للدليل</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`ws-pick ${recordStatus === 'resolved' ? 'is-checked' : ''}`}
                    onClick={() => setRecordStatus('resolved')}
                    style={{ width: '100%', textAlign: 'right' }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="ws-pick__name">مكتمل</span>
                      <span className="ws-pick__sub">ما أقفله النظام بعد اكتمال السلّم</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ws-pick"
                    disabled
                    title="لا يكتبها النظام حالياً — التصعيد يُحدّث أولوية الإحالة ولا يمسّ حالة سجل الغياب"
                    style={{ width: '100%', textAlign: 'right', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className="ws-pick__name">مصعَّد</span>
                      <span className="ws-pick__sub">لا يكتبها النظام</span>
                    </span>
                  </button>
                </div>
              </WsBlock>
            </>
          ) : (
            <>
              {/* البوابات تُخفى: هناك مقياس آخر بعتبات أخرى لا بوابة سلّم */}
              <WsBlock title="حد الرصد" padded>
                {activeSubTab === 'violations' ? (
                  <WsField label="أقل عدد مخالفات">
                    <WsSelect value={minViolations} onChange={(e) => setMinViolations(Number(e.target.value))}>
                      <option value={3}>٣ فأكثر</option>
                      <option value={5}>٥ فأكثر</option>
                      <option value={10}>١٠ فأكثر</option>
                    </WsSelect>
                  </WsField>
                ) : (
                  <WsField label="أقل عدد تأخرات">
                    <WsSelect value={minLate} onChange={(e) => setMinLate(Number(e.target.value))}>
                      <option value={5}>٥ فأكثر</option>
                      <option value={10}>١٠ فأكثر</option>
                      <option value={15}>١٥ فأكثر</option>
                    </WsSelect>
                  </WsField>
                )}
              </WsBlock>
              <WsBlock padded>
                <WsFactsList>
                  <WsFactRow label="طلاب مرصودون">{listMeta?.total ?? 0}</WsFactRow>
                </WsFactsList>
              </WsBlock>
            </>
          )}
        </WsBlock>
      </WsSideCol>

      <WsMain>
        <WsBlock
          fill
          title="إحالات النظام"
          icon={Bot}
          count={subTabCount(activeSubTab)}
          tools={
            <>
              <div className="ws-seg">
                {SUB_TABS.map((tab) => {
                  const Icon = tab.icon
                  const count = subTabCount(tab.key)
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`ws-seg__btn ${activeSubTab === tab.key ? 'is-active' : ''}`}
                      onClick={() => setActiveSubTab(tab.key)}
                      title={tab.description}
                    >
                      <Icon style={{ width: 13, height: 13 }} />
                      {tab.label}
                      {count > 0 && <span className="ws-count">{count}</span>}
                    </button>
                  )
                })}
              </div>
              {isAbsenceTab && (
                <WsBtn size="sm" icon={RefreshCw} onClick={handleProcessNow} disabled={processAbsences.isPending}>
                  {processAbsences.isPending ? 'جارٍ الفحص...' : 'فحص الغياب الآن'}
                </WsBtn>
              )}
              {listMeta && listMeta.last_page > 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    {(listMeta.current_page - 1) * listMeta.per_page + 1}–
                    {Math.min(listMeta.current_page * listMeta.per_page, listMeta.total)} من {listMeta.total}
                  </span>
                  <WsIconBtn
                    icon={ChevronRight}
                    label="السابق"
                    disabled={currentPage === 1}
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                  />
                  <WsIconBtn
                    icon={ChevronLeft}
                    label="التالي"
                    disabled={currentPage >= listMeta.last_page}
                    onClick={() => setPage(currentPage + 1)}
                  />
                </span>
              )}
            </>
          }
        >
          {scanResult && (
            <div style={{ padding: '10px 12px 0' }}>
              <WsAlert tone={scanResult.tone === 'error' ? 'error' : scanResult.tone} boxed>
                {scanResult.text}
              </WsAlert>
            </div>
          )}

          {/* ── تبويبا الغياب ── */}
          {isAbsenceTab ? (
            isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل حالات الغياب.
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>
                    إعادة المحاولة
                  </WsBtn>
                </WsAlert>
              </div>
            ) : isLoading ? (
              <WsEmpty loading>جارٍ تحميل الحالات...</WsEmpty>
            ) : !referrals?.items.length ? (
              <WsEmpty icon={activeMeta.icon}>
                لا توجد حالات {activeSubTab === 'consecutive' ? 'غياب متواصل' : 'غياب متكرر'}
                {recordStatus === 'resolved' ? ' مكتملة' : ' نشطة'}
              </WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th style={{ width: 118 }}>الغياب</th>
                    <th style={{ width: 168 }}>سُلَّم الدليل</th>
                    <th style={{ width: 128 }}>الإحالة</th>
                    <th style={{ width: 92 }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.items.map((item) => {
                    const rungs = buildLadder(item)
                    const next = nextRung(rungs)
                    const nextColor = next ? rungTone(next).tx : TONES.green.tx
                    return (
                      <tr
                        key={item.id}
                        // المؤشر لا يَعِد بما لا يقع: اليتيم بلا referral_id لا يُنقر
                        className={item.referral_id ? 'is-clickable' : undefined}
                        onClick={() => item.referral_id && navigate(`/admin/referrals/${item.referral_id}`)}
                      >
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <InitialAvatar name={item.student?.name ?? '؟'} tone={TONES.gray} size={22} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 600 }}>{item.student?.name}</span>
                              <span className="ws-cell-sub">
                                {item.student?.grade} / {item.student?.class_name}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                            <b style={{ fontSize: 14 }}>{item.total_absence_days}</b>
                            <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>يوم</span>
                            {item.absence_type === 'consecutive' && item.consecutive_days && (
                              <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                                ({item.consecutive_days} متواصلة)
                              </span>
                            )}
                          </span>
                          <span className="ws-cell-sub">
                            {fmtDate(item.absence_start_date)} ← {fmtDate(item.last_absence_date)}
                          </span>
                        </td>
                        <td>
                          <DirectiveLadder rungs={rungs} />
                          <span className="ws-cell-sub" style={{ color: nextColor }}>
                            {next ? `التالي: ${next.label}` : 'اكتمل السلّم'}
                          </span>
                        </td>
                        <td>
                          {item.referral?.referral_number ? (
                            <span style={{ fontFamily: 'monospace', fontSize: 11, direction: 'ltr', display: 'inline-block' }}>
                              {item.referral.referral_number}
                            </span>
                          ) : (
                            <span
                              style={{ color: 'var(--ws-text-2)' }}
                              title="لا إحالة مرتبطة — حُذفت أو لم تُنشأ، فلا صفحة تفاصيل"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <WsBtn
                            size="sm"
                            icon={ListChecks}
                            onClick={(e) => {
                              e.stopPropagation()
                              setResolvedNotice(false)
                              setSelectedId(item.id)
                            }}
                          >
                            الإجراءات
                          </WsBtn>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )
          ) : activeSubTab === 'violations' ? (
            /* ── الأكثر مخالفة: رصدٌ لا واجب — فلا أحمر ولا أخضر ولا كهرماني ── */
            violationsError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>تعذّر تحميل قائمة المخالفات</WsAlert>
              </div>
            ) : isLoadingViolations ? (
              <WsEmpty loading>جارٍ تحميل القائمة...</WsEmpty>
            ) : !violationStudents?.items.length ? (
              <WsEmpty icon={AlertTriangle}>لا يوجد طلاب لديهم {minViolations} مخالفات أو أكثر</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th style={{ width: 38 }}>#</th>
                    <th>الطالب</th>
                    <th style={{ width: 110 }}>المخالفات</th>
                    <th style={{ width: 104 }}>آخر مخالفة</th>
                  </tr>
                </thead>
                <tbody>
                  {violationStudents.items.map((item, idx) => (
                    <tr key={item.student_id}>
                      <td style={{ color: 'var(--ws-text-2)' }}>
                        {(violationStudents.meta.current_page - 1) * violationStudents.meta.per_page + idx + 1}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <InitialAvatar name={item.student_name} tone={TONES.gray} size={22} />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 600 }}>{item.student_name}</span>
                            <span className="ws-cell-sub">
                              {item.grade} / {item.class_name}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <CountMeter value={item.violation_count} max={violationStudents.items[0]?.violation_count ?? 1} />
                      </td>
                      <td style={{ color: 'var(--ws-text-2)' }}>{fmtDate(item.last_violation_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </WsTable>
            )
          ) : lateError ? (
            <div style={{ padding: 14 }}>
              <WsAlert tone="error" boxed>تعذّر تحميل قائمة التأخر</WsAlert>
            </div>
          ) : isLoadingLate ? (
            <WsEmpty loading>جارٍ تحميل القائمة...</WsEmpty>
          ) : !lateStudents?.items.length ? (
            <WsEmpty icon={Clock}>لا يوجد طلاب لديهم {minLate} تأخرات أو أكثر</WsEmpty>
          ) : (
            <WsTable>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>#</th>
                  <th>الطالب</th>
                  <th style={{ width: 110 }}>التأخرات</th>
                  <th style={{ width: 128 }}>ما يوجبه الدليل</th>
                  <th style={{ width: 104 }}>آخر تأخر</th>
                </tr>
              </thead>
              <tbody>
                {lateStudents.items.map((item, idx) => (
                  <tr key={item.student_id}>
                    <td style={{ color: 'var(--ws-text-2)' }}>
                      {(lateStudents.meta.current_page - 1) * lateStudents.meta.per_page + idx + 1}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <InitialAvatar name={item.student_name} tone={TONES.gray} size={22} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 600 }}>{item.student_name}</span>
                          <span className="ws-cell-sub">
                            {item.grade} / {item.class_name}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <CountMeter value={item.late_count} max={lateStudents.items[0]?.late_count ?? 1} />
                    </td>
                    <td>
                      {/* رمادي: اللوحة لا تملك وسيلة لتصريفه، ووعدٌ ملوّن بلا زر كذب */}
                      <ToneChip tone={TONES.gray}>{ACTION_LEVEL_LABELS[item.action_level] ?? item.action_level}</ToneChip>
                    </td>
                    <td style={{ color: 'var(--ws-text-2)' }}>{fmtDate(item.last_late_date)}</td>
                  </tr>
                ))}
              </tbody>
            </WsTable>
          )}
        </WsBlock>

        {/* المودال داخل WsMain — position:fixed فيهرب من الـflex، وWsMain لا يُفصَل عند الطي */}
        {selectedId !== null && (selected || resolvedNotice) && (
          <div
            className="ws-modal"
            onClick={() => {
              setSelectedId(null)
              setResolvedNotice(false)
            }}
          >
            <div className="ws-modal__panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
              {!resolvedNotice && selected ? (
                <AbsenceDetail
                  referral={selected}
                  isPending={updateAction.isPending}
                  onAction={handleAction}
                  onClose={() => setSelectedId(null)}
                />
              ) : (
                <>
                  <header className="ws-modal__head">
                    <h3 className="ws-modal__title">اكتمل السلّم</h3>
                    <p className="ws-modal__sub">أُقفل الملف تلقائياً وأُكملت الإحالة</p>
                  </header>
                  <div className="ws-modal__body">
                    <WsAlert tone="success" boxed>
                      تمّت كل أركان الدليل الإجرائي. خرجت الحالة من القائمة النشطة — تجدها تحت «حالة السجل ← مكتمل».
                    </WsAlert>
                  </div>
                  <footer className="ws-modal__foot">
                    <WsBtn
                      variant="primary"
                      onClick={() => {
                        setSelectedId(null)
                        setResolvedNotice(false)
                      }}
                    >
                      إغلاق
                    </WsBtn>
                  </footer>
                </>
              )}
            </div>
          </div>
        )}
      </WsMain>
    </>
  )
}

/* الشدّة كمّية فتُقاس بالارتفاع ولا تُلوَّن — الأحمر يُدَّخر للطفل الذي لم يُخاطَب مركز الحماية بشأنه */
function CountMeter({ value, max }: { value: number; max: number }) {
  const steps = 6
  const filled = Math.max(1, Math.round((value / Math.max(max, 1)) * steps))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <b style={{ fontSize: 13, minWidth: 18 }}>{value}</b>
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 14 }}>
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 4 + i * 2,
              borderRadius: 1,
              background: i < filled ? TONES.gray.tx : TONES.gray.bd,
            }}
          />
        ))}
      </span>
    </span>
  )
}

/* تفاصيل الحالة — يحيا تحت النقر: يُشتق من القائمة فيُحدَّث مع كل إبطال */
function AbsenceDetail({
  referral,
  isPending,
  onAction,
  onClose,
}: {
  referral: AbsenceReferral
  isPending: boolean
  onAction: (action: string, notes?: string) => void
  onClose: () => void
}) {
  const rungs = buildLadder(referral)
  const done = rungs.filter((r) => r.open && r.done).length
  const openCount = rungs.filter((r) => r.open).length

  return (
    <>
      <header className="ws-modal__head">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h3 className="ws-modal__title">{referral.student?.name}</h3>
            <p className="ws-modal__sub">
              {referral.student?.grade} / {referral.student?.class_name}
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <DirectiveLadder rungs={rungs} />
            <WsIconBtn icon={ChevronLeft} label="إغلاق" onClick={onClose} />
          </span>
        </div>
      </header>

      <div className="ws-modal__body">
        <WsFactsList>
          <WsFactRow label="نوع الغياب">
            {referral.absence_type === 'consecutive' ? 'متواصل' : 'متكرر'}
          </WsFactRow>
          <WsFactRow label="إجمالي أيام الغياب">
            <b>{referral.total_absence_days}</b> يوم
          </WsFactRow>
          {referral.absence_type === 'consecutive' && referral.consecutive_days && (
            <WsFactRow label="أيام متواصلة">{referral.consecutive_days}</WsFactRow>
          )}
          <WsFactRow label="المدى">
            {fmtDate(referral.absence_start_date)} ← {fmtDate(referral.last_absence_date)}
          </WsFactRow>
          <WsFactRow label="أركان مستحقة">
            {done} من {openCount}
          </WsFactRow>
        </WsFactsList>

        <div>
          <p className="ws-label" style={{ marginBottom: 5 }}>سُلَّم الدليل الإجرائي</p>
          <LadderBoard rungs={rungs} referralId={referral.id} onAction={onAction} isPending={isPending} />
        </div>

        {/* خارج السلّم — الخادم يقبله ولا يحتسبه في الإقفال، فدسّه بين الأركان كارثة صامتة */}
        <div>
          <p className="ws-label" style={{ marginBottom: 5 }}>خارج السلّم — يُسجَّل ولا يُحتسب في الإقفال</p>
          <div
            style={{
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              padding: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              background: referral.committee_referred ? TONES.green.bg : undefined,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{OFF_LADDER_ACTION.label}</p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--ws-text-2)' }}>
                {referral.committee_referred ? `تم في ${fmtDate(referral.committee_referred_at)}` : 'لم يُسجَّل'}
              </p>
            </div>
            {!referral.committee_referred && (
              <WsBtn size="sm" icon={Check} disabled={isPending} onClick={() => onAction(OFF_LADDER_ACTION.key)}>
                تم التنفيذ
              </WsBtn>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
