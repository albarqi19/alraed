import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  AttributeDefinitionsResponse,
  FormTemplateSummary,
  StudentAttributesResponse,
} from './types'

/** معجمُ السمات — يبني منه المصمّم قسم «بيانات الطالب» في اللوحة الجانبية. */
export async function fetchAttributeDefinitions(): Promise<AttributeDefinitionsResponse> {
  const { data } = await apiClient.get<AttributeDefinitionsResponse>(
    '/admin/student-attributes/definitions',
  )

  return data
}

/** سماتُ طالبٍ واحد — تصل مطموسةً من الخادم حسب من يطلبها. */
export async function fetchStudentAttributes(studentId: number): Promise<StudentAttributesResponse> {
  const { data } = await apiClient.get<StudentAttributesResponse>(
    `/admin/students/${studentId}/attributes`,
  )

  return data
}

export async function fetchFormTemplates(): Promise<FormTemplateSummary[]> {
  const { data } = await apiClient.get<ApiResponse<FormTemplateSummary[]>>('/admin/form-templates')

  return data.data ?? []
}

/** ينسخ البذرة نموذجاً جديداً **مسودّةً** في المدرسة — تراجعه قبل النشر. */
export async function instantiateFormTemplate(
  templateId: number,
  title?: string,
): Promise<{ id: number; title: string; status: string }> {
  const { data } = await apiClient.post<ApiResponse<{ id: number; title: string; status: string }>>(
    `/admin/form-templates/${templateId}/instantiate`,
    title ? { title } : {},
  )

  return data.data
}
