import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Loader2,
  Power,
  User,
  X,
  XCircle
} from 'lucide-react'

// =====================================================
// Types
// =====================================================

interface CoverageItem {
  id: number
  period_number: number
  grade: string
  class_name: string
  subject_name: string
  substitute_teacher: {
    id: number
    name: string
  }
  status: string
  status_label: string
}

interface CoverageRequest {
  id: number
  requesting_teacher: {
    id: number
    name: string
  }
  request_date: string
  from_period: number
  to_period: number
  reason: string | null
  reason_type: string
  reason_type_label: string
  items: CoverageItem[]
  created_at: string
}

interface PendingResponse {
  success: boolean
  data: CoverageRequest[]
  count: number
}

interface CoverageSettings {
  is_enabled: boolean
}

interface SettingsResponse {
  success: boolean
  data: CoverageSettings
}

const PERIOD_NAMES: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
}

// =====================================================
// API Functions
// =====================================================

async function fetchPendingRequests(): Promise<PendingResponse> {
  const { data } = await apiClient.get('/admin/coverage/requests/pending')
  return data
}

async function fetchCoverageSettings(): Promise<SettingsResponse> {
  const { data } = await apiClient.get('/admin/coverage/settings')
  return data
}

async function updateCoverageSettings(is_enabled: boolean): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.put('/admin/coverage/settings', { is_enabled })
  return data
}

async function approveRequest(id: number, notes?: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/admin/coverage/requests/${id}/approve`, { notes })
  return data
}

async function rejectRequest(id: number, notes?: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/admin/coverage/requests/${id}/reject`, { notes })
  return data
}

// =====================================================
// Component
// =====================================================

