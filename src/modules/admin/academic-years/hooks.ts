import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { fetchAcademicYears, fetchCurrentAcademicYear } from './api'
import { isArchiveSelectionOwned, useArchiveYearStore } from './archive-store'
import type { AcademicYearOption } from './types'

const keys = {
  all: ['admin', 'academic-years'] as const,
  list: () => [...keys.all, 'list'] as const,
  current: () => [...keys.all, 'current'] as const,
}

/**
 * سنوات المدرسة. تُطلب مرةً وتبقى طازجةً ساعةً كاملة: السنوات لا تُنشأ إلا
 * مرةً في العام، وطلبها مع كل تنقّل ضجيجٌ خالص.
 */
export function useAcademicYearsQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: keys.list(),
    queryFn: fetchAcademicYears,
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
    // فشلُ جلب السنوات لا يستحق إزعاجاً: غيابها يعني منتقياً لا يظهر، والنظام
    // يعمل على السنة الجارية كما كان قبل هذه الميزة كلها.
    retry: 1,
  })
}

/** ما يراه الخادم — يُستعمل للتحقّق من أن ترويستنا قُبلت فعلاً */
export function useServerAcademicYearQuery(enabled = true) {
  return useQuery({
    queryKey: keys.current(),
    queryFn: fetchCurrentAcademicYear,
    enabled,
    staleTime: 60 * 1000,
  })
}

export interface ArchiveModeHandle {
  /** هل نتصفّح سنةً غير الجارية الآن؟ */
  isArchiveMode: boolean
  yearId: number | null
  yearLabel: string | null
  enterArchive: (year: AcademicYearOption) => void
  exitArchive: () => void
}

/**
 * الحالة الوحيدة التي تقرؤها كل مكوّنات الأرشيف.
 *
 * الدخول والخروج يمسحان ذاكرة الاستعلامات كلها عمداً. البديل — إبقاؤها —
 * يعني أن المستخدم يدخل الأرشيف فيرى للحظاتٍ أرقام السنة الجارية معلّمةً
 * بشريطٍ أحمر يقول إنها أرقام ١٤٤٧، وهي اللحظة التي يلتقط فيها المدير صورة
 * الشاشة. المسح يجعل كل شاشةٍ تُعيد الطلب بالترويسة الصحيحة قبل أن تعرض رقماً.
 */
export function useArchiveMode(): ArchiveModeHandle {
  const queryClient = useQueryClient()
  const yearId = useArchiveYearStore((state) => state.yearId)
  const yearLabel = useArchiveYearStore((state) => state.yearLabel)
  // حقول الملكية مقروءةٌ تفاعلياً لا بـ`getState()`: قراءةٌ لحظية منها تجعل
  // الحكم صحيحاً عند أول رسمٍ وقديماً بعده، وهو أسوأ من خطأ ثابت لأنه متقطّع.
  const ownerUserId = useArchiveYearStore((state) => state.ownerUserId)
  const ownerSession = useArchiveYearStore((state) => state.ownerSession)
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const token = useAuthStore((state) => state.token ?? null)

  const owned = isArchiveSelectionOwned({ yearId, ownerUserId, ownerSession }, userId, token)
  const isArchiveMode = yearId !== null && owned

  // اختيارٌ نجا من جلسةٍ سابقة: يُمسح في تأثيرٍ لا أثناء الرسم، ومعه الذاكرة
  // كي لا تبقى نتائج طُلبت بترويسة تلك الجلسة معروضةً بعد مسحها.
  useEffect(() => {
    if (yearId !== null && !owned) {
      useArchiveYearStore.getState().exit()
      queryClient.clear()
    }
  }, [yearId, owned, queryClient])

  const enterArchive = useCallback(
    (year: AcademicYearOption) => {
      useArchiveYearStore.getState().enter({ id: year.id, label: year.label })
      queryClient.clear()
    },
    [queryClient],
  )

  const exitArchive = useCallback(() => {
    useArchiveYearStore.getState().exit()
    queryClient.clear()
  }, [queryClient])

  return {
    isArchiveMode,
    yearId: isArchiveMode ? yearId : null,
    yearLabel: isArchiveMode ? yearLabel : null,
    enterArchive,
    exitArchive,
  }
}
