/** أنواعُ الإعلان — النوعُ يحكم اللونَ والأيقونة، ولا يحكم شيئاً في المنطق. */
export type AnnouncementType = 'maintenance' | 'update' | 'alert' | 'info' | 'celebration'

/** شكلُ العرض: شريطٌ علويّ، أو نافذةٌ منبثقةٌ تُقرأ مرّة. */
export type AnnouncementDisplay = 'banner' | 'modal'

export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export type AnnouncementScope = 'platform' | 'school'

/**
 * الإعلانُ كما يراه المستهلك — حقولُ العرض وحدها.
 *
 * `/announcements/active` لا يُرجع `target_roles` ولا `target_schools` ولا
 * `created_by`: من يرى الإعلانَ لا شأنَ له بمن استُهدف غيرُه، وإرسالُ ذلك
 * لكلِّ متصفّحٍ كلَّ دقيقةٍ حملٌ بلا مستهلك.
 */
export interface ActiveAnnouncement {
  id: number
  scope: AnnouncementScope
  title: string
  body: string
  type: AnnouncementType
  display: AnnouncementDisplay
  dismissible: boolean
  action_label: string | null
  action_url: string | null
  priority: number
  starts_at: string | null
  ends_at: string | null
}

/** الإعلانُ كما يراه ناشرُه في لوحة المنصّة — بحقوله كلّها. */
export interface PlatformAnnouncement extends ActiveAnnouncement {
  status: AnnouncementStatus
  target_roles: string[] | null
  target_schools: number[] | null
  dismissals_count?: number
  created_at: string
  creator?: { id: number; name: string } | null
}

/** حمولةُ النشر. `scope` غائبٌ عمداً — الباك يفرضه `platform`. */
export interface AnnouncementPayload {
  title: string
  body: string
  type: AnnouncementType
  display: AnnouncementDisplay
  dismissible: boolean
  action_label?: string | null
  action_url?: string | null
  target_roles?: string[] | null
  target_schools?: number[] | null
  starts_at?: string | null
  ends_at?: string | null
  status: AnnouncementStatus
  priority?: number
}
