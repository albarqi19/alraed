import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import { Link } from 'react-router-dom'

// =====================================================
// Types
// =====================================================

interface IncomingCoverageItem {
  id: number
  request_id: number
  requesting_teacher: {
    id: number
    name: string
  }
  request_date: string
  reason: string | null
  reason_type: string
  reason_type_label: string
  period_number: number
  grade: string
  class_name: string
  subject_name: string
  created_at: string
}

interface IncomingResponse {
  success: boolean
  data: IncomingCoverageItem[]
  count: number
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

async function fetchIncomingCoverage(): Promise<IncomingResponse> {
  const { data } = await apiClient.get('/teacher/coverage/incoming')
  return data
}

async function acceptCoverage(itemId: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/teacher/coverage/incoming/${itemId}/accept`)
  return data
}

async function rejectCoverage(itemId: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/teacher/coverage/incoming/${itemId}/reject`)
  return data
}

// =====================================================
// Component
// =====================================================

export function TeacherCoverageIncomingPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-coverage-incoming'],
    queryFn: fetchIncomingCoverage,
    refetchInterval: 30000, // تحديث كل 30 ثانية
  })

  const acceptMutation = useMutation({
    mutationFn: acceptCoverage,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم قبول طلب التأمين' })
      queryClient.invalidateQueries({ queryKey: ['teacher-coverage-incoming'] })
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في قبول الطلب' })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: rejectCoverage,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم رفض طلب التأمين' })
      queryClient.invalidateQueries({ queryKey: ['teacher-coverage-incoming'] })
    },
    onError: () => {
      toast({ type: 'error', title: 'فشل في رفض الطلب' })
    }
  })

  const items = data?.data ?? []

  // Loading state
  if (isLoading) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلبات التأمين الواردة</h1>
        </header>
        <div className="glass-card flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-500" />
        </div>
      </section>
    )
  }

  // Error state
  if (isError) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلبات التأمين الواردة</h1>
        </header>
        <div className="glass-card text-center py-12">
          <i className="bi bi-exclamation-triangle text-4xl text-rose-400" />
          <p className="mt-4 text-slate-600">حدث خطأ في تحميل الطلبات</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="button-secondary mt-4"
          >
            إعادة المحاولة
          </button>
        </div>
      </section>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلبات التأمين الواردة</h1>
          <p className="text-sm text-slate-600">
            طلبات تأمين الحصص من زملائك
          </p>
        </header>
        <div className="glass-card text-center py-12">
          <i className="bi bi-inbox text-4xl text-slate-300" />
          <p className="mt-4 text-slate-600">لا توجد طلبات تأمين واردة</p>
          <Link
            to="/teacher/services"
            className="button-secondary mt-4 inline-block"
          >
            العودة للخدمات
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلبات التأمين الواردة</h1>
          <p className="text-sm text-slate-600">
            {items.length} طلب{items.length > 1 ? 'ات' : ''} بانتظار ردك
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="button-secondary"
        >
          <i className="bi bi-arrow-clockwise ml-1" />
          تحديث
        </button>
      </header>

      <div className="space-y-4">
        {items.map(item => (
          <div
            key={item.id}
            className="glass-card border-r-4 border-orange-400 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {item.requesting_teacher.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{item.requesting_teacher.name}</p>
                    <p className="text-xs text-slate-500">يطلب منك تأمين حصته</p>
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                جديد
              </span>
            </div>

            {/* Details */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-200 text-xs font-bold text-orange-800">
                  {item.period_number}
                </span>
                <span className="font-medium text-slate-900">الحصة {PERIOD_NAMES[item.period_number]}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">{item.subject_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <i className="bi bi-geo-alt text-slate-400" />
                {item.grade} — {item.class_name}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <i className="bi bi-calendar text-slate-400" />
                {new Date(item.request_date).toLocaleDateString('ar-SA')}
              </div>

              {item.reason && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <i className="bi bi-chat-text text-slate-400" />
                  السبب: {item.reason_type_label} {item.reason ? `- ${item.reason}` : ''}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => rejectMutation.mutate(item.id)}
                disabled={rejectMutation.isPending || acceptMutation.isPending}
                className="button-secondary flex-1 !border-rose-200 !text-rose-600 hover:!bg-rose-50 disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-500" />
                ) : (
                  <>
                    <i className="bi bi-x-lg ml-1" />
                    رفض
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => acceptMutation.mutate(item.id)}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
                className="button-primary flex-1 !bg-emerald-600 hover:!bg-emerald-700 disabled:opacity-50"
              >
                {acceptMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <i className="bi bi-check-lg ml-1" />
                    قبول
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <i className="bi bi-info-circle text-slate-400 ml-2" />
        عند قبولك للطلب، سيتم إضافة الحصة لجدولك بعد موافقة الإدارة.
        يُرجى التواصل مع زميلك للتنسيق.
      </div>
    </section>
  )
}
