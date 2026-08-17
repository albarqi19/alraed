import { useCallback, useMemo, useState } from 'react'
import { useActiveAnnouncementsQuery, useDismissAnnouncementMutation } from '../hooks'
import { AnnouncementBar } from './announcement-bar'
import { AnnouncementModal } from './announcement-modal'

/**
 * المُنسِّق — نقطةُ الوصل الوحيدة بين الإعلانات والقوالب.
 *
 * تُركَّب مرّةً في كلِّ قالب (`admin-shell`، `teacher-shell`) ولا شيءَ غيرها،
 * فيبقى التركيبُ سطراً واحداً ويبقى المنطقُ كلُّه هنا. وأيُّ قالبٍ يُضاف
 * لاحقاً يحصل على الميزة كاملةً بسطرٍ واحد.
 *
 * ═══ نافذةٌ واحدةٌ في المرّة، وأشرطةٌ متعدّدة ═══
 *
 * الأشرطةُ تتراكم رأسيّاً فيقرؤها المستخدم كلَّها (والباك يحدّها بثلاثة).
 * والنوافذُ لا تتراكم: نافذتان فوق بعضهما تحجبان الشاشةَ مرّتَين، والثانيةُ
 * تظهر بعد الأولى — فالأعلى أولويّةً يُعرَض أوّلاً، والتاليةُ تنتظر دورها.
 */
export function AnnouncementHost() {
  const { data: announcements } = useActiveAnnouncementsQuery()
  const dismiss = useDismissAnnouncementMutation()

  /**
   * المُغلَقُ لهذه الجلسة — للنوافذ غير القابلة للإخفاء الدائم.
   *
   * حالةٌ في الذاكرة لا في `localStorage` عن قصد: هذا بالضبط معنى «لهذه
   * الجلسة». الناشرُ الذي اختار `dismissible = false` في نافذةٍ أراد أن تعود
   * مع كلِّ تحديثٍ للصفحة، وحفظُها في المتصفّح يُبطل ما أراد.
   */
  const [sessionClosed, setSessionClosed] = useState<number[]>([])

  const handleSessionClose = useCallback((id: number) => {
    setSessionClosed((current) => (current.includes(id) ? current : [...current, id]))
  }, [])

  const handleAcknowledge = useCallback(
    (id: number) => {
      /* الإغلاقُ المحليُّ يسبق الطلب: `useDismissAnnouncementMutation` تُحدِّث
         الكاش متفائلةً، لكنّ إضافةَ المعرّف هنا أيضاً تحمي من حالةٍ واحدة —
         فشلُ الطلب فتُرجَع البيانات، فتعود نافذةٌ ضغط المستخدمُ «فهمت» فيها.
         عودتُها بعد تحديثِ الصفحة صحيحة (الإخفاءُ لم يُسجَّل)، وعودتُها في
         وجهه فوراً تبدو عطباً. */
      handleSessionClose(id)
      dismiss.mutate(id)
    },
    [dismiss, handleSessionClose],
  )

  const visible = useMemo(
    () => (announcements ?? []).filter((item) => !sessionClosed.includes(item.id)),
    [announcements, sessionClosed],
  )

  const bars = visible.filter((item) => item.display === 'banner')

  /* الأوّلُ وحدَه: `active` يرجع مرتَّباً (المنصّةُ ثمّ الأولويّة ثمّ الأحدث)
     فالمعروضُ هو الأهمّ، والباقي يظهر متى أُغلق. */
  const modal = visible.find((item) => item.display === 'modal')

  if (bars.length === 0 && !modal) return null

  return (
    <>
      {bars.length > 0 ? (
        /* `shrink-0` لأنّ القوالبَ تركّبه داخل عمودٍ مرن: بدونه ينضغط الشريطُ
           إلى صفرٍ حين تكون الصفحةُ في «النمط الملتصق» بلا تمريرٍ خارجيّ. */
        <div className="shrink-0">
          {bars.map((announcement) => (
            <AnnouncementBar
              key={announcement.id}
              announcement={announcement}
              onDismiss={handleAcknowledge}
            />
          ))}
        </div>
      ) : null}

      {modal ? (
        <AnnouncementModal
          key={modal.id}
          announcement={modal}
          onAcknowledge={handleAcknowledge}
          onSessionClose={handleSessionClose}
        />
      ) : null}
    </>
  )
}
