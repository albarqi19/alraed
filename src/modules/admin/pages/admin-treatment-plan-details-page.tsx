import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  FileText,
  Gauge,
  Lightbulb,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsInput,
  WsSelect,
  WsTextarea,
  WsField,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
} from '@/shared/workspace'
import { useAdminTreatmentPlan, useAdminTreatmentPlanMutations } from '../api/guidance-hooks'
import { TONES, ToneChip, InitialAvatar } from './student-cases-ui'
import { PLAN_STATUS_META, GOAL_STATUS_META, PROBLEM_META, EFFECTIVENESS_META, ProgressRing, DaysRemainingChip } from './treatment-plans-ui'
import type {
  TreatmentFollowupFormData,
  TreatmentEvaluationFormData,
  GoalStatus,
  ProblemType,
  TreatmentPlanStatus,
} from '@/modules/guidance/types'

export function AdminTreatmentPlanDetailsPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const id = planId ? parseInt(planId) : null
  const { data: plan, isLoading, error } = useAdminTreatmentPlan(id)
  const { addFollowup, addEvaluation, deletePlan, updatePlan } = useAdminTreatmentPlanMutations()

  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'followups' | 'evaluations'>('overview')
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)

  const [followupData, setFollowupData] = useState<TreatmentFollowupFormData>({
    notes: '',
    followup_date: new Date().toISOString().split('T')[0],
    type: 'ملاحظة',
    student_progress: '',
    observations: '',
    recommendations: '',
  })

  const [evaluationData, setEvaluationData] = useState<TreatmentEvaluationFormData>({
    evaluation_type: 'دوري',
    evaluation_date: new Date().toISOString().split('T')[0],
    overall_effectiveness: '',
    overall_progress_percentage: 0,
    key_findings: '',
    student_strengths: '',
    areas_for_improvement: '',
    recommendations: '',
    decision: '',
  })

  const handleAddFollowup = async () => {
    if (!id || !followupData.notes.trim()) {
      alert('يرجى إدخال ملاحظات المتابعة')
      return
    }

    try {
      await addFollowup.mutateAsync({ planId: id, data: followupData })
      setFollowupData({
        notes: '',
        followup_date: new Date().toISOString().split('T')[0],
        type: 'ملاحظة',
        student_progress: '',
        observations: '',
        recommendations: '',
      })
      setShowFollowupForm(false)
    } catch (error) {
      console.error('Failed to add followup:', error)
      alert('فشل إضافة المتابعة')
    }
  }

  const handleAddEvaluation = async () => {
    if (!id) {
      alert('خطأ في تحديد الخطة')
      return
    }

    try {
      await addEvaluation.mutateAsync({ planId: id, data: evaluationData })
      setEvaluationData({
        evaluation_type: 'دوري',
        evaluation_date: new Date().toISOString().split('T')[0],
        overall_effectiveness: '',
        overall_progress_percentage: 0,
        key_findings: '',
        student_strengths: '',
        areas_for_improvement: '',
        recommendations: '',
        decision: '',
      })
      setShowEvaluationForm(false)
    } catch (error) {
      console.error('Failed to add evaluation:', error)
      alert('فشل إضافة التقييم')
    }
  }

  const handleDeletePlan = async () => {
    if (!id || !confirm('هل أنت متأكد من حذف هذه الخطة العلاجية؟')) return

    try {
      await deletePlan.mutateAsync(id)
      navigate('/admin/treatment-plans')
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('فشل حذف الخطة')
    }
  }

  const handleUpdateStatus = async (newStatus: TreatmentPlanStatus) => {
    if (!id || !plan) return
    try {
      await updatePlan.mutateAsync({ planId: id, data: { status: newStatus } as any })
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  if (isLoading) {
    return (
      <WsPage>
        <WsHeader title="تفاصيل الخطة العلاجية" />
        <WsBlock fill>
          <WsEmpty loading>جاري التحميل...</WsEmpty>
        </WsBlock>
      </WsPage>
    )
  }

  if (error || !plan) {
    return (
      <WsPage>
        <WsHeader
          title="تفاصيل الخطة العلاجية"
          actions={<WsBtn icon={ArrowRight} onClick={() => navigate('/admin/treatment-plans')}>العودة للقائمة</WsBtn>}
        />
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>خطأ في تحميل الخطة</WsAlert>
        </WsBlock>
      </WsPage>
    )
  }

  const goalsCount = plan.goals?.length || 0
  const achievedGoals = plan.goals?.filter(g => g.status === 'achieved').length || 0
  const followupsCount = plan.followups?.length || 0
  const evaluationsCount = plan.evaluations?.length || 0
  const progress = goalsCount > 0 ? Math.round((achievedGoals / goalsCount) * 100) : 0

  const statusMeta = PLAN_STATUS_META[plan.status as TreatmentPlanStatus] ?? PLAN_STATUS_META.draft
  const problemMeta = PROBLEM_META[plan.problem_type as ProblemType] ?? PROBLEM_META.مختلطة

  const tabs: Array<{ key: typeof activeTab; label: string; icon: LucideIcon; count: number | null }> = [
    { key: 'overview', label: 'نظرة عامة', icon: FileText, count: null },
    { key: 'goals', label: 'الأهداف', icon: Target, count: goalsCount },
    { key: 'followups', label: 'المتابعات', icon: CalendarClock, count: followupsCount },
    { key: 'evaluations', label: 'التقييمات', icon: BarChart3, count: evaluationsCount },
  ]

  return (
    <WsPage>
      <WsHeader
        title={plan.student?.name || `طالب #${plan.student_id}`}
        badge={(plan as any).plan_number || `TP-${plan.id}`}
        actions={
          <>
            <WsIconBtn icon={ArrowRight} label="العودة للقائمة" onClick={() => navigate('/admin/treatment-plans')} />
            <WsField label="حالة الخطة">
              <WsSelect value={plan.status} onChange={(e) => handleUpdateStatus(e.target.value as TreatmentPlanStatus)}>
                {(Object.keys(PLAN_STATUS_META) as TreatmentPlanStatus[]).map((value) => (
                  <option key={value} value={value}>{PLAN_STATUS_META[value].label}</option>
                ))}
              </WsSelect>
            </WsField>
            <WsBtn icon={Trash2} onClick={handleDeletePlan} style={{ color: TONES.red.tx }}>حذف</WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={problemMeta.icon} label="نوع المشكلة">
              <span style={{ color: problemMeta.tone.tx }}>{plan.problem_type}</span>
            </WsFact>
            <WsFact icon={Target} label="الأهداف المحققة">
              <span style={{ color: TONES.green.tx }}>{achievedGoals}/{goalsCount}</span>
            </WsFact>
            <WsFact icon={CalendarClock} label="متابعات">{followupsCount}</WsFact>
            <WsFact icon={BarChart3} label="تقييمات">{evaluationsCount}</WsFact>
            <WsFact icon={CalendarDays} label="البداية">{new Date(plan.start_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFact>
            {plan.end_date && (
              <WsFact icon={CalendarDays} label="النهاية">{new Date(plan.end_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFact>
            )}
          </>
        }
      >
        <ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip>
      </WsHeader>

      <WsLayout>
        <WsSideCol side="start" title="لوحة التقدم" icon={Gauge} storageKey="ws:treatment-plan:sidecol">
          <WsBlock padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProgressRing value={progress} size={64} stroke={6} title={`تقدم الأهداف: ${progress}%`} />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>تقدم الأهداف</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                  تحقق {achievedGoals} من أصل {goalsCount} أهداف
                </p>
                <div style={{ marginTop: 6 }}>
                  <DaysRemainingChip endDate={plan.end_date} />
                </div>
              </div>
            </div>
            {plan.goals && plan.goals.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--ws-hairline)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.goals.map((goal, index) => {
                  const goalMeta = GOAL_STATUS_META[goal.status as GoalStatus] ?? GOAL_STATUS_META.not_started
                  return (
                    <span key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: goalMeta.tone.tx }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={(goal as any).title || goal.goal}>
                        {index + 1}. {(goal as any).title || goal.goal}
                      </span>
                      <span style={{ fontSize: 10, color: goalMeta.tone.tx, fontWeight: 700, flexShrink: 0 }}>{goalMeta.label}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </WsBlock>

          <WsBlock title="بيانات الخطة" icon={FileText} padded>
            <WsFactsList>
              <WsFactRow label="الطالب">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <InitialAvatar name={plan.student?.name || 'ط'} tone={problemMeta.tone} size={20} />
                  {plan.student?.name || `طالب #${plan.student_id}`}
                </span>
              </WsFactRow>
              <WsFactRow label="نوع المشكلة"><ToneChip tone={problemMeta.tone}>{plan.problem_type}</ToneChip></WsFactRow>
              <WsFactRow label="الحالة"><ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip></WsFactRow>
              <WsFactRow label="تاريخ البدء">{new Date(plan.start_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              {plan.end_date && (
                <WsFactRow label="النهاية المتوقعة">{new Date(plan.end_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              )}
            </WsFactsList>
          </WsBlock>

          <WsBlock title="لماذا المتابعات والتقييمات؟" icon={Lightbulb} padded fill>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, lineHeight: 1.8 }}>
              <div style={{ background: TONES.sky.bg, border: `1px solid ${TONES.sky.bd}`, borderRadius: 8, padding: '8px 10px', color: TONES.sky.tx }}>
                <b>المتابعات:</b> توثيق التقدم الدوري، رصد التغيرات السلوكية والأكاديمية، تحديد العوائق مبكراً، وتعديل الخطة حسب الحاجة.
              </div>
              <div style={{ background: TONES.purple.bg, border: `1px solid ${TONES.purple.bd}`, borderRadius: 8, padding: '8px 10px', color: TONES.purple.tx }}>
                <b>التقييمات:</b> قياس فعالية الخطة، تحديد نسبة تحقق الأهداف، توثيق نقاط القوة ومجالات التحسين، واتخاذ قرارات مبنية على بيانات.
              </div>
            </div>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <div className="ws-block ws-block--fill">
            <div className="ws-block__head">
              <div className="ws-seg">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <TabIcon style={{ width: 13, height: 13 }} />
                      {tab.label}
                      {tab.count != null && <span className="ws-count">{tab.count}</span>}
                    </button>
                  )
                })}
              </div>
              <span className="ws-block__tools">
                {activeTab === 'followups' && (
                  <WsBtn
                    size="sm"
                    variant={showFollowupForm ? undefined : 'primary'}
                    icon={showFollowupForm ? X : Plus}
                    onClick={() => setShowFollowupForm(!showFollowupForm)}
                  >
                    {showFollowupForm ? 'إلغاء' : 'إضافة متابعة'}
                  </WsBtn>
                )}
                {activeTab === 'evaluations' && (
                  <WsBtn
                    size="sm"
                    variant={showEvaluationForm ? undefined : 'primary'}
                    icon={showEvaluationForm ? X : Plus}
                    onClick={() => setShowEvaluationForm(!showEvaluationForm)}
                  >
                    {showEvaluationForm ? 'إلغاء' : 'إضافة تقييم'}
                  </WsBtn>
                )}
              </span>
            </div>

            <div className="ws-block__scroll">
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeTab === 'overview' && (
                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>وصف المشكلة</p>
                    <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: 14 }}>
                      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{plan.problem_description}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'goals' && (
                  !plan.goals || plan.goals.length === 0 ? (
                    <WsEmpty icon={Target}>لا توجد أهداف مسجلة</WsEmpty>
                  ) : (
                    plan.goals.map((goal, index) => {
                      const goalMeta = GOAL_STATUS_META[goal.status as GoalStatus] ?? GOAL_STATUS_META.not_started
                      return (
                        <div key={goal.id} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: goalMeta.tone.bg,
                                  color: goalMeta.tone.tx,
                                  border: `1px solid ${goalMeta.tone.bd}`,
                                }}
                              >
                                {index + 1}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: 12.5 }}>{(goal as any).title || goal.goal}</span>
                            </div>
                            <ToneChip tone={goalMeta.tone}>{goalMeta.label}</ToneChip>
                          </div>
                          <div style={{ background: 'var(--ws-surface-2)', borderRadius: 8, padding: '8px 10px', margin: '8px 0 0', fontSize: 11.5 }}>
                            <b>معايير النجاح: </b>
                            {(goal as any).success_criteria || goal.measurable_criteria}
                          </div>
                          {goal.interventions && goal.interventions.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <p className="ws-label" style={{ marginBottom: 6 }}>التدخلات ({goal.interventions.length})</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {goal.interventions.map((intervention) => (
                                  <div
                                    key={intervention.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 6,
                                      fontSize: 11.5,
                                      background: TONES.sky.bg,
                                      border: `1px solid ${TONES.sky.bd}`,
                                      borderRadius: 8,
                                      padding: '7px 10px',
                                    }}
                                  >
                                    <span className="ws-chip" style={{ background: 'var(--ws-surface)', color: TONES.sky.tx, borderColor: TONES.sky.bd, flexShrink: 0 }}>
                                      {(intervention as any).category || intervention.intervention_type}
                                    </span>
                                    <span style={{ color: TONES.sky.tx }}>{(intervention as any).title || intervention.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )
                )}

                {activeTab === 'followups' && (
                  <>
                    {showFollowupForm && (
                      <div
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>إضافة متابعة جديدة</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          <WsField label="تاريخ المتابعة *">
                            <WsInput type="date" value={followupData.followup_date} onChange={(e) => setFollowupData({ ...followupData, followup_date: e.target.value })} />
                          </WsField>
                          <WsField label="نوع المتابعة">
                            <WsSelect value={followupData.type} onChange={(e) => setFollowupData({ ...followupData, type: e.target.value })}>
                              <option value="ملاحظة">ملاحظة</option>
                              <option value="جلسة">جلسة</option>
                              <option value="اتصال">اتصال</option>
                              <option value="زيارة">زيارة</option>
                              <option value="تقرير">تقرير</option>
                            </WsSelect>
                          </WsField>
                          <WsField label="تقدم الطالب">
                            <WsSelect value={followupData.student_progress ?? ''} onChange={(e) => setFollowupData({ ...followupData, student_progress: e.target.value || undefined })}>
                              <option value="">-- اختر --</option>
                              <option value="ممتاز">ممتاز</option>
                              <option value="جيد">جيد</option>
                              <option value="متوسط">متوسط</option>
                              <option value="ضعيف">ضعيف</option>
                              <option value="لا يوجد تقدم">لا يوجد تقدم</option>
                            </WsSelect>
                          </WsField>
                        </div>
                        <WsField label="ملاحظات المتابعة *">
                          <WsTextarea value={followupData.notes} onChange={(e) => setFollowupData({ ...followupData, notes: e.target.value })} rows={3} placeholder="اكتب ملاحظات المتابعة..." />
                        </WsField>
                        <WsField label="التوصيات">
                          <WsTextarea value={followupData.recommendations} onChange={(e) => setFollowupData({ ...followupData, recommendations: e.target.value })} rows={2} placeholder="التوصيات..." />
                        </WsField>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <WsBtn onClick={() => setShowFollowupForm(false)}>إلغاء</WsBtn>
                          <WsBtn variant="primary" icon={Plus} onClick={handleAddFollowup} disabled={addFollowup.isPending}>
                            {addFollowup.isPending ? 'جاري الحفظ...' : 'حفظ المتابعة'}
                          </WsBtn>
                        </div>
                      </div>
                    )}

                    {!plan.followups || plan.followups.length === 0 ? (
                      <WsEmpty icon={CalendarClock}>لا توجد متابعات مسجلة</WsEmpty>
                    ) : (
                      plan.followups.map((followup) => (
                        <div key={followup.id} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: TONES.green.bg,
                                color: TONES.green.tx,
                                border: `1px solid ${TONES.green.bd}`,
                              }}
                            >
                              <CalendarClock style={{ width: 14, height: 14 }} />
                            </span>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5 }}>
                                {new Date(followup.followup_date).toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              {followup.type && <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>نوع: {followup.type}</span>}
                            </div>
                          </div>
                          <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.8 }}>{followup.notes}</p>
                          {followup.student_progress && (
                            <div style={{ background: TONES.sky.bg, border: `1px solid ${TONES.sky.bd}`, borderRadius: 8, padding: '7px 10px', marginBottom: 6, fontSize: 11.5, color: TONES.sky.tx }}>
                              <b>تقدم الطالب: </b>{followup.student_progress}
                            </div>
                          )}
                          {followup.recommendations && (
                            <div style={{ background: TONES.amber.bg, border: `1px solid ${TONES.amber.bd}`, borderRadius: 8, padding: '7px 10px', fontSize: 11.5, color: TONES.amber.tx }}>
                              <b>التوصيات: </b>{followup.recommendations}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'evaluations' && (
                  <>
                    {showEvaluationForm && (
                      <div
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>إضافة تقييم جديد</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                          <WsField label="تاريخ التقييم *">
                            <WsInput type="date" value={evaluationData.evaluation_date} onChange={(e) => setEvaluationData({ ...evaluationData, evaluation_date: e.target.value })} />
                          </WsField>
                          <WsField label="نوع التقييم">
                            <WsSelect value={evaluationData.evaluation_type} onChange={(e) => setEvaluationData({ ...evaluationData, evaluation_type: e.target.value })}>
                              <option value="دوري">دوري</option>
                              <option value="ختامي">ختامي</option>
                              <option value="مرحلي">مرحلي</option>
                            </WsSelect>
                          </WsField>
                          <WsField label="نسبة التقدم %">
                            <WsInput type="number" min="0" max="100" value={evaluationData.overall_progress_percentage} onChange={(e) => setEvaluationData({ ...evaluationData, overall_progress_percentage: Number(e.target.value) })} />
                          </WsField>
                          <WsField label="فعالية الخطة">
                            <WsSelect value={evaluationData.overall_effectiveness} onChange={(e) => setEvaluationData({ ...evaluationData, overall_effectiveness: e.target.value })}>
                              <option value="">اختر...</option>
                              {EFFECTIVENESS_META.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </WsSelect>
                          </WsField>
                        </div>
                        <WsField label="أهم النتائج">
                          <WsTextarea value={evaluationData.key_findings} onChange={(e) => setEvaluationData({ ...evaluationData, key_findings: e.target.value })} rows={2} placeholder="اكتب أهم النتائج..." />
                        </WsField>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                          <WsField label="نقاط القوة">
                            <WsTextarea value={evaluationData.student_strengths} onChange={(e) => setEvaluationData({ ...evaluationData, student_strengths: e.target.value })} rows={2} placeholder="نقاط القوة..." />
                          </WsField>
                          <WsField label="مجالات التحسين">
                            <WsTextarea value={evaluationData.areas_for_improvement} onChange={(e) => setEvaluationData({ ...evaluationData, areas_for_improvement: e.target.value })} rows={2} placeholder="مجالات التحسين..." />
                          </WsField>
                        </div>
                        <WsField label="التوصيات">
                          <WsTextarea value={evaluationData.recommendations} onChange={(e) => setEvaluationData({ ...evaluationData, recommendations: e.target.value })} rows={2} placeholder="التوصيات..." />
                        </WsField>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <WsBtn onClick={() => setShowEvaluationForm(false)}>إلغاء</WsBtn>
                          <WsBtn variant="primary" icon={Plus} onClick={handleAddEvaluation} disabled={addEvaluation.isPending}>
                            {addEvaluation.isPending ? 'جاري الحفظ...' : 'حفظ التقييم'}
                          </WsBtn>
                        </div>
                      </div>
                    )}

                    {!plan.evaluations || plan.evaluations.length === 0 ? (
                      <WsEmpty icon={BarChart3}>لا توجد تقييمات مسجلة</WsEmpty>
                    ) : (
                      plan.evaluations.map((evaluation) => {
                        const effectiveness = EFFECTIVENESS_META.find(o => o.value === evaluation.overall_effectiveness)
                        return (
                          <div key={evaluation.id} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: TONES.purple.bg,
                                    color: TONES.purple.tx,
                                    border: `1px solid ${TONES.purple.bd}`,
                                  }}
                                >
                                  <BarChart3 style={{ width: 14, height: 14 }} />
                                </span>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5 }}>
                                    {new Date(evaluation.evaluation_date).toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </p>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                    {evaluation.evaluation_type && <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>نوع: {evaluation.evaluation_type}</span>}
                                    {effectiveness && <ToneChip tone={effectiveness.tone}>{effectiveness.label}</ToneChip>}
                                    {!effectiveness && evaluation.overall_effectiveness && (
                                      <ToneChip tone={TONES.gray}>{evaluation.overall_effectiveness}</ToneChip>
                                    )}
                                  </span>
                                </div>
                              </div>
                              {evaluation.overall_progress_percentage !== undefined && (
                                <ProgressRing value={evaluation.overall_progress_percentage} size={44} title="نسبة التقدم" />
                              )}
                            </div>
                            {evaluation.key_findings && (
                              <div style={{ background: 'var(--ws-surface-2)', borderRadius: 8, padding: '7px 10px', marginBottom: 6, fontSize: 11.5 }}>
                                <b>أهم النتائج: </b>{evaluation.key_findings}
                              </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                              {evaluation.student_strengths && (
                                <div style={{ background: TONES.green.bg, border: `1px solid ${TONES.green.bd}`, borderRadius: 8, padding: '7px 10px', fontSize: 11.5, color: TONES.green.tx }}>
                                  <b>نقاط القوة: </b>{evaluation.student_strengths}
                                </div>
                              )}
                              {evaluation.areas_for_improvement && (
                                <div style={{ background: TONES.amber.bg, border: `1px solid ${TONES.amber.bd}`, borderRadius: 8, padding: '7px 10px', fontSize: 11.5, color: TONES.amber.tx }}>
                                  <b>مجالات التحسين: </b>{evaluation.areas_for_improvement}
                                </div>
                              )}
                            </div>
                            {evaluation.recommendations && (
                              <div style={{ background: TONES.sky.bg, border: `1px solid ${TONES.sky.bd}`, borderRadius: 8, padding: '7px 10px', marginTop: 6, fontSize: 11.5, color: TONES.sky.tx }}>
                                <b>التوصيات: </b>{evaluation.recommendations}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}
