/**
 * تشغيل الرحلات:  npm run e2e:journeys
 *
 * الرحلات تكتب على القاعدة، فتشغيلُها بلا ترتيبٍ صحيح لا يُنتج خطأً واضحاً بل
 * **تقريراً كاذباً**: تنسى البذرة فتفشل الرحلة على غياب بيانات فتُقرأ عطلاً في
 * الميزة، أو تنسى بناءَ الفرونت بوضع e2e فتزحف على واجهةٍ تخاطب الإنتاج.
 *
 * فهذا السكربت يتحقّق من الشروط قبل أن يبدأ، ويوجّه المخرجات إلى مجلّدٍ خاصٍّ
 * بالرحلات كي لا يدهس تقريرَ الزحف.
 *
 * الأعلام:
 *   --serve      شغّل الباك والواجهة بنفسك ثم أوقفهما بعد الانتهاء
 *   --seed       أعد تهيئة قاعدة الاختبار وبذرها قبل التشغيل
 *   --build      أعد بناء الفرونت بوضع e2e (يلزم مع --serve أوّل مرّة)
 *   --headed     أظهر المتصفّح وهو يعمل
 *   --open       افتح التقرير عند الانتهاء
 *   وأيُّ علمٍ آخرَ يُمرَّر كما هو إلى playwright (مثل: --grep «إضافة طالب»)
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import '../../config/load-env.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const E2E_ROOT = path.resolve(here, '..', '..')
const FRONT_ROOT = path.resolve(E2E_ROOT, '..')
const BACK_ROOT = path.resolve(FRONT_ROOT, '..')

const argv = process.argv.slice(2)
const own = new Set(['--serve', '--seed', '--build', '--open'])
const flag = (name) => argv.includes(name)
/** ما لا يخصّ هذا السكربت يمرّ إلى playwright كما هو */
const passthrough = argv.filter((arg) => !own.has(arg))

const WEB_BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8010/api'
const TEST_DB = process.env.E2E_DB ?? 'attendance_system_test'
const REPORT_DIR = path.join(E2E_ROOT, 'report', 'journeys')
const SEED_FILE = process.env.E2E_SEED_FILE
  ? path.resolve(FRONT_ROOT, process.env.E2E_SEED_FILE)
  : path.join(E2E_ROOT, 'generated', 'seed-payload.json')

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
}

const children = []
/** منافذُ شغّلنا عليها خوادمَ بأنفسنا — لنا أن نحرّرها، ولا نمسّ سواها */
const ownedPorts = []
let cleaned = false

/**
 * يقتل عمليةً بشجرتها — **متزامناً**.
 *
 * `spawn` هنا كان عطلاً حقيقياً: التنظيف يقع قبل `process.exit` مباشرةً، وقتلٌ
 * غيرُ متزامنٍ لا يلحق أن يبدأ قبل أن يموت المُشغِّل. فكان السكربت يطبع «أُوقف
 * الباك» والخادمُ حيٌّ يرزق.
 */
function killTree(pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', shell: true })
    } else {
      process.kill(-pid, 'SIGTERM')
    }
  } catch {
    /* مات أصلاً */
  }
}

/**
 * يحرّر منفذاً بقتل ما يستمع عليه.
 *
 * ══ لماذا لا يكفي قتلُ ما شغّلناه بمعرّفه ══
 * لأنّ `php artisan serve` يُشغّل حفيداً (`php -S`) هو الذي يحجز المنفذ، وسلسلةُ
 * الأبوّة تنقطع عبر غلاف `cmd` فلا يبلغه `taskkill /T` دائماً. وأثرُ ذلك ليس
 * إزعاجاً: التشغيلُ التالي يجد المنفذ محجوزاً، فيموت خادمُه الجديد صامتاً
 * ويستجيب **الخادمُ القديم** — وقاعدتُه مجهولة. (وجدنا سبعةَ خوادمَ متراكمةً
 * على 8010 من تشغيلاتٍ سابقة، و‎.env يشير إلى قاعدة التطوير.)
 *
 * فالحسمُ بالمنفذ لا بالمعرّف. ولا يُنادى إلّا على منفذٍ شغّلناه نحن.
 */
