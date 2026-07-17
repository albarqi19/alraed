/* عناصر بصرية مشتركة لصفحة «برنامج نقاطي» — عرض فقط، لا منطق
   الألوان بمعانٍ ثابتة: أخضر = تعزيز حصراً، أحمر = مخالفة/خطر،
   كهرماني = مؤقّت ينتظر، سماوي = معلومة بلا حكم، بنفسجي = أصل إداري،
   رمادي = منطفئ/ملغى. */
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { TONES, WsIconBtn, type Tone } from '@/shared/workspace'

/** الفارق بين وقتين بصيغة م:ث */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * عدّاد نافذة التراجع — يقرأ undoable_until الموجود في كل سجل ولم تعرضه الواجهة قط.
 * الخادم يرفض التراجع بعد انتهائها فعلاً، فالمدير كان يرى زراً متاحاً ثم يفاجئه الرفض.
 */
export function UndoCountdown({ until }: { until: string }) {
  const [remaining, setRemaining] = useState(() => new Date(until).getTime() - Date.now())

  useEffect(() => {
    setRemaining(new Date(until).getTime() - Date.now())
    const id = setInterval(() => {
      setRemaining(new Date(until).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [until])

  if (remaining <= 0) return null

  const isUrgent = remaining < 60_000
  return (
    <span
      className={isUrgent ? 'ws-soft-pulse' : undefined}
      style={{ fontSize: 10.5, fontWeight: 700, color: isUrgent ? TONES.amber.tx : 'var(--ws-text-2)', direction: 'ltr' }}
    >
      {formatCountdown(remaining)}
    </span>
  )
}

/** هل انتهت مهلة التراجع؟ (عرض فقط — لا يُشدَّد به شرط الزر) */
export function isUndoWindowOver(until?: string | null): boolean {
  if (!until) return false
  return new Date(until).getTime() <= Date.now()
}

/** ترقيم موحّد بنافذة خمسة أرقام — يحل محل رسم زر لكل صفحة */
export function Pager({
  page,
  lastPage,
  total,
  unit,
  onChange,
}: {
  page: number
  lastPage: number
  total?: number
  unit: string
  onChange: (page: number) => void
}) {
  if (lastPage <= 1) return null

  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  const end = Math.min(lastPage, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
        صفحة {page} من {lastPage}
        {total != null && ` — ${new Intl.NumberFormat('en-US').format(total)} ${unit}`}
      </span>
      <WsIconBtn icon={ChevronsRight} label="الصفحة الأولى" disabled={page === 1} onClick={() => onChange(1)} />
      <WsIconBtn icon={ChevronRight} label="السابق" disabled={page === 1} onClick={() => onChange(page - 1)} />
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className="ws-icon-btn"
          onClick={() => onChange(p)}
          style={p === page
            ? { background: 'var(--ws-accent)', borderColor: 'var(--ws-accent)', color: '#fff', fontWeight: 800 }
            : { fontWeight: 700 }}
        >
          {p}
        </button>
      ))}
      <WsIconBtn icon={ChevronLeft} label="التالي" disabled={page === lastPage} onClick={() => onChange(page + 1)} />
      <WsIconBtn icon={ChevronsLeft} label="الصفحة الأخيرة" disabled={page === lastPage} onClick={() => onChange(lastPage)} />
    </span>
  )
}

/**
 * شريط لوحة الشرف المقسوم: عرضه نسبة لنقاط المتصدر،
 * ومقسوم أخضر (تعزيز) / أحمر (مخالفات) من lifetime_rewards و lifetime_violations
 * — حقلان يصلان في الاستجابة ولم تعرضهما الواجهة.
 */
export function LeaderBar({
  totalPoints,
  topPoints,
  rewards,
  violations,
}: {
  totalPoints: number
  topPoints: number
  rewards?: number
  violations?: number
}) {
  const widthPct = topPoints > 0 ? Math.max(2, Math.min(100, (totalPoints / topPoints) * 100)) : 0
  const hasSplit = (rewards ?? 0) > 0 || (violations ?? 0) > 0
  const sum = (rewards ?? 0) + (violations ?? 0)
  const rewardPct = hasSplit && sum > 0 ? ((rewards ?? 0) / sum) * 100 : 100

  return (
    <span
      style={{ display: 'block', height: 5, borderRadius: 3, background: 'var(--ws-border)', overflow: 'hidden' }}
      title={hasSplit ? `تعزيز: ${rewards ?? 0} · مخالفات: ${violations ?? 0}` : undefined}
    >
      <span style={{ display: 'flex', height: '100%', width: `${widthPct}%`, borderRadius: 3, overflow: 'hidden' }}>
        <span style={{ height: '100%', width: `${rewardPct}%`, background: TONES.green.tx }} />
        {hasSplit && rewardPct < 100 && (
          <span style={{ height: '100%', width: `${100 - rewardPct}%`, background: TONES.red.tx }} />
        )}
      </span>
    </span>
  )
}

/** مربع QR مُهشَّر — يظهر حين لا تملك البطاقة رمزاً مميزاً (حارس التصدير B13) */
export function QrPlaceholder({ size = 160 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'repeating-linear-gradient(45deg, #f1f5f9 0 6px, #e2e8f0 6px 12px)',
        border: '1px dashed #cbd5e1',
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      بلا رمز
    </span>
  )
}

export interface CardFaceData {
  token: string
  studentName: string
  studentGrade: string
  studentId: string
  version: string
  status: string
  issued: string
  qrDataUrl?: string | null
}

/**
 * وجه البطاقة 384×576 — مكوّن واحد يُركَّب مرتين:
 * (1) نسخة مخفية في جذر الصفحة هي هدف html2canvas، تُحقن نصوصها إجرائياً
 *     عبر querySelector (ضرورة: التصدير الجماعي يدهن نفس العقدة عشرين مرة داخل حلقة await).
 * (2) نسخة حيّة في العمود الجانبي بالـ props.
 * السِمات data-* تبقى في الحالتين — والحقن مُنطاق داخل عنصر التصدير فلا تصطدم النسختان.
 * الكلاسات تُنقل حرفياً من القالب الأصلي حتى لا ينحرف الناتج المطبوع.
 */
export function PointsCardFace({
  data,
  innerRef,
  hidden,
}: {
  data?: CardFaceData
  innerRef?: (node: HTMLDivElement | null) => void
  hidden?: boolean
}) {
  return (
    <div
      ref={innerRef}
      style={hidden ? { position: 'absolute', left: '-9999px', top: 0 } : undefined}
      className="mx-auto flex h-[576px] w-[384px] flex-col justify-between rounded-[32px] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 text-right shadow-inner"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>برنامج نقاطي</span>
        <span data-card-token>{data ? `رمز: ${data.token}` : 'رمز: ...'}</span>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-slate-500">اسم الطالب</p>
          <h3 data-student-name className="text-3xl font-bold text-slate-900">{data?.studentName ?? '...'}</h3>
          <p data-student-grade className="text-sm font-semibold text-slate-600">{data?.studentGrade ?? '...'}</p>
        </div>

        {/* QR Code في الوسط */}
        <div className="flex justify-center">
          <div className="grid place-items-center rounded-3xl bg-white/90 p-4 shadow-inner">
            {data && !data.qrDataUrl ? (
              <QrPlaceholder />
            ) : (
              <img
                data-qr-image
                src={data?.qrDataUrl ?? undefined}
                alt="QR Code"
                className="h-40 w-40"
              />
            )}
            <p className="mt-2 text-[10px] text-slate-500">امسح لفتح بطاقة النقاط</p>
          </div>
        </div>

        {/* رقم الطالب والإصدار بجانب بعض */}
        <div className="flex items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex-1 text-right">
            <p className="text-[11px] text-slate-500">رقم الطالب</p>
            <p data-student-id className="text-lg font-semibold text-slate-900">{data?.studentId ?? '...'}</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[11px] text-slate-500">الإصدار الحالي</p>
            <p data-card-version className="text-sm font-semibold text-slate-700">{data?.version ?? '...'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-right text-xs text-slate-500">
        <p>حالة البطاقة: <span data-card-status>{data?.status ?? '...'}</span></p>
        <p>
          تاريخ الإصدار: <span data-card-issued className="font-semibold text-slate-700">{data?.issued ?? '...'}</span>
        </p>
      </div>
    </div>
  )
}

/** شريحة مصدر العملية: بنفسجي = يدوي (أدخله الأدمن)، سماوي = تطبيق المعلم */
export const SOURCE_META: Record<string, { label: string; tone: Tone }> = {
  admin: { label: 'يدوي', tone: TONES.purple },
  teacher: { label: 'تطبيق المعلم', tone: TONES.sky },
}

export const sourceMeta = (source: string) => SOURCE_META[source] ?? { label: source, tone: TONES.gray }
