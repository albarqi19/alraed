import { Link } from 'react-router-dom'
import { LoginForm } from '../components/login-form'

export function AdminLoginPage() {
  return (
    <div className="flex flex-col justify-center space-y-6 lg:min-h-[calc(100vh-250px)]">
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
            className="font-semibold transition-colors hover:underline"
            style={{ color: '#2E7D46' }}
          >
            انتقل من هنا
          </Link>
        </p>
      </div>
    </div>
  )
}
