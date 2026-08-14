/**
 * المُبلِّغ — هذا هو المنتَج، لا الاختبارات.
 *
 * المالك لا يريد «FAIL: /admin/import». يريد أن يعرف **ما هو المتعطّل**
 * وكيف يبدو. فالنبرة تشخيصية: جملةٌ تصف العطل كما يراه المستخدم، ثم اللقطة.
 * والأرقام تأتي بعد الحكاية لا قبلها.
 *
 * يُخرج ملفّين في e2e/report/:
 *   • تقرير-الزحف.md    — نصٌّ عربيٌّ مرتَّبٌ بالخطورة
 *   • تقرير-الزحف.html  — ذاتيّ الاحتواء، اللقطات مضمَّنة، يُفتح بالنقر
 */

import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { crawlerConfig } from '../config/crawler.config'
import { isBroken, isSuspicious, severityRank, worstSeverity, type PageResult } from '../crawl/findings'
import { loadInventory } from '../inventory'

interface RoleStatus {
  role: string
  ok: boolean
  reason?: string
  userName?: string
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'الإدارة',
  teacher: 'المعلم',
  'super-admin': 'المشرف العام',
  guardian: 'وليّ الأمر',
  public: 'زائر (بلا دخول)',
}

export default class CrawlerReporter implements Reporter {
  /**
   * نتيجةٌ واحدةٌ لكلّ صفحة، مفتاحُها «الدور + العنوان».
   *
   * لماذا خريطةٌ لا قائمة؟ لأن Playwright يعيد المحاولة عند الفشل، وكلُّ
   * محاولةٍ تُرسل مرفقتَها. ولو جمعناها كلَّها لظهرت الصفحةُ المعطّلة مرّتين
   * في التقرير، ولانتفخ العدّاد: «فُحصت ١٤٦ صفحة» والصفحاتُ ١٤٠.
   * ولا يُحتمل أن يكذب تقريرُ فحصٍ في عدده.
   *
   * ونحتفظ بالأخيرة لا بالأولى: هي المحاولةُ الحاسمة عند Playwright. فصفحةٌ
   * سقطت لتذبذبٍ عابرٍ ثم نجحت هي صفحةٌ سليمة — مع ذكرِ تذبذبها.
   */
  private pages = new Map<string, PageResult>()
  /** صفحاتٌ فشلت ثم نجحت — ليست معطّلةً لكنّها ليست مستقرّة */
  private flaky = new Set<string>()
  private startedAt = new Date()

