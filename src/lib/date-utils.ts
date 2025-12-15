/**
 * Timezone Utilities
 * 
 * هذا الملف يحل مشكلة التأخير 3 ساعات بين الفرونت والباك اند
 * 
 * المشكلة:
 * - JavaScript يتعامل مع التواريخ كـ UTC افتراضياً
 * - new Date().toISOString() يعطي UTC وليس Asia/Riyadh
 * - Laravel whereDate() يقارن التاريخ المحلي بدون timezone awareness
 * 
 * الحل:
 * - استخدام هذه الدوال دائماً عند التعامل مع التواريخ
 * - كل الدوال تأخذ بعين الاعتبار توقيت الرياض (UTC+3)
 */

const RIYADH_TIMEZONE = 'Asia/Riyadh'
const RIYADH_OFFSET_HOURS = 3

/**
 * الحصول على التاريخ الحالي بتوقيت الرياض بصيغة YYYY-MM-DD
 * 
 * ✅ استخدم هذه بدلاً من: new Date().toISOString().split('T')[0]
 */
export function getTodayRiyadh(): string {
  const now = new Date()
  // تحويل UTC إلى Riyadh باضافة 3 ساعات
  const riyadhTime = new Date(now.getTime() + RIYADH_OFFSET_HOURS * 60 * 60 * 1000)
  return riyadhTime.toISOString().split('T')[0]
}

/**
 * تحويل تاريخ من قاعدة البيانات إلى صيغة YYYY-MM-DD بتوقيت الرياض
 * 
 * ✅ استخدم هذه بدلاً من: new Date(dateString).toISOString().split('T')[0]
 * 
 * @param dateString - التاريخ من API (مثل: "2025-12-15T08:00:00.000000Z" أو "2025-12-15")
 */
export function formatDateRiyadh(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null
  
  // تحويل إلى Riyadh timezone
  const riyadhTime = new Date(date.getTime() + RIYADH_OFFSET_HOURS * 60 * 60 * 1000)
  return riyadhTime.toISOString().split('T')[0]
}

/**
 * تحويل تاريخ YYYY-MM-DD محلي (من input) إلى ISO string لإرساله للـ API
 * 
 * ✅ استخدم هذه عند إرسال تاريخ للباك اند
 * 
 * @param localDateString - التاريخ المحلي بصيغة YYYY-MM-DD
 */
export function localDateToISO(localDateString: string): string {
  // إنشاء تاريخ بتوقيت الرياض (00:00:00)
  const date = new Date(localDateString + 'T00:00:00+03:00')
  return date.toISOString()
}

/**
 * فحص إذا كان التاريخ المعطى هو اليوم (بتوقيت الرياض)
 * 
 * @param dateString - التاريخ للفحص
 */
export function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  const formatted = formatDateRiyadh(dateString)
  const today = getTodayRiyadh()
  return formatted === today
}

/**
 * الحصول على الوقت الحالي بتوقيت الرياض
 * 
 * @returns Date object بتوقيت الرياض
 */
export function getNowRiyadh(): Date {
  const now = new Date()
  return new Date(now.getTime() + RIYADH_OFFSET_HOURS * 60 * 60 * 1000)
}

/**
 * تحويل timestamp إلى تاريخ ووقت قابل للقراءة بتوقيت الرياض
 * 
 * @param timestamp - timestamp بالميلي ثانية
 */
export function formatDateTimeRiyadh(timestamp: number | Date | string): string {
  const date = typeof timestamp === 'number' || typeof timestamp === 'string' 
    ? new Date(timestamp) 
    : timestamp
    
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: RIYADH_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * مقارنة تاريخين (بدون وقت) بتوقيت الرياض
 * 
 * @returns 0 إذا كانا متساويين, -1 إذا date1 أقدم, 1 إذا date1 أحدث
 */
export function compareDates(date1: string, date2: string): number {
  const d1 = formatDateRiyadh(date1)
  const d2 = formatDateRiyadh(date2)
  
  if (!d1 || !d2) return 0
  
  if (d1 < d2) return -1
  if (d1 > d2) return 1
  return 0
}
