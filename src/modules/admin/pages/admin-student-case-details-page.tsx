import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminGuidanceCase, useAdminGuidanceCaseMutations } from '../api/guidance-hooks'
import { useTheme } from '@/shared/themes/theme-context'

type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'
type Severity = 'low' | 'medium' | 'high' | 'critical'

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  on_hold: 'معلقة',
  closed: 'مغلقة',
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  on_hold: 'bg-gray-100 text-gray-700 border-gray-200',
  closed: 'bg-green-100 text-green-700 border-green-200',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'عاجلة',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const ACTION_TYPES = [
  'اتصال هاتفي',
  'اجتماع مع الطالب',
  'اجتماع مع ولي الأمر',
  'إحالة للأخصائي',
  'إحالة للإدارة',
  'متابعة',
  'ملاحظة',
  'أخرى',
]

export function AdminStudentCaseDetailsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { currentTheme } = useTheme()
  const { data: caseData, isLoading, error } = useAdminGuidanceCase(caseId ? Number(caseId) : null)
  const { closeCase, reopenCase, deleteCase, addAction, addFollowup, updateFollowupStatus, uploadDocument } = useAdminGuidanceCaseMutations()

  type CaseDetailsTabKey = 'overview' | 'actions' | 'followups' | 'documents'

  const [activeTab, setActiveTab] = useState<CaseDetailsTabKey>('overview')
  const [showActionForm, setShowActionForm] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [showDocumentForm, setShowDocumentForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Action Form State
  const [actionType, setActionType] = useState('')
  const [actionNotes, setActionNotes] = useState('')

  // Followup Form State
  const [followupTitle, setFollowupTitle] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupDate, setFollowupDate] = useState('')

  // Document Form State
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentDescription, setDocumentDescription] = useState('')

  const headerColors = currentTheme.colors

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <header className="pb-2">
          <h1 className="text-3xl font-bold text-gray-900">تفاصيل الحالة</h1>
        </header>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 rounded-full animate-pulse" style={{ borderColor: `${headerColors.primary}30` }}></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 rounded-full animate-spin border-t-transparent" style={{ borderColor: headerColors.primary, borderTopColor: 'transparent' }}></div>
            </div>
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="space-y-6" dir="rtl">
        <header className="pb-2">
          <h1 className="text-3xl font-bold text-gray-900">تفاصيل الحالة</h1>
        </header>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-red-600 mb-4">لم يتم العثور على الحالة المطلوبة</p>
          <button
            onClick={() => navigate('/admin/student-cases')}
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: headerColors.primary }}
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    )
  }

  const handleCloseCase = async () => {
    if (confirm('هل أنت متأكد من إغلاق هذه الحالة؟')) {
      await closeCase.mutateAsync(caseData.id)
    }
  }

  const handleReopenCase = async () => {
    await reopenCase.mutateAsync(caseData.id)
  }

  const handleDeleteCase = async () => {
    if (deleteConfirm) {
      try {
        await deleteCase.mutateAsync(caseData.id)
        navigate('/admin/student-cases')
      } catch (error) {
        console.error('Failed to delete case:', error)
      }
    } else {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
    }
  }

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionType || !actionNotes) return

    try {
      await addAction.mutateAsync({
        caseId: caseData.id,
        payload: { action_type: actionType, notes: actionNotes },
      })
      setActionType('')
      setActionNotes('')
      setShowActionForm(false)
    } catch (error) {
      console.error('Failed to add action:', error)
    }
  }

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followupTitle || !followupDate) return

    try {
      await addFollowup.mutateAsync({
        caseId: caseData.id,
        payload: {
          title: followupTitle,
          scheduled_for: followupDate,
          notes: followupNotes,
          status: 'pending',
        },
      })
      setFollowupTitle('')
      setFollowupNotes('')
      setFollowupDate('')
      setShowFollowupForm(false)
    } catch (error) {
      console.error('Failed to add followup:', error)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documentFile) return

    try {
      await uploadDocument.mutateAsync({
        caseId: caseData.id,
        file: documentFile,
        description: documentDescription,
      })
      setDocumentFile(null)
      setDocumentDescription('')
      setShowDocumentForm(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
    }
  }

  const handleCompleteFollowup = async (followupId: number) => {
    await updateFollowupStatus.mutateAsync({
      caseId: caseData.id,
      followupId,
      payload: { status: 'completed' },
    })
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header className="pb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/admin/student-cases')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>{caseData.student.name}</span>
                  <span>•</span>
                  <span>{caseData.category}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/student-cases/${caseData.id}/edit`)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg font-medium transition-colors flex items-center gap-2 text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              تعديل
            </button>
            {caseData.status !== 'closed' ? (
              <button
                onClick={handleCloseCase}
                disabled={closeCase.isPending}
                className="px-4 py-2 text-white rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: headerColors.primary }}
              >
                إغلاق الحالة
              </button>
            ) : (
              <button
                onClick={handleReopenCase}
                disabled={reopenCase.isPending}
                className="px-4 py-2 border rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ borderColor: headerColors.primary, color: headerColors.primary }}
              >
                إعادة فتح
              </button>
            )}
            <button
              onClick={handleDeleteCase}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${deleteConfirm ? 'bg-red-600 text-white' : 'border border-red-200 text-red-600 hover:bg-red-50'}`}
            >
              {deleteConfirm ? 'تأكيد الحذف' : 'حذف'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className={`text-lg font-bold ${STATUS_COLORS[caseData.status as CaseStatus]?.replace('bg-', 'text-').split(' ')[0] || 'text-gray-700'}`}>
              {STATUS_LABELS[caseData.status as CaseStatus]}
            </p>
            <p className="text-sm text-gray-500">الحالة</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className={`text-lg font-bold ${SEVERITY_COLORS[caseData.severity as Severity]?.replace('bg-', 'text-').split(' ')[0] || 'text-gray-700'}`}>
              {SEVERITY_LABELS[caseData.severity as Severity]}
            </p>
            <p className="text-sm text-gray-500">الأولوية</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold" style={{ color: headerColors.primary }}>{caseData.actions?.length || 0}</p>
            <p className="text-sm text-gray-500">إجراء</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-amber-600">{caseData.followups?.length || 0}</p>
            <p className="text-sm text-gray-500">متابعة</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Student Info Card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100" style={{ backgroundColor: `${headerColors.primary}08` }}>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: headerColors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                معلومات الطالب
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: headerColors.primary }}>
                  {caseData.student.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{caseData.student.name}</p>
                  <p className="text-sm text-gray-500">{caseData.student.grade} - {caseData.student.class_name}</p>
                </div>
              </div>
              {(caseData.student.parent_name || caseData.student.parent_phone) && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  {caseData.student.parent_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-600">{caseData.student.parent_name}</span>
                    </div>
                  )}
                  {caseData.student.parent_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${caseData.student.parent_phone}`} className="text-gray-600 hover:underline" style={{ color: headerColors.primary }}>
                        {caseData.student.parent_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Case Info Card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100" style={{ backgroundColor: `${headerColors.primary}08` }}>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: headerColors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                تفاصيل الحالة
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">التصنيف</span>
                <span className="text-sm font-medium text-gray-900">{caseData.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">تاريخ الفتح</span>
                <span className="text-sm font-medium text-gray-900">{new Date(caseData.opened_at).toLocaleDateString('ar-SA')}</span>
              </div>
              {caseData.closed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">تاريخ الإغلاق</span>
                  <span className="text-sm font-medium text-gray-900">{new Date(caseData.closed_at).toLocaleDateString('ar-SA')}</span>
                </div>
              )}
              {caseData.tags && caseData.tags.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">الوسوم</p>
                  <div className="flex flex-wrap gap-2">
                    {caseData.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: `${headerColors.primary}15`, color: headerColors.primary }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {([
                { key: 'overview', label: 'نظرة عامة', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { key: 'actions', label: `الإجراءات (${caseData.actions?.length || 0})`, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { key: 'followups', label: `المتابعات (${caseData.followups?.length || 0})`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                { key: 'documents', label: `المستندات (${caseData.documents?.length || 0})`, icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
              ] as Array<{ key: CaseDetailsTabKey; label: string; icon: string }>).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-3.5 font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-b-2'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={activeTab === tab.key ? { borderColor: headerColors.primary, color: headerColors.primary } : {}}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      ملخص الحالة
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{caseData.summary || 'لا يوجد ملخص مسجل لهذه الحالة.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">سجل الإجراءات</h3>
                    <button
                      onClick={() => setShowActionForm(!showActionForm)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      style={showActionForm ? { backgroundColor: '#f3f4f6', color: '#6b7280' } : { backgroundColor: headerColors.primary, color: 'white' }}
                    >
                      {showActionForm ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          إلغاء
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          إضافة إجراء
                        </>
                      )}
                    </button>
                  </div>

                  {showActionForm && (
                    <form onSubmit={handleAddAction} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="space-y-3">
                        <select
                          value={actionType}
                          onChange={(e) => setActionType(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2"
                          style={{ '--tw-ring-color': headerColors.primary } as any}
                          required
                        >
                          <option value="">اختر نوع الإجراء</option>
                          {ACTION_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 resize-none"
                          placeholder="أضف ملاحظاتك هنا..."
                          required
                        />
                        <button
                          type="submit"
                          disabled={addAction.isPending}
                          className="w-full py-2.5 rounded-xl font-medium text-white transition-colors"
                          style={{ backgroundColor: headerColors.primary }}
                        >
                          {addAction.isPending ? 'جاري الإضافة...' : 'إضافة الإجراء'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.actions && caseData.actions.length > 0 ? (
                      caseData.actions.map((action, index) => (
                        <div key={action.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: headerColors.primary }}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold" style={{ color: headerColors.primary }}>{action.action_type}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(action.created_at).toLocaleString('ar-SA')}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm">{action.notes}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-gray-500">لم يتم تسجيل أي إجراءات بعد</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'followups' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">جدول المتابعات</h3>
                    <button
                      onClick={() => setShowFollowupForm(!showFollowupForm)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      style={showFollowupForm ? { backgroundColor: '#f3f4f6', color: '#6b7280' } : { backgroundColor: headerColors.primary, color: 'white' }}
                    >
                      {showFollowupForm ? 'إلغاء' : 'إضافة متابعة'}
                    </button>
                  </div>

                  {showFollowupForm && (
                    <form onSubmit={handleAddFollowup} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={followupTitle}
                          onChange={(e) => setFollowupTitle(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2"
                          placeholder="عنوان المتابعة"
                          required
                        />
                        <input
                          type="datetime-local"
                          value={followupDate}
                          onChange={(e) => setFollowupDate(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2"
                          required
                        />
                        <textarea
                          value={followupNotes}
                          onChange={(e) => setFollowupNotes(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 resize-none"
                          placeholder="ملاحظات إضافية..."
                        />
                        <button
                          type="submit"
                          disabled={addFollowup.isPending}
                          className="w-full py-2.5 rounded-xl font-medium text-white"
                          style={{ backgroundColor: headerColors.primary }}
                        >
                          {addFollowup.isPending ? 'جاري الإضافة...' : 'إضافة المتابعة'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.followups && caseData.followups.length > 0 ? (
                      caseData.followups.map((followup) => (
                        <div key={followup.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{followup.title}</h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(followup.scheduled_for).toLocaleString('ar-SA')}
                              </div>
                              {followup.notes && <p className="text-gray-600 text-sm mt-2">{followup.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-lg ${
                                  followup.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : followup.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {followup.status === 'completed' ? 'منجز' : followup.status === 'cancelled' ? 'ملغي' : 'معلق'}
                              </span>
                              {followup.status === 'pending' && (
                                <button
                                  onClick={() => handleCompleteFollowup(followup.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="تحديد كمنجز"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">لا توجد متابعات مجدولة</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">المستندات المرفقة</h3>
                    <button
                      onClick={() => setShowDocumentForm(!showDocumentForm)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      style={showDocumentForm ? { backgroundColor: '#f3f4f6', color: '#6b7280' } : { backgroundColor: headerColors.primary, color: 'white' }}
                    >
                      {showDocumentForm ? 'إلغاء' : 'رفع مستند'}
                    </button>
                  </div>

                  {showDocumentForm && (
                    <form onSubmit={handleUploadDocument} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
                          <input
                            type="file"
                            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-upload"
                            required
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-gray-600">{documentFile ? documentFile.name : 'اضغط لاختيار ملف أو اسحبه هنا'}</p>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={documentDescription}
                          onChange={(e) => setDocumentDescription(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2"
                          placeholder="وصف المستند (اختياري)"
                        />
                        <button
                          type="submit"
                          disabled={uploadDocument.isPending || !documentFile}
                          className="w-full py-2.5 rounded-xl font-medium text-white disabled:opacity-50"
                          style={{ backgroundColor: headerColors.primary }}
                        >
                          {uploadDocument.isPending ? 'جاري الرفع...' : 'رفع المستند'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.documents && caseData.documents.length > 0 ? (
                      caseData.documents.map((doc) => (
                        <div key={doc.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${headerColors.primary}15` }}>
                              <svg className="w-6 h-6" style={{ color: headerColors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{doc.original_name}</p>
                              <p className="text-sm text-gray-500">{doc.metadata?.description || 'بدون وصف'}</p>
                            </div>
                          </div>
                          <a
                            href={`/api/guidance/cases/${caseData.id}/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            style={{ color: headerColors.primary }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">لا توجد مستندات مرفقة</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
