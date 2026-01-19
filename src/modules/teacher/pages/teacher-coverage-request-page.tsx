import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'

// =====================================================
// Types
// =====================================================

interface Session {
  id: number
  period_number: number
  grade: string
  class_name: string
  subject_name: string
  start_time: string
  end_time: string
}

interface SubstituteTeacher {
  id: number
  name: string
  priority?: number
  note?: string
  free_periods_today?: number
}

interface AvailableSubstitutesResponse {
  success: boolean
  data: {
    standby_teachers: SubstituteTeacher[]
    available_teachers: SubstituteTeacher[]
  }
}

interface MySessionsResponse {
  success: boolean
  data: {
    sessions: Session[]
    current_period: number
    date: string
    day: string
  }
}

interface CoverageSettings {
  is_enabled: boolean
}

interface SettingsResponse {
  success: boolean
  data: CoverageSettings
}

interface CoverageItem {
  class_session_id: number
  period_number: number
  substitute_teacher_id: number | null
}

const PERIOD_NAMES: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
}

const REASON_TYPES = [
  { value: 'personal', label: 'شخصي' },
  { value: 'medical', label: 'طبي' },
  { value: 'official', label: 'رسمي' },
  { value: 'emergency', label: 'طارئ' },
  { value: 'other', label: 'أخرى' },
]

// =====================================================
// API Functions
// =====================================================

async function fetchCoverageSettings(): Promise<SettingsResponse> {
  const { data } = await apiClient.get('/teacher/coverage/settings')
  return data
}

async function fetchMySessions(): Promise<MySessionsResponse> {
  const { data } = await apiClient.get('/teacher/coverage/my-sessions')
  return data
}

async function fetchAvailableSubstitutes(date: string, periodNumber: number): Promise<AvailableSubstitutesResponse> {
  const { data } = await apiClient.get('/teacher/coverage/available-substitutes', {
    params: { date, period_number: periodNumber }
  })
  return data
}

async function createCoverageRequest(payload: {
  request_date: string
  from_period: number
  to_period?: number
  reason: string
  reason_type: string
  items: CoverageItem[]
}) {
  const { data } = await apiClient.post('/teacher/coverage/requests', payload)
  return data
}

// =====================================================
// Component
// =====================================================

