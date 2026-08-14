/**
 * حمولةُ البذرة — مصدرُ الحقيقة الوحيد لبارامترات المسارات وبيانات الدخول.
 *
 * أمرُ الباك `php artisan e2e:seed` يطبع JSON فيه ما بُذر فعلاً على القاعدة:
 * معرّفاتٌ حقيقية، وبيانات دخولٍ ثابتة، و`route_params` — وهو تعيينٌ **خاصٌّ
 * بكلّ مسار** لا باسم البارامتر وحده.
 *
 * لماذا هذا الملفّ بجافاسكربت خالص لا TypeScript؟ لأن قارئه اثنان: عدّةُ
 * Playwright (تُحمَّل عبر TS)، وسطرُ الأوامر `e2e:routes` (يعمل بـ node وحده
 * بلا مترجم). وكتابةُ المنطق مرّتين تعني أن يتباعدا بعد شهر، فيقول لك السطر
 * «سيُزحف على ١٣٩ صفحة» ويزحف الزاحف على ١٢٥.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import './load-env.mjs'

/**
 * @typedef {object} SeedPayload
 * @property {Record<string, Record<string, string>>} [roles]
 * @property {Record<string, string | number>} [ids]
 * @property {Record<string, string | number>} [params]
 * @property {Record<string, Record<string, string | number>>} [route_params]
 */

/** @type {SeedPayload | null | undefined} */
let cached

/**
 * يقرأ الحمولة من الملفّ الذي يشير إليه `E2E_SEED_FILE`.
 * غيابُه ليس خطأً: العدّة تعمل بمتغيّرات البيئة وحدها، ولو بتغطيةٍ أقلّ.
 * أمّا وجودُه تالفاً فتحذيرٌ صريح — كي لا يزحف المشغّل بمعرّفاتٍ ليست بذرته
 * وهو يحسبها بذرته.
 * @returns {SeedPayload | null}
 */
export function seedPayload() {
  if (cached !== undefined) return cached

  const file = process.env.E2E_SEED_FILE
  if (!file) {
    cached = null
    return cached
  }

  try {
    cached = JSON.parse(readFileSync(path.resolve(file), 'utf8'))
  } catch (error) {
    console.warn(
      `[الزاحف] تعذّرت قراءة حمولة البذرة من «${file}» — سيُزحف بمتغيّرات البيئة وحدها. ` +
        (error instanceof Error ? error.message : String(error)),
    )
    cached = null
  }
  return cached
}

/**
 * أولويةُ المصادر: متغيّرُ البيئة (إرادةُ المشغّل الصريحة) ← حمولةُ البذرة
 * (الحقيقةُ على القاعدة) ← القيمة الاحتياطية.
 * @param {string} envName
 * @param {string} [seedKey]
 * @param {string} [fallback]
 * @returns {string | undefined}
 */
function pick(envName, seedKey, fallback) {
  const fromEnv = process.env[envName]
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv

  const seed = seedPayload()
  const fromSeed = seedKey ? (seed?.params?.[seedKey] ?? seed?.ids?.[seedKey]) : undefined
  if (fromSeed !== undefined && fromSeed !== '') return String(fromSeed)

  return fallback
}

/**
 * التعيين العامّ باسم البارامتر. مفتاحُه اسمُ البارامتر كما في الراوتر بلا نقطتين.
 * @returns {Record<string, string | undefined>}
 */
export function routeParams() {
  return {
    /* ── الطلاب والحالات ── */
    studentId: pick('E2E_STUDENT_ID', 'student_id'),
    caseId: pick('E2E_CASE_ID', 'student_case_id'),
    planId: pick('E2E_PLAN_ID', 'treatment_plan_id'),

    /* ── المعلمون ── */
    teacherId: pick('E2E_TEACHER_ID', 'teacher_id'),
    sessionId: pick('E2E_SESSION_ID', 'class_session_id'),

    /* ── النماذج ── */
    formId: pick('E2E_FORM_ID', 'form_id'),

    /* ── السلوك والإحالات ── */
    violationId: pick('E2E_VIOLATION_ID', 'behavior_violation_id'),
    referralId: pick('E2E_REFERRAL_ID', 'student_referral_id'),

    /* البارامتر العامّ `:id`. قيمةٌ احتياطيةٌ فقط — التعيينُ الخاصّ بالمسار
       (perRouteParams) هو من يمنح كلَّ مسارٍ معرّفَه الصحيح. */
    id: pick('E2E_GENERIC_ID', 'student_referral_id'),

    /* ── الأدلّة: بارامترٌ نصّيّ لا رقميّ ── */
    type: pick('E2E_GUIDE_TYPE', undefined, 'teacher'),

    /* ── الروابط العامة بالرموز ──
       رمزٌ حقيقيّ من البذرة؛ بلا قيمةٍ يُسجَّل متخطّياً — وهو الصواب:
       رمزٌ مخترعٌ يردّ 404 فيُقرأ عطلاً وهو ليس عطلاً. */
    token: pick('E2E_PUBLIC_TOKEN', 'excuse_token'),
  }
}

/**
 * التعيين الخاصّ بمسارٍ بعينه — مفتاحُه نمطُ المسار كما في الراوتر.
 * يتقدّم على التعيين العامّ، لأن `:id` ليس شيئاً واحداً في كلّ المسارات:
 * هو إحالةٌ في `/admin/referrals/:id`، وحالةٌ في `/guidance/cases/:id`،
 * وخطّةٌ علاجيةٌ في `/guidance/treatment-plans/:id`.
 * @returns {Record<string, Record<string, string>>}
 */
export function perRouteParams() {
  const seed = seedPayload()
  return Object.fromEntries(
    Object.entries(seed?.route_params ?? {}).map(([pattern, values]) => [
      pattern,
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])),
    ]),
  )
}

/**
 * بيانات الدخول لكلّ دور.
 * لا كلمات مرورٍ مكتوبةً في الشيفرة: إمّا من البيئة وإمّا من حمولة البذرة.
 * @returns {{admin: {nationalId: string, password: string}, teacher: {nationalId: string, password: string}, 'super-admin': {nationalId: string, password: string}, guardian: {studentNationalId: string, phoneLast4: string}}}
 */
export function credentials() {
  const seed = seedPayload()
  const role = (key, field) => seed?.roles?.[key]?.[field] ?? ''
  const value = (envName, key, field) => {
    const fromEnv = process.env[envName]
    return fromEnv !== undefined && fromEnv !== '' ? fromEnv : role(key, field)
  }

  return {
    admin: {
      nationalId: value('E2E_ADMIN_NATIONAL_ID', 'admin', 'national_id'),
      password: value('E2E_ADMIN_PASSWORD', 'admin', 'password'),
    },
    teacher: {
      nationalId: value('E2E_TEACHER_NATIONAL_ID', 'teacher', 'national_id'),
      password: value('E2E_TEACHER_PASSWORD', 'teacher', 'password'),
    },
    'super-admin': {
      nationalId: value('E2E_SUPER_ADMIN_NATIONAL_ID', 'super_admin', 'national_id'),
      password: value('E2E_SUPER_ADMIN_PASSWORD', 'super_admin', 'password'),
    },
    /** بوابة وليّ الأمر: لا كلمة مرور — هويّة الطالب وآخر أربعة أرقام من جوّال الوليّ */
    guardian: {
      studentNationalId: value('E2E_GUARDIAN_STUDENT_NATIONAL_ID', 'guardian', 'national_id'),
      phoneLast4: value('E2E_GUARDIAN_PHONE_LAST4', 'guardian', 'phone_last4'),
    },
  }
}
