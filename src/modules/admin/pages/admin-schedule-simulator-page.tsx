import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Users, BookOpen, GraduationCap, Play, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Loader2, Database, Sparkles, Brain, Zap,
  BarChart3, Clock, Target, TrendingUp, Shield, Award, RefreshCw, Plus, X,
  Hash,
} from 'lucide-react'
import { apiClient } from '@/services/api/client'

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
  warnings?: Array<{ type: string; message: string }>
  suggestions?: string[]
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

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

const WORKING_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const STEPS = [
  { id: 1, title: 'البيانات والإعدادات', icon: Database },
  { id: 2, title: 'المواد ونصابها', icon: BookOpen },
  { id: 3, title: 'المعلمون وتوزيعهم', icon: Users },
  { id: 4, title: 'التوليد', icon: Play },
]
const API_BASE = '/admin/schedule-simulator'

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function AdminScheduleSimulatorPage() {
  // ── State ──
  const [currentStep, setCurrentStep] = useState(1)
  const [dataSource, setDataSource] = useState<'existing' | 'custom'>('existing')
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class')

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
  // @ts-expect-error reserved for future use
  const [requirements, setRequirements] = useState<ClassRequirement[]>([])
  const [teacherPreferences, setTeacherPreferences] = useState<TeacherPreference[]>([])
  const [subjectConstraints, setSubjectConstraints] = useState<SubjectConstraint[]>([])

  // Step 2: Subject periods per grade
  const [subjectGradePeriods, setSubjectGradePeriods] = useState<SubjectGradePeriods[]>([])

  // Step 3: Teacher assignments (teacher → subjects + classes)
  const [teacherAssignments, setTeacherAssignments] = useState<Record<number, TeacherAssignment[]>>({})

  // AI loading
  const [aiPhase, setAiPhase] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      const advance = () => { if (idx < AI_PHASES.length - 1) { idx++; setAiPhase(idx); setTimeout(advance, AI_PHASES[idx].message.length * 80) } }
      setTimeout(advance, 3000)
    } else { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
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

  // Unassigned periods: for each subject+grade, how many class slots are not assigned to any teacher
  const unassignedPeriods = useMemo(() => {
    let total = 0
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
      }
    }
    return total
  }, [uniqueGrades, classesByGrade, subjects, getSubjectGradePpw, teacherAssignments])

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

  const COLORS = [
    { bg: 'bg-teal-50', text: 'text-teal-800', sub: 'text-teal-600', border: 'border-teal-200' },
    { bg: 'bg-blue-50', text: 'text-blue-800', sub: 'text-blue-600', border: 'border-blue-200' },
    { bg: 'bg-violet-50', text: 'text-violet-800', sub: 'text-violet-600', border: 'border-violet-200' },
    { bg: 'bg-amber-50', text: 'text-amber-800', sub: 'text-amber-600', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-800', sub: 'text-rose-600', border: 'border-rose-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-800', sub: 'text-emerald-600', border: 'border-emerald-200' },
    { bg: 'bg-sky-50', text: 'text-sky-800', sub: 'text-sky-600', border: 'border-sky-200' },
    { bg: 'bg-orange-50', text: 'text-orange-800', sub: 'text-orange-600', border: 'border-orange-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-800', sub: 'text-indigo-600', border: 'border-indigo-200' },
    { bg: 'bg-pink-50', text: 'text-pink-800', sub: 'text-pink-600', border: 'border-pink-200' },
  ]
  const subjectColors = useMemo(() => {
    if (!result?.schedule) return {}
    const map: Record<string, typeof COLORS[0]> = {}
    ;[...new Set(result.schedule.map(s => s.subject_name))].forEach((n, i) => { map[n] = COLORS[i % COLORS.length] })
    return map
  }, [result?.schedule])

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
        setRequirements(d.requirements || []); setTeacherPreferences(d.teacher_preferences || [])
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
        setResult({ status: 'optimal', solving_time_ms: rr.data.data.solving_time_ms || 0, schedule: rr.data.data.result?.schedule || [], by_teacher: rr.data.data.result?.by_teacher || {}, by_class: rr.data.data.result?.by_class || {}, quality_report: rr.data.data.quality_report, conflicts: [] })
        setCurrentStep(5)
      } else {
        setResult({ status: 'infeasible', solving_time_ms: 0, schedule: [], by_teacher: {}, by_class: {}, quality_report: null, conflicts: rr.data.conflicts || [], conflict_heatmap: rr.data.conflict_heatmap, error_message: rr.data.message })
        setCurrentStep(5)
      }
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'حدث خطأ') } finally { setIsRunning(false) }
  }

  // ── Step 1: Data Source + Settings ──
  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-bl from-teal-500 to-emerald-600 shadow-lg shadow-teal-200">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">إعداد الجدول</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">اختر مصدر البيانات وحدد الإعدادات الأساسية</p>
      </div>

      {/* Data source */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'existing' as const, label: 'بيانات المدرسة', desc: 'المعلمون والمواد من النظام', icon: Database, color: 'teal' },
          { key: 'custom' as const, label: 'بيانات تجريبية', desc: 'توليد بيانات للتجربة', icon: Sparkles, color: 'violet' },
        ].map(opt => (
          <button key={opt.key} onClick={() => { setDataSource(opt.key); if (opt.key === 'custom') { setTeachers([]); setSubjects([]); setClasses([]); setRequirements([]); setSubjectGradePeriods([]); setTeacherAssignments({}) } }}
            className={`relative rounded-xl border-2 p-4 text-right transition-all ${dataSource === opt.key ? `border-${opt.color}-500 bg-${opt.color}-50/50 shadow-md` : 'border-slate-200 hover:border-slate-300'}`}>
            {dataSource === opt.key && <CheckCircle className={`absolute left-2 top-2 h-4 w-4 text-${opt.color}-600`} />}
            <opt.icon className={`h-6 w-6 ${dataSource === opt.key ? `text-${opt.color}-600` : 'text-slate-400'}`} />
            <div className="mt-2 text-sm font-bold text-slate-900">{opt.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{opt.desc}</div>
          </button>
        ))}
      </div>

      {isLoading && <div className="flex items-center justify-center rounded-xl bg-slate-50 py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /><span className="mr-2 text-sm text-slate-500">جاري التحميل...</span></div>}

      {dataSource === 'custom' && !isLoading && teachers.length === 0 && (
        <button onClick={generateMockData} className="flex w-full items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-right transition hover:bg-violet-100">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <div className="flex-1"><div className="text-sm font-bold text-violet-900">توليد بيانات تجريبية</div><div className="text-xs text-violet-600">10 معلمين + 8 مواد + 9 فصول</div></div>
        </button>
      )}

      {teachers.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'المعلمون', count: teachers.length, icon: Users, c: 'blue' },
            { label: 'المواد', count: subjects.length, icon: BookOpen, c: 'violet' },
            { label: 'الفصول', count: classes.length, icon: GraduationCap, c: 'teal' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 rounded-lg bg-${s.c}-50 p-3`}>
              <s.icon className={`h-4 w-4 text-${s.c}-600`} />
              <div><div className={`text-lg font-bold text-${s.c}-700`}>{s.count}</div><div className="text-[10px] text-slate-500">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {teachers.length > 0 && (
        <>
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="mb-2 block text-xs font-bold text-slate-600">اسم الجدول</label>
            <input type="text" value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <label className="mb-2 block text-xs font-bold text-slate-600">أيام العمل وعدد الحصص</label>
            <div className="grid grid-cols-5 gap-2">
              {WORKING_DAYS.map(day => {
                const active = config.working_days.includes(day)
                return (
                  <div key={day} className={`overflow-hidden rounded-lg border ${active ? 'border-teal-400' : 'border-slate-200 opacity-50'}`}>
                    <button onClick={() => setConfig({ ...config, working_days: active ? config.working_days.filter(d => d !== day) : [...config.working_days, day] })}
                      className={`flex w-full items-center justify-center gap-1 py-1.5 text-xs font-bold ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {active && <CheckCircle className="h-3 w-3" />}{day}
                    </button>
                    {active && (
                      <input type="number" min={1} max={10} value={config.periods_per_day[day] || 7}
                        onChange={e => setConfig({ ...config, periods_per_day: { ...config.periods_per_day, [day]: parseInt(e.target.value) || 7 } })}
                        className="w-full border-t border-slate-200 p-1 text-center text-sm font-bold text-teal-700 focus:outline-none" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'أقصى حصص/يوم', value: config.max_teacher_periods_per_day, key: 'max_teacher_periods_per_day', icon: Target },
              { label: 'أقصى متتالية', value: config.max_consecutive_periods, key: 'max_consecutive_periods', icon: RefreshCw },
              { label: 'وقت الحل (ث)', value: config.time_limit_seconds, key: 'time_limit_seconds', icon: Clock },
            ].map(f => (
              <div key={f.key} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-1 text-[10px] text-slate-500"><f.icon className="h-3 w-3" />{f.label}</div>
                <input type="number" min={1} max={f.key === 'time_limit_seconds' ? 300 : 10} value={f.value}
                  onChange={e => setConfig({ ...config, [f.key]: parseInt(e.target.value) || f.value })}
                  className="mt-1 w-full rounded border border-slate-200 p-1 text-center text-lg font-bold text-slate-800 focus:border-teal-500 focus:outline-none" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  // ── Step 2: Subjects + periods per grade + constraints ──
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">المواد ونصابها</h2>
          <p className="text-xs text-slate-500">حدد عدد حصص كل مادة لكل مرحلة</p>
        </div>
        <div className="text-xs text-slate-500">المتاح/فصل: <span className="font-bold text-teal-700">{maxPerClass}</span> حصة</div>
      </div>

      {uniqueGrades.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 text-sm text-amber-800">لا توجد فصول. ارجع للخطوة السابقة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueGrades.map(grade => {
            const total = gradeTotal(grade)
            const overLimit = total > maxPerClass
            return (
              <div key={grade} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-2 ${overLimit ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <span className="text-sm font-bold text-slate-800">{grade}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{(classesByGrade[grade] || []).length} فصول</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${overLimit ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                      {total}/{maxPerClass}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 md:grid-cols-4">
                  {subjects.map(sub => {
                    const ppw = getSubjectGradePpw(sub.id, grade)
                    return (
                      <div key={sub.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5">
                        <span className="flex-1 truncate text-xs text-slate-700">{sub.name}</span>
                        <input type="number" min={0} max={8} value={ppw || ''}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const v = e.target.value === '' ? 0 : Math.min(8, Math.max(0, parseInt(e.target.value) || 0))
                            setSubjectGradePeriods(prev => {
                              const filtered = prev.filter(s => !(s.subject_id === sub.id && s.grade === grade))
                              return v > 0 ? [...filtered, { subject_id: sub.id, grade, periods_per_week: v }] : filtered
                            })
                          }}
                          className="w-12 rounded border border-slate-200 p-1 text-center text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Subject constraints */}
          <details className="rounded-xl border border-slate-200">
            <summary className="cursor-pointer px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">قيود المواد (اختياري)</summary>
            <div className="space-y-1 p-2">
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
                  <div key={sub.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="w-20 font-bold text-slate-700">{sub.name}</span>
                    {[
                      { label: 'ثقيلة', key: 'is_heavy', val: c?.is_heavy },
                      { label: 'تجنب الأولى', key: 'avoid_first_period', val: c?.avoid_first_period },
                      { label: 'تجنب الأخيرة', key: 'avoid_last_period', val: c?.avoid_last_period },
                    ].map(f => (
                      <label key={f.key} className="flex items-center gap-1 text-slate-600">
                        <input type="checkbox" checked={!!f.val} onChange={e => update({ [f.key]: e.target.checked })} className="h-3 w-3 rounded border-slate-300 text-teal-600" />{f.label}
                      </label>
                    ))}
                    <label className="flex items-center gap-1 text-slate-600">
                      أقصى/يوم <input type="number" min={1} max={5} value={c?.max_per_day || 2} onChange={e => update({ max_per_day: parseInt(e.target.value) || 2 })} className="w-10 rounded border border-slate-200 px-1 text-center" />
                    </label>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )

  // ── Step 3: Teachers + assignments ──
  const renderStep3 = () => {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-expect-error reserved for future use
    const selectAllClasses = (tid: number, idx: number, grade: string) => {
      const allIds = (classesByGrade[grade] || []).map(c => c.id)
      setTeacherAssignments(prev => {
        const assignments = [...(prev[tid] || [])]
        const a = { ...assignments[idx] }
        a.class_ids = a.class_ids.length === allIds.length ? [] : [...allIds]
        assignments[idx] = a
        return { ...prev, [tid]: assignments }
      })
    }

    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
        {/* Header ثابت */}
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">المعلمون وتوزيعهم</h2>
            <p className="text-xs text-slate-500">حدد مواد وفصول كل معلم</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-teal-100 px-2 py-1 font-bold text-teal-700">مُسند: {totalAssigned}</span>
            <span className={`rounded-full px-2 py-1 font-bold ${unassignedPeriods > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              متبقي: {unassignedPeriods}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">مطلوب: {totalRequired}</span>
          </div>
        </div>

        {/* قائمة قابلة للتمرير */}
        <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          {teachers.map(teacher => {
            const load = teacherLoad(teacher.id)
            const quota = teacher.weekly_quota || 24
            // @ts-expect-error reserved for future use
            const pref = teacherPreferences.find(p => p.teacher_id === teacher.id)
            const assignments = teacherAssignments[teacher.id] || []
            const overQuota = load > quota
            const pct = Math.min(100, Math.round((load / quota) * 100))

            return (
              <div key={teacher.id} className={`rounded-xl border overflow-hidden ${overQuota ? 'border-red-300' : 'border-slate-200'}`}>
                {/* Teacher header */}
                <div className={`flex items-center gap-3 px-3 py-2 ${overQuota ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-600 shadow-sm">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{teacher.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full transition-all ${overQuota ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${overQuota ? 'text-red-600' : 'text-slate-500'}`}>{load}/{quota}</span>
                    </div>
                  </div>
                  <button onClick={() => addAssignment(teacher.id)} className="flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-teal-700">
                    <Plus className="h-3 w-3" />مادة
                  </button>
                </div>

                {/* Assignments */}
                {assignments.length > 0 && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {assignments.map((a, idx) => {
                      const ppw = getSubjectGradePpw(a.subject_id, a.grade)
                      const availableClasses = getAvailableClasses(teacher.id, a.subject_id, a.grade)
                      const sessionCount = ppw * a.class_ids.length

                      return (
                        <div key={idx} className="flex items-start gap-2 px-3 py-2">
                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            {/* Subject */}
                            <select value={a.subject_id} onChange={e => {
                              const sid = parseInt(e.target.value); const sub = subjects.find(s => s.id === sid)
                              updateAssignment(teacher.id, idx, { subject_id: sid, subject_name: sub?.name || '', class_ids: [] })
                            }} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium focus:border-teal-500 focus:outline-none">
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            {/* Grade */}
                            <select value={a.grade} onChange={e => updateAssignment(teacher.id, idx, { grade: e.target.value, class_ids: [] })}
                              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium focus:border-teal-500 focus:outline-none">
                              {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>

                            {/* Classes - only show available (not taken by other teachers) */}
                            <div className="flex items-center gap-1">
                              {availableClasses.length > 1 && (
                                <button onClick={() => {
                                  const allIds = availableClasses.map(c => c.id)
                                  const allSelected = allIds.every(id => a.class_ids.includes(id))
                                  updateAssignment(teacher.id, idx, { class_ids: allSelected ? a.class_ids.filter(id => !allIds.includes(id)) : [...new Set([...a.class_ids, ...allIds])] })
                                }}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${availableClasses.every(c => a.class_ids.includes(c.id)) ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                  الكل
                                </button>
                              )}
                              {availableClasses.map(c => (
                                <button key={c.id} onClick={() => toggleClass(teacher.id, idx, c.id)}
                                  className={`h-6 w-6 rounded text-[10px] font-bold ${a.class_ids.includes(c.id) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                  {c.class_name}
                                </button>
                              ))}
                              {availableClasses.length === 0 && (
                                <span className="text-[10px] text-red-500">كل الفصول مأخوذة</span>
                              )}
                            </div>

                            {/* Count */}
                            {sessionCount > 0 && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{sessionCount} حصة</span>
                            )}
                          </div>

                          <button onClick={() => removeAssignment(teacher.id, idx)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Step 4: Generate ──
  const renderStep4 = () => {
    const reqs = buildRequirements()
    const totalSessions = reqs.reduce((s, r) => s + r.periods_per_week, 0)

    return (
      <div className="space-y-5">
        {!isRunning && !result && (
          <>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">مراجعة وتوليد</h2>
              <p className="text-xs text-slate-500">راجع البيانات ثم ابدأ التوليد</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'المعلمون', value: teachers.length, icon: Users },
                { label: 'المواد', value: subjects.length, icon: BookOpen },
                { label: 'الفصول', value: classes.length, icon: GraduationCap },
                { label: 'الحصص', value: totalSessions, icon: Hash },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <s.icon className="mx-auto h-4 w-4 text-teal-600" />
                  <div className="mt-1 text-xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {unassignedPeriods > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mb-1 inline h-4 w-4" /> يوجد <span className="font-bold">{unassignedPeriods}</span> حصة لم تُسند لمعلمين. ارجع للخطوة السابقة.
              </div>
            )}

            <button onClick={runSimulation} disabled={totalSessions === 0}
              className="group w-full rounded-xl bg-gradient-to-l from-teal-600 to-emerald-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-40">
              <span className="flex items-center justify-center gap-2">
                <Brain className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>بدء التوليد الذكي</span>
              </span>
              <span className="mt-1 block text-xs font-normal text-teal-200">{totalSessions} حصة سيتم جدولتها</span>
            </button>
          </>
        )}

        {isRunning && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-8 text-center">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-teal-500/20" />
              {(() => { const I = AI_PHASES[aiPhase]?.icon || Brain; return <I className="relative h-8 w-8 text-teal-400" /> })()}
            </div>
            <h3 className="text-lg font-bold text-white">الذكاء الاصطناعي يبني الجدول</h3>
            <p className="mt-2 text-sm text-teal-300">{AI_PHASES[aiPhase]?.message}</p>
            <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-l from-teal-400 to-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(95, ((aiPhase + 1) / AI_PHASES.length) * 100)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span><Clock className="inline h-3 w-3" /> {elapsedSeconds}ث</span>
              <span><Hash className="inline h-3 w-3" /> {totalSessions} حصة</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Step 5: Results ──
  const renderResults = () => {
    if (!result) return null

    if (result.status === 'infeasible') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertTriangle className="mb-2 h-6 w-6 text-red-600" />
            <h2 className="text-lg font-bold text-red-900">لا يمكن إنشاء جدول</h2>
            <p className="mt-1 text-sm text-red-700">{result.error_message}</p>
          </div>
          {result.conflicts.length > 0 && (
            <div className="space-y-2">{result.conflicts.map((c, i) => (
              <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm text-red-800">{c.message}</div>
            ))}</div>
          )}
          <button onClick={() => { setResult(null); setCurrentStep(3) }} className="w-full rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">تعديل الإعدادات</button>
        </div>
      )
    }

    const qr = result.quality_report
    const score = qr?.overall_score ?? 0

    const ScoreBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-600"><Icon className="h-3 w-3" />{label}</span>
          <span className={`font-bold ${value >= 90 ? 'text-emerald-600' : value >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(value)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    )

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-teal-950 to-slate-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-xs text-teal-300"><CheckCircle className="h-3 w-3" />{result.status === 'optimal' ? 'حل مثالي' : 'حل مقبول'}</div>
              <h2 className="mt-1 text-xl font-bold">تم بناء الجدول</h2>
              <p className="mt-0.5 text-xs text-slate-300">{(result.solving_time_ms / 1000).toFixed(1)}ث | {result.schedule.length} حصة | {Object.keys(result.by_teacher).length} معلم</p>
            </div>
            <div className="relative h-20 w-20">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={score >= 90 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${score * 2.64} 264`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold">{Math.round(score)}</span></div>
            </div>
          </div>
        </div>

        {/* Quality */}
        {qr && (
          <div className="grid gap-3 md:grid-cols-2">
            <ScoreBar label="الفراغات" value={qr.gap_score ?? 0} icon={Zap} />
            <ScoreBar label="توزيع المواد" value={qr.distribution_score ?? 0} icon={BarChart3} />
            <ScoreBar label="توازن الحمل" value={qr.load_balance_score ?? 0} icon={TrendingUp} />
            <ScoreBar label="المتتالية" value={qr.consecutive_score ?? 0} icon={RefreshCw} />
          </div>
        )}

        {/* View tabs */}
        <div className="flex gap-2">
          {([['class', 'حسب الفصل', GraduationCap], ['teacher', 'حسب المعلم', Users]] as const).map(([m, l, I]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${viewMode === m ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <I className="h-3 w-3" />{l}
            </button>
          ))}
        </div>

        {/* Grids */}
        {viewMode === 'class' && Object.entries(result.by_class).map(([k, d]: [string, any]) => {
          const grid = classGrids[k] || {}
          return (
            <div key={k} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                <span className="text-sm font-bold text-slate-800">{d.grade} - {d.class_name}</span>
                <span className="text-[10px] text-teal-600 font-bold">{(d.sessions||[]).length} حصة</span>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="min-w-full">
                  <thead><tr><th className="w-10 px-1 py-1 text-[10px] text-slate-400">ح</th>{config.working_days.map(d => <th key={d} className="px-1 py-1 text-center text-[10px] text-slate-400">{d}</th>)}</tr></thead>
                  <tbody>{Array.from({ length: config.default_periods_per_day }, (_, i) => i + 1).map(p => (
                    <tr key={p} className="border-t border-slate-50">
                      <td className="px-1 py-1 text-center text-[10px] font-bold text-slate-300">{p}</td>
                      {config.working_days.map(day => { const s = grid[day]?.[p]; const c = s ? subjectColors[s.subject_name] : null; return (
                        <td key={day} className="px-0.5 py-0.5">{s ? (
                          <div className={`rounded border ${c?.border||''} ${c?.bg||''} px-1 py-1 text-center`}>
                            <div className={`text-[10px] font-bold ${c?.text||''}`}>{s.subject_name}</div>
                            <div className={`text-[8px] ${c?.sub||''}`}>{s.teacher_name}</div>
                          </div>
                        ) : <div className="py-2 text-center text-[10px] text-slate-200">-</div>}</td>
                      )})}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )
        })}

        {viewMode === 'teacher' && Object.entries(result.by_teacher).map(([k, d]: [string, any]) => {
          const grid = teacherGrids[k] || {}
          return (
            <div key={k} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between bg-blue-50 px-3 py-2">
                <span className="text-sm font-bold text-slate-800">{d.teacher_name}</span>
                <span className="text-[10px] text-blue-600 font-bold">{(d.sessions||[]).length} حصة</span>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="min-w-full">
                  <thead><tr><th className="w-10 px-1 py-1 text-[10px] text-slate-400">ح</th>{config.working_days.map(d => <th key={d} className="px-1 py-1 text-center text-[10px] text-slate-400">{d}</th>)}</tr></thead>
                  <tbody>{Array.from({ length: config.default_periods_per_day }, (_, i) => i + 1).map(p => (
                    <tr key={p} className="border-t border-slate-50">
                      <td className="px-1 py-1 text-center text-[10px] font-bold text-slate-300">{p}</td>
                      {config.working_days.map(day => { const s = grid[day]?.[p]; const c = s ? subjectColors[s.subject_name] : null; return (
                        <td key={day} className="px-0.5 py-0.5">{s ? (
                          <div className={`rounded border ${c?.border||''} ${c?.bg||''} px-1 py-1 text-center`}>
                            <div className={`text-[10px] font-bold ${c?.text||''}`}>{s.subject_name}</div>
                            <div className={`text-[8px] ${c?.sub||''}`}>{s.grade} - {s.class_name}</div>
                          </div>
                        ) : <div className="py-2 text-center text-[10px] text-slate-200">-</div>}</td>
                      )})}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => { setResult(null); setCurrentStep(1) }} className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <RefreshCw className="mr-1 inline h-3 w-3" />جديد
          </button>
          <button onClick={() => { setResult(null); setCurrentStep(4) }} className="rounded-xl border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
            <Play className="mr-1 inline h-3 w-3" />إعادة
          </button>
        </div>
      </div>
    )
  }

  // ── Step Indicator ──
  const renderSteps = () => (
    <div className="mb-6 flex items-center justify-between">
      {STEPS.map((step, i) => {
        const active = currentStep === step.id; const done = currentStep > step.id
        return (
          <div key={step.id} className="flex flex-1 items-center">
            <button onClick={() => done && setCurrentStep(step.id)} className={done ? 'cursor-pointer' : 'cursor-default'}>
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all ${active ? 'border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-200' : done ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                {done ? <CheckCircle className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <div className={`mt-1 text-center text-[10px] font-bold ${active ? 'text-teal-700' : done ? 'text-teal-600' : 'text-slate-400'}`}>{step.title}</div>
            </button>
            {i < STEPS.length - 1 && <div className={`mx-1 mt-[-14px] h-0.5 flex-1 rounded-full ${done ? 'bg-teal-400' : 'bg-slate-200'}`} />}
          </div>
        )
      })}
    </div>
  )

  // ── Navigation ──
  const canNext = currentStep === 1 ? teachers.length > 0 : currentStep === 2 ? subjects.length > 0 : currentStep === 3 ? true : false

  return (
    <section className="space-y-4">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-teal-950 to-slate-900 p-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Brain className="h-6 w-6 text-teal-300" /></div>
          <div>
            <h1 className="text-lg font-bold">محاكي الجداول الذكي</h1>
            <p className="text-xs text-slate-300">بناء جداول مدرسية بالذكاء الاصطناعي + Google OR-Tools</p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {currentStep <= 4 && renderSteps()}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mr-1 inline h-4 w-4" />{error}
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderResults()}

        {currentStep <= 3 && (
          <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <button onClick={() => setCurrentStep(p => Math.max(1, p - 1))} disabled={currentStep === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 disabled:opacity-40">
              <ChevronRight className="h-3 w-3" />السابق
            </button>
            {currentStep === 3 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-teal-100 px-2 py-0.5 font-bold text-teal-700">مُسند: {totalAssigned}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${unassignedPeriods > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  متبقي: {unassignedPeriods}
                </span>
              </div>
            )}
            {currentStep !== 3 && <span className="text-[10px] text-slate-400">الخطوة {currentStep} من 4</span>}
            <button onClick={() => setCurrentStep(p => Math.min(4, p + 1))} disabled={!canNext}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
              التالي<ChevronLeft className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
