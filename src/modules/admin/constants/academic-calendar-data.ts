export type SemesterId = 'first' | 'second'

export interface AcademicCalendarDay {
  id: string
  semester: SemesterId
  week: number
  dayName: string
  hijriDay: string
  hijriYear: string
  hijriMonth: string
  gregorianIso: string
  gregorianMonth: string
  note?: string
  timestamp: number
}

export interface AcademicWeek {
  id: string
  semester: SemesterId
  week: number
  startIso: string
  endIso: string
  timestamps: {
    start: number
    end: number
  }
  days: AcademicCalendarDay[]
}

export type AcademicMilestoneCategory = 'start' | 'holiday' | 'exam' | 'return' | 'deadline'

export interface AcademicMilestone {
  id: string
  semester: SemesterId
  title: string
  description?: string
  isoDate: string
  hijriDate?: string
  category: AcademicMilestoneCategory
  timestamp: number
}

interface SemesterOneRawDay {
  week: number
  dayName: string
  hijriDay: string
  hijriMonth: string
  gregorian: string
  gregorianMonth: string
  note?: string
}

interface SemesterTwoRawDay {
  week: number
  dayName: string
  hijriDay: string
  hijriYear: string
  hijriMonth: string
  gregorian: string
  gregorianYear: number
  gregorianMonth: string
  note?: string
}

