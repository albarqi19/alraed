import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchWhatsappInstances,
  createWhatsappInstance,
  getWhatsappInstanceQrCode,
  checkWhatsappInstanceStatus,
  reconnectWhatsappInstance,
  disconnectWhatsappInstance,
  deleteWhatsappInstance,
  testWhatsappInstance,
} from '../api'
import type { WhatsappInstance } from '../types'
import { MessageSquare, Plus, QrCode, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, LogOut } from 'lucide-react'
import { useToast } from '@/shared/feedback/use-toast'

export function WhatsappInstancesManager() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [pollingInstanceIds, setPollingInstanceIds] = useState<Set<number>>(new Set())

  // جلب Instances
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['admin', 'whatsapp', 'instances'],
    queryFn: fetchWhatsappInstances,
    refetchInterval: 10000, // تحديث كل 10 ثوانٍ لمعرفة الحالة بسرعة
  })

  // إنشاء Instance جديد
  const createMutation = useMutation({
    mutationFn: createWhatsappInstance,
    onSuccess: (newInstance) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      setShowAddModal(false)
      setNewDepartment('')
      toast({ title: 'تم إنشاء رقم واتساب جديد', type: 'success' })

      // إذا كان QR Code متوفر، عرضه مباشرة
      if (newInstance.qr_code) {
        setSelectedQrCode(newInstance.qr_code)
      }

      // بدء polling لحالة Instance الجديد
      if (newInstance.status === 'connecting') {
        startPolling(newInstance.id)
      }
    },
    onError: (error: any) => {
      toast({ title: error?.message || 'فشل إنشاء رقم واتساب', type: 'error' })
    },
  })

  // جلب QR Code
  const qrMutation = useMutation({
    mutationFn: getWhatsappInstanceQrCode,
    onSuccess: (data) => {
      setSelectedQrCode(data.qr_code)
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
    },
    onError: (error: any) => {
      toast({ title: error?.message || 'فشل جلب رمز QR', type: 'error' })
    },
  })

  // فحص الحالة
  const statusMutation = useMutation({
    mutationFn: checkWhatsappInstanceStatus,
    onSuccess: (instance) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })

      if (instance.status === 'connected') {
        toast({ title: `تم الاتصال بنجاح! الرقم: ${instance.phone_number}`, type: 'success' })
        // لا نوقف polling - نستمر في المراقبة حتى بعد الاتصال
        setSelectedQrCode(null) // إغلاق modal تلقائياً
        startPolling(instance.id) // التأكد من بدء المراقبة
      } else if (instance.status === 'connecting') {
        // إغلاق QR modal إذا كان Instance في حالة connecting
        setSelectedQrCode(null)
        startPolling(instance.id) // بدء المراقبة
      }
    },
  })

  // إعادة الاتصال
  const reconnectMutation = useMutation({
    mutationFn: reconnectWhatsappInstance,
    onSuccess: (instance) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      toast({ title: 'جاري إعادة الاتصال...', type: 'info' })
      startPolling(instance.id)
    },
  })

  // قطع الاتصال
  const disconnectMutation = useMutation({
    mutationFn: disconnectWhatsappInstance,
    onSuccess: (instance) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      toast({ title: 'تم قطع الاتصال بنجاح', type: 'success' })
      stopPolling(instance.id)
    },
    onError: (error: any) => {
      toast({ title: error?.message || 'فشل قطع الاتصال', type: 'error' })
    },
  })

  // حذف Instance
  const deleteMutation = useMutation({
    mutationFn: deleteWhatsappInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      toast({ title: 'تم حذف رقم الواتساب', type: 'success' })
    },
  })

  // اختبار الإرسال
  const testMutation = useMutation({
    mutationFn: ({ instanceId, phoneNumber }: { instanceId: number; phoneNumber: string }) =>
      testWhatsappInstance(instanceId, phoneNumber),
    onSuccess: (data) => {
      // تحديث البيانات فوراً بعد الإرسال
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      const message = data?.message || 'تم إرسال رسالة الاختبار بنجاح'
      toast({ title: message, type: 'success' })
    },
    onError: (error: any) => {
      // تحديث البيانات حتى عند الفشل لاكتشاف التغيير في الحالة
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp', 'instances'] })
      const errorMessage = error?.response?.data?.message || error?.message || 'فشل إرسال رسالة الاختبار'
      toast({ title: errorMessage, type: 'error' })
    },
  })

  // Polling تلقائي للـ instances قيد الاتصال
  const startPolling = (instanceId: number) => {
    setPollingInstanceIds(prev => new Set(prev).add(instanceId))
  }

  const stopPolling = (instanceId: number) => {
    setPollingInstanceIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(instanceId)
      return newSet
    })
  }

  useEffect(() => {
    if (pollingInstanceIds.size === 0) return

    const interval = setInterval(() => {
      pollingInstanceIds.forEach(id => {
        // استخدام status check مباشر بدون mutation للتقليل من العبء
        checkWhatsappInstanceStatus(id)
          .then(instance => {
            // حفظ الحالة السابقة
            const oldInstances = queryClient.getQueryData<WhatsappInstance[]>(['admin', 'whatsapp', 'instances'])
            const oldInstance = oldInstances?.find(i => i.id === instance.id)

            queryClient.setQueryData(
              ['admin', 'whatsapp', 'instances'],
              (old: WhatsappInstance[] | undefined) => {
                if (!old) return old
                return old.map(i => i.id === instance.id ? instance : i)
              }
            )

            // عرض toast فقط عند تغيير الحالة
            if (instance.status === 'connected' && oldInstance?.status !== 'connected') {
              // اتصل للتو (كان connecting أو disconnected)
              toast({ title: `تم الاتصال بنجاح! الرقم: ${instance.phone_number}`, type: 'success' })
              setSelectedQrCode(null) // إغلاق QR modal عند الاتصال
              // نستمر في المراقبة حتى بعد الاتصال
            } else if (instance.status === 'disconnected' && oldInstance?.status === 'connected') {
              // إذا كان متصل سابقاً والآن مفصول
              toast({
                title: `⚠️ تم قطع الاتصال: ${instance.instance_name}`,
                type: 'warning'
              })
            }
          })
          .catch(err => {
            console.error('فشل فحص الحالة:', err)
          })
      })
    }, 3000) // فحص كل 3 ثوانٍ للتحديث السريع بعد scan QR

    return () => clearInterval(interval)
  }, [Array.from(pollingInstanceIds).join(',')])

  // بدء polling تلقائي لجميع instances للكشف الفوري عن أي تغيير
  useEffect(() => {
    // 🔥 مراقبة **جميع** instances حتى disconnected لاكتشاف الاتصال التلقائي
    // هذا يحل مشكلة: Instance متصل في Evolution لكن يظهر disconnected في الواجهة
    const allInstanceIds = instances.map(i => i.id)

    // إضافة instances الجديدة للـ polling
    allInstanceIds.forEach(id => {
      if (!pollingInstanceIds.has(id)) {
        startPolling(id)
      }
    })

    // إزالة instances المحذوفة فقط من polling
    pollingInstanceIds.forEach(id => {
      if (!allInstanceIds.includes(id)) {
        stopPolling(id)
      }
    })
  }, [instances])

  const handleCreate = () => {
    createMutation.mutate({ department: newDepartment.trim() || null })
  }

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الرقم؟')) {
      deleteMutation.mutate(id)
      stopPolling(id)
    }
  }

  const handleShowQr = (id: number) => {
    qrMutation.mutate(id)
  }

  const handleCheckStatus = (id: number) => {
    statusMutation.mutate(id)
  }

  const handleReconnect = (id: number) => {
    reconnectMutation.mutate(id)
  }

  const handleDisconnect = (id: number) => {
    if (confirm('هل أنت متأكد من قطع اتصال هذا الرقم؟')) {
      disconnectMutation.mutate(id)
    }
  }

  const handleTest = (instance: WhatsappInstance) => {
    const phoneNumber = prompt('أدخل رقم الهاتف للاختبار (مثل: 966501234567):')
    if (phoneNumber) {
      testMutation.mutate({ instanceId: instance.id, phoneNumber })
    }
  }

  // اختبار إرسال رسالة عبر Queue (مخفي مؤقتاً)
  /*
  const handleTestQueue = (instance: WhatsappInstance) => {
    const phoneNumber = prompt('🧪 اختبار Queue - أدخل رقم الهاتف (مثل: 966501234567):')
    if (phoneNumber) {
      testQueueMutation.mutate({ instanceId: instance.id, phoneNumber })
    }
  }
  */

  const getStatusBadge = (status: WhatsappInstance['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            متصل
          </span>
        )
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري الاتصال
          </span>
        )
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <XCircle className="h-4 w-4" />
            غير متصل
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">إدارة أرقام الواتساب</h3>
          <p className="text-sm text-muted">أضف وأدر أرقام واتساب متعددة لمدرستك</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (instances.length > 0) {
              setShowLimitModal(true)
            } else {
              setShowAddModal(true)
            }
          }}
          className="button-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة رقم جديد
        </button>
      </div>

      {/* Instances Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instances.length === 0 ? (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-sm text-muted">لا توجد أرقام واتساب حالياً</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="button-secondary mt-4"
            >
              إضافة رقم الآن
            </button>
          </div>
        ) : (
          instances.map((instance) => (
            <div key={instance.id} className="glass-card space-y-4 p-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">{instance.instance_name}</h4>
                  {instance.department && (
                    <p className="text-xs text-muted">{instance.department}</p>
                  )}
                </div>
                {getStatusBadge(instance.status)}
              </div>

              {/* Phone Number */}
              {instance.phone_number && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{instance.phone_number}</span>
                </div>
              )}

              {/* Last Connected */}
              {instance.last_connected_at && (
                <p className="text-xs text-muted">
                  آخر اتصال: {new Date(instance.last_connected_at).toLocaleString('ar-SA-u-nu-latn')}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {instance.status === 'connected' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTest(instance)}
                      disabled={testMutation.isPending}
                      className="button-primary flex-1 text-xs"
                    >
                      <MessageSquare className="h-3 w-3" />
                      اختبار
                    </button>
                    {/* زر اختبار Queue - مخفي مؤقتاً
                    <button
                      type="button"
                      onClick={() => handleTestQueue(instance)}
                      disabled={testQueueMutation.isPending}
                      className="button-secondary flex-1 text-xs text-blue-600"
                    >
                      🧪 اختبار Queue
                    </button>
                    */}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(instance.id)}
                      disabled={disconnectMutation.isPending}
                      className="button-secondary text-xs text-amber-600 hover:bg-amber-50"
                    >
                      <LogOut className="h-3 w-3" />
                      قطع الاتصال
                    </button>
                  </>
                )}

                {instance.status === 'disconnected' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleShowQr(instance.id)}
                      disabled={qrMutation.isPending}
                      className="button-secondary flex-1 text-xs"
                    >
                      <QrCode className="h-3 w-3" />
                      عرض QR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReconnect(instance.id)}
                      disabled={reconnectMutation.isPending}
                      className="button-secondary flex-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      إعادة الاتصال
                    </button>
                  </>
                )}

                {instance.status === 'connecting' && (
                  <button
                    type="button"
                    onClick={() => handleCheckStatus(instance.id)}
                    disabled={statusMutation.isPending}
                    className="button-secondary flex-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    تحديث الحالة
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(instance.id)}
                  disabled={deleteMutation.isPending}
                  className="button-secondary text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3" />
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-card w-full max-w-md space-y-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900">إضافة رقم واتساب جديد</h3>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">اسم القسم</label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="input-field w-full"
              >
                <option value="">اختر القسم</option>
                <option value="الرئيسي">الرئيسي</option>
                <option value="الاستقبال">الاستقبال</option>
                <option value="المحاسبة">المحاسبة</option>
                <option value="الإدارة">الإدارة</option>
                <option value="التوجيه">التوجيه</option>
                <option value="المتابعة">المتابعة</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setNewDepartment('')
                }}
                className="button-secondary flex-1"
                disabled={createMutation.isPending}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newDepartment}
                className="button-primary flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-card w-full max-w-md space-y-4 p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900">امسح رمز QR للربط</h3>

            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4">
                <img
                  src={selectedQrCode}
                  alt="QR Code"
                  className="h-64 w-64 object-contain"
                />
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted">
              <p>1. افتح واتساب على هاتفك</p>
              <p>2. اذهب إلى الإعدادات ← الأجهزة المرتبطة</p>
              <p>3. اضغط "ربط جهاز" وامسح الكود</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQrCode(null)}
              className="button-primary w-full"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Limit Modal - التنبيه عند محاولة إضافة رقم ثانٍ */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-card w-full max-w-md space-y-4 p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">لا يمكن إضافة رقم آخر حالياً</h3>
            <p className="text-sm text-slate-600">إضافة أرقام متعددة ستُتاح قريباً.</p>
            <button
              type="button"
              onClick={() => setShowLimitModal(false)}
              className="button-primary w-full"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
