import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toneFor } from '../tones'
import type { ActiveAnnouncement } from '../types'

interface AnnouncementBarProps {
  announcement: ActiveAnnouncement
  onDismiss: (id: number) => void
}

/**
 * شريطُ الإعلان العلويّ.
 *
 * ═══ لماذا زرُّ الإغلاق غائبٌ من الشجرة لا مخفيٌّ بـ CSS؟ ═══
 *
 * تنبيهُ الاشتراك في هذا النظام حسمها قبلنا، والحجّةُ هي هي: `hidden` أو
 * `disabled` يُبقيان الزرَّ في الـ DOM، فيبلغه قارئُ الشاشة ومفتاحُ Tab ومن
 * يشطب صنفاً من أدوات المطوّر. وإعلانُ إيقافٍ مؤقّتٍ نُشر ثابتاً يجب أن يبقى
 * ثابتاً — فالغيابُ التامّ هو الضمانةُ الوحيدة التي لا تُلتَفّ. والباكُ يرفض
 * الطلبَ اليدويّ أيضاً؛ حارسان لا واحد.
 *
 * ولا Esc هنا ولا نقرٌ خارجيّ: هذا شريطٌ في تدفّق الصفحة لا نافذةٌ طافية،
 * فلا طبقةَ تعتيمٍ تُنقَر ولا فخَّ تركيزٍ يُهرَب منه.
 */
export function AnnouncementBar({ announcement, onDismiss }: AnnouncementBarProps) {
  const tone = toneFor(announcement.type)
  const Icon = tone.icon

  const isInternalLink = announcement.action_url?.startsWith('/')

  return (
    <div
      /* `role="status"` لا `alert`: الثاني يقطع على قارئ الشاشة ما يقرؤه
         فوراً، وإعلانٌ يظهر بنبضةٍ كلَّ دقيقةٍ لا يستحقّ مقاطعةَ من يعمل. */
      role="status"
      className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm shadow-sm ${tone.bar}`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />

      <span className="font-bold">{announcement.title}</span>

      {/* الفاصلُ يُخفى على الجوّال حيث ينكسر النصُّ سطرَين فلا معنى لفاصلٍ أفقيّ. */}
      <span className="hidden opacity-40 sm:inline">·</span>

      {/* `min-w-0` إلزاميّ: بدونه يرفض العنصرُ المرنُ الانضغاطَ فيدفع زرَّ
          الإغلاق خارج الشريط عند النصوص الطويلة. */}
      <span className="min-w-0 flex-1 opacity-95">{announcement.body}</span>

      {announcement.action_url ? (
        isInternalLink ? (
          <Link
            to={announcement.action_url}
            className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold transition hover:bg-white/30"
          >
            {announcement.action_label ?? 'التفاصيل'}
          </Link>
        ) : (
          <a
            href={announcement.action_url}
            target="_blank"
            /* `noopener` ضدَّ وصولِ الصفحةِ الهدفِ إلى `window.opener`، ولا
               ثمنَ له. والرابطُ يكتبه مالكُ المنصّة لا مستخدمٌ مجهول، لكنّ
               الحارسَ يُوضَع لأنّ الحمولةَ تمرّ عبر الشبكة قبل أن تُصيَّر. */
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold transition hover:bg-white/30"
          >
            {announcement.action_label ?? 'التفاصيل'}
          </a>
        )
      ) : null}

      {/* ★ القاعدة: لا يُصيَّر إلّا حين يأذن الناشر. */}
      {announcement.dismissible ? (
        <button
          type="button"
          onClick={() => onDismiss(announcement.id)}
          aria-label={`إخفاء إعلان: ${announcement.title}`}
          title="إخفاء — لن يظهر لك هذا الإعلان مرّةً أخرى"
          className={`shrink-0 rounded-md p-1 opacity-80 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 ${tone.barClose}`}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
