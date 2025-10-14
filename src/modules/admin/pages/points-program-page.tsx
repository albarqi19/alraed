import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import {
  Activity,
  CreditCard,
  Download,
  Plus,
  RefreshCcw,
  Settings as SettingsIcon,
  Trophy,
  Undo,
  Users,
} from 'lucide-react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
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
} from '../hooks'
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

type TabKey = 'overview' | 'settings' | 'reasons' | 'transactions' | 'cards'

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'overview', label: 'نظرة عامة', icon: Trophy },
  { key: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  { key: 'reasons', label: 'أسباب النقاط', icon: Plus },
  { key: 'transactions', label: 'سجل العمليات', icon: Activity },
  { key: 'cards', label: 'بطاقات الطلاب', icon: CreditCard },
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
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
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

  const studentsQuery = useStudentsQuery()
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
  }, [cards])

  const totalCardPages = cardsMeta?.last_page ?? 1
  const paginatedStartIndex = cardsMeta ? (cardsMeta.current_page - 1) * cardsMeta.per_page + 1 : 0
  const paginatedEndIndex = cardsMeta ? Math.min(cardsMeta.total, cardsMeta.current_page * cardsMeta.per_page) : 0

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
        // Generate QR code for this specific student
        const qrPayload = record.card.token ?? String(record.student.id)
        
        // 🔍 Debug: عرض القيمة التي سيتم وضعها في QR
        console.log('🔍 Generating QR for student:', {
          studentId: record.student.id,
          studentName: record.student.name,
          cardToken: record.card.token,
          qrPayload: qrPayload,
          isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(qrPayload),
        })
        
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

        const safeName = record.student.name.replace(/[^\w\s\u0600-\u06FF-]/g, '_').trim() || `${record.student.id}`
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
          
          // 🔍 Debug: عرض القيمة التي سيتم وضعها في QR (للدفعة)
          console.log('🔍 [Bulk Export] Generating QR for:', {
            studentId: record.student.id,
            studentName: record.student.name,
            cardToken: record.card.token,
            qrPayload: qrPayload,
          })
          
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

  return (
    <div className="space-y-8 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">برنامج نقاطي</h1>
          <p className="text-sm text-slate-500">إدارة برنامج تعزيز السلوك الإيجابي للطلاب</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100/60 p-1 text-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition ${
                activeTab === key
                  ? 'bg-white text-emerald-600 shadow'
                  : 'text-slate-600 hover:bg-white hover:text-emerald-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'overview' && (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-600">
                  <Trophy className="h-5 w-5" />
                </div>
                <span className="text-sm text-slate-500">إجمالي النقاط الموزعة</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{formatNumber(totalPoints)}</p>
              <p className="mt-2 text-xs text-slate-500">يشمل المكافآت والخصومات للطلاب</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-sm text-slate-500">طلاب لديهم نقاط</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{formatNumber(totalTrackedStudents)}</p>
              <p className="mt-2 text-xs text-slate-500">يمثل الطلاب الذين حصلوا على نقاط نشطة</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-600">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-sm text-slate-500">عدد العمليات المسجلة</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{formatNumber(totalTransactions)}</p>
              <p className="mt-2 text-xs text-slate-500">يشمل التعزيزات والمخالفات المسجلة عبر المنصة</p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-teal-100 p-2 text-teal-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-sm text-slate-500">بطاقات QR جاهزة</span>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{formatNumber(cardsMeta?.total ?? cards.length)}</p>
              <p className="mt-2 text-xs text-slate-500">بطاقات صالحة لتتبع النقاط عبر رمز QR</p>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">لوحة الشرف</h2>
                {topStudent && (
                  <div className="text-xs text-slate-500">
                    أعلى الطلاب: <span className="font-semibold text-emerald-600">{topStudent.student.name}</span>
                  </div>
                )}
              </header>
              {leaderboardQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : leaderboardItems.length ? (
                <ul className="space-y-2">
                  {leaderboardItems.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-4 text-right">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-600">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{entry.student.name}</p>
                          <p className="text-xs text-slate-500">
                            {entry.student.grade} - {entry.student.class_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{formatNumber(entry.total_points)}</p>
                        <p className="text-xs text-slate-500">نقاط إجمالية</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  لا توجد نقاط مسجلة بعد.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">آخر العمليات</h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  onClick={() => setActiveTab('transactions')}
                >
                  عرض السجل الكامل
                </button>
              </header>
              {transactionsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : transactions.length ? (
                <ul className="space-y-2">
                  {transactions.slice(0, 5).map((transaction) => (
                    <li
                      key={transaction.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-4 py-3"
                    >
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {transaction.student?.name ?? 'طالب غير معروف'}
                        </p>
                        <p className="text-xs text-slate-500">{transaction.reason?.title ?? transaction.source}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            transaction.type === 'reward' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {transaction.type === 'reward' ? '+' : '-'}
                          {formatNumber(transaction.amount)}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(transaction.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  لم يتم تسجيل عمليات بعد.
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">ضبط برنامج النقاط</h2>
            <p className="mt-1 text-sm text-slate-500">عدل سياسات البرنامج للتوافق مع لوائح المدرسة.</p>
          </header>

          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">حد نقاط المعلم اليومية</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.daily_teacher_cap}
                  onChange={(event) => handleSettingsFieldChange('daily_teacher_cap', Number(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">أقصى مجموع نقاط يمكن للمعلم توزيعها في اليوم.</p>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">حد نقاط الطالب اليومية</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.per_student_cap}
                  onChange={(event) => handleSettingsFieldChange('per_student_cap', Number(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">أقصى مجموع نقاط يحصل عليها الطالب في اليوم.</p>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">حد المخالفات اليومية</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.daily_violation_cap}
                  onChange={(event) => handleSettingsFieldChange('daily_violation_cap', Number(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">أقصى عدد مخالفات يمكن تسجيلها للطالب خلال يوم واحد.</p>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right md:col-span-2 lg:col-span-3">
                <span className="text-sm font-semibold text-slate-700">قيم المكافآت المقترحة</span>
                <input
                  type="text"
                  placeholder="مثال: 5,10,15"
                  value={settingsDraft.reward_values?.join(', ') ?? ''}
                  onChange={(event) => handleSettingsFieldChange('reward_values', sanitizeNumericList(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">استخدم فاصلة للفصل بين القيم المقترحة للمكافآت.</p>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right md:col-span-2 lg:col-span-3">
                <span className="text-sm font-semibold text-slate-700">قيم المخالفات المقترحة</span>
                <input
                  type="text"
                  placeholder="مثال: 5,10,15"
                  value={settingsDraft.violation_values?.join(', ') ?? ''}
                  onChange={(event) => handleSettingsFieldChange('violation_values', sanitizeNumericList(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">القيم المقترحة لخصم النقاط بسبب المخالفات.</p>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-right">
                <div>
                  <p className="text-sm font-semibold text-slate-700">تفعيل المكافآت</p>
                  <p className="text-xs text-slate-500">السماح للمعلمين بمنح نقاط إيجابية.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.rewards_enabled}
                  onChange={(event) => handleSettingsFieldChange('rewards_enabled', event.target.checked)}
                  className="h-5 w-5 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-right">
                <div>
                  <p className="text-sm font-semibold text-slate-700">تفعيل المخالفات</p>
                  <p className="text-xs text-slate-500">السماح بتسجيل مخالفات وخصم نقاط.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.violations_enabled}
                  onChange={(event) => handleSettingsFieldChange('violations_enabled', event.target.checked)}
                  className="h-5 w-5 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-right">
                <div>
                  <p className="text-sm font-semibold text-slate-700">تأكيد بالكاميرا</p>
                  <p className="text-xs text-slate-500">طلب صورة توثيقية عند منح النقاط.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsDraft.require_camera_confirmation}
                  onChange={(event) =>
                    handleSettingsFieldChange('require_camera_confirmation', event.target.checked)
                  }
                  className="h-5 w-5 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right md:col-span-2 lg:col-span-3">
                <span className="text-sm font-semibold text-slate-700">مهلة التراجع عن العملية (بالثواني)</span>
                <input
                  type="number"
                  min={0}
                  value={settingsDraft.undo_timeout_seconds}
                  onChange={(event) => handleSettingsFieldChange('undo_timeout_seconds', Number(event.target.value))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">عدد الثواني المتاحة للتراجع عن العملية بعد تسجيلها.</p>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {settingsQuery.isFetching && <span className="text-xs text-slate-400">جارٍ المزامنة...</span>}
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'reasons' && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingReason ? 'تعديل سبب النقاط' : 'إضافة سبب جديد'}
              </h2>
              {editingReason && (
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  onClick={() => setEditingReason(null)}
                >
                  إنشاء سبب جديد
                </button>
              )}
            </header>

            <form onSubmit={handleReasonSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">عنوان السبب</span>
                <input
                  type="text"
                  value={reasonForm.title}
                  onChange={(event) => setReasonForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">النوع</span>
                <select
                  value={reasonForm.type}
                  onChange={(event) =>
                    setReasonForm((current) => ({ ...current, type: event.target.value as PointReasonPayload['type'] }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="reward">مكافأة</option>
                  <option value="violation">مخالفة</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">قيمة النقاط</span>
                <input
                  type="number"
                  value={reasonForm.value}
                  onChange={(event) =>
                    setReasonForm((current) => ({ ...current, value: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">التصنيف</span>
                <input
                  type="text"
                  value={reasonForm.category ?? ''}
                  onChange={(event) => setReasonForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="سلوك، انضباط، مشاركة..."
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right">
                <span className="text-sm font-semibold text-slate-700">الترتيب في العرض</span>
                <input
                  type="number"
                  value={reasonForm.display_order}
                  onChange={(event) =>
                    setReasonForm((current) => ({ ...current, display_order: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 text-right md:col-span-2 lg:col-span-3">
                <span className="text-sm font-semibold text-slate-700">الوصف</span>
                <textarea
                  value={reasonForm.description ?? ''}
                  onChange={(event) => setReasonForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="اشرح الاستخدام المثالي لهذا السبب"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-right">
                <div>
                  <p className="text-sm font-semibold text-slate-700">متاح للاستخدام</p>
                  <p className="text-xs text-slate-500">عند التعطيل يختفي السبب من تطبيق المعلمين.</p>
                </div>
                <input
                  type="checkbox"
                  checked={reasonForm.is_active}
                  onChange={(event) => setReasonForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  className="h-5 w-5 rounded border border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <div className="md:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  disabled={createReasonMutation.isPending || updateReasonMutation.isPending}
                >
                  {editingReason
                    ? updateReasonMutation.isPending
                      ? 'جارٍ التحديث...'
                      : 'تحديث السبب'
                    : createReasonMutation.isPending
                    ? 'جارٍ الإضافة...'
                    : 'إضافة السبب'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">قائمة الأسباب</h2>
              <p className="text-sm text-slate-500">انقر على أي صف لتعديل السبب أو تعطيله.</p>
            </header>

            {reasonsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : reasons.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">العنوان</th>
                      <th className="px-3 py-3 font-semibold">النوع</th>
                      <th className="px-3 py-3 font-semibold">القيمة</th>
                      <th className="px-3 py-3 font-semibold">التصنيف</th>
                      <th className="px-3 py-3 font-semibold">الحالة</th>
                      <th className="px-3 py-3 font-semibold">آخر تحديث</th>
                      <th className="px-3 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reasons.map((reason) => (
                      <tr key={reason.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-semibold text-slate-900">{reason.title}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              reason.type === 'reward'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {reason.type === 'reward' ? 'مكافأة' : 'مخالفة'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{formatNumber(reason.value)}</td>
                        <td className="px-3 py-3 text-slate-600">{reason.category ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {reason.is_active ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                              نشط
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              معطل
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(reason.updated_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                              onClick={() => setEditingReason(reason)}
                            >
                              تعديل
                            </button>
                            {reason.is_active ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                                onClick={() => handleDeactivateReason(reason)}
                                disabled={deactivateReasonMutation.isPending}
                              >
                                تعطيل
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                لا توجد أسباب مسجلة بعد.
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'transactions' && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">تسجيل عملية يدوية</h2>
              <p className="text-sm text-slate-500">
                استخدم هذا النموذج لتسجيل مكافأة أو مخالفة للطالب مع تحديد السبب والسياق.
              </p>
            </header>
            <form onSubmit={handleManualFormSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-right">
                <span className="text-sm font-semibold text-slate-700">الطالب</span>
                <select
                  value={manualForm.student_id}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, student_id: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value={0} disabled>
                    اختر الطالب
                  </option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} — {student.grade} / {student.class_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-right">
                <span className="text-sm font-semibold text-slate-700">نوع العملية</span>
                <select
                  value={manualForm.type}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, type: event.target.value as 'reward' | 'violation' }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="reward">مكافأة</option>
                  <option value="violation">مخالفة</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-right">
                <span className="text-sm font-semibold text-slate-700">القيمة</span>
                <input
                  type="number"
                  value={manualForm.amount}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-right">
                <span className="text-sm font-semibold text-slate-700">السبب</span>
                <select
                  value={manualForm.reason_id ?? ''}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      reason_id: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">
                    بدون سبب محدد
                  </option>
                  {(manualForm.type === 'reward' ? rewardReasons : violationReasons).map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-right">
                <span className="text-sm font-semibold text-slate-700">المعلم (اختياري)</span>
                <input
                  type="number"
                  value={manualForm.teacher_id ?? ''}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      teacher_id: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  placeholder="أدخل رقم المعلم إن وجد"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-right md:col-span-2 lg:col-span-3">
                <span className="text-sm font-semibold text-slate-700">ملاحظات</span>
                <textarea
                  value={manualForm.notes ?? ''}
                  onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="أضف أي تفاصيل إضافية توضح سبب منح النقاط"
                />
              </label>

              <div className="md:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  disabled={createManualTransactionMutation.isPending}
                >
                  {createManualTransactionMutation.isPending ? 'جارٍ التسجيل...' : 'تسجيل العملية'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">سجل العمليات</h2>
                <p className="text-sm text-slate-500">يمكنك التراجع عن العملية خلال المهلة المحددة في الإعدادات.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={transactionFilters.type ?? ''}
                  onChange={(event) =>
                    handleTransactionFilterChange('type', event.target.value ? event.target.value : undefined)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">الكل</option>
                  <option value="reward">المكافآت</option>
                  <option value="violation">المخالفات</option>
                </select>
                <input
                  type="search"
                  placeholder="بحث عن طالب أو سبب"
                  value={transactionFilters.search ?? ''}
                  onChange={(event) => handleTransactionFilterChange('search', event.target.value || undefined)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </header>

            {transactionsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : transactions.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold">الطالب</th>
                      <th className="px-3 py-3 font-semibold">النوع</th>
                      <th className="px-3 py-3 font-semibold">القيمة</th>
                      <th className="px-3 py-3 font-semibold">السبب</th>
                      <th className="px-3 py-3 font-semibold">المعلم</th>
                      <th className="px-3 py-3 font-semibold">تاريخ التنفيذ</th>
                      <th className="px-3 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {transaction.student?.name ?? 'طالب غير معروف'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              transaction.type === 'reward'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {transaction.type === 'reward' ? 'مكافأة' : 'مخالفة'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {transaction.type === 'reward' ? '+' : '-'}
                          {formatNumber(transaction.amount)}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{transaction.reason?.title ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{transaction.teacher?.name ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(transaction.created_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
                              onClick={() => handleUndoTransaction(transaction)}
                              disabled={undoTransactionMutation.isPending || Boolean(transaction.undone_at)}
                            >
                              <Undo className="h-3.5 w-3.5" />
                              تراجع
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.')) {
                                  deleteTransactionMutation.mutate(transaction.id)
                                }
                              }}
                              disabled={deleteTransactionMutation.isPending}
                            >
                              <span>🗑️</span>
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                لا توجد عمليات مسجلة مطابقة للمرشحات الحالية.
              </div>
            )}

            {transactionMeta && transactionMeta.last_page > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>
                  صفحة {transactionMeta.current_page} من {transactionMeta.last_page} — إجمالي{' '}
                  {formatNumber(transactionMeta.total)} عملية
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: transactionMeta.last_page }).map((_, index) => {
                    const page = index + 1
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => handleTransactionPageChange(page)}
                        className={`h-8 w-8 rounded-xl text-sm font-semibold ${
                          transactionMeta.current_page === page
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'cards' && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">بطاقات نقاط الطلاب</h2>
                  <p className="text-sm text-slate-500">
                    قم بتصفية البطاقات حسب الصف أو الفصل أو ابحث باسم الطالب.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportAllCards}
                  disabled={isExportingAllCards || !cards.length}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isExportingAllCards ? 'جارٍ التصدير...' : 'تصدير جميع البطاقات PDF'}
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="بحث عن طالب"
                  value={cardFilters.search ?? ''}
                  onChange={(event) => handleCardFilterChange('search', event.target.value)}
                  className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <select
                  value={cardFilters.grade ?? ''}
                  onChange={(event) => handleCardFilterChange('grade', event.target.value)}
                  className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">جميع الصفوف</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
                <select
                  value={cardFilters.class_name ?? ''}
                  onChange={(event) => handleCardFilterChange('class_name', event.target.value)}
                  className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">جميع الفصول</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>
            </header>

            {cardsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 20 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : cards.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">اسم الطالب</th>
                        <th className="px-4 py-3 font-semibold">الصف</th>
                        <th className="px-4 py-3 font-semibold">الفصل</th>
                        <th className="px-4 py-3 font-semibold">رقم الطالب</th>
                        <th className="px-4 py-3 font-semibold">حالة البطاقة</th>
                        <th className="px-4 py-3 font-semibold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cards.map((record, index) => (
                        <tr key={record.card.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">
                            {((cardPage - 1) * 20) + index + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {record.student.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {record.student.grade}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {record.student.class_name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {record.student.id}
                          </td>
                          <td className="px-4 py-3">
                            {record.card.is_active ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                                نشطة
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                معطلة
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                                onClick={() => handleRegenerateCard(record.student.id)}
                                disabled={regenerateCardMutation.isPending}
                              >
                                <RefreshCcw className="h-3.5 w-3.5" />
                                {regenerateCardMutation.isPending ? 'جارٍ...' : 'إعادة'}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                                onClick={() => handleExportSingleCard(record)}
                                disabled={isExportingAllCards || exportingCardId === record.student.id}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {exportingCardId === record.student.id ? 'جارٍ...' : 'تصدير'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalCardPages > 1 && (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
                    <span>
                      عرض {paginatedStartIndex} - {paginatedEndIndex} من {cards.length} طالب
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCardPageChange(cardPage - 1)}
                        disabled={cardPage === 1}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        السابق
                      </button>
                      <span className="px-3 text-sm font-semibold">
                        صفحة {cardPage} من {totalCardPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCardPageChange(cardPage + 1)}
                        disabled={cardPage === totalCardPages}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                لم يتم العثور على بطاقات مطابقة للمرشحات الحالية.
              </div>
            )}

            {/* Single card template for on-demand PDF export */}
            <div
              ref={(node) => setExportCardElement(node)}
              style={{ position: 'absolute', left: '-9999px', top: 0 }}
              className="mx-auto flex h-[576px] w-[384px] flex-col justify-between rounded-[32px] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 text-right shadow-inner"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>برنامج نقاطي</span>
                <span data-card-token>رمز: ...</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">اسم الطالب</p>
                  <h3 data-student-name className="text-3xl font-bold text-slate-900">...</h3>
                  <p data-student-grade className="text-sm font-semibold text-slate-600">...</p>
                </div>

                {/* QR Code في الوسط */}
                <div className="flex justify-center">
                  <div className="grid place-items-center rounded-3xl bg-white/90 p-4 shadow-inner">
                    <img
                      data-qr-image
                      alt="QR Code"
                      className="h-40 w-40"
                    />
                    <p className="mt-2 text-[10px] text-slate-500">امسح لفتح بطاقة النقاط</p>
                  </div>
                </div>

                {/* رقم الطالب والإصدار بجانب بعض */}
                <div className="flex items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex-1 text-right">
                    <p className="text-[11px] text-slate-500">رقم الطالب</p>
                    <p data-student-id className="text-lg font-semibold text-slate-900">...</p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[11px] text-slate-500">الإصدار الحالي</p>
                    <p data-card-version className="text-sm font-semibold text-slate-700">...</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-right text-xs text-slate-500">
                <p>حالة البطاقة: <span data-card-status>...</span></p>
                <p>
                  تاريخ الإصدار: <span data-card-issued className="font-semibold text-slate-700">...</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