interface CoverageRequestsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CoverageRequestsModal({ isOpen, onClose }: CoverageRequestsModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [expandedRequest, setExpandedRequest] = useState<number | null>(null)
  const [actionNotes, setActionNotes] = useState<string>('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; requestId: number } | null>(null)

  // Settings Query
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-coverage-settings'],
    queryFn: fetchCoverageSettings,
    enabled: isOpen,
  })

  // Pending Requests Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-coverage-pending'],
    queryFn: fetchPendingRequests,
    enabled: isOpen,
    refetchInterval: 30000,
  })

  // Settings Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => updateCoverageSettings(enabled),
    onSuccess: (_, enabled) => {
      toast({
        type: 'success',
        title: enabled ? 'تم تفعيل ميزة تأمين الحصص' : 'تم تعطيل ميزة تأمين الحصص'
      })
      queryClient.invalidateQueries({ queryKey: ['admin-coverage-settings'] })
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في تحديث الإعدادات' })
    },
  })

  const isEnabled = settingsData?.data?.is_enabled ?? true

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => approveRequest(id, notes),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد طلب التأمين بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['admin-coverage-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-coverage-pending-count'] })
      setConfirmAction(null)
      setActionNotes('')
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في اعتماد الطلب' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => rejectRequest(id, notes),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم رفض طلب التأمين' })
      queryClient.invalidateQueries({ queryKey: ['admin-coverage-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-coverage-pending-count'] })
      setConfirmAction(null)
      setActionNotes('')
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في رفض الطلب' })
    },
  })

  const requests = data?.data ?? []

  const handleAction = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'approve') {
      approveMutation.mutate({ id: confirmAction.requestId, notes: actionNotes || undefined })
    } else {
      rejectMutation.mutate({ id: confirmAction.requestId, notes: actionNotes || undefined })
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedRequest(expandedRequest === id ? null : id)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-orange-50 px-6 py-4">
          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleMutation.mutate(!isEnabled)}
              disabled={toggleMutation.isPending || settingsLoading}
              className={`
                relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full
                transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                ${toggleMutation.isPending ? 'animate-pulse' : ''}
                ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}
              `}
              title={isEnabled ? 'تعطيل الميزة' : 'تفعيل الميزة'}
            >
              <span
                className={`
                  inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-lg
                  transition-transform duration-300
                  ${isEnabled ? 'translate-x-7' : 'translate-x-1'}
                `}
              >
                <Power className={`h-3.5 w-3.5 ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              </span>
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {toggleMutation.isPending ? 'جاري التحديث...' : isEnabled ? 'الميزة مفعّلة' : 'الميزة معطّلة'}
              </p>
              <p className="text-xs text-muted">
                {isEnabled ? 'المعلمون يمكنهم طلب التأمين' : 'لا يمكن للمعلمين طلب التأمين'}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              طلبات تأمين الحصص
            </h2>
            <p className="text-sm text-muted">
              {requests.length} طلب{requests.length > 1 ? 'ات' : ''} بانتظار الاعتماد
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="تحديث"
            >
              <Loader2 className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              جاري تحميل الطلبات...
            </div>
          ) : isError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-rose-600">
              <AlertCircle className="h-8 w-8" />
              <p>حدث خطأ في تحميل الطلبات</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="text-lg font-semibold text-slate-700">لا توجد طلبات معلقة</p>
              <p className="text-sm">جميع طلبات التأمين تمت معالجتها</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const isExpanded = expandedRequest === request.id
                const allAccepted = request.items.every(item => item.status === 'accepted')

                return (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                  >
                    {/* Request Header */}
                    <button
                      onClick={() => toggleExpand(request.id)}
                      className="flex w-full items-center justify-between p-4 text-right transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          <User className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{request.requesting_teacher.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(request.request_date).toLocaleDateString('ar-SA')}</span>
                            <span>•</span>
                            <span>الحصة {PERIOD_NAMES[request.from_period]} - {PERIOD_NAMES[request.to_period]}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          allAccepted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {allAccepted ? 'البدلاء وافقوا' : 'بعض البدلاء لم يردوا'}
                        </span>

                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                          {request.items.length} حصة
                        </span>

                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                        {/* Reason */}
                        {(request.reason || request.reason_type) && (
                          <div className="rounded-xl bg-white border border-slate-200 p-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">سبب الاستئذان</p>
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">{request.reason_type_label}</span>
                              {request.reason && <span> — {request.reason}</span>}
                            </p>
                          </div>
                        )}

                        {/* Items Table */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50">
                                <th className="w-20 px-3 py-2 text-right font-medium text-slate-600">الحصة</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-600">الصف</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-600">المادة</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-600">البديل</th>
                                <th className="w-24 px-3 py-2 text-center font-medium text-slate-600">الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {request.items.map((item) => (
                                <tr key={item.id} className="border-b last:border-b-0">
                                  <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                                    {PERIOD_NAMES[item.period_number]}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-slate-600">
                                    {item.grade} — {item.class_name}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-slate-600">{item.subject_name}</td>
                                  <td className="px-3 py-2.5 text-right text-slate-700 font-medium">
                                    {item.substitute_teacher.name}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {item.status === 'accepted' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                        <Check className="h-3 w-3" />
                                        وافق
                                      </span>
                                    ) : item.status === 'rejected' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                        <X className="h-3 w-3" />
                                        رفض
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                        <Clock className="h-3 w-3" />
                                        معلق
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={() => setConfirmAction({ type: 'reject', requestId: request.id })}
                            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                          >
                            <XCircle className="h-4 w-4" />
                            رفض
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', requestId: request.id })}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            اعتماد
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
          عند الاعتماد، ستُضاف الحصص لجدول البدلاء ويُرسل إشعار لهم
        </footer>
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {confirmAction.type === 'approve' ? 'تأكيد اعتماد الطلب' : 'تأكيد رفض الطلب'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={confirmAction.type === 'approve' ? 'ملاحظات الاعتماد...' : 'سبب الرفض...'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setConfirmAction(null)
                    setActionNotes('')
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAction}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    confirmAction.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {(approveMutation.isPending || rejectMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : confirmAction.type === 'approve' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      تأكيد الاعتماد
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      تأكيد الرفض
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
