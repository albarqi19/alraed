/**
 * الزحف كاملاً بأمرٍ واحد:  npm run e2e:all
 *
 * الطريقة اليدوية خمسُ خطواتٍ في ثلاث نوافذ: تهيئة قاعدة الاختبار، ثمّ البذرة،
 * ثمّ خادم الباك، ثمّ بناءُ الفرونت بوضع e2e وتقديمُه، ثمّ الزحف. ونسيانُ خطوةٍ
 * واحدة لا يُنتج خطأً واضحاً بل **تقريراً كاذباً**: تنسى البناء بوضع e2e فتزحف
 * على واجهةٍ تخاطب الإنتاج، أو تنسى البذرة فتُقرأ الصفحات الفارغة «سليمة».
 *
 * فهذا السكربت يفعلها بالترتيب، ويتحقّق من كل خطوةٍ قبل التالية، وينظّف بعده
 * مهما انتهى — بنجاحٍ أو فشلٍ أو Ctrl+C.
 *
 * الأعلام:
 *   --skip-seed     لا تُعد بذر القاعدة (أسرع حين تكرّر التشغيل)
 *   --skip-build    لا تُعد بناء الفرونت (أسرع حين لم يتغيّر src)
 *   --no-buttons    زحفُ تحميلٍ فقط بلا ضغط أزرار — أسرع بكثير
 *   --open          افتح التقرير عند الانتهاء
 *   --headed        أظهر المتصفّح وهو يعمل
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontRoot = path.resolve(here, '..')
const backRoot = path.resolve(frontRoot, '..')

const args = new Set(process.argv.slice(2))
const flag = (name) => args.has(name)

// ── ثوابت التشغيل ───────────────────────────────────────────────────────────
// 127.0.0.1 صراحةً لا localhost: على ويندوز يُحلّ الأخير إلى IPv6 أوّلاً، وقد
// يكون المنفذ محجوزاً هناك بمشروعٍ آخر — وهو خطأٌ كلّفنا تقريراً كاذباً كاملاً.
const API_PORT = Number(process.env.E2E_API_PORT ?? 8010)
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3000)
const API_HOST = '127.0.0.1'
const TEST_DB = process.env.E2E_DB ?? 'attendance_system_test'

const apiBase = `http://${API_HOST}:${API_PORT}/api`
const webBase = `http://${API_HOST}:${WEB_PORT}`
const seedFile = path.join(here, 'generated', 'seed-payload.json')

const children = []
let cleaned = false

// ── أدوات ───────────────────────────────────────────────────────────────────
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
}

let stepNo = 0
function step(title) {
  stepNo += 1
  console.log('')
  console.log(c.bold(`  [${stepNo}] ${title}`))
}

function fail(message, hint) {
  console.error('')
  console.error(c.red(`  ✘ ${message}`))
  if (hint) console.error(c.dim(`    ${hint}`))
  console.error('')
  cleanup()
  process.exit(1)
}

/** يشغّل أمراً وينتظره. يُرجع stdout عند النجاح، ويُسقط التشغيل عند الفشل. */
function run(cmd, cmdArgs, { cwd, env, capture = false, label } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    })
    let out = ''
    if (capture) child.stdout.on('data', (d) => { out += d.toString() })
    child.on('error', (e) => fail(`تعذّر تشغيل ${label ?? cmd}: ${e.message}`))
    child.on('close', (code) => {
      if (code !== 0) fail(`${label ?? cmd} انتهى بالرمز ${code}`)
      resolve(out)
    })
  })
}

/** يشغّل خادماً في الخلفية ويسجّله للتنظيف. */
function serve(cmd, cmdArgs, { cwd, env, name }) {
  const child = spawn(cmd, cmdArgs, {
    cwd,
    env: { ...process.env, ...env },
    shell: true,
    stdio: 'ignore',
    detached: false,
  })
  child.on('error', (e) => fail(`تعذّر تشغيل ${name}: ${e.message}`))
  children.push({ child, name })
  return child
}

/** ينتظر استجابة عنوانٍ حتى مهلة. */
async function waitFor(url, { timeoutMs = 90_000, name }) {
  const deadline = Date.now() + timeoutMs
  let lastError = ''
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      // أيّ ردٍّ من الخادم يكفي — حتى 404. المهم أنّ المقبس يستجيب.
      if (res.status > 0) return
    } catch (e) {
      lastError = e?.message ?? String(e)
    }
    await new Promise((r) => setTimeout(r, 700))
  }
  fail(
    `${name} لم يستجب خلال ${Math.round(timeoutMs / 1000)} ثانية`,
    `العنوان: ${url}\n    آخر خطأ: ${lastError}\n    تحقّق أنّ المنفذ حرّ:  netstat -ano | findstr :${new URL(url).port}`,
  )
}

function cleanup() {
  if (cleaned) return
  cleaned = true
  for (const { child, name } of children) {
    try {
      if (process.platform === 'win32') {
        // القتل بالشجرة: الخادم يعمل تحت shell، وقتلُ الأب وحده يترك الحفيد حيّاً
        // محتجزاً المنفذ — فيفشل التشغيل التالي برسالةٍ لا تدلّ على السبب.
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
      } else {
        process.kill(-child.pid, 'SIGTERM')
      }
    } catch {
      // الخادم مات أصلاً — لا شيء نفعله
    }
    console.log(c.dim(`    أُوقف: ${name}`))
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { console.log(''); cleanup(); process.exit(130) })
}
process.on('exit', cleanup)

