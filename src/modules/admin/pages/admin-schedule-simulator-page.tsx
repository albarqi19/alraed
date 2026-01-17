import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCcw,
  Trash2,
  Eye,
  BarChart3,
  Loader2,
  Database,
  Sparkles,
} from 'lucide-react'
import { apiClient } from '@/services/api/client'

// Types
interface Teacher {
  id: number
  name: string
  weekly_quota: number
}

interface TeacherPreference {
  teacher_id: number
  weekly_quota: number
  min_daily_periods: number
  max_daily_periods: number
  max_consecutive: number
  prefer_time: 'any' | 'early' | 'late'
  teaching_style: 'any' | 'consecutive' | 'distributed'
  golden_days: string[]
}

interface Subject {
  id: number
  name: string
  name_en?: string
}

interface SubjectConstraint {
  subject_id: number
  requires_consecutive: boolean
  consecutive_count: number
  avoid_first_period: boolean
  avoid_last_period: boolean
  no_consecutive_days: boolean
  max_per_day: number
  is_heavy: boolean
}

interface ClassGroup {
  id: number
  grade: string
  class_name: string
}

interface ClassRequirement {
  id: number
  class_id: number
  grade: string
  class_name: string
  subject_id: number
  subject_name: string
  teacher_id: number
  teacher_name: string
  periods_per_week: number
}

interface SimulationConfig {
  name: string
  working_days: string[]
  periods_per_day: Record<string, number>
  default_periods_per_day: number
  max_teacher_periods_per_day: number
  max_consecutive_periods: number
  time_limit_seconds: number
}

interface ScheduleEntry {
  teacher_id: number
  teacher_name: string
  subject_id: number
  subject_name: string
  class_id: number
  grade: string
  class_name: string
  day: string
  period: number
}

interface QualityReport {
  overall_score: number
  metrics: Record<string, { score: number; details: any }>
  warnings: Array<{ type: string; message: string }>
  suggestions: string[]
}

interface ConflictInfo {
  type: string
  message: string
  severity: string
  suggestion: string
}

interface SimulationResult {
  status: 'optimal' | 'feasible' | 'infeasible' | 'timeout' | 'error'
  solving_time_ms: number
  schedule: ScheduleEntry[]
  by_teacher: Record<string, any>
  by_class: Record<string, any>
  quality_report: QualityReport | null
  conflicts: ConflictInfo[]
  conflict_heatmap?: any
  error_message?: string
}

// Constants
const WORKING_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const STEPS = [
  { id: 1, title: 'مصدر البيانات', icon: Database },
  { id: 2, title: 'الإعدادات الأساسية', icon: Settings },
  { id: 3, title: 'تفضيلات المعلمين', icon: Users },
  { id: 4, title: 'قيود المواد', icon: BookOpen },
  { id: 5, title: 'توزيع الحصص', icon: GraduationCap },
  { id: 6, title: 'المراجعة والتشغيل', icon: Play },
]

// API Base URL  
const API_BASE = '/admin/schedule-simulator'

