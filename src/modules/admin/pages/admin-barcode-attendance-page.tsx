import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  Users,
  Clock3,
  UserX,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { useBarcodeTodayScansQuery, useBarcodeStatsQuery, useScanBarcodeMutation } from '../barcode/hooks'
import type { BarcodeScanResult, BarcodeScanRecord, BarcodeScanFilters } from '../barcode/types'
import { getEchoInstance } from '@/services/echo'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { barcodeQueryKeys } from '../barcode/query-keys'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  type WsChipTone,
} from '@/shared/workspace'

// ==================== المكونات الفرعية ====================

const SCAN_RESULT_CONFIG: Record<string, { label: string; tone: WsChipTone | undefined; dot: string }> = {
  present: { label: 'حاضر', tone: 'green', dot: 'var(--ws-green)' },
  late: { label: 'متأخر', tone: 'amber', dot: 'var(--ws-amber)' },
  duplicate: { label: 'مكرر', tone: undefined, dot: 'var(--ws-text-2)' },
  invalid: { label: 'غير صالح', tone: 'red', dot: 'var(--ws-red)' },
  inactive: { label: 'غير نشط', tone: 'amber', dot: 'var(--ws-amber)' },
}

function ScanResultChip({ result }: { result: string }) {
  const config = SCAN_RESULT_CONFIG[result] ?? { label: result, tone: undefined, dot: 'var(--ws-text-2)' }
  return <WsChip tone={config.tone}>{config.label}</WsChip>
}

function LiveFeedItem({ scan }: { scan: BarcodeScanRecord }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderBottom: '1px solid var(--ws-hairline)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {scan.student?.name ?? 'غير معروف'}
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
          {scan.student?.grade} - {scan.student?.class_name}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', direction: 'ltr' }}>{scan.scan_time?.slice(0, 5)}</span>
        <ScanResultChip result={scan.scan_result} />
      </div>
    </motion.div>
  )
}

// ==================== الصفحة الرئيسية ====================

