import { useParams, useNavigate } from 'react-router-dom'
import { useReferralDetailQuery, useCancelReferralMutation, useDownloadDocumentMutation } from '../referrals/hooks'
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

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: referral, isLoading, error } = useReferralDetailQuery(Number(id) || 0)
  const cancelMutation = useCancelReferralMutation()
  const documentMutation = useDownloadDocumentMutation()
  
  const handleCancel = async () => {
    if (!referral) return
    if (window.confirm('هل أنت متأكد من إلغاء هذه الإحالة؟')) {
      try {
        await cancelMutation.mutateAsync(referral.id)
        navigate('/teacher/referrals', { replace: true })
      } catch (err) {
        console.error('Error cancelling referral:', err)
        alert('حدث خطأ أثناء إلغاء الإحالة')
      }
    }
  }
  
  const handlePrint = async (documentId: number) => {
    if (!id) return
    try {
      const result = await documentMutation.mutateAsync({
        referralId: Number(id),
        documentId,
      })
      
      // فتح المستند في نافذة جديدة وعرض الـ HTML
      const newWindow = window.open('', '_blank')
      if (newWindow && result.content) {
        newWindow.document.write(result.content)
        newWindow.document.close()
      }
    } catch (err) {
      console.error('Error loading document:', err)
      alert('حدث خطأ أثناء تحميل المستند')
    }
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
  
  return (
    <section className="space-y-6 pb-8">
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
      
      {/* Student Info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
            <i className="bi bi-person text-2xl text-sky-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">{referral.student?.name}</h2>
            <p className="text-sm text-slate-500">
              {referral.student?.student_number} • {referral.student?.classroom?.name}
            </p>
          </div>
        </div>
      </div>
      
      {/* Referral Details */}
      <div className="glass-card p-4 space-y-4">
        <h3 className="font-semibold text-slate-900">معلومات الإحالة</h3>
        
        <div className="grid grid-cols-2 gap-4">
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
            <p className="text-xs text-slate-500">الجهة المحول إليها</p>
            <p className="font-medium text-slate-900 mt-1">{referral.target_role_label}</p>
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
        
        {referral.assigned_to_user && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">تم تعيينها إلى</p>
            <p className="font-medium text-slate-900 mt-1">
              <i className="bi bi-person-check ml-1 text-green-600" />
              {referral.assigned_to_user.name}
            </p>
          </div>
        )}
        
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">وصف الحالة</p>
          <p className="text-slate-700 whitespace-pre-wrap">{referral.description}</p>
        </div>
      </div>
      
      {/* Workflow Timeline */}
      {referral.workflow_logs && referral.workflow_logs.length > 0 && (
        <div className="glass-card p-4 space-y-4">
          <h3 className="font-semibold text-slate-900">سجل الإجراءات</h3>
          
          <div className="relative pr-6">
            <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-slate-200" />
            
            <div className="space-y-4">
              {referral.workflow_logs.map((log, index) => (
                <div key={log.id} className="relative flex gap-3">
                  <div className={`absolute right-0 -mr-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                    index === 0 ? 'bg-sky-500' : 'bg-slate-300'
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
                      <span>{new Date(log.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Documents - المعلم يرى فقط المستندات الأساسية التي تُنشأ تلقائياً */}
      {referral.documents && referral.documents.length > 0 && (
        (() => {
          // فلترة المستندات للمعلم - يرى فقط المستندات الأساسية التلقائية
          // referral_form - نموذج الإحالة
          // teacher_to_admin - خطاب تحويل من معلم لإدارة (مخالفات سلوكية)
          // admin_to_counselor - خطاب تحويل من إدارة لموجه (ضعف دراسي)
          const teacherAllowedDocs = ['referral_form', 'teacher_to_admin', 'admin_to_counselor'];
          const visibleDocs = referral.documents.filter(doc => 
            teacherAllowedDocs.includes(doc.document_type)
          );
          
          if (visibleDocs.length === 0) return null;
          
          return (
            <div className="glass-card p-4 space-y-4">
              <h3 className="font-semibold text-slate-900">المستندات</h3>
              
              <div className="space-y-2">
                {visibleDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200">
                        <i className="bi bi-file-earmark-text text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.document_type_label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePrint(doc.id)}
                      className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-800"
                    >
                      <i className="bi bi-printer" />
                      طباعة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
      
      {/* Parent Notification Status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
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
                  ? `تم الإشعار في ${new Date(referral.parent_notified_at!).toLocaleDateString('ar-SA')}`
                  : 'لم يتم الإشعار بعد'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      {referral.can_cancel && (
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {cancelMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600" />
              جاري الإلغاء...
            </>
          ) : (
            <>
              <i className="bi bi-x-circle" />
              إلغاء الإحالة
            </>
          )}
        </button>
      )}
    </section>
  )
}
