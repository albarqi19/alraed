import type { OnboardingStepKey } from './types'

export const ONBOARDING_STEPS: OnboardingStepKey[] = [
  'welcome',
  'students',
  'whatsapp',
  'schedule',
  'teachers',
  'extension',
  'import_schedule',
  'complete',
]

export const STEP_INFO: Record<
  OnboardingStepKey,
  {
    title: string
    description: string
    icon: string
    shortTitle: string
  }
> = {
  welcome: {
    title: 'مرحباً بك في الرائد',
    description: 'شاشة ترحيبية وتعريف بخطوات الإعداد',
    icon: 'bi-hand-wave',
    shortTitle: 'الترحيب',
  },
  students: {
    title: 'إضافة الطلاب',
    description: 'استيراد بيانات الطلاب من نظام نور',
    icon: 'bi-people',
    shortTitle: 'الطلاب',
  },
  whatsapp: {
    title: 'ربط الواتساب',
    description: 'ربط رقم واتساب لإرسال الإشعارات',
    icon: 'bi-whatsapp',
    shortTitle: 'الواتساب',
  },
  schedule: {
    title: 'إعدادات الدوام',
    description: 'تحديد أوقات الدوام والخطط الزمنية',
    icon: 'bi-clock',
    shortTitle: 'الدوام',
  },
  teachers: {
    title: 'إضافة المعلمين',
    description: 'إضافة المعلمين إلى النظام',
    icon: 'bi-person-badge',
    shortTitle: 'المعلمين',
  },
  extension: {
    title: 'تحميل إضافة الرائد',
    description: 'تحميل إضافة كروم للاستيراد التلقائي',
    icon: 'bi-puzzle',
    shortTitle: 'الإضافة',
  },
  import_schedule: {
    title: 'استيراد الجدول',
    description: 'استيراد الجدول من منصة مدرستي',
    icon: 'bi-table',
    shortTitle: 'الجدول',
  },
  complete: {
    title: 'تم الإعداد بنجاح',
    description: 'مبروك! تم إعداد المدرسة بنجاح',
    icon: 'bi-check-circle',
    shortTitle: 'الإنهاء',
  },
}

export const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/الرَّائِد-مساعد-استيراد-ا/kglcgomelgkhgaefhjmakcfalfdficll'
