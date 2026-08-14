/**
 * يفتح تقرير الزحف في المتصفّح الافتراضي.
 *
 * `npm run e2e:report` — لا يحتاج المالك أن يبحث عن الملفّ في المجلّدات.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = path.dirname(fileURLToPath(import.meta.url))
const reportDir = process.env.E2E_REPORT_DIR ?? path.join(here, 'report')
const htmlReport = path.join(reportDir, 'تقرير-الزحف.html')

if (!existsSync(htmlReport)) {
  console.error('')
  console.error('  لا يوجد تقريرٌ بعد.')
  console.error(`  المتوقَّع في: ${htmlReport}`)
  console.error('')
  console.error('  شغّل الزحف أوّلاً:  npm run e2e')
  console.error('')
  process.exit(1)
}

const platform = process.platform
const [command, args] =
  platform === 'win32'
    ? ['cmd', ['/c', 'start', '', htmlReport]]
    : platform === 'darwin'
      ? ['open', [htmlReport]]
      : ['xdg-open', [htmlReport]]

console.log(`  فتحُ: ${htmlReport}`)
spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
