/* ======================================================
   سنوات المدرسة الدراسية — أنواع العقد
   ------------------------------------------------------
   الأشكال منسوخة حرفياً عمّا يرجعه
   `App\Http\Controllers\Admin\AcademicYearSwitchController`
   ولا تُوسَّع من عندنا: كل حقل هنا يقابل حقلاً في `present()` هناك.
   ====================================================== */

/** حالة السنة كما في `SchoolAcademicYear::STATUS_*` */
export type AcademicYearStatus = 'open' | 'closing' | 'archived' | (string & {})

/** سنة واحدة كما يعرضها `GET /api/admin/academic-years` */
export interface AcademicYearOption {
  id: number
  /** قد يكون null لسنةٍ أُنشئت بلا تسمية — فكل عرضٍ لها يحتاج بديلاً */
  label: string | null
  starts_on: string | null
  ends_on: string | null
  status: AcademicYearStatus
  is_current: boolean
}

/** جواب `GET /api/admin/academic-years/current` */
export interface CurrentAcademicYearState {
  current_year: AcademicYearOption | null
  /** يُحسب في الخادم من ترويسة الطلب نفسه، فهو مرآةٌ لما رآه الباك لا لما نظنّه */
  is_archive_mode: boolean
  viewing_year: AcademicYearOption | null
}
