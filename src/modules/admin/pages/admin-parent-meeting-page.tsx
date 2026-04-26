import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Printer, CheckCircle2, AlertCircle, RefreshCw, Loader2, Users, User, BookOpen, XCircle, Clock } from 'lucide-react'
import { apiClient } from '@/services/api/client'

// ══════════════════════════════════════════
// Types
// ══════════════════════════════════════════

interface StudentSearchResult {
  id: number
  name: string
  national_id: string | null
  student_number: string | null
  grade: string
  class_name: string
  parent_name: string | null
  parent_phone: string | null
}

interface TeacherInfo {
  teacher_id: number
  name: string
  subject_id: number
  subject: string
}

interface StudentStats {
  violations_count: number
  late_arrivals_count: number
  absences_count: number
  referrals_count: number
  semester: string
}

interface StudentDetail {
  student: StudentSearchResult
  teachers: TeacherInfo[]
  stats: StudentStats
}

interface PrintJobInfo {
  id: number
  status: string
  printer_name: string | null
}

interface RegisterResponse {
  attendance_id: number
  student_name: string
  registered_at: string
  already_registered: boolean
  print_job: PrintJobInfo | null
}

interface TodayAttendance {
  id: number
  student_name: string
  grade: string
  guardian_name: string
  registered_at: string
  print_status: string
  can_reprint: boolean
}

interface PrinterInfo {
  id: number
  display_name: string
  system_name: string
  status: string
  is_default: boolean
  queue_count: number
}

interface PrintAgentInfo {
  id: number
  name: string
  status: string
}

interface PairingState {
  loading: boolean
  code: string | null
  expiresAt: string | null
  agentName: string | null
  error: string | null
}

interface TodayAttendanceResponse {
  total_count: number
  attendances: TodayAttendance[]
}

interface PrinterStatusResponse {
  connected: boolean
  name: string | null
  printers: PrinterInfo[]
}

const parentMeetingQueryKeys = {
  all: ['admin', 'parent-meeting'] as const,
  today: () => [...parentMeetingQueryKeys.all, 'today'] as const,
  printers: () => [...parentMeetingQueryKeys.all, 'printers'] as const,
}

const ACTIVE_PRINT_STATUSES = new Set(['pending', 'assigned', 'printing'])

async function fetchTodayAttendance(): Promise<TodayAttendanceResponse> {
  const res = await apiClient.get('/admin/parent-meeting/today')

  return {
    total_count: res.data?.data?.total_count ?? 0,
    attendances: res.data?.data?.attendances ?? [],
  }
}

async function fetchPrinterStatus(): Promise<PrinterStatusResponse> {
  const res = await apiClient.get('/admin/parent-meeting/printers')
  const data = res.data?.data

  return {
    connected: data?.agent_connected ?? false,
    name: data?.agent_name ?? null,
    printers: data?.printers ?? [],
  }
}

// ══════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════

