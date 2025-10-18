import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTreatmentPlan, useTreatmentPlanMutations } from '../hooks'
import type {
  TreatmentFollowupFormData,
  TreatmentEvaluationFormData,
  GoalStatus,
  TreatmentPlanStatus,
} from '../types'

const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  active: 'نشطة',
  completed: 'مكتملة',
  on_hold: 'معلقة',
  cancelled: 'ملغاة',
}

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: 'لم تبدأ',
  in_progress: 'قيد التنفيذ',
  achieved: 'تحققت',
  partially_achieved: 'تحققت جزئياً',
  not_achieved: 'لم تتحقق',
}

const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  achieved: 'bg-green-100 text-green-800',
  partially_achieved: 'bg-yellow-100 text-yellow-800',
  not_achieved: 'bg-red-100 text-red-800',
}

export function TreatmentPlanDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const planId = id ? parseInt(id) : null
  const { data: plan, isLoading, error } = useTreatmentPlan(planId)
  const { addFollowup, addEvaluation, deletePlan, updatePlan, updateGoal } = useTreatmentPlanMutations()

  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)

  const [followupData, setFollowupData] = useState<TreatmentFollowupFormData>({
    notes: '',
    followup_date: new Date().toISOString().split('T')[0],
  })

  const [evaluationData, setEvaluationData] = useState<TreatmentEvaluationFormData>({
    evaluation: '',
    evaluation_date: new Date().toISOString().split('T')[0],
  })

  const handleAddFollowup = async () => {
    if (!planId || !followupData.notes.trim()) {
      alert('يرجى إدخال ملاحظات المتابعة')
      return
    }

    try {
      await addFollowup.mutateAsync({ planId, data: followupData })
      setFollowupData({ notes: '', followup_date: new Date().toISOString().split('T')[0] })
      setShowFollowupForm(false)
    } catch (error) {
      console.error('Failed to add followup:', error)
      alert('فشل إضافة المتابعة')
    }
  }

  const handleAddEvaluation = async () => {
    if (!planId || !evaluationData.evaluation.trim()) {
      alert('يرجى إدخال نص التقييم')
      return
    }

    try {
      await addEvaluation.mutateAsync({ planId, data: evaluationData })
      setEvaluationData({ evaluation: '', evaluation_date: new Date().toISOString().split('T')[0] })
      setShowEvaluationForm(false)
    } catch (error) {
      console.error('Failed to add evaluation:', error)
      alert('فشل إضافة التقييم')
    }
  }

  const handleUpdateGoalStatus = async (goalId: number, status: GoalStatus) => {
    if (!planId) return

    try {
      // TODO: This needs proper API implementation to update goal status
      // For now, we're passing required fields but not updating status
      await updateGoal.mutateAsync({ 
        planId, 
        goalId, 
        data: { 
          goal: plan?.goals?.find(g => g.id === goalId)?.goal || '', 
          measurable_criteria: plan?.goals?.find(g => g.id === goalId)?.measurable_criteria || ''
        } 
      })
      console.log('Goal status would be updated to:', status)
    } catch (error) {
      console.error('Failed to update goal status:', error)
      alert('فشل تحديث حالة الهدف')
    }
  }

  const handleUpdatePlanStatus = async (status: TreatmentPlanStatus) => {
    if (!planId || !plan) return

    try {
      // TODO: This needs proper API implementation to update plan status
      // For now, we're passing required fields but not updating status
      await updatePlan.mutateAsync({ 
        planId, 
        data: { 
          student_id: plan.student_id, 
          problem_type: plan.problem_type, 
          problem_description: plan.problem_description, 
          start_date: plan.start_date, 
          end_date: plan.end_date 
        } 
      })
      console.log('Plan status would be updated to:', status)
    } catch (error) {
      console.error('Failed to update plan status:', error)
      alert('فشل تحديث حالة الخطة')
    }
  }

  const handleDeletePlan = async () => {
    if (!planId || !confirm('هل أنت متأكد من حذف هذه الخطة العلاجية؟')) return

    try {
      await deletePlan.mutateAsync(planId)
      navigate('/guidance/treatment-plans')
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('فشل حذف الخطة')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          حدث خطأ أثناء تحميل الخطة العلاجية
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/guidance/treatment-plans" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
          ← العودة للقائمة
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              خطة علاجية: {plan.student?.name || `طالب #${plan.student_id}`}
            </h1>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {plan.problem_type}
              </span>
              <select
                value={plan.status}
                onChange={(e) => handleUpdatePlanStatus(e.target.value as TreatmentPlanStatus)}
                className="px-3 py-1 rounded-full text-sm font-medium border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-gray-600">{plan.problem_description}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span>تاريخ البدء: {new Date(plan.start_date).toLocaleDateString('ar-SA')}</span>
              {plan.end_date && <span>تاريخ الانتهاء: {new Date(plan.end_date).toLocaleDateString('ar-SA')}</span>}
            </div>
          </div>
          <button
            onClick={handleDeletePlan}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            حذف الخطة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">الأهداف العلاجية</h2>
            {!plan.goals || plan.goals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد أهداف مسجلة</p>
            ) : (
              <div className="space-y-4">
                {plan.goals.map((goal) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{goal.goal}</h3>
                      <select
                        value={goal.status}
                        onChange={(e) => handleUpdateGoalStatus(goal.id, e.target.value as GoalStatus)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${GOAL_STATUS_COLORS[goal.status]}`}
                      >
                        {Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      <strong>المعايير القابلة للقياس:</strong> {goal.measurable_criteria}
                    </p>
                    {goal.interventions && goal.interventions.length > 0 && (
                      <div>
                        <strong className="text-sm text-gray-700">التدخلات:</strong>
                        <ul className="mt-2 space-y-1">
                          {goal.interventions.map((intervention) => (
                            <li key={intervention.id} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                                {intervention.intervention_type}
                              </span>
                              <span className="flex-1">{intervention.description}</span>
                              {intervention.applied_at && (
                                <span className="text-xs text-gray-500">
                                  {new Date(intervention.applied_at).toLocaleDateString('ar-SA')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Followups */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">المتابعات</h2>
              <button
                onClick={() => setShowFollowupForm(!showFollowupForm)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                + إضافة
              </button>
            </div>

            {showFollowupForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={followupData.followup_date}
                    onChange={(e) => setFollowupData({ ...followupData, followup_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات</label>
                  <textarea
                    value={followupData.notes}
                    onChange={(e) => setFollowupData({ ...followupData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddFollowup}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setShowFollowupForm(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {!plan.followups || plan.followups.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد متابعات</p>
            ) : (
              <div className="space-y-3">
                {plan.followups.map((followup) => (
                  <div key={followup.id} className="border-b border-gray-200 pb-3 last:border-0">
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(followup.followup_date).toLocaleDateString('ar-SA')}
                    </p>
                    <p className="text-sm text-gray-700">{followup.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evaluations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">التقييمات</h2>
              <button
                onClick={() => setShowEvaluationForm(!showEvaluationForm)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                + إضافة
              </button>
            </div>

            {showEvaluationForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={evaluationData.evaluation_date}
                    onChange={(e) => setEvaluationData({ ...evaluationData, evaluation_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التقييم</label>
                  <textarea
                    value={evaluationData.evaluation}
                    onChange={(e) => setEvaluationData({ ...evaluationData, evaluation: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddEvaluation}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setShowEvaluationForm(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {!plan.evaluations || plan.evaluations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد تقييمات</p>
            ) : (
              <div className="space-y-3">
                {plan.evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="border-b border-gray-200 pb-3 last:border-0">
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(evaluation.evaluation_date).toLocaleDateString('ar-SA')}
                    </p>
                    <p className="text-sm text-gray-700">{evaluation.evaluation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
