import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Users,
  BookOpen,
  XCircle,
  Clock,
  AlertTriangle,
  CalendarX,
  ClipboardList,
  Copy,
  IdCard,
  Link2Off,
  Send,
  Timer,
  UserCheck,
} from 'lucide-react'
import { apiClient } from '@/services/api/client'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsInput,
  WsField,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
  InitialAvatar,
  type Tone,
} from '@/shared/workspace'

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
  agentId: number | null
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

/* حالات الطباعة بلوحة الألوان الهادئة — النشطة منها تنبض في السجل */
const PRINT_STATUS_META: Record<string, { label: string; tone: Tone; live?: boolean }> = {
  done: { label: 'طُبع', tone: TONES.green },
  assigned: { label: 'مُرسل', tone: TONES.sky, live: true },
  printing: { label: 'يطبع', tone: TONES.purple, live: true },
  pending: { label: 'معلق', tone: TONES.amber, live: true },
  failed: { label: 'فشل', tone: TONES.red },
  expired: { label: 'انتهى', tone: TONES.gray },
}

const printStatusMeta = (status: string) => PRINT_STATUS_META[status] ?? { label: status, tone: TONES.gray }

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
    agentId: data?.agent_id ?? null,
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
  const [disconnectingPrinter, setDisconnectingPrinter] = useState(false)
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

  const handleDisconnectPrinter = async () => {
    const agentId = printerInfo?.agentId

    if (!agentId || disconnectingPrinter) {
      return
    }

    const confirmed = window.confirm('سيتم فصل الربط مع وكيل الطباعة الحالي. هل تريد المتابعة؟')
    if (!confirmed) {
      return
    }

    setDisconnectingPrinter(true)

    try {
      await apiClient.post(`/admin/print-agents/${agentId}/revoke`)
      setPairingCopied(false)
      setPairingState({ loading: false, code: null, expiresAt: null, agentName: null, error: null })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.printers() }),
        queryClient.invalidateQueries({ queryKey: parentMeetingQueryKeys.today() }),
      ])
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'تعذر فصل الربط مع وكيل الطباعة')
    } finally {
      setDisconnectingPrinter(false)
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

  const printedToday = todayList.filter((a) => a.print_status === 'done').length
  const activePrintCount = todayList.filter((a) => ACTIVE_PRINT_STATUSES.has(a.print_status)).length

  return (
    <WsPage>
      <WsHeader
        title="اجتماع أولياء الأمور"
        badge="كاونتر الاستقبال"
        actions={
          /* مؤشر الطابعة الحي: نبضة خضراء متصلة / حمراء مفقودة — يفتح لوحة الطابعات */
          <button
            type="button"
            className="ws-chip"
            onClick={handlePrinterButtonClick}
            style={{
              background: printerInfo?.connected ? TONES.green.bg : TONES.amber.bg,
              borderColor: printerInfo?.connected ? TONES.green.bd : TONES.amber.bd,
              color: printerInfo?.connected ? TONES.green.tx : TONES.amber.tx,
              gap: 6,
            }}
          >
            <span className={printerInfo?.connected ? 'ws-pulse' : 'ws-pulse ws-pulse--red'} />
            <Printer style={{ width: 12, height: 12 }} />
            {printerInfo?.connected ? 'الطابعة متصلة' : 'لا توجد طابعة'}
          </button>
        }
        facts={
          <>
            <WsFact icon={UserCheck} label="حضور اليوم">
              <span style={{ color: TONES.green.tx }}>{todayCount}</span>
            </WsFact>
            <WsFact icon={Printer} label="طُبع">{printedToday}</WsFact>
            {activePrintCount > 0 && (
              <WsFact icon={Send} label="قيد الطباعة">
                <span className="ws-soft-pulse" style={{ color: TONES.purple.tx }}>{activePrintCount}</span>
              </WsFact>
            )}
            {printerInfo?.connected && printerInfo.name && (
              <WsFact icon={Printer} label="الوكيل">{printerInfo.name}</WsFact>
            )}
          </>
        }
      />

      <WsLayout>
        <WsMain>
          {/* ★ قمرة الاستقبال: بحث بطل + نتائج فورية */}
          <WsBlock padded>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '2px solid var(--ws-border)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  background: 'var(--ws-surface)',
                  transition: 'border-color 0.12s',
                }}
                onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--ws-accent)' }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--ws-border)' }}
              >
                {searching ? (
                  <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: 'var(--ws-accent)', flexShrink: 0 }} />
                ) : (
                  <Search style={{ width: 18, height: 18, color: 'var(--ws-text-2)', flexShrink: 0 }} />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="ابحث بالهوية أو اسم الطالب..."
                  autoComplete="off"
                  autoFocus
                  id="parent-meeting-search"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: 'var(--ws-text)',
                  }}
                />
              </div>

              {searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    insetInline: 0,
                    top: '100%',
                    marginTop: 4,
                    zIndex: 20,
                    maxHeight: 300,
                    overflowY: 'auto',
                    background: 'var(--ws-surface)',
                    border: '1px solid var(--ws-border)',
                    borderRadius: 10,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
                  }}
                >
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectStudent(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        color: 'var(--ws-text)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ws-accent-soft)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <InitialAvatar name={s.name} tone={TONES.sky} size={28} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 12.5 }}>{s.name}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                          {s.national_id && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginInlineEnd: 8 }}>
                              <IdCard style={{ width: 10, height: 10 }} />{s.national_id}
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <BookOpen style={{ width: 10, height: 10 }} />{s.grade}/{s.class_name}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </WsBlock>

          {/* بطاقة الطالب + تسجيل الحضور */}
          <WsBlock fill scroll>
            {loadingStudent ? (
              <WsEmpty loading>جاري تحميل بيانات الطالب...</WsEmpty>
            ) : !selectedStudent ? (
              <WsEmpty icon={Users}>
                <p style={{ margin: 0 }}>ابحث عن الطالب لبدء تسجيل حضور ولي أمره</p>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>يُطبع نموذج المتابعة تلقائياً بعد التسجيل</p>
              </WsEmpty>
            ) : (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* هوية الطالب */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: TONES.green.bg,
                    border: `1px solid ${TONES.green.bd}`,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <InitialAvatar name={selectedStudent.student.name} tone={TONES.green} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{selectedStudent.student.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TONES.green.tx }}>
                      {selectedStudent.student.grade} / {selectedStudent.student.class_name}
                      {selectedStudent.student.national_id ? ` • ${selectedStudent.student.national_id}` : ''}
                    </p>
                  </div>
                  <WsIconBtn
                    icon={XCircle}
                    label="إلغاء التحديد"
                    onClick={() => { setSelectedStudent(null); setRegisterResult(null) }}
                  />
                </div>

                {/* بيانات ولي الأمر */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <WsField label="اسم ولي الأمر *">
                    <WsInput
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      id="guardian-name-input"
                    />
                  </WsField>
                  <WsField label="رقم الجوال">
                    <WsInput
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      dir="ltr"
                      id="guardian-phone-input"
                    />
                  </WsField>
                </div>

                {/* سجل الطالب — مادة الحديث في الاجتماع */}
                <div>
                  <p className="ws-label" style={{ marginBottom: 6 }}>
                    سجل الطالب ({selectedStudent.stats.semester})
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                    <StatTile icon={AlertTriangle} label="مخالفات" value={selectedStudent.stats.violations_count} tone={TONES.amber} />
                    <StatTile icon={Timer} label="تأخيرات" value={selectedStudent.stats.late_arrivals_count} tone={TONES.sky} />
                    <StatTile icon={CalendarX} label="غياب" value={selectedStudent.stats.absences_count} tone={TONES.red} />
                    <StatTile icon={ClipboardList} label="إحالات" value={selectedStudent.stats.referrals_count} tone={TONES.purple} />
                  </div>
                </div>

                {/* المعلمون — من قد يطلب وليّ الأمر لقاءه */}
                {selectedStudent.teachers.length > 0 && (
                  <div>
                    <p className="ws-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <BookOpen style={{ width: 12, height: 12 }} />
                      المعلمون ({selectedStudent.teachers.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {selectedStudent.teachers.map((t, idx) => (
                        <span key={idx} className="ws-chip" style={{ gap: 4 }}>
                          <b>{t.subject}</b>
                          <span style={{ color: 'var(--ws-text-2)', fontWeight: 400 }}>— {t.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* التسجيل / نتيجته */}
                {!registerResult ? (
                  <WsBtn
                    variant="primary"
                    icon={registering ? undefined : CheckCircle2}
                    onClick={handleRegister}
                    disabled={registering || buttonLocked || !guardianName.trim()}
                    id="register-attendance-btn"
                    style={{ justifyContent: 'center', padding: '11px 16px', fontSize: 13.5 }}
                  >
                    {registering ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                        جاري التسجيل...
                      </span>
                    ) : buttonLocked ? 'يرجى الانتظار...' : 'تسجيل حضور وطباعة النموذج'}
                  </WsBtn>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      borderRadius: 10,
                      padding: 12,
                      background: registerResult.already_registered ? TONES.amber.bg : TONES.green.bg,
                      border: `1px solid ${registerResult.already_registered ? TONES.amber.bd : TONES.green.bd}`,
                    }}
                  >
                    {registerResult.already_registered ? (
                      <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, color: TONES.amber.tx }} />
                    ) : (
                      <CheckCircle2 style={{ width: 18, height: 18, flexShrink: 0, color: TONES.green.tx }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>
                        {registerResult.already_registered ? 'مسجل مسبقاً' : 'تم التسجيل بنجاح'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                        {registerResult.student_name} — {new Date(registerResult.registered_at).toLocaleTimeString('ar-SA')}
                      </p>
                      {registerResult.print_job && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Printer style={{ width: 11, height: 11, color: 'var(--ws-text-2)' }} />
                          <ToneChip tone={printStatusMeta(registerResult.print_job.status).tone}>
                            {printStatusMeta(registerResult.print_job.status).label}
                          </ToneChip>
                          {registerResult.print_job.printer_name && (
                            <span style={{ color: 'var(--ws-text-2)' }}>{registerResult.print_job.printer_name}</span>
                          )}
                        </p>
                      )}
                      {registerResult.print_job?.status === 'pending' && !printerInfo?.connected && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: TONES.amber.tx }}>
                          لا توجد طابعة متصلة — ستُطبع تلقائياً عند اتصال الطابعة
                        </p>
                      )}
                    </div>
                    <WsBtn
                      size="sm"
                      icon={Search}
                      onClick={() => { setSelectedStudent(null); setRegisterResult(null) }}
                    >
                      تسجيل آخر
                    </WsBtn>
                  </div>
                )}
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* سجل اليوم الحي */}
        <WsSideCol
          side="end"
          title="سجل اليوم"
          icon={Clock}
          storageKey="ws:parent-meeting:today"
          width={340}
          tools={
            <WsIconBtn
              icon={RefreshCw}
              label="تحديث السجل"
              disabled={todayQuery.isFetching}
              onClick={() => todayQuery.refetch()}
              className={todayQuery.isFetching ? 'animate-spin' : undefined}
            />
          }
        >
          <WsBlock fill scroll>
            {loadingToday ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : todayList.length === 0 ? (
              <WsEmpty icon={Users}>لم يتم تسجيل أي حضور اليوم</WsEmpty>
            ) : (
              todayList.map((a) => {
                const meta = printStatusMeta(a.print_status)
                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: TONES.green.bg,
                        color: TONES.green.tx,
                        border: `1px solid ${TONES.green.bd}`,
                      }}
                    >
                      <CheckCircle2 style={{ width: 13, height: 13 }} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.student_name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.grade} • {a.guardian_name} • {new Date(a.registered_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={meta.live ? 'ws-soft-pulse' : undefined} style={{ flexShrink: 0 }}>
                      <ToneChip tone={meta.tone}>{meta.label}</ToneChip>
                    </span>
                    {a.can_reprint && (
                      <WsIconBtn icon={RefreshCw} label="إعادة طباعة" onClick={() => handleReprint(a.id)} />
                    )}
                  </div>
                )
              })
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* لوحة الطابعات والربط */}
      {showPrinterModal && (
        <div className="ws-modal" onClick={() => setShowPrinterModal(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Printer style={{ width: 14, height: 14, color: 'var(--ws-accent)' }} />
                    حالة الطابعات
                  </h3>
                  <p className="ws-modal__sub">وكيل الطباعة على جهاز المدرسة يستلم النماذج ويطبعها</p>
                </div>
                <WsIconBtn icon={XCircle} label="إغلاق" onClick={() => setShowPrinterModal(false)} />
              </div>
            </header>

            <div className="ws-modal__body">
              {printerInfo?.agentId ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <WsBtn
                    size="sm"
                    icon={disconnectingPrinter ? undefined : Link2Off}
                    onClick={handleDisconnectPrinter}
                    disabled={disconnectingPrinter}
                    style={{ color: TONES.red.tx, borderColor: TONES.red.bd, background: TONES.red.bg }}
                  >
                    {disconnectingPrinter ? 'جاري الفصل...' : 'فصل الربط'}
                  </WsBtn>
                </div>
              ) : null}

              {!printerInfo ? (
                <WsEmpty loading>جاري قراءة حالة الطابعات...</WsEmpty>
              ) : !printerInfo.connected ? (
                <>
                  <WsAlert tone="warn" boxed>
                    <span>
                      لا يوجد جهاز طباعة متصل
                      {printerInfo.name && <span style={{ display: 'block', fontSize: 11 }}>الجهاز: {printerInfo.name} — غير متصل</span>}
                    </span>
                  </WsAlert>

                  {pairingState.loading ? (
                    <WsEmpty loading>جاري توليد كود الربط...</WsEmpty>
                  ) : pairingState.code ? (
                    <div style={{ border: `1px solid ${TONES.green.bd}`, background: TONES.green.bg, borderRadius: 10, padding: 12 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 12.5 }}>كود الربط</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                        انسخه والصقه في برنامج وكيل الطباعة، وستتحدث الحالة تلقائياً عند الاتصال.
                      </p>

                      <div
                        style={{
                          margin: '10px 0',
                          background: 'var(--ws-surface)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          textAlign: 'center',
                          fontSize: 26,
                          fontWeight: 900,
                          letterSpacing: '0.4em',
                          color: TONES.green.tx,
                          direction: 'ltr',
                        }}
                      >
                        {pairingState.code}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <WsBtn size="sm" variant="primary" icon={Copy} onClick={copyPairingCode}>
                          {pairingCopied ? 'تم النسخ' : 'نسخ الكود'}
                        </WsBtn>
                        {pairingState.expiresAt && (
                          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                            ينتهي: {new Date(pairingState.expiresAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {pairingState.agentName && (
                        <p style={{ margin: '8px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                          الجهاز المرتبط: {pairingState.agentName}
                        </p>
                      )}

                      <div
                        style={{
                          marginTop: 8,
                          border: '1px dashed var(--ws-border)',
                          background: 'var(--ws-surface)',
                          borderRadius: 8,
                          padding: 9,
                          fontSize: 10.5,
                          lineHeight: 2,
                          color: 'var(--ws-text-2)',
                        }}
                      >
                        1. افتح برنامج وكيل الطباعة على جهاز المدرسة.
                        <br />2. الصق كود الربط.
                        <br />3. بعد الربط واختيار الطابعة ستتحول الحالة هنا إلى متصل تلقائياً.
                      </div>
                    </div>
                  ) : null}

                  {pairingState.error && <WsAlert tone="error" boxed>{pairingState.error}</WsAlert>}

                  <WsBtn onClick={handlePrinterButtonClick} disabled={pairingState.loading} style={{ justifyContent: 'center' }}>
                    {pairingState.code ? 'توليد كود جديد' : 'توليد كود الربط'}
                  </WsBtn>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: TONES.green.bg,
                      border: `1px solid ${TONES.green.bd}`,
                      borderRadius: 10,
                      padding: '8px 10px',
                    }}
                  >
                    <span className="ws-pulse" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: TONES.green.tx }}>
                      الجهاز متصل: {printerInfo.name}
                    </span>
                  </div>

                  {printerInfo.printers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        border: '1px solid var(--ws-border)',
                        borderRadius: 10,
                        padding: 9,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: p.status === 'online' ? TONES.green.tx : p.status === 'error' ? TONES.red.tx : TONES.gray.tx,
                          }}
                        />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{p.display_name}</span>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>{p.system_name}</span>
                        </span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        {p.is_default && <ToneChip tone={TONES.sky}>افتراضية</ToneChip>}
                        {p.queue_count > 0 && (
                          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{p.queue_count} في الانتظار</span>
                        )}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </WsPage>
  )
}

// ══════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════

/** مربع رقم في سجل الطالب — بلون هادئ من اللوحة */
function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertTriangle
  label: string
  value: number
  tone: Tone
}) {
  const isZero = value === 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 10,
        padding: '8px 10px',
        background: isZero ? 'var(--ws-surface-2)' : tone.bg,
        border: `1px solid ${isZero ? 'var(--ws-hairline)' : tone.bd}`,
      }}
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0, color: isZero ? 'var(--ws-text-2)' : tone.tx }} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: isZero ? 'var(--ws-text-2)' : tone.tx, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{label}</div>
      </div>
    </div>
  )
}

export default AdminParentMeetingPage
