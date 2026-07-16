import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Eye, Plus, Save, Search, Tag, UserRound, X } from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsInput,
  WsTextarea,
  WsField,
  WsAlert,
  WsEmpty,
} from '@/shared/workspace'
import { useAdminGuidanceCase, useAdminGuidanceCaseMutations, useAdminGuidanceStudents } from '../api/guidance-hooks'
import { TONES, SEVERITY_META, categoryTone, ToneChip, SeverityMeter, SeverityBadge, InitialAvatar } from './student-cases-ui'
import type { GuidanceCaseRecord } from '@/modules/guidance/types'

const CATEGORIES = ['سلوكية', 'أكاديمية', 'اجتماعية', 'نفسية', 'صحية', 'أخرى']
const SEVERITIES: Array<GuidanceCaseRecord['severity']> = ['low', 'medium', 'high', 'critical']

interface CaseFormProps {
  initialData?: Partial<GuidanceCaseRecord>
  mode?: 'create' | 'edit'
}

/** رقم القسم في النموذج — لمسة «خطوات مرقمة» */
function StepBadge({ step }: { step: number }) {
  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        background: 'var(--ws-accent-soft)',
        color: 'var(--ws-accent)',
        flexShrink: 0,
      }}
    >
      {step}
    </span>
  )
}

function SectionHead({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <StepBadge step={step} />
      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800 }}>{title}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>{hint}</p>}
      </div>
    </div>
  )
}

