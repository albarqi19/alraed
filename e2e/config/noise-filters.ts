/**
 * ترشيح الضجيج — قائمةٌ مستقلّة يسهل توسيعها.
 *
 * تقريرٌ فيه مئةُ تحذيرٍ من React لا يقرؤه أحد. وحين لا يُقرأ التقرير، يمرّ
 * العطل الحقيقيّ بينها. فالترشيح ليس تجميلاً — بل شرطُ أن يبقى التقرير مقروءاً.
 *
 * ══ كيف تضيف مرشِّحاً؟ ══
 * افتح هذا الملفّ وأضف سطراً إلى المصفوفة المناسبة. كلُّ عنصرٍ إمّا نصّ
 * (يُطابَق بالاحتواء، غير حسّاسٍ لحالة الأحرف) أو تعبيرٌ نمطيّ. اكتب تعليقاً
 * بجانبه يقول **لماذا** هذا ضجيج — وإلا تحوّلت القائمة بعد سنةٍ إلى ستارٍ
 * يخفي أعطالاً حقيقية.
 */

/* ══════════════════════════════════════════════════════════════
   ١) رسائل الـ console المتجاهَلة
   ══════════════════════════════════════════════════════════════ */

export const consoleNoisePatterns: Array<string | RegExp> = [
  // ── تحذيرات React المعروفة (لا تدلّ على عطلٍ للمستخدم) ──
  'Warning: ReactDOM.render',
  'Warning: findDOMNode',
  'Warning: Each child in a list should have a unique "key"',
  'validateDOMNesting',
  'Support for defaultProps will be removed',
  'useLayoutEffect does nothing on the server',
  'Warning: React does not recognize the',
  'was created with unknown prop',

  // ── أدوات المطوّر والامتدادات: تُحقن في الصفحة ولا علاقة لها بتطبيقنا ──
  'Download the React DevTools',
  'chrome-extension://',
  'moz-extension://',
  'extension context invalidated',
  'Unchecked runtime.lastError',

  // ── الأيقونة المفضّلة: غيابها لا يعطّل شاشةً ──
  /favicon\.ico/i,
  /manifest\.webmanifest/i,

  // ── الطرف الثالث: Firebase و Sentry و Pusher تفشل بلا مفاتيحَ في بيئة الفحص ──
  // فشلُها متوقَّع محلّياً، ولا يمنع أيّ شاشةٍ من العمل.
  /firebase/i,
  /firestore/i,
  /FirebaseError/,
  /messaging\/.*not-supported/i,
  /sentry/i,
  /pusher/i,
  /reverb/i,
  /laravel-echo/i,
  /WebSocket connection to .* failed/i,
  /Echo/,

  // ── عامل الخدمة (PWA): التسجيل يفشل تحت المتصفّح المؤتمَت ──
  /service ?worker/i,
  /workbox/i,
  /sw\.js/i,

  // ── سياسة أمان المحتوى وملفّات المصدر: ضجيج أدواتٍ لا عطلُ منتج ──
  /Content Security Policy/i,
  /source ?map/i,
  /DevTools failed to load/i,

  // ── الوسائط والأذونات المحجوبة في المتصفّح المؤتمَت ──
  /Permissions policy violation/i,
  /NotAllowedError.*(camera|microphone|geolocation)/i,
  /getUserMedia/i,
  /play\(\) (failed|request was interrupted)/i,

  // ── فشل الشبكة الذي نرصده أصلاً في كاشف «النداء الفاشل» ──
  // تركُه هنا يمنع تسجيل العطل الواحد مرّتين تحت اسمين.
  /Failed to load resource: the server responded with a status/i,
  /net::ERR_/,
  /AxiosError/,
  /Request failed with status code/i,
]

/* ══════════════════════════════════════════════════════════════
   ٢) أخطاء الصفحة (pageerror) المتجاهَلة
   ══════════════════════════════════════════════════════════════ */

export const pageErrorNoisePatterns: Array<string | RegExp> = [
  // ResizeObserver: ضجيجٌ شهيرٌ في المتصفّحات، لا يكسر شيئاً
  /ResizeObserver loop/i,
  // إلغاء تحميلٍ كسولٍ عند مغادرة الصفحة أثناء الزحف
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  // إلغاء طلبٍ من TanStack Query عند التنقّل
  /CanceledError/,
  /AbortError/,
]

