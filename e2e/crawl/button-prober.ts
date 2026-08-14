/**
 * تجربة الأزرار — بعد استقرار الصفحة، نضغط الآمن منها ونعيد الرصد.
 *
 * الترتيب مقصود: نحكم على كلّ زرٍّ **قبل** أن نلمسه، ونجمع القرارات كلَّها،
 * ثم نضغط. ولا نضغط زرّاً لم يُثبَت أمانُه (انظر config/button-policy.ts).
 */

import type { Page } from '@playwright/test'
import { crawlerConfig } from '../config/crawler.config'
import { forbiddenSelectors, judgeButton, safeSelectors } from '../config/button-policy'
import type { Finding } from './findings'
import { collectFindings, snapshotContent, waitForContentSettled, type Collector } from './page-probe'

interface CandidateButton {
  index: number
  label: string
  verdict: { safe: boolean; reason: string }
}

/**
 * يمسح أزرار الصفحة ويحكم عليها داخل المتصفّح دفعةً واحدة.
 * الحكم في المتصفّح لا في Node: نحتاج `matches()` و`closest()` على العناصر
 * الحيّة، ونقلُ كلّ زرٍّ ذهاباً وإياباً بطيء.
 */
async function surveyButtons(page: Page): Promise<CandidateButton[]> {
  const raw = await page.evaluate(
    ({ forbidden, safe }) => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('button, [role="button"], [role="tab"]'),
      )

      return nodes.map((node, index) => {
        const rect = node.getBoundingClientRect()
        const style = window.getComputedStyle(node)
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'

        const label = (
          node.getAttribute('aria-label') ??
          node.getAttribute('title') ??
          node.innerText ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()

        let matchedForbiddenSelector: string | null = null
        for (const selector of forbidden) {
          try {
            if (node.matches(selector) || node.closest(selector) !== null) {
              matchedForbiddenSelector = selector
              break
            }
          } catch {
            // محدّدٌ غير مدعوم في هذا المتصفّح (مثل :has القديمة) — نتجاوزه
          }
        }

        let matchedSafeSelector: string | null = null
        for (const selector of safe) {
          try {
            if (node.matches(selector)) {
              matchedSafeSelector = selector
              break
            }
          } catch {
            /* تجاهُل */
          }
        }

        return {
          index,
          label,
          visible,
          matchedForbiddenSelector,
          matchedSafeSelector,
          insideForm: node.closest('form') !== null,
        }
      })
    },
    { forbidden: forbiddenSelectors, safe: safeSelectors },
  )

  return raw
    .filter((item) => item.visible)
    .map((item) => ({
      index: item.index,
      label: item.label,
      verdict: item.visible
        ? judgeButton({
            label: item.label,
            matchedForbiddenSelector: item.matchedForbiddenSelector,
            matchedSafeSelector: item.matchedSafeSelector,
            insideForm: item.insideForm,
          })
        : { safe: false, reason: 'غير مرئيّ' },
    }))
}

export interface ButtonProbeOutcome {
  findings: Finding[]
  probed: Array<{ label: string; outcome: string }>
  skipped: Array<{ label: string; reason: string }>
}

/**
 * يضغط الأزرار الآمنة واحداً واحداً، ويرصد ما بعد كلّ ضغطة، ثم يعيد الحالة.
 *
 * «إعادة الحالة» تعني: إغلاق ما فُتح (Escape للمودالات)، والتأكّد من أنّنا ما
 * زلنا على العنوان نفسه. إن غادرت الضغطةُ الصفحة فنعود إليها — وإلا فحصنا
 * الأزرار التالية على صفحةٍ أخرى وأسندنا نتائجها للصفحة الخطأ.
 */
export async function probeButtons(
  page: Page,
  collector: Collector,
  originUrl: string,
): Promise<ButtonProbeOutcome> {
  const findings: Finding[] = []
  const probed: Array<{ label: string; outcome: string }> = []
  const skipped: Array<{ label: string; reason: string }> = []

  if (!crawlerConfig.probeButtons) {
    return { findings, probed, skipped }
  }

  let candidates: CandidateButton[]
  try {
    candidates = await surveyButtons(page)
  } catch {
    return { findings, probed, skipped }
  }

  for (const candidate of candidates) {
    if (!candidate.verdict.safe) {
      skipped.push({ label: candidate.label || '(زرّ بلا نصّ)', reason: candidate.verdict.reason })
    }
  }

  const safeOnes = candidates.filter((c) => c.verdict.safe).slice(0, crawlerConfig.maxButtonsPerPage)

  for (const candidate of safeOnes) {
    collector.reset()

    try {
      // نعيد تحديد العنصر بالفهرس في كل دورة: الرسم قد يكون بدّل العقد
      const handle = page.locator('button, [role="button"], [role="tab"]').nth(candidate.index)
      if ((await handle.count()) === 0) {
        probed.push({ label: candidate.label, outcome: 'اختفى الزرّ قبل تجربته' })
        continue
      }

      await handle.click({ timeout: 4_000, trial: false })
      await page.waitForTimeout(crawlerConfig.buttonSettleMs)
      // الضغطة قد تُبحر إلى صفحةٍ أخرى: نمهلها حتى تستقرّ قبل الحكم، وإلا
      // أعلنّا «انهياراً بعد ضغطة» عن صفحةٍ ما زالت تُحمَّل.
      await waitForContentSettled(page)

      const snapshot = await snapshotContent(page)
      const after = collectFindings(collector, snapshot)

      if (after.length === 0) {
        probed.push({ label: candidate.label, outcome: 'سليم' })
      } else {
        const worst = after.find((f) => f.severity === 'عطل') ?? after[0]
        probed.push({ label: candidate.label, outcome: `أظهر: ${worst.detail}` })
        findings.push({
          kind: 'انهيار بعد ضغطة',
          severity: worst.severity,
          detail: `بعد الضغط على «${candidate.label}»: ${worst.detail}`,
          technical: worst.technical,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
      // تعذّر الضغط (عنصرٌ محجوب، تحرّك أثناء النقر) ليس عطلَ منتج
      probed.push({ label: candidate.label, outcome: `تعذّرت التجربة: ${message.slice(0, 120)}` })
    }

    // ── إعادة الحالة ──
    try {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(150)
      if (!page.url().includes(originUrl)) {
        await page.goto(originUrl, { waitUntil: 'domcontentloaded', timeout: crawlerConfig.pageTimeoutMs })
        await page.waitForTimeout(crawlerConfig.settleDelayMs)
      }
    } catch {
      // فشل الاستعادة: نتوقّف عن تجربة بقيّة الأزرار في هذه الصفحة بدل
      // إسناد نتائجَ مغلوطةٍ إليها.
      break
    }
  }

  return { findings, probed, skipped }
}