function freePort(port) {
  if (process.platform !== 'win32') return
  const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true, windowsHide: true })
  for (const line of (result.stdout ?? '').split('\n')) {
    const match = line.match(/TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i)
    if (match && Number(match[1]) === Number(port)) killTree(match[2])
  }
}

function cleanup() {
  if (cleaned) return
  cleaned = true
  for (const { child, name } of children) {
    killTree(child.pid)
    console.log(c.dim(`    أُوقف: ${name}`))
  }
  for (const port of ownedPorts) freePort(port)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('')
    cleanup()
    process.exit(130)
  })
}
process.on('exit', cleanup)

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

function run(cmd, args, { cwd, env, capture = false, label } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
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

function serve(cmd, args, { cwd, env, name }) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, shell: true, stdio: 'ignore' })
  child.on('error', (e) => fail(`تعذّر تشغيل ${name}: ${e.message}`))
  children.push({ child, name })
}

async function reachable(url, timeoutMs = 3000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return response.status > 0
  } catch {
    return false
  }
}

async function waitFor(url, { timeoutMs = 90_000, name }) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await reachable(url)) return
    await new Promise((r) => setTimeout(r, 700))
  }
  fail(`${name} لم يستجب خلال ${Math.round(timeoutMs / 1000)} ثانية`, `العنوان: ${url}`)
}

/**
 * ينتظر حتى **يهدأ** الباك، لا حتى يستجيب فقط.
 *
 * ══ الفرق بينهما ثمنُه سبعُ رحلاتٍ حمراء ══
 * `php artisan serve` متسلسل: طلبٌ واحدٌ في المرّة. فإن كان مشغولاً بشيءٍ ثقيل
 * (زحفٌ سبقنا، أو وكيلٌ آخرُ على الجهاز نفسِه) فهو «يستجيب» — بعد عشرين ثانية.
 * ومهلةُ نداء الدخول في تهيئة المصادقة عشرون ثانية بالضبط. فتنتهي مهلةُ دخول
 * «admin» و«teacher»، وتُكتب لهما حالتان **فارغتان**، ثمّ تسقط كلُّ رحلةٍ
 * برسالة «جلسةٌ محفوظةٌ بلا توكن» — رسالةٌ صادقةٌ في ظاهرها ومضلّلةٌ في دلالتها:
 * لا عطلَ في المصادقة ولا في التطبيق، إنّما سألنا خادماً يلهث.
 *
 * (وقع هذا حرفياً في أوّل تشغيلٍ يجمع الزحفَ والرحلات في أمرٍ واحد.)
 */
async function waitUntilCalm(url, { needed = 3, budgetMs = 120_000, fastMs = 2500 } = {}) {
  const deadline = Date.now() + budgetMs
  let streak = 0
  let slowest = 0
  while (Date.now() < deadline) {
    const startedAt = Date.now()
    let responded = false
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      responded = response.status > 0
    } catch {
      responded = false
    }
    const took = Date.now() - startedAt
    slowest = Math.max(slowest, took)
    if (responded && took <= fastMs) {
      streak += 1
      if (streak >= needed) return { calm: true, slowest }
    } else {
      streak = 0
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return { calm: false, slowest }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', 'host.docker.internal'])

/**
 * يفحص الحزمة المبنيّة: هل تخاطب باكاً محلّياً أم خادماً خارجياً؟
 *
 * ══ لماذا هذا الفحص أوّلُ ما يجري ══
 * عنوانُ الـAPI **يُخبَز في الحزمة وقت البناء**. فبناءٌ عاديّ (`npm run build`)
 * يُنتج واجهةً تخاطب `api.brqq.site` — الإنتاج. ولو شُغّلت الرحلات عليها لأرسلت
 * `POST /schools/register` إلى خادمٍ حقيقيّ فأنشأت مدرسةً حقيقية.
 *
 * وقع هذا فعلاً في أوّل تشغيل. درعُ المتصفّح يُجهض النداء، لكنّ الفحص هنا
 * يوفّر دقيقتين ويقول السبب قبل أن يُفتح متصفّح.
 */
function assertBundleTargetsLocalApi() {
  const assetsDir = path.join(FRONT_ROOT, 'dist', 'assets')
  if (!existsSync(assetsDir)) return { checked: false }

  const remote = new Set()
  for (const file of readdirSync(assetsDir)) {
    if (!file.endsWith('.js')) continue
    const contents = readFileSync(path.join(assetsDir, file), 'utf8')
    for (const match of contents.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)(?::\d+)?\/api\b/g)) {
      if (!LOCAL_HOSTS.has(match[1])) remote.add(match[1])
    }
  }

  if (remote.size > 0) {
    fail(
      `الحزمة في dist/ تخاطب «${[...remote].join('، ')}» وهو خادمٌ غير محلّي`,
      [
        'الرحلات تكتب بياناتٍ حقيقية — ولن تُشغَّل على واجهةٍ تخاطب الإنتاج.',
        'أعد البناء بوضع الاختبار:  npm run e2e:journeys -- --build --serve',
      ].join('\n    '),
    )
  }
  return { checked: true }
}

