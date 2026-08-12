/* ======================================================
   ما يدعمه الأرشيف فعلاً — مصدر الحقيقة الوحيد
   ------------------------------------------------------
   القائمة أدناه ليست تفضيلاً في الواجهة، بل انعكاسٌ لما تفعله الأرشفة في
   الخادم. الترحيل السنوي يقسم الجداول قسمين:

   • **جداول موسومة** (`RolloverPlan::TAGGED`): تبقى في مكانها ويُضاف إليها
     عمود `school_academic_year_id`. هذه — ووحدها — يمكن قراءتها لسنةٍ ماضية
     من الشاشات القائمة: الحضور، وحضور المعلّمين، والتأخّر، والأعذار،
     والإجازات، والسلوك، والإحالات، والتقييمات، والجدول والحصص، وتحضير
     المعلّمين.

   • **جداول مُرحَّلة** (`RolloverPlan::ARCHIVED_GROUPS`): تُنقل صفوفها إلى
     توائم `archive_*` ثم تُحذف من الأصل. المحادثات، والنماذج، ورسائل
     المعلّمين، وقنوات الإرسال، والتوجيه والإرشاد، والأنشطة، والمناوبة،
     والانتظار، والتغطية، والخطط الأسبوعية، وإحصاءات مدرستي، والمتجر،
     والحضور عن بُعد. شاشاتُ هذه المجموعات تستعلم الجدول الأصلي، فهي في وضع
     الأرشيف تعرض **صفراً** لا «لا شيء لهذه السنة» — وصفرٌ يُقرأ كحقيقة أخطر
     من شاشةٍ تعترف بعجزها.

   ولوحاتُ التجميع (نظرة عامة، نبض الفريق) تخلط النوعين في استعلامٍ واحد، فلا
   سبيل إلى صدقها جزئياً — وهي محجوبة كاملةً.

   قاعدة التعديل: لا يُضاف مسارٌ هنا إلا بعد التحقّق أن كل استعلاماته تقع على
   جداول `TAGGED`. الإضافة بالظنّ تحوّل هذا الملف من حارسٍ إلى كذبةٍ منظّمة.
   ====================================================== */

/** مسارات بمطابقة تامة */
const SUPPORTED_EXACT = new Set([
  // الحضور وتوابعه — جدول `attendances` الموسوم
  '/admin/attendance',
  '/admin/attendance-report',
  '/admin/period-attendance',
  '/admin/approval',

  // `teacher_attendances`
  '/admin/teacher-attendance',

  // `late_arrivals`
  '/admin/late-arrivals',
  '/admin/delay-actions',

  // `student_absence_excuses` و`leave_requests`
  '/admin/absence-excuses',
  '/admin/leave-requests',

  // `class_sessions` و`class_applied_schedules`
  '/admin/class-sessions',
  '/admin/class-schedules',
  '/admin/teacher-schedules',
  '/admin/school-timetable',

  // `teacher_preparations`
  '/admin/teacher-preparation',
])

/**
 * مسارات بمعرّفٍ متغيّر، ولها أشقّاء **غير** مدعومين — فالمطابقة بالنمط لا
 * بالبادئة. `/admin/behavior/plans` و`/admin/behavior/analytics` خارج الدعم:
 * الأولى على جدول خططٍ غير موسوم، والثانية تجميعٌ يخلط المصادر.
 */
const SUPPORTED_PATTERNS: RegExp[] = [
  // سجل المخالفات وتفاصيلها — `behavior_violations`
  /^\/admin\/behavior(\/\d+)?$/,
  // الإحالات بتبويباتها وتفاصيلها — `student_referrals` وتوابعها الموسومة
  /^\/admin\/referrals(\/(guidance|behavioral|\d+))?$/,
]

/**
 * هل تُعرض هذه الشاشة في وضع الأرشيف؟
 *
 * الافتراض «لا»: شاشةٌ جديدة تُضاف إلى النظام تُحجب في الأرشيف حتى يقرّر أحدٌ
 * صراحةً أنها تدعمه. الاتجاه المعاكس — أن تُعرض حتى يُثبت العكس — يعني أن كل
 * شاشةٍ تُكتب غداً تكذب في الأرشيف بصمت.
 */
export function routeSupportsArchive(pathname: string): boolean {
  // شرطة ختامية زائدة لا تغيّر الشاشة، فلا يجوز أن تغيّر الحكم عليها
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (SUPPORTED_EXACT.has(path)) {
    return true
  }

  return SUPPORTED_PATTERNS.some((pattern) => pattern.test(path))
}
