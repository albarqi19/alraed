import { useState } from 'react'
import { X } from 'lucide-react'
import type { StudentReferral } from '../types'
import { useOpenCaseFromReferralMutation } from '../hooks'

const CATEGORIES = ['سلوكية', 'أكاديمية', 'اجتماعية', 'نفسية', 'صحية', 'أخرى']
const SEVERITIES = [
    { value: 'low', label: 'منخفضة' },
    { value: 'medium', label: 'متوسطة' },
    { value: 'high', label: 'عالية' },
    { value: 'critical', label: 'عاجلة' },
] as const

interface Props {
    referral: StudentReferral
    isOpen: boolean
    onClose: () => void
    onSuccess: (caseData: { id: number; case_number: string }) => void
}

export function CaseFormModal({ referral, isOpen, onClose, onSuccess }: Props) {
    const openCaseMutation = useOpenCaseFromReferralMutation()

    const [formData, setFormData] = useState({
        title: referral.description?.substring(0, 100) || '',
        category: referral.referral_type === 'academic_weakness' ? 'أكاديمية' : 'سلوكية',
        severity: (referral.priority === 'urgent' ? 'critical' : referral.priority) as typeof SEVERITIES[number]['value'],
        summary: referral.description || '',
        tags: [] as string[],
    })
    const [tagInput, setTagInput] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.category || !formData.title) {
            alert('يرجى ملء جميع الحقول المطلوبة')
            return
        }

        try {
            const result = await openCaseMutation.mutateAsync({
                id: referral.id,
                data: {
                    category: formData.category,
                    severity: formData.severity,
                    summary: formData.summary,
                    tags: formData.tags,
                    title: formData.title,
                },
            })
            onSuccess(result.case)
        } catch (error) {
            console.error('Failed to create case:', error)
            alert('فشل في إنشاء دراسة الحالة')
        }
    }

    const addTag = () => {
        const trimmed = tagInput.trim()
        if (trimmed && !formData.tags.includes(trimmed)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }))
            setTagInput('')
        }
    }

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900">دراسة حالة جديدة</h2>
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
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-indigo-600 font-bold">{referral.student?.name?.charAt(0) || '؟'}</span>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{referral.student?.name || 'اسم الطالب غير متوفر'}</p>
                                <p className="text-sm text-gray-500">
                                    {referral.student?.classroom?.name || ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            العنوان <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            placeholder="عنوان مختصر للحالة"
                            required
                        />
                    </div>

                    {/* Category & Severity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                التصنيف <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                required
                            >
                                <option value="">اختر التصنيف</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">الأولوية</label>
                            <div className="flex gap-2 flex-wrap">
                                {SEVERITIES.map((severity) => (
                                    <button
                                        key={severity.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, severity: severity.value }))}
                                        className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${formData.severity === severity.value
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        {severity.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">الملخص</label>
                        <textarea
                            value={formData.summary}
                            onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
                            placeholder="وصف مختصر للحالة..."
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">الوسوم</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addTag()
                                    }
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="أضف وسم واضغط Enter"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                            >
                                إضافة
                            </button>
                        </div>
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={openCaseMutation.isPending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            {openCaseMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء دراسة الحالة'}
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
