import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import {
  archivePlatformAnnouncement,
  createPlatformAnnouncement,
  deletePlatformAnnouncement,
  dismissAnnouncement,
  fetchActiveAnnouncements,
  fetchPlatformAnnouncements,
  updatePlatformAnnouncement,
} from './api'
import { announcementQueryKeys } from './query-keys'
import type { ActiveAnnouncement, AnnouncementPayload } from './types'

/**
 * نبضةُ «الفوريّة».
 *
 * دقيقةٌ واحدة — وهي المقايضةُ الصريحة: البثُّ في هذا النظام معطَّل
 * (`BROADCAST_CONNECTION=log`)، فلا سبيلَ إلى الوصول اللحظيّ دون بنيةٍ لم
 * تُعَدَّ بعد. وأقلُّ من دقيقةٍ يضاعف الحملَ بلا فرقٍ يلاحظه بشر؛ وأكثرُ منها
 * يُفقد إعلانَ الإيقاف المؤقّت معناه.
 */
const POLL_INTERVAL_MS = 60 * 1000

export function useActiveAnnouncementsQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: announcementQueryKeys.active(),
    queryFn: fetchActiveAnnouncements,

    /* بلا هذا الشرط يُستدعى المسارُ على صفحة الهبوط وشاشة الدخول فيرجع ٤٠١،
       ويصير أوّلُ ما يراه الزائرُ في وحدة التحكّم خطأَ مصادقة. */
    enabled: isAuthenticated,

    refetchInterval: POLL_INTERVAL_MS,

    /* الأهمُّ من النبضة نفسها: من فتح النظام في تبويبٍ وتركه ساعتين ثمّ عاد
       يجب أن يرى إعلانَ الإيقاف في اللحظة التي عاد فيها لا بعد دقيقة. */
    refetchOnWindowFocus: true,

    /* تبويبٌ في الخلفيّة لا يُستجوَب: النبضةُ للحاضر لا للمنسيّ، وعشرةُ
       تبويباتٍ مفتوحةٍ على جهازٍ واحدٍ لا تعني عشرةَ أضعاف الحمل. */
    refetchIntervalInBackground: false,

    /* شبكةٌ منقطعةٌ أو خطأٌ عابر لا يجب أن يمحو شريطاً معروضاً: البياناتُ
       السابقة تبقى، والفشلُ صامتٌ — والإعلانُ ليس بياناتٍ يُبنى عليها قرار. */
    retry: 1,
    staleTime: 30 * 1000,
  })
}

/**
 * الإخفاء — بتحديثٍ متفائل.
 *
 * الشريطُ يختفي في اللحظة التي يُنقَر فيها الزرّ، قبل أن يردّ السيرفر: لا شيء
 * أسوأُ من زرِّ إغلاقٍ يُنقَر فلا يحدث شيءٌ لثلاثِ مئةِ مِلّي ثانية، فيُنقَر
 * ثانيةً. وإن فشل الطلب رجع الشريطُ — وهو الصواب، فالإخفاءُ لم يُسجَّل فعلاً.
 */
export function useDismissAnnouncementMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dismissAnnouncement,

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: announcementQueryKeys.active() })
      const previous = queryClient.getQueryData<ActiveAnnouncement[]>(announcementQueryKeys.active())

      queryClient.setQueryData<ActiveAnnouncement[]>(
        announcementQueryKeys.active(),
        (current) => (current ?? []).filter((item) => item.id !== id),
      )

      return { previous }
    },

    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(announcementQueryKeys.active(), context.previous)
      }

      /* الرسالةُ صريحةٌ هنا ولا تُترَك لشبكة الأمان في `MutationCache`: تلك
         تُستثنى تلقائيّاً لكلِّ طفرةٍ لها `onError` خاصّ — وهذه لها. فبدون هذا
         السطر يعود الشريطُ إلى مكانه بلا كلمة، ويقرأ المستخدمُ عودتَه عطباً في
         الزرّ لا فشلاً في الشبكة. */
      sileo.error({ title: 'تعذّر إخفاء الإعلان — حاول مرّةً أخرى', duration: 4000 })
    },

    /* لا `invalidateQueries` عند النجاح: النبضةُ التالية تجلب الحقيقةَ خلال
       دقيقة، وطلبٌ فوريٌّ إضافيٌّ بعد كلِّ إغلاقٍ حملٌ بلا فائدةٍ يلاحظها أحد. */
  })
}

// ══════════════════ لوحةُ الناشر — مالكُ المنصّة ══════════════════

export function usePlatformAnnouncementsQuery(status?: string | null) {
  return useQuery({
    queryKey: announcementQueryKeys.platformList(status),
    queryFn: () => fetchPlatformAnnouncements(status),
    staleTime: 30 * 1000,
  })
}

/**
 * بعد كلِّ تغييرٍ من الناشر: تُبطَل قائمتُه **و** خلاصتُه الحيّة.
 *
 * والثانيةُ هي المنسيّة: الناشرُ نفسُه مستخدمٌ في النظام، فمن نشر إعلاناً
 * للمديرين ثمّ لم يره على شاشته ظنَّ النشرَ فاشلاً وأعاده.
 */
function useInvalidateAnnouncements() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['announcements'] })
  }
}

export function useCreateAnnouncementMutation() {
  const invalidate = useInvalidateAnnouncements()

  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => createPlatformAnnouncement(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateAnnouncementMutation() {
  const invalidate = useInvalidateAnnouncements()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AnnouncementPayload }) =>
      updatePlatformAnnouncement(id, payload),
    onSuccess: invalidate,
  })
}

export function useArchiveAnnouncementMutation() {
  const invalidate = useInvalidateAnnouncements()

  return useMutation({
    mutationFn: archivePlatformAnnouncement,
    onSuccess: invalidate,
  })
}

export function useDeleteAnnouncementMutation() {
  const invalidate = useInvalidateAnnouncements()

  return useMutation({
    mutationFn: deletePlatformAnnouncement,
    onSuccess: invalidate,
  })
}
