import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  useMyReferralsQuery, 
  useReferralStatsQuery,
  useCancelReferralMutation 
} from '../referrals/hooks'
import type { StudentReferral, ReferralStatus } from '../referrals/types'

const STATUS_STYLES: Record<ReferralStatus, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'bi-clock' },
  received: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'bi-check2' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: 'bi-gear' },
  transferred: { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'bi-arrow-repeat' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'bi-check2-circle' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-800', icon: 'bi-x-circle' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'bi-x-lg' },
}

const PRIORITY_STYLES: Record<string, { dot: string }> = {
  low: { dot: 'bg-slate-400' },
  medium: { dot: 'bg-blue-500' },
  high: { dot: 'bg-orange-500' },
  urgent: { dot: 'bg-red-500' },
}

function StatusBadge({ status, label }: { status: ReferralStatus; label: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      <i className={`${style.icon}`} />
      {label}
    </span>
  )
}

function ReferralCard({ referral, onView, onCancel }: { 
  referral: StudentReferral
  onView: () => void
  onCancel?: () => void 
}) {
  const priorityStyle = PRIORITY_STYLES[referral.priority] || PRIORITY_STYLES.medium
  
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${priorityStyle.dot}`} title={referral.priority_label} />
            <h3 className="font-semibold text-slate-900 truncate">
              {referral.student?.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {referral.student?.classroom?.name} • {referral.referral_number}
          </p>
        </div>
        <StatusBadge status={referral.status} label={referral.status_label} />
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
          referral.referral_type === 'academic_weakness' 
            ? 'bg-amber-100 text-amber-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <i className={referral.referral_type === 'academic_weakness' ? 'bi-book' : 'bi-exclamation-triangle'} />
          {referral.referral_type_label}
        </span>
        <span className="text-slate-400">←</span>
        <span className="text-xs text-slate-600">
          {referral.target_role_label}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 line-clamp-2">{referral.description}</p>
      
      {referral.assigned_to_user && (
        <p className="text-xs text-slate-500">
          <i className="bi bi-person-check ml-1" />
          تم تعيينها لـ: {referral.assigned_to_user.name}
        </p>
      )}
      
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {new Date(referral.created_at).toLocaleDateString('ar-SA')}
        </span>
        <div className="flex gap-2">
          {referral.can_cancel && onCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
            >
              إلغاء
            </button>
          )}
          <button
            onClick={onView}
            className="text-xs text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50"
          >
            عرض التفاصيل
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeacherReferralsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  
  const { data: referrals, isLoading, error } = useMyReferralsQuery({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  })
  const { data: stats } = useReferralStatsQuery()
  const cancelMutation = useCancelReferralMutation()
  
  const handleCancel = async (id: number) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذه الإحالة؟')) {
      try {
        await cancelMutation.mutateAsync(id)
      } catch (err) {
        console.error('Error cancelling referral:', err)
        alert('حدث خطأ أثناء إلغاء الإحالة')
      }
    }
  }
  
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">إحالات الطلاب</h1>
          <p className="text-sm text-slate-500">إدارة إحالات الطلاب للإدارة</p>
        </div>
        <button
          onClick={() => navigate('/teacher/referrals/new')}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <i className="bi bi-plus-lg" />
          إحالة جديدة
        </button>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">إجمالي الإحالات</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">قيد الانتظار</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
            <p className="text-xs text-slate-500">قيد المعالجة</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">مكتملة</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="received">تم الاستلام</option>
            <option value="in_progress">قيد المعالجة</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="">جميع الأنواع</option>
            <option value="academic_weakness">ضعف دراسي</option>
            <option value="behavioral_violation">مخالفة سلوكية</option>
          </select>
        </div>
      </div>
      
      {/* Referrals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <i className="bi bi-exclamation-triangle text-4xl text-red-400" />
          <p className="mt-2 text-slate-600">حدث خطأ في تحميل البيانات</p>
        </div>
      ) : referrals && referrals.length > 0 ? (
        <div className="space-y-3">
          {referrals.map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              onView={() => navigate(`/teacher/referrals/${referral.id}`)}
              onCancel={referral.can_cancel ? () => handleCancel(referral.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <i className="bi bi-inbox text-5xl text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">لا توجد إحالات</p>
          <p className="mt-1 text-sm text-slate-400">
            ابدأ بإنشاء إحالة جديدة لطالب يحتاج للمتابعة
          </p>
          <button
            onClick={() => navigate('/teacher/referrals/new')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            <i className="bi bi-plus-lg" />
            إحالة جديدة
          </button>
        </div>
      )}
    </section>
  )
}
