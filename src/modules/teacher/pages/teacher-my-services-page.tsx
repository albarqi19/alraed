import { useNavigate } from 'react-router-dom'

type ServiceCard = {
  id: string
  title: string
  description: string
  icon: string
  iconColor: string
  iconBg: string
  accentBar: string
  to: string
}

const MY_SERVICES: ServiceCard[] = [
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
]

export function TeacherMyServicesPage() {
  const navigate = useNavigate()

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <i className="bi bi-arrow-right text-lg" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">خدماتي</h1>
          <p className="text-sm text-slate-500">إدارة خدماتك الشخصية</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {MY_SERVICES.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => navigate(service.to)}
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

      {/* Empty state if no services */}
      {MY_SERVICES.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100">
            <i className="bi bi-inbox text-2xl text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">لا توجد خدمات متاحة</h3>
          <p className="mt-1 text-sm text-slate-500">ستظهر هنا الخدمات المتاحة لك</p>
        </div>
      )}
    </section>
  )
}
