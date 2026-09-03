import { useMemo, useState } from 'react'

import {
  ArrowUpLeft,
  CircleHelp,
  ClipboardList,
  FilePlus,
  Inbox,
  ListChecks,
  RefreshCw,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import {
  TONES,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsPage,
  WsSelect,
  WsTable,
  WsToolbar,
} from '@/shared/workspace'

import { LdHelpModal } from '../components/LdHelpModal'
import { ShadowRails, WitnessGrid } from '../components/Touchstone'
import { SeverityBar, VerdictChip } from '../components/VerdictChip'
import {
  useLdBoardQuery,
  useLdFormsQuery,
  useLdQuestionAnalyticsQuery,
  useToggleLdAcceptanceMutation,
} from '../hooks'
import type { LdBoardFilters, LdRow, LdSort, LdVerdict } from '../types'

type Tab = 'referrals' | 'forms' | 'questions'

const SORT_LABELS: Record<LdSort, string> = {
  severity: 'بالشدّة',
  peak: 'بأعلى بُعد',
  consensus: 'بالإجماع',
  net: 'بالصافي',
}

const VERDICT_FILTERS: { value: LdVerdict | ''; label: string }[] = [
  { value: '', label: 'كل الأحكام' },
  { value: 'specific_consensus', label: 'نوعية بإجماع' },
  { value: 'specific_single', label: 'نوعية بشاهد' },
  { value: 'shadowed', label: 'لها ظِلّ' },
  { value: 'general', label: 'عامة' },
  { value: 'below', label: 'دون العتبة' },
]

export function LearningDifficultiesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('referrals')
  const [filters, setFilters] = useState<LdBoardFilters>({ sort: 'severity' })
  const [search, setSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const query = useLdBoardQuery({ ...filters, search: search || undefined })
  const formsQuery = useLdFormsQuery()
  const questionsQuery = useLdQuestionAnalyticsQuery(undefined, tab === 'questions')
  const toggleAcceptance = useToggleLdAcceptanceMutation()

  const rows = query.data?.rows ?? []
  const totals = query.data?.totals
  const forms = formsQuery.data ?? []
  const openForms = forms.filter((f) => f.is_active && f.accepting_referrals)

  const grades = useMemo(
    () => [...new Set(rows.map((r) => r.student.grade).filter(Boolean))] as string[],
    [rows],
  )

  const openStudent = (studentId: number) => navigate(`/admin/learning-difficulties/students/${studentId}`)

  const patch = (next: Partial<LdBoardFilters>) => setFilters((prev) => ({ ...prev, ...next }))

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="صعوبات التعلّم"
        badge={
          <WsChip tone={openForms.length ? 'green' : 'amber'}>
            {openForms.length ? `${openForms.length} نموذج مفتوح` : 'الاستقبال مغلق'}
          </WsChip>
        }
        actions={
          <>
            <WsBtn icon={CircleHelp} onClick={() => setHelpOpen(true)}>
              ما هذه الصفحة؟
            </WsBtn>
            <Link to="/admin/learning-difficulties/forms/new">
              <WsBtn variant="primary" icon={FilePlus}>
                نموذج جديد
              </WsBtn>
            </Link>
            <WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => query.refetch()} />
          </>
        }
        facts={
          <>
            <WsFact label="المُحالون">{totals?.students ?? 0}</WsFact>
            <WsFact label="نوعية بإجماع">{totals?.specific_consensus ?? 0}</WsFact>
            <WsFact label="نوعية بشاهد">{totals?.specific_single ?? 0}</WsFact>
            <WsFact label="لها ظِلّ">{totals?.shadowed ?? 0}</WsFact>
            <WsFact label="عامة">{totals?.general ?? 0}</WsFact>
            <WsFact label="متابَعون سلفاً">{totals?.already_followed ?? 0}</WsFact>
          </>
        }
      >
        <div className="ws-seg" role="tablist">
          {(
            [
              ['referrals', 'المُحالون'],
              ['forms', 'النماذج'],
              ['questions', 'الأسئلة'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`ws-seg__btn${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </WsHeader>

      {tab === 'referrals' && (
        <>
          <WsToolbar>
            <WsField grow label="بحث">
              <WsInput
                placeholder="اسم الطالب…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </WsField>

            <WsField label="النموذج">
              <WsSelect
                value={filters.form_id ?? ''}
                onChange={(event) => patch({ form_id: Number(event.target.value) || undefined })}
              >
                <option value="">الكل</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.title}
                  </option>
                ))}
              </WsSelect>
            </WsField>

            <WsField label="الصف">
              <WsSelect
                value={filters.grade ?? ''}
                onChange={(event) => patch({ grade: event.target.value || undefined })}
              >
                <option value="">الكل</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </WsSelect>
            </WsField>

            <WsField label="الحكم">
              <WsSelect
                value={filters.verdict ?? ''}
                onChange={(event) => patch({ verdict: (event.target.value || undefined) as LdVerdict })}
              >
                {VERDICT_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WsSelect>
            </WsField>

            <WsField label="الترتيب">
              <div className="ws-seg">
                {(Object.keys(SORT_LABELS) as LdSort[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`ws-seg__btn${filters.sort === key ? ' is-active' : ''}`}
                    onClick={() => patch({ sort: key })}
                    title={
                      key === 'peak'
                        ? 'يقفز صاحب البُعد الواحد المشتعل — والقفزة نفسها هي الحجة'
                        : undefined
                    }
                  >
                    {SORT_LABELS[key]}
                  </button>
                ))}
              </div>
            </WsField>

            <WsChip
              tone={filters.hide_shadowed ? 'sky' : undefined}
              onClick={() => patch({ hide_shadowed: !filters.hide_shadowed })}
            >
              إخفاء ما له ظِلّ ({totals?.shadowed ?? 0})
            </WsChip>
          </WsToolbar>

          <WsBlock fill scroll>
            {query.isLoading ? (
              <WsEmpty loading>تُقرأ الإحالات…</WsEmpty>
            ) : rows.length === 0 ? (
              <WsEmpty icon={Inbox}>لا إحالات صعوبات في هذا العام</WsEmpty>
            ) : (
              <WsTable className="ws-mstack">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الشهادة</th>
                    <th>الظِّلّ</th>
                    <th>الحكم</th>
                    <th>الشدّة</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <BoardRow
                      key={row.student.student_id}
                      row={row}
                      onOpen={() => openStudent(row.student.student_id)}
                      thresholds={forms.find((f) => f.id === row.score.severity_form_id)}
                    />
                  ))}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </>
      )}

      {tab === 'forms' && (
        <WsBlock fill scroll>
          {formsQuery.isLoading ? (
            <WsEmpty loading>تُقرأ النماذج…</WsEmpty>
          ) : forms.length === 0 ? (
            <WsEmpty icon={ClipboardList}>لا نماذج بعد — ابدأ بنموذج جديد</WsEmpty>
          ) : (
            <WsTable className="ws-mstack">
              <thead>
                <tr>
                  <th>النموذج</th>
                  <th>النطاق</th>
                  <th>الأقسام / الأسئلة</th>
                  <th>السقف</th>
                  <th>العتبتان</th>
                  <th>الإحالات</th>
                  <th>يستقبل</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id}>
                    <td data-label="النموذج">
                      <strong>{form.title}</strong>
                      {form.structure_locked && (
                        <span className="ws-cell-sub">أسئلته مقفلة — وصلته إحالات</span>
                      )}
                    </td>
                    <td data-label="النطاق">
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                        {form.subject_ids.length ? `${form.subject_ids.length} مادة` : 'كل المواد'}
                        {' · '}
                        {form.grades.length ? `${form.grades.length} صف` : 'كل الصفوف'}
                        {form.teacher_ids.length ? ` · +${form.teacher_ids.length} معلم` : ''}
                      </span>
                    </td>
                    <td data-label="الأقسام">
                      {form.sections.length} / {form.questions_count}
                    </td>
                    <td data-label="السقف">{form.max_score}</td>
                    <td data-label="العتبتان">
                      <span style={{ fontSize: 11 }}>
                        <span style={{ color: TONES.amber.tx }}>{form.threshold_medium}%</span>
                        {' → '}
                        <span style={{ color: TONES.red.tx }}>{form.threshold_high}%</span>
                      </span>
                    </td>
                    <td data-label="الإحالات">{form.responses_count}</td>
                    <td data-label="يستقبل">
                      <WsChip
                        tone={form.accepting_referrals ? 'green' : 'amber'}
                        onClick={() => toggleAcceptance.mutate(form.id)}
                      >
                        {form.accepting_referrals ? 'مفتوح' : 'مغلق'}
                      </WsChip>
                    </td>
                    <td data-label="">
                      <Link to={`/admin/learning-difficulties/forms/${form.id}`}>
                        <WsBtn size="sm">تحرير</WsBtn>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </WsTable>
          )}
        </WsBlock>
      )}

      {tab === 'questions' && (
        <WsBlock fill scroll>
          {questionsQuery.isLoading ? (
            <WsEmpty loading>تُحلَّل الأسئلة…</WsEmpty>
          ) : (questionsQuery.data ?? []).length === 0 ? (
            <WsEmpty icon={ListChecks}>لا إجابات بعد لتحليلها</WsEmpty>
          ) : (
            <WsTable className="ws-mstack">
              <thead>
                <tr>
                  <th>السؤال</th>
                  <th>القسم</th>
                  <th>النموذج</th>
                  <th>سُئل</th>
                  <th>معدّل «نعم»</th>
                  <th>التمييز</th>
                </tr>
              </thead>
              <tbody>
                {(questionsQuery.data ?? []).map((question) => {
                  const rate = question.yes_rate ?? 0
                  const wasted = rate >= 0.95 || rate <= 0.03

                  return (
                    <tr key={question.question_id}>
                      <td data-label="السؤال">
                        {question.text}
                        {wasted && (
                          <WsChip tone="amber" style={{ marginInlineStart: 6 }}>
                            نقاطه مهدورة
                          </WsChip>
                        )}
                      </td>
                      <td data-label="القسم">{question.section_title}</td>
                      <td data-label="النموذج">{question.form_title}</td>
                      <td data-label="سُئل">{question.asked_count}</td>
                      <td data-label="معدّل نعم">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 64, height: 4, background: 'var(--ws-sunken)', borderRadius: 2 }}>
                            <div
                              style={{
                                width: `${rate * 100}%`,
                                height: '100%',
                                background: wasted ? TONES.amber.tx : TONES.sky.tx,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11 }}>{Math.round(rate * 100)}%</span>
                        </div>
                      </td>
                      <td data-label="التمييز">
                        {question.discrimination === null
                          ? '—'
                          : `${Math.round(question.discrimination * 100)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </WsTable>
          )}
        </WsBlock>
      )}

      <LdHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </WsPage>
  )
}

