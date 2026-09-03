import { apiClient } from '@/services/api/client'

/** النموذج كما يراه المعلّم: بلا نقاطٍ ولا عتباتٍ ولا سقف. */
export interface TeacherLdQuestion {
  id: number
  text: string
  is_required: boolean
  display_order: number
}

export interface TeacherLdSection {
  id: number
  title: string
  description: string | null
  /** فارغٌ = قسمٌ عامّ لكلّ مادّة؛ ومسمّىً لا يظهر إلّا حين تكون المادّةُ المختارة فيه. */
  subject_ids: number[]
  questions: TeacherLdQuestion[]
}

export interface TeacherLdForm {
  id: number
  title: string
  description: string | null
  /** «أحاله ٢ من زملائك» — يقلب الازدواج إلى شهادةٍ تُغذّي خطّ الإجماع. */
  existing: { count: number; latest_at: string | null; teacher_names: string[] } | null
  /** null = يصلح لأيّ مادّة؛ ومصفوفةٌ = لا يُعرض إلّا حين تكون المادّةُ المختارة فيها. */
  for_subject_ids: number[] | null
  sections: TeacherLdSection[]
}

export interface TeacherLdFormsResult {
  forms: TeacherLdForm[]
  teacher_subjects: { subject_id: number; subject_name: string }[]
}

export async function fetchTeacherLdForms(studentId?: number): Promise<TeacherLdFormsResult> {
  const { data } = await apiClient.get('/teacher/learning-difficulty/forms', {
    params: studentId ? { student_id: studentId } : undefined,
  })

  return data.data ?? { forms: [], teacher_subjects: [] }
}

export interface SubmitLdPayload {
  form_id: number
  student_id: number
  subject_id: number
  answers: { question_id: number; answer: boolean }[]
  teacher_notes?: string
  priority?: string
}

export async function submitLdReferral(payload: SubmitLdPayload) {
  const { data } = await apiClient.post('/teacher/learning-difficulty/referrals', payload)

  return data.data as { referral_id: number; referral_number: string | null; target_role_label: string }
}
