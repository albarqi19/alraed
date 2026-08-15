import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage, getStatusCode } from '@/services/api/errors'
import { guardianQueryKeys } from '../query-keys'
import {
  acknowledgeGuardianAutoCall,
  fetchGuardianAutoCallQueue,
  fetchGuardianAutoCallSettings,
  isActiveAutoCall,
  requestGuardianAutoCall,
  type GuardianAutoCallEntry,
} from '../auto-call-api'

/**
 * خطّافات بيانات النداء الآليّ في بوّابة وليّ الأمر.
 *
 * لماذا ملفٌّ ثالث بجوار `auto-call-api.ts` و`use-auto-call-gate.ts`؟ لأن
 * الطابور صار يُقرأ من موضعين لا موضعٍ واحد: لوحة «النداء الآلي» في صفحة
 * الخدمات، والشريط المقيم فوق كلّ صفحات البوّابة. لو بقي كلٌّ منهما يكتب
 * استعلامه لتباعد المفتاحان أو الإعدادات مع أوّل تعديل، فظهر الزرّ في موضعٍ
 * واختفى في آخر. مصدرٌ واحدٌ لخيارات الاستعلام يمنع ذلك.
 */

/**
 * إعدادات النداء (التفعيل والنافذة والسياج).
 *
 * دقيقةٌ واحدة `staleTime` لأن الأدمن قد يُطفئ الخدمة أو يضيّق نافذتها أثناء
 * اليوم، ووليُّ الأمر يفتح البوّابة مرّةً ويتركها.
 */
export function useGuardianAutoCallSettingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: guardianQueryKeys.autoCallSettings(),
    queryFn: fetchGuardianAutoCallSettings,
    enabled,
    staleTime: 60_000,
    retry: 1,
  })
}

/**
 * النداءات القائمة لهذا الوليّ.
 *
 * `select` يُرشِّح المُقَرَّ والمنتهيَ والملغى: ما لا يحتاج فعلاً من وليّ
 * الأمر لا يُعرض له. والترشيح هنا لا في المكوّنات كي لا ينسى موضعٌ منها
 * الترشيح فيعرض زرّ استلامٍ لنداءٍ مُغلق.
 *
 * وإعادةُ القراءة عند عودة التركيز إلى النافذة هي جوهر «يصمد أمام إعادة
 * التحميل»: وليُّ الأمر ينادي، يقفل الشاشة، يستلم ابنه، ثم يفتح جوّاله —
 * فيجب أن يجد الزرّ حيث تركه، لا شاشةً بيضاء.
 */
export function useGuardianAutoCallQueueQuery(enabled: boolean) {
  return useQuery({
    queryKey: guardianQueryKeys.autoCallQueue(),
    queryFn: fetchGuardianAutoCallQueue,
    enabled,
    select: (entries: GuardianAutoCallEntry[]) => entries.filter(isActiveAutoCall),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // لا استطلاعَ دوريّ إلا ونداءٌ قائم: حينها وحده يتغيّر شيءٌ يستحقّ الطلب
    // (إعلانٌ جديد، أو إقرارٌ من موظّف الاستقبال، أو انتهاء مهلة).
    refetchInterval: (query) => {
      const hasOutstanding = (query.state.data ?? []).some(isActiveAutoCall)
      return hasOutstanding ? 20_000 : false
    },
    retry: 1,
  })
}

/**
 * إرسال النداء — مع بذر الطابور بالنداء المُنشأ فوراً.
 *
 * الكتابة في الذاكرة قبل إعادة القراءة مقصودة: مسار `GET queue` قد يتأخّر
 * جولةً كاملة، وفي تلك الجولة لا يرى وليُّ الأمر زرَّ الاستلام فيظنّ أن لا
 * شيء مطلوبٌ منه.
 *
 * وحتى الفشل يُعيد القراءة: أشهر رفضٍ هنا «يوجد نداء نشط بالفعل لهذا الطالب»
 * — أي أن نداءً قائماً موجود ولا زرَّ استلامٍ ظاهرٌ له. فالرفض نفسه دليلٌ على
 * أن نسخة الشاشة قديمة.
 */
