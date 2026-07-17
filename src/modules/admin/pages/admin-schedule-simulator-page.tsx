import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Users, BookOpen, GraduationCap, Play, AlertTriangle, CheckCircle,
  Database, Sparkles, Brain, Zap,
  BarChart3, Target, TrendingUp, Shield, Award, RefreshCw, Plus, X,
  Hash, Scale, Settings2, Grid3x3, Printer,
} from 'lucide-react'
import { apiClient } from '@/services/api/client'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  type Tone,
} from '@/shared/workspace'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface Teacher { id: number; name: string; weekly_quota: number }
interface TeacherPreference {
  teacher_id: number; weekly_quota: number; min_daily_periods: number
  max_daily_periods: number; max_consecutive: number
  prefer_time: 'any' | 'early' | 'late'; teaching_style: 'any' | 'consecutive' | 'distributed'
  golden_days: string[]
}
interface Subject { id: number; name: string; name_en?: string }
interface SubjectConstraint {
  subject_id: number; requires_consecutive: boolean; consecutive_count: number
  avoid_first_period: boolean; avoid_last_period: boolean
  no_consecutive_days: boolean; max_per_day: number; is_heavy: boolean
}
interface ClassGroup { id: number; grade: string; class_name: string }
interface ClassRequirement {
  id: number; class_id: number; grade: string; class_name: string
  subject_id: number; subject_name: string; teacher_id: number
  teacher_name: string; periods_per_week: number
}
interface SimulationConfig {
  name: string; working_days: string[]; periods_per_day: Record<string, number>
  default_periods_per_day: number; max_teacher_periods_per_day: number
  max_consecutive_periods: number; time_limit_seconds: number
}
interface ScheduleEntry {
  teacher_id: number; teacher_name: string; subject_id: number; subject_name: string
  class_id: number; grade: string; class_name: string; day: string; period: number
}
interface QualityReport {
  overall_score: number; hard_constraints_met: number; soft_score: number
  teacher_satisfaction: number; distribution_score: number; gap_score: number
  consecutive_score: number; load_balance_score: number; time_preference_score: number
  details: { total_sessions_placed: number; total_requirements: number; teachers_used: number; classes_scheduled: number; avg_daily_load: number; max_daily_load: number; gap_count: number }
  metrics?: Record<string, { score: number; details: any }>
}
interface ConflictInfo { type: string; message: string; severity: string; suggestion?: string }
interface SimulationResult {
  status: 'optimal' | 'feasible' | 'infeasible' | 'timeout' | 'error'
  solving_time_ms: number; schedule: ScheduleEntry[]
  by_teacher: Record<string, any>; by_class: Record<string, any>
  quality_report: QualityReport | null; conflicts: ConflictInfo[]
  conflict_heatmap?: any; error_message?: string
}

// Teacher assignment: which subjects/classes a teacher teaches
interface TeacherAssignment {
  subject_id: number
  subject_name: string
  grade: string
  class_ids: number[] // selected class IDs in that grade
}

// Subject with periods_per_week per grade
interface SubjectGradePeriods {
  subject_id: number
  grade: string
  periods_per_week: number
}

/** معوّق واحد في الميزان — يشخّص ويُنقّل */
interface Blocker {
  kind: 'grade-over' | 'teacher-over' | 'unassigned'
  text: string
  tone: Tone
  fatal: boolean
  surface: Surface
}

type Surface = 'quota' | 'assign' | 'result'

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

const WORKING_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const API_BASE = '/admin/schedule-simulator'

const SURFACES: Array<{ key: Surface; label: string; icon: typeof BookOpen }> = [
  { key: 'quota', label: 'النصاب', icon: BookOpen },
  { key: 'assign', label: 'الإسناد', icon: Users },
  { key: 'result', label: 'النتيجة', icon: Grid3x3 },
]