export function AdminParentMeetingPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registerResult, setRegisterResult] = useState<RegisterResponse | null>(null)
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  const [pairingState, setPairingState] = useState<PairingState>({ loading: false, code: null, expiresAt: null, agentName: null, error: null })
  const [pairingCopied, setPairingCopied] = useState(false)
  const [buttonLocked, setButtonLocked] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const todayQuery = useQuery<TodayAttendanceResponse>({
    queryKey: parentMeetingQueryKeys.today(),
    queryFn: fetchTodayAttendance,
    refetchInterval: (query) => {
      const data = query.state.data
      const hasActiveJobs = data?.attendances?.some((attendance) => ACTIVE_PRINT_STATUSES.has(attendance.print_status)) ?? false

      return hasActiveJobs ? 3000 : false
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })

  const todayList = todayQuery.data?.attendances ?? []
  const todayCount = todayQuery.data?.total_count ?? 0
  const loadingToday = todayQuery.isLoading
  const hasActivePrintJobs = todayList.some((attendance) => ACTIVE_PRINT_STATUSES.has(attendance.print_status))

  const printerQuery = useQuery<PrinterStatusResponse>({
    queryKey: parentMeetingQueryKeys.printers(),
    queryFn: fetchPrinterStatus,
    refetchInterval: (query) => {
      const isConnected = query.state.data?.connected ?? false

      if (hasActivePrintJobs) {
        return 4000
      }

      if (!showPrinterModal) {
        return false
      }

      if (pairingState.loading || Boolean(pairingState.code) || !isConnected) {
        return 4000
      }

      return false
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  })

  const printerInfo = printerQuery.data ?? null

  // بحث debounced
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    setRegisterResult(null)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (q.length < 2) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiClient.get(`/admin/parent-meeting/search?q=${encodeURIComponent(q)}`)
        setSearchResults(res.data?.data ?? [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 300)
  }, [])

  // اختيار طالب
  const selectStudent = async (id: number) => {
    setLoadingStudent(true)
    setSearchResults([])
    setSearchQuery('')
    setRegisterResult(null)
    try {
      const res = await apiClient.get(`/admin/parent-meeting/student/${id}`)
      const detail: StudentDetail = res.data?.data
      setSelectedStudent(detail)
      setGuardianName(detail.student.parent_name ?? '')
      setGuardianPhone(detail.student.parent_phone ?? '')
    } catch { setSelectedStudent(null) }
    setLoadingStudent(false)
  }

  // تسجيل حضور
  const handleRegister = async () => {
    if (!selectedStudent || !guardianName.trim() || buttonLocked) return

    setButtonLocked(true)
    setRegistering(true)
    try {
      const res = await apiClient.post('/admin/parent-meeting/register', {
        student_id: selectedStudent.student.id,
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim() || undefined,
      })
      setRegisterResult(res.data?.data)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.today() }),
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.printers() }),
      ])
      // قفل الزر 3 ثواني (حماية double-tap)
      setTimeout(() => setButtonLocked(false), 3000)
    } catch (e: any) {
      setRegisterResult(null)
      alert(e?.response?.data?.message ?? 'حدث خطأ')
      setButtonLocked(false)
    }
    setRegistering(false)
  }

  // إعادة طباعة
  const handleReprint = async (id: number) => {
    try {
      await apiClient.post(`/admin/parent-meeting/reprint/${id}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.today() }),
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.printers() }),
      ])
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'فشلت إعادة الطباعة')
    }
  }

  const getReusablePrintAgent = async (): Promise<PrintAgentInfo | null> => {
    const res = await apiClient.get('/admin/print-agents')
    const agents: PrintAgentInfo[] = res.data?.data ?? []
    return agents.find((agent) => agent.status !== 'revoked') ?? null
  }

  const handlePrinterButtonClick = async () => {
    setShowPrinterModal(true)
    setPairingCopied(false)
    const printerStatusResult = await printerQuery.refetch()
    const currentPrinterInfo = printerStatusResult.data ?? printerQuery.data

    if (currentPrinterInfo?.connected) {
      return
    }

    setPairingState({ loading: true, code: null, expiresAt: null, agentName: null, error: null })

    try {
      const existingAgent = await getReusablePrintAgent()

      if (existingAgent) {
        const res = await apiClient.post(`/admin/print-agents/${existingAgent.id}/re-pair`)
        setPairingState({
          loading: false,
          code: res.data?.data?.pairing_code ?? null,
          expiresAt: res.data?.data?.pairing_expires_at ?? null,
          agentName: existingAgent.name,
          error: null,
        })
      } else {
        const res = await apiClient.post('/admin/print-agents', {
          name: 'وكيل طباعة اجتماع أولياء الأمور',
          description: 'يستخدم لطباعة نماذج متابعة أولياء الأمور',
        })

        setPairingState({
          loading: false,
          code: res.data?.data?.pairing_code ?? null,
          expiresAt: res.data?.data?.pairing_expires_at ?? null,
          agentName: res.data?.data?.name ?? 'وكيل الطباعة',
          error: null,
        })
      }

      await queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.printers() })
    } catch (error: any) {
      setPairingState({
        loading: false,
        code: null,
        expiresAt: null,
        agentName: null,
        error: error?.response?.data?.message ?? 'تعذر توليد كود الربط',
      })
    }
  }

  const copyPairingCode = async () => {
    if (!pairingState.code) return

    try {
      await navigator.clipboard.writeText(pairingState.code)
      setPairingCopied(true)
      setTimeout(() => setPairingCopied(false), 2000)
    } catch {
      setPairingCopied(false)
    }
  }

  useEffect(() => {
    if (printerInfo?.connected) {
      setPairingState((prev) => (prev.error ? { ...prev, error: null } : prev))
    }
  }, [printerInfo?.connected])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">اجتماع أولياء الأمور</h1>
            <p className="text-xs text-slate-500">تسجيل الحضور وطباعة نماذج المتابعة</p>
          </div>
        </div>

        <button
          onClick={handlePrinterButtonClick}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            printerInfo?.connected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Printer className="h-4 w-4" />
          {printerInfo?.connected ? '🟢 الطابعة متصلة' : '🟡 لا توجد طابعة'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 shadow-sm transition-all focus-within:border-emerald-400 focus-within:shadow-emerald-100">
          {searching ? (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          ) : (
            <Search className="h-6 w-6 text-slate-400" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="🔍 ابحث بالهوية أو اسم الطالب..."
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400"
            autoComplete="off"
            id="parent-meeting-search"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute inset-x-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            {searchResults.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s.id)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-right transition-colors hover:bg-emerald-50"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.national_id && <span className="ml-3">🆔 {s.national_id}</span>}
                    <span>📚 {s.grade}/{s.class_name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading Student */}
      {loadingStudent && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Student Detail + Register */}
      {selectedStudent && !loadingStudent && (
        <div className="space-y-4">
          {/* Student Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Student Header */}
            <div className="bg-gradient-to-l from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm text-emerald-600">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedStudent.student.name}</h2>
                    <p className="text-sm text-slate-600">الصف: {selectedStudent.student.grade} / {selectedStudent.student.class_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedStudent(null); setRegisterResult(null) }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Guardian Info (Editable) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">اسم ولي الأمر *</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    id="guardian-name-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">رقم الجوال</label>
                  <input
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    id="guardian-phone-input"
                  />
                </div>
              </div>

              {/* Teachers */}
              {selectedStudent.teachers.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    المعلمون ({selectedStudent.teachers.length})
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedStudent.teachers.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                        <span className="font-medium text-sm text-slate-800">{t.subject}</span>
                        <span className="text-xs text-slate-500">— {t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  📊 إحصائيات ({selectedStudent.stats.semester})
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatBadge label="مخالفات" value={selectedStudent.stats.violations_count} icon="⚠️" color="amber" />
                  <StatBadge label="تأخيرات" value={selectedStudent.stats.late_arrivals_count} icon="⏰" color="orange" />
                  <StatBadge label="غياب" value={selectedStudent.stats.absences_count} icon="❌" color="rose" />
                  <StatBadge label="إحالات" value={selectedStudent.stats.referrals_count} icon="📋" color="purple" />
                </div>
              </div>
            </div>

            {/* Register Button */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              {!registerResult ? (
                <button
                  onClick={handleRegister}
                  disabled={registering || buttonLocked || !guardianName.trim()}
                  className="w-full rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50 disabled:shadow-none"
                  id="register-attendance-btn"
                >
                  {registering ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري التسجيل...
                    </span>
                  ) : buttonLocked ? (
                    '⏳ يرجى الانتظار...'
                  ) : (
                    '✅ تسجيل حضور وطباعة'
                  )}
                </button>
              ) : (
                <div className={`flex items-center gap-3 rounded-xl p-4 ${
                  registerResult.already_registered
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  {registerResult.already_registered ? (
                    <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {registerResult.already_registered ? 'مسجل مسبقاً' : '✅ تم التسجيل بنجاح!'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {registerResult.student_name} — {new Date(registerResult.registered_at).toLocaleTimeString('ar-SA')}
                    </p>
                    {registerResult.print_job && (
                      <p className="mt-1 text-xs text-slate-500">
                        🖨️ الطباعة: {
                          registerResult.print_job.status === 'done' ? '✅ تمت' :
                          registerResult.print_job.status === 'assigned' ? '📤 مُرسلة للطابعة' :
                          registerResult.print_job.status === 'pending' ? '⏳ بانتظار الطباعة' :
                          registerResult.print_job.status
                        }
                        {registerResult.print_job.printer_name && ` — ${registerResult.print_job.printer_name}`}
                      </p>
                    )}
                    {registerResult.print_job?.status === 'pending' && !printerInfo?.connected && (
                      <p className="mt-1 text-xs text-amber-600">⚠️ لا توجد طابعة متصلة — سيتم الطباعة عند اتصال الطابعة</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedStudent(null); setRegisterResult(null) }}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                  >
                    تسجيل آخر
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Records */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
            <h2 className="font-semibold text-slate-900">سجل اليوم</h2>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-100 px-2 text-xs font-bold text-emerald-700">
              {todayCount}
            </span>
          </div>
          <button
            onClick={() => todayQuery.refetch()}
            disabled={todayQuery.isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${todayQuery.isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {loadingToday ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : todayList.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">لم يتم تسجيل أي حضور اليوم</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {todayList.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm text-slate-900">{a.student_name}</span>
                  <span className="mx-2 text-xs text-slate-400">—</span>
                  <span className="text-xs text-slate-500">{a.grade}</span>
                  <span className="mx-2 text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-500">{a.guardian_name}</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(a.registered_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                <PrintStatusBadge status={a.print_status} />
                {a.can_reprint && (
                  <button
                    onClick={() => handleReprint(a.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    title="إعادة طباعة"
                  >
                    🔄
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printer Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPrinterModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">🖨️ حالة الطابعات</h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {!printerInfo ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : !printerInfo.connected ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                  <AlertCircle className="inline h-4 w-4 ml-1" />
                  لا يوجد جهاز طباعة متصل
                  {printerInfo.name && (
                    <p className="mt-1 text-xs text-amber-600">الجهاز: {printerInfo.name} — غير متصل</p>
                  )}
                </div>

                {pairingState.loading ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري توليد كود الربط...
                  </div>
                ) : pairingState.code ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">كود الربط</p>
                    <p className="mt-1 text-xs text-slate-600">انسخه والصقه في برنامج وكيل الطباعة، وسيتم تحديث الحالة تلقائياً عند الاتصال.</p>

                    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-center shadow-sm">
                      <div className="text-3xl font-black tracking-[0.5em] text-emerald-700" dir="ltr">{pairingState.code}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        onClick={copyPairingCode}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        {pairingCopied ? 'تم النسخ' : 'نسخ الكود'}
                      </button>
                      {pairingState.expiresAt && (
                        <span className="text-xs text-slate-500">
                          ينتهي: {new Date(pairingState.expiresAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {pairingState.agentName && (
                      <p className="mt-3 text-xs text-slate-500">الجهاز المرتبط: {pairingState.agentName}</p>
                    )}

                    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 text-xs leading-6 text-slate-600">
                      1. افتح برنامج وكيل الطباعة على جهاز المدرسة.
                      <br />2. الصق كود الربط.
                      <br />3. بعد الربط واختيار الطابعة ستتحول الحالة هنا إلى متصل تلقائياً.
                    </div>
                  </div>
                ) : null}

                {pairingState.error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {pairingState.error}
                  </div>
                )}

                <button
                  onClick={handlePrinterButtonClick}
                  disabled={pairingState.loading}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {pairingState.code ? 'توليد كود جديد' : 'توليد كود الربط'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">الجهاز متصل: {printerInfo.name}</span>
                </div>

                {printerInfo.printers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${p.status === 'online' ? 'bg-emerald-500' : p.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.display_name}</p>
                        <p className="text-xs text-slate-500">{p.system_name}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      {p.is_default && <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 mb-0.5">افتراضية</span>}
                      {p.queue_count > 0 && <p className="text-xs text-slate-500">{p.queue_count} في الانتظار</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════

function StatBadge({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-3 ${colorMap[color] ?? ''}`}>
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[11px]">{label}</div>
      </div>
    </div>
  )
}

function PrintStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    done: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '✅ طُبع' },
    assigned: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: '📤 مُرسل' },
    printing: { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: '🖨️ يطبع' },
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: '⏳ معلق' },
    failed: { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: '❌ فشل' },
    expired: { cls: 'bg-slate-100 text-slate-500', label: '⏰ انتهى' },
  }
  const s = map[status] ?? { cls: 'bg-slate-100 text-slate-500', label: status }
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>
}

export default AdminParentMeetingPage
