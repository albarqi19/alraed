import { apiClient } from '@/services/api/client'
import type { ApiResponse, PaginatedResponse } from '@/services/api/types'
import type {
  FormAssignmentInput,
  FormListResponse,
  FormSubmission,
  FormSummary,
  FormUpsertPayload,
  GuardianFormSubmissionPayload,
  PublicFormsResponse,
} from './types'

interface FetchFormsParams {
  status?: FormSummary['status']
  category?: string
  q?: string
  page?: number
  per_page?: number
}

interface FetchSubmissionsParams {
  status?: FormSubmission['status']
  student_id?: number
  guardian_phone?: string
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
}

interface PaginatedResult<T> {
  data: T
  meta?: FormListResponse['meta']
}

function unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }
  return response.data
}

function unwrapPaginated<T>(response: PaginatedResponse<T>, fallbackMessage: string): PaginatedResult<T> {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }
  return {
    data: response.data,
    meta: response.meta,
  }
}

export async function fetchAdminForms(params: FetchFormsParams = {}): Promise<PaginatedResult<FormSummary[]>> {
  const { data } = await apiClient.get<PaginatedResponse<FormSummary[]>>('/admin/forms', { params })
  return unwrapPaginated<FormSummary[]>(data, 'تعذر تحميل النماذج')
}

export async function fetchAdminForm(formId: number): Promise<FormSummary> {
  const { data } = await apiClient.get<ApiResponse<FormSummary>>(`/admin/forms/${formId}`)
  return unwrap<FormSummary>(data, 'تعذر تحميل بيانات النموذج')
}

export async function createAdminForm(payload: FormUpsertPayload): Promise<FormSummary> {
  const { data } = await apiClient.post<ApiResponse<FormSummary>>('/admin/forms', payload)
  return unwrap<FormSummary>(data, 'تعذر إنشاء النموذج')
}

export async function updateAdminForm(formId: number, payload: Partial<FormUpsertPayload>): Promise<FormSummary> {
  const { data } = await apiClient.put<ApiResponse<FormSummary>>(`/admin/forms/${formId}`, payload)
  return unwrap<FormSummary>(data, 'تعذر تحديث النموذج')
}

export async function deleteAdminForm(formId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(`/admin/forms/${formId}`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر حذف النموذج')
  }
}

export async function publishAdminForm(formId: number): Promise<FormSummary> {
  const { data } = await apiClient.post<ApiResponse<FormSummary>>(`/admin/forms/${formId}/publish`)
  return unwrap<FormSummary>(data, 'تعذر نشر النموذج')
}

export async function archiveAdminForm(formId: number): Promise<FormSummary> {
  const { data } = await apiClient.post<ApiResponse<FormSummary>>(`/admin/forms/${formId}/archive`)
  return unwrap<FormSummary>(data, 'تعذر أرشفة النموذج')
}

export async function fetchAdminFormSubmissions(
  formId: number,
  params: FetchSubmissionsParams = {},
): Promise<PaginatedResult<FormSubmission[]>> {
  const { data } = await apiClient.get<PaginatedResponse<FormSubmission[]>>(
    `/admin/forms/${formId}/submissions`,
    { params },
  )
  return unwrapPaginated<FormSubmission[]>(data, 'تعذر تحميل الردود')
}

export async function fetchAdminFormSubmission(formId: number, submissionId: number): Promise<FormSubmission> {
  const { data } = await apiClient.get<ApiResponse<FormSubmission>>(`/admin/forms/${formId}/submissions/${submissionId}`)
  return unwrap<FormSubmission>(data, 'تعذر تحميل بيانات الرد')
}

export async function reviewAdminFormSubmission(
  formId: number,
  submissionId: number,
  payload: { status: Extract<FormSubmission['status'], 'approved' | 'rejected' | 'reviewed'>; review_notes?: string | null },
): Promise<FormSubmission> {
  const { data } = await apiClient.post<ApiResponse<FormSubmission>>(
    `/admin/forms/${formId}/submissions/${submissionId}/review`,
    payload,
  )
  return unwrap<FormSubmission>(data, 'تعذر تحديث حالة الرد')
}

export async function deleteAdminFormSubmission(formId: number, submissionId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(`/admin/forms/${formId}/submissions/${submissionId}`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر حذف الرد')
  }
}

export async function fetchGuardianForms(nationalId: string): Promise<PublicFormsResponse['data']> {
  const { data } = await apiClient.get<PublicFormsResponse>('/public/forms/active', {
    params: { national_id: nationalId },
  })
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل النماذج المتاحة')
  }
  return data.data
}

