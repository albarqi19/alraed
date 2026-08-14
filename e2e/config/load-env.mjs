/**
 * محمّل e2e/.env — بلا تبعية.
 *
 * لماذا لا نستعمل dotenv؟ لأن المهمّة سطران، والعدّة لا ينبغي أن تجرّ حزمةً
 * لأجلهما. ولماذا ملفّ .env أصلاً؟ لأن المالك سيشغّل الزاحف من نافذة طرفيّةٍ
 * جديدةٍ كلَّ مرّة، وكتابةُ عشرة متغيّراتٍ يدوياً في كلّ مرّةٍ وصفةٌ للنسيان.
 *
 * **متغيّرات البيئة الحقيقية تفوز دائماً** على الملفّ: من كتب المتغيّر في
 * الطرفيّة قصد تجاوز الملفّ، لا أن يتجاهله الملفّ.
 *
 * يُستورَد أوّلَ شيءٍ في كلّ ملفٍّ يقرأ process.env: استيرادات ESM تُنفَّذ
 * بالترتيب، فالاستيراد في الأعلى يضمن امتلاء البيئة قبل قراءتها.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '..', '.env')

function loadEnvFile() {
  if (!existsSync(envFile)) return

  /** @type {string} */
  let contents
  try {
    contents = readFileSync(envFile, 'utf8')
  } catch {
    return
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    if (!key) continue

    let value = line.slice(separator + 1).trim()
    // إزالة علامات الاقتباس المحيطة إن وُجدت
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // البيئة الحقيقية أعلى سلطةً من الملفّ
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile()

