/* ======================================================
   مخزن «وضع تصفّح الأرشيف»
   ------------------------------------------------------
   حالةٌ واحدة صغيرة: أي سنةٍ يتصفّحها هذا المستخدم الآن.
   يقرؤها معترضُ الشبكة ليضيف ترويسة `X-Academic-Year`،
   ويقرؤها الشريط الأحمر والمنتقي والحارس.
   ====================================================== */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/modules/auth/store/auth-store'

/** مفتاح التخزين — يبقى ثابتاً كي لا يفقد المستخدم اختياره بإعادة التحميل */
const STORAGE_KEY = 'archive-year-storage'

interface ArchiveYearState {
  /** معرّف السنة المؤرشفة المختارة، أو null في السنة الجارية */
  yearId: number | null
  /** التسمية محفوظة معها كي يظهر الشريط الأحمر فوراً قبل وصول قائمة السنوات */
  yearLabel: string | null
  /** صاحب الاختيار: معرّف المستخدم الذي اختار، وبصمة الجلسة التي اختار فيها */
  ownerUserId: number | null
  ownerSession: string | null
  enter: (year: { id: number; label: string | null }) => void
  exit: () => void
}

/**
 * بصمة الجلسة: تجزئة FNV-1a للتوكن.
 *
 * لماذا بصمةٌ لا التوكن نفسه: التوكن سرٌّ، وتكرارُ حفظه في مفتاحٍ ثانٍ من
 * التخزين المحلي يوسّع سطحه بلا مقابل. والمطلوب هنا مقارنةُ تطابقٍ لا استرجاع،
 * فتكفي بصمةٌ لا يُستخرج منها الأصل.
 */
function sessionFingerprint(token: string | null | undefined): string | null {
  if (!token) {
    return null
  }

  let hash = 0x811c9dc5
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(36)
}

export const useArchiveYearStore = create<ArchiveYearState>()(
  persist(
    (set) => ({
      yearId: null,
      yearLabel: null,
      ownerUserId: null,
      ownerSession: null,

      /**
       * الوسم بالمالك يقع هنا لا عند المنادي: لو تُرك للمنادي لَنسيَه أحدهم
       * يوماً، فصار اختيارٌ بلا صاحب — وهو الاختيار الذي يتسرّب.
       */
      enter: ({ id, label }) => {
        const { user, token } = useAuthStore.getState()

        set({
          yearId: id,
          yearLabel: label,
          ownerUserId: user?.id ?? null,
          ownerSession: sessionFingerprint(token),
        })
      },

      exit: () => set({ yearId: null, yearLabel: null, ownerUserId: null, ownerSession: null }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        yearId: state.yearId,
        yearLabel: state.yearLabel,
        ownerUserId: state.ownerUserId,
        ownerSession: state.ownerSession,
      }),
    },
  ),
)

/**
 * هل هذا الاختيار يخصّ الجلسة القائمة الآن؟
 *
 * شرطان لا واحد: **المستخدم نفسه**، و**التوكن نفسه**.
 *
 * لماذا التوكن أيضاً وقد كفى المستخدم؟ لأن المطلوب مسحُ الاختيار عند «تسجيل
 * الدخول» لا عند «تبديل المستخدم» وحده. مديرٌ خرج ثم دخل غيره ثم عاد هو —
 * معرّفه واحد والجلسة أخرى، ولا يجوز أن تستقبله شاشةٌ تعرض أرشيف ١٤٤٦ لأنه
 * تركها كذلك قبل ساعتين.
 *
 * ولماذا مقارنةٌ لا إنصاتٌ لتغيّر المصادقة؟ لأن الإنصات يعتمد على ترتيب تحميل
 * الوحدات: مخزن المصادقة يستعيد حالته من التخزين المحلي لحظة إنشائه، فمشتركٌ
 * يُسجَّل بعده يرى الاستعادة «تغيّراً» فيمسح اختياراً صحيحاً عند كل إعادة
 * تحميل. المقارنة لا ترتيب لها ولا تُخطئ في الحالتين.
 */
/** الحقول التي يقوم عليها الحكم — لا الحالة كاملةً، كي تُنادى بحقولٍ مقروءة تفاعلياً */
export interface ArchiveSelection {
  yearId: number | null
  ownerUserId: number | null
  ownerSession: string | null
}

function isSelectionOwned(state: ArchiveSelection, userId: number | null, token: string | null): boolean {
  if (state.yearId === null) {
    return false
  }

  return (
    state.ownerUserId !== null &&
    state.ownerUserId === userId &&
    state.ownerSession !== null &&
    state.ownerSession === sessionFingerprint(token)
  )
}

/** نسخة تُنادى من داخل الواجهة، حيث المخزنان مقروءان تفاعلياً */
export function isArchiveSelectionOwned(
  state: ArchiveSelection,
  userId: number | null,
  token: string | null,
): boolean {
  return isSelectionOwned(state, userId, token)
}

/**
 * السنة التي تُرسَل في الترويسة الآن — وتنظيفُ ما لا يخصّ هذه الجلسة.
 *
 * تُنادى من معترض الطلبات، أي خارج دورة العرض، فالمسح هنا آمن ولا يُشغّل
 * تحديثاً أثناء الرسم. وهذا آخر حاجز قبل أن تغادر ترويسةٌ مسمومة المتصفّح.
 */
export function activeArchiveYearId(): number | null {
  const state = useArchiveYearStore.getState()

  if (state.yearId === null) {
    return null
  }

  const { user, token } = useAuthStore.getState()

  if (!isSelectionOwned(state, user?.id ?? null, token ?? null)) {
    state.exit()
    return null
  }

  return state.yearId
}
