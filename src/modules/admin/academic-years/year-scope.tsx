/* ======================================================
   مرشِّح العام الدراسي للشاشات التشغيلية
   ------------------------------------------------------
   **ليس هذا وضعَ الأرشيف.** الجاران في هذا المجلد يعملان على
   `school_academic_years` — سنواتِ المدرسة التي تُنشئها الأرشفة السنوية،
   وتُقرأ من توائم `archive_*` بترويسةٍ في الطلب. وذاك الجدول **فارغٌ تماماً**
   (صفرُ صفٍّ على الإنتاج)، فمنتقي الأرشيف يختفي من الترويسة بحكم شرطه
   `options.length <= 1`، ووضعُ الأرشيف كلُّه خاملٌ حتى يشغّله المالك.

   وهذا المرشِّح يعمل على `academic_years` — تقويم الوزارة العامّ لكل
   المدارس، وهو مملوءٌ وصحيح. لا يقرأ أرشيفاً ولا يبدّل جدولاً: يقصّ استعلامَ
   الشاشة نفسها على مدى تاريخ العام، ليس إلّا.

   والفصل بينهما مقصود: يوم تُشغَّل الأرشفة يبقى هذا كما هو، ويستيقظ ذاك.
   ====================================================== */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarRange } from 'lucide-react'
import { WsSelect } from '@/shared/workspace'
import { apiClient } from '@/services/api/client'

/** سنةٌ واحدة كما يرسلها `AcademicYearFilter::options()` في الخادم */
export interface YearScopeOption {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

/** ما يُضاف إلى `meta` في ردود الشاشات السبع */
export interface YearScopeMeta {
  academic_year: { id: number; name: string; start_date: string; end_date: string } | null
  academic_year_scope?: string
  academic_years?: YearScopeOption[]
}

/** القيمة المرسَلة في `?academic_year=` */
export type YearScope = 'current' | 'all' | string

/**
 * حالةُ المرشِّح. الافتراضيّ «العام الحالي» — وهو الافتراضيّ في الخادم أيضاً،
 * فلا تُخالف الشاشةُ ما يفعله الطلب حتى قبل أن يعود أوّل ردّ.
 */
export function useYearScope(initial: YearScope = 'current') {
  const [scope, setScope] = useState<YearScope>(initial)

  return {
    scope,
    setScope,
    /** يُمرَّر إلى معاملات الطلب — وإلى مفتاح الاستعلام كي لا تختلط القوائم */
    param: scope,
    isAll: scope === 'all',
    isCurrent: scope === 'current',
  }
}

/**
 * قائمةُ الأعوام من نقطةٍ واحدة تخدم الشاشات السبع.
 *
 * لا تُشتقّ من `meta` في ردّ كل شاشة: سبعُ شاشاتٍ تشتقّ القائمةَ من سبعة
 * ردودٍ تختلف في تسمية العام نفسه وقتَ ما يتأخّر ردٌّ أو يفشل. والتقويم لا
 * يتغيّر خلال الجلسة، فساعةٌ من `staleTime` تكفي ولا يُعاد الطلب مع كل شاشة.
 */
export function useYearScopeOptions() {
  return useQuery({
    queryKey: ['academic-years', 'calendar'],
    queryFn: async (): Promise<{ years: YearScopeOption[]; current: YearScopeMeta['academic_year'] }> => {
      const { data } = await apiClient.get<{
        success: boolean
        data: { years: YearScopeOption[]; current: YearScopeMeta['academic_year'] }
      }>('/admin/academic-years/calendar')
      return data.data
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}

interface YearScopeSelectProps {
  scope: YearScope
  onChange: (scope: YearScope) => void
  className?: string
}

/**
 * منتقي العام في شريط أدوات الشاشة.
 *
 * `select` أصليّ لا قائمةً مبنيّة باليد: هذا العنصر يقرّر معنى كل رقمٍ في
 * الشاشة، فيجب أن يعمل بلوحة المفاتيح وبقارئ الشاشة وعلى الجوال بلا أن نعيد
 * بناء ذلك كلّه ونخطئ في نصفه.
 */
export function YearScopeSelect({ scope, onChange, className }: YearScopeSelectProps) {
  const { data } = useYearScopeOptions()
  const years = data?.years ?? []
  const currentName = data?.current?.name

  /* السنواتُ غيرُ الجارية وحدها تُسرد صراحةً: «العام الحالي» خيارٌ ثابت في
     الأعلى لأنه لا يتعلّق بمعرَّفٍ بعينه — يتبع التقويمَ من نفسه حين ينقلب
     العام، فلا يعلق المستخدم على سنةٍ انقضت لأنه اختار رقمها يوماً. */
  const priorYears = years.filter((year) => !year.is_current)

  return (
    <div className={`ws-yearscope ${className ?? ''}`.trim()}>
      <CalendarRange className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      <WsSelect
        aria-label="العام الدراسي المعروض"
        title="العام الدراسي المعروض"
        value={scope}
        onChange={(event) => onChange(event.target.value as YearScope)}
      >
        <option value="current">{currentName ? `العام الحالي — ${currentName}` : 'العام الحالي'}</option>
        {priorYears.map((year) => (
          <option key={year.id} value={String(year.id)}>
            {year.name}
          </option>
        ))}
        <option value="all">كل الأعوام</option>
      </WsSelect>
    </div>
  )
}

interface YearScopeEmptyNoteProps {
  scope: YearScope
  onShowAll: () => void
}

/**
 * السطر الذي يمنع الذعر.
 *
 * العامُ الدراسيّ يبدأ فيصير كلُّ ما في هذه الشاشات من العام الماضي — ٤٦ ألف
 * صفٍّ على الإنتاج يوم كُتب هذا. فالشاشةُ الفارغة يومَها تُقرأ «مُسحت
 * بياناتي» لا «بدأ عامٌ جديد»، ما لم تقل الشاشةُ أيَّهما تعني وتدلّ على
 * الطريق. ولا يظهر هذا في «كل الأعوام»: الفراغُ هناك فراغٌ حقّاً.
 */
export function YearScopeEmptyNote({ scope, onShowAll }: YearScopeEmptyNoteProps) {
  if (scope === 'all') {
    return null
  }

  return (
    <p className="mt-1 text-[12px] leading-relaxed opacity-70">
      لا يعني هذا فقدان القديم — الشاشة تعرض العام الدراسي الحالي وحده.{' '}
      <button type="button" onClick={onShowAll} className="underline underline-offset-2 hover:opacity-80">
        اعرض كل الأعوام
      </button>
    </p>
  )
}
