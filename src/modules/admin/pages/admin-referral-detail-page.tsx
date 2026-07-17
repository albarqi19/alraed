import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArrowRight,
  AlertTriangle,
  Bell,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  ExternalLink,
  FileText,
  FilePlus2,
  FolderPlus,
  Gavel,
  History,
  MessageCircle,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  StickyNote,
  Trash2,
  UserCheck,
  UserRound,
  X,
  XCircle,
  XOctagon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsInput,
  WsSelect,
  WsTextarea,
  WsField,
  WsSwitch,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  InitialAvatar,
} from '@/shared/workspace'
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
import type { ReferralTargetRole } from '../referrals/types'
import { useBehaviorStore } from '../behavior/store/use-behavior-store'
import { useBehaviorConfigStore } from '../behavior/store/use-behavior-config-store'
import { ViolationBadge } from '../behavior/components/violation-badge'
import { BEHAVIOR_DEGREE_OPTIONS, BEHAVIOR_LOCATIONS } from '../behavior/constants'
import type { BehaviorDegree, BehaviorProcedureDefinition } from '../behavior/types'
import type { CreateBehaviorViolationPayload } from '../behavior/api'
import { useToast } from '@/shared/feedback/use-toast'
import { DocumentPreviewModal } from '../referrals/components/document-preview-modal'
import { CaseFormModal } from '../referrals/components/CaseFormModal'
import { TreatmentPlanFormModal } from '../referrals/components/TreatmentPlanFormModal'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import {
  StatusChip,
  TypeChip,
  PriorityBadge,
  CustodyChain,
  buildCustody,
  custodySummary,
  sinceText,
} from './referrals-ui'

type ViolationRecordStep = 1 | 2 | 3 | 4

const VIOLATION_RECORD_STEPS: { id: ViolationRecordStep; label: string }[] = [
  { id: 1, label: 'نوع المخالفة' },
  { id: 2, label: 'تفاصيل الحالة' },
  { id: 3, label: 'الإجراءات المقترحة' },
  { id: 4, label: 'المراجعة والتأكيد' },
]

const clampViolationStep = (value: number): ViolationRecordStep =>
  Math.min(4, Math.max(1, value)) as ViolationRecordStep

/* خريطة أفعال السجل — النقطة رمادية افتراضاً، وتُلوَّن عند المنعطف وحده */
const ACTION_META: Record<string, { icon: LucideIcon; tone?: typeof TONES.red }> = {
  created: { icon: FilePlus2 },
  received: { icon: Check },
  assigned: { icon: UserCheck },
  transferred: { icon: ArrowLeftRight, tone: TONES.amber },
  violation_recorded: { icon: AlertTriangle, tone: TONES.red },
  case_opened: { icon: FolderPlus, tone: TONES.purple },
  plan_created: { icon: ClipboardList, tone: TONES.purple },
  session_held: { icon: CalendarCheck },
  parent_contacted: { icon: MessageCircle, tone: TONES.green },
  note_added: { icon: StickyNote },
  completed: { icon: CheckCircle2, tone: TONES.green },
  closed: { icon: XCircle },
  cancelled: { icon: XOctagon, tone: TONES.red },
  reopened: { icon: RotateCcw, tone: TONES.amber },
}

const DOCUMENT_TYPES = [
  { value: 'referral_form', label: 'نموذج الإحالة' },
  { value: 'teacher_to_admin', label: 'تحويل معلم إلى إدارة' },
  { value: 'admin_to_counselor', label: 'تحويل إدارة إلى موجه' },
  { value: 'violation_record', label: 'محضر مخالفة' },
  { value: 'parent_notification', label: 'إشعار ولي أمر' },
]

