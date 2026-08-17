import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/services/api/errors'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchAttributeDefinitions,
  fetchFormTemplates,
  fetchStudentAttributes,
  instantiateFormTemplate,
} from './api'

export const attributeQueryKeys = {
  definitions: () => ['student-attributes', 'definitions'] as const,
  forStudent: (studentId: number | null) => ['student-attributes', 'student', studentId] as const,
  templates: () => ['form-templates', 'list'] as const,
}

/**
 * المعجم — جدولٌ شبهُ ثابتٍ يُقرأ في كل فتحٍ للمصمّم.
 *
 * `staleTime` طويلٌ عمداً: المعجم لا يتغيّر إلا بنشرةٍ جديدة، وإعادةُ جلبه مع
 * كل تركيزٍ على النافذة تكلفةٌ بلا مقابل.
 */
export function useAttributeDefinitions(enabled = true) {
  return useQuery({
    queryKey: attributeQueryKeys.definitions(),
    queryFn: fetchAttributeDefinitions,
    staleTime: 30 * 60 * 1000,
    enabled,
  })
}

export function useStudentAttributes(studentId: number | null) {
  return useQuery({
    queryKey: attributeQueryKeys.forStudent(studentId),
    queryFn: () => fetchStudentAttributes(studentId as number),
    enabled: studentId !== null,
    staleTime: 60 * 1000,
  })
}

export function useFormTemplates(enabled = true) {
  return useQuery({
    queryKey: attributeQueryKeys.templates(),
    queryFn: fetchFormTemplates,
    staleTime: 10 * 60 * 1000,
    enabled,
  })
}

export function useInstantiateTemplate() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ templateId, title }: { templateId: number; title?: string }) =>
      instantiateFormTemplate(templateId, title),
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ['forms', 'admin', 'list'] })
      toast({
        type: 'success',
        title: 'أُنشئ النموذج مسودّةً',
        description: `«${form.title}» — راجعه قبل النشر.`,
      })
    },
    onError: (error) => {
      toast({
        type: 'error',
        title: 'تعذّر إنشاء النموذج',
        description: getErrorMessage(error, 'تعذّر نسخ النموذج المعتمد'),
      })
    },
  })
}