/* ══════════════════════════════════════════════════════════════
   ٣) نداءاتٌ لا تُصنَّف أعطالاً مهما كان ردُّها
   ══════════════════════════════════════════════════════════════ */

export const ignoredRequestPatterns: Array<string | RegExp> = [
  /\/favicon/i,
  /\.map$/,
  /googleapis\.com/i,
  /gstatic\.com/i,
  /firebaseio\.com/i,
  /firebaseinstallations/i,
  /google-analytics/i,
  /hot-update/,
  /@vite\/client/,
  /\/__vite/,
]

/* ══════════════════════════════════════════════════════════════
   ٤) نداءاتٌ يُتوقَّع فشلها بأكواد معيّنة (مسارٌ يخصّ دوراً آخر…)
   ══════════════════════════════════════════════════════════════
   الصيغة: نمط المسار → الأكواد المتوقَّعة عليه. */

export const expectedFailures: Array<{ urlPattern: RegExp; statuses: number[]; why: string }> = [
  {
    urlPattern: /\/api\/(admin|platform)\//,
    statuses: [401, 403],
    why: 'مسار إدارة نُودي بدورٍ لا يملكه — الرفض هو السلوك الصحيح',
  },
  {
    urlPattern: /\/api\/guardian\//,
    statuses: [401, 403],
    why: 'بوابة وليّ الأمر تتطلّب جلسةً بالهوية وآخر أربعة أرقام',
  },
  {
    urlPattern: /\/api\/.*\/(check|status|ping|health)$/i,
    statuses: [404],
    why: 'نقطة فحصٍ اختيارية قد لا تكون مفعَّلة في بيئة الاختبار',
  },
  {
    urlPattern: /\/notifications?\//i,
    statuses: [404],
    why: 'الإشعارات تحتاج تسجيل جهاز — غير متوفّر في متصفّحٍ مؤتمَت',
  },
  {
    // شلُّ الإدارة يسأل عن حالة نسخة الواتساب في كلّ صفحة، فبلا هذا القيد
    // يمتلئ التقرير بأربعٍ وثمانين نسخةً من العطل نفسه وتغرق الأعطالُ الحقيقية.
    urlPattern: /\/api\/admin\/whatsapp\/instances\/[^/]+\/(status|qr|connect)/i,
    statuses: [500, 502, 503, 504],
    why:
      'الباك ينادي بوّابة واتساب على http://localhost:8080 (WHATSAPP_API_URL) وهي غير مشغّلة ' +
      'في بيئة الفحص، فيردّ 500. عطلُ بيئةٍ لا عطلُ صفحة — لكنّه يستحقّ نظرةً في الإنتاج: ' +
      'نقطةٌ تنهار بـ 500 حين تسقط بوّابةٌ خارجية بدل أن تردّ «غير متصل» بلطف',
  },
]

/* ══════════════════════════════════════════════════════════════
   المطابِقات
   ══════════════════════════════════════════════════════════════ */

function matches(text: string, patterns: Array<string | RegExp>): boolean {
  const lower = text.toLowerCase()
  return patterns.some((pattern) =>
    typeof pattern === 'string' ? lower.includes(pattern.toLowerCase()) : pattern.test(text),
  )
}

/** هل رسالة الـ console هذه ضجيجٌ يُتجاهَل؟ */
export function isConsoleNoise(message: string): boolean {
  return matches(message, consoleNoisePatterns)
}

/** هل خطأ الصفحة هذا ضجيجٌ يُتجاهَل؟ */
export function isPageErrorNoise(message: string): boolean {
  return matches(message, pageErrorNoisePatterns)
}

/** هل هذا النداء خارج نطاق الرصد أصلاً؟ */
export function isIgnoredRequest(url: string): boolean {
  return matches(url, ignoredRequestPatterns)
}

/** إن كان فشل النداء متوقَّعاً، تُرجع سببَ التوقّع؛ وإلا null. */
export function expectedFailureReason(url: string, status: number): string | null {
  for (const rule of expectedFailures) {
    if (rule.urlPattern.test(url) && rule.statuses.includes(status)) return rule.why
  }
  return null
}
