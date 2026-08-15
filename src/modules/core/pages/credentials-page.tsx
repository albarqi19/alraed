/**
 * صفحةُ بيانات الدخول — `/credentials/{token}`
 *
 * ══ لماذا توجد أصلاً؟ ══
 * بريدُ الترحيب يحمل اسم المستخدم وكلمة المرور، ويحتاج صاحبُه أن ينسخهما.
 * وجافاسكربت لا تعمل داخل عميل البريد، فلا زرَّ نسخٍ هناك مهما كُتب. فالحلّ:
 * رابطٌ في الرسالة يفتح هذه الصفحة في الموقع — حيث الزرُّ زرٌّ حقيقيّ.
 *
 * ══ رمزٌ يُحرَق عند الفتح ══
 * الرمزُ صالحٌ ٧٢ ساعة، **ويُبطَل بعد أوّل فتحٍ ناجح**. ولذلك:
 *   • لا إعادةَ محاولةٍ تلقائيّة عند الفشل (`retry: false`)، فمحاولةٌ ثانيةٌ بعد
 *     نجاحٍ لم يصل ردُّه تجد الرمز محروقاً فتُظهر «مُستهلَك» لمن لم يقرأ شيئاً.
 *   • ولا إعادةَ جلبٍ عند العودة إلى النافذة أو إعادة الوصل — وإلّا محَت
 *     تبويبةٌ عاد إليها المستخدمُ البياناتِ التي كانت أمامه.
 *   • والحالة `staleTime: Infinity`: ما قُرئ مرّةً لا يُقرأ ثانية.
 *
 * ══ حذارِ — في الصفحة كلمةُ مرور ══
 *   • لا تُسجَّل في console، ولا تُمرَّر إلى تتبّعٍ أو تحليلات.
 *   • ولا تدخل عنوان الصفحة ولا عنوان التبويبة ولا تاريخَ التصفّح.
 *   • والصفحة تُمنع من الفهرسة ما دامت مفتوحة.
 *
 * ══ الهويّة ══
 * ألوانُ صفحة الهبوط: أخضرٌ عميق · ذهبيّ · كريميّ ورقيّ. و**فلات بلا ظلال**
 * تماماً — طلبُ المالك الصريح لرسالة البريد، فلتتّسق الصفحة التي تفتحها معها.
 */

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, Clock, Copy, KeyRound, LogIn, WifiOff } from 'lucide-react'
import {
  CredentialsLinkError,
  fetchCredentialsByToken,
  type CredentialsFailureReason,
  type CredentialsPayload,
} from '../api'
import { copyText } from '../clipboard'

/* ── هويّة صفحة الهبوط ── */
const DEEP = '#163C27'
const DEEP_SOFT = '#204029'
const GOLD = '#d7a74a'
const GOLD_SOFT = '#f3cf87'
const CREAM = '#fdfaf4'
const CREAM_BD = '#e7dcc7'
const BROWN = '#7d6b4f'

/* الخطّ كما في صفحة الهبوط: Tajawal مطلوبٌ في الهويّة، وIBM Plex Sans Arabic
   هو المحمَّل فعلاً في `index.html` — فيتقدّم كي لا تنزلق الصفحة إلى خطّ النظام. */
const FONT_STACK = "'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif"

/** حقلٌ واحدٌ في البطاقة، ومعه ما يُنسخ منه */
interface CredentialField {
  key: string
  label: string
  value: string
  /** اللاتينيّ يُعرض من اليسار وإلّا تبعثرت أرقامُه وعلاماتُه */
  ltr: boolean
}

/* ══════════════════════════════════════════════════════════════
   زرُّ نسخٍ واحد
   ══════════════════════════════════════════════════════════════ */

type CopyState = 'idle' | 'done' | 'failed'

