import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsInput,
  WsSelect,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsLayout,
  WsMain,
} from '@/shared/workspace'
import { DayCard, chip } from './dashboard-ui'
import { useYearScope, YearScopeSelect, YearScopeEmptyNote } from '@/modules/admin/academic-years'
import { useAdminGuidanceCases, useAdminGuidanceStats, useAdminGuidanceCaseMutations } from '../api/guidance-hooks'
import { TONES, SEVERITY_META, STATUS_META, categoryTone, ToneChip, SeverityBadge, InitialAvatar } from './student-cases-ui'
import type { GuidanceCaseFilters } from '@/modules/guidance/types'

type Severity = 'low' | 'medium' | 'high' | 'critical'
type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'
type ViewMode = 'cards' | 'table'

const VIEW_MODE_STORAGE_KEY = 'student_cases_view_mode'

const CATEGORIES = ['سلوكية', 'أكاديمية', 'اجتماعية', 'نفسية', 'صحية', 'أخرى']

const getSavedViewMode = (): ViewMode => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (saved && ['cards', 'table'].includes(saved)) return saved as ViewMode
  } catch (e) { /* ignore */ }
  return 'table'
}

export function StudentCasesPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode)
  const [filters, setFilters] = useState<GuidanceCaseFilters>({ page: 1, per_page: 20 })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { scope: yearScope, setScope: setYearScope } = useYearScope()

  const { data: stats } = useAdminGuidanceStats(yearScope)
  const { data: casesData, isLoading, error } = useAdminGuidanceCases({
    ...filters,
    academic_year: yearScope,
  })
  const { deleteCase } = useAdminGuidanceCaseMutations()

  // حفظ وضع العرض
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode) } catch (e) { /* ignore */ }
  }, [viewMode])

  const updateFilter = <K extends keyof GuidanceCaseFilters>(key: K, value: GuidanceCaseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => setFilters({ page: 1, per_page: 20 })

  const hasActiveFilters = filters.search || filters.status || filters.severity || filters.category

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirm === id) {
      try {
        await deleteCase.mutateAsync(id)
        setDeleteConfirm(null)
      } catch (error) {
        console.error('Failed to delete case:', error)
      }
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/admin/student-cases/${id}/edit`)
  }

  const pagination = casesData && casesData.last_page > 1 && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>
        {((casesData.current_page - 1) * casesData.per_page) + 1}–{Math.min(casesData.current_page * casesData.per_page, casesData.total)} من {casesData.total}
      </span>
      <WsIconBtn
        icon={ChevronRight}
        label="الصفحة السابقة"
        disabled={casesData.current_page === 1}
        onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
      />
      <b style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{casesData.current_page} / {casesData.last_page}</b>
      <WsIconBtn
        icon={ChevronLeft}
        label="الصفحة التالية"
        disabled={casesData.current_page === casesData.last_page}
        onClick={() => updateFilter('page', Math.min(casesData.last_page, (filters.page || 1) + 1))}
      />
    </span>
  )

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="الحالات الطلابية"
        badge="الإرشاد الطلابي"
        actions={
          <>
            <YearScopeSelect scope={yearScope} onChange={setYearScope} />
            <WsBtn variant="primary" icon={Plus} onClick={() => navigate('/admin/student-cases/new')}>حالة جديدة</WsBtn>
          </>
        }
      >
        {/* التبديل والبحث والفلاتر في شريط العنوان نفسه — لا شريط منفصل تحته */}
        <div className="ws-header__filters">
          <div className="ws-seg">
            <button
              type="button"
              className={`ws-seg__btn ${viewMode === 'table' ? 'is-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Table2 style={{ width: 13, height: 13 }} /> جدول
            </button>
            <button
              type="button"
              className={`ws-seg__btn ${viewMode === 'cards' ? 'is-active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid style={{ width: 13, height: 13 }} /> بطاقات
            </button>
          </div>

          <span style={{ position: 'relative' }}>
            <WsInput
              type="search"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
              placeholder="ابحث عن حالة (اسم الطالب، العنوان، رقم الحالة)..."
              aria-label="بحث في الحالات الطلابية"
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
            aria-label="فلتر الأولوية"
            title="فلتر الأولوية"
            value={filters.severity || ''}
            onChange={(e) => updateFilter('severity', e.target.value || undefined)}
          >
            <option value="">كل الأولويات</option>
            {(Object.keys(SEVERITY_META) as Severity[]).map((sev) => (
              <option key={sev} value={sev}>{SEVERITY_META[sev].label}</option>
            ))}
          </WsSelect>

          <WsSelect
            aria-label="فلتر التصنيف"
            title="فلتر التصنيف"
            value={filters.category || ''}
            onChange={(e) => updateFilter('category', e.target.value || undefined)}
          >
            <option value="">كل التصنيفات</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </WsSelect>

          {/* رقاقات الحالة — تلبس نغمتها عند التفعيل */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {(Object.keys(STATUS_META) as CaseStatus[]).map((status) => {
              const meta = STATUS_META[status]
              const isActive = filters.status === status
              return (
                <button
                  key={status}
                  type="button"
                  className="ws-chip"
                  onClick={() => updateFilter('status', isActive ? undefined : status)}
                  style={isActive
                    ? { background: meta.tone.bg, borderColor: meta.tone.tx, color: meta.tone.tx, boxShadow: `0 0 0 1px ${meta.tone.tx}` }
                    : undefined}
                >
                  {meta.label}
                </button>
              )
            })}
          </span>

          {hasActiveFilters && (
            <WsBtn size="sm" icon={X} onClick={clearFilters}>مسح الفلاتر</WsBtn>
          )}
        </div>
      </WsHeader>

      <WsLayout>
        <WsMain>
          {/* حصيلة الإرشاد — لغة الإغناء: باستيل + رقاقة بيضاء + علامة مائية */}
          {stats && (
            <WsBlock padded>
              <div className="ws-dashboard-cards">
                <DayCard
                  icon={FolderOpen}
                  label="حالات مفتوحة"
                  value={stats.open_cases}
                  tone={TONES.sky}
                  hero
                  context="بين يدي المرشد الآن"
                  zeroContext="لا حالات مفتوحة"
                />
                <DayCard
                  icon={Activity}
                  label="قيد المعالجة"
                  value={stats.by_status.in_progress || 0}
                  tone={TONES.purple}
                  context="خطتها تُنفَّذ الآن"
                  zeroContext="لا حالات تحت المعالجة"
                />
                <DayCard
                  icon={CalendarClock}
                  label="متابعات متأخرة"
                  value={stats.overdue_followups}
                  tone={TONES.red}
                  context="تجاوزت موعدها المحدد"
                  zeroContext="كل المتابعات في وقتها"
                />
                <DayCard
                  icon={CheckCircle2}
                  label="مغلقة"
                  value={stats.by_status.closed || 0}
                  tone={TONES.green}
                  context="أُنهيت وأُرشفت"
                  zeroContext="لم تُغلق أي حالة بعد"
                />
              </div>
            </WsBlock>
          )}

          {error ? (
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>
            خطأ في تحميل البيانات: {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
          </WsAlert>
        </WsBlock>
      ) : (
        <WsBlock
          fill
          title="سجل الحالات"
          icon={FolderOpen}
          count={casesData?.total ?? '—'}
          tools={pagination}
        >
          {isLoading ? (
            <WsEmpty loading>جاري تحميل الحالات...</WsEmpty>
          ) : !casesData || casesData.data.length === 0 ? (
            <WsEmpty icon={FolderOpen}>
              <p style={{ margin: 0 }}>لا توجد حالات{hasActiveFilters ? ' مطابقة للفلاتر' : ' في هذا العام'}</p>
              {!hasActiveFilters && (
                <>
                  <WsBtn variant="primary" size="sm" icon={Plus} onClick={() => navigate('/admin/student-cases/new')} style={{ marginTop: 8 }}>
                    إنشاء أول حالة
                  </WsBtn>
                  <YearScopeEmptyNote scope={yearScope} onShowAll={() => setYearScope('all')} />
                </>
              )}
            </WsEmpty>
          ) : viewMode === 'table' ? (
            <WsTable>
              <thead>
                <tr>
                  <th>رقم الحالة</th>
                  <th>الطالب</th>
                  <th>العنوان</th>
                  <th>التصنيف</th>
                  <th>الأولوية</th>
                  <th>الحالة</th>
                  <th>آخر نشاط</th>
                  <th style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody className="ws-tbl-rise">
                {casesData.data.map((caseItem) => {
                  const st = STATUS_META[caseItem.status]
                  const catTone = categoryTone(caseItem.category)
                  return (
                    <tr
                      key={caseItem.id}
                      className="is-clickable"
                      onClick={() => navigate(`/admin/student-cases/${caseItem.id}`)}
                      style={
                        caseItem.severity === 'critical' || caseItem.severity === 'high'
                          ? { background: chip(SEVERITY_META[caseItem.severity].tone) }
                          : undefined
                      }
                    >
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{caseItem.case_number}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <InitialAvatar name={caseItem.student.name} tone={catTone} size={24} />
                          <span>
                            <span style={{ display: 'block', fontWeight: 600 }}>{caseItem.student.name}</span>
                            <span className="ws-cell-sub">{caseItem.student.grade} - {caseItem.student.class_name}</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {caseItem.title}
                        </span>
                      </td>
                      <td><ToneChip tone={catTone}>{caseItem.category}</ToneChip></td>
                      <td><SeverityBadge severity={caseItem.severity} /></td>
                      <td><ToneChip tone={st.tone}>{st.label}</ToneChip></td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ws-text-2)' }}>
                        {caseItem.last_activity_at ? new Date(caseItem.last_activity_at).toLocaleDateString('ar-SA-u-nu-latn') : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <WsIconBtn icon={Pencil} label="تعديل" onClick={(e) => handleEdit(caseItem.id, e)} />
                          <WsIconBtn
                            icon={Trash2}
                            label={deleteConfirm === caseItem.id ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}
                            onClick={(e) => handleDelete(caseItem.id, e)}
                            style={deleteConfirm === caseItem.id
                              ? { background: TONES.red.tx, borderColor: TONES.red.tx, color: '#fff' }
                              : { color: TONES.red.tx }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </WsTable>
          ) : (
            <div className="ws-block__scroll">
              <div
                className="ws-cardgrid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 10,
                  padding: 12,
                }}
              >
                {casesData.data.map((caseItem) => {
                  const sev = SEVERITY_META[caseItem.severity]
                  const st = STATUS_META[caseItem.status]
                  const catTone = categoryTone(caseItem.category)
                  return (
                    <div
                      key={caseItem.id}
                      onClick={() => navigate(`/admin/student-cases/${caseItem.id}`)}
                      style={{
                        border: `1px solid ${sev.tone.bd}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        /* البطاقة تلبس أولويتها — باستيل تينت-60 بلغة الإغناء */
                        background: chip(sev.tone),
                        /* الانتقال (حدود + رفعة تحويم) يديره صنف ws-cardgrid */
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = sev.tone.tx }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = sev.tone.bd }}
                    >
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <InitialAvatar name={caseItem.student.name} tone={catTone} size={30} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {caseItem.student.name}
                              </span>
                              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ws-text-2)' }}>{caseItem.case_number}</span>
                            </span>
                          </div>
                          <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                            <WsIconBtn icon={Pencil} label="تعديل" onClick={(e) => handleEdit(caseItem.id, e)} />
                            <WsIconBtn
                              icon={Trash2}
                              label={deleteConfirm === caseItem.id ? 'اضغط للتأكيد' : 'حذف'}
                              onClick={(e) => handleDelete(caseItem.id, e)}
                              style={deleteConfirm === caseItem.id
                                ? { background: TONES.red.tx, borderColor: TONES.red.tx, color: '#fff' }
                                : { color: TONES.red.tx }}
                            />
                          </span>
                        </div>

                        <p
                          style={{
                            margin: '8px 0 8px',
                            fontSize: 13,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={caseItem.title}
                        >
                          {caseItem.title}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <ToneChip tone={st.tone}>{st.label}</ToneChip>
                          <ToneChip tone={catTone}>{caseItem.category}</ToneChip>
                          <span style={{ display: 'inline-flex', marginInlineStart: 'auto' }}>
                            <SeverityBadge severity={caseItem.severity} />
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid var(--ws-hairline)',
                            fontSize: 11.5,
                            color: 'var(--ws-text-2)',
                          }}
                        >
                          <span>{caseItem.student.grade} - {caseItem.student.class_name}</span>
                          <span>{caseItem.last_activity_at ? new Date(caseItem.last_activity_at).toLocaleDateString('ar-SA-u-nu-latn') : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </WsBlock>
      )}
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}
