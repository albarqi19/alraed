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

const numberFormatter = new Intl.NumberFormat('ar-SA')

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
  const lastTokenRef = useRef<string | null>(null)

  const configQuery = useTeacherPointConfigQuery()
  const summaryQuery = useTeacherPointSummaryQuery({ enabled: configQuery.isSuccess })

  const transactionMutation = useTeacherPointTransactionMutation()
  const undoMutation = useTeacherPointUndoMutation()

  const config = configQuery.data
  const summary = summaryQuery.data ?? config?.summary
  const settings = config?.settings ?? summary?.settings
  const counter = summary?.counter
  const students = config?.students ?? []
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

    if (students.length === 0) {
      setCameraErrorMessage('لا تتوفر قائمة الطلاب للعرض اليدوي في الوقت الحالي. يرجى استخدام المسح بالرمز أو المحاولة لاحقاً.')
      return
    }

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
          <div className="h-8 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded-xl bg-slate-200" />
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
          <h1 className="text-2xl font-semibold text-rose-600">تعذر تحميل برنامج النقاط</h1>
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
      <header className="space-y-2 text-right">
        <h1 className="text-3xl font-bold text-slate-900">برنامج نقاطي للمعلم</h1>
        <p className="text-sm text-muted">امنح طلابك نقاطاً إيجابية أو سجّل المخالفات خلال ثوانٍ من جهازك المحمول.</p>
      </header>

      {settings ? (
        <div className="glass-card space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-teal-200 bg-teal-50 p-4 text-right">
              <p className="text-xs font-semibold text-teal-700">النقاط الإيجابية المتبقية اليوم</p>
              <p className="mt-2 text-3xl font-bold text-teal-800">{formatNumber(rewardRemaining)}</p>
              <p className="text-xs text-teal-700">الحد اليومي للمعلم: {formatNumber(settings.daily_teacher_cap)}</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-right">
              <p className="text-xs font-semibold text-amber-700">المخالفات المتبقية اليوم</p>
              <p className="mt-2 text-3xl font-bold text-amber-800">{formatNumber(violationRemaining)}</p>
              <p className="text-xs text-amber-700">الحد اليومي للمخالفات: {formatNumber(settings.daily_violation_cap)}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
              <p className="text-xs font-semibold text-slate-500">عدد الطلاب الذين تمت مكافأتهم اليوم</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(counter?.unique_students_rewarded)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
              <p className="text-xs font-semibold text-slate-500">عدد الطلاب الذين سُجلت عليهم مخالفات اليوم</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(counter?.unique_students_penalized)}</p>
            </div>
          </div>
          {settings.per_student_cap ? (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-muted">
              الحد الأعلى لكل طالب من نفس المعلم هو {formatNumber(settings.per_student_cap)} نقطة يومياً. عند تجاوز الحد ستظهر لك رسالة تنبيه.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="glass-card space-y-5">
        <div className="space-y-3">
          <ModeToggle value={mode} onChange={handleModeChange} />
          {!modeEnabled ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              تم تعطيل هذا القسم من قبل الإدارة مؤقتاً.
            </div>
          ) : null}
        </div>

        <section className="space-y-4">
          <header className="space-y-1 text-right">
            <h2 className="text-lg font-semibold text-slate-900">
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
            <h2 className="text-lg font-semibold text-slate-900">2. اختر السبب</h2>
            <p className="text-xs text-muted">
              {selectedValue === null
                ? 'اختر أولاً قيمة النقاط لعرض الأسباب المرتبطة.'
                : 'اختر السبب المناسب وسيتم الانتقال للخطوة التالية تلقائياً.'}
            </p>
          </header>
          {selectedValue === null ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted">
              اختر قيمة النقاط أو المخالفة لعرض الأسباب المتاحة.
            </div>
          ) : (
            <ReasonList mode={mode} reasons={displayedReasons} selectedReasonId={pendingReason?.id ?? null} onSelect={handleReasonSelect} />
          )}
          {selectedValue !== null && displayedReasons.length === 0 ? (
            <p className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              لا توجد أسباب بهذه القيمة. سيتم عرض جميع الأسباب المتاحة تلقائياً من الإدارة.
            </p>
          ) : null}
          {pendingReason && students.length > 0 && mode === 'reward' ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openManualSelection('reward')}
                className="rounded-full border border-teal-200 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50"
              >
                اختيار الطالب دون استخدام الكاميرا
              </button>
            </div>
          ) : null}
          {cameraErrorMessage ? (
            <div className="space-y-2 rounded-3xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              <p>{cameraErrorMessage}</p>
              {pendingReason && students.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openManualSelection(mode)}
                  className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
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
              <h2 className="text-lg font-semibold text-slate-900">3. اختر الطالب</h2>
              <p className="text-xs text-muted">ستظهر قائمة الطلاب بعد اختيار السبب، ويمكنك البحث باسم الطالب أو الصف.</p>
            </header>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-right text-sm text-muted">
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
            <h2 className="text-lg font-semibold text-slate-900">آخر العمليات اليوم</h2>
            <p className="text-xs text-muted">يمكنك التراجع خلال المدة المحددة لكل عملية.</p>
          </div>
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700"
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
