import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  useGuidanceReferralsQuery, 
  useGuidanceReferralStatsQuery,
  useReceiveGuidanceReferralMutation,
} from '../referrals/hooks'
import type { StudentReferral, ReferralStatus, ReferralFilters } from '../referrals/types'

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

function ReferralCard({ 
  referral, 
  onView, 
  onReceive 
}: { 
  referral: StudentReferral
  onView: () => void
  onReceive?: () => void
}) {
  const priorityStyle = PRIORITY_STYLES[referral.priority] || PRIORITY_STYLES.medium
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:shadow-md transition-shadow">
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
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
          referral.referral_type === 'academic_weakness' 
            ? 'bg-amber-100 text-amber-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <i className={referral.referral_type === 'academic_weakness' ? 'bi-book' : 'bi-exclamation-triangle'} />
          {referral.referral_type_label}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 line-clamp-2">{referral.description}</p>
      
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          <i className="bi bi-person ml-1" />
          المحيل: {referral.referred_by_user?.name}
        </span>
        <span>{new Date(referral.created_at).toLocaleDateString('ar-SA')}</span>
      </div>
      
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {referral.status === 'pending' && onReceive && (
          <button
            onClick={(e) => { e.stopPropagation(); onReceive(); }}
            className="text-xs text-green-600 hover:text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 font-medium"
          >
            <i className="bi bi-check2-circle ml-1" />
            استلام
          </button>
        )}
        <button
          onClick={onView}
          className="text-xs text-sky-600 hover:text-sky-800 px-3 py-1.5 rounded-lg hover:bg-sky-50 font-medium"
        >
          عرض التفاصيل
        </button>
      </div>
    </div>
  )
}

export function GuidanceReferralsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ReferralFilters>({})
  
  const { data: referrals, isLoading, error } = useGuidanceReferralsQuery(filters)
  const { data: stats } = useGuidanceReferralStatsQuery()
  const receiveMutation = useReceiveGuidanceReferralMutation()
  
  const handleReceive = async (id: number) => {
    try {
      await receiveMutation.mutateAsync(id)
    } catch (err) {
      console.error('Error receiving referral:', err)
      alert('حدث خطأ أثناء استلام الإحالة')
    }
  }

  const updateFilter = (key: keyof ReferralFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }))
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">إحالات الطلاب</h1>
        <p className="text-sm text-slate-500">إحالات الطلاب المحولة للموجه الطلابي</p>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">إجمالي الإحالات</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">قيد الانتظار</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
            <p className="text-xs text-slate-500">قيد المعالجة</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">مكتملة</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="received">تم الاستلام</option>
            <option value="in_progress">قيد المعالجة</option>
            <option value="completed">مكتملة</option>
          </select>
          
          <select
            value={filters.type ?? ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="">جميع الأنواع</option>
            <option value="academic_weakness">ضعف دراسي</option>
            <option value="behavioral_violation">مخالفة سلوكية</option>
          </select>
          
          <select
            value={filters.priority ?? ''}
            onChange={(e) => updateFilter('priority', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="">جميع الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </div>
      </div>
      
      {/* Referrals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <i className="bi bi-exclamation-triangle text-5xl text-red-400" />
          <p className="mt-4 text-lg font-medium text-slate-600">حدث خطأ في تحميل البيانات</p>
        </div>
      ) : referrals && referrals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referrals.map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              onView={() => navigate(`/guidance/referrals/${referral.id}`)}
              onReceive={referral.status === 'pending' ? () => handleReceive(referral.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <i className="bi bi-inbox text-5xl text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">لا توجد إحالات</p>
          <p className="mt-1 text-sm text-slate-400">
            ستظهر هنا الإحالات المحولة من المعلمين
          </p>
        </div>
      )}
    </div>
  )
}
