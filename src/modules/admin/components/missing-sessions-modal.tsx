import { useEffect } from 'react'
import { useMissingSessionsQuery } from '../hooks'

interface MissingSessionData {
  class_session_id: number | null
  grade: string
  class_name: string
  subject_name: string
  teacher_name: string
  teacher_id: number | null
  period_number: number | null
  start_time: string
  end_time: string
  time_since_start: string
  minutes_since_start: number
  status: string
  is_current: boolean
  student_count: number | null
  note?: string
}

interface MissingSessionsModalProps {
  open: boolean
  onClose: () => void
}

export function MissingSessionsModal({ open, onClose }: MissingSessionsModalProps) {
  const { data, isLoading, refetch } = useMissingSessionsQuery({ enabled: open })
  const stats = data?.data
  const missingSessions = stats?.missing_sessions ?? []

  // Debug: طباعة البيانات
  useEffect(() => {
    if (data) {
      console.log('🔍 Missing Sessions Data:', data)
      console.log('✅ data.success:', data.success)
      console.log('📊 data.data:', data.data)
      console.log('📋 missing_sessions length:', data.data?.missing_sessions?.length)
    }
  }, [data])

  // تحديث البيانات كل دقيقة
  useEffect(() => {
    if (!open) return
    
    const interval = setInterval(() => {
      refetch()
    }, 60000) // كل دقيقة

    return () => clearInterval(interval)
  }, [open, refetch])

  if (!open) return null

  // Debug logs
  console.log('🔎 Modal Debug Info:')
  console.log('  - isLoading:', isLoading)
  console.log('  - data:', data)
  console.log('  - data?.success:', data?.success)
  console.log('  - data?.data:', data?.data)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'very_late':
        return 'bg-red-50 border-red-200'
      case 'late':
        return 'bg-orange-50 border-orange-200'
      case 'slightly_late':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'very_late':
        return '🔴'
      case 'late':
        return '🟠'
      case 'slightly_late':
        return '🟡'
      default:
        return '⚪'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold text-slate-900">الفصول التي لم ترسل التحضير</h2>
                <p className="text-sm text-muted">متابعة الحصص المتأخرة والمعلمين المسؤولين</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100"
              aria-label="إغلاق"
            >
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            </div>
          ) : data?.success && stats ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 text-right shadow-sm">
                  <div className="flex flex-row-reverse items-center justify-between">
                    <div className="text-3xl">🟢</div>
                    <div>
                      <p className="text-xs font-semibold text-green-700">تم الإرسال</p>
                      <p className="mt-1 text-3xl font-bold text-green-600">{stats.submitted}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 text-right shadow-sm">
                  <div className="flex flex-row-reverse items-center justify-between">
                    <div className="text-3xl">🔴</div>
                    <div>
                      <p className="text-xs font-semibold text-red-700">لم يُرسل</p>
                      <p className="mt-1 text-3xl font-bold text-red-600">{stats.missing}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Sessions List */}
              {missingSessions.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 text-right">
                    الفصول المتأخرة ({missingSessions.length})
                  </h3>
                  <div className="space-y-2">
                    {missingSessions.map((session: MissingSessionData) => (
                      <div
                        key={session.class_session_id ?? `${session.teacher_id ?? 'teacher'}-${session.start_time}`}
                        className={`rounded-3xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-lg ${getStatusColor(session.status)}`}
                      >
                        <div className="space-y-2.5">
                          {/* العنوان والحالة */}
                          <div className="flex flex-row-reverse items-start justify-between gap-2">
                            <span className="text-xl leading-none">{getStatusIcon(session.status)}</span>
                            <div className="space-y-1.5 text-right">
                              <div className="flex flex-row-reverse items-center gap-2">
                                <h4 className="text-base font-semibold text-slate-900">
                                  {session.grade} {session.class_name} - {session.subject_name}
                                </h4>
                                {session.is_current && (
                                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                                    الآن
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-row-reverse flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                {session.period_number && (
                                  <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 font-medium text-slate-600">
                                    الحصة {session.period_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* تفاصيل المعلم والوقت */}
                          <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                            <span className="flex flex-row-reverse items-center gap-1.5">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{session.start_time} - {session.end_time}</span>
                            </span>
                            <span className="flex flex-row-reverse items-center gap-1.5">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>المعلم: {session.teacher_name}</span>
                            </span>
                          </div>

                          {/* الوقت منذ بداية الحصة */}
                          {session.minutes_since_start > 0 && session.time_since_start !== 'لم يُرسل اليوم' && (
                            <div className="flex flex-row-reverse">
                              <span className={`text-xs font-semibold ${
                                session.status === 'very_late' ? 'text-red-600' :
                                session.status === 'late' ? 'text-orange-600' :
                                session.status === 'slightly_late' ? 'text-yellow-600' :
                                'text-slate-500'
                              }`}>
                                لم يُرسل منذ: {session.time_since_start}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
                  <div className="mb-3 text-4xl">✅</div>
                  <p className="font-semibold text-green-900">ممتاز!</p>
                  <p className="mt-1 text-sm text-green-700">
                    جميع المعلمين أرسلوا التحضير في الوقت المحدد
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              آخر تحديث: {stats?.timestamp ? new Date(stats.timestamp).toLocaleTimeString('ar-SA') : '—'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="button-secondary text-sm"
                disabled={isLoading}
              >
                🔄 تحديث
              </button>
              <button
                type="button"
                onClick={onClose}
                className="button-primary text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

