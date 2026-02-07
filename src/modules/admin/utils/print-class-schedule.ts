import type { ClassScheduleGrid, ClassScheduleSlot } from '@/modules/admin/types'

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

function formatTime(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    const timePart = value.split('T')[1]?.slice(0, 5)
    return timePart ?? ''
  }
  return value.slice(0, 5)
}

function shortenName(name?: string | null) {
  if (!name) return ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  return `${parts[0]} ${parts[1]}`
}

function extractPeriods(schedule?: ClassScheduleGrid | null): number[] {
  if (!schedule) return []
  const nums = new Set<number>()
  for (const day of daysOfWeek) {
    const periods = schedule[day]
    if (!periods) continue
    for (const key of Object.keys(periods)) nums.add(Number(key))
  }
  return Array.from(nums).sort((a, b) => a - b)
}

function getPeriodTime(schedule: ClassScheduleGrid, period: number): { start: string; end: string } {
  for (const day of daysOfWeek) {
    const slot = schedule[day]?.[period]
    if (slot?.start_time && slot?.end_time) {
      return { start: formatTime(slot.start_time), end: formatTime(slot.end_time) }
    }
  }
  return { start: '', end: '' }
}

interface ClassPrintData {
  grade: string
  className: string
  displayName: string
  schedule: ClassScheduleGrid
  appliedScheduleName?: string | null
}

function buildClassPage(data: ClassPrintData, schoolName: string, isLast: boolean) {
  const { grade, className, displayName, schedule, appliedScheduleName } = data
  const periods = extractPeriods(schedule)
  if (periods.length === 0) return ''

  // رؤوس الحصص
  const periodHeaders = periods
    .map((p) => {
      const time = getPeriodTime(schedule, p)
      return `<th class="period-header">
        <div class="period-num">الحصة ${p}</div>
        ${time.start ? `<div class="period-time">${time.start}</div><div class="period-time">${time.end}</div>` : ''}
      </th>`
    })
    .join('')

  // صفوف الأيام
  const dayRows = daysOfWeek
    .map((day, idx) => {
      const bgColor = idx % 2 === 0 ? '#fff' : '#f8f9fa'
      const cells = periods
        .map((p) => {
          const slot: ClassScheduleSlot | null = schedule[day]?.[p] ?? null
          if (!slot) return `<td style="background:${bgColor};"></td>`
          return `<td style="background:${bgColor};">
            <div class="subject">${slot.subject_name}</div>
            <div class="teacher">${shortenName(slot.teacher_name)}</div>
          </td>`
        })
        .join('')
      return `<tr>
        <th class="day-cell" style="background:${bgColor};">${day}</th>
        ${cells}
      </tr>`
    })
    .join('')

  const classLabel = displayName || `${grade} / ${className}`
  const scheduleLine = appliedScheduleName ? `التوقيت: ${appliedScheduleName}` : ''
  const pageBreak = isLast ? '' : 'page-break-after: always;'

  return `<div class="page" style="${pageBreak}">
    <div class="header">
      <h1>${schoolName}</h1>
      <div class="separator"></div>
      <h2>الجدول الأسبوعي — ${classLabel}</h2>
      ${scheduleLine ? `<p class="schedule-name">${scheduleLine}</p>` : ''}
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
    <div class="footer">نظام الرائد للإدارة المدرسية</div>
  </div>`
}

const pageStyles = `
  @page {
    size: A4 landscape;
    margin: 12mm 18mm;
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
    max-width: 260mm;
    margin: 0 auto;
    padding: 2mm 0;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 24mm);
  }
  .header {
    text-align: center;
    margin-bottom: 4mm;
  }
  .header h1 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 3px;
    color: #1a1a1a;
  }
  .separator {
    width: 60px;
    height: 2px;
    background: #888;
    margin: 4px auto 6px;
  }
  .header h2 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
  .schedule-name {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    flex: 1;
  }
  th, td {
    border: 1.5px solid #999;
    text-align: center;
    vertical-align: middle;
    padding: 8px 5px;
  }
  .day-header {
    background: #d4d4d4;
    font-weight: 700;
    font-size: 13px;
    width: 65px;
    padding: 10px 4px;
  }
  .period-header {
    background: #d4d4d4;
    font-weight: 700;
    padding: 6px 3px;
  }
  .period-num {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .period-time {
    font-size: 10px;
    color: #555;
    line-height: 1.3;
  }
  .day-cell {
    background: #e8e8e8;
    font-weight: 700;
    font-size: 14px;
    width: 65px;
  }
  td {
    height: auto;
    padding: 10px 5px;
  }
  .subject {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.4;
  }
  .teacher {
    font-size: 11px;
    color: #444;
    margin-top: 3px;
  }
  .footer {
    text-align: center;
    margin-top: 4mm;
    font-size: 11px;
    color: #888;
    font-weight: 500;
  }
`

function openPrintWindow(bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>جدول الفصل</title>
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

export function printClassSchedule(
  schedule: ClassScheduleGrid,
  classInfo: { grade: string; class_name: string; name?: string },
  schoolName: string,
  appliedScheduleName?: string | null,
) {
  const page = buildClassPage(
    {
      grade: classInfo.grade,
      className: classInfo.class_name,
      displayName: classInfo.name || `${classInfo.grade} / ${classInfo.class_name}`,
      schedule,
      appliedScheduleName,
    },
    schoolName,
    true,
  )
  if (!page) {
    alert('لا توجد حصص في هذا الجدول للطباعة')
    return
  }
  openPrintWindow(page)
}

export function printAllClassSchedules(
  classes: Array<{
    grade: string
    className: string
    displayName: string
    schedule: ClassScheduleGrid
    appliedScheduleName?: string | null
  }>,
  schoolName: string,
) {
  const pages = classes
    .map((cls, idx) =>
      buildClassPage(
        {
          grade: cls.grade,
          className: cls.className,
          displayName: cls.displayName,
          schedule: cls.schedule,
          appliedScheduleName: cls.appliedScheduleName,
        },
        schoolName,
        idx === classes.length - 1,
      ),
    )
    .filter(Boolean)

  if (pages.length === 0) {
    alert('لا توجد جداول فصول للطباعة')
    return
  }
  openPrintWindow(pages.join(''))
}
