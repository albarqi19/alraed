import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CalendarOff,
  Pen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unplug,
} from 'lucide-react'
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useSubjectsWithMetaQuery,
  useUpdateSubjectMutation,
} from '../hooks'
import type { SubjectRecord } from '../types'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsTextarea,
  WsLayout,
  WsMain,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import { SubjectComb, combSummary } from './subjects-ui'

type SubjectStatus = SubjectRecord['status']
type StatusFilter = 'all' | SubjectStatus

interface SubjectFormValues {
  name: string
  name_en: string
  description: string
  status: SubjectStatus
}

const EMPTY_FORM: SubjectFormValues = { name: '', name_en: '', description: '', status: 'active' }

export function AdminSubjectsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null)
  const [form, setForm] = useState<SubjectFormValues>(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState<SubjectRecord | null>(null)

  const { data, isLoading, isFetching, isError, refetch } = useSubjectsWithMetaQuery()

  const subjects = useMemo(() => data?.data ?? [], [data])
  const meta = data?.meta
  const curriculumBlind = meta?.curriculum_blind ?? false

  const createSubjectMutation = useCreateSubjectMutation()
  const updateSubjectMutation = useUpdateSubjectMutation()
  const deleteSubjectMutation = useDeleteSubjectMutation()

  /**
   * المقام من `subjects` كاملةً لا من المفلترة: لو اشتُقّ من المفلترة لتمدّدت
   * الأشرطة كلما كتب المدير حرفاً في البحث — مقامٌ متحرّك.
   * وهو «أثقل خلية في هذه المدرسة»، فلكل مدرسة سلّمها — والمقارنة بين
   * مدرستين لا معنى لها أصلاً.
   */
  const maxSlots = useMemo(
    () => Math.max(1, ...subjects.flatMap((s) => s.weight?.grades.map((g) => g.slots) ?? [0])),
    [subjects],
  )

  // تحت العمى لا أحد «بلا توزيع» — فالحقيقة تُخمَد مع المحور
  const gapTeeth = useMemo(() => {
    if (curriculumBlind) return null
    return subjects.reduce(
      (sum, s) => sum + (s.weight?.grades.filter((g) => !g.has_curriculum).length ?? 0),
      0,
    )
  }, [subjects, curriculumBlind])

  const totalTeeth = useMemo(
    () => subjects.reduce((sum, s) => sum + (s.weight?.grades.length ?? 0), 0),
    [subjects],
  )

  const noSessions = useMemo(
    () => subjects.filter((s) => (s.weight?.grades.length ?? 0) === 0).length,
    [subjects],
  )

  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return subjects.filter((subject) => {
      const matchesQuery = !query
        ? true
        : [subject.name, subject.name_en ?? '', subject.description ?? '']
            .map((value) => value?.toLowerCase?.() ?? '')
            .some((value) => value.includes(query))
      const matchesStatus = statusFilter === 'all' ? true : subject.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [subjects, searchTerm, statusFilter])

  const openAdd = () => {
    setEditingSubject(null)
    setForm(EMPTY_FORM)
    setIsFormOpen(true)
  }

  const openEdit = (subject: SubjectRecord) => {
    setEditingSubject(subject)
    setForm({
      name: subject.name,
      name_en: subject.name_en ?? '',
      description: subject.description ?? '',
      status: subject.status,
    })
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingSubject(null)
  }

  const submitForm = () => {
    const payload = {
      name: form.name,
      name_en: form.name_en,
      description: form.description || null,
      status: form.status,
    }
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, payload }, { onSuccess: closeForm })
    } else {
      createSubjectMutation.mutate(payload, { onSuccess: closeForm })
    }
  }

  const isSaving = createSubjectMutation.isPending || updateSubjectMutation.isPending

  return (
    <WsPage>
      <WsHeader
        title="إدارة المواد"
        badge={meta?.semester_label ?? undefined}
        actions={
          <WsBtn variant="primary" icon={Plus} onClick={openAdd}>
            مادة جديدة
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={BookOpen} label="مادة">{subjects.length}</WsFact>
            <WsFact icon={Unplug} label="صفوف بلا توزيع">
              {gapTeeth == null ? (
                <span style={{ color: 'var(--ws-text-2)' }} title="لا توزيع محمَّل — لا يمكن القياس">
                  —
                </span>
              ) : (
                <>
                  <span style={{ color: gapTeeth > 0 ? TONES.amber.tx : undefined }}>{gapTeeth}</span>
                  <span style={{ color: 'var(--ws-text-2)' }}> من {totalTeeth}</span>
                </>
              )}
            </WsFact>
            <WsFact icon={CalendarOff} label="بلا حصص">{noSessions}</WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="بحث" htmlFor="subj-q" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              id="subj-q"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اسم المادة أو الوصف"
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search
              style={{
                width: 13,
                height: 13,
                position: 'absolute',
                insetInlineStart: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ws-text-2)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </WsField>
        <WsField label="الحالة" htmlFor="subj-st">
          <WsSelect
            id="subj-st"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">الكل</option>
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </WsSelect>
        </WsField>
        <WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => void refetch()} disabled={isFetching} />
      </WsToolbar>

      {/* حارس الفصل: يقول «لا أعرف» بدل أن يطلي كل سنٍّ كهرماناً فيقول «الكل معطوب» */}
      {curriculumBlind && !isLoading && (
        <WsAlert tone="warn">
          لا يوجد توزيع منهج محمَّل لـ«{meta?.semester_label ?? 'الفصل الحالي'}» — لا يمكن قياس ارتباط
          المواد بالمنهج، ومعلّمو المدرسة كلهم يفتحون خططهم الأسبوعية بلا مواضيع.
        </WsAlert>
      )}

      <WsLayout>
        <WsMain>
          <WsBlock fill scroll title="المواد" icon={BookOpen} count={filteredSubjects.length}>
            {isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل المواد.
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>
                    إعادة المحاولة
                  </WsBtn>
                </WsAlert>
              </div>
            ) : isLoading ? (
              <WsEmpty loading>جارٍ تحميل المواد...</WsEmpty>
            ) : filteredSubjects.length === 0 ? (
              <WsEmpty icon={BookOpen}>
                {subjects.length === 0 ? 'لا مواد مسجّلة' : 'لا مواد مطابقة للبحث'}
              </WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th style={{ width: 150 }}>مِشط المادة</th>
                    <th style={{ width: 120 }}>المنهج الوزاري</th>
                    <th style={{ width: 64 }}>الحصص</th>
                    <th style={{ width: 84 }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((subject) => {
                    const grades = subject.weight?.grades ?? []
                    return (
                      <tr key={subject.id}>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{subject.name}</span>
                            {subject.status === 'inactive' && <ToneChip tone={TONES.gray}>غير نشطة</ToneChip>}
                          </span>
                          <span className="ws-cell-sub">
                            {subject.name_en ? `${subject.name_en} · ` : ''}
                            {combSummary(grades, curriculumBlind)}
                          </span>
                        </td>
                        <td>
                          <SubjectComb grades={grades} maxSlots={maxSlots} curriculumBlind={curriculumBlind} />
                        </td>
                        <td>
                          {/* curriculum_subject_name يصل في كل صف ولم يُقرأ في الفرونت قط */}
                          {subject.curriculum_subject_name ? (
                            <span
                              style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={subject.curriculum_subject_name}
                            >
                              {subject.curriculum_subject_name}
                            </span>
                          ) : (
                            <span
                              style={{ color: 'var(--ws-text-2)', fontSize: 11 }}
                              title="لا اسم وزاري مربوط — تُطابَق بالاسم المحلي كما هو"
                            >
                              بالاسم المحلي
                            </span>
                          )}
                        </td>
                        <td>
                          <b>{subject.weight?.total_slots ?? 0}</b>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', gap: 3 }}>
                            <WsIconBtn icon={Pen} label="تعديل" onClick={() => openEdit(subject)} />
                            <WsIconBtn icon={Trash2} label="حذف" onClick={() => setPendingDelete(subject)} />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* نموذج الإضافة/التعديل */}
      {isFormOpen && (
        <div className="ws-modal" onClick={closeForm}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">{editingSubject ? `تعديل «${editingSubject.name}»` : 'مادة جديدة'}</h3>
              <p className="ws-modal__sub">الاسم العربي والإنجليزي مطلوبان وفريدان</p>
            </header>
            <div className="ws-modal__body">
              <WsField label="اسم المادة" htmlFor="f-name">
                <WsInput
                  id="f-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="مثال: الرياضيات"
                />
              </WsField>
              <WsField label="الاسم بالإنجليزية" htmlFor="f-name-en">
                <WsInput
                  id="f-name-en"
                  value={form.name_en}
                  onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                  placeholder="Mathematics"
                  dir="ltr"
                />
              </WsField>
              <WsField label="الوصف (اختياري)" htmlFor="f-desc">
                <WsTextarea
                  id="f-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </WsField>
              <WsField label="الحالة" htmlFor="f-status">
                <WsSelect
                  id="f-status"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as SubjectStatus }))}
                >
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                </WsSelect>
                {form.status === 'inactive' && (
                  <p style={{ margin: '4px 0 0', fontSize: 10.5, color: TONES.amber.tx }}>
                    المادة غير النشطة تختفي من بانِي الجداول
                  </p>
                )}
              </WsField>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={closeForm}>إلغاء</WsBtn>
              <WsBtn
                variant="primary"
                onClick={submitForm}
                disabled={isSaving || !form.name.trim() || !form.name_en.trim()}
              >
                {isSaving ? 'جارٍ الحفظ...' : editingSubject ? 'حفظ' : 'إضافة'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}

      {/* مودال الحذف — يقول ما سيتهدّم قبل أن يقع */}
      {pendingDelete && (
        <div className="ws-modal" onClick={() => setPendingDelete(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف «{pendingDelete.name}»</h3>
              <p className="ws-modal__sub">هذا الإجراء نهائي</p>
            </header>
            <div className="ws-modal__body">
              {(pendingDelete.weight?.total_slots ?? 0) > 0 ? (
                <WsAlert tone="warn" boxed icon={AlertTriangle}>
                  لهذه المادة {pendingDelete.weight?.total_slots} حصة في الجدول — سيرفض الخادم الحذف حتى
                  تُزال حصصها أولاً.
                </WsAlert>
              ) : (
                <WsAlert tone="warn" boxed>لا حصص لهذه المادة في الجدول.</WsAlert>
              )}
              {/* السلسلة محفورة cascadeOnDelete: مهارات ← تقييمات الطلاب.
                  والحارس في destroy() يفحص الحصص ولا يفحص المهارات إطلاقاً. */}
              {(pendingDelete.skills_count ?? 0) > 0 && (
                <WsAlert tone="error" boxed>
                  سيُحذف معها {pendingDelete.skills_count} مهارة وكل تقييمات الطلاب عليها.
                </WsAlert>
              )}
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setPendingDelete(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                disabled={deleteSubjectMutation.isPending}
                onClick={() => {
                  deleteSubjectMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
                }}
              >
                حذف نهائي
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}
