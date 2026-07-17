import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import {
  Activity,
  Award,
  Crown,
  CreditCard,
  Download,
  ListChecks,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Trophy,
  Undo,
  Users,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsTextarea,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
  InitialAvatar,
} from '@/shared/workspace'
import {
  usePointSettingsQuery,
  useUpdatePointSettingsMutation,
  usePointReasonsQuery,
  useCreatePointReasonMutation,
  useUpdatePointReasonMutation,
  useDeactivatePointReasonMutation,
  usePointTransactionsQuery,
  useCreateManualPointTransactionMutation,
  useUndoPointTransactionMutation,
  usePointLeaderboardQuery,
  usePointCardsQuery,
  useRegeneratePointCardMutation,
  useStudentsQuery,
  useTeachersQuery,
} from '../hooks'
import {
  UndoCountdown,
  isUndoWindowOver,
  Pager,
  LeaderBar,
  PointsCardFace,
  sourceMeta,
  type CardFaceData,
} from './points-program-ui'
import type {
  PointCardFilters,
  PointCardRecord,
  PointManualTransactionPayload,
  PointReasonPayload,
  PointReasonRecord,
  PointSettingsRecord,
  PointSettingsUpdatePayload,
  PointTransactionFilters,
  PointTransactionRecord,
} from '../types'

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const DATE_FORMATTER = new Intl.DateTimeFormat('ar-SA', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/* تبويب «نظرة عامة» حُلّ لا نُقل: بطاقاته صارت حقائق في الترويسة تُرى في كل التبويبات،
   و«آخر العمليات» كانت نسخة مبتورة من جدول السجل، ولوحة الشرف صارت عموداً مقيماً. */
type TabKey = 'transactions' | 'cards' | 'reasons' | 'settings'

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }> = [
  { key: 'transactions', label: 'سجل العمليات', icon: Activity },
  { key: 'cards', label: 'بطاقات الطلاب', icon: CreditCard },
  { key: 'reasons', label: 'أسباب النقاط', icon: ListChecks },
  { key: 'settings', label: 'الإعدادات', icon: SettingsIcon },
]

const DEFAULT_SETTINGS: PointSettingsUpdatePayload = {
  daily_teacher_cap: 0,
  per_student_cap: 0,
  daily_violation_cap: 0,
  rewards_enabled: true,
  violations_enabled: true,
  require_camera_confirmation: false,
  undo_timeout_seconds: 300,
  reward_values: [],
  violation_values: [],
}

const DEFAULT_REASON_FORM: PointReasonPayload = {
  title: '',
  type: 'reward',
  value: 5,
  category: '',
  description: '',
  is_active: true,
  display_order: 0,
}

const DEFAULT_MANUAL_FORM: PointManualTransactionPayload = {
  student_id: 0,
  teacher_id: undefined,
  reason_id: undefined,
  type: 'reward',
  amount: 5,
  notes: '',
  context: '',
}

const DEFAULT_TRANSACTION_FILTERS: PointTransactionFilters = {
  page: 1,
  per_page: 10,
}

const DEFAULT_CARD_FILTERS: PointCardFilters = {}

function formatNumber(value?: number | null) {
  if (!value) return '0'
  return NUMBER_FORMATTER.format(value)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FORMATTER.format(date)
}

function sanitizeNumericList(value: string) {
  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((item) => Number.isFinite(item) && item >= 0)
}

function getSettingsPayload(settings: PointSettingsRecord | null | undefined): PointSettingsUpdatePayload {
  if (!settings) return DEFAULT_SETTINGS

  const { reward_values, violation_values, ...rest } = settings

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    reward_values: reward_values ?? [],
    violation_values: violation_values ?? [],
  }
}

