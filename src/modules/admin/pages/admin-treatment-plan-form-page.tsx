import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, Plus, Save, Target, Trash2, X } from 'lucide-react'
import {
  WsPage,
  WsHeader,
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
  WsFactsList,
  WsFactRow,
} from '@/shared/workspace'
import { useAdminGuidanceStudents, useAdminTreatmentPlanMutations } from '../api/guidance-hooks'
import { TONES, ToneChip } from './student-cases-ui'
import { PROBLEM_META } from './treatment-plans-ui'
import type { TreatmentPlanFormData, ProblemType, InterventionType } from '@/modules/guidance/types'

const PROBLEM_TYPES: ProblemType[] = ['سلوكية', 'دراسية', 'نفسية', 'اجتماعية', 'صحية', 'مختلطة']
const INTERVENTION_TYPES: InterventionType[] = ['تعليمية', 'سلوكية', 'نفسية', 'أسرية', 'جماعية', 'فردية', 'إرشادية']

/** رقم القسم في النموذج */
function SectionHead({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          background: 'var(--ws-accent-soft)',
          color: 'var(--ws-accent)',
          flexShrink: 0,
        }}
      >
        {step}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800 }}>{title}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>{hint}</p>}
      </div>
    </div>
  )
}

export function AdminTreatmentPlanFormPage() {
  const navigate = useNavigate()
  const { data: students } = useAdminGuidanceStudents()
  const { createPlan } = useAdminTreatmentPlanMutations()

  const [formData, setFormData] = useState<TreatmentPlanFormData>({
    student_id: 0,
    problem_type: 'سلوكية',
    problem_description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    goals: [],
  })

  const [newGoal, setNewGoal] = useState({
    goal: '',
    measurable_criteria: '',
    interventions: [] as { intervention_type: InterventionType; description: string }[],
  })

  const [newIntervention, setNewIntervention] = useState({
    intervention_type: 'تعليمية' as InterventionType,
    description: '',
  })

  const addGoal = () => {
    if (!newGoal.goal.trim() || !newGoal.measurable_criteria.trim()) {
      alert('يرجى إدخال الهدف والمعايير القابلة للقياس')
      return
    }

    setFormData({
      ...formData,
      goals: [...(formData.goals || []), { ...newGoal }],
    })

    setNewGoal({
      goal: '',
      measurable_criteria: '',
      interventions: [],
    })
  }

  const removeGoal = (index: number) => {
    setFormData({
      ...formData,
      goals: formData.goals?.filter((_, i) => i !== index),
    })
  }

  const addInterventionToGoal = () => {
    if (!newIntervention.description.trim()) {
      alert('يرجى إدخال وصف التدخل')
      return
    }

    setNewGoal({
      ...newGoal,
      interventions: [...newGoal.interventions, { ...newIntervention }],
    })

    setNewIntervention({
      intervention_type: 'تعليمية',
      description: '',
    })
  }

  const removeInterventionFromGoal = (index: number) => {
    setNewGoal({
      ...newGoal,
      interventions: newGoal.interventions.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.student_id) {
      alert('يرجى اختيار الطالب')
      return
    }

    if (!formData.problem_description.trim()) {
      alert('يرجى إدخال وصف المشكلة')
      return
    }

    try {
      await createPlan.mutateAsync(formData)
      navigate('/admin/treatment-plans')
    } catch (error) {
      console.error('Failed to create treatment plan:', error)
      alert('فشل إنشاء الخطة العلاجية')
    }
  }

  const selectedStudent = students?.find((s) => s.id === formData.student_id)
  const problemMeta = PROBLEM_META[formData.problem_type] ?? PROBLEM_META.مختلطة
  const goalsCount = formData.goals?.length || 0
  const interventionsCount = formData.goals?.reduce((sum, g) => sum + (g.interventions?.length || 0), 0) || 0
  const planDurationDays = formData.end_date
    ? Math.max(0, Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <WsPage>
      <WsHeader
        title="إضافة خطة علاجية جديدة"
        badge="الإرشاد الطلابي"
        actions={<WsIconBtn icon={ArrowRight} label="العودة للقائمة" onClick={() => navigate('/admin/treatment-plans')} />}
      />

      <WsLayout>
        <WsMain>
          <form onSubmit={handleSubmit} className="ws-block ws-block--fill" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ws-block__scroll">
              <div style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. المعلومات الأساسية */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHead step={1} title="المعلومات الأساسية" hint="حدد الطالب ونوع المشكلة ومدتها الزمنية." />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    <WsField label="الطالب *">
                      <WsSelect
                        value={formData.student_id}
                        onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                        required
                      >
                        <option value={0}>اختر الطالب</option>
                        {students?.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} - {student.grade} {student.class_name}
                          </option>
                        ))}
                      </WsSelect>
                    </WsField>

                    <div>
                      <p className="ws-label" style={{ marginBottom: 6 }}>نوع المشكلة *</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PROBLEM_TYPES.map((type) => {
                          const meta = PROBLEM_META[type]
                          const TypeIcon = meta.icon
                          const isSelected = formData.problem_type === type
                          return (
                            <button
                              key={type}
                              type="button"
                              className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                              style={isSelected
                                ? { background: meta.tone.bg, borderColor: meta.tone.tx, color: meta.tone.tx, boxShadow: `0 0 0 1px ${meta.tone.tx}` }
                                : undefined}
                              onClick={() => setFormData({ ...formData, problem_type: type })}
                            >
                              <TypeIcon />
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <WsField label="وصف المشكلة *">
                    <WsTextarea
                      value={formData.problem_description}
                      onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                      rows={4}
                      placeholder="وصف تفصيلي للمشكلة التي يعاني منها الطالب..."
                      required
                    />
                  </WsField>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    <WsField label="تاريخ البدء *">
                      <WsInput
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </WsField>
                    <WsField label="تاريخ الانتهاء المتوقع">
                      <WsInput
                        type="date"
                        value={formData.end_date || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                      />
                    </WsField>
                  </div>
                </div>

                {/* 2. الأهداف العلاجية */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHead step={2} title="الأهداف العلاجية" hint="أضف أهدافاً قابلة للقياس، ولكل هدف تدخلاته." />

                  {formData.goals && formData.goals.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {formData.goals.map((goal, index) => (
                        <div key={index} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12, background: 'var(--ws-surface-2)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 12.5 }}>
                              <span
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: TONES.green.bg,
                                  color: TONES.green.tx,
                                  border: `1px solid ${TONES.green.bd}`,
                                }}
                              >
                                {index + 1}
                              </span>
                              {goal.goal}
                            </span>
                            <WsIconBtn icon={Trash2} label="حذف الهدف" onClick={() => removeGoal(index)} style={{ color: TONES.red.tx }} />
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                            <b>المعايير: </b>{goal.measurable_criteria}
                          </p>
                          {goal.interventions && goal.interventions.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {goal.interventions.map((intervention, i) => (
                                <span key={i} className="ws-chip" style={{ background: TONES.sky.bg, borderColor: TONES.sky.bd, color: TONES.sky.tx }}>
                                  {intervention.intervention_type} • {intervention.description}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* بنّاء الهدف الجديد */}
                  <div style={{ border: '2px dashed var(--ws-border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Target style={{ width: 13, height: 13, color: 'var(--ws-accent)' }} />
                      إضافة هدف جديد
                    </p>

                    <WsField label="الهدف">
                      <WsInput
                        type="text"
                        value={newGoal.goal}
                        onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
                        placeholder="مثال: تحسين مستوى التحصيل في مادة الرياضيات"
                      />
                    </WsField>

                    <WsField label="المعايير القابلة للقياس">
                      <WsInput
                        type="text"
                        value={newGoal.measurable_criteria}
                        onChange={(e) => setNewGoal({ ...newGoal, measurable_criteria: e.target.value })}
                        placeholder="مثال: الحصول على 80% في الاختبار القادم"
                      />
                    </WsField>

                    <div style={{ background: 'var(--ws-surface-2)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p className="ws-label" style={{ margin: 0 }}>التدخلات</p>

                      {newGoal.interventions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {newGoal.interventions.map((intervention, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 11.5 }}>
                              <span className="ws-chip" style={{ background: TONES.sky.bg, borderColor: TONES.sky.bd, color: TONES.sky.tx }}>
                                {intervention.intervention_type} • {intervention.description}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeInterventionFromGoal(i)}
                                title="حذف التدخل"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: TONES.red.tx, padding: 2, display: 'inline-flex' }}
                              >
                                <X style={{ width: 12, height: 12 }} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <WsSelect
                          value={newIntervention.intervention_type}
                          onChange={(e) =>
                            setNewIntervention({ ...newIntervention, intervention_type: e.target.value as InterventionType })
                          }
                          style={{ width: 110 }}
                        >
                          {INTERVENTION_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </WsSelect>
                        <WsInput
                          type="text"
                          value={newIntervention.description}
                          onChange={(e) => setNewIntervention({ ...newIntervention, description: e.target.value })}
                          placeholder="وصف التدخل..."
                          style={{ flex: 1, minWidth: 160 }}
                        />
                        <WsBtn size="sm" icon={Plus} onClick={addInterventionToGoal}>إضافة تدخل</WsBtn>
                      </div>
                    </div>

                    <WsBtn variant="primary" icon={Target} onClick={addGoal}>إضافة الهدف</WsBtn>
                  </div>
                </div>
              </div>
            </div>

            <footer
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                padding: '10px 16px',
                borderTop: '1px solid var(--ws-hairline)',
                flexShrink: 0,
              }}
            >
              <WsBtn onClick={() => navigate('/admin/treatment-plans')}>إلغاء</WsBtn>
              <WsBtn type="submit" variant="primary" icon={Save} disabled={createPlan.isPending}>
                {createPlan.isPending ? 'جاري الحفظ...' : 'حفظ الخطة العلاجية'}
              </WsBtn>
            </footer>
          </form>
        </WsMain>

        {/* ملخص حي للخطة أثناء بنائها */}
        <WsSideCol side="end" title="ملخص الخطة" icon={ClipboardList} storageKey="ws:treatment-plan-form:sidecol" width={300}>
          <WsBlock padded fill>
            <WsFactsList>
              <WsFactRow label="الطالب">
                {selectedStudent ? `${selectedStudent.name}` : <span style={{ color: 'var(--ws-text-2)' }}>لم يُحدد بعد</span>}
              </WsFactRow>
              <WsFactRow label="نوع المشكلة">
                <ToneChip tone={problemMeta.tone}>{formData.problem_type}</ToneChip>
              </WsFactRow>
              <WsFactRow label="البداية">{new Date(formData.start_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              {formData.end_date && (
                <WsFactRow label="النهاية">{new Date(formData.end_date).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              )}
              {planDurationDays !== null && (
                <WsFactRow label="مدة الخطة">{planDurationDays} يوم</WsFactRow>
              )}
              <WsFactRow label="الأهداف">
                <span style={{ color: goalsCount > 0 ? TONES.green.tx : 'var(--ws-text-2)', fontWeight: 700 }}>{goalsCount}</span>
              </WsFactRow>
              <WsFactRow label="التدخلات">
                <span style={{ color: interventionsCount > 0 ? TONES.sky.tx : 'var(--ws-text-2)', fontWeight: 700 }}>{interventionsCount}</span>
              </WsFactRow>
            </WsFactsList>

            {formData.goals && formData.goals.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--ws-hairline)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p className="ws-label" style={{ margin: 0 }}>الأهداف المضافة</p>
                {formData.goals.map((goal, index) => (
                  <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: TONES.green.tx }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={goal.goal}>
                      {index + 1}. {goal.goal}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--ws-text-2)', flexShrink: 0 }}>
                      {goal.interventions?.length || 0} تدخلات
                    </span>
                  </span>
                ))}
              </div>
            )}

            <p style={{ margin: '12px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
              يتحدث الملخص تلقائياً أثناء بناء الخطة — أضف الأهداف وتدخلاتها ثم احفظ.
            </p>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