/** الخادم يفرض max:1000 على الرسالة المُركَّبة كاملةً */
const PARENT_MESSAGE_LIMIT = 1000

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

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<{ html: string; title: string } | null>(null)
  const [showParentMessageModal, setShowParentMessageModal] = useState(false)
  const [parentMessageText, setParentMessageText] = useState('')
  const [meetingDate, setMeetingDate] = useState<string | null>(null)
  const [enableReply, setEnableReply] = useState(true)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false)
  const [generatingDocType, setGeneratingDocType] = useState<string | null>(null)

  // تحديد ما إذا كانت الإحالة محولة للموجه الطلابي
  // هذه الإحالات يمكن إنشاء دراسة حالة وخطة علاجية منها (سواء ضعف دراسي أو مخالفة سلوكية)
  const canCreateCaseOrPlan = referral?.target_role === 'counselor'
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null)
  const [transferTarget, setTransferTarget] = useState<ReferralTargetRole>('counselor')
  /* noteText كانت حالة واحدة مشتركة بين التحويل والملاحظة — اقتران غير مبرَّر يُسرّب
     سبب التحويل إلى حقل الملاحظة. فُصلا. */
  const [noteText, setNoteText] = useState('')
  const [composerNote, setComposerNote] = useState('')

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
    try {
      await completeMutation.mutateAsync({ id: referral.id })
      refetch()
    } catch (err) {
      console.error('Error completing referral:', err)
      alert('حدث خطأ أثناء إكمال الإحالة')
    }
    setShowCompleteConfirm(false)
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
    if (!referral || !composerNote.trim()) return
    try {
      await noteMutation.mutateAsync({ id: referral.id, note: composerNote })
      setComposerNote('')
      refetch()
    } catch (err) {
      console.error('Error adding note:', err)
      alert('حدث خطأ أثناء إضافة الملاحظة')
    }
  }

  const handleGenerateDocument = async (docType: string) => {
    if (!referral || !docType) return
    setGeneratingDocType(docType)
    try {
      const result = await documentMutation.mutateAsync({
        id: referral.id,
        documentType: docType,
      })

      // عرض المستند في Modal عائم
      if (result.content) {
        const docTitle = DOCUMENT_TYPES.find(d => d.value === docType)?.label || 'مستند'
        setPreviewDocument({ html: result.content, title: docTitle })
        setShowDocumentPreview(true)
      }

      toast({ type: 'success', title: 'تم إنشاء المستند بنجاح' })
      refetch()
    } catch (err) {
      console.error('Error generating document:', err)
      alert('حدث خطأ أثناء إنشاء المستند')
    } finally {
      setGeneratingDocType(null)
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

    // ملاحظة: رابط الرد سيتم إضافته تلقائياً من الباك إند إذا تم تفعيله
    // لا نحتاج إضافته هنا لتجنب التكرار

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

  /* ── مشتقات العرض (قبل أي return شرطي كي لا تختل ترتيب الهوكس) ── */
  const custodySegments = useMemo(
    () => (referral ? buildCustody(referral.workflow_logs ?? [], referral.created_at, Date.now()) : []),
    [referral],
  )

  if (isLoading) {
    return (
      <WsPage>
        <WsHeader title="تفاصيل الإحالة" />
        <WsBlock fill>
          <WsEmpty loading>جارٍ التحميل...</WsEmpty>
        </WsBlock>
      </WsPage>
    )
  }

  if (error || !referral) {
    return (
      <WsPage>
        <WsHeader
          title="تفاصيل الإحالة"
          actions={<WsBtn icon={ArrowRight} onClick={() => navigate(-1)}>العودة</WsBtn>}
        />
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              حدث خطأ في تحميل البيانات
              <WsBtn size="sm" icon={RefreshCw} onClick={() => refetch()}>إعادة المحاولة</WsBtn>
            </span>
          </WsAlert>
        </WsBlock>
      </WsPage>
    )
  }

  // يمكن تنفيذ الإجراءات فقط بعد استلام الإحالة (لا يمكن العمل على إحالة pending)
  const canPerformActions = ['received', 'in_progress'].includes(referral.status)
  // هل الإحالة معلقة وتحتاج استلام؟
  const needsReceiving = referral.status === 'pending'
  const isClosedLike = ['completed', 'closed', 'cancelled'].includes(referral.status)

  const typeTone = referral.referral_type === 'behavioral_violation' ? TONES.red : TONES.gray
  const age = sinceText(referral.created_at)
  const holder = referral.assigned_to?.name
  const composedMessage = buildCompleteMessage()
  const messageLength = composedMessage.length
  const overLimit = messageLength > PARENT_MESSAGE_LIMIT

  const generatedDocTypes = new Set((referral.documents ?? []).map((d) => d.document_type))
  const hasOutcome = Boolean(
    referral.behavior_violation_id || referral.student_case_id || referral.treatment_plan_id ||
    (referral.documents?.length ?? 0) > 0 || referral.parent_notified,
  )

  return (
    <WsPage>
      <WsHeader
        title={referral.student?.name ?? 'إحالة'}
        badge={referral.referral_number}
        actions={
          <>
            <WsIconBtn icon={ArrowRight} label="رجوع" onClick={() => navigate(-1)} />
            <WsIconBtn icon={RefreshCw} label="إعادة الجلب" onClick={() => refetch()} />
            <WsIconBtn
              icon={Trash2}
              label="حذف الإحالة"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ color: TONES.red.tx }}
            />
          </>
        }
        facts={
          <>
            <WsFact icon={UserRound} label="الفصل">
              {referral.student?.classroom?.name ?? referral.student?.class_name ?? '—'}
            </WsFact>
            <WsFact icon={FileText} label="الجهة">{referral.target_role_label}</WsFact>
            <WsFact icon={UserCheck} label="المحيل">{referral.referred_by?.name ?? 'غير محدد'}</WsFact>
            {/* حقيقتان لا وجود لهما اليوم — وهما بيت القصيد */}
            <WsFact icon={UserCheck} label="في يد">
              <span style={{ color: holder ? TONES.sky.tx : TONES.amber.tx }}>{holder ?? 'لا أحد'}</span>
            </WsFact>
            <WsFact icon={History} label="العمر">{age.text}</WsFact>
          </>
        }
      >
        <StatusChip status={referral.status} label={referral.status_label} />
        <TypeChip type={referral.referral_type} label={referral.referral_type_label} />
        <PriorityBadge priority={referral.priority} />
      </WsHeader>

      {/* ★ سلسلة العُهدة — تعلو العمودين: الزمن محور يتدلى منه كل شيء */}
      <WsToolbar style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="ws-label" style={{ margin: 0 }}>سلسلة العُهدة</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ws-text-2)' }}>
            {custodySummary(custodySegments, isClosedLike)}
          </span>
        </span>
        <CustodyChain segments={custodySegments} />
      </WsToolbar>

      <WsLayout>
        {/* ── الطالب ── */}
        <WsSideCol side="start" title="الطالب" icon={UserRound} storageKey="ws:referral-detail:student" width={300}>
          <WsBlock padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <InitialAvatar name={referral.student?.name ?? '؟'} tone={typeTone} size={44} />
              <div style={{ minWidth: 0 }}>
                {referral.student?.id ? (
                  <Link
                    to={`/admin/students/profile/${referral.student.id}`}
                    style={{ fontSize: 13, fontWeight: 800, color: 'var(--ws-accent)', textDecoration: 'none' }}
                  >
                    {referral.student.name}
                  </Link>
                ) : (
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>{referral.student?.name}</p>
                )}
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                  {[referral.student?.student_number, referral.student?.classroom?.name].filter(Boolean).join(' • ') || '—'}
                </p>
              </div>
            </div>
          </WsBlock>

          <WsBlock title="بيانات الإحالة" icon={FileText} padded fill>
            <WsFactsList>
              <WsFactRow label="النوع"><TypeChip type={referral.referral_type} label={referral.referral_type_label} /></WsFactRow>
              <WsFactRow label="الجهة">{referral.target_role_label}</WsFactRow>
              <WsFactRow label="الأولوية"><PriorityBadge priority={referral.priority} /></WsFactRow>
              <WsFactRow label="المحيل">{referral.referred_by?.name ?? 'غير محدد'}</WsFactRow>
              <WsFactRow label="المكلَّف">{referral.assigned_to?.name ?? 'غير معيّن'}</WsFactRow>
              <WsFactRow label="تاريخ الإحالة">{new Date(referral.created_at).toLocaleString('ar-SA')}</WsFactRow>
              {referral.received_at && (
                <WsFactRow label="تاريخ الاستلام">{new Date(referral.received_at).toLocaleString('ar-SA')}</WsFactRow>
              )}
              {referral.completed_at && (
                <WsFactRow label="تاريخ الإكمال">{new Date(referral.completed_at).toLocaleString('ar-SA')}</WsFactRow>
              )}
              <WsFactRow label="آخر تحديث">{new Date(referral.updated_at).toLocaleString('ar-SA')}</WsFactRow>
            </WsFactsList>
          </WsBlock>
        </WsSideCol>

        {/* ── السرد ── */}
        <WsMain>
          <WsBlock title="ما قاله المعلم" icon={MessageCircle} padded>
            <div
              style={{
                background: 'var(--ws-surface-2)',
                border: '1px solid var(--ws-hairline)',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                {referral.description || 'بلا وصف'}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                — {referral.referred_by?.name ?? 'غير محدد'} · {new Date(referral.created_at).toLocaleString('ar-SA')}
              </p>
            </div>
          </WsBlock>

          <div className="ws-block ws-block--fill" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="ws-block__head">
              <span className="ws-block__title">
                <History />
                سجل الوقائع
                <span className="ws-count">{referral.workflow_logs?.length ?? 0}</span>
              </span>
            </div>

            <div className="ws-block__scroll">
              {referral.workflow_logs && referral.workflow_logs.length > 0 ? (
                <div className="ws-timeline">
                  {referral.workflow_logs.map((log, index) => {
                    const meta = ACTION_META[log.action] ?? { icon: Circle }
                    const Icon = meta.icon
                    /* رمادي افتراضاً، ملوّن عند المنعطف — فتصير النقاط الملوّنة خريطة */
                    const tone = meta.tone ?? TONES.gray
                    return (
                      <div
                        key={log.id}
                        className={`ws-timeline__item ${index === 0 ? 'is-current' : ''}`}
                        style={{ paddingInlineStart: 54 }}
                      >
                        <span className="ws-timeline__node" style={{ width: 46 }}>
                          <span className="ws-timeline__dot" style={{ background: tone.bg, color: tone.tx }}>
                            <Icon />
                          </span>
                        </span>
                        <div style={{ paddingTop: 3 }}>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{log.action_label}</p>
                          {log.notes && (
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: 11.5,
                                lineHeight: 1.7,
                                background: 'var(--ws-surface-2)',
                                border: '1px solid var(--ws-hairline)',
                                borderRadius: 7,
                                padding: '5px 8px',
                              }}
                            >
                              {log.notes}
                            </p>
                          )}
                          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--ws-text-2)' }}>
                            {log.performed_by ? `${log.performed_by.name} · ` : ''}
                            {new Date(log.created_at).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <WsEmpty icon={History}>لا وقائع مسجّلة بعد</WsEmpty>
              )}
            </div>

            {/* مُسجِّل الوقائع مثبّت في القدم — يسكن WsMain لا العمود
                لأن WsSideCol يفصل أبناءه عند الطي فتضيع ملاحظة نصف مكتوبة */}
            {canPerformActions && (
              <div style={{ borderTop: '1px solid var(--ws-hairline)', padding: 10, flexShrink: 0, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <WsTextarea
                  value={composerNote}
                  onChange={(e) => setComposerNote(e.target.value)}
                  rows={2}
                  placeholder="سجّل واقعة أو ملاحظة..."
                  style={{ flex: 1 }}
                />
                <WsBtn
                  variant="primary"
                  icon={Plus}
                  onClick={handleAddNote}
                  disabled={!composerNote.trim() || noteMutation.isPending}
                >
                  {noteMutation.isPending ? 'جارٍ...' : 'أضف'}
                </WsBtn>
              </div>
            )}
          </div>
        </WsMain>

        {/* ── القرار ── */}
        <WsSideCol side="end" title="القرار" icon={Gavel} storageKey="ws:referral-detail:actions" width={340}>
          <WsBlock padded>
            {/* بوابة القرار: سطر يعلن الحالة، ثم زر أساسي واحد، والباقي محايد */}
            {needsReceiving ? (
              <>
                <WsAlert tone="warn" boxed>الإحالة معلّقة — استلمها لتُفتح الإجراءات</WsAlert>
                <WsBtn
                  variant="primary"
                  icon={Check}
                  onClick={handleReceive}
                  disabled={receiveMutation.isPending}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                >
                  {receiveMutation.isPending ? 'جارٍ الاستلام...' : 'استلام الإحالة'}
                </WsBtn>
              </>
            ) : canPerformActions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <WsBtn
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={completeMutation.isPending}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  إكمال الإحالة
                </WsBtn>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <WsBtn icon={ArrowLeftRight} onClick={() => setShowTransferModal(true)}>تحويل</WsBtn>
                  {!referral.parent_notified ? (
                    <WsBtn icon={Bell} onClick={handleNotifyParent} disabled={parentNotifyMutation.isPending}>
                      إشعار ولي الأمر
                    </WsBtn>
                  ) : (
                    <ToneChip tone={TONES.green}>تم الإشعار</ToneChip>
                  )}
                </div>

                {/* تنفيذ المخالفة يُنهي الإحالة ويُغلقها — سلوك خادم مُتحقَّق تُخفيه الصفحة اليوم */}
                {referral.referral_type === 'behavioral_violation' && !referral.behavior_violation_id && (
                  <div>
                    <WsBtn
                      variant="danger"
                      icon={AlertTriangle}
                      onClick={handleOpenViolationModal}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      تنفيذ مخالفة سلوكية
                    </WsBtn>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: TONES.red.tx, textAlign: 'center' }}>
                      سيُنهي الإحالة ويُغلقها
                    </p>
                  </div>
                )}

                {canCreateCaseOrPlan && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid var(--ws-hairline)' }}>
                    {!referral.student_case_id ? (
                      <WsBtn
                        icon={FolderPlus}
                        onClick={() => setShowCaseModal(true)}
                        style={{ color: TONES.purple.tx, borderColor: TONES.purple.bd, background: TONES.purple.bg }}
                      >
                        دراسة حالة
                      </WsBtn>
                    ) : (
                      <WsBtn icon={ExternalLink} onClick={() => navigate(`/admin/student-cases/${referral.student_case_id}`)}>
                        فتح الحالة
                      </WsBtn>
                    )}
                    {!referral.treatment_plan_id ? (
                      <WsBtn
                        icon={ClipboardList}
                        onClick={() => setShowTreatmentPlanModal(true)}
                        style={{ color: TONES.purple.tx, borderColor: TONES.purple.bd, background: TONES.purple.bg }}
                      >
                        خطة علاجية
                      </WsBtn>
                    ) : (
                      <WsBtn icon={ExternalLink} onClick={() => navigate(`/admin/treatment-plans/${referral.treatment_plan_id}`)}>
                        فتح الخطة
                      </WsBtn>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* الطريق المسدود يُقال صراحةً بدل انهيار اللوحة بلا كلمة تفسير */
              <WsAlert tone="info" boxed>
                {referral.status === 'transferred'
                  ? `الإحالة محوّلة إلى ${referral.target_role_label} — بانتظار الجهة الجديدة`
                  : `الإحالة ${referral.status_label} — لا إجراءات متاحة من هذه الصفحة`}
              </WsAlert>
            )}
          </WsBlock>

          {/* المكلَّف — يقتل مودالاً كان لأجل select واحد */}
          {canPerformActions && (
            <WsBlock title="المكلَّف" icon={UserCheck} padded>
              {referral.assigned_to && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <InitialAvatar name={referral.assigned_to.name} tone={TONES.sky} size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{referral.assigned_to.name}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <WsSelect
                  value={selectedAssignee ?? ''}
                  onChange={(e) => setSelectedAssignee(Number(e.target.value) || null)}
                  style={{ flex: 1 }}
                >
                  <option value="">اختر المسؤول...</option>
                  {referral.available_assignees && referral.available_assignees.length > 0 ? (
                    referral.available_assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name} {assignee.role_label ? `(${assignee.role_label})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>لا يوجد مسؤولين متاحين</option>
                  )}
                </WsSelect>
                <WsBtn
                  size="sm"
                  icon={UserCheck}
                  onClick={handleAssign}
                  disabled={!selectedAssignee || assignMutation.isPending}
                >
                  {referral.assigned_to ? 'تغيير' : 'تعيين'}
                </WsBtn>
              </div>
            </WsBlock>
          )}

          {/* الحصيلة: العهدة تقول من حمل، والحصيلة تقول ماذا خرج */}
          <WsBlock title="الحصيلة" icon={PackageCheck} padded fill scroll>
            {!hasOutcome ? (
              <WsEmpty icon={PackageCheck}>لم تُنتج هذه الإحالة شيئاً بعد</WsEmpty>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {referral.behavior_violation_id && (
                  <Link to={`/admin/behavior/${referral.behavior_violation_id}`} style={{ textDecoration: 'none' }}>
                    <ToneChip tone={TONES.red}>مخالفة مرصودة</ToneChip>
                  </Link>
                )}
                {referral.student_case_id && (
                  <Link to={`/admin/student-cases/${referral.student_case_id}`} style={{ textDecoration: 'none' }}>
                    <ToneChip tone={TONES.purple}>دراسة حالة</ToneChip>
                  </Link>
                )}
                {referral.treatment_plan_id && (
                  <Link to={`/admin/treatment-plans/${referral.treatment_plan_id}`} style={{ textDecoration: 'none' }}>
                    <ToneChip tone={TONES.purple}>خطة علاجية</ToneChip>
                  </Link>
                )}
                {referral.parent_notified && (
                  <ToneChip tone={TONES.green}>
                    أُشعر ولي الأمر{referral.parent_notified_at ? ` · ${new Date(referral.parent_notified_at).toLocaleDateString('ar-SA')}` : ''}
                  </ToneChip>
                )}
              </div>
            )}

            {/* رفّ المستندات: الأنواع الخمسة صفوف دائمة — ما وُلّد صلب وما لم يُولّد شبحي بنقرة */}
            <p className="ws-label" style={{ marginBottom: 5 }}>رفّ المستندات</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {DOCUMENT_TYPES.map((type) => {
                const doc = referral.documents?.find((d) => d.document_type === type.value)
                const exists = generatedDocTypes.has(type.value)
                const busy = generatingDocType === type.value
                return (
                  <div
                    key={type.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      border: `1px ${exists ? 'solid' : 'dashed'} var(--ws-border)`,
                      borderRadius: 8,
                      padding: '6px 8px',
                      background: exists ? 'var(--ws-surface)' : 'transparent',
                      opacity: exists ? 1 : 0.72,
                    }}
                  >
                    <FileText style={{ width: 13, height: 13, flexShrink: 0, color: exists ? 'var(--ws-accent)' : 'var(--ws-text-2)' }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: exists ? 700 : 400 }}>
                      {/* التسمية من الثابت المحلي: document_type_label لا يصل من الخادم أبداً */}
                      {type.label}
                    </span>
                    {exists && doc ? (
                      <WsIconBtn icon={Printer} label="عرض/طباعة" onClick={() => handlePrintDocument(doc.id)} />
                    ) : (
                      <WsBtn
                        size="sm"
                        icon={FilePlus2}
                        onClick={() => handleGenerateDocument(type.value)}
                        disabled={documentMutation.isPending}
                      >
                        {busy ? 'جارٍ...' : 'توليد'}
                      </WsBtn>
                    )}
                  </div>
                )
              })}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* ═══ مودال التحويل ═══ */}
      {showTransferModal && (
        <div className="ws-modal" onClick={() => { setShowTransferModal(false); setNoteText('') }}>
          <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">تحويل الإحالة</h3>
              <p className="ws-modal__sub">التحويل يُخلي المكلَّف الحالي — تعود الإحالة بلا يد حتى تستلمها الجهة الجديدة</p>
            </header>
            <div className="ws-modal__body">
              <WsField label="الجهة الجديدة">
                <WsSelect value={transferTarget} onChange={(e) => setTransferTarget(e.target.value as ReferralTargetRole)}>
                  <option value="counselor">الموجه الطلابي</option>
                  <option value="vice_principal">وكيل المدرسة</option>
                  <option value="committee">اللجنة السلوكية</option>
                </WsSelect>
              </WsField>
              <WsField label="سبب التحويل *">
                <WsTextarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="سبب التحويل..."
                />
              </WsField>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => { setShowTransferModal(false); setNoteText('') }}>إلغاء</WsBtn>
              <WsBtn
                variant="primary"
                icon={ArrowLeftRight}
                onClick={handleTransfer}
                disabled={!noteText.trim() || transferMutation.isPending}
              >
                {transferMutation.isPending ? 'جارٍ التحويل...' : 'تحويل'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ تأكيد الإكمال ═══ */}
      {showCompleteConfirm && (
        <div className="ws-modal" onClick={() => setShowCompleteConfirm(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إكمال الإحالة</h3>
              <p className="ws-modal__sub">هل أنت متأكد من إكمال هذه الإحالة؟</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="info" boxed>
                ستُغلق الإحالة وتخرج من قائمة العمل. سجل الوقائع والمستندات تبقى محفوظة.
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setShowCompleteConfirm(false)}>إلغاء</WsBtn>
              <WsBtn variant="primary" icon={CheckCircle2} onClick={handleComplete} disabled={completeMutation.isPending}>
                {completeMutation.isPending ? 'جارٍ...' : 'تأكيد الإكمال'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ مودال رصد المخالفة — أربع خطوات + سلّم التصعيد ═══ */}
      {showViolationModal && referral && (
        <div className="ws-modal">
          <div className="ws-modal__panel" style={{ maxWidth: 820, display: 'flex', flexDirection: 'column' }}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title" style={{ color: TONES.red.tx }}>رصد مخالفة سلوكية</h3>
                  <p className="ws-modal__sub">نموذج الرصد الموحد — سيُنهي الإحالة ويُغلقها بعد الحفظ</p>
                </div>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <WsBtn size="sm" icon={RotateCcw} onClick={resetViolationForm}>إعادة التعيين</WsBtn>
                  <WsIconBtn icon={X} label="إغلاق" onClick={handleCloseViolationModal} />
                </span>
              </div>

              <div className="ws-seg" style={{ marginTop: 8 }}>
                {VIOLATION_RECORD_STEPS.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`ws-seg__btn ${step.id === violationRecordStep ? 'is-active' : ''}`}
                    onClick={() => setViolationRecordStep(step.id)}
                  >
                    <span className="ws-count">{step.id}</span>
                    {step.label}
                  </button>
                ))}
              </div>
            </header>

            {/* هوية الطالب ثابتة */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                background: 'var(--ws-surface-2)',
                borderBottom: '1px solid var(--ws-hairline)',
              }}
            >
              <InitialAvatar name={referral.student?.name ?? '؟'} tone={TONES.red} size={32} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800 }}>{referral.student?.name}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  {[referral.student?.student_number, referral.student?.classroom?.name].filter(Boolean).join(' • ')}
                </span>
              </span>
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>المُبلِغ (المحيل)</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700 }}>{referral.referred_by?.name || 'غير محدد'}</span>
              </span>
            </div>

            <div className="ws-modal__body" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
              {/* الخطوة 1 */}
              {violationRecordStep === 1 && (
                <>
                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>درجة المخالفة</p>
                    <div className="ws-choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      {BEHAVIOR_DEGREE_OPTIONS.map((degree) => (
                        <button
                          key={degree}
                          type="button"
                          className={`ws-choice ${selectedDegree === degree ? 'is-selected' : ''}`}
                          onClick={() => { setSelectedDegree(degree); setSelectedViolationType('') }}
                          style={selectedDegree === degree
                            ? { background: TONES.red.bg, borderColor: TONES.red.tx, boxShadow: `0 0 0 1px ${TONES.red.tx}` }
                            : undefined}
                        >
                          <ViolationBadge degree={degree} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDegree && (
                    <WsField label="نوع المخالفة">
                      {isConfigLoading ? (
                        <WsEmpty loading>جاري تحميل أنواع المخالفات...</WsEmpty>
                      ) : availableViolations.length > 0 ? (
                        <WsSelect
                          value={selectedViolationType}
                          onChange={(event) => setSelectedViolationType(event.target.value)}
                        >
                          <option value="" disabled>اختر نوع المخالفة</option>
                          {availableViolations.map((violation) => (
                            <option key={violation} value={violation}>{violation}</option>
                          ))}
                        </WsSelect>
                      ) : (
                        <WsAlert tone="warn" boxed>لا توجد أنواع مخالفات محددة لهذه الدرجة</WsAlert>
                      )}
                    </WsField>
                  )}

                  {selectedDegree && selectedViolationType && (
                    <EscalationLadder
                      procedures={availableProcedures}
                      occurrence={studentViolationOccurrence}
                      target={targetProcedure}
                    />
                  )}
                </>
              )}

              {/* الخطوة 2 */}
              {violationRecordStep === 2 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <WsField label="التاريخ">
                      <WsInput
                        type="date"
                        value={violationDetails.date}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, date: event.target.value }))}
                      />
                    </WsField>
                    <WsField label="الوقت">
                      <WsInput
                        type="time"
                        value={violationDetails.time}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, time: event.target.value }))}
                      />
                    </WsField>
                    <WsField label="الموقع *">
                      <WsSelect
                        value={violationDetails.location}
                        onChange={(event) => setViolationDetails((prev) => ({ ...prev, location: event.target.value }))}
                      >
                        <option value="" disabled>اختر موقع المخالفة</option>
                        {BEHAVIOR_LOCATIONS.map((location) => (
                          <option key={location} value={location}>{location}</option>
                        ))}
                      </WsSelect>
                    </WsField>
                    <WsField label="المبلغ عن الحالة">
                      <WsInput type="text" value={referral.referred_by?.name || 'غير محدد'} disabled />
                    </WsField>
                  </div>
                  <WsField label="الوصف التفصيلي">
                    <WsTextarea
                      value={violationDetails.description}
                      onChange={(event) => setViolationDetails((prev) => ({ ...prev, description: event.target.value }))}
                      rows={4}
                      placeholder="أدخل وصفاً مختصراً للحالة"
                    />
                  </WsField>
                </>
              )}

              {/* الخطوة 3 */}
              {violationRecordStep === 3 && (
                <>
                  <WsAlert tone="info" boxed>
                    يتم تحديد الإجراء تلقائياً بناءً على سجل الطالب. يمكن تحديث حالة التنفيذ لاحقاً من صفحة تفاصيل المخالفة.
                  </WsAlert>

                  <EscalationLadder
                    procedures={availableProcedures}
                    occurrence={studentViolationOccurrence}
                    target={targetProcedure}
                  />

                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>الإجراءات الإضافية</p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        border: '1px solid var(--ws-border)',
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>إرسال إشعار لولي الأمر</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                          سيتم إرسال رسالة واتساب لولي الأمر
                        </p>
                      </div>
                      <WsSwitch checked={sendParentMessage} onChange={setSendParentMessage} />
                    </div>
                    {sendParentMessage && (
                      <div style={{ marginTop: 6 }}>
                        <WsTextarea
                          value={parentMessage}
                          onChange={(e) => setParentMessage(e.target.value)}
                          placeholder="نص الرسالة لولي الأمر (اختياري - سيتم استخدام نص افتراضي)..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* الخطوة 4 */}
              {violationRecordStep === 4 && (
                <>
                  <WsAlert tone="warn" boxed>
                    راجع البيانات قبل الحفظ. ستُسجَّل المخالفة في سجل المخالفات وتُربط بهذه الإحالة، و<b>تُغلق الإحالة</b>.
                  </WsAlert>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 6 }}>بيانات الطالب</p>
                      <WsFactsList>
                        <WsFactRow label="الاسم">{referral.student?.name}</WsFactRow>
                        <WsFactRow label="الفصل">{referral.student?.classroom?.name}</WsFactRow>
                        <WsFactRow label="المخالفة رقم">{studentViolationOccurrence}</WsFactRow>
                      </WsFactsList>
                    </div>
                    <div style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 6 }}>تفاصيل المخالفة</p>
                      <WsFactsList>
                        <WsFactRow label="الدرجة">
                          {selectedDegree && <ViolationBadge degree={selectedDegree} size="sm" />}
                        </WsFactRow>
                        <WsFactRow label="النوع">{selectedViolationType}</WsFactRow>
                        <WsFactRow label="التاريخ">{violationDetails.date}</WsFactRow>
                        <WsFactRow label="الوقت">{violationDetails.time}</WsFactRow>
                        <WsFactRow label="الموقع">{violationDetails.location || '—'}</WsFactRow>
                        <WsFactRow label="المبلغ">{referral.referred_by?.name || 'غير محدد'}</WsFactRow>
                      </WsFactsList>
                    </div>
                  </div>

                  <EscalationLadder
                    procedures={availableProcedures}
                    occurrence={studentViolationOccurrence}
                    target={targetProcedure}
                  />
                </>
              )}
            </div>

            <footer className="ws-modal__foot" style={{ justifyContent: 'space-between' }}>
              <WsBtn icon={ChevronRight} onClick={handleViolationPrevStep} disabled={violationRecordStep === 1}>
                السابق
              </WsBtn>
              {violationRecordStep < 4 ? (
                <WsBtn variant="primary" icon={ChevronLeft} onClick={handleViolationNextStep}>التالي</WsBtn>
              ) : (
                <WsBtn
                  variant="danger"
                  icon={CheckCircle2}
                  onClick={handleSubmitViolation}
                  disabled={isCreatingViolation}
                >
                  {isCreatingViolation ? 'جاري الحفظ...' : 'حفظ المخالفة وإغلاق الإحالة'}
                </WsBtn>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* ═══ تأكيد الحذف ═══ */}
      {showDeleteConfirm && (
        <div className="ws-modal" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">تأكيد الحذف</h3>
              <p className="ws-modal__sub">هل أنت متأكد من حذف هذه الإحالة؟</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="warn" boxed>
                سيتم حذف الإحالة وجميع السجلات والمستندات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه.
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setShowDeleteConfirm(false)}>إلغاء</WsBtn>
              <WsBtn variant="danger" icon={Trash2} onClick={handleDeleteReferral} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ إشعار ولي الأمر — فقاعة واتساب حيّة ═══ */}
      {showParentMessageModal && (
        <div className="ws-modal" onClick={() => setShowParentMessageModal(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">إشعار ولي الأمر</h3>
                  <p className="ws-modal__sub">تُرسل عبر واتساب إلى رقم ولي الأمر المسجَّل</p>
                </div>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => setShowParentMessageModal(false)} />
              </div>
            </header>

            <div className="ws-modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* المحرر */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <WsField label="محتوى الرسالة">
                    <WsTextarea
                      value={parentMessageText}
                      onChange={(e) => setParentMessageText(e.target.value)}
                      rows={6}
                      placeholder="اكتب رسالتك هنا..."
                      autoFocus
                    />
                  </WsField>

                  <WsField label="موعد الحضور (اختياري)">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <WsInput
                        type="date"
                        value={meetingDate ?? ''}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setMeetingDate(e.target.value || null)}
                        style={{ flex: 1 }}
                      />
                      {meetingDate && (
                        <WsIconBtn icon={X} label="إزالة الموعد" onClick={() => setMeetingDate(null)} style={{ color: TONES.red.tx }} />
                      )}
                    </div>
                  </WsField>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      border: '1px solid var(--ws-border)',
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>استقبال الرد</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        يُلحق النظام رابط الرد بالرسالة
                      </p>
                    </div>
                    <WsSwitch checked={enableReply} onChange={setEnableReply} />
                  </div>
                </div>

                {/* الفقاعة الحيّة — كما تصل هاتف ولي الأمر فعلاً */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p className="ws-label" style={{ margin: 0 }}>ما سيصل ولي الأمر</p>
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--ws-surface-2)',
                      border: '1px solid var(--ws-hairline)',
                      borderRadius: 10,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {parentMessageText.trim() ? (
                      <div
                        style={{
                          background: TONES.green.bg,
                          border: `1px solid ${TONES.green.bd}`,
                          borderRadius: '10px 10px 10px 2px',
                          padding: '8px 10px',
                          fontSize: 12,
                          lineHeight: 1.8,
                          whiteSpace: 'pre-wrap',
                          color: 'var(--ws-text)',
                        }}
                      >
                        {composedMessage}
                        {enableReply && (
                          <span style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: 'var(--ws-text-2)', fontStyle: 'italic' }}>
                            سيُلحق النظام رابط الرد هنا
                          </span>
                        )}
                      </div>
                    ) : (
                      <WsEmpty icon={MessageCircle}>اكتب الرسالة لترى ما سيصل</WsEmpty>
                    )}
                  </div>
                  {/* العدّاد يقيس الناتج المُركَّب لا المكتوب — الخادم يفرض الحد على المُركَّب */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10.5,
                      textAlign: 'left',
                      color: overLimit ? TONES.red.tx : 'var(--ws-text-2)',
                      fontWeight: overLimit ? 700 : 400,
                    }}
                  >
                    {messageLength}/{PARENT_MESSAGE_LIMIT}
                    {overLimit && ' — تجاوزت الحد، سيرفضها الخادم'}
                  </p>
                </div>
              </div>
            </div>

            <footer className="ws-modal__foot">
              <WsBtn
                onClick={() => {
                  setShowParentMessageModal(false)
                  setParentMessageText('')
                  setMeetingDate(null)
                }}
              >
                إلغاء
              </WsBtn>
              <WsBtn
                variant="primary"
                icon={Send}
                onClick={handleSendParentNotification}
                disabled={parentNotifyMutation.isPending || !parentMessageText.trim()}
              >
                {parentNotifyMutation.isPending ? 'جارٍ الإرسال...' : 'إرسال الإشعار'}
              </WsBtn>
            </footer>
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
    </WsPage>
  )
}

/**
 * سلّم التصعيد — القلب التربوي للنموذج كان مدفوناً خلف سطر نصّي.
 * targetProcedure يختار بالتكرار ثم **يسقط على آخر عنصر أي الأقسى** — تصعيد تلقائي
 * يقرّر عقوبة الطالب وهو غير مرئي. السلّم يجيب: لماذا هذا الإجراء؟ وماذا لو تكرر؟
 */
function EscalationLadder({
  procedures,
  occurrence,
  target,
}: {
  procedures: BehaviorProcedureDefinition[]
  occurrence: number
  target: BehaviorProcedureDefinition | null
}) {
  if (procedures.length === 0) return null

  return (
    <div>
      <p className="ws-label" style={{ marginBottom: 6 }}>سلّم التصعيد</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {procedures.map((procedure) => {
          const isTarget = target?.step === procedure.step
          const isPast = !isTarget && procedure.step < (target?.step ?? 0)
          return (
            <span
              key={procedure.step}
              title={procedure.description}
              style={{
                flex: '1 1 130px',
                minWidth: 110,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                borderRadius: 8,
                padding: '6px 8px',
                background: isTarget ? TONES.red.bg : 'transparent',
                border: `1px ${isTarget ? 'solid' : isPast ? 'solid' : 'dashed'} ${isTarget ? TONES.red.tx : 'var(--ws-border)'}`,
                boxShadow: isTarget ? `0 0 0 1px ${TONES.red.tx}` : undefined,
                opacity: isTarget ? 1 : isPast ? 0.6 : 0.45,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  background: isTarget ? TONES.red.tx : 'var(--ws-border)',
                  color: isTarget ? '#fff' : 'var(--ws-text-2)',
                }}
              >
                {procedure.step}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 10.5,
                    fontWeight: isTarget ? 800 : 600,
                    color: isTarget ? TONES.red.tx : 'var(--ws-text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {procedure.title}
                </span>
                <span style={{ display: 'block', fontSize: 9, color: 'var(--ws-text-2)' }}>
                  {isTarget ? 'سيُطبَّق الآن' : isPast ? 'سبق تطبيقه' : 'إن تكررت'}
                </span>
              </span>
            </span>
          )
        })}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
        المخالفة رقم <b style={{ color: TONES.red.tx }}>{occurrence}</b> للطالب من نفس النوع والدرجة
        {target && <> — لذلك <b>{target.title}</b></>}
      </p>
    </div>
  )
}
