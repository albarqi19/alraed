import { useEffect, useMemo, useRef, useState } from 'react'
import { ModeToggle } from '@/modules/teacher/components/points/mode-toggle'
import { ValueSelector } from '@/modules/teacher/components/points/value-selector'
import { ReasonList } from '@/modules/teacher/components/points/reason-list'
import { StudentPickerSheet } from '@/modules/teacher/components/points/student-picker-sheet'
import { QrScannerModal } from '@/modules/teacher/components/points/qr-scanner-modal'
import { RecentTransactionsList } from '@/modules/teacher/components/points/recent-transactions-list'
import {
  useTeacherPointConfigQuery,
  useTeacherPointSummaryQuery,
  useTeacherPointTransactionMutation,
  useTeacherPointUndoMutation,
} from '@/modules/teacher/points/hooks'
import type { TeacherPointMode, TeacherPointReason, TeacherPointStudent } from '@/modules/teacher/points/types'

const numberFormatter = new Intl.NumberFormat('en-US')

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) return '0'
  return numberFormatter.format(value)
}

function getRemaining(limit?: number | null, used?: number | null) {
  if (!Number.isFinite(limit ?? NaN)) return null
  return Math.max(0, Math.round((limit ?? 0) - (used ?? 0)))
}

function playFeedbackTone(mode: TeacherPointMode) {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
    return
  }

  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = mode === 'reward' ? 'triangle' : 'sawtooth'
    const now = context.currentTime
    const startFrequency = mode === 'reward' ? 660 : 240
    const endFrequency = mode === 'reward' ? 880 : 120

    oscillator.frequency.setValueAtTime(startFrequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.35)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.start(now)
    oscillator.stop(now + 0.5)
    oscillator.onended = () => {
      context.close().catch(() => {
        /* ignore */
      })
    }
  } catch (error) {
    console.warn('audio feedback failed', error)
  }
}

