/**
 * معجمُ سمات الطالب وقيمُه.
 *
 * المبدأ الذي يحكم كل ما هنا: **الواجهة لا تُخفي، بل ترسم الطمس.** القيمةُ
 * المحجوبة تصل `null` من الخادم ومعها `is_redacted: true` — فلا يوجد في المتصفّح
 * ما يُخفى أصلاً. أيُّ منطقٍ هنا يشترط على القيمة الظهور هو ستارةٌ لا حجاب.
 */

/** درجاتُ الحساسية الثلاث. كلُّ رابعةٍ قاعدةٌ لن يفهمها أحدٌ ولن تُطبَّق. */
export type AttributeSensitivity = 'open' | 'restricted' | 'closed'

/** الأقسامُ الخمسة — وحدةُ الصلاحية، لا تزيد إلا بهجرةٍ في الباك. */
export type AttributeSection = 'profile' | 'social' | 'financial' | 'health' | 'military'

export interface AttributeDefinition {
  key: string
  label: string
  type: string
  options?: string[] | null
  sensitivity: AttributeSensitivity
  sensitivity_label: string
  is_emergency: boolean
  note?: string | null
}

export interface AttributeDefinitionGroup {
  section: AttributeSection
  label: string
  attributes: AttributeDefinition[]
}

export interface AttributeDefinitionsResponse {
  data: AttributeDefinitionGroup[]
  meta: {
    sensitivity_labels: Record<AttributeSensitivity, string>
    section_labels: Record<AttributeSection, string>
  }
}

/** قيمةُ سمةٍ في ملفّ الطالب كما يُصدّرها الباك بعد المصفاة. */
export interface StudentAttributeValue {
  key: string
  label: string
  section: AttributeSection | null
  sensitivity: AttributeSensitivity
  /** `null` دائماً حين `is_redacted` — الخادم لم يرسلها، لا الواجهة أخفتها */
  value: unknown
  is_redacted: boolean
  source?: string
  updated_at?: string | null
  review_due_at?: string | null
}

export interface StudentAttributeGroup {
  section: AttributeSection
  label: string
  attributes: StudentAttributeValue[]
  redacted_count: number
}

export interface StudentAttributesResponse {
  data: StudentAttributeGroup[]
  meta: {
    total: number
    redacted: number
    /** للطالب بياناتٌ مغلقةٌ مسجَّلة — «علم الوجود» بلا محتوى */
    has_closed_data: boolean
    viewer_sees_closed: boolean
    via_inheritance: boolean
  }
}

/** النماذج المعتمدة — بذورٌ تُنسَخ لا قوالبُ تُفرَض. */
export interface FormTemplateSummary {
  id: number
  title: string
  category?: string | null
  description?: string | null
  is_global: boolean
  sections_count: number
  fields_count: number
  /** كم حقلاً منها مربوطٌ بسمةٍ في المعجم — أي كم سيهبط في ملفّ الطالب */
  mapped_count: number
}
