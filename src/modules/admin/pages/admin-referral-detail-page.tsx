import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  useAdminReferralDetailQuery,
  useReceiveReferralMutation,
  useAssignReferralMutation,
  useTransferReferralMutation,
  useRecordViolationMutation,
  useCompleteReferralMutation,
  useAddReferralNoteMutation,
  useGenerateDocumentMutation,
  useNotifyParentMutation,
  useDeleteReferralMutation,
} from '../referrals/hooks'
import type { ReferralStatus, ReferralTargetRole } from '../referrals/types'
import { useBehaviorStore } from '../behavior/store/use-behavior-store'
import { useBehaviorConfigStore } from '../behavior/store/use-behavior-config-store'
import { ViolationBadge } from '../behavior/components/violation-badge'
import { BEHAVIOR_DEGREE_OPTIONS, BEHAVIOR_LOCATIONS } from '../behavior/constants'
import type { BehaviorDegree, BehaviorProcedureDefinition } from '../behavior/types'
import type { CreateBehaviorViolationPayload } from '../behavior/api'
import { useToast } from '@/shared/feedback/use-toast'
import { CheckCircle, ChevronLeft, ChevronRight, X, ExternalLink, Trash2 } from 'lucide-react'
import { DocumentPreviewModal } from '../referrals/components/document-preview-modal'
import { CaseFormModal } from '../referrals/components/CaseFormModal'
import { TreatmentPlanFormModal } from '../referrals/components/TreatmentPlanFormModal'
import { useAuthStore } from '@/modules/auth/store/auth-store'

type ViolationRecordStep = 1 | 2 | 3 | 4

const VIOLATION_RECORD_STEPS: { id: ViolationRecordStep; label: string }[] = [
  { id: 1, label: 'نوع المخالفة' },
  { id: 2, label: 'تفاصيل الحالة' },
  { id: 3, label: 'الإجراءات المقترحة' },
  { id: 4, label: 'المراجعة والتأكيد' },
]

const clampViolationStep = (value: number): ViolationRecordStep =>
  Math.min(4, Math.max(1, value)) as ViolationRecordStep

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

const DOCUMENT_TYPES = [
  { value: 'referral_form', label: 'نموذج الإحالة' },
  { value: 'teacher_to_admin', label: 'تحويل معلم إلى إدارة' },
  { value: 'admin_to_counselor', label: 'تحويل إدارة إلى موجه' },
  { value: 'violation_record', label: 'محضر مخالفة' },
  { value: 'parent_notification', label: 'إشعار ولي أمر' },
]

