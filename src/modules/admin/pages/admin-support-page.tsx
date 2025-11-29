export function AdminSupportPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-teal-50">
          <i className="bi bi-headset text-5xl text-teal-600"></i>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">الدعم الفني</h1>
          <p className="text-lg text-slate-600">
            نحن هنا لمساعدتك! تواصل معنا عبر القنوات التالية:
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <i className="bi bi-whatsapp text-2xl text-green-600"></i>
            </div>
            <div className="text-right flex-1">
              <h3 className="font-semibold text-slate-900">واتساب</h3>
              <a href="https://wa.me/966573767989" target="_blank" rel="noopener noreferrer" 
                 className="text-teal-600 hover:underline">
                +966 57 376 7989
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <i className="bi bi-envelope text-2xl text-blue-600"></i>
            </div>
            <div className="text-right flex-1">
              <h3 className="font-semibold text-slate-900">البريد الإلكتروني</h3>
              <p className="text-slate-500">قريباً</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
              <i className="bi bi-clock text-2xl text-purple-600"></i>
            </div>
            <div className="text-right flex-1">
              <h3 className="font-semibold text-slate-900">ساعات العمل</h3>
              <p className="text-slate-600">السبت - الخميس: 8 صباحاً - 5 مساءً</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