/* ── التشغيل ────────────────────────────────────────────────── */

console.log('')
console.log(c.bold('  رحلات منصّة «الرائد» — إثباتُ أنّ الميزة تعمل'))
console.log(c.dim(`  الواجهة ${WEB_BASE}  ·  الـAPI ${API_BASE}  ·  القاعدة ${TEST_DB}`))

if (!TEST_DB.endsWith('_test')) {
  fail(
    `القاعدة «${TEST_DB}» لا ينتهي اسمُها بـ_test`,
    'الرحلات تكتب بياناتٍ حقيقية وتُطلق آثاراً. لن تعمل إلا على قاعدة اختبار.',
  )
}

if (flag('--seed')) {
  step('تهيئة قاعدة الاختبار وبذرها')
  /**
   * ⚠ لا تُمرّر DB_DATABASE إلى `test:setup-database`.
   *
   * الأمر يشتقّ اسمَ قاعدة الاختبار من phpunit.xml، ثمّ يحرس نفسه بشرطٍ صريح:
   * «إن كانت قاعدةُ الاختبار هي قاعدةُ التطبيق نفسَها فتوقّف» — كي لا يهاجر
   * أحدٌ على قاعدةٍ حيّة. فحين نحقن DB_DATABASE=attendance_system_test تصير
   * القاعدتان في عينه واحدةً، فيسقط الأمرُ برسالةٍ مضلّلة:
   *     «اسم قاعدة الاختبار غير آمن: attendance_system_test»
   * وهي رسالةٌ تقول عكسَ الحقيقة تماماً — الاسمُ آمنٌ، والحقنُ هو الخطأ.
   *
   * فنتركه يقرأ .env كما هو (قاعدةُ التطبيق)، ويشتقّ قاعدةَ الاختبار بنفسه،
   * ثمّ **نتحقّق** أنّ ما بناه هو ما سنبذره ونقيس عليه — فلو اختلف phpunit.xml
   * عن E2E_DB لبنينا قاعدةً وبذرنا أخرى، وقرأنا أصفاراً على أنّها أعطال.
   */
  const setupOut = await run('php', ['artisan', 'test:setup-database'], {
    cwd: BACK_ROOT, capture: true, label: 'test:setup-database',
  })
  process.stdout.write(setupOut)
  if (!setupOut.includes(TEST_DB)) {
    fail(
      `«test:setup-database» بنى قاعدةً غير «${TEST_DB}»`,
      [
        'الأمر يشتقّ الاسم من phpunit.xml، والرحلات تبذر وتقيس على E2E_DB.',
        'وفّق بينهما: إمّا DB_DATABASE في phpunit.xml وإمّا E2E_DB في e2e/.env.',
        `ما طبعه الأمر:\n    ${setupOut.trim().split('\n').slice(0, 4).join('\n    ')}`,
      ].join('\n    '),
    )
  }
  const json = await run('php', ['artisan', 'e2e:seed', '--quiet-seeders'], {
    cwd: BACK_ROOT, env: { DB_DATABASE: TEST_DB }, capture: true, label: 'e2e:seed',
  })
  const trimmed = json.trim()
  if (!trimmed.startsWith('{')) fail('البذرة لم تُخرج JSON', `أوّل ما طُبع:\n    ${trimmed.slice(0, 200)}`)
  mkdirSync(path.dirname(SEED_FILE), { recursive: true })
  writeFileSync(SEED_FILE, trimmed, 'utf8')
  console.log(c.green('    ✔ بُذرت'))
} else if (!existsSync(SEED_FILE)) {
  fail(
    'لا حمولةَ بذرةٍ محفوظة — لا نعرف بيانات دخول الأدوار',
    `المتوقَّع في: ${SEED_FILE}\n    شغّل مرّةً بـ --seed`,
  )
}

