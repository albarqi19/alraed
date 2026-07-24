import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CalendarOff,
  Layers,
  Pen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unplug,
  X,
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
  WsField,
  WsInput,
  WsSelect,
  WsTextarea,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import { SubjectComb, combSummary } from './subjects-ui'
import { DayCard, chip } from './dashboard-ui'

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
  const [selectedId, setSelectedId] = useState<number | null>(null)

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

  const totalSlots = useMemo(
    () => subjects.reduce((sum, s) => sum + (s.weight?.total_slots ?? 0), 0),
    [subjects],
  )
  const activeCount = useMemo(() => subjects.filter((s) => s.status === 'active').length, [subjects])

  /** بطاقة المادة تُشتق من القائمة الحيّة فلا تعرض بيانات قديمة بعد التعديل */
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedId) ?? null,
    [subjects, selectedId],
  )

  const rankedSubjects = useMemo(
    () => [...subjects].sort((a, b) => (b.weight?.total_slots ?? 0) - (a.weight?.total_slots ?? 0)),
    [subjects],
  )
  const maxTotalSlots = Math.max(1, ...subjects.map((subject) => subject.weight?.total_slots ?? 0))

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
    <WsPage className="ws-rich">
      <WsHeader
        title="إدارة المواد"
        badge={meta?.semester_label ?? undefined}
        actions={
          <WsBtn variant="primary" icon={Plus} onClick={openAdd}>
            مادة جديدة
          </WsBtn>
        }
      >
        {/* البحث والفلاتر في شريط العنوان نفسه — لا شريط منفصل تحته */}
        <span className="ws-header__filters">
          <span style={{ position: 'relative' }}>
            <WsInput
              id="subj-q"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اسم المادة أو الوصف"
              aria-label="بحث باسم المادة أو الوصف"
              style={{ width: 'min(230px, 60vw)', paddingInlineStart: 26 }}
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
          </span>
          <WsSelect
            id="subj-st"
            aria-label="فلتر الحالة"
            title="فلتر الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">الكل</option>
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </WsSelect>
          <WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => void refetch()} disabled={isFetching} />
        </span>
      </WsHeader>

      {/* حارس الفصل: يقول «لا أعرف» بدل أن يطلي كل سنٍّ كهرماناً فيقول «الكل معطوب» */}
      {curriculumBlind && !isLoading && (
        <WsAlert tone="warn">
          لا يوجد توزيع منهج محمَّل لـ«{meta?.semester_label ?? 'الفصل الحالي'}» — لا يمكن قياس ارتباط
          المواد بالمنهج، ومعلّمو المدرسة كلهم يفتحون خططهم الأسبوعية بلا مواضيع.
        </WsAlert>
      )}

      <WsLayout>
        <WsMain>
          {/* حصيلة المواد — لغة «نظرة عامة»: باستيل + رقاقة بيضاء + علامة مائية */}
          <WsBlock padded>
            <div className="ws-dashboard-cards">
              <DayCard
                icon={BookOpen}
                label="المواد"
                value={subjects.length}
                tone={TONES.sky}
                hero
                context={`${activeCount} نشطة${subjects.length - activeCount > 0 ? ` · ${subjects.length - activeCount} غير نشطة` : ''}`}
                zeroContext="لم تُسجَّل مواد بعد"
              />
              <DayCard
                icon={Layers}
                label="حصص في الجدول"
                value={totalSlots}
                tone={TONES.green}
                context={`عبر ${totalTeeth} صفاً مُدرَّساً`}
                zeroContext="الجدول فارغ"
              />
              <DayCard
                icon={Unplug}
                label="صفوف بلا توزيع"
                value={gapTeeth ?? 0}
                tone={TONES.amber}
                context={
                  curriculumBlind
                    ? 'لا توزيع منهج محمَّل — لا يمكن القياس'
                    : `من ${totalTeeth} — معلموها يفتحون الخطة فارغة`
                }
                zeroContext={curriculumBlind ? 'لا توزيع منهج محمَّل — لا يمكن القياس' : 'كل الصفوف مرتبطة بالمنهج'}
              />
              <DayCard
                icon={CalendarOff}
                label="مواد بلا حصص"
                value={noSessions}
                tone={TONES.purple}
                context="ليست في جدول الحصص"
                zeroContext="كل المواد مجدولة"
              />
            </div>
          </WsBlock>

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
                    const hasGap = !curriculumBlind && grades.some((g) => !g.has_curriculum)
                    return (
                      <tr
                        key={subject.id}
                        onClick={() => setSelectedId((prev) => (prev === subject.id ? null : subject.id))}
                        className={`is-clickable ${selectedId === subject.id ? 'is-selected' : ''}`}
                        style={hasGap && selectedId !== subject.id ? { background: chip(TONES.amber) } : undefined}
                      >
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
                        <td onClick={(e) => e.stopPropagation()}>
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

        {/* القسم الثاني: بطاقة المادة — ترتيب الثقل افتراضاً، وتشريح المادة عند النقر */}
        <WsSideCol side="end" title="بطاقة المادة" icon={BookOpen} storageKey="ws:subjects:sidecol" width={300}>
          {selectedSubject ? (
            <>
              <WsBlock padded>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{selectedSubject.name}</span>
                  <ToneChip tone={selectedSubject.status === 'active' ? TONES.green : TONES.gray}>
                    {selectedSubject.status === 'active' ? 'نشطة' : 'غير نشطة'}
                  </ToneChip>
                  <WsIconBtn icon={X} label="إغلاق البطاقة" onClick={() => setSelectedId(null)} />
                </div>
                <WsFactsList>
                  <WsFactRow label="الحصص الأسبوعية">
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedSubject.weight?.total_slots ?? 0}</b>
                  </WsFactRow>
                  <WsFactRow label="مهارات التقييم">{selectedSubject.skills_count ?? 0}</WsFactRow>
                  <WsFactRow label="المنهج الوزاري">
                    {selectedSubject.curriculum_subject_name ?? 'بالاسم المحلي'}
                  </WsFactRow>
                </WsFactsList>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <WsBtn icon={Pen} onClick={() => openEdit(selectedSubject)} style={{ flex: 1 }}>
                    تعديل
                  </WsBtn>
                  <WsBtn icon={Trash2} onClick={() => setPendingDelete(selectedSubject)} style={{ flex: 1 }}>
                    حذف
                  </WsBtn>
                </div>
              </WsBlock>

              <WsBlock
                title="صفوفها"
                icon={Layers}
                count={(selectedSubject.weight?.grades.length ?? 0) || undefined}
                fill
                scroll
              >
                {(selectedSubject.weight?.grades.length ?? 0) === 0 ? (
                  <WsEmpty icon={CalendarOff}>ليست في جدول الحصص</WsEmpty>
                ) : (
                  <div>
                    {(selectedSubject.weight?.grades ?? []).map((g) => {
                      const gap = !curriculumBlind && !g.has_curriculum
                      return (
                        <div key={g.grade} style={{ padding: '8px 12px', borderBottom: '1px solid var(--ws-hairline)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{g.grade}</span>
                            {gap && (
                              <Unplug
                                aria-label="بلا توزيع منهج"
                                style={{ width: 14, height: 14, color: TONES.amber.tx, flexShrink: 0 }}
                              />
                            )}
                            <b
                              style={{
                                fontSize: 14,
                                fontVariantNumeric: 'tabular-nums',
                                color: gap ? TONES.amber.tx : TONES.sky.tx,
                              }}
                            >
                              {g.slots}
                            </b>
                          </div>
                          <div
                            style={{
                              height: 6,
                              marginTop: 5,
                              borderRadius: 3,
                              background: 'var(--ws-surface-2)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              className="ws-bar-x"
                              style={{
                                height: '100%',
                                width: `${Math.min(100, Math.round((g.slots / maxSlots) * 100))}%`,
                                background: gap ? TONES.amber.bd : TONES.sky.bd,
                              }}
                            />
                          </div>
                          <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--ws-text-2)' }}>
                            {g.sections} فصول
                            {g.has_curriculum && g.sessions_per_week != null
                              ? ` · المقرر وزارياً: ${g.sessions_per_week}`
                              : ''}
                            {gap ? ' · بلا توزيع منهج' : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </WsBlock>
            </>
          ) : (
            <WsBlock title="أثقل المواد في الجدول" icon={Layers} count={subjects.length || undefined} fill scroll>
              {subjects.length === 0 ? (
                <WsEmpty icon={BookOpen}>لا مواد بعد</WsEmpty>
              ) : (
                <div>
                  {rankedSubjects.map((subject, i) => (
                    <button
                      key={subject.id}
                      type="button"
                      className="ws-rankrow"
                      onClick={() => setSelectedId(subject.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        cursor: 'pointer',
                        font: 'inherit',
                        textAlign: 'start',
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          flexShrink: 0,
                          fontSize: 12.5,
                          color: 'var(--ws-text-2)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13.5,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {subject.name}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            height: 6,
                            marginTop: 4,
                            borderRadius: 3,
                            background: 'var(--ws-surface-2)',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            className="ws-bar-x"
                            style={{
                              display: 'block',
                              height: '100%',
                              width: `${Math.round(((subject.weight?.total_slots ?? 0) / maxTotalSlots) * 100)}%`,
                              background: TONES.sky.bd,
                              animationDelay: `${i * 35}ms`,
                            }}
                          />
                        </span>
                      </span>
                      <b
                        style={{
                          fontSize: 14,
                          fontVariantNumeric: 'tabular-nums',
                          color: TONES.sky.tx,
                          flexShrink: 0,
                        }}
                      >
                        {subject.weight?.total_slots ?? 0}
                      </b>
                    </button>
                  ))}
                  <p style={{ margin: 0, padding: '8px 12px', fontSize: 12, color: 'var(--ws-text-2)' }}>
                    حصص كل مادة في جدول الحصص — اضغط مادةً لفتح بطاقتها.
                  </p>
                </div>
              )}
            </WsBlock>
          )}
        </WsSideCol>
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
