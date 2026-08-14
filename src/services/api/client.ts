import axios from 'axios'
import { sileo } from 'sileo'
import { useAuthStore } from '@/modules/auth/store/auth-store'
// الاستيراد من ملف المخزن مباشرةً لا من بوابة الوحدة: البوابة تصدّر مكوّنات
// React، وسحبها إلى طبقة الشبكة يجعل كل ملفٍ يستورد `apiClient` يجرّ معه شجرة
// واجهةٍ لا يحتاجها — وقد يعقد حلقة استيراد مع مخزن المصادقة.
import { activeArchiveYearId } from '@/modules/admin/academic-years/archive-store'
import {
  BREADCRUMB_HEADER,
  encodeBreadcrumbHeader,
  readIncidentId,
  recordNetworkFailure,
  withIncident,
} from '@/shared/diagnostics'

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

/**
 * عدد أحداث الفتات المرافقة لطلبات GET.
 *
 * الجلب هو جُلّ حركة الشبكة (عشرات الطلبات في فتح لوحةٍ واحدة)، وإرسال عشرين
 * حدثاً مع كلٍّ منها يحمّل شبكة المدرسة بلا مقابل. وذيلٌ من ستّة أحداث يكفي
 * لقصّة فشل الجلب: «ضغط زرّاً، فانتقل إلى صفحة، فانفجر أوّل طلبٍ فيها».
 * أمّا الطلبات التي تُغيّر البيانات فتأخذ السجلّ كاملاً — هناك يقع الضرر.
 */
const GET_BREADCRUMB_EVENTS = 6

/**
 * أجسامٌ ثنائيّة (رفع ملفّات) — لا نرافقها بالفتات.
 * رفع كشف طلاب قد يبلغ ميغابايتات، وإضافة كيلوبايتٍ من التشخيص إلى طلبٍ بطيءٍ
 * أصلاً على شبكة مدرسةٍ ريفيّة مقايضةٌ خاسرة.
 */
function isBinaryBody(data: unknown): boolean {
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true
  if (typeof Blob !== 'undefined' && data instanceof Blob) return true
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return true
  return false
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

  // وضع تصفّح الأرشيف: الترويسة تُحقن هنا لا في كل استدعاء، فلا تنجو شاشةٌ
  // نسيَها مطوّرها فتعرض أرقام اليوم تحت شريطٍ يقول إنها أرقام سنةٍ مضت.
  // `activeArchiveYearId` تُرجع null — وتمسح الاختيار — إن لم يكن الاختيار
  // لهذه الجلسة، فلا تتسرّب سنةُ مستخدمٍ سابق إلى مستخدمٍ جديد.
  const archiveYearId = activeArchiveYearId()
  if (archiveYearId !== null) {
    config.headers[ACADEMIC_YEAR_HEADER] = String(archiveYearId)
  }

  // فتات المسار يُرسل **مع** الطلب لا بعد فشله: الخادم يحتاجه في اللحظة التي
  // يكتب فيها سطر الاستثناء. وأيّ إرسالٍ لاحق يعني نداءً ثانياً — قد يفشل هو
  // الآخر، وقد يصل بعد أن يكون السطر كُتب ناقصاً.
  try {
    if (!isBinaryBody(config.data)) {
      const isRead = (config.method ?? 'get').toLowerCase() === 'get'
      const trail = encodeBreadcrumbHeader(isRead ? GET_BREADCRUMB_EVENTS : undefined)
      if (trail) {
        config.headers[BREADCRUMB_HEADER] = trail
      }
    }
  } catch {
    // جامع التشخيص لا يمنع طلباً بحال — بلا هذه المِصْيدة يصير عطلٌ في
    // الترميز عطلاً في كلّ نداءٍ في النظام.
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // ─── التشخيص: يسبق كلّ معالجةٍ أخرى كي يُسجَّل الفشل ولو غيّرت المعالجات
    // أدناه الرسالة أو أعادت التوجيه.
    const incidentId = readIncidentId(error.response?.headers)

    if (!axios.isCancel(error)) {
      // الفشل يُقيَّد في الحلقة فيظهر في ترويسة الطلب **التالي**. وهذا مقصود:
      // القصّة المفيدة هي «ماذا سبق هذا الطلب»، وسلسلة الإخفاقات المتتابعة
      // (توكن سقط ⇐ كلّ نداءٍ بعده يرتدّ) تُقرأ عندها كنمطٍ لا كحادثةٍ مفردة.
      recordNetworkFailure({
        method: error.config?.method ?? 'get',
        url: error.config?.url ?? '',
        // `0` تعني: لم يصل ردٌّ أصلاً — انقطاع شبكةٍ أو مهلة، لا خطأ خادم.
        status: error.response?.status ?? 0,
        ref: incidentId,
      })
    }

    // رقم البلاغ داخل الرسالة نفسها.
    //
    // لماذا هنا لا في كلّ شاشة؟ لأن ١٣٨ طفرةً في الواجهة تعرض خطأها عبر
    // `getErrorMessage(error, …)` وهي تقرأ `data.message` أوّلاً. فحقنُ الرقم
    // في هذا الموضع الواحد يجعله يظهر في كلّ شاشةٍ منها بلا تعديل سطرٍ فيها.
    //
    // ولماذا 5xx وحدها؟ لأن رسالة تحقّقٍ تقول «الاسم مطلوب» فعلٌ يملكه
    // المستخدم، وإلحاق رقم بلاغٍ بها يوهمه أن عليه الاتّصال بالدعم. رقم البلاغ
    // لعطل النظام لا لخطأ الإدخال.
    if (incidentId && (error.response?.status ?? 0) >= 500) {
      const body = error.response?.data
      const serverMessage = typeof body?.message === 'string' ? body.message : ''

      // ردّ لارافيل في الإنتاج عند 500 هو «Server Error» — نصٌّ إنجليزيّ لا
      // يفهمه مدير المدرسة. نُبقي رسالة الخادم إن كانت عربيّةً (فهي مكتوبةٌ
      // له)، ونستبدلها إن لم تكن.
      const isArabic = /[\u0600-\u06FF]/.test(serverMessage)
      const base = isArabic ? serverMessage : 'تعذّر إتمام العملية — عُطلٌ في الخادم'
      const message = withIncident(base, incidentId)

      error.message = message
      if (body && typeof body === 'object') {
        (body as { message?: string }).message = message
      }
    }

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
        // بلا `id`: واجهة `SileoOptions` لا تحمله (title · description ·
        // position · duration · icon · styles · fill · roundness · autopilot ·
        // button). ومنعُ التكرار مضبوطٌ بالمؤقّت أعلاه لا بمعرّف التنبيه.
        sileo.error({
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
