import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminTreatmentPlan, useAdminTreatmentPlanMutations } from '../api/guidance-hooks'
import type {
  TreatmentFollowupFormData,
  TreatmentEvaluationFormData,
  GoalStatus,
  TreatmentPlanStatus,
} from '@/modules/guidance/types'

const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  draft: 'مسودة',
  active: 'نشطة',
  suspended: 'معلقة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'معلقة',
}

const STATUS_COLORS: Record<TreatmentPlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  suspended: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
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

const EFFECTIVENESS_OPTIONS = [
  { value: 'highly_effective', label: 'فعالة جداً', color: 'text-green-600' },
  { value: 'effective', label: 'فعالة', color: 'text-green-500' },
  { value: 'moderately_effective', label: 'فعالة نسبياً', color: 'text-yellow-600' },
  { value: 'slightly_effective', label: 'فعالة قليلاً', color: 'text-orange-500' },
  { value: 'not_effective', label: 'غير فعالة', color: 'text-red-600' },
]

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
      <div className="space-y-6" dir="rtl">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">خطأ في تحميل الخطة</h3>
          <button onClick={() => navigate('/admin/treatment-plans')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            العودة للقائمة
          </button>
        </div>
      </div>
    )
  }

  const goalsCount = plan.goals?.length || 0
  const achievedGoals = plan.goals?.filter(g => g.status === 'achieved').length || 0
  const followupsCount = plan.followups?.length || 0
  const evaluationsCount = plan.evaluations?.length || 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/treatment-plans')} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{plan.student?.name || `طالب #${plan.student_id}`}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[plan.status]}`}>
                  {STATUS_LABELS[plan.status]}
                </span>
              </div>
              <p className="text-gray-500 text-sm">رقم الخطة: {(plan as any).plan_number || `TP-${plan.id}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={plan.status} onChange={(e) => handleUpdateStatus(e.target.value as TreatmentPlanStatus)} className="px-4 py-2 border rounded-lg text-sm">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={handleDeletePlan} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{plan.problem_type}</p>
            <p className="text-xs text-purple-600 mt-1">نوع المشكلة</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{achievedGoals}/{goalsCount}</p>
            <p className="text-xs text-blue-600 mt-1">الأهداف المحققة</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{followupsCount}</p>
            <p className="text-xs text-green-600 mt-1">المتابعات</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{evaluationsCount}</p>
            <p className="text-xs text-orange-600 mt-1">التقييمات</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
          <span>البداية: {new Date(plan.start_date).toLocaleDateString('ar-SA')}</span>
          {plan.end_date && <span>النهاية: {new Date(plan.end_date).toLocaleDateString('ar-SA')}</span>}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 p-2">
            {[
              { id: 'overview', label: 'نظرة عامة' },
              { id: 'goals', label: `الأهداف (${goalsCount})` },
              { id: 'followups', label: `المتابعات (${followupsCount})` },
              { id: 'evaluations', label: `التقييمات (${evaluationsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">وصف المشكلة</h3>
                <p className="text-gray-600 bg-gray-50 rounded-lg p-4">{plan.problem_description}</p>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              {!plan.goals || plan.goals.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">لا توجد أهداف مسجلة</p>
                </div>
              ) : (
                plan.goals.map((goal, index) => (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-5 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full text-sm font-bold">{index + 1}</span>
                        <h4 className="font-semibold text-gray-900">{(goal as any).title || goal.goal}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${GOAL_STATUS_COLORS[goal.status]}`}>
                        {GOAL_STATUS_LABELS[goal.status]}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm"><span className="font-medium">معايير النجاح: </span>{(goal as any).success_criteria || goal.measurable_criteria}</p>
                    </div>
                    {goal.interventions && goal.interventions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">التدخلات ({goal.interventions.length})</p>
                        <div className="space-y-2">
                          {goal.interventions.map((intervention) => (
                            <div key={intervention.id} className="flex items-start gap-2 text-sm bg-indigo-50 rounded-lg p-3">
                              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs font-medium">{(intervention as any).category || intervention.intervention_type}</span>
                              <span className="text-gray-700">{(intervention as any).title || intervention.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowFollowupForm(!showFollowupForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة متابعة
                </button>
              </div>

              {showFollowupForm && (
                <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">إضافة متابعة جديدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ المتابعة *</label>
                      <input type="date" value={followupData.followup_date} onChange={(e) => setFollowupData({ ...followupData, followup_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع المتابعة</label>
                      <select value={followupData.type} onChange={(e) => setFollowupData({ ...followupData, type: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                        <option value="عامة">عامة</option>
                        <option value="دورية">دورية</option>
                        <option value="طارئة">طارئة</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات المتابعة *</label>
                    <textarea value={followupData.notes} onChange={(e) => setFollowupData({ ...followupData, notes: e.target.value })} rows={3} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="اكتب ملاحظات المتابعة..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تقدم الطالب</label>
                    <textarea value={followupData.student_progress} onChange={(e) => setFollowupData({ ...followupData, student_progress: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="صف تقدم الطالب..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التوصيات</label>
                    <textarea value={followupData.recommendations} onChange={(e) => setFollowupData({ ...followupData, recommendations: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="التوصيات..." />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowFollowupForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">إلغاء</button>
                    <button onClick={handleAddFollowup} disabled={addFollowup.isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                      {addFollowup.isPending ? 'جاري الحفظ...' : 'حفظ المتابعة'}
                    </button>
                  </div>
                </div>
              )}

              {!plan.followups || plan.followups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">لا توجد متابعات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plan.followups.map((followup) => (
                    <div key={followup.id} className="border border-gray-200 rounded-lg p-5 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{new Date(followup.followup_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            {followup.type && <span className="text-xs text-gray-500">نوع: {followup.type}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{followup.notes}</p>
                      {followup.student_progress && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-2">
                          <p className="text-sm"><span className="font-medium text-blue-700">تقدم الطالب: </span>{followup.student_progress}</p>
                        </div>
                      )}
                      {followup.recommendations && (
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <p className="text-sm"><span className="font-medium text-yellow-700">التوصيات: </span>{followup.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluations' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowEvaluationForm(!showEvaluationForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة تقييم
                </button>
              </div>

              {showEvaluationForm && (
                <div className="bg-orange-50 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">إضافة تقييم جديد</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التقييم *</label>
                      <input type="date" value={evaluationData.evaluation_date} onChange={(e) => setEvaluationData({ ...evaluationData, evaluation_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع التقييم</label>
                      <select value={evaluationData.evaluation_type} onChange={(e) => setEvaluationData({ ...evaluationData, evaluation_type: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                        <option value="دوري">دوري</option>
                        <option value="ختامي">ختامي</option>
                        <option value="مرحلي">مرحلي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نسبة التقدم %</label>
                      <input type="number" min="0" max="100" value={evaluationData.overall_progress_percentage} onChange={(e) => setEvaluationData({ ...evaluationData, overall_progress_percentage: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">فعالية الخطة</label>
                    <select value={evaluationData.overall_effectiveness} onChange={(e) => setEvaluationData({ ...evaluationData, overall_effectiveness: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">اختر...</option>
                      {EFFECTIVENESS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">أهم النتائج</label>
                    <textarea value={evaluationData.key_findings} onChange={(e) => setEvaluationData({ ...evaluationData, key_findings: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="اكتب أهم النتائج..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نقاط القوة</label>
                      <textarea value={evaluationData.student_strengths} onChange={(e) => setEvaluationData({ ...evaluationData, student_strengths: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="نقاط القوة..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">مجالات التحسين</label>
                      <textarea value={evaluationData.areas_for_improvement} onChange={(e) => setEvaluationData({ ...evaluationData, areas_for_improvement: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="مجالات التحسين..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التوصيات</label>
                    <textarea value={evaluationData.recommendations} onChange={(e) => setEvaluationData({ ...evaluationData, recommendations: e.target.value })} rows={2} className="w-full px-4 py-2 border rounded-lg resize-none" placeholder="التوصيات..." />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowEvaluationForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">إلغاء</button>
                    <button onClick={handleAddEvaluation} disabled={addEvaluation.isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                      {addEvaluation.isPending ? 'جاري الحفظ...' : 'حفظ التقييم'}
                    </button>
                  </div>
                </div>
              )}

              {!plan.evaluations || plan.evaluations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">لا توجد تقييمات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plan.evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="border border-gray-200 rounded-lg p-5 bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{new Date(evaluation.evaluation_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            {evaluation.evaluation_type && <span className="text-xs text-gray-500">نوع: {evaluation.evaluation_type}</span>}
                          </div>
                        </div>
                        {evaluation.overall_progress_percentage !== undefined && (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{evaluation.overall_progress_percentage}%</div>
                            <p className="text-xs text-gray-500">نسبة التقدم</p>
                          </div>
                        )}
                      </div>
                      {evaluation.overall_effectiveness && (
                        <div className="mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${EFFECTIVENESS_OPTIONS.find(o => o.value === evaluation.overall_effectiveness)?.color || 'text-gray-600'}`}>
                            {EFFECTIVENESS_OPTIONS.find(o => o.value === evaluation.overall_effectiveness)?.label || evaluation.overall_effectiveness}
                          </span>
                        </div>
                      )}
                      {evaluation.key_findings && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-sm"><span className="font-medium">أهم النتائج: </span>{evaluation.key_findings}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {evaluation.student_strengths && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-sm"><span className="font-medium text-green-700">نقاط القوة: </span>{evaluation.student_strengths}</p>
                          </div>
                        )}
                        {evaluation.areas_for_improvement && (
                          <div className="bg-yellow-50 rounded-lg p-3">
                            <p className="text-sm"><span className="font-medium text-yellow-700">مجالات التحسين: </span>{evaluation.areas_for_improvement}</p>
                          </div>
                        )}
                      </div>
                      {evaluation.recommendations && (
                        <div className="bg-blue-50 rounded-lg p-3 mt-3">
                          <p className="text-sm"><span className="font-medium text-blue-700">التوصيات: </span>{evaluation.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Benefits Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="font-semibold text-indigo-900 mb-3">💡 فوائد المتابعات والتقييمات</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-indigo-800 mb-2">📋 المتابعات:</h4>
            <ul className="space-y-1 text-indigo-700">
              <li>• توثيق التقدم الدوري للطالب</li>
              <li>• رصد التغيرات السلوكية والأكاديمية</li>
              <li>• تحديد العوائق والتحديات مبكراً</li>
              <li>• تعديل الخطة حسب الحاجة</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-800 mb-2">📊 التقييمات:</h4>
            <ul className="space-y-1 text-purple-700">
              <li>• قياس فعالية الخطة العلاجية</li>
              <li>• تحديد نسبة تحقق الأهداف</li>
              <li>• توثيق نقاط القوة ومجالات التحسين</li>
              <li>• اتخاذ قرارات مبنية على بيانات</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
