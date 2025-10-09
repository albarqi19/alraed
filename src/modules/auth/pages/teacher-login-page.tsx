import { LoginForm } from '../components/login-form'

export function TeacherLoginPage() {
  return (
    <div className="space-y-6">
      <LoginForm
        role="teacher"
        heading="دخول المعلم"
        description="استخدم رقم الهوية وكلمة المرور للوصول إلى لوحة التحكم اليومية وتسجيل الحضور."
        submitLabel="دخول المعلم"
      />
    </div>
  )
}
