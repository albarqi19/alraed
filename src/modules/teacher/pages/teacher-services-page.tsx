import { useState } from 'react'

type ServiceCard = {
  id: string
  title: string
  description: string
  icon: string
  iconColor: string
  iconBg: string
  accentBar: string
}

const SERVICES: ServiceCard[] = [
  {
    id: 'my-services',
    title: 'خدماتي',
    description: 'عرض وإدارة جميع خدماتك',
    icon: 'bi-person-workspace',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100/80',
    accentBar: 'from-emerald-400/50 via-emerald-200/40 to-transparent',
  },
  {
    id: 'student-referral',
    title: 'إحالة طالب',
    description: 'إحالة طالب للإدارة',
    icon: 'bi-arrow-right-square',
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-100/80',
    accentBar: 'from-sky-400/50 via-sky-200/40 to-transparent',
  },
  {
    id: 'certificates',
    title: 'الشهادات',
    description: 'طباعة الشهادات والنماذج',
    icon: 'bi-award',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100/80',
    accentBar: 'from-amber-400/50 via-amber-200/40 to-transparent',
  },
  {
    id: 'reports',
    title: 'التقارير',
    description: 'تقارير الحضور والأداء',
    icon: 'bi-file-earmark-bar-graph',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100/80',
    accentBar: 'from-indigo-400/50 via-indigo-200/40 to-transparent',
  },
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'الحساب والتفضيلات',
    icon: 'bi-gear',
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-200/80',
    accentBar: 'from-slate-400/40 via-slate-200/40 to-transparent',
  },
]

export function TeacherServicesPage() {
  const [comingSoonMessage, setComingSoonMessage] = useState<string | null>(null)

  const handleServiceClick = (serviceName: string) => {
    setComingSoonMessage(`ميزة "${serviceName}" قيد التطوير وستكون متاحة قريباً`)
    setTimeout(() => setComingSoonMessage(null), 3000)
  }

  return (
    <section className="space-y-6">
      {/* Banner Ad */}
      <a
        href="https://play.google.com/store/apps/details?id=com.tasjeel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="glass-card block overflow-hidden p-0 transition-transform hover:scale-[1.01]"
      >
        <img
          src="/tasjeel-banner.png"
          alt="تطبيق تسجيل - نظامك الذكي لإدارة الفصول"
          className="h-auto w-full object-cover"
        />
      </a>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {SERVICES.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleServiceClick(service.title)}
            className="group w-full text-right transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
          >
            <span className="glass-card relative flex h-[90px] w-full flex-col justify-center overflow-hidden p-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <span
                className={`pointer-events-none absolute inset-x-3 top-0 h-1 rounded-full bg-gradient-to-l opacity-80 transition-opacity duration-200 group-hover:opacity-100 ${service.accentBar}`}
              />

              {/* Icon as background */}
              <i className={`${service.icon} ${service.iconColor} pointer-events-none absolute left-2 top-3 text-4xl opacity-10`} />

              {/* Content */}
              <span className="relative z-10 space-y-0.5">
                <h3 className="text-base font-bold text-slate-900">{service.title}</h3>
                <p className="text-xs leading-5 text-slate-600 line-clamp-1">{service.description}</p>
              </span>
            </span>
          </button>
        ))}
      </div>

      {comingSoonMessage && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-lg">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <i className="bi bi-clock-history text-sm text-amber-600" />
            </div>
            <p className="text-sm font-medium text-amber-900">{comingSoonMessage}</p>
          </div>
        </div>
      )}
    </section>
  )
}