  onBegin(_config: FullConfig): void {
    this.startedAt = new Date()
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (attachment.name !== 'crawl-result' || !attachment.body) continue
      try {
        const page = JSON.parse(attachment.body.toString('utf8')) as PageResult
        const key = `${page.role}::${page.url}`
        if (this.pages.has(key)) this.flaky.add(key)
        this.pages.set(key, page)
      } catch {
        /* مرفقةٌ تالفة — نتجاهلها بدل إسقاط التقرير كلِّه */
      }
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    mkdirSync(crawlerConfig.reportDir, { recursive: true })

    const inventory = loadInventory()
    const roleStatuses = this.readRoleStatuses()
    const collected = [...this.pages.values()]

    // فرزٌ بالخطورة ثم بالدور: أوّلُ ما تراه هو أسوأُ ما وُجد
    const sorted = [...collected].sort((a, b) => {
      const sa = worstSeverity(a.findings)
      const sb = worstSeverity(b.findings)
      const ra = sa ? severityRank[sa] : 99
      const rb = sb ? severityRank[sb] : 99
      if (ra !== rb) return ra - rb
      return a.url.localeCompare(b.url, 'ar')
    })

    const stats = {
      total: collected.length,
      healthy: collected.filter((p) => p.findings.length === 0).length,
      broken: collected.filter(isBroken).length,
      suspicious: collected.filter(isSuspicious).length,
      skipped: inventory.skipped.length,
      buttonsClicked: collected.reduce((sum, p) => sum + p.buttonsProbed.length, 0),
      buttonsBlocked: collected.reduce((sum, p) => sum + p.buttonsSkipped.length, 0),
      /** نجحت بعد فشل: تذبذبٌ يستحقّ الذكر لا عطلاً يستحقّ الإنذار */
      flaky: [...this.flaky].filter((key) => {
        const page = this.pages.get(key)
        return page !== undefined && page.findings.length === 0
      }).length,
    }

    const markdown = this.buildMarkdown(sorted, stats, inventory, roleStatuses)
    const mdPath = path.join(crawlerConfig.reportDir, 'تقرير-الزحف.md')
    writeFileSync(mdPath, markdown, 'utf8')

    const html = this.buildHtml(sorted, stats, inventory, roleStatuses)
    const htmlPath = path.join(crawlerConfig.reportDir, 'تقرير-الزحف.html')
    writeFileSync(htmlPath, html, 'utf8')

    writeFileSync(
      crawlerConfig.resultsFile,
      JSON.stringify({ startedAt: this.startedAt, pages: sorted, stats, inventory, roleStatuses }, null, 2),
      'utf8',
    )

    // خلاصةٌ في الطرفية: من يشغّل الزاحف يعرف النتيجة قبل أن يفتح ملفّاً
    const line = '─'.repeat(56)
    console.log(`\n${line}`)
    console.log('  خلاصة زحف «الرائد»')
    console.log(line)
    console.log(`  فُحصت    : ${stats.total} صفحة`)
    console.log(`  سليمة    : ${stats.healthy}`)
    console.log(`  معطّلة   : ${stats.broken}`)
    console.log(`  مشبوهة   : ${stats.suspicious}`)
    console.log(`  متخطّاة  : ${stats.skipped}`)
    if (stats.flaky > 0) console.log(`  متذبذبة  : ${stats.flaky} (فشلت ثم نجحت بالإعادة)`)
    if (stats.broken > 0) {
      console.log('\n  أخطر ما وُجد:')
      for (const page of sorted.filter(isBroken).slice(0, 8)) {
        const first = page.findings.find((f) => f.severity === 'عطل')
        console.log(`    · ${page.url} — ${first?.detail ?? ''}`)
      }
    }
    console.log(`\n  التقرير: ${htmlPath}`)
    console.log(`${line}\n`)
  }

