import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { toneFor } from '../tones'
import type { ActiveAnnouncement } from '../types'

interface AnnouncementModalProps {
  announcement: ActiveAnnouncement
  /** يُسجَّل على السيرفر: لن يعود هذا الإعلانُ لهذا المستخدم أبداً. */
  onAcknowledge: (id: number) => void
  /** إخفاءٌ لهذه الجلسة وحدها — للنافذة غيرِ القابلة للإخفاء الدائم. */
  onSessionClose: (id: number) => void
}

/**
 * نافذةُ الإعلان المنبثقة.
 *
 * ═══ ماذا يعني `dismissible` في نافذةٍ منبثقة؟ ═══
 *
 * ليس «هل يوجد زرُّ إغلاق» — النافذةُ تحجب الشاشة، ونافذةٌ بلا مخرجٍ تعني
 * نظاماً لا يُستعمَل. الزرُّ موجودٌ دائماً.
 *
 * بل «هل يُنسى إغلاقُها»:
 *   • `dismissible = true`  → الإغلاقُ يُسجَّل على السيرفر فلا تعود أبداً.
 *                              هذا هو «تُقرأ مرّة» في معناه الحقيقيّ.
 *   • `dismissible = false` → الإغلاقُ لهذه الجلسة فقط، وتعود مع كلِّ تحديثٍ
 *                              للصفحة ما دام الإعلانُ حيّاً. للإعلان الذي
 *                              يجب أن يُلاحَق: «الخدمةُ متوقّفةٌ الآن».
 *
 * والاختيارُ الثاني هو ما يجعل الحقلَ ذا معنى في النافذة: بدونه لا يملك مالكُ
 * المنصّة وسيلةً لإعلانٍ يبقى ملاحقاً بعد أن يُغلَق مرّة.
 *
 * ═══ ولماذا لا يُغلق النقرُ الخارجيُّ ولا Esc؟ ═══
 *
 * لأنّ النافذةَ اختيارٌ صريحٌ من الناشر: من اختار «نافذة» على «شريط» أرادها
 * أن تُقرأ لا أن تُلمَح. ونقرةٌ في غير موضعها أو Esc على عادةٍ من نافذةٍ أخرى
 * تُسقطها قبل أن تُقرأ، ثمّ لا تعود إن كانت `dismissible` — فيضيع الإعلانُ
 * إلى الأبد بنقرةٍ لم يقصدها أحد. المخرجُ زرٌّ يُقصَد.
 */
export function AnnouncementModal({ announcement, onAcknowledge, onSessionClose }: AnnouncementModalProps) {
  const tone = toneFor(announcement.type)
  const Icon = tone.icon
  const isInternalLink = announcement.action_url?.startsWith('/')

  const close = () => {
    if (announcement.dismissible) {
      onAcknowledge(announcement.id)
    } else {
      onSessionClose(announcement.id)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        /* `Dialog` ينادي هذا عند Esc والنقر الخارجيّ أيضاً، وكلاهما ممنوعٌ
           أدناه بـ `onEscapeKeyDown`/`onPointerDownOutside`. فلو وصلَنا
           `false` من طريقٍ ثالثٍ لم نتوقّعه، نعامله معاملةَ الزرّ لا نتجاهله
           — نافذةٌ تأبى الإغلاقَ أسوأُ من نافذةٍ تُغلَق بغير قصد. */
        if (!next) close()
      }}
    >
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        /* `DialogContent` يرسم زرَّ إغلاقٍ في زاويته افتراضيّاً، وهو مخرجٌ
           ثانٍ بجانب زرِّنا الصريح — مقبولٌ ومقصود: كلاهما يمرّ بـ
           `onOpenChange` أعلاه فيسلك الطريقَ نفسَه. */
      >
        <DialogHeader className={`space-y-3 border-b px-6 py-5 text-right ${tone.modalHeader}`}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/70 shadow-sm">
              <Icon className={`h-5 w-5 ${tone.modalIcon}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{tone.label}</p>
              <DialogTitle className="text-lg font-bold text-slate-900">{announcement.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          {/* `whitespace-pre-line` مقصود: الناشرُ يكتب في `textarea` وأسطرُه
              نيّةٌ لا مصادفة — فطيُّها في فقرةٍ واحدةٍ يمسح تنسيقَه. */}
          <div className="whitespace-pre-line px-6 py-5 text-sm leading-7 text-slate-700">
            {announcement.body}
          </div>
        </DialogDescription>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          {announcement.action_url ? (
            isInternalLink ? (
              <Button asChild variant="outline" size="sm" onClick={close}>
                <Link to={announcement.action_url}>{announcement.action_label ?? 'التفاصيل'}</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href={announcement.action_url} target="_blank" rel="noopener noreferrer">
                  {announcement.action_label ?? 'التفاصيل'}
                </a>
              </Button>
            )
          ) : null}

          <Button size="sm" onClick={close}>
            {/* النصُّ يقول الحقيقة: «فهمت» تعني لن تعود، و«إغلاق» تعني ستعود.
                لو استوى النصّان لظنَّ من أغلق نافذةً ملاحقةً أنّه أنهاها. */}
            {announcement.dismissible ? 'فهمت، لا تُظهره مرّةً أخرى' : 'إغلاق'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
