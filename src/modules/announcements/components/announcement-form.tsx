import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ANNOUNCEMENT_TYPE_OPTIONS } from '../tones'
import { AnnouncementBar } from './announcement-bar'
import type {
  ActiveAnnouncement,
  AnnouncementDisplay,
  AnnouncementPayload,
  AnnouncementType,
  PlatformAnnouncement,
} from '../types'

/** أدوارُ الاستهداف — القيمُ نفسُها التي يتحقّق منها الباك في `validated()`. */
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'school_principal', label: 'قائد المدرسة' },
  { value: 'teacher', label: 'المعلمون' },
  { value: 'deputy_teachers', label: 'وكيل شؤون المعلمين' },
  { value: 'deputy_students', label: 'وكيل شؤون الطلاب' },
  { value: 'student_counselor', label: 'المرشد الطلابي' },
  { value: 'administrative_staff', label: 'الإداريون' },
  { value: 'learning_resources_admin', label: 'أمين مصادر التعلّم' },
]

interface AnnouncementFormProps {
  /** حاضرٌ = تعديل، غائبٌ = إنشاء. */
  editing?: PlatformAnnouncement | null
  isSubmitting: boolean
  onSubmit: (payload: AnnouncementPayload, status: 'draft' | 'published') => void
  onCancel: () => void
}

/**
 * نموذجُ كتابة الإعلان — ومعاينتُه الحيّة.
 *
 * ═══ لماذا معاينةٌ حيّة؟ ═══
 *
 * هذا النموذج يكتب شيئاً يظهر لكلِّ مستخدمٍ في كلِّ مدرسةٍ في اللحظة التالية،
 * ولا يوجد «تراجُع» بعد أن يقرأه الناس. والناشرُ لا يستطيع اختبارَه على نفسه
 * أوّلاً — نشرُه هو اختبارُه. فالمعاينةُ هي الشيءُ الوحيد الذي يمنع نشرَ نصٍّ
 * مقطوعٍ أو لونٍ خاطئ.
 *
 * وهي المكوّنُ الحقيقيُّ لا محاكاةً له: `AnnouncementBar` نفسُها التي تُصيَّر
 * في القوالب. محاكاةٌ مستقلّةٌ كانت ستنحرف عن الأصل عند أوّل تعديلٍ في أحدهما،
 * فتُطمئن الناشرَ على شكلٍ لا يراه أحد.
 */
