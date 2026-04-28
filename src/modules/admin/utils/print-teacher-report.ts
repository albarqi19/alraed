import type {
  TeacherReportData,
  TeacherReportSectionKey,
  TeacherReportSignatureKey,
} from '@/services/api/teacher-report'

const SECTION_TITLES: Record<TeacherReportSectionKey, string> = {
  daily_attendance: 'ملخص الحضور',
  daily_lates: 'تفاصيل التأخيرات اليومية',
  daily_absences: 'تفاصيل الغيابات اليومية',
  period_actions: 'المتابعة المباشرة (إجراءات الحصص والمناوبات)',
  schedule: 'الجدول الأسبوعي',
  preparation: 'تحضير الدروس (مدرستي)',
  standby_coverage: 'حصص الانتظار التي غطّاها',
  coverage_requests: 'طلبات التغطية',
  referrals_sent: 'الإحالات المُرسَلة',
  admin_messages: 'الرسائل المُرسَلة من الإدارة',
}

const SECTION_ORDER: TeacherReportSectionKey[] = [
  'daily_attendance',
  'daily_lates',
  'daily_absences',
  'period_actions',
  'schedule',
  'preparation',
  'standby_coverage',
  'coverage_requests',
  'referrals_sent',
  'admin_messages',
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
    return `<p class="empty">${escapeHtml(emptyText)}</p>`
  }
  const headerCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const bodyRows = rows.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `
    <table class="data-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr><td colspan="${headers.length}" class="total">${escapeHtml(totalLabel)}: ${rows.length}</td></tr></tfoot>
    </table>
  `
}

function statBox(label: string, value: string | number): string {
  return `
    <div class="stat">
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>
  `
}

function sectionDailyAttendance(data: TeacherReportData): string {
  const sec = data.sections.daily_attendance
  if (!sec) return ''
  const t = sec.totals
  return `
    <section class="section">
      <h2>${SECTION_TITLES.daily_attendance}</h2>
      <div class="stats-grid">
        ${statBox('إجمالي الأيام', t.records)}
        ${statBox('الحضور', t.present)}
        ${statBox('في الوقت', t.on_time)}
        ${statBox('متأخر', t.delayed)}
        ${statBox('غياب', t.absent)}
        ${statBox('معذور', t.excused)}
        ${statBox('إجمالي دقائق التأخر', t.total_delay_minutes)}
        ${statBox('نسبة الالتزام', t.attendance_rate_pct !== null ? `${t.attendance_rate_pct}%` : '—')}
      </div>
    </section>
  `
}

function sectionDailyLates(data: TeacherReportData): string {
  const sec = data.sections.daily_lates
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.check_in_time ?? '—'),
    escapeHtml(item.delay_minutes ?? '—'),
    escapeHtml(item.notes ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.daily_lates}</h2>
      <p class="hint">إجمالي دقائق التأخر: <strong>${escapeHtml(sec.total_minutes)}</strong></p>
      ${tableHtml(['م', 'التاريخ', 'وقت الدخول', 'الدقائق', 'ملاحظات'], rows, 'لا توجد سجلات تأخير في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionDailyAbsences(data: TeacherReportData): string {
  const sec = data.sections.daily_absences
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.reason_label ?? '—'),
    escapeHtml(item.notes ?? '—'),
    item.is_manual ? '<span class="badge">يدوي</span>' : '—',
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.daily_absences}</h2>
      ${tableHtml(['م', 'التاريخ', 'السبب', 'ملاحظات', 'المصدر'], rows, 'لا توجد غيابات في هذه الفترة', 'الإجمالي')}
    </section>
  `
}

function sectionPeriodActions(data: TeacherReportData): string {
  const sec = data.sections.period_actions
  if (!sec) return ''
  const t = sec.totals
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.action_label),
    escapeHtml(item.period_label),
    escapeHtml(item.subject_class ?? '—'),
    escapeHtml(item.minutes !== null ? `${item.minutes} د` : '—'),
    escapeHtml(item.recorded_by ?? '—'),
    escapeHtml(item.notes ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.period_actions}</h2>
      <div class="stats-grid">
        ${statBox('غياب حصة', t.class_absent)}
        ${statBox('تأخر حصة', t.class_late)}
        ${statBox('دقائق تأخر الحصص', t.class_late_minutes)}
        ${statBox('انصراف مبكر', t.early_leave)}
        ${statBox('غياب الطابور', t.assembly_absences)}
        ${statBox('غياب الفسحة', t.break_absences)}
        ${statBox('غياب الانصراف', t.dismissal_absences)}
        ${statBox('غياب مناوبة', t.duty_absent)}
      </div>
      ${tableHtml(
        ['م', 'التاريخ', 'الإجراء', 'الفترة', 'الصف/المادة', 'الدقائق', 'سجّل بواسطة', 'ملاحظات'],
        rows,
        'لا توجد إجراءات مسجَّلة في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

function sectionSchedule(data: TeacherReportData): string {
  const sec = data.sections.schedule
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(item.day_label),
    escapeHtml(item.period_number),
    escapeHtml(item.subject ?? '—'),
    escapeHtml(item.grade ?? '—'),
    escapeHtml(item.class_name ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.schedule}</h2>
      ${tableHtml(['م', 'اليوم', 'الحصة', 'المادة', 'الصف', 'الفصل'], rows, 'لا توجد حصص نشطة', 'الإجمالي')}
    </section>
  `
}