function BoardRow({
  row,
  onOpen,
  thresholds,
}: {
  row: LdRow
  onOpen: () => void
  thresholds?: { threshold_high: number; threshold_medium: number }
}) {
  const statuses = [...new Set(row.tracks.map((t) => t.referral_status).filter(Boolean))] as string[]

  return (
    <tr className="is-clickable" onClick={onOpen}>
      <td data-label="الطالب">
        <strong>{row.student.student_name}</strong>
        <span className="ws-cell-sub">
          {row.student.grade} / {row.student.class_name} · {row.witnesses.witness_count} شهود
        </span>
      </td>

      <td data-label="الشهادة">
        <WitnessGrid
          sections={row.sections}
          tracks={row.tracks}
          consensusSectionIds={row.consensus_section_ids}
        />
      </td>

      <td data-label="الظِّلّ">
        <ShadowRails shadow={row.shadow} />
      </td>

      <td data-label="الحكم">
        <VerdictChip
          verdict={row.verdict}
          label={row.verdict_label}
          reason={row.verdict_reason}
          followed={row.flags.has_open_case || row.flags.has_active_plan}
          ownerName={row.flags.case_owner_name}
        />
      </td>

      <td data-label="الشدّة">
        <SeverityBar
          score={row.score.top_total_score}
          max={row.score.top_max_score}
          severity={row.score.severity}
          thresholdHigh={thresholds?.threshold_high ?? 0}
        />
      </td>

      <td data-label="الحالة">
        {statuses.length <= 1 ? (
          <WsChip>{statuses[0] ?? '—'}</WsChip>
        ) : (
          <span style={{ fontSize: 11 }}>{statuses.length} حالات</span>
        )}
      </td>

      <td data-label="">
        <WsIconBtn icon={ArrowUpLeft} label="فتح ملفّ الطالب" onClick={onOpen} />
      </td>
    </tr>
  )
}
