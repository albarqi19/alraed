import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGuidanceCase, useGuidanceCaseMutations } from '../hooks'

const STATUS_LABELS = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  on_hold: 'معلقة',
  closed: 'مغلقة',
}

const SEVERITY_LABELS = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'حرجة',
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

export function GuidanceCaseDetailsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { data: caseData, isLoading, error } = useGuidanceCase(Number(caseId))
  const { closeCase, reopenCase, addAction, addFollowup, updateFollowupStatus, uploadDocument } = useGuidanceCaseMutations()

  type CaseDetailsTabKey = 'overview' | 'actions' | 'followups' | 'documents'

  const [activeTab, setActiveTab] = useState<CaseDetailsTabKey>('overview')
  const [showActionForm, setShowActionForm] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [showDocumentForm, setShowDocumentForm] = useState(false)

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md" dir="rtl">
          <h2 className="text-red-800 font-bold text-lg mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-red-600">لم يتم العثور على الحالة المطلوبة</p>
          <button
            onClick={() => navigate('/admin/student-cases/list')}
            className="mt-4 text-red-700 hover:text-red-900 font-medium"
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
      <header>
        <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/admin/student-cases/list')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{caseData.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-medium">#{caseData.case_number}</span>
                <span>•</span>
                <span>{caseData.student.name}</span>
                <span>•</span>
                <span>{caseData.category}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {caseData.status !== 'closed' ? (
                <button
                  onClick={handleCloseCase}
                  disabled={closeCase.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  إغلاق الحالة
                </button>
              ) : (
                <button
                  onClick={handleReopenCase}
                  disabled={reopenCase.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  إعادة فتح الحالة
                </button>
              )}
            </div>
          </div>
        </header>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Student Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">معلومات الطالب</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">الاسم:</span>
                  <p className="font-medium">{caseData.student.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">الصف:</span>
                  <p className="font-medium">{caseData.student.grade}</p>
                </div>
                <div>
                  <span className="text-gray-600">الفصل:</span>
                  <p className="font-medium">{caseData.student.class_name}</p>
                </div>
                {caseData.student.parent_name && (
                  <div>
                    <span className="text-gray-600">ولي الأمر:</span>
                    <p className="font-medium">{caseData.student.parent_name}</p>
                  </div>
                )}
                {caseData.student.parent_phone && (
                  <div>
                    <span className="text-gray-600">الجوال:</span>
                    <p className="font-medium">{caseData.student.parent_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Case Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">تفاصيل الحالة</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">الحالة:</span>
                  <p className="font-medium">{STATUS_LABELS[caseData.status]}</p>
                </div>
                <div>
                  <span className="text-gray-600">الأولوية:</span>
                  <p className="font-medium">{SEVERITY_LABELS[caseData.severity]}</p>
                </div>
                <div>
                  <span className="text-gray-600">تاريخ الفتح:</span>
                  <p className="font-medium">{new Date(caseData.opened_at).toLocaleDateString('ar-SA')}</p>
                </div>
                {caseData.closed_at && (
                  <div>
                    <span className="text-gray-600">تاريخ الإغلاق:</span>
                    <p className="font-medium">{new Date(caseData.closed_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                )}
                {caseData.tags && caseData.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600 block mb-2">الوسوم:</span>
                    <div className="flex flex-wrap gap-2">
                      {caseData.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
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
            <div className="bg-white rounded-t-lg shadow">
              <div className="flex border-b">
                {([
                  { key: 'overview', label: 'نظرة عامة' },
                  { key: 'actions', label: `الإجراءات (${caseData.actions?.length || 0})` },
                  { key: 'followups', label: `المتابعات (${caseData.followups?.length || 0})` },
                  { key: 'documents', label: `المستندات (${caseData.documents?.length || 0})` },
                ] as Array<{ key: CaseDetailsTabKey; label: string }>).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-4 py-3 font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-lg shadow p-6">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">الملخص</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{caseData.summary || 'لا يوجد ملخص'}</p>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">الإجراءات</h3>
                    <button
                      onClick={() => setShowActionForm(!showActionForm)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                    >
                      {showActionForm ? 'إلغاء' : 'إضافة إجراء'}
                    </button>
                  </div>

                  {showActionForm && (
                    <form onSubmit={handleAddAction} className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="space-y-3">
                        <select
                          value={actionType}
                          onChange={(e) => setActionType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="">نوع الإجراء</option>
                          {ACTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          placeholder="ملاحظات..."
                          required
                        />
                        <button
                          type="submit"
                          disabled={addAction.isPending}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium"
                        >
                          {addAction.isPending ? 'جاري الإضافة...' : 'إضافة'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.actions && caseData.actions.length > 0 ? (
                      caseData.actions.map((action) => (
                        <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-indigo-600">{action.action_type}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(action.created_at).toLocaleString('ar-SA')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{action.notes}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">لا توجد إجراءات</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'followups' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">المتابعات</h3>
                    <button
                      onClick={() => setShowFollowupForm(!showFollowupForm)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                    >
                      {showFollowupForm ? 'إلغاء' : 'إضافة متابعة'}
                    </button>
                  </div>

                  {showFollowupForm && (
                    <form onSubmit={handleAddFollowup} className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={followupTitle}
                          onChange={(e) => setFollowupTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="عنوان المتابعة"
                          required
                        />
                        <input
                          type="datetime-local"
                          value={followupDate}
                          onChange={(e) => setFollowupDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                        <textarea
                          value={followupNotes}
                          onChange={(e) => setFollowupNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          placeholder="ملاحظات..."
                        />
                        <button
                          type="submit"
                          disabled={addFollowup.isPending}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium"
                        >
                          {addFollowup.isPending ? 'جاري الإضافة...' : 'إضافة'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.followups && caseData.followups.length > 0 ? (
                      caseData.followups.map((followup) => (
                        <div key={followup.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{followup.title}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(followup.scheduled_for).toLocaleString('ar-SA')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  followup.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : followup.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {followup.status === 'completed' ? 'منجز' : followup.status === 'cancelled' ? 'ملغي' : 'معلق'}
                              </span>
                              {followup.status === 'pending' && (
                                <button
                                  onClick={() => handleCompleteFollowup(followup.id)}
                                  className="text-green-600 hover:text-green-700 text-sm"
                                >
                                  تم
                                </button>
                              )}
                            </div>
                          </div>
                          {followup.notes && <p className="text-gray-700 text-sm">{followup.notes}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">لا توجد متابعات</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">المستندات</h3>
                    <button
                      onClick={() => setShowDocumentForm(!showDocumentForm)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                    >
                      {showDocumentForm ? 'إلغاء' : 'رفع مستند'}
                    </button>
                  </div>

                  {showDocumentForm && (
                    <form onSubmit={handleUploadDocument} className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="space-y-3">
                        <input
                          type="file"
                          onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                        <input
                          type="text"
                          value={documentDescription}
                          onChange={(e) => setDocumentDescription(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="وصف المستند (اختياري)"
                        />
                        <button
                          type="submit"
                          disabled={uploadDocument.isPending}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium"
                        >
                          {uploadDocument.isPending ? 'جاري الرفع...' : 'رفع'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {caseData.documents && caseData.documents.length > 0 ? (
                      caseData.documents.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium">{doc.original_name}</p>
                              <p className="text-xs text-gray-500">
                                {doc.metadata?.description || 'لا يوجد وصف'}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/guidance/cases/${caseData.id}/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            تحميل
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">لا توجد مستندات</p>
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
