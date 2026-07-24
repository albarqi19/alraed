import { LoginForm } from '../components/login-form'

export function SuperAdminLoginPage() {
  return (
    <div className="space-y-6">
      <LoginForm
        role="super_admin"
        heading="دخول المنصة العامة"
        description="الوصول إلى لوحة التحكم الشاملة لمتابعة المدارس والإيرادات وإدارة الباقات على مستوى المنصة."
        submitLabel="دخول لوحة المنصة"
      />
      <div
        className="mx-auto max-w-md rounded-2xl p-5 text-sm"
        style={{ background: '#FCF3E1', border: '1px solid #EFD9AC', color: '#A8690A' }}
      >
        <p className="font-semibold">ملاحظة مهمة</p>
        <p className="mt-2 leading-relaxed">
          بيانات تسجيل الدخول خاصة بالمدير العام للنظام، وتمنح صلاحيات كاملة على مستوى المنصة. برجاء الحفاظ عليها وعدم مشاركتها.
        </p>
      </div>
    </div>
  )
}
