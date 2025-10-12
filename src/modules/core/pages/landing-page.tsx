import { Link } from 'react-router-dom'

const features = [
  {
    title: 'دخول المعلم',
    description: 'إدارة الحصص اليومية، تسجيل الحضور، وتتبع أداء الطلاب بسهولة.',
    to: '/auth/teacher',
    actionLabel: 'دخول المعلم',
    icon: '',
  },
  {
    title: 'دخول الإدارة',
    description: 'إحصائيات فورية، إدارة البيانات، ومتابعة شاملة لجميع الأنشطة المدرسية.',
    to: '/auth/admin',
    actionLabel: 'دخول الإدارة',
    icon: '',
  },
]

const systemFeatures = [
  {
    title: 'إدارة الحضور والغياب',
    description: 'تسجيل ومتابعة حضور الطلاب والاستئذان بشكل يومي مع تقارير تفصيلية.',
    icon: '📊',
  },
  {
    title: 'برنامج نقاطي',
    description: 'نظام متكامل لتعزيز السلوك الإيجابي ومتابعة المخالفات بمكافآت ونقاط تحفيزية.',
    icon: '⭐',
  },
  {
    title: 'التوجيه الطلابي',
    description: 'متابعة الحالات الطلابية والتدخلات التوجيهية والإرشادية.',
    icon: '🎯',
  },
  {
    title: 'السلوك والمواظبة',
    description: 'تسجيل ملاحظات السلوك ومتابعة مستوى المواظبة للطلاب.',
    icon: '🏆',
  },
  {
    title: 'التواصل عبر الواتساب',
    description: 'إرسال إشعارات تلقائية لأولياء الأمور عبر واتساب.',
    icon: '💬',
  },
  {
    title: 'النماذج والتقارير',
    description: 'إنشاء وطباعة جميع النماذج والتقارير المدرسية المطلوبة.',
    icon: '📄',
  },
  {
    title: 'لوحات المعلومات',
    description: 'لوحات تحكم تفاعلية مع إحصائيات فورية ورسوم بيانية.',
    icon: '📈',
  },
  {
    title: 'الجرس المدرسي',
    description: 'جدولة وتشغيل الجرس المدرسي بشكل آلي وفقاً للحصص الدراسية.',
    icon: '🔔',
  },
  {
    title: 'النداء الذكي',
    description: 'نظام نداء آلي لأولياء الأمور عند استلام الطلاب مع عرض بصري وصوتي.',
    icon: '📢',
  },
]

const highlights = [
  'واجهة حديثة وسهلة الاستخدام',
  'نظام آمن ومتكامل لإدارة البيانات',
  'تقارير شاملة وقابلة للتصدير',
  'دعم كامل للأجهزة المحمولة',
]

export function LandingPage() {
  return (
    <section className="space-y-12">
      <div className="glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-600/15 via-transparent to-amber-400/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="badge-soft">نظام متكامل</span>
            <h1 className="text-4xl font-bold text-slate-900 lg:text-5xl" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              الرَّائِد
            </h1>
            <p className="text-lg font-normal text-muted">
              منصة لإدارة جوانب العملية التعليمية والإدارية، من الحضور والغياب إلى التوجيه الطلابي والتواصل مع أولياء الأمور.
            </p>
            <div className="flex flex-wrap gap-3">
              {/* <Link to="/register" className="button-primary">
                <i className="bi bi-rocket-takeoff" /> ابدأ التسجيل
              </Link>
              <Link to="/plans" className="button-secondary">
                <i className="bi bi-grid" /> استعراض الباقات
              </Link> */}
              <Link to="/auth/teacher" className="button-secondary">
                <i className="bi bi-person-fill" /> دخول المعلم
              </Link>
              <Link to="/auth/admin" className="button-secondary">
                <i className="bi bi-gear-fill" /> دخول الإدارة
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl bg-white/70 p-6 shadow-lg">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15 text-teal-700">
                  ✓
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {features.map((feature) => (
          <article key={feature.title} className="glass-card h-full transition hover:shadow-xl">
            <div className="flex flex-col gap-4">
              <div className="text-5xl">{feature.icon}</div>
              <h2 className="text-2xl font-semibold text-slate-900">{feature.title}</h2>
              <p className="text-sm text-muted">{feature.description}</p>
              <Link to={feature.to} className="button-secondary self-start">
                {feature.actionLabel} <i className="bi bi-arrow-left mr-2" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-slate-900">مميزات النظام</h2>
          <p className="text-muted">حل شامل ومتكامل لجميع احتياجات إدارة المدرسة</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {systemFeatures.map((feature) => (
            <article 
              key={feature.title} 
              className="glass-card h-full transition hover:shadow-lg hover:scale-105"
            >
              <div className="flex flex-col gap-3 text-center">
                <div className="text-5xl mx-auto">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="glass-card bg-gradient-to-br from-teal-50 to-amber-50 text-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">جاهز للبدء؟</h2>
          <p className="text-muted max-w-2xl mx-auto">
            ابدأ باستخدام النظام الآن واستمتع بتجربة إدارة مدرسية متكاملة وسهلة
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auth/teacher" className="button-primary">
              <i className="bi bi-person-fill" /> دخول المعلم
            </Link>
            <Link to="/auth/admin" className="button-secondary">
              <i className="bi bi-gear-fill" /> دخول الإدارة
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
