/**
 * مستخرج المسارات وعناصر التنقّل — بلا تبعيات.
 *
 * لماذا استخراجٌ آليّ لا قائمةٌ مكتوبة باليد؟
 * الراوتر فيه أكثر من ١٤٠ مسار. أيّ قائمةٍ يدويةٍ ستتعفّن خلال أسبوعين: مطوّرٌ
 * يضيف صفحةً جديدة، ولا يعرف بوجود الزاحف، فتسقط صفحته من الفحص **صامتة** —
 * ويبقى التقرير يقول «كلّ شيء سليم» وهو يكذب. الاستخراج من الملفّ نفسه يجعل
 * الزاحف يكتشف كلَّ صفحةٍ جديدة تلقائياً في أوّل تشغيلٍ بعد إضافتها.
 *
 * الطريقة: قارئٌ نصيّ (لا محلّل TypeScript كامل) يمشي على شجرة الكائنات
 * `{ path: '…', element: <X />, children: [...] }` ويجمع المسارات المتداخلة.
 * اخترنا القراءة النصية عمداً: إدخال محلّلٍ كامل (ts-morph / @babel/parser)
 * تبعيةٌ ثقيلة لمهمّةٍ شكلُ مدخلها ثابتٌ ومعروف.
 */

import { readFileSync } from 'node:fs'

/* ══════════════════════════════════════════════════════════════
   أدوات القراءة
   ══════════════════════════════════════════════════════════════ */

/**
 * يزيل التعليقات من مصدر TypeScript دون العبث بمحتوى النصوص.
 * ضروري لأن الراوتر مليء بتعليقاتٍ عربيةٍ تحوي أقواساً وشرطاتٍ تربك القارئ.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  let out = ''
  let i = 0
  const n = source.length
  /** @type {null | '"' | "'" | '`'} */
  let quote = null

  while (i < n) {
    const ch = source[i]
    const next = source[i + 1]

    if (quote) {
      if (ch === '\\') {
        out += ch + (next ?? '')
        i += 2
        continue
      }
      if (ch === quote) quote = null
      out += ch
      i += 1
      continue
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = /** @type {'"' | "'" | '`'} */ (ch)
      out += ch
      i += 1
      continue
    }

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') i += 1
      continue
    }

    if (ch === '/' && next === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i += 1
      i += 2
      // نُبقي سطراً جديداً كي لا تلتحم الرموز حول التعليق متعدّد الأسطر
      out += '\n'
      continue
    }

    out += ch
    i += 1
  }

  return out
}

/**
 * يجد فهرس القوس المغلق المطابق ابتداءً من قوسٍ مفتوح، متجاهلاً ما داخل النصوص.
 * @param {string} source
 * @param {number} openIndex فهرس القوس المفتوح
 * @param {string} open
 * @param {string} close
 * @returns {number} فهرس القوس المغلق، أو -1 إن لم يوجد
 */
function findMatching(source, openIndex, open, close) {
  let depth = 0
  let i = openIndex
  /** @type {null | string} */
  let quote = null

  while (i < source.length) {
    const ch = source[i]

    if (quote) {
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      i += 1
      continue
    }

    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return i
    }

    i += 1
  }

  return -1
}

/**
 * يقسّم محتوى مصفوفةٍ (بلا القوسين) إلى عناصرها العليا.
 * لا نستطيع الاكتفاء بـ split(',') لأن الفواصل داخل الكائنات وJSX أكثر عدداً
 * من الفواصل بين العناصر.
 * @param {string} body
 * @returns {string[]}
 */
function splitTopLevel(body) {
  /** @type {string[]} */
  const parts = []
  let depth = 0
  let start = 0
  /** @type {null | string} */
  let quote = null
  let i = 0

  while (i < body.length) {
    const ch = body[i]

    if (quote) {
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      i += 1
      continue
    }

    if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth += 1
    else if (ch === '}' || ch === ']' || ch === ')' || ch === '>') depth -= 1
    else if (ch === ',' && depth === 0) {
      const piece = body.slice(start, i).trim()
      if (piece) parts.push(piece)
      start = i + 1
    }

    i += 1
  }

  const tail = body.slice(start).trim()
  if (tail) parts.push(tail)
  return parts
}

