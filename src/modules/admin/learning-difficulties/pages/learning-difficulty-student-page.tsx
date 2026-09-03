import { useMemo, useState } from 'react'

import {
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Flame,
  FolderOpen,
  History,
  RefreshCw,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  InitialAvatar,
  TONES,
  ToneChip,
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsHeader,
  WsIconBtn,
  WsPage,
  WsSpinner,
} from '@/shared/workspace'

import { LdMarkdown } from '../components/LdMarkdown'
import { ShadowRails, WitnessGrid } from '../components/Touchstone'
import { SeverityBar, VerdictChip } from '../components/VerdictChip'
import { useGenerateLdAiReportMutation, useLdFormsQuery, useLdStudentQuery } from '../hooks'
import type { LdHistoryWindow, LdRow, LdTrack } from '../types'

const SEVERITY_LABEL = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة' } as const
const SEVERITY_TONE = { low: TONES.green, medium: TONES.amber, high: TONES.red } as const

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('ar-SA-u-nu-latn', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

/**
 * ملفُّ الطالب في صعوبات التعلّم — صفحةٌ قائمةٌ بذاتها.
 *
 * كانت قراءةُ الذكاء محشورةً في عمودٍ جانبيٍّ بلا تمرير، فصار للطالب ملفٌّ
 * يتّسع لكلِّ شيء: المِحَكُّ ممتدّاً، وشهادةُ كلِّ معلّمٍ بورقة إجاباته،
 * والعامُ الحاليُّ بجوار السابق، والقراءةُ الذكيّةُ في صدر الصفحة لا ذيلها.
 */
export function LearningDifficultyStudentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const studentId = Number(id) || null

  const query = useLdStudentQuery(studentId)
  const formsQuery = useLdFormsQuery()
  const aiMutation = useGenerateLdAiReportMutation()

  const row = query.data
  const severityForm = formsQuery.data?.find((f) => f.id === row?.score.severity_form_id)

  // ما ولّده الآن يسبق المحفوظ حتى يُعاد جلبُ الملف
  const report = aiMutation.data?.report_markdown ?? row?.ai.report_markdown ?? null
  const generatedAt = aiMutation.data?.generated_at ?? row?.ai.generated_at ?? null
  const stale = aiMutation.data ? false : (row?.ai.stale ?? false)

  if (query.isLoading) {
    return (
      <WsPage className="ws-rich">
        <WsEmpty loading>يُقرأ ملفّ الطالب…</WsEmpty>
      </WsPage>
    )
  }

  if (query.isError || !row) {
    return (
      <WsPage className="ws-rich">
        <WsHeader
          title="ملفّ صعوبات التعلّم"
          actions={
            <WsBtn icon={ArrowRight} onClick={() => navigate('/admin/learning-difficulties')}>
              عودة للوح
            </WsBtn>
          }
        />
        <WsEmpty icon={FolderOpen}>لا إحالات صعوبات لهذا الطالب في هذا العام</WsEmpty>
      </WsPage>
    )
  }

  const severityTone = SEVERITY_TONE[row.score.severity] ?? TONES.green
  const followed = row.flags.has_open_case || row.flags.has_active_plan

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title={row.student.student_name}
        badge={
          <VerdictChip
            verdict={row.verdict}
            label={row.verdict_label}
            reason={row.verdict_reason}
            followed={followed}
            ownerName={row.flags.case_owner_name}
          />
        }
        actions={
          <>
            <WsBtn icon={ArrowRight} onClick={() => navigate('/admin/learning-difficulties')}>
              اللوح
            </WsBtn>
            <WsBtn
              variant="primary"
              icon={Sparkles}
              onClick={() => aiMutation.mutate({ studentId: row.student.student_id, force: !!report })}
              disabled={aiMutation.isPending}
            >
              {aiMutation.isPending ? 'تُقرأ…' : report ? 'أعِد القراءة' : 'اقرأ الملفّ'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="الشهود">
              {row.witnesses.witness_count}
            </WsFact>
            <WsFact icon={BookOpenCheck} label="المواد">
              {row.witnesses.subject_count}
            </WsFact>
            <WsFact icon={Flame} label="أعلى بُعد">
              {row.peak ? `${row.peak.section_title} ${Math.round(row.peak.ratio * 100)}%` : '—'}
            </WsFact>
            <WsFact icon={CalendarRange} label="آخر شهادة">
              {formatDate(row.witnesses.latest_response_at)}
            </WsFact>
          </>
        }
      />

      <WsBlock fill scroll>
        <div className="ld-student">
          {/* ── البطل ── */}
          <div className="ws-profile-hero">
            <InitialAvatar name={row.student.student_name} tone={severityTone} size={54} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ws-text)' }}>
                  {row.student.student_name}
                </h2>
                <ToneChip tone={severityTone}>شدّة {SEVERITY_LABEL[row.score.severity]}</ToneChip>
                {followed && (
                  <ToneChip tone={TONES.sky}>
                    {row.flags.has_active_plan ? 'خطة علاجية نشطة' : 'حالة مفتوحة'}
                    {row.flags.case_owner_name ? ` · ${row.flags.case_owner_name}` : ''}
                  </ToneChip>
                )}
                {row.witnesses.withdrawn_count > 0 && (
                  <ToneChip tone={TONES.gray}>{row.witnesses.withdrawn_count} شهادة مسحوبة</ToneChip>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px' }}>
                <WsFact>
                  {row.student.grade} / {row.student.class_name}
                </WsFact>
                {row.student.student_number && <WsFact label="الرقم">{row.student.student_number}</WsFact>}
                <WsFact label="النموذج">{row.score.severity_form_title ?? '—'}</WsFact>
                {row.flags.prior_ld_referrals_count > 0 && (
                  <WsFact icon={History} label="إحالات صعوبات سابقة">
                    {row.flags.prior_ld_referrals_count}
                  </WsFact>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ws-text-2)', lineHeight: 1.6 }}>{row.verdict_reason}</div>
            </div>
          </div>

          {/* ── الأرقام ── */}
          <div className="ws-statgrid">
            <Stat label="أعلى درجة" value={`${row.score.top_total_score} / ${row.score.top_max_score}`} sub={row.score.severity_form_title ?? ''} />
            <Stat
              label="أبعاد مشتعلة"
              value={`${row.spread.ignited_sections} / ${row.spread.measured_sections}`}
              sub="من المقيسة"
              tone={row.spread.ignited_sections > 0 ? TONES.red : undefined}
            />
            <Stat
              label="إجماع"
              value={String(row.consensus_section_ids.length)}
              sub={row.consensus_section_ids.length ? 'بُعد اتّفق عليه شاهدان' : 'لا إجماع بعد'}
              tone={row.consensus_section_ids.length ? TONES.red : undefined}
            />
            <Stat
              label="الظِّلّ"
              value={row.shadow.comparable ? `${row.shadow.rails.filter((r) => r.ignited).length} / ${row.shadow.rails.length}` : '—'}
              sub={row.shadow.comparable ? 'سكك مشتعلة' : 'لا مقارنة بعد'}
              tone={row.shadow.rails.some((r) => r.ignited) ? TONES.sky : undefined}
            />
            <Stat
              label="قراءة الذكاء"
              value={report ? (stale ? 'قديمة' : 'جاهزة') : 'لم تُقرأ'}
              sub={generatedAt ? formatDateTime(generatedAt) : 'اضغط «اقرأ الملفّ»'}
              tone={report ? (stale ? TONES.amber : TONES.green) : undefined}
            />
          </div>

          {/* ── قراءةُ الذكاء — في الصدر لا الذيل ── */}
          <WsBlock
            title="قراءةُ الذكاء"
            icon={Sparkles}
            count={generatedAt ? formatDateTime(generatedAt) : undefined}
            tools={
              report ? (
                <WsIconBtn
                  icon={RefreshCw}
                  label="أعِد القراءة"
                  onClick={() => aiMutation.mutate({ studentId: row.student.student_id, force: true })}
                  disabled={aiMutation.isPending}
                />
              ) : undefined
            }
            padded
            className="ld-student__ai"
          >
            {stale && (
              <WsAlert tone="warn" boxed>
                وصلت شهادةٌ جديدة بعد هذه القراءة — التقرير لا يعرفها. أعِد القراءة لتشملها.
              </WsAlert>
            )}
            {aiMutation.isError && (
              <WsAlert tone="error" boxed>
                تعذّرت القراءة الآن — حاول بعد قليل.
              </WsAlert>
            )}

            {aiMutation.isPending ? (
              <div className="ld-student__ai-wait">
                <WsSpinner style={{ width: 16, height: 16 }} />
                <span>تُقرأ الآن… شهاداتُ المعلّمين، وسنةٌ حاليةٌ وسنةٌ سابقة، وأقرانُ الفصل.</span>
              </div>
            ) : report ? (
              <LdMarkdown source={report} />
            ) : (
              <div className="ld-student__ai-empty">
                <Sparkles size={20} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>لم يُقرأ هذا الملفّ بعد</div>
                  <div style={{ fontSize: 12, color: 'var(--ws-text-2)', lineHeight: 1.6 }}>
                    تجمع القراءةُ ما قاله المعلّمون مع الحضور والسلوك، وتكتب ملخّصاً مفهوماً بالعربية.
                    وهي قراءةٌ مساعِدة لا تشخيص.
                  </div>
                </div>
                <WsBtn
                  variant="primary"
                  icon={Sparkles}
                  onClick={() => aiMutation.mutate({ studentId: row.student.student_id, force: false })}
                >
                  اقرأ الملفّ
                </WsBtn>
              </div>
            )}
          </WsBlock>

          {/* ── المِحَكّ والظِّلّ جنباً إلى جنب ── */}
          <div className="ld-student__grid">
            <WsBlock title="المِحَكّ الممتدّ" icon={BookOpenCheck} padded>
              <WitnessGrid
                sections={row.sections}
                tracks={row.tracks}
                consensusSectionIds={row.consensus_section_ids}
                expanded
              />
              <WsFactsList style={{ marginTop: 10 }}>
                {row.sections.map((section) => {
                  const consensus = row.consensus_section_ids.includes(section.section_id)
                  const peak = row.peak?.section_id === section.section_id

                  return (
                    <WsFactRow key={section.section_id} label={section.title}>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {consensus && <ToneChip tone={TONES.red}>إجماع</ToneChip>}
                        {peak && !consensus && <ToneChip tone={TONES.amber}>أعلى بُعد</ToneChip>}
                        <span style={{ color: 'var(--ws-text-2)', fontSize: 11 }}>وزنه {section.weight}</span>
                      </span>
                    </WsFactRow>
                  )
                })}
              </WsFactsList>
            </WsBlock>

            <WsBlock title="الظِّلّ — مقارنةً بأقران الفصل" icon={Eye} padded>
              <ShadowRails shadow={row.shadow} expanded />
              {row.shadow.comparable && (
                <WsFactsList style={{ marginTop: 8 }}>
                  <WsFactRow label="الأقران">{row.shadow.peers_count}</WsFactRow>
                  <WsFactRow label="أيام الدراسة">{row.shadow.working_days}</WsFactRow>
                  {row.shadow_detail && (
                    <>
                      <WsFactRow label="غياب بعذر معتمد">{row.shadow_detail.excused_days}</WsFactRow>
                      <WsFactRow label="غياب بلا عذر">{row.shadow_detail.unexcused_days}</WsFactRow>
                    </>
                  )}
                </WsFactsList>
              )}

              {row.history && <HistoryTable current={row.history.current} previous={row.history.previous} />}

              {row.shadow_detail && row.shadow_detail.absence_by_month.length > 0 && (
                <AbsenceSpark months={row.shadow_detail.absence_by_month} />
              )}
            </WsBlock>
          </div>

          {/* ── شهادات المعلّمين ── */}
          <WsBlock title="شهاداتُ المعلّمين" icon={Users} count={row.tracks.length} padded>
            <div className="ld-tracks">
              {row.tracks.map((track) => (
                <TrackCard
                  key={track.response_id}
                  track={track}
                  thresholdHigh={severityForm?.id === track.form_id ? severityForm.threshold_high : 0}
                />
              ))}
            </div>
          </WsBlock>

          {/* ── الأسئلة المشتعلة ── */}
          {row.fired && row.fired.length > 0 && (
            <WsBlock title="الأسئلة المشتعلة" icon={Flame} count={row.fired.reduce((n, s) => n + s.questions.length, 0)} padded>
              <div className="ld-fired">
                {row.fired.map((section) => (
                  <div key={section.section_id} className="ld-fired__section">
                    <div className="ld-fired__title">{section.section_title}</div>
                    {section.questions.map((question) => (
                      <div key={question.question_id} className="ld-fired__q">
                        <span className="ld-fired__text">{question.text}</span>
                        <span className="ld-fired__who">
                          {question.witnesses.map((w) => (
                            <ToneChip key={w.response_id} tone={TONES.red}>
                              {w.teacher_name ?? 'معلم'}
                              {w.subject_name ? ` · ${w.subject_name}` : ''}
                            </ToneChip>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </WsBlock>
          )}

          {/* ── السجلّ ── */}
          <WsBlock title="السجلّ" icon={ScrollText} padded>
            <div className="ld-student__grid">
              <div>
                <div className="ws-label">المتابعة</div>
                <WsFactsList>
                  <WsFactRow label="حالة مفتوحة">{row.flags.has_open_case ? 'نعم' : 'لا'}</WsFactRow>
                  <WsFactRow label="خطة علاجية نشطة">{row.flags.has_active_plan ? 'نعم' : 'لا'}</WsFactRow>
                  <WsFactRow label="مسؤول الحالة">{row.flags.case_owner_name ?? '—'}</WsFactRow>
                  <WsFactRow label="إحالات صعوبات سابقة">{row.flags.prior_ld_referrals_count}</WsFactRow>
                  <WsFactRow label="إحالات سلوكية سابقة">
                    {row.shadow_detail?.prior_behavioral_referrals.length ?? 0}
                  </WsFactRow>
                </WsFactsList>

                {row.history && row.history.top_behaviors.length > 0 && (
                  <>
                    <div className="ws-label" style={{ marginTop: 10 }}>
                      أكثر السلوكيات المرصودة
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {row.history.top_behaviors.map((b) => (
                        <WsChip key={b.name}>
                          {b.name} · {b.total}
                        </WsChip>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="ws-label">المخالفات هذا العام</div>
                {row.shadow_detail && row.shadow_detail.violations.length > 0 ? (
                  <WsFactsList>
                    {row.shadow_detail.violations.slice(0, 8).map((v, index) => (
                      <WsFactRow key={index} label={formatDate(v.incident_date)}>
                        {v.violation_type}
                        {v.degree ? ` · ${v.degree}` : ''}
                      </WsFactRow>
                    ))}
                  </WsFactsList>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>لا مخالفات مسجّلة</div>
                )}

                {row.shadow_detail && row.shadow_detail.late_dates.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ws-text-2)' }}>
                    تأخّر صباحيّ {row.shadow_detail.late_dates.length} مرّة، آخرها{' '}
                    {formatDate(row.shadow_detail.late_dates[row.shadow_detail.late_dates.length - 1])}.
                  </div>
                )}
              </div>
            </div>
          </WsBlock>

          <div className="ld-student__foot">
            <Link to="/admin/learning-difficulties">← عودة إلى لوح صعوبات التعلّم</Link>
          </div>
        </div>
      </WsBlock>
    </WsPage>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: { bg: string; bd: string; tx: string }
}) {
  return (
    <div className="ws-stat" style={tone ? { borderColor: tone.bd, background: tone.bg } : undefined}>
      <span className="ws-stat__label">{label}</span>
      <span className="ws-stat__value" style={tone ? { color: tone.tx } : undefined}>
        {value}
      </span>
      {sub && <span className="ws-stat__sub">{sub}</span>}
    </div>
  )
}

/** العامُ الحاليُّ بجوار السابق — الأرقامُ نفسُها التي يقرؤها الذكاء. */
function HistoryTable({ current, previous }: { current: LdHistoryWindow; previous: LdHistoryWindow }) {
  const rows: { label: string; key: keyof Pick<LdHistoryWindow, 'absence_days' | 'late_days' | 'violations'> }[] = [
    { label: 'أيام الغياب', key: 'absence_days' },
    { label: 'التأخّر الصباحي', key: 'late_days' },
    { label: 'المخالفات', key: 'violations' },
  ]

  return (
    <div style={{ marginTop: 12 }}>
      <div className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <History size={12} /> هذا العام مقابل الماضي
      </div>
      <table className="ld-history">
        <thead>
          <tr>
            <th />
            <th>الحالي</th>
            <th>السابق</th>
            <th>الفرق</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, key }) => {
            const delta = current[key] - previous[key]
            const tone = delta > 0 ? TONES.red : delta < 0 ? TONES.green : TONES.gray

            return (
              <tr key={key}>
                <td>{label}</td>
                <td className="ld-history__num">{current[key]}</td>
                <td className="ld-history__num ld-history__prev">{previous[key]}</td>
                <td className="ld-history__num" style={{ color: tone.tx, fontWeight: 700 }}>
                  {delta > 0 ? `+${delta}` : delta}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 10.5, color: 'var(--ws-text-3, var(--ws-text-2))', marginTop: 4 }}>
        الحالي {current.from} → {current.to} · السابق {previous.from} → {previous.to}
      </div>
    </div>
  )
}

function AbsenceSpark({ months }: { months: { month: string; days: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.days))

  return (
    <div style={{ marginTop: 12 }}>
      <div className="ws-label">الغياب بالشهر</div>
      <div className="ld-spark">
        {months.map((m) => (
          <div key={m.month} className="ld-spark__col" title={`${m.month}: ${m.days} يوم`}>
            <div className="ld-spark__bar-wrap">
              <div
                className="ws-sparkbar ld-spark__bar"
                style={{ height: `${Math.max(6, (m.days / max) * 100)}%` }}
              />
            </div>
            <span className="ld-spark__label">{m.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** شهادةُ معلّمٍ واحد: من، عن أيّ مادّة، بأيّ نموذج — وورقةُ إجاباته كاملةً عند الطلب. */
function TrackCard({ track, thresholdHigh }: { track: LdTrack; thresholdHigh: number }) {
  const [open, setOpen] = useState(false)
  const yesCount = useMemo(
    () => (track.answers ?? []).reduce((n, s) => n + s.questions.filter((q) => q.answer).length, 0),
    [track.answers],
  )
  const total = useMemo(() => (track.answers ?? []).reduce((n, s) => n + s.questions.length, 0), [track.answers])

  return (
    <div className={`ld-track${track.withdrawn ? ' is-withdrawn' : ''}`}>
      <div className="ld-track__head" onClick={() => setOpen((v) => !v)} role="button" tabIndex={0}>
        <InitialAvatar name={track.teacher_name ?? 'م'} tone={track.withdrawn ? TONES.gray : TONES.sky} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong>{track.teacher_name ?? 'معلم'}</strong>
            {track.subject_name && <WsChip tone="sky">{track.subject_name}</WsChip>}
            {track.withdrawn && <WsChip tone="amber">شهادة مسحوبة</WsChip>}
            {track.referral_status && !track.withdrawn && <WsChip>{track.referral_status}</WsChip>}
          </div>
          <div className="ws-cell-sub">
            {track.form_title ?? 'نموذج'} · {formatDateTime(track.created_at)}
            {track.referral_number ? ` · ${track.referral_number}` : ''}
            {total > 0 ? ` · «نعم» على ${yesCount} من ${total}` : ''}
          </div>
        </div>
        <SeverityBar
          score={track.total_score}
          max={track.max_score}
          severity={track.severity}
          thresholdHigh={thresholdHigh}
        />
        <WsIconBtn
          icon={open ? ChevronUp : ChevronDown}
          label={open ? 'طيّ الإجابات' : 'عرض الإجابات'}
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {track.teacher_notes && <div className="ld-track__notes">«{track.teacher_notes}»</div>}

      {open && (
        <div className="ld-sheet">
          {(track.answers ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>لا إجابات محفوظة لهذه الشهادة.</div>
          ) : (
            (track.answers ?? []).map((section) => (
              <div key={section.section_id} className="ld-sheet__section">
                <div className="ld-sheet__title">{section.section_title}</div>
                {section.questions.map((q) => (
                  <div key={q.question_id} className={`ld-sheet__q${q.answer ? ' is-yes' : ''}`}>
                    <span className="ld-sheet__mark">{q.answer ? <Check size={12} /> : <X size={12} />}</span>
                    <span className="ld-sheet__text">{q.text}</span>
                    <span className="ld-sheet__pts">{q.points_awarded}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export type { LdRow }
