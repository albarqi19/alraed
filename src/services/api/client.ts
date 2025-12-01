import axios from 'axios'
import { useAuthStore } from '@/modules/auth/store/auth-store'

// Updated to use Cloudflare Tunnel instead of ngrok
const FALLBACK_API_BASE_URL = 'https://api.brqq.site/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? FALLBACK_API_BASE_URL

// استخراج الـ base URL بدون /api للوصول للـ storage
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

/**
 * بناء رابط كامل لملف في الـ storage
 * @param relativePath المسار النسبي مثل /storage/activities/reports/8/image.jpg
 * @returns الرابط الكامل
 */
export function getStorageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  // إذا كان المسار يبدأ بـ http فهو رابط كامل بالفعل
  if (relativePath.startsWith('http')) return relativePath
  // إزالة الـ / في البداية إذا وُجد لتجنب التكرار
  const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath
  return `${API_ORIGIN}${cleanPath}`
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const { token: cachedToken } = useAuthStore.getState()
  const token = cachedToken ?? window.localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // معالجة خطأ 401 - غير مصرح
    if (error.response?.status === 401) {
      window.localStorage.removeItem('auth_token')
      const { clearAuth } = useAuthStore.getState()
      clearAuth()
    }
    
    // معالجة خطأ 402 - انتهاء الاشتراك
    if (error.response?.status === 402) {
      const message = error.response?.data?.message || 'انتهى اشتراكك في النظام'
      
      // إظهار رسالة واضحة للمستخدم
      if (window.confirm(`⚠️ ${message}\n\nهل تريد الانتقال إلى صفحة الاشتراكات لتجديد اشتراكك؟`)) {
        window.location.href = '/admin/subscription'
      }
      
      // تعديل رسالة الخطأ لتكون واضحة
      error.message = message
    }
    
    return Promise.reject(error)
  },
)
