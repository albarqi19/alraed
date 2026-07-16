import { GuidanceCasesPage } from '@/modules/guidance/pages/GuidanceCasesPage'

export function StudentCasesListPage() {
  // المسار يقع تحت /admin/student-cases (نمط ملتصق بلا تمرير خارجي)،
  // وهذه الصفحة ليست ws — نمنحها تمريراً داخلياً خاصاً بها
  return (
    <div className="w-full flex-1 lg:min-h-0 lg:overflow-y-auto">
      <GuidanceCasesPage />
    </div>
  )
}
