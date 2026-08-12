import { apiClient } from '@/services/api/client'
import type { AcademicYearOption, CurrentAcademicYearState } from './types'

export async function fetchAcademicYears(): Promise<AcademicYearOption[]> {
  const { data } = await apiClient.get<{ success: boolean; data: AcademicYearOption[] }>(
    '/admin/academic-years',
  )
  return data.data
}

/**
 * ما يراه الخادم الآن: السنة الجارية، وهل الطلب الحالي في وضع الأرشيف فعلاً.
 *
 * الفائدة أن الواجهة لا تصدّق نفسها: لو رفض الوسيط ترويستنا (دورٌ لا يقرأ
 * الأرشيف، أو سنةٌ لا تخصّ المدرسة) رجع `is_archive_mode = false` بينما مخزننا
 * يظن العكس — وهذا بالضبط الفارق الذي يجب أن يظهر لا أن يُخفى.
 */
export async function fetchCurrentAcademicYear(): Promise<CurrentAcademicYearState> {
  const { data } = await apiClient.get<{ success: boolean; data: CurrentAcademicYearState }>(
    '/admin/academic-years/current',
  )
  return data.data
}
