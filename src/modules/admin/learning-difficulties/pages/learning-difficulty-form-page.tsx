import { useEffect, useMemo, useState } from 'react'

import { ChevronDown, ChevronUp, Copy, ListPlus, Save, Scale, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  TONES,
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
  WsSwitch,
  WsTextarea,
} from '@/shared/workspace'

import {
  useCreateLdFormMutation,
  useLdFormQuery,
  useLdScopeOptionsQuery,
  useUpdateLdFormMutation,
} from '../hooks'
import type { LdFormPayload } from '../types'

interface DraftQuestion {
  localId: string
  id?: number
  text: string
  pointsYes: number
  pointsNo: number
}

interface DraftSection {
  localId: string
  id?: number
  title: string
  questions: DraftQuestion[]
  defaultYes: number
  defaultNo: number
  collapsed?: boolean
}

let counter = 0
const nextId = () => `local-${++counter}`

const emptySection = (): DraftSection => ({
  localId: nextId(),
  title: '',
  questions: [],
  defaultYes: 1,
  defaultNo: 0,
})

export function LearningDifficultyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const formId = isNew ? null : Number(id)

  const formQuery = useLdFormQuery(formId)
  const scopeQuery = useLdScopeOptionsQuery()
  const createMutation = useCreateLdFormMutation()
  const updateMutation = useUpdateLdFormMutation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<DraftSection[]>([emptySection()])
  const [thresholdHigh, setThresholdHigh] = useState(0)
  const [thresholdMedium, setThresholdMedium] = useState(0)
  const [subjectIds, setSubjectIds] = useState<number[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [accepting, setAccepting] = useState(true)
  const [bulkOpen, setBulkOpen] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState('')

  const server = formQuery.data
  const locked = server?.structure_locked ?? false

  useEffect(() => {
    if (!server) return

    setTitle(server.title)
    setDescription(server.description ?? '')
    setThresholdHigh(server.threshold_high)
    setThresholdMedium(server.threshold_medium)
    setSubjectIds(server.subject_ids ?? [])
    setGrades(server.grades ?? [])
    setAccepting(server.accepting_referrals)
    setSections(
      server.sections.map((section) => ({
        localId: nextId(),
        id: section.id,
        title: section.title,
        defaultYes: 1,
        defaultNo: 0,
        questions: section.questions.map((question) => ({
          localId: nextId(),
          id: question.id,
          text: question.text,
          pointsYes: question.points_yes,
          pointsNo: question.points_no,
        })),
      })),
    )
  }, [server])

  /* ── الميزان: يُعاد حسابه محلياً عند كل ضغطة مفتاح ── */
  const balance = useMemo(() => {
    const sectionWeights = sections.map((section) => {
      const max = section.questions.reduce((sum, q) => sum + Math.max(q.pointsYes, q.pointsNo), 0)
      const min = section.questions.reduce((sum, q) => sum + Math.min(q.pointsYes, q.pointsNo), 0)

      return { title: section.title || 'قسم بلا عنوان', weight: max - min, max, min }
    })

    const maxScore = sectionWeights.reduce((sum, s) => sum + s.max, 0)
    const minScore = sectionWeights.reduce((sum, s) => sum + s.min, 0)
    const totalWeight = sectionWeights.reduce((sum, s) => sum + s.weight, 0)
    const heaviest = [...sectionWeights].sort((a, b) => b.weight - a.weight)[0]
    const lightest = [...sectionWeights].sort((a, b) => a.weight - b.weight)[0]

    // ثلاثة طلاب وهميين يُقيَّمون حياً على النموذج الحالي
    const allYes = sections.reduce(
      (sum, s) => sum + s.questions.reduce((acc, q) => acc + q.pointsYes, 0),
      0,
    )

    const heaviestTitle = heaviest?.title
    const onlyHeaviest = sections.reduce((sum, section) => {
      const isHeaviest = (section.title || 'قسم بلا عنوان') === heaviestTitle

      return (
        sum +
        section.questions.reduce((acc, q) => acc + (isHeaviest ? q.pointsYes : q.pointsNo), 0)
      )
    }, 0)

    const halfSpread = sections.reduce(
      (sum, section) =>
        sum +
        section.questions.reduce(
          (acc, question, index) => acc + (index % 2 === 0 ? question.pointsYes : question.pointsNo),
          0,
        ),
      0,
    )

    const band = (score: number) =>
      thresholdHigh > 0 && score >= thresholdHigh
        ? 'high'
        : thresholdMedium > 0 && score >= thresholdMedium
          ? 'medium'
          : 'low'

    return {
      sectionWeights,
      maxScore,
      minScore,
      totalWeight,
      heaviest,
      lightest,
      questionsCount: sections.reduce((sum, s) => sum + s.questions.length, 0),
      /** قسمٌ واحد يبلغ العتبة الحمراء وحده = نموذجُ قسمٍ واحد عملياً */
      soloReachesHigh: heaviest && thresholdHigh > 0 && heaviest.max >= thresholdHigh,
      dummies: [
        { label: 'كل الإجابات «نعم»', score: allYes, band: band(allYes) },
        { label: 'نعم في أثقل قسم وحده', score: onlyHeaviest, band: band(onlyHeaviest) },
        { label: 'نصف الإجابات موزّعة', score: halfSpread, band: band(halfSpread) },
      ],
      /** النموذج مقلوب: يكافئ الضعف العام ويعاقب الصعوبة النوعية */
      inverted: band(halfSpread) === 'high' && band(onlyHeaviest) !== 'high',
    }
  }, [sections, thresholdHigh, thresholdMedium])

  const blockers = useMemo(() => {
    const list: string[] = []

    if (!title.trim()) list.push('النموذج بلا عنوان.')
    if (balance.questionsCount === 0) list.push('النموذج بلا أسئلة.')
    if (thresholdHigh > balance.maxScore) list.push('العتبة الحمراء أعلى من سقف النموذج — لا يبلغها أحد.')
    if (thresholdMedium >= thresholdHigh && thresholdHigh > 0)
      list.push('العتبة البرتقالية يجب أن تقل عن الحمراء.')

    return list
  }, [title, balance, thresholdHigh, thresholdMedium])

  const patchSection = (localId: string, patch: Partial<DraftSection>) =>
    setSections((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)))

  const patchQuestion = (sectionId: string, questionId: string, patch: Partial<DraftQuestion>) =>
    setSections((prev) =>
      prev.map((section) =>
        section.localId === sectionId
          ? {
              ...section,
              questions: section.questions.map((q) =>
                q.localId === questionId ? { ...q, ...patch } : q,
              ),
            }
          : section,
      ),
    )

  const moveSection = (index: number, direction: -1 | 1) =>
    setSections((prev) => {
      const next = [...prev]
      const target = index + direction

      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]

      return next
    })

  const applyBulk = (sectionId: string) => {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) return

    setSections((prev) =>
      prev.map((section) =>
        section.localId === sectionId
          ? {
              ...section,
              questions: [
                ...section.questions,
                ...lines.map((text) => ({
                  localId: nextId(),
                  text,
                  pointsYes: section.defaultYes,
                  pointsNo: section.defaultNo,
                })),
              ],
            }
          : section,
      ),
    )

    setBulkText('')
    setBulkOpen(null)
  }

  const save = () => {
    const payload: LdFormPayload = {
      title,
      description: description || null,
      subject_ids: subjectIds.length ? subjectIds : null,
      grades: grades.length ? grades : null,
      accepting_referrals: accepting,
      threshold_high: thresholdHigh,
      threshold_medium: thresholdMedium,
    }

    if (!locked) {
      payload.sections = sections
        .filter((section) => section.questions.length > 0)
        .map((section) => ({
          title: section.title || 'قسم',
          questions: section.questions.map((question) => ({
            id: question.id,
            text: question.text,
            points_yes: question.pointsYes,
            points_no: question.pointsNo,
          })),
        }))
    }

    const onDone = () => navigate('/admin/learning-difficulties')

    if (isNew) createMutation.mutate(payload, { onSuccess: onDone })
    else updateMutation.mutate({ id: formId as number, payload }, { onSuccess: onDone })
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title={
          <WsInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان النموذج…"
            style={{ fontSize: 16, fontWeight: 700, minWidth: 280 }}
          />
        }
        badge={<WsChip tone={accepting ? 'green' : 'amber'}>{accepting ? 'يستقبل' : 'مغلق'}</WsChip>}
        actions={
          <>
            <span className="ws-fact">
              <WsSwitch checked={accepting} onChange={setAccepting} />
              <span>يستقبل الإحالات</span>
            </span>
            <WsBtn variant="primary" icon={Save} onClick={save} disabled={blockers.length > 0 || saving}>
              {saving ? 'يُحفظ…' : 'حفظ'}
            </WsBtn>
          </>
        }
      />

      {locked && (
        <WsAlert tone="warn">
          {server?.responses_count} إحالة قِيست بهذا النموذج — أسئلته مقفلة، والتعديل لا يعيد حسابها.
          العناوين والعتبات والنطاق تبقى قابلة للتعديل.
        </WsAlert>
      )}

      {blockers.map((blocker) => (
        <WsAlert key={blocker} tone="error">
          {blocker}
        </WsAlert>
      ))}

      <WsLayout>
        <WsMain>
          <WsBlock fill scroll padded>
            {sections.map((section, index) => (
              <WsBlock
                key={section.localId}
                title={
                  <WsInput
                    value={section.title}
                    onChange={(event) => patchSection(section.localId, { title: event.target.value })}
                    placeholder={`القسم ${index + 1}`}
                    disabled={locked}
                  />
                }
                count={`${section.questions.length} سؤال`}
                tools={
                  !locked && (
                    <>
                      <WsIconBtn icon={ChevronUp} label="أعلى" onClick={() => moveSection(index, -1)} />
                      <WsIconBtn icon={ChevronDown} label="أسفل" onClick={() => moveSection(index, 1)} />
                      <WsIconBtn
                        icon={ListPlus}
                        label="لصق دفعة"
                        onClick={() => setBulkOpen(bulkOpen === section.localId ? null : section.localId)}
                      />
                      <WsIconBtn
                        icon={Copy}
                        label="نسخ القسم"
                        onClick={() =>
                          setSections((prev) => [
                            ...prev,
                            {
                              ...section,
                              localId: nextId(),
                              id: undefined,
                              title: `${section.title} (نسخة)`,
                              questions: section.questions.map((q) => ({
                                ...q,
                                localId: nextId(),
                                id: undefined,
                              })),
                            },
                          ])
                        }
                      />
                      <WsIconBtn
                        icon={Trash2}
                        label="حذف القسم"
                        onClick={() =>
                          setSections((prev) => prev.filter((s) => s.localId !== section.localId))
                        }
                      />
                    </>
                  )
                }
                padded
              >
                {bulkOpen === section.localId && (
                  <div style={{ marginBottom: 8 }}>
                    <WsTextarea
                      value={bulkText}
                      onChange={(event) => setBulkText(event.target.value)}
                      placeholder="سطرٌ لكل سؤال — تُنشأ كلها بنقاط القسم الافتراضية"
                      rows={5}
                    />
                    <WsBtn size="sm" onClick={() => applyBulk(section.localId)} style={{ marginTop: 6 }}>
                      أضف الأسئلة
                    </WsBtn>
                  </div>
                )}

                {!locked && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                    <WsField label="نعم افتراضياً">
                      <WsInput
                        type="number"
                        value={section.defaultYes}
                        onChange={(event) =>
                          patchSection(section.localId, { defaultYes: Number(event.target.value) })
                        }
                        style={{ width: 56 }}
                      />
                    </WsField>
                    <WsField label="لا افتراضياً">
                      <WsInput
                        type="number"
                        value={section.defaultNo}
                        onChange={(event) =>
                          patchSection(section.localId, { defaultNo: Number(event.target.value) })
                        }
                        style={{ width: 56 }}
                      />
                    </WsField>
                  </div>
                )}

                {section.questions.map((question) => {
                  const noDiscrimination = question.pointsYes === question.pointsNo

                  return (
                    <div
                      key={question.localId}
                      style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}
                    >
                      <WsInput
                        value={question.text}
                        onChange={(event) =>
                          patchQuestion(section.localId, question.localId, { text: event.target.value })
                        }
                        placeholder="نص السؤال"
                        style={{ flex: 1 }}
                        disabled={locked}
                      />
                      <WsInput
                        type="number"
                        value={question.pointsYes}
                        onChange={(event) =>
                          patchQuestion(section.localId, question.localId, {
                            pointsYes: Number(event.target.value),
                          })
                        }
                        title="نقاط «نعم»"
                        style={{ width: 56 }}
                        disabled={locked}
                      />
                      <WsInput
                        type="number"
                        value={question.pointsNo}
                        onChange={(event) =>
                          patchQuestion(section.localId, question.localId, {
                            pointsNo: Number(event.target.value),
                          })
                        }
                        title="نقاط «لا»"
                        style={{ width: 56 }}
                        disabled={locked}
                      />
                      {noDiscrimination && <WsChip tone="amber">لا يميّز</WsChip>}
                      {!locked && (
                        <WsIconBtn
                          icon={Trash2}
                          label="حذف السؤال"
                          onClick={() =>
                            patchSection(section.localId, {
                              questions: section.questions.filter((q) => q.localId !== question.localId),
                            })
                          }
                        />
                      )}
                    </div>
                  )
                })}

                {!locked && (
                  <WsBtn
                    size="sm"
                    onClick={() =>
                      patchSection(section.localId, {
                        questions: [
                          ...section.questions,
                          {
                            localId: nextId(),
                            text: '',
                            pointsYes: section.defaultYes,
                            pointsNo: section.defaultNo,
                          },
                        ],
                      })
                    }
                  >
                    + سؤال
                  </WsBtn>
                )}
              </WsBlock>
            ))}

            {!locked && (
              <WsBtn onClick={() => setSections((prev) => [...prev, emptySection()])}>+ قسم جديد</WsBtn>
            )}

            <WsBlock title="النطاق" padded style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--ws-text-2)', marginBottom: 8, lineHeight: 1.7 }}>
                ذِكرُ معلّمٍ بعينه <strong>استثناءٌ يُوسِّع</strong> فيتجاوز شرطَي المادة والصف.
                والمصفوفة الفارغة تعني «الكل» لا «لا أحد».
              </div>

              <div style={{ marginBottom: 8 }}>
                <div className="ws-label">المواد</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(scopeQuery.data?.subjects ?? []).map((subject) => (
                    <WsChip
                      key={subject.id}
                      tone={subjectIds.includes(subject.id) ? 'sky' : undefined}
                      onClick={() =>
                        setSubjectIds((prev) =>
                          prev.includes(subject.id)
                            ? prev.filter((s) => s !== subject.id)
                            : [...prev, subject.id],
                        )
                      }
                    >
                      {subject.name}
                    </WsChip>
                  ))}
                </div>
              </div>

              <div>
                <div className="ws-label">الصفوف</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(scopeQuery.data?.grades ?? []).map((grade) => (
                    <WsChip
                      key={grade}
                      tone={grades.includes(grade) ? 'sky' : undefined}
                      onClick={() =>
                        setGrades((prev) =>
                          prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade],
                        )
                      }
                    >
                      {grade}
                    </WsChip>
                  ))}
                </div>
              </div>
            </WsBlock>
          </WsBlock>
        </WsMain>

        <WsSideCol
          title="المِيزان"
          icon={Scale}
          storageKey="ws:learning-difficulties:balance"
          side="start"
          width={340}
        >
          <WsBlock title="العتبتان" padded>
            <ThresholdRuler
              max={balance.maxScore}
              high={thresholdHigh}
              medium={thresholdMedium}
              onHigh={setThresholdHigh}
              onMedium={setThresholdMedium}
            />
          </WsBlock>

          <WsBlock title="أوزان الأقسام" padded>
            {balance.totalWeight === 0 ? (
              <WsEmpty>لا أوزان بعد</WsEmpty>
            ) : (
              <>
                <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden' }}>
                  {balance.sectionWeights.map((section, index) => (
                    <div
                      key={index}
                      title={`${section.title}: وزنه ${section.weight}`}
                      style={{
                        flex: Math.max(section.weight, 0.001),
                        background: [TONES.sky.bd, TONES.amber.bd, TONES.green.bd, TONES.purple.bd][
                          index % 4
                        ],
                      }}
                    />
                  ))}
                </div>

                {balance.soloReachesHigh && (
                  <WsAlert tone="warn" boxed style={{ marginTop: 8 }}>
                    قسم «{balance.heaviest?.title}» ({balance.heaviest?.max} نقطة) وحده يبلغ العتبة
                    الحمراء ({thresholdHigh}) — نموذجُك عملياً نموذجُ قسمٍ واحد.
                  </WsAlert>
                )}
              </>
            )}
          </WsBlock>

          <WsBlock title="ثلاثة طلاب وهميّين" padded>
            <WsFactsList>
              {balance.dummies.map((dummy) => (
                <WsFactRow key={dummy.label} label={dummy.label}>
                  <span
                    style={{
                      color:
                        dummy.band === 'high'
                          ? TONES.red.tx
                          : dummy.band === 'medium'
                            ? TONES.amber.tx
                            : TONES.green.tx,
                      fontWeight: 700,
                    }}
                  >
                    {dummy.score}
                  </span>
                </WsFactRow>
              ))}
            </WsFactsList>

            {balance.inverted && (
              <WsAlert tone="error" boxed style={{ marginTop: 8 }}>
                نموذجك مقلوب: يكافئ الضعف العام ويعاقب الصعوبة النوعية. الموزّع بلغ الأحمر
                وصاحبُ البُعد الواحد لم يبلغه.
              </WsAlert>
            )}
          </WsBlock>

          <WsBlock title="أرقام" padded>
            <WsFactsList>
              <WsFactRow label="السقف">{balance.maxScore}</WsFactRow>
              <WsFactRow label="الأرضية">{balance.minScore}</WsFactRow>
              <WsFactRow label="الأقسام">{sections.length}</WsFactRow>
              <WsFactRow label="الأسئلة">{balance.questionsCount}</WsFactRow>
              <WsFactRow label="أثقل قسم">{balance.heaviest?.title ?? '—'}</WsFactRow>
              <WsFactRow label="أضيق قسم">{balance.lightest?.title ?? '—'}</WsFactRow>
            </WsFactsList>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}