export function AdminReferralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: referral, isLoading, error, refetch } = useAdminReferralDetailQuery(Number(id) || 0)

  const receiveMutation = useReceiveReferralMutation()
  const assignMutation = useAssignReferralMutation()
  const transferMutation = useTransferReferralMutation()
  const violationMutation = useRecordViolationMutation()
  const completeMutation = useCompleteReferralMutation()
  const noteMutation = useAddReferralNoteMutation()
  const documentMutation = useGenerateDocumentMutation()
  const parentNotifyMutation = useNotifyParentMutation()
  const deleteMutation = useDeleteReferralMutation()

  const toast = useToast()
  const user = useAuthStore((state) => state.user)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<{ html: string; title: string } | null>(null)
  const [showParentMessageModal, setShowParentMessageModal] = useState(false)
  const [parentMessageText, setParentMessageText] = useState('')
  const [meetingDate, setMeetingDate] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [enableReply, setEnableReply] = useState(false)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false)

  // تحديد ما إذا كانت الإحالة محولة للموجه الطلابي
  // هذه الإحالات يمكن إنشاء دراسة حالة وخطة علاجية منها (سواء ضعف دراسي أو مخالفة سلوكية)
  const canCreateCaseOrPlan = referral?.target_role === 'counselor'
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null)
  const [transferTarget, setTransferTarget] = useState<ReferralTargetRole>('counselor')
  const [noteText, setNoteText] = useState('')
  const [selectedDocType, setSelectedDocType] = useState('')

  // حالة نموذج المخالفة السلوكية (نظام الخطوات الكامل)
  const [violationRecordStep, setViolationRecordStep] = useState<ViolationRecordStep>(1)
  const [selectedDegree, setSelectedDegree] = useState<BehaviorDegree | null>(null)
  const [selectedViolationType, setSelectedViolationType] = useState('')
  const [violationDetails, setViolationDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    description: '',
  })
  const [sendParentMessage, setSendParentMessage] = useState(false)
  const [parentMessage, setParentMessage] = useState('')

  // Behavior stores
  const violations = useBehaviorStore((state) => state.violations)
  const fetchViolations = useBehaviorStore((state) => state.fetchViolations)
  const createViolations = useBehaviorStore((state) => state.createViolations)
  const isCreatingViolation = useBehaviorStore((state) => state.isCreating)

  const loadConfig = useBehaviorConfigStore((state) => state.loadConfig)
  const loadViolationTypes = useBehaviorConfigStore((state) => state.loadViolationTypes)
  const loadProcedures = useBehaviorConfigStore((state) => state.loadProcedures)
  const getViolationsForDegree = useBehaviorConfigStore((state) => state.getViolationsForDegree)
  const getProceduresForDegree = useBehaviorConfigStore((state) => state.getProceduresForDegree)
  const isConfigLoading = useBehaviorConfigStore((state) => state.isLoading)

  // Load behavior config when modal opens
  useEffect(() => {
    if (showViolationModal) {
      loadConfig()
      loadViolationTypes()
      loadProcedures()
      fetchViolations()
    }
  }, [showViolationModal, loadConfig, loadViolationTypes, loadProcedures, fetchViolations])

  // الحصول على أنواع المخالفات والإجراءات للدرجة المختارة
  const availableViolations = selectedDegree ? getViolationsForDegree(selectedDegree) : []
  const availableProcedures = selectedDegree ? getProceduresForDegree(selectedDegree) : []

  // حساب التكرار للطالب
  const studentViolationOccurrence = useMemo(() => {
    if (!referral?.student?.id || !selectedDegree || !selectedViolationType) return 1

    const studentId = String(referral.student.id)
    const occurrences = violations.filter(
      (violation) =>
        violation.studentId === studentId &&
        violation.degree === selectedDegree &&
        violation.type === selectedViolationType,
    ).length

    return occurrences + 1
  }, [referral?.student?.id, selectedDegree, selectedViolationType, violations])

  // الحصول على الإجراء المناسب بناءً على التكرار
  const targetProcedure = useMemo<BehaviorProcedureDefinition | null>(() => {
    if (!selectedDegree || availableProcedures.length === 0) return null

    let procedure = availableProcedures.find(p => p.repetition === studentViolationOccurrence || p.step === studentViolationOccurrence)
    if (!procedure) {
      procedure = availableProcedures[availableProcedures.length - 1]
    }

    return procedure || null
  }, [selectedDegree, availableProcedures, studentViolationOccurrence])

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

  const handleAssign = async () => {
    if (!referral || !selectedAssignee) return
    try {
      await assignMutation.mutateAsync({
        id: referral.id,
        payload: { user_id: selectedAssignee },
      })
      setShowAssignModal(false)
      setSelectedAssignee(null)
      refetch()
    } catch (err) {
      console.error('Error assigning referral:', err)
      alert('حدث خطأ أثناء تعيين الإحالة')
    }
  }

  const handleTransfer = async () => {
    if (!referral || !noteText.trim()) return
    try {
      await transferMutation.mutateAsync({
        id: referral.id,
        payload: { target_role: transferTarget, notes: noteText },
      })
      setShowTransferModal(false)
      setNoteText('')
      refetch()
    } catch (err) {
      console.error('Error transferring referral:', err)
      alert('حدث خطأ أثناء تحويل الإحالة')
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

  // دوال نموذج المخالفة السلوكية (نظام الخطوات)
  const handleViolationNextStep = () => {
    if (violationRecordStep === 1) {
      if (!selectedDegree) {
        toast({ type: 'error', title: 'حدد درجة المخالفة' })
        return
      }
      if (!selectedViolationType) {
        toast({ type: 'error', title: 'اختر نوع المخالفة' })
        return
      }
    }
    if (violationRecordStep === 2 && !violationDetails.location) {
      toast({ type: 'error', title: 'اختر موقع المخالفة' })
      return
    }
    setViolationRecordStep((prev) => clampViolationStep(prev + 1))
  }

  const handleViolationPrevStep = () => {
    setViolationRecordStep((prev) => clampViolationStep(prev - 1))
  }

  const resetViolationForm = () => {
    setViolationRecordStep(1)
    setSelectedDegree(null)
    setSelectedViolationType('')
    setViolationDetails({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      location: '',
      description: '',
    })
    setSendParentMessage(false)
    setParentMessage('')
  }

  const handleOpenViolationModal = () => {
    // تعبئة البيانات من الإحالة
    if (referral) {
      setViolationDetails(prev => ({
        ...prev,
        description: referral.description || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
      }))
    }
    setShowViolationModal(true)
  }

  const handleCloseViolationModal = () => {
    setShowViolationModal(false)
    resetViolationForm()
  }

  const handleSubmitViolation = async () => {
    if (!referral || !selectedDegree || !selectedViolationType) {
      toast({ type: 'error', title: 'أكمل بيانات المخالفة قبل الحفظ' })
      return
    }

    if (!referral.student?.id) {
      toast({ type: 'error', title: 'لم يتم العثور على بيانات الطالب' })
      return
    }

    try {
      // استخدام نفس API الخاصة بنظام السلوك لإنشاء المخالفة
      const payload: CreateBehaviorViolationPayload = {
        studentIds: [Number(referral.student.id)],
        reportedById: referral.referred_by?.id || referral.referred_by_user_id,
        degree: selectedDegree,
        type: selectedViolationType,
        date: violationDetails.date,
        time: violationDetails.time || '',
        location: violationDetails.location,
        description: violationDetails.description || `تفاصيل المخالفة: ${selectedViolationType}`,
      }

      const createdViolations = await createViolations(payload)

      if (createdViolations && createdViolations.length > 0) {
        const violationId = createdViolations[0].id

        // ربط المخالفة بالإحالة عبر API الإحالات
        try {
          await violationMutation.mutateAsync({
            id: referral.id,
            payload: {
              degree: selectedDegree,
              violation_type: selectedViolationType,
              description: violationDetails.description || referral.description,
              behavior_violation_id: violationId, // UUID string
              send_parent_message: sendParentMessage,
              parent_message: parentMessage,
            },
          })
        } catch (linkError) {
          // المخالفة تم إنشاؤها بنجاح، لكن الربط فشل - نعرض نجاح جزئي
          console.warn('Violation created but linking failed:', linkError)
        }

        toast({ type: 'success', title: 'تم رصد المخالفة بنجاح وتم ربطها بسجل المخالفات' })
        handleCloseViolationModal()
        refetch()
      }
    } catch (error) {
      console.error('Error creating violation:', error)
      toast({ type: 'error', title: 'حدث خطأ أثناء حفظ المخالفة' })
    }
  }

  const handleAddNote = async () => {
    if (!referral || !noteText.trim()) return
    try {
      await noteMutation.mutateAsync({ id: referral.id, note: noteText })
      setShowNoteModal(false)
      setNoteText('')
      refetch()
    } catch (err) {
      console.error('Error adding note:', err)
      alert('حدث خطأ أثناء إضافة الملاحظة')
    }
  }

  const handleGenerateDocument = async () => {
    if (!referral || !selectedDocType) return
    try {
      const result = await documentMutation.mutateAsync({
        id: referral.id,
        documentType: selectedDocType,
      })
      setShowDocumentModal(false)
      setSelectedDocType('')

      // عرض المستند في Modal عائم
      if (result.content) {
        const docTitle = DOCUMENT_TYPES.find(d => d.value === selectedDocType)?.label || 'مستند'
        setPreviewDocument({ html: result.content, title: docTitle })
        setShowDocumentPreview(true)
      }

      toast({ type: 'success', title: 'تم إنشاء المستند بنجاح' })
      refetch()
    } catch (err) {
      console.error('Error generating document:', err)
      alert('حدث خطأ أثناء إنشاء المستند')
    }
  }

  const handleNotifyParent = () => {
    setShowParentMessageModal(true)
  }

  const buildCompleteMessage = () => {
    if (!referral) return ''

    const studentName = referral.student?.name || 'الطالب'
    const schoolName = user?.school?.name || 'المدرسة'

    let message = `ولي أمر الطالب: ${studentName}\n\n`
    message += parentMessageText.trim() || 'اكتب رسالتك هنا...'

    if (meetingDate) {
      const date = new Date(meetingDate)
      const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' })
      const formattedDate = date.toLocaleDateString('ar-SA')
      message += `\n\nنرجو منكم الحضور إلى المدرسة يوم ${dayName} بتاريخ ${formattedDate}`
    }

    // إضافة رابط الرد قبل اسم المدرسة إذا تم تفعيله
    if (enableReply) {
      message += '\n\n📩 للرد على هذه الرسالة:\n[سيتم إضافة الرابط تلقائياً عند الإرسال]'
    }

    message += `\n\nإدارة ${schoolName}`

    return message
  }

  const handleSendParentNotification = async () => {
    if (!referral || !parentMessageText.trim()) {
      toast({ type: 'error', title: 'اكتب رسالة أولاً' })
      return
    }

    const completeMessage = buildCompleteMessage()

    try {
      await parentNotifyMutation.mutateAsync({
        id: referral.id,
        message: completeMessage,
        enable_reply: enableReply
      })
      setShowParentMessageModal(false)
      setParentMessageText('')
      setMeetingDate(null)
      setEnableReply(false)
      refetch()
      toast({ type: 'success', title: 'تم إرسال الإشعار بنجاح' })
    } catch (err) {
      toast({ type: 'error', title: 'حدث خطأ في الإرسال' })
    }
  }

  const handleDeleteReferral = async () => {
    if (!referral) return
    try {
      await deleteMutation.mutateAsync(referral.id)
      toast({ type: 'success', title: 'تم حذف الإحالة بنجاح' })
      navigate('/admin/referrals')
    } catch (err) {
      console.error('Error deleting referral:', err)
      toast({ type: 'error', title: 'حدث خطأ أثناء حذف الإحالة' })
    }
    setShowDeleteConfirm(false)
  }

  const handlePrintDocument = async (documentId: number) => {
    const document = referral?.documents?.find(d => d.id === documentId)
    if (!document) return

    try {
      // جلب HTML المستند من API
      const token = window.localStorage.getItem('auth_token')
      const url = `${import.meta.env.VITE_API_BASE_URL || 'https://api.brqq.site/api'}/admin/referrals/${id}/documents/${documentId}?token=${token}`

      const response = await fetch(url)
      const data = await response.json()

      const html = data.data?.content || data.content

      if (html) {
        setPreviewDocument({ html, title: document.title })
        setShowDocumentPreview(true)
      } else {
        toast({ type: 'error', title: 'المستند فارغ' })
      }
    } catch (error) {
      console.error('Error loading document:', error)
      toast({ type: 'error', title: 'حدث خطأ في تحميل المستند' })
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
  // يمكن تنفيذ الإجراءات فقط بعد استلام الإحالة (لا يمكن العمل على إحالة pending)
  const canPerformActions = ['received', 'in_progress'].includes(referral.status)
  // هل الإحالة معلقة وتحتاج استلام؟
  const needsReceiving = referral.status === 'pending'

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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                <i className="bi bi-person text-3xl text-sky-600" />
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">نوع الإحالة</p>
                <span className={`inline-flex items-center gap-1 mt-1 rounded px-2 py-0.5 text-sm font-medium ${referral.referral_type === 'academic_weakness'
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

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">المحيل</p>
              <p className="font-medium text-slate-900">
                <i className="bi bi-person ml-1 text-slate-400" />
                {referral.referred_by?.name || 'غير محدد'}
              </p>
            </div>

            {referral.assigned_to && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">المكلف بالمتابعة</p>
                <p className="font-medium text-slate-900">
                  <i className="bi bi-person-check ml-1 text-green-600" />
                  {referral.assigned_to.name}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">وصف الحالة</p>
              <p className="text-slate-700 whitespace-pre-wrap">{referral.description}</p>
            </div>
          </div>

          {/* Linked Entities */}
          {referral.linked_entities && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-900">الكيانات المرتبطة</h3>

              {referral.linked_entities.behavior_violation && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <i className="bi bi-exclamation-triangle text-red-600" />
                    <div>
                      <p className="font-medium text-slate-900">مخالفة سلوكية</p>
                      <p className="text-sm text-slate-500">{referral.linked_entities.behavior_violation.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {referral.linked_entities.student_case && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <i className="bi bi-folder text-purple-600" />
                    <div>
                      <p className="font-medium text-slate-900">حالة طالب</p>
                      <p className="text-sm text-slate-500">
                        {referral.linked_entities.student_case.case_number} - {referral.linked_entities.student_case.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/student-cases/${referral.linked_entities!.student_case!.id}`)}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    عرض
                  </button>
                </div>
              )}

              {referral.linked_entities.treatment_plan && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-3">
                    <i className="bi bi-journal-text text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">خطة علاجية</p>
                      <p className="text-sm text-slate-500">
                        {referral.linked_entities.treatment_plan.plan_number} - {referral.linked_entities.treatment_plan.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/treatment-plans/${referral.linked_entities!.treatment_plan!.id}`)}
                    className="text-sm text-green-600 hover:text-green-800"
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
                      <div className={`absolute right-0 -mr-0.5 flex h-5 w-5 items-center justify-center rounded-full ${index === 0 ? 'bg-sky-500' : 'bg-slate-300'
                        }`}>
                        <i className={`${ACTION_ICONS[log.action] || 'bi-record'} text-xs text-white`} />
                      </div>

                      <div className="flex-1 pr-4">
                        <p className="font-medium text-slate-900">{log.action_label}</p>
                        {log.notes && (
                          <p className="text-sm text-slate-700 mt-0.5 bg-slate-50 px-2 py-1 rounded">{log.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          {log.performed_by && (
                            <span>بواسطة: {log.performed_by.name}</span>
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

            <div className="space-y-3">
              {needsReceiving && (
                <>
                  {/* تنبيه بأن الإحالة تحتاج استلام */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <i className="bi bi-exclamation-triangle text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">الإحالة معلقة</p>
                        <p className="text-amber-600">يجب استلام الإحالة أولاً قبل تنفيذ أي إجراءات</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleReceive}
                    disabled={receiveMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <i className="bi bi-check2" />
                    استلام الإحالة
                  </button>
                </>
              )}

              {/* زر فتح المخالفة السلوكية - يظهر دائماً إذا كانت مرتبطة بمخالفة */}
              {referral.referral_type === 'behavioral_violation' && referral.behavior_violation_id && (
                <Link
                  to={`/admin/behavior/${referral.behavior_violation_id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح المخالفة السلوكية
                </Link>
              )}

              {canPerformActions && (
                <>
                  {/* زر تنفيذ مخالفة سلوكية - يظهر فقط إذا لم تكن مرتبطة بمخالفة */}
                  {referral.referral_type === 'behavioral_violation' && !referral.behavior_violation_id && (
                    <button
                      onClick={handleOpenViolationModal}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <i className="bi bi-exclamation-triangle" />
                      تنفيذ مخالفة سلوكية
                    </button>
                  )}

                  {/* صف: تعيين مسؤول + تحويل الإحالة */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${referral.assigned_to
                        ? 'border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                    >
                      <i className={`bi ${referral.assigned_to ? 'bi-person-gear' : 'bi-person-plus'}`} />
                      {referral.assigned_to ? 'تغيير المسؤول' : 'تعيين مسؤول'}
                    </button>

                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100"
                    >
                      <i className="bi bi-arrow-repeat" />
                      تحويل الإحالة
                    </button>
                  </div>

                  {/* صف: إكمال الإحالة + إضافة ملاحظة */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleComplete}
                      disabled={completeMutation.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <i className="bi bi-check2-circle" />
                      إكمال الإحالة
                    </button>

                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <i className="bi bi-sticky" />
                      إضافة ملاحظة
                    </button>
                  </div>

                  {/* صف: إنشاء مستند + إشعار ولي الأمر */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowDocumentModal(true)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <i className="bi bi-file-earmark-plus" />
                      إنشاء مستند
                    </button>

                    {!referral.parent_notified ? (
                      <button
                        onClick={handleNotifyParent}
                        disabled={parentNotifyMutation.isPending}
                        className="flex items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                      >
                        <i className="bi bi-bell" />
                        إشعار ولي الأمر
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-medium text-green-700">
                        <i className="bi bi-check2-circle" />
                        تم الإشعار
                      </div>
                    )}
                  </div>

                  {/* صف: دراسة حالة + خطة علاجية (يظهر للإحالات من نوع ضعف دراسي المحولة للموجه الطلابي) */}
                  {canCreateCaseOrPlan && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      {!referral.student_case_id ? (
                        <button
                          onClick={() => setShowCaseModal(true)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          <i className="bi bi-folder-plus" />
                          دراسة حالة
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/admin/student-cases/${referral.student_case_id}`)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                        >
                          <i className="bi bi-folder-check" />
                          فتح الحالة
                        </button>
                      )}

                      {!referral.treatment_plan_id ? (
                        <button
                          onClick={() => setShowTreatmentPlanModal(true)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <i className="bi bi-journal-medical" />
                          خطة علاجية
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/admin/treatment-plans/${referral.treatment_plan_id}`)}
                          className="flex items-center justify-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          <i className="bi bi-journal-check" />
                          فتح الخطة
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* زر حذف الإحالة */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                حذف الإحالة
              </button>
            </div>
          </div>

          {/* Parent Notification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${referral.parent_notified ? 'bg-green-100' : 'bg-slate-100'
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">تعيين مسؤول</h3>

            <select
              value={selectedAssignee ?? ''}
              onChange={(e) => setSelectedAssignee(Number(e.target.value) || null)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none mb-4"
            >
              <option value="">اختر المسؤول...</option>
              {referral.available_assignees && referral.available_assignees.length > 0 ? (
                referral.available_assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.role_label ? `(${user.role_label})` : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>لا يوجد مسؤولين متاحين</option>
              )}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAssignee || assignMutation.isPending}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                تعيين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">تحويل الإحالة</h3>

            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value as ReferralTargetRole)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none mb-4"
            >
              <option value="counselor">الموجه الطلابي</option>
              <option value="vice_principal">وكيل المدرسة</option>
              <option value="committee">اللجنة السلوكية</option>
            </select>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="سبب التحويل..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowTransferModal(false); setNoteText(''); }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleTransfer}
                disabled={!noteText.trim() || transferMutation.isPending}
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                تحويل
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
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none mb-4"
            />

            <div className="flex gap-3">
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

      {/* Violation Modal - نموذج الرصد الموحد */}
      {showViolationModal && referral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
              <div>
                <p className="text-xs font-semibold text-red-600">رصد مخالفة سلوكية</p>
                <h2 className="text-xl font-bold text-slate-900">نموذج الرصد الموحد</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={resetViolationForm} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                  إعادة التعيين
                </button>
                <button
                  type="button"
                  onClick={handleCloseViolationModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              {/* مؤشر الخطوات */}
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/30">
                <div className="flex items-center justify-center gap-1.5">
                  {VIOLATION_RECORD_STEPS.map((step, index) => {
                    const isActive = step.id === violationRecordStep
                    const isDone = step.id < violationRecordStep
                    return (
                      <div key={step.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViolationRecordStep(step.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${isActive
                            ? 'bg-red-600 text-white shadow-sm'
                            : isDone
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          {step.id}
                        </button>
                        <span className={`text-[11px] font-semibold ${isActive ? 'text-red-700' : 'text-muted'}`}>
                          {step.label}
                        </span>
                        {index !== VIOLATION_RECORD_STEPS.length - 1 && (
                          <span className="h-px w-4 bg-slate-200 mx-0.5" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* معلومات الطالب الثابتة */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <i className="bi bi-person text-2xl text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{referral.student?.name}</p>
                    <p className="text-sm text-slate-500">
                      {referral.student?.student_number} • {referral.student?.classroom?.name}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500">المُبلِغ (المحيل)</p>
                    <p className="font-medium text-slate-900">{referral.referred_by?.name || 'غير محدد'}</p>
                  </div>
                </div>
              </div>

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* الخطوة 1: نوع المخالفة */}
                {violationRecordStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">اختر درجة المخالفة</p>
                      <div className="grid gap-3 md:grid-cols-4">
                        {BEHAVIOR_DEGREE_OPTIONS.map((degree) => (
                          <button
                            key={degree}
                            type="button"
                            onClick={() => {
                              setSelectedDegree(degree)
                              setSelectedViolationType('')
                            }}
                            className={`rounded-2xl border px-3 py-4 transition ${selectedDegree === degree
                              ? 'border-red-500 bg-red-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-red-300'
                              }`}
                          >
                            <ViolationBadge degree={degree} size="md" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDegree && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">نوع المخالفة</p>
                        {isConfigLoading ? (
                          <div className="py-8 text-center text-sm text-slate-500">جاري تحميل أنواع المخالفات...</div>
                        ) : availableViolations.length > 0 ? (
                          <select
                            value={selectedViolationType}
                            onChange={(event) => setSelectedViolationType(event.target.value)}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <option value="" disabled>اختر نوع المخالفة</option>
                            {availableViolations.map((violation) => (
                              <option key={violation} value={violation}>{violation}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="py-4 text-center text-sm text-slate-500 bg-slate-50 rounded-xl">
                            لا توجد أنواع مخالفات محددة لهذه الدرجة
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDegree && selectedViolationType && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="bi bi-info-circle" />
                          <span className="font-semibold">معلومة مهمة</span>
                        </div>
                        <p>
                          هذه هي المخالفة رقم <span className="font-bold text-amber-900">{studentViolationOccurrence}</span> للطالب من نفس النوع والدرجة.
                          {targetProcedure && (
                            <span> سيتم تطبيق إجراء: <span className="font-bold">{targetProcedure.title}</span></span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* الخطوة 2: تفاصيل الحالة */}
                {violationRecordStep === 2 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">التاريخ</label>
                      <input
                        type="date"
                        value={violationDetails.date}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, date: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الوقت</label>
                      <input
                        type="time"
                        value={violationDetails.time}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, time: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الموقع</label>
                      <select
                        value={violationDetails.location}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, location: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      >
                        <option value="" disabled>اختر موقع المخالفة</option>
                        {BEHAVIOR_LOCATIONS.map((location) => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">المبلغ عن الحالة</label>
                      <input
                        type="text"
                        value={referral.referred_by?.name || 'غير محدد'}
                        disabled
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-600"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">الوصف التفصيلي</label>
                      <textarea
                        value={violationDetails.description}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, description: event.target.value }))}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        placeholder="أدخل وصفاً مختصراً للحالة"
                      />
                    </div>
                  </div>
                )}

                {/* الخطوة 3: الإجراءات المقترحة */}
                {violationRecordStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-sm text-sky-700">
                      يتم تحديد الإجراء تلقائياً بناءً على سجل الطالب. يمكن تحديث حالة التنفيذ لاحقاً من صفحة تفاصيل المخالفة.
                    </div>

                    {targetProcedure && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <span className="font-bold text-red-600">{targetProcedure.step}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{targetProcedure.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{targetProcedure.description}</p>

                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-4">
                      <p className="text-sm font-semibold text-slate-700">الإجراءات الإضافية</p>

                      <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={sendParentMessage}
                          onChange={(e) => setSendParentMessage(e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-700">إرسال إشعار لولي الأمر</span>
                          <p className="text-xs text-slate-500">سيتم إرسال رسالة واتساب لولي الأمر</p>
                        </div>
                      </label>

                      {sendParentMessage && (
                        <textarea
                          value={parentMessage}
                          onChange={(e) => setParentMessage(e.target.value)}
                          placeholder="نص الرسالة لولي الأمر (اختياري - سيتم استخدام نص افتراضي)..."
                          rows={2}
                          className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm focus:border-sky-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* الخطوة 4: المراجعة والتأكيد */}
                {violationRecordStep === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                      راجع البيانات التالية قبل الحفظ النهائي. سيتم تسجيل المخالفة في سجل المخالفات وربطها بهذه الإحالة.
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700">بيانات الطالب</h3>
                        <div className="mt-3 space-y-2 text-sm text-muted">
                          <p>
                            <span className="font-semibold text-slate-900">الاسم:</span> {referral.student?.name}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">الفصل:</span> {referral.student?.classroom?.name}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">المخالفة رقم:</span> {studentViolationOccurrence}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700">تفاصيل المخالفة</h3>
                        <div className="mt-3 space-y-2 text-sm text-muted">
                          {selectedDegree && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">الدرجة:</span>
                              <ViolationBadge degree={selectedDegree} size="sm" />
                            </div>
                          )}
                          <p>
                            <span className="font-semibold text-slate-900">النوع:</span> {selectedViolationType}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">التاريخ:</span> {violationDetails.date}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">الوقت:</span> {violationDetails.time}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">الموقع:</span> {violationDetails.location}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">المبلغ:</span> {referral.referred_by?.name || 'غير محدد'}
                          </p>
                        </div>
                      </div>

                      {targetProcedure && (
                        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                          <h3 className="text-sm font-semibold text-slate-700">الإجراء المطبق</h3>
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="font-semibold text-slate-900">{targetProcedure.title}</div>
                            <p className="mt-1 text-xs text-muted">{targetProcedure.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار التنقل */}
              <div className="border-t border-slate-200 px-6 py-3 bg-white rounded-b-3xl">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleViolationPrevStep}
                    className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                    disabled={violationRecordStep === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </button>

                  {violationRecordStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleViolationNextStep}
                      className="flex items-center gap-1 px-6 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitViolation}
                      disabled={isCreatingViolation}
                      className="flex items-center gap-2 px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isCreatingViolation ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          حفظ المخالفة
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">إنشاء مستند</h3>

            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none mb-4"
            >
              <option value="">اختر نوع المستند...</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDocumentModal(false); setSelectedDocType(''); }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerateDocument}
                disabled={!selectedDocType || documentMutation.isPending}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500">هل أنت متأكد من حذف هذه الإحالة؟</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 mb-4">
              <p className="text-sm text-amber-800">
                <i className="bi bi-exclamation-triangle ml-1" />
                سيتم حذف الإحالة وجميع السجلات والمستندات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteReferral}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Message Modal */}
      {showParentMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">إشعار ولي الأمر</h3>

            {/* Message Preview */}
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {buildCompleteMessage()}
              </div>
            </div>

            {/* Editable Message Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                محتوى الرسالة
              </label>
              <textarea
                value={parentMessageText}
                onChange={(e) => setParentMessageText(e.target.value)}
                className="w-full min-h-[120px] rounded-lg border border-slate-300 p-3 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                placeholder="اكتب رسالتك هنا..."
              />
            </div>

            {/* Meeting Date and Reply Options Section */}
            <div className="mb-4 flex gap-2">
              {!meetingDate ? (
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                >
                  <i className="bi bi-calendar-plus" />
                  إضافة موعد
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    onClick={() => setMeetingDate(null)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              )}

              {/* Enable Reply Button */}
              <button
                onClick={() => setEnableReply(!enableReply)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  enableReply
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <i className={`bi ${enableReply ? 'bi-check-circle-fill' : 'bi-reply'}`} />
                استقبال الرد
              </button>
            </div>

            {/* Date Picker Modal */}
            {showDatePicker && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
                <div className="rounded-xl bg-white p-4 shadow-xl">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">اختر تاريخ الموعد</h4>
                  <input
                    type="date"
                    onChange={(e) => {
                      setMeetingDate(e.target.value)
                      setShowDatePicker(false)
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={parentMessageText}
              onChange={(e) => setParentMessageText(e.target.value)}
              className="w-full min-h-[150px] rounded-lg border border-slate-200 p-3 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="اكتب رسالة لولي أمر الطالب..."
              style={{ display: 'none' }}
            />

            <div className="text-xs text-slate-500 mt-2">
              سيتم إرسال الرسالة عبر WhatsApp إلى رقم ولي الأمر
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSendParentNotification}
                disabled={parentNotifyMutation.isPending || !parentMessageText.trim()}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {parentNotifyMutation.isPending ? (
                  <i className="bi bi-arrow-repeat animate-spin" />
                ) : (
                  'إرسال الإشعار'
                )}
              </button>
              <button
                onClick={() => {
                  setShowParentMessageModal(false)
                  setParentMessageText('')
                  setMeetingDate(null)
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={showDocumentPreview}
          onClose={() => {
            setShowDocumentPreview(false)
            setPreviewDocument(null)
          }}
          documentHtml={previewDocument.html}
          documentTitle={previewDocument.title}
        />
      )}

      {/* Case Study Modal */}
      {referral && showCaseModal && (
        <CaseFormModal
          referral={referral}
          isOpen={showCaseModal}
          onClose={() => setShowCaseModal(false)}
          onSuccess={(caseData) => {
            setShowCaseModal(false)
            toast({ type: 'success', title: `تم إنشاء دراسة الحالة: ${caseData.case_number}` })
            refetch()
          }}
        />
      )}

      {/* Treatment Plan Modal */}
      {referral && showTreatmentPlanModal && (
        <TreatmentPlanFormModal
          referral={referral}
          isOpen={showTreatmentPlanModal}
          onClose={() => setShowTreatmentPlanModal(false)}
          onSuccess={(planData) => {
            setShowTreatmentPlanModal(false)
            toast({ type: 'success', title: `تم إنشاء الخطة العلاجية: ${planData.plan_number}` })
            refetch()
          }}
        />
      )}
    </div>
  )
}
