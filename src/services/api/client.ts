import axios from 'axios'
import { useAuthStore } from '@/modules/auth/store/auth-store'

// Updated to use Cloudflare Tunnel instead of ngrok
const FALLBACK_API_BASE_URL = 'https://api.brqq.site/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? FALLBACK_API_BASE_URL

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
    if (error.response?.status === 401) {
      window.localStorage.removeItem('auth_token')
      const { clearAuth } = useAuthStore.getState()
      clearAuth()
    }
    return Promise.reject(error)
  },
)
