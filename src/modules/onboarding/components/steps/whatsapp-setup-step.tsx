import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchWhatsappInstances,
  createWhatsappInstance,
  getWhatsappInstanceQrCode,
  checkWhatsappInstanceStatus,
} from '@/modules/admin/api'
import type { WhatsappInstance } from '@/modules/admin/types'
import { useToast } from '@/shared/feedback/use-toast'
import type { StepComponentProps } from '../../types'

const QR_LIFETIME = 55 // ثانية - صلاحية QR قبل التجديد

export function WhatsappSetupStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pollingId, setPollingId] = useState<number | null>(null)
  const [qrCountdown, setQrCountdown] = useState(QR_LIFETIME)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // جلب Instances
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp', 'instances'],
    queryFn: fetchWhatsappInstances,
    refetchInterval: 5000,
  })

  const connectedInstance = instances.find((i) => i.status === 'connected')
  const connectingInstance = instances.find((i) => i.status === 'connecting')

  // إنشاء Instance جديد
  const createMutation = useMutation({
    mutationFn: createWhatsappInstance,
    onSuccess: (newInstance) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      toast({ title: 'تم إنشاء رقم واتساب جديد', type: 'success' })

      if (newInstance.qr_code) {
        setQrCode(newInstance.qr_code)
        startCountdown()
      }

      if (newInstance.status === 'connecting') {
        setPollingId(newInstance.id)
      }
    },
    onError: (error: Error & { message?: string }) => {
      toast({ title: error?.message || 'فشل إنشاء رقم واتساب', type: 'error' })
    },
  })

  // بدء العد التنازلي عند ظهور QR
  const startCountdown = useCallback(() => {
    setQrCountdown(QR_LIFETIME)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
  }, [])

  // جلب QR Code
  const qrMutation = useMutation({
    mutationFn: getWhatsappInstanceQrCode,
    onSuccess: (data) => {
      setQrCode(data.qr_code)
      startCountdown()
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
    },
  })

  // تجديد QR تلقائياً عند انتهاء العد
  useEffect(() => {
    if (qrCountdown === 0 && pollingId && !connectedInstance && !qrMutation.isPending) {
      qrMutation.mutate(pollingId)
    }
  }, [qrCountdown, pollingId, connectedInstance, qrMutation.isPending])

  // تنظيف العداد عند الاتصال أو إلغاء التركيب
  useEffect(() => {
    if (connectedInstance || !qrCode) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [connectedInstance, qrCode])

  // Polling للحالة
  useEffect(() => {
    if (!pollingId) return

    const interval = setInterval(() => {
      checkWhatsappInstanceStatus(pollingId)
        .then((instance) => {
          queryClient.setQueryData(['admin', 'whatsapp', 'instances'], (old: WhatsappInstance[] | undefined) => {
            if (!old) return old
            return old.map((i) => (i.id === instance.id ? instance : i))
          })

          if (instance.status === 'connected') {
            toast({ title: `تم الاتصال بنجاح! الرقم: ${instance.phone_number}`, type: 'success' })
            setQrCode(null)
            setPollingId(null)
          }
        })
        .catch(console.error)
    }, 3000)

    return () => clearInterval(interval)
  }, [pollingId, queryClient, toast])

  // بدء polling تلقائي لـ connecting instances
  useEffect(() => {
    if (connectingInstance && !pollingId) {
      setPollingId(connectingInstance.id)
      if (!qrCode) {
        qrMutation.mutate(connectingInstance.id)
      }
    }
  }, [connectingInstance, pollingId, qrCode, qrMutation])

  const handleCreateInstance = () => {
    createMutation.mutate({ department: 'الإشعارات الرئيسية' })
  }

  const handleShowQr = (instanceId: number) => {
    qrMutation.mutate(instanceId)
    setPollingId(instanceId)
  }

  const canProceed = stats.whatsapp_connected || !!connectedInstance

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="ws-alert ws-alert--info ws-alert--boxed">
        <i className="bi bi-whatsapp" />
        <div>
          <h4 className="font-semibold">ربط رقم الواتساب</h4>
          <p className="text-[12px] font-normal">
            سيتم استخدام هذا الرقم لإرسال إشعارات الغياب والتأخير لأولياء الأمور تلقائياً.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <span className="ws-spinner" />
        </div>
      )}

      {/* Connected Instance */}
      {connectedInstance && (
        <div className="ws-alert ws-alert--success ws-alert--boxed">
          <i className="bi bi-check-lg text-[15px]" />
          <div className="flex-1">
            <p className="font-semibold">تم ربط الواتساب بنجاح</p>
            <p className="text-[12px] font-normal">
              الرقم: <span className="font-mono">{connectedInstance.phone_number}</span>
            </p>
          </div>
          <span className="ws-pulse" />
        </div>
      )}

      {/* QR Code Display */}
      {qrCode && !connectedInstance && (
        <div className="space-y-3 text-center">
          <div
            className="rounded-[10px] border p-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}
          >
            <p className="mb-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              امسح الرمز باستخدام تطبيق واتساب على هاتفك
            </p>
            <div
              className="relative mx-auto w-fit rounded-lg border p-3"
              style={{ background: '#fff', borderColor: 'var(--color-border)' }}
            >
              <img
                src={qrCode}
                alt="QR Code"
                className={`h-56 w-56 transition-opacity ${qrCountdown <= 5 ? 'opacity-40' : ''}`}
              />
              {qrMutation.isPending && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--color-surface) 82%, transparent)' }}
                >
                  <span className="ws-spinner" />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="ws-chip ws-chip--amber">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                في انتظار المسح...
              </span>
              <span className={`ws-chip font-mono ${qrCountdown <= 10 ? 'ws-chip--red' : ''}`}>
                {qrCountdown > 0
                  ? `تجديد تلقائي خلال ${qrCountdown} ث`
                  : 'جاري التجديد...'}
              </span>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز
          </p>
        </div>
      )}

      {/* No Instance - Create Button */}
      {!connectedInstance && !connectingInstance && !qrCode && !isLoading && (
        <div
          className="rounded-[10px] border p-5 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}
        >
          <div
            className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[10px] border"
            style={{
              background: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <i className="bi bi-whatsapp text-2xl" />
          </div>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            لم يتم ربط أي رقم واتساب بعد
          </p>
          <button
            type="button"
            onClick={handleCreateInstance}
            disabled={createMutation.isPending}
            className="ws-btn ws-btn--primary"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <i className="bi bi-plus-lg" />
                ربط رقم واتساب
              </>
            )}
          </button>
        </div>
      )}

      {/* Connecting Instance - Show QR */}
      {connectingInstance && !qrCode && !connectedInstance && (
        <div
          className="rounded-[10px] border p-5 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}
        >
          <p className="mb-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            يوجد رقم في انتظار الربط
          </p>
          <button
            type="button"
            onClick={() => handleShowQr(connectingInstance.id)}
            disabled={qrMutation.isPending}
            className="ws-btn ws-btn--primary"
          >
            {qrMutation.isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                جاري التحميل...
              </>
            ) : (
              <>
                <i className="bi bi-qr-code" />
                عرض رمز QR
              </>
            )}
          </button>
        </div>
      )}

      {/* Next Button */}
      <div
        className="flex items-center justify-between border-t pt-4"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        {/* تخطي — الخطوات الإلزامية تمر بتأكيد من المعالج */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-[13px] underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي — سأربطه لاحقاً'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          <span>يجب ربط رقم واتساب للمتابعة</span>
        </div>
      )}
    </div>
  )
}
