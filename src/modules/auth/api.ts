import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type { AuthenticatedUser, LoginPayload, LoginResponse } from './types'

function normalizeLoginResponse(raw: unknown): LoginResponse {
  const candidate = raw as Partial<ApiResponse<Partial<LoginResponse>>> & Partial<LoginResponse> & {
    access_token?: string
    data?: Partial<LoginResponse & { access_token?: string }> & {
      user?: AuthenticatedUser
      access_token?: string
    }
    user?: AuthenticatedUser
    message?: string
  }

  if (candidate.success === false) {
    throw new Error(candidate.message ?? 'فشل تسجيل الدخول')
  }

  const payload = candidate.data ?? candidate

  const token = payload?.token ?? payload?.access_token ?? candidate.access_token ?? candidate.token
  const tokenType = payload?.token_type ?? candidate.token_type ?? 'Bearer'
  const user = payload?.user ?? candidate.user ?? candidate.data?.user

  if (!token || !user) {
    throw new Error('استجابة غير صالحة من الخادم عند تسجيل الدخول')
  }

  return {
    token,
    token_type: tokenType,
    user,
  }
}

export async function login(payload: LoginPayload) {
  try {
    const { data } = await apiClient.post('/auth/login', payload)
    return normalizeLoginResponse(data)
  } catch (error: any) {
    // استخراج رسالة الخطأ من response
    const message = error.response?.data?.message || error.message || 'رقم الهوية أو كلمة المرور غير صحيحة'
    throw new Error(message)
  }
}

export async function logout() {
  try {
    await apiClient.post<ApiResponse<unknown>>('/auth/logout', {})
  } catch {
    // في حال انتهاء الجلسة بالفعل نتجاهل الخطأ
  }
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get<ApiResponse<{ user: AuthenticatedUser }>>('/auth/me')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل بيانات المستخدم')
  }
  return data.data.user
}

export async function requestPasswordReset(payload: { national_id: string; phone_last_4: string }) {
  const { data } = await apiClient.post<ApiResponse<{ phone_masked: string }>>('/auth/forgot-password', payload)
  if (!data.success) {
    throw new Error(data.message ?? 'فشل إرسال طلب استرجاع كلمة المرور')
  }
  return {
    message: data.message ?? 'تم إرسال كلمة المرور عبر الواتساب',
    phone_masked: data.data.phone_masked,
  }
}
