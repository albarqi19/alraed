import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileEdit,
  LayoutGrid,
  List,
  PauseCircle,
  Plus,
  Search,
  Table2,
  Target,
  X,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsProgress,
} from '@/shared/workspace'
import { useYearScope, YearScopeSelect, YearScopeEmptyNote } from '@/modules/admin/academic-years'
import { useAdminTreatmentPlans, useAdminGuidanceStudents } from '../api/guidance-hooks'
import { TONES, ToneChip, InitialAvatar } from './student-cases-ui'
import { PLAN_STATUS_META, PROBLEM_META, ProgressRing, DaysRemainingChip } from './treatment-plans-ui'
import type { TreatmentPlanFilters, ProblemType, TreatmentPlanStatus, TreatmentPlan } from '@/modules/guidance/types'

const PROBLEM_TYPES: ProblemType[] = ['سلوكية', 'دراسية', 'نفسية', 'اجتماعية', 'صحية', 'مختلطة']
const STATUSES: TreatmentPlanStatus[] = ['draft', 'active', 'suspended', 'completed', 'cancelled', 'on_hold']

type ViewMode = 'cards' | 'table' | 'compact'

// مفتاح حفظ وضع العرض في localStorage
const VIEW_MODE_STORAGE_KEY = 'treatment_plans_view_mode'

// قراءة وضع العرض المحفوظ
const getSavedViewMode = (): ViewMode => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (saved && ['cards', 'table', 'compact'].includes(saved)) {
      return saved as ViewMode
    }
  } catch (e) {
    // في حالة عدم توفر localStorage
  }
  return 'cards'
}

