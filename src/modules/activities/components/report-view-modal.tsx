import { useState, useMemo } from 'react'
import { getActivityReportImageUrl, getActivityReportPrintUrl } from '@/services/api/client'
import type { ReportStatus } from '../types'

interface ReportData {
  id: number
  activity_id?: number
  execution_location: string | null
  achieved_objectives: string | null
  students_count: number
  images: string[]
  status: ReportStatus
  rejection_reason: string | null
  teacher?: { id: number; name: string }
  created_at: string
  reviewed_at?: string | null
}

interface Props {
  report: ReportData
  activityId: number
  activityTitle: string
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  isApproving?: boolean
  isRejecting?: boolean
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; bg: string; icon: string }> = {
  pending: { label: 'تحت المراجعة', bg: 'bg-amber-100 text-amber-800', icon: 'bi-clock' },
  approved: { label: 'معتمد', bg: 'bg-emerald-100 text-emerald-800', icon: 'bi-check-circle' },
  rejected: { label: 'مرفوض', bg: 'bg-red-100 text-red-800', icon: 'bi-x-circle' },
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { 
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function ReportViewModal({
  report,
  activityId,
  activityTitle,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: Props) {
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null)
  const statusConfig = STATUS_CONFIG[report.status]
  
  // تحويل روابط الصور إلى روابط كاملة عبر API
  const fullImageUrls = useMemo(() => {
    if (!report.images || report.images.length === 0) return []
    return report.images.map((_, index) => 
      getActivityReportImageUrl(activityId, report.id, index, false)
    )
  }, [report.images, activityId, report.id])

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div 
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <header 
            className="px-6 py-4 text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-header) 0%, var(--color-primary) 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">تقرير النشاط</h2>
                <p className="text-sm opacity-90">{activityTitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-white/20 transition"
              >
                <i className="bi bi-x-lg text-xl" />
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Teacher & Status */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {report.teacher?.name?.charAt(0) || '؟'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{report.teacher?.name || 'معلم'}</p>
                  <p className="text-xs text-muted">
                    <i className="bi bi-calendar3 ml-1" />
                    {formatDate(report.created_at)}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${statusConfig.bg}`}>
                <i className={`bi ${statusConfig.icon}`} />
                {statusConfig.label}
              </span>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* مكان التنفيذ */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <i className="bi bi-geo-alt" />
                  <span className="text-xs font-medium">مكان التنفيذ</span>
                </div>
                <p className="text-slate-800 font-medium">{report.execution_location || '—'}</p>
              </div>

              {/* عدد الطلاب */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <i className="bi bi-people" />
                  <span className="text-xs font-medium">عدد الطلاب المشاركين</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                  {report.students_count}
                </p>
              </div>
            </div>

            {/* الأهداف المحققة */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <i className="bi bi-bullseye" />
                <span className="text-xs font-medium">الأهداف المحققة</span>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {report.achieved_objectives || 'لم يتم تحديد أهداف'}
              </p>
            </div>

            {/* سبب الرفض */}
            {report.rejection_reason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <i className="bi bi-exclamation-triangle" />
                  <span className="text-xs font-medium">سبب الرفض</span>
                </div>
                <p className="text-red-700">{report.rejection_reason}</p>
              </div>
            )}

            {/* الصور */}
            {fullImageUrls.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <i className="bi bi-images" />
                  <span className="text-xs font-medium">صور التوثيق ({fullImageUrls.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fullImageUrls.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setViewingImageIndex(index)}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[var(--color-primary)] transition group relative"
                    >
                      <img
                        src={img}
                        alt={`صورة ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <i className="bi bi-zoom-in text-white text-2xl opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* معلومات المراجعة */}
            {report.reviewed_at && (
              <div className="text-center text-xs text-muted pt-2 border-t">
                <i className="bi bi-check2-all ml-1" />
                تمت المراجعة في {formatDate(report.reviewed_at)}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <footer className="border-t bg-slate-50 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              {/* زر ملف التقرير - يظهر فقط عند الاعتماد */}
              {report.status === 'approved' && (
                <a
                  href={getActivityReportPrintUrl(activityId, report.id, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <i className="bi bi-file-earmark-pdf" />
                  ملف التقرير
                </a>
              )}
              
              {/* أزرار الاعتماد/الرفض */}
              {report.status === 'pending' && (onApprove || onReject) ? (
                <div className="flex items-center gap-3 mr-auto">
                  {onReject && (
                    <button
                      type="button"
                      onClick={onReject}
                      disabled={isRejecting}
                      className="rounded-full border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      {isRejecting ? (
                        <i className="bi bi-arrow-repeat animate-spin" />
                      ) : (
                        <>
                          <i className="bi bi-x-circle ml-2" />
                          رفض التقرير
                        </>
                      )}
                    </button>
                  )}
                  {onApprove && (
                    <button
                      type="button"
                      onClick={onApprove}
                      disabled={isApproving}
                      className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {isApproving ? (
                        <i className="bi bi-arrow-repeat animate-spin" />
                      ) : (
                        <>
                          <i className="bi bi-check-circle ml-2" />
                          اعتماد التقرير
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : report.status !== 'approved' && (
                <div /> // placeholder للمحاذاة
              )}
            </div>
          </footer>
        </div>
      </div>

      {/* Full Image Viewer */}
      {viewingImageIndex !== null && fullImageUrls.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white/80 text-sm">
              صورة {viewingImageIndex + 1} من {fullImageUrls.length}
            </span>
            <button
              type="button"
              onClick={() => setViewingImageIndex(null)}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
            >
              <i className="bi bi-x-lg text-xl" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Prev Button */}
            {viewingImageIndex > 0 && (
              <button
                type="button"
                onClick={() => setViewingImageIndex(viewingImageIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition"
              >
                <i className="bi bi-chevron-left text-2xl" />
              </button>
            )}

            <img
              src={fullImageUrls[viewingImageIndex]}
              alt={`صورة ${viewingImageIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg"
            />

            {/* Next Button */}
            {viewingImageIndex < fullImageUrls.length - 1 && (
              <button
                type="button"
                onClick={() => setViewingImageIndex(viewingImageIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition"
              >
                <i className="bi bi-chevron-right text-2xl" />
              </button>
            )}
          </div>

          {/* Thumbnails */}
          {fullImageUrls.length > 1 && (
            <div className="flex justify-center gap-2 p-4">
              {fullImageUrls.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setViewingImageIndex(index)}
                  className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition ${
                    index === viewingImageIndex
                      ? 'border-white'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
