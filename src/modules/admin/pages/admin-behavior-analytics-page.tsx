import { Activity, BarChart2 } from 'lucide-react'

export function AdminBehaviorAnalyticsPage() {
  return (
    <div className="glass-card space-y-6 p-10 text-center text-slate-700">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <Activity className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">مؤشرات السلوك</h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600">
          تقارير تفاعلية لرصد الاتجاهات، مقارنة الفصول، وقياس أثر البرامج الوقائية قادمة قريباً إلى لوحة التحكم.
        </p>
      </div>
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white/70 p-6">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-rose-600">
          <BarChart2 className="h-5 w-5" />
          يتم العمل عليها حالياً
        </div>
        <p className="mt-3 text-sm text-slate-600">
          سيعرض هذا القسم مصفوفات المخالفات، معدلات الإغلاق، ونسب التكرار مع إمكانية التصدير الذكي وتفعيل التنبيهات الاستباقية.
        </p>
      </div>
    </div>
  )
}