export function AdminStudentCaseFormPage({ initialData, mode = 'create' }: CaseFormProps) {
  const navigate = useNavigate()
  const { data: students, isLoading: loadingStudents } = useAdminGuidanceStudents()
  const { createCase, updateCase } = useAdminGuidanceCaseMutations()

  const [formData, setFormData] = useState<Partial<GuidanceCaseRecord>>({
    student_id: initialData?.student_id,
    category: initialData?.category || '',
    title: initialData?.title || '',
    summary: initialData?.summary || '',
    severity: initialData?.severity || 'medium',
    tags: initialData?.tags || [],
  })

  const [tagInput, setTagInput] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const studentSearchRef = useRef<HTMLDivElement>(null)

  const sortedStudents = useMemo(() => {
    if (!students) return []
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [students])

  const selectedStudent = useMemo(
    () => sortedStudents.find((student) => student.id === formData.student_id),
    [sortedStudents, formData.student_id],
  )

  useEffect(() => {
    if (selectedStudent) {
      setStudentQuery(`${selectedStudent.name} - ${selectedStudent.grade} ${selectedStudent.class_name}`.trim())
    } else if (!mode || mode === 'create') {
      setStudentQuery('')
    }
  }, [selectedStudent, mode])

  const filteredStudents = useMemo(() => {
    if (!sortedStudents.length) return []
    if (!studentQuery.trim()) return sortedStudents.slice(0, 25)

    const lowerQuery = studentQuery.toLowerCase()
    return sortedStudents
      .filter((student) => {
        const haystack = ` ${student.name} ${student.grade} ${student.class_name} ${student.parent_name ?? ''} ${student.national_id ?? ''}`
          .toLowerCase()
        return haystack.includes(lowerQuery)
      })
      .slice(0, 25)
  }, [sortedStudents, studentQuery])

  const handleSelectStudent = (studentId: number) => {
    updateField('student_id', studentId)
    const student = sortedStudents.find((item) => item.id === studentId)
    if (student) {
      setStudentQuery(`${student.name} - ${student.grade} ${student.class_name}`.trim())
    }
    setIsStudentDropdownOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!studentSearchRef.current) return
      if (!studentSearchRef.current.contains(event.target as Node)) {
        setIsStudentDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateField = <K extends keyof GuidanceCaseRecord>(key: K, value: GuidanceCaseRecord[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !formData.tags?.includes(trimmed)) {
      updateField('tags', [...(formData.tags || []), trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags?.filter((t) => t !== tag) || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.student_id || !formData.category || !formData.title || !formData.severity) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      if (mode === 'create') {
        await createCase.mutateAsync(formData)
        navigate('/admin/student-cases')
      } else if (initialData?.id) {
        await updateCase.mutateAsync({ id: initialData.id, payload: formData })
        navigate(`/admin/student-cases/${initialData.id}`)
      }
    } catch (error) {
      console.error('Failed to save case:', error)
      alert('فشل في حفظ الحالة')
    }
  }

  const isSubmitting = createCase.isPending || updateCase.isPending

  const previewCatTone = formData.category ? categoryTone(formData.category) : TONES.gray
  const previewSeverity = (formData.severity || 'medium') as GuidanceCaseRecord['severity']

  return (
    <WsPage>
      <WsHeader
        title={mode === 'create' ? 'إضافة حالة جديدة' : 'تعديل الحالة'}
        badge="الإرشاد الطلابي"
        actions={<WsIconBtn icon={ArrowRight} label="العودة للقائمة" onClick={() => navigate('/admin/student-cases')} />}
      />

      <WsLayout>
        <WsMain>
          <form onSubmit={handleSubmit} className="ws-block ws-block--fill" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ws-block__scroll">
              <div style={{ maxWidth: 720, margin: '0 auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. الطالب */}
                <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionHead step={1} title="الطالب *" hint="ابحث بالاسم أو الصف أو الفصل لتحديد الطالب بسرعة." />
                  {loadingStudents ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>جاري تحميل قائمة الطلاب...</p>
                  ) : mode === 'edit' && selectedStudent ? (
                    <WsInput
                      value={`${selectedStudent.name} - ${selectedStudent.grade} ${selectedStudent.class_name}`.trim()}
                      readOnly
                      style={{ borderStyle: 'dashed', background: 'var(--ws-surface-2)', color: 'var(--ws-text-2)' }}
                    />
                  ) : (
                    <div style={{ position: 'relative' }} ref={studentSearchRef}>
                      <WsInput
                        type="search"
                        value={studentQuery}
                        onChange={(e) => {
                          setStudentQuery(e.target.value)
                          setIsStudentDropdownOpen(true)
                        }}
                        onFocus={() => setIsStudentDropdownOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setIsStudentDropdownOpen(false)
                            ;(event.target as HTMLInputElement).blur()
                          }
                        }}
                        placeholder="أدخل اسم الطالب أو الصف أو الفصل"
                        style={{
                          width: '100%',
                          paddingInlineStart: 28,
                          borderColor: formData.student_id ? undefined : TONES.red.bd,
                        }}
                        aria-expanded={isStudentDropdownOpen}
                        aria-autocomplete="list"
                        required
                      />
                      <Search
                        style={{
                          width: 13,
                          height: 13,
                          position: 'absolute',
                          insetInlineStart: 9,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--ws-text-2)',
                          pointerEvents: 'none',
                        }}
                      />

                      {isStudentDropdownOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            zIndex: 10,
                            insetInline: 0,
                            top: '100%',
                            marginTop: 4,
                            background: 'var(--ws-surface)',
                            border: '1px solid var(--ws-border)',
                            borderRadius: 10,
                            maxHeight: 280,
                            overflowY: 'auto',
                            boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
                          }}
                        >
                          {filteredStudents.length === 0 ? (
                            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد نتائج مطابقة.</div>
                          ) : (
                            <ul role="listbox" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {filteredStudents.map((student) => {
                                const isSelected = student.id === formData.student_id
                                return (
                                  <li key={student.id} style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                                    <button
                                      type="button"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => handleSelectStudent(student.id)}
                                      role="option"
                                      aria-selected={isSelected}
                                      style={{
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '8px 12px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                                        color: isSelected ? 'var(--ws-accent)' : 'var(--ws-text)',
                                      }}
                                    >
                                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{student.name}</span>
                                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                                        {student.grade} • {student.class_name}
                                        {student.parent_phone ? ` • ولي الأمر: ${student.parent_phone}` : ''}
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                          <div
                            style={{
                              padding: '6px 12px',
                              fontSize: 10.5,
                              color: 'var(--ws-text-2)',
                              borderTop: '1px solid var(--ws-hairline)',
                              background: 'var(--ws-surface-2)',
                            }}
                          >
                            يتم عرض أول {filteredStudents.length} نتيجة مطابقة فقط. تابع الكتابة لتصفية أكثر.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!formData.student_id && !loadingStudents && (
                    <p style={{ margin: 0, fontSize: 11, color: TONES.red.tx }}>يرجى اختيار الطالب قبل المتابعة.</p>
                  )}
                </fieldset>

                {/* 2. بيانات الحالة */}
                <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHead step={2} title="بيانات الحالة الأساسية" hint="املأ التفاصيل الأساسية للحالة لضمان تتبع دقيق وسريع." />

                  <WsField label="العنوان *">
                    <WsInput
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="عنوان مختصر للحالة (مثال: صعوبات في مادة الرياضيات)"
                      required
                    />
                  </WsField>

                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>التصنيف *</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 6 }}>
                      {CATEGORIES.map((cat) => {
                        const tone = categoryTone(cat)
                        const isSelected = formData.category === cat
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                            style={isSelected
                              ? { background: tone.bg, borderColor: tone.tx, color: tone.tx, boxShadow: `0 0 0 1px ${tone.tx}` }
                              : undefined}
                            onClick={() => updateField('category', cat)}
                          >
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>الأولوية *</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
                      {SEVERITIES.map((severity) => {
                        const meta = SEVERITY_META[severity]
                        const isSelected = formData.severity === severity
                        return (
                          <button
                            key={severity}
                            type="button"
                            className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                            style={isSelected
                              ? { background: meta.tone.bg, borderColor: meta.tone.tx, color: meta.tone.tx, boxShadow: `0 0 0 1px ${meta.tone.tx}` }
                              : undefined}
                            onClick={() => updateField('severity', severity)}
                          >
                            <SeverityMeter severity={severity} />
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                      حدد الأولوية بناءً على مدى تأثير الحالة على الطالب ودرجة الاستجابة المطلوبة.
                    </p>
                  </div>

                  <WsField label="الملخص">
                    <WsTextarea
                      value={formData.summary || ''}
                      onChange={(e) => updateField('summary', e.target.value)}
                      rows={5}
                      placeholder="سجل وصفاً مختصراً للحالة مع أبرز الملاحظات الأولية."
                    />
                  </WsField>
                </fieldset>

                {/* 3. الوسوم */}
                <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionHead step={3} title="الوسوم" hint='استخدم الوسوم لتسهيل البحث والتصنيف لاحقاً (مثال: "سلوك", "تأخر دراسي").' />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <WsInput
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="أضف وسم واضغط Enter"
                      style={{ flex: 1 }}
                    />
                    <WsBtn icon={Plus} onClick={addTag}>إضافة</WsBtn>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="ws-chip"
                          style={{ background: 'var(--ws-accent-soft)', color: 'var(--ws-accent)', gap: 4 }}
                        >
                          <Tag style={{ width: 10, height: 10 }} />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            title={`إزالة ${tag}`}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex' }}
                          >
                            <X style={{ width: 11, height: 11 }} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </fieldset>
              </div>
            </div>

            <footer
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                padding: '10px 16px',
                borderTop: '1px solid var(--ws-hairline)',
                flexShrink: 0,
              }}
            >
              <WsBtn onClick={() => navigate(-1)}>إلغاء</WsBtn>
              <WsBtn type="submit" variant="primary" icon={Save} disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحفظ...' : mode === 'create' ? 'إنشاء الحالة' : 'حفظ التعديلات'}
              </WsBtn>
            </footer>
          </form>
        </WsMain>

        {/* معاينة حية: هكذا ستظهر بطاقة الحالة في السجل */}
        <WsSideCol side="end" title="معاينة الحالة" icon={Eye} storageKey="ws:student-case-form:sidecol" width={300}>
          <WsBlock padded fill>
            <div
              style={{
                border: '1px solid var(--ws-border)',
                borderRadius: 10,
                overflow: 'hidden',
                background: `linear-gradient(to bottom, ${SEVERITY_META[previewSeverity].tone.bg}, var(--ws-surface) 34%)`,
              }}
            >
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InitialAvatar name={selectedStudent?.name ?? ''} tone={previewCatTone} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedStudent?.name ?? 'لم يُحدد الطالب بعد'}
                    </span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      {selectedStudent ? `${selectedStudent.grade} - ${selectedStudent.class_name}` : '—'}
                    </span>
                  </span>
                </div>

                <p
                  style={{
                    margin: '10px 0 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: formData.title ? 'var(--ws-text)' : 'var(--ws-text-2)',
                  }}
                >
                  {formData.title || 'عنوان الحالة...'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {formData.category ? (
                    <ToneChip tone={previewCatTone}>{formData.category}</ToneChip>
                  ) : (
                    <span className="ws-chip">بلا تصنيف</span>
                  )}
                  <SeverityBadge severity={previewSeverity} />
                </div>

                {formData.summary && (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 11,
                      color: 'var(--ws-text-2)',
                      lineHeight: 1.7,
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {formData.summary}
                  </p>
                )}

                {formData.tags && formData.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--ws-hairline)' }}>
                    {formData.tags.map((tag) => (
                      <span key={tag} className="ws-chip" style={{ background: 'var(--ws-accent-soft)', color: 'var(--ws-accent)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <UserRound style={{ width: 11, height: 11, flexShrink: 0 }} />
              هكذا ستظهر بطاقة الحالة في السجل — تتحدث المعاينة أثناء كتابتك.
            </p>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}

/** غلاف صفحة التعديل: يجلب الحالة ثم يمرر بياناتها للنموذج
    (يُصلح مسار /admin/student-cases/:caseId/edit الذي كان مفقوداً من الراوتر) */
export function AdminStudentCaseEditPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { data: caseData, isLoading, error } = useAdminGuidanceCase(caseId ? Number(caseId) : null)

  if (isLoading) {
    return (
      <WsPage>
        <WsHeader title="تعديل الحالة" />
        <WsBlock fill>
          <WsEmpty loading>جاري تحميل بيانات الحالة...</WsEmpty>
        </WsBlock>
      </WsPage>
    )
  }

  if (error || !caseData) {
    return (
      <WsPage>
        <WsHeader
          title="تعديل الحالة"
          actions={<WsBtn icon={ArrowRight} onClick={() => navigate('/admin/student-cases')}>العودة للقائمة</WsBtn>}
        />
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>لم يتم العثور على الحالة المطلوبة</WsAlert>
        </WsBlock>
      </WsPage>
    )
  }

  return <AdminStudentCaseFormPage key={caseData.id} initialData={caseData} mode="edit" />
}
