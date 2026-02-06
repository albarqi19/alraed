import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  Users,
  Clock,
  UserX,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useBarcodeTodayScansQuery, useBarcodeStatsQuery, useScanBarcodeMutation } from '../barcode/hooks'
import type { BarcodeScanResult, BarcodeScanRecord, BarcodeScanFilters } from '../barcode/types'
import { getEchoInstance } from '@/services/echo'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { barcodeQueryKeys } from '../barcode/query-keys'

// ==================== المكونات الفرعية ====================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value.toLocaleString('ar-SA')}</p>
        </div>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function ScanResultBadge({ result }: { result: string }) {
  const config: Record<string, { label: string; className: string }> = {
    present: { label: 'حاضر', className: 'bg-green-100 text-green-700' },
    late: { label: 'متأخر', className: 'bg-yellow-100 text-yellow-700' },
    duplicate: { label: 'مكرر', className: 'bg-gray-100 text-gray-600' },
    invalid: { label: 'غير صالح', className: 'bg-red-100 text-red-700' },
    inactive: { label: 'غير نشط', className: 'bg-orange-100 text-orange-700' },
  }
  const { label, className } = config[result] ?? { label: result, className: 'bg-gray-100 text-gray-600' }

  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
}

function LiveFeedItem({ scan }: { scan: BarcodeScanRecord }) {
  const resultIcon =
    scan.scan_result === 'present' ? (
      <span className="text-green-500">●</span>
    ) : scan.scan_result === 'late' ? (
      <span className="text-yellow-500">●</span>
    ) : (
      <span className="text-red-500">●</span>
    )

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm"
    >
      <div className="text-lg">{resultIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{scan.student?.name ?? 'غير معروف'}</p>
        <p className="text-xs text-gray-500">
          {scan.student?.grade} - {scan.student?.class_name}
        </p>
      </div>
      <div className="text-left">
        <p className="text-xs font-mono text-gray-600">{scan.scan_time?.slice(0, 5)}</p>
        <ScanResultBadge result={scan.scan_result} />
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

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حضور البوابة</h1>
          <p className="text-sm text-gray-500">المراقبة المباشرة لتحضير الطلاب بالباركود</p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.root })
          }}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="حاضرون" value={stats?.present_count ?? 0} icon={UserCheck} color="bg-green-500" />
        <StatCard label="متأخرون" value={stats?.late_count ?? 0} icon={Clock} color="bg-yellow-500" />
        <StatCard label="غائبون" value={stats?.absent_count ?? 0} icon={UserX} color="bg-red-500" />
        <StatCard label="إجمالي الطلاب" value={stats?.total_students ?? 0} icon={Users} color="bg-blue-500" />
      </div>

      {/* القسم الرئيسي: البث المباشر + الإدخال اليدوي */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* البث المباشر */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <ScanLine className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">البث المباشر</h3>
              <span className="mr-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
            </div>
            <div className="max-h-[400px] space-y-2 overflow-y-auto p-3">
              <AnimatePresence mode="popLayout">
                {liveFeed.length > 0 ? (
                  liveFeed.map((scan, i) => <LiveFeedItem key={scan.id ?? `feed-${i}`} scan={scan} />)
                ) : (
                  <div className="py-8 text-center text-sm text-gray-400">
                    <ScanLine className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    في انتظار المسح...
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* الإدخال اليدوي + نتيجة آخر مسح */}
        <div className="space-y-4 lg:col-span-2">
          {/* إدخال يدوي */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">مسح يدوي</h3>
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="أدخل رقم الهوية أو امسح الباركود..."
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                dir="ltr"
              />
              <button
                onClick={handleManualScan}
                disabled={scanMutation.isPending || !manualBarcode.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <ScanLine className="h-4 w-4" />
                {scanMutation.isPending ? 'جاري المسح...' : 'مسح'}
              </button>
            </div>

            {/* نتيجة آخر مسح */}
            <AnimatePresence mode="wait">
              {lastScanResult && (
                <motion.div
                  key={lastScanResult.scan_time}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-4 rounded-lg p-4 ${
                    lastScanResult.success
                      ? lastScanResult.scan_result === 'late'
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-green-50 border border-green-200'
                      : lastScanResult.scan_result === 'duplicate'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lastScanResult.success ? (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    ) : lastScanResult.scan_result === 'duplicate' ? (
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{lastScanResult.message}</p>
                      {lastScanResult.student_name && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {lastScanResult.student_name} - {lastScanResult.student_grade}{' '}
                          {lastScanResult.student_class}
                        </p>
                      )}
                      {lastScanResult.late_minutes && (
                        <p className="text-xs text-yellow-700 mt-0.5">
                          تأخير: {lastScanResult.late_minutes} دقيقة
                        </p>
                      )}
                    </div>
                    <span className="mr-auto text-xs text-gray-400">{lastScanResult.scan_time}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* شريط التقدم */}
          {stats && stats.total_students > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="mb-2 flex justify-between text-xs text-gray-500">
                <span>نسبة الحضور</span>
                <span>
                  {stats.scanned_count} / {stats.total_students}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="flex h-full transition-all duration-500"
                  style={{
                    width: `${((stats.scanned_count / stats.total_students) * 100).toFixed(1)}%`,
                  }}
                >
                  <div
                    className="bg-green-500"
                    style={{
                      width: stats.scanned_count > 0 ? `${((stats.present_count / stats.scanned_count) * 100).toFixed(1)}%` : '0%',
                    }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: stats.scanned_count > 0 ? `${((stats.late_count / stats.scanned_count) * 100).toFixed(1)}%` : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> حاضر
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> متأخر
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-300" /> لم يحضر
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* جدول سجلات المسح */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">سجل المسح اليوم</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={filters.search ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
                className="rounded-lg border py-1.5 pr-9 pl-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={filters.scan_result ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, scan_result: e.target.value || undefined }))}
              className="rounded-lg border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="present">حاضر</option>
              <option value="late">متأخر</option>
              <option value="duplicate">مكرر</option>
              <option value="invalid">غير صالح</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-right text-xs text-gray-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">الصف / الفصل</th>
                <th className="px-4 py-3">الوقت</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">التأخير</th>
                <th className="px-4 py-3">واتساب</th>
              </tr>
            </thead>
            <tbody>
              {scansLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    جاري التحميل...
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    لا توجد سجلات مسح لليوم
                  </td>
                </tr>
              ) : (
                scans.map((scan, index) => (
                  <tr key={scan.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{scan.student?.name ?? scan.barcode_value}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {scan.student ? `${scan.student.grade} - ${scan.student.class_name}` : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600" dir="ltr">
                      {scan.scan_time?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">
                      <ScanResultBadge result={scan.scan_result} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {scan.late_minutes ? `${scan.late_minutes} د` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {scan.whatsapp_queued ? (
                        <span className="text-green-600 text-xs">تم الإرسال</span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
