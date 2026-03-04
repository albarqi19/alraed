import { useRef, useState } from 'react'
import {
  useUploadRemoteAttendanceMutation,
  useRemoteAttendanceReport,
} from '../remote-attendance/hooks'
import type { RemoteParticipant } from '../remote-attendance/types'

interface Props {
  sessionId: number
  isUploaded: boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} س`)
  if (m > 0) parts.push(`${m} د`)
  if (s > 0 || parts.length === 0) parts.push(`${s} ث`)
  return parts.join(' ')
}

export function RemoteSessionUpload({ sessionId, isUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadRemoteAttendanceMutation(sessionId)
  const reportQuery = useRemoteAttendanceReport(
    isUploaded || uploadMutation.isSuccess ? sessionId : undefined,
  )

  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = (file: File | null) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      alert('يرجى اختيار ملف CSV فقط')
      return
    }
    uploadMutation.mutate(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file)
  }

  // حالة: تم الرفع بنجاح - عرض التقرير
  if (isUploaded || uploadMutation.isSuccess) {
    const report = reportQuery.data

    if (reportQuery.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <i className="bi bi-hourglass-split text-3xl animate-spin" />
          <p className="mt-3 text-sm">جاري تحميل التقرير...</p>
        </div>
      )
    }

    if (!report) return null

    const attendees = report.participants.filter(
      (p) => p.role === 'attendee',
    )

    return (
      <div className="space-y-4">
        {/* بانر النجاح */}
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <i className="bi bi-check-circle-fill text-xl" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">
              تم رفع تقرير الحضور بنجاح
            </p>
            <p className="text-sm text-emerald-600">
              {report.upload.original_filename}
            </p>
          </div>
        </div>

        {/* معلومات الاجتماع */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            <i className="bi bi-camera-video ml-1 text-purple-500" />
            معلومات الاجتماع
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {report.upload.meeting_title && (
              <div className="col-span-2">
                <span className="text-slate-400">العنوان: </span>
                <span className="font-medium text-slate-700">
                  {report.upload.meeting_title}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-400">المدة: </span>
              <span className="font-medium text-slate-700">
                {report.upload.meeting_duration ?? '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">المشاركون: </span>
              <span className="font-medium text-slate-700">
                {report.stats.total_attendees}
              </span>
            </div>
            {report.stats.organizer && (
              <div className="col-span-2">
                <span className="text-slate-400">المنظم: </span>
                <span className="font-medium text-slate-700">
                  {report.stats.organizer}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-purple-50 p-3 text-center">
            <p className="text-lg font-bold text-purple-700">
              {report.stats.total_attendees}
            </p>
            <p className="text-xs text-purple-500">مشارك</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-center">
            <p className="text-lg font-bold text-blue-700">
              {formatDuration(report.stats.avg_duration_seconds)}
            </p>
            <p className="text-xs text-blue-500">متوسط المدة</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-lg font-bold text-emerald-700">
              {report.upload.meeting_duration ?? '-'}
            </p>
            <p className="text-xs text-emerald-500">مدة الاجتماع</p>
          </div>
        </div>

        {/* جدول المشاركين */}
        <div className="rounded-2xl border border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-700">
              <i className="bi bi-people ml-1 text-purple-500" />
              المشاركون ({attendees.length})
            </h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-right font-medium">الاسم</th>
                  <th className="px-4 py-2 text-right font-medium">المدة</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                    أول دخول
                  </th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                    آخر خروج
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendees.map((p, i) => (
                  <ParticipantRow key={i} participant={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // حالة: أثناء الرفع
  if (uploadMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 py-16">
        <i className="bi bi-hourglass-split text-4xl text-purple-400 animate-spin" />
        <p className="mt-4 text-sm font-medium text-purple-600">
          جاري رفع ومعالجة الملف...
        </p>
        <p className="mt-1 text-xs text-purple-400">
          قد يستغرق بضع ثوانٍ
        </p>
      </div>
    )
  }

  // حالة: فشل الرفع
  if (uploadMutation.isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4">
          <i className="bi bi-exclamation-triangle-fill text-xl text-red-500" />
          <div>
            <p className="font-semibold text-red-800">فشل في معالجة الملف</p>
            <p className="text-sm text-red-600">
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : 'خطأ غير معروف'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            uploadMutation.reset()
            fileInputRef.current?.click()
          }}
          className="w-full rounded-xl bg-purple-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
        >
          <i className="bi bi-arrow-repeat ml-1" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  // حالة: قبل الرفع
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <i className="bi bi-cloud-arrow-up text-3xl" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          الحصة عن بعد - رفع تقرير الحضور
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          قم بتنزيل تقرير الحضور من Microsoft Teams ثم ارفعه هنا
        </p>
      </div>

      {/* خطوات */}
      <div className="rounded-2xl bg-slate-50 p-4">
        <h4 className="mb-2 text-xs font-semibold text-slate-500">
          كيفية تنزيل التقرير من التيمز:
        </h4>
        <ol className="space-y-1.5 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
              1
            </span>
            افتح الاجتماع في Microsoft Teams
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
              2
            </span>
            اضغط على "المشاركون" ثم "تنزيل قائمة الحضور"
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
              3
            </span>
            سيتم تنزيل ملف CSV - ارفعه هنا
          </li>
        </ol>
      </div>

      {/* منطقة الرفع */}
      <div
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-purple-400 bg-purple-50'
            : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <i className="bi bi-file-earmark-spreadsheet text-4xl text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">
          اسحب ملف CSV هنا أو
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
        >
          <i className="bi bi-upload ml-1" /> اختيار الملف
        </button>
        <p className="mt-2 text-xs text-slate-400">CSV فقط - حتى 5 MB</p>
      </div>
    </div>
  )
}

function ParticipantRow({ participant }: { participant: RemoteParticipant }) {
  const formatTime = (dt: string | null) => {
    if (!dt) return '-'
    return new Date(dt).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-700">{participant.name}</div>
        {participant.join_leave_count > 1 && (
          <span className="text-xs text-amber-500">
            {participant.join_leave_count} مرات دخول
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-slate-600">
        {participant.duration_text ?? formatDuration(participant.total_duration_seconds)}
      </td>
      <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
        {formatTime(participant.first_join_time)}
      </td>
      <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
        {formatTime(participant.last_leave_time)}
      </td>
    </tr>
  )
}