export function AnnouncementForm({ editing, isSubmitting, onSubmit, onCancel }: AnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<AnnouncementType>('info')
  const [display, setDisplay] = useState<AnnouncementDisplay>('banner')
  const [dismissible, setDismissible] = useState(true)
  const [actionLabel, setActionLabel] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [priority, setPriority] = useState(0)

  /* تعبئةُ النموذج عند التعديل. `editing?.id` هو التابع لا الكائنُ نفسه:
     الكائنُ مرجعٌ جديدٌ بعد كلِّ جلبٍ للقائمة، فيُصفَّر ما كتبه الناشرُ توّاً
     كلَّ ثلاثين ثانية. */
  useEffect(() => {
    if (!editing) {
      setTitle('')
      setBody('')
      setType('info')
      setDisplay('banner')
      setDismissible(true)
      setActionLabel('')
      setActionUrl('')
      setRoles([])
      setStartsAt('')
      setEndsAt('')
      setPriority(0)
      return
    }

    setTitle(editing.title)
    setBody(editing.body)
    setType(editing.type)
    setDisplay(editing.display)
    setDismissible(editing.dismissible)
    setActionLabel(editing.action_label ?? '')
    setActionUrl(editing.action_url ?? '')
    setRoles(editing.target_roles ?? [])
    setStartsAt(editing.starts_at ? editing.starts_at.slice(0, 16) : '')
    setEndsAt(editing.ends_at ? editing.ends_at.slice(0, 16) : '')
    setPriority(editing.priority)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id])

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !isSubmitting

  function buildPayload(status: 'draft' | 'published'): AnnouncementPayload {
    return {
      title: title.trim(),
      body: body.trim(),
      type,
      display,
      dismissible,
      action_label: actionLabel.trim() || null,
      action_url: actionUrl.trim() || null,
      // مصفوفةٌ فارغةٌ تعني «الكلّ» — والباكُ يطبّعها إلى null أيضاً، لكنّ
      // التطبيعَ هنا يوفّر رحلةً تُرجع إعلاناً لا يراه أحد.
      target_roles: roles.length > 0 ? roles : null,
      target_schools: null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      status,
      priority,
    }
  }

  /** كائنُ المعاينة — يُغذّي المكوّنَ الحقيقيّ بحقول الشاشة. */
  const preview: ActiveAnnouncement = {
    id: -1,
    scope: 'platform',
    title: title.trim() || 'عنوان الإعلان',
    body: body.trim() || 'نصّ الإعلان يظهر هنا…',
    type,
    display,
    dismissible,
    action_label: actionLabel.trim() || null,
    action_url: actionUrl.trim() || null,
    priority,
    starts_at: null,
    ends_at: null,
  }

  return (
    <div className="space-y-6">
      {/* ══ المعاينة ══ */}
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">
          {display === 'banner' ? 'كما سيظهر أعلى الشاشة' : 'نصُّ النافذة — تُعرَض في المنتصف وتحجب الصفحة'}
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          {/* المعاينةُ للشريط وحدَه: النافذةُ لو صُيِّرت هنا حجبت النموذجَ الذي
              يُكتَب فيها — فيُعاين الناشرُ ما يمنعه من الكتابة. فتُعرَض ألوانُها
              ونصُّها في بطاقةٍ هادئةٍ بدلاً منها. */}
          {display === 'banner' ? (
            <AnnouncementBar announcement={preview} onDismiss={() => undefined} />
          ) : (
            <div className="bg-slate-50 px-5 py-4">
              <p className="font-bold text-slate-900">{preview.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{preview.body}</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ المحتوى ══ */}
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ann-title">العنوان</Label>
          <Input
            id="ann-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثال: صيانة مجدولة مساء الجمعة"
            maxLength={150}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-body">النصّ</Label>
          <Textarea
            id="ann-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="اكتب ما تريد إبلاغه…"
            rows={4}
            maxLength={2000}
          />
          <p className="text-[11px] text-slate-400">{body.length} / ٢٠٠٠ حرف</p>
        </div>
      </div>

      {/* ══ النوع ══ */}
      <div className="space-y-2">
        <Label>النوع (يحكم اللون والأيقونة)</Label>
        <div className="flex flex-wrap gap-2">
          {ANNOUNCEMENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                type === option.value
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ شكلُ العرض والإغلاق ══ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>شكل العرض</Label>
          <div className="flex gap-2">
            {([
              { value: 'banner' as const, label: 'شريط علوي', hint: 'يُقرأ ولا يعطّل العمل' },
              { value: 'modal' as const, label: 'نافذة منبثقة', hint: 'تحجب الشاشة حتى تُقرأ' },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDisplay(option.value)}
                className={`flex-1 rounded-xl border p-3 text-right transition ${
                  display === option.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                <p className="text-sm font-bold text-slate-800">{option.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>الإغلاق</Label>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <Switch id="ann-dismissible" checked={dismissible} onCheckedChange={setDismissible} />
            <div className="min-w-0">
              {/* ═══ النصُّ يشرح الفرقَ بين الشكلَين لأنّ الحقلَ نفسَه يعني
                  شيئَين مختلفَين ═══
                  في الشريط: هل يوجد زرُّ إغلاقٍ أصلاً.
                  في النافذة: هل تعود بعد إغلاقها (الزرُّ موجودٌ دائماً — نافذةٌ
                  بلا مخرجٍ تعني نظاماً لا يُستعمَل).
                  وبلا هذا الشرح على الشاشة يُطفئ الناشرُ المفتاحَ في نافذةٍ
                  ظانّاً أنّه ألغى زرَّ إغلاقها. */}
              <p className="text-sm font-semibold text-slate-800">
                {dismissible ? 'يمكن للمستخدم إخفاؤه' : 'لا يُخفى'}
              </p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                {display === 'banner'
                  ? dismissible
                    ? 'زرُّ إغلاقٍ في الشريط — من أخفاه لا يعود له.'
                    : 'بلا زرِّ إغلاق — يبقى معروضاً لكلِّ من يستهدفه حتى تُنهيه أنت.'
                  : dismissible
                    ? 'تُقرأ مرّةً واحدة — من أغلقها لا تعود له.'
                    : 'تعود مع كلِّ تحديثٍ للصفحة حتى تُنهيها أنت — للإعلان الذي يجب أن يُلاحَق.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ زرُّ الإجراء ══ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ann-action-label">نصُّ الزرّ (اختياري)</Label>
          <Input
            id="ann-action-label"
            value={actionLabel}
            onChange={(event) => setActionLabel(event.target.value)}
            placeholder="التفاصيل"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-action-url">رابط الزرّ (اختياري)</Label>
          <Input
            id="ann-action-url"
            value={actionUrl}
            onChange={(event) => setActionUrl(event.target.value)}
            placeholder="/admin/subscription أو https://…"
            dir="ltr"
          />
          <p className="text-[11px] text-slate-400">
            المسارُ الداخليُّ يبدأ بـ / ويُفتح في التبويب نفسه، والخارجيُّ في تبويبٍ جديد.
          </p>
        </div>
      </div>

      {/* ══ الاستهداف ══ */}
      <div className="space-y-2">
        <Label>الأدوار المستهدفة</Label>
        <p className="text-[11px] text-slate-500">
          {roles.length === 0 ? 'لم تُحدَّد أدوار — سيظهر لكلِّ من يسجّل دخوله.' : `${roles.length} أدوار محدَّدة.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((option) => {
            const selected = roles.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setRoles((current) =>
                    current.includes(option.value)
                      ? current.filter((role) => role !== option.value)
                      : [...current, option.value],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:border-teal-200'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ التوقيت والأولويّة ══ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ann-starts">يبدأ (اختياري)</Label>
          <Input
            id="ann-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <p className="text-[11px] text-slate-400">اتركه فارغاً ليبدأ فوراً.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-ends">ينتهي (اختياري)</Label>
          <Input
            id="ann-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
          <p className="text-[11px] text-slate-400">اتركه فارغاً ليبقى حتى تُؤرشفه.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-priority">الأولويّة</Label>
          <Input
            id="ann-priority"
            type="number"
            min={0}
            max={255}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value) || 0)}
          />
          <p className="text-[11px] text-slate-400">الأكبرُ يُعرَض أوّلاً.</p>
        </div>
      </div>

      {/* ══ الأزرار ══ */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSubmit}
          onClick={() => onSubmit(buildPayload('draft'), 'draft')}
        >
          حفظ كمسوّدة
        </Button>
        {/* النشرُ فعلٌ لا يُتراجَع عنه، فنصُّه يقول ذلك: «الآن» لا «حفظ». */}
        <Button type="button" size="sm" disabled={!canSubmit} onClick={() => onSubmit(buildPayload('published'), 'published')}>
          {isSubmitting ? 'جارٍ…' : editing ? 'حفظ ونشر' : 'انشر الآن'}
        </Button>
      </div>
    </div>
  )
}
