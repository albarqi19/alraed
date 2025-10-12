export function AdminAcademicCalendarPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2 text-right">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">أدوات المدرسة</p>
        <h1 className="text-3xl font-bold text-slate-900">التقويم الدراسي</h1>
        <p className="text-sm text-muted">
          سيتم توفير لوحة لإدارة التقويم الدراسي، إضافة الفصول الدراسية، وتحديد الإجازات والفعاليات المدرسية.
        </p>
      </header>

      <div className="glass-card space-y-4 text-right">
        <h2 className="text-xl font-semibold text-slate-800">قريبًا</h2>
        <p className="text-sm text-muted">
          نطور حاليًا عرضًا بصريًا للتقويم مع إمكانيات مشاركة التحديثات مع المعلمين والطلاب. ستحصل المدرسة على
          تنبيهات بالمواعيد المهمة فور الإطلاق.
        </p>
      </div>
    </section>
  )
}
