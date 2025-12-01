export function SummonsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">الاستدعاءات والتوصيات</h1>
        <p className="mt-2 text-sm text-slate-600">
          استدعاءات أولياء الأمور، محاضر الاجتماعات، ومتابعة التوصيات
        </p>
      </header>

      <div className="glass-card p-8">
        <div className="text-center space-y-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-50">
            <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              الاستدعاءات والتوصيات
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              نظام شامل لإدارة استدعاءات أولياء الأمور، توثيق محاضر الاجتماعات، 
              تسجيل التوصيات ومتابعة تنفيذها بشكل منظم وفعال.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">قريباً</span>
            </div>
            <p className="text-sm text-blue-700">
              جاري العمل على تطوير هذه الميزة. ستكون متاحة قريباً.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">جدولة الاستدعاءات</h3>
              <p className="text-sm text-slate-600">تحديد مواعيد وإرسال إشعارات لأولياء الأمور</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">محاضر الاجتماعات</h3>
              <p className="text-sm text-slate-600">توثيق محاضر اللقاءات والاجتماعات</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">متابعة التوصيات</h3>
              <p className="text-sm text-slate-600">تتبع تنفيذ التوصيات والقرارات</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