  private readRoleStatuses(): RoleStatus[] {
    const file = path.join(crawlerConfig.authStateDir, 'roles-status.json')
    if (!existsSync(file)) return []
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as RoleStatus[]
    } catch {
      return []
    }
  }

  /* ══════════════════════════════════════════════════════════
     Markdown
     ══════════════════════════════════════════════════════════ */

  private buildMarkdown(
    pages: PageResult[],
    stats: Record<string, number>,
    inventory: ReturnType<typeof loadInventory>,
    roleStatuses: RoleStatus[],
  ): string {
    const out: string[] = []
    const when = this.startedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })

    out.push('# تقرير زحف منصّة «الرائد»')
    out.push('')
    out.push(`> فحصٌ آليٌّ بالمتصفّح — ${when}`)
    out.push(`> الهدف: \`${crawlerConfig.baseURL}\` · الـ API: \`${crawlerConfig.apiBaseURL}\``)
    out.push('')

    /* ── الحكم ── */
    out.push('## الحكم بإيجاز')
    out.push('')
    if (stats.broken === 0 && stats.suspicious === 0) {
      out.push(`فُتحت **${stats.total}** صفحة، ولم يظهر عطلٌ في أيٍّ منها.`)
    } else if (stats.broken === 0) {
      out.push(
        `فُتحت **${stats.total}** صفحة. لا عطلَ مؤكَّداً، لكنّ **${stats.suspicious}** منها ` +
          'أظهرت ما يستحقّ نظرة (نداءٌ مرفوض أو خطأٌ في وحدة التحكّم).',
      )
    } else {
      out.push(
        `فُتحت **${stats.total}** صفحة، و**${stats.broken}** منها معطّلةٌ فعلاً — ` +
          'شاشةٌ بيضاء أو انهيارٌ أو خادمٌ ردّ بخطأ. ' +
          `وإضافةً إليها **${stats.suspicious}** صفحةً مشبوهة.`,
      )
    }
    out.push('')
    out.push('| المؤشّر | العدد |')
    out.push('| --- | ---: |')
    out.push(`| صفحاتٌ فُحصت | ${stats.total} |`)
    out.push(`| سليمة تماماً | ${stats.healthy} |`)
    out.push(`| معطّلة | ${stats.broken} |`)
    out.push(`| مشبوهة | ${stats.suspicious} |`)
    out.push(`| متخطّاة (لم تُفحص) | ${stats.skipped} |`)
    if (stats.flaky > 0) {
      out.push(`| متذبذبة (فشلت ثم نجحت بالإعادة) | ${stats.flaky} |`)
    }
    out.push(`| أزرارٌ جُرّبت | ${stats.buttonsClicked} |`)
    out.push(`| أزرارٌ مُنعت عمداً | ${stats.buttonsBlocked} |`)
    out.push('')

    /* ── الأدوار ── */
    const failedRoles = roleStatuses.filter((r) => !r.ok)
    if (failedRoles.length > 0) {
      out.push('## أدوارٌ تعذّر الدخول بها')
      out.push('')
      out.push('صفحات هذه الأدوار **لم تُفحص إطلاقاً**. التقرير أدناه لا يقول عنها شيئاً — لا سلامةً ولا عطلاً.')
      out.push('')
      for (const role of failedRoles) {
        out.push(`- **${ROLE_LABEL[role.role] ?? role.role}** — ${role.reason ?? 'سببٌ غير معروف'}`)
      }
      out.push('')
    }

    /* ── عناصر التنقّل المعطوبة ── */
    if (inventory.orphanNav.length > 0) {
      out.push('## عناصر تنقّلٍ تقود إلى العدم')
      out.push('')
      out.push('هذه عناصرُ موجودةٌ في القائمة الجانبية، ولا مسارَ في الراوتر يطابقها. من يضغطها يرى «الصفحة غير موجودة».')
      out.push('')
      out.push('| العنصر | يقود إلى | المجموعة |')
      out.push('| --- | --- | --- |')
      for (const item of inventory.orphanNav) {
        out.push(`| ${item.label} | \`${item.to}\` | ${item.group} |`)
      }
      out.push('')
    }

    /* ── الأعطال ── */
    const brokenPages = pages.filter(isBroken)
    if (brokenPages.length > 0) {
      out.push('## الأعطال')
      out.push('')
      for (const page of brokenPages) {
        out.push(`### ${page.url}`)
        out.push('')
        out.push(`*الدور: ${ROLE_LABEL[page.role] ?? page.role} · المكوّن: \`${page.element}\` · التحميل: ${(page.durationMs / 1000).toFixed(1)}ث*`)
        out.push('')
        for (const finding of page.findings.filter((f) => f.severity === 'عطل')) {
          out.push(`- **${finding.kind}** — ${finding.detail}`)
          if (finding.technical) out.push(`  <br>\`${finding.technical.split('\n')[0]}\``)
        }
        if (page.screenshot) {
          out.push('')
          out.push(`![لقطة ${page.url}](${page.screenshot})`)
        }
        out.push('')
      }
    }

    /* ── المشبوه ── */
    const suspiciousPages = pages.filter(isSuspicious)
    if (suspiciousPages.length > 0) {
      out.push('## ما يستحقّ نظرة')
      out.push('')
      out.push('| الصفحة | الدور | النوع | التفصيل | اللقطة |')
      out.push('| --- | --- | --- | --- | --- |')
      for (const page of suspiciousPages) {
        for (const finding of page.findings.filter((f) => f.severity === 'مشبوه')) {
          const shot = page.screenshot ? `[لقطة](${page.screenshot})` : '—'
          out.push(
            `| \`${page.url}\` | ${ROLE_LABEL[page.role] ?? page.role} | ${finding.kind} | ${escapePipes(finding.detail)} | ${shot} |`,
          )
        }
      }
      out.push('')
    }

    /* ── المتخطّى ── */
    if (inventory.skipped.length > 0) {
      out.push('## صفحاتٌ لم تُفحص ولماذا')
      out.push('')
      out.push('تُذكر هنا صراحةً: إخفاؤها يجعل التقرير يبدو أشملَ ممّا هو، وصفحةٌ لم تُفحص ليست صفحةً سليمة.')
      out.push('')
      out.push('| المسار | الدور | السبب |')
      out.push('| --- | --- | --- |')
      for (const item of inventory.skipped) {
        out.push(`| \`${item.pattern}\` | ${ROLE_LABEL[item.audience] ?? item.audience} | ${escapePipes(item.reason)} |`)
      }
      out.push('')
    }

    /* ── السليم ── */
    const healthy = pages.filter((p) => p.findings.length === 0)
    if (healthy.length > 0) {
      out.push('<details>')
      out.push(`<summary>الصفحات السليمة (${healthy.length}) — اضغط للعرض</summary>`)
      out.push('')
      for (const page of healthy) {
        const buttons = page.buttonsProbed.length > 0 ? ` · جُرّب ${page.buttonsProbed.length} زرّاً` : ''
        out.push(`- \`${page.url}\` (${ROLE_LABEL[page.role] ?? page.role})${buttons}`)
      }
      out.push('')
      out.push('</details>')
      out.push('')
    }

    out.push('---')
    out.push('')
    out.push('*وُلِّد آلياً بعدّة زحف «الرائد». لتوسيع ترشيح الضجيج: `e2e/config/noise-filters.ts`.*')

    return out.join('\n')
  }

  /* ══════════════════════════════════════════════════════════
     HTML ذاتيّ الاحتواء
     ══════════════════════════════════════════════════════════ */

  private buildHtml(
    pages: PageResult[],
    stats: Record<string, number>,
    inventory: ReturnType<typeof loadInventory>,
    roleStatuses: RoleStatus[],
  ): string {
    const when = this.startedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
    const failedRoles = roleStatuses.filter((r) => !r.ok)

    /** يحوّل اللقطة إلى data: URI كي يبقى الملفّ ذاتيَّ الاحتواء */
    const embed = (relative?: string): string | null => {
      if (!relative) return null
      const full = path.join(crawlerConfig.reportDir, relative)
      if (!existsSync(full)) return null
      const mime = relative.endsWith('.png') ? 'image/png' : 'image/jpeg'
      try {
        return `data:${mime};base64,${readFileSync(full).toString('base64')}`
      } catch {
        return null
      }
    }

    const verdict =
      stats.broken === 0 && stats.suspicious === 0
        ? `فُتحت ${stats.total} صفحة، ولم يظهر عطلٌ في أيٍّ منها.`
        : stats.broken === 0
          ? `فُتحت ${stats.total} صفحة. لا عطلَ مؤكَّداً، لكنّ ${stats.suspicious} منها أظهرت ما يستحقّ نظرة.`
          : `فُتحت ${stats.total} صفحة، و${stats.broken} منها معطّلةٌ فعلاً، و${stats.suspicious} مشبوهة.`

    const brokenPages = pages.filter(isBroken)
    const suspiciousPages = pages.filter(isSuspicious)
    const healthy = pages.filter((p) => p.findings.length === 0)

    const sections: string[] = []

    if (failedRoles.length > 0) {
      sections.push(`
      <section class="card warn">
        <h2>أدوارٌ تعذّر الدخول بها</h2>
        <p>صفحات هذه الأدوار <strong>لم تُفحص إطلاقاً</strong>. التقرير لا يقول عنها شيئاً — لا سلامةً ولا عطلاً.</p>
        <ul>${failedRoles
          .map((r) => `<li><strong>${esc(ROLE_LABEL[r.role] ?? r.role)}</strong> — ${esc(r.reason ?? '')}</li>`)
          .join('')}</ul>
      </section>`)
    }

    if (inventory.orphanNav.length > 0) {
      sections.push(`
      <section class="card warn">
        <h2>عناصر تنقّلٍ تقود إلى العدم</h2>
        <p>عناصرُ في القائمة الجانبية لا مسارَ يطابقها — من يضغطها يرى «الصفحة غير موجودة».</p>
        <table><thead><tr><th>العنصر</th><th>يقود إلى</th><th>المجموعة</th></tr></thead><tbody>
        ${inventory.orphanNav
          .map((i) => `<tr><td>${esc(i.label)}</td><td><code>${esc(i.to)}</code></td><td>${esc(i.group)}</td></tr>`)
          .join('')}
        </tbody></table>
      </section>`)
    }

    if (brokenPages.length > 0) {
      sections.push(`
      <section>
        <h2 class="sev-broken">الأعطال (${brokenPages.length})</h2>
        ${brokenPages
          .map((page) => {
            const shot = embed(page.screenshot)
            return `
          <article class="card broken">
            <h3><code>${esc(page.url)}</code></h3>
            <p class="meta">${esc(ROLE_LABEL[page.role] ?? page.role)} · المكوّن <code>${esc(page.element)}</code> · ${(page.durationMs / 1000).toFixed(1)} ثانية</p>
            <ul class="findings">
              ${page.findings
                .filter((f) => f.severity === 'عطل')
                .map(
                  (f) =>
                    `<li><span class="badge b-broken">${esc(f.kind)}</span> ${esc(f.detail)}${
                      f.technical ? `<pre>${esc(f.technical.slice(0, 500))}</pre>` : ''
                    }</li>`,
                )
                .join('')}
            </ul>
            ${shot ? `<img src="${shot}" alt="لقطة ${esc(page.url)}" loading="lazy">` : '<p class="meta">لا لقطة</p>'}
          </article>`
          })
          .join('')}
      </section>`)
    }

    if (suspiciousPages.length > 0) {
      sections.push(`
      <section>
        <h2 class="sev-susp">ما يستحقّ نظرة (${suspiciousPages.length})</h2>
        <div class="card">
        <table><thead><tr><th>الصفحة</th><th>الدور</th><th>النوع</th><th>التفصيل</th><th>لقطة</th></tr></thead><tbody>
        ${suspiciousPages
          .flatMap((page) =>
            page.findings
              .filter((f) => f.severity === 'مشبوه')
              .map((f) => {
                const shot = embed(page.screenshot)
                return `<tr>
                  <td><code>${esc(page.url)}</code></td>
                  <td>${esc(ROLE_LABEL[page.role] ?? page.role)}</td>
                  <td><span class="badge b-susp">${esc(f.kind)}</span></td>
                  <td>${esc(f.detail)}</td>
                  <td>${shot ? `<a href="${shot}" target="_blank">عرض</a>` : '—'}</td>
                </tr>`
              }),
          )
          .join('')}
        </tbody></table>
        </div>
      </section>`)
    }

    if (inventory.skipped.length > 0) {
      sections.push(`
      <section>
        <h2>صفحاتٌ لم تُفحص ولماذا (${inventory.skipped.length})</h2>
        <div class="card">
        <p class="meta">تُذكر صراحةً: صفحةٌ لم تُفحص ليست صفحةً سليمة.</p>
        <table><thead><tr><th>المسار</th><th>الدور</th><th>السبب</th></tr></thead><tbody>
        ${inventory.skipped
          .map(
            (s) =>
              `<tr><td><code>${esc(s.pattern)}</code></td><td>${esc(ROLE_LABEL[s.audience] ?? s.audience)}</td><td>${esc(s.reason)}</td></tr>`,
          )
          .join('')}
        </tbody></table>
        </div>
      </section>`)
    }

    if (healthy.length > 0) {
      sections.push(`
      <section>
        <details class="card">
          <summary><strong>الصفحات السليمة (${healthy.length})</strong></summary>
          <ul class="healthy">
            ${healthy
              .map(
                (p) =>
                  `<li><code>${esc(p.url)}</code> <span class="meta">${esc(ROLE_LABEL[p.role] ?? p.role)}${
                    p.buttonsProbed.length ? ` · جُرّب ${p.buttonsProbed.length} زرّاً` : ''
                  }</span></li>`,
              )
              .join('')}
          </ul>
        </details>
      </section>`)
    }

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تقرير زحف «الرائد»</title>
<style>
  :root {
    --bg: #FBFAF8; --card: #FFFFFF; --ink: #1F2A24; --muted: #6B7A72;
    --line: #E8E3D9; --deep: #24452F; --green: #2E7D46;
    --broken: #C43D3D; --broken-bg: #FBEAEA; --susp: #B7791F; --susp-bg: #FEF6E7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1rem 4rem; background: var(--bg); color: var(--ink);
    font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", system-ui, sans-serif;
    line-height: 1.75; font-size: 15px;
  }
  .wrap { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.9rem; margin: 0 0 .3rem; color: var(--deep); }
  h2 { font-size: 1.3rem; margin: 2.2rem 0 .8rem; color: var(--deep); }
  h3 { font-size: 1.05rem; margin: 0 0 .3rem; }
  .sub { color: var(--muted); font-size: .9rem; margin: 0 0 1.5rem; }
  .verdict {
    background: var(--deep); color: #EAF3EC; padding: 1.2rem 1.4rem;
    border-radius: 14px; font-size: 1.05rem; margin-bottom: 1.5rem;
  }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .7rem; margin-bottom: 1.5rem; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: .8rem 1rem; }
  .stat b { display: block; font-size: 1.6rem; line-height: 1.2; color: var(--deep); }
  .stat span { font-size: .8rem; color: var(--muted); }
  .stat.bad b { color: var(--broken); }
  .stat.warn b { color: var(--susp); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 1.2rem 1.4rem; margin-bottom: 1rem; }
  .card.broken { border-right: 4px solid var(--broken); }
  .card.warn { border-right: 4px solid var(--susp); background: var(--susp-bg); }
  .meta { color: var(--muted); font-size: .85rem; margin: .2rem 0 .8rem; }
  code { background: #F2F0EA; padding: .1rem .4rem; border-radius: 5px; font-size: .88em;
         font-family: ui-monospace, Consolas, monospace; direction: ltr; display: inline-block; }
  pre { background: #F7F5F0; border: 1px solid var(--line); border-radius: 8px; padding: .6rem .8rem;
        overflow-x: auto; font-size: .8rem; direction: ltr; text-align: left; margin: .5rem 0 0; }
  table { width: 100%; border-collapse: collapse; margin-top: .5rem; display: block; overflow-x: auto; }
  th, td { text-align: right; padding: .55rem .7rem; border-bottom: 1px solid var(--line); vertical-align: top; font-size: .9rem; }
  th { background: #F5F3EE; font-weight: 600; white-space: nowrap; }
  ul.findings { margin: .4rem 0; padding-inline-start: 1.1rem; }
  ul.findings li { margin-bottom: .6rem; }
  ul.healthy { columns: 2; column-gap: 2rem; padding-inline-start: 1.1rem; margin: .8rem 0 0; }
  ul.healthy li { break-inside: avoid; font-size: .88rem; margin-bottom: .25rem; }
  .badge { display: inline-block; padding: .1rem .5rem; border-radius: 999px; font-size: .78rem; font-weight: 600; }
  .b-broken { background: var(--broken-bg); color: var(--broken); }
  .b-susp { background: var(--susp-bg); color: var(--susp); }
  .sev-broken { color: var(--broken); }
  .sev-susp { color: var(--susp); }
  img { max-width: 100%; border: 1px solid var(--line); border-radius: 10px; margin-top: .8rem; display: block; }
  summary { cursor: pointer; }
  footer { color: var(--muted); font-size: .82rem; margin-top: 2.5rem; text-align: center; }
  @media (max-width: 700px) { ul.healthy { columns: 1; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>تقرير زحف منصّة «الرائد»</h1>
  <p class="sub">فحصٌ آليٌّ بالمتصفّح — ${esc(when)} · الهدف <code>${esc(crawlerConfig.baseURL)}</code></p>

  <div class="verdict">${esc(verdict)}</div>

  <div class="stats">
    <div class="stat"><b>${stats.total}</b><span>صفحاتٌ فُحصت</span></div>
    <div class="stat"><b>${stats.healthy}</b><span>سليمة</span></div>
    <div class="stat ${stats.broken > 0 ? 'bad' : ''}"><b>${stats.broken}</b><span>معطّلة</span></div>
    <div class="stat ${stats.suspicious > 0 ? 'warn' : ''}"><b>${stats.suspicious}</b><span>مشبوهة</span></div>
    <div class="stat"><b>${stats.skipped}</b><span>متخطّاة</span></div>
    <div class="stat"><b>${stats.buttonsClicked}</b><span>أزرارٌ جُرّبت</span></div>
  </div>

  ${sections.join('\n')}

  <footer>وُلِّد آلياً بعدّة زحف «الرائد» · لتوسيع ترشيح الضجيج: <code>e2e/config/noise-filters.ts</code></footer>
</div>
</body>
</html>`
  }
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapePipes(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
