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
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
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

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
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

const ORDER_STATUS_STYLES: Record<StoreOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border border-blue-200',
  fulfilled: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 border border-slate-200',
  rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
}

const TABS: Array<{ key: 'catalog' | 'orders' | 'settings'; label: string }> = [
  { key: 'catalog', label: 'المنتجات' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'settings', label: 'إعدادات المتجر' },
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

  const statsQuery = useStoreStatsQuery()
  const storeSettingsQuery = useStoreSettingsQuery()
  const categoriesQuery = useStoreCategoriesQuery()
  const itemsQuery = useStoreItemsQuery(itemFilters)
  const ordersQuery = useStoreOrdersQuery(orderFilters)

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

  const statsCards = useMemo(() => {
    const stats = statsQuery.data
    return [
      {
        title: 'إجمالي المنتجات',
        value: numberFormatter.format(stats?.total_items ?? 0),
        accent: 'bg-blue-500/15 text-blue-700 border-blue-200',
        icon: Package,
      },
      {
        title: 'الهدايا المتاحة',
        value: numberFormatter.format(stats?.active_items ?? 0),
        accent: 'bg-purple-500/15 text-purple-700 border-purple-200',
        icon: Gift,
      },
      {
        title: 'عمليات الشراء',
        value: numberFormatter.format(stats?.total_orders ?? 0),
        accent: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
        icon: ShoppingCart,
      },
      {
        title: 'نقاط مستبدلة',
        value: numberFormatter.format(stats?.points_redeemed ?? 0),
        accent: 'bg-amber-500/15 text-amber-700 border-amber-200',
        icon: TrendingUp,
      },
    ]
  }, [statsQuery.data])

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
    if (!window.confirm(`هل أنت متأكد من حذف المنتج "${item.name}"؟`)) {
      return
    }
    deleteItemMutation.mutate(item.id)
  }

  const handleDeleteCategory = (category: StoreCategoryRecord) => {
    if (!window.confirm(`سيتم حذف التصنيف "${category.name}". هل ترغب بالمتابعة؟`)) {
      return
    }
    deleteCategoryMutation.mutate(category.id)
  }

  const handleApproveOrder = (order: StoreOrderRecord) => {
    setActiveOrderAction({ id: order.id, action: 'approve' })
    approveOrderMutation.mutate({ id: order.id }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleFulfillOrder = (order: StoreOrderRecord) => {
    const reason = window.prompt('ملاحظة (اختياري):')
    if (reason === null) {
      return
    }
    setActiveOrderAction({ id: order.id, action: 'fulfill' })
    fulfillOrderMutation.mutate({ id: order.id, reason: reason || undefined }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleCancelOrder = (order: StoreOrderRecord) => {
    const reason = window.prompt('سبب الإلغاء (اختياري):')
    if (reason === null) {
      return
    }
    setActiveOrderAction({ id: order.id, action: 'cancel' })
    cancelOrderMutation.mutate({ id: order.id, reason: reason || undefined }, { onSettled: () => setActiveOrderAction(null) })
  }

  const handleRejectOrder = (order: StoreOrderRecord) => {
    const reason = window.prompt('سبب الرفض (اختياري):')
    if (reason === null) {
      return
    }
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

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">متجر النقاط</h1>
            <p className="text-sm text-slate-600">
              إدارة المنتجات والطلبيات وربطها برصيد نقاط الطلاب
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'catalog' && (
              <button
                type="button"
                onClick={() => {
                  setIsItemFormOpen(true)
                  setEditingItem(null)
                  setItemForm(createDefaultItemForm())
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                منتج جديد
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.title} className={`rounded-2xl border bg-white/90 p-5 shadow-sm ${stat.accent}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">{stat.title}</p>
                  <p className="mt-3 text-2xl font-bold">
                    {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stat.value}
                  </p>
                </div>
                <Icon className="h-8 w-8 opacity-50" />
              </div>
            </article>
          )
        })}
      </div>

      <div className="glass-card space-y-6">
        <div className="border-b border-slate-200">
          <div className="flex gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'catalog' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={itemFilters.status}
                onChange={(event) =>
                  setItemFilters((current) => ({
                    ...current,
                    status: event.target.value as 'all' | 'active' | 'inactive',
                    page: 1,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {itemsStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={itemFilters.category_id ? String(itemFilters.category_id) : 'all'}
                onChange={(event) =>
                  setItemFilters((current) => ({
                    ...current,
                    category_id: event.target.value === 'all' ? undefined : Number(event.target.value),
                    page: 1,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">جميع التصنيفات</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setItemFilters((current) => ({
                    ...current,
                    search: itemSearch.trim() || undefined,
                    page: 1,
                  }))
                }}
                className="flex w-full max-w-xs items-center gap-2"
              >
                <input
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="بحث عن منتج"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
                  بحث
                </button>
              </form>
            </div>

            {isItemFormOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  {editingItem ? 'تعديل منتج' : 'إضافة منتج جديد'}
                </h3>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleItemFormSubmit}>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">اسم المنتج</span>
                    <input
                      required
                      value={itemForm.name}
                      onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">السعر بالنقاط</span>
                    <input
                      required
                      type="number"
                      min={1}
                      value={itemForm.points_cost}
                      onChange={(event) => setItemForm((current) => ({ ...current, points_cost: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">التصنيف</span>
                    <select
                      value={itemForm.store_category_id}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, store_category_id: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="">بدون تصنيف</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={itemForm.unlimited_stock}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, unlimited_stock: event.target.checked }))
                      }
                    />
                    مخزون غير محدود
                  </label>

                  {!itemForm.unlimited_stock && (
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-slate-700">الكمية المتاحة</span>
                      <input
                        type="number"
                        min={0}
                        value={itemForm.stock_quantity}
                        onChange={(event) =>
                          setItemForm((current) => ({ ...current, stock_quantity: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      />
                    </label>
                  )}

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">حد الشراء لكل طالب (اختياري)</span>
                    <input
                      type="number"
                      min={1}
                      value={itemForm.max_per_student}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, max_per_student: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">رابط صورة (اختياري)</span>
                    <input
                      value={itemForm.image_url}
                      onChange={(event) => setItemForm((current) => ({ ...current, image_url: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">الرمز التعريفي SKU (اختياري)</span>
                    <input
                      value={itemForm.sku}
                      onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">ترتيب العرض (اختياري)</span>
                    <input
                      type="number"
                      value={itemForm.display_order}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, display_order: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="md:col-span-2 space-y-2 text-sm">
                    <span className="font-medium text-slate-700">الوصف</span>
                    <textarea
                      rows={3}
                      value={itemForm.description}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={itemForm.is_active}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, is_active: event.target.checked }))
                      }
                    />
                    عرض المنتج للطلاب
                  </label>

                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsItemFormOpen(false)
                        setEditingItem(null)
                        setItemForm(createDefaultItemForm())
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    >
                      {(createItemMutation.isPending || updateItemMutation.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {editingItem ? 'حفظ التعديلات' : 'إضافة المنتج'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-3">
              {itemsQuery.isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2">جارٍ تحميل المنتجات...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                  <Gift className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">لا توجد منتجات مطابقة</h3>
                  <p className="mt-2 text-sm text-slate-600">يمكنك إضافة منتج جديد أو تعديل مرشحات البحث الحالية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-slate-900">{item.name}</h4>
                          {!item.is_active && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              مخفي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{item.description || 'بدون وصف'}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="font-semibold text-blue-600">{numberFormatter.format(item.points_cost)} نقطة</span>
                          <span>
                            المخزون:{' '}
                            {item.unlimited_stock
                              ? 'غير محدود'
                              : numberFormatter.format(item.stock_quantity ?? 0)}
                          </span>
                          {item.max_per_student && <span>حد الطالب: {item.max_per_student}</span>}
                          {item.store_category_id && (
                            <span>
                              التصنيف:{' '}
                              {categories.find((category) => category.id === item.store_category_id)?.name ?? '—'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Edit2 className="h-4 w-4" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                          disabled={deleteItemMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}

                  {itemsMeta && itemsMeta.last_page > 1 && (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div>
                        صفحة {itemsMeta.current_page} من {itemsMeta.last_page} — إجمالي{' '}
                        {numberFormatter.format(itemsMeta.total)} منتج
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() =>
                            setItemFilters((current) => ({
                              ...current,
                              page: Math.max(1, (itemsMeta.current_page ?? 1) - 1),
                            }))
                          }
                          disabled={itemsMeta.current_page <= 1}
                        >
                          السابق
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() =>
                            setItemFilters((current) => ({
                              ...current,
                              page: Math.min(itemsMeta.last_page, (itemsMeta.current_page ?? 1) + 1),
                            }))
                          }
                          disabled={itemsMeta.current_page >= itemsMeta.last_page}
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={orderFilters.status}
                onChange={(event) =>
                  setOrderFilters((current) => ({
                    ...current,
                    status: event.target.value as 'all' | StoreOrderStatus,
                    page: 1,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {orderStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setOrderFilters((current) => ({
                    ...current,
                    search: orderSearch.trim() || undefined,
                    page: 1,
                  }))
                }}
                className="flex w-full max-w-sm items-center gap-2"
              >
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="رقم الطلب أو اسم الطالب"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
                  بحث
                </button>
              </form>
            </div>

            {ordersQuery.isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2">جارٍ تحميل الطلبيات...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">لا توجد طلبيات مطابقة</h3>
                <p className="mt-2 text-sm text-slate-600">جرب تعديل المرشحات أو انتظار طلبيات جديدة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const isActionActive = (action: OrderActionType) =>
                    activeOrderAction?.id === order.id && activeOrderAction.action === action

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">
                              رقم الطلب: {order.reference_number || `#${order.id}`}
                            </span>
                            <span>الطالب: {order.student?.name ?? 'غير معروف'}</span>
                            <span>إجمالي النقاط: {numberFormatter.format(order.total_points ?? 0)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>تاريخ الطلب: {order.created_at ? dateFormatter.format(new Date(order.created_at)) : '—'}</span>
                            {order.approved_at && (
                              <span>
                                تم الاعتماد: {dateFormatter.format(new Date(order.approved_at))}
                              </span>
                            )}
                            {order.fulfilled_at && (
                              <span>
                                التسليم: {dateFormatter.format(new Date(order.fulfilled_at))}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${ORDER_STATUS_STYLES[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">محتوى الطلب:</div>
                        <ul className="list-inside list-disc space-y-1">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.name} — {item.quantity} × {numberFormatter.format(item.unit_points)} نقطة
                            </li>
                          ))}
                        </ul>
                        {order.student_notes && (
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            ملاحظات الطالب: {order.student_notes}
                          </p>
                        )}
                        {order.admin_notes && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                            ملاحظات الإدارة: {order.admin_notes}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {order.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveOrder(order)}
                              disabled={approveOrderMutation.isPending && isActionActive('approve')}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {isActionActive('approve') && approveOrderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              اعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectOrder(order)}
                              disabled={rejectOrderMutation.isPending && isActionActive('reject')}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              {isActionActive('reject') && rejectOrderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              رفض
                            </button>
                          </>
                        )}

                        {order.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleFulfillOrder(order)}
                            disabled={fulfillOrderMutation.isPending && isActionActive('fulfill')}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                          >
                            {isActionActive('fulfill') && fulfillOrderMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            تأكيد التسليم
                          </button>
                        )}

                        {['pending', 'approved'].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancelOrderMutation.isPending && isActionActive('cancel')}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isActionActive('cancel') && cancelOrderMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            إلغاء الطلب
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {ordersMeta && ordersMeta.last_page > 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div>
                      صفحة {ordersMeta.current_page} من {ordersMeta.last_page} — إجمالي{' '}
                      {numberFormatter.format(ordersMeta.total)} طلب
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() =>
                          setOrderFilters((current) => ({
                            ...current,
                            page: Math.max(1, (ordersMeta.current_page ?? 1) - 1),
                          }))
                        }
                        disabled={ordersMeta.current_page <= 1}
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() =>
                          setOrderFilters((current) => ({
                            ...current,
                            page: Math.min(ordersMeta.last_page, (ordersMeta.current_page ?? 1) + 1),
                          }))
                        }
                        disabled={ordersMeta.current_page >= ordersMeta.last_page}
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-5">
            <form
              onSubmit={handleSettingsSubmit}
              className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">إعدادات المتجر</h3>
                  <p className="text-sm text-slate-600">
                    تحكم بحالة المتجر، أوقات الاستبدال، والحدود والتنبيهات الخاصة بالطلبات
                  </p>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingSettings || storeSettingsQuery.isLoading}
                >
                  {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  حفظ الإعدادات
                </button>
              </div>

              {storeSettingsQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 p-8 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جارٍ تحميل إعدادات المتجر...</span>
                </div>
              ) : storeSettingsQuery.isError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  تعذر تحميل إعدادات المتجر: {settingsErrorMessage ?? 'حدث خطأ غير متوقع أثناء التحميل'}
                </div>
              ) : (
                <div className="space-y-6">
                  <section className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-slate-700">حالة المتجر</span>
                      <select
                        value={settingsForm.store_status}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            store_status: event.target.value as StoreStatus,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      >
                        {STORE_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-semibold text-slate-700">{selectedStoreStatus.label}</p>
                      <p className="mt-1 text-slate-600">{selectedStoreStatus.description}</p>
                    </div>
                    <label className="md:col-span-2 space-y-2 text-sm">
                      <span className="font-medium text-slate-700">رسالة تظهر للمستخدمين (اختياري)</span>
                      <textarea
                        rows={2}
                        value={settingsForm.store_status_message}
                        onChange={(event) =>
                          setSettingsForm((current) => ({ ...current, store_status_message: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      />
                    </label>
                    <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.allow_waitlist_when_closed}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              allow_waitlist_when_closed: event.target.checked,
                            }))
                          }
                        />
                        السماح بإضافة الطلبات إلى قائمة الانتظار عند الإغلاق
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.prevent_redemption_when_inventory_empty}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              prevent_redemption_when_inventory_empty: event.target.checked,
                            }))
                          }
                        />
                        إيقاف الاستبدال تلقائياً عند نفاد المخزون
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">إدارة الطلبات</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.auto_approve_orders}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              auto_approve_orders: event.target.checked,
                            }))
                          }
                        />
                        اعتماد الطلبات تلقائياً
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.auto_fulfill_orders}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              auto_fulfill_orders: event.target.checked,
                            }))
                          }
                        />
                        إنهاء الطلبات تلقائياً بعد الاعتماد
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.allow_student_cancellations}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              allow_student_cancellations: event.target.checked,
                            }))
                          }
                        />
                        السماح للطالب بإلغاء الطلب قبل الاعتماد
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.allow_student_notes}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              allow_student_notes: event.target.checked,
                            }))
                          }
                        />
                        تمكين ملاحظات الطالب أثناء إنشاء الطلب
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={settingsForm.require_admin_reason_on_reject}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              require_admin_reason_on_reject: event.target.checked,
                            }))
                          }
                        />
                        إلزام الإدارة بكتابة سبب عند رفض الطلب
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">الحدود والتنبيهات</h4>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">تنبيه المخزون عند الوصول إلى</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.low_stock_threshold}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, low_stock_threshold: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">الحد الأقصى للمنتجات في الطلب</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.max_items_per_order}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, max_items_per_order: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">الحد الأقصى للنقاط لكل طلب (اختياري)</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.max_points_per_order}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, max_points_per_order: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">حد الطلبات المعلقة لكل طالب (اختياري)</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.max_pending_orders_per_student}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              max_pending_orders_per_student: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="md:col-span-2 space-y-2 text-sm">
                        <span className="font-medium text-slate-700">بادئة رقم الطلب (اختياري)</span>
                        <input
                          value={settingsForm.reference_prefix}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, reference_prefix: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="md:col-span-2 space-y-2 text-sm">
                        <span className="font-medium text-slate-700">إشعار عبر البريد (بحد أقصى 10 عناوين)</span>
                        <textarea
                          rows={2}
                          value={settingsForm.notification_recipients}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              notification_recipients: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          placeholder="example@school.sa\nadmin@school.sa"
                        />
                        <p className="text-xs text-slate-500">
                          افصل بين كل بريد بفاصلة أو سطر جديد لإرسال تنبيهات المخزون المنخفض.
                        </p>
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.notify_low_stock}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, notify_low_stock: event.target.checked }))
                          }
                        />
                        تفعيل تنبيه البريد عند انخفاض المخزون
                      </label>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">مواعيد الاستبدال</h4>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">بداية وقت الاستبدال (اختياري)</span>
                        <input
                          type="time"
                          value={settingsForm.allow_redemption_start_time}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              allow_redemption_start_time: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">نهاية وقت الاستبدال (اختياري)</span>
                        <input
                          type="time"
                          value={settingsForm.allow_redemption_end_time}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              allow_redemption_end_time: event.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </label>
                      <div className="md:col-span-2 space-y-2 text-sm">
                        <span className="font-medium text-slate-700">الأيام المسموح بها للاستبدال</span>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAY_OPTIONS.map((day) => (
                            <label
                              key={day.value}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                settingsForm.allowed_redemption_weekdays.includes(day.value)
                                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={settingsForm.allowed_redemption_weekdays.includes(day.value)}
                                onChange={() => handleWeekdayToggle(day.value)}
                              />
                              {day.label}
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          اترك كل الأيام غير محددة للسماح بالاستبدال طوال الأسبوع.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">قيود المخالفات</h4>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={settingsForm.enforce_violation_limit}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              enforce_violation_limit: event.target.checked,
                            }))
                          }
                        />
                        منع الطلاب الذين تجاوزوا حد المخالفات من الاستبدال
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">الحد الأقصى للمخالفات</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.max_behavior_violations}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              max_behavior_violations: event.target.value,
                            }))
                          }
                          disabled={!settingsForm.enforce_violation_limit}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">عدد الأيام للمراجعة (اختياري)</span>
                        <input
                          type="number"
                          min={1}
                          value={settingsForm.violation_lookback_days}
                          onChange={(event) =>
                            setSettingsForm((current) => ({
                              ...current,
                              violation_lookback_days: event.target.value,
                            }))
                          }
                          disabled={!settingsForm.enforce_violation_limit}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                        />
                      </label>
                    </div>
                  </section>
                </div>
              )}
            </form>

            {isCategoryFormOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  {editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}
                </h3>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCategoryFormSubmit}>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">اسم التصنيف</span>
                    <input
                      required
                      value={categoryForm.name}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">الاسم المختصر (Slug)</span>
                    <input
                      value={categoryForm.slug}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">الأيقونة</span>
                    <input
                      value={categoryForm.icon}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">ترتيب العرض</span>
                    <input
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, display_order: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="md:col-span-2 space-y-2 text-sm">
                    <span className="font-medium text-slate-700">الوصف</span>
                    <textarea
                      rows={3}
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, description: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, is_active: event.target.checked }))
                      }
                    />
                    تفعيل التصنيف
                  </label>
                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryFormOpen(false)
                        setEditingCategory(null)
                        setCategoryForm(createDefaultCategoryForm())
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    >
                      {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">تصنيفات المتجر</h3>
                  <p className="text-sm text-slate-600">نظم المنتجات في مجموعات مرنة لسهولة التصفح</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryFormOpen(true)
                    setEditingCategory(null)
                    setCategoryForm(createDefaultCategoryForm())
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
                >
                  <Plus className="h-4 w-4" />
                  تصنيف جديد
                </button>
              </div>

              {categoriesQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 p-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جارٍ تحميل التصنيفات...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">لا توجد تصنيفات بعد</h3>
                  <p className="mt-2 text-sm text-slate-600">ابدأ بإنشاء تصنيفات لتنظيم منتجات المتجر</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {categories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{category.name}</h4>
                          <p className="text-sm text-slate-500">
                            ترتيب العرض: {category.display_order ?? 0} — الحالة: {category.is_active ? 'مفعل' : 'مخفي'}
                          </p>
                          {category.description && (
                            <p className="mt-2 text-sm text-slate-600">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(category)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={deleteCategoryMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
