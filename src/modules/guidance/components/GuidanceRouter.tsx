import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useGuidanceAccessStore } from '../store/guidance-access-store'

export function GuidanceRouter() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, isTokenValid } = useGuidanceAccessStore()

  useEffect(() => {
    // إذا لم يكن هناك توكن صالح ولم نكن في صفحة الوصول، انتقل لصفحة الوصول
    if ((!token || !isTokenValid()) && !location.pathname.includes('/student-cases/access')) {
      navigate('/admin/student-cases/access', { replace: true })
    }
  }, [token, isTokenValid, location.pathname, navigate])

  return <Outlet />
}
