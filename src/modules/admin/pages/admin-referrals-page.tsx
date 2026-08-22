import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  RotateCcw,
  Settings,
  Timer,
  UserRound,
  X,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsSelect,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
  InitialAvatar,
} from '@/shared/workspace'
import { useYearScope, YearScopeSelect, YearScopeEmptyNote } from '@/modules/admin/academic-years'
import {
  useAdminReferralsQuery,
  useAdminReferralStatsQuery,
  useReceiveReferralMutation,
  useAbsenceReferralStatsQuery,
} from '../referrals/hooks'
import type { StudentReferral, ReferralFilters } from '../referrals/types'
import { ReferralStatsModal } from '../referrals/components/ReferralStatsModal'
import { ReferralSettingsModal } from '../referrals/components/ReferralSettingsModal'
import { AbsenceReferralsPanel } from '../referrals/components/AbsenceReferralsPanel'
import { CustodyLine, StatusChip, TypeChip, PriorityMeter, sinceText, isStale } from './referrals-ui'

// نوع التبويب
type ReferralTab = 'teacher' | 'admin' | 'system'

// تعريف التبويبات - سيتم تصفيتها حسب نوع الصفحة
const ALL_TABS: { key: ReferralTab; label: string; icon: typeof UserRound; description: string }[] = [
  { key: 'teacher', label: 'إحالات المعلمين', icon: UserRound, description: 'إحالات الطلاب من المعلمين' },
  { key: 'admin', label: 'إحالات الإدارة', icon: Building2, description: 'إحالات من وكيل شؤون الطلاب' },
  { key: 'system', label: 'إحالات النظام', icon: Bot, description: 'إحالات تلقائية من النظام' },
]

