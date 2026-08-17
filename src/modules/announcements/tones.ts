import { AlertTriangle, Info, PartyPopper, Sparkles, Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import type { AnnouncementType } from './types'

/**
 * لغةُ الألوان — تُعرَّف مرّةً هنا ويقرأها الشريطُ والنافذةُ ولوحةُ الناشر.
 *
 * كانت أوّلَ ما كُتب مكرَّراً في ثلاثة ملفّات، ونتيجتُه الحتميّة أن يُضاف نوعٌ
 * رابعٌ فيُلوَّن في اثنَين ويُنسى في الثالث — فيرى الناشرُ في معاينته لوناً لا
 * يرى المستخدمُ مثلَه.
 *
 * والنوعُ زينةٌ لا منطق: `alert` أحمرٌ صارخٌ ولا يعني أنّ الشريط لا يُغلَق —
 * الإغلاقُ يحكمه `dismissible` وحده. وهذا فصلٌ مقصود: الناشرُ قد يريد نبرةً
 * حادّةً في إعلانٍ يُقرأ ويُغلَق، وقد يريد نبرةً هادئةً في شريطٍ يجب أن يبقى.
 */
export interface AnnouncementTone {
  label: string
  icon: ComponentType<{ className?: string }>
  /** الشريطُ العلويّ: خلفيّةٌ مصمتةٌ ونصٌّ أبيض — يجب أن يُرى فوق أيِّ صفحة. */
  bar: string
  /** زرُّ الإغلاق داخل الشريط. */
  barClose: string
  /** رأسُ النافذة المنبثقة: نبرةٌ فاتحةٌ — النافذةُ تحجب الشاشة فلا تحتاج صراخاً. */
  modalHeader: string
  modalIcon: string
  /** شارةُ النوع في لوحة الناشر. */
  chip: string
}

export const ANNOUNCEMENT_TONES: Record<AnnouncementType, AnnouncementTone> = {
  maintenance: {
    label: 'صيانة',
    icon: Wrench,
    bar: 'bg-amber-600 text-white',
    barClose: 'hover:bg-amber-700/60 focus-visible:ring-white',
    modalHeader: 'bg-amber-50 border-amber-200',
    modalIcon: 'text-amber-600',
    chip: 'bg-amber-100 text-amber-800',
  },
  update: {
    label: 'تحديث',
    icon: Sparkles,
    bar: 'bg-indigo-600 text-white',
    barClose: 'hover:bg-indigo-700/60 focus-visible:ring-white',
    modalHeader: 'bg-indigo-50 border-indigo-200',
    modalIcon: 'text-indigo-600',
    chip: 'bg-indigo-100 text-indigo-800',
  },
  alert: {
    label: 'تنبيه',
    icon: AlertTriangle,
    bar: 'bg-rose-600 text-white',
    barClose: 'hover:bg-rose-700/60 focus-visible:ring-white',
    modalHeader: 'bg-rose-50 border-rose-200',
    modalIcon: 'text-rose-600',
    chip: 'bg-rose-100 text-rose-800',
  },
  info: {
    label: 'معلومة',
    icon: Info,
    bar: 'bg-slate-700 text-white',
    barClose: 'hover:bg-slate-800/60 focus-visible:ring-white',
    modalHeader: 'bg-slate-50 border-slate-200',
    modalIcon: 'text-slate-600',
    chip: 'bg-slate-100 text-slate-700',
  },
  celebration: {
    label: 'مناسبة',
    icon: PartyPopper,
    bar: 'bg-teal-600 text-white',
    barClose: 'hover:bg-teal-700/60 focus-visible:ring-white',
    modalHeader: 'bg-teal-50 border-teal-200',
    modalIcon: 'text-teal-600',
    chip: 'bg-teal-100 text-teal-800',
  },
}

/** نوعٌ غيرُ معروفٍ (نُشر من نسخةٍ أحدث) يقع على `info` لا على شاشةٍ بيضاء. */
export function toneFor(type: AnnouncementType): AnnouncementTone {
  return ANNOUNCEMENT_TONES[type] ?? ANNOUNCEMENT_TONES.info
}

export const ANNOUNCEMENT_TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = (
  Object.keys(ANNOUNCEMENT_TONES) as AnnouncementType[]
).map((value) => ({ value, label: ANNOUNCEMENT_TONES[value].label }))