function CopyButton({
  value,
  label,
  onFailure,
  block = false,
}: {
  value: string
  label: string
  onFailure: () => void
  /** الزرُّ العريض الذهبيّ: «انسخ الكلّ» هو الفعلُ المقصود من الصفحة كلّها */
  block?: boolean
}) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [state])

  const handleCopy = async () => {
    const copied = await copyText(value)
    setState(copied ? 'done' : 'failed')
    if (!copied) {
      // الفشلُ يُعلَن مرّةً واحدةً لكلّ الصفحة: نصٌّ يشرح للمستخدم أنّ عليه
      // التحديد اليدويّ — لا زرٌّ يزعم النجاح صامتاً.
      onFailure()
    }
  }

  const done = state === 'done'
  const failed = state === 'failed'

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={done ? `نُسخ ${label}` : `نسخ ${label}`}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors',
        block ? 'w-full py-3 text-sm' : '',
      ].join(' ')}
      style={{
        borderColor: done ? DEEP : failed ? '#b3402f' : block ? GOLD : CREAM_BD,
        background: done ? DEEP : block ? GOLD : '#ffffff',
        color: done ? CREAM : failed ? '#b3402f' : DEEP,
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{done ? 'تمّ النسخ' : failed ? 'انسخه يدوياً' : block ? 'نسخ البيانات كلّها' : 'نسخ'}</span>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════
   الإطار المشترك — ترويسةُ الهويّة وبطاقةٌ في وسط الشاشة
   ══════════════════════════════════════════════════════════════ */

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-10"
      style={{ background: CREAM, fontFamily: FONT_STACK }}
    >
      <Link to="/" className="mb-6 flex items-center gap-2.5">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl border"
          style={{ background: DEEP, borderColor: GOLD }}
        >
          <KeyRound className="h-5 w-5" style={{ color: GOLD_SOFT }} />
        </span>
        <span className="text-right">
          <span className="block text-sm font-bold" style={{ color: DEEP }}>
            نظام الرائد
          </span>
          <span className="block text-[11px]" style={{ color: BROWN }}>
            للإدارة المدرسية
          </span>
        </span>
      </Link>

      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border"
        style={{ background: '#ffffff', borderColor: CREAM_BD }}
      >
        {children}
      </div>

      <p className="mt-6 text-center text-[11px]" style={{ color: BROWN }}>
        © {new Date().getFullYear()} نظام الرائد للإدارة المدرسية
      </p>
    </div>
  )
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-6 py-5 text-right" style={{ background: DEEP, borderBottom: `3px solid ${GOLD}` }}>
      <h1 className="text-lg font-bold" style={{ color: '#fdfaf4' }}>
        {title}
      </h1>
      <p className="mt-1 text-xs" style={{ color: GOLD_SOFT }}>
        {subtitle}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   الحالات
   ══════════════════════════════════════════════════════════════ */

function LoadingState() {
  return (
    <PageFrame>
      <CardHeader title="جارٍ فتح الرابط" subtitle="لحظةٌ من فضلك" />
      <div className="flex flex-col items-center gap-4 px-6 py-12">
        <span
          className="h-9 w-9 animate-spin rounded-full border-2"
          style={{ borderColor: CREAM_BD, borderTopColor: GOLD }}
        />
        <p className="text-sm" style={{ color: BROWN }}>
          نتحقّق من الرابط ونجلب بيانات دخولك.
        </p>
      </div>
    </PageFrame>
  )
}

/** نصُّ كلّ سببٍ من أسباب التعذّر — لا شاشةً بيضاء ولا رقمَ حالةٍ عارياً */
const FAILURE_COPY: Record<
  CredentialsFailureReason,
  { title: string; body: string; hint: string }
> = {
  expired: {
    title: 'انتهت صلاحية هذا الرابط',
    body: 'رابطُ بيانات الدخول صالحٌ ٧٢ ساعةً من إرساله، وقد مضت.',
    hint: 'استخدم «نسيت كلمة المرور» في صفحة الدخول، أو تواصل مع الدعم لإرسال بياناتٍ جديدة.',
  },
  consumed: {
    title: 'فُتح هذا الرابط من قبل',
    body: 'الرابطُ يعمل مرّةً واحدةً فقط — وقد فُتح وعُرضت بياناته بالفعل.',
    hint: 'إن لم تكن أنت من فتحه، أو لم تحفظ البيانات، فتواصل مع الدعم فوراً.',
  },
  'not-found': {
    title: 'الرابط غير صحيح',
    body: 'لم نجد هذا الرمز. غالباً وصل الرابطُ مبتوراً من رسالة البريد.',
    hint: 'انسخ الرابط كاملاً من الرسالة والصقه في المتصفّح، أو تواصل مع الدعم.',
  },
  network: {
    title: 'تعذّر الاتصال بالخادم',
    body: 'لم يصلنا ردٌّ — يبدو أنّ الشبكة انقطعت.',
    hint: 'تحقّق من اتصالك ثمّ أعد تحميل الصفحة. الرابطُ لم يُستهلك بعد.',
  },
  server: {
    title: 'تعذّر فتح الرابط',
    body: 'حدث عطلٌ عندنا لا عندك، ولم نستطع قراءة بيانات دخولك.',
    hint: 'أعد المحاولة بعد قليل، فإن تكرّر فتواصل مع الدعم.',
  },
}

/**
 * هل رسالةُ الخادم تُعيد ما قلناه؟
 *
 * الخادمُ يقول «انتهت صلاحية هذا الرابط.» ونحن نقول العبارة نفسها عنواناً —
 * فعرضُها مرّتين يوحي بخطأين لا خطأ. نقارن بعد تجريد التشكيل الطباعيّ
 * (المسافات والنقاط والفواصل)، فلا يُنجي التكرارَ نقطةٌ في آخر السطر.
 */
function isEchoOfOurText(message: string, title: string, body: string): boolean {
  const strip = (value: string) => value.replace(/[\s.،؛:!؟]+/g, '')
  const needle = strip(message)
  if (!needle) return true

  const haystacks = [strip(title), strip(body)]
  return haystacks.some((text) => text.includes(needle) || needle.includes(text))
}

function FailureState({ reason, serverMessage }: { reason: CredentialsFailureReason; serverMessage?: string }) {
  const copy = FAILURE_COPY[reason]
  const Icon = reason === 'network' ? WifiOff : reason === 'expired' ? Clock : AlertTriangle
  const extraMessage =
    serverMessage && !isEchoOfOurText(serverMessage, copy.title, copy.body) ? serverMessage : null

  return (
    <PageFrame>
      <CardHeader title="بيانات الدخول" subtitle="نظام الرائد للإدارة المدرسية" />

      <div className="px-6 py-8 text-center">
        <span
          className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border"
          style={{ background: CREAM, borderColor: CREAM_BD }}
        >
          <Icon className="h-7 w-7" style={{ color: GOLD }} />
        </span>

        <h2 className="text-lg font-bold" style={{ color: DEEP }}>
          {copy.title}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: BROWN }}>
          {copy.body}
        </p>

        {/* رسالةُ الخادم تُعرض إن أضافت شيئاً: هو يعرف تفصيلاً قد لا نعرفه */}
        {extraMessage ? (
          <p
            className="mx-auto mt-4 max-w-sm rounded-lg border px-3 py-2 text-xs leading-relaxed"
            style={{ background: CREAM, borderColor: CREAM_BD, color: BROWN }}
          >
            {extraMessage}
          </p>
        ) : null}

        <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed" style={{ color: DEEP_SOFT }}>
          {copy.hint}
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <a
            href="/auth/admin"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            style={{ background: DEEP, color: CREAM }}
          >
            <LogIn className="h-4 w-4" />
            الذهاب إلى صفحة الدخول
          </a>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-5 py-3 text-sm font-bold"
            style={{ borderColor: CREAM_BD, color: DEEP, background: '#ffffff' }}
          >
            العودة للرئيسية
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PageFrame>
  )
}

