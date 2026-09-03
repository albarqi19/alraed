import { BookOpen, Flame, Scale, Sparkles, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { TONES, WsBtn, WsModal } from '@/shared/workspace'

/**
 * شرحُ الصفحة بلغةٍ بسيطة — لمن يفتحها أوّلَ مرّة.
 *
 * لا مصطلحاتٍ إحصائيّة: «نسبة» و«إجماع» و«ظِلّ» تُشرح بمثالٍ لا بتعريف.
 */
export function LdHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <WsModal
      open={open}
      onClose={onClose}
      title="ما هذه الصفحة؟"
      sub="صعوبات التعلّم — كيف تُقرأ وكيف تُبنى"
      maxWidth={640}
      footer={
        <WsBtn variant="primary" onClick={onClose}>
          فهمت
        </WsBtn>
      }
    >
      <div className="ld-help">
        <p className="ld-help__lead">
          المعلّم يلاحظ طالباً يتعثّر، فيملأ استبياناً قصيراً عنه من تطبيقه. هذه الصفحة تجمع تلك
          الاستبيانات وتقول لك: <strong>من يحتاج نظرةً أقرب، ولماذا</strong>.
        </p>

        <HelpStep icon={BookOpen} tone={TONES.sky} title="١ · النموذج">
          أنت تبني الاستبيان من تبويب «النماذج»: أقسامٌ (مثل: الانتباه، القراءة، الحساب)، وفي كلّ قسم
          أسئلةُ نعم/لا. ويمكنك أن تجعل قسماً <strong>لمادّةٍ بعينها</strong> — فيرى معلّم الرياضيات
          «الحساب» ولا يراه معلّم العربية، بينما «الانتباه» يراه الجميع.
        </HelpStep>

        <HelpStep icon={Users} tone={TONES.purple} title="٢ · الشهود">
          كلُّ معلّمٍ يملأ الاستبيان عن الطالب هو <strong>شاهد</strong>. شاهدٌ واحد رأيٌ؛ وشاهدان من
          مادّتين مختلفتين يتّفقان على القسم نفسِه — هذا <strong>إجماع</strong>، وهو أقوى ما في
          الصفحة.
        </HelpStep>

        <HelpStep icon={Flame} tone={TONES.red} title="٣ · المِحَكّ (المربّعات الملوّنة)">
          في عمود «الشهادة» ترى شبكةً صغيرة: كلّ عمودٍ فيها قسمٌ من الاستبيان، وكلّ سطرٍ معلّم. المربّع
          الأحمر يعني أنّ ذلك المعلّم أجاب «نعم» على أغلب أسئلة ذلك القسم. المربّع الفارغ يعني أنّ
          المعلّم <strong>لم يُسأل</strong> عن هذا القسم أصلاً (لأنّه ليس لمادّته) — وهذا يختلف عن
          الرماديّ الذي يعني «سُئل ولم يرَ مشكلة».
        </HelpStep>

        <HelpStep icon={Scale} tone={TONES.amber} title="٤ · الظِّلّ والحكم">
          قبل أن نقول «صعوبة تعلّم» نسأل: هل يغيب كثيراً؟ هل يتأخّر؟ هل عليه مخالفات أكثر من
          زملائه؟ إن كان كذلك فربّما التعثّر من الغياب لا من صعوبةٍ حقيقيّة — فيكتب النظام{' '}
          <strong>«لها ظِلّ»</strong>. وإلّا يحكم: نوعيّة بإجماع، نوعيّة بشاهد، عامّة، أو دون العتبة.
        </HelpStep>

        <HelpStep icon={Sparkles} tone={TONES.green} title="٥ · ملفّ الطالب">
          اضغط أيَّ صفّ لتفتح ملفَّ الطالب كاملاً: إجاباتُ كلِّ معلّم، مقارنةُ هذا العام بالماضي، وقراءةٌ
          ذكيّة تكتب لك ملخّصاً بلغةٍ مفهومة. وهي قراءةٌ مساعِدة لا تشخيص — القرار يبقى لك.
        </HelpStep>

        <p className="ld-help__note">
          العتبات في النموذج <strong>نسبةٌ مئويّة</strong>: «حمراء من 70%» تعني أنّ الطالب الذي أجاب
          معلّمُه بنعم على 70% من وزن الأسئلة التي رآها يُصبغ بالأحمر — مهما كان عددُ الأسئلة في نسخته.
        </p>
      </div>
    </WsModal>
  )
}

function HelpStep({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon
  tone: { bg: string; bd: string; tx: string }
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="ld-help__step">
      <span
        className="ld-help__icon"
        style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}
      >
        <Icon size={15} />
      </span>
      <div>
        <div className="ld-help__title">{title}</div>
        <div className="ld-help__text">{children}</div>
      </div>
    </div>
  )
}
