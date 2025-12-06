import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  useGuidanceReferralDetailQuery,
  useReceiveGuidanceReferralMutation,
  useOpenCaseFromReferralMutation,
  useCreateTreatmentPlanFromReferralMutation,
  useCompleteGuidanceReferralMutation,
  useTransferGuidanceReferralMutation,
  useAddGuidanceReferralNoteMutation,
} from '../referrals/hooks'
import type { ReferralStatus } from '../referrals/types'

const STATUS_STYLES: Record<ReferralStatus, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'bi-clock' },
  received: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'bi-check2' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: 'bi-gear' },
  transferred: { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'bi-arrow-repeat' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'bi-check2-circle' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-800', icon: 'bi-x-circle' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'bi-x-lg' },
}

const ACTION_ICONS: Record<string, string> = {
  created: 'bi-plus-circle',
  received: 'bi-check2',
  assigned: 'bi-person-check',
  transferred: 'bi-arrow-repeat',
  violation_recorded: 'bi-exclamation-triangle',
  case_opened: 'bi-folder-plus',
  plan_created: 'bi-journal-text',
  session_held: 'bi-calendar-check',
  parent_contacted: 'bi-telephone',
  note_added: 'bi-sticky',
  completed: 'bi-check2-circle',
  closed: 'bi-x-circle',
  cancelled: 'bi-x-lg',
  reopened: 'bi-arrow-clockwise',
}

const CASE_TYPES = [
  { value: 'academic', label: 'أكاديمية' },
  { value: 'behavioral', label: 'سلوكية' },
  { value: 'social', label: 'اجتماعية' },
  { value: 'psychological', label: 'نفسية' },
  { value: 'family', label: 'أسرية' },
]

