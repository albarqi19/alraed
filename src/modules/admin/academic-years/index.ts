/* بوابة وحدة «سنوات المدرسة» — كل ما تحتاجه بقية اللوحة من الأرشيف يمرّ هنا */
export { AcademicYearSwitcher } from './components/academic-year-switcher'
export { ArchiveModeBanner } from './components/archive-mode-banner'
export { ArchiveGuard, ArchiveUnsupported } from './components/archive-unsupported'
export { useAcademicYearsQuery, useArchiveMode, useServerAcademicYearQuery } from './hooks'
export { routeSupportsArchive } from './supported-screens'
export type { AcademicYearOption, AcademicYearStatus, CurrentAcademicYearState } from './types'
