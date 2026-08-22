import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Gift,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Receipt,
  Tags,
  FileText,
  Save,
  Search,
  X,
  Ban,
} from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
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
  WsSpinner,
  TONES,
  ToneChip,
  InitialAvatar,
} from '@/shared/workspace'
import {
  useStoreStatsQuery,
  useStoreSettingsQuery,
  useStoreCategoriesQuery,
  useStoreItemsQuery,
  useStoreOrdersQuery,
  useCreateStoreCategoryMutation,
  useUpdateStoreCategoryMutation,
  useDeleteStoreCategoryMutation,
  useCreateStoreItemMutation,
  useUpdateStoreItemMutation,
  useDeleteStoreItemMutation,
  useApproveStoreOrderMutation,
  useFulfillStoreOrderMutation,
  useCancelStoreOrderMutation,
  useRejectStoreOrderMutation,
  useUpdateStoreSettingsMutation,
} from '@/modules/admin/hooks'
import {
  STORE_STATUS_TONES,
  stockState,
  StorePager,
  ItemThumb,
  PopularityBar,
  timeAgo,
  WaitingChip,
  OrderStatusChip,
} from './e-store-ui'
import type {
  StoreItemFilters,
  StoreItemRecord,
  StoreItemPayload,
  StoreCategoryRecord,
  StoreCategoryPayload,
  StoreOrderFilters,
  StoreOrderRecord,
  StoreOrderStatus,
  StoreSettingsRecord,
  StoreSettingsPayload,
  StoreStatus,
} from '@/modules/admin/types'
import { useYearScope, YearScopeSelect } from '@/modules/admin/academic-years'

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const ORDER_STATUS_LABELS: Record<StoreOrderStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  fulfilled: 'مكتمل',
  cancelled: 'ملغي',
  rejected: 'مرفوض',
}

const TABS: Array<{ key: 'catalog' | 'orders' | 'settings'; label: string; icon: typeof Package }> = [
  { key: 'catalog', label: 'المنتجات', icon: Package },
  { key: 'orders', label: 'الطلبات', icon: ClipboardList },
  { key: 'settings', label: 'إعدادات المتجر', icon: FileText },
]

const STORE_STATUS_OPTIONS: Array<{
  value: StoreStatus
  label: string
  description: string
}> = [
  {
    value: 'open',
    label: 'المتجر متاح',
    description: 'يمكن للطلاب تصفح المنتجات وإرسال طلبات الاستبدال بشكل طبيعي.',
  },
  {
    value: 'closed',
    label: 'المتجر مغلق',
    description: 'يظهر للطلاب أن المتجر مغلق ولن يتمكنوا من إرسال طلبات جديدة.',
  },
  {
    value: 'maintenance',
    label: 'تحديثات وصيانة',
    description: 'استخدم هذه الحالة أثناء إجراء تغييرات أو صيانة على المنتجات والمخزون.',
  },
  {
    value: 'inventory',
    label: 'جرد المخزون',
    description: 'يوقف الاستبدال مؤقتاً لإعادة ترتيب المخزون أو التحقق من الكميات.',
  },
  {
    value: 'paused',
    label: 'إيقاف مؤقت',
    description: 'يتيح لك إيقاف المتجر مع إبقاء الرسالة التوضيحية ظاهرة للطلاب.',
  },
  {
    value: 'empty',
    label: 'لا توجد منتجات',
    description: 'يشير إلى نفاد المنتجات أو إخفائها؛ يمكن استخدامه مع الانتظار أو التنبيهات.',
  },
]

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

/** أسباب جاهزة تملأ حقل السبب بنقرة — بدل window.prompt الأعمى */
const QUICK_REASONS = ['المخزون نفد', 'رصيد غير كافٍ', 'مخالفة سلوكية', 'طلب مكرر']

type OrderActionType = 'approve' | 'fulfill' | 'cancel' | 'reject'

type ItemFormState = {
  name: string
  points_cost: string
  store_category_id: string
  stock_quantity: string
  unlimited_stock: boolean
  max_per_student: string
  is_active: boolean
  image_url: string
  description: string
  sku: string
  display_order: string
}

type CategoryFormState = {
  name: string
  slug: string
  description: string
  icon: string
  display_order: string
  is_active: boolean
}

type StoreSettingsFormState = {
  auto_approve_orders: boolean
  auto_fulfill_orders: boolean
  allow_student_cancellations: boolean
  allow_student_notes: boolean
  require_admin_reason_on_reject: boolean
  notify_low_stock: boolean
  low_stock_threshold: string
  max_pending_orders_per_student: string
  max_items_per_order: string
  max_points_per_order: string
  reference_prefix: string
  notification_recipients: string
  store_status: StoreStatus
  store_status_message: string
  allow_redemption_start_time: string
  allow_redemption_end_time: string
  allowed_redemption_weekdays: number[]
  enforce_violation_limit: boolean
  max_behavior_violations: string
  violation_lookback_days: string
  prevent_redemption_when_inventory_empty: boolean
  allow_waitlist_when_closed: boolean
}

function createDefaultSettingsForm(): StoreSettingsFormState {
  return {
    auto_approve_orders: false,
    auto_fulfill_orders: false,
    allow_student_cancellations: true,
    allow_student_notes: true,
    require_admin_reason_on_reject: true,
    notify_low_stock: true,
    low_stock_threshold: '5',
    max_pending_orders_per_student: '',
    max_items_per_order: '5',
    max_points_per_order: '',
    reference_prefix: '',
    notification_recipients: '',
    store_status: 'open',
    store_status_message: '',
    allow_redemption_start_time: '',
    allow_redemption_end_time: '',
    allowed_redemption_weekdays: [],
    enforce_violation_limit: false,
    max_behavior_violations: '',
    violation_lookback_days: '',
    prevent_redemption_when_inventory_empty: true,
    allow_waitlist_when_closed: false,
  }
}

function mapSettingsToForm(settings: StoreSettingsRecord): StoreSettingsFormState {
  const defaults = createDefaultSettingsForm()
  const normalizeTime = (value?: string | null) => (typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : '')
  const normalizedWeekdays = Array.isArray(settings.allowed_redemption_weekdays)
    ? settings.allowed_redemption_weekdays
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    : defaults.allowed_redemption_weekdays

  return {
    ...defaults,
    auto_approve_orders: Boolean(settings.auto_approve_orders),
    auto_fulfill_orders: Boolean(settings.auto_fulfill_orders),
    allow_student_cancellations: Boolean(settings.allow_student_cancellations),
    allow_student_notes: Boolean(settings.allow_student_notes),
    require_admin_reason_on_reject: Boolean(settings.require_admin_reason_on_reject),
    notify_low_stock: Boolean(settings.notify_low_stock),
    low_stock_threshold: String(settings.low_stock_threshold ?? defaults.low_stock_threshold),
    max_pending_orders_per_student:
      settings.max_pending_orders_per_student != null ? String(settings.max_pending_orders_per_student) : '',
    max_items_per_order: String(settings.max_items_per_order ?? defaults.max_items_per_order),
    max_points_per_order: settings.max_points_per_order != null ? String(settings.max_points_per_order) : '',
    reference_prefix: settings.reference_prefix ?? '',
    notification_recipients: Array.isArray(settings.notification_recipients)
      ? settings.notification_recipients.join('\n')
      : defaults.notification_recipients,
    store_status: STORE_STATUS_OPTIONS.some((option) => option.value === settings.store_status)
      ? settings.store_status
      : defaults.store_status,
    store_status_message: settings.store_status_message ?? defaults.store_status_message,
    allow_redemption_start_time: normalizeTime(settings.allow_redemption_start_time),
    allow_redemption_end_time: normalizeTime(settings.allow_redemption_end_time),
    allowed_redemption_weekdays: normalizedWeekdays,
    enforce_violation_limit: Boolean(settings.enforce_violation_limit),
    max_behavior_violations: settings.max_behavior_violations != null ? String(settings.max_behavior_violations) : '',
    violation_lookback_days: settings.violation_lookback_days != null ? String(settings.violation_lookback_days) : '',
    prevent_redemption_when_inventory_empty: Boolean(settings.prevent_redemption_when_inventory_empty),
    allow_waitlist_when_closed: Boolean(settings.allow_waitlist_when_closed),
  }
}

function createDefaultItemForm(): ItemFormState {
  return {
    name: '',
    points_cost: '10',
    store_category_id: '',
    stock_quantity: '',
    unlimited_stock: true,
    max_per_student: '',
    is_active: true,
    image_url: '',
    description: '',
    sku: '',
    display_order: '',
  }
}

function createDefaultCategoryForm(): CategoryFormState {
  return {
    name: '',
    slug: '',
    description: '',
    icon: '',
    display_order: '',
    is_active: true,
  }
}

