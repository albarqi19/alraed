import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="glass-card text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-2xl font-bold text-rose-600">
        404
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">الصفحة غير موجودة</h2>
      <p className="mt-2 text-sm text-muted">
        الصفحة التي تحاول الوصول إليها غير متوفرة. تأكد من الرابط أو عد إلى الرئيسية.
      </p>
      <div className="mt-6 flex justify-center">
        <Link to="/" className="button-primary">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
