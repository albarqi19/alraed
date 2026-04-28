import type {
  StudentReportData,
  StudentReportSectionKey,
  StudentReportSignatureKey,
} from '@/services/api/student-report'

const SECTION_TITLES: Record<StudentReportSectionKey, string> = {
  absences: 'الغياب',
  leave_requests: 'الاستئذان',
  lates: 'التأخيرات',
  behavior_violations: 'المخالفات السلوكية',
  academic_weakness: 'الضعف الدراسي',
  referrals: 'الإحالات',
}

const SECTION_ORDER: StudentReportSectionKey[] = [
  'absences',
  'leave_requests',
  'lates',
  'behavior_violations',
  'academic_weakness',
  'referrals',
]

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(d)
  } catch {
    return d.toLocaleDateString('ar-SA')
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(d)
  } catch {
    return d.toLocaleString('ar-SA')
  }
}

function tableHtml(headers: string[], rows: string[][], emptyText: string, totalLabel: string): string {
  if (rows.length === 0) {
    return `<p class="empty">${emptyText}</p>`
  }
  const headerCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const bodyRows = rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')
  return `
    <table class="data-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr><td colspan="${headers.length}" class="total">${escapeHtml(totalLabel)}: ${rows.length}</td></tr></tfoot>
    </table>
  `
}