function ThresholdRuler({
  max,
  high,
  medium,
  onHigh,
  onMedium,
}: {
  max: number
  high: number
  medium: number
  onHigh: (value: number) => void
  onMedium: (value: number) => void
}) {
  const ceiling = Math.max(max, 1)
  const mediumPercent = Math.min(100, (medium / ceiling) * 100)
  const highPercent = Math.min(100, (high / ceiling) * 100)

  return (
    <>
      <div style={{ display: 'flex', height: 12, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${mediumPercent}%`, background: TONES.green.bd }} />
        <div style={{ width: `${Math.max(0, highPercent - mediumPercent)}%`, background: TONES.amber.bd }} />
        <div style={{ flex: 1, background: TONES.red.bd }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <WsField label="برتقالية من">
          <WsInput
            type="number"
            value={medium}
            onChange={(event) => onMedium(Number(event.target.value))}
            style={{ width: 70 }}
          />
        </WsField>
        <WsField label="حمراء من">
          <WsInput
            type="number"
            value={high}
            onChange={(event) => onHigh(Number(event.target.value))}
            style={{ width: 70 }}
          />
        </WsField>
        <WsField label="السقف">
          <WsInput value={max} readOnly style={{ width: 60 }} />
        </WsField>
      </div>
    </>
  )
}