export function AdminEStorePage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'settings'>('catalog')
  /* الكتالوجُ رفٌّ قائمٌ لا سجلّ، فالمنتقي على تبويب الطلبات وحده — لكنّ
     البطاقاتِ في الترويسة تخصّ الطلباتِ أيضاً فتتبع العامَ في كل حال. */
  const { scope: yearScope, setScope: setYearScope } = useYearScope()
  const [itemFilters, setItemFilters] = useState<StoreItemFilters>({ status: 'all', page: 1, per_page: 10 })
  const [orderFilters, setOrderFilters] = useState<StoreOrderFilters>({ status: 'all', page: 1, per_page: 10 })
  const [itemSearch, setItemSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [isItemFormOpen, setIsItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StoreItemRecord | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(() => createDefaultItemForm())
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<StoreCategoryRecord | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => createDefaultCategoryForm())
  const [activeOrderAction, setActiveOrderAction] = useState<{ id: number; action: OrderActionType } | null>(null)
  const [settingsForm, setSettingsForm] = useState<StoreSettingsFormState>(() => createDefaultSettingsForm())

  /* حالات عرض للقسيمة والمودالات — لا أعمال */
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderReason, setOrderReason] = useState('')
  const [deleteItemTarget, setDeleteItemTarget] = useState<StoreItemRecord | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<StoreCategoryRecord | null>(null)

  const statsQuery = useStoreStatsQuery(yearScope)
  const storeSettingsQuery = useStoreSettingsQuery()
  const categoriesQuery = useStoreCategoriesQuery()
  const itemsQuery = useStoreItemsQuery(itemFilters)
  const ordersQuery = useStoreOrdersQuery({ ...orderFilters, academic_year: yearScope })

  const createCategoryMutation = useCreateStoreCategoryMutation()
  const updateCategoryMutation = useUpdateStoreCategoryMutation()
  const deleteCategoryMutation = useDeleteStoreCategoryMutation()
  const createItemMutation = useCreateStoreItemMutation()
  const updateItemMutation = useUpdateStoreItemMutation()
  const deleteItemMutation = useDeleteStoreItemMutation()
  const approveOrderMutation = useApproveStoreOrderMutation()
  const fulfillOrderMutation = useFulfillStoreOrderMutation()
  const cancelOrderMutation = useCancelStoreOrderMutation()
  const rejectOrderMutation = useRejectStoreOrderMutation()
  const updateStoreSettingsMutation = useUpdateStoreSettingsMutation()

  const isSavingSettings = updateStoreSettingsMutation.isPending
  const selectedStoreStatus = useMemo(
    () => STORE_STATUS_OPTIONS.find((option) => option.value === settingsForm.store_status) ?? STORE_STATUS_OPTIONS[0],
    [settingsForm.store_status],
  )
  const settingsErrorMessage =
    storeSettingsQuery.error instanceof Error ? storeSettingsQuery.error.message : null

  const categories = categoriesQuery.data ?? []
  const items = itemsQuery.data?.items ?? []
  const itemsMeta = itemsQuery.data?.meta
  const orders = ordersQuery.data?.items ?? []
  const ordersMeta = ordersQuery.data?.meta

  useEffect(() => {
    if (editingItem) {
      setItemForm({
        name: editingItem.name,
        points_cost: String(editingItem.points_cost ?? ''),
        store_category_id: editingItem.store_category_id ? String(editingItem.store_category_id) : '',
        stock_quantity: editingItem.unlimited_stock ? '' : String(editingItem.stock_quantity ?? ''),
        unlimited_stock: editingItem.unlimited_stock ?? false,
        max_per_student: editingItem.max_per_student ? String(editingItem.max_per_student) : '',
        is_active: editingItem.is_active,
        image_url: editingItem.image_url ?? '',
        description: editingItem.description ?? '',
        sku: editingItem.sku ?? '',
        display_order: editingItem.display_order ? String(editingItem.display_order) : '',
      })
      setIsItemFormOpen(true)
    } else {
      setItemForm(createDefaultItemForm())
    }
  }, [editingItem])

  useEffect(() => {
    if (editingCategory) {
      setCategoryForm({
        name: editingCategory.name,
        slug: editingCategory.slug ?? '',
        description: editingCategory.description ?? '',
        icon: editingCategory.icon ?? '',
        display_order: editingCategory.display_order ? String(editingCategory.display_order) : '',
        is_active: editingCategory.is_active,
      })
      setIsCategoryFormOpen(true)
    } else {
      setCategoryForm(createDefaultCategoryForm())
    }
  }, [editingCategory])

  useEffect(() => {
    if (storeSettingsQuery.data) {
      setSettingsForm(mapSettingsToForm(storeSettingsQuery.data))
    }
  }, [storeSettingsQuery.data])

  // تبديل الطلب يمسح مسودة السبب حتى لا تُلصق على طلب آخر
  useEffect(() => {
    setOrderReason('')
  }, [selectedOrderId])

  const handleItemFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = itemForm.name.trim()
    if (!trimmedName) {
      toast({ type: 'error', title: 'يرجى إدخال اسم المنتج' })
      return
    }

    const parsedPoints = Number(itemForm.points_cost)
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      toast({ type: 'error', title: 'قيمة النقاط يجب أن تكون رقماً أكبر من صفر' })
      return
    }

    let stockQuantity: number | undefined
    if (!itemForm.unlimited_stock) {
      if (!itemForm.stock_quantity.trim()) {
        toast({ type: 'error', title: 'يرجى تحديد الكمية المتاحة أو تفعيل المخزون غير المحدود' })
        return
      }
      const parsedStock = Number(itemForm.stock_quantity)
      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        toast({ type: 'error', title: 'قيمة المخزون غير صالحة' })
        return
      }
      stockQuantity = Math.trunc(parsedStock)
    }

    const payload: StoreItemPayload = {
      name: trimmedName,
      points_cost: Math.trunc(parsedPoints),
      store_category_id: itemForm.store_category_id ? Number(itemForm.store_category_id) : undefined,
      unlimited_stock: itemForm.unlimited_stock,
      stock_quantity: stockQuantity,
      max_per_student: itemForm.max_per_student ? Math.trunc(Number(itemForm.max_per_student)) : undefined,
      is_active: itemForm.is_active,
      description: itemForm.description.trim() || undefined,
      image_url: itemForm.image_url.trim() || undefined,
      sku: itemForm.sku.trim() || undefined,
      display_order: itemForm.display_order ? Math.trunc(Number(itemForm.display_order)) : undefined,
    }

    if (editingItem) {
      updateItemMutation.mutate(
        { id: editingItem.id, payload },
        {
          onSuccess: () => {
            setIsItemFormOpen(false)
            setEditingItem(null)
            setItemForm(createDefaultItemForm())
          },
        },
      )
    } else {
      createItemMutation.mutate(payload, {
        onSuccess: () => {
          setIsItemFormOpen(false)
          setItemForm(createDefaultItemForm())
        },
      })
    }
  }

  const handleCategoryFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = categoryForm.name.trim()
    if (!trimmedName) {
      toast({ type: 'error', title: 'يرجى إدخال اسم التصنيف' })
      return
    }

    const payload: StoreCategoryPayload = {
      name: trimmedName,
      slug: categoryForm.slug.trim() || undefined,
      description: categoryForm.description.trim() || undefined,
      icon: categoryForm.icon.trim() || undefined,
      display_order: categoryForm.display_order ? Math.trunc(Number(categoryForm.display_order)) : undefined,
      is_active: categoryForm.is_active,
    }

    if (editingCategory) {
      updateCategoryMutation.mutate(
        { id: editingCategory.id, payload },
        {
          onSuccess: () => {
            setIsCategoryFormOpen(false)
            setEditingCategory(null)
            setCategoryForm(createDefaultCategoryForm())
          },
        },
      )
    } else {
      createCategoryMutation.mutate(payload, {
        onSuccess: () => {
          setIsCategoryFormOpen(false)
          setCategoryForm(createDefaultCategoryForm())
        },
      })
    }
  }

  const handleDeleteItem = (item: StoreItemRecord) => {
    deleteItemMutation.mutate(item.id)
  }

  const handleDeleteCategory = (category: StoreCategoryRecord) => {
    deleteCategoryMutation.mutate(category.id)
  }

  const handleApproveOrder = (order: StoreOrderRecord) => {
    setActiveOrderAction({ id: order.id, action: 'approve' })
    approveOrderMutation.mutate({ id: order.id }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleFulfillOrder = (order: StoreOrderRecord, reason: string) => {
    setActiveOrderAction({ id: order.id, action: 'fulfill' })
    fulfillOrderMutation.mutate({ id: order.id, reason: reason || undefined }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleCancelOrder = (order: StoreOrderRecord, reason: string) => {
    setActiveOrderAction({ id: order.id, action: 'cancel' })
    cancelOrderMutation.mutate({ id: order.id, reason: reason || undefined }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleRejectOrder = (order: StoreOrderRecord, reason: string) => {
    setActiveOrderAction({ id: order.id, action: 'reject' })
    rejectOrderMutation.mutate({ id: order.id, reason: reason || undefined }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleWeekdayToggle = (value: number) => {
    setSettingsForm((current) => {
      const exists = current.allowed_redemption_weekdays.includes(value)
      const next = exists
        ? current.allowed_redemption_weekdays.filter((day) => day !== value)
        : [...current.allowed_redemption_weekdays, value].sort((a, b) => a - b)
      return {
        ...current,
        allowed_redemption_weekdays: next,
      }
    })
  }

  const handleSettingsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requiredPositive = (raw: string, errorMessage: string): number | null => {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast({ type: 'error', title: errorMessage })
        return null
      }
      return Math.trunc(parsed)
    }

    let hasError = false

    const optionalPositive = (raw: string, errorMessage: string): number | null => {
      const trimmed = raw.trim()
      if (trimmed === '') {
        return null
      }
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast({ type: 'error', title: errorMessage })
        hasError = true
        return null
      }
      return Math.trunc(parsed)
    }

    const lowStockThreshold = requiredPositive(settingsForm.low_stock_threshold, 'حد تنبيه المخزون غير صالح')
    if (lowStockThreshold === null) {
      return
    }

    const maxItemsPerOrder = requiredPositive(settingsForm.max_items_per_order, 'الحد الأقصى للمنتجات في الطلب غير صالح')
    if (maxItemsPerOrder === null) {
      return
    }

    const maxPendingOrders = optionalPositive(
      settingsForm.max_pending_orders_per_student,
      'الحد الأقصى للطلبات المعلقة لكل طالب غير صالح',
    )
    if (hasError) {
      return
    }

    const maxPointsPerOrder = optionalPositive(
      settingsForm.max_points_per_order,
      'الحد الأقصى للنقاط لكل طلب غير صالح',
    )
    if (hasError) {
      return
    }

    const maxBehaviorViolations = optionalPositive(
      settingsForm.max_behavior_violations,
      'حد المخالفات المسموح بها غير صالح',
    )
    if (hasError) {
      return
    }

    const violationLookbackDays = optionalPositive(
      settingsForm.violation_lookback_days,
      'عدد أيام المراجعة للمخالفات غير صالح',
    )
    if (hasError) {
      return
    }

    if (settingsForm.enforce_violation_limit && maxBehaviorViolations === null) {
      toast({ type: 'error', title: 'يرجى تحديد الحد الأقصى للمخالفات عند تفعيل المنع الآلي' })
      return
    }

    const allowedWeekdays = Array.from(new Set(settingsForm.allowed_redemption_weekdays)).sort((a, b) => a - b)
    const allowedWeekdaysPayload = allowedWeekdays.length > 0 ? allowedWeekdays : null

    const recipients = settingsForm.notification_recipients
      .split(/\s*(?:\n|,|;|؛|،)\s*/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 10)

    const payload: StoreSettingsPayload = {
      auto_approve_orders: settingsForm.auto_approve_orders,
      auto_fulfill_orders: settingsForm.auto_fulfill_orders,
      allow_student_cancellations: settingsForm.allow_student_cancellations,
      allow_student_notes: settingsForm.allow_student_notes,
      require_admin_reason_on_reject: settingsForm.require_admin_reason_on_reject,
      notify_low_stock: settingsForm.notify_low_stock,
      low_stock_threshold: lowStockThreshold,
      max_pending_orders_per_student: maxPendingOrders,
      max_items_per_order: maxItemsPerOrder,
      max_points_per_order: maxPointsPerOrder,
      reference_prefix: settingsForm.reference_prefix.trim() || null,
      notification_recipients: recipients.length > 0 ? recipients : null,
      store_status: settingsForm.store_status,
      store_status_message: settingsForm.store_status_message.trim() || null,
      allow_redemption_start_time: settingsForm.allow_redemption_start_time || null,
      allow_redemption_end_time: settingsForm.allow_redemption_end_time || null,
      allowed_redemption_weekdays: allowedWeekdaysPayload,
      enforce_violation_limit: settingsForm.enforce_violation_limit,
      max_behavior_violations: maxBehaviorViolations,
      violation_lookback_days: violationLookbackDays,
      prevent_redemption_when_inventory_empty: settingsForm.prevent_redemption_when_inventory_empty,
      allow_waitlist_when_closed: settingsForm.allow_waitlist_when_closed,
    }

    updateStoreSettingsMutation.mutate(payload, {
      onSuccess: (updatedSettings) => {
        setSettingsForm(mapSettingsToForm(updatedSettings))
      },
    })
  }

  const itemsStatusOptions: Array<{ value: 'all' | 'active' | 'inactive'; label: string }> = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'النشطة' },
    { value: 'inactive', label: 'المخفية' },
  ]

  const orderStatusOptions: Array<{ value: 'all' | StoreOrderStatus; label: string }> = [
    { value: 'all', label: 'كل الحالات' },
    { value: 'pending', label: ORDER_STATUS_LABELS.pending },
    { value: 'approved', label: ORDER_STATUS_LABELS.approved },
    { value: 'fulfilled', label: ORDER_STATUS_LABELS.fulfilled },
    { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
    { value: 'rejected', label: ORDER_STATUS_LABELS.rejected },
  ]

  /* ── مشتقات العرض ── */
  const stats = statsQuery.data
  const lowStockThresholdValue = Number(settingsForm.low_stock_threshold) || 5
  const maxRedeemed = useMemo(
    () => items.reduce((max, item) => Math.max(max, item.times_redeemed ?? 0), 0),
    [items],
  )
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )
  const isActionActive = (order: StoreOrderRecord, action: OrderActionType) =>
    activeOrderAction?.id === order.id && activeOrderAction.action === action

  /* شريحة حالة المتجر الحية: قد تكون «متاح» والطلاب عاجزون لأن اليوم/الساعة خارج النافذة */
  const storeStatusChip = useMemo(() => {
    const tone = STORE_STATUS_TONES[settingsForm.store_status] ?? TONES.gray
    if (settingsForm.store_status !== 'open') {
      return { label: selectedStoreStatus.label, tone, live: false }
    }
    const now = new Date()
    const weekdays = settingsForm.allowed_redemption_weekdays
    const dayBlocked = weekdays.length > 0 && !weekdays.includes(now.getDay())
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const start = settingsForm.allow_redemption_start_time
    const end = settingsForm.allow_redemption_end_time
    const timeBlocked = Boolean(start && end) && (hhmm < start || hhmm > end)
    if (dayBlocked || timeBlocked) {
      return { label: 'متاح — خارج وقت الاستبدال الآن', tone: TONES.amber, live: false }
    }
    return { label: selectedStoreStatus.label, tone, live: true }
  }, [settingsForm, selectedStoreStatus])

  /* تغييرات غير محفوظة في الإعدادات */
  const settingsDirty = useMemo(() => {
    if (!storeSettingsQuery.data) return false
    return JSON.stringify(settingsForm) !== JSON.stringify(mapSettingsToForm(storeSettingsQuery.data))
  }, [settingsForm, storeSettingsQuery.data])

  const timeConflict = Boolean(
    settingsForm.allow_redemption_start_time &&
    settingsForm.allow_redemption_end_time &&
    settingsForm.allow_redemption_start_time > settingsForm.allow_redemption_end_time,
  )

  const hasItemFilters = Boolean(itemFilters.search || itemFilters.category_id || (itemFilters.status && itemFilters.status !== 'all'))
  const hasOrderFilters = Boolean(orderFilters.search || (orderFilters.status && orderFilters.status !== 'all'))

  return (
    <WsPage>
      <WsHeader
        title="المتجر الإلكتروني"
        badge={
          <button
            type="button"
            className="ws-chip"
            onClick={() => setActiveTab('settings')}
            title="حالة المتجر — اضغط للإعدادات"
            style={{ background: storeStatusChip.tone.bg, borderColor: storeStatusChip.tone.bd, color: storeStatusChip.tone.tx, gap: 5 }}
          >
            {storeStatusChip.live && <span className="ws-pulse" />}
            {storeStatusChip.label}
          </button>
        }
        actions={
          <>
            {activeTab === 'orders' && <YearScopeSelect scope={yearScope} onChange={setYearScope} />}
            {activeTab === 'catalog' && (
              <>
                <WsBtn icon={Tags} onClick={() => { setEditingCategory(null); setCategoryForm(createDefaultCategoryForm()); setIsCategoryFormOpen(true) }}>
                  تصنيف جديد
                </WsBtn>
                <WsBtn
                  variant="primary"
                  icon={Plus}
                  onClick={() => { setIsItemFormOpen(true); setEditingItem(null); setItemForm(createDefaultItemForm()) }}
                >
                  منتج جديد
                </WsBtn>
              </>
            )}
            {activeTab === 'settings' && (
              <WsBtn
                variant="primary"
                icon={Save}
                type="submit"
                form="store-settings-form"
                disabled={isSavingSettings || storeSettingsQuery.isLoading}
              >
                {isSavingSettings ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
                {settingsDirty && <span style={{ width: 6, height: 6, borderRadius: '50%', background: TONES.amber.tx }} />}
              </WsBtn>
            )}
          </>
        }
        facts={
          <>
            <WsFact icon={Package} label="المنتجات">{numberFormatter.format(stats?.total_items ?? 0)}</WsFact>
            <WsFact icon={Gift} label="معروضة">
              <span style={{ color: TONES.green.tx }}>{numberFormatter.format(stats?.active_items ?? 0)}</span>
            </WsFact>
            {/* الرقم التشغيلي الأول والسبب الوحيد لفتح الصفحة صباحاً — كان يصل ولا يُعرض */}
            <button
              type="button"
              onClick={() => { setActiveTab('orders'); setOrderFilters({ status: 'pending', page: 1, per_page: 10 }) }}
              className={(stats?.pending_orders ?? 0) > 0 ? 'ws-fact ws-soft-pulse' : 'ws-fact'}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
              title="اعرض الطلبات المعلقة"
            >
              <ClipboardList />
              <span>قيد المراجعة</span>
              <b style={{ color: (stats?.pending_orders ?? 0) > 0 ? TONES.amber.tx : undefined }}>
                {numberFormatter.format(stats?.pending_orders ?? 0)}
              </b>
              {(stats?.pending_orders ?? 0) > 0 && <span className="ws-pulse" style={{ background: TONES.amber.tx }} />}
            </button>
            <WsFact icon={CheckCircle2} label="مكتملة">
              <span style={{ color: TONES.green.tx }}>{numberFormatter.format(stats?.fulfilled_orders ?? 0)}</span>
            </WsFact>
            <WsFact icon={ShoppingCart} label="إجمالي الطلبات">{numberFormatter.format(stats?.total_orders ?? 0)}</WsFact>
            <WsFact icon={TrendingUp} label="نقاط مستبدلة">
              <span style={{ color: TONES.purple.tx }}>{numberFormatter.format(stats?.points_redeemed ?? 0)}</span>
            </WsFact>
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
              {key === 'catalog' && itemsMeta?.total != null && <span className="ws-count">{itemsMeta.total}</span>}
              {key === 'orders' && (stats?.pending_orders ?? 0) > 0 && <span className="ws-count">{stats?.pending_orders}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'catalog' && (
          <>
            <WsField label="الحالة">
              <div className="ws-seg">
                {itemsStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ws-seg__btn ${itemFilters.status === option.value ? 'is-active' : ''}`}
                    onClick={() => setItemFilters((current) => ({ ...current, status: option.value, page: 1 }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </WsField>
            <WsField label="التصنيف">
              <WsSelect
                value={itemFilters.category_id ? String(itemFilters.category_id) : 'all'}
                onChange={(event) =>
                  setItemFilters((current) => ({
                    ...current,
                    category_id: event.target.value === 'all' ? undefined : Number(event.target.value),
                    page: 1,
                  }))
                }
              >
                <option value="all">جميع التصنيفات</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </WsSelect>
            </WsField>
            <WsField label="بحث" grow>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setItemFilters((current) => ({ ...current, search: itemSearch.trim() || undefined, page: 1 }))
                }}
                style={{ display: 'flex', gap: 5 }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <WsInput
                    type="search"
                    placeholder="بحث عن منتج"
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    style={{ width: '100%', paddingInlineStart: 26 }}
                  />
                  <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
                </div>
                <WsBtn type="submit" size="sm">بحث</WsBtn>
                {itemFilters.search && (
                  <WsIconBtn
                    icon={X}
                    label="مسح البحث"
                    onClick={() => { setItemSearch(''); setItemFilters((current) => ({ ...current, search: undefined, page: 1 })) }}
                  />
                )}
              </form>
            </WsField>
            <WsField label="لكل صفحة">
              <WsSelect
                value={String(itemFilters.per_page ?? 10)}
                onChange={(event) => setItemFilters((current) => ({ ...current, per_page: Number(event.target.value), page: 1 }))}
              >
                {[10, 25, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
              </WsSelect>
            </WsField>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <WsField label="الحالة">
              <div className="ws-seg">
                {orderStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ws-seg__btn ${orderFilters.status === option.value ? 'is-active' : ''}`}
                    onClick={() => setOrderFilters((current) => ({ ...current, status: option.value, page: 1 }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </WsField>
            <WsField label="بحث" grow>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setOrderFilters((current) => ({ ...current, search: orderSearch.trim() || undefined, page: 1 }))
                }}
                style={{ display: 'flex', gap: 5 }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <WsInput
                    type="search"
                    placeholder="رقم الطلب أو اسم الطالب"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    style={{ width: '100%', paddingInlineStart: 26 }}
                  />
                  <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
                </div>
                <WsBtn type="submit" size="sm">بحث</WsBtn>
                {orderFilters.search && (
                  <WsIconBtn
                    icon={X}
                    label="مسح البحث"
                    onClick={() => { setOrderSearch(''); setOrderFilters((current) => ({ ...current, search: undefined, page: 1 })) }}
                  />
                )}
              </form>
            </WsField>
            <WsField label="لكل صفحة">
              <WsSelect
                value={String(orderFilters.per_page ?? 10)}
                onChange={(event) => setOrderFilters((current) => ({ ...current, per_page: Number(event.target.value), page: 1 }))}
              >
                {[10, 25, 50].map((n) => (<option key={n} value={n}>{n}</option>))}
              </WsSelect>
            </WsField>
          </>
        )}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {/* ═══ رفّ الجوائز ═══ */}
          {activeTab === 'catalog' && (
            <WsBlock
              fill
              title="رفّ الجوائز"
              icon={Gift}
              count={itemsMeta?.total ?? items.length}
              tools={
                <StorePager
                  page={itemsMeta?.current_page ?? 1}
                  lastPage={itemsMeta?.last_page ?? 1}
                  total={itemsMeta?.total}
                  unit="منتجاً"
                  onChange={(page) => setItemFilters((current) => ({ ...current, page }))}
                />
              }
            >
              {itemsQuery.isError ? (
                <div style={{ padding: 14 }}>
                  <WsAlert tone="error" boxed>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      تعذر تحميل المنتجات — تحقق من الاتصال ثم أعد المحاولة
                      <WsBtn size="sm" onClick={() => itemsQuery.refetch()}>إعادة المحاولة</WsBtn>
                    </span>
                  </WsAlert>
                </div>
              ) : itemsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل المنتجات...</WsEmpty>
              ) : items.length === 0 ? (
                <WsEmpty icon={Gift}>
                  <p style={{ margin: 0 }}>لا توجد منتجات مطابقة</p>
                  {hasItemFilters && (
                    <WsBtn
                      size="sm"
                      icon={X}
                      style={{ marginTop: 8 }}
                      onClick={() => { setItemSearch(''); setItemFilters({ status: 'all', page: 1, per_page: itemFilters.per_page ?? 10 }) }}
                    >
                      مسح المرشحات
                    </WsBtn>
                  )}
                </WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}></th>
                      <th>المنتج</th>
                      <th>السعر</th>
                      <th>المخزون</th>
                      <th>حد الطالب</th>
                      <th>الرواج</th>
                      <th>الحالة</th>
                      <th>أدوات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const stock = stockState(item, lowStockThresholdValue)
                      const needsAttention = stock.kind === 'out' || stock.kind === 'low'
                      return (
                        <tr
                          key={item.id}
                          style={needsAttention ? { background: stock.tone.bg } : undefined}
                        >
                          <td><ItemThumb url={item.image_url} name={item.name} /></td>
                          <td>
                            <span style={{ display: 'block', fontWeight: 600 }}>{item.name}</span>
                            <span className="ws-cell-sub">
                              {item.sku ? `${item.sku} · ` : ''}{item.category?.name ?? 'بلا تصنيف'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: TONES.purple.tx, whiteSpace: 'nowrap' }}>
                            {numberFormatter.format(item.points_cost)} نقطة
                          </td>
                          <td>
                            {stock.kind === 'unlimited' ? (
                              <span style={{ color: 'var(--ws-text-2)', fontSize: 13 }}>∞ غير محدود</span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <b style={{ color: stock.tone.tx }}>{numberFormatter.format(stock.qty ?? 0)}</b>
                                {stock.kind === 'out' && <ToneChip tone={TONES.red}>نفد</ToneChip>}
                                {stock.kind === 'low' && <ToneChip tone={TONES.amber}>قارب على النفاد</ToneChip>}
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--ws-text-2)' }}>{item.max_per_student ?? '—'}</td>
                          <td><PopularityBar value={item.times_redeemed ?? 0} max={maxRedeemed} /></td>
                          <td>
                            {item.is_active
                              ? <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>معروض</span>
                              : <ToneChip tone={TONES.gray}>مخفي</ToneChip>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <WsIconBtn icon={Edit2} label="تعديل المنتج" onClick={() => setEditingItem(item)} />
                              <WsIconBtn
                                icon={Trash2}
                                label="حذف المنتج"
                                onClick={() => setDeleteItemTarget(item)}
                                disabled={deleteItemMutation.isPending}
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

          {/* ═══ طابور الطلبات ═══ */}
          {activeTab === 'orders' && (
            <WsBlock
              fill
              title="طابور الطلبات"
              icon={ClipboardList}
              count={ordersMeta?.total ?? orders.length}
              tools={
                <StorePager
                  page={ordersMeta?.current_page ?? 1}
                  lastPage={ordersMeta?.last_page ?? 1}
                  total={ordersMeta?.total}
                  unit="طلباً"
                  onChange={(page) => setOrderFilters((current) => ({ ...current, page }))}
                />
              }
            >
              {ordersQuery.isError ? (
                <div style={{ padding: 14 }}>
                  <WsAlert tone="error" boxed>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      تعذر تحميل الطلبيات — تحقق من الاتصال ثم أعد المحاولة
                      <WsBtn size="sm" onClick={() => ordersQuery.refetch()}>إعادة المحاولة</WsBtn>
                    </span>
                  </WsAlert>
                </div>
              ) : ordersQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل الطلبيات...</WsEmpty>
              ) : orders.length === 0 ? (
                <WsEmpty icon={ClipboardList}>
                  <p style={{ margin: 0 }}>لا توجد طلبيات مطابقة</p>
                  {hasOrderFilters && (
                    <WsBtn
                      size="sm"
                      icon={X}
                      style={{ marginTop: 8 }}
                      onClick={() => { setOrderSearch(''); setOrderFilters({ status: 'all', page: 1, per_page: orderFilters.per_page ?? 10 }) }}
                    >
                      مسح المرشحات
                    </WsBtn>
                  )}
                </WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>الطالب</th>
                      <th>المنتجات</th>
                      <th>النقاط</th>
                      <th>الحالة</th>
                      <th>منذ</th>
                      <th>اعتماد سريع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const isSelected = order.id === selectedOrderId
                      const isPending = order.status === 'pending'
                      return (
                        <tr
                          key={order.id}
                          className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setSelectedOrderId(order.id)}
                          style={!isSelected && isPending ? { background: TONES.amber.bg } : undefined}
                        >
                          <td style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right', fontFamily: 'monospace', fontSize: 11.5 }}>
                            {order.reference_number || `#${order.id}`}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <InitialAvatar name={order.student?.name ?? '؟'} tone={TONES.sky} size={24} />
                              <span>
                                <span style={{ display: 'block', fontWeight: 600 }}>{order.student?.name ?? 'غير معروف'}</span>
                                <span className="ws-cell-sub">
                                  {[order.student?.grade, order.student?.class_name].filter(Boolean).join(' · ') || '—'}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--ws-text-2)' }}>
                            {order.items?.[0]?.name ?? '—'}
                            {(order.items_count ?? order.items?.length ?? 0) > 1 && (
                              <span className="ws-count" style={{ marginInlineStart: 4 }}>{order.items_count ?? order.items.length}</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 800, color: TONES.purple.tx, whiteSpace: 'nowrap' }}>
                            {numberFormatter.format(order.total_points ?? 0)}
                          </td>
                          <td><OrderStatusChip status={order.status} /></td>
                          <td><WaitingChip createdAt={order.created_at} status={order.status} /></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {isPending && (
                              <WsBtn
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => handleApproveOrder(order)}
                                disabled={isActionActive(order, 'approve') && approveOrderMutation.isPending}
                                style={{ color: TONES.green.tx, borderColor: TONES.green.bd, background: TONES.green.bg }}
                              >
                                {isActionActive(order, 'approve') && approveOrderMutation.isPending ? <WsSpinner /> : 'اعتماد'}
                              </WsBtn>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              )}
            </WsBlock>
          )}

          {/* ═══ إعدادات المتجر ═══ */}
          {activeTab === 'settings' && (
            <WsBlock fill scroll>
              {storeSettingsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل إعدادات المتجر...</WsEmpty>
              ) : storeSettingsQuery.isError ? (
                <div style={{ padding: 14 }}>
                  <WsAlert tone="error" boxed>
                    تعذر تحميل إعدادات المتجر: {settingsErrorMessage ?? 'حدث خطأ غير متوقع أثناء التحميل'}
                  </WsAlert>
                </div>
              ) : (
                <form id="store-settings-form" onSubmit={handleSettingsSubmit}>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 780 }}>
                    {/* حالة المتجر */}
                    <section>
                      <p className="ws-label" style={{ marginBottom: 8 }}>حالة المتجر</p>
                      <div className="ws-choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 8 }}>
                        {STORE_STATUS_OPTIONS.map((option) => {
                          const tone = STORE_STATUS_TONES[option.value] ?? TONES.gray
                          const isSelected = settingsForm.store_status === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => setSettingsForm((current) => ({ ...current, store_status: option.value }))}
                              style={isSelected
                                ? { background: tone.bg, borderColor: tone.tx, color: tone.tx, boxShadow: `0 0 0 1px ${tone.tx}` }
                                : undefined}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ws-text-2)' }}>{selectedStoreStatus.description}</p>
                      <WsField label="رسالة تظهر للمستخدمين (اختياري)">
                        <WsTextarea
                          rows={2}
                          value={settingsForm.store_status_message}
                          onChange={(event) => setSettingsForm((current) => ({ ...current, store_status_message: event.target.value }))}
                        />
                      </WsField>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8, marginTop: 8 }}>
                        <SettingSwitch
                          label="السماح بإضافة الطلبات إلى قائمة الانتظار عند الإغلاق"
                          checked={settingsForm.allow_waitlist_when_closed}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, allow_waitlist_when_closed: checked }))}
                        />
                        <SettingSwitch
                          label="إيقاف الاستبدال تلقائياً عند نفاد المخزون"
                          checked={settingsForm.prevent_redemption_when_inventory_empty}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, prevent_redemption_when_inventory_empty: checked }))}
                        />
                      </div>
                    </section>

                    {/* إدارة الطلبات */}
                    <section>
                      <p className="ws-label" style={{ marginBottom: 8 }}>إدارة الطلبات</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                        <SettingSwitch
                          label="اعتماد الطلبات تلقائياً"
                          checked={settingsForm.auto_approve_orders}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, auto_approve_orders: checked }))}
                        />
                        <SettingSwitch
                          label="إنهاء الطلبات تلقائياً بعد الاعتماد"
                          checked={settingsForm.auto_fulfill_orders}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, auto_fulfill_orders: checked }))}
                        />
                        <SettingSwitch
                          label="السماح للطالب بإلغاء الطلب قبل الاعتماد"
                          checked={settingsForm.allow_student_cancellations}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, allow_student_cancellations: checked }))}
                        />
                        <SettingSwitch
                          label="تمكين ملاحظات الطالب أثناء إنشاء الطلب"
                          checked={settingsForm.allow_student_notes}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, allow_student_notes: checked }))}
                        />
                        <SettingSwitch
                          label="إلزام الإدارة بكتابة سبب عند رفض الطلب"
                          checked={settingsForm.require_admin_reason_on_reject}
                          onChange={(checked) => setSettingsForm((current) => ({ ...current, require_admin_reason_on_reject: checked }))}
                        />
                      </div>
                    </section>

                    {/* الحدود والتنبيهات */}
                    <section>
                      <p className="ws-label" style={{ marginBottom: 8 }}>الحدود والتنبيهات</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        <WsField label="تنبيه المخزون عند الوصول إلى">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.low_stock_threshold}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, low_stock_threshold: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="الحد الأقصى للمنتجات في الطلب">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.max_items_per_order}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, max_items_per_order: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="الحد الأقصى للنقاط لكل طلب (اختياري)">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.max_points_per_order}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, max_points_per_order: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="حد الطلبات المعلقة لكل طالب (اختياري)">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.max_pending_orders_per_student}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, max_pending_orders_per_student: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="بادئة رقم الطلب (اختياري)">
                          <WsInput
                            type="text"
                            value={settingsForm.reference_prefix}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, reference_prefix: event.target.value }))}
                          />
                        </WsField>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <WsField label="إشعار عبر البريد (بحد أقصى 10 عناوين)">
                          <WsTextarea
                            rows={2}
                            value={settingsForm.notification_recipients}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, notification_recipients: event.target.value }))}
                            placeholder={'example@school.sa\nadmin@school.sa'}
                          />
                          <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                            افصل بين كل بريد بفاصلة أو سطر جديد لإرسال تنبيهات المخزون المنخفض.
                          </p>
                        </WsField>
                        <div style={{ marginTop: 8 }}>
                          <SettingSwitch
                            label="تفعيل تنبيه البريد عند انخفاض المخزون"
                            checked={settingsForm.notify_low_stock}
                            onChange={(checked) => setSettingsForm((current) => ({ ...current, notify_low_stock: checked }))}
                          />
                        </div>
                      </div>
                    </section>

                    {/* مواعيد الاستبدال */}
                    <section>
                      <p className="ws-label" style={{ marginBottom: 8 }}>مواعيد الاستبدال</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <WsField label="بداية وقت الاستبدال (اختياري)">
                          <WsInput
                            type="time"
                            value={settingsForm.allow_redemption_start_time}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, allow_redemption_start_time: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="نهاية وقت الاستبدال (اختياري)">
                          <WsInput
                            type="time"
                            value={settingsForm.allow_redemption_end_time}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, allow_redemption_end_time: event.target.value }))}
                          />
                        </WsField>
                      </div>
                      <p className="ws-label" style={{ margin: '10px 0 6px' }}>الأيام المسموح بها للاستبدال</p>
                      <div className="ws-choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                        {WEEKDAY_OPTIONS.map((day) => {
                          const isSelected = settingsForm.allowed_redemption_weekdays.includes(day.value)
                          return (
                            <button
                              key={day.value}
                              type="button"
                              className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => handleWeekdayToggle(day.value)}
                              style={isSelected
                                ? { background: TONES.sky.bg, borderColor: TONES.sky.tx, color: TONES.sky.tx, boxShadow: `0 0 0 1px ${TONES.sky.tx}` }
                                : undefined}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        اترك كل الأيام غير محددة للسماح بالاستبدال طوال الأسبوع.
                      </p>
                    </section>

                    {/* قيود المخالفات */}
                    <section>
                      <p className="ws-label" style={{ marginBottom: 8 }}>قيود المخالفات</p>
                      <SettingSwitch
                        label="منع الطلاب الذين تجاوزوا حد المخالفات من الاستبدال"
                        checked={settingsForm.enforce_violation_limit}
                        onChange={(checked) => setSettingsForm((current) => ({ ...current, enforce_violation_limit: checked }))}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 8 }}>
                        <WsField label="الحد الأقصى للمخالفات">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.max_behavior_violations}
                            disabled={!settingsForm.enforce_violation_limit}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, max_behavior_violations: event.target.value }))}
                          />
                        </WsField>
                        <WsField label="عدد الأيام للمراجعة (اختياري)">
                          <WsInput
                            type="number"
                            min={1}
                            value={settingsForm.violation_lookback_days}
                            disabled={!settingsForm.enforce_violation_limit}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, violation_lookback_days: event.target.value }))}
                          />
                        </WsField>
                      </div>
                    </section>
                  </div>
                </form>
              )}
            </WsBlock>
          )}
        </WsMain>

        {/* ═══ التصنيفات — كتالوج لا إعدادات ═══ */}
        {activeTab === 'catalog' && (
          <WsSideCol
            side="end"
            title="التصنيفات"
            icon={Tags}
            storageKey="ws:e-store:catalog:sidecol"
            width={300}
            tools={
              <WsIconBtn
                icon={Plus}
                label="تصنيف جديد"
                onClick={() => { setEditingCategory(null); setCategoryForm(createDefaultCategoryForm()); setIsCategoryFormOpen(true) }}
              />
            }
          >
            <WsBlock fill scroll>
              {categoriesQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل التصنيفات...</WsEmpty>
              ) : categories.length === 0 ? (
                <WsEmpty icon={Package}>لا توجد تصنيفات بعد</WsEmpty>
              ) : (
                categories.map((category) => {
                  const isFiltered = itemFilters.category_id === category.id
                  return (
                    <div
                      key={category.id}
                      onClick={() => setItemFilters((current) => ({
                        ...current,
                        category_id: isFiltered ? undefined : category.id,
                        page: 1,
                      }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--ws-hairline)',
                        cursor: 'pointer',
                        background: isFiltered ? 'var(--ws-accent-soft)' : 'transparent',
                        boxShadow: isFiltered ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
                      }}
                    >
                      {category.icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{category.icon}</span>}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {category.name}
                        </span>
                        {!category.is_active && <ToneChip tone={TONES.gray}>مخفي</ToneChip>}
                      </span>
                      <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <WsIconBtn icon={Edit2} label="تعديل التصنيف" onClick={() => setEditingCategory(category)} />
                        <WsIconBtn
                          icon={Trash2}
                          label="حذف التصنيف"
                          onClick={() => setDeleteCategoryTarget(category)}
                          disabled={deleteCategoryMutation.isPending}
                          style={{ color: TONES.red.tx }}
                        />
                      </span>
                    </div>
                  )
                })
              )}
            </WsBlock>
          </WsSideCol>
        )}

        {/* ═══ ★ قسيمة الاستبدال — التحويل يُرى قبل أن يقع ═══ */}
        {activeTab === 'orders' && (
          <WsSideCol side="end" title="قسيمة الاستبدال" icon={Receipt} storageKey="ws:e-store:orders:sidecol" width={360}>
            <WsBlock fill scroll>
              {!selectedOrder ? (
                <WsEmpty icon={Receipt}>اختر طلباً لعرض قسيمته</WsEmpty>
              ) : (
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* رأس القسيمة */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, direction: 'ltr' }}>
                      {selectedOrder.reference_number || `#${selectedOrder.id}`}
                    </span>
                    <OrderStatusChip status={selectedOrder.status} />
                  </div>
                  {selectedOrder.submitted_via && (
                    <ToneChip tone={TONES.gray}>عبر: {selectedOrder.submitted_via}</ToneChip>
                  )}

                  {/* هوية الطالب — بلا الصف والفصل لا يُنادى الطالب أصلاً */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 9 }}>
                    <InitialAvatar name={selectedOrder.student?.name ?? '؟'} tone={TONES.sky} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>{selectedOrder.student?.name ?? 'غير معروف'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        {[selectedOrder.student?.grade, selectedOrder.student?.class_name].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {selectedOrder.student?.national_id && (
                        <p style={{ margin: '2px 0 0', fontSize: 10, fontFamily: 'monospace', color: 'var(--ws-text-2)', direction: 'ltr', textAlign: 'right' }}>
                          {selectedOrder.student.national_id}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* المطلوب */}
                  <div>
                    <p className="ws-label" style={{ marginBottom: 5 }}>المطلوب</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {selectedOrder.items?.map((line) => (
                        <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--ws-border)', borderRadius: 8, padding: 7 }}>
                          <ItemThumb url={line.image_url} name={line.name} size={28} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700 }}>{line.name}</span>
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                              {line.quantity} × {numberFormatter.format(line.unit_points)} نقطة
                            </span>
                          </span>
                          <b style={{ fontSize: 11.5, color: TONES.purple.tx, flexShrink: 0 }}>
                            {numberFormatter.format(line.total_points)}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* أثر الاعتماد — دفتر النقاط */}
                  {selectedOrder.status === 'pending' && (
                    <div style={{ background: TONES.purple.bg, border: `1px solid ${TONES.purple.bd}`, borderRadius: 10, padding: 10 }}>
                      <p className="ws-label" style={{ marginBottom: 5, color: TONES.purple.tx }}>أثر الاعتماد</p>
                      <p style={{ margin: 0, fontSize: 12, color: TONES.purple.tx, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>رصيد الطالب</span>
                        <b style={{ fontSize: 14 }}>− {numberFormatter.format(selectedOrder.total_points ?? 0)} نقطة</b>
                      </p>
                    </div>
                  )}

                  {/* دفتر واقعي بعد التنفيذ */}
                  {selectedOrder.status !== 'pending' && (selectedOrder.points_charged ?? 0) > 0 && (
                    <div style={{ background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: 10, fontSize: 11.5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--ws-text-2)' }}>المخصوم فعلياً</span>
                        <b style={{ color: TONES.purple.tx }}>{numberFormatter.format(selectedOrder.points_charged)} نقطة</b>
                      </span>
                      {selectedOrder.refund_transaction_id && (
                        <div style={{ marginTop: 6 }}>
                          <ToneChip tone={TONES.green}>أُعيدت النقاط</ToneChip>
                        </div>
                      )}
                    </div>
                  )}

                  {/* مسار الطلب */}
                  <div>
                    <p className="ws-label" style={{ marginBottom: 5 }}>مسار الطلب</p>
                    <div className="ws-timeline" style={{ padding: '4px 0 0' }}>
                      <OrderStep
                        label="طُلب"
                        at={selectedOrder.created_at}
                        tone={TONES.gray}
                        done
                        note={selectedOrder.status === 'pending' ? waitingNote(selectedOrder.created_at) : null}
                      />
                      {selectedOrder.approved_at && (
                        <OrderStep label="اعتُمد" at={selectedOrder.approved_at} tone={TONES.sky} done />
                      )}
                      {selectedOrder.fulfilled_at && (
                        <OrderStep label="سُلّم" at={selectedOrder.fulfilled_at} tone={TONES.green} done />
                      )}
                      {selectedOrder.status === 'rejected' && (
                        <OrderStep label="رُفض" at={selectedOrder.cancelled_at ?? selectedOrder.updated_at} tone={TONES.red} done />
                      )}
                      {selectedOrder.status === 'cancelled' && (
                        <OrderStep label="أُلغي" at={selectedOrder.cancelled_at ?? selectedOrder.updated_at} tone={TONES.gray} done />
                      )}
                    </div>
                  </div>

                  {/* الملاحظات */}
                  {selectedOrder.student_notes && (
                    <div style={{ background: TONES.sky.bg, border: `1px solid ${TONES.sky.bd}`, borderRadius: 8, padding: 8, fontSize: 11.5, color: TONES.sky.tx }}>
                      <b>ملاحظات الطالب: </b>{selectedOrder.student_notes}
                    </div>
                  )}
                  {selectedOrder.admin_notes && (
                    <div style={{ background: TONES.amber.bg, border: `1px solid ${TONES.amber.bd}`, borderRadius: 8, padding: 8, fontSize: 11.5, color: TONES.amber.tx }}>
                      <b>ملاحظات الإدارة: </b>{selectedOrder.admin_notes}
                    </div>
                  )}

                  {/* القرار */}
                  {['pending', 'approved'].includes(selectedOrder.status) && (
                    <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <WsField label="السبب / الملاحظة (اختياري)">
                        <WsTextarea
                          rows={2}
                          value={orderReason}
                          onChange={(event) => setOrderReason(event.target.value)}
                          placeholder="اكتب سبباً أو اختر من الأسباب الجاهزة..."
                        />
                      </WsField>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {QUICK_REASONS.map((reason) => (
                          <button key={reason} type="button" className="ws-chip" onClick={() => setOrderReason(reason)}>
                            {reason}
                          </button>
                        ))}
                      </div>

                      {selectedOrder.status === 'pending' && settingsForm.require_admin_reason_on_reject && !orderReason.trim() && (
                        <WsAlert tone="warn" boxed>
                          الإعدادات تُلزم بكتابة سبب عند رفض الطلب
                        </WsAlert>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        {selectedOrder.status === 'pending' && (
                          <>
                            <WsBtn
                              icon={CheckCircle2}
                              onClick={() => handleApproveOrder(selectedOrder)}
                              disabled={isActionActive(selectedOrder, 'approve') && approveOrderMutation.isPending}
                              style={{ flex: 1, justifyContent: 'center', color: TONES.green.tx, borderColor: TONES.green.bd, background: TONES.green.bg }}
                            >
                              {isActionActive(selectedOrder, 'approve') && approveOrderMutation.isPending ? <WsSpinner /> : 'اعتماد'}
                            </WsBtn>
                            <WsBtn
                              icon={XCircle}
                              onClick={() => handleRejectOrder(selectedOrder, orderReason)}
                              disabled={isActionActive(selectedOrder, 'reject') && rejectOrderMutation.isPending}
                              style={{ flex: 1, justifyContent: 'center', color: TONES.red.tx, borderColor: TONES.red.bd, background: TONES.red.bg }}
                            >
                              {isActionActive(selectedOrder, 'reject') && rejectOrderMutation.isPending ? <WsSpinner /> : 'رفض'}
                            </WsBtn>
                          </>
                        )}
                        {selectedOrder.status === 'approved' && (
                          <WsBtn
                            icon={CheckCircle2}
                            onClick={() => handleFulfillOrder(selectedOrder, orderReason)}
                            disabled={isActionActive(selectedOrder, 'fulfill') && fulfillOrderMutation.isPending}
                            style={{ flex: 1, justifyContent: 'center', color: TONES.sky.tx, borderColor: TONES.sky.bd, background: TONES.sky.bg }}
                          >
                            {isActionActive(selectedOrder, 'fulfill') && fulfillOrderMutation.isPending ? <WsSpinner /> : 'تأكيد التسليم'}
                          </WsBtn>
                        )}
                        <WsBtn
                          icon={Ban}
                          onClick={() => handleCancelOrder(selectedOrder, orderReason)}
                          disabled={isActionActive(selectedOrder, 'cancel') && cancelOrderMutation.isPending}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          {isActionActive(selectedOrder, 'cancel') && cancelOrderMutation.isPending ? <WsSpinner /> : 'إلغاء الطلب'}
                        </WsBtn>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </WsBlock>
          </WsSideCol>
        )}

        {/* ═══ ملخص السياسة الحي ═══ */}
        {activeTab === 'settings' && (
          <WsSideCol side="end" title="ملخص السياسة" icon={FileText} storageKey="ws:e-store:settings:sidecol" width={320}>
            <WsBlock fill scroll>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {settingsDirty && <ToneChip tone={TONES.amber}>تغييرات غير محفوظة</ToneChip>}
                {timeConflict && <WsAlert tone="warn" boxed>وقت البداية بعد وقت النهاية</WsAlert>}

                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 2.1 }}>
                  {policySentences(settingsForm).map((sentence, index) => (
                    <span key={index} style={{ display: 'block' }}>• {sentence}</span>
                  ))}
                </p>

                <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8, borderTop: '1px solid var(--ws-hairline)', paddingTop: 8 }}>
                  يتحدث الملخص مع كل تبديل — وهو ما سيراه الطالب فعلياً، لا ما تقوله المفاتيح.
                </p>
              </div>
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>

      {/* ═══ مودال المنتج ═══ */}
      {isItemFormOpen && (
        <div className="ws-modal" onClick={() => { setIsItemFormOpen(false); setEditingItem(null); setItemForm(createDefaultItemForm()) }}>
          <div className="ws-modal__panel" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">{editingItem ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                  <p className="ws-modal__sub">المنتج يظهر للطلاب في متجر النقاط حسب حالته وتصنيفه</p>
                </div>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => { setIsItemFormOpen(false); setEditingItem(null); setItemForm(createDefaultItemForm()) }} />
              </div>
            </header>
            <form onSubmit={handleItemFormSubmit}>
              <div className="ws-modal__body" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <WsField label="اسم المنتج *">
                    <WsInput
                      type="text"
                      required
                      value={itemForm.name}
                      onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="السعر بالنقاط *">
                    <WsInput
                      type="number"
                      required
                      min={1}
                      value={itemForm.points_cost}
                      onChange={(event) => setItemForm((current) => ({ ...current, points_cost: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="التصنيف">
                    <WsSelect
                      value={itemForm.store_category_id}
                      onChange={(event) => setItemForm((current) => ({ ...current, store_category_id: event.target.value }))}
                    >
                      <option value="">بدون تصنيف</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </WsSelect>
                  </WsField>
                  <WsField label="حد الشراء لكل طالب (اختياري)">
                    <WsInput
                      type="number"
                      min={1}
                      value={itemForm.max_per_student}
                      onChange={(event) => setItemForm((current) => ({ ...current, max_per_student: event.target.value }))}
                    />
                  </WsField>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>مخزون غير محدود</p>
                  <WsSwitch
                    checked={itemForm.unlimited_stock}
                    onChange={(checked) => setItemForm((current) => ({ ...current, unlimited_stock: checked }))}
                  />
                </div>
                {!itemForm.unlimited_stock && (
                  <WsField label="الكمية المتاحة">
                    <WsInput
                      type="number"
                      min={0}
                      value={itemForm.stock_quantity}
                      onChange={(event) => setItemForm((current) => ({ ...current, stock_quantity: event.target.value }))}
                    />
                  </WsField>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <WsField label="رابط صورة (اختياري)">
                    <WsInput
                      type="text"
                      value={itemForm.image_url}
                      onChange={(event) => setItemForm((current) => ({ ...current, image_url: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="الرمز التعريفي SKU (اختياري)">
                    <WsInput
                      type="text"
                      value={itemForm.sku}
                      onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value }))}
                    />
                  </WsField>
                </div>

                <WsField label="ترتيب العرض (اختياري)">
                  <WsInput
                    type="number"
                    value={itemForm.display_order}
                    onChange={(event) => setItemForm((current) => ({ ...current, display_order: event.target.value }))}
                  />
                </WsField>

                <WsField label="الوصف">
                  <WsTextarea
                    rows={3}
                    value={itemForm.description}
                    onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </WsField>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>عرض المنتج للطلاب</p>
                  <WsSwitch
                    checked={itemForm.is_active}
                    onChange={(checked) => setItemForm((current) => ({ ...current, is_active: checked }))}
                  />
                </div>
              </div>
              <footer className="ws-modal__foot">
                <WsBtn onClick={() => { setIsItemFormOpen(false); setEditingItem(null); setItemForm(createDefaultItemForm()) }}>إلغاء</WsBtn>
                <WsBtn
                  type="submit"
                  variant="primary"
                  icon={Save}
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                >
                  {createItemMutation.isPending || updateItemMutation.isPending
                    ? 'جارٍ الحفظ...'
                    : editingItem ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ═══ مودال التصنيف ═══ */}
      {isCategoryFormOpen && (
        <div className="ws-modal" onClick={() => { setIsCategoryFormOpen(false); setEditingCategory(null); setCategoryForm(createDefaultCategoryForm()) }}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">{editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</h3>
                  <p className="ws-modal__sub">نظم المنتجات في مجموعات مرنة لسهولة التصفح</p>
                </div>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => { setIsCategoryFormOpen(false); setEditingCategory(null); setCategoryForm(createDefaultCategoryForm()) }} />
              </div>
            </header>
            <form onSubmit={handleCategoryFormSubmit}>
              <div className="ws-modal__body">
                <WsField label="اسم التصنيف *">
                  <WsInput
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </WsField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <WsField label="الاسم المختصر (Slug)">
                    <WsInput
                      type="text"
                      value={categoryForm.slug}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
                    />
                  </WsField>
                  <WsField label="الأيقونة">
                    <WsInput
                      type="text"
                      value={categoryForm.icon}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
                    />
                  </WsField>
                </div>
                <WsField label="ترتيب العرض">
                  <WsInput
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, display_order: event.target.value }))}
                  />
                </WsField>
                <WsField label="الوصف">
                  <WsTextarea
                    rows={3}
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </WsField>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>تفعيل التصنيف</p>
                  <WsSwitch
                    checked={categoryForm.is_active}
                    onChange={(checked) => setCategoryForm((current) => ({ ...current, is_active: checked }))}
                  />
                </div>
              </div>
              <footer className="ws-modal__foot">
                <WsBtn onClick={() => { setIsCategoryFormOpen(false); setEditingCategory(null); setCategoryForm(createDefaultCategoryForm()) }}>إلغاء</WsBtn>
                <WsBtn
                  type="submit"
                  variant="primary"
                  icon={Save}
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending
                    ? 'جارٍ الحفظ...'
                    : editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                </WsBtn>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ═══ تأكيد حذف منتج — واعٍ بالسياق ═══ */}
      {deleteItemTarget && (
        <div className="ws-modal" onClick={() => setDeleteItemTarget(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف المنتج</h3>
              <p className="ws-modal__sub">هل أنت متأكد من حذف المنتج "{deleteItemTarget.name}"؟</p>
            </header>
            <div className="ws-modal__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 9 }}>
                <ItemThumb url={deleteItemTarget.image_url} name={deleteItemTarget.name} size={36} />
                <span>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{deleteItemTarget.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: TONES.purple.tx, fontWeight: 700 }}>
                    {numberFormatter.format(deleteItemTarget.points_cost)} نقطة
                  </span>
                </span>
              </div>
              {(deleteItemTarget.times_redeemed ?? 0) > 0 && (
                <WsAlert tone="warn" boxed>
                  استُبدل هذا المنتج {deleteItemTarget.times_redeemed} مرة — حذفه يزيله من الرفّ نهائياً.
                </WsAlert>
              )}
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setDeleteItemTarget(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                disabled={deleteItemMutation.isPending}
                onClick={() => { handleDeleteItem(deleteItemTarget); setDeleteItemTarget(null) }}
              >
                {deleteItemMutation.isPending ? 'جارٍ الحذف...' : 'حذف المنتج'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* ═══ تأكيد حذف تصنيف ═══ */}
      {deleteCategoryTarget && (
        <div className="ws-modal" onClick={() => setDeleteCategoryTarget(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف التصنيف</h3>
              <p className="ws-modal__sub">سيتم حذف التصنيف "{deleteCategoryTarget.name}". هل ترغب بالمتابعة؟</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="warn" boxed>
                المنتجات المرتبطة بهذا التصنيف تبقى، لكنها تصير بلا تصنيف.
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setDeleteCategoryTarget(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                disabled={deleteCategoryMutation.isPending}
                onClick={() => { handleDeleteCategory(deleteCategoryTarget); setDeleteCategoryTarget(null) }}
              >
                {deleteCategoryMutation.isPending ? 'جارٍ الحذف...' : 'حذف التصنيف'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

/** مفتاح إعداد بسطر واحد */
function SettingSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        border: '1px solid var(--ws-border)',
        borderRadius: 10,
        padding: '8px 10px',
      }}
    >
      <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600 }}>{label}</p>
      <WsSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

/** خطوة في مسار الطلب */
function OrderStep({
  label,
  at,
  tone,
  done,
  note,
}: {
  label: string
  at?: string | null
  tone: { bg: string; bd: string; tx: string }
  done?: boolean
  note?: string | null
}) {
  return (
    <div className={`ws-timeline__item ${done ? 'is-past' : ''}`} style={{ paddingInlineStart: 44, marginBottom: 8 }}>
      <span className="ws-timeline__node" style={{ width: 40 }}>
        <span className="ws-timeline__dot" style={{ width: 24, height: 24, background: tone.bg, color: tone.tx }}>
          <CheckCircle2 style={{ width: 12, height: 12 }} />
        </span>
      </span>
      <div style={{ paddingTop: 2 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
          {at ? dateFormatter.format(new Date(at)) : '—'}
        </span>
        {note && <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: TONES.red.tx }}>{note}</span>}
      </div>
    </div>
  )
}

/** «ينتظر منذ N يوم» — يظهر بالأحمر بعد ثلاثة أيام */
function waitingNote(createdAt?: string | null): string | null {
  const { days } = timeAgo(createdAt)
  return days >= 3 ? `ينتظر منذ ${days} يوم` : null
}

/** ترجمة الإعدادات إلى جمل يفهمها المدير — ما سيراه الطالب لا ما تقوله المفاتيح */
function policySentences(form: StoreSettingsFormState): string[] {
  const out: string[] = []
  const statusLabel = STORE_STATUS_OPTIONS.find((o) => o.value === form.store_status)?.label ?? 'المتجر متاح'
  out.push(`${statusLabel}.`)

  const days = form.allowed_redemption_weekdays
  const dayText = days.length === 0
    ? 'طوال الأسبوع'
    : days.map((d) => WEEKDAY_OPTIONS.find((w) => w.value === d)?.label ?? d).join('، ')
  const timeText = form.allow_redemption_start_time && form.allow_redemption_end_time
    ? `بين ${form.allow_redemption_start_time} و${form.allow_redemption_end_time}`
    : 'طوال اليوم'
  out.push(`يُسمح بالاستبدال ${dayText} ${timeText}.`)

  if (form.auto_approve_orders && form.auto_fulfill_orders) {
    out.push('الطلبات تُعتمد وتُسلَّم تلقائياً بلا تدخل.')
  } else if (form.auto_approve_orders) {
    out.push('الطلبات تُعتمد تلقائياً، والتسليم يدوي.')
  } else {
    out.push('كل طلب يحتاج اعتماداً يدوياً' + (form.auto_fulfill_orders ? ' ثم يُسلَّم تلقائياً.' : ' ثم تسليماً يدوياً.'))
  }

  const limits: string[] = [`${form.max_items_per_order || '—'} منتجات للطلب`]
  if (form.max_points_per_order) limits.push(`${form.max_points_per_order} نقطة كحد أقصى`)
  if (form.max_pending_orders_per_student) limits.push(`${form.max_pending_orders_per_student} طلبات معلقة للطالب`)
  out.push(`الحد: ${limits.join('، ')}.`)

  if (form.enforce_violation_limit && form.max_behavior_violations) {
    out.push(
      `يُمنع من تجاوز ${form.max_behavior_violations} مخالفات` +
      (form.violation_lookback_days ? ` خلال ${form.violation_lookback_days} يوماً.` : '.'),
    )
  }

  if (form.notify_low_stock) {
    const count = form.notification_recipients.split(/\s*(?:\n|,|;|؛|،)\s*/).filter((v) => v.trim()).length
    out.push(`تنبيه بريدي${count > 0 ? ` لـ${count} عنوان` : ''} عند نزول المخزون إلى ${form.low_stock_threshold}.`)
  }

  if (form.allow_student_cancellations) out.push('الطالب يستطيع إلغاء طلبه قبل الاعتماد.')
  if (form.prevent_redemption_when_inventory_empty) out.push('الاستبدال يتوقف تلقائياً عند نفاد المخزون.')

  return out
}