/**
 * يقرأ قيمة خاصيّةٍ نصيّةٍ من المستوى الأعلى لكائن.
 * @param {string} objectBody محتوى الكائن بلا الأقواس المعقوفة
 * @param {string} key
 * @returns {string | undefined}
 */
function readStringProp(objectBody, key) {
  for (const part of splitTopLevel(objectBody)) {
    const match = part.match(new RegExp(`^${key}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`))
    if (match) return match[2]
  }
  return undefined
}

/**
 * يقرأ قيمةً منطقيةً من المستوى الأعلى لكائن (`index: true`).
 * @param {string} objectBody
 * @param {string} key
 * @returns {boolean}
 */
function readBoolProp(objectBody, key) {
  for (const part of splitTopLevel(objectBody)) {
    if (new RegExp(`^${key}\\s*:\\s*true\\b`).test(part)) return true
  }
  return false
}

/**
 * يقرأ محتوى خاصيّةٍ من نوع مصفوفة (`children: [ … ]`).
 * @param {string} objectBody
 * @param {string} key
 * @returns {string | undefined} محتوى المصفوفة بلا القوسين
 */
function readArrayProp(objectBody, key) {
  const marker = new RegExp(`(^|[^\\w$])${key}\\s*:\\s*\\[`)
  const found = objectBody.match(marker)
  if (!found || found.index === undefined) return undefined
  const bracketIndex = objectBody.indexOf('[', found.index)
  const close = findMatching(objectBody, bracketIndex, '[', ']')
  if (close === -1) return undefined
  return objectBody.slice(bracketIndex + 1, close)
}

/* ══════════════════════════════════════════════════════════════
   استنتاج الدور والحماية
   ══════════════════════════════════════════════════════════════ */

/**
 * يستنتج الدور المطلوب لفرعٍ من نصّ الـ element الخاص به.
 * الراوتر يعبّر عن الحماية بثلاث صيغ:
 *   <RequireAuth role="teacher">      → معلّم
 *   <RequireAuth requireManagement>   → إدارة
 *   <RequireAuth role="super_admin">  → مشرف عام
 * وما لا حارس له فهو عامّ.
 * @param {string} elementSource
 * @returns {'teacher' | 'admin' | 'super-admin' | null}
 */
function inferRoleFromElement(elementSource) {
  if (!elementSource.includes('RequireAuth') && !elementSource.includes('RequireOnboarding')) return null
  const roleMatch = elementSource.match(/role\s*=\s*["']([^"']+)["']/)
  if (roleMatch) {
    const role = roleMatch[1]
    if (role === 'teacher') return 'teacher'
    if (role === 'super_admin') return 'super-admin'
    return 'admin'
  }
  if (/requireManagement/.test(elementSource)) return 'admin'
  if (/RequireOnboarding/.test(elementSource)) return 'admin'
  return null
}

/**
 * يستنتج الشل (الحاوية) من نصّ الـ element.
 * @param {string} elementSource
 * @returns {string | null}
 */
function inferShell(elementSource) {
  const match = elementSource.match(/<(\w*Shell|RootLayout)\b/)
  return match ? match[1] : null
}

/** قراءة نصّ الخاصيّة `element` كاملاً بما فيه JSX المتداخل. */
function readElementSource(objectBody) {
  const marker = objectBody.match(/(^|[^\w$])element\s*:\s*/)
  if (!marker || marker.index === undefined) return ''
  let i = objectBody.indexOf('element', marker.index)
  i = objectBody.indexOf(':', i) + 1
  while (i < objectBody.length && /\s/.test(objectBody[i])) i += 1

  if (objectBody[i] === '(') {
    const close = findMatching(objectBody, i, '(', ')')
    return close === -1 ? objectBody.slice(i) : objectBody.slice(i + 1, close)
  }

  // JSX مباشر: <X ... /> — نقرأ حتى الفاصلة العليا في العمق صفر
  let depth = 0
  const start = i
  while (i < objectBody.length) {
    const ch = objectBody[i]
    if (ch === '<') depth += 1
    else if (ch === '>') {
      depth -= 1
      if (depth <= 0) return objectBody.slice(start, i + 1)
    } else if (ch === ',' && depth === 0) break
    i += 1
  }
  return objectBody.slice(start, i)
}