export function AdminBarcodeAttendancePage() {
  const [filters, setFilters] = useState<BarcodeScanFilters>({})
  const [manualBarcode, setManualBarcode] = useState('')
  const [liveFeed, setLiveFeed] = useState<BarcodeScanRecord[]>([])
  const [lastScanResult, setLastScanResult] = useState<BarcodeScanResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: scans = [], isLoading: scansLoading } = useBarcodeTodayScansQuery(filters)
  const { data: stats } = useBarcodeStatsQuery()
  const scanMutation = useScanBarcodeMutation()

  // الاشتراك في WebSocket للبث المباشر
  useEffect(() => {
    const schoolId = user?.school_id
    if (!schoolId) return

    let channel: ReturnType<ReturnType<typeof getEchoInstance>['private']> | null = null

    try {
      const echo = getEchoInstance()
      channel = echo.private(`barcode-scan.${schoolId}`)

      channel.listen('.student.scanned', (data: BarcodeScanRecord) => {
        setLiveFeed((prev) => [data, ...prev].slice(0, 20))
        queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.stats() })
        queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.today() })

        // تشغيل صوت حسب النتيجة
        playSound(data.scan_result)
      })

      channel.listen('.absence.processed', () => {
        queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.stats() })
        queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.today() })
      })
    } catch {
      // WebSocket غير متاح - يعتمد على polling
    }

    return () => {
      if (channel) {
        try {
          const echo = getEchoInstance()
          echo.leave(`barcode-scan.${schoolId}`)
        } catch {
          // ignore
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.school_id, queryClient])

  // تشغيل أصوات
  const playSound = useCallback((result: string) => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = 0.1

      if (result === 'present') {
        osc.frequency.value = 800
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } else if (result === 'late') {
        osc.frequency.value = 400
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      } else {
        osc.frequency.value = 200
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch {
      // ignore audio errors
    }
  }, [])

  // معالجة المسح اليدوي
  const handleManualScan = useCallback(() => {
    if (!manualBarcode.trim()) return

    scanMutation.mutate(manualBarcode.trim(), {
      onSuccess: (result) => {
        setLastScanResult(result)
        setManualBarcode('')
        inputRef.current?.focus()
        playSound(result.scan_result)
      },
      onError: () => {
        setLastScanResult({
          success: false,
          status: 'error',
          scan_result: 'error',
          message: 'حدث خطأ في الاتصال',
          scan_time: new Date().toLocaleTimeString('ar-SA'),
        })
      },
    })
  }, [manualBarcode, scanMutation, playSound])

  // الاستماع لـ Enter في حقل الإدخال
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleManualScan()
      }
    },
    [handleManualScan],
  )

  const lastScanTone = lastScanResult
    ? lastScanResult.success
      ? lastScanResult.scan_result === 'late'
        ? ('warn' as const)
        : ('success' as const)
      : lastScanResult.scan_result === 'duplicate'
        ? ('info' as const)
        : ('error' as const)
    : null

  const scannedPct = stats && stats.total_students > 0 ? (stats.scanned_count / stats.total_students) * 100 : 0
  const presentPct = stats && stats.scanned_count > 0 ? (stats.present_count / stats.scanned_count) * 100 : 0
  const latePct = stats && stats.scanned_count > 0 ? (stats.late_count / stats.scanned_count) * 100 : 0

  return (
    <WsPage>
      <WsHeader
        title="حضور البوابة"
        badge={
          <>
            <span className="ws-pulse" />
            مباشر
          </>
        }
        actions={
          <WsBtn icon={RefreshCw} onClick={() => queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.root })}>
            تحديث
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={UserCheck} label="حاضرون:">
              {(stats?.present_count ?? 0).toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={Clock3} label="متأخرون:">
              {(stats?.late_count ?? 0).toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={UserX} label="غائبون:">
              {(stats?.absent_count ?? 0).toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={Users} label="الإجمالي:">
              {(stats?.total_students ?? 0).toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={ScanLine} label="تم مسحهم:">
              {(stats?.scanned_count ?? 0).toLocaleString('ar-SA')} / {(stats?.total_students ?? 0).toLocaleString('ar-SA')}
            </WsFact>
          </>
        }
      />

      {/* المسح اليدوي */}
      <div className="ws-toolbar">
        <div className="ws-field ws-field--grow">
          <label className="ws-label" htmlFor="ws-barcode-input">
            مسح يدوي — أدخل رقم الهوية أو امسح الباركود
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <WsInput
              id="ws-barcode-input"
              ref={inputRef}
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="XXXXXXXXXX"
              autoFocus
              dir="ltr"
              style={{ flex: 1, maxWidth: 420 }}
            />
            <WsBtn
              variant="primary"
              icon={ScanLine}
              onClick={handleManualScan}
              disabled={scanMutation.isPending || !manualBarcode.trim()}
            >
              {scanMutation.isPending ? 'جاري المسح...' : 'مسح'}
            </WsBtn>
          </div>
        </div>
      </div>

      {/* نتيجة آخر مسح */}
      <AnimatePresence mode="wait">
        {lastScanResult && lastScanTone && (
          <motion.div
            key={lastScanResult.scan_time}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ flexShrink: 0 }}
          >
            <WsAlert
              tone={lastScanTone}
              icon={lastScanResult.success ? CheckCircle2 : lastScanResult.scan_result === 'duplicate' ? RefreshCw : AlertTriangle}
            >
              <b>{lastScanResult.message}</b>
              {lastScanResult.student_name && (
                <span>
                  {lastScanResult.student_name} — {lastScanResult.student_grade} {lastScanResult.student_class}
                </span>
              )}
              {lastScanResult.late_minutes ? <span>تأخير: {lastScanResult.late_minutes} دقيقة</span> : null}
              <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 400 }}>{lastScanResult.scan_time}</span>
            </WsAlert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شريط نسبة الحضور المجزأ */}
      {stats && stats.total_students > 0 && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 16px',
            background: 'var(--ws-surface)',
            borderBottom: '1px solid var(--ws-border)',
          }}
        >
          <span className="ws-fact" style={{ flexShrink: 0 }}>
            نسبة الحضور: <b>{scannedPct.toFixed(1)}%</b>
          </span>
          <span
            className="ws-progressbar"
            style={{ flex: 1 }}
          >
            <span
              style={{
                width: `${scannedPct.toFixed(1)}%`,
                display: 'flex',
                background: 'transparent',
              }}
            >
              <span style={{ width: `${presentPct.toFixed(1)}%`, background: 'var(--ws-green)', borderRadius: 999 }} />
              <span style={{ width: `${latePct.toFixed(1)}%`, background: 'var(--ws-amber)', borderRadius: 999 }} />
            </span>
          </span>
          <span style={{ display: 'inline-flex', gap: 5, flexShrink: 0 }}>
            <WsChip tone="green">حاضر</WsChip>
            <WsChip tone="amber">متأخر</WsChip>
            <WsChip>لم يحضر</WsChip>
          </span>
        </div>
      )}

      <WsLayout>
        {/* العمود الأيمن: البث المباشر */}
        <WsSideCol
          title={
            <>
              البث المباشر
              <span className="ws-pulse" />
            </>
          }
          icon={ScanLine}
          side="start"
          width={290}
          storageKey="ws:barcode-attendance:live"
          collapsedLabel="البث المباشر"
        >
          <WsBlock fill scroll>
            <AnimatePresence mode="popLayout">
              {liveFeed.length > 0 ? (
                liveFeed.map((scan, i) => <LiveFeedItem key={scan.id ?? `feed-${i}`} scan={scan} />)
              ) : (
                <WsEmpty icon={ScanLine}>في انتظار المسح...</WsEmpty>
              )}
            </AnimatePresence>
          </WsBlock>
        </WsSideCol>

        {/* الوسط: سجل المسح اليوم */}
        <WsMain>
          <WsBlock
            title="سجل المسح اليوم"
            icon={ScanLine}
            count={scans.length.toLocaleString('ar-SA')}
            tools={
              <>
                <WsInput
                  type="search"
                  placeholder="بحث..."
                  value={filters.search ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
                  style={{ height: 26, fontSize: 11.5, width: 150 }}
                />
                <WsSelect
                  value={filters.scan_result ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, scan_result: e.target.value || undefined }))}
                  style={{ height: 26, fontSize: 11.5 }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="present">حاضر</option>
                  <option value="late">متأخر</option>
                  <option value="duplicate">مكرر</option>
                  <option value="invalid">غير صالح</option>
                </WsSelect>
              </>
            }
            fill
          >
            {scansLoading ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : scans.length === 0 ? (
              <WsEmpty icon={ScanLine}>لا توجد سجلات مسح لليوم.</WsEmpty>
            ) : (
              <div className="ws-tablewrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الطالب</th>
                      <th>الصف / الفصل</th>
                      <th>الوقت</th>
                      <th>الحالة</th>
                      <th>التأخير</th>
                      <th>واتساب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((scan, index) => (
                      <tr key={scan.id}>
                        <td style={{ color: 'var(--ws-text-2)' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600 }}>{scan.student?.name ?? scan.barcode_value}</td>
                        <td>{scan.student ? `${scan.student.grade} - ${scan.student.class_name}` : '—'}</td>
                        <td style={{ direction: 'ltr', textAlign: 'right' }}>{scan.scan_time?.slice(0, 5)}</td>
                        <td>
                          <ScanResultChip result={scan.scan_result} />
                        </td>
                        <td style={{ color: 'var(--ws-text-2)' }}>{scan.late_minutes ? `${scan.late_minutes} د` : '—'}</td>
                        <td>
                          {scan.whatsapp_queued ? (
                            <WsChip tone="green" icon={CheckCircle2}>
                              تم الإرسال
                            </WsChip>
                          ) : (
                            <span style={{ color: 'var(--ws-text-2)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}
