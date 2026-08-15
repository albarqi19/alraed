/**
 * جسرُ الـAPI — الوجهُ الأوّل من التحقّق المزدوج.
 *
 * الرحلة تفعل الشيء **من الواجهة كما يفعله المستخدم**، ثم تسأل الـAPI:
 * «هل ترى ما رأيته؟». وهذا يكشف صنفاً كاملاً من الأعطال لا يراه أحدُ الوجهين
 * وحده:
 *   · واجهةٌ تعرض «حُفظ» بينما الخادم ردّ 422 وابتُلع الخطأ  ← الـAPI يكشفه
 *   · خادمٌ حفظ فعلاً بينما الجدول لم يتحدّث (لا إبطالَ للذاكرة) ← الواجهةُ تكشفه
 *
 * والنداء يمرّ **بجلسة الدور نفسها** لا بجلسةٍ جديدة: توكن المستخدم الذي فعل
 * الفعل هو الذي يقرأ النتيجة. فلو كان الحفظ ذهب إلى مدرسةٍ أخرى لَما رآه هذا
 * التوكن — وهو بالضبط ما نريد كشفه.
 */

import { request as playwrightRequest, type APIRequestContext } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { apiUrl, crawlerConfig } from '../../config/crawler.config'

/** الأدوار التي تملك جلسةً محفوظةً من مشروع التهيئة */
export type JourneyRole = 'admin' | 'teacher' | 'super-admin' | 'guardian'

/** حالةُ متصفّحٍ بلا جلسة — لرحلاتِ الزائر (التسجيل مثلاً) */
export const NO_SESSION: { cookies: []; origins: [] } = { cookies: [], origins: [] }

/** مسار ملفّ الجلسة المحفوظة لدور — يُمرَّر إلى `test.use({ storageState })` */
export function sessionFile(role: JourneyRole): string {
  return path.join(crawlerConfig.authStateDir, `${role}.json`)
}

interface StoredState {
  origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>
}

/**
 * يستخرج توكن الدور من حالته المحفوظة.
 *
 * لماذا لا ندخل بالـAPI من جديد؟ لأن الدخول مرّتين يعني جلستين، وقد يُبطل
 * الخادمُ الأولى فتنهار جلسةُ المتصفّح في منتصف الرحلة. والتوكن المحفوظ هو
 * **نفسه** الذي يحمله المتصفّح — وهذا هو المطلوب: أن يسأل الـAPي بالجلسة
 * التي فعلت الفعل، لا بجلسةٍ أخرى قد تملك صلاحياتٍ مختلفة.
 */
export function tokenOf(role: JourneyRole): string {
  const file = sessionFile(role)
  if (!existsSync(file)) {
    throw new Error(
      `لا جلسةً محفوظةً للدور «${role}» في ${file}. ` +
        'مشروع «تهيئة المصادقة» لم يعمل أو تعذّر دخولُه — راجع e2e/.auth/roles-status.json.',
    )
  }

  let state: StoredState
  try {
    state = JSON.parse(readFileSync(file, 'utf8')) as StoredState
  } catch (error) {
    throw new Error(`ملفّ جلسة «${role}» تالف: ${error instanceof Error ? error.message : String(error)}`)
  }

  const key = role === 'guardian' ? 'guardian_auth_token' : 'auth_token'
  for (const origin of state.origins ?? []) {
    for (const entry of origin.localStorage ?? []) {
      if (entry.name === key && entry.value) return entry.value
    }
  }

  throw new Error(
    `جلسة «${role}» محفوظةٌ بلا توكن (المفتاح ${key}). ` +
      'الأرجح أنّ الدخول فشل وكُتبت حالةٌ فارغة — راجع e2e/.auth/roles-status.json.',
  )
}

/* ══════════════════════════════════════════════════════════════
   الجسر
   ══════════════════════════════════════════════════════════════ */

/** صفُّ طالبٍ كما يردّه الـAPI — ما تحتاجه الرحلات منه فقط */
export interface StudentRow {
  id: number
  name: string
  national_id: string
  grade: string | null
  class_name: string | null
  parent_name: string | null
  parent_phone: string | null
  school_id: number
  [key: string]: unknown
}

export class ApiBridge {
  constructor(
    private readonly context: APIRequestContext,
    /** وصفٌ عربيّ يظهر في رسائل الفشل: «بجلسة الإدارة» */
    readonly label: string,
  ) {}

