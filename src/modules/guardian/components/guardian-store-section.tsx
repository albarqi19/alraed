import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Gift,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'
import type {
  GuardianStoreCatalog,
  GuardianStoreItem,
  GuardianStoreOrderPayload,
  GuardianStoreOrderRecord,
  GuardianStoreOverview,
} from '../types'
import type { StoreOrderStatus, StoreStatus } from '@/modules/admin/types'

const ORDER_STATUS_LABELS: Record<StoreOrderStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  fulfilled: 'مكتمل',
  cancelled: 'ملغي',
  rejected: 'مرفوض',
}

const ORDER_STATUS_STYLES: Record<StoreOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-blue-100 text-blue-700 border border-blue-200',
  fulfilled: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
  rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
}

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  open: 'المتجر متاح',
  closed: 'المتجر مغلق',
  maintenance: 'تحت الصيانة',
  inventory: 'جرد المخزون',
  paused: 'متوقف مؤقتاً',
  empty: 'لا توجد منتجات',
}

const STORE_STATUS_STYLES: Record<StoreStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  closed: 'bg-rose-100 text-rose-700 border border-rose-200',
  maintenance: 'bg-amber-100 text-amber-700 border border-amber-200',
  inventory: 'bg-blue-100 text-blue-700 border border-blue-200',
  paused: 'bg-slate-100 text-slate-600 border border-slate-200',
  empty: 'bg-slate-100 text-slate-600 border border-slate-200',
}

const dateFormatter = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })

type GuardianStoreSectionProps = {
  nationalId: string
  overview: GuardianStoreOverview | null
  overviewLoading: boolean
  catalog: GuardianStoreCatalog | null
  catalogLoading: boolean
  catalogError: string | null
  orders: GuardianStoreOrderRecord[]
  ordersLoading: boolean
  ordersError: string | null
  onSubmitOrder: (payload: GuardianStoreOrderPayload) => Promise<unknown>
  submitPending: boolean
  guardianName?: string | null
  guardianPhone?: string | null
}

type GroupedCatalog = Array<{ key: string; title: string; items: GuardianStoreItem[] }>

type QuantityState = Record<number, number>