export async function submitGuardianForm(formId: number, payload: GuardianFormSubmissionPayload): Promise<{ submission_id: number; status: string; submitted_at: string | null }> {
  const formData = buildGuardianSubmissionFormData(payload)
  const { data } = await apiClient.post<ApiResponse<{ submission_id: number; status: string; submitted_at: string | null }>>(
    `/public/forms/${formId}/submit`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return unwrap(data, 'تعذر إرسال النموذج')
}

function buildGuardianSubmissionFormData(payload: GuardianFormSubmissionPayload): FormData {
  const formData = new FormData()
  formData.append('national_id', payload.national_id)

  if (payload.guardian_name) {
    formData.append('guardian_name', payload.guardian_name)
  }

  if (payload.guardian_phone) {
    formData.append('guardian_phone', payload.guardian_phone)
  }

  Object.entries(payload.responses).forEach(([fieldKey, value]) => {
    const prefix = `responses[${fieldKey}]`

    if (value === null || value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      const containsObject = value.some((item) => typeof item === 'object' && item !== null)
      if (containsObject) {
        formData.append(prefix, JSON.stringify(value))
      } else {
        value.forEach((item) => {
          if (item === null || item === undefined) return
          formData.append(`${prefix}[]`, String(item))
        })
      }
      return
    }

    if (typeof value === 'object') {
      formData.append(prefix, JSON.stringify(value))
      return
    }

    if (typeof value === 'boolean') {
      formData.append(prefix, value ? '1' : '0')
      return
    }

    formData.append(prefix, String(value))
  })

  if (payload.files) {
    Object.entries(payload.files).forEach(([fieldKey, fileValue]) => {
      const files = Array.isArray(fileValue) ? fileValue : [fileValue]
      files
        .filter((file): file is File => file instanceof File)
        .forEach((file) => {
          formData.append(`files[${fieldKey}][]`, file)
        })
    })
  }

  return formData
}

/**
 * يُحوّل إسناداً واحداً إلى شكل العقد، أو يردّ `null` إن كان أجوف.
 *
 * الحقول الثلاثة (grade/class_name/student_id) لا يقرأ الباك منها إلا ما يخصّ
 * النطاق: `whereScope('grade')->where('grade', …)`. فإسنادٌ نطاقُه `grade` وقيمة
 * `grade` فيه فارغة يصير `where('grade', null)` — شرطٌ لا يطابق طالباً واحداً،
 * فيبدو النموذج مُسنَداً وهو في الحقيقة محجوبٌ عن الجميع. لذلك نُسقطه هنا بدل
 * أن نمرّره. ونجرّد كذلك ما لا يخصّ النطاق كيلا يُخزَّن حشوٌ يضلّل من يقرأ الصفّ.
 */
function normalizeAssignment(assignment: FormAssignmentInput): FormAssignmentInput | null {
  switch (assignment.scope) {
    case 'all_students':
      return { scope: 'all_students' }

    case 'grade': {
      const grade = assignment.grade?.trim()
      return grade ? { scope: 'grade', grade } : null
    }

    case 'class': {
      const className = assignment.class_name?.trim()
      const grade = assignment.grade?.trim()
      // نطاق الفصل يطابق في الباك بشرطين معاً: `where('grade')` و`where('class_name')`.
      // فاسمُ فصلٍ بلا صفّ إسنادٌ ميّت لا يبلغ طالباً — وأسماء الفصول تتكرّر بين
      // الصفوف أصلاً («أ» في كلّ صفّ)، فالصفّ هو ما يفصلها.
      return className && grade ? { scope: 'class', grade, class_name: className } : null
    }

    case 'student':
      return typeof assignment.student_id === 'number'
        ? { scope: 'student', student_id: assignment.student_id }
        : null

    case 'group': {
      const studentIds = (assignment.metadata?.student_ids ?? []).filter(
        (id): id is number => typeof id === 'number' && Number.isFinite(id),
      )
      const unique = Array.from(new Set(studentIds))
      return unique.length ? { scope: 'group', metadata: { student_ids: unique } } : null
    }

    default:
      return null
  }
}

/**
 * يُنتج حمولة `assignments` كما يقبلها `FormController::syncAssignments`.
 *
 * `id` يُسقَط عمداً: الباك يمسح إسنادات النموذج كلَّها ثم يُنشئها من جديد، فإرسال
 * معرّفاتٍ قديمة ضجيجٌ يوهم بتحديثٍ جزئيّ لا وجود له.
 */
export function prepareAssignmentPayload(assignments: FormAssignmentInput[] = []): FormAssignmentInput[] {
  const normalized: FormAssignmentInput[] = []
  const seen = new Set<string>()

  for (const assignment of assignments) {
    const prepared = normalizeAssignment(assignment)
    if (!prepared) continue

    const signature = [
      prepared.scope,
      prepared.grade ?? '',
      prepared.class_name ?? '',
      prepared.student_id ?? '',
      (prepared.metadata?.student_ids ?? []).join('-'),
    ].join('|')

    if (seen.has(signature)) continue
    seen.add(signature)
    normalized.push(prepared)
  }

  // الباك يطابق الإسنادات بـOR، فوجود «جميع الطلاب» يبتلع ما دونه: إبقاء البقية
  // معه لا يزيد طالباً واحداً، ويُوهم الأدمن أنّ للنموذج جمهوراً أضيق ممّا له.
  const catchAll = normalized.find((assignment) => assignment.scope === 'all_students')

  return catchAll ? [catchAll] : normalized
}
