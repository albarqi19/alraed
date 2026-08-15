import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, X, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SubscriptionExpiryAlertProps {
  endsAt: string | null;
  status?: string;
  gracePeriodRemaining?: number;
  /**
   * معرّف المدرسة — يدخل في مفتاح الإخفاء.
   *
   * بدونه يشترك مديرو مدارسَ عدّة على الجهاز نفسه (حاسبُ إدارةٍ مشترك، أو
   * مشرفٌ يتنقّل بين مدارسه) في مفتاحٍ واحد، فيُخفي أحدُهم إنذارَه فيختفي
   * إنذارُ الأخرى التي لم يرها أحد. اختياريٌّ كي لا يُكسَر نداءٌ قائم، وحين
   * يغيب نستعمل `anon` — وهو أضيقُ ضرراً من لا مفتاح.
   */
  schoolId?: number | null;
}

/* ══════════════════════════════════════════════════════════════════════
   الإخفاء: حقٌّ قبل الانتهاء، ممنوعٌ بعده
   ══════════════════════════════════════════════════════════════════════
   القاعدةُ الحاكمة سطرٌ واحدٌ صريح أدناه: `const dismissible = !isExpired`.
   الفصلُ بالحالة لا باللون — فمن يقرأ الملفّ بعد سنةٍ يجد الشرط مكتوباً ولا
   يستنتجه من كون الشريط أحمر؛ ولو أُضيفت حالةٌ حمراء جديدة دخلت تحت القاعدة
   نفسها تلقائياً بلا أن يتذكّرها أحد.

   وليس هنا Esc ولا نقرٌ خارجيّ يُغلقان: الإنذار شريطٌ داخل الصفحة لا نافذةٌ
   طافية، فلا مستمعَ لوحةِ مفاتيحَ ولا طبقةَ تعتيمٍ أصلاً. الطريقُ الوحيد
   للإخفاء هو الزرّ، والزرُّ لا يُصيَّر بعد الانتهاء.

   وقبل الانتهاء: الإخفاء يُحفظ فلا يعود مع كلّ تنقّل، لكنّه **لا يُنسى
   للأبد** — يعود إذا:
     • مرّ يومٌ كامل على الإخفاء، أو
     • تصاعدت الحالة (خرج من «٧-٤ أيام» إلى «٣ أيام فأقلّ»).
   والثانيةُ هي المهمّة: من أخفى تذكيراً باقياً عليه ستّةُ أيام لم يوافق على
   إخفاء إنذارٍ باقٍ عليه يومان — حالةٌ أخرى فتستحقّ عرضاً جديداً. */

/** مدّةُ صمتِ الإخفاء. أقلُّ من يومٍ إزعاج، وأكثرُ منه نسيانٌ في نافذةٍ أسبوعيّة. */
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

const STORAGE_PREFIX = 'alraed:subscription-alert-dismissed';

/** درجاتُ الشدّة قبل الانتهاء — تصاعدُها يُبطل الإخفاء السابق. */
type Severity = 'soon' | 'urgent';

interface DismissRecord {
  at: number;
  severity: Severity;
}

/**
 * مفتاحُ الحفظ — مقيَّدٌ بالمدرسة وبتاريخ انتهاء الاشتراك.
 *
 * `endsAt` جزءٌ من المفتاح عمداً: إذا جدّد المدير فتغيّر التاريخ صار المفتاح
 * جديداً ولم يرث إخفاءَ الدورة الماضية — وهو الصواب، فإنذارُ الدورة الجديدة
 * إنذارٌ لم يره أحد.
 */
function storageKey(schoolId: number | null | undefined, endsAt: string): string {
  return `${STORAGE_PREFIX}:${schoolId ?? 'anon'}:${endsAt}`;
}

function readDismissal(key: string): DismissRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DismissRecord>;
    if (typeof parsed?.at !== 'number') return null;
    return { at: parsed.at, severity: parsed.severity === 'urgent' ? 'urgent' : 'soon' };
  } catch {
    /* التخزين قد يكون محظوراً (تصفّحٌ خاصّ) أو محشوّاً بقيمةٍ تالفة. تعذُّرُ
       القراءة يعني «لم يُخفَ» فيظهر الإنذار — الفشلُ في اتجاه الإظهار دائماً. */
    return null;
  }
}

