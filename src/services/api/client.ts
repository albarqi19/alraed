import axios from 'axios'
import { sileo } from 'sileo'
import { useAuthStore } from '@/modules/auth/store/auth-store'
// الاستيراد من ملف المخزن مباشرةً لا من بوابة الوحدة: البوابة تصدّر مكوّنات
// React، وسحبها إلى طبقة الشبكة يجعل كل ملفٍ يستورد `apiClient` يجرّ معه شجرة
// واجهةٍ لا يحتاجها — وقد يعقد حلقة استيراد مع مخزن المصادقة.
import { activeArchiveYearId } from '@/modules/admin/academic-years/archive-store'

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

/**
 * الترويسة التي تطلب بها الواجهة سنةً غير الجارية
 * (`App\Http\Middleware\ResolveAcademicYear::HEADER`).
 */
const ACADEMIC_YEAR_HEADER = 'X-Academic-Year'

/** رسالة قفل الكتابة — واحدة في كل النظام كي يتعلّمها المستخدم مرة */
const ARCHIVE_READ_ONLY_MESSAGE = 'لا يمكن التعديل أثناء تصفّح الأرشيف — عُد إلى السنة الجارية أولاً'

// كبحُ تكرار تنبيه القفل: شاشةٌ واحدة قد تُطلق حفظاً متوازياً لعدة طلبات،
// فيرتدّ 423 عن كلٍّ منها — والمستخدم يستحق تفسيراً واحداً لا أربعة.
let _lastArchiveLockToast = 0
const _ARCHIVE_LOCK_TOAST_DEBOUNCE = 4_000

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

  // وضع تصفّح الأرشيف: الترويسة تُحقن هنا لا في كل استدعاء، فلا تنجو شاشةٌ
  // نسيَها مطوّرها فتعرض أرقام اليوم تحت شريطٍ يقول إنها أرقام سنةٍ مضت.
  // `activeArchiveYearId` تُرجع null — وتمسح الاختيار — إن لم يكن الاختيار
  // لهذه الجلسة، فلا تتسرّب سنةُ مستخدمٍ سابق إلى مستخدمٍ جديد.
  const archiveYearId = activeArchiveYearId()
  if (archiveYearId !== null) {
    config.headers[ACADEMIC_YEAR_HEADER] = String(archiveYearId)
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
    
    // معالجة خطأ 423 - كتابة مرفوضة لأننا في وضع تصفّح الأرشيف
    //
    // الرسالة تُكتب فوق جسم الاستجابة أيضاً لا فوق `error.message` وحده:
    // معظم الشاشات تعرض `getErrorMessage(error, 'فشل الحفظ')` وهي تقرأ
    // `data.message` أوّلاً. ورسالة الوسيط هناك تصف الحالة («أنت تتصفّح
    // أرشيف… — القراءة فقط») ولا تقول للمستخدم ما يفعله. التوحيد هنا يضمن أن
    // كل زرٍّ في النظام يعطي التعليمة نفسها: عُد إلى السنة الجارية.
    if (error.response?.status === 423) {
      error.message = ARCHIVE_READ_ONLY_MESSAGE

      if (error.response.data && typeof error.response.data === 'object') {
        (error.response.data as { message?: string }).message = ARCHIVE_READ_ONLY_MESSAGE
      }

      const now = Date.now()
      if (now - _lastArchiveLockToast > _ARCHIVE_LOCK_TOAST_DEBOUNCE) {
        _lastArchiveLockToast = now
        // الاستدعاء مباشرٌ لا عبر `useToast`: المعترض يعمل خارج شجرة React
        // فلا خطّافات فيه. والوجهة واحدة — `sileo` هي ما يغلّفه الخطّاف.
        sileo.error({
          id: 'archive-read-only',
          title: ARCHIVE_READ_ONLY_MESSAGE,
          duration: 6000,
        })
      }
    }

    // معالجة خطأ 402 - انتهاء الاشتراك
    if (error.response?.status === 402) {
      const currentPath = window.location.pathname
      const isAdminPath = currentPath.startsWith('/admin')

      if (isAdminPath) {
        // مسار الإدارة: يوجه لصفحة الاشتراك لتجديده
        error.message = error.response?.data?.message || 'انتهى اشتراكك في النظام'
        const isOnSubscriptionPage = currentPath.includes('/admin/subscription')
        if (!isOnSubscriptionPage) {
          const now = Date.now()
          if (now - _lastSubscriptionRedirect > _SUBSCRIPTION_REDIRECT_DEBOUNCE) {
            _lastSubscriptionRedirect = now
            window.location.href = '/admin/subscription'
          }
        }
      } else {
        // مسار المعلمين وغيرهم: صفحة توقف الحساب
        error.message = 'حسابك متوقف حالياً. يرجى التواصل مع إدارة المدرسة.'
        const isOnSuspendedPage = currentPath.includes('/account-suspended')
        if (!isOnSuspendedPage) {
          const now = Date.now()
          if (now - _lastSubscriptionRedirect > _SUBSCRIPTION_REDIRECT_DEBOUNCE) {
            _lastSubscriptionRedirect = now
            window.location.href = '/account-suspended'
          }
        }
      }
    }
    
    return Promise.reject(error)
  },
)
