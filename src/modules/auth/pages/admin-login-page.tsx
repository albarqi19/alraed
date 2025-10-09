import { Link } from 'react-router-dom'
import { LoginForm } from '../components/login-form'

export function AdminLoginPage() {
  return (
    <div className="space-y-6">
      <LoginForm
        role="admin"
        heading="دخول الإدارة"
        description="الوصول الكامل لإدارة المعلمين والطلاب، تقارير الحضور، وربط نظام الواتساب."
        submitLabel="دخول لوحة الإدارة"
      />

      <div className="text-center">
        <p className="text-sm text-slate-600">
          هل تبحث عن لوحة المعلم؟{' '}
          <Link 
            to="/auth/teacher" 
            className="font-semibold text-teal-600 transition-colors hover:text-teal-700 hover:underline"
          >
            انتقل من هنا
          </Link>
        </p>
      </div>
    </div>
  )
}