const semesterOneRaw: SemesterOneRawDay[] = [
  { week: 1, dayName: 'الأحد', hijriDay: '03/01', hijriMonth: 'ربيع الأول', gregorian: '08/24', gregorianMonth: 'أغسطس' },
  { week: 1, dayName: 'الإثنين', hijriDay: '03/02', hijriMonth: 'ربيع الأول', gregorian: '08/25', gregorianMonth: 'أغسطس' },
  { week: 1, dayName: 'الثلاثاء', hijriDay: '03/03', hijriMonth: 'ربيع الأول', gregorian: '08/26', gregorianMonth: 'أغسطس' },
  { week: 1, dayName: 'الأربعاء', hijriDay: '03/04', hijriMonth: 'ربيع الأول', gregorian: '08/27', gregorianMonth: 'أغسطس' },
  { week: 1, dayName: 'الخميس', hijriDay: '03/05', hijriMonth: 'ربيع الأول', gregorian: '08/28', gregorianMonth: 'أغسطس' },
  { week: 2, dayName: 'الأحد', hijriDay: '03/08', hijriMonth: 'ربيع الأول', gregorian: '08/31', gregorianMonth: 'أغسطس - سبتمبر' },
  { week: 2, dayName: 'الإثنين', hijriDay: '03/09', hijriMonth: 'ربيع الأول', gregorian: '09/01', gregorianMonth: 'سبتمبر' },
  { week: 2, dayName: 'الثلاثاء', hijriDay: '03/10', hijriMonth: 'ربيع الأول', gregorian: '09/02', gregorianMonth: 'سبتمبر' },
  { week: 2, dayName: 'الأربعاء', hijriDay: '03/11', hijriMonth: 'ربيع الأول', gregorian: '09/03', gregorianMonth: 'سبتمبر' },
  { week: 2, dayName: 'الخميس', hijriDay: '03/12', hijriMonth: 'ربيع الأول', gregorian: '09/04', gregorianMonth: 'سبتمبر' },
  { week: 3, dayName: 'الأحد', hijriDay: '03/15', hijriMonth: 'ربيع الأول', gregorian: '09/07', gregorianMonth: 'سبتمبر' },
  { week: 3, dayName: 'الإثنين', hijriDay: '03/16', hijriMonth: 'ربيع الأول', gregorian: '09/08', gregorianMonth: 'سبتمبر' },
  { week: 3, dayName: 'الثلاثاء', hijriDay: '03/17', hijriMonth: 'ربيع الأول', gregorian: '09/09', gregorianMonth: 'سبتمبر' },
  { week: 3, dayName: 'الأربعاء', hijriDay: '03/18', hijriMonth: 'ربيع الأول', gregorian: '09/10', gregorianMonth: 'سبتمبر' },
  { week: 3, dayName: 'الخميس', hijriDay: '03/19', hijriMonth: 'ربيع الأول', gregorian: '09/11', gregorianMonth: 'سبتمبر' },
  { week: 4, dayName: 'الأحد', hijriDay: '03/22', hijriMonth: 'ربيع الأول', gregorian: '09/14', gregorianMonth: 'سبتمبر' },
  { week: 4, dayName: 'الإثنين', hijriDay: '03/23', hijriMonth: 'ربيع الأول', gregorian: '09/15', gregorianMonth: 'سبتمبر' },
  { week: 4, dayName: 'الثلاثاء', hijriDay: '03/24', hijriMonth: 'ربيع الأول', gregorian: '09/16', gregorianMonth: 'سبتمبر' },
  { week: 4, dayName: 'الأربعاء', hijriDay: '03/25', hijriMonth: 'ربيع الأول', gregorian: '09/17', gregorianMonth: 'سبتمبر' },
  { week: 4, dayName: 'الخميس', hijriDay: '03/26', hijriMonth: 'ربيع الأول', gregorian: '09/18', gregorianMonth: 'سبتمبر' },
  { week: 5, dayName: 'الأحد', hijriDay: '03/29', hijriMonth: 'ربيع الأول - ربيع الثاني', gregorian: '09/21', gregorianMonth: 'سبتمبر' },
  { week: 5, dayName: 'الإثنين', hijriDay: '03/30', hijriMonth: 'ربيع الأول', gregorian: '09/22', gregorianMonth: 'سبتمبر' },
  { week: 5, dayName: 'الثلاثاء', hijriDay: '04/01', hijriMonth: 'ربيع الثاني', gregorian: '09/23', gregorianMonth: 'سبتمبر', note: 'اليوم الوطني - إجازة' },
  { week: 5, dayName: 'الأربعاء', hijriDay: '04/02', hijriMonth: 'ربيع الثاني', gregorian: '09/24', gregorianMonth: 'سبتمبر' },
  { week: 5, dayName: 'الخميس', hijriDay: '04/03', hijriMonth: 'ربيع الثاني', gregorian: '09/25', gregorianMonth: 'سبتمبر' },
  { week: 6, dayName: 'الأحد', hijriDay: '04/06', hijriMonth: 'ربيع الثاني', gregorian: '09/28', gregorianMonth: 'سبتمبر - أكتوبر' },
  { week: 6, dayName: 'الإثنين', hijriDay: '04/07', hijriMonth: 'ربيع الثاني', gregorian: '09/29', gregorianMonth: 'سبتمبر' },
  { week: 6, dayName: 'الثلاثاء', hijriDay: '04/08', hijriMonth: 'ربيع الثاني', gregorian: '09/30', gregorianMonth: 'سبتمبر' },
  { week: 6, dayName: 'الأربعاء', hijriDay: '04/09', hijriMonth: 'ربيع الثاني', gregorian: '10/01', gregorianMonth: 'أكتوبر' },
  { week: 6, dayName: 'الخميس', hijriDay: '04/10', hijriMonth: 'ربيع الثاني', gregorian: '10/02', gregorianMonth: 'أكتوبر' },
  { week: 7, dayName: 'الأحد', hijriDay: '04/13', hijriMonth: 'ربيع الثاني', gregorian: '10/05', gregorianMonth: 'أكتوبر' },
  { week: 7, dayName: 'الإثنين', hijriDay: '04/14', hijriMonth: 'ربيع الثاني', gregorian: '10/06', gregorianMonth: 'أكتوبر' },
  { week: 7, dayName: 'الثلاثاء', hijriDay: '04/15', hijriMonth: 'ربيع الثاني', gregorian: '10/07', gregorianMonth: 'أكتوبر' },
  { week: 7, dayName: 'الأربعاء', hijriDay: '04/16', hijriMonth: 'ربيع الثاني', gregorian: '10/08', gregorianMonth: 'أكتوبر' },
  { week: 7, dayName: 'الخميس', hijriDay: '04/17', hijriMonth: 'ربيع الثاني', gregorian: '10/09', gregorianMonth: 'أكتوبر' },
  { week: 8, dayName: 'الأحد', hijriDay: '04/20', hijriMonth: 'ربيع الثاني', gregorian: '10/12', gregorianMonth: 'أكتوبر' },
  { week: 8, dayName: 'الإثنين', hijriDay: '04/21', hijriMonth: 'ربيع الثاني', gregorian: '10/13', gregorianMonth: 'أكتوبر' },
  { week: 8, dayName: 'الثلاثاء', hijriDay: '04/22', hijriMonth: 'ربيع الثاني', gregorian: '10/14', gregorianMonth: 'أكتوبر' },
  { week: 8, dayName: 'الأربعاء', hijriDay: '04/23', hijriMonth: 'ربيع الثاني', gregorian: '10/15', gregorianMonth: 'أكتوبر' },
  { week: 8, dayName: 'الخميس', hijriDay: '04/24', hijriMonth: 'ربيع الثاني', gregorian: '10/16', gregorianMonth: 'أكتوبر', note: 'إجازة إضافية' },
  { week: 9, dayName: 'الأحد', hijriDay: '04/27', hijriMonth: 'ربيع الثاني', gregorian: '10/19', gregorianMonth: 'أكتوبر' },
  { week: 9, dayName: 'الإثنين', hijriDay: '04/28', hijriMonth: 'ربيع الثاني', gregorian: '10/20', gregorianMonth: 'أكتوبر' },
  { week: 9, dayName: 'الثلاثاء', hijriDay: '04/29', hijriMonth: 'ربيع الثاني', gregorian: '10/21', gregorianMonth: 'أكتوبر' },
  { week: 9, dayName: 'الأربعاء', hijriDay: '04/30', hijriMonth: 'ربيع الثاني', gregorian: '10/22', gregorianMonth: 'أكتوبر' },
  { week: 9, dayName: 'الخميس', hijriDay: '05/01', hijriMonth: 'جمادى الأولى', gregorian: '10/23', gregorianMonth: 'أكتوبر' },
  { week: 10, dayName: 'الأحد', hijriDay: '05/04', hijriMonth: 'جمادى الأولى', gregorian: '10/26', gregorianMonth: 'أكتوبر' },
  { week: 10, dayName: 'الإثنين', hijriDay: '05/05', hijriMonth: 'جمادى الأولى', gregorian: '10/27', gregorianMonth: 'أكتوبر' },
  { week: 10, dayName: 'الثلاثاء', hijriDay: '05/06', hijriMonth: 'جمادى الأولى', gregorian: '10/28', gregorianMonth: 'أكتوبر' },
  { week: 10, dayName: 'الأربعاء', hijriDay: '05/07', hijriMonth: 'جمادى الأولى', gregorian: '10/29', gregorianMonth: 'أكتوبر' },
  { week: 10, dayName: 'الخميس', hijriDay: '05/08', hijriMonth: 'جمادى الأولى', gregorian: '10/30', gregorianMonth: 'أكتوبر' },
  { week: 11, dayName: 'الأحد', hijriDay: '05/11', hijriMonth: 'جمادى الأولى', gregorian: '11/02', gregorianMonth: 'نوفمبر' },
  { week: 11, dayName: 'الإثنين', hijriDay: '05/12', hijriMonth: 'جمادى الأولى', gregorian: '11/03', gregorianMonth: 'نوفمبر' },
  { week: 11, dayName: 'الثلاثاء', hijriDay: '05/13', hijriMonth: 'جمادى الأولى', gregorian: '11/04', gregorianMonth: 'نوفمبر' },
  { week: 11, dayName: 'الأربعاء', hijriDay: '05/14', hijriMonth: 'جمادى الأولى', gregorian: '11/05', gregorianMonth: 'نوفمبر' },
  { week: 11, dayName: 'الخميس', hijriDay: '05/15', hijriMonth: 'جمادى الأولى', gregorian: '11/06', gregorianMonth: 'نوفمبر' },
  { week: 12, dayName: 'الأحد', hijriDay: '05/18', hijriMonth: 'جمادى الأولى', gregorian: '11/09', gregorianMonth: 'نوفمبر' },
  { week: 12, dayName: 'الإثنين', hijriDay: '05/19', hijriMonth: 'جمادى الأولى', gregorian: '11/10', gregorianMonth: 'نوفمبر' },
  { week: 12, dayName: 'الثلاثاء', hijriDay: '05/20', hijriMonth: 'جمادى الأولى', gregorian: '11/11', gregorianMonth: 'نوفمبر' },
  { week: 12, dayName: 'الأربعاء', hijriDay: '05/21', hijriMonth: 'جمادى الأولى', gregorian: '11/12', gregorianMonth: 'نوفمبر' },
  { week: 12, dayName: 'الخميس', hijriDay: '05/22', hijriMonth: 'جمادى الأولى', gregorian: '11/13', gregorianMonth: 'نوفمبر' },
  { week: 13, dayName: 'الأحد', hijriDay: '05/25', hijriMonth: 'جمادى الأولى', gregorian: '11/16', gregorianMonth: 'نوفمبر' },
  { week: 13, dayName: 'الإثنين', hijriDay: '05/26', hijriMonth: 'جمادى الأولى', gregorian: '11/17', gregorianMonth: 'نوفمبر' },
  { week: 13, dayName: 'الثلاثاء', hijriDay: '05/27', hijriMonth: 'جمادى الأولى', gregorian: '11/18', gregorianMonth: 'نوفمبر' },
  { week: 13, dayName: 'الأربعاء', hijriDay: '05/28', hijriMonth: 'جمادى الأولى', gregorian: '11/19', gregorianMonth: 'نوفمبر' },
  { week: 13, dayName: 'الخميس', hijriDay: '05/29', hijriMonth: 'جمادى الأولى', gregorian: '11/20', gregorianMonth: 'نوفمبر', note: 'بداية الاختبارات النهائية' },
  { week: 14, dayName: 'الأحد', hijriDay: '06/09', hijriMonth: 'جمادى الآخرة', gregorian: '11/30', gregorianMonth: 'نوفمبر - ديسمبر' },
  { week: 14, dayName: 'الإثنين', hijriDay: '06/10', hijriMonth: 'جمادى الآخرة', gregorian: '12/01', gregorianMonth: 'ديسمبر' },
  { week: 14, dayName: 'الثلاثاء', hijriDay: '06/11', hijriMonth: 'جمادى الآخرة', gregorian: '12/02', gregorianMonth: 'ديسمبر' },
  { week: 14, dayName: 'الأربعاء', hijriDay: '06/12', hijriMonth: 'جمادى الآخرة', gregorian: '12/03', gregorianMonth: 'ديسمبر' },
  { week: 14, dayName: 'الخميس', hijriDay: '06/13', hijriMonth: 'جمادى الآخرة', gregorian: '12/04', gregorianMonth: 'ديسمبر' },
  { week: 15, dayName: 'الأحد', hijriDay: '06/16', hijriMonth: 'جمادى الآخرة', gregorian: '12/07', gregorianMonth: 'ديسمبر' },
  { week: 15, dayName: 'الإثنين', hijriDay: '06/17', hijriMonth: 'جمادى الآخرة', gregorian: '12/08', gregorianMonth: 'ديسمبر' },
  { week: 15, dayName: 'الثلاثاء', hijriDay: '06/18', hijriMonth: 'جمادى الآخرة', gregorian: '12/09', gregorianMonth: 'ديسمبر' },
  { week: 15, dayName: 'الأربعاء', hijriDay: '06/19', hijriMonth: 'جمادى الآخرة', gregorian: '12/10', gregorianMonth: 'ديسمبر' },
  { week: 15, dayName: 'الخميس', hijriDay: '06/20', hijriMonth: 'جمادى الآخرة', gregorian: '12/11', gregorianMonth: 'ديسمبر', note: 'إجازة إضافية' },
  { week: 16, dayName: 'الأحد', hijriDay: '06/23', hijriMonth: 'جمادى الآخرة', gregorian: '12/14', gregorianMonth: 'ديسمبر' },
  { week: 16, dayName: 'الإثنين', hijriDay: '06/24', hijriMonth: 'جمادى الآخرة', gregorian: '12/15', gregorianMonth: 'ديسمبر' },
  { week: 16, dayName: 'الثلاثاء', hijriDay: '06/25', hijriMonth: 'جمادى الآخرة', gregorian: '12/16', gregorianMonth: 'ديسمبر' },
  { week: 16, dayName: 'الأربعاء', hijriDay: '06/26', hijriMonth: 'جمادى الآخرة', gregorian: '12/17', gregorianMonth: 'ديسمبر' },
  { week: 16, dayName: 'الخميس', hijriDay: '06/27', hijriMonth: 'جمادى الآخرة', gregorian: '12/18', gregorianMonth: 'ديسمبر', note: 'إجازة إضافية' },
  { week: 17, dayName: 'الأحد', hijriDay: '07/01', hijriMonth: 'رجب', gregorian: '12/21', gregorianMonth: 'ديسمبر' },
  { week: 17, dayName: 'الإثنين', hijriDay: '07/02', hijriMonth: 'رجب', gregorian: '12/22', gregorianMonth: 'ديسمبر' },
  { week: 17, dayName: 'الثلاثاء', hijriDay: '07/03', hijriMonth: 'رجب', gregorian: '12/23', gregorianMonth: 'ديسمبر' },
  { week: 17, dayName: 'الأربعاء', hijriDay: '07/04', hijriMonth: 'رجب', gregorian: '12/24', gregorianMonth: 'ديسمبر' },
  { week: 17, dayName: 'الخميس', hijriDay: '07/05', hijriMonth: 'رجب', gregorian: '12/25', gregorianMonth: 'ديسمبر' },
  { week: 18, dayName: 'الأحد', hijriDay: '07/08', hijriMonth: 'رجب', gregorian: '12/28', gregorianMonth: 'ديسمبر - يناير' },
  { week: 18, dayName: 'الإثنين', hijriDay: '07/09', hijriMonth: 'رجب', gregorian: '12/29', gregorianMonth: 'ديسمبر' },
  { week: 18, dayName: 'الثلاثاء', hijriDay: '07/10', hijriMonth: 'رجب', gregorian: '12/30', gregorianMonth: 'ديسمبر' },
  { week: 18, dayName: 'الأربعاء', hijriDay: '07/11', hijriMonth: 'رجب', gregorian: '12/31', gregorianMonth: 'ديسمبر' },
  { week: 18, dayName: 'الخميس', hijriDay: '07/12', hijriMonth: 'رجب', gregorian: '01/01', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الأحد', hijriDay: '07/15', hijriMonth: 'رجب', gregorian: '01/04', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الإثنين', hijriDay: '07/16', hijriMonth: 'رجب', gregorian: '01/05', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الثلاثاء', hijriDay: '07/17', hijriMonth: 'رجب', gregorian: '01/06', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الأربعاء', hijriDay: '07/18', hijriMonth: 'رجب', gregorian: '01/07', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الخميس', hijriDay: '07/19', hijriMonth: 'رجب', gregorian: '01/08', gregorianMonth: 'يناير' },
  { week: 19, dayName: 'الجمعة', hijriDay: '07/20', hijriMonth: 'رجب', gregorian: '01/09', gregorianMonth: 'يناير', note: 'نهاية دوام العام - إجازة تصحيح' },
]

const semesterTwoRaw: SemesterTwoRawDay[] = [
  { week: 1, dayName: 'الأحد', hijriDay: '07/29', hijriYear: '1447', hijriMonth: 'رجب - شعبان', gregorian: '01/18', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 1, dayName: 'الإثنين', hijriDay: '07/30', hijriYear: '1447', hijriMonth: 'رجب', gregorian: '01/19', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 1, dayName: 'الثلاثاء', hijriDay: '08/01', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/20', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 1, dayName: 'الأربعاء', hijriDay: '08/02', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/21', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 1, dayName: 'الخميس', hijriDay: '08/03', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/22', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 2, dayName: 'الأحد', hijriDay: '08/06', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/25', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 2, dayName: 'الإثنين', hijriDay: '08/07', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/26', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 2, dayName: 'الثلاثاء', hijriDay: '08/08', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/27', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 2, dayName: 'الأربعاء', hijriDay: '08/09', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/28', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 2, dayName: 'الخميس', hijriDay: '08/10', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '01/29', gregorianYear: 2026, gregorianMonth: 'يناير' },
  { week: 3, dayName: 'الأحد', hijriDay: '08/13', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/01', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 3, dayName: 'الإثنين', hijriDay: '08/14', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/02', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 3, dayName: 'الثلاثاء', hijriDay: '08/15', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/03', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 3, dayName: 'الأربعاء', hijriDay: '08/16', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/04', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 3, dayName: 'الخميس', hijriDay: '08/17', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/05', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 4, dayName: 'الأحد', hijriDay: '08/20', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/08', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 4, dayName: 'الإثنين', hijriDay: '08/21', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/09', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 4, dayName: 'الثلاثاء', hijriDay: '08/22', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/10', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 4, dayName: 'الأربعاء', hijriDay: '08/23', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/11', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 4, dayName: 'الخميس', hijriDay: '08/24', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/12', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 5, dayName: 'الأحد', hijriDay: '08/27', hijriYear: '1447', hijriMonth: 'شعبان - رمضان', gregorian: '02/15', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 5, dayName: 'الإثنين', hijriDay: '08/28', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/16', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 5, dayName: 'الثلاثاء', hijriDay: '08/29', hijriYear: '1447', hijriMonth: 'شعبان', gregorian: '02/17', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 5, dayName: 'الأربعاء', hijriDay: '09/01', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/18', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 5, dayName: 'الخميس', hijriDay: '09/02', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/19', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 6, dayName: 'الأحد', hijriDay: '09/05', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/22', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 6, dayName: 'الإثنين', hijriDay: '09/06', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/23', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 6, dayName: 'الثلاثاء', hijriDay: '09/07', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/24', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 6, dayName: 'الأربعاء', hijriDay: '09/08', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/25', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 6, dayName: 'الخميس', hijriDay: '09/09', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '02/26', gregorianYear: 2026, gregorianMonth: 'فبراير' },
  { week: 7, dayName: 'الأحد', hijriDay: '09/12', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '03/01', gregorianYear: 2026, gregorianMonth: 'مارس' },
  { week: 7, dayName: 'الإثنين', hijriDay: '09/13', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '03/02', gregorianYear: 2026, gregorianMonth: 'مارس' },
  { week: 7, dayName: 'الثلاثاء', hijriDay: '09/14', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '03/03', gregorianYear: 2026, gregorianMonth: 'مارس' },
  { week: 7, dayName: 'الأربعاء', hijriDay: '09/15', hijriYear: '1447', hijriMonth: 'رمضان', gregorian: '03/04', gregorianYear: 2026, gregorianMonth: 'مارس' },
  { week: 7, dayName: 'الخميس', hijriDay: '09/16', hijriYear: '1447', hijriMonth: 'رمضان - شوال', gregorian: '03/05', gregorianYear: 2026, gregorianMonth: 'مارس', note: 'بداية إجازة عيد الفطر' },
  { week: 8, dayName: 'الأحد', hijriDay: '10/10', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '03/29', gregorianYear: 2026, gregorianMonth: 'مارس - أبريل', note: 'إجازة عيد الفطر' },
  { week: 8, dayName: 'الإثنين', hijriDay: '10/11', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '03/30', gregorianYear: 2026, gregorianMonth: 'مارس', note: 'إجازة عيد الفطر' },
  { week: 8, dayName: 'الثلاثاء', hijriDay: '10/12', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '03/31', gregorianYear: 2026, gregorianMonth: 'مارس', note: 'إجازة عيد الفطر' },
  { week: 8, dayName: 'الأربعاء', hijriDay: '10/13', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/01', gregorianYear: 2026, gregorianMonth: 'أبريل', note: 'إجازة عيد الفطر' },
  { week: 8, dayName: 'الخميس', hijriDay: '10/14', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/02', gregorianYear: 2026, gregorianMonth: 'أبريل', note: 'إجازة عيد الفطر' },
  { week: 9, dayName: 'الأحد', hijriDay: '10/17', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/05', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 9, dayName: 'الإثنين', hijriDay: '10/18', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/06', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 9, dayName: 'الثلاثاء', hijriDay: '10/19', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/07', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 9, dayName: 'الأربعاء', hijriDay: '10/20', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/08', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 9, dayName: 'الخميس', hijriDay: '10/21', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/09', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 10, dayName: 'الأحد', hijriDay: '10/24', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/12', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 10, dayName: 'الإثنين', hijriDay: '10/25', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/13', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 10, dayName: 'الثلاثاء', hijriDay: '10/26', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/14', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 10, dayName: 'الأربعاء', hijriDay: '10/27', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/15', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 10, dayName: 'الخميس', hijriDay: '10/28', hijriYear: '1447', hijriMonth: 'شوال', gregorian: '04/16', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 11, dayName: 'الأحد', hijriDay: '11/02', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/19', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 11, dayName: 'الإثنين', hijriDay: '11/03', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/20', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 11, dayName: 'الثلاثاء', hijriDay: '11/04', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/21', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 11, dayName: 'الأربعاء', hijriDay: '11/05', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/22', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 11, dayName: 'الخميس', hijriDay: '11/06', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/23', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 12, dayName: 'الأحد', hijriDay: '11/09', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/26', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 12, dayName: 'الإثنين', hijriDay: '11/10', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/27', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 12, dayName: 'الثلاثاء', hijriDay: '11/11', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/28', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 12, dayName: 'الأربعاء', hijriDay: '11/12', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/29', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 12, dayName: 'الخميس', hijriDay: '11/13', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '04/30', gregorianYear: 2026, gregorianMonth: 'أبريل' },
  { week: 13, dayName: 'الأحد', hijriDay: '11/16', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/03', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 13, dayName: 'الإثنين', hijriDay: '11/17', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/04', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 13, dayName: 'الثلاثاء', hijriDay: '11/18', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/05', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 13, dayName: 'الأربعاء', hijriDay: '11/19', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/06', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 13, dayName: 'الخميس', hijriDay: '11/20', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/07', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 14, dayName: 'الأحد', hijriDay: '11/23', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/10', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 14, dayName: 'الإثنين', hijriDay: '11/24', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/11', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 14, dayName: 'الثلاثاء', hijriDay: '11/25', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/12', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 14, dayName: 'الأربعاء', hijriDay: '11/26', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/13', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 14, dayName: 'الخميس', hijriDay: '11/27', hijriYear: '1447', hijriMonth: 'ذو القعدة', gregorian: '05/14', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 15, dayName: 'الأحد', hijriDay: '11/30', hijriYear: '1447', hijriMonth: 'ذو القعدة - ذو الحجة', gregorian: '05/17', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 15, dayName: 'الإثنين', hijriDay: '12/01', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '05/18', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 15, dayName: 'الثلاثاء', hijriDay: '12/02', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '05/19', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 15, dayName: 'الأربعاء', hijriDay: '12/03', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '05/20', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 15, dayName: 'الخميس', hijriDay: '12/04', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '05/21', gregorianYear: 2026, gregorianMonth: 'مايو' },
  { week: 16, dayName: 'الأحد', hijriDay: '12/14', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '05/31', gregorianYear: 2026, gregorianMonth: 'مايو - يونيو', note: 'إجازة عيد الأضحى' },
  { week: 16, dayName: 'الإثنين', hijriDay: '12/15', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/01', gregorianYear: 2026, gregorianMonth: 'يونيو', note: 'إجازة عيد الأضحى' },
  { week: 16, dayName: 'الثلاثاء', hijriDay: '12/16', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/02', gregorianYear: 2026, gregorianMonth: 'يونيو', note: 'إجازة عيد الأضحى' },
  { week: 16, dayName: 'الأربعاء', hijriDay: '12/17', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/03', gregorianYear: 2026, gregorianMonth: 'يونيو', note: 'إجازة عيد الأضحى' },
  { week: 16, dayName: 'الخميس', hijriDay: '12/18', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/04', gregorianYear: 2026, gregorianMonth: 'يونيو', note: 'إجازة عيد الأضحى' },
  { week: 17, dayName: 'الأحد', hijriDay: '12/21', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/07', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 17, dayName: 'الإثنين', hijriDay: '12/22', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/08', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 17, dayName: 'الثلاثاء', hijriDay: '12/23', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/09', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 17, dayName: 'الأربعاء', hijriDay: '12/24', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/10', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 17, dayName: 'الخميس', hijriDay: '12/25', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/11', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 18, dayName: 'الأحد', hijriDay: '12/28', hijriYear: '1447', hijriMonth: 'ذو الحجة - محرم', gregorian: '06/14', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 18, dayName: 'الإثنين', hijriDay: '12/29', hijriYear: '1447', hijriMonth: 'ذو الحجة', gregorian: '06/15', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 18, dayName: 'الثلاثاء', hijriDay: '01/01', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/16', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 18, dayName: 'الأربعاء', hijriDay: '01/02', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/17', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 18, dayName: 'الخميس', hijriDay: '01/03', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/18', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 19, dayName: 'الأحد', hijriDay: '01/06', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/21', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 19, dayName: 'الإثنين', hijriDay: '01/07', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/22', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 19, dayName: 'الثلاثاء', hijriDay: '01/08', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/23', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 19, dayName: 'الأربعاء', hijriDay: '01/09', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/24', gregorianYear: 2026, gregorianMonth: 'يونيو' },
  { week: 19, dayName: 'الخميس', hijriDay: '01/10', hijriYear: '1448', hijriMonth: 'محرم (1448هـ)', gregorian: '06/25', gregorianYear: 2026, gregorianMonth: 'يونيو', note: 'نهاية العام الدراسي - إجازة' },
]

const toIso = (year: number, mmdd: string) => {
  const [month, day] = mmdd.split('/')
  return `${year}-${month}-${day}`
}

const toTimestamp = (iso: string) => new Date(`${iso}T00:00:00`).getTime()

const semesterOneDays: AcademicCalendarDay[] = semesterOneRaw.map((item, index) => {
  const [month] = item.gregorian.split('/')
  const gregorianYear = month === '01' ? 2026 : 2025
  const iso = toIso(gregorianYear, item.gregorian)

  return {
    id: `first-${index}`,
    semester: 'first',
    week: item.week,
    dayName: item.dayName,
    hijriDay: item.hijriDay,
    hijriYear: '1447',
    hijriMonth: item.hijriMonth,
    gregorianIso: iso,
    gregorianMonth: item.gregorianMonth,
    note: item.note,
    timestamp: toTimestamp(iso),
  }
})

const semesterTwoDays: AcademicCalendarDay[] = semesterTwoRaw.map((item, index) => {
  const iso = toIso(item.gregorianYear, item.gregorian)

  return {
    id: `second-${index}`,
    semester: 'second',
    week: item.week,
    dayName: item.dayName,
    hijriDay: item.hijriDay,
    hijriYear: item.hijriYear,
    hijriMonth: item.hijriMonth,
    gregorianIso: iso,
    gregorianMonth: item.gregorianMonth,
    note: item.note,
    timestamp: toTimestamp(iso),
  }
})

export const academicCalendarDays: AcademicCalendarDay[] = [...semesterOneDays, ...semesterTwoDays].sort(
  (a, b) => a.timestamp - b.timestamp,
)

const buildWeeks = (days: AcademicCalendarDay[]): AcademicWeek[] => {
  const map = new Map<string, AcademicCalendarDay[]>()

  days.forEach((day) => {
    const key = `${day.semester}-${day.week}`
    const list = map.get(key) ?? []
    list.push(day)
    map.set(key, list)
  })

  const weeks: AcademicWeek[] = []

  map.forEach((list, key) => {
    const [semesterKey, weekKey] = key.split('-')
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp)
    const start = sorted[0]
    const end = sorted[sorted.length - 1]

    weeks.push({
      id: key,
      semester: semesterKey as SemesterId,
      week: Number(weekKey),
      startIso: start.gregorianIso,
      endIso: end.gregorianIso,
      timestamps: {
        start: start.timestamp,
        end: end.timestamp,
      },
      days: sorted,
    })
  })

  return weeks.sort((a, b) => a.timestamps.start - b.timestamps.start)
}

export const academicCalendarWeeks = buildWeeks(academicCalendarDays)

export const academicSemesterSummaries = {
  first: {
    id: 'first' as const,
    title: 'الفصل الدراسي الأول',
    startIso: semesterOneDays[0]?.gregorianIso ?? '2025-08-24',
    endIso: semesterOneDays[semesterOneDays.length - 1]?.gregorianIso ?? '2026-01-09',
    startHijri: '03/01/1447',
    endHijri: `${semesterOneDays[semesterOneDays.length - 1]?.hijriDay ?? '07/20'}/1447`,
    totalWeeks: new Set(semesterOneDays.map((day) => day.week)).size,
    totalDays: semesterOneDays.length,
  },
  second: {
    id: 'second' as const,
    title: 'الفصل الدراسي الثاني',
    startIso: semesterTwoDays[0]?.gregorianIso ?? '2026-01-18',
    endIso: semesterTwoDays[semesterTwoDays.length - 1]?.gregorianIso ?? '2026-06-25',
    startHijri: `${semesterTwoDays[0]?.hijriDay ?? '07/29'}/${semesterTwoDays[0]?.hijriYear ?? '1447'}`,
    endHijri: `${semesterTwoDays[semesterTwoDays.length - 1]?.hijriDay ?? '01/10'}/${semesterTwoDays[semesterTwoDays.length - 1]?.hijriYear ?? '1448'}`,
    totalWeeks: new Set(semesterTwoDays.map((day) => day.week)).size,
    totalDays: semesterTwoDays.length,
  },
}

const milestones: AcademicMilestone[] = [
  {
    id: 'first-start',
    semester: 'first',
    title: 'بداية الدراسة',
    description: 'انطلاق الفصل الدراسي الأول',
    isoDate: '2025-08-24',
    hijriDate: '03/01/1447',
    category: 'start',
    timestamp: toTimestamp('2025-08-24'),
  },
  {
    id: 'first-national-day',
    semester: 'first',
    title: 'اليوم الوطني السعودي',
    description: 'إجازة رسمية لليوم الوطني',
    isoDate: '2025-09-23',
    hijriDate: '04/01/1447',
    category: 'holiday',
    timestamp: toTimestamp('2025-09-23'),
  },
  {
    id: 'first-extra-break-oct',
    semester: 'first',
    title: 'إجازة إضافية',
    description: 'استراحة خفيفة في منتصف الفصل',
    isoDate: '2025-10-16',
    hijriDate: '04/24/1447',
    category: 'holiday',
    timestamp: toTimestamp('2025-10-16'),
  },
  {
    id: 'first-finals-start',
    semester: 'first',
    title: 'بداية الاختبارات النهائية',
    description: 'انطلاق اختبارات الفصل الأول',
    isoDate: '2025-11-20',
    hijriDate: '05/29/1447',
    category: 'exam',
    timestamp: toTimestamp('2025-11-20'),
  },
  {
    id: 'first-extra-break-dec',
    semester: 'first',
    title: 'إجازة إضافية',
    description: 'إجازة خفيفة قبل نهاية الفصل',
    isoDate: '2025-12-11',
    hijriDate: '06/20/1447',
    category: 'holiday',
    timestamp: toTimestamp('2025-12-11'),
  },
  {
    id: 'first-extra-break-dec-2',
    semester: 'first',
    title: 'إجازة إضافية',
    description: 'إجازة ثانية في ديسمبر',
    isoDate: '2025-12-18',
    hijriDate: '06/27/1447',
    category: 'holiday',
    timestamp: toTimestamp('2025-12-18'),
  },
  {
    id: 'first-end',
    semester: 'first',
    title: 'نهاية دوام الفصل',
    description: 'ختام أعمال الفصل الأول',
    isoDate: '2026-01-09',
    hijriDate: '07/20/1447',
    category: 'deadline',
    timestamp: toTimestamp('2026-01-09'),
  },
  {
    id: 'second-start',
    semester: 'second',
    title: 'بداية الدراسة',
    description: 'انطلاق الفصل الدراسي الثاني',
    isoDate: '2026-01-18',
    hijriDate: '07/29/1447',
    category: 'start',
    timestamp: toTimestamp('2026-01-18'),
  },
  {
    id: 'second-ramadan-break',
    semester: 'second',
    title: 'بداية إجازة عيد الفطر',
    description: 'توقف الدراسة لإجازة عيد الفطر',
    isoDate: '2026-03-05',
    hijriDate: '09/16/1447',
    category: 'holiday',
    timestamp: toTimestamp('2026-03-05'),
  },
  {
    id: 'second-after-eid',
    semester: 'second',
    title: 'العودة بعد عيد الفطر',
    description: 'عودة الطلاب والطالبات بعد الإجازة',
    isoDate: '2026-03-29',
    hijriDate: '10/10/1447',
    category: 'return',
    timestamp: toTimestamp('2026-03-29'),
  },
  {
    id: 'second-hajj-break',
    semester: 'second',
    title: 'بداية إجازة عيد الأضحى',
    description: 'توقف الدراسة لإجازة عيد الأضحى',
    isoDate: '2026-05-31',
    hijriDate: '12/14/1447',
    category: 'holiday',
    timestamp: toTimestamp('2026-05-31'),
  },
  {
    id: 'second-end',
    semester: 'second',
    title: 'نهاية العام الدراسي',
    description: 'ختام العام الدراسي 1447/1448هـ',
    isoDate: '2026-06-25',
    hijriDate: '01/10/1448',
    category: 'deadline',
    timestamp: toTimestamp('2026-06-25'),
  },
]

export const academicMilestones = milestones.sort((a, b) => a.timestamp - b.timestamp)

export const getWeeksBySemester = (semester: SemesterId) => academicCalendarWeeks.filter((week) => week.semester === semester)

const clampToRange = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

export const getCurrentAcademicWeek = (today = new Date()): AcademicWeek | null => {
  if (!academicCalendarWeeks.length) {
    return null
  }

  const todayTimestamp = toTimestamp(today.toISOString().slice(0, 10))

  let current: AcademicWeek | null = null

  for (const week of academicCalendarWeeks) {
    if (todayTimestamp >= week.timestamps.start && todayTimestamp <= week.timestamps.end) {
      current = week
      break
    }

    if (todayTimestamp > week.timestamps.end) {
      current = week
    } else if (todayTimestamp < week.timestamps.start) {
      current = week
      break
    }
  }

  return current
}

export const getUpcomingMilestones = (today = new Date(), limit = 4): AcademicMilestone[] => {
  const baseTimestamp = toTimestamp(today.toISOString().slice(0, 10))
  const upcoming = academicMilestones.filter((milestone) => milestone.timestamp >= baseTimestamp)

  if (upcoming.length >= limit) {
    return upcoming.slice(0, limit)
  }

  const startIndex = clampToRange(academicMilestones.findIndex((item) => item.timestamp >= baseTimestamp) - 1, 0, academicMilestones.length - 1)
  const window = academicMilestones.slice(startIndex, startIndex + limit)

  return window.length ? window : academicMilestones.slice(-limit)
}

export const getDaysBySemester = (semester: SemesterId) => (
  semester === 'first' ? semesterOneDays : semesterTwoDays
)
