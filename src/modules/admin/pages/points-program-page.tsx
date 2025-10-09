export function PointsProgramPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">برنامج نقاطي</h1>
        <p className="mt-2 text-sm text-slate-600">
          نظام النقاط السلوكية للتعزيز الإيجابي ومتابعة السلوك الطلابي
        </p>
      </header>

      <div className="glass-card">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
              <i className="bi bi-award text-4xl text-teal-600"></i>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">قريبًا</h2>
            <p className="text-sm text-slate-600">جاري العمل على هذه الميزة</p>
          </div>
        </div>
      </div>
    </div>
  )
}