export function TreatmentPlansPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode)
  const [filters, setFilters] = useState<TreatmentPlanFilters>({
    page: 1,
    per_page: 20,
  })

  // حفظ وضع العرض عند تغييره
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    } catch (e) {
      // في حالة عدم توفر localStorage
    }
  }, [viewMode])

  const { scope: yearScope, setScope: setYearScope } = useYearScope()

  /* الخادمُ يقصّ بالتقاطع لا بالبداية: خطّةٌ بدأت قبل العام وما تزال جارية
     تظهر في عامها وفي هذا معاً — وهي على مكتب المرشد فعلاً. */
  const { data: plansData, isLoading, error } = useAdminTreatmentPlans({
    ...filters,
    academic_year: yearScope,
  })
  const { data: students } = useAdminGuidanceStudents()

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const plans: TreatmentPlan[] = (plansData?.data as unknown as TreatmentPlan[]) || []
    return {
      total: plansData?.total || 0,
      active: plans.filter((p: TreatmentPlan) => p.status === 'active').length,
      completed: plans.filter((p: TreatmentPlan) => p.status === 'completed').length,
      suspended: plans.filter((p: TreatmentPlan) => p.status === 'suspended').length,
      draft: plans.filter((p: TreatmentPlan) => p.status === 'draft').length,
    }
  }, [plansData])

  // حساب نسبة تحقق الأهداف
  const getGoalProgress = (plan: TreatmentPlan) => {
    if (!plan.goals || plan.goals.length === 0) return 0
    const achieved = plan.goals.filter(g => g.status === 'achieved').length
    return Math.round((achieved / plan.goals.length) * 100)
  }

  const clearFilters = () => {
    setFilters({ page: 1, per_page: 20 })
  }

  const hasActiveFilters = filters.problem_type || filters.status || filters.student_id || filters.search

  const plans = ((plansData?.data as unknown) as TreatmentPlan[] | undefined) || []

  const pagination = plansData && plansData.last_page > 1 && (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
        {((plansData.current_page - 1) * plansData.per_page) + 1}–{Math.min(plansData.current_page * plansData.per_page, plansData.total)} من {plansData.total}
      </span>
      <WsIconBtn
        icon={ChevronRight}
        label="الصفحة السابقة"
        disabled={filters.page === 1}
        onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
      />
      {Array.from({ length: Math.min(5, plansData.last_page) }, (_, i) => {
        const page = i + 1
        const isCurrent = filters.page === page
        return (
          <button
            key={page}
            type="button"
            className="ws-icon-btn"
            onClick={() => setFilters({ ...filters, page })}
            style={isCurrent ? { background: 'var(--ws-accent)', borderColor: 'var(--ws-accent)', color: '#fff', fontWeight: 800 } : { fontWeight: 700 }}
          >
            {page}
          </button>
        )
      })}
      <WsIconBtn
        icon={ChevronLeft}
        label="الصفحة التالية"
        disabled={filters.page === plansData.last_page}
        onClick={() => setFilters({ ...filters, page: Math.min(plansData.last_page, (filters.page || 1) + 1) })}
      />
    </span>
  )

  return (
    <WsPage>
      <WsHeader
        title="الخطط العلاجية"
        badge="الإرشاد الطلابي"
        actions={
          <>
            <YearScopeSelect scope={yearScope} onChange={setYearScope} />
            <WsBtn variant="primary" icon={Plus} onClick={() => navigate('/admin/treatment-plans/new')}>خطة جديدة</WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardList} label="إجمالي الخطط">{stats.total}</WsFact>
            <WsFact icon={Activity} label="نشطة">
              <span style={{ color: TONES.green.tx }}>{stats.active}</span>
            </WsFact>
            <WsFact icon={CheckCircle2} label="مكتملة">
              <span style={{ color: TONES.sky.tx }}>{stats.completed}</span>
            </WsFact>
            <WsFact icon={PauseCircle} label="معلقة">
              <span style={{ color: TONES.amber.tx }}>{stats.suspended}</span>
            </WsFact>
            <WsFact icon={FileEdit} label="مسودة">{stats.draft}</WsFact>
          </>
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          <button
            type="button"
            className={`ws-seg__btn ${viewMode === 'cards' ? 'is-active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid style={{ width: 13, height: 13 }} /> بطاقات
          </button>
          <button
            type="button"
            className={`ws-seg__btn ${viewMode === 'table' ? 'is-active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <Table2 style={{ width: 13, height: 13 }} /> جدول
          </button>
          <button
            type="button"
            className={`ws-seg__btn ${viewMode === 'compact' ? 'is-active' : ''}`}
            onClick={() => setViewMode('compact')}
          >
            <List style={{ width: 13, height: 13 }} /> مختصر
          </button>
        </div>

        <WsField label="بحث" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              placeholder="ابحث عن خطة علاجية..."
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

        <WsField label="نوع المشكلة">
          <WsSelect
            value={filters.problem_type || ''}
            onChange={(e) => setFilters({ ...filters, problem_type: e.target.value ? (e.target.value as ProblemType) : undefined })}
          >
            <option value="">الكل</option>
            {PROBLEM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="الطالب">
          <WsSelect
            value={filters.student_id || ''}
            onChange={(e) => setFilters({ ...filters, student_id: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">الكل</option>
            {students?.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="الحالة">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {STATUSES.filter((s) => s !== 'on_hold').map((status) => {
              const meta = PLAN_STATUS_META[status]
              const isActive = filters.status === status
              return (
                <button
                  key={status}
                  type="button"
                  className="ws-chip"
                  onClick={() => setFilters({ ...filters, status: filters.status === status ? undefined : status })}
                  style={isActive
                    ? { background: meta.tone.bg, borderColor: meta.tone.tx, color: meta.tone.tx, boxShadow: `0 0 0 1px ${meta.tone.tx}` }
                    : undefined}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </WsField>

        {hasActiveFilters && (
          <WsBtn size="sm" icon={X} onClick={clearFilters}>مسح الفلاتر</WsBtn>
        )}
      </WsToolbar>

      {error ? (
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>تعذر تحميل الخطط العلاجية. يرجى المحاولة مرة أخرى.</WsAlert>
        </WsBlock>
      ) : (
        <WsBlock
          fill
          title="سجل الخطط"
          icon={ClipboardList}
          count={plansData?.total ?? '—'}
          tools={pagination}
        >
          {isLoading ? (
            <WsEmpty loading>جاري تحميل الخطط العلاجية...</WsEmpty>
          ) : plans.length === 0 ? (
            <WsEmpty icon={ClipboardList}>
              <p style={{ margin: 0 }}>لا توجد خطط علاجية{hasActiveFilters ? ' مطابقة للفلاتر' : ' في هذا العام'}</p>
              {!hasActiveFilters && (
                <WsBtn variant="primary" size="sm" icon={Plus} onClick={() => navigate('/admin/treatment-plans/new')} style={{ marginTop: 8 }}>
                  إنشاء خطة علاجية
                </WsBtn>
              )}
              <YearScopeEmptyNote scope={yearScope} onShowAll={() => setYearScope('all')} />
            </WsEmpty>
          ) : viewMode === 'cards' ? (
            <div className="ws-block__scroll">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: 10,
                  padding: 12,
                }}
              >
                {plans.map((plan: TreatmentPlan) => {
                  const progress = getGoalProgress(plan)
                  const statusMeta = PLAN_STATUS_META[plan.status as TreatmentPlanStatus] ?? PLAN_STATUS_META.draft
                  const problemMeta = PROBLEM_META[plan.problem_type as ProblemType] ?? PROBLEM_META.مختلطة
                  const ProblemIcon = problemMeta.icon
                  return (
                    <div
                      key={plan.id}
                      onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                      style={{
                        border: '1px solid var(--ws-border)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        background: `linear-gradient(to bottom, ${statusMeta.tone.bg}, var(--ws-surface) 34%)`,
                        transition: 'border-color 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ws-accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ws-border)' }}
                    >
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <InitialAvatar name={plan.student?.name || 'ط'} tone={problemMeta.tone} size={30} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {plan.student?.name || `طالب #${plan.student_id}`}
                              </span>
                              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                {(plan as any).plan_number || `TP-${plan.id}`}
                              </span>
                            </span>
                          </div>
                          <ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
                          {/* حلقة التقدم — توقيع الصفحة */}
                          <ProgressRing value={progress} size={46} title={`تقدم الأهداف: ${progress}%`} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span className="ws-chip" style={{ background: problemMeta.tone.bg, borderColor: problemMeta.tone.bd, color: problemMeta.tone.tx, marginBottom: 4 }}>
                              <ProblemIcon style={{ width: 11, height: 11 }} />
                              {plan.problem_type}
                            </span>
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: 11.5,
                                color: 'var(--ws-text-2)',
                                lineHeight: 1.6,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {plan.problem_description}
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 8,
                            borderTop: '1px solid var(--ws-hairline)',
                            fontSize: 10.5,
                            color: 'var(--ws-text-2)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Target style={{ width: 11, height: 11 }} />
                              {plan.goals?.length || 0} أهداف
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CalendarClock style={{ width: 11, height: 11 }} />
                              {plan.followups?.length || 0} متابعات
                            </span>
                          </span>
                          <DaysRemainingChip endDate={plan.end_date} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <WsTable>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>نوع المشكلة</th>
                  <th>الحالة</th>
                  <th>التقدم</th>
                  <th>تاريخ البدء</th>
                  <th>المتبقي</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan: TreatmentPlan) => {
                  const progress = getGoalProgress(plan)
                  const statusMeta = PLAN_STATUS_META[plan.status as TreatmentPlanStatus] ?? PLAN_STATUS_META.draft
                  const problemMeta = PROBLEM_META[plan.problem_type as ProblemType] ?? PROBLEM_META.مختلطة
                  return (
                    <tr
                      key={plan.id}
                      className="is-clickable"
                      onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <InitialAvatar name={plan.student?.name || 'ط'} tone={problemMeta.tone} size={24} />
                          <span>
                            <span style={{ display: 'block', fontWeight: 600 }}>{plan.student?.name || `طالب #${plan.student_id}`}</span>
                            <span className="ws-cell-sub">{(plan as any).plan_number || `TP-${plan.id}`}</span>
                          </span>
                        </div>
                      </td>
                      <td><ToneChip tone={problemMeta.tone}>{plan.problem_type}</ToneChip></td>
                      <td><ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip></td>
                      <td style={{ minWidth: 130 }}>
                        <WsProgress value={progress} label={`${progress}%`} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ws-text-2)' }}>
                        {new Date(plan.start_date).toLocaleDateString('ar-SA-u-nu-latn')}
                      </td>
                      <td><DaysRemainingChip endDate={plan.end_date} /></td>
                      <td>
                        <ChevronLeft style={{ width: 14, height: 14, color: 'var(--ws-text-2)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </WsTable>
          ) : (
            <div className="ws-block__scroll">
              {plans.map((plan: TreatmentPlan) => {
                const progress = getGoalProgress(plan)
                const statusMeta = PLAN_STATUS_META[plan.status as TreatmentPlanStatus] ?? PLAN_STATUS_META.draft
                const problemMeta = PROBLEM_META[plan.problem_type as ProblemType] ?? PROBLEM_META.مختلطة
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ws-surface-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <ProgressRing value={progress} size={34} stroke={4} title={`تقدم الأهداف: ${progress}%`} />
                    <InitialAvatar name={plan.student?.name || 'ط'} tone={problemMeta.tone} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{plan.student?.name || `طالب #${plan.student_id}`}</span>
                        <ToneChip tone={problemMeta.tone}>{plan.problem_type}</ToneChip>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plan.problem_description}
                      </p>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--ws-text-2)', flexShrink: 0 }}>
                      <Target style={{ width: 11, height: 11 }} />
                      {plan.goals?.length || 0}
                    </span>
                    <ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip>
                    <ChevronLeft style={{ width: 14, height: 14, color: 'var(--ws-text-2)', flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          )}
        </WsBlock>
      )}
    </WsPage>
  )
}