export function AdminScheduleSimulatorPage() {
  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [dataSource, setDataSource] = useState<'existing' | 'custom'>('existing')
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'heatmap'>('class')

  // Data State
  const [config, setConfig] = useState<SimulationConfig>({
    name: 'محاكاة جديدة',
    working_days: [...WORKING_DAYS],
    periods_per_day: WORKING_DAYS.reduce((acc, day) => ({ ...acc, [day]: 7 }), {}),
    default_periods_per_day: 7,
    max_teacher_periods_per_day: 6,
    max_consecutive_periods: 3,
    time_limit_seconds: 120,
  })

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [requirements, setRequirements] = useState<ClassRequirement[]>([])
  const [teacherPreferences, setTeacherPreferences] = useState<TeacherPreference[]>([])
  const [subjectConstraints, setSubjectConstraints] = useState<SubjectConstraint[]>([])

  // Load existing data
  useEffect(() => {
    if (dataSource === 'existing') {
      loadExistingData()
    }
  }, [dataSource])

  const loadExistingData = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`${API_BASE}/wizard-data`)
      const data = response.data
      if (data.success && data.data) {
        setTeachers(data.data.teachers || [])
        setSubjects(data.data.subjects || [])
        setClasses(data.data.classes || [])
        setTeacherPreferences(data.data.teacher_preferences || [])
        setSubjectConstraints(data.data.subject_constraints || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.post(`${API_BASE}/generate-mock-data`, {
        num_teachers: 10,
        num_subjects: 8,
        num_grades: 3,
        classes_per_grade: 3,
        periods_per_day: config.default_periods_per_day,
      })

      const data = response.data

      if (data.success && data.data) {
        setTeachers(data.data.teachers || [])
        setSubjects(data.data.subjects || [])
        setClasses(data.data.classes || [])
        setRequirements(data.data.requirements || [])
        setTeacherPreferences(data.data.teacher_preferences || [])
        setSubjectConstraints(data.data.subject_constraints || [])
        setConfig(prev => ({ ...prev, ...data.data.config }))
      } else {
        const errorMsg = data.message || data.error || 'فشل توليد البيانات التجريبية'
        setError(errorMsg)
        console.error('Generate mock data error:', data)
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'فشل الاتصال بالخادم'
      setError(errorMsg)
      console.error('Failed to generate mock data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const runSimulation = async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      // Create simulation - Always send the current UI state as custom_data
      // because the user may have modified the data (random periods, balanced teachers, etc.)
      const createResponse = await apiClient.post(`${API_BASE}/simulations`, {
        name: config.name,
        data_source: 'custom', // Always use custom since we're sending the modified data
        config,
        custom_data: {
          teachers,
          subjects,
          classes,
          requirements,
          teacher_preferences: teacherPreferences,
          subject_constraints: subjectConstraints,
        },
      })

      const createData = createResponse.data
      const simulationId = createData.data.id

      // Run simulation
      const runResponse = await apiClient.post(`${API_BASE}/simulations/${simulationId}/run`)
      const runData = runResponse.data

      if (runData.success) {
        setResult({
          status: 'optimal',
          solving_time_ms: runData.data.solving_time_ms || 0,
          schedule: runData.data.result?.schedule || [],
          by_teacher: runData.data.result?.by_teacher || {},
          by_class: runData.data.result?.by_class || {},
          quality_report: runData.data.quality_report,
          conflicts: [],
        })
        setCurrentStep(7) // Go to results
      } else {
        setResult({
          status: 'infeasible',
          solving_time_ms: 0,
          schedule: [],
          by_teacher: {},
          by_class: {},
          quality_report: null,
          conflicts: runData.conflicts || [],
          conflict_heatmap: runData.conflict_heatmap,
          error_message: runData.message,
        })
        setCurrentStep(7)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'حدث خطأ غير متوقع')
    } finally {
      setIsRunning(false)
    }
  }

  // Computed values
  const totalRequiredPeriods = useMemo(() => {
    return requirements.reduce((sum, r) => sum + r.periods_per_week, 0)
  }, [requirements])

  const totalAvailablePeriods = useMemo(() => {
    return config.working_days.reduce((sum, day) => {
      return sum + (config.periods_per_day[day] || config.default_periods_per_day)
    }, 0) * classes.length
  }, [config, classes])

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return true
      case 2:
        return config.name && config.working_days.length > 0
      case 3:
        return teachers.length > 0
      case 4:
        return subjects.length > 0
      case 5:
        return classes.length > 0 && requirements.length > 0
      case 6:
        return true
      default:
        return false
    }
  }, [currentStep, config, teachers, subjects, classes, requirements])

  // Render functions
  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${isActive
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : isCompleted
                    ? 'border-teal-600 bg-teal-100 text-teal-600'
                    : 'border-slate-300 bg-white text-slate-400'
                  }`}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-1 w-16 mx-2 ${isCompleted ? 'bg-teal-600' : 'bg-slate-200'
                    }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between">
        {STEPS.map((step) => (
          <span
            key={step.id}
            className={`text-xs font-medium ${currentStep === step.id ? 'text-teal-600' : 'text-slate-500'
              }`}
          >
            {step.title}
          </span>
        ))}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">اختر مصدر البيانات</h2>
        <p className="mt-2 text-slate-600">
          يمكنك استخدام البيانات الموجودة في النظام أو إنشاء بيانات تجريبية جديدة
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <button
          onClick={() => setDataSource('existing')}
          className={`rounded-xl border-2 p-6 text-right transition-all ${dataSource === 'existing'
            ? 'border-teal-600 bg-teal-50'
            : 'border-slate-200 hover:border-slate-300'
            }`}
        >
          <Database className={`h-12 w-12 ${dataSource === 'existing' ? 'text-teal-600' : 'text-slate-400'}`} />
          <h3 className="mt-4 text-lg font-bold text-slate-900">البيانات الموجودة</h3>
          <p className="mt-2 text-sm text-slate-600">
            استخدم المعلمين والمواد والفصول المسجلة في النظام
          </p>
        </button>

        <button
          onClick={() => {
            setDataSource('custom')
            // مسح البيانات القديمة
            setTeachers([])
            setSubjects([])
            setClasses([])
            setRequirements([])
            setTeacherPreferences([])
            setSubjectConstraints([])
          }}
          className={`rounded-xl border-2 p-6 text-right transition-all ${dataSource === 'custom'
            ? 'border-teal-600 bg-teal-50'
            : 'border-slate-200 hover:border-slate-300'
            }`}
        >
          <Sparkles className={`h-12 w-12 ${dataSource === 'custom' ? 'text-teal-600' : 'text-slate-400'}`} />
          <h3 className="mt-4 text-lg font-bold text-slate-900">بيانات مخصصة</h3>
          <p className="mt-2 text-sm text-slate-600">
            أضف المعلمين والمواد والفصول يدوياً
          </p>
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <span className="mr-3 text-slate-600">جاري تحميل البيانات...</span>
        </div>
      )}

      {dataSource === 'custom' && !isLoading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-blue-900">توليد بيانات تجريبية سريعة</h4>
              <p className="mt-1 text-sm text-blue-700">
                اضغط هنا لتوليد بيانات تجريبية جاهزة (10 معلمين، 8 مواد، 9 فصول)
              </p>
            </div>
            <button
              onClick={generateMockData}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              توليد بيانات
            </button>
          </div>
        </div>
      )}

      {!isLoading && teachers.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-4">
          <h4 className="font-bold text-slate-900">البيانات المحملة:</h4>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-600">المعلمون:</span>
              <span className="mr-2 font-bold text-teal-600">{teachers.length}</span>
            </div>
            <div>
              <span className="text-slate-600">المواد:</span>
              <span className="mr-2 font-bold text-teal-600">{subjects.length}</span>
            </div>
            <div>
              <span className="text-slate-600">الفصول:</span>
              <span className="mr-2 font-bold text-teal-600">{classes.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">الإعدادات الأساسية</h2>
        <p className="mt-2 text-slate-600">حدد إعدادات الجدول الأساسية</p>
      </div>

      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">اسم المحاكاة</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:ring-teal-500"
            placeholder="مثال: محاكاة الفصل الأول"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">أيام العمل</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORKING_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => {
                  const days = config.working_days.includes(day)
                    ? config.working_days.filter((d) => d !== day)
                    : [...config.working_days, day]
                  setConfig({ ...config, working_days: days })
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${config.working_days.includes(day)
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">عدد الحصص لكل يوم</label>
          <div className="mt-2 grid grid-cols-5 gap-4">
            {config.working_days.map((day) => (
              <div key={day}>
                <label className="block text-xs text-slate-500">{day}</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.periods_per_day[day] || config.default_periods_per_day}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      periods_per_day: {
                        ...config.periods_per_day,
                        [day]: parseInt(e.target.value) || 7,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-center focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              الحد الأقصى لحصص المعلم يومياً
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.max_teacher_periods_per_day}
              onChange={(e) =>
                setConfig({ ...config, max_teacher_periods_per_day: parseInt(e.target.value) || 6 })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              أقصى حصص متتالية
            </label>
            <input
              type="number"
              min={1}
              max={8}
              value={config.max_consecutive_periods}
              onChange={(e) =>
                setConfig({ ...config, max_consecutive_periods: parseInt(e.target.value) || 3 })
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const addTeacher = () => {
    const newId = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1
    setTeachers([...teachers, { id: newId, name: `معلم ${newId}`, weekly_quota: 24 }])
  }

  const removeTeacher = (id: number) => {
    setTeachers(teachers.filter(t => t.id !== id))
    setTeacherPreferences(teacherPreferences.filter(p => p.teacher_id !== id))
    setRequirements(requirements.filter(r => r.teacher_id !== id))
  }

  const updateTeacherName = (id: number, name: string) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, name } : t))
  }

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">تفضيلات المعلمين</h2>
          <p className="mt-2 text-slate-600">اضبط النصاب والتفضيلات لكل معلم</p>
        </div>
        {dataSource === 'custom' && (
          <button
            onClick={addTeacher}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Users className="h-4 w-4" />
            إضافة معلم
          </button>
        )}
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-amber-500" />
          <p className="mt-4 font-medium text-amber-900">لا يوجد معلمون</p>
          <p className="mt-2 text-sm text-amber-700">
            {dataSource === 'existing'
              ? 'لا يوجد معلمون في النظام. تأكد من وجود معلمين نشطين.'
              : 'اضغط على زر "إضافة معلم" لإضافة معلمين جدد.'}
          </p>
          {dataSource === 'custom' && (
            <button
              onClick={addTeacher}
              className="mt-4 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              إضافة معلم
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">المعلم</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">النصاب الأسبوعي</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">الحد الأقصى يومياً</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">أقصى متتالية</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">تفضيل الوقت</th>
                {dataSource === 'custom' && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">حذف</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {teachers.map((teacher) => {
                const pref = teacherPreferences.find((p) => p.teacher_id === teacher.id) || {
                  teacher_id: teacher.id,
                  weekly_quota: 24,
                  min_daily_periods: 2,
                  max_daily_periods: 6,
                  max_consecutive: 3,
                  prefer_time: 'any' as const,
                  teaching_style: 'any' as const,
                  golden_days: [],
                }

                const updatePref = (updates: Partial<TeacherPreference>) => {
                  setTeacherPreferences((prev) => {
                    const existing = prev.find((p) => p.teacher_id === teacher.id)
                    if (existing) {
                      return prev.map((p) =>
                        p.teacher_id === teacher.id ? { ...p, ...updates } : p
                      )
                    }
                    return [...prev, { ...pref, ...updates }]
                  })
                }

                return (
                  <tr key={teacher.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      {dataSource === 'custom' ? (
                        <input
                          type="text"
                          value={teacher.name}
                          onChange={(e) => updateTeacherName(teacher.id, e.target.value)}
                          className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        teacher.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={pref.weekly_quota}
                        onChange={(e) => updatePref({ weekly_quota: parseInt(e.target.value) || 24 })}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={pref.max_daily_periods}
                        onChange={(e) => updatePref({ max_daily_periods: parseInt(e.target.value) || 6 })}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={pref.max_consecutive}
                        onChange={(e) => updatePref({ max_consecutive: parseInt(e.target.value) || 3 })}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={pref.prefer_time}
                        onChange={(e) => updatePref({ prefer_time: e.target.value as any })}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="any">أي وقت</option>
                        <option value="early">أول الدوام</option>
                        <option value="late">آخر الدوام</option>
                      </select>
                    </td>
                    {dataSource === 'custom' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeTeacher(teacher.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const addSubject = () => {
    const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1
    setSubjects([...subjects, { id: newId, name: `مادة ${newId}` }])
  }

  const removeSubject = (id: number) => {
    setSubjects(subjects.filter(s => s.id !== id))
    setSubjectConstraints(subjectConstraints.filter(c => c.subject_id !== id))
    setRequirements(requirements.filter(r => r.subject_id !== id))
  }

  const updateSubjectName = (id: number, name: string) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, name } : s))
  }

  const addClassGroup = () => {
    const newId = classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 1
    const grades = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']
    const classNames = ['أ', 'ب', 'ج', 'د', 'هـ']
    const gradeIndex = Math.floor(classes.length / classNames.length) % grades.length
    const classIndex = classes.length % classNames.length
    setClasses([...classes, {
      id: newId,
      grade: grades[gradeIndex],
      class_name: classNames[classIndex]
    }])
  }

  const removeClassGroup = (id: number) => {
    setClasses(classes.filter(c => c.id !== id))
    setRequirements(requirements.filter(r => r.class_id !== id))
  }

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">قيود المواد</h2>
          <p className="mt-2 text-slate-600">اضبط القيود الخاصة بكل مادة</p>
        </div>
        {dataSource === 'custom' && (
          <button
            onClick={addSubject}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <BookOpen className="h-4 w-4" />
            إضافة مادة
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-amber-500" />
          <p className="mt-4 font-medium text-amber-900">لا توجد مواد</p>
          <p className="mt-2 text-sm text-amber-700">
            {dataSource === 'existing'
              ? 'لا توجد مواد في النظام. تأكد من وجود مواد نشطة.'
              : 'اضغط على زر "إضافة مادة" لإضافة مواد جديدة.'}
          </p>
          {dataSource === 'custom' && (
            <button
              onClick={addSubject}
              className="mt-4 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              إضافة مادة
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">المادة</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">مادة ثقيلة</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">حصص مدمجة</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">تجنب الأولى</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">تجنب الأخيرة</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">أقصى تكرار يومي</th>
                {dataSource === 'custom' && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">حذف</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {subjects.map((subject) => {
                const constraint = subjectConstraints.find((c) => c.subject_id === subject.id) || {
                  subject_id: subject.id,
                  requires_consecutive: false,
                  consecutive_count: 2,
                  avoid_first_period: false,
                  avoid_last_period: false,
                  no_consecutive_days: false,
                  max_per_day: 2,
                  is_heavy: false,
                }

                const updateConstraint = (updates: Partial<SubjectConstraint>) => {
                  setSubjectConstraints((prev) => {
                    const existing = prev.find((c) => c.subject_id === subject.id)
                    if (existing) {
                      return prev.map((c) =>
                        c.subject_id === subject.id ? { ...c, ...updates } : c
                      )
                    }
                    return [...prev, { ...constraint, ...updates }]
                  })
                }

                return (
                  <tr key={subject.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      {dataSource === 'custom' ? (
                        <input
                          type="text"
                          value={subject.name}
                          onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                          className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        subject.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={constraint.is_heavy}
                        onChange={(e) => updateConstraint({ is_heavy: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={constraint.requires_consecutive}
                        onChange={(e) => updateConstraint({ requires_consecutive: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={constraint.avoid_first_period}
                        onChange={(e) => updateConstraint({ avoid_first_period: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={constraint.avoid_last_period}
                        onChange={(e) => updateConstraint({ avoid_last_period: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={constraint.max_per_day}
                        onChange={(e) => updateConstraint({ max_per_day: parseInt(e.target.value) || 2 })}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm"
                      />
                    </td>
                    {dataSource === 'custom' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeSubject(subject.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderStep5 = () => {
    // استخراج المراحل الفريدة
    const uniqueGrades = [...new Set(classes.map(c => c.grade))]

    // حالة الحصص لكل مرحلة ومادة
    const getGradeSubjectPeriods = (grade: string, subjectId: number) => {
      const classesInGrade = classes.filter(c => c.grade === grade)
      if (classesInGrade.length === 0) return 0
      const req = requirements.find(
        r => r.grade === grade && r.subject_id === subjectId
      )
      return req?.periods_per_week || 0
    }

    // تحديث الحصص لمرحلة كاملة
    const updateGradeSubjectPeriods = (grade: string, subjectId: number, periods: number) => {
      const classesInGrade = classes.filter(c => c.grade === grade)
      const subject = subjects.find(s => s.id === subjectId)
      if (!subject) return

      setRequirements(prev => {
        const newReqs = [...prev]
        classesInGrade.forEach(classGroup => {
          const existingIndex = newReqs.findIndex(
            r => r.class_id === classGroup.id && r.subject_id === subjectId
          )
          const existingReq = newReqs[existingIndex]

          if (existingIndex >= 0) {
            newReqs[existingIndex] = { ...existingReq, periods_per_week: periods }
          } else {
            newReqs.push({
              id: Date.now() + Math.random(),
              class_id: classGroup.id,
              grade: classGroup.grade,
              class_name: classGroup.class_name,
              subject_id: subjectId,
              subject_name: subject.name,
              teacher_id: teachers[0]?.id || 0,
              teacher_name: teachers[0]?.name || '',
              periods_per_week: periods,
            })
          }
        })
        return newReqs
      })
    }

    // توليد حصص عشوائية لكل المواد
    const generateRandomPeriods = () => {
      const periodOptions = [2, 3, 4, 5, 6]
      const periodsPerWeek = config.working_days.length * config.default_periods_per_day

      uniqueGrades.forEach(grade => {
        let totalPeriods = 0
        const subjectPeriods: Record<number, number> = {}

        // توزيع عشوائي مع ضمان عدم تجاوز الحد
        subjects.forEach((subject, index) => {
          if (index === subjects.length - 1) {
            // آخر مادة تأخذ الباقي
            subjectPeriods[subject.id] = Math.max(1, periodsPerWeek - totalPeriods)
          } else {
            const maxForThis = Math.min(6, periodsPerWeek - totalPeriods - (subjects.length - index - 1))
            const periods = periodOptions[Math.floor(Math.random() * periodOptions.length)]
            subjectPeriods[subject.id] = Math.min(periods, maxForThis)
            totalPeriods += subjectPeriods[subject.id]
          }
        })

        // تحديث
        Object.entries(subjectPeriods).forEach(([subjectId, periods]) => {
          updateGradeSubjectPeriods(grade, parseInt(subjectId), periods)
        })
      })
    }

    // توزيع المعلمين عشوائياً
    const distributeTeachersRandomly = () => {
      if (teachers.length === 0) return

      setRequirements(prev => {
        return prev.map(req => {
          const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)]
          return {
            ...req,
            teacher_id: randomTeacher.id,
            teacher_name: randomTeacher.name,
          }
        })
      })
    }

    // توزيع المعلمين بالتوازن (الأقل حملاً أولاً)
    const distributeTeachersBalanced = () => {
      if (teachers.length === 0) return

      const teacherLoads: Record<number, number> = {}
      teachers.forEach(t => { teacherLoads[t.id] = 0 })

      // ترتيب المتطلبات حسب عدد الحصص تنازلياً
      const sortedReqs = [...requirements].sort((a, b) => b.periods_per_week - a.periods_per_week)

      const updatedReqs = sortedReqs.map(req => {
        // اختيار المعلم الأقل حملاً
        const minLoadTeacher = teachers.reduce((min, t) =>
          teacherLoads[t.id] < teacherLoads[min.id] ? t : min
          , teachers[0])

        teacherLoads[minLoadTeacher.id] += req.periods_per_week

        return {
          ...req,
          teacher_id: minLoadTeacher.id,
          teacher_name: minLoadTeacher.name,
        }
      })

      setRequirements(updatedReqs)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">توزيع الحصص حسب المرحلة</h2>
            <p className="mt-2 text-slate-600">حدد عدد حصص كل مادة لكل مرحلة دراسية</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateRandomPeriods}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              حصص عشوائية
            </button>
            <button
              onClick={distributeTeachersBalanced}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Users className="h-4 w-4" />
              توزيع متوازن
            </button>
            <button
              onClick={distributeTeachersRandomly}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Sparkles className="h-4 w-4" />
              معلمين عشوائي
            </button>
          </div>
        </div>

        {uniqueGrades.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-amber-500" />
            <p className="mt-4 font-medium text-amber-900">لا توجد مراحل دراسية</p>
            <p className="mt-2 text-sm text-amber-700">
              يرجى إضافة فصول في الخطوة السابقة أولاً
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* جدول الحصص حسب المرحلة */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">المادة</th>
                    {uniqueGrades.map(grade => (
                      <th key={grade} className="px-4 py-3 text-center text-xs font-medium text-slate-500">
                        {grade}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {subjects.map(subject => (
                    <tr key={subject.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                        {subject.name}
                      </td>
                      {uniqueGrades.map(grade => (
                        <td key={grade} className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={getGradeSubjectPeriods(grade, subject.id)}
                            onChange={(e) => updateGradeSubjectPeriods(grade, subject.id, parseInt(e.target.value) || 0)}
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-teal-500 focus:ring-teal-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* عرض تفاصيل التوزيع للفصول */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-900 mb-3">تفاصيل توزيع المعلمين</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map(classGroup => {
                  const classReqs = requirements.filter(r => r.class_id === classGroup.id && r.periods_per_week > 0)
                  const totalPeriods = classReqs.reduce((sum, r) => sum + r.periods_per_week, 0)

                  return (
                    <div key={classGroup.id} className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{classGroup.grade} - {classGroup.class_name}</span>
                        <span className="text-sm text-teal-600 font-bold">{totalPeriods} حصة</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {classReqs.slice(0, 3).map(req => (
                          <div key={req.subject_id} className="flex justify-between text-slate-600">
                            <span>{req.subject_name}</span>
                            <span>{req.teacher_name || 'غير محدد'}</span>
                          </div>
                        ))}
                        {classReqs.length > 3 && (
                          <div className="text-slate-400">+{classReqs.length - 3} مواد أخرى</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">إجمالي الحصص المطلوبة:</span>
            <span className={`font-bold ${totalRequiredPeriods > totalAvailablePeriods ? 'text-red-600' : 'text-teal-600'}`}>
              {totalRequiredPeriods} حصة
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-medium text-slate-700">إجمالي الحصص المتاحة:</span>
            <span className="font-bold text-slate-900">{totalAvailablePeriods} حصة</span>
          </div>
          {totalRequiredPeriods > totalAvailablePeriods && (
            <div className="mt-2 text-sm text-red-600">
              ⚠️ عدد الحصص المطلوبة يتجاوز المتاح! قلل الحصص أو أضف فصول.
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">المراجعة والتشغيل</h2>
        <p className="mt-2 text-slate-600">راجع الإعدادات وابدأ المحاكاة</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-bold text-slate-900">ملخص الإعدادات</h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">اسم المحاكاة:</dt>
              <dd className="font-medium text-slate-900">{config.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">أيام العمل:</dt>
              <dd className="font-medium text-slate-900">{config.working_days.length} أيام</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">المعلمون:</dt>
              <dd className="font-medium text-slate-900">{teachers.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">المواد:</dt>
              <dd className="font-medium text-slate-900">{subjects.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">الفصول:</dt>
              <dd className="font-medium text-slate-900">{classes.length}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-bold text-slate-900">إحصائيات</h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">الحصص المطلوبة:</dt>
              <dd className="font-medium text-slate-900">{totalRequiredPeriods}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">الحصص المتاحة:</dt>
              <dd className="font-medium text-slate-900">{totalAvailablePeriods}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">الوقت الأقصى للحل:</dt>
              <dd className="font-medium text-slate-900">{config.time_limit_seconds} ثانية</dd>
            </div>
          </dl>
        </div>
      </div>

      {totalRequiredPeriods > totalAvailablePeriods && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">تحذير: الحصص المطلوبة أكثر من المتاحة</h4>
              <p className="mt-1 text-sm text-red-700">
                قد لا يتمكن المحاكي من إيجاد حل. حاول تقليل الحصص المطلوبة أو زيادة أيام العمل.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={runSimulation}
        disabled={isRunning}
        className="w-full rounded-lg bg-teal-600 px-6 py-4 font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري المحاكاة...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Play className="h-5 w-5" />
            بدء المحاكاة
          </span>
        )}
      </button>
    </div>
  )

  const renderResults = () => {
    if (!result) return null

    if (result.status === 'infeasible') {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h2 className="text-xl font-bold text-red-900">لا يمكن إنشاء جدول</h2>
                <p className="mt-2 text-red-700">{result.error_message}</p>
              </div>
            </div>
          </div>

          {result.conflicts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">التعارضات المكتشفة:</h3>
              {result.conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${conflict.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                    }`}
                >
                  <h4 className="font-medium text-slate-900">{conflict.message}</h4>
                  <p className="mt-1 text-sm text-slate-600">{conflict.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setCurrentStep(1)}
            className="w-full rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            العودة للإعدادات
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">نتائج المحاكاة</h2>
            <p className="mt-1 text-slate-600">
              تم إنشاء الجدول في {result.solving_time_ms} مللي ثانية
            </p>
          </div>

          {result.quality_report && (
            <div className="text-center">
              <div
                className={`inline-flex h-20 w-20 items-center justify-center rounded-full ${result.quality_report.overall_score >= 90
                  ? 'bg-green-100 text-green-600'
                  : result.quality_report.overall_score >= 70
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-red-100 text-red-600'
                  }`}
              >
                <span className="text-2xl font-bold">{Math.round(result.quality_report.overall_score)}%</span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">جودة الجدول</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('class')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'class' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
          >
            عرض حسب الفصل
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'teacher' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
          >
            عرض حسب المعلم
          </button>
          {result.conflict_heatmap && (
            <button
              onClick={() => setViewMode('heatmap')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'heatmap' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
            >
              خريطة التحميل
            </button>
          )}
        </div>

        {viewMode === 'class' && (
          <div className="space-y-4">
            {Object.entries(result.by_class).map(([classKey, classData]: [string, any]) => (
              <div key={classKey} className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="font-bold text-slate-900">
                    {classData.grade} - {classData.class_name}
                  </h4>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-right text-xs font-medium text-slate-500">الحصة</th>
                        {config.working_days.map((day) => (
                          <th key={day} className="px-2 py-1 text-center text-xs font-medium text-slate-500">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: config.default_periods_per_day }, (_, i) => i + 1).map((period) => (
                        <tr key={period} className="border-t border-slate-100">
                          <td className="px-2 py-2 text-sm font-medium text-slate-900">{period}</td>
                          {config.working_days.map((day) => {
                            const session = classData.schedule?.[day]?.[period]
                            return (
                              <td key={day} className="px-2 py-2 text-center">
                                {session ? (
                                  <div className="rounded bg-teal-50 px-2 py-1 text-xs">
                                    <div className="font-medium text-teal-900">{session.subject}</div>
                                    <div className="text-teal-600">{session.teacher}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
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
        )}

        {viewMode === 'teacher' && (
          <div className="space-y-4">
            {Object.entries(result.by_teacher).map(([teacherId, teacherData]: [string, any]) => (
              <div key={teacherId} className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="font-bold text-slate-900">
                    {teacherData.name} ({teacherData.sessions_count} حصة)
                  </h4>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-right text-xs font-medium text-slate-500">الحصة</th>
                        {config.working_days.map((day) => (
                          <th key={day} className="px-2 py-1 text-center text-xs font-medium text-slate-500">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: config.default_periods_per_day }, (_, i) => i + 1).map((period) => (
                        <tr key={period} className="border-t border-slate-100">
                          <td className="px-2 py-2 text-sm font-medium text-slate-900">{period}</td>
                          {config.working_days.map((day) => {
                            const session = teacherData.schedule?.[day]?.[period]
                            return (
                              <td key={day} className="px-2 py-2 text-center">
                                {session ? (
                                  <div className="rounded bg-blue-50 px-2 py-1 text-xs">
                                    <div className="font-medium text-blue-900">{session.subject}</div>
                                    <div className="text-blue-600">{session.class}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
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
        )}

        {result.quality_report && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="font-bold text-slate-900">تقرير الجودة</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(result.quality_report.metrics).map(([key, metric]: [string, any]) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-sm text-slate-600">
                    {key === 'coverage' && 'تغطية الحصص'}
                    {key === 'teacher_distribution' && 'توزيع المعلمين'}
                    {key === 'subject_distribution' && 'توزيع المواد'}
                    {key === 'preferences_met' && 'تحقيق التفضيلات'}
                  </span>
                  <span
                    className={`font-bold ${metric.score >= 90 ? 'text-green-600' : metric.score >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}
                  >
                    {Math.round(metric.score)}%
                  </span>
                </div>
              ))}
            </div>

            {result.quality_report.warnings.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-slate-700">تحذيرات:</h5>
                <ul className="mt-2 space-y-1">
                  {result.quality_report.warnings.map((warning, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setResult(null)
              setCurrentStep(1)
            }}
            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            محاكاة جديدة
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700">
            <Download className="h-5 w-5" />
            تصدير
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">محاكي الجداول الدراسية</h1>
          <p className="mt-2 text-slate-600">
            أداة ذكية لتوليد جداول الحصص المدرسية باستخدام الخوارزميات المتقدمة
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Sparkles className="h-4 w-4" />
          وضع المحاكاة
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {currentStep <= 6 && renderStepIndicator()}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderResults()}

        {currentStep <= 6 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
              السابق
            </button>
            <button
              onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
              disabled={!canProceed || currentStep === 6}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              التالي
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