function sectionPreparation(data: TeacherReportData): string {
  const sec = data.sections.preparation
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.day ?? '—'),
    escapeHtml(item.period_number ?? '—'),
    escapeHtml(item.lesson_title ?? '—'),
    escapeHtml(item.class_name ?? '—'),
    escapeHtml(item.status_text ?? item.status ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.preparation}</h2>
      <div class="stats-grid">
        ${statBox('محضّر', sec.totals.prepared)}
        ${statBox('غير محضّر', sec.totals.not_prepared)}
      </div>
      ${tableHtml(
        ['م', 'التاريخ', 'اليوم', 'الحصة', 'الدرس', 'الفصل', 'الحالة'],
        rows,
        'لا توجد سجلات تحضير في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

function sectionStandbyCoverage(data: TeacherReportData): string {
  const sec = data.sections.standby_coverage
  if (!sec) return ''
  const statusLabel = (s: string | null) =>
    s === 'assigned' ? 'مكلَّف' : s === 'completed' ? 'منفَّذ' : s === 'cancelled' ? 'مُلغى' : (s ?? '—')
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.period_number ?? '—'),
    escapeHtml(item.class ?? '—'),
    escapeHtml(item.replacing_teacher ?? '—'),
    escapeHtml(statusLabel(item.status)),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.standby_coverage}</h2>
      <div class="stats-grid">
        ${statBox('مكلَّف بها', sec.totals.assigned)}
        ${statBox('منفَّذ', sec.totals.completed)}
        ${statBox('مُلغى', sec.totals.cancelled)}
      </div>
      ${tableHtml(
        ['م', 'التاريخ', 'الحصة', 'الفصل', 'بديلاً عن', 'الحالة'],
        rows,
        'لم يغطِّ أي حصة انتظار في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

function sectionCoverageRequests(data: TeacherReportData): string {
  const sec = data.sections.coverage_requests
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.role_label),
    escapeHtml(
      item.from_period && item.to_period
        ? item.from_period === item.to_period
          ? `الحصة ${item.from_period}`
          : `${item.from_period} → ${item.to_period}`
        : '—',
    ),
    escapeHtml(item.other_teacher ?? '—'),
    escapeHtml(item.status ?? '—'),
    escapeHtml(item.reason ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.coverage_requests}</h2>
      ${tableHtml(
        ['م', 'التاريخ', 'الدور', 'الحصص', 'مع المعلم', 'الحالة', 'السبب'],
        rows,
        'لا توجد طلبات تغطية في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

function sectionReferralsSent(data: TeacherReportData): string {
  const sec = data.sections.referrals_sent
  if (!sec) return ''
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.referral_type_label),
    escapeHtml(item.priority_label),
    escapeHtml(item.status_label),
    escapeHtml(item.student_name ?? '—'),
    escapeHtml(item.title ?? '—'),
    escapeHtml(item.reason ?? '—'),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.referrals_sent}</h2>
      ${tableHtml(
        ['م', 'التاريخ', 'النوع', 'الأولوية', 'الحالة', 'الطالب', 'العنوان', 'السبب'],
        rows,
        'لا توجد إحالات مُرسلة في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

function sectionAdminMessages(data: TeacherReportData): string {
  const sec = data.sections.admin_messages
  if (!sec) return ''
  const totalsHtml = Object.entries(sec.totals)
    .map(([key, count]) => statBox(key, count))
    .join('')
  const rows = sec.items.map((item, idx) => [
    escapeHtml(idx + 1),
    escapeHtml(formatDate(item.date)),
    escapeHtml(item.type_label),
    escapeHtml(item.excerpt),
  ])
  return `
    <section class="section">
      <h2>${SECTION_TITLES.admin_messages}</h2>
      ${totalsHtml ? `<div class="stats-grid">${totalsHtml}</div>` : ''}
      ${tableHtml(
        ['م', 'التاريخ', 'نوع الرسالة', 'محتوى مختصر'],
        rows,
        'لم يتم إرسال أي رسائل في هذه الفترة',
        'الإجمالي',
      )}
    </section>
  `
}

const SECTION_BUILDERS: Record<TeacherReportSectionKey, (data: TeacherReportData) => string> = {
  daily_attendance: sectionDailyAttendance,
  daily_lates: sectionDailyLates,
  daily_absences: sectionDailyAbsences,
  period_actions: sectionPeriodActions,
  schedule: sectionSchedule,
  preparation: sectionPreparation,
  standby_coverage: sectionStandbyCoverage,
  coverage_requests: sectionCoverageRequests,
  referrals_sent: sectionReferralsSent,
  admin_messages: sectionAdminMessages,
}

const SIGNATURE_ORDER: TeacherReportSignatureKey[] = ['teacher', 'supervisor', 'deputy', 'principal']

function signaturesHtml(data: TeacherReportData): string {
  const keys = SIGNATURE_ORDER.filter((k) => data.signatories[k])
  if (keys.length === 0) return ''
  const boxes = keys
    .map((k) => {
      const info = data.signatories[k]!
      return `
        <div class="sig-box">
          <p class="sig-role">${escapeHtml(info.role_label)}</p>
          <p class="sig-name">${escapeHtml(info.name ?? '')}</p>
          <p class="sig-line">التوقيع: .........................................</p>
        </div>
      `
    })
    .join('')
  return `
    <section class="signatures" style="grid-template-columns: repeat(${keys.length}, 1fr);">
      ${boxes}
    </section>
  `
}

export function printTeacherReport(data: TeacherReportData): void {
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
  <title>تقرير ملف المعلم - ${escapeHtml(data.teacher.name)}</title>
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

    .teacher-info {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .teacher-info th, .teacher-info td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 11pt;
    }
    .teacher-info th {
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

    .hint { font-size: 11pt; margin-bottom: 6px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .stat {
      border: 1px solid #000;
      padding: 6px 4px;
      text-align: center;
    }
    .stat-value { font-size: 13pt; font-weight: 700; }
    .stat-label { font-size: 9.5pt; color: #333; }

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

    .badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 1px 6px;
      font-size: 9.5pt;
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
    <h2>تقرير شامل لملف المعلم</h2>
    <p>الفترة: ${escapeHtml(periodText)}</p>
  </div>

  <table class="teacher-info">
    <tr>
      <th>الاسم</th>
      <td>${escapeHtml(data.teacher.name)}</td>
      <th>رقم الهوية</th>
      <td>${escapeHtml(data.teacher.national_id ?? '—')}</td>
    </tr>
    <tr>
      <th>الجوال</th>
      <td>${escapeHtml(data.teacher.phone ?? '—')}</td>
      <th>الدور</th>
      <td>${escapeHtml(data.teacher.role_label)}${data.teacher.secondary_role_label ? ' / ' + escapeHtml(data.teacher.secondary_role_label) : ''}</td>
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
