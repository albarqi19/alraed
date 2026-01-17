import { useState, useEffect } from 'react'
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

export function WhatsappSetupStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pollingId, setPollingId] = useState<number | null>(null)

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
      }

      if (newInstance.status === 'connecting') {
        setPollingId(newInstance.id)
      }
    },
    onError: (error: Error & { message?: string }) => {
      toast({ title: error?.message || 'فشل إنشاء رقم واتساب', type: 'error' })
    },
  })

  // جلب QR Code
  const qrMutation = useMutation({
    mutationFn: getWhatsappInstanceQrCode,
    onSuccess: (data) => {
      setQrCode(data.qr_code)
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
    },
  })

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
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4">
        <h4 className="mb-2 font-semibold text-green-800">
          <i className="bi bi-whatsapp ml-2" />
          ربط رقم الواتساب
        </h4>
        <p className="text-sm text-green-700">
          سيتم استخدام هذا الرقم لإرسال إشعارات الغياب والتأخير لأولياء الأمور تلقائياً.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      )}

      {/* Connected Instance */}
      {connectedInstance && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <i className="bi bi-check-lg text-2xl" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">تم ربط الواتساب بنجاح</p>
              <p className="text-sm text-emerald-600">
                الرقم: <span className="font-mono">{connectedInstance.phone_number}</span>
              </p>
            </div>
            <div className="flex h-3 w-3 rounded-full bg-emerald-500">
              <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {qrCode && !connectedInstance && (
        <div className="space-y-4 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-4 text-sm text-slate-600">امسح الرمز باستخدام تطبيق واتساب على هاتفك</p>
            <div className="mx-auto w-fit rounded-xl border-4 border-slate-100 bg-white p-4">
              <img src={qrCode} alt="QR Code" className="h-64 w-64" />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              في انتظار المسح...
            </div>
          </div>
          <p className="text-xs text-slate-500">
            افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز
          </p>
        </div>
      )}

      {/* No Instance - Create Button */}
      {!connectedInstance && !connectingInstance && !qrCode && !isLoading && (
        <div className="text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <i className="bi bi-whatsapp text-4xl" />
          </div>
          <p className="mb-4 text-slate-600">لم يتم ربط أي رقم واتساب بعد</p>
          <button
            type="button"
            onClick={handleCreateInstance}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
        <div className="text-center">
          <p className="mb-4 text-slate-600">يوجد رقم في انتظار الربط</p>
          <button
            type="button"
            onClick={() => handleShowQr(connectingInstance.id)}
            disabled={qrMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {qrMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يجب ربط رقم واتساب للمتابعة
        </p>
      )}
    </div>
  )
}