export function GuardianStoreSection({
  nationalId,
  overview,
  overviewLoading,
  catalog,
  catalogLoading,
  catalogError,
  orders,
  ordersLoading,
  ordersError,
  onSubmitOrder,
  submitPending,
  guardianName,
  guardianPhone,
}: GuardianStoreSectionProps) {
  const toast = useToast()
  const [selectedItems, setSelectedItems] = useState<QuantityState>({})
  const [notes, setNotes] = useState('')
  const [guardianNameInput, setGuardianNameInput] = useState(guardianName ?? '')
  const [guardianPhoneInput, setGuardianPhoneInput] = useState(guardianPhone ?? '')

  useEffect(() => {
    setGuardianNameInput(guardianName ?? '')
  }, [guardianName])

  useEffect(() => {
    setGuardianPhoneInput(guardianPhone ?? '')
  }, [guardianPhone])

  useEffect(() => {
    setSelectedItems({})
    setNotes('')
  }, [nationalId])

  const catalogItems = catalog?.items ?? []
  const itemsMap = useMemo(() => {
    const entries = new Map<number, GuardianStoreItem>()
    for (const item of catalogItems) {
      entries.set(item.id, item)
    }
    return entries
  }, [catalogItems])

  const calculateTotalPoints = useMemo(() => {
    return (quantities: QuantityState) => {
      let total = 0
      for (const [itemIdString, quantity] of Object.entries(quantities)) {
        const item = itemsMap.get(Number(itemIdString))
        if (!item || quantity <= 0) continue
        total += item.points_cost * quantity
      }
      return total
    }
  }, [itemsMap])

  const totalPointsSelected = useMemo(() => calculateTotalPoints(selectedItems), [calculateTotalPoints, selectedItems])
  const availablePoints = overview?.points.total ?? 0
  const remainingPoints = Math.max(availablePoints - totalPointsSelected, 0)
  const storeStatus = overview?.store.status ?? 'open'
  const allowWaitlist = overview?.store.allow_waitlist_when_closed ?? false
  const allowStudentNotes = overview?.store.allow_student_notes ?? true
  const storeClosed = storeStatus !== 'open' && !allowWaitlist

  const groupedCatalog = useMemo<GroupedCatalog>(() => {
    const groups = new Map<string, { title: string; items: GuardianStoreItem[] }>()
    const categories = catalog?.categories ?? []

    for (const category of categories) {
      groups.set(String(category.id), { title: category.name, items: [] })
    }

    const uncategorizedKey = 'uncategorized'
    for (const item of catalogItems) {
      const key = item.store_category_id != null ? String(item.store_category_id) : uncategorizedKey
      if (!groups.has(key)) {
        groups.set(key, { title: key === uncategorizedKey ? 'منتجات متنوعة' : item.category_name ?? 'منتجات أخرى', items: [] })
      }
      groups.get(key)?.items.push(item)
    }

    return Array.from(groups.entries())
      .map(([key, entry]) => ({ key, title: entry.title, items: entry.items }))
      .filter((entry) => entry.items.length > 0)
  }, [catalog?.categories, catalogItems])

  const selectedItemsList = useMemo(() => {
    return Object.entries(selectedItems)
      .map(([itemIdString, quantity]) => {
        const item = itemsMap.get(Number(itemIdString))
        if (!item || quantity <= 0) {
          return null
        }
        return { item, quantity }
      })
      .filter(Boolean) as Array<{ item: GuardianStoreItem; quantity: number }>
  }, [itemsMap, selectedItems])

  const canSubmit = selectedItemsList.length > 0 && totalPointsSelected > 0 && totalPointsSelected <= availablePoints && !submitPending && !storeClosed

  const handleIncrement = (itemId: number) => {
    setSelectedItems((previous) => {
      const item = itemsMap.get(itemId)
      if (!item) {
        return previous
      }
      if (storeClosed) {
        toast({ type: 'info', title: 'المتجر غير متاح حالياً' })
        return previous
      }
      const currentQuantity = previous[itemId] ?? 0
      if (item.max_per_student && currentQuantity >= item.max_per_student) {
        toast({ type: 'info', title: 'وصلت للحد المسموح لهذا المنتج' })
        return previous
      }
      if (!item.unlimited_stock) {
        const availableQuantity = item.available_quantity ?? 0
        if (availableQuantity <= currentQuantity) {
          toast({ type: 'info', title: 'الكمية المتاحة من هذا المنتج غير كافية' })
          return previous
        }
      }

      const tentative = { ...previous, [itemId]: currentQuantity + 1 }
      const nextTotal = calculateTotalPoints(tentative)
      if (nextTotal > availablePoints) {
        toast({ type: 'info', title: 'رصيد النقاط الحالي لا يكفي' })
        return previous
      }

      return tentative
    })
  }

  const handleDecrement = (itemId: number) => {
    setSelectedItems((previous) => {
      const currentQuantity = previous[itemId] ?? 0
      if (currentQuantity <= 1) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [itemId]: _removed, ...rest } = previous
        return rest
      }
      return { ...previous, [itemId]: currentQuantity - 1 }
    })
  }

  const handleClearSelection = () => {
    setSelectedItems({})
  }

  const handleSubmitOrder = async () => {
    if (!canSubmit) {
      return
    }

    const trimmedName = guardianNameInput.trim() || guardianName?.trim() || ''
    const trimmedPhone = guardianPhoneInput.trim() || guardianPhone?.trim() || ''

    if (!trimmedName || !trimmedPhone) {
      toast({ type: 'error', title: 'يرجى التأكد من بيانات ولي الأمر قبل الإرسال' })
      return
    }

    const payload: GuardianStoreOrderPayload = {
      national_id: nationalId,
      guardian_name: trimmedName,
      guardian_phone: trimmedPhone,
      notes: allowStudentNotes && notes.trim() ? notes.trim() : undefined,
      items: selectedItemsList.map(({ item, quantity }) => ({
        item_id: item.id,
        quantity,
      })),
    }

    try {
      await onSubmitOrder(payload)
      setSelectedItems({})
      setNotes('')
    } catch (error) {
      console.error('فشل إرسال طلب المتجر', error)
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr,1.1fr]">
      <div className="glass-card space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">منتجات المتجر الإلكتروني</h2>
            <p className="text-xs text-muted">يمكنك اختيار المنتجات واستبدالها بنقاط الطالب المتاحة.</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${STORE_STATUS_STYLES[storeStatus as StoreStatus]}`}>
            <Gift className="h-4 w-4" />
            <span>{STORE_STATUS_LABELS[storeStatus as StoreStatus]}</span>
          </div>
        </header>

        {overviewLoading || catalogLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جاري تحميل بيانات المتجر...</span>
          </div>
        ) : null}

        {catalogError ? (
          <div className="flex items-center gap-2 rounded-3xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            <span>{catalogError}</span>
          </div>
        ) : null}

        {!catalogLoading && !catalogError && groupedCatalog.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
            لا توجد منتجات متاحة حالياً في المتجر.
          </div>
        ) : null}

        <div className="space-y-6">
          {groupedCatalog.map((group) => (
            <div key={group.key} className="space-y-3">
              <h3 className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{group.title}</span>
                <span className="text-xs text-muted">{group.items.length} منتج</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => {
                  const quantity = selectedItems[item.id] ?? 0
                  const nextTotalPoints = totalPointsSelected + item.points_cost
                  const canIncrement = !storeClosed && item.in_stock && (!item.max_per_student || quantity < item.max_per_student) &&
                    (item.unlimited_stock || (item.available_quantity ?? 0) > quantity) &&
                    nextTotalPoints <= availablePoints

                  return (
                    <article key={item.id} className={`flex flex-col justify-between rounded-3xl border bg-white p-4 shadow-sm transition ${item.in_stock ? 'border-slate-200 hover:border-indigo-200 hover:shadow-md' : 'border-slate-200 opacity-70'}`}>
                      <div className="space-y-2">
                        {item.image_url ? (
                          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                            <img
                              src={item.image_url}
                              alt={`صورة ${item.name}`}
                              className="h-32 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                            <Gift className="h-8 w-8" />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                            {item.description ? (
                              <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">{item.description}</p>
                            ) : null}
                          </div>
                          <div className="rounded-2xl bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                            {item.points_cost} نقطة
                          </div>
                        </div>

                        <dl className="grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-slate-500">المخزون</dt>
                            <dd className="mt-0.5 text-slate-700">
                              {item.unlimited_stock ? 'مفتوح' : item.available_quantity ?? 0}
                              {!item.unlimited_stock && item.available_quantity === 0 ? ' (غير متوفر)' : ''}
                            </dd>
                          </div>
                          {item.max_per_student ? (
                            <div>
                              <dt className="font-semibold text-slate-500">الحد للطالب</dt>
                              <dd className="mt-0.5 text-slate-700">حتى {item.max_per_student} قطعة</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      <footer className="mt-3 flex items-center justify-between gap-3">
                        {quantity > 0 ? (
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/60 px-2 py-1 text-xs text-slate-700">
                            <button
                              type="button"
                              onClick={() => handleDecrement(item.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleIncrement(item.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow disabled:cursor-not-allowed disabled:bg-indigo-300"
                              disabled={!canIncrement}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleIncrement(item.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                            disabled={!item.in_stock || storeClosed || !canIncrement}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            إضافة للسلة
                          </button>
                        )}

                        {!item.in_stock ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">غير متاح حالياً</span>
                        ) : null}
                      </footer>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-5">
        <div className="glass-card space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">ملخص النقاط</h3>
            <Package className="h-4 w-4 text-indigo-500" />
          </header>

          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">الرصيد الحالي</span>
              <span className="text-base font-bold text-slate-900">{availablePoints}</span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>النقاط المختارة</span>
                <span className="font-semibold text-slate-800">{totalPointsSelected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>النقاط المتبقية</span>
                <span className="font-semibold text-slate-800">{remainingPoints}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/80 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-500">بيانات ولي الأمر</p>
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={guardianNameInput}
                onChange={(event) => setGuardianNameInput(event.target.value)}
                placeholder="اسم ولي الأمر"
              />
              <input
                type="tel"
                inputMode="tel"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={guardianPhoneInput}
                onChange={(event) => setGuardianPhoneInput(event.target.value)}
                placeholder="هاتف ولي الأمر"
              />
            </div>
          </div>

          {storeClosed ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800">
              <p className="font-semibold">المتجر غير متاح لطلبات جديدة حالياً.</p>
              {overview?.store.status_message ? (
                <p className="mt-1 text-slate-700">{overview.store.status_message}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-amber-700">يمكنك متابعة حالة الطلبات السابقة أدناه.</p>
            </div>
          ) : overview?.store.status_message ? (
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-700">
              {overview.store.status_message}
            </div>
          ) : null}
        </div>

        <div className="glass-card space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">سلة الطلب</h3>
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
          </header>

          {selectedItemsList.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 text-center text-xs text-muted">
              لم يتم اختيار منتجات بعد.
            </p>
          ) : (
            <div className="space-y-3 text-xs text-slate-700">
              <ul className="space-y-2">
                {selectedItemsList.map(({ item, quantity }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{quantity} × {item.points_cost} = {item.points_cost * quantity} نقطة</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] text-rose-600 shadow"
                      onClick={() => handleDecrement(item.id)}
                    >
                      إزالة
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900">
                <span>الإجمالي</span>
                <span>{totalPointsSelected} نقطة</span>
              </div>

              {allowStudentNotes ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">ملاحظات للمدرسة</label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    maxLength={400}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  disabled={submitPending}
                >
                  تفريغ السلة
                </button>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  disabled={!canSubmit}
                >
                  {submitPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{submitPending ? 'جاري الإرسال...' : 'تأكيد الطلب'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card space-y-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">الطلبات السابقة</h3>
            <Package className="h-4 w-4 text-indigo-500" />
          </header>

          {ordersError ? (
            <div className="flex items-center gap-2 text-xs text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{ordersError}</span>
            </div>
          ) : ordersLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري تحميل الطلبات...</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 text-center text-xs text-muted">
              لا توجد طلبات سابقة في المتجر.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">طلب رقم #{order.reference_number ?? order.id}</p>
                      <p className="text-[11px] text-slate-500">تم الإنشاء في {order.created_at ? dateFormatter.format(new Date(order.created_at)) : '—'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${ORDER_STATUS_STYLES[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-500">المنتجات</p>
                    <ul className="mt-1 space-y-1 text-[11px]">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50/70 px-3 py-1.5">
                          <span>{item.name}</span>
                          <span>{item.quantity} × {item.unit_points} = {item.total_points} نقطة</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {order.admin_notes ? (
                    <p className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2 text-[11px] text-slate-600">
                      ملاحظات المدرسة: {order.admin_notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </section>
  )
}
