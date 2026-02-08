import type { TeacherScheduleGrid, TeacherScheduleSlot } from '@/modules/admin/types'

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

function formatTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.slice(0, 5)
    return timePart ?? ''
  }
  return value.slice(0, 5)
}

function extractPeriods(schedule?: TeacherScheduleGrid | null): number[] {
  if (!schedule) return []
  const nums = new Set<number>()
  for (const day of daysOfWeek) {
    const periods = schedule[day]
    if (!periods) continue
    for (const [key, slot] of Object.entries(periods)) {
      if (slot) nums.add(Number(key))
    }
  }
  return Array.from(nums).sort((a, b) => a - b)
}

function getPeriodTime(schedule: TeacherScheduleGrid, period: number): { start: string; end: string } {
  for (const day of daysOfWeek) {
    const slot = schedule[day]?.[period]
    if (slot?.start_time && slot?.end_time) {
      return { start: formatTime(slot.start_time), end: formatTime(slot.end_time) }
    }
  }
  return { start: '', end: '' }
}

interface TeacherPrintData {
  teacherName: string
  schedule: TeacherScheduleGrid
}

function buildTeacherCard(data: TeacherPrintData, schoolName: string) {
  const { teacherName, schedule } = data
  const periods = extractPeriods(schedule)
  if (periods.length === 0) return ''

  const periodHeaders = periods
    .map((p) => {
      const time = getPeriodTime(schedule, p)
      return `<th class="period-header">
        <div class="period-num">${p}</div>
        ${time.start ? `<div class="period-time">${time.start}</div>` : ''}
      </th>`
    })
    .join('')

  const dayRows = daysOfWeek
    .map((day, idx) => {
      const bgColor = idx % 2 === 0 ? '#fff' : '#f6f6f6'
      const cells = periods
        .map((p) => {
          const slot: TeacherScheduleSlot | null = schedule[day]?.[p] ?? null
          if (!slot) return `<td style="background:${bgColor};"></td>`
          return `<td style="background:${bgColor};">
            <span class="subject">${slot.grade}/${slot.class_name}</span>
            <span class="class-info">${slot.subject_name}</span>
          </td>`
        })
        .join('')
      return `<tr>
        <th class="day-cell" style="background:${bgColor};">${day}</th>
        ${cells}
      </tr>`
    })
    .join('')

  return `<div class="card">
    <div class="card-header">
      <span class="teacher-name">${teacherName}</span>
      <span class="school-name">${schoolName}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="day-header">اليوم</th>
          ${periodHeaders}
        </tr>
      </thead>
      <tbody>
        ${dayRows}
      </tbody>
    </table>
    <div class="card-footer">نظام الرائد للإدارة المدرسية</div>
  </div>`
}

const pageStyles = `
  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2.5mm;
    min-height: calc(100vh - 16mm);
    padding: 3mm 0 0.5mm;
  }
  .card {
    flex: 1;
    border: 1px solid #999;
    border-radius: 2px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1mm 3mm;
    background: #e0e0e0;
    border-bottom: 1px solid #999;
  }
  .teacher-name {
    font-size: 10px;
    font-weight: 700;
    color: #1a1a1a;
  }
  .school-name {
    font-size: 8px;
    font-weight: 500;
    color: #555;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    flex: 1;
  }
  th, td {
    border: 0.5px solid #bbb;
    text-align: center;
    vertical-align: middle;
    padding: 1px 2px;
    height: 0;
  }
  .day-header {
    background: #d4d4d4;
    font-weight: 700;
    font-size: 8px;
    width: 30px;
  }
  .period-header {
    background: #d4d4d4;
    font-weight: 700;
    padding: 1px;
  }
  .period-num {
    font-size: 8px;
    font-weight: 700;
  }
  .period-time {
    font-size: 6px;
    color: #666;
    line-height: 1;
  }
  .day-cell {
    background: #eaeaea;
    font-weight: 700;
    font-size: 8px;
    width: 30px;
  }
  td {
    padding: 0.5px 1px;
    line-height: 1.2;
  }
  .subject {
    font-size: 8px;
    font-weight: 700;
    color: #1a1a1a;
    display: block;
  }
  .class-info {
    font-size: 6px;
    color: #555;
    display: block;
  }
  .card-footer {
    text-align: center;
    padding: 0.5mm 0;
    font-size: 6px;
    color: #888;
    font-weight: 500;
    border-top: 0.5px solid #ccc;
  }
  .empty-card {
    flex: 1;
    visibility: hidden;
  }
`

function openPrintWindow(bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>جداول المعلمين</title>
<style>${pageStyles}</style>
</head>
<body>${bodyHtml}</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الجدول')
    return
  }
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    setTimeout(() => win.print(), 200)
  }
}

export function printTeacherSchedule(
  schedule: TeacherScheduleGrid,
  teacherName: string,
  schoolName: string,
) {
  const card = buildTeacherCard({ teacherName, schedule }, schoolName)
  if (!card) {
    alert('لا توجد حصص في هذا الجدول للطباعة')
    return
  }
  const pageHtml = `<div class="page" style="min-height:auto;justify-content:flex-start;">${card.replace('class="card"','class="card" style="flex:none;"')}</div>`
  openPrintWindow(pageHtml)
}

export function printAllTeacherSchedules(
  teachers: Array<{
    teacherName: string
    schedule: TeacherScheduleGrid
  }>,
  schoolName: string,
) {
  const cards = teachers
    .map((t) => buildTeacherCard({ teacherName: t.teacherName, schedule: t.schedule }, schoolName))
    .filter(Boolean)

  if (cards.length === 0) {
    alert('لا توجد جداول معلمين للطباعة')
    return
  }

  // 5 كروت فوق بعض في كل صفحة
  const pages: string[] = []
  for (let i = 0; i < cards.length; i += 5) {
    const chunk = cards.slice(i, i + 5)
    while (chunk.length < 5) {
      chunk.push('<div class="empty-card"></div>')
    }
    const isLast = i + 5 >= cards.length
    const pageBreak = isLast ? '' : 'page-break-after: always;'
    pages.push(`<div class="page" style="${pageBreak}">${chunk.join('')}</div>`)
  }

  openPrintWindow(pages.join(''))
}
