import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { StudentReferral } from '../types'
import { useCreateTreatmentPlanFromReferralMutation } from '../hooks'

const PROBLEM_TYPES = ['سلوكية', 'دراسية', 'نفسية', 'اجتماعية', 'صحية']
const PRIORITIES = [
    { value: 'low', label: 'منخفضة' },
    { value: 'medium', label: 'متوسطة' },
    { value: 'high', label: 'عالية' },
    { value: 'urgent', label: 'عاجلة' },
] as const

interface Props {
    referral: StudentReferral
    isOpen: boolean
    onClose: () => void
    onSuccess: (planData: { id: number; plan_number: string }) => void
}

export function TreatmentPlanFormModal({ referral, isOpen, onClose, onSuccess }: Props) {
    const createPlanMutation = useCreateTreatmentPlanFromReferralMutation()

    const [formData, setFormData] = useState({
        title: `خطة علاجية - ${referral.description?.substring(0, 50) || ''}`,
        problem_type: referral.referral_type === 'academic_weakness' ? 'دراسية' : 'سلوكية',
        problem_description: referral.description || '',
        diagnosis: '',
        root_causes: '',
        priority: (referral.priority || 'medium') as typeof PRIORITIES[number]['value'],
        expected_duration_weeks: 4,
        goals: [] as Array<{ title: string; description: string }>,
    })

    const [newGoal, setNewGoal] = useState({ title: '', description: '' })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.problem_type || !formData.problem_description) {
            alert('يرجى ملء جميع الحقول المطلوبة')
            return
        }

        try {
            const result = await createPlanMutation.mutateAsync({
                id: referral.id,
                data: {
                    title: formData.title,
                    problem_type: formData.problem_type,
                    problem_description: formData.problem_description,
                    diagnosis: formData.diagnosis || undefined,
                    root_causes: formData.root_causes || undefined,
                    priority: formData.priority,
                    expected_duration_weeks: formData.expected_duration_weeks,
                    goals: formData.goals.length > 0 ? formData.goals : undefined,
                },
            })
            onSuccess(result.plan)
        } catch (error) {
            console.error('Failed to create treatment plan:', error)
            alert('فشل في إنشاء الخطة العلاجية')
        }
    }

    const addGoal = () => {
        if (!newGoal.title.trim()) {
            alert('يرجى إدخال عنوان الهدف')
            return
        }
        setFormData(prev => ({
            ...prev,
            goals: [...prev.goals, { ...newGoal }],
        }))
        setNewGoal({ title: '', description: '' })
    }

    const removeGoal = (index: number) => {
        setFormData(prev => ({
            ...prev,
            goals: prev.goals.filter((_, i) => i !== index),
        }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                    <h2 className="text-xl font-bold text-gray-900">خطة علاجية جديدة</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Student Info (Read-only) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-bold">{referral.student?.name?.charAt(0) || '؟'}</span>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{referral.student?.name || 'اسم الطالب غير متوفر'}</p>
                                <p className="text-sm text-gray-500">
                                    {referral.student?.classroom?.name || ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Title and Problem Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">عنوان الخطة</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                placeholder="عنوان الخطة العلاجية"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                نوع المشكلة <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.problem_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, problem_type: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                required
                            >
                                {PROBLEM_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Problem Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            وصف المشكلة <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.problem_description}
                            onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                            placeholder="وصف تفصيلي للمشكلة..."
                            required
                        />
                    </div>

                    {/* Diagnosis & Root Causes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">التشخيص</label>
                            <textarea
                                value={formData.diagnosis}
                                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                                placeholder="تشخيص الحالة..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">الأسباب الجذرية</label>
                            <textarea
                                value={formData.root_causes}
                                onChange={(e) => setFormData(prev => ({ ...prev, root_causes: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-y"
                                placeholder="الأسباب المحتملة للمشكلة..."
                            />
                        </div>
                    </div>

                    {/* Priority & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">الأولوية</label>
                            <div className="flex gap-2 flex-wrap">
                                {PRIORITIES.map((priority) => (
                                    <button
                                        key={priority.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                                        className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${formData.priority === priority.value
                                            ? 'border-green-600 bg-green-50 text-green-700'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        {priority.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">المدة المتوقعة (أسابيع)</label>
                            <input
                                type="number"
                                min={1}
                                max={52}
                                value={formData.expected_duration_weeks}
                                onChange={(e) => setFormData(prev => ({ ...prev, expected_duration_weeks: parseInt(e.target.value) || 4 }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* Goals Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900">الأهداف العلاجية</h3>

                        {/* Existing Goals */}
                        {formData.goals.length > 0 && (
                            <div className="space-y-2">
                                {formData.goals.map((goal, index) => (
                                    <div key={index} className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                                        <div className="flex-1">
                                            <p className="font-medium text-green-800">الهدف {index + 1}: {goal.title}</p>
                                            {goal.description && (
                                                <p className="text-sm text-green-600 mt-1">{goal.description}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeGoal(index)}
                                            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Goal */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                            <input
                                type="text"
                                value={newGoal.title}
                                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="عنوان الهدف (مثال: تحسين مستوى القراءة)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                            <input
                                type="text"
                                value={newGoal.description}
                                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="وصف الهدف (اختياري)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={addGoal}
                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                إضافة هدف
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={createPlanMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            {createPlanMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الخطة العلاجية'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
