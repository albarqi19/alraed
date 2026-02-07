import type { MasterScheduleResult } from '@/modules/admin/types'

export function printMasterSchedule(result: MasterScheduleResult) {
  const { teachers, max_period, days } = result
  const periods = Array.from({ length: max_period }, (_, i) => i + 1)
  const totalPeriodCols = days.length * periods.length

  // بناء صفوف الجدول
  const teacherRows = teachers
    .map((teacher, idx) => {
      const bgColor = idx % 2 === 0 ? '#fff' : '#f5f5f5'
      let cells = ''
      for (const day of days) {
        for (const p of periods) {
          const classAbbr = teacher.schedule?.[day]?.[p] ?? null
          const standbyPriority = teacher.standby?.[day]?.[p] ?? null
          let content = ''
          let cellBg = bgColor
          let extraStyle = ''
          if (classAbbr) {
            content = classAbbr
          } else if (standbyPriority) {
            content = `م${standbyPriority}`
            cellBg = '#fef9c3'
            extraStyle = 'color:#92400e;font-weight:bold;'
          }
          cells += `<td style="background:${cellBg};${extraStyle}">${content}</td>`
        }
      }
      return `<tr>
        <td class="num-col" style="background:${bgColor};">${idx + 1}</td>
        <td class="name-col" style="background:${bgColor};">${teacher.name}</td>
        ${cells}
      </tr>`
    })
    .join('')

  // رؤوس الأيام (colspan)
  const dayHeaders = days
    .map((day) => `<th class="day-header" colspan="${periods.length}">${day}</th>`)
    .join('')

  // رؤوس أرقام الحصص
  const periodHeaders = days
    .map(() => periods.map((p) => `<th class="period-header">${p}</th>`).join(''))
    .join('')

  const colWidth = Math.max(Math.floor(220 / totalPeriodCols), 4)

  const pageHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>الجدول العام للمعلمين</title>
<style>
  @page {
    size: A4 landscape;
    margin: 5mm;
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
  h1 { text-align: center; font-size: 13px; margin-bottom: 4px; }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 7.5px;
  }
  th, td {
    border: 1px solid #888;
    text-align: center;
    padding: 2px 1px;
    overflow: hidden;
    white-space: nowrap;
  }
  .num-col { width: 7mm; font-weight: bold; }
  .name-col {
    width: 38mm;
    text-align: right;
    padding-right: 3px;
    font-weight: bold;
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .day-header {
    background: #c7c7c7;
    font-weight: bold;
    font-size: 8px;
    padding: 3px 1px;
  }
  .period-header {
    background: #e0e0e0;
    font-weight: bold;
    font-size: 7px;
    width: ${colWidth}mm;
  }
  .legend {
    margin-top: 3px;
    font-size: 7px;
    color: #444;
    display: flex;
    gap: 10px;
  }
  .legend span { padding: 1px 4px; }
  .legend .standby-legend {
    background: #fef9c3;
    border: 1px solid #d4a;
    border-radius: 2px;
  }
</style>
</head>
<body>
  <h1>الجدول العام للمعلمين</h1>
  <table>
    <thead>
      <tr>
        <th class="num-col" rowspan="2" style="background:#c7c7c7;">م</th>
        <th class="name-col" rowspan="2" style="background:#c7c7c7;text-align:right;">المعلم</th>
        ${dayHeaders}
      </tr>
      <tr>${periodHeaders}</tr>
    </thead>
    <tbody>
      ${teacherRows || `<tr><td colspan="${2 + totalPeriodCols}" style="padding:20px;color:#666;">لا توجد بيانات</td></tr>`}
    </tbody>
  </table>
  <div class="legend">
    <span class="standby-legend">م = منتظر (م1 رئيسي، م2+ احتياط)</span>
    <span>أول/1 = الصف الأول فصل 1</span>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الجدول')
    return
  }

  printWindow.document.write(pageHtml)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 200)
  }
}
