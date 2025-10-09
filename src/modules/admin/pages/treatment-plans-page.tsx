import { Link } from 'react-router-dom'

export function TreatmentPlansPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">الخطط العلاجية</h1>
        <p className="mt-2 text-sm text-slate-600">
          إعداد ومتابعة الخطط العلاجية والتدخلات الإرشادية للطلاب
        </p>
      </header>

      <div className="glass-card p-8">
        <div className="text-center space-y-6">
          {/* Warning Alert */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-center gap-2 text-amber-900 mb-2">
              <i className="bi bi-exclamation-triangle-fill text-2xl"></i>
              <h3 className="font-bold text-lg">تنبيه هام</h3>
            </div>
            <p className="text-amber-800 text-sm font-medium">
              هذا النظام مخصص للمرشد الطلابي فقط
            </p>
            <p className="text-amber-700 text-xs mt-1">
              الوصول محمي بنظام المصادقة الثنائية (OTP) للحفاظ على خصوصية وسرية بيانات الطلاب
            </p>
          </div>

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-teal-50">
            <i className="bi bi-clipboard2-pulse text-5xl text-teal-600"></i>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              الخطط العلاجية في التوجيه الطلابي
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              تتضمن الخطط العلاجية تحديد مشكلات الطالب، وضع أهداف قابلة للقياس، تصميم تدخلات مناسبة، 
              ومتابعة التقدم وتعديل الخطة حسب الحاجة.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 max-w-xl mx-auto">
            <p className="text-sm text-indigo-900 mb-4">
              <i className="bi bi-info-circle-fill mr-2"></i>
              للوصول إلى الخطط العلاجية، استخدم نظام التوجيه الطلابي الآمن
            </p>
            <Link
              to="/guidance"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <i className="bi bi-shield-lock"></i>
              الدخول إلى نظام التوجيه الطلابي
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <i className="bi bi-clipboard-check text-xl text-purple-600"></i>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">التقييم والتشخيص</h3>
              <p className="text-sm text-slate-600">تحديد المشكلة وأسبابها</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <i className="bi bi-bullseye text-xl text-blue-600"></i>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">تحديد الأهداف</h3>
              <p className="text-sm text-slate-600">وضع أهداف واضحة وقابلة للقياس</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <i className="bi bi-graph-up-arrow text-xl text-green-600"></i>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">المتابعة والتقييم</h3>
              <p className="text-sm text-slate-600">متابعة التقدم وتعديل الخطة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

