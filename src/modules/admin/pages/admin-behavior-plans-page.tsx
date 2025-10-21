import { NotebookPen, CalendarCheck2 } from 'lucide-react'

export function AdminBehaviorPlansPage() {
  return (
    <div className="glass-card space-y-6 p-10 text-center text-slate-700">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <NotebookPen className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">خطط المعالجة السلوكية</h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600">
          نعمل حالياً على بناء تجربة متكاملة لتصميم الخطط العلاجية، تتبع التنفيذ، وتوثيق نتائج جلسات الإرشاد بشكل مرن وسهل الاستخدام.
        </p>
      </div>
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/70 p-6">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600">
          <CalendarCheck2 className="h-5 w-5" />
          قيد التطوير للإصدار القادم
        </div>
        <p className="mt-3 text-sm text-slate-600">
          ستتمكن قريباً من إعداد خطط مخصصة، تحديد مسؤوليات التنفيذ، وربطها مباشرة بالسجل السلوكي للطالب.
        </p>
      </div>
    </div>
  )
}