// ── التشغيل ─────────────────────────────────────────────────────────────────
console.log('')
console.log(c.bold('  زحف منصّة «الرائد» — تشغيلٌ كامل'))
console.log(c.dim(`  الواجهة ${webBase}  ·  الـAPI ${apiBase}  ·  القاعدة ${TEST_DB}`))

if (!TEST_DB.endsWith('_test')) {
  fail(
    `القاعدة «${TEST_DB}» لا ينتهي اسمُها بـ_test`,
    'الزاحف يضغط أزراراً ويكتب بيانات. لن يعمل إلا على قاعدة اختبار.',
  )
}

// ١) قاعدة الاختبار
if (!flag('--skip-seed')) {
  step('تهيئة قاعدة الاختبار وبذرها')
  await run('php', ['artisan', 'test:setup-database'], {
    cwd: backRoot, env: { DB_DATABASE: TEST_DB }, label: 'test:setup-database',
  })
  const json = await run('php', ['artisan', 'e2e:seed', '--quiet-seeders'], {
    cwd: backRoot, env: { DB_DATABASE: TEST_DB }, capture: true, label: 'e2e:seed',
  })
  const trimmed = json.trim()
  if (!trimmed.startsWith('{')) {
    fail('البذرة لم تُخرج JSON', `أوّل ما طُبع:\n    ${trimmed.slice(0, 200)}`)
  }
  mkdirSync(path.dirname(seedFile), { recursive: true })
  writeFileSync(seedFile, trimmed, 'utf8')
  const payload = JSON.parse(trimmed)
  const roles = Object.keys(payload.roles ?? {})
  console.log(c.green(`    ✔ بُذرت — ${roles.length} أدوار: ${roles.join(' · ')}`))
} else {
  step('البذرة — متخطّاة (--skip-seed)')
  if (!existsSync(seedFile)) {
    fail('لا حمولة بذرةٍ محفوظة', `المتوقَّع في: ${seedFile}\n    شغّل مرّةً بلا --skip-seed`)
  }
}

// ٢) خادم الباك
step(`تشغيل الباك على المنفذ ${API_PORT}`)
serve('php', ['artisan', 'serve', `--host=${API_HOST}`, `--port=${API_PORT}`], {
  cwd: backRoot, env: { DB_DATABASE: TEST_DB }, name: `الباك :${API_PORT}`,
})
await waitFor(`${apiBase}/public/subscription-plans`, { name: 'الباك' })
console.log(c.green('    ✔ يستجيب'))

// ٣) بناء الفرونت بوضع الزحف
if (!flag('--skip-build')) {
  step('بناء الفرونت بوضع e2e')
  console.log(c.dim('    (يقرأ .env.e2e فيوجّه API وReverb للمحلّي ويُطفئ Firebase)'))
  await run('npm', ['run', 'e2e:build'], {
    cwd: frontRoot,
    env: { VITE_API_BASE_URL: apiBase },
    label: 'e2e:build',
  })
  console.log(c.green('    ✔ بُني'))
} else {
  step('البناء — متخطّى (--skip-build)')
  if (!existsSync(path.join(frontRoot, 'dist', 'index.html'))) {
    fail('لا بناءَ سابق في dist/', 'شغّل مرّةً بلا --skip-build')
  }
}

// ٤) تقديم الفرونت
step(`تقديم الواجهة على المنفذ ${WEB_PORT}`)
serve('npx', ['vite', 'preview', '--port', String(WEB_PORT), '--strictPort', '--host', API_HOST], {
  cwd: frontRoot, name: `الواجهة :${WEB_PORT}`,
})
await waitFor(webBase, { name: 'الواجهة' })
console.log(c.green('    ✔ تستجيب'))

// ٥) الزحف
step('الزحف')
const crawlArgs = ['playwright', 'test']
if (flag('--headed')) crawlArgs.push('--headed')

const crawlEnv = {
  E2E_BASE_URL: webBase,
  E2E_API_BASE_URL: apiBase,
  E2E_SEED_FILE: seedFile,
}
if (flag('--no-buttons')) crawlEnv.E2E_PROBE_BUTTONS = 'false'

const crawl = spawn('npx', crawlArgs, {
  cwd: frontRoot,
  env: { ...process.env, ...crawlEnv },
  shell: true,
  stdio: 'inherit',
})

const exitCode = await new Promise((resolve) => crawl.on('close', resolve))

// ٦) الختام
cleanup()

const reportHtml = path.join(here, 'report', 'تقرير-الزحف.html')
console.log('')
if (existsSync(reportHtml)) {
  console.log(c.bold('  التقرير جاهز:'))
  console.log(`  ${reportHtml}`)
  console.log(c.dim('  افتحه بالنقر، أو:  npm run e2e:report'))
  if (flag('--open')) {
    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    spawn(opener, ['', reportHtml], { shell: true, detached: true, stdio: 'ignore' }).unref()
  }
} else {
  console.log(c.amber('  لم يُولَّد تقرير — راجع الخرج أعلاه.'))
}
console.log('')

// رمز خروج الزحف يمرّ كما هو: صفرٌ يعني لا عطل، وغيرُه يعني وُجد عطل.
// بهذا يصلح الأمر بوّابةً في أيّ خطّ نشرٍ آليّ لاحقاً.
process.exit(exitCode ?? 0)
