import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { MessageCircle, MailCheck, MailX, Reply } from 'lucide-react'
import type { TeacherMessagesResponse } from '../types'

const TEMPLATE_LABELS: Record<string, string> = {
  academic_weakness: 'ضعف أكاديمي',
  homework_incomplete: 'واجبات ناقصة',
  appreciation: 'تقدير وشكر',
  custom: 'رسالة مخصصة',
  behavior_notice: 'إشعار سلوكي',
  absence_notice: 'إشعار غياب',
}

interface MessagesSectionProps {
  data: TeacherMessagesResponse
}

export function MessagesSection({ data }: MessagesSectionProps) {
  if (data.messages.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="لا توجد رسائل"
        description="لم يرسل المعلم أي رسالة لأولياء الأمور في الفترة المحددة"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{data.summary.total_sent}</p>
          <p className="text-xs text-slate-500">إجمالي الرسائل</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{data.summary.delivered}</p>
          <p className="text-xs text-slate-500">تم الإرسال</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{data.summary.failed}</p>
          <p className="text-xs text-slate-500">فشل الإرسال</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{data.summary.with_replies}</p>
          <p className="text-xs text-slate-500">تلقت ردوداً</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{data.summary.unread_replies}</p>
          <p className="text-xs text-slate-500">ردود غير مقروءة</p>
        </div>
      </div>

      {/* قائمة الرسائل */}
      <div className="space-y-2">
        {data.messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                    {TEMPLATE_LABELS[msg.template_key] ?? msg.template_title}
                  </Badge>
                  {msg.status === 'sent' ? (
                    <MailCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : msg.status === 'failed' ? (
                    <MailX className="h-3.5 w-3.5 text-rose-500" />
                  ) : null}
                  <span className="text-xs text-slate-400">
                    {msg.student_name && `${msg.student_name}`}
                    {msg.parent_name && ` · ${msg.parent_name}`}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{msg.message_content}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {msg.created_at ? new Date(msg.created_at).toLocaleDateString('ar-SA') : ''}
              </span>
            </div>

            {msg.reply && (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Reply className="h-3 w-3" />
                  رد ولي الأمر
                  {!msg.reply.is_read && (
                    <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-white">جديد</span>
                  )}
                </div>
                <p className="text-sm text-slate-600">{msg.reply.reply_text}</p>
                {msg.reply.replied_at && (
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(msg.reply.replied_at).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
