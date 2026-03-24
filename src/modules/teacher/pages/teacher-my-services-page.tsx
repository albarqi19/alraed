import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationModal } from '../components/notification-modal'

type ServiceCard = {
  id: string
  title: string
  description: string
  icon: string
  iconColor: string
  iconBg: string
  accentBar: string
  to?: string
}

const MY_SERVICES: ServiceCard[] = [
  {
    id: 'notifications',
    title: 'الإشعارات',
    description: 'تذكير بمواعيد الحصص',
    icon: 'bi-bell',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100/80',
    accentBar: 'from-violet-400/50 via-violet-200/40 to-transparent',
  },
  {
    id: 'delay-excuses',
    title: 'أعذار التأخير',
    description: 'تقديم أعذار عن التأخير',
    icon: 'bi-clock-history',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-100/80',
    accentBar: 'from-teal-400/50 via-teal-200/40 to-transparent',
    to: '/teacher/delay-excuses',
  },
  {
    id: 'coverage-request',
    title: 'الاستئذان',
    description: 'تأمين الحصص المتبقية',
    icon: 'bi-calendar-x',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100/80',
    accentBar: 'from-orange-400/50 via-orange-200/40 to-transparent',
    to: '/teacher/coverage-request',
  },
]

export function TeacherMyServicesPage() {
  const navigate = useNavigate()
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <i className="bi bi-arrow-right text-lg" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">خدماتي</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة خدماتك الشخصية</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {MY_SERVICES.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => {
              if (service.id === 'notifications') { setIsNotificationModalOpen(true); return }
              if (service.to) navigate(service.to)
            }}
            className="group w-full text-right transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-900"
          >
            <span className="glass-card relative flex h-[90px] w-full flex-col justify-center overflow-hidden p-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <span
                className={`pointer-events-none absolute inset-x-3 top-0 h-1 rounded-full bg-gradient-to-l opacity-80 transition-opacity duration-200 group-hover:opacity-100 ${service.accentBar}`}
              />

              {/* Icon as background */}
              <i className={`${service.icon} ${service.iconColor} pointer-events-none absolute left-2 top-3 text-4xl opacity-10`} />

              {/* Content */}
              <span className="relative z-10 space-y-0.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{service.title}</h3>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400 line-clamp-1">{service.description}</p>
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Empty state if no services */}
      {MY_SERVICES.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 dark:bg-slate-700">
            <i className="bi bi-inbox text-2xl text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">لا توجد خدمات متاحة</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ستظهر هنا الخدمات المتاحة لك</p>
        </div>
      )}

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </section>
  )
}