/* ══════════════════════════════════════════════════════════════
   مشي شجرة المسارات
   ══════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} RawRoute
 * @property {string} pattern       المسار المطلق كما هو في الراوتر (قد يحوي :params)
 * @property {'teacher'|'admin'|'super-admin'|'guardian'|'public'} audience
 * @property {string|null} shell
 * @property {string} element       اسم المكوّن (للتشخيص)
 * @property {boolean} isIndex
 * @property {boolean} isRedirect   مسارٌ يعيد التوجيه فقط (<Navigate/>)
 * @property {boolean} isCatchAll   المسار '*'
 */

/**
 * @param {string} parent
 * @param {string} segment
 */
function joinPath(parent, segment) {
  if (segment.startsWith('/')) return segment
  if (!segment) return parent || '/'
  const base = parent === '/' ? '' : parent
  return `${base}/${segment}`.replace(/\/{2,}/g, '/')
}

/**
 * يمشي على مصفوفة تعريفات المسارات ويجمعها مسطَّحةً بمساراتٍ مطلقة.
 * @param {string} arrayBody محتوى المصفوفة بلا القوسين
 * @param {string} parentPath
 * @param {'teacher'|'admin'|'super-admin'|'guardian'|'public'} inheritedAudience
 * @param {string|null} inheritedShell
 * @param {RawRoute[]} sink
 */
function walkRoutes(arrayBody, parentPath, inheritedAudience, inheritedShell, sink) {
  for (const entry of splitTopLevel(arrayBody)) {
    if (!entry.startsWith('{')) continue
    const close = findMatching(entry, 0, '{', '}')
    if (close === -1) continue
    const body = entry.slice(1, close)

    const segment = readStringProp(body, 'path')
    const isIndex = readBoolProp(body, 'index')
    const elementSource = readElementSource(body)

    const declaredRole = inferRoleFromElement(elementSource)
    const shell = inferShell(elementSource) ?? inheritedShell

    /** @type {'teacher'|'admin'|'super-admin'|'guardian'|'public'} */
    let audience = inheritedAudience
    if (declaredRole) audience = declaredRole
    // بوابة وليّ الأمر بلا RequireAuth (جلسةٌ مستقلّة بالهوية وآخر أربعة أرقام)
    // لكنها جمهورٌ مختلف عن العام، فنميّزها بالشل.
    if (shell === 'GuardianShell') audience = 'guardian'

    const absolute = isIndex ? parentPath || '/' : joinPath(parentPath, segment ?? '')

    const childrenBody = readArrayProp(body, 'children')

    // العقدة التي لها أبناء وليس لها element ذو صفحة (شل فقط) لا تُزار بذاتها؛
    // إلا إن كان لها index فسنسجّله عبر ابنه.
    const isLayoutNode = Boolean(childrenBody)

    if (!isLayoutNode || isIndex) {
      const elementName = (elementSource.match(/<(\w+)/) || [, '?'])[1]
      sink.push({
        pattern: absolute,
        audience,
        shell,
        element: elementName,
        isIndex,
        isRedirect: /<Navigate\b/.test(elementSource),
        isCatchAll: segment === '*',
      })
    }

    if (childrenBody) {
      walkRoutes(childrenBody, absolute, audience, shell, sink)
    }
  }
}

/**
 * يستخرج كل مسارات التطبيق من ملفّ الراوتر.
 * @param {string} routerFilePath
 * @returns {RawRoute[]}
 */
