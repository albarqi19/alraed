import {
  CheckCircle, XCircle, Clock, BookOpen,
  MessageCircle, ClipboardCheck, FileText, TrendingUp,
  Minus, Award, Percent, Timer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TONES, type Tone } from '@/shared/workspace'
import { arNum, useCountUp } from '../../pages/dashboard-ui'
import { StatGrid, toneBg } from './profile-ui'
import type { TeacherProfileSummary, BenchmarkValues } from '../types'

interface SummaryStatProps {
  title: string
  /** رقم يُعدّ تصاعدياً، أو نص يُعرض كما هو (مثل «غير مرتبط») */
  value: number | string
  suffix?: string
  subtitle?: string
  icon: LucideIcon
  tone: Tone
  benchmark?: number
  /** true = أعلى أفضل, false = أقل أفضل */
  higherIsBetter?: boolean
}

/** بطاقة مؤشر رئيسية — أخت بطاقات لوحة التحكم: تلبس نبرتها دائماً وتعدّ من صفر */
function SummaryStat({ title, value, suffix, subtitle, icon: Icon, tone, benchmark, higherIsBetter = true }: SummaryStatProps) {
  const numeric = typeof value === 'number'
  const display = useCountUp(numeric ? value : 0)
  const numValue = numeric ? value : parseFloat(String(value)) || 0
  const isBetter = benchmark !== undefined
    ? (higherIsBetter ? numValue >= benchmark : numValue <= benchmark)
    : null
  const benchTone = isBetter ? TONES.green : TONES.amber

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px',
        border: `1px solid ${tone.bd}`,
        borderRadius: 10,
        background: toneBg(tone),
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>{title}</span>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'var(--ws-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 14, height: 14, color: tone.tx }} />
        </span>
      </span>
      <span
        style={{
          fontSize: numeric ? 24 : 14,
          fontWeight: 800,
          lineHeight: 1.15,
          color: tone.tx,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {numeric ? arNum(display) : value}
        {suffix}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 15 }}>
        {subtitle && <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>{subtitle}</span>}
        {benchmark !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              marginInlineStart: 'auto',
              fontSize: 10.5,
              fontWeight: 700,
              color: benchTone.tx,
            }}
            title="متوسط المدرسة"
          >
            {isBetter ? <TrendingUp style={{ width: 11, height: 11 }} /> : <Minus style={{ width: 11, height: 11 }} />}
            م: {arNum(benchmark)}
          </span>
        )}
      </span>
    </article>
  )
}

interface SummaryCardsProps {
  data: TeacherProfileSummary
  benchmarks: BenchmarkValues | null
}

export function SummaryCards({ data, benchmarks }: SummaryCardsProps) {
  const attendanceRate = data.attendance.attendance_rate ?? 0
  const onTimeRate = data.attendance.on_time_rate ?? 0
  const rewardsCount = data.rewards?.rewards_count ?? 0

  return (
    <StatGrid style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      {/* === إيجابي أولاً === */}
      <SummaryStat
        title="نسبة الانضباط"
        value={attendanceRate}
        suffix="%"
        subtitle={`${data.attendance.present_days} يوم حضور`}
        icon={Percent}
        tone={TONES.green}
      />
      <SummaryStat
        title="الالتزام بالمواعيد"
        value={onTimeRate}
        suffix="%"
        subtitle={`${data.attendance.on_time_days} يوم في الموعد`}
        icon={Timer}
        tone={TONES.amber}
      />
      <SummaryStat
        title="نسبة التحضير"
        value={data.preparation.is_linked ? data.preparation.rate : 'غير مرتبط'}
        suffix={data.preparation.is_linked ? '%' : undefined}
        subtitle={data.preparation.is_linked ? `${data.preparation.prepared}/${data.preparation.total}` : undefined}
        icon={ClipboardCheck}
        tone={TONES.purple}
        benchmark={data.preparation.is_linked ? benchmarks?.school_preparation_rate : undefined}
        higherIsBetter={true}
      />
      <SummaryStat
        title="الرسائل المرسلة"
        value={data.messages.total_sent}
        subtitle={`${data.messages.replies_count} رد`}
        icon={MessageCircle}
        tone={TONES.sky}
        benchmark={benchmarks?.avg_messages_per_teacher}
        higherIsBetter={true}
      />
      <SummaryStat
        title="الحصص"
        value={data.schedule.total_sessions}
        subtitle={`${data.schedule.subjects_count} مادة · ${data.schedule.classes_count} فصل`}
        icon={BookOpen}
        tone={TONES.gray}
      />
      {/* المكافآت - تظهر فقط إذا > 0 */}
      {rewardsCount > 0 && (
        <SummaryStat
          title="المكافآت الممنوحة"
          value={rewardsCount}
          subtitle={`${data.rewards.total_rewards} نقطة`}
          icon={Award}
          tone={TONES.green}
        />
      )}
      {/* === البقية بنبرات هادئة === */}
      <SummaryStat
        title="أيام الحضور"
        value={data.attendance.present_days}
        subtitle={`من ${data.attendance.total_records}`}
        icon={CheckCircle}
        tone={TONES.gray}
        benchmark={benchmarks?.avg_present_days}
        higherIsBetter={true}
      />
      <SummaryStat
        title="أيام الغياب"
        value={data.attendance.absent_days}
        icon={XCircle}
        tone={TONES.red}
        benchmark={benchmarks?.avg_absent_days}
        higherIsBetter={false}
      />
      <SummaryStat
        title="أيام التأخر"
        value={data.attendance.delayed_days}
        icon={Clock}
        tone={TONES.amber}
        benchmark={benchmarks?.avg_delayed_days}
        higherIsBetter={false}
      />
      <SummaryStat
        title="الإحالات"
        value={data.referrals_count}
        icon={FileText}
        tone={TONES.gray}
        benchmark={benchmarks?.avg_referrals_per_teacher}
      />
    </StatGrid>
  )
}
