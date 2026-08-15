/**
 * فحصُ السلامة قبل أوّل رحلة — يُنفَّذ مرّةً لكلّ عاملٍ ولا يُتجاوز.
 *
 * الزاحفُ يقرأ، فيكفيه حارسُ «لا تزحف على الإنتاج». أمّا الرحلات **فتكتب**،
 * وحارسُ العنوان وحده لا يكفيها: قد يكون العنوانُ محلّياً تماماً بينما الباك
 * الذي خلفه موصولٌ بقاعدة الإنتاج، أو طابورُه `sync` فينفّذ مهمّة الواتساب
 * في الحال داخل الطلب نفسه — فتخرج الرسالة من جهازٍ محلّيٍّ إلى وليّ أمرٍ حقيقيّ.
 *
 * فنسأل الباكَ نفسَه عن حاله، ونرفض التشغيل إن لم يكن الجواب آمناً. والرفض
 * صريحٌ برسالةٍ تقول ما الخلل وكيف يُصلَح — لا «فشل التحقّق».
 */

import { request as playwrightRequest } from '@playwright/test'
import { apiUrl } from '../../config/crawler.config'
import { tokenOf } from './api-bridge'
import { phpJson, TEST_DATABASE } from './php-bridge'

/** ما عرفناه عن البيئة — يُسجَّل في التقرير كي يُقرأ الحكمُ بشروطه */
export interface EnvironmentFacts {
  database: string
  appEnv: string
  queue: string
  broadcast: string
  broadcastHost: string
  whatsappUrl: string
  mailer: string
  /** ملاحظاتٌ لا ترقى إلى المنع، لكنّها تُذكر في التقرير */
  warnings: string[]
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal'])

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function isLocalUrl(url: string): boolean {
  const host = hostOf(url)
  return host !== null && LOCAL_HOSTS.has(host)
}

interface RawFacts {
  database: string
  app_env: string
  queue: string
  broadcast: string
  broadcast_host: string
  whatsapp_url: string
  mailer: string
}

let cached: EnvironmentFacts | null = null

/**
 * يسأل الباك عن حاله ويرفض ما ليس آمناً.
 *
 * النتيجة مُخبَّأة: الفحص يكلّف نداءَ tinker، ولا معنى لتكراره في كلّ رحلة —
 * البيئة لا تتغيّر في منتصف التشغيل.
 */
export async function assertSafeEnvironment(): Promise<EnvironmentFacts> {
  if (cached) return cached

  const raw = await phpJson<RawFacts>(
    `[
      'database' => \\DB::connection()->getDatabaseName(),
      'app_env' => app()->environment(),
      'queue' => config('queue.default'),
      'broadcast' => config('broadcasting.default'),
      'broadcast_host' => (string) config('broadcasting.connections.reverb.options.host', ''),
      'whatsapp_url' => (string) config('whatsapp.api_url'),
      'mailer' => config('mail.default'),
    ]`,
  )

  const warnings: string[] = []
  const blockers: string[] = []

  /* ── ١) القاعدة ──
     الباك الذي تخاطبه الرحلات يجب أن يكون على القاعدة نفسها التي نقيس عليها.
     وإلا قِسنا في مكانٍ وكتبنا في آخر، فجاء الفرق صفراً دائماً — وهو أسوأ
     أنواع الطمأنينة: عدّادُ أثرٍ لا يرى الأثر. */
  if (!raw.database.endsWith('_test')) {
    blockers.push(
      `قاعدة الباك «${raw.database}» لا ينتهي اسمُها بـ_test — الرحلات تكتب، ولن تكتب على قاعدةٍ غير اختبارية.`,
    )
  }
  if (raw.database !== TEST_DATABASE) {
    warnings.push(
      `الباك يقرأ من «${raw.database}» بينما عدّادُ الأثر يقيس «${TEST_DATABASE}». ` +
        'اضبط DB_DATABASE على القاعدة نفسها في الطرفيتين.',
    )
  }

  /* ── ٢) الطابور ──
     `sync` تعني أنّ كلّ `dispatch` يُنفَّذ **داخل الطلب نفسه**. فمهمّة الترحيب
     عبر واتساب تُطلق نداءها الخارجيَّ لحظةَ ضغط زرّ التسجيل. وهذا بالضبط ما
     بُني هذا الحارس ليمنعه. */
  if (raw.queue === 'sync') {
    blockers.push(
      'QUEUE_CONNECTION=sync — كلُّ مهمّةٍ تُنفَّذ فوراً داخل الطلب، ومنها إرسالُ واتساب. ' +
        'اضبطه على database (بلا عاملٍ يعمل) قبل تشغيل الرحلات.',
    )
  }

  /* ── ٣) بوّابة الواتساب ──
     الحاجزُ الأخير: لو نفّذ أحدٌ مهمّةً بطريقةٍ ما، فليكن هدفُها مضيفاً محلّياً
     لا بوّابةً حقيقية. */
  if (!isLocalUrl(raw.whatsapp_url)) {
    blockers.push(
      `بوّابة الواتساب تشير إلى «${raw.whatsapp_url}» وهو مضيفٌ غير محلّي. ` +
        'اضبط EVOLUTION_URL على عنوانٍ محلّيّ قبل تشغيل الرحلات.',
    )
  }

  /* ── ٤) البثّ الحيّ ──
     مقبسٌ إلى Reverb إنتاجيّ يبثّ أحداثَ اختبارٍ إلى شاشاتٍ حقيقية. غيرُ مُهلكٍ
     كالرسالة، لكنّه أثرٌ يغادر — فيُمنع أيضاً. */
  if (raw.broadcast !== 'null' && raw.broadcast !== 'log' && raw.broadcast_host !== '') {
    if (!LOCAL_HOSTS.has(raw.broadcast_host)) {
      blockers.push(
        `البثّ الحيّ (${raw.broadcast}) موجَّهٌ إلى «${raw.broadcast_host}» وهو غير محلّي — ` +
          'أحداثُ الاختبار ستصل إلى شاشاتٍ حقيقية. اضبط REVERB_HOST محلّياً.',
      )
    }
  }

  /* ── ٥) البريد ──
     ملاحظةٌ لا مانع: الرحلتان الأوليان لا ترسلان بريداً، لكن من يبني عليهما
     يجب أن يعرف أنّ القناة مفتوحةٌ أو مغلقة. */
  if (!['log', 'array', 'null'].includes(raw.mailer)) {
    warnings.push(`مرسِلُ البريد «${raw.mailer}» ليس log/array — أيُّ رحلةٍ ترسل بريداً ستُخرجه فعلاً.`)
  }

  /* ── ٦) هُويّةُ الباك العامل — لا هُويّةُ الشيفرة ──

     كلُّ ما سبق قرأناه بـ`artisan tinker`، وهو عمليةٌ **نُشغّلها نحن** بحقن
     DB_DATABASE. فهو يقول لنا ما ستفعله الشيفرةُ لو شغّلناها، لا ما يفعله
     **الخادم الذي يخدم المنفذ فعلاً**. وبينهما فرقٌ يقع في الواقع لا في
     النظرية: وجدنا على هذا الجهاز سبعةَ خوادمِ `artisan serve` متراكمةً على
     المنفذ نفسِه من تشغيلاتٍ سابقة، وقاعدةُ كلٍّ منها مجهولة — و`.env` الباك
     يشير إلى قاعدة **التطوير** لا الاختبار. فخادمٌ متروكٌ بلا حقنٍ يخدم
     بياناتِ مدارسَ حقيقيةً على عنوانٍ محلّيٍّ تماماً.

     ولو وقع ذلك لكان أسوأ من عطل: الرحلاتُ تكتب في قاعدةٍ وعدّادُ الأثر يقرأ
     من أخرى، فتخرج تقاريرُ كلُّها «صفرٌ فصفر» — طمأنينةٌ كاذبةٌ تماماً.

     فنسأل الخادمَ عن نفسه: مَن المستخدم الذي يحمل هذا التوكن؟ ثمّ نبحث عنه في
     القاعدة التي نقيس عليها. فإن لم يكن هو هو، فالطرفان قاعدتان لا قاعدة. */
  const identity = await verifyServingBackend()
  if (identity.blocker) blockers.push(identity.blocker)
  if (identity.warning) warnings.push(identity.warning)

  if (blockers.length > 0) {
    throw new Error(
      [
        'توقّف: بيئةُ الرحلات ليست آمنةً للكتابة.',
        '',
        ...blockers.map((b) => `  ✘ ${b}`),
        '',
        'الرحلات تكتب بياناتٍ حقيقية وتُطلق آثاراً. لن تعمل قبل إغلاق هذه المنافذ.',
      ].join('\n'),
    )
  }

  cached = {
    database: raw.database,
    appEnv: raw.app_env,
    queue: raw.queue,
    broadcast: raw.broadcast,
    broadcastHost: raw.broadcast_host,
    whatsappUrl: raw.whatsapp_url,
    mailer: raw.mailer,
    warnings,
  }
  return cached
}

interface ServedUser {
  id: number
  national_id: string
  school_id: number | null
  name?: string
}

/**
 * يتحقّق أنّ الخادم الذي يخدم عنوان الـAPI يقرأ من القاعدة التي نقيس عليها.
 *
 * الطريقة: نسأله `auth/me` بتوكن المدير المحفوظ (بلا دخولٍ جديد — محدِّدُ
 * المعدّل على `auth/login` عشرُ محاولاتٍ في الدقيقة، ولا يجوز أن يستهلك فحصُ
 * سلامةٍ واحدةً منها)، ثمّ نبحث عن **الصفّ نفسِه** في قاعدة الاختبار.
 *
 * وتُطابَق الهويّةُ الوطنية لا المعرّفُ وحده: قاعدتان مختلفتان قد تحملان
 * المعرّف ١١٣٩٨ لشخصين مختلفين تماماً، فالمعرّفُ وحده يمرّ على تسريبٍ صامت.
 */
async function verifyServingBackend(): Promise<{ blocker?: string; warning?: string }> {
  let token: string
  try {
    token = tokenOf('admin')
  } catch (error) {
    // جلسةٌ مفقودة: الرحلاتُ نفسُها ستسقط برسالةٍ أدقَّ من رسالتنا، فلا نُصادر
    // تشخيصَها — لكنّنا نقول صراحةً إنّ هُويّة الباك بقيت غيرَ مؤكَّدة.
    return {
      warning:
        'تعذّر التحقّق من هُويّة الباك العامل (لا جلسةَ إدارةٍ محفوظة): ' +
        (error instanceof Error ? error.message.split('\n')[0] : String(error)),
    }
  }

  const context = await playwrightRequest.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  try {
    const response = await context.get(apiUrl('auth/me'), { timeout: 30_000 })
    if (!response.ok()) {
      return {
        blocker:
          `الباك على ${apiUrl('auth/me')} ردّ ${response.status()} على توكن الإدارة المحفوظ. ` +
          'إمّا أنّ الخادم الذي يخدم هذا المنفذ ليس الخادمَ الذي سجّلنا دخولنا فيه (خادمٌ متروكٌ من تشغيلٍ سابق)، ' +
          'وإمّا أنّ الجلسة أُبطلت. أوقف كلّ خادمٍ على هذا المنفذ وأعد التشغيل بـ--serve.',
      }
    }

    const body = (await response.json()) as { data?: { user?: ServedUser }; user?: ServedUser }
    const served = body.data?.user ?? body.user
    if (!served?.id) {
      return { warning: 'استجابةُ auth/me بلا مستخدم — تعذّر تأكيد هُويّة الباك العامل.' }
    }

    const found = await phpJson<{ row: ServedUser | null }>(
      `['row' => \\DB::table('users')
          ->where('id', $__b['id'])
          ->first(['id', 'national_id', 'school_id', 'name'])]`,
      { id: served.id },
    )

    if (!found.row) {
      return {
        blocker:
          `الباك العامل يقول إنّ حاملَ التوكن هو المستخدم ${served.id} ` +
          `(${served.national_id ?? 'بلا هويّة'})، ولا وجودَ لهذا المعرّف في «${TEST_DATABASE}». ` +
          'أي أنّ الخادم الذي تخاطبه الرحلات على قاعدةٍ أخرى غير التي يقيس عليها عدّادُ الأثر — ' +
          'الأرجح خادمُ `artisan serve` متروكٌ بلا DB_DATABASE فيقرأ قاعدة التطوير. ' +
          'أوقف كلّ خادمٍ على المنفذ، ثمّ: npm run e2e:journeys -- --serve',
      }
    }

    if (String(found.row.national_id) !== String(served.national_id)) {
      return {
        blocker:
          `المستخدم ${served.id} في «${TEST_DATABASE}» هويّتُه ${found.row.national_id}، ` +
          `بينما الباك العامل يقول ${served.national_id} — قاعدتان مختلفتان تحملان المعرّف نفسَه. ` +
          'الرحلاتُ تكتب في واحدةٍ ونقيس في الأخرى. أوقف الخوادم المتروكة وأعد التشغيل بـ--serve.',
      }
    }

    return {}
  } catch (error) {
    return {
      warning:
        'تعذّر سؤالُ الباك عن هُويّته: ' + (error instanceof Error ? error.message.split('\n')[0] : String(error)),
    }
  } finally {
    await context.dispose()
  }
}

/** سطرٌ عربيٌّ يصف البيئة — لرأس التقرير */
export function describeEnvironment(facts: EnvironmentFacts): string {
  return [
    `القاعدة ${facts.database}`,
    `البيئة ${facts.appEnv}`,
    `الطابور ${facts.queue}`,
    `البثّ ${facts.broadcast}${facts.broadcastHost ? ` (${facts.broadcastHost})` : ''}`,
    `بوّابة الواتساب ${facts.whatsappUrl}`,
    `البريد ${facts.mailer}`,
  ].join(' · ')
}
