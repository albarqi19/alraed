/**
 * أنواع البيانات لتقارير مدرستي
 */

// إحصائيات النظرة العامة
export interface MadrasatiOverview {
  total_teachers: number
  total_subjects: number
  total_students: number
  total_lessons: number
  total_enrichments: number
  avg_enrichments_per_teacher: number
}

// إحصائيات الواجبات
export interface MadrasatiHomeworkMetrics {
  teachers_with_homework: number
  teachers_with_homework_percent: number
  total_homework: number
  total_published: number
  total_corrected: number
  total_students: number
  avg_students_per_teacher: number
  /** كثافة التصحيح = تصحيحات ÷ واجبات (متوسط طالب/واجب) */
  correction_intensity: number
  /** تغطية الفصل = (كثافة التصحيح ÷ طلاب) × 100 */
  class_coverage: number
  publish_rate: number
  avg_per_teacher: number
}

// إحصائيات الاختبارات
export interface MadrasatiTestsMetrics {
  teachers_with_tests: number
  teachers_with_tests_percent: number
  total_tests: number
  total_published: number
  publish_rate: number
  avg_per_teacher: number
}

// إحصائيات الأنشطة
export interface MadrasatiActivitiesMetrics {
  teachers_with_activities: number
  teachers_with_activities_percent: number
  total_activities: number
  total_published: number
  class_activities: number
  extracurricular_activities: number
  publish_rate: number
  avg_per_teacher: number
}

// إحصائيات التفاعل
export interface MadrasatiEngagementMetrics {
  total_discussions: number
  total_teacher_replies: number
  total_notifications: number
  total_paths_created: number
  total_paths_published: number
  total_paths_approved: number
  avg_discussions_per_teacher: number
}

// حالة تغطية الفصل
export interface CoverageStatus {
  level: 'excellent' | 'good' | 'average' | 'needs_attention'
  label: string
  color: 'emerald' | 'sky' | 'amber' | 'rose'
}

// بيانات المعلم في الترتيب
export interface MadrasatiTeacherRanking {
  teacher_id: string
  teacher_name: string
  score: number
  students_count: number
  homework_count: number
  homework_corrected: number
  /** كثافة التصحيح (متوسط طالب/واجب) */
  correction_intensity: number
  /** تغطية الفصل (نسبة مئوية) */
  class_coverage: number
  /** حالة التغطية (Badge) */
  coverage_status: CoverageStatus
  tests_count: number
  activities_count: number
  enrichments_count: number
  subjects_count: number
}

// ترتيب المعلمين
export interface MadrasatiTeacherRankings {
  all_teachers: MadrasatiTeacherRanking[]
  top_performers: MadrasatiTeacherRanking[]
  needs_attention: MadrasatiTeacherRanking[]
  inactive_teachers: {
    teacher_id: string
    teacher_name: string
    subjects_count: number
  }[]
  inactive_count: number
}

// توزيع المواد
export interface MadrasatiSubjectDistribution {
  name: string
  teachers_count: number
  total_homework: number
  total_tests: number
  total_activities: number
}

// الإحصائيات الشاملة للمدرسة
export interface MadrasatiSchoolMetrics {
  overview: MadrasatiOverview
  homework_metrics: MadrasatiHomeworkMetrics
  tests_metrics: MadrasatiTestsMetrics
  activities_metrics: MadrasatiActivitiesMetrics
  engagement_metrics: MadrasatiEngagementMetrics
  teacher_rankings: MadrasatiTeacherRankings
  subjects_distribution: MadrasatiSubjectDistribution[]
  last_extraction: string | null
}

// بيانات المقرر
export interface MadrasatiSubjectStat {
  id: number
  subject_name: string
  students_count: number
  homework_count: number
  homework_published: number
  lesson_homework_corrected: number
  tests_count: number
  tests_published: number
  total_activities: number
  activities_published: number
  enrichments_count: number
  sync_lessons: number
  async_lessons: number
}

// بيانات المعلم الكاملة
export interface MadrasatiTeacherStat {
  id: number
  teacher_id: string
  teacher_name: string
  semester_id: string
  students_count: number
  subjects_count: number
  homework_count: number
  homework_published: number
  lesson_homework_corrected: number
  published_homework_corrected: number
  tests_count: number
  tests_published: number
  total_activities: number
  activities_published: number
  enrichments_count: number
  questions_count: number
  sync_lessons: number
  async_lessons: number
  discussion_topics: number
  teacher_replies: number
  paths_created: number
  paths_published: number
  paths_approved: number
  extraction_date: string
  extracted_at: string
  subjects: MadrasatiSubjectStat[]
}

// مؤشرات تغطية الفصل للمعلم
export interface TeacherCoverageMetrics {
  students_count: number
  total_corrected: number
  correction_intensity: number
  class_coverage: number
  coverage_status: CoverageStatus
}

// المقارنة المعيارية
export interface MadrasatiBenchmark {
  school_avg_score: number
  vs_average: 'above' | 'below' | 'equal'
  difference_percent: number
  school_avg_homework: number
  school_avg_tests: number
  school_avg_activities: number
  school_avg_coverage: number
  school_avg_intensity: number
}

// تفاصيل المعلم مع المقارنة
export interface MadrasatiTeacherDetail {
  teacher: MadrasatiTeacherStat
  score: number
  coverage_metrics: TeacherCoverageMetrics
  benchmark: MadrasatiBenchmark
}

// استجابة قائمة المعلمين مع التصفح
export interface MadrasatiTeachersResponse {
  current_page: number
  data: MadrasatiTeacherStat[]
  last_page: number
  per_page: number
  total: number
}
