/**
 * الحَلبة — كلُّ رحلةٍ تُكتب داخلها.
 *
 * ══ ما الذي تضمنه هذه الطبقة لكلّ رحلةٍ بلا أن تكتبها الرحلةُ بنفسها؟ ══
 *   ١) فحصُ سلامة البيئة قبل أوّل فعلٍ يكتب (قاعدةُ اختبار · طابورٌ خامد ·
 *      بوّابةُ واتساب محلّية) — ويسقط التشغيل إن لم تُغلق المنافذ.
 *   ٢) عدُّ الآثار الخارجية قبل الرحلة وبعدها، والحكمُ عليها. ورسالةٌ واحدة
 *      تخرج تُسقط الرحلة فوراً.
 *   ٣) تسجيلُ الخطوات والقياسات في مرفقةٍ يقرؤها المُبلِّغ فيبني تقريراً عربياً.
 *   ٤) لقطةُ شاشةٍ عند فشل أيّ خطوة، منسوبةً إلى الخطوة لا إلى الرحلة كلّها.
 *
 * ══ عقدُ الاستعمال ══
 * ```ts
 * import { test, expect } from './_support/journey'
 *
 * test.use({ storageState: sessionFile('admin') })
 *
 * test('عنوانٌ يصف ما تُثبته الرحلة', async ({ page, journey }) => {
 *   journey.about({ role: 'admin', purpose: 'يُثبت أنّ …' })
 *
 *   const count = await journey.measure('عدد الطلاب', () => api.students().then(s => s.length))
 *   await journey.step('إضافة طالب من الواجهة', async () => { … })
 *   await journey.confirm(count, () => api.students().then(s => s.length), +1, 'أضفنا طالباً واحداً')
 * })
 * ```
 * وكلُّ رحلةٍ تكتب **يجب** أن تُعلن ما تتوقّع اصطفافه في الطابور:
 * `journey.expectQueued('whatsapp', 1, 'رسالةُ الترحيب')` — أو لا شيء، وهو
 * الافتراض. والمخالفةُ تُسقط الرحلة عمداً: أثرٌ لم يُعلن أثرٌ لم يُلاحَظ.
 */