if (flag('--build')) {
  step('بناء الفرونت بوضع e2e')
  await run('npm', ['run', 'e2e:build'], {
    cwd: FRONT_ROOT, env: { VITE_API_BASE_URL: API_BASE }, label: 'e2e:build',
  })
  console.log(c.green('    ✔ بُني'))
}

step('فحص الحزمة: هل تخاطب الباك المحلّي؟')
const bundleCheck = assertBundleTargetsLocalApi()
console.log(
  bundleCheck.checked
    ? c.green('    ✔ كلُّ نداءات الـAPI في الحزمة محلّية')
    : c.amber('    ⚠ لا بناءَ في dist/ — الفحص متروكٌ لدرع المتصفّح أثناء التشغيل'),
)

if (flag('--serve')) {
  const apiPort = new URL(API_BASE).port || '80'
  const webPort = new URL(WEB_BASE).port || '80'
  const host = new URL(API_BASE).hostname

  /**
   * ⚠ المنفذُ المشغول أخطرُ من المنفذ المرفوض.
   *
   * لو كان على المنفذ خادمٌ متروكٌ من تشغيلٍ سابق، فإنّ `artisan serve` يفشل في
   * الحجز ويموت صامتاً — ثمّ ينجح `waitFor` لأنّ **الخادم القديم** يردّ. فتجري
   * الرحلاتُ على باكٍ لا نعرف قاعدتَه، و`.env` هنا يشير إلى قاعدة التطوير.
   * (وجدنا فعلاً سبعةَ خوادمَ متراكمةً على 8010 قبل أوّل تشغيل.)
   *
   * فالرفضُ هنا مقصود: أن يقول السكربتُ «المنفذ مشغول» خيرٌ من أن يزحف على
   * قاعدةٍ حيّة. وحارسُ الهُويّة في safety.ts يمسك ما يفلت من هذا.
   */
  for (const [port, what] of [[apiPort, 'الباك'], [webPort, 'الواجهة']]) {
    if (await reachable(`http://${host}:${port}`, 2000)) {
      fail(
        `المنفذ ${port} مشغولٌ سلفاً، و--serve يريد تشغيل ${what} عليه`,
        [
          'الخادمُ القائم قد يكون متروكاً من تشغيلٍ سابق وعلى قاعدةٍ أخرى (‎.env يشير إلى قاعدة التطوير).',
          'أوقف ما يشغله ثمّ أعد المحاولة:',
          `      netstat -ano | findstr :${port}`,
          '      taskkill /PID <رقم> /T /F',
          'أو شغّل بلا --serve إن كنت واثقاً أنّ الخادمين القائمين هما المقصودان.',
        ].join('\n    '),
      )
    }
  }

  ownedPorts.push(apiPort, webPort)

  step(`تشغيل الباك على المنفذ ${apiPort}`)
  serve('php', ['artisan', 'serve', `--host=${host}`, `--port=${apiPort}`], {
    cwd: BACK_ROOT, env: { DB_DATABASE: TEST_DB }, name: `الباك :${apiPort}`,
  })
  await waitFor(`${API_BASE}/public/subscription-plans`, { name: 'الباك' })
  console.log(c.green('    ✔ يستجيب'))

  step(`تقديم الواجهة على المنفذ ${webPort}`)
  if (!existsSync(path.join(FRONT_ROOT, 'dist', 'index.html'))) {
    fail('لا بناءَ في dist/', 'شغّل مرّةً بـ --build')
  }
  serve('npx', ['vite', 'preview', '--port', webPort, '--strictPort', '--host', new URL(WEB_BASE).hostname], {
    cwd: FRONT_ROOT, name: `الواجهة :${webPort}`,
  })
  await waitFor(WEB_BASE, { name: 'الواجهة' })
  console.log(c.green('    ✔ تستجيب'))
} else {
  step('التحقّق من أنّ الخادمين يعملان')
  const webUp = await reachable(WEB_BASE)
  const apiUp = await reachable(`${API_BASE}/public/subscription-plans`)
  if (!webUp || !apiUp) {
    fail(
      `${!webUp ? 'الواجهة' : ''}${!webUp && !apiUp ? ' و' : ''}${!apiUp ? 'الـAPI' : ''} لا تستجيب`,
      [
        'إمّا أن تشغّلهما بنفسك:',
        `      DB_DATABASE=${TEST_DB} php artisan serve --host=127.0.0.1 --port=${new URL(API_BASE).port}`,
        `      npm run e2e:serve      (في مستودع الفرونت، بعد: npm run e2e:build)`,
        '    وإمّا أن تدع السكربت يتكفّل بذلك:  npm run e2e:journeys -- --serve --build',
      ].join('\n    '),
    )
  }
  console.log(c.green('    ✔ الاثنان يستجيبان'))
}