export function SubscriptionExpiryAlert({
  endsAt,
  status,
  gracePeriodRemaining,
  schoolId,
}: SubscriptionExpiryAlertProps) {
  const navigate = useNavigate();

  const daysUntilExpiry = useMemo(
    () => (endsAt ? differenceInDays(parseISO(endsAt), new Date()) : 0),
    [endsAt],
  );

  /* الحالةُ المحليّة قد تكون قديمة (المستخدم داخلٌ منذ الأمس والتجديد تمّ
     صباحاً)، فحين تقول «نشط» لا نُكذّبها ونرسم «منتهي» بمجرّد أنّ التاريخ
     مضى — نصمت بدل أن نُفزع مديراً مشتركاً فعلاً. */
  const statusSaysRunning = status === 'active' || status === 'trial';

  /** «انتهى» — حالةٌ صريحة تقولها، أو تاريخٌ مضى ولا حالةَ تنفيه. */
  const isExpired =
    !statusSaysRunning &&
    (daysUntilExpiry <= 0 ||
      status === 'expired' ||
      status === 'past_due' ||
      status === 'suspended' ||
      status === 'cancelled');

  /** ★ القاعدة: الإغلاق حقٌّ ما دام الاشتراك قائماً، وممنوعٌ بعد انتهائه. */
  const dismissible = !isExpired;

  const severity: Severity = daysUntilExpiry <= 3 ? 'urgent' : 'soon';
  const key = endsAt ? storageKey(schoolId, endsAt) : null;

  const [dismissed, setDismissed] = useState(false);

  /* القراءةُ داخل تأثيرٍ لا في القيمة الأوّليّة لـ `useState`: أوّلُ تصييرٍ
     يجب أن يكون خالياً من لمس `window`، وأيُّ تغيّرٍ في الشدّة يُعيد التقييم. */
  useEffect(() => {
    if (!key || !dismissible) {
      setDismissed(false);
      return;
    }
    const record = readDismissal(key);
    if (!record) {
      setDismissed(false);
      return;
    }
    const staleDismissal = Date.now() - record.at > DISMISS_TTL_MS;
    const escalated = record.severity !== severity;
    setDismissed(!staleDismissal && !escalated);
  }, [key, dismissible, severity]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (!key) return;
    try {
      const record: DismissRecord = { at: Date.now(), severity };
      window.localStorage.setItem(key, JSON.stringify(record));
    } catch {
      /* تعذّر الحفظ (تصفّحٌ خاصّ أو حصّةٌ ممتلئة): الإخفاء يصمد لهذه الجلسة
         ويعود مع التحديث. مزعجٌ قليلاً، ولا يُسقط الإنذار صامتاً. */
    }
  }, [key, severity]);

  if (!endsAt) return null;

  /* لا شيء يُعرض خارج نافذة الأسبوع. الاستثناءُ `past_due` — فترةُ السماح
     تُعرض مهما كان التاريخ، لأنّ عدّادَها هو `gracePeriodRemaining` لا `endsAt`. */
  if (daysUntilExpiry > 7 && status !== 'past_due') return null;

  /* حالةٌ تقول «نشط» وتاريخٌ مضى: بياناتٌ متأخّرةٌ لا انتهاء. نصمت. */
  if (statusSaysRunning && daysUntilExpiry <= 0) return null;

  if (dismissed) return null;

  /**
   * زرُّ الإغلاق — لا يُصيَّر إطلاقاً حين يكون الاشتراك منتهياً.
   *
   * ليس مخفيّاً بـ CSS ولا معطّلاً بـ `disabled`: كلاهما يُبقيه في الشجرة
   * فيبلغه قارئُ الشاشة أو مفتاحُ Tab أو من يشطب صنفاً من أدوات المطوّر.
   * الغيابُ التامّ من الـ DOM هو الضمانة الوحيدة التي لا تُلتَفّ.
   *
   * ويُوضع في كلّ فرعٍ بلا استثناء — الحارسُ واحدٌ فوق (`dismissible`)، فلا
   * يقع فرعٌ خارج القاعدة سهواً.
   */
  const dismissButton = dismissible ? (
    <button
      type="button"
      onClick={handleDismiss}
      aria-label="إخفاء تذكير الاشتراك"
      title="إخفاء — يعود التذكير غداً، أو فوراً إذا اقترب الموعد أكثر"
      className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      /* `Alert` يفرض `[&>svg~*]:pr-7` على كلّ شقيقٍ بعد أيقونته ليُفسح لها —
         والزرُّ منهم، فيرث حشوةً 28px داخل عرضٍ 28px فتنسحق علامةُ الإغلاق
         إلى صفر. والصنفُ المضادّ يخسر بالأولويّة (المحدِّد فيه نوعٌ زائد)،
         فالتصريحُ المباشر هو ما يصمد. */
      style={{ paddingRight: 0 }}
    >
      <X className="h-4 w-4" />
    </button>
  ) : null;

  /* حشوةٌ يسرى تُفسح للزرّ فلا يركب نصّاً طويلاً. وبلا زرٍّ لا حشوة. */
  const bodyPad = dismissible ? 'pl-10' : '';

  // ══ فترةُ السماح — انتهاءٌ والخدمةُ على وشك القطع: أحمرُ بلا إغلاق ══
  if (status === 'past_due' && gracePeriodRemaining !== undefined) {
    return (
      <Alert variant="destructive" className={`relative mb-4 ${bodyPad}`}>
        <XCircle className="h-4 w-4" />
        <AlertTitle>انتهى اشتراكك!</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>
            أنت في فترة السماح. متبقي <strong>{gracePeriodRemaining} يوم</strong> للتجديد قبل قطع الخدمة.
          </span>
          <Button variant="destructive" size="sm" onClick={() => navigate('/admin/subscription')}>
            جدد الآن
          </Button>
        </AlertDescription>
        {dismissButton}
      </Alert>
    );
  }

  // ══ انتهى — أحمرُ بلا إغلاق ══
  if (isExpired) {
    return (
      <Alert variant="destructive" className={`relative mb-4 ${bodyPad}`}>
        <XCircle className="h-4 w-4" />
        <AlertTitle>انتهى اشتراكك!</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>يرجى تجديد الاشتراك لمواصلة استخدام النظام.</span>
          <Button variant="destructive" size="sm" onClick={() => navigate('/admin/subscription')}>
            جدد الآن
          </Button>
        </AlertDescription>
        {dismissButton}
      </Alert>
    );
  }

  const label = status === 'trial' ? 'الفترة التجريبية' : 'اشتراكك';

  /* ══ اللونُ يقول ما تقوله القاعدة ══
     كان «ثلاثةُ أيّامٍ فأقلّ» يُرسَم أحمر كالمنتهي تماماً، فيرى المدير الأحمرَ
     نفسَه في حالٍ يستطيع إغلاقها وحالٍ لا يستطيع — فلا يتعلّم أيُّهما يعني
     ماذا، ويقرأ منعَ الإغلاق عُطلاً لا قصداً.
     فصار: كهرمانيٌّ = قائمٌ ويُغلَق · أحمرُ = منتهٍ ولا يُغلَق.
     وداخل الكهرمانيّ تصعيدٌ مقروء: التذكيرُ باهتٌ بحدٍّ رفيع، والإنذارُ أغمقُ
     بحافّةٍ سميكةٍ في جهة البدء (يمينُ الشاشة في RTL). */

  // ══ ثلاثةُ أيّامٍ فأقلّ — كهرمانيٌّ شديد، ويُغلَق ══
  if (severity === 'urgent') {
    return (
      <Alert
        className={`relative mb-4 border-amber-500 border-r-4 border-r-amber-600 bg-amber-100 text-amber-950 ${bodyPad}`}
      >
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-950">{label} ينتهي قريباً!</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-900">
          <span>
            متبقي <strong>{daysUntilExpiry} {daysUntilExpiry === 1 ? 'يوم' : 'أيام'}</strong> على انتهاء {label}.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600 bg-transparent text-amber-900 hover:bg-amber-200"
            onClick={() => navigate('/admin/subscription')}
          >
            تجديد الاشتراك
          </Button>
        </AlertDescription>
        {dismissButton}
      </Alert>
    );
  }

  // ══ من أربعةٍ إلى سبعةِ أيّام — تذكيرٌ هادئ، ويُغلَق ══
  return (
    <Alert className={`relative mb-4 border-amber-300 bg-amber-50 text-amber-900 ${bodyPad}`}>
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">تذكير</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800">
        <span>
          باقي على {label} <strong>{daysUntilExpiry} أيام</strong>. ننصحك بالتجديد مبكراً.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-400 bg-transparent text-amber-800 hover:bg-amber-100"
          onClick={() => navigate('/admin/subscription')}
        >
          عرض الاشتراك
        </Button>
      </AlertDescription>
      {dismissButton}
    </Alert>
  );
}