export function TeacherCoverageRequestPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [fromPeriod, setFromPeriod] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [reasonType, setReasonType] = useState('personal')
  const [coverageItems, setCoverageItems] = useState<Map<number, number | null>>(new Map())
  const [loadingSubstitutes, setLoadingSubstitutes] = useState<number | null>(null)
  const [substitutesCache, setSubstitutesCache] = useState<Map<number, AvailableSubstitutesResponse['data']>>(new Map())

  // التحقق من تفعيل الميزة
  const settingsQuery = useQuery({
    queryKey: ['teacher-coverage-settings'],
    queryFn: fetchCoverageSettings,
  })

  const isFeatureEnabled = settingsQuery.data?.data?.is_enabled ?? true

  // جلب حصص المعلم
  const sessionsQuery = useQuery({
    queryKey: ['teacher-coverage-sessions'],
    queryFn: fetchMySessions,
    enabled: isFeatureEnabled, // لا تجلب البيانات إذا كانت الميزة معطلة
  })

  const sessions = sessionsQuery.data?.data?.sessions ?? []
  const currentPeriod = sessionsQuery.data?.data?.current_period ?? 1
  const today = sessionsQuery.data?.data?.date ?? new Date().toISOString().split('T')[0]

  // فلترة الحصص من الحصة المختارة فصاعداً
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.period_number >= fromPeriod)
  }, [sessions, fromPeriod])

  // جلب البدلاء المتاحين لحصة معينة
  const handleLoadSubstitutes = async (periodNumber: number) => {
    if (substitutesCache.has(periodNumber)) return

    setLoadingSubstitutes(periodNumber)
    try {
      const response = await fetchAvailableSubstitutes(today, periodNumber)
      setSubstitutesCache(prev => new Map(prev).set(periodNumber, response.data))
    } catch {
      toast({ type: 'error', title: 'فشل في جلب البدلاء المتاحين' })
    } finally {
      setLoadingSubstitutes(null)
    }
  }

  // اختيار البديل
  const handleSelectSubstitute = (sessionId: number, substituteId: number | null) => {
    setCoverageItems(prev => new Map(prev).set(sessionId, substituteId))
  }

  // إرسال الطلب
  const submitMutation = useMutation({
    mutationFn: createCoverageRequest,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال طلب التأمين بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['teacher-coverage'] })
      navigate('/teacher/services')
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({ type: 'error', title: error.response?.data?.message || 'فشل في إرسال الطلب' })
    }
  })

  const handleSubmit = () => {
    // التحقق من اختيار بديل لكل حصة
    const items: CoverageItem[] = []
    for (const session of filteredSessions) {
      const substituteId = coverageItems.get(session.id)
      if (!substituteId) {
        toast({ type: 'error', title: `يجب اختيار بديل للحصة ${PERIOD_NAMES[session.period_number]}` })
        return
      }
      items.push({
        class_session_id: session.id,
        period_number: session.period_number,
        substitute_teacher_id: substituteId
      })
    }

    if (items.length === 0) {
      toast({ type: 'error', title: 'لا توجد حصص للتأمين' })
      return
    }

    submitMutation.mutate({
      request_date: today,
      from_period: fromPeriod,
      to_period: Math.max(...items.map(i => i.period_number)),
      reason,
      reason_type: reasonType,
      items
    })
  }

  // Settings loading state
  if (settingsQuery.isLoading) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلب تأمين الحصص</h1>
        </header>
        <div className="glass-card flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-500" />
        </div>
      </section>
    )
  }

  // Feature disabled state
  if (!isFeatureEnabled) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلب تأمين الحصص</h1>
        </header>
        <div className="glass-card text-center py-12 border-amber-200 bg-amber-50/50">
          <i className="bi bi-slash-circle text-5xl text-amber-500" />
          <p className="mt-4 text-lg font-semibold text-amber-900">
            الإدارة عطلت هذه الميزة
          </p>
          <p className="mt-2 text-sm text-amber-700">
            يرجى التواصل مع الإدارة لمزيد من المعلومات
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="button-secondary mt-6"
          >
            العودة
          </button>
        </div>
      </section>
    )
  }

  // Loading state
  if (sessionsQuery.isLoading) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلب تأمين الحصص</h1>
        </header>
        <div className="glass-card flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500/30 border-t-orange-500" />
        </div>
      </section>
    )
  }

  // No sessions
  if (sessions.length === 0) {
    return (
      <section className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">طلب تأمين الحصص</h1>
        </header>
        <div className="glass-card text-center py-12">
          <i className="bi bi-calendar-x text-4xl text-slate-300" />
          <p className="mt-4 text-slate-600">لا توجد حصص متبقية اليوم</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="button-secondary mt-4"
          >
            العودة
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">طلب تأمين الحصص</h1>
        <p className="text-sm text-slate-600">
          تقديم طلب استئذان وتأمين حصصك المتبقية
        </p>
      </header>

      {/* اختيار الحصة */}
      <div className="glass-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">الاستئذان من الحصة</h2>

        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(period => {
            const isDisabled = period < currentPeriod
            const isSelected = period === fromPeriod
            return (
              <button
                key={period}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  setFromPeriod(period)
                  setCoverageItems(new Map())
                }}
                className={`
                  rounded-xl py-3 text-sm font-medium transition-all
                  ${isDisabled
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isSelected
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50'
                  }
                `}
              >
                {PERIOD_NAMES[period]}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-slate-500">
          * سيتم طلب تأمين جميع حصصك من الحصة {PERIOD_NAMES[fromPeriod]} وحتى نهاية اليوم
        </p>
      </div>

      {/* الحصص المتبقية */}
      {filteredSessions.length > 0 && (
        <div className="glass-card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            الحصص المتبقية ({filteredSessions.length})
          </h2>

          <div className="divide-y divide-slate-100">
            {filteredSessions.map(session => {
              const substitutes = substitutesCache.get(session.period_number)
              const selectedSubstitute = coverageItems.get(session.id)
              const isLoadingThis = loadingSubstitutes === session.period_number

              return (
                <div key={session.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    {/* معلومات الحصة */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700">
                          {session.period_number}
                        </span>
                        <span className="font-semibold text-slate-900">{session.subject_name}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {session.grade} — {session.class_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.start_time} – {session.end_time}
                      </p>
                    </div>

                    {/* اختيار البديل */}
                    <div className="w-48">
                      {!substitutes && !isLoadingThis ? (
                        <button
                          type="button"
                          onClick={() => handleLoadSubstitutes(session.period_number)}
                          className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                        >
                          <i className="bi bi-person-plus ml-1" />
                          اختر البديل
                        </button>
                      ) : isLoadingThis ? (
                        <div className="flex items-center justify-center py-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                        </div>
                      ) : (
                        <select
                          value={selectedSubstitute ?? ''}
                          onChange={(e) => handleSelectSubstitute(session.id, e.target.value ? Number(e.target.value) : null)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        >
                          <option value="">اختر البديل...</option>
                          {substitutes?.standby_teachers && substitutes.standby_teachers.length > 0 && (
                            <optgroup label="المنتظرون">
                              {substitutes.standby_teachers.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.note})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {substitutes?.available_teachers && substitutes.available_teachers.length > 0 && (
                            <optgroup label="معلمون متاحون">
                              {substitutes.available_teachers.map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}

                      {selectedSubstitute && (
                        <p className="mt-1 text-xs text-emerald-600">
                          <i className="bi bi-check-circle ml-1" />
                          تم الاختيار
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* السبب */}
      <div className="glass-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">سبب الاستئذان</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">نوع السبب</label>
            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              {REASON_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">وصف السبب (اختياري)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: موعد طبي"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
      </div>

      {/* ملخص وإرسال */}
      <div className="glass-card space-y-4 border-orange-200 bg-orange-50/50">
        <h2 className="text-lg font-semibold text-orange-900">ملخص الطلب</h2>

        <div className="text-sm text-orange-800">
          <p>• عدد الحصص: <strong>{filteredSessions.length}</strong></p>
          <p>• من الحصة: <strong>{PERIOD_NAMES[fromPeriod]}</strong></p>
          <p>• البدلاء المختارون: <strong>{coverageItems.size} من {filteredSessions.length}</strong></p>
        </div>

        <div className="rounded-lg bg-orange-100/60 p-3 text-xs text-orange-700">
          <i className="bi bi-info-circle ml-1" />
          سيتم إرسال الطلب للبدلاء للموافقة، ثم للإدارة للاعتماد النهائي.
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="button-secondary flex-1"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending || coverageItems.size !== filteredSessions.length}
            className="button-primary flex-1 !bg-orange-600 hover:!bg-orange-700 disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ الإرسال...
              </>
            ) : (
              <>
                <i className="bi bi-send ml-1" />
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
