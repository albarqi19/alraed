/**
 * مُبلِّغ الرحلات — هذا هو المنتَج، لا الاختبارات.
 *
 * يجيب سؤال المالك: «هل جرّبوا الميزات فعلاً بعد الدخول؟». فالتقرير لا يقول
 * «٢ نجحا» بل يقول: «أضفتُ الطالبَ فلاناً بالهويّة كذا، فظهر في القائمة، وقرأه
 * الـAPI في المدرسة ٩٠١٢، وصار عددُ الطلاب ٨ بعد أن كان ٧ — ولم تخرج رسالةُ
 * واتساب واحدة».
 *
 * وأهمُّ جدولٍ فيه هو **جدول الأثر الخارجيّ**: رقمان قبل وبعد لكلّ رحلة. هو
 * الجواب المقيس على شرط المالك، لا وعدٌ بأنّ شيئاً لم يخرج.
 *
 * يُخرج ملفّين في مجلّد تقرير الرحلات:
 *   • تقرير-الرحلات.md    — نصٌّ عربيٌّ للقراءة في المحرّر
 *   • تقرير-الرحلات.html  — ذاتيّ الاحتواء، اللقطات مضمَّنة، يُفتح بالنقر
 *
 * (بُني على غرار `e2e/reporter/crawler-reporter.ts` ولم يُعَد استعمالُه: ذاك
 *  يقرأ مرفقة «crawl-result» ويبني حول «صفحةٍ فُتحت»، وهذا يبني حول «فعلٍ
 *  وُقع وأثرٍ ظهر». الشكلُ متقارب والمضمونُ مختلفٌ من جذره.)
 */

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { crawlerConfig } from '../../config/crawler.config'
import { describeEffects } from './external-effects'
import { describeEnvironment } from './safety'
import type { JourneyResult } from './journey'

export default class JourneyReporter implements Reporter {
  /**
   * نتيجةٌ واحدةٌ لكلّ رحلة، مفتاحُها الملفّ + العنوان.
   * خريطةٌ لا قائمة: لو أُعيدت محاولةٌ لظهرت الرحلةُ مرّتين وانتفخ العدّاد،
   * وتقريرُ فحصٍ يكذب في عدده لا يُحتمل.
   */
  private results = new Map<string, JourneyResult>()
  /** رحلاتٌ لم تُرفق نتيجةً أصلاً — سقطت قبل أن تبدأ */
  private crashed: Array<{ title: string; file: string; error: string }> = []
  private startedAt = new Date()

  onBegin(): void {
    this.startedAt = new Date()
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    let attached = false
    for (const attachment of result.attachments) {
      if (attachment.name !== 'journey-result' || !attachment.body) continue
      try {
        const journey = JSON.parse(attachment.body.toString('utf8')) as JourneyResult
        this.results.set(`${journey.file}::${journey.title}`, journey)
        attached = true
      } catch {
        /* مرفقةٌ تالفة — لا نُسقط التقرير كلَّه لأجلها */
      }
    }

    // رحلةٌ فشلت قبل أن تُرفق شيئاً (فشلُ التركيبة نفسِها: بيئةٌ غير آمنة،
    // جلسةٌ مفقودة…). إخفاؤها يجعل التقرير يبدو أشملَ ممّا هو.
    if (!attached && result.status !== 'skipped' && result.status !== 'passed') {
      this.crashed.push({
        title: test.title,
        file: path.basename(test.location.file),
        error: (result.error?.message ?? 'سببٌ غير معروف').split('\n').slice(0, 6).join('\n'),
      })
    }
  }