step('انتظارُ هدوء الباك قبل أوّل نداء دخول')
const calm = await waitUntilCalm(`${API_BASE}/public/subscription-plans`)
if (!calm.calm) {
  fail(
    `الباك يستجيب لكنّه لم يهدأ خلال دقيقتين (أبطأُ استجابةٍ ${Math.round(calm.slowest / 1000)}ث)`,
    [
      'مهلةُ نداء الدخول في تهيئة المصادقة عشرون ثانية؛ وتجاوزُها يكتب حالةَ دورٍ **فارغة**',
      'فتسقط كلُّ رحلةٍ برسالة «جلسةٌ محفوظةٌ بلا توكن» — وهي رسالةٌ تخفي السبب الحقيقيّ.',
      'أرجِح أنّ شيئاً آخرَ يشغل الباك: زحفٌ جارٍ، أو وكيلٌ آخرُ على الجهاز نفسِه.',
      'انتظر حتى يفرغ ثمّ أعد التشغيل.',
    ].join('\n    '),
  )
}
console.log(c.green(`    ✔ هادئ (أبطأُ ما قِيس ${(calm.slowest / 1000).toFixed(1)}ث)`))

step('الرحلات')
const playwrightArgs = ['playwright', 'test', ...passthrough]
const child = spawn('npx', playwrightArgs, {
  cwd: FRONT_ROOT,
  env: {
    ...process.env,
    E2E_JOURNEYS: '1',
    E2E_BASE_URL: WEB_BASE,
    E2E_API_BASE_URL: API_BASE,
    E2E_SEED_FILE: SEED_FILE,
    E2E_DB: TEST_DB,
    // مجلّدٌ خاصٌّ بالرحلات: لولاه لدهس تقريرُ الرحلات لقطاتِ الزحف وتقريرَه،
    // فيقرأ المالك تقرير زحفٍ صار نصفَ محتواه من تشغيلٍ آخر.
    E2E_REPORT_DIR: REPORT_DIR,
  },
  shell: true,
  stdio: 'inherit',
})

const exitCode = await new Promise((resolve) => child.on('close', resolve))
cleanup()

const reportHtml = path.join(REPORT_DIR, 'تقرير-الرحلات.html')
console.log('')
if (existsSync(reportHtml)) {
  console.log(c.bold('  التقرير جاهز:'))
  console.log(`  ${reportHtml}`)
  if (flag('--open')) {
    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    spawn(opener, ['', reportHtml], { shell: true, detached: true, stdio: 'ignore' }).unref()
  }
} else {
  console.log(c.amber('  لم يُولَّد تقرير — راجع الخرج أعلاه.'))
}
console.log('')

// رمز الخروج يمرّ كما هو: صفرٌ يعني أنّ كلّ ميزةٍ جُرِّبت تعمل.
process.exit(exitCode ?? 0)