export function extractRoutes(routerFilePath) {
  const source = stripComments(readFileSync(routerFilePath, 'utf8'))

  const declMatch = source.match(/const\s+appRoutes\s*(?::[^=]+)?=\s*\[/)
  if (!declMatch || declMatch.index === undefined) {
    throw new Error(
      `تعذّر العثور على تعريف appRoutes في ${routerFilePath}. ` +
        'إن غُيّر اسم المتغيّر في الراوتر فحدِّث المستخرج — وإلا زحف الزاحف على لا شيء.',
    )
  }

  const bracketIndex = source.indexOf('[', declMatch.index)
  const close = findMatching(source, bracketIndex, '[', ']')
  if (close === -1) throw new Error('مصفوفة appRoutes غير مغلقة — الملفّ تالف أو الصياغة تغيّرت.')

  /** @type {RawRoute[]} */
  const routes = []
  walkRoutes(source.slice(bracketIndex + 1, close), '', 'public', null, routes)
  return routes
}

/* ══════════════════════════════════════════════════════════════
   عناصر التنقّل
   ══════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} NavItem
 * @property {string} to
 * @property {string} label
 * @property {string} group
 * @property {boolean} soon  عنصرٌ معلَّمٌ «قريباً» — غيابُ صفحته ليس عطلاً
 */

/**
 * يستخرج عناصر تنقّل الأدمن من ملفّ الثوابت.
 * @param {string} navFilePath
 * @returns {NavItem[]}
 */
export function extractNavItems(navFilePath) {
  const source = stripComments(readFileSync(navFilePath, 'utf8'))
  /** @type {NavItem[]} */
  const items = []

  // كل مجموعة: { title: '…', icon: X, items: [ … ] }
  // ونعالج كذلك المصفوفة المسطّحة secondaryAdminNav التي لا مجموعة لها.
  const groupPattern = /title\s*:\s*['"]([^'"]+)['"]/g
  /** @type {Array<{ title: string, index: number }>} */
  const groups = []
  let m
  while ((m = groupPattern.exec(source)) !== null) {
    groups.push({ title: m[1], index: m.index })
  }

  const itemPattern = /\{\s*to\s*:\s*['"]([^'"]+)['"][^}]*?label\s*:\s*['"]([^'"]+)['"][^}]*\}/g
  while ((m = itemPattern.exec(source)) !== null) {
    const [full, to, label] = m
    // المجموعة الأقرب قبل هذا العنصر
    let group = 'روابط مباشرة'
    for (const g of groups) {
      if (g.index < m.index) group = g.title
      else break
    }
    items.push({ to, label, group, soon: /\bsoon\s*:\s*true/.test(full) })
  }

  return items
}

/* ══════════════════════════════════════════════════════════════
   بناء الجرد الكامل
   ══════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} InventoryTarget
 * @property {string} url          العنوان المطلق الجاهز للزيارة
 * @property {string} pattern      النمط الأصلي كما في الراوتر
 * @property {'teacher'|'admin'|'super-admin'|'guardian'|'public'} audience
 * @property {string} element
 * @property {string[]} params     أسماء البارامترات التي عُوّضت
 */

/**
 * @typedef {object} SkippedTarget
 * @property {string} pattern
 * @property {'teacher'|'admin'|'super-admin'|'guardian'|'public'} audience
 * @property {string} reason
 */

/**
 * @typedef {object} Inventory
 * @property {InventoryTarget[]} targets
 * @property {SkippedTarget[]} skipped
 * @property {NavItem[]} nav
 * @property {Array<{ to: string, label: string, group: string }>} orphanNav عناصر تنقّل بلا مسار
 * @property {number} totalRoutes
 * @property {string} generatedAt
 */

/**
 * هل يطابق العنوانُ الفعليّ نمطَ مسارٍ فيه بارامترات؟
 * @param {string} pattern
 * @param {string} url
 */
function patternMatches(pattern, url) {
  const regex = new RegExp(
    '^' +
      pattern
        .split('/')
        .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/') +
      '$',
  )
  return regex.test(url)
}

/**
 * يبني جرد الأهداف: يعوّض البارامترات من ملفّ التعيين، ويسجّل ما لا قيمة له
 * في قائمة المتخطّى — **لا يحذفه**. الحذف الصامت يجعل التقرير يكذب: صفحةٌ لم
 * تُفحص تبدو كصفحةٍ سليمة.
 *
 * @param {object} options
 * @param {string} options.routerFile
 * @param {string} options.navFile
 * @param {Record<string, string | number | undefined>} options.params
 * @param {Record<string, Record<string, string | number | undefined>>} [options.perRoute]
 * @returns {Inventory}
 */
