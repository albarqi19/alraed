import { getUserDashboard } from './components/route-guards'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { login as loginRequest, logout as logoutRequest, requestPasswordReset } from './api'
import type { LoginPayload } from './types'
import { useAuthStore } from './store/auth-store'
import { useToast } from '@/shared/feedback/use-toast'

export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const showToast = useToast()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: (data) => {
      setAuth(data)
      // كان الشرطُ الثلاثيّ يرمي كلَّ دورٍ ليس `teacher` ولا `admin` إلى بوّابة
      // المنصّة — حتى مديرَ المدرسة — فيرتدّ منها عبر حارسها. منطقٌ ثانٍ مكرَّرٌ
      // ومتضاربٌ مع `getUserDashboard`، وقد أُلغي لصالحها.
      navigate(getUserDashboard(data.user.role), { replace: true })
      showToast({ type: 'success', title: 'تم تسجيل الدخول بنجاح' })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'فشل تسجيل الدخول'
      showToast({ type: 'error', title: message })
    },
  })
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const queryClient = useQueryClient()
  const showToast = useToast()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/', { replace: true })
      showToast({ type: 'info', title: 'تم تسجيل الخروج' })
    },
    onError: () => {
      clearAuth()
      queryClient.clear()
      navigate('/', { replace: true })
      showToast({ type: 'info', title: 'تم تسجيل الخروج' })
    },
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: { national_id: string; phone_last_4: string }) => requestPasswordReset(payload),
  })
}
