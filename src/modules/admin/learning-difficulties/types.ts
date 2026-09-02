/** أنواع قسم صعوبات التعلّم. */

export type LdVerdict =
  | 'below'
  | 'shadowed'
  | 'specific_consensus'
  | 'specific_single'
  | 'general'

export type LdSeverity = 'low' | 'medium' | 'high'

export type LdRailKey = 'absence' | 'late' | 'behavior'

/** عمودٌ في شبكة المِحَكّ: بُعدٌ تشخيصيّ واحد. */
export interface LdSection {
  section_id: number
  form_id: number
  form_title: string | null
  title: string
  display_order: number
  min: number
  max: number
  /** مصدرُ عرضِ العمود — المحور الأفقيّ وزنُ الأداة لا خاناتٌ متساوية. */
  weight: number
}

/**
 * خليّة: `measured=false` تُرسم خاويةً (لم يُقَس)، و`ratio=null` مع
 * `measured=true` تُرسم رماديّةً (قِيس ولا يميّز). والفرقُ بينهما هو التشخيص.
 */
export interface LdCell {
  section_id: number
  measured: boolean
  score: number | null
  min: number | null
  max: number | null
  ratio: number | null
}

/** مسار: شهادةُ معلّمٍ واحد بمادّته. */
export interface LdTrack {
  response_id: number
  referral_id: number
  referral_number: string | null
  referral_status: string | null
  withdrawn: boolean
  teacher_id: number | null
  teacher_name: string | null
  subject_id: number | null
  subject_name: string | null
  form_id: number
  form_title: string | null
  created_at: string | null
  total_score: number
  max_score: number
  score_ratio: number | null
  severity: LdSeverity
  peak_section_id: number | null
  peak_ratio: number | null
  teacher_notes: string | null
  cells: LdCell[]
}

export interface LdRail {
  key: LdRailKey
  value: number
  denominator: number | null
  raw_label: string
  peer_max: number
  percentile: number
  ignited: boolean
  floor_passed: boolean
  /** مواضعُ مطبَّعة 0..1 لأقران الفصل. */
  peers: number[]
  self_position: number
}

export interface LdShadow {
  comparable: boolean
  reason: 'ok' | 'few_peers' | 'few_days'
  peers_count?: number
  working_days?: number
  window?: { from: string; to: string }
  rails: LdRail[]
}

export interface LdRow {
  student: {
    student_id: number
    student_name: string
    student_number: string | null
    grade: string | null
    class_name: string | null
    student_status: string | null
  }
  witnesses: {
    witness_count: number
    withdrawn_count: number
    subject_count: number
    teacher_names: string[]
    latest_response_at: string | null
  }
  score: {
    top_total_score: number
    top_max_score: number
    top_score_ratio: number | null
    severity: LdSeverity
    severity_form_id: number | null
    severity_form_title: string | null
  }
  sections: LdSection[]
  tracks: LdTrack[]
  consensus_section_ids: number[]
  peak: { section_id: number; section_title: string; form_id: number | null; ratio: number } | null
  spread: { measured_sections: number; ignited_sections: number; median_ratio: number | null }
  shadow: LdShadow
  flags: {
    has_open_case: boolean
    has_active_plan: boolean
    case_owner_name: string | null
    prior_ld_referrals_count: number
  }
  verdict: LdVerdict
  verdict_label: string
  verdict_reason: string
  ai: { has_report: boolean; generated_at: string | null; stale: boolean }
  /** يصل في تفاصيل الطالب وحدها. */
  fired?: LdFiredSection[]
  shadow_detail?: LdShadowDetail
}

export interface LdFiredSection {
  section_id: number
  section_title: string | null
  questions: {
    question_id: number
    text: string | null
    points_yes: number | null
    points_no: number | null
    witnesses: {
      response_id: number
      teacher_name: string | null
      subject_name: string | null
      answer: boolean
      points_awarded: number
    }[]
  }[]
}

export interface LdShadowDetail {
  absence_by_month: { month: string; days: number }[]
  excused_days: number
  unexcused_days: number
  late_dates: string[]
  violations: { incident_date: string; violation_type: string; degree: string }[]
  prior_behavioral_referrals: { incident_date: string; status: string }[]
}

export interface LdTotals {
  students: number
  responses: number
  below: number
  shadowed: number
  specific_consensus: number
  specific_single: number
  general: number
  already_followed: number
}

export interface LdThresholds {
  consensus_ratio: number
  ignite_ratio: number
  peer_percentile: number
  min_peers: number
  min_working_days: number
  floors: { absence_rate: number; late_count: number; behavior_count: number }
}

export interface LdBoardFilters {
  academic_year?: string
  form_id?: number
  grade?: string
  class_name?: string
  subject_id?: number
  teacher_id?: number
  severity?: LdSeverity
  verdict?: LdVerdict
  status?: string
  search?: string
  sort?: LdSort
  hide_shadowed?: boolean
}

export type LdSort = 'severity' | 'peak' | 'consensus' | 'net'

/* ── النماذج ── */

export interface LdQuestion {
  id?: number
  text: string
  points_yes: number
  points_no: number
  is_required: boolean
  display_order?: number
}

export interface LdFormSection {
  id?: number
  title: string
  description: string | null
  display_order?: number
  max_score?: number
  questions: LdQuestion[]
}

export interface LdForm {
  id: number
  title: string
  description: string | null
  subject_ids: number[]
  grades: string[]
  teacher_ids: number[]
  is_active: boolean
  accepting_referrals: boolean
  threshold_high: number
  threshold_medium: number
  max_score: number
  questions_count: number
  responses_count: number
  /** نموذجٌ وصلته إحالات: أسئلتُه مقفلة، وتغييرُها يمحو إجاباتٍ محفوظة. */
  structure_locked: boolean
  created_by: string | null
  created_at: string | null
  sections: LdFormSection[]
}

export interface LdFormPayload {
  title: string
  description?: string | null
  subject_ids?: number[] | null
  grades?: string[] | null
  teacher_ids?: number[] | null
  is_active?: boolean
  accepting_referrals?: boolean
  threshold_high?: number
  threshold_medium?: number
  sections?: {
    title: string
    description?: string | null
    questions: { id?: number; text: string; points_yes: number; points_no: number; is_required?: boolean }[]
  }[]
}

export interface LdScopeOptions {
  subjects: { id: number; name: string }[]
  grades: string[]
}

export interface LdQuestionAnalytics {
  question_id: number
  text: string | null
  section_id: number | null
  section_title: string | null
  form_id: number | null
  form_title: string | null
  points_yes: number | null
  points_no: number | null
  asked_count: number
  yes_count: number
  yes_rate: number | null
  /** فرقُ معدّل «نعم» بين أعلى ثلثِ الدرجات وأدناه. */
  discrimination: number | null
}

export interface LdAiReport {
  report_markdown: string
  generated_at: string
  model: string
  digest: string
  stale: boolean
}