import { test as base, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { crawlerConfig } from '../../config/crawler.config'
import { installProductionShield } from '../../crawl/page-probe'
import {
  describeEffects,
  effectsDelta,
  leakMessage,
  readEffects,
  type EffectsSnapshot,
} from './external-effects'
import { assertDelta, type Measurement } from './measure'
import { assertSafeEnvironment, type EnvironmentFacts } from './safety'

export { expect }

/* ══════════════════════════════════════════════════════════════
   نموذج النتيجة — اللغة المشتركة بين الرحلات والمُبلِّغ
   ══════════════════════════════════════════════════════════════ */

export interface JourneyStepRecord {
  title: string
  ok: boolean
  durationMs: number
  /** رسالةُ الفشل بالعربية إن فشلت */
  detail?: string
  /** مسار اللقطة نسبةً لمجلّد التقرير */
  screenshot?: string
}

export interface JourneyMeasurementRecord {
  label: string
  before: number
  after: number | null
  expected: number | null
  ok: boolean
}

export interface JourneyResult {
  title: string
  file: string
  role: string
  /** ما تُثبته الرحلة — جملةٌ يقرؤها المالك بلا شرح */
  purpose: string
  ok: boolean
  durationMs: number
  steps: JourneyStepRecord[]
  measurements: JourneyMeasurementRecord[]
  notes: string[]
  /** ما أنشأته الرحلة على القاعدة — كي يعرف المالك ما بقي وما يحذف */
  created: string[]
  effectsBefore: EffectsSnapshot | null
  effectsAfter: EffectsSnapshot | null
  /** ما أعلنته الرحلة أنّه سيصطفّ */
  declaredQueues: Array<{ queue: string; count: number; why: string }>
  environment: EnvironmentFacts | null
  skippedReason: string | null
}

/**
 * ينزع رموز التلوين من رسائل Playwright.
 *
 * رسائلُ `expect` مصبوغةٌ برموز ANSI للطرفية. وهي في ملفّ Markdown أو HTML
 * حشوٌ يشوّه النصّ العربيّ: `[2mexpect([22m…`. فالتقرير يُقرأ بالعين لا بالطرفية.
 */
// eslint-disable-next-line no-control-regex
const ANSI = /\u001B\[[0-9;]*m/g
function stripAnsi(text: string): string {
  return text.replace(ANSI, '')
}

/* ══════════════════════════════════════════════════════════════
   المسجِّل
   ══════════════════════════════════════════════════════════════ */

export class Journey {
  private readonly steps: JourneyStepRecord[] = []
  private readonly measurements: JourneyMeasurementRecord[] = []
  private readonly notes: string[] = []
  private readonly createdItems: string[] = []
  private readonly declaredQueues: Array<{ queue: string; count: number; why: string }> = []
  private effectsBefore: EffectsSnapshot | null = null
  private effectsAfter: EffectsSnapshot | null = null
  private role = 'غير محدَّد'
  private purpose = ''
  private skippedReason: string | null = null
  private startedAt = Date.now()
  /** مضيفاتٌ غير محلّيةٍ حاولت الصفحةُ مناداتها — يملؤها درعُ الإنتاج */
  readonly leakedHosts: string[] = []

  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo,
    private readonly environment: EnvironmentFacts,
  ) {}

  /** يُعرّف الرحلة: بأيّ دورٍ تجري، وما الذي تُثبته */
  about(info: { role: string; purpose: string }): void {
    this.role = info.role
    this.purpose = info.purpose
  }

  /** ملاحظةٌ حرّةٌ تُذكر في التقرير — لما لا يصلح تأكيداً ويستحقّ القراءة */
  note(text: string): void {
    this.notes.push(text)
  }

  /** يسجّل ما أنشأته الرحلة على القاعدة (لن يُحذف — لكنه سيُذكر) */
  created(description: string): void {
    this.createdItems.push(description)
  }

  /**
   * يُعلن ما تتوقّع الرحلةُ اصطفافه في الطابور.
   * الإعلانُ شرط: مهمّةٌ تصطفّ بلا إعلانٍ تُسقط الرحلة، لأنّ أثراً كامناً لم
   * ينتبه له كاتبُ الرحلة هو تحديداً ما نبحث عنه.
   */
  expectQueued(queue: string, count: number, why: string): void {
    this.declaredQueues.push({ queue, count, why })
  }

  /** يسجّل أنّ الرحلة تخطّت نفسها بوعي (كبلوغ حدّ المحاولات) */
  markSkipped(reason: string): void {
    this.skippedReason = reason
  }

  /* ── الخطوات ── */

  /**
   * يشغّل خطوةً ويسجّل نتيجتها.
   *
   * يلتقط لقطةَ شاشةٍ عند الفشل **داخل الخطوة**: لقطةُ نهاية الاختبار تُظهر
   * الحالة بعد أن تكون الصفحة قد تغيّرت، فتُضلّل. أمّا اللقطة هنا فتُظهر
   * الشاشةَ كما كانت لحظةَ الفشل بالضبط.
   */
  async step<T>(title: string, body: () => Promise<T>): Promise<T> {
    const startedAt = Date.now()
    try {
      // `test.step` لا `testInfo.step`: الخطوة تظهر في تقرير Playwright وفي
      // الأثر (trace) مسمّاةً بالعربية، فيُقرأ الفشلُ من الأثر بلا فتح الشيفرة.
      const result = await test.step(title, body)
      this.steps.push({ title, ok: true, durationMs: Date.now() - startedAt })
      // بعد التسجيل لا قبله: خطوةٌ لا تُسجَّل خطوةٌ تختفي من التقرير
      this.assertBundleIsLocal()
      return result
    } catch (error) {
      const detail = stripAnsi(error instanceof Error ? error.message : String(error))
      const screenshot = await this.captureFailure(title)
      this.steps.push({
        title,
        ok: false,
        durationMs: Date.now() - startedAt,
        detail: detail.split('\n').slice(0, 8).join('\n'),
        screenshot,
      })
      // السببُ الجذريّ يتقدّم على العَرَض: حزمةٌ تخاطب خادماً خارجياً تُفشل
      // كلَّ تأكيدٍ بعدها برسائلَ مضلّلة («لم يظهر الجدول»)، والحقيقةُ أنّ
      // الصفحة لم تصل إلى بياناتها أصلاً. فنرمي السبب بدل العَرَض.
      this.assertBundleIsLocal()
      throw error
    }
  }

  /**
   * يرفض المضيَّ إن كانت الحزمة تخاطب خادماً غير محلّي.
   *
   * ══ لماذا هذا الفحص هنا وليس في الزاحف وحده ══
   * وقع هذا فعلاً في أوّل تشغيلٍ لهذه الرحلات: كان `dist/` مبنيّاً ببناءٍ عاديّ
   * لا بوضع e2e، فكانت الواجهة تنادي `api.brqq.site` — **خادمَ الإنتاج**.
   * وأنقذَنا يومَها أنّ توكن الجلسة محلّيٌّ فردّ الإنتاجُ 401 على كلّ نداء.
   * لكنّ ذلك حظٌّ لا تصميم: رحلةٌ لا جلسةَ لها — كرحلة التسجيل — كانت سترسل
   * `POST /schools/register` إلى الإنتاج فتُنشئ مدرسةً حقيقية.
   *
   * فالدرع يُجهض النداءَ في المتصفّح (الضمانة الصلبة)، وهذا الفحص يحوّل صمتَه
   * إلى رسالةٍ تقول السبب بدل أن يقرأ المطوّرُ «لم يظهر الجدول».
   */
  private assertBundleIsLocal(): void {
    if (this.leakedHosts.length === 0) return
    const hosts = [...new Set(this.leakedHosts)].join('، ')
    throw new Error(
      [
        `توقّف: الواجهة المقدَّمة تنادي «${hosts}» وهو خادمٌ غير محلّي.`,
        'أُجهضت النداءات في المتصفّح فلم يُكتب هناك شيء — لكنّ هذه الرحلة لا تصلح:',
        'الحزمة في dist/ مبنيّةٌ على عنوان API خارجيّ، والرحلات **تكتب**.',
        '',
        'أعد البناء بوضع الاختبار ثمّ أعد التشغيل:',
        '    npm run e2e:journeys -- --build --serve',
      ].join('\n'),
    )
  }

  private async captureFailure(stepTitle: string): Promise<string | undefined> {
    const safe = `${this.testInfo.title}--${stepTitle}`
      .replace(/[^a-zA-Z0-9؀-ۿ]+/g, '-')
      .slice(0, 110)
    const fileName = `${safe}.jpg`
    try {
      mkdirSync(crawlerConfig.screenshotDir, { recursive: true })
      await this.page.screenshot({
        path: path.join(crawlerConfig.screenshotDir, fileName),
        fullPage: false,
        type: 'jpeg',
        quality: 72,
        timeout: 10_000,
      })
      return `screenshots/${fileName}`
    } catch {
      // صفحةٌ مغلقةٌ أو ملاحةٌ جارية — الاكتشاف يبقى بلا صورة
      return undefined
    }
  }

  /* ── القياس ── */

  /** يأخذ الرقم **قبل** الفعل */
  async measure(label: string, read: () => Promise<number>): Promise<Measurement> {
    const before = await read()
    const measurement: Measurement = { label, before }
    this.measurements.push({ label, before, after: null, expected: null, ok: false })
    return measurement
  }

  /**
   * يأخذ الرقم **بعد** الفعل، ويؤكّد أنّ الفرق هو المُعلَن.
   * يُرجع القيمة الجديدة كي تُستعمل في تأكيداتٍ أخرى بلا قراءةٍ ثالثة.
   */
  async confirm(
    measurement: Measurement,
    read: () => Promise<number>,
    expectedDelta: number,
    why: string,
  ): Promise<number> {
    const after = await read()
    const record = this.measurements.find(
      (m) => m.label === measurement.label && m.before === measurement.before && m.after === null,
    )
    if (record) {
      record.after = after
      record.expected = expectedDelta
      record.ok = after - measurement.before === expectedDelta
    }
    assertDelta(measurement, after, expectedDelta, why)
    return after
  }

  /* ── دورة الحياة (تستدعيها التركيبة لا الرحلة) ── */

  async begin(): Promise<void> {
    this.startedAt = Date.now()
    this.effectsBefore = await readEffects()
  }

  /**
   * يُغلق الرحلة: يقيس الأثر، ويحكم، ويُرفق النتيجة.
   *
   * الترتيب مقصود: **تُرفَق النتيجة قبل أيّ حكم**. فلو رمينا أوّلاً لضاع
   * سجلُّ الرحلة كلِّه من التقرير في الحالة التي نحتاجه فيها أكثر ما نحتاج.
   *
   * ويُرجع الخطأ ولا يرميه: من يرمي في تفكيك التركيبة يمحو الفشلَ الأصليّ
   * ويضع فشلَه مكانه — فيقرأ المطوّر «أثرٌ غير مُعلَن» عن رحلةٍ سقطت لسببٍ
   * آخرَ تماماً. فالقرارُ لمن يعرف السياق: التركيبة.
   */
  async end(passed: boolean): Promise<Error | null> {
    this.effectsAfter = await readEffects().catch(() => null)

    const result: JourneyResult = {
      title: this.testInfo.title,
      file: path.basename(this.testInfo.file),
      role: this.role,
      purpose: this.purpose,
      ok: passed && this.steps.every((s) => s.ok),
      durationMs: Date.now() - this.startedAt,
      steps: this.steps,
      measurements: this.measurements,
      notes: this.notes,
      created: this.createdItems,
      effectsBefore: this.effectsBefore,
      effectsAfter: this.effectsAfter,
      declaredQueues: this.declaredQueues,
      environment: this.environment,
      skippedReason: this.skippedReason,
    }

    await this.testInfo.attach('journey-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })

    if (!this.effectsBefore || !this.effectsAfter) return null
    try {
      this.judgeEffects(this.effectsBefore, this.effectsAfter)
      return null
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error))
    }
  }

  /**
   * الحكم على الأثر الخارجيّ.
   *
   * ثلاثةُ أحكام:
   *   • رسالةُ واتساب سُجّلت، أو مهمّةٌ فشلت (أي: عاملٌ حيّ) ← عطلٌ جسيم، تسقط الرحلة.
   *   • مهامٌّ اصطفّت بلا إعلان ← تسقط الرحلة، لأنّ أثراً غيرَ ملحوظٍ هو ما نصطاده.
   *   • مهامٌّ اصطفّت بمقدارٍ يخالف المُعلَن ← تسقط الرحلة (إرسالٌ مكرَّرٌ غالباً).
   */
  private judgeEffects(before: EffectsSnapshot, after: EffectsSnapshot): void {
    const delta = effectsDelta(before, after)

    if (delta.hasLeak) {
      throw new Error(leakMessage(before, after))
    }

    // رحلةٌ تخطّت نفسها لم تفعل شيئاً، فلا معنى لمطالبتها بما أعلنت أنّها ستفعل.
    // (يبقى فحصُ التسريب أعلاه قائماً: التخطّي لا يُعفي من قياس ما خرج.)
    if (this.skippedReason !== null) return

    const declared = new Map<string, { count: number; why: string }>()
    for (const item of this.declaredQueues) {
      const current = declared.get(item.queue)
      declared.set(item.queue, {
        count: (current?.count ?? 0) + item.count,
        why: current ? `${current.why}؛ ${item.why}` : item.why,
      })
    }

    const problems: string[] = []
    for (const { queue, added } of delta.queuesTouched) {
      const expected = declared.get(queue)?.count ?? 0
      if (added !== expected) {
        problems.push(
          expected === 0
            ? `الطابور «${queue}» اصطفّت فيه ${added} مهمّةٍ لم تُعلنها الرحلة. ` +
              'إن كان ذلك متوقَّعاً فأعلنه: journey.expectQueued(«' + queue + '», ' + added + ', «السبب»).'
            : `الطابور «${queue}»: أُعلن ${expected} واصطفّ ${added} — ` +
              'الفارق يعني إمّا إرسالاً مكرَّراً وإمّا توقّعاً خاطئاً.',
        )
      }
    }
    for (const [queue, expectation] of declared) {
      const touched = delta.queuesTouched.find((q) => q.queue === queue)
      if (!touched && expectation.count !== 0) {
        problems.push(
          `الطابور «${queue}»: أُعلن ${expectation.count} (${expectation.why}) ولم تصطفّ فيه مهمّةٌ واحدة — ` +
            'إمّا أنّ الميزة لم تُطلق أثرها أصلاً، وإمّا أنّ التوقّع قديم.',
        )
      }
    }

    if (problems.length > 0) {
      throw new Error(
        ['الآثار المصطفّة لا تطابق ما أعلنته الرحلة:', ...problems.map((p) => `  • ${p}`), '', describeEffects(before, after)].join('\n'),
      )
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   التركيبة
   ══════════════════════════════════════════════════════════════ */

export const test = base.extend<{ journey: Journey }, { safeEnvironment: EnvironmentFacts }>({
  /**
   * فحصُ السلامة: مرّةً لكلّ عامل، تلقائياً، قبل أيّ رحلة.
   * `auto` مقصود: رحلةٌ تنسى استدعاءه هي رحلةٌ تكتب على بيئةٍ لم تُفحص.
   */
  /* المعامل الأوّل `{}` إلزاماً: Playwright يفحص نصَّ الدالّة ويرفض التركيبةَ
     إن لم يكن تفكيكَ كائن («First argument must use the object destructuring
     pattern») — فلا سبيل إلى إرضاء eslint بتسميته. أمّا الثاني فسُمّي `provide`
     لا `use` كي لا تظنّه قاعدةُ خطّافات React خطّافاً يُنادى خارج مكوّن. */
  safeEnvironment: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const facts = await assertSafeEnvironment()
      await provide(facts)
    },
    { scope: 'worker', auto: true },
  ],

  journey: async ({ page, safeEnvironment }, provide, testInfo) => {
    const journey = new Journey(page, testInfo, safeEnvironment)

    /* درعُ الإنتاج — مُعادٌ استعمالُه من عدّة الزحف بلا تعديل.
       الزاحف يقرأ فيكفيه أن يُبلّغ؛ والرحلات تكتب فتُوقفها الرسالةُ فوراً. */
    await installProductionShield(page, (host) => journey.leakedHosts.push(host))

    await journey.begin()

    let failure: unknown = null
    try {
      await provide(journey)
    } catch (error) {
      failure = error
    }

    // الإغلاق يقع مهما انتهت الرحلة: التقرير عن رحلةٍ فاشلةٍ هو المطلوب،
    // وقياسُ الأثر بعد فشلٍ أوجبُ منه بعد نجاح — الفشلُ في منتصف الطريق
    // يترك آثاراً أكثر لا أقلّ.
    const effectsError = await journey.end(failure === null)

    if (failure !== null) {
      // الفشلُ الأصليّ أولى بالعرض. ولو تسرّب أثرٌ فوقه فهو أخطر من أن يُبتلع:
      // يُصرَخ به في الطرفية، ويبقى مسجَّلاً في مرفقة الرحلة للتقرير.
      if (effectsError) console.error(`\n⚠ ${effectsError.message}\n`)
      throw failure
    }

    if (effectsError) throw effectsError
  },
})
