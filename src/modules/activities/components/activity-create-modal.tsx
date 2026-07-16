import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { WsBtn, WsIconBtn, WsInput, WsTextarea, WsField, WsAlert, TONES } from '@/shared/workspace'
import { useCreateActivity } from '../hooks'
import type { ActivityStatus } from '../types'

interface Props {
  grades: string[]
  onClose: () => void
}

export function ActivityCreateModal({ grades, onClose }: Props) {
  const createActivity = useCreateActivity()

  const [form, setForm] = useState({
    title: '',
    description: '',
    objectives: [] as string[], // الأهداف كمصفوفة
    examples: '',
    start_date: '',
    end_date: '',
    target_grades: [] as string[],
    status: 'active' as ActivityStatus,
  })
  const [newObjective, setNewObjective] = useState('') // هدف جديد
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setForm(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }))
      setNewObjective('')
    }
  }

  const handleRemoveObjective = (index: number) => {
    setForm(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('يرجى إدخال عنوان النشاط')
      setStep(1)
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('يرجى تحديد فترة النشاط')
      setStep(1)
      return
    }
    if (form.target_grades.length === 0) {
      setError('يرجى اختيار صف واحد على الأقل')
      setStep(2)
      return
    }

    try {
      await createActivity.mutateAsync({
        ...form,
        objectives: form.objectives.length > 0 ? form.objectives : undefined,
        pdf_file: pdfFile ?? undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء')
    }
  }

  const toggleGrade = (grade: string) => {
    setForm((prev) => ({
      ...prev,
      target_grades: prev.target_grades.includes(grade)
        ? prev.target_grades.filter((g) => g !== grade)
        : [...prev.target_grades, grade],
    }))
  }

  const selectAllGrades = () => {
    setForm((prev) => ({ ...prev, target_grades: [...grades] }))
  }

  const clearAllGrades = () => {
    setForm((prev) => ({ ...prev, target_grades: [] }))
  }

  const canProceedToStep2 = form.title.trim() && form.start_date && form.end_date

  return (
    <div className="ws-modal" onClick={onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <header className="ws-modal__head">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <h3 className="ws-modal__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles style={{ width: 14, height: 14, color: 'var(--ws-accent)' }} />
                إنشاء نشاط جديد
              </h3>
              <p className="ws-modal__sub">أضف نشاطاً جديداً للمعلمين</p>
            </div>
            <WsIconBtn icon={X} label="إغلاق" onClick={onClose} />
          </div>

          {/* مؤشر الخطوتين */}
          <div className="ws-seg" style={{ marginTop: 8 }}>
            <button
              type="button"
              className={`ws-seg__btn ${step === 1 ? 'is-active' : ''}`}
              onClick={() => setStep(1)}
            >
              <span className="ws-count">1</span> المعلومات الأساسية
            </button>
            <button
              type="button"
              className={`ws-seg__btn ${step === 2 ? 'is-active' : ''}`}
              onClick={() => canProceedToStep2 && setStep(2)}
              disabled={!canProceedToStep2}
            >
              <span className="ws-count">2</span> الصفوف والمرفقات
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="ws-modal__body" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
            {error && <WsAlert tone="error" boxed>{error}</WsAlert>}

            {step === 1 && (
              <>
                <WsField label="عنوان النشاط *">
                  <WsInput
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="مثال: نشاط القراءة الحرة"
                  />
                </WsField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <WsField label="تاريخ البداية *">
                    <WsInput
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </WsField>
                  <WsField label="تاريخ النهاية *">
                    <WsInput
                      type="date"
                      value={form.end_date}
                      min={form.start_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </WsField>
                </div>

                <WsField label="الوصف">
                  <WsTextarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="وصف مختصر للنشاط..."
                  />
                </WsField>

                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>
                    الأهداف <span style={{ fontWeight: 400 }}>(أضف كل هدف على حدة)</span>
                  </p>

                  {form.objectives.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                      {form.objectives.map((objective, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            background: 'var(--ws-surface-2)',
                            border: '1px solid var(--ws-hairline)',
                            borderRadius: 8,
                            padding: '6px 8px',
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 800,
                              background: TONES.sky.bg,
                              color: TONES.sky.tx,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span style={{ flex: 1, fontSize: 12 }}>{objective}</span>
                          <WsIconBtn
                            icon={Trash2}
                            label="إزالة الهدف"
                            onClick={() => handleRemoveObjective(index)}
                            style={{ color: TONES.red.tx }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6 }}>
                    <WsInput
                      type="text"
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddObjective()
                        }
                      }}
                      placeholder="اكتب الهدف ثم اضغط Enter..."
                      style={{ flex: 1 }}
                    />
                    <WsBtn icon={Plus} onClick={handleAddObjective} disabled={!newObjective.trim()}>إضافة</WsBtn>
                  </div>

                  {form.objectives.length > 0 && (
                    <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      تم إضافة {form.objectives.length} هدف
                    </p>
                  )}
                </div>

                <WsField label="أمثلة تطبيقية">
                  <WsTextarea
                    value={form.examples}
                    onChange={(e) => setForm({ ...form, examples: e.target.value })}
                    rows={3}
                    placeholder="أمثلة على كيفية تنفيذ النشاط..."
                  />
                </WsField>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                    <p className="ws-label" style={{ margin: 0 }}>الصفوف المستهدفة *</p>
                    {grades.length > 0 && (
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <WsBtn size="sm" icon={CheckCircle2} onClick={selectAllGrades}>تحديد الكل</WsBtn>
                        <WsBtn size="sm" icon={X} onClick={clearAllGrades}>إلغاء الكل</WsBtn>
                      </span>
                    )}
                  </div>

                  {grades.length === 0 ? (
                    <WsAlert tone="warn" boxed>
                      لا توجد صفوف متاحة — تأكد من وجود طلاب مسجلين في النظام
                    </WsAlert>
                  ) : (
                    <>
                      <div className="ws-choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                        {grades.map((grade) => {
                          const isSelected = form.target_grades.includes(grade)
                          return (
                            <button
                              key={grade}
                              type="button"
                              className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleGrade(grade)}
                            >
                              {isSelected && <Check />}
                              {grade}
                            </button>
                          )
                        })}
                      </div>
                      {form.target_grades.length > 0 && (
                        <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-accent)' }}>
                          تم اختيار <b>{form.target_grades.length}</b> صف من أصل {grades.length}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>
                    ملف PDF مرفق <span style={{ fontWeight: 400 }}>(اختياري)</span>
                  </p>
                  {pdfFile ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        border: `1px solid ${TONES.green.bd}`,
                        background: TONES.green.bg,
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <FileText style={{ width: 18, height: 18, color: TONES.red.tx, flexShrink: 0 }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pdfFile.name}
                          </span>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </span>
                      </span>
                      <WsBtn size="sm" icon={Trash2} onClick={() => setPdfFile(null)} style={{ color: TONES.red.tx }}>إزالة</WsBtn>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        border: '2px dashed var(--ws-border)',
                        borderRadius: 10,
                        padding: 18,
                        cursor: 'pointer',
                        background: 'var(--ws-surface-2)',
                      }}
                    >
                      <Upload style={{ width: 20, height: 20, color: 'var(--ws-text-2)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>اضغط لاختيار ملف</span>
                      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>PDF فقط — الحد الأقصى 10MB</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>حالة النشاط</p>
                  <div className="ws-choice-grid">
                    <button
                      type="button"
                      className={`ws-choice ${form.status === 'active' ? 'is-selected' : ''}`}
                      onClick={() => setForm({ ...form, status: 'active' })}
                      style={form.status === 'active'
                        ? { background: TONES.green.bg, borderColor: TONES.green.tx, color: TONES.green.tx, boxShadow: `0 0 0 1px ${TONES.green.tx}` }
                        : undefined}
                    >
                      <CheckCircle2 />
                      نشط <span style={{ fontWeight: 400, fontSize: 10.5 }}>(مرئي للمعلمين)</span>
                    </button>
                    <button
                      type="button"
                      className={`ws-choice ${form.status === 'draft' ? 'is-selected' : ''}`}
                      onClick={() => setForm({ ...form, status: 'draft' })}
                      style={form.status === 'draft'
                        ? { background: TONES.amber.bg, borderColor: TONES.amber.tx, color: TONES.amber.tx, boxShadow: `0 0 0 1px ${TONES.amber.tx}` }
                        : undefined}
                    >
                      <FileText />
                      مسودة <span style={{ fontWeight: 400, fontSize: 10.5 }}>(غير مرئي)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <footer className="ws-modal__foot" style={{ justifyContent: 'space-between' }}>
            {step === 1 ? (
              <>
                <WsBtn onClick={onClose}>إلغاء</WsBtn>
                <WsBtn variant="primary" icon={ArrowLeft} onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                  التالي
                </WsBtn>
              </>
            ) : (
              <>
                <WsBtn icon={ArrowRight} onClick={() => setStep(1)}>السابق</WsBtn>
                <WsBtn
                  type="submit"
                  variant="primary"
                  icon={Check}
                  disabled={createActivity.isPending || form.target_grades.length === 0}
                >
                  {createActivity.isPending ? 'جاري الإنشاء...' : 'إنشاء النشاط'}
                </WsBtn>
              </>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}