  async onEnd(): Promise<void> {
    mkdirSync(crawlerConfig.reportDir, { recursive: true })

    const journeys = [...this.results.values()].sort((a, b) => a.file.localeCompare(b.file, 'ar'))
    const green = journeys.filter((j) => j.ok && !j.skippedReason)
    const skipped = journeys.filter((j) => j.skippedReason)
    const failed = journeys.filter((j) => !j.ok && !j.skippedReason)

    const stats = {
      total: journeys.length + this.crashed.length,
      green: green.length,
      failed: failed.length + this.crashed.length,
      skipped: skipped.length,
      whatsappSent: journeys.reduce((sum, j) => sum + this.whatsappDelta(j), 0),
    }

    writeFileSync(
      path.join(crawlerConfig.reportDir, 'تقرير-الرحلات.md'),
      this.buildMarkdown(journeys, stats),
      'utf8',
    )
    writeFileSync(
      path.join(crawlerConfig.reportDir, 'تقرير-الرحلات.html'),
      this.buildHtml(journeys, stats),
      'utf8',
    )
    writeFileSync(
      path.join(crawlerConfig.reportDir, 'journey-results.json'),
      JSON.stringify({ startedAt: this.startedAt, journeys, crashed: this.crashed, stats }, null, 2),
      'utf8',
    )

    const line = '─'.repeat(60)
    console.log(`\n${line}`)
    console.log('  خلاصة رحلات «الرائد»')
    console.log(line)
    console.log(`  رحلاتٌ جرت : ${stats.total}`)
    console.log(`  خضراء     : ${stats.green}`)
    console.log(`  فاشلة     : ${stats.failed}`)
    if (stats.skipped > 0) console.log(`  متخطّاة   : ${stats.skipped}`)
    console.log(
      `  رسائل واتساب خرجت : ${stats.whatsappSent} ${stats.whatsappSent === 0 ? '(لا أثرَ خارجيّ — كما يجب)' : '⚠ تسريب!'}`,
    )
    for (const journey of failed) {
      const firstBad = journey.steps.find((s) => !s.ok)
      console.log(`\n  ✘ ${journey.title}`)
      if (firstBad) console.log(`    عند: ${firstBad.title} — ${firstBad.detail?.split('\n')[0] ?? ''}`)
    }
    for (const crash of this.crashed) {
      console.log(`\n  ✘ ${crash.title} (لم تبدأ)`)
      console.log(`    ${crash.error.split('\n')[0]}`)
    }
    console.log(`\n  التقرير: ${path.join(crawlerConfig.reportDir, 'تقرير-الرحلات.html')}`)
    console.log(`${line}\n`)
  }

  private whatsappDelta(journey: JourneyResult): number {
    if (!journey.effectsBefore || !journey.effectsAfter) return 0
    return Math.max(0, journey.effectsAfter.whatsappMessages - journey.effectsBefore.whatsappMessages)
  }

  /* ══════════════════════════════════════════════════════════
     Markdown
     ══════════════════════════════════════════════════════════ */