export function useGuardianAutoCallRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: requestGuardianAutoCall,
    onSuccess: (entry) => {
      if (entry) {
        queryClient.setQueryData<GuardianAutoCallEntry[]>(guardianQueryKeys.autoCallQueue(), (current) => [
          ...(current ?? []).filter((item) => item.id !== entry.id),
          entry,
        ])
      }
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.autoCallQueue() })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.autoCallQueue() })
    },
  })
}

/**
 * إقرار الاستلام.
 *
 * النجاح يُسقط النداء من النسخة المحلّية قبل إعادة القراءة حتى تختفي البطاقة
 * في اللحظة نفسها؛ والفشل الذي يعرف فيه الخادم شيئاً لا تعرفه الشاشة (٤٠٣
 * ليس نداءك · ٤٠٩ الحالة تغيّرت · ٤٠٤ لم يعد موجوداً) يُعيد القراءة ليستوي
 * المعروض مع الحقيقة.
 *
 * وما لا يُعيد القراءة مقصودٌ أيضاً: انقطاع الشبكة لا يعني أن النداء ذهب،
 * فيبقى في الذاكرة ويبقى زرُّه ظاهراً ليُعيد المحاولة.
 */
export function useAcknowledgeGuardianAutoCallMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (callId: number) => acknowledgeGuardianAutoCall(callId),
    onSuccess: (_entry, callId) => {
      queryClient.setQueryData<GuardianAutoCallEntry[]>(guardianQueryKeys.autoCallQueue(), (current) =>
        (current ?? []).filter((item) => item.id !== callId),
      )
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.autoCallQueue() })
    },
    onError: (error) => {
      const status = getStatusCode(error)
      if (status === 403 || status === 404 || status === 409) {
        queryClient.invalidateQueries({ queryKey: guardianQueryKeys.autoCallQueue() })
      }
    },
  })
}

/**
 * ترجمة فشل الإقرار إلى جملةٍ يفهمها الواقف عند بوّابة المدرسة.
 *
 * لكلّ رمزٍ فعلٌ مختلف: ٤٠٣ يعني «هذا ليس نداءك» فلا تُعِد المحاولة؛ ٤٠٩ يعني
 * «فات أوان الإقرار» ورسالة الخادم تقول أيَّ حالٍ صار إليه؛ ٤٠١ يعني «أعد
 * الدخول» لا «أعد الضغط»؛ وانقطاع الشبكة وحده هو الذي تُجدي معه إعادة
 * الضغطة. رسالةٌ واحدة عامّة لهذه الأربع تُرسل وليَّ الأمر في الاتجاه الخطأ
 * ثلاث مرّاتٍ من أربع.
 */
export function describeAcknowledgeFailure(error: unknown): string {
  const status = getStatusCode(error)

  if (status === 401) {
    return 'انتهت جلستك — أعد الدخول إلى البوابة ثم أكّد الاستلام.'
  }

  if (status === 403) {
    return 'هذا النداء ليس لك.'
  }

  if (status === 404) {
    return 'لم يعد هذا النداء موجوداً — ربما نُقل إلى سجلّ اليوم.'
  }

  if (status === 409) {
    // رسالة الخادم هنا أدقّ من أيّ نصٍّ ثابت لأنها تحمل الحالة الفعليّة:
    // «أُقرّ سلفاً» غير «انتهت مهلته» غير «أُلغي».
    return getErrorMessage(error, 'لم يعد هذا النداء قابلاً للإقرار — إمّا أُقرّ سلفاً أو انتهت مهلته.')
  }

  return getErrorMessage(error, 'تعذّر تأكيد الاستلام. تحقّق من الشبكة ثم أعد المحاولة.')
}