/** «صالحٌ حتى …» بصيغةٍ عربيّةٍ مقروءة — وبلا انهيارٍ إن جاء التاريخ تالفاً */
function formatExpiry(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
}

function CredentialsState({ credentials }: { credentials: CredentialsPayload }) {
  const [manualCopyNeeded, setManualCopyNeeded] = useState(false)

  const fields: CredentialField[] = [
    { key: 'school', label: 'اسم المدرسة', value: credentials.school_name, ltr: false },
    { key: 'username', label: 'اسم المستخدم', value: credentials.username, ltr: true },
    { key: 'password', label: 'كلمة المرور', value: credentials.password, ltr: true },
  ]

  const allText = [
    `اسم المدرسة: ${credentials.school_name}`,
    `اسم المستخدم: ${credentials.username}`,
    `كلمة المرور: ${credentials.password}`,
  ].join('\n')

  const expiry = formatExpiry(credentials.expires_at)

  return (
    <PageFrame>
      <CardHeader title="بيانات دخولك" subtitle={credentials.school_name} />

      {/* التنبيه أوّل ما تقع عليه العين: الصفحة لا تُفتح مرّتين */}
      <div
        className="flex items-start gap-2.5 border-b px-6 py-4 text-right"
        style={{ background: '#fdf5e6', borderColor: CREAM_BD }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
        <p className="text-xs font-semibold leading-relaxed" style={{ color: DEEP }}>
          هذه الصفحة تُفتح مرّةً واحدة — احفظ بياناتك الآن.
          <span className="block font-normal" style={{ color: BROWN }}>
            بعد مغادرتها لن يعمل الرابط مرّةً أخرى.
          </span>
        </p>
      </div>

      <div className="space-y-3 px-6 py-6">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
            style={{ background: CREAM, borderColor: CREAM_BD }}
          >
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-semibold" style={{ color: BROWN }}>
                {field.label}
              </p>
              {/* `select-all` تجعل نقرةً واحدةً تُحدّد القيمة كاملةً — طريقُ
                  النجاة حين يمنع المتصفّحُ النسخَ البرمجيّ */}
              <p
                className="select-all break-all text-sm font-bold"
                style={{ color: DEEP, direction: field.ltr ? 'ltr' : 'rtl', fontVariantNumeric: 'tabular-nums' }}
              >
                {field.value}
              </p>
            </div>
            <CopyButton value={field.value} label={field.label} onFailure={() => setManualCopyNeeded(true)} />
          </div>
        ))}

        <CopyButton value={allText} label="بيانات الدخول كاملة" onFailure={() => setManualCopyNeeded(true)} block />

        {manualCopyNeeded ? (
          <p
            className="rounded-lg border px-3 py-2 text-xs leading-relaxed"
            style={{ background: '#fdf5e6', borderColor: GOLD, color: DEEP }}
            role="status"
          >
            متصفّحك منع النسخ التلقائيّ (يحدث خارج الاتصال الآمن). انقر على النصّ نقرةً واحدةً
            ليُحدَّد كاملاً، ثمّ انسخه بنفسك.
          </p>
        ) : null}

        {/* المهلةُ تُذكر بصيغة الماضي عن قصد: الرمزُ احترق بفتحك له قبل قليل،
            والتاريخُ هو أقصى ما كان سينتظرك لو لم تفتحه. */}
        {expiry ? (
          <p className="pt-1 text-center text-[11px] leading-relaxed" style={{ color: BROWN }}>
            <Clock className="ml-1 inline h-3 w-3" />
            انتهى هذا الرابط بفتحك له الآن — وكانت مهلته تنتهي في {expiry}
          </p>
        ) : null}
      </div>

      <div className="border-t px-6 py-5" style={{ borderColor: CREAM_BD, background: '#ffffff' }}>
        <a
          href="/auth/admin"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold"
          style={{ background: DEEP, color: CREAM }}
        >
          <LogIn className="h-4 w-4" />
          الدخول إلى النظام الآن
        </a>
        <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: BROWN }}>
          ننصحك بتغيير كلمة المرور من صفحة حسابك بعد أوّل دخول.
        </p>
      </div>
    </PageFrame>
  )
}

