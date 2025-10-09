import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidanceStudents, useTreatmentPlanMutations } from '../hooks'
import type { TreatmentPlanFormData, ProblemType, InterventionType } from '../types'

const PROBLEM_TYPES: ProblemType[] = ['سلوكية', 'دراسية', 'نفسية', 'اجتماعية', 'صحية']
const INTERVENTION_TYPES: InterventionType[] = ['تعليمية', 'سلوكية', 'نفسية', 'أسرية', 'جماعية', 'فردية', 'إرشادية']

export function TreatmentPlanFormPage() {
  const navigate = useNavigate()
  const { data: students } = useGuidanceStudents()
  const { createPlan } = useTreatmentPlanMutations()

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
      navigate('/guidance/treatment-plans')
    } catch (error) {
      console.error('Failed to create treatment plan:', error)
      alert('فشل إنشاء الخطة العلاجية')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">إضافة خطة علاجية جديدة</h1>
        <p className="mt-2 text-sm text-gray-600">
          قم بتحديد المشكلة، الأهداف العلاجية، والتدخلات المطلوبة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">المعلومات الأساسية</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الطالب <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              >
                <option value={0}>اختر الطالب</option>
                {students?.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.grade} {student.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع المشكلة <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.problem_type}
                onChange={(e) => setFormData({ ...formData, problem_type: e.target.value as ProblemType })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              >
                {PROBLEM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف المشكلة <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.problem_description}
              onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
              placeholder="وصف تفصيلي للمشكلة التي يعاني منها الطالب..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ البدء <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء المتوقع</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">الأهداف العلاجية</h2>

          {/* Existing Goals */}
          {formData.goals && formData.goals.length > 0 && (
            <div className="space-y-3">
              {formData.goals.map((goal, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">الهدف {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      × حذف
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>الهدف:</strong> {goal.goal}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>المعايير:</strong> {goal.measurable_criteria}
                  </p>
                  {goal.interventions && goal.interventions.length > 0 && (
                    <div>
                      <strong className="text-sm text-gray-700">التدخلات:</strong>
                      <ul className="mt-1 space-y-1">
                        {goal.interventions.map((intervention, i) => (
                          <li key={i} className="text-sm text-gray-600">
                            • [{intervention.intervention_type}] {intervention.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Goal */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900">إضافة هدف جديد</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الهدف</label>
              <input
                type="text"
                value={newGoal.goal}
                onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
                placeholder="مثال: تحسين مستوى التحصيل في مادة الرياضيات"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المعايير القابلة للقياس</label>
              <input
                type="text"
                value={newGoal.measurable_criteria}
                onChange={(e) => setNewGoal({ ...newGoal, measurable_criteria: e.target.value })}
                placeholder="مثال: الحصول على 80% في الاختبار القادم"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Interventions for new goal */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">التدخلات</h4>

              {newGoal.interventions.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {newGoal.interventions.map((intervention, i) => (
                    <li key={i} className="text-sm text-gray-600 flex justify-between items-center">
                      <span>
                        • [{intervention.intervention_type}] {intervention.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInterventionFromGoal(i)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        حذف
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <select
                  value={newIntervention.intervention_type}
                  onChange={(e) =>
                    setNewIntervention({ ...newIntervention, intervention_type: e.target.value as InterventionType })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                >
                  {INTERVENTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newIntervention.description}
                  onChange={(e) => setNewIntervention({ ...newIntervention, description: e.target.value })}
                  placeholder="وصف التدخل..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={addInterventionToGoal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                >
                  إضافة تدخل
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addGoal}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              إضافة الهدف
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createPlan.isPending}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPlan.isPending ? 'جاري الحفظ...' : 'حفظ الخطة العلاجية'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/guidance/treatment-plans')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