function sectionAbsences(data: StudentReportData): string {
  const sec = data.sections.absences
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.status === 'absent' ? 'غائب' : item.status ?? ''),
    escapeHtml(item.recorded_at ? formatDateTime(item.recorded_at) : '—'),
    escapeHtml(item.notes ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.absences}</h2>
      ${tableHtml(['م', 'التاريخ', 'الحالة', 'وقت التسجيل', 'ملاحظات'], rows, 'لا توجد سجلات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionLeaveRequests(data: StudentReportData): string {
  const sec = data.sections.leave_requests
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.expected_pickup_time ? formatDateTime(item.expected_pickup_time) : '—'),
    escapeHtml(item.reason ?? '—'),
    escapeHtml(item.status_label),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.leave_requests}</h2>
      ${tableHtml(['م', 'تاريخ الطلب', 'وقت الخروج', 'السبب', 'الحالة'], rows, 'لا توجد سجلات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionLates(data: StudentReportData): string {
  const sec = data.sections.lates
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.recorded_at ? formatDateTime(item.recorded_at) : '—'),
    escapeHtml(item.notes ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.lates}</h2>
      ${tableHtml(['م', 'التاريخ', 'وقت التسجيل', 'ملاحظات'], rows, 'لا توجد سجلات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionViolations(data: StudentReportData): string {
  const sec = data.sections.behavior_violations
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.violation_type ?? '—'),
    escapeHtml(item.degree ?? '—'),
    escapeHtml(item.status ?? '—'),
    escapeHtml(item.description ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.behavior_violations}</h2>
      ${tableHtml(['م', 'التاريخ', 'النوع', 'الدرجة', 'الحالة', 'الوصف'], rows, 'لا توجد سجلات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionAcademicWeakness(data: StudentReportData): string {
  const sec = data.sections.academic_weakness
  if (!sec) return ''

  const evalRows = sec.evaluations.map((e, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(e.date)),
    escapeHtml(e.subject ?? '—'),
    escapeHtml(e.numeric_grade ?? e.descriptive_grade ?? '—'),
    escapeHtml(e.notes ?? '—'),
  ])
  const refRows = sec.referrals.map((r, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(r.date)),
    escapeHtml(r.priority_label),
    escapeHtml(r.status_label),
    escapeHtml(r.title ?? r.reason ?? '—'),
  ])

  const evalTable = sec.evaluations.length
    ? `<h3>التقييمات الأكاديمية الضعيفة</h3>${tableHtml(['م', 'التاريخ', 'المادة', 'الدرجة', 'ملاحظة'], evalRows, '', 'الإجمالي')}`
    : ''
  const refTable = sec.referrals.length
    ? `<h3>إحالات الضعف الدراسي</h3>${tableHtml(['م', 'التاريخ', 'الأولوية', 'الحالة', 'السبب'], refRows, '', 'الإجمالي')}`
    : ''
  const empty = !sec.evaluations.length && !sec.referrals.length
    ? '<p class="empty">لا توجد سجلات في هذه الفترة</p>'
    : ''

  return `
    <section class="section">
      <h2>${SECTION_TITLES.academic_weakness}</h2>
      ${evalTable}
      ${refTable}
      ${empty}
    </section>
  `
}

function sectionReferrals(data: StudentReportData): string {
  const sec = data.sections.referrals
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.referral_type_label),
    escapeHtml(item.priority_label),
    escapeHtml(item.status_label),
    escapeHtml(item.title ?? item.reason ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.referrals}</h2>
      ${tableHtml(['م', 'التاريخ', 'النوع', 'الأولوية', 'الحالة', 'السبب'], rows, 'لا توجد سجلات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

const SECTION_BUILDERS: Record<StudentReportSectionKey, (d: StudentReportData) => string> = {
  absences: sectionAbsences,
  leave_requests: sectionLeaveRequests,
  lates: sectionLates,
  behavior_violations: sectionViolations,
  academic_weakness: sectionAcademicWeakness,
  referrals: sectionReferrals,
}

function signaturesHtml(data: StudentReportData): string {
  const keys = data.requested_signatures
  if (!keys || keys.length === 0) return ''
  const boxes = keys.map((key: StudentReportSignatureKey) => {
    const info = data.signatories[key]
    if (!info) return ''
    return `
      <div class="sig-box">
        <p class="sig-role">${escapeHtml(info.role_label)}</p>
        <p class="sig-name">${escapeHtml(info.name ?? '')}</p>
        <p class="sig-line">التوقيع: .........................................</p>
      </div>
    `
  }).join('')
  return `
    <section class="signatures" style="grid-template-columns: repeat(${keys.length}, 1fr);">
      ${boxes}
    </section>
  `
}

export function printStudentReport(data: StudentReportData): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const sectionsHtml = SECTION_ORDER
    .filter((key) => data.sections[key] !== undefined)
    .map((key) => SECTION_BUILDERS[key](data))
    .join('')

  const periodText = data.period.semester_name
    ? `${data.period.semester_name} (من ${formatDate(data.period.from)} إلى ${formatDate(data.period.to)})`
    : `من ${formatDate(data.period.from)} إلى ${formatDate(data.period.to)}`

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير ملف الطالب - ${escapeHtml(data.student.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 1.5cm; }
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Tahoma', serif;
      color: #000;
      direction: rtl;
      background: #fff;
      font-size: 12pt;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header h1 { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
    .header h2 { font-size: 14pt; font-weight: 600; margin-bottom: 4px; }
    .header p { font-size: 11pt; }

    .student-info {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .student-info th, .student-info td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 11pt;
    }
    .student-info th {
      width: 18%;
      background: #fff;
      font-weight: 700;
      text-align: right;
    }

    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section h2 {
      font-size: 13pt;
      font-weight: 700;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .section h3 {
      font-size: 12pt;
      font-weight: 700;
      margin: 8px 0 6px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 5px 6px;
      text-align: right;
      vertical-align: top;
    }
    .data-table th {
      background: #fff;
      font-weight: 700;
      text-align: center;
    }
    .data-table tfoot td.total {
      font-weight: 700;
      text-align: left;
      padding: 5px 8px;
    }

    .empty {
      border: 1px dashed #000;
      padding: 8px;
      text-align: center;
      font-size: 11pt;
    }

    .signatures {
      display: grid;
      gap: 16px;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #000;
      padding: 14px 10px 32px;
      text-align: center;
      min-height: 90px;
    }
    .sig-role { font-weight: 700; font-size: 11pt; margin-bottom: 4px; }
    .sig-name { font-size: 10.5pt; min-height: 14pt; margin-bottom: 14px; }
    .sig-line { font-size: 10pt; }

    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-size: 9pt;
      text-align: center;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.school.name ?? '')}</h1>
    <h2>تقرير شامل لملف الطالب</h2>
    <p>الفترة: ${escapeHtml(periodText)}</p>
  </div>

  <table class="student-info">
    <tr>
      <th>الاسم</th>
      <td>${escapeHtml(data.student.name)}</td>
      <th>رقم الهوية</th>
      <td>${escapeHtml(data.student.national_id)}</td>
    </tr>
    <tr>
      <th>الصف</th>
      <td>${escapeHtml(data.student.grade ?? '—')}</td>
      <th>الفصل</th>
      <td>${escapeHtml(data.student.class_name ?? '—')}</td>
    </tr>
    <tr>
      <th>رقم الطالب</th>
      <td>${escapeHtml(data.student.student_number ?? '—')}</td>
      <th>ولي الأمر</th>
      <td>${escapeHtml(data.student.parent_name ?? '—')}</td>
    </tr>
  </table>

  ${sectionsHtml}

  ${signaturesHtml(data)}

  <div class="footer">
    تم إصدار هذا التقرير بتاريخ ${escapeHtml(formatDateTime(data.generated_at))}
  </div>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 350)
}
