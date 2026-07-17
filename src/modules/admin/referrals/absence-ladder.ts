import type { AbsenceReferral } from './types'

/**
 * ═══════════════════════════════════════════════════════════════
 * سُلَّم الدليل الإجرائي الوزاري — اشتقاق محلي
 * ═══════════════════════════════════════════════════════════════
 *
 * لماذا يُشتق محلياً بدل قراءته من الخادم:
 * `AbsenceReferral` بلا `protected $appends`، و`index` يُرجع `$items->items()`
 * موديلات خام بلا API Resource. فـ`next_action_required` و`actions_progress`
 * و`requires_protection_center` **لا تصل قط** — والجدول كان يصدّقها فيطبع
 * «✓ مكتمل» أخضر على كل صف بلا استثناء، و«0%» في الخلية المجاورة.
 *
 * نقطة المزامنة الوحيدة مع الخادم: AbsenceReferral.php:122-185.
 * الترتيب هنا = ترتيب سلسلة `if` هناك حرفاً بحرف، و`rungs.filter(open).length`
 * = `$total` (يبدأ بـ2 وينمو بالشروط نفسها)، و`filter(open && done).length`
 * = `$completed`. أي أن `next` هنا ≡ `getNextActionRequiredAttribute`.
 *
 * إن أُضيف `$appends` للخادم لاحقاً، تبقى هذه الدالة صحيحة لا مناقضة.
 */

export interface Rung {
  key: string
  label: string
  /** اليوم الذي تفتح عنده البوابة: 0 = مفتوحة دائماً */
  gate: 0 | 5 | 10
  /**
   * يستوجب تأكيداً وقصداً مكتوباً قبل التنفيذ.
   * تصنيف واجهة محض ورثناه عن المودال السابق (كان يعلّم هذين وحدهما `critical`)
   * — لا وجود لـ`critical` في الخادم، فلا يُدَّعى أنه حكمه.
   * إشعار إدارة التعليم يخرج من المدرسة أيضاً لكنه بلا قسيمة: هو غالباً الرُكن
   * الأخير، فيحرسه تحذير الإقفال في LadderBoard بدلاً منها.
   */
  external: boolean
  done: boolean
  at: string | null
  /** فُتحت بوابته: إما بلا بوابة أو بلغ الغياب عتبتها */
  open: boolean
}

export function buildLadder(referral: AbsenceReferral): Rung[] {
  // AbsenceReferral.php:122-125 — ولا يُنشئ الفاحص متواصلاً إلا عند ≥3، فهي مفتوحة دائماً على المتواصل
  const requiresProtection =
    referral.absence_type === 'consecutive' && (referral.consecutive_days ?? 0) >= 3

  const days = referral.total_absence_days

  const raw: Array<Omit<Rung, 'open'>> = [
    {
      key: 'counselor_notified',
      label: 'إحالة للموجه الطلابي',
      gate: 0,
      external: false,
      done: referral.counselor_notified,
      at: referral.counselor_notified_at,
    },
    {
      key: 'learning_plan_created',
      label: 'وضع خطة تعلم',
      gate: 0,
      external: false,
      done: referral.learning_plan_created,
      at: referral.learning_plan_created_at,
    },
    // رُكن لن يستيقظ أبداً على «متكرر» — فلا يُرسم أصلاً (تمييزه عن الخامل جوهري)
    ...(requiresProtection
      ? [
          {
            key: 'protection_center_notified',
            label: 'مخاطبة مركز حماية الطفل',
            gate: 0 as const,
            external: true,
            done: referral.protection_center_notified,
            at: referral.protection_center_notified_at,
          },
        ]
      : []),
    {
      key: 'parent_summoned',
      label: 'استدعاء ولي الأمر',
      gate: 5,
      external: false,
      done: referral.parent_summoned,
      at: referral.parent_summoned_at,
    },
    {
      key: 'commitment_taken',
      label: 'أخذ تعهد خطي',
      gate: 5,
      external: false,
      done: referral.commitment_taken,
      at: referral.commitment_taken_at,
    },
    {
      key: 'reported_to_1919',
      label: 'رفع بلاغ لـ 1919',
      gate: 10,
      external: true,
      done: referral.reported_to_1919,
      at: referral.reported_to_1919_at,
    },
    {
      key: 'education_dept_notified',
      label: 'إشعار إدارة التعليم',
      gate: 10,
      external: false,
      done: referral.education_dept_notified,
      at: referral.education_dept_notified_at,
    },
  ]

  return raw.map((rung) => ({ ...rung, open: rung.gate === 0 || days >= rung.gate }))
}

/** الرُكن المستحق الآن ≡ getNextActionRequiredAttribute */
export function nextRung(rungs: Rung[]): Rung | null {
  return rungs.find((r) => r.open && !r.done) ?? null
}

/**
 * الرُكن الأخير المستحق: بإتمامه يُقفل الخادم السجل تلقائياً
 * (Controller:122-127 يفحص next_action_required === null بعد كل إجراء)
 */
export function isLastOpenRung(rungs: Rung[], key: string): boolean {
  const pending = rungs.filter((r) => r.open && !r.done)
  return pending.length === 1 && pending[0].key === key
}

/** خارج السلّم: الخادم يقبله ولا يحتسبه في الإقفال — فلا يُدسّ بين الأركان */
export const OFF_LADDER_ACTION = {
  key: 'committee_referred',
  label: 'الإحالة للجنة التوجيه الطلابي',
} as const
