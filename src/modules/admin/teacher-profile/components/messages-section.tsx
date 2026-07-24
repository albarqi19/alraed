import { MessageCircle, MailCheck, MailX, Reply } from 'lucide-react'
import { TONES, ToneChip } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { StatGrid, StatMini, toneBg } from './profile-ui'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ملخص */}
      <StatGrid>
        <StatMini label="إجمالي الرسائل" value={data.summary.total_sent} tone={TONES.sky} />
        <StatMini label="تم الإرسال" value={data.summary.delivered} tone={TONES.green} />
        <StatMini label="فشل الإرسال" value={data.summary.failed} tone={TONES.red} />
        <StatMini label="تلقت ردوداً" value={data.summary.with_replies} tone={TONES.purple} />
        <StatMini label="ردود غير مقروءة" value={data.summary.unread_replies} tone={TONES.amber} />
      </StatGrid>

      {/* قائمة الرسائل */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.messages.map((msg) => (
          <div key={msg.id} className="ws-panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <ToneChip tone={TONES.sky}>
                    {TEMPLATE_LABELS[msg.template_key] ?? msg.template_title}
                  </ToneChip>
                  {msg.status === 'sent' ? (
                    <MailCheck style={{ width: 14, height: 14, color: TONES.green.tx }} />
                  ) : msg.status === 'failed' ? (
                    <MailX style={{ width: 14, height: 14, color: TONES.red.tx }} />
                  ) : null}
                  {msg.ai_review_status === 'edited' && (
                    <ToneChip tone={TONES.amber}>عُدّلت بالمراجعة الذكية</ToneChip>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                    {msg.student_name && `${msg.student_name}`}
                    {msg.parent_name && ` · ${msg.parent_name}`}
                  </span>
                </div>
                <p className="line-clamp-2" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--ws-text)' }}>
                  {msg.message_content}
                </p>
                {msg.ai_review_status === 'edited' && msg.original_content && (
                  <details
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${TONES.amber.bd}`,
                      background: toneBg(TONES.amber),
                      padding: '7px 10px',
                    }}
                  >
                    <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: TONES.amber.tx }}>
                      عرض النص الأصلي قبل المراجعة (رسالة المعلم الحقيقية)
                    </summary>
                    <p
                      className="line-through"
                      style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: TONES.amber.tx, textDecorationColor: TONES.amber.bd }}
                    >
                      {msg.original_content}
                    </p>
                    {msg.ai_review_reasons && msg.ai_review_reasons.length > 0 && (
                      <span style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {msg.ai_review_reasons.map((r, i) => (
                          <span
                            key={i}
                            style={{
                              borderRadius: 999,
                              padding: '1px 8px',
                              fontSize: 10.5,
                              background: TONES.amber.bg,
                              color: TONES.amber.tx,
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </span>
                    )}
                  </details>
                )}
              </div>
              <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>
                {msg.created_at ? new Date(msg.created_at).toLocaleDateString('ar-SA-u-nu-latn') : ''}
              </span>
            </div>

            {msg.reply && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 8,
                  border: `1px solid ${TONES.green.bd}`,
                  background: toneBg(TONES.green),
                  padding: '8px 10px',
                }}
              >
                <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: TONES.green.tx }}>
                  <Reply style={{ width: 12, height: 12 }} />
                  رد ولي الأمر
                  {!msg.reply.is_read && (
                    <span style={{ borderRadius: 999, background: TONES.amber.tx, padding: '1px 6px', fontSize: 9.5, color: '#fff' }}>
                      جديد
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--ws-text)' }}>{msg.reply.reply_text}</p>
                {msg.reply.replied_at && (
                  <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    {new Date(msg.reply.replied_at).toLocaleDateString('ar-SA-u-nu-latn')}
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
