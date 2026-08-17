import { useState } from 'react'
import { sileo } from 'sileo'
import { Archive, Eye, Megaphone, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnnouncementForm } from '@/modules/announcements/components/announcement-form'
import {
  useArchiveAnnouncementMutation,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  usePlatformAnnouncementsQuery,
  useUpdateAnnouncementMutation,
} from '@/modules/announcements/hooks'
import { toneFor } from '@/modules/announcements/tones'
import type { AnnouncementPayload, PlatformAnnouncement } from '@/modules/announcements/types'

const STATUS_TABS: { value: string | null; label: string }[] = [
  { value: null, label: 'الكل' },
  { value: 'published', label: 'منشور' },
  { value: 'draft', label: 'مسوّدة' },
  { value: 'archived', label: 'مؤرشف' },
]

const STATUS_CHIP: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-800',
  draft: 'bg-slate-100 text-slate-600',
  archived: 'bg-slate-100 text-slate-400',
}

const STATUS_LABEL: Record<string, string> = {
  published: 'منشور',
  draft: 'مسوّدة',
  archived: 'مؤرشف',
}

/**
 * لوحةُ إعلانات المنصّة — حيث يُكتَب ما يراه كلُّ مستخدمٍ في كلِّ مدرسة.
 *
 * كانت هذه الرسائلُ تُقال في مجموعةِ واتساب: من كان يتصفّح لحظتَها قرأها،
 * ومن لم يكن لم يعرف أنّ الخدمةَ متوقّفةٌ للصيانة فظنَّ النظامَ معطوباً.
 */
export function PlatformAnnouncementsPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformAnnouncement | null>(null)

  const { data, isLoading } = usePlatformAnnouncementsQuery(statusFilter)
  const createMutation = useCreateAnnouncementMutation()
  const updateMutation = useUpdateAnnouncementMutation()
  const archiveMutation = useArchiveAnnouncementMutation()
  const deleteMutation = useDeleteAnnouncementMutation()

  const items = data?.items ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function closeForm() {
    setIsFormOpen(false)
    setEditing(null)
  }

  function handleSubmit(payload: AnnouncementPayload, status: 'draft' | 'published') {
    const onSuccess = () => {
      sileo.success({
        title: status === 'published' ? 'نُشر الإعلان — يظهر للمستخدمين خلال دقيقة' : 'حُفظ كمسوّدة',
        duration: 4000,
      })
      closeForm()
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload }, { onSuccess })
    } else {
      createMutation.mutate(payload, { onSuccess })
    }
  }

  function handleArchive(announcement: PlatformAnnouncement) {
    /* التأكيدُ للمنشور وحدَه: أرشفةُ مسوّدةٍ لا تُغيّر شيئاً على أحد، وإطفاءُ
       إعلانٍ حيٍّ يُغيّر ما يراه كلُّ مستخدم. والسؤالُ في غير موضعه يُدرَّب
       الناشرُ على تجاهله فلا ينفع في موضعه. */
    if (announcement.status === 'published') {
      const confirmed = window.confirm(
        `سيُطفأ «${announcement.title}» ولن يظهر لأحدٍ بعد الآن. متأكّد؟`,
      )
      if (!confirmed) return
    }

    archiveMutation.mutate(announcement.id, {
      onSuccess: () => sileo.success({ title: 'أُرشف الإعلان', duration: 3000 }),
    })
  }

  function handleDelete(announcement: PlatformAnnouncement) {
    const confirmed = window.confirm(
      `حذفٌ نهائيٌّ لـ «${announcement.title}» — يُمسح معه سجلُّ من قرأه. متأكّد؟`,
    )
    if (!confirmed) return

    deleteMutation.mutate(announcement.id, {
      onSuccess: () => sileo.success({ title: 'حُذف الإعلان', duration: 3000 }),
    })
  }

  return (
    <section className="space-y-6">
      {/* ══ الترويسة ══ */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Megaphone className="h-6 w-6 text-indigo-600" />
              إعلانات المنصّة
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              صيانةٌ، تحديثُ نسخة، تحدٍّ — يظهر لكلِّ المدارس خلال دقيقةٍ من النشر.
            </p>
          </div>

          {!isFormOpen ? (
            <Button
              onClick={() => {
                setEditing(null)
                setIsFormOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إعلان جديد
            </Button>
          ) : null}
        </header>
      </div>

      {/* ══ النموذج ══ */}
      {isFormOpen ? (
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            {editing ? 'تعديل الإعلان' : 'إعلان جديد'}
          </h2>
          <AnnouncementForm
            editing={editing}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </div>
      ) : null}

      {/* ══ التصفية ══ */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === tab.value
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 text-slate-600 hover:border-indigo-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ القائمة ══ */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="rounded-3xl border border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
            جارٍ التحميل…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">لا إعلانات هنا</p>
            <p className="mt-1 text-xs text-slate-400">
              أوّلُ إعلانٍ تنشره سيظهر لكلِّ من يسجّل دخوله للنظام.
            </p>
          </div>
        ) : (
          items.map((announcement) => {
            const tone = toneFor(announcement.type)
            const Icon = tone.icon

            return (
              <article
                key={announcement.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.chip}`}>
                        <Icon className="h-3 w-3" />
                        {tone.label}
                      </span>

                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CHIP[announcement.status]}`}>
                        {STATUS_LABEL[announcement.status]}
                      </span>

                      <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                        {announcement.display === 'banner' ? 'شريط علوي' : 'نافذة منبثقة'}
                        {announcement.dismissible ? '' : ' · ثابت'}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-bold text-slate-900">{announcement.title}</h3>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-600">
                      {announcement.body}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {announcement.target_roles?.length
                          ? `${announcement.target_roles.length} أدوار`
                          : 'كلُّ الأدوار'}
                      </span>

                      {/* عدّادُ الإخفاء = من قرأه وأغلقه بيده. رقمٌ لا يوجد لو
                          كان الإخفاءُ محفوظاً في متصفّحاتٍ لا نراها. */}
                      {announcement.dismissible ? (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          أخفاه {announcement.dismissals_count ?? 0}
                        </span>
                      ) : null}

                      {announcement.ends_at ? (
                        <span>ينتهي {new Date(announcement.ends_at).toLocaleString('ar-SA')}</span>
                      ) : null}

                      {announcement.priority > 0 ? <span>أولويّة {announcement.priority}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-slate-600"
                      onClick={() => {
                        setEditing(announcement)
                        setIsFormOpen(true)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </Button>

                    {announcement.status !== 'archived' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-amber-700"
                        disabled={archiveMutation.isPending}
                        onClick={() => handleArchive(announcement)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        أرشفة
                      </Button>
                    ) : null}

                    {/* الحذفُ لا يُصيَّر للمنشور: الباك يرفضه (٤٢٢) وإخفاءُ الزرِّ
                        هنا يمنع الرحلةَ التي تنتهي برفض. أرشِفْه أوّلاً. */}
                    {announcement.status !== 'published' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-rose-600"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(announcement)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