export function GuidanceReferralDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: referral, isLoading, error, refetch } = useGuidanceReferralDetailQuery(Number(id) || 0)
  
  const receiveMutation = useReceiveGuidanceReferralMutation()
  const openCaseMutation = useOpenCaseFromReferralMutation()
  const createPlanMutation = useCreateTreatmentPlanFromReferralMutation()
  const completeMutation = useCompleteGuidanceReferralMutation()
  const transferMutation = useTransferGuidanceReferralMutation()
  const noteMutation = useAddGuidanceReferralNoteMutation()
  
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  
  // Case form
  const [caseType, setCaseType] = useState('academic')
  const [caseTitle, setCaseTitle] = useState('')
  const [caseNotes, setCaseNotes] = useState('')
  
  // Plan form
  const [planTitle, setPlanTitle] = useState('')
  const [planObjectives, setPlanObjectives] = useState('')
  const [planStartDate, setPlanStartDate] = useState('')
  const [planEndDate, setPlanEndDate] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  
  // Note form
  const [noteText, setNoteText] = useState('')
  
  // Transfer form
  const [transferNotes, setTransferNotes] = useState('')
  
  const handleReceive = async () => {
    if (!referral) return
    try {
      await receiveMutation.mutateAsync(referral.id)
      refetch()
    } catch (err) {
      console.error('Error receiving referral:', err)
      alert('حدث خطأ أثناء استلام الإحالة')
    }
  }
  
  const handleOpenCase = async () => {
    if (!referral || !caseTitle.trim()) return
    try {
      await openCaseMutation.mutateAsync({
        id: referral.id,
        payload: {
          case_type: caseType,
          title: caseTitle,
          notes: caseNotes || undefined,
        },
      })
      setShowCaseModal(false)
      setCaseTitle('')
      setCaseNotes('')
      refetch()
    } catch (err) {
      console.error('Error opening case:', err)
      alert('حدث خطأ أثناء فتح الحالة')
    }
  }
  
  const handleCreatePlan = async () => {
    if (!referral || !planTitle.trim() || !planObjectives.trim() || !planStartDate || !planEndDate) return
    try {
      await createPlanMutation.mutateAsync({
        id: referral.id,
        payload: {
          title: planTitle,
          objectives: planObjectives,
          start_date: planStartDate,
          end_date: planEndDate,
          notes: planNotes || undefined,
        },
      })
      setShowPlanModal(false)
      setPlanTitle('')
      setPlanObjectives('')
      setPlanStartDate('')
      setPlanEndDate('')
      setPlanNotes('')
      refetch()
    } catch (err) {
      console.error('Error creating plan:', err)
      alert('حدث خطأ أثناء إنشاء الخطة')
    }
  }
  
  const handleComplete = async () => {
    if (!referral) return
    if (window.confirm('هل أنت متأكد من إكمال هذه الإحالة؟')) {
      try {
        await completeMutation.mutateAsync({ id: referral.id })
        refetch()
      } catch (err) {
        console.error('Error completing referral:', err)
        alert('حدث خطأ أثناء إكمال الإحالة')
      }
    }
  }
  
  const handleTransfer = async () => {
    if (!referral || !transferNotes.trim()) return
    try {
      await transferMutation.mutateAsync({
        id: referral.id,
        target_role: 'vice_principal',
        notes: transferNotes,
      })
      setShowTransferModal(false)
      setTransferNotes('')
      refetch()
    } catch (err) {
      console.error('Error transferring referral:', err)
      alert('حدث خطأ أثناء تحويل الإحالة')
    }
  }
  
  const handleAddNote = async () => {
    if (!referral || !noteText.trim()) return
    try {
      await noteMutation.mutateAsync({ id: referral.id, notes: noteText })
      setShowNoteModal(false)
      setNoteText('')
      refetch()
    } catch (err) {
      console.error('Error adding note:', err)
      alert('حدث خطأ أثناء إضافة الملاحظة')
    }
  }
  
  const handlePrintDocument = (documentId: number) => {
    const token = window.localStorage.getItem('auth_token')
    const url = `${import.meta.env.VITE_API_BASE_URL || 'https://api.brqq.site/api'}/guidance/referrals/${id}/documents/${documentId}?token=${token}`
    window.open(url, '_blank')
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    )
  }
  
  if (error || !referral) {
    return (
      <div className="text-center py-20">
        <i className="bi bi-exclamation-triangle text-5xl text-red-400" />
        <p className="mt-4 text-lg font-medium text-slate-600">حدث خطأ في تحميل البيانات</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sky-600 hover:text-sky-800"
        >
          العودة
        </button>
      </div>
    )
  }
  
  const statusStyle = STATUS_STYLES[referral.status] || STATUS_STYLES.pending
  const canPerformActions = ['pending', 'received', 'in_progress'].includes(referral.status)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <i className="bi bi-arrow-right text-lg" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">تفاصيل الإحالة</h1>
          <p className="text-sm text-slate-500">{referral.referral_number}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          <i className={statusStyle.icon} />
          {referral.status_label}
        </span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">معلومات الطالب</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <i className="bi bi-person text-3xl text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-900">{referral.student?.name}</h2>
                <p className="text-sm text-slate-500">
                  {referral.student?.student_number} • {referral.student?.classroom?.name}
                </p>
              </div>
            </div>
          </div>
          
          {/* Referral Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">معلومات الإحالة</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">نوع الإحالة</p>
                <span className={`inline-flex items-center gap-1 mt-1 rounded px-2 py-0.5 text-sm font-medium ${
                  referral.referral_type === 'academic_weakness' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <i className={referral.referral_type === 'academic_weakness' ? 'bi-book' : 'bi-exclamation-triangle'} />
                  {referral.referral_type_label}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-slate-500">درجة الأهمية</p>
                <p className="font-medium text-slate-900 mt-1">{referral.priority_label}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500">تاريخ الإحالة</p>
                <p className="font-medium text-slate-900 mt-1">
                  {new Date(referral.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">المحيل (المعلم)</p>
              <p className="font-medium text-slate-900">
                <i className="bi bi-person ml-1 text-slate-400" />
                {referral.referred_by_user?.name}
              </p>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">وصف الحالة</p>
              <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">{referral.description}</p>
            </div>
          </div>
          
          {/* Linked Entities */}
          {referral.linked_entities && (referral.linked_entities.student_case || referral.linked_entities.treatment_plan) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">الإجراءات المتخذة</h3>
              
              {referral.linked_entities.student_case && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <i className="bi bi-folder text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">حالة مفتوحة</p>
                      <p className="text-sm text-slate-500">
                        {referral.linked_entities.student_case.case_number} - {referral.linked_entities.student_case.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/guidance/cases/${referral.linked_entities!.student_case!.id}`)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    عرض
                  </button>
                </div>
              )}
              
              {referral.linked_entities.treatment_plan && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <i className="bi bi-journal-text text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">خطة علاجية</p>
                      <p className="text-sm text-slate-500">
                        {referral.linked_entities.treatment_plan.plan_number} - {referral.linked_entities.treatment_plan.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/guidance/treatment-plans/${referral.linked_entities!.treatment_plan!.id}`)}
                    className="text-sm text-green-600 hover:text-green-800 font-medium"
                  >
                    عرض
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Workflow Timeline */}
          {referral.workflow_logs && referral.workflow_logs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">سجل الإجراءات</h3>
              
              <div className="relative pr-6">
                <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                
                <div className="space-y-4">
                  {referral.workflow_logs.map((log, index) => (
                    <div key={log.id} className="relative flex gap-3">
                      <div className={`absolute right-0 -mr-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                        index === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}>
                        <i className={`${ACTION_ICONS[log.action] || 'bi-record'} text-xs text-white`} />
                      </div>
                      
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-slate-900">{log.action_label}</p>
                        {log.notes && (
                          <p className="text-sm text-slate-600 mt-0.5">{log.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {log.performed_by_user && (
                            <span>{log.performed_by_user.name}</span>
                          )}
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">الإجراءات</h3>
            
            <div className="space-y-2">
              {referral.status === 'pending' && (
                <button
                  onClick={handleReceive}
                  disabled={receiveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <i className="bi bi-check2" />
                  استلام الإحالة
                </button>
              )}
              
              {canPerformActions && !referral.linked_entities?.student_case && (
                <button
                  onClick={() => setShowCaseModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
                >
                  <i className="bi bi-folder-plus" />
                  فتح حالة
                </button>
              )}
              
              {canPerformActions && !referral.linked_entities?.treatment_plan && (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  <i className="bi bi-journal-plus" />
                  إنشاء خطة علاجية
                </button>
              )}
              
              {canPerformActions && (
                <>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100"
                  >
                    <i className="bi bi-arrow-repeat" />
                    تحويل لوكيل المدرسة
                  </button>
                  
                  <button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <i className="bi bi-check2-circle" />
                    إكمال الإحالة
                  </button>
                </>
              )}
              
              <button
                onClick={() => setShowNoteModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <i className="bi bi-sticky" />
                إضافة ملاحظة
              </button>
            </div>
          </div>
          
          {/* Parent Notification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                referral.parent_notified ? 'bg-green-100' : 'bg-slate-100'
              }`}>
                <i className={`bi ${referral.parent_notified ? 'bi-check2-circle text-green-600' : 'bi-bell text-slate-500'}`} />
              </div>
              <div>
                <p className="font-medium text-slate-900">إشعار ولي الأمر</p>
                <p className="text-xs text-slate-500">
                  {referral.parent_notified 
                    ? `تم ${new Date(referral.parent_notified_at!).toLocaleDateString('ar-SA')}`
                    : 'لم يتم الإشعار'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Documents */}
          {referral.documents && referral.documents.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">المستندات</h3>
              
              <div className="space-y-2">
                {referral.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <i className="bi bi-file-earmark-text text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.document_type_label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePrintDocument(doc.id)}
                      className="text-sm text-sky-600 hover:text-sky-800"
                    >
                      <i className="bi bi-printer" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Open Case Modal */}
      {showCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">فتح حالة جديدة</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع الحالة</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {CASE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان الحالة</label>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="أدخل عنوان الحالة..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  rows={3}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCaseModal(false); setCaseTitle(''); setCaseNotes(''); }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleOpenCase}
                disabled={!caseTitle.trim() || openCaseMutation.isPending}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                فتح الحالة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">إنشاء خطة علاجية</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">عنوان الخطة</label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="أدخل عنوان الخطة..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الأهداف</label>
                <textarea
                  value={planObjectives}
                  onChange={(e) => setPlanObjectives(e.target.value)}
                  rows={3}
                  placeholder="أهداف الخطة العلاجية..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={planEndDate}
                    onChange={(e) => setPlanEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { 
                  setShowPlanModal(false); 
                  setPlanTitle(''); 
                  setPlanObjectives('');
                  setPlanStartDate('');
                  setPlanEndDate('');
                  setPlanNotes('');
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={!planTitle.trim() || !planObjectives.trim() || !planStartDate || !planEndDate || createPlanMutation.isPending}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                إنشاء الخطة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">إضافة ملاحظة</h3>
            
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowNoteModal(false); setNoteText(''); }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || noteMutation.isPending}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">تحويل لوكيل المدرسة</h3>
            
            <p className="text-sm text-slate-600 mb-4">
              سيتم تحويل هذه الإحالة إلى وكيل المدرسة للمتابعة
            </p>
            
            <textarea
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="سبب التحويل..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowTransferModal(false); setTransferNotes(''); }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferNotes.trim() || transferMutation.isPending}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                تحويل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
