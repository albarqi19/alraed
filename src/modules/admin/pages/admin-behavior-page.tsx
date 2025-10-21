import { CalendarClock, CheckCircle2, NotebookPen } from 'lucide-react'

export function AdminBehaviorPage() {
  return (
    <div className="glass-card space-y-6 p-10 text-center text-slate-700">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl">
        <NotebookPen className="h-8 w-8 text-white" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">السلوك والمخالفات</h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600">
          قسم موحد لرصد المخالفات السلوكية وفقاً للائحة السلوك والمواظبة، متابعة الإجراءات العلاجية، والتنسيق مع أولياء الأمور.
        </p>
      </div>

      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white/70 p-6">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-600">
          <CalendarClock className="h-5 w-5" />
          قيد التطوير للإصدار القادم
        </div>
        <p className="mt-3 text-sm text-slate-600">
          نعمل حالياً على تطوير نظام شامل لإدارة السلوك والمخالفات. سيتضمن النظام:
        </p>
        <ul className="mt-4 space-y-2 text-right text-sm text-slate-600">
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>رصد وتوثيق المخالفات السلوكية بشكل منظم</span>
          </li>
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>تصنيف المخالفات حسب الدرجة والخطورة</span>
          </li>
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>متابعة الإجراءات العلاجية والتصحيحية</span>
          </li>
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>التنسيق المباشر مع أولياء الأمور</span>
          </li>
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>تقارير شاملة عن السلوك الطلابي</span>
          </li>
          <li className="flex items-center justify-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>جدولة اجتماعات أولياء الأمور</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