export function buildInventory({ routerFile, navFile, params, perRoute = {} }) {
  /**
   * قيمةُ بارامترٍ في مسارٍ بعينه.
   *
   * لماذا لا يكفي تعيينٌ عامٌّ باسم البارامتر؟ لأن `:id` في الراوتر ليس شيئاً
   * واحداً: هو إحالةٌ في `/admin/referrals/:id`، وحالةٌ طلابيةٌ في
   * `/guidance/cases/:id`، وخطّةٌ علاجيةٌ في `/guidance/treatment-plans/:id`.
   * وقيمةٌ عامّةٌ واحدةٌ تصيب واحداً وتُخطئ الباقين — فيردّ الباك 404 ويُقرأ
   * عطلاً وهو ليس عطلاً. فالتعيينُ الخاصّ بالمسار يتقدّم دائماً.
   */
  const valueFor = (pattern, name) => {
    const specific = perRoute[pattern]?.[name]
    if (specific !== undefined && specific !== '') return specific
    return params[name]
  }
  const routes = extractRoutes(routerFile)
  const nav = extractNavItems(navFile)

  /** @type {InventoryTarget[]} */
  const targets = []
  /** @type {SkippedTarget[]} */
  const skipped = []

  for (const route of routes) {
    if (route.isCatchAll) {
      skipped.push({
        pattern: route.pattern,
        audience: route.audience,
        reason: 'مسار الالتقاط الشامل (*) — يُفحص عبر عنوانٍ وهميّ منفصل لا عبر الجرد',
      })
      continue
    }

    if (route.isRedirect) {
      skipped.push({
        pattern: route.pattern,
        audience: route.audience,
        reason: 'إعادة توجيهٍ فقط — لا صفحة خلفه، وجهته مفحوصةٌ أصلاً',
      })
      continue
    }

    const paramNames = route.pattern.split('/').filter((s) => s.startsWith(':')).map((s) => s.slice(1))

    if (paramNames.length === 0) {
      targets.push({ url: route.pattern, pattern: route.pattern, audience: route.audience, element: route.element, params: [] })
      continue
    }

    const missing = paramNames.filter((name) => {
      const value = valueFor(route.pattern, name)
      return value === undefined || value === ''
    })
    if (missing.length > 0) {
      skipped.push({
        pattern: route.pattern,
        audience: route.audience,
        reason: `متخطّى — لا بيانات: لا قيمة للبارامتر ${missing.map((p) => `«${p}»`).join(' و')} في ملفّ التعيين`,
      })
      continue
    }

    const url = route.pattern
      .split('/')
      .map((seg) => (seg.startsWith(':') ? encodeURIComponent(String(valueFor(route.pattern, seg.slice(1)))) : seg))
      .join('/')

    targets.push({ url, pattern: route.pattern, audience: route.audience, element: route.element, params: paramNames })
  }

  // إزالة التكرار: مسارات مختلفة قد تنتهي لنفس العنوان (مثل index مع أبيه)
  /** @type {Map<string, InventoryTarget>} */
  const unique = new Map()
  for (const target of targets) {
    const key = `${target.audience}::${target.url}`
    if (!unique.has(key)) unique.set(key, target)
  }

  // عنصر تنقّلٍ بلا مسارٍ مطابق = زرٌّ يقود إلى «الصفحة غير موجودة» = عطل
  const allPatterns = routes.map((r) => r.pattern)
  const orphanNav = nav
    .filter((item) => !allPatterns.some((pattern) => pattern === item.to || patternMatches(pattern, item.to)))
    .map(({ to, label, group }) => ({ to, label, group }))

  return {
    targets: [...unique.values()],
    skipped,
    nav,
    orphanNav,
    totalRoutes: routes.length,
    generatedAt: new Date().toISOString(),
  }
}