  /**
   * نداءُ قراءةٍ يُسقط الرحلة برسالةٍ مفهومةٍ عند الفشل.
   * لا نُرجع الاستجابة الخام: كلُّ مستدعٍ سيكتب فحصَ الحالة نفسه، وسينساه أحدُهم.
   */
  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const response = await this.context.get(apiUrl(endpoint), { params, timeout: 30_000 })
    const text = await response.text()

    if (!response.ok()) {
      throw new Error(
        `نداء الـAPI «${endpoint}» ${this.label} ردّ ${response.status()}: ${text.slice(0, 300)}`,
      )
    }

    try {
      const body = JSON.parse(text) as Record<string, unknown>
      return (body.data ?? body) as T
    } catch {
      throw new Error(`نداء الـAPI «${endpoint}» ردّ نصّاً ليس JSON: ${text.slice(0, 200)}`)
    }
  }

  /** الاستجابة الخام — حين يكون رمزُ الحالة نفسه هو المُتحقَّق منه */
  async raw(endpoint: string, params?: Record<string, string | number>) {
    return this.context.get(apiUrl(endpoint), { params, timeout: 30_000 })
  }

  /* ── مختصراتٌ للمجالات المتكرّرة ── */

  /** قائمة طلاب المدرسة الحالية كما يراها هذا الدور */
  async students(): Promise<StudentRow[]> {
    const data = await this.get<StudentRow[]>('admin/students')
    return Array.isArray(data) ? data : []
  }

  /** يبحث عن طالبٍ بهويّته — null إن لم يوجد */
  async studentByNationalId(nationalId: string): Promise<StudentRow | null> {
    const all = await this.students()
    return all.find((student) => String(student.national_id) === nationalId) ?? null
  }

  async dispose(): Promise<void> {
    await this.context.dispose()
  }
}

/** جسرٌ بجلسة دورٍ محفوظة */
export async function apiAs(role: JourneyRole): Promise<ApiBridge> {
  return apiWithToken(tokenOf(role), `بجلسة «${role}»`)
}

/** جسرٌ بتوكنٍ نملكه (مفيدٌ لحسابٍ أنشأناه للتوّ في الرحلة) */
export async function apiWithToken(token: string, label = 'بتوكنٍ مؤقّت'): Promise<ApiBridge> {
  const context = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  return new ApiBridge(context, label)
}

/* ══════════════════════════════════════════════════════════════
   الدخول المباشر
   ══════════════════════════════════════════════════════════════ */

export interface LoginOutcome {
  token: string
  user: Record<string, unknown>
}

/**
 * دخولٌ عبر الـAPI ببيانات اعتماد.
 *
 * تستعمله رحلةُ التسجيل للسؤال الحاسم: «الحسابُ الذي أنشأه النموذج — هل يدخل
 * فعلاً؟». صفحةُ نجاحٍ تعرض كلمة مرورٍ لا تعمل هي عطلٌ كامل، ولا يكشفه إلا
 * محاولةُ دخولٍ حقيقية.
 *
 * (منطقُه توأمُ ما في `e2e/auth/auth.setup.ts`؛ كُرّر هنا لأنّ ذلك الملفّ لا
 *  يُصدّره، وهو ليس من ملفّات هذه الطبقة.)
 */
export async function loginViaApi(nationalId: string, password: string): Promise<LoginOutcome> {
  const context = await playwrightRequest.newContext()
  try {
    const response = await context.post(apiUrl('auth/login'), {
      data: { national_id: nationalId, password },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
    })

    const text = await response.text()
    if (!response.ok()) {
      throw new Error(`الخادم ردّ ${response.status()} على محاولة الدخول: ${text.slice(0, 300)}`)
    }

    const body = JSON.parse(text) as Record<string, unknown>
    const payload = (body.data ?? body) as Record<string, unknown>
    const token = (payload.token ?? payload.access_token ?? body.token) as string | undefined
    const user = (payload.user ?? body.user) as Record<string, unknown> | undefined

    if (!token || !user) {
      throw new Error(`استجابةُ الدخول بلا توكن أو بلا مستخدم: ${text.slice(0, 300)}`)
    }

    return { token, user }
  } finally {
    await context.dispose()
  }
}
