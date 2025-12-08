import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ReferralSettingsModal({ isOpen, onClose }: Props) {
  // إغلاق عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // منع التمرير عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 transform overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              <i className="bi bi-gear me-2 text-slate-600" />
              إعدادات الإحالات
            </h2>
            <p className="text-sm text-slate-500 mt-1">تخصيص إعدادات نظام الإحالات</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <i className="bi bi-x-lg text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <i className="bi bi-gear text-3xl text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">قريباً</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              سيتم إضافة إعدادات الإحالات قريباً، مثل:
            </p>
            <ul className="text-sm text-slate-500 mt-4 space-y-1">
              <li>• إعدادات الإشعارات التلقائية</li>
              <li>• تخصيص أنواع الإحالات</li>
              <li>• إعدادات الصلاحيات</li>
              <li>• قوالب الرسائل</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
