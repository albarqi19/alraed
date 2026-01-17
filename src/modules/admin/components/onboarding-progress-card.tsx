import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboardingStats } from '@/modules/onboarding/hooks'
import { useAuthStore } from '@/modules/auth/store/auth-store'

interface ProgressItem {
  key: string
  label: string
  icon: string
  isComplete: boolean
  link: string
  description: string
}

export function OnboardingProgressCard() {
  const user = useAuthStore((state) => state.user)
  const { data: stats, isLoading } = useOnboardingStats()
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem('hide_onboarding_progress') === 'true'
  })

  // إخفاء للمستخدمين غير المديرين
  if (user?.role !== 'school_principal') {
    return null
  }

  // إذا تم إخفاء البطاقة
  if (isHidden) {
    return null
  }

  // حالة التحميل
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  // بناء قائمة العناصر
  const progressItems: ProgressItem[] = [
    {
      key: 'students',
      label: 'الطلاب',
      icon: 'bi-people-fill',
      isComplete: stats.students_count > 0,
      link: '/admin/import',
      description: stats.students_count > 0
        ? `${stats.students_count.toLocaleString('ar-SA')} طالب`
        : 'لم يتم إضافة طلاب',
    },
    {
      key: 'whatsapp',
      label: 'الواتساب',
      icon: 'bi-whatsapp',
      isComplete: stats.whatsapp_connected,
      link: '/admin/whatsapp',
      description: stats.whatsapp_connected ? 'متصل' : 'غير متصل',
    },
    {
      key: 'schedule',
      label: 'الجداول الزمنية',
      icon: 'bi-calendar-week',
      isComplete: stats.schedules_count > 0,
      link: '/admin/schedules',
      description: stats.schedules_count > 0
        ? `${stats.schedules_count.toLocaleString('ar-SA')} جدول`
        : 'لم يتم إنشاء جداول',
    },
    {
      key: 'teachers',
      label: 'المعلمين',
      icon: 'bi-person-badge',
      isComplete: stats.teachers_count > 0,
      link: '/admin/teachers',
      description: stats.teachers_count > 0
        ? `${stats.teachers_count.toLocaleString('ar-SA')} معلم`
        : 'لم يتم إضافة معلمين',
    },
    {
      key: 'attendance_settings',
      label: 'إعدادات الدوام',
      icon: 'bi-clock',
      isComplete: stats.has_attendance_settings,
      link: '/admin/teacher-attendance',
      description: stats.has_attendance_settings
        ? `${stats.work_start_time || ''} - ${stats.work_end_time || ''}`
        : 'لم يتم ضبط وقت الدوام',
    },
  ]

  const completedCount = progressItems.filter((item) => item.isComplete).length
  const totalCount = progressItems.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  // إذا كل شيء مكتمل، لا تظهر البطاقة
  if (progressPercent === 100) {
    return null
  }

  const handleHide = () => {
    localStorage.setItem('hide_onboarding_progress', 'true')
    setIsHidden(true)
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200">
            <i className="bi bi-gear-wide-connected text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">اكتمال إعداد المدرسة</h3>
            <p className="text-sm text-slate-600">أكمل الإعدادات التالية لتحقيق أفضل أداء</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleHide}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
          title="إخفاء"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-600">التقدم</span>
          <span className="font-bold text-amber-600">{progressPercent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {progressItems.map((item) => (
          <Link
            key={item.key}
            to={item.link}
            className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${
              item.isComplete
                ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                : 'border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                item.isComplete
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <i className={`bi ${item.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium text-slate-700">
                {item.label}
                {item.isComplete && (
                  <i className="bi bi-check-circle-fill text-sm text-emerald-500" />
                )}
              </p>
              <p
                className={`truncate text-sm ${
                  item.isComplete ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {item.description}
              </p>
            </div>
            <i className="bi bi-chevron-left text-slate-400 transition-transform group-hover:-translate-x-1" />
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-4 text-center text-xs text-slate-500">
        <i className="bi bi-info-circle ml-1" />
        يمكنك إخفاء هذا القسم بالضغط على زر الإغلاق
      </p>
    </div>
  )
}
