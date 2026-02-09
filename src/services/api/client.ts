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

/**
 * بناء رابط لصورة تقرير نشاط مع التوثيق
 * @param activityId معرف النشاط
 * @param reportId معرف التقرير
 * @param imageIndex رقم الصورة (0-based)
 * @param isTeacher هل هو معلم
 * @returns الرابط الكامل مع التوكن
 */
export function getActivityReportImageUrl(
  activityId: number,
  reportId: number | null,
  imageIndex: number,
  isTeacher: boolean = false
): string {
  const token = window.localStorage.getItem('auth_token')
  let url: string
  
  if (isTeacher) {
    // للمعلم - لا يحتاج reportId لأنه يجلب تقريره الخاص
    url = `${API_BASE_URL}/teacher/activities/${activityId}/report/images/${imageIndex}`
  } else {
    // للإدارة
    url = `${API_BASE_URL}/admin/activities/${activityId}/reports/${reportId}/images/${imageIndex}`
  }
  
  return token ? `${url}?token=${token}` : url
}

/**
 * بناء رابط لملف PDF النشاط مع التوثيق
 * @param activityId معرف النشاط
 * @param isTeacher هل هو معلم
 * @returns الرابط الكامل مع التوكن
 */
export function getActivityPdfUrl(activityId: number, isTeacher: boolean = false): string {
  const token = window.localStorage.getItem('auth_token')
  const prefix = isTeacher ? 'teacher' : 'admin'
  const url = `${API_BASE_URL}/${prefix}/activities/${activityId}/pdf`
  return token ? `${url}?token=${token}` : url
}

/**
 * بناء رابط لصفحة طباعة التقرير المعتمد
 * @param activityId معرف النشاط
 * @param reportId معرف التقرير (للإدارة فقط)
 * @param isTeacher هل هو معلم
 * @returns الرابط الكامل مع التوكن
 */
export function getActivityReportPrintUrl(
  activityId: number,
  reportId: number | null,
  isTeacher: boolean = false
): string {
  const token = window.localStorage.getItem('auth_token')
  let url: string
  
  if (isTeacher) {
    url = `${API_BASE_URL}/teacher/activities/${activityId}/report/print`
  } else {
    url = `${API_BASE_URL}/admin/activities/${activityId}/reports/${reportId}/print`
  }
  
  return token ? `${url}?token=${token}` : url
}

// debounce للتوجيه لصفحة الاشتراك عند 402 (10 ثواني)
let _lastSubscriptionRedirect = 0
const _SUBSCRIPTION_REDIRECT_DEBOUNCE = 10_000

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
      error.message = message

      const isOnSubscriptionPage = window.location.pathname.includes('/admin/subscription')

      // إذا المستخدم بالفعل في صفحة الاشتراك، لا نزعجه
      if (!isOnSubscriptionPage) {
        const now = Date.now()
        if (now - _lastSubscriptionRedirect > _SUBSCRIPTION_REDIRECT_DEBOUNCE) {
          _lastSubscriptionRedirect = now
          window.location.href = '/admin/subscription'
        }
      }
    }
    
    return Promise.reject(error)
  },
)
