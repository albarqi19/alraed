import {
  BEHAVIOR_DEGREE_OPTIONS,
  BEHAVIOR_LOCATIONS,
  BEHAVIOR_REPORTERS,
  BEHAVIOR_GRADES,
  VIOLATIONS_BY_DEGREE,
  PROCEDURES_BY_DEGREE,
} from '../constants'
import type { BehaviorStudent, BehaviorViolation, BehaviorProcedureExecution, BehaviorStatus, BehaviorDegree } from '../types'

const STUDENT_NAMES = [
  'محمد أحمد العلي',
  'عبدالله خالد السالم',
  'فهد سعد المطيري',
  'سلطان عبدالعزيز الدوسري',
  'عمر محمد القحطاني',
  'يوسف علي الشمري',
  'خالد فيصل العتيبي',
  'سعود عبدالرحمن الحربي',
  'عبدالعزيز ماجد الزهراني',
  'تركي نايف العنزي',
  'بندر راشد الغامدي',
  'نواف سعود المالكي',
  'مشعل فهد السبيعي',
  'راكان عبدالله الشهري',
  'فيصل محمد الجهني',
  'ماجد سلطان العمري',
  'طلال عبدالعزيز الرشيدي',
  'وليد أحمد البقمي',
  'صالح خالد الحارثي',
  'ناصر علي القرني',
  'حمد عبدالرحمن الدوسري',
  'عادل محمد الشهراني',
  'سامي فهد العسيري',
  'ياسر سعد الأحمدي',
  'بدر عبدالله الصالح',
  'عبدالإله خالد المحمد',
  'ريان محمد الخالد',
  'زياد علي السليمان',
  'إبراهيم عبدالعزيز الناصر',
  'أنس سعود الفهد',
  'معاذ فيصل الراشد',
  'عمار عبدالرحمن الحمد',
  'حسن محمد العبدالله',
  'كريم خالد الإبراهيم',
  'آدم علي اليوسف',
  'تميم عبدالله العلي',
  'عاصم سعد المحمود',
  'باسل فهد الخليفة',
  'جاسم محمد الثاني',
  'رامي عبدالعزيز الصباح',
  'شادي خالد الجابر',
  'طارق علي الأحمد',
  'غازي عبدالرحمن الصقر',
  'لؤي محمد النمر',
  'مراد سعود الذيب',
  'نبيل فيصل الأسد',
  'هاني عبدالله النسر',
  'وائل خالد الفهد',
  'يزيد علي الليث',
  'زكريا محمد الضرغام',
]

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomDateWithinMonths(monthsBack: number) {
  const now = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - monthsBack)
  const date = new Date(start.getTime() + Math.random() * (now.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

function randomTime() {
  const hour = Math.floor(Math.random() * 8) + 7
  const minute = Math.floor(Math.random() * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function randomStatus(): BehaviorStatus {
  const statuses: BehaviorStatus[] = ['قيد المعالجة', 'جاري التنفيذ', 'مكتملة', 'ملغاة']
  return randomOf(statuses)
}

function randomDegree(): BehaviorDegree {
  return randomOf(BEHAVIOR_DEGREE_OPTIONS)
}

export function createMockStudents(): BehaviorStudent[] {
  return STUDENT_NAMES.map((name, index) => {
    const gradeIndex = Math.floor(Math.random() * BEHAVIOR_GRADES.length)
    return {
      id: `STD${String(index + 1).padStart(4, '0')}`,
      name,
      studentId: `${2024000 + index + 1}`,
      grade: BEHAVIOR_GRADES[gradeIndex],
      class: String.fromCharCode(65 + Math.floor(Math.random() * 6)),
      violationsCount: Math.floor(Math.random() * 5),
      behaviorScore: 100 - Math.floor(Math.random() * 35),
    }
  })
}

export function createMockViolations(students: BehaviorStudent[]): BehaviorViolation[] {
  return Array.from({ length: 50 }, (_, index) => {
    const degree = randomDegree()
    const type = randomOf(VIOLATIONS_BY_DEGREE[degree])
    const student = randomOf(students)
    const status = randomStatus()
    const proceduresTemplate = PROCEDURES_BY_DEGREE[degree]

    const procedures: BehaviorProcedureExecution[] = proceduresTemplate.map((procedure) => {
      const completed = status === 'مكتملة' ? true : Math.random() > 0.5
      return {
        ...procedure,
        completed,
        completedDate: completed ? randomDateWithinMonths(1) : undefined,
        notes: completed ? 'تم التنفيذ بنجاح' : undefined,
        tasks: (procedure.tasks ?? []).map((task) => ({
          ...task,
          completed: completed && Math.random() > 0.3,
          completedDate: completed && Math.random() > 0.3 ? randomDateWithinMonths(1) : undefined,
        })),
      }
    })

    return {
      id: `VIO${String(index + 1).padStart(4, '0')}`,
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.studentId,
      grade: student.grade,
      class: student.class,
      degree,
      type,
      description: `تفاصيل المخالفة: ${type}`,
      location: randomOf(BEHAVIOR_LOCATIONS),
      date: randomDateWithinMonths(3),
      time: randomTime(),
      reportedBy: randomOf(BEHAVIOR_REPORTERS),
      status,
      procedures,
    }
  })
}
