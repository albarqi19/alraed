import { LoginForm } from '../components/login-form'

export function TeacherLoginPage() {
  return (
    <div className="flex flex-col justify-center space-y-6 lg:min-h-[calc(100vh-250px)]">
      <LoginForm
        role="teacher"
        heading="دخول المعلم"
        description="استخدم رقم الهوية وكلمة المرور للوصول إلى لوحة التحكم اليومية وتسجيل الحضور."
        submitLabel="دخول المعلم"
      />
    </div>
  )
}
