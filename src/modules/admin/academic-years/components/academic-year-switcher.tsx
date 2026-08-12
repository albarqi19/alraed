import { useId } from 'react'
import { CalendarRange } from 'lucide-react'
import { TONES } from '@/shared/workspace'
import { useAcademicYearsQuery, useArchiveMode } from '../hooks'
import type { AcademicYearOption } from '../types'

function yearText(year: AcademicYearOption): string {
  if (year.label) {
    return year.is_current ? `${year.label} (الجارية)` : year.label
  }

  // سنةٌ بلا تسمية: التاريخ أوضح من معرّفٍ رقميّ لا يعني للمستخدم شيئاً
  const start = year.starts_on?.slice(0, 4)
  const end = year.ends_on?.slice(0, 4)

  if (start && end) {
    return `${start}–${end}`
  }

  return `سنة رقم ${year.id}`
}

/**
 * منتقي السنة في ترويسة اللوحة.
 *
 * عنصر `select` أصليّ لا قائمةً مبنيّة باليد: هذا العنصر يقرّر ما تعنيه كل
 * الأرقام في الشاشة، فاختياره يجب أن يعمل بلوحة المفاتيح وبقارئ الشاشة وعلى
 * الجوال من غير أن نعيد بناء ذلك كله ونخطئ في نصفه.
 */
export function AcademicYearSwitcher() {
  const selectId = useId()
  const { data: years, isLoading } = useAcademicYearsQuery()
  const { isArchiveMode, yearId, yearLabel, enterArchive, exitArchive } = useArchiveMode()
  const archiveFallbackText = yearLabel ?? 'سنة مؤرشفة'

  const options = years ?? []
  const currentYear = options.find((year) => year.is_current) ?? null

  // مدرسةٌ لم تُرحَّل بعد: سنةٌ واحدة لا غير. منتقٍ لا يبدّل شيئاً ضجيجٌ في
  // ترويسةٍ مزدحمة أصلاً — لكنه يظهر حتماً إن كنا في الأرشيف، فمخرجُ المستخدم
  // لا يُخفى بحال.
  if (!isArchiveMode && (isLoading || options.length <= 1)) {
    return null
  }

  const selectedValue = isArchiveMode && yearId !== null ? String(yearId) : (currentYear ? String(currentYear.id) : '')

  const tone = isArchiveMode ? TONES.red : TONES.sky

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border px-2 py-0.5 sm:flex"
      style={{ borderColor: tone.bd, backgroundColor: tone.bg, color: tone.tx }}
    >
      <CalendarRange className="h-3.5 w-3.5 opacity-75" aria-hidden />
      <label htmlFor={selectId} className="sr-only">
        السنة الدراسية المعروضة
      </label>
      <select
        id={selectId}
        value={selectedValue}
        onChange={(event) => {
          const picked = options.find((year) => String(year.id) === event.target.value)

          if (!picked || picked.is_current) {
            exitArchive()
            return
          }

          enterArchive(picked)
        }}
        className="cursor-pointer border-0 bg-transparent py-0.5 pl-1 pr-0 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{ color: tone.tx }}
      >
        {/* السنة المتصفَّحة قد لا تكون في القائمة بعد (الطلب لم يعد، أو رجع
            فاشلاً). بلا هذا الخيار البديل يظهر المنتقي فارغاً في وضع الأرشيف
            تحديداً — أي في اللحظة التي يجب أن يكون فيها أوضح ما يكون. */}
        {isArchiveMode && yearId !== null && !options.some((year) => year.id === yearId) && (
          <option value={yearId}>{archiveFallbackText}</option>
        )}
        {options.map((year) => (
          <option key={year.id} value={year.id}>
            {yearText(year)}
          </option>
        ))}
      </select>
    </div>
  )
}