  private buildMarkdown(journeys: JourneyResult[], stats: Record<string, number>): string {
    const out: string[] = []
    const when = this.startedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
    const env = journeys.find((j) => j.environment)?.environment ?? null

    out.push('# تقرير رحلات منصّة «الرائد»')
    out.push('')
    out.push(`> رحلاتُ استعمالٍ حقيقيّ — ${when}`)
    out.push(`> الهدف: \`${crawlerConfig.baseURL}\` · الـ API: \`${crawlerConfig.apiBaseURL}\``)
    if (env) out.push(`> البيئة: ${describeEnvironment(env)}`)
    out.push('')

    out.push('## الفرق بين هذا التقرير وتقرير الزحف')
    out.push('')
    out.push(
      'تقريرُ الزحف يجيب: «هل تُفتح الصفحة؟». وهذا يجيب: «هل تعمل الميزة؟» — ' +
        'كلُّ رحلةٍ هنا **كتبت** بياناً حقيقياً ثم تحقّقت من ظهوره في الواجهة ومن ثباته في القاعدة.',
    )
    out.push('')

    /* ── الأثر الخارجيّ: أوّل ما يُقرأ ── */
    out.push('## الأثر الخارجيّ — هل خرج شيء؟')
    out.push('')
    if (stats.whatsappSent === 0) {
      out.push('**لم تخرج رسالةُ واتساب واحدة.** والرقمان أدناه قياسٌ لا وعد: عُدَّت الصفوف قبل كلّ رحلةٍ وبعدها.')
    } else {
      out.push(`**⚠ خرجت ${stats.whatsappSent} رسالة.** هذا عطلٌ جسيم — راجع الجدول أدناه فوراً.`)
    }
    out.push('')
    out.push('| الرحلة | رسائل واتساب (قبل ← بعد) | مهامُّ الطابور (قبل ← بعد) | ما أُعلن |')
    out.push('| --- | :---: | :---: | --- |')
    for (const journey of journeys) {
      const before = journey.effectsBefore
      const after = journey.effectsAfter
      const wa = before && after ? `${before.whatsappMessages} ← ${after.whatsappMessages}` : '—'
      const jobs = before && after ? `${before.queuedJobs} ← ${after.queuedJobs}` : '—'
      const declared =
        journey.declaredQueues.length > 0
          ? journey.declaredQueues.map((d) => `${d.queue}+${d.count} (${d.why})`).join('؛ ')
          : 'لا أثرَ متوقَّع'
      out.push(`| ${escapePipes(journey.title)} | ${wa} | ${jobs} | ${escapePipes(declared)} |`)
    }
    out.push('')
    out.push(
      '> «مهمّةٌ اصطفّت» ليست «رسالةٌ خرجت»: الطابور في بيئة الاختبار بلا عاملٍ يعمل عليه، ' +
        'فالمهامّ تتراكم ولا تُنفَّذ. لكنّها أثرٌ كامن — لو شُغّل عاملٌ على قاعدة الاختبار لخرجت.',
    )
    out.push('')

    /* ── الحكم ── */
    out.push('## الحكم بإيجاز')
    out.push('')
    out.push('| المؤشّر | العدد |')
    out.push('| --- | ---: |')
    out.push(`| رحلاتٌ جرت | ${stats.total} |`)
    out.push(`| خضراء (الميزة تعمل) | ${stats.green} |`)
    out.push(`| فاشلة | ${stats.failed} |`)
    if (stats.skipped > 0) out.push(`| متخطّاة بوعي | ${stats.skipped} |`)
    out.push('')

    if (this.crashed.length > 0) {
      out.push('## رحلاتٌ لم تبدأ')
      out.push('')
      out.push('سقطت قبل أن تفعل شيئاً — بيئةٌ غير آمنة أو جلسةٌ مفقودة. لا تقول شيئاً عن الميزة.')
      out.push('')
      for (const crash of this.crashed) {
        out.push(`- **${crash.title}** (\`${crash.file}\`)`)
        out.push(`  <br>\`${crash.error.split('\n')[0]}\``)
      }
      out.push('')
    }

    /* ── تفصيل كل رحلة ── */
    for (const journey of journeys) {
      const mark = journey.skippedReason ? '⏭' : journey.ok ? '✔' : '✘'
      out.push(`## ${mark} ${journey.title}`)
      out.push('')
      out.push(`*الدور: ${journey.role} · الملفّ: \`${journey.file}\` · المدّة: ${(journey.durationMs / 1000).toFixed(1)}ث*`)
      out.push('')
      if (journey.purpose) {
        out.push(`**ما تُثبته:** ${journey.purpose}`)
        out.push('')
      }
      if (journey.skippedReason) {
        out.push(`> ⏭ **تخطٍّ مُعلَن:** ${journey.skippedReason}`)
        out.push('')
      }

      if (journey.measurements.length > 0) {
        out.push('### القياسات (قبل ← بعد)')
        out.push('')
        out.push('| القياس | قبل | بعد | الفرق | المتوقَّع | |')
        out.push('| --- | ---: | ---: | ---: | ---: | :---: |')
        for (const m of journey.measurements) {
          const delta = m.after === null ? '—' : signed(m.after - m.before)
          const expected = m.expected === null ? '—' : signed(m.expected)
          out.push(
            `| ${escapePipes(m.label)} | ${m.before} | ${m.after ?? '—'} | ${delta} | ${expected} | ${m.ok ? '✔' : m.after === null ? '…' : '✘'} |`,
          )
        }
        out.push('')
      }

      out.push('### الخطوات')
      out.push('')
      for (const step of journey.steps) {
        out.push(`- ${step.ok ? '✔' : '✘'} ${step.title} *(${(step.durationMs / 1000).toFixed(1)}ث)*`)
        if (!step.ok && step.detail) {
          out.push('')
          out.push('  ```')
          out.push(...step.detail.split('\n').map((l) => `  ${l}`))
          out.push('  ```')
          out.push('')
        }
        if (step.screenshot) out.push(`  <br>![لقطة عند الفشل](${step.screenshot})`)
      }
      out.push('')

      if (journey.created.length > 0) {
        out.push('### ما أنشأته هذه الرحلة (باقٍ على قاعدة الاختبار)')
        out.push('')
        for (const item of journey.created) out.push(`- ${item}`)
        out.push('')
      }

      if (journey.notes.length > 0) {
        out.push('### ملاحظات')
        out.push('')
        for (const note of journey.notes) out.push(`- ${note}`)
        out.push('')
      }

      if (journey.effectsBefore && journey.effectsAfter) {
        out.push(`*الأثر: ${describeEffects(journey.effectsBefore, journey.effectsAfter)}*`)
        out.push('')
      }
    }

    if (env && env.warnings.length > 0) {
      out.push('## تنبيهاتُ بيئة')
      out.push('')
      for (const warning of env.warnings) out.push(`- ${warning}`)
      out.push('')
    }

    out.push('---')
    out.push('')
    out.push('*وُلِّد آلياً بعدّة رحلات «الرائد» — `npm run e2e:journeys`.*')

    return out.join('\n')
  }