export function TeacherPointsPage() {
  const [mode, setMode] = useState<TeacherPointMode>('reward')
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [pendingReason, setPendingReason] = useState<TeacherPointReason | null>(null)
  const [pendingStudent, setPendingStudent] = useState<TeacherPointStudent | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [manualSelectionMode, setManualSelectionMode] = useState<TeacherPointMode | null>(null)
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null)
  const [statsSheetOpen, setStatsSheetOpen] = useState(false)
  const lastTokenRef = useRef<string | null>(null)

  const configQuery = useTeacherPointConfigQuery()
  const summaryQuery = useTeacherPointSummaryQuery({ enabled: configQuery.isSuccess })

  const transactionMutation = useTeacherPointTransactionMutation()
  const undoMutation = useTeacherPointUndoMutation()

  const config = configQuery.data
  const summary = summaryQuery.data ?? config?.summary
  const settings = config?.settings ?? summary?.settings
  const counter = summary?.counter
  const students = config?.students ?? summary?.students ?? []
  const recentTransactions = summary?.recent_transactions ?? []

  const modeEnabled = useMemo(() => {
    if (!settings) return true
    return mode === 'reward' ? settings.rewards_enabled : settings.violations_enabled
  }, [mode, settings])

  const availableValues = useMemo(() => {
    if (!settings) return [] as number[]
    const values = mode === 'reward' ? settings.reward_values : settings.violation_values
    return (values ?? []).filter((value, index, array) => array.indexOf(value) === index).sort((a, b) => a - b)
  }, [mode, settings])

  const reasons = config?.reasons?.[mode] ?? []

  const displayedReasons = useMemo(() => {
    if (!modeEnabled) return [] as TeacherPointReason[]
    if (selectedValue === null) return [] as TeacherPointReason[]
    const matches = reasons.filter((reason) => reason.value === selectedValue)
    if (matches.length > 0) {
      return matches
    }
    return reasons
  }, [modeEnabled, reasons, selectedValue])

  const rewardRemaining = getRemaining(settings?.daily_teacher_cap, counter?.rewards_given)
  const violationRemaining = getRemaining(settings?.daily_violation_cap, counter?.violations_given)

  const isLoading = configQuery.isLoading && !configQuery.isSuccess
  const isError = configQuery.isError

  useEffect(() => {
    if (!transactionMutation.isPending) {
      lastTokenRef.current = null
    }
  }, [transactionMutation.isPending])

  const resetSelection = () => {
    setSelectedValue(null)
    setPendingReason(null)
    setPendingStudent(null)
    setScannerOpen(false)
    setStudentPickerOpen(false)
    setManualSelectionMode(null)
    setCameraErrorMessage(null)
  }

  const handleModeChange = (nextMode: TeacherPointMode) => {
    setMode(nextMode)
    resetSelection()
  }

  const handleValueSelect = (value: number) => {
    setSelectedValue(value)
    setPendingReason(null)
    setPendingStudent(null)
    setStudentPickerOpen(false)
    setManualSelectionMode(null)
    setCameraErrorMessage(null)
  }

  const openManualSelection = (selectionMode: TeacherPointMode, reasonOverride?: TeacherPointReason | null) => {
    const activeReason = reasonOverride ?? pendingReason
    if (!activeReason) {
      return
    }

    // 🔍 Debug: تتبع البيانات عند فتح القائمة اليدوية
    console.log('🔍 openManualSelection called:', {
      selectionMode,
      configSuccess: configQuery.isSuccess,
      configData: !!config,
      configStudents: config?.students?.length ?? 0,
      summaryData: !!summary,
      summaryStudents: summary?.students?.length ?? 0,
      finalStudents: students.length,
      students: students.slice(0, 3), // عرض أول 3 طلاب فقط
    })

    // التحقق من أن البيانات تم تحميلها بالفعل
    if (!configQuery.isSuccess) {
      console.log('⚠️ Config not loaded yet')
      setCameraErrorMessage('جاري تحميل البيانات، يرجى الانتظار...')
      return
    }

    if (students.length === 0) {
      console.log('❌ Students array is empty!')
      setCameraErrorMessage('لا تتوفر قائمة الطلاب للعرض اليدوي في الوقت الحالي. يرجى استخدام المسح بالرمز أو المحاولة لاحقاً.')
      return
    }

    console.log('✅ Opening student picker with', students.length, 'students')
    setCameraErrorMessage(null)
    setManualSelectionMode(selectionMode)
    setStudentPickerOpen(true)
  }

  const handleReasonSelect = (reason: TeacherPointReason) => {
    if (!modeEnabled) return
    setPendingReason(reason)
    setPendingStudent(null)
    setCameraErrorMessage(null)
    if (mode === 'reward') {
      setScannerOpen(true)
    } else {
      openManualSelection('violation', reason)
    }
  }

  const handleStudentSelect = (student: TeacherPointStudent) => {
    if (!pendingReason) return
    setPendingStudent(student)

    const selectionMode = manualSelectionMode ?? mode
    const context = selectionMode === 'reward' ? 'teacher_reward_manual' : 'teacher_violation_manual'

    if (student.card_token) {
      transactionMutation.mutate(
        {
          reason_id: pendingReason.id,
          student_token: student.card_token,
          context,
        },
        {
          onSuccess: ({ transaction }) => {
            playFeedbackTone(transaction.type)
            setCameraErrorMessage(null)
            resetSelection()
          },
          onError: () => {
            setStudentPickerOpen(true)
          },
        },
      )
      setStudentPickerOpen(false)
      setManualSelectionMode(null)
      return
    }

    setStudentPickerOpen(false)
    setManualSelectionMode(null)
    setCameraErrorMessage(null)
    setScannerOpen(true)
  }

  const handleScanDetected = (token: string) => {
    const trimmed = token.trim()

    // 🔍 Debug: عرض القيمة الممسوحة في console
    console.log('🔍 QR Code Scanned:', {
      raw: token,
      trimmed: trimmed,
      length: trimmed.length,
      isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed),
    })

    if (!trimmed || !pendingReason) {
      return
    }

    if (transactionMutation.isPending) {
      return
    }

    if (lastTokenRef.current === trimmed) {
      return
    }

    lastTokenRef.current = trimmed

    const context = mode === 'reward' ? 'teacher_reward_scan' : 'teacher_violation_scan'

    transactionMutation.mutate(
      {
        reason_id: pendingReason.id,
        student_token: trimmed,
        context,
      },
      {
        onSuccess: ({ transaction }) => {
          playFeedbackTone(transaction.type)
          setCameraErrorMessage(null)
          resetSelection()
        },
        onError: () => {
          lastTokenRef.current = null
        },
      },
    )
  }

  const handleUndo = (transactionId: number) => {
    undoMutation.mutate(transactionId)
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <header className="space-y-2 text-right">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </header>
        <div className="glass-card h-48 animate-pulse"></div>
        <div className="glass-card h-72 animate-pulse"></div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-6 text-right">
        <div className="glass-card space-y-4">
          <h1 className="text-2xl font-semibold text-rose-600 dark:text-rose-400">تعذر تحميل برنامج النقاط</h1>
          <p className="text-sm text-muted">حدث خطأ غير متوقع أثناء جلب الإعدادات. حاول مرة أخرى لاحقاً.</p>
          <button type="button" onClick={() => configQuery.refetch()} className="button-primary w-full sm:w-auto">
            إعادة المحاولة
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3 text-right">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">برنامج نقاطي</h1>
            <p className="text-sm text-muted">لتعزيز السلوك الإيجابي</p>
          </div>
          <button
            type="button"
            onClick={() => setStatsSheetOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 sm:px-4 sm:py-2 sm:text-sm"
          >
            <i className="bi bi-bar-chart-line text-sm" aria-hidden></i>
            <span>الإحصائيات والحدود</span>
          </button>
        </div>
      </header>

      {/* Stats Sheet Modal */}
      {statsSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setStatsSheetOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl bg-white dark:bg-slate-800 pb-8 pt-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">الإحصائيات والحدود اليومية</h2>
              <button
                type="button"
                onClick={() => setStatsSheetOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <i className="bi bi-x-lg text-lg" aria-hidden></i>
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6">
              {settings ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950 p-4 text-right">
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">النقاط الإيجابية المتبقية اليوم</p>
                      <p className="mt-2 text-3xl font-bold text-teal-800 dark:text-teal-300">{formatNumber(rewardRemaining)}</p>
                      <p className="text-xs text-teal-700 dark:text-teal-400">الحد اليومي للمعلم: {formatNumber(settings.daily_teacher_cap)}</p>
                    </div>
                    <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 text-right">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">المخالفات المتبقية اليوم</p>
                      <p className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-300">{formatNumber(violationRemaining)}</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">الحد اليومي للمخالفات: {formatNumber(settings.daily_violation_cap)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-right">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">عدد الطلاب الذين تمت مكافأتهم اليوم</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(counter?.unique_students_rewarded)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-right">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">عدد الطلاب الذين سُجلت عليهم مخالفات اليوم</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(counter?.unique_students_penalized)}</p>
                    </div>
                  </div>
                  {settings.per_student_cap ? (
                    <p className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-xs text-muted">
                      الحد الأعلى لكل طالب من نفس المعلم هو {formatNumber(settings.per_student_cap)} نقطة يومياً. عند تجاوز الحد ستظهر لك رسالة تنبيه.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-center text-sm text-muted">جاري تحميل الإحصائيات...</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="glass-card space-y-5">
        <div className="space-y-3">
          <ModeToggle value={mode} onChange={handleModeChange} />
          {!modeEnabled ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-400">
              تم تعطيل هذا القسم من قبل الإدارة مؤقتاً.
            </div>
          ) : null}
        </div>

        <section className="space-y-4">
          <header className="space-y-1 text-right">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              1. اختر القيمة {mode === 'reward' ? 'الإيجابية' : 'الخاصة بالمخالفة'}
            </h2>
            <p className="text-xs text-muted">القيم تظهر بناءً على الإعدادات المعتمدة من الإدارة.</p>
          </header>
          <ValueSelector
            mode={mode}
            values={availableValues}
            selectedValue={selectedValue}
            onSelect={handleValueSelect}
            disabled={!modeEnabled}
          />
        </section>

        <section className="space-y-4">
          <header className="space-y-1 text-right">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. اختر السبب</h2>
            <p className="text-xs text-muted">
              {selectedValue === null
                ? 'اختر أولاً قيمة النقاط لعرض الأسباب المرتبطة.'
                : 'اختر السبب المناسب وسيتم الانتقال للخطوة التالية تلقائياً.'}
            </p>
          </header>
          {selectedValue === null ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-center text-sm text-muted">
              اختر قيمة النقاط أو المخالفة لعرض الأسباب المتاحة.
            </div>
          ) : (
            <ReasonList mode={mode} reasons={displayedReasons} selectedReasonId={pendingReason?.id ?? null} onSelect={handleReasonSelect} />
          )}
          {selectedValue !== null && displayedReasons.length === 0 ? (
            <p className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              لا توجد أسباب بهذه القيمة. سيتم عرض جميع الأسباب المتاحة تلقائياً من الإدارة.
            </p>
          ) : null}
          {pendingReason && students.length > 0 && mode === 'reward' ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openManualSelection('reward')}
                className="rounded-full border border-teal-200 dark:border-teal-800 px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-400 transition hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50"
              >
                اختيار الطالب دون استخدام الكاميرا
              </button>
            </div>
          ) : null}
          {cameraErrorMessage ? (
            <div className="space-y-2 rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <p>{cameraErrorMessage}</p>
              {pendingReason && students.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openManualSelection(mode)}
                  className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                >
                  فتح قائمة الطلاب الآن
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {mode === 'violation' ? (
          <section className="space-y-3">
            <header className="space-y-1 text-right">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. اختر الطالب</h2>
              <p className="text-xs text-muted">ستظهر قائمة الطلاب بعد اختيار السبب، ويمكنك البحث باسم الطالب أو الصف.</p>
            </header>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-4 text-right text-sm text-muted">
              {students.length === 0 ? (
                <p>لا تتوفر قائمة الطلاب حالياً. يمكنك المحاولة لاحقاً أو استخدام مسح رمز الطالب.</p>
              ) : (
                <>
                  <p>سيتم فتح قائمة الطلاب تلقائياً بعد اختيار السبب. يمكنك فتحها يدوياً من هنا أيضاً.</p>
                  <button
                    type="button"
                    onClick={() => openManualSelection('violation')}
                    className="button-secondary mt-3 w-full sm:w-auto"
                    disabled={!pendingReason}
                  >
                    عرض قائمة الطلاب
                  </button>
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className="glass-card space-y-4">
        <div className="flex items-center justify-between text-right">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">آخر العمليات اليوم</h2>
            <p className="text-xs text-muted">يمكنك التراجع خلال المدة المحددة لكل عملية.</p>
          </div>
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-teal-200 hover:text-teal-700"
          >
            تحديث
          </button>
        </div>
        <RecentTransactionsList
          transactions={recentTransactions}
          onUndo={(transaction) => handleUndo(transaction.id)}
          undoingId={undoMutation.isPending ? (undoMutation.variables ?? null) : null}
        />
      </div>

      <StudentPickerSheet
        isOpen={studentPickerOpen}
        students={students}
        mode={manualSelectionMode ?? mode}
        reasonTitle={pendingReason?.title}
        onSelect={handleStudentSelect}
        onClose={() => {
          setStudentPickerOpen(false)
          setManualSelectionMode(null)
        }}
      />

      <QrScannerModal
        isOpen={scannerOpen}
        mode={mode}
        onClose={() => {
          setScannerOpen(false)
          lastTokenRef.current = null
        }}
        onDetected={handleScanDetected}
        isProcessing={transactionMutation.isPending}
        studentName={pendingStudent?.name}
        onCameraError={(message) => {
          setCameraErrorMessage(message)
          setScannerOpen(false)
          if (pendingReason) {
            openManualSelection(mode, pendingReason)
          }
        }}
      />
    </section>
  )
}
