import axios from 'axios'

const FALLBACK_API_BASE_URL = 'https://api.brqq.site/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? FALLBACK_API_BASE_URL

/**
 * Axios instance مخصص لولي الأمر - يستخدم guardian JWT token
 */
export const guardianClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Interceptor لإضافة التوكن تلقائياً
guardianClient.interceptors.request.use((config) => {
  const token = getGuardianToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor للتعامل مع 401
guardianClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeGuardianToken()
      // لا نعيد التوجيه - الـ context يتعامل مع هذا
    }
    return Promise.reject(error)
  },
)

// ─── Token Management ───────────────────────────

const GUARDIAN_TOKEN_KEY = 'guardian_auth_token'

export function getGuardianToken(): string | null {
  return localStorage.getItem(GUARDIAN_TOKEN_KEY)
}

export function setGuardianToken(token: string): void {
  localStorage.setItem(GUARDIAN_TOKEN_KEY, token)
}

export function removeGuardianToken(): void {
  localStorage.removeItem(GUARDIAN_TOKEN_KEY)
}

export function isGuardianAuthenticated(): boolean {
  return !!getGuardianToken()
}
