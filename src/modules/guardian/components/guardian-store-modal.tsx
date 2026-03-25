import { X, ShoppingCart, Star, Package, Clock } from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import { useGuardianStoreCatalogQuery, useGuardianStoreOrdersQuery, useGuardianStoreOrderMutation } from '../hooks'
import { useState, useMemo } from 'react'
import type { GuardianStoreItem } from '../types'

interface GuardianStoreModalProps {
    isOpen: boolean
    onClose: () => void
}

const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: 'بانتظار المراجعة',
    approved: 'تمت الموافقة',
    fulfilled: 'تم التسليم',
    cancelled: 'ملغى',
    rejected: 'مرفوض',
}

const ORDER_STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
    approved: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    fulfilled: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
    rejected: 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300',
}

export function GuardianStoreModal({ isOpen, onClose }: GuardianStoreModalProps) {
    const { currentNationalId, storeOverview, studentSummary } = useGuardianContext()
    const catalogQuery = useGuardianStoreCatalogQuery(currentNationalId)
    const ordersQuery = useGuardianStoreOrdersQuery(currentNationalId)
    const orderMutation = useGuardianStoreOrderMutation()

    const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog')
    const [selectedItem, setSelectedItem] = useState<GuardianStoreItem | null>(null)
    const [quantity, setQuantity] = useState(1)

    const points = storeOverview?.points.total ?? 0
    const storeStatus = storeOverview?.store.status ?? 'closed'
    const isStoreOpen = storeStatus === 'open'

    const catalog = catalogQuery.data
    const orders = ordersQuery.data ?? []

    const canOrder = useMemo(() => {
        if (!selectedItem || !isStoreOpen) return false
        const totalCost = selectedItem.points_cost * quantity
        return totalCost <= points && selectedItem.in_stock
    }, [selectedItem, quantity, points, isStoreOpen])

    const handleOrder = async () => {
        if (!selectedItem || !currentNationalId || !studentSummary) return

        await orderMutation.mutateAsync({
            national_id: currentNationalId,
            guardian_name: studentSummary.parent_name,
            guardian_phone: studentSummary.parent_phone,
            items: [{ item_id: selectedItem.id, quantity }],
        })

        setSelectedItem(null)
        setQuantity(1)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 dark:bg-black/60 sm:items-center">
            <div
                className="flex h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white dark:bg-slate-800 shadow-2xl sm:h-[85vh] sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900">
                            <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">المتجر الإلكتروني</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                رصيدك: <span className="font-bold text-emerald-600 dark:text-emerald-500">{points}</span> نقطة
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-700 px-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`flex-1 border-b-2 py-3 text-sm font-semibold transition ${activeTab === 'catalog'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        المنتجات
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 border-b-2 py-3 text-sm font-semibold transition ${activeTab === 'orders'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        طلباتي
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!isStoreOpen && (
                        <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 text-center">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">المتجر مغلق حالياً</p>
                            {storeOverview?.store.status_message && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{storeOverview.store.status_message}</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'catalog' && (
                        <div className="space-y-3">
                            {catalogQuery.isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                                </div>
                            ) : !catalog?.items.length ? (
                                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                    لا توجد منتجات متاحة حالياً
                                </div>
                            ) : (
                                catalog.items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedItem(item)}
                                        disabled={!item.in_stock || !isStoreOpen}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-right transition hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="h-16 w-16 rounded-xl object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                                                <Package className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
                                            )}
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                    <Star className="h-3 w-3" />
                                                    {item.points_cost}
                                                </span>
                                                {!item.in_stock && (
                                                    <span className="text-xs text-rose-500 dark:text-rose-400">غير متوفر</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="space-y-3">
                            {ordersQuery.isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                                </div>
                            ) : !orders.length ? (
                                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                    لا توجد طلبات سابقة
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                    طلب #{order.reference_number || order.id}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {order.items_count} منتج • {order.total_points} نقطة
                                                </p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                                {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                            </span>
                                        </div>
                                        {order.created_at && (
                                            <p className="mt-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                                <Clock className="h-3 w-3" />
                                                {new Date(order.created_at).toLocaleDateString('ar-SA')}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Order item modal */}
                {selectedItem && (
                    <div className="absolute inset-0 flex items-end justify-center bg-black/40 dark:bg-black/60 sm:items-center">
                        <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl sm:rounded-3xl">
                            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{selectedItem.name}</h3>

                            <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-700 p-4">
                                <span className="text-sm text-slate-600 dark:text-slate-400">الكمية</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center text-lg font-bold dark:text-white">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6 flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">الإجمالي</span>
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-500">
                                    {selectedItem.points_cost * quantity} نقطة
                                </span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedItem(null)
                                        setQuantity(1)
                                    }}
                                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOrder}
                                    disabled={!canOrder || orderMutation.isPending}
                                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {orderMutation.isPending ? 'جاري الطلب...' : 'تأكيد الطلب'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