export function PointsProgramPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('transactions')
  const [settingsDraft, setSettingsDraft] = useState<PointSettingsUpdatePayload>(DEFAULT_SETTINGS)
  const [reasonForm, setReasonForm] = useState<PointReasonPayload>(DEFAULT_REASON_FORM)
  const [editingReason, setEditingReason] = useState<PointReasonRecord | null>(null)
  const [manualForm, setManualForm] = useState<PointManualTransactionPayload>(DEFAULT_MANUAL_FORM)
  const [transactionFilters, setTransactionFilters] = useState<PointTransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const [cardFilters, setCardFilters] = useState<PointCardFilters>(DEFAULT_CARD_FILTERS)
  const [cardPage, setCardPage] = useState<number>(1)
  const [isExportingAllCards, setIsExportingAllCards] = useState(false)
  const [exportingCardId, setExportingCardId] = useState<number | null>(null)
  const [exportCardElement, setExportCardElement] = useState<HTMLDivElement | null>(null)

  /* حالات عرض للأعمدة المقيمة */
  const [studentQuery, setStudentQuery] = useState('')
  const [previewCardId, setPreviewCardId] = useState<number | null>(null)
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null)
  const [showInactiveReasons, setShowInactiveReasons] = useState(true)
  const [reasonTypeFilter, setReasonTypeFilter] = useState<'all' | 'reward' | 'violation'>('all')
  const [regenerateTarget, setRegenerateTarget] = useState<PointCardRecord | null>(null)

  const studentsQuery = useStudentsQuery()
  const teachersQuery = useTeachersQuery()
  const settingsQuery = usePointSettingsQuery()
  const leaderboardQuery = usePointLeaderboardQuery({ page: 1, per_page: 10 })
  const reasonsQuery = usePointReasonsQuery()
  const transactionsQuery = usePointTransactionsQuery(transactionFilters)

  // Fetch cards with pagination
  const cardsQuery = usePointCardsQuery({
    ...cardFilters,
    page: cardPage,
    per_page: 20,
  })

  // Fetch all cards without filters to get all grades/classes for filters
  const allCardsQuery = usePointCardsQuery({
    page: 1,
    per_page: 1000, // جلب عدد كبير للحصول على جميع الصفوف والفصول
  })

  const updateSettingsMutation = useUpdatePointSettingsMutation()
  const createReasonMutation = useCreatePointReasonMutation()
  const updateReasonMutation = useUpdatePointReasonMutation()
  const deactivateReasonMutation = useDeactivatePointReasonMutation()
  const createManualTransactionMutation = useCreateManualPointTransactionMutation()
  const undoTransactionMutation = useUndoPointTransactionMutation()
  const queryClient = useQueryClient()
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await apiClient.delete(`/admin/points/transactions/${transactionId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
    },
  })
  const regenerateCardMutation = useRegeneratePointCardMutation()

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsDraft(getSettingsPayload(settingsQuery.data))
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (editingReason) {
      setReasonForm({
        title: editingReason.title,
        type: editingReason.type,
        value: editingReason.value,
        category: editingReason.category ?? '',
        description: editingReason.description ?? '',
        is_active: editingReason.is_active,
        display_order: editingReason.display_order,
      })
    } else {
      setReasonForm(DEFAULT_REASON_FORM)
    }
  }, [editingReason])

  const leaderboardItems = leaderboardQuery.data?.items ?? []
  const transactions = transactionsQuery.data?.items ?? []
  const transactionMeta = transactionsQuery.data?.meta
  const cards = cardsQuery.data?.items ?? []
  const cardsMeta = cardsQuery.data?.meta
  const reasons = reasonsQuery.data ?? []
  const students = studentsQuery.data ?? []
  const teachers = teachersQuery.data ?? []
  const allCards = allCardsQuery.data?.items ?? []

  // استخراج الصفوف والفصول الفريدة من جميع البطاقات
  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    allCards.forEach((record) => {
      if (record.student.grade) set.add(record.student.grade)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [allCards])

  const classOptions = useMemo(() => {
    const set = new Set<string>()
    allCards.forEach((record) => {
      if (record.student.class_name) set.add(record.student.class_name)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [allCards])

  const totalCardPages = cardsMeta?.last_page ?? 1

  const topStudent = leaderboardItems[0]
  const totalTransactions = transactionMeta?.total ?? transactions.length
  const totalTrackedStudents = leaderboardQuery.data?.meta.total ?? leaderboardItems.length
  const totalPoints = useMemo(
    () => leaderboardItems.reduce((sum, entry) => sum + entry.total_points, 0),
    [leaderboardItems],
  )

  const rewardReasons = useMemo(
    () => reasons.filter((reason) => reason.type === 'reward' && reason.is_active),
    [reasons],
  )
  const violationReasons = useMemo(
    () => reasons.filter((reason) => reason.type === 'violation' && reason.is_active),
    [reasons],
  )

  const handleSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSettingsMutation.mutate(settingsDraft)
  }

  const handleSettingsFieldChange = (field: keyof PointSettingsUpdatePayload, value: unknown) => {
    setSettingsDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleReasonSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload: PointReasonPayload = {
      ...reasonForm,
      value: Number(reasonForm.value) || 0,
      display_order: Number(reasonForm.display_order) || 0,
    }

    if (editingReason) {
      updateReasonMutation.mutate(
        { id: editingReason.id, payload },
        {
          onSuccess: () => {
            setEditingReason(null)
          },
        },
      )
    } else {
      createReasonMutation.mutate(payload, {
        onSuccess: () => {
          setReasonForm(DEFAULT_REASON_FORM)
        },
      })
    }
  }

  const handleDeactivateReason = (reason: PointReasonRecord) => {
    deactivateReasonMutation.mutate(reason.id)
  }

  const handleManualFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: PointManualTransactionPayload = {
      ...manualForm,
      student_id: Number(manualForm.student_id),
      teacher_id: manualForm.teacher_id ? Number(manualForm.teacher_id) : undefined,
      reason_id: manualForm.reason_id ? Number(manualForm.reason_id) : undefined,
      amount: Number(manualForm.amount) || 0,
    }

    if (!payload.student_id || payload.amount === 0) {
      return
    }

    createManualTransactionMutation.mutate(payload, {
      onSuccess: () => {
        setManualForm(DEFAULT_MANUAL_FORM)
        setStudentQuery('')
      },
    })
  }

  const handleUndoTransaction = (transaction: PointTransactionRecord) => {
    undoTransactionMutation.mutate(transaction.id)
  }

  const handleRegenerateCard = (studentId: number) => {
    regenerateCardMutation.mutate(studentId)
  }

  useEffect(() => {
    setTransactionFilters((current) => ({
      ...current,
      page: Math.max(1, current.page ?? 1),
      per_page: Math.max(5, current.per_page ?? 10),
    }))
  }, [])

  const handleTransactionPageChange = (page: number) => {
    setTransactionFilters((current) => ({
      ...current,
      page,
    }))
  }

  const handleTransactionFilterChange = (field: keyof PointTransactionFilters, value: unknown) => {
    setTransactionFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }))
  }

  const handleCardFilterChange = (field: keyof PointCardFilters, value: string | undefined) => {
    setCardFilters((current) => ({
      ...current,
      [field]: value || undefined,
    }))
    setCardPage(1)
  }
  const handleCardPageChange = (page: number) => {
    setCardPage((current) => {
      if (page < 1) return current
      if (page > totalCardPages) return current
      return page
    })
  }

  const handleExportSingleCard = useCallback(
    async (record: PointCardRecord) => {
      if (!exportCardElement) {
        alert('خطأ: لم يتم العثور على عنصر البطاقة. يرجى المحاولة مرة أخرى.')
        return
      }

      setExportingCardId(record.student.id)

      try {
        // لا تستخدم المعرّف التسلسلي القابل للتنبؤ كحمولة QR؛ امنع التصدير عند غياب توكن البطاقة — B13
        if (!record.card.token) {
          setExportingCardId(null)
          alert('تعذّر توليد رمز QR: لا يوجد رمز مميز للبطاقة. أعد توليد بطاقة الطالب ثم حاول مجدداً.')
          return
        }
        // Generate QR code for this specific student
        const qrPayload = record.card.token

        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 256,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        })

        // Update the card element with current student data
        const cardContent = exportCardElement
        cardContent.querySelector('[data-card-token]')!.textContent = `رمز: ${record.card.token}`
        cardContent.querySelector('[data-student-name]')!.textContent = record.student.name
        cardContent.querySelector('[data-student-grade]')!.textContent = `${record.student.grade} — ${record.student.class_name}`
        cardContent.querySelector('[data-student-id]')!.textContent = record.student.national_id ?? '—'
        cardContent.querySelector('[data-card-version]')!.textContent = record.card.version
        cardContent.querySelector('[data-card-status]')!.textContent = record.card.is_active ? 'نشطة' : 'معطلة'
        cardContent.querySelector('[data-card-issued]')!.textContent = record.card.issued_at ? formatDate(record.card.issued_at) : '—'

        const qrImage = cardContent.querySelector('[data-qr-image]') as HTMLImageElement
        if (qrImage) {
          qrImage.src = qrDataUrl
        }

        // Wait for images to load
        await new Promise(resolve => setTimeout(resolve, 100))

        const canvas = await html2canvas(exportCardElement, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#f8fafc',
          logging: false,
          width: 384,
          height: 576,
        })

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [101.6, 152.4] })
        const width = pdf.internal.pageSize.getWidth()
        const height = pdf.internal.pageSize.getHeight()

        pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, width, height, undefined, 'FAST')

        const safeName = record.student.name.replace(/[^\w\s؀-ۿ-]/g, '_').trim() || `${record.student.id}`
        pdf.save(`بطاقة_${safeName}.pdf`)
      } catch (error) {
        console.error('تعذر تصدير بطاقة الطالب:', record.student.id, error)
        alert('حدث خطأ أثناء تصدير البطاقة. يرجى المحاولة مرة أخرى.')
      } finally {
        setExportingCardId(null)
      }
    },
    [exportCardElement],
  )

  const handleExportAllCards = useCallback(async () => {
    if (!cards.length || !exportCardElement) {
      alert('لا توجد بطاقات للتصدير')
      return
    }

    setIsExportingAllCards(true)

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [101.6, 152.4] })
      const width = pdf.internal.pageSize.getWidth()
      const height = pdf.internal.pageSize.getHeight()

      let isFirstPage = true

      for (const record of cards) {
        try {
          // Generate QR code for this specific student
          const qrPayload = record.card.token ?? String(record.student.id)

          const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 256,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          })

          // Update the card element with current student data
          const cardContent = exportCardElement
          cardContent.querySelector('[data-card-token]')!.textContent = `رمز: ${record.card.token}`
          cardContent.querySelector('[data-student-name]')!.textContent = record.student.name
          cardContent.querySelector('[data-student-grade]')!.textContent = `${record.student.grade} — ${record.student.class_name}`
          cardContent.querySelector('[data-student-id]')!.textContent = record.student.national_id ?? '—'
          cardContent.querySelector('[data-card-version]')!.textContent = record.card.version
          cardContent.querySelector('[data-card-status]')!.textContent = record.card.is_active ? 'نشطة' : 'معطلة'
          cardContent.querySelector('[data-card-issued]')!.textContent = record.card.issued_at ? formatDate(record.card.issued_at) : '—'

          const qrImage = cardContent.querySelector('[data-qr-image]') as HTMLImageElement
          if (qrImage) {
            qrImage.src = qrDataUrl
          }

          // Wait for images to load
          await new Promise(resolve => setTimeout(resolve, 100))

          const canvas = await html2canvas(exportCardElement, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#f8fafc',
            logging: false,
            width: 384,
            height: 576,
          })

          if (!isFirstPage) {
            pdf.addPage()
          }

          pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, width, height, undefined, 'FAST')
          isFirstPage = false
        } catch (error) {
          console.error('تعذر إضافة بطاقة الطالب:', record.student.id, error)
        }
      }

      if (!isFirstPage) {
        pdf.save('بطاقات_برنامج_نقاطي.pdf')
      }
    } catch (error) {
      console.error('تعذر تصدير جميع البطاقات:', error)
      alert('حدث خطأ أثناء تصدير البطاقات. يرجى المحاولة مرة أخرى.')
    } finally {
      setIsExportingAllCards(false)
    }
  }, [cards, exportCardElement])

  /* ── البطاقة الحيّة: أول صف افتراضياً، وQR مستقل تماماً عن مسار التصدير ── */
  const previewRecord = useMemo(
    () => cards.find((record) => record.card.id === previewCardId) ?? cards[0] ?? null,
    [cards, previewCardId],
  )

  useEffect(() => {
    let cancelled = false
    const token = previewRecord?.card.token

    if (!token) {
      setPreviewQrDataUrl(null)
      return
    }

    QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setPreviewQrDataUrl(url) })
      .catch(() => { if (!cancelled) setPreviewQrDataUrl(null) })

    return () => { cancelled = true }
  }, [previewRecord?.card.token])

  const previewData: CardFaceData | undefined = previewRecord
    ? {
      token: previewRecord.card.token || '—',
      studentName: previewRecord.student.name,
      studentGrade: `${previewRecord.student.grade} — ${previewRecord.student.class_name}`,
      studentId: previewRecord.student.national_id ?? '—',
      version: previewRecord.card.version,
      status: previewRecord.card.is_active ? 'نشطة' : 'معطلة',
      issued: previewRecord.card.issued_at ? formatDate(previewRecord.card.issued_at) : '—',
      qrDataUrl: previewQrDataUrl,
    }
    : undefined

  /* أسباب مصفّاة لعمود المحرر */
  const filteredReasons = useMemo(
    () => reasons.filter((reason) => {
      if (reasonTypeFilter !== 'all' && reason.type !== reasonTypeFilter) return false
      if (!showInactiveReasons && !reason.is_active) return false
      return true
    }),
    [reasons, reasonTypeFilter, showInactiveReasons],
  )

  /* الطلاب المطابقون لبحث عمود التسجيل */
  const matchedStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return []
    return students
      .filter((student) => `${student.name} ${student.grade} ${student.class_name}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [students, studentQuery])

  const selectedStudent = students.find((student) => student.id === Number(manualForm.student_id))
  const selectedReason = reasons.find((reason) => reason.id === Number(manualForm.reason_id))
  const activeReasons = manualForm.type === 'reward' ? rewardReasons : violationReasons
  const quickValues = (manualForm.type === 'reward' ? settingsDraft.reward_values : settingsDraft.violation_values) ?? []

  /* حالة البرنامج للشارة: المفتاحان مدفونان في الإعدادات، والشارة ترفعهما لكل الشاشات */
  const programBadge = useMemo(() => {
    const rewards = settingsQuery.data?.rewards_enabled ?? true
    const violations = settingsQuery.data?.violations_enabled ?? true
    if (!rewards && !violations) return { label: 'البرنامج متوقف', tone: TONES.red }
    if (rewards && violations) return { label: 'مكافآت + مخالفات', tone: TONES.green }
    if (rewards) return { label: 'تعزيز فقط', tone: TONES.green }
    return { label: 'مخالفات فقط', tone: TONES.amber }
  }, [settingsQuery.data])

  /* حقول غير محفوظة في الإعدادات */
  const unsavedSettingsCount = useMemo(() => {
    const saved = getSettingsPayload(settingsQuery.data)
    return (Object.keys(settingsDraft) as Array<keyof PointSettingsUpdatePayload>).filter((key) => {
      const a = settingsDraft[key]
      const b = saved[key]
      if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])
      return a !== b
    }).length
  }, [settingsDraft, settingsQuery.data])

  const studentFilterActive = transactionFilters.student_id != null
  const filteredStudentName = studentFilterActive
    ? leaderboardItems.find((e) => e.student_id === transactionFilters.student_id)?.student.name
      ?? students.find((s) => s.id === transactionFilters.student_id)?.name
    : null

  return (
    <WsPage>
      <WsHeader
        title="برنامج نقاطي"
        badge={<span style={{ color: programBadge.tone.tx }}>{programBadge.label}</span>}
        actions={
          <>
            {activeTab === 'cards' && (
              <WsBtn
                variant="primary"
                icon={Download}
                onClick={handleExportAllCards}
                disabled={isExportingAllCards || !cards.length}
              >
                {isExportingAllCards ? 'جارٍ التصدير...' : `تصدير بطاقات هذه الصفحة (${cards.length}) PDF`}
              </WsBtn>
            )}
            {activeTab === 'settings' && (
              <WsBtn
                variant="primary"
                icon={Save}
                type="submit"
                form="points-settings-form"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </WsBtn>
            )}
            {activeTab === 'reasons' && editingReason && (
              <WsBtn icon={Plus} onClick={() => setEditingReason(null)}>إنشاء سبب جديد</WsBtn>
            )}
          </>
        }
        facts={
          <>
            {/* تسمية صادقة: الرقم مجموع أول عشرة فقط لأن الاستعلام مثبّت على per_page:10 */}
            <WsFact icon={Trophy} label="نقاط أعلى ١٠">{formatNumber(totalPoints)}</WsFact>
            <WsFact icon={Users} label="طلاب لديهم نقاط">{formatNumber(totalTrackedStudents)}</WsFact>
            <WsFact icon={Activity} label="عمليات">{formatNumber(totalTransactions)}</WsFact>
            <WsFact icon={CreditCard} label="بطاقات QR">{formatNumber(cardsMeta?.total ?? cards.length)}</WsFact>
            {topStudent && (
              <WsFact icon={Crown} label="المتصدر">
                <span style={{ color: TONES.green.tx }}>{topStudent.student.name}</span>
              </WsFact>
            )}
          </>
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`ws-seg__btn ${activeTab === key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'transactions' && (
          <>
            <WsField label="النوع">
              <div className="ws-seg">
                {([
                  ['', 'الكل'],
                  ['reward', 'مكافآت'],
                  ['violation', 'مخالفات'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value || 'all'}
                    type="button"
                    className={`ws-seg__btn ${(transactionFilters.type ?? '') === value ? 'is-active' : ''}`}
                    onClick={() => handleTransactionFilterChange('type', value || undefined)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </WsField>
            <WsField label="بحث" grow>
              <WsInput
                type="search"
                placeholder="بحث عن طالب أو سبب"
                value={transactionFilters.search ?? ''}
                onChange={(event) => handleTransactionFilterChange('search', event.target.value || undefined)}
                style={{ width: '100%' }}
              />
            </WsField>
            <WsField label="من">
              <WsInput
                type="date"
                value={transactionFilters.date_from ?? ''}
                onChange={(event) => handleTransactionFilterChange('date_from', event.target.value || undefined)}
              />
            </WsField>
            <WsField label="إلى">
              <WsInput
                type="date"
                value={transactionFilters.date_to ?? ''}
                onChange={(event) => handleTransactionFilterChange('date_to', event.target.value || undefined)}
              />
            </WsField>
            {studentFilterActive && (
              <WsBtn
                size="sm"
                icon={X}
                onClick={() => handleTransactionFilterChange('student_id', undefined)}
              >
                {filteredStudentName ?? 'طالب محدد'}
              </WsBtn>
            )}
          </>
        )}

        {activeTab === 'cards' && (
          <>
            <WsField label="بحث" grow>
              <div style={{ position: 'relative' }}>
                <WsInput
                  type="search"
                  placeholder="بحث عن طالب"
                  value={cardFilters.search ?? ''}
                  onChange={(event) => handleCardFilterChange('search', event.target.value)}
                  style={{ width: '100%', paddingInlineStart: 26 }}
                />
                <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
              </div>
            </WsField>
            <WsField label="الصف">
              <WsSelect value={cardFilters.grade ?? ''} onChange={(event) => handleCardFilterChange('grade', event.target.value)}>
                <option value="">جميع الصفوف</option>
                {gradeOptions.map((grade) => (<option key={grade} value={grade}>{grade}</option>))}
              </WsSelect>
            </WsField>
            <WsField label="الفصل">
              <WsSelect value={cardFilters.class_name ?? ''} onChange={(event) => handleCardFilterChange('class_name', event.target.value)}>
                <option value="">جميع الفصول</option>
                {classOptions.map((className) => (<option key={className} value={className}>{className}</option>))}
              </WsSelect>
            </WsField>
          </>
        )}

        {activeTab === 'reasons' && (
          <>
            <WsField label="النوع">
              <div className="ws-seg">
                {([
                  ['all', 'الكل'],
                  ['reward', 'مكافآت'],
                  ['violation', 'مخالفات'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`ws-seg__btn ${reasonTypeFilter === value ? 'is-active' : ''}`}
                    onClick={() => setReasonTypeFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </WsField>
            <WsField label="إظهار المعطلة">
              <WsSwitch checked={showInactiveReasons} onChange={setShowInactiveReasons} />
            </WsField>
          </>
        )}

        {activeTab === 'settings' && settingsQuery.isFetching && (
          <span style={{ fontSize: 11, color: 'var(--ws-text-2)', marginInlineStart: 'auto' }}>جارٍ المزامنة...</span>
        )}
      </WsToolbar>

      <WsLayout>
        {/* ═══ لوحة الشرف — عمود مقيم مع سجل العمليات ═══ */}
        {activeTab === 'transactions' && (
          <WsSideCol side="start" title="لوحة الشرف" icon={Award} storageKey="ws:points:board" width={300}>
            <WsBlock fill scroll>
              {leaderboardQuery.isLoading ? (
                <WsEmpty loading>جارٍ التحميل...</WsEmpty>
              ) : leaderboardItems.length === 0 ? (
                <WsEmpty icon={Trophy}>لا توجد نقاط مسجلة بعد</WsEmpty>
              ) : (
                leaderboardItems.map((entry, index) => {
                  const isFiltered = transactionFilters.student_id === entry.student_id
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        handleTransactionFilterChange('student_id', isFiltered ? undefined : entry.student_id)
                        if (!isFiltered) {
                          setManualForm((current) => ({ ...current, student_id: entry.student_id }))
                          setStudentQuery(entry.student.name)
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--ws-hairline)',
                        cursor: 'pointer',
                        background: isFiltered ? 'var(--ws-accent-soft)' : 'transparent',
                        boxShadow: isFiltered ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10.5,
                            fontWeight: 800,
                            background: index === 0 ? TONES.green.bg : 'var(--ws-surface-2)',
                            color: index === 0 ? TONES.green.tx : 'var(--ws-text-2)',
                            border: `1px solid ${index === 0 ? TONES.green.bd : 'var(--ws-border)'}`,
                          }}
                        >
                          {index + 1}
                        </span>
                        <InitialAvatar name={entry.student.name} tone={TONES.sky} size={24} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.student.name}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                            {entry.student.grade} - {entry.student.class_name}
                          </span>
                        </span>
                        <b style={{ fontSize: 12.5, flexShrink: 0 }}>{formatNumber(entry.total_points)}</b>
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <LeaderBar
                          totalPoints={entry.total_points}
                          topPoints={topStudent?.total_points ?? entry.total_points}
                          rewards={entry.lifetime_rewards}
                          violations={entry.lifetime_violations}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </WsBlock>
          </WsSideCol>
        )}

        <WsMain>
          {/* ═══ سجل العمليات ═══ */}
          {activeTab === 'transactions' && (
            <WsBlock
              fill
              title="سجل العمليات"
              icon={Activity}
              count={transactionMeta?.total ?? transactions.length}
              tools={
                <Pager
                  page={transactionMeta?.current_page ?? 1}
                  lastPage={transactionMeta?.last_page ?? 1}
                  total={transactionMeta?.total}
                  unit="عملية"
                  onChange={handleTransactionPageChange}
                />
              }
            >
              {transactionsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل السجل...</WsEmpty>
              ) : transactions.length === 0 ? (
                <WsEmpty icon={Activity}>لا توجد عمليات مسجلة مطابقة للمرشحات الحالية</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>الطالب</th>
                      <th>النوع</th>
                      <th>القيمة</th>
                      <th>السبب</th>
                      <th>المصدر</th>
                      <th>المعلم</th>
                      <th>تاريخ التنفيذ</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const isUndone = Boolean(transaction.undone_at)
                      const src = sourceMeta(transaction.source)
                      const windowOver = isUndoWindowOver(transaction.undoable_until)
                      const isUndoing = undoTransactionMutation.isPending && undoTransactionMutation.variables === transaction.id
                      const isDeleting = deleteTransactionMutation.isPending && deleteTransactionMutation.variables === transaction.id
                      return (
                        <tr key={transaction.id} style={isUndone ? { background: TONES.gray.bg, opacity: 0.75 } : undefined}>
                          <td style={{ fontWeight: 600 }}>{transaction.student?.name ?? 'طالب غير معروف'}</td>
                          <td>
                            <ToneChip tone={transaction.type === 'reward' ? TONES.green : TONES.red}>
                              {transaction.type === 'reward' ? 'مكافأة' : 'مخالفة'}
                            </ToneChip>
                          </td>
                          <td
                            style={{
                              fontWeight: 800,
                              color: transaction.type === 'reward' ? TONES.green.tx : TONES.red.tx,
                              textDecoration: isUndone ? 'line-through' : undefined,
                            }}
                          >
                            {transaction.type === 'reward' ? '+' : '−'}
                            {formatNumber(transaction.amount)}
                          </td>
                          <td style={{ color: 'var(--ws-text-2)' }}>{transaction.reason?.title ?? '—'}</td>
                          <td><ToneChip tone={src.tone}>{src.label}</ToneChip></td>
                          <td style={{ color: 'var(--ws-text-2)' }}>{transaction.teacher?.name ?? '—'}</td>
                          <td style={{ color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>{formatDate(transaction.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {isUndone ? (
                                <ToneChip tone={TONES.gray}>ملغاة</ToneChip>
                              ) : (
                                <>
                                  <WsBtn
                                    size="sm"
                                    icon={Undo}
                                    onClick={() => handleUndoTransaction(transaction)}
                                    disabled={undoTransactionMutation.isPending || Boolean(transaction.undone_at)}
                                  >
                                    {isUndoing ? 'جارٍ...' : 'تراجع'}
                                    {transaction.undoable_until && !windowOver && (
                                      <UndoCountdown until={transaction.undoable_until} />
                                    )}
                                  </WsBtn>
                                  {windowOver && <ToneChip tone={TONES.gray}>انتهت المهلة</ToneChip>}
                                </>
                              )}
                              <WsIconBtn
                                icon={Trash2}
                                label={isDeleting ? 'جارٍ الحذف...' : 'حذف السجل'}
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.')) {
                                    deleteTransactionMutation.mutate(transaction.id)
                                  }
                                }}
                                disabled={deleteTransactionMutation.isPending}
                                style={{ color: TONES.red.tx }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              )}
            </WsBlock>
          )}

          {/* ═══ بطاقات الطلاب ═══ */}
          {activeTab === 'cards' && (
            <WsBlock
              fill
              title="بطاقات نقاط الطلاب"
              icon={CreditCard}
              count={cardsMeta?.total ?? cards.length}
              tools={
                <Pager
                  page={cardPage}
                  lastPage={totalCardPages}
                  total={cardsMeta?.total}
                  unit="طالب"
                  onChange={handleCardPageChange}
                />
              }
            >
              {cardsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل البطاقات...</WsEmpty>
              ) : cards.length === 0 ? (
                <WsEmpty icon={CreditCard}>لم يتم العثور على بطاقات مطابقة للمرشحات الحالية</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>اسم الطالب</th>
                      <th>الصف</th>
                      <th>الفصل</th>
                      <th>رقم الهوية</th>
                      <th>حالة البطاقة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((record, index) => {
                      const isPreviewed = previewRecord?.card.id === record.card.id
                      const isRegenerating = regenerateCardMutation.isPending && regenerateCardMutation.variables === record.student.id
                      return (
                        <tr
                          key={record.card.id}
                          className={`is-clickable ${isPreviewed ? 'is-selected' : ''}`}
                          onClick={() => setPreviewCardId(record.card.id)}
                        >
                          <td style={{ color: 'var(--ws-text-2)' }}>{((cardPage - 1) * 20) + index + 1}</td>
                          <td style={{ fontWeight: 600 }}>{record.student.name}</td>
                          <td style={{ color: 'var(--ws-text-2)' }}>{record.student.grade}</td>
                          <td style={{ color: 'var(--ws-text-2)' }}>{record.student.class_name}</td>
                          {/* البطاقة المطبوعة تحمل national_id — فليقل العمود ما تقوله البطاقة */}
                          <td style={{ color: 'var(--ws-text-2)' }}>{record.student.national_id ?? '—'}</td>
                          <td>
                            {record.card.is_active
                              ? <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>نشطة</span>
                              : <ToneChip tone={TONES.gray}>معطلة</ToneChip>}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <WsBtn
                                size="sm"
                                icon={RefreshCcw}
                                onClick={() => setRegenerateTarget(record)}
                                disabled={regenerateCardMutation.isPending}
                              >
                                {isRegenerating ? 'جارٍ...' : 'إعادة'}
                              </WsBtn>
                              <WsBtn
                                size="sm"
                                variant="primary"
                                icon={Download}
                                onClick={() => handleExportSingleCard(record)}
                                disabled={isExportingAllCards || exportingCardId === record.student.id}
                              >
                                {exportingCardId === record.student.id ? 'جارٍ...' : 'تصدير'}
                              </WsBtn>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              )}
            </WsBlock>
          )}

          {/* ═══ أسباب النقاط ═══ */}
          {activeTab === 'reasons' && (
            <WsBlock fill title="قائمة الأسباب" icon={ListChecks} count={filteredReasons.length}>
              {reasonsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل الأسباب...</WsEmpty>
              ) : filteredReasons.length === 0 ? (
                <WsEmpty icon={ListChecks}>لا توجد أسباب مطابقة</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>العنوان</th>
                      <th>النوع</th>
                      <th>القيمة</th>
                      <th>التصنيف</th>
                      <th>الحالة</th>
                      <th>آخر تحديث</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReasons.map((reason) => (
                      <tr
                        key={reason.id}
                        className={`is-clickable ${editingReason?.id === reason.id ? 'is-selected' : ''}`}
                        onClick={() => setEditingReason(reason)}
                        style={!reason.is_active ? { opacity: 0.65 } : undefined}
                      >
                        <td style={{ fontWeight: 600 }}>{reason.title}</td>
                        <td>
                          <ToneChip tone={reason.type === 'reward' ? TONES.green : TONES.red}>
                            {reason.type === 'reward' ? 'مكافأة' : 'مخالفة'}
                          </ToneChip>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatNumber(reason.value)}</td>
                        <td style={{ color: 'var(--ws-text-2)' }}>{reason.category ?? '—'}</td>
                        {/* الحياد الافتراضي: «نشط» بلا شارة، والمعطل وحده يُعلَّم */}
                        <td>{reason.is_active ? <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>نشط</span> : <ToneChip tone={TONES.gray}>معطل</ToneChip>}</td>
                        <td style={{ color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>{formatDate(reason.updated_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {reason.is_active ? (
                            <WsBtn
                              size="sm"
                              icon={X}
                              onClick={() => handleDeactivateReason(reason)}
                              disabled={deactivateReasonMutation.isPending}
                              style={{ color: TONES.red.tx }}
                            >
                              تعطيل
                            </WsBtn>
                          ) : (
                            <span style={{ color: 'var(--ws-text-2)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </WsTable>
              )}
            </WsBlock>
          )}

          {/* ═══ الإعدادات ═══ */}
          {activeTab === 'settings' && (
            <WsBlock fill scroll>
              <form id="points-settings-form" onSubmit={handleSettingsSubmit}>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
                  <div>
                    <p className="ws-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ShieldCheck style={{ width: 12, height: 12 }} /> السقوف اليومية
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      <WsField label="حد نقاط المعلم اليومية">
                        <WsInput
                          type="number"
                          min={0}
                          value={settingsDraft.daily_teacher_cap}
                          onChange={(event) => handleSettingsFieldChange('daily_teacher_cap', Number(event.target.value))}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>أقصى مجموع نقاط يمكن للمعلم توزيعها في اليوم.</p>
                      </WsField>
                      <WsField label="حد نقاط الطالب اليومية">
                        <WsInput
                          type="number"
                          min={0}
                          value={settingsDraft.per_student_cap}
                          onChange={(event) => handleSettingsFieldChange('per_student_cap', Number(event.target.value))}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>أقصى مجموع نقاط يستقبلها الطالب في اليوم — <b>من كل معلم على حدة</b>.</p>
                      </WsField>
                      <WsField label="حد المخالفات اليومية">
                        <WsInput
                          type="number"
                          min={0}
                          value={settingsDraft.daily_violation_cap}
                          onChange={(event) => handleSettingsFieldChange('daily_violation_cap', Number(event.target.value))}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>أقصى مجموع نقاط مخالفات تُسجَّل للطالب خلال يوم واحد.</p>
                      </WsField>
                    </div>
                  </div>

                  <div>
                    <p className="ws-label" style={{ marginBottom: 8 }}>ما هو مفعّل</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                      {([
                        ['rewards_enabled', 'تفعيل المكافآت', 'السماح للمعلمين بمنح نقاط إيجابية.'],
                        ['violations_enabled', 'تفعيل المخالفات', 'السماح بتسجيل مخالفات وخصم نقاط.'],
                        ['require_camera_confirmation', 'تأكيد بالكاميرا', 'طلب صورة توثيقية عند منح النقاط.'],
                      ] as Array<[keyof PointSettingsUpdatePayload, string, string]>).map(([field, label, hint]) => (
                        <div
                          key={field}
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
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{label}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>{hint}</p>
                          </div>
                          <WsSwitch
                            checked={Boolean(settingsDraft[field])}
                            onChange={(checked) => handleSettingsFieldChange(field, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="ws-label" style={{ marginBottom: 8 }}>القيم المقترحة ومهلة التراجع</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <WsField label="قيم المكافآت المقترحة">
                        <WsInput
                          type="text"
                          placeholder="مثال: 5,10,15"
                          value={settingsDraft.reward_values?.join(', ') ?? ''}
                          onChange={(event) => handleSettingsFieldChange('reward_values', sanitizeNumericList(event.target.value))}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>استخدم فاصلة للفصل بين القيم — تظهر كأزرار سريعة في عمود التسجيل.</p>
                      </WsField>
                      <WsField label="قيم المخالفات المقترحة">
                        <WsInput
                          type="text"
                          placeholder="مثال: 5,10,15"
                          value={settingsDraft.violation_values?.join(', ') ?? ''}
                          onChange={(event) => handleSettingsFieldChange('violation_values', sanitizeNumericList(event.target.value))}
                        />
                      </WsField>
                      <WsField label="مهلة التراجع عن العملية (بالثواني)">
                        <WsInput
                          type="number"
                          min={0}
                          value={settingsDraft.undo_timeout_seconds}
                          onChange={(event) => handleSettingsFieldChange('undo_timeout_seconds', Number(event.target.value))}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>يظهر أثرها كعدّاد نابض على زر التراجع في سجل العمليات.</p>
                      </WsField>
                    </div>
                  </div>
                </div>
              </form>
            </WsBlock>
          )}
        </WsMain>

        {/* ═══ التسجيل السريع — طرف الحلقة مع لوحة الشرف ═══ */}
        {activeTab === 'transactions' && (
          <WsSideCol side="end" title="تسجيل سريع" icon={Plus} storageKey="ws:points:entry" width={360}>
            <WsBlock fill scroll>
              <form onSubmit={handleManualFormSubmit} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* الطالب: بحث بدل قائمة بمئات الأسماء */}
                <WsField label="الطالب *">
                  {selectedStudent ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        background: 'var(--ws-accent-soft)',
                        border: '1px solid var(--ws-accent)',
                        borderRadius: 8,
                        padding: '6px 8px',
                      }}
                    >
                      <InitialAvatar name={selectedStudent.name} tone={TONES.sky} size={24} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{selectedStudent.name}</span>
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                          {selectedStudent.grade} - {selectedStudent.class_name}
                        </span>
                      </span>
                      <WsIconBtn
                        icon={X}
                        label="إلغاء تحديد الطالب"
                        onClick={() => {
                          setManualForm((current) => ({ ...current, student_id: 0 }))
                          setStudentQuery('')
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <WsInput
                        type="search"
                        value={studentQuery}
                        onChange={(event) => setStudentQuery(event.target.value)}
                        placeholder="ابحث عن الطالب بالاسم أو الصف..."
                      />
                      {matchedStudents.length > 0 && (
                        <div style={{ marginTop: 4, border: '1px solid var(--ws-border)', borderRadius: 8, overflow: 'hidden' }}>
                          {matchedStudents.map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                setManualForm((current) => ({ ...current, student_id: student.id }))
                                setStudentQuery(student.name)
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'right',
                                padding: '6px 9px',
                                border: 'none',
                                borderBottom: '1px solid var(--ws-hairline)',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                color: 'var(--ws-text)',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ws-accent-soft)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{student.name}</span>
                              <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                                {student.grade} - {student.class_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </WsField>

                {/* السبب أولاً: نقرة تضبط النوع والقيمة معاً فلا يقع زوج متناقض */}
                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>السبب — يضبط النوع والقيمة</p>
                  <div className="ws-seg" style={{ marginBottom: 6 }}>
                    {([
                      ['reward', 'مكافأة'],
                      ['violation', 'مخالفة'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`ws-seg__btn ${manualForm.type === value ? 'is-active' : ''}`}
                        onClick={() => setManualForm((current) => ({ ...current, type: value, reason_id: undefined }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {activeReasons.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>لا توجد أسباب نشطة من هذا النوع.</p>
                  ) : (
                    <div className="ws-choice-grid" style={{ gridTemplateColumns: '1fr' }}>
                      {activeReasons.map((reason) => {
                        const isSelected = Number(manualForm.reason_id) === reason.id
                        const tone = reason.type === 'reward' ? TONES.green : TONES.red
                        return (
                          <button
                            key={reason.id}
                            type="button"
                            className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                            style={{
                              justifyContent: 'space-between',
                              ...(isSelected
                                ? { background: tone.bg, borderColor: tone.tx, color: tone.tx, boxShadow: `0 0 0 1px ${tone.tx}` }
                                : {}),
                            }}
                            onClick={() => setManualForm((current) => ({
                              ...current,
                              reason_id: reason.id,
                              type: reason.type,
                              amount: reason.value,
                            }))}
                          >
                            <span>{reason.title}</span>
                            <b style={{ color: tone.tx }}>{reason.type === 'reward' ? '+' : '−'}{reason.value}</b>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <WsField label="القيمة">
                  <WsInput
                    type="number"
                    value={manualForm.amount}
                    onChange={(event) => setManualForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                  />
                  {quickValues.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                      {quickValues.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="ws-chip"
                          onClick={() => setManualForm((current) => ({ ...current, amount: value }))}
                          style={Number(manualForm.amount) === value
                            ? {
                              background: manualForm.type === 'reward' ? TONES.green.bg : TONES.red.bg,
                              borderColor: manualForm.type === 'reward' ? TONES.green.tx : TONES.red.tx,
                              color: manualForm.type === 'reward' ? TONES.green.tx : TONES.red.tx,
                            }
                            : undefined}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  )}
                </WsField>

                <WsField label="المعلم (اختياري)">
                  <WsSelect
                    value={manualForm.teacher_id ?? ''}
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        teacher_id: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  >
                    <option value="">بدون معلم</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </WsSelect>
                </WsField>

                <WsField label="السياق (اختياري)">
                  <WsInput
                    type="text"
                    value={manualForm.context ?? ''}
                    onChange={(event) => setManualForm((current) => ({ ...current, context: event.target.value }))}
                    placeholder="مثال: حصة الرياضيات، الطابور الصباحي"
                  />
                </WsField>

                <WsField label="ملاحظات">
                  <WsTextarea
                    value={manualForm.notes ?? ''}
                    onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={2}
                    placeholder="أضف أي تفاصيل إضافية توضح سبب منح النقاط"
                  />
                </WsField>

                <WsBtn
                  type="submit"
                  variant="primary"
                  icon={Plus}
                  disabled={createManualTransactionMutation.isPending || !manualForm.student_id || Number(manualForm.amount) === 0}
                  style={{ justifyContent: 'center' }}
                >
                  {createManualTransactionMutation.isPending ? 'جارٍ التسجيل...' : 'تسجيل العملية'}
                </WsBtn>
                {(!manualForm.student_id || Number(manualForm.amount) === 0) && (
                  <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                    {!manualForm.student_id ? 'اختر الطالب أولاً' : 'القيمة لا يمكن أن تكون صفراً'}
                  </p>
                )}
                {selectedReason && Number(manualForm.amount) !== selectedReason.value && (
                  <p style={{ margin: 0, fontSize: 10.5, color: TONES.amber.tx, textAlign: 'center' }}>
                    القيمة معدّلة يدوياً — قيمة «{selectedReason.title}» الافتراضية {selectedReason.value}
                  </p>
                )}
              </form>
            </WsBlock>
          </WsSideCol>
        )}

        {/* ═══ ★ البطاقة الحيّة — القالب يخرج من المنفى ═══ */}
        {activeTab === 'cards' && (
          <WsSideCol side="end" title="البطاقة الحيّة" icon={CreditCard} storageKey="ws:points:card" width={400}>
            <WsBlock fill scroll>
              {!previewRecord ? (
                <WsEmpty icon={CreditCard}>اختر بطاقة من الجدول لمعاينتها</WsEmpty>
              ) : (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{previewRecord.student.name}</span>
                    {!previewRecord.card.token && <ToneChip tone={TONES.red}>بلا رمز مميز — أعد التوليد</ToneChip>}
                  </div>

                  {/* وجه البطاقة الحقيقي مصغّراً — ما تراه هو ما يُطبع */}
                  <div style={{ height: 450, overflow: 'hidden' }}>
                    <div className="ws-rise" key={previewRecord.card.token} style={{ transform: 'scale(0.78)', transformOrigin: 'top right', width: 384 }}>
                      <PointsCardFace data={previewData} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <WsBtn
                      variant="primary"
                      icon={Download}
                      onClick={() => handleExportSingleCard(previewRecord)}
                      disabled={isExportingAllCards || exportingCardId === previewRecord.student.id || !previewRecord.card.token}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {exportingCardId === previewRecord.student.id ? 'جارٍ...' : 'تصدير هذه البطاقة'}
                    </WsBtn>
                    <WsBtn
                      icon={RefreshCcw}
                      onClick={() => setRegenerateTarget(previewRecord)}
                      disabled={regenerateCardMutation.isPending}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      إعادة توليد
                    </WsBtn>
                  </div>
                </div>
              )}
            </WsBlock>
          </WsSideCol>
        )}

        {/* ═══ محرر السبب ═══ */}
        {activeTab === 'reasons' && (
          <WsSideCol
            side="end"
            title={editingReason ? `تعديل: ${editingReason.title}` : 'إضافة سبب'}
            icon={editingReason ? ListChecks : Plus}
            storageKey="ws:points:reason"
            width={360}
            tools={editingReason ? <WsIconBtn icon={X} label="إنهاء التعديل" onClick={() => setEditingReason(null)} /> : undefined}
          >
            <WsBlock fill scroll>
              <form onSubmit={handleReasonSubmit} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <WsField label="عنوان السبب *">
                  <WsInput
                    type="text"
                    value={reasonForm.title}
                    onChange={(event) => setReasonForm((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </WsField>

                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>النوع</p>
                  <div className="ws-choice-grid">
                    {([
                      ['reward', 'مكافأة', TONES.green],
                      ['violation', 'مخالفة', TONES.red],
                    ] as const).map(([value, label, tone]) => (
                      <button
                        key={value}
                        type="button"
                        className={`ws-choice ${reasonForm.type === value ? 'is-selected' : ''}`}
                        style={reasonForm.type === value
                          ? { background: tone.bg, borderColor: tone.tx, color: tone.tx, boxShadow: `0 0 0 1px ${tone.tx}` }
                          : undefined}
                        onClick={() => setReasonForm((current) => ({ ...current, type: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <WsField label="قيمة النقاط">
                    <WsInput
                      type="number"
                      value={reasonForm.value}
                      onChange={(event) => setReasonForm((current) => ({ ...current, value: Number(event.target.value) }))}
                    />
                  </WsField>
                  <WsField label="الترتيب في العرض">
                    <WsInput
                      type="number"
                      value={reasonForm.display_order}
                      onChange={(event) => setReasonForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
                    />
                  </WsField>
                </div>

                <WsField label="التصنيف">
                  <WsInput
                    type="text"
                    value={reasonForm.category ?? ''}
                    onChange={(event) => setReasonForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="سلوك، انضباط، مشاركة..."
                  />
                </WsField>

                <WsField label="الوصف">
                  <WsTextarea
                    value={reasonForm.description ?? ''}
                    onChange={(event) => setReasonForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    placeholder="اشرح الاستخدام المثالي لهذا السبب"
                  />
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
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>متاح للاستخدام</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>عند التعطيل يختفي السبب من تطبيق المعلمين.</p>
                  </div>
                  <WsSwitch
                    checked={reasonForm.is_active}
                    onChange={(checked) => setReasonForm((current) => ({ ...current, is_active: checked }))}
                  />
                </div>

                <WsBtn
                  type="submit"
                  variant="primary"
                  icon={Save}
                  disabled={createReasonMutation.isPending || updateReasonMutation.isPending}
                  style={{ justifyContent: 'center' }}
                >
                  {editingReason
                    ? updateReasonMutation.isPending
                      ? 'جارٍ التحديث...'
                      : 'تحديث السبب'
                    : createReasonMutation.isPending
                      ? 'جارٍ الإضافة...'
                      : 'إضافة السبب'}
                </WsBtn>
              </form>
            </WsBlock>
          </WsSideCol>
        )}

        {/* ═══ ما الذي سيراه المعلم؟ — ترجمة الإعدادات لجمل حيّة ═══ */}
        {activeTab === 'settings' && (
          <WsSideCol side="end" title="ما الذي سيراه المعلم؟" icon={ShieldCheck} storageKey="ws:points:policy" width={340}>
            <WsBlock fill scroll>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unsavedSettingsCount > 0 && (
                  <ToneChip tone={TONES.amber}>{unsavedSettingsCount} حقول غير محفوظة</ToneChip>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, lineHeight: 1.9 }}>
                  <PolicyLine
                    on={settingsDraft.rewards_enabled}
                    text={settingsDraft.rewards_enabled
                      ? `المعلم يمنح حتى ${formatNumber(settingsDraft.daily_teacher_cap)} نقطة يومياً`
                      : 'المكافآت معطّلة — لا يستطيع المعلم منح نقاط'}
                  />
                  <PolicyLine
                    on={settingsDraft.violations_enabled}
                    text={settingsDraft.violations_enabled
                      ? `المخالفات مفعّلة — حتى ${formatNumber(settingsDraft.daily_violation_cap)} نقطة خصم للطالب يومياً`
                      : 'المخالفات معطّلة — لا خصم نقاط'}
                  />
                  <PolicyLine
                    on
                    text={`الطالب يستقبل حتى ${formatNumber(settingsDraft.per_student_cap)} نقطة يومياً من كل معلم على حدة`}
                  />
                  <PolicyLine
                    on={settingsDraft.undo_timeout_seconds > 0}
                    text={settingsDraft.undo_timeout_seconds > 0
                      ? `التراجع متاح ${Math.round(settingsDraft.undo_timeout_seconds / 60)} دقيقة بعد التسجيل`
                      : 'لا مهلة تراجع — العملية نهائية فور تسجيلها'}
                  />
                  <PolicyLine
                    on={settingsDraft.require_camera_confirmation}
                    text={settingsDraft.require_camera_confirmation
                      ? 'يُطلب من المعلم صورة توثيقية عند منح النقاط'
                      : 'لا صورة توثيقية مطلوبة'}
                  />
                </div>

                {/* المعاينة تُظهر ما فهمَته sanitizeNumericList فعلاً لا ما كُتب */}
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--ws-hairline)' }}>
                  <p className="ws-label" style={{ marginBottom: 5 }}>أزرار القيم التي سيراها</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(settingsDraft.reward_values ?? []).length === 0 && (settingsDraft.violation_values ?? []).length === 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>لا قيم مقترحة</span>
                    ) : (
                      <>
                        {(settingsDraft.reward_values ?? []).map((value) => (
                          <ToneChip key={`r${value}`} tone={TONES.green}>+{value}</ToneChip>
                        ))}
                        {(settingsDraft.violation_values ?? []).map((value) => (
                          <ToneChip key={`v${value}`} tone={TONES.red}>−{value}</ToneChip>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <WsAlert tone="info" boxed>
                  التسجيل اليدوي من هذه الصفحة لا يخضع للسقوف أعلاه — السقوف تسري على تطبيق المعلمين.
                </WsAlert>
              </div>
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>

      {/*
        قالب التصدير 384×576 — يسكن جذر الصفحة بلا شرط تبويب ولا عمود جانبي.
        السبب: WsSideCol يفصل أبناءه من الشجرة عند الطي، وربطه بتبويب cards كان يعني
        أن انتقال المدير لتبويب آخر أثناء تصدير جماعي يقتل الالتقاط في منتصفه.
      */}
      <PointsCardFace hidden innerRef={(node) => setExportCardElement(node)} />

      {/* تأكيد إعادة التوليد: البطاقة القديمة في جيب الطالب تموت بهذه النقرة */}
      {regenerateTarget && (
        <div className="ws-modal" onClick={() => setRegenerateTarget(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إعادة توليد بطاقة {regenerateTarget.student.name}</h3>
              <p className="ws-modal__sub">سيُسك رمز جديد للبطاقة</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="warn" boxed>
                البطاقة المطبوعة الحالية ستتوقف عن العمل فور إعادة التوليد — يلزم طباعة البطاقة الجديدة وتسليمها للطالب.
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setRegenerateTarget(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="primary"
                icon={RefreshCcw}
                disabled={regenerateCardMutation.isPending}
                onClick={() => {
                  handleRegenerateCard(regenerateTarget.student.id)
                  setRegenerateTarget(null)
                }}
              >
                {regenerateCardMutation.isPending ? 'جارٍ...' : 'إعادة التوليد'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

/** سطر سياسة في عمود المعاينة: نقطة خضراء مفعّل / رمادية معطّل */
function PolicyLine({ on, text }: { on: boolean; text: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          marginTop: 6,
          flexShrink: 0,
          background: on ? TONES.green.tx : TONES.gray.tx,
        }}
      />
      <span style={{ color: on ? 'var(--ws-text)' : 'var(--ws-text-2)' }}>{text}</span>
    </span>
  )
}