/** ألوان المواد — نفس لوحة جداول المعلمين والفصول */
const SUBJECT_TONES: Tone[] = [
  TONES.green, TONES.sky, TONES.purple, TONES.amber, TONES.red,
  { bg: '#E7F6F4', bd: '#B9E3DD', tx: '#1F7A6C' },
  { bg: '#F0F0FB', bd: '#D0D0EE', tx: '#4B4BA8' },
  { bg: '#FBEEF6', bd: '#EFC8E0', tx: '#A83A79' },
]

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function AdminScheduleSimulatorPage() {
  // ── State ──
  /* الخطوات ماتت: ثلاثة أسطح تُنقر بحرية في الاتجاهين، والنتيجة تبقى للمقارنة */
  const [surface, setSurface] = useState<Surface>('quota')
  const [dataSource, setDataSource] = useState<'existing' | 'custom'>('existing')
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)

  const [config, setConfig] = useState<SimulationConfig>({
    name: 'جدول جديد',
    working_days: [...WORKING_DAYS],
    periods_per_day: WORKING_DAYS.reduce((a, d) => ({ ...a, [d]: 7 }), {}),
    default_periods_per_day: 7,
    max_teacher_periods_per_day: 6,
    max_consecutive_periods: 3,
    time_limit_seconds: 120,
  })

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [teacherPreferences, setTeacherPreferences] = useState<TeacherPreference[]>([])
  const [subjectConstraints, setSubjectConstraints] = useState<SubjectConstraint[]>([])

  // Subject periods per grade
  const [subjectGradePeriods, setSubjectGradePeriods] = useState<SubjectGradePeriods[]>([])

  // Teacher assignments (teacher → subjects + classes)
  const [teacherAssignments, setTeacherAssignments] = useState<Record<number, TeacherAssignment[]>>({})

  // AI loading
  const [aiPhase, setAiPhase] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const AI_PHASES = [
    { message: 'جاري تحليل البيانات وفحص القيود...', icon: Brain },
    { message: 'بناء النموذج الرياضي للجدول...', icon: Target },
    { message: 'المرحلة الأولى: إيجاد حل أولي...', icon: Shield },
    { message: 'المرحلة الثانية: تحسين جودة التوزيع...', icon: TrendingUp },
    { message: 'تقليل الفراغات في جداول المعلمين...', icon: Zap },
    { message: 'موازنة الحمل اليومي...', icon: BarChart3 },
    { message: 'تقييم جودة الجدول النهائي...', icon: Award },
  ]

  useEffect(() => {
    if (isRunning) {
      setAiPhase(0); setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000)
      let idx = 0
      const advance = () => {
        if (idx < AI_PHASES.length - 1) {
          idx++
          setAiPhase(idx)
          phaseTimeoutsRef.current.push(setTimeout(advance, AI_PHASES[idx].message.length * 80))
        }
      }
      phaseTimeoutsRef.current.push(setTimeout(advance, 3000))
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    // التنظيف يلغي سلسلة المؤقتات أيضاً — كانت تبقى حيّة وتستدعي setAiPhase بعد الـunmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      phaseTimeoutsRef.current.forEach(clearTimeout)
      phaseTimeoutsRef.current = []
    }
  }, [isRunning])

  // ── Computed ──
  const uniqueGrades = useMemo(() => [...new Set(classes.map(c => c.grade))].sort(), [classes])

  const classesByGrade = useMemo(() => {
    const map: Record<string, ClassGroup[]> = {}
    for (const c of classes) { if (!map[c.grade]) map[c.grade] = []; map[c.grade].push(c) }
    return map
  }, [classes])

  const maxPerClass = useMemo(() =>
    config.working_days.reduce((s, d) => s + (config.periods_per_day[d] || config.default_periods_per_day), 0)
  , [config])

  // How many periods does a subject have for a grade
  const getSubjectGradePpw = useCallback((subjectId: number, grade: string) => {
    return subjectGradePeriods.find(s => s.subject_id === subjectId && s.grade === grade)?.periods_per_week || 0
  }, [subjectGradePeriods])

  // Total periods per grade (from subject settings)
  const gradeTotal = useCallback((grade: string) => {
    return subjects.reduce((s, sub) => s + getSubjectGradePpw(sub.id, grade), 0)
  }, [subjects, getSubjectGradePpw])

  // Teacher load from assignments
  const teacherLoad = useCallback((teacherId: number) => {
    const assignments = teacherAssignments[teacherId] || []
    let total = 0
    for (const a of assignments) {
      const ppw = getSubjectGradePpw(a.subject_id, a.grade)
      total += ppw * a.class_ids.length
    }
    return total
  }, [teacherAssignments, getSubjectGradePpw])

  /* نفس حلقة unassignedPeriods حرفياً — لكن الناتج الوسيط لا يُرمى:
     يُحتفظ ببنود النقص لتشخيصها في الميزان بدل رقم صمّاء */
  const unassignedBreakdown = useMemo(() => {
    let total = 0
    const items: Array<{ subject: string; grade: string; classes: number; periods: number }> = []
    for (const grade of uniqueGrades) {
      const gradeClasses = classesByGrade[grade] || []
      for (const sub of subjects) {
        const ppw = getSubjectGradePpw(sub.id, grade)
        if (ppw === 0) continue
        // Count how many class slots are assigned
        let assignedClassIds = new Set<number>()
        for (const [, assignments] of Object.entries(teacherAssignments)) {
          for (const a of assignments) {
            if (a.subject_id === sub.id && a.grade === grade) {
              a.class_ids.forEach(id => assignedClassIds.add(id))
            }
          }
        }
        const unassigned = gradeClasses.filter(c => !assignedClassIds.has(c.id)).length
        total += unassigned * ppw
        if (unassigned > 0) items.push({ subject: sub.name, grade, classes: unassigned, periods: unassigned * ppw })
      }
    }
    return { total, items }
  }, [uniqueGrades, classesByGrade, subjects, getSubjectGradePpw, teacherAssignments])

  const unassignedPeriods = unassignedBreakdown.total

  const totalAssigned = useMemo(() => {
    let t = 0
    for (const tid of Object.keys(teacherAssignments)) { t += teacherLoad(Number(tid)) }
    return t
  }, [teacherAssignments, teacherLoad])

  const totalRequired = useMemo(() => {
    let t = 0
    for (const grade of uniqueGrades) {
      const n = (classesByGrade[grade] || []).length
      t += gradeTotal(grade) * n
    }
    return t
  }, [uniqueGrades, classesByGrade, gradeTotal])

  /* السعة: مجموع أنصبة المعلمين — رقم في يد الصفحة ولم تحسبه قط */
  const totalCapacity = useMemo(
    () => teachers.reduce((sum, t) => sum + (t.weekly_quota || 24), 0),
    [teachers],
  )

  // Which classes are already taken for a subject+grade (by other teachers)
  const takenClasses = useMemo(() => {
    // key: "subjectId-grade" → Map<classId, teacherId>
    const map: Record<string, Record<number, number>> = {}
    for (const [tidStr, assignments] of Object.entries(teacherAssignments)) {
      const tid = Number(tidStr)
      for (const a of assignments) {
        const key = `${a.subject_id}-${a.grade}`
        if (!map[key]) map[key] = {}
        for (const cid of a.class_ids) {
          map[key][cid] = tid
        }
      }
    }
    return map
  }, [teacherAssignments])

  // Get available classes for a teacher's assignment (exclude taken by others)
  const getAvailableClasses = useCallback((teacherId: number, subjectId: number, grade: string) => {
    const key = `${subjectId}-${grade}`
    const taken = takenClasses[key] || {}
    const all = classesByGrade[grade] || []
    return all.filter(c => !taken[c.id] || taken[c.id] === teacherId)
  }, [takenClasses, classesByGrade])

  // Helper: build grid from sessions array
  const buildGrid = useCallback((sessions: Array<{ day: string; period: number;[k: string]: any }>) => {
    const grid: Record<string, Record<number, any>> = {}
    for (const s of sessions) { if (!grid[s.day]) grid[s.day] = {}; grid[s.day][s.period] = s }
    return grid
  }, [])

  const classGrids = useMemo(() => {
    if (!result?.by_class) return {}
    const g: Record<string, Record<string, Record<number, any>>> = {}
    for (const [k, d] of Object.entries(result.by_class) as [string, any][]) g[k] = buildGrid(d.sessions || [])
    return g
  }, [result?.by_class, buildGrid])

  const teacherGrids = useMemo(() => {
    if (!result?.by_teacher) return {}
    const g: Record<string, Record<string, Record<number, any>>> = {}
    for (const [k, d] of Object.entries(result.by_teacher) as [string, any][]) g[k] = buildGrid(d.sessions || [])
    return g
  }, [result?.by_teacher, buildGrid])

  const subjectColors = useMemo(() => {
    if (!result?.schedule) return {}
    const map: Record<string, Tone> = {}
    ;[...new Set(result.schedule.map(s => s.subject_name))].forEach((n, i) => { map[n] = SUBJECT_TONES[i % SUBJECT_TONES.length] })
    return map
  }, [result?.schedule])

  /* أقصى عدد حصص عبر أيام العمل — الشبكات كانت تبني صفوفها من default_periods_per_day
     فأي يوم أطول تُقتطع حصصه الأخيرة من العرض: تُجدول ولا تُرى */
  const maxPeriodsInAnyDay = useMemo(
    () => Math.max(1, ...config.working_days.map(d => config.periods_per_day[d] || config.default_periods_per_day)),
    [config],
  )

  // ── API ──
  const loadExistingData = async () => {
    setIsLoading(true)
    try {
      const r = await apiClient.get(`${API_BASE}/wizard-data`)
      if (r.data.success && r.data.data) {
        const d = r.data.data
        setTeachers(d.teachers || []); setSubjects(d.subjects || []); setClasses(d.classes || [])
        setTeacherPreferences(d.teacher_preferences || []); setSubjectConstraints(d.subject_constraints || [])
      }
    } catch { /* silent */ } finally { setIsLoading(false) }
  }

  const generateMockData = async () => {
    setIsLoading(true); setError(null)
    try {
      const r = await apiClient.post(`${API_BASE}/generate-mock-data`, { num_teachers: 10, num_subjects: 8, num_grades: 3, classes_per_grade: 3, periods_per_day: config.default_periods_per_day })
      if (r.data.success && r.data.data) {
        const d = r.data.data
        setTeachers(d.teachers || []); setSubjects(d.subjects || []); setClasses(d.classes || [])
        setTeacherPreferences(d.teacher_preferences || [])
        setSubjectConstraints(d.subject_constraints || []); if (d.config) setConfig(p => ({ ...p, ...d.config }))
      }
    } catch (e: any) { setError(e.response?.data?.message || 'فشل الاتصال') } finally { setIsLoading(false) }
  }

  useEffect(() => { if (dataSource === 'existing') loadExistingData() }, [dataSource])

  // Build requirements from teacherAssignments + subjectGradePeriods
  const buildRequirements = useCallback(() => {
    const reqs: ClassRequirement[] = []
    let id = 1
    for (const [tidStr, assignments] of Object.entries(teacherAssignments)) {
      const tid = Number(tidStr)
      const teacher = teachers.find(t => t.id === tid)
      for (const a of assignments) {
        const ppw = getSubjectGradePpw(a.subject_id, a.grade)
        if (ppw === 0) continue
        for (const cid of a.class_ids) {
          const cls = classes.find(c => c.id === cid)
          if (!cls) continue
          reqs.push({
            id: id++, class_id: cid, grade: a.grade, class_name: cls.class_name,
            subject_id: a.subject_id, subject_name: a.subject_name,
            teacher_id: tid, teacher_name: teacher?.name || '',
            periods_per_week: ppw,
          })
        }
      }
    }
    return reqs
  }, [teacherAssignments, getSubjectGradePpw, teachers, classes])

  const runSimulation = async () => {
    setIsRunning(true); setError(null); setResult(null)
    const reqs = buildRequirements()
    try {
      const cr = await apiClient.post(`${API_BASE}/simulations`, {
        name: config.name, data_source: 'custom', config,
        custom_data: { teachers, subjects, classes, requirements: reqs, teacher_preferences: teacherPreferences, subject_constraints: subjectConstraints },
      })
      const simId = cr.data.data.id
      const rr = await apiClient.post(`${API_BASE}/simulations/${simId}/run`)
      if (rr.data.success) {
        setResult({
          // الحالة الحقيقية من المحرّك إن وصلت — «حل مثالي» كانت مثبّتة حتى لو انتهت المهلة
          status: rr.data.data.result?.status ?? rr.data.data.status ?? 'optimal',
          solving_time_ms: rr.data.data.solving_time_ms || 0,
          schedule: rr.data.data.result?.schedule || [],
          by_teacher: rr.data.data.result?.by_teacher || {},
          by_class: rr.data.data.result?.by_class || {},
          quality_report: rr.data.data.quality_report,
          conflicts: [],
        })
        setSurface('result')
      } else {
        setResult({ status: 'infeasible', solving_time_ms: 0, schedule: [], by_teacher: {}, by_class: {}, quality_report: null, conflicts: rr.data.conflicts || [], conflict_heatmap: rr.data.conflict_heatmap, error_message: rr.data.message })
        setSurface('result')
      }
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'حدث خطأ') } finally { setIsRunning(false) }
  }

  // ── الإسناد: العمليات ──
  const addAssignment = (tid: number) => {
    setTeacherAssignments(prev => ({
      ...prev,
      [tid]: [...(prev[tid] || []), { subject_id: subjects[0]?.id || 0, subject_name: subjects[0]?.name || '', grade: uniqueGrades[0] || '', class_ids: [] }],
    }))
  }

  const updateAssignment = (tid: number, idx: number, updates: Partial<TeacherAssignment>) => {
    setTeacherAssignments(prev => ({
      ...prev,
      [tid]: (prev[tid] || []).map((a, i) => i === idx ? { ...a, ...updates } : a),
    }))
  }

  const removeAssignment = (tid: number, idx: number) => {
    setTeacherAssignments(prev => ({
      ...prev,
      [tid]: (prev[tid] || []).filter((_, i) => i !== idx),
    }))
  }

  const toggleClass = (tid: number, idx: number, classId: number) => {
    setTeacherAssignments(prev => {
      const assignments = [...(prev[tid] || [])]
      const a = { ...assignments[idx] }
      a.class_ids = a.class_ids.includes(classId) ? a.class_ids.filter(id => id !== classId) : [...a.class_ids, classId]
      assignments[idx] = a
      return { ...prev, [tid]: assignments }
    })
  }

  /* ── الميزان: الحكم والمعوّقات ── */
  const blockers = useMemo<Blocker[]>(() => {
    const list: Blocker[] = []
    for (const grade of uniqueGrades) {
      const total = gradeTotal(grade)
      if (total > maxPerClass) {
        list.push({
          kind: 'grade-over',
          text: `${grade} — ${total}/${maxPerClass} حصة فوق السقف`,
          tone: TONES.red,
          fatal: true,
          surface: 'quota',
        })
      }
    }
    for (const teacher of teachers) {
      const load = teacherLoad(teacher.id)
      const quota = teacher.weekly_quota || 24
      if (load > quota) {
        list.push({
          kind: 'teacher-over',
          text: `${teacher.name} — ${load}/${quota} فوق النصاب`,
          tone: TONES.red,
          fatal: true,
          surface: 'assign',
        })
      }
    }
    for (const item of unassignedBreakdown.items) {
      list.push({
        kind: 'unassigned',
        text: `${item.subject}/${item.grade} — ${item.classes} فصل بلا معلم (${item.periods} حصة)`,
        tone: TONES.amber,
        fatal: false,
        surface: 'assign',
      })
    }
    return list
  }, [uniqueGrades, gradeTotal, maxPerClass, teachers, teacherLoad, unassignedBreakdown])

  const fatalCount = blockers.filter(b => b.fatal).length
  const verdict = useMemo(() => {
    if (totalRequired === 0) return { label: 'لم يُحدد نصاب بعد', tone: TONES.gray }
    if (fatalCount > 0) return { label: 'مستحيل رياضياً', tone: TONES.red }
    if (unassignedPeriods > 0) return { label: 'ناقص', tone: TONES.amber }
    return { label: 'جاهز', tone: TONES.green }
  }, [totalRequired, fatalCount, unassignedPeriods])

  const reqs = useMemo(() => buildRequirements(), [buildRequirements])
  const totalSessions = useMemo(() => reqs.reduce((s, r) => s + r.periods_per_week, 0), [reqs])

  const visibleTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase()
    return teachers.filter(t => {
      if (q && !t.name.toLowerCase().includes(q)) return false
      if (onlyIncomplete) {
        const load = teacherLoad(t.id)
        const quota = t.weekly_quota || 24
        if (load >= quota) return false
      }
      return true
    })
  }, [teachers, teacherSearch, onlyIncomplete, teacherLoad])

  const teacherNameById = useMemo(() => {
    const map: Record<number, string> = {}
    teachers.forEach(t => { map[t.id] = t.name })
    return map
  }, [teachers])

  const score = result?.quality_report?.overall_score ?? 0

  return (
    <WsPage>
      <WsHeader
        title="محاكي الجداول الذكي"
        badge={
          isRunning ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: TONES.purple.tx }}>
              <span className="ws-pulse" style={{ background: TONES.purple.tx }} />
              جارٍ التوليد
            </span>
          ) : (
            <span style={{ color: dataSource === 'custom' ? TONES.purple.tx : TONES.sky.tx }}>
              {dataSource === 'custom' ? 'بيانات تجريبية' : 'بيانات المدرسة'}
            </span>
          )
        }
        actions={
          <>
            <WsField label="اسم الجدول">
              <WsInput
                type="text"
                value={config.name}
                onChange={e => setConfig({ ...config, name: e.target.value })}
                style={{ width: 150 }}
              />
            </WsField>
            {surface === 'result' && result && result.status !== 'infeasible' && (
              <WsBtn icon={Printer} onClick={() => window.print()}>طباعة</WsBtn>
            )}
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="معلمون">{teachers.length}</WsFact>
            <WsFact icon={BookOpen} label="مواد">{subjects.length}</WsFact>
            <WsFact icon={GraduationCap} label="فصول">{classes.length}</WsFact>
            <WsFact icon={Shield} label="السعة">{totalCapacity}</WsFact>
            <WsFact icon={Hash} label="مطلوب">{totalRequired}</WsFact>
            <WsFact icon={CheckCircle} label="مُسند">
              <span style={{ color: TONES.green.tx }}>{totalAssigned}</span>
            </WsFact>
            <WsFact icon={AlertTriangle} label="متبقي">
              <span style={{ color: unassignedPeriods > 0 ? TONES.red.tx : TONES.green.tx }}>{unassignedPeriods}</span>
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <div className="ws-seg">
          {SURFACES.map(({ key, label, icon: Icon }) => {
            if (key === 'result' && !result) return null
            const count = key === 'quota' ? totalRequired : key === 'assign' ? unassignedPeriods : result?.schedule.length
            return (
              <button
                key={key}
                type="button"
                className={`ws-seg__btn ${surface === key ? 'is-active' : ''}`}
                onClick={() => setSurface(key)}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {label}
                {count != null && count > 0 && <span className="ws-count">{count}</span>}
              </button>
            )
          })}
        </div>

        {surface === 'assign' && (
          <>
            <WsField label="بحث" grow>
              <WsInput
                type="search"
                value={teacherSearch}
                onChange={e => setTeacherSearch(e.target.value)}
                placeholder="ابحث عن معلم..."
                style={{ width: '100%' }}
              />
            </WsField>
            <WsField label="الناقص فقط">
              <WsSwitch checked={onlyIncomplete} onChange={setOnlyIncomplete} />
            </WsField>
          </>
        )}

        {surface === 'result' && result && result.status !== 'infeasible' && (
          <WsField label="العرض">
            <div className="ws-seg">
              {([['class', 'حسب الفصل', GraduationCap], ['teacher', 'حسب المعلم', Users]] as const).map(([m, l, I]) => (
                <button
                  key={m}
                  type="button"
                  className={`ws-seg__btn ${viewMode === m ? 'is-active' : ''}`}
                  onClick={() => setViewMode(m)}
                >
                  <I style={{ width: 13, height: 13 }} />{l}
                </button>
              ))}
            </div>
          </WsField>
        )}
      </WsToolbar>

      <WsLayout>
        {/* ═══ الإعدادات — عمود مطوي افتراضياً ═══ */}
        <WsSideCol
          side="start"
          title="الإعدادات"
          icon={Settings2}
          storageKey="ws:schedule-simulator:config"
          width={280}
          defaultCollapsed
        >
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p className="ws-label" style={{ marginBottom: 6 }}>مصدر البيانات</p>
                <div className="ws-choice-grid">
                  {[
                    { key: 'existing' as const, label: 'بيانات المدرسة', icon: Database, tone: TONES.sky },
                    { key: 'custom' as const, label: 'بيانات تجريبية', icon: Sparkles, tone: TONES.purple },
                  ].map(opt => {
                    const isSelected = dataSource === opt.key
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                        style={isSelected
                          ? { background: opt.tone.bg, borderColor: opt.tone.tx, color: opt.tone.tx, boxShadow: `0 0 0 1px ${opt.tone.tx}` }
                          : undefined}
                        onClick={() => {
                          setDataSource(opt.key)
                          if (opt.key === 'custom') {
                            setTeachers([]); setSubjects([]); setClasses([]); setSubjectGradePeriods([]); setTeacherAssignments({})
                          }
                        }}
                      >
                        <Icon />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {isLoading && <WsEmpty loading>جاري التحميل...</WsEmpty>}

              {dataSource === 'custom' && !isLoading && teachers.length === 0 && (
                <WsBtn variant="primary" icon={Sparkles} onClick={generateMockData} style={{ justifyContent: 'center' }}>
                  توليد بيانات تجريبية
                </WsBtn>
              )}

              {teachers.length > 0 && (
                <>
                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>أيام العمل وعدد الحصص</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {WORKING_DAYS.map(day => {
                        const active = config.working_days.includes(day)
                        return (
                          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className={`ws-choice ${active ? 'is-selected' : ''}`}
                              style={{ flex: 1, justifyContent: 'flex-start', opacity: active ? 1 : 0.55 }}
                              onClick={() => setConfig({ ...config, working_days: active ? config.working_days.filter(d => d !== day) : [...config.working_days, day] })}
                            >
                              {active && <CheckCircle />}
                              {day}
                            </button>
                            {active && (
                              <WsInput
                                type="number"
                                min={1}
                                max={10}
                                value={config.periods_per_day[day] || 7}
                                onChange={e => setConfig({ ...config, periods_per_day: { ...config.periods_per_day, [day]: parseInt(e.target.value) || 7 } })}
                                style={{ width: 52, textAlign: 'center' }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      السقف المتاح لكل فصل: <b style={{ color: 'var(--ws-accent)' }}>{maxPerClass}</b> حصة أسبوعياً
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'أقصى حصص للمعلم/يوم', value: config.max_teacher_periods_per_day, key: 'max_teacher_periods_per_day', max: 10 },
                      { label: 'أقصى حصص متتالية', value: config.max_consecutive_periods, key: 'max_consecutive_periods', max: 10 },
                      { label: 'وقت الحل (ثانية)', value: config.time_limit_seconds, key: 'time_limit_seconds', max: 300 },
                    ].map(f => (
                      <WsField key={f.key} label={f.label}>
                        <WsInput
                          type="number"
                          min={1}
                          max={f.max}
                          value={f.value}
                          onChange={e => setConfig({ ...config, [f.key]: parseInt(e.target.value) || f.value })}
                        />
                      </WsField>
                    ))}
                  </div>

                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>قيود المواد (اختياري)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {subjects.map(sub => {
                        const c = subjectConstraints.find(sc => sc.subject_id === sub.id)
                        const update = (u: Partial<SubjectConstraint>) => {
                          setSubjectConstraints(prev => {
                            const existing = prev.find(sc => sc.subject_id === sub.id)
                            if (existing) return prev.map(sc => sc.subject_id === sub.id ? { ...sc, ...u } : sc)
                            return [...prev, { subject_id: sub.id, requires_consecutive: false, consecutive_count: 2, avoid_first_period: false, avoid_last_period: false, no_consecutive_days: false, max_per_day: 2, is_heavy: false, ...u }]
                          })
                        }
                        return (
                          <div key={sub.id} style={{ border: '1px solid var(--ws-border)', borderRadius: 8, padding: 7 }}>
                            <p style={{ margin: '0 0 5px', fontSize: 11.5, fontWeight: 700 }}>{sub.name}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {[
                                { label: 'ثقيلة', key: 'is_heavy' as const, val: c?.is_heavy },
                                { label: 'تجنب الأولى', key: 'avoid_first_period' as const, val: c?.avoid_first_period },
                                { label: 'تجنب الأخيرة', key: 'avoid_last_period' as const, val: c?.avoid_last_period },
                              ].map(f => (
                                <button
                                  key={f.key}
                                  type="button"
                                  className="ws-chip"
                                  onClick={() => update({ [f.key]: !f.val })}
                                  style={f.val
                                    ? { background: TONES.sky.bg, borderColor: TONES.sky.tx, color: TONES.sky.tx }
                                    : undefined}
                                >
                                  {f.label}
                                </button>
                              ))}
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                أقصى/يوم
                                <WsInput
                                  type="number"
                                  min={1}
                                  max={5}
                                  value={c?.max_per_day || 2}
                                  onChange={e => update({ max_per_day: parseInt(e.target.value) || 2 })}
                                  style={{ width: 42, textAlign: 'center' }}
                                />
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          {error && (
            <div style={{ padding: 10 }}>
              <WsAlert tone="error" boxed>{error}</WsAlert>
            </div>
          )}

          {/* ═══ سطح النصاب — مصفوفة واحدة: المواد × المراحل ═══ */}
          {surface === 'quota' && (
            <WsBlock fill title="نصاب المواد" icon={BookOpen} count={`${totalRequired} حصة`}>
              {uniqueGrades.length === 0 ? (
                <WsEmpty icon={AlertTriangle}>
                  <p style={{ margin: 0 }}>لا توجد فصول</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11 }}>افتح عمود «الإعدادات» واختر مصدر البيانات</p>
                </WsEmpty>
              ) : (
                <div className="ws-tablewrap">
                  <table className="ws-table ws-matrix">
                    <thead>
                      <tr>
                        <th className="ws-matrix__stick" style={{ minWidth: 130, textAlign: 'right' }}>المادة</th>
                        {uniqueGrades.map(grade => (
                          <th key={grade} style={{ minWidth: 84 }}>
                            {grade}
                            <span className="ws-count" style={{ marginInlineStart: 4 }}>{(classesByGrade[grade] || []).length}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(sub => (
                        <tr key={sub.id}>
                          <td className="ws-matrix__stick" style={{ textAlign: 'right', fontWeight: 600 }}>{sub.name}</td>
                          {uniqueGrades.map(grade => {
                            const ppw = getSubjectGradePpw(sub.id, grade)
                            /* خريطة حرارة سماوية: تتدرّج مع القيمة، والصفر بلا غسلة فتُقرأ الثقوب فوراً */
                            const heat = ppw > 0 ? Math.min(1, ppw / 6) : 0
                            return (
                              <td key={grade} style={{ padding: 3, background: ppw > 0 ? `rgba(33, 104, 158, ${0.05 + heat * 0.14})` : undefined }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={8}
                                  value={ppw || ''}
                                  onFocus={e => e.target.select()}
                                  onChange={e => {
                                    const v = e.target.value === '' ? 0 : Math.min(8, Math.max(0, parseInt(e.target.value) || 0))
                                    setSubjectGradePeriods(prev => {
                                      const filtered = prev.filter(s => !(s.subject_id === sub.id && s.grade === grade))
                                      return v > 0 ? [...filtered, { subject_id: sub.id, grade, periods_per_week: v }] : filtered
                                    })
                                  }}
                                  className="ws-input"
                                  style={{ width: '100%', textAlign: 'center', fontWeight: 700, padding: '3px 2px' }}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {/* صف المجموع اللاصق — السقف تحت العين وأنت تكتب */}
                      <tr style={{ position: 'sticky', bottom: 0, background: 'var(--ws-surface-2)', boxShadow: '0 -1px 0 var(--ws-border)' }}>
                        <td className="ws-matrix__stick" style={{ textAlign: 'right', fontWeight: 800, background: 'var(--ws-surface-2)' }}>
                          المجموع / {maxPerClass}
                        </td>
                        {uniqueGrades.map(grade => {
                          const total = gradeTotal(grade)
                          const over = total > maxPerClass
                          return (
                            <td
                              key={grade}
                              style={{
                                fontWeight: 800,
                                color: over ? TONES.red.tx : total === maxPerClass ? TONES.green.tx : 'var(--ws-text-2)',
                                background: over ? TONES.red.bg : undefined,
                              }}
                            >
                              {total}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </WsBlock>
          )}

          {/* ═══ سطح الإسناد ═══ */}
          {surface === 'assign' && (
            <WsBlock fill title="إسناد المعلمين" icon={Users} count={`${totalAssigned}/${totalRequired}`}>
              {teachers.length === 0 ? (
                <WsEmpty icon={Users}>لا يوجد معلمون — افتح عمود «الإعدادات» أولاً</WsEmpty>
              ) : visibleTeachers.length === 0 ? (
                <WsEmpty icon={Users}>لا معلمين مطابقين</WsEmpty>
              ) : (
                <div className="ws-block__scroll">
                  {visibleTeachers.map(teacher => {
                    const load = teacherLoad(teacher.id)
                    const quota = teacher.weekly_quota || 24
                    const assignments = teacherAssignments[teacher.id] || []
                    const overQuota = load > quota
                    const pct = Math.min(100, Math.round((load / quota) * 100))
                    const barTone = overQuota ? TONES.red : pct > 80 ? TONES.amber : TONES.green

                    return (
                      <div key={teacher.id} style={{ borderBottom: '1px solid var(--ws-hairline)' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 12px',
                            background: overQuota ? TONES.red.bg : 'var(--ws-surface-2)',
                          }}
                        >
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                              background: 'var(--ws-surface)',
                              border: '1px solid var(--ws-border)',
                            }}
                          >
                            {teacher.name.charAt(0)}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {teacher.name}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{ display: 'block', width: 90, height: 5, borderRadius: 3, background: 'var(--ws-border)', overflow: 'hidden' }}>
                                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: barTone.tx, borderRadius: 3 }} />
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: overQuota ? TONES.red.tx : 'var(--ws-text-2)' }}>
                                {load}/{quota}
                              </span>
                            </span>
                          </span>
                          <WsBtn size="sm" icon={Plus} onClick={() => addAssignment(teacher.id)}>مادة</WsBtn>
                        </div>

                        {assignments.length > 0 && (
                          <div>
                            {assignments.map((a, idx) => {
                              const ppw = getSubjectGradePpw(a.subject_id, a.grade)
                              const allGradeClasses = classesByGrade[a.grade] || []
                              const availableClasses = getAvailableClasses(teacher.id, a.subject_id, a.grade)
                              const availableIds = new Set(availableClasses.map(c => c.id))
                              const takenMap = takenClasses[`${a.subject_id}-${a.grade}`] || {}
                              const sessionCount = ppw * a.class_ids.length

                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderTop: '1px solid var(--ws-hairline)', flexWrap: 'wrap' }}>
                                  <select
                                    value={a.subject_id}
                                    onChange={e => {
                                      const sid = parseInt(e.target.value); const sub = subjects.find(s => s.id === sid)
                                      updateAssignment(teacher.id, idx, { subject_id: sid, subject_name: sub?.name || '', class_ids: [] })
                                    }}
                                    className="ws-select"
                                    style={{ width: 110 }}
                                  >
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>

                                  <select
                                    value={a.grade}
                                    onChange={e => updateAssignment(teacher.id, idx, { grade: e.target.value, class_ids: [] })}
                                    className="ws-select"
                                    style={{ width: 100 }}
                                  >
                                    {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>

                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    {availableClasses.length > 1 && (
                                      <button
                                        type="button"
                                        className="ws-chip"
                                        onClick={() => {
                                          const allIds = availableClasses.map(c => c.id)
                                          const allSelected = allIds.every(id => a.class_ids.includes(id))
                                          updateAssignment(teacher.id, idx, { class_ids: allSelected ? a.class_ids.filter(id => !allIds.includes(id)) : [...new Set([...a.class_ids, ...allIds])] })
                                        }}
                                        style={availableClasses.every(c => a.class_ids.includes(c.id))
                                          ? { background: TONES.green.bg, borderColor: TONES.green.tx, color: TONES.green.tx }
                                          : undefined}
                                      >
                                        الكل
                                      </button>
                                    )}
                                    {/* الفصل المحجوز لا يختفي: يظهر بحرف مالكه — البيانات في الحالة أصلاً وتُهدر */}
                                    {allGradeClasses.map(c => {
                                      const isMine = a.class_ids.includes(c.id)
                                      const isAvailable = availableIds.has(c.id)
                                      const ownerId = takenMap[c.id]
                                      const ownerName = ownerId != null ? teacherNameById[ownerId] : undefined
                                      return (
                                        <button
                                          key={c.id}
                                          type="button"
                                          disabled={!isAvailable}
                                          onClick={() => isAvailable && toggleClass(teacher.id, idx, c.id)}
                                          title={isAvailable ? c.class_name : `محجوز لـ ${ownerName ?? 'معلم آخر'}`}
                                          style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 6,
                                            fontSize: 10,
                                            fontWeight: 800,
                                            fontFamily: 'inherit',
                                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                                            border: `1px solid ${isMine ? TONES.green.tx : 'var(--ws-border)'}`,
                                            background: isMine ? TONES.green.tx : isAvailable ? 'var(--ws-surface)' : TONES.gray.bg,
                                            color: isMine ? '#fff' : isAvailable ? 'var(--ws-text-2)' : TONES.gray.tx,
                                            opacity: isAvailable ? 1 : 0.6,
                                          }}
                                        >
                                          {isAvailable ? c.class_name : (ownerName?.charAt(0) ?? '·')}
                                        </button>
                                      )
                                    })}
                                  </span>

                                  {sessionCount > 0 && <ToneChip tone={TONES.sky}>{sessionCount} حصة</ToneChip>}

                                  <WsIconBtn
                                    icon={X}
                                    label="حذف الإسناد"
                                    onClick={() => removeAssignment(teacher.id, idx)}
                                    style={{ marginInlineStart: 'auto', color: TONES.red.tx }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </WsBlock>
          )}

          {/* ═══ سطح النتيجة ═══ */}
          {surface === 'result' && result && (
            result.status === 'infeasible' ? (
              <WsBlock fill scroll>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <WsAlert tone="error" boxed>
                    <span>
                      <b>لا يمكن إنشاء جدول</b>
                      {result.error_message && <span style={{ display: 'block', marginTop: 3 }}>{result.error_message}</span>}
                    </span>
                  </WsAlert>
                  {result.conflicts.map((c, i) => {
                    const tone = c.severity === 'high' || c.severity === 'critical' ? TONES.red : TONES.amber
                    return (
                      <div key={i} style={{ background: tone.bg, border: `1px solid ${tone.bd}`, borderRadius: 8, padding: 9 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: tone.tx }}>{c.message}</p>
                        {/* suggestion كان يصل ولا يُعرض — c.message وحدها كانت تُرسم */}
                        {c.suggestion && (
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>{c.suggestion}</p>
                        )}
                      </div>
                    )
                  })}
                  <WsBtn icon={Users} onClick={() => setSurface('assign')} style={{ justifyContent: 'center' }}>
                    عدّل الإسناد
                  </WsBtn>
                </div>
              </WsBlock>
            ) : (
              <WsBlock
                fill
                scroll
                title={viewMode === 'class' ? 'جداول الفصول' : 'جداول المعلمين'}
                icon={Grid3x3}
                count={result.schedule.length}
              >
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(viewMode === 'class'
                    ? Object.entries(result.by_class).map(([k, d]: [string, any]) => ({
                      key: k, title: `${d.grade} - ${d.class_name}`, count: (d.sessions || []).length, grid: classGrids[k] || {},
                    }))
                    : Object.entries(result.by_teacher).map(([k, d]: [string, any]) => ({
                      key: k, title: d.teacher_name, count: (d.sessions || []).length, grid: teacherGrids[k] || {},
                    }))
                  ).map(({ key, title, count, grid }) => (
                    <div key={key} style={{ border: '1px solid var(--ws-border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--ws-surface-2)', borderBottom: '1px solid var(--ws-hairline)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{count} حصة</span>
                      </div>
                      <div className="ws-tablewrap">
                        <table className="ws-table ws-matrix">
                          <thead>
                            <tr>
                              <th className="ws-matrix__stick" style={{ width: 34 }}>ح</th>
                              {config.working_days.map(day => <th key={day} style={{ minWidth: 96 }}>{day}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {/* الصفوف = أقصى حصص عبر الأيام لا الافتراضي — وإلا اقتُطعت حصص الأيام الأطول */}
                            {Array.from({ length: maxPeriodsInAnyDay }, (_, i) => i + 1).map(p => (
                              <tr key={p}>
                                <td className="ws-matrix__stick" style={{ fontWeight: 700, color: 'var(--ws-text-2)' }}>{p}</td>
                                {config.working_days.map(day => {
                                  const dayPeriods = config.periods_per_day[day] || config.default_periods_per_day
                                  if (p > dayPeriods) {
                                    return (
                                      <td key={day} style={{ background: 'var(--ws-surface-2)', opacity: 0.5 }} title="اليوم انتهى">
                                        <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>—</span>
                                      </td>
                                    )
                                  }
                                  const s = grid[day]?.[p]
                                  const tone = s ? subjectColors[s.subject_name] : null
                                  return (
                                    <td key={day} style={{ padding: 2 }}>
                                      {s ? (
                                        <div
                                          style={{
                                            borderRadius: 6,
                                            padding: '3px 4px',
                                            background: tone?.bg,
                                            border: `1px solid ${tone?.bd}`,
                                          }}
                                        >
                                          <div style={{ fontSize: 10.5, fontWeight: 800, color: tone?.tx }}>{s.subject_name}</div>
                                          <div style={{ fontSize: 9, color: 'var(--ws-text-2)' }}>
                                            {viewMode === 'class' ? s.teacher_name : `${s.grade} - ${s.class_name}`}
                                          </div>
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: 10, color: 'var(--ws-border)' }}>·</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </WsBlock>
            )
          )}
        </WsMain>

        {/* ═══ ★ الميزان — عمود الحكم ثلاثي الأطوار ═══ */}
        <WsSideCol side="end" title="الميزان" icon={Scale} storageKey="ws:schedule-simulator:balance" width={320}>
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* ── الطور 2: أثناء التوليد ── */}
              {isRunning ? (
                <>
                  <ToneChip tone={TONES.purple}>
                    <span className="ws-pulse" style={{ background: TONES.purple.tx }} />
                    المحرّك يعمل
                  </ToneChip>

                  <div className="ws-timeline" style={{ padding: '6px 0 0' }}>
                    {AI_PHASES.map((phase, index) => {
                      const Icon = phase.icon
                      const isPast = index < aiPhase
                      const isCurrent = index === aiPhase
                      return (
                        <div
                          key={index}
                          className={`ws-timeline__item ${isPast ? 'is-past' : ''} ${isCurrent ? 'is-current' : ''}`}
                          style={{ paddingInlineStart: 44, marginBottom: 8 }}
                        >
                          <span className="ws-timeline__node" style={{ width: 40 }}>
                            <span
                              className="ws-timeline__dot"
                              style={{
                                width: 24,
                                height: 24,
                                background: isCurrent ? TONES.purple.bg : isPast ? TONES.green.bg : 'var(--ws-surface-2)',
                                color: isCurrent ? TONES.purple.tx : isPast ? TONES.green.tx : 'var(--ws-text-2)',
                              }}
                            >
                              <Icon style={{ width: 12, height: 12 }} />
                            </span>
                          </span>
                          {/* بطاقة عادية لا ws-timeline__card — الكلاس يحمل حداً جانبياً ملوّناً ممنوعاً */}
                          <p style={{ margin: 0, paddingTop: 4, fontSize: 11.5, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--ws-text)' : 'var(--ws-text-2)' }}>
                            {phase.message}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* شريط زمن صادق: يقيس المهلة الحقيقية لا طول النص العربي */}
                  <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 10 }}>
                    <span style={{ display: 'block', height: 6, borderRadius: 3, background: 'var(--ws-border)', overflow: 'hidden' }}>
                      <span
                        style={{
                          display: 'block',
                          height: '100%',
                          width: `${Math.min(100, (elapsedSeconds / Math.max(1, config.time_limit_seconds)) * 100)}%`,
                          background: TONES.purple.tx,
                          borderRadius: 3,
                          transition: 'width 1s linear',
                        }}
                      />
                    </span>
                    <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      {elapsedSeconds}ث من {config.time_limit_seconds}ث · تنتهي المهلة بعد {Math.max(0, config.time_limit_seconds - elapsedSeconds)}ث
                    </p>
                  </div>
                </>
              ) : result && result.status !== 'infeasible' ? (
                /* ── الطور 3: تقرير الجودة ── */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width="72" height="72" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ws-border)" strokeWidth="8" />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke={score >= 90 ? TONES.green.tx : score >= 70 ? TONES.amber.tx : TONES.red.tx}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${score * 2.64} 264`}
                        />
                      </svg>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>
                        {Math.round(score)}
                      </span>
                    </span>
                    <div>
                      <ToneChip tone={result.status === 'optimal' ? TONES.green : result.status === 'timeout' ? TONES.amber : TONES.sky}>
                        {result.status === 'optimal' ? 'حل مثالي' : result.status === 'timeout' ? 'انتهت المهلة — حل جزئي' : 'حل مقبول'}
                      </ToneChip>
                      <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                        {(result.solving_time_ms / 1000).toFixed(1)}ث · {result.schedule.length} حصة · {Object.keys(result.by_teacher).length} معلم
                      </p>
                    </div>
                  </div>

                  {result.quality_report && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {([
                          ['الفراغات', result.quality_report.gap_score ?? 0],
                          ['توزيع المواد', result.quality_report.distribution_score ?? 0],
                          ['توازن الحمل', result.quality_report.load_balance_score ?? 0],
                          ['المتتالية', result.quality_report.consecutive_score ?? 0],
                          ['رضا المعلمين', result.quality_report.teacher_satisfaction ?? 0],
                        ] as Array<[string, number]>).map(([label, value]) => {
                          const tone = value >= 90 ? TONES.green : value >= 70 ? TONES.amber : TONES.red
                          return (
                            <div key={label}>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                                <span style={{ color: 'var(--ws-text-2)' }}>{label}</span>
                                <b style={{ color: tone.tx }}>{Math.round(value)}%</b>
                              </span>
                              <span style={{ display: 'block', height: 4, borderRadius: 2, background: 'var(--ws-border)', overflow: 'hidden', marginTop: 3 }}>
                                <span style={{ display: 'block', height: '100%', width: `${value}%`, background: tone.tx, borderRadius: 2 }} />
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* حقول تصل من المحرّك ولم يعرضها العرض قط */}
                      <WsFactsList>
                        <WsFactRow label="القيود الصارمة">{Math.round(result.quality_report.hard_constraints_met ?? 0)}%</WsFactRow>
                        <WsFactRow label="الدرجة المرنة">{Math.round(result.quality_report.soft_score ?? 0)}%</WsFactRow>
                        <WsFactRow label="الحصص الموضوعة">
                          {result.quality_report.details?.total_sessions_placed ?? 0} / {result.quality_report.details?.total_requirements ?? 0}
                        </WsFactRow>
                        <WsFactRow label="الفراغات">{result.quality_report.details?.gap_count ?? 0}</WsFactRow>
                        <WsFactRow label="متوسط الحمل اليومي">{result.quality_report.details?.avg_daily_load ?? 0}</WsFactRow>
                        <WsFactRow label="أقصى حمل يومي">{result.quality_report.details?.max_daily_load ?? 0}</WsFactRow>
                        <WsFactRow label="المعلمون المستخدمون">{result.quality_report.details?.teachers_used ?? 0}</WsFactRow>
                      </WsFactsList>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--ws-hairline)', paddingTop: 10 }}>
                    <WsBtn icon={Play} onClick={runSimulation} style={{ flex: 1, justifyContent: 'center' }}>إعادة التوليد</WsBtn>
                    <WsBtn icon={RefreshCw} onClick={() => { setResult(null); setSurface('quota') }} style={{ flex: 1, justifyContent: 'center' }}>
                      جديد
                    </WsBtn>
                  </div>
                </>
              ) : (
                /* ── الطور 1: ميزان الجدوى ── */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <ToneChip tone={verdict.tone}>{verdict.label}</ToneChip>
                    <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{totalSessions} حصة</span>
                  </div>

                  {/* شريط السعة المكدّس: مُسند + متبقي على خلفية مطلوب */}
                  {totalRequired > 0 && (
                    <div>
                      <span style={{ display: 'flex', height: 8, borderRadius: 4, background: 'var(--ws-border)', overflow: 'hidden' }}>
                        <span style={{ height: '100%', width: `${Math.min(100, (totalAssigned / totalRequired) * 100)}%`, background: TONES.green.tx }} />
                        <span style={{ height: '100%', width: `${Math.min(100, (unassignedPeriods / totalRequired) * 100)}%`, background: TONES.red.tx }} />
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5 }}>
                        <span style={{ color: TONES.green.tx }}>مُسند {totalAssigned}</span>
                        <span style={{ color: 'var(--ws-text-2)' }}>مطلوب {totalRequired}</span>
                        <span style={{ color: unassignedPeriods > 0 ? TONES.red.tx : 'var(--ws-text-2)' }}>متبقي {unassignedPeriods}</span>
                      </span>
                    </div>
                  )}

                  {/* معوّقات قابلة للنقر: كل معوّق يشخّص ويُنقّل */}
                  {blockers.length > 0 ? (
                    <div>
                      <p className="ws-label" style={{ marginBottom: 5 }}>ما يمنع الحل ({blockers.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {blockers.map((blocker, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSurface(blocker.surface)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              textAlign: 'right',
                              background: blocker.tone.bg,
                              border: `1px solid ${blocker.tone.bd}`,
                              borderRadius: 8,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              fontSize: 11,
                              color: blocker.tone.tx,
                            }}
                          >
                            <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{blocker.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : totalRequired > 0 ? (
                    <WsAlert tone="success" boxed>لا معوّقات — المواصفة متّسقة وجاهزة للتوليد</WsAlert>
                  ) : (
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                      ابدأ بضبط نصاب المواد لكل مرحلة في سطح «النصاب»، ثم أسند الفصول للمعلمين.
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', borderTop: '1px solid var(--ws-hairline)', paddingTop: 10 }}>
                    <WsBtn
                      variant="primary"
                      icon={Brain}
                      onClick={runSimulation}
                      disabled={totalSessions === 0 || fatalCount > 0}
                      style={{ width: '100%', justifyContent: 'center', padding: '10px 14px' }}
                    >
                      بدء التوليد الذكي
                    </WsBtn>
                    {/* الزر يعرف سبب تعطّله بدل disabled أعمى */}
                    {fatalCount > 0 ? (
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: TONES.red.tx, textAlign: 'center' }}>
                        عالج {fatalCount} معوّقاً مانعاً أولاً — المواصفة مستحيلة رياضياً
                      </p>
                    ) : totalSessions === 0 ? (
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                        لا حصص لجدولتها — اضبط النصاب وأسند الفصول
                      </p>
                    ) : (
                      <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'center' }}>
                        {totalSessions} حصة سيتم جدولتها · مهلة {config.time_limit_seconds}ث
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}
