import { useState } from 'react'
import { useActivityDetails, useApproveReport, useRejectReport } from '../hooks'
import { ReportViewModal } from './report-view-modal'
import type { ReportStatus } from '../types'

interface Props {
  activityId: number
  onClose: () => void
}

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'تحت المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

export function ActivityDetailsModal({ activityId, onClose }: Props) {
  const { data, isLoading, error } = useActivityDetails(activityId)
  const approveReport = useApproveReport()
  const rejectReport = useRejectReport()
  
  const [rejectModalOpen, setRejectModalOpen] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedReport, setSelectedReport] = useState<{
    id: number
    execution_location: string | null
    achieved_objectives: string | null
    students_count: number
    images: string[]
    status: ReportStatus
    rejection_reason: string | null
    teacher?: { id: number; name: string }
    created_at: string
    reviewed_at?: string | null
  } | null>(null)

  const handleApprove = async (reportId: number) => {
    try {
      await approveReport.mutateAsync({ activityId, reportId })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const handleReject = async () => {
    if (!rejectModalOpen || !rejectionReason.trim()) {
      alert('يرجى كتابة سبب الرفض')
      return
    }

    try {
      await rejectReport.mutateAsync({
        activityId,
        reportId: rejectModalOpen,
        rejectionReason: rejectionReason.trim(),
      })
      setRejectModalOpen(null)
      setRejectionReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8">
          <div className="flex items-center gap-3">
            <i className="bi bi-arrow-repeat animate-spin text-2xl text-indigo-600" />
            <span className="text-slate-600">جاري التحميل...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8 text-center">
          <i className="bi bi-exclamation-triangle text-4xl text-red-500 mb-3" />
          <p className="text-slate-600">{error instanceof Error ? error.message : 'حدث خطأ'}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-full bg-slate-100 px-6 py-2 text-sm font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  const { activity, target_teachers, stats } = data

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{activity.title}</h2>
              <p className="text-sm text-muted">
                {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <i className="bi bi-x-lg text-xl" />
            </button>
          </header>

          <div className="p-6 space-y-6">
            {/* Activity Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {activity.description && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-700 mb-2">
                    <i className="bi bi-info-circle ml-2" />
                    الوصف
                  </h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.description}</p>
                </div>
              )}
              {activity.objectives && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-700 mb-2">
                    <i className="bi bi-bullseye ml-2" />
                    الأهداف
                  </h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.objectives}</p>
                </div>
              )}
              {activity.examples && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-700 mb-2">
                    <i className="bi bi-lightbulb ml-2" />
                    أمثلة تطبيقية
                  </h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.examples}</p>
                </div>
              )}
              {activity.pdf_file && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-700 mb-2">
                    <i className="bi bi-file-pdf ml-2" />
                    ملف مرفق
                  </h3>
                  <a
                    href={activity.pdf_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                  >
                    <i className="bi bi-download" />
                    تحميل الملف
                  </a>
                </div>
              )}
            </div>

            {/* Target Grades */}
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-3">
                <i className="bi bi-mortarboard ml-2" />
                الصفوف المستهدفة
              </h3>
              <div className="flex flex-wrap gap-2">
                {activity.target_grades?.map((grade) => (
                  <span
                    key={grade}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {grade}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{stats.total_teachers}</p>
                <p className="text-xs text-muted">إجمالي المعلمين</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats.pending_count}</p>
                <p className="text-xs text-amber-600">تحت المراجعة</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.approved_count}</p>
                <p className="text-xs text-emerald-600">معتمد</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.rejected_count}</p>
                <p className="text-xs text-red-600">مرفوض</p>
              </div>
            </div>

            {/* Teachers List */}
            <div className="rounded-xl border border-slate-200">
              <div className="border-b bg-slate-50 px-4 py-3">
                <h3 className="font-semibold text-slate-700">
                  <i className="bi bi-people ml-2" />
                  المعلمون المعنيون بالنشاط
                </h3>
              </div>
              <div className="divide-y">
                {target_teachers.length === 0 ? (
                  <div className="p-8 text-center text-muted">
                    لا يوجد معلمون مرتبطون بهذا النشاط
                  </div>
                ) : (
                  target_teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <i className="bi bi-person text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{teacher.name}</p>
                          {teacher.has_report ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_COLORS[teacher.report_status!]}`}
                            >
                              {REPORT_STATUS_LABELS[teacher.report_status!]}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">لم يسلم التقرير</span>
                          )}
                        </div>
                      </div>
                      {teacher.has_report && teacher.report_id && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const report = activity.reports?.find((r) => r.id === teacher.report_id)
                              if (report) {
                                setSelectedReport({
                                  ...report,
                                  teacher: { id: teacher.id, name: teacher.name },
                                })
                              }
                            }}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                          >
                            <i className="bi bi-eye ml-1" />
                            عرض التقرير
                          </button>
                          {teacher.report_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(teacher.report_id!)}
                                disabled={approveReport.isPending}
                                className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                              >
                                <i className="bi bi-check ml-1" />
                                قبول
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalOpen(teacher.report_id)}
                                className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                              >
                                <i className="bi bi-x ml-1" />
                                رفض
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report View Modal */}
      {selectedReport && (
        <ReportViewModal
          report={selectedReport}
          activityTitle={activity.title}
          onClose={() => setSelectedReport(null)}
          onApprove={
            selectedReport.status === 'pending'
              ? () => {
                  handleApprove(selectedReport.id)
                  setSelectedReport(null)
                }
              : undefined
          }
          onReject={
            selectedReport.status === 'pending'
              ? () => {
                  setRejectModalOpen(selectedReport.id)
                  setSelectedReport(null)
                }
              : undefined
          }
          isApproving={approveReport.isPending}
        />
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">سبب الرفض</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="input-field min-h-[120px] mb-4"
              placeholder="اكتب سبب رفض التقرير (إجباري)..."
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(null)
                  setRejectionReason('')
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectReport.isPending || !rejectionReason.trim()}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {rejectReport.isPending ? (
                  <i className="bi bi-arrow-repeat animate-spin" />
                ) : (
                  'تأكيد الرفض'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
