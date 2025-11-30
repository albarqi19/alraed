import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  Eye,
  Search,
  RefreshCw,
  Image,
  FileText,
  CloudUpload,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  getAbsenceExcuses,
  getExcuseDetails,
  approveExcuse,
  rejectExcuse,
  markExcuseNoorSynced,
} from '../api'
import type { AbsenceExcuseRecord } from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import { useAuthStore } from '@/modules/auth/store/auth-store'

type TabValue = 'all' | 'pending' | 'approved' | 'rejected'

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'مقبول', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'مرفوض', className: 'bg-rose-100 text-rose-700' },
}

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]

export function AdminAbsenceExcusesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { token } = useAuthStore()
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedExcuse, setSelectedExcuse] = useState<AbsenceExcuseRecord | null>(null)

  // Approve dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveMessage, setApproveMessage] = useState('')

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Helper function to add auth token to file URLs
  const getAuthenticatedFileUrl = useMemo(() => {
    return (fileUrl: string | null | undefined): string | null => {
      if (!fileUrl || !token) return null
      const separator = fileUrl.includes('?') ? '&' : '?'
      return `${fileUrl}${separator}token=${token}`
    }
  }, [token])

  // Query
  const excusesQuery = useQuery({
    queryKey: ['admin', 'absence-excuses', page, activeTab, searchQuery],
    queryFn: () =>
      getAbsenceExcuses({
        page,
        per_page: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
      }),
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) => approveExcuse(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      setApproveDialogOpen(false)
      setViewDialogOpen(false)
      toast({ type: 'success', title: 'تم قبول العذر', description: 'تم قبول العذر بنجاح وإرسال إشعار للولي' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء قبول العذر' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectExcuse(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      setRejectDialogOpen(false)
      setViewDialogOpen(false)
      toast({ type: 'success', title: 'تم رفض العذر', description: 'تم رفض العذر وإرسال إشعار للولي' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء رفض العذر' })
    },
  })

  const noorSyncMutation = useMutation({
    mutationFn: (id: number) => markExcuseNoorSynced(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      toast({ type: 'success', title: 'تم التحديث', description: 'تم تسجيل مزامنة العذر مع نور' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء تحديث حالة المزامنة' })
    },
  })

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleViewExcuse = async (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setViewDialogOpen(true)
    try {
      const details = await getExcuseDetails(excuse.id)
      setSelectedExcuse(details)
    } catch {
      // Keep existing data if details fetch fails
    }
  }

  const handleOpenApproveDialog = (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setApproveMessage('')
    setApproveDialogOpen(true)
  }

  const handleOpenRejectDialog = (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleApprove = () => {
    if (!selectedExcuse) return
    approveMutation.mutate({ id: selectedExcuse.id, message: approveMessage || undefined })
  }

  const handleReject = () => {
    if (!selectedExcuse || !rejectReason.trim()) return
    rejectMutation.mutate({ id: selectedExcuse.id, reason: rejectReason })
  }

  const handleMarkNoorSynced = (excuse: AbsenceExcuseRecord) => {
    noorSyncMutation.mutate(excuse.id)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return null
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-indigo-600" />
    }
    if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-rose-600" />
    }
    return <FileText className="h-5 w-5 text-slate-600" />
  }

  const excuses = excusesQuery.data?.data ?? []
  const totalPages = excusesQuery.data?.meta?.last_page ?? 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">أعذار الغياب</h1>
        <p className="text-sm text-muted">إدارة ومراجعة أعذار غياب الطلاب المقدمة من أولياء الأمور</p>
      </header>

      {/* Search & Filter */}
      <div className="glass-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم الطالب أو رقم الهوية..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={handleSearch}
              className="button-primary flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              بحث
            </button>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })}
              className="button-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.value
                  ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.value === 'pending' && excusesQuery.data?.stats?.pending ? (
                <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {excusesQuery.data.stats.pending}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">الطالب</th>
                <th className="px-4 py-3 font-semibold">تاريخ الغياب</th>
                <th className="px-4 py-3 font-semibold">تاريخ التقديم</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">مرفق</th>
                <th className="px-4 py-3 font-semibold">نور</th>
                <th className="px-4 py-3 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {excusesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-slate-200" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 mx-auto" /></td>
                  </tr>
                ))
              ) : excuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    لا توجد أعذار
                  </td>
                </tr>
              ) : (
                excuses.map((excuse) => (
                  <tr key={excuse.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{excuse.student?.name || '-'}</p>
                        <p className="text-xs text-slate-500">{excuse.student?.national_id || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {excuse.absence_date ? new Date(excuse.absence_date).toLocaleDateString('ar-SA') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(excuse.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMap[excuse.status]?.className}`}>
                        {statusMap[excuse.status]?.label || excuse.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {excuse.file_url ? (
                        <button
                          onClick={() => handleViewExcuse(excuse)}
                          className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
                        >
                          {getFileIcon(excuse.file_type)}
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {excuse.status === 'approved' && (
                        excuse.noor_synced ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            <Check className="h-3 w-3 ml-1" />
                            تمت المزامنة
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            لم تتم المزامنة
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewExcuse(excuse)}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {excuse.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOpenApproveDialog(excuse)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="قبول"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenRejectDialog(excuse)}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition-colors"
                              title="رفض"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {excuse.status === 'approved' && !excuse.noor_synced && (
                          <button
                            onClick={() => handleMarkNoorSynced(excuse)}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="تم رفعه على نور"
                            disabled={noorSyncMutation.isPending}
                          >
                            <CloudUpload className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-200 p-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <span className="text-sm text-slate-600">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* View Dialog */}
      {viewDialogOpen && selectedExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-right shadow-xl max-h-[90vh] overflow-y-auto">
            <header className="space-y-2 mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تفاصيل العذر</p>
              <h2 className="text-xl font-semibold text-slate-900">عذر الطالب {selectedExcuse.student?.name}</h2>
            </header>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">اسم الطالب</p>
                  <p className="font-semibold text-slate-900">{selectedExcuse.student?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">رقم الهوية</p>
                  <p className="font-semibold text-slate-900">{selectedExcuse.student?.national_id || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ الغياب</p>
                  <p className="font-semibold text-slate-900">{formatDateOnly(selectedExcuse.absence_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ تقديم العذر</p>
                  <p className="font-semibold text-slate-900">{formatDate(selectedExcuse.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">الحالة</p>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMap[selectedExcuse.status]?.className}`}>
                    {statusMap[selectedExcuse.status]?.label || selectedExcuse.status}
                  </span>
                </div>
                {selectedExcuse.status === 'approved' && (
                  <div>
                    <p className="text-xs text-slate-500">حالة نور</p>
                    {selectedExcuse.noor_synced ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        <Check className="h-3 w-3 ml-1" />
                        تمت المزامنة {selectedExcuse.noor_synced_at ? `- ${formatDate(selectedExcuse.noor_synced_at)}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                        لم تتم المزامنة
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">نص العذر</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-900 whitespace-pre-wrap">
                    {selectedExcuse.excuse_text || 'لم يتم إدخال نص'}
                  </p>
                </div>
              </div>

              {selectedExcuse.response_message && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">رد الإدارة</p>
                  <div className={`rounded-xl border p-4 ${
                    selectedExcuse.status === 'approved'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-rose-200 bg-rose-50'
                  }`}>
                    <p className="text-slate-900">{selectedExcuse.response_message}</p>
                  </div>
                </div>
              )}

              {selectedExcuse.reviewed_at && (
                <div>
                  <p className="text-xs text-slate-500">تاريخ المراجعة</p>
                  <p className="text-slate-900">{formatDate(selectedExcuse.reviewed_at)}</p>
                </div>
              )}

              {selectedExcuse.file_url && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">الملف المرفق</p>
                  {selectedExcuse.file_type?.startsWith('image/') && (
                    <img
                      src={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? ''}
                      alt="صورة العذر"
                      className="max-w-full max-h-96 rounded-xl border border-slate-200"
                    />
                  )}
                  {selectedExcuse.file_type === 'application/pdf' && (
                    <iframe
                      src={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? ''}
                      title="ملف العذر PDF"
                      className="w-full h-96 rounded-xl border border-slate-200"
                    />
                  )}
                  <a
                    href={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-secondary mt-2 inline-flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل الملف
                  </a>
                </div>
              )}
            </div>

            <footer className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
              {selectedExcuse.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setViewDialogOpen(false)
                      handleOpenRejectDialog(selectedExcuse)
                    }}
                    className="button-secondary text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => {
                      setViewDialogOpen(false)
                      handleOpenApproveDialog(selectedExcuse)
                    }}
                    className="button-primary bg-emerald-600 hover:bg-emerald-700"
                  >
                    قبول
                  </button>
                </>
              )}
              {selectedExcuse.status === 'approved' && !selectedExcuse.noor_synced && (
                <button
                  onClick={() => handleMarkNoorSynced(selectedExcuse)}
                  className="button-primary flex items-center gap-2"
                  disabled={noorSyncMutation.isPending}
                >
                  <CloudUpload className="h-4 w-4" />
                  تم رفعه على نور
                </button>
              )}
              <button onClick={() => setViewDialogOpen(false)} className="button-secondary">
                إغلاق
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {approveDialogOpen && selectedExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
            <header className="space-y-2 mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">قبول العذر</p>
              <h2 className="text-xl font-semibold text-slate-900">
                هل أنت متأكد من قبول عذر الطالب <span className="text-emerald-600">{selectedExcuse.student?.name}</span>؟
              </h2>
            </header>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">رسالة للولي (اختياري)</label>
                <textarea
                  value={approveMessage}
                  onChange={(e) => setApproveMessage(e.target.value)}
                  placeholder="يمكنك إضافة رسالة ستُرسل لولي الأمر..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  rows={3}
                />
              </div>
            </div>

            <footer className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setApproveDialogOpen(false)}
                className="button-secondary"
                disabled={approveMutation.isPending}
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                className="button-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                قبول العذر
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && selectedExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-xl">
            <header className="space-y-2 mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">رفض العذر</p>
              <h2 className="text-xl font-semibold text-slate-900">
                هل أنت متأكد من رفض عذر الطالب <span className="text-rose-600">{selectedExcuse.student?.name}</span>؟
              </h2>
            </header>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">سبب الرفض <span className="text-rose-500">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="يرجى كتابة سبب الرفض..."
                  className={`mt-1 w-full rounded-xl border bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    !rejectReason.trim()
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  rows={3}
                />
                {!rejectReason.trim() && (
                  <p className="mt-1 text-xs text-rose-600">سبب الرفض مطلوب</p>
                )}
              </div>
            </div>

            <footer className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectDialogOpen(false)}
                className="button-secondary"
                disabled={rejectMutation.isPending}
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                className="button-primary bg-rose-600 hover:bg-rose-700 flex items-center gap-2"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                رفض العذر
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