export function AdminReferralsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<ReferralTab>('teacher')
  const [filters, setFilters] = useState<ReferralFilters>({ per_page: 15 })
  /* خارج `filters` عمداً: عدّادُ المرشِّحات النشطة يعدّ ما فيها، والعامُ
     ليس مرشِّحاً يُنظَّف بـ«مسح الفلاتر» بل نطاقُ الشاشة كلِّها. */
  const { scope: yearScope, setScope: setYearScope } = useYearScope()
  const [currentPage, setCurrentPage] = useState(1)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedGrades, setSelectedGrades] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('referrals_selected_grades')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false)
  const gradeDropdownRef = useRef<HTMLDivElement>(null)

  // تحديد نوع الصفحة
  const isBehavioralPage = location.pathname.includes('/referrals/behavioral')
  const isGuidancePage = location.pathname.includes('/referrals/guidance')

  // حفظ الصفوف المحددة في localStorage
  useEffect(() => {
    localStorage.setItem('referrals_selected_grades', JSON.stringify(selectedGrades))
  }, [selectedGrades])

  // تحديد التبويبات المتاحة حسب نوع الصفحة
  const availableTabs = useMemo(() => {
    if (isBehavioralPage) {
      // صفحة المخالفات السلوكية: معلمين + نظام فقط (بدون إدارة)
      return ALL_TABS.filter(tab => tab.key !== 'admin')
    }
    // صفحة الضعف الدراسي أو الصفحة العامة: جميع التبويبات
    return ALL_TABS
  }, [isBehavioralPage])

  // تحديد نوع الإحالات بناءً على المسار
  useEffect(() => {
    if (isGuidancePage) {
      setFilters(prev => ({ ...prev, type: 'academic_weakness' }))
    } else if (isBehavioralPage) {
      setFilters(prev => ({ ...prev, type: 'behavioral_violation' }))
    } else {
      // الصفحة العامة: المكوّن لا يُعاد تركيبه بين المسارات، فبلا هذا الفرع
      // يبقى النوع عالقاً من الصفحة السابقة ويناقض عنوان الشاشة
      setFilters(prev => {
        if (!prev.type) return prev
        const { type, ...rest } = prev
        return rest
      })
    }
  }, [isGuidancePage, isBehavioralPage])

  // إعادة تعيين الصفحة عند تغيير التبويب
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // إغلاق قائمة الصفوف عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setIsGradeDropdownOpen(false)
      }
    }
    if (isGradeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isGradeDropdownOpen])

  // فلاتر حسب التبويب النشط
  const tabFilters = useMemo((): ReferralFilters => {
    const baseFilters = { ...filters, page: currentPage, academic_year: yearScope }

    switch (activeTab) {
      case 'teacher':
        // إحالات المعلمين - referred_by_type = teacher
        return { ...baseFilters, referred_by_type: 'teacher' as const }
      case 'admin':
        // إحالات الإدارة - من وكيل شؤون الطلاب أو الأتمتة
        // نزيل فلتر النوع لإظهار إحالات السلوك والضعف الدراسي معاً
        const { type, ...filtersWithoutType } = baseFilters
        return { ...filtersWithoutType, referred_by_type: 'deputy_students' as const }
      case 'system':
        // إحالات النظام - تلقائية
        return { ...baseFilters, referred_by_type: 'system' as const }
      default:
        return baseFilters
    }
  }, [filters, activeTab, currentPage, yearScope])

  // تحديد عنوان الصفحة
  const getPageTitle = () => {
    if (isGuidancePage) {
      return 'إحالات الضعف الدراسي'
    } else if (isBehavioralPage) {
      return 'إحالات المخالفات السلوكية'
    }
    return 'الإحالات'
  }

  // جلب الإحصائيات مع تمرير نوع الإحالة للفلترة
  const statsFilters = useMemo(() => {
    if (isGuidancePage) return { type: 'academic_weakness', academic_year: yearScope }
    if (isBehavioralPage) return { type: 'behavioral_violation', academic_year: yearScope }
    return { academic_year: yearScope }
  }, [isGuidancePage, isBehavioralPage, yearScope])

  // تبويب النظام لا يقرأ من هذين حرفاً — أحدهما بـper_page:1000
  const { data: referralsData, isLoading, error } = useAdminReferralsQuery(tabFilters, {
    enabled: activeTab !== 'system',
  })

  // فلترة الإحالات محلياً بناءً على الصفوف المحددة
  const referrals = useMemo(() => {
    if (!referralsData) return referralsData
    if (selectedGrades.length === 0) return referralsData

    const filteredItems = referralsData.items.filter((ref) => {
      const gradeOnly = ref.student?.grade || ref.student?.classroom?.name
      return gradeOnly && selectedGrades.includes(gradeOnly)
    })

    return {
      ...referralsData,
      items: filteredItems,
      meta: {
        ...referralsData.meta,
        total: filteredItems.length,
        last_page: Math.max(1, Math.ceil(filteredItems.length / (referralsData.meta.per_page || 15))),
      }
    }
  }, [referralsData, selectedGrades])

  // جلب جميع الإحالات بدون pagination لحساب الإحصائيات
  const allReferralsFilters = useMemo(() => {
    /* `per_page: 1000` بلا قصّ عامٍ كان يجرّ ٤٬٣٥١ إحالةً بعلاقاتها في كل
       فتحةٍ لحساب إحصاءاتٍ على المتصفّح. */
    const base: ReferralFilters = { per_page: 1000, academic_year: yearScope }
    if (isGuidancePage) base.type = 'academic_weakness'
    if (isBehavioralPage) base.type = 'behavioral_violation'
    // إضافة فلتر التبويب النشط
    switch (activeTab) {
      case 'teacher': base.referred_by_type = 'teacher'; break
      case 'admin': base.referred_by_type = 'deputy_students'; break
      case 'system': base.referred_by_type = 'system'; break
    }
    return base
  }, [isGuidancePage, isBehavioralPage, activeTab, yearScope])

  const { data: allReferrals } = useAdminReferralsQuery(allReferralsFilters, {
    enabled: activeTab !== 'system',
  })
  const { data: stats } = useAdminReferralStatsQuery(statsFilters)
  const { data: absenceStats } = useAbsenceReferralStatsQuery(yearScope)
  const receiveMutation = useReceiveReferralMutation()

  // هل توجد حالات غياب متواصل تتطلب إجراء عاجل؟
  const hasEmergencyAbsences = (absenceStats?.consecutive?.total || 0) > 0

  // حساب إحصائيات الفلاتر (المحيل، المكلف، الصف)
  const filterStats = useMemo(() => {
    const items = allReferrals?.items ?? []

    // المحيلين مع عدد الإحالات
    const referrersMap = new Map<number, { name: string; count: number }>()
    // المكلفين مع عدد الإحالات
    const assigneesMap = new Map<number, { name: string; count: number }>()
    // الصفوف مع عدد الإحالات
    const gradesMap = new Map<string, number>()

    items.forEach(ref => {
      // المحيل
      if (ref.referred_by?.id) {
        const existing = referrersMap.get(ref.referred_by.id)
        if (existing) {
          existing.count++
        } else {
          referrersMap.set(ref.referred_by.id, { name: ref.referred_by.name, count: 1 })
        }
      }

      // المكلف
      if (ref.assigned_to?.id) {
        const existing = assigneesMap.get(ref.assigned_to.id)
        if (existing) {
          existing.count++
        } else {
          assigneesMap.set(ref.assigned_to.id, { name: ref.assigned_to.name, count: 1 })
        }
      }

      // الصف - نستخدم الصف فقط بغض النظر عن الفصل
      const gradeOnly = ref.student?.grade || ref.student?.classroom?.name
      if (gradeOnly) {
        gradesMap.set(gradeOnly, (gradesMap.get(gradeOnly) ?? 0) + 1)
      }
    })

    return {
      referrers: Array.from(referrersMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
      assignees: Array.from(assigneesMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
      grades: Array.from(gradesMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    }
  }, [allReferrals])

  // حساب عدد الإحالات لكل تبويب
  const tabCounts = useMemo(() => {
    return {
      teacher: stats?.by_referred_type?.teacher || 0,
      admin: stats?.by_referred_type?.deputy_students || 0,
      system: stats?.by_referred_type?.system || 0,
    }
  }, [stats])

  const handleReceive = async (id: number) => {
    try {
      await receiveMutation.mutateAsync(id)
    } catch (err) {
      console.error('Error receiving referral:', err)
      alert('حدث خطأ أثناء استلام الإحالة')
    }
  }

  const updateFilter = (key: keyof ReferralFilters, value: string) => {
    setCurrentPage(1) // إعادة تعيين الصفحة عند تغيير الفلتر
    setFilters((prev) => {
      // للفلاتر الرقمية (referred_by, assigned_to)
      if ((key === 'referred_by' || key === 'assigned_to') && value) {
        return { ...prev, [key]: Number(value) }
      }
      return { ...prev, [key]: value || undefined }
    })
  }

  /* ── مشتقات العرض ── */

  /** أقدم إحالة تنتظر — الرقم الذي يبرّر وجود زر «استلام» ولا تعرضه الصفحة */
  const oldestWaiting = useMemo(() => {
    const waiting = (referralsData?.items ?? []).filter(r => r.status === 'pending')
    if (waiting.length === 0) return null
    const oldest = waiting.reduce((acc, r) =>
      new Date(r.created_at).getTime() < new Date(acc.created_at).getTime() ? r : acc,
    )
    return { since: sinceText(oldest.created_at), stale: isStale(oldest.referral_type, oldest.created_at) }
  }, [referralsData])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.status) n++
    if (filters.priority) n++
    if (filters.target_role) n++
    if (filters.referred_by) n++
    if (filters.assigned_to) n++
    // النوع فلترٌ حرّ على الصفحة العامة وحدها — على الفرعيتين هو هوية المسار لا اختيار
    if (filters.type && !isGuidancePage && !isBehavioralPage) n++
    if (selectedGrades.length > 0) n++
    return n
  }, [filters, selectedGrades, isGuidancePage, isBehavioralPage])

  const clearFilters = () => {
    setCurrentPage(1)
    setSelectedGrades([])
    setFilters(() => {
      const base: ReferralFilters = { per_page: 15 }
      if (isGuidancePage) base.type = 'academic_weakness'
      if (isBehavioralPage) base.type = 'behavioral_violation'
      return base
    })
  }

  const routeBadge = isGuidancePage ? 'ضعف دراسي' : isBehavioralPage ? 'مخالفات سلوكية' : null

  return (
    <WsPage>
      <WsHeader
        title={getPageTitle()}
        badge={routeBadge}
        actions={
          <>
            <YearScopeSelect scope={yearScope} onChange={setYearScope} />
            <WsBtn icon={BarChart3} onClick={() => setShowStatsModal(true)}>الإحصائيات</WsBtn>
            <WsBtn icon={Settings} onClick={() => setShowSettingsModal(true)}>الإعدادات</WsBtn>
          </>
        }
        facts={
          activeTab === 'system' ? (
            <>
              <WsFact icon={Bot} label="غياب متواصل">
                <span style={{ color: (absenceStats?.consecutive?.total ?? 0) > 0 ? TONES.red.tx : undefined }}>
                  {absenceStats?.consecutive?.total ?? 0}
                </span>
              </WsFact>
              <WsFact icon={Bot} label="غياب متكرر">{absenceStats?.repeated?.total ?? 0}</WsFact>
              <WsFact icon={Clock} label="يتطلب إجراء">
                <span style={{ color: (absenceStats?.requiring_action ?? 0) > 0 ? TONES.amber.tx : undefined }}>
                  {absenceStats?.requiring_action ?? 0}
                </span>
              </WsFact>
            </>
          ) : (
            <>
              <WsFact icon={ClipboardList} label="الإجمالي">{stats?.total ?? 0}</WsFact>
              <WsFact icon={Clock} label="ينتظر الاستلام">
                <span style={{ color: (stats?.pending ?? 0) > 0 ? TONES.amber.tx : undefined }}>{stats?.pending ?? 0}</span>
              </WsFact>
              <WsFact icon={Timer} label="قيد المعالجة">
                <span style={{ color: TONES.sky.tx }}>{stats?.in_progress ?? 0}</span>
              </WsFact>
              <WsFact icon={CheckCircle2} label="مكتملة">
                <span style={{ color: TONES.green.tx }}>{stats?.completed ?? 0}</span>
              </WsFact>
              {oldestWaiting && (
                <WsFact icon={Timer} label="أقدم انتظار">
                  <span
                    className={oldestWaiting.stale ? 'ws-soft-pulse' : undefined}
                    style={{ color: oldestWaiting.stale ? TONES.red.tx : undefined }}
                  >
                    {oldestWaiting.since.text}
                  </span>
                </WsFact>
              )}
            </>
          )
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          {availableTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                title={tab.description}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {tab.label}
                {tab.key === 'system' && hasEmergencyAbsences && <span className="ws-pulse ws-pulse--red" />}
                {tabCounts[tab.key] > 0 && <span className="ws-count">{tabCounts[tab.key]}</span>}
              </button>
            )
          })}
        </div>

        {/* تبويب النظام يستبدل الجدول بلوحة مستقلة لا تقرأ أياً من هذه الفلاتر */}
        {activeTab !== 'system' && (
          <>
            <WsField label="الحالة">
              <WsSelect value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="received">تم الاستلام</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="transferred">محولة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغاة</option>
              </WsSelect>
            </WsField>

            {/* النوع فلتر على الصفحة العامة وحدها — على الفرعيتين المسار يملكه فلا يُعرض كخيار يناقض العنوان */}
            {!isGuidancePage && !isBehavioralPage && (
              <WsField label="النوع">
                <WsSelect value={filters.type ?? ''} onChange={(e) => updateFilter('type', e.target.value)}>
                  <option value="">جميع الأنواع</option>
                  <option value="academic_weakness">ضعف دراسي</option>
                  <option value="behavioral_violation">مخالفة سلوكية</option>
                </WsSelect>
              </WsField>
            )}

            <WsField label="الجهة">
              <WsSelect value={filters.target_role ?? ''} onChange={(e) => updateFilter('target_role', e.target.value)}>
                <option value="">جميع الجهات</option>
                <option value="counselor">الموجه الطلابي</option>
                <option value="vice_principal">وكيل شؤون الطلاب</option>
                <option value="committee">اللجنة السلوكية</option>
              </WsSelect>
            </WsField>

            <WsField label="الأولوية">
              <WsSelect value={filters.priority ?? ''} onChange={(e) => updateFilter('priority', e.target.value)}>
                <option value="">جميع الأولويات</option>
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </WsSelect>
            </WsField>

            <WsField label="المحيل">
              <WsSelect value={filters.referred_by ?? ''} onChange={(e) => updateFilter('referred_by', e.target.value)}>
                <option value="">جميع المحيلين</option>
                {filterStats.referrers.map(ref => (
                  <option key={ref.id} value={ref.id}>{ref.name} ({ref.count})</option>
                ))}
              </WsSelect>
            </WsField>

            <WsField label="المكلَّف">
              <WsSelect value={filters.assigned_to ?? ''} onChange={(e) => updateFilter('assigned_to', e.target.value)}>
                <option value="">جميع المكلفين</option>
                {filterStats.assignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name} ({assignee.count})</option>
                ))}
              </WsSelect>
            </WsField>

            <WsField label="الصف">
              <div style={{ position: 'relative' }} ref={gradeDropdownRef}>
                <button
                  type="button"
                  className="ws-select"
                  onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 130, textAlign: 'right' }}
                >
                  <span>{selectedGrades.length === 0 ? 'جميع الصفوف' : `${selectedGrades.length} صف محدد`}</span>
                  <ChevronDown style={{ width: 12, height: 12, opacity: 0.6 }} />
                </button>
                {isGradeDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      insetInlineStart: 0,
                      marginTop: 4,
                      zIndex: 50,
                      minWidth: 200,
                      maxHeight: 260,
                      overflowY: 'auto',
                      background: 'var(--ws-surface)',
                      border: '1px solid var(--ws-border)',
                      borderRadius: 10,
                      boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 9px', borderBottom: '1px solid var(--ws-hairline)' }}>
                      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{filterStats.grades.length} صف</span>
                      <button
                        type="button"
                        onClick={() => setSelectedGrades([])}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: 'var(--ws-accent)', fontFamily: 'inherit' }}
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                    {filterStats.grades.map((grade) => (
                      <label
                        key={grade.name}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 9px', cursor: 'pointer', fontSize: 12 }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={selectedGrades.includes(grade.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGrades((prev) => [...prev, grade.name])
                              } else {
                                setSelectedGrades((prev) => prev.filter((g) => g !== grade.name))
                              }
                            }}
                          />
                          {grade.name}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{grade.count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </WsField>

            {activeFilterCount > 0 && (
              <WsBtn size="sm" icon={RotateCcw} onClick={clearFilters}>
                مسح الفلاتر
                <span className="ws-count">{activeFilterCount}</span>
              </WsBtn>
            )}
          </>
        )}
      </WsToolbar>

      {/* شرائح الصفوف المحددة */}
      {activeTab !== 'system' && selectedGrades.length > 0 && (
        <WsToolbar style={{ paddingBlock: 5 }}>
          {selectedGrades.map((grade) => (
            <button
              key={grade}
              type="button"
              className="ws-chip"
              onClick={() => setSelectedGrades((prev) => prev.filter((g) => g !== grade))}
              style={{ background: 'var(--ws-accent-soft)', color: 'var(--ws-accent)', gap: 4 }}
              title={`إزالة ${grade}`}
            >
              {grade}
              <X style={{ width: 10, height: 10 }} />
            </button>
          ))}
        </WsToolbar>
      )}

      <WsLayout>
        {/* التوزيع — القوائم نفسها التي تغذّي الفلاتر تصير خريطة قابلة للنقر */}
        {activeTab !== 'system' && (
          <WsSideCol side="start" title="التوزيع" icon={BarChart3} storageKey="ws:referrals:breakdown" width={260}>
            <WsBlock fill scroll>
              <BreakdownList
                title="الصفوف"
                items={filterStats.grades.map(g => ({ key: g.name, label: g.name, count: g.count }))}
                isActive={(key) => selectedGrades.includes(String(key))}
                onPick={(key) => setSelectedGrades((prev) =>
                  prev.includes(String(key)) ? prev.filter(g => g !== key) : [...prev, String(key)],
                )}
              />
              <BreakdownList
                title="المحيلون"
                items={filterStats.referrers.map(r => ({ key: r.id, label: r.name, count: r.count }))}
                isActive={(key) => filters.referred_by === key}
                onPick={(key) => updateFilter('referred_by', filters.referred_by === key ? '' : String(key))}
              />
              <BreakdownList
                title="المكلَّفون"
                items={filterStats.assignees.map(a => ({ key: a.id, label: a.name, count: a.count }))}
                isActive={(key) => filters.assigned_to === key}
                onPick={(key) => updateFilter('assigned_to', filters.assigned_to === key ? '' : String(key))}
              />
            </WsBlock>
          </WsSideCol>
        )}

        {activeTab === 'system' ? (
          /* اللوحة تُخرج عمودها وWsMain بنفسها — صفر رفع حالة وصفر props */
          <AbsenceReferralsPanel yearScope={yearScope} />
        ) : (
          <WsMain>
            <WsBlock
              fill
              title="الإحالات"
              icon={ClipboardList}
              count={referrals?.meta.total ?? 0}
              tools={
                referrals && referrals.meta.last_page > 1 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      {((referrals.meta.current_page - 1) * referrals.meta.per_page) + 1}–
                      {Math.min(referrals.meta.current_page * referrals.meta.per_page, referrals.meta.total)} من {referrals.meta.total}
                    </span>
                    <WsIconBtn
                      icon={ChevronRight}
                      label="السابق"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    />
                    {/* منطق نافذة الأرقام كما هو: أول 3 وآخر 3 والمحيط بالحالية */}
                    {Array.from({ length: referrals.meta.last_page }, (_, i) => i + 1)
                      .filter(page =>
                        page <= 3 ||
                        page > referrals.meta.last_page - 3 ||
                        Math.abs(page - currentPage) <= 1,
                      )
                      .map((page, index, arr) => (
                        <span key={page} style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {index > 0 && arr[index - 1] !== page - 1 && (
                            <span style={{ padding: '0 2px', color: 'var(--ws-text-2)', fontSize: 10 }}>…</span>
                          )}
                          <button
                            type="button"
                            className="ws-icon-btn"
                            onClick={() => setCurrentPage(page)}
                            style={currentPage === page
                              ? { background: 'var(--ws-accent)', borderColor: 'var(--ws-accent)', color: '#fff', fontWeight: 800 }
                              : { fontWeight: 700 }}
                          >
                            {page}
                          </button>
                        </span>
                      ))}
                    <WsIconBtn
                      icon={ChevronLeft}
                      label="التالي"
                      disabled={currentPage === referrals.meta.last_page}
                      onClick={() => setCurrentPage(p => Math.min(referrals.meta.last_page, p + 1))}
                    />
                  </span>
                ) : undefined
              }
            >
              {isLoading ? (
                <WsEmpty loading>جارٍ تحميل الإحالات...</WsEmpty>
              ) : error ? (
                <div style={{ padding: 14 }}>
                  <WsAlert tone="error" boxed>حدث خطأ في تحميل البيانات</WsAlert>
                </div>
              ) : referrals && referrals.items.length > 0 ? (
                <WsTable>
                  <thead>
                    <tr>
                      <th>الإحالة</th>
                      <th>الطالب</th>
                      <th>النداء</th>
                      <th>خط العُهدة</th>
                      <th>الحالة</th>
                      <th style={{ width: 90 }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.items.map((referral: StudentReferral) => {
                      const stale = referral.status === 'pending' && isStale(referral.referral_type, referral.created_at)
                      return (
                        <tr
                          key={referral.id}
                          className="is-clickable"
                          onClick={() => navigate(`/admin/referrals/${referral.id}`)}
                          /* الغسلة = عمل مطلوب: المتعفّنة وحدها تُصبغ */
                          style={stale ? { background: TONES.red.bg } : undefined}
                        >
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <PriorityMeter priority={referral.priority} />
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--ws-text-2)', direction: 'ltr' }}>
                                {referral.referral_number}
                              </span>
                            </span>
                            {referral.priority === 'urgent' && (
                              <div style={{ marginTop: 3 }}><ToneChip tone={TONES.red}>عاجل</ToneChip></div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <InitialAvatar
                                name={referral.student?.name ?? '؟'}
                                tone={referral.referral_type === 'behavioral_violation' ? TONES.red : TONES.gray}
                                size={22}
                              />
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontWeight: 600 }}>{referral.student?.name}</span>
                                <span className="ws-cell-sub">
                                  {[referral.student?.grade, referral.student?.class_name].filter(Boolean).join(' / ') || '—'}
                                </span>
                              </span>
                            </div>
                          </td>
                          {/* النداء: كلمات المعلم — كانت تصل في الحمولة وتُرمى، والمستخدم يغادر الصفحة ليقرأها */}
                          <td style={{ maxWidth: 240 }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <TypeChip type={referral.referral_type} label={referral.referral_type_label} />
                              {(referral.title || referral.description) && (
                                <span
                                  className="ws-cell-sub"
                                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={referral.title || referral.description}
                                >
                                  {referral.title || referral.description}
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <CustodyLine
                              referredBy={referral.referred_by?.name}
                              receivedAt={referral.received_at}
                              assignedTo={referral.assigned_to?.name}
                              status={referral.status}
                              type={referral.referral_type}
                              createdAt={referral.created_at}
                            />
                          </td>
                          <td><StatusChip status={referral.status} label={referral.status_label} /></td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {referral.status === 'pending' && (
                              <WsBtn
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => handleReceive(referral.id)}
                                disabled={receiveMutation.isPending && receiveMutation.variables === referral.id}
                                style={{ color: TONES.sky.tx, borderColor: TONES.sky.bd, background: TONES.sky.bg }}
                              >
                                استلام
                              </WsBtn>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              ) : (
                <WsEmpty icon={activeTab === 'teacher' ? UserRound : Building2}>
                  <p style={{ margin: 0 }}>
                    {activeTab === 'teacher' ? 'لا توجد إحالات من المعلمين' : 'لا توجد إحالات من الإدارة'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                    {activeTab === 'teacher' ? 'ستظهر هنا الإحالات المرسلة من المعلمين' : 'ستظهر هنا الإحالات من وكيل شؤون الطلاب'}
                  </p>
                  {activeFilterCount > 0 && (
                    <WsBtn size="sm" icon={RotateCcw} onClick={clearFilters} style={{ marginTop: 8 }}>مسح الفلاتر</WsBtn>
                  )}
                  <YearScopeEmptyNote scope={yearScope} onShowAll={() => setYearScope('all')} />
                </WsEmpty>
              )}
            </WsBlock>
          </WsMain>
        )}
      </WsLayout>

      {/* النوافذ العائمة */}
      <ReferralStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        type={filters.type}
      />
      <ReferralSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </WsPage>
  )
}

/** قائمة توزيع قابلة للنقر: نفس بيانات الفلاتر لكن كخريطة تُقرأ بالمسح البصري */
function BreakdownList({
  title,
  items,
  isActive,
  onPick,
}: {
  title: string
  items: Array<{ key: string | number; label: string; count: number }>
  isActive: (key: string | number) => boolean
  onPick: (key: string | number) => void
}) {
  if (items.length === 0) return null
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <WsBlock title={title} count={items.length} padded>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.slice(0, 12).map((item) => {
          const active = isActive(item.key)
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onPick(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                textAlign: 'right',
                border: 'none',
                borderRadius: 6,
                padding: '4px 6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11.5,
                background: active ? 'var(--ws-accent-soft)' : 'transparent',
                color: active ? 'var(--ws-accent)' : 'var(--ws-text)',
                boxShadow: active ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              <span style={{ display: 'block', width: 34, height: 4, borderRadius: 2, background: 'var(--ws-border)', overflow: 'hidden', flexShrink: 0 }}>
                <span style={{ display: 'block', height: '100%', width: `${(item.count / max) * 100}%`, background: active ? 'var(--ws-accent)' : 'var(--ws-text-2)', opacity: active ? 1 : 0.5 }} />
              </span>
              <b style={{ fontSize: 10.5, minWidth: 16, textAlign: 'left', flexShrink: 0 }}>{item.count}</b>
            </button>
          )
        })}
      </div>
    </WsBlock>
  )
}