  /* ══════════════════════════════════════════════════════════
     HTML ذاتيّ الاحتواء
     ══════════════════════════════════════════════════════════ */

  private buildHtml(journeys: JourneyResult[], stats: Record<string, number>): string {
    const when = this.startedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
    const env = journeys.find((j) => j.environment)?.environment ?? null

    const embed = (relative?: string): string | null => {
      if (!relative) return null
      const full = path.join(crawlerConfig.reportDir, relative)
      if (!existsSync(full)) return null
      try {
        return `data:image/jpeg;base64,${readFileSync(full).toString('base64')}`
      } catch {
        return null
      }
    }

    const leak = stats.whatsappSent > 0

    const effectRows = journeys
      .map((journey) => {
        const b = journey.effectsBefore
        const a = journey.effectsAfter
        const wa = b && a ? `${b.whatsappMessages} ← ${a.whatsappMessages}` : '—'
        const jobs = b && a ? `${b.queuedJobs} ← ${a.queuedJobs}` : '—'
        const grew = b && a && a.whatsappMessages > b.whatsappMessages
        const declared =
          journey.declaredQueues.length > 0
            ? journey.declaredQueues.map((d) => `${esc(d.queue)}+${d.count} <span class="meta">(${esc(d.why)})</span>`).join('؛ ')
            : '<span class="meta">لا أثرَ متوقَّع</span>'
        return `<tr>
          <td>${esc(journey.title)}</td>
          <td class="num ${grew ? 'bad' : 'good'}">${wa}</td>
          <td class="num">${jobs}</td>
          <td>${declared}</td>
        </tr>`
      })
      .join('')

    const journeySections = journeys
      .map((journey) => {
        const mark = journey.skippedReason ? '⏭' : journey.ok ? '✔' : '✘'
        const tone = journey.skippedReason ? 'skip' : journey.ok ? 'ok' : 'bad'

        const measurements =
          journey.measurements.length === 0
            ? ''
            : `<h4>القياسات — قبل ← بعد</h4>
               <table><thead><tr><th>القياس</th><th>قبل</th><th>بعد</th><th>الفرق</th><th>المتوقَّع</th><th></th></tr></thead><tbody>
               ${journey.measurements
                 .map(
                   (m) => `<tr>
                     <td>${esc(m.label)}</td>
                     <td class="num">${m.before}</td>
                     <td class="num">${m.after ?? '—'}</td>
                     <td class="num">${m.after === null ? '—' : esc(signed(m.after - m.before))}</td>
                     <td class="num">${m.expected === null ? '—' : esc(signed(m.expected))}</td>
                     <td class="num">${m.ok ? '<span class="tick">✔</span>' : m.after === null ? '…' : '<span class="cross">✘</span>'}</td>
                   </tr>`,
                 )
                 .join('')}
               </tbody></table>`

        const steps = journey.steps
          .map((step) => {
            const shot = embed(step.screenshot)
            return `<li class="${step.ok ? 'ok' : 'bad'}">
              <span class="tick-inline">${step.ok ? '✔' : '✘'}</span>
              ${esc(step.title)} <span class="meta">${(step.durationMs / 1000).toFixed(1)}ث</span>
              ${step.detail ? `<pre>${esc(step.detail)}</pre>` : ''}
              ${shot ? `<img src="${shot}" alt="لقطة عند الفشل" loading="lazy">` : ''}
            </li>`
          })
          .join('')

        const created =
          journey.created.length === 0
            ? ''
            : `<h4>ما أنشأته (باقٍ على قاعدة الاختبار)</h4><ul class="plain">${journey.created
                .map((c) => `<li>${esc(c)}</li>`)
                .join('')}</ul>`

        const notes =
          journey.notes.length === 0
            ? ''
            : `<h4>ملاحظات</h4><ul class="plain">${journey.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`

        return `<article class="card ${tone}">
          <h3>${mark} ${esc(journey.title)}</h3>
          <p class="meta">${esc(journey.role)} · <code>${esc(journey.file)}</code> · ${(journey.durationMs / 1000).toFixed(1)} ثانية</p>
          ${journey.purpose ? `<p class="purpose">${esc(journey.purpose)}</p>` : ''}
          ${journey.skippedReason ? `<p class="skipnote">⏭ تخطٍّ مُعلَن: ${esc(journey.skippedReason)}</p>` : ''}
          ${measurements}
          <h4>الخطوات</h4>
          <ul class="steps">${steps}</ul>
          ${created}
          ${notes}
          ${
            journey.effectsBefore && journey.effectsAfter
              ? `<p class="meta effect">${esc(describeEffects(journey.effectsBefore, journey.effectsAfter))}</p>`
              : ''
          }
        </article>`
      })
      .join('')

    const crashedSection =
      this.crashed.length === 0
        ? ''
        : `<section class="card warn">
            <h2>رحلاتٌ لم تبدأ (${this.crashed.length})</h2>
            <p>سقطت قبل أن تفعل شيئاً — بيئةٌ غير آمنة أو جلسةٌ مفقودة. لا تقول شيئاً عن الميزة.</p>
            <ul class="plain">${this.crashed
              .map((c) => `<li><strong>${esc(c.title)}</strong><pre>${esc(c.error)}</pre></li>`)
              .join('')}</ul>
          </section>`

    const warningsSection =
      !env || env.warnings.length === 0
        ? ''
        : `<section class="card warn">
            <h2>تنبيهاتُ بيئة</h2>
            <ul class="plain">${env.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
          </section>`

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تقرير رحلات «الرائد»</title>
<style>
  :root {
    --bg:#FBFAF8; --card:#FFFFFF; --ink:#1F2A24; --muted:#6B7A72;
    --line:#E8E3D9; --deep:#24452F; --green:#2E7D46;
    --bad:#C43D3D; --bad-bg:#FBEAEA; --warn:#B7791F; --warn-bg:#FEF6E7;
  }
  * { box-sizing:border-box; }
  body { margin:0; padding:2rem 1rem 4rem; background:var(--bg); color:var(--ink);
    font-family:"Segoe UI",Tahoma,"Noto Naskh Arabic",system-ui,sans-serif; line-height:1.75; font-size:15px; }
  .wrap { max-width:1100px; margin:0 auto; }
  h1 { font-size:1.9rem; margin:0 0 .3rem; color:var(--deep); }
  h2 { font-size:1.3rem; margin:2.2rem 0 .8rem; color:var(--deep); }
  h3 { font-size:1.05rem; margin:0 0 .3rem; }
  h4 { font-size:.92rem; margin:1.1rem 0 .3rem; color:var(--deep); }
  .sub { color:var(--muted); font-size:.9rem; margin:0 0 1.2rem; }
  .verdict { background:var(--deep); color:#EAF3EC; padding:1.2rem 1.4rem; border-radius:14px;
    font-size:1.05rem; margin-bottom:1.2rem; }
  .verdict.leak { background:var(--bad); }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.7rem; margin-bottom:1.5rem; }
  .stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:.8rem 1rem; }
  .stat b { display:block; font-size:1.6rem; line-height:1.2; color:var(--deep); }
  .stat span { font-size:.8rem; color:var(--muted); }
  .stat.bad b { color:var(--bad); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:1.2rem 1.4rem; margin-bottom:1rem; }
  .card.ok { border-right:4px solid var(--green); }
  .card.bad { border-right:4px solid var(--bad); }
  .card.skip { border-right:4px solid var(--warn); }
  .card.warn { border-right:4px solid var(--warn); background:var(--warn-bg); }
  .meta { color:var(--muted); font-size:.85rem; margin:.2rem 0 .6rem; }
  .purpose { margin:.2rem 0 .6rem; font-size:.95rem; }
  .skipnote { background:var(--warn-bg); border-radius:8px; padding:.5rem .8rem; font-size:.88rem; margin:.4rem 0; }
  code { background:#F2F0EA; padding:.1rem .4rem; border-radius:5px; font-size:.88em;
    font-family:ui-monospace,Consolas,monospace; direction:ltr; display:inline-block; }
  pre { background:#F7F5F0; border:1px solid var(--line); border-radius:8px; padding:.6rem .8rem;
    overflow-x:auto; font-size:.8rem; direction:rtl; text-align:right; margin:.5rem 0 0; white-space:pre-wrap; }
  table { width:100%; border-collapse:collapse; margin-top:.4rem; display:block; overflow-x:auto; }
  th,td { text-align:right; padding:.5rem .7rem; border-bottom:1px solid var(--line); vertical-align:top; font-size:.9rem; }
  th { background:#F5F3EE; font-weight:600; white-space:nowrap; }
  td.num { text-align:center; font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.good { color:var(--green); font-weight:700; }
  td.bad { color:var(--bad); font-weight:700; }
  ul.steps { list-style:none; padding:0; margin:.3rem 0 0; }
  ul.steps li { padding:.3rem 0; border-bottom:1px dashed var(--line); font-size:.92rem; }
  ul.steps li:last-child { border-bottom:none; }
  ul.steps li.bad { color:var(--bad); }
  ul.plain { padding-inline-start:1.1rem; margin:.3rem 0; font-size:.92rem; }
  .tick-inline { font-weight:700; margin-inline-end:.3rem; }
  li.ok .tick-inline { color:var(--green); }
  li.bad .tick-inline { color:var(--bad); }
  .tick { color:var(--green); font-weight:700; }
  .cross { color:var(--bad); font-weight:700; }
  .effect { border-top:1px solid var(--line); padding-top:.6rem; margin-top:1rem; }
  img { max-width:100%; border:1px solid var(--line); border-radius:10px; margin-top:.6rem; display:block; }
  footer { color:var(--muted); font-size:.82rem; margin-top:2.5rem; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <h1>تقرير رحلات منصّة «الرائد»</h1>
  <p class="sub">رحلاتُ استعمالٍ حقيقيّ — ${esc(when)} · الهدف <code>${esc(crawlerConfig.baseURL)}</code>${
    env ? `<br>${esc(describeEnvironment(env))}` : ''
  }</p>

  <div class="verdict ${leak ? 'leak' : ''}">
    ${
      leak
        ? `⚠ خرجت ${stats.whatsappSent} رسالة واتساب أثناء الرحلات. هذا عطلٌ جسيم — أوقف التشغيل وراجع جدول الأثر.`
        : `${stats.green} من ${stats.total} رحلةً أثبتت أنّ ميزتها تعمل فعلاً — كتبت بياناً وتحقّقت من ظهوره في الواجهة وثباته في القاعدة. ولم تخرج رسالةُ واتساب واحدة.`
    }
  </div>

  <div class="stats">
    <div class="stat"><b>${stats.total}</b><span>رحلاتٌ جرت</span></div>
    <div class="stat"><b>${stats.green}</b><span>خضراء</span></div>
    <div class="stat ${stats.failed > 0 ? 'bad' : ''}"><b>${stats.failed}</b><span>فاشلة</span></div>
    <div class="stat ${stats.whatsappSent > 0 ? 'bad' : ''}"><b>${stats.whatsappSent}</b><span>رسائل خرجت</span></div>
  </div>

  <section>
    <h2>الأثر الخارجيّ — هل خرج شيء؟</h2>
    <div class="card">
      <p class="meta">قياسٌ لا وعد: عُدَّت صفوف <code>whatsapp_messages</code> ومهامُّ الطابور قبل كلّ رحلةٍ وبعدها.</p>
      <table><thead><tr><th>الرحلة</th><th>رسائل واتساب (قبل ← بعد)</th><th>مهامُّ الطابور</th><th>ما أُعلن</th></tr></thead>
      <tbody>${effectRows}</tbody></table>
      <p class="meta">«مهمّةٌ اصطفّت» ليست «رسالةٌ خرجت»: الطابور بلا عاملٍ يعمل عليه، فالمهامّ تتراكم ولا تُنفَّذ — لكنّها أثرٌ كامن.</p>
    </div>
  </section>

  ${crashedSection}

  <section>
    <h2>الرحلات بالتفصيل</h2>
    ${journeySections}
  </section>

  ${warningsSection}

  <footer>وُلِّد آلياً بعدّة رحلات «الرائد» · <code>npm run e2e:journeys</code></footer>
</div>
</body>
</html>`
  }
}

function signed(n: number): string {
  if (n === 0) return 'بلا تغيير'
  return n > 0 ? `+${n}` : String(n)
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapePipes(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