/* ══════════════════════════════════════════════════════════════
   الصفحة
   ══════════════════════════════════════════════════════════════ */

export function CredentialsPage() {
  const { token } = useParams<{ token: string }>()

  /* عنوانُ التبويبة محايد، والصفحة تُمنع من الفهرسة.
     لا اسمَ مدرسةٍ في العنوان ولا شيءَ من البيانات: عنوانُ التبويبة يظهر في
     تاريخ التصفّح وفي مبدّل النوافذ ولقطات الشاشة. */
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'بيانات الدخول — نظام الرائد'

    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow, noarchive'
    document.head.appendChild(robots)

    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])

  const query = useQuery({
    queryKey: ['public', 'credentials', token],
    queryFn: () => fetchCredentialsByToken(token as string),
    enabled: Boolean(token),
    /* رمزٌ يُحرَق عند الفتح: كلُّ إعادةٍ هنا خطرٌ لا تحسين — انظر رأس الملفّ */
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  if (!token) {
    return <FailureState reason="not-found" />
  }

  if (query.isPending) {
    return <LoadingState />
  }

  if (query.isError) {
    const error = query.error
    const reason: CredentialsFailureReason = error instanceof CredentialsLinkError ? error.reason : 'server'
    const serverMessage = error instanceof CredentialsLinkError ? error.message : undefined
    return <FailureState reason={reason} serverMessage={serverMessage} />
  }

  return <CredentialsState credentials={query.data} />
}

export default CredentialsPage
