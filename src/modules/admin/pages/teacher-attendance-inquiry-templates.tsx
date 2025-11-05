import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/* eslint-disable react-refresh/only-export-components */

export type TeacherInquiryTemplateKind = 'delay' | 'absence'

export type InquiryTemplateData = {
  schoolName: string
  teacherName: string
  nationalId: string
  attendanceDayName: string
  attendanceDateHijri: string
  attendanceDateGregorian: string
  checkInTime: string
  workStartTime: string
  delayMinutesText: string
  issueDateHijri: string
  issueDateGregorian: string
  absenceReasonLabel?: string | null
  absenceNotes?: string | null
  absenceDurationText?: string | null
}

export type InquiryTemplateMetadata = {
  heading: string
  description: string
  bulkHeading: string
  bulkDescription: string
  downloadPrefix: string
}

type TemplateDefinition = {
  id: TeacherInquiryTemplateKind
  style: string
  render: (data: InquiryTemplateData) => React.ReactElement
  metadata: InquiryTemplateMetadata
}

const DELAY_TEMPLATE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap');

  @page {
    size: A4;
    margin: 10mm;
  }

  body {
    font-family: 'Readex Pro', 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
    direction: rtl;
    text-align: right;
    background: #e2e8f0;
    color: #0f172a;
    margin: 0;
    padding: 0;
  }

  .inquiry-sheet {
    width: 100%;
    max-width: calc(210mm - 20mm);
    min-height: calc(297mm - 20mm);
    margin: 0 auto;
    background: #fff;
    border: 1px solid #cbd5f5;
    padding: 10mm 12mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6mm;
  }

  .inquiry-header {
    border-bottom: 2px solid #0f766e;
    padding-bottom: 4mm;
  }

  .inquiry-header-line {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    color: #0f766e;
    font-size: 11px;
  }

  .inquiry-top-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }

  .inquiry-top-table th,
  .inquiry-top-table td {
    border: 1px solid #cbd5f5;
    padding: 5px 7px;
  }

  .inquiry-top-table th {
    background: #f8fafc;
    font-weight: 700;
    width: 22%;
  }

  .inquiry-top-table td {
    width: 28%;
    font-weight: 600;
  }

  .inquiry-section {
    font-size: 11.5px;
    line-height: 1.7;
  }

  .inquiry-section p {
    margin: 2px 0;
  }

  .inquiry-section .field {
    display: inline-block;
    min-width: 68px;
    border-bottom: 1px dotted #94a3b8;
    padding: 0 3px;
    font-weight: 600;
  }

  .inquiry-section .field.wide {
    min-width: 110px;
  }

  .inquiry-options {
    list-style: none;
    padding: 0;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .inquiry-option {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .inquiry-checkbox {
    font-size: 13px;
    font-weight: 700;
    width: 16px;
    text-align: center;
    color: #dc2626;
  }

  .inquiry-checkbox.unchecked {
    color: #64748b;
  }

  .signature-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }

  .signature-block {
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11.5px;
  }

  .signature-line {
    height: 1px;
    background: #94a3b8;
    margin: 3px 0 5px;
  }

  .signature-inline-row {
    display: flex;
    gap: 12px;
    margin-top: 10px;
    font-size: 11.5px;
  }

  .signature-inline-row span {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .signature-inline-row span:last-child {
    flex: 0.9;
  }

  .inline-line {
    flex: 1;
    border-bottom: 1px dotted #94a3b8;
    height: 1px;
  }

  .inline-line.short {
    flex: 0 0 70px;
  }

  .page-break {
    display: block;
    height: 0;
    margin: 0;
    border: 0;
    page-break-after: always;
  }

  .reason-lines {
    margin: 8px 0 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .reason-lines .line {
    height: 1px;
    background: repeating-linear-gradient(90deg, #94a3b8, #94a3b8 10px, transparent 10px, transparent 16px);
  }

  .decision-row {
    display: flex;
    gap: 14px;
    align-items: center;
    margin: 6px 0;
    font-size: 11.5px;
  }

  .note {
    font-size: 10.5px;
    color: #475569;
    margin-top: 4px;
  }

  .inquiry-footer {
    margin-top: auto;
  }

  .inquiry-footer-divider {
    height: 1px;
    background: #cbd5f5;
    margin-bottom: 6px;
  }

  .inquiry-footer-line {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  @media print {
    body {
      background: #fff;
    }
  }
`

const ABSENCE_TEMPLATE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap');

  @page {
    size: A4;
    margin: 10mm;
  }

  * {
    font-family: 'Readex Pro', 'Segoe UI', 'Tahoma', 'Arial', sans-serif !important;
  }

  body {
    font-family: 'Readex Pro', 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
    direction: rtl;
    text-align: right;
    background: #f1f5f9;
    color: #0f172a;
    margin: 0;
    padding: 0;
  }

  .absence-sheet {
    width: 100%;
    max-width: calc(210mm - 20mm);
    min-height: calc(297mm - 20mm);
    margin: 0 auto;
    background: #fff;
    border: 1px solid #94a3b8;
    box-shadow: 0 0 0 4px #e2e8f0 inset;
    padding: 10mm 12mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6mm;
  }

  .absence-header {
    border-bottom: 2px solid #047857;
    padding-bottom: 4mm;
  }

  .absence-header-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    color: #047857;
    font-size: 11.5px;
  }

  .absence-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .absence-info-table th,
  .absence-info-table td {
    border: 1px solid #cbd5f5;
    padding: 5px 7px;
  }

  .absence-info-table th {
    background: #f8fafc;
    font-weight: 700;
    width: 22%;
  }

  .absence-info-table td {
    width: 28%;
    font-weight: 600;
  }

  .absence-body,
  .absence-directive,
  .absence-teacher-reply,
  .absence-leadership {
    font-size: 11px;
    line-height: 1.6;
    margin-top: 3mm;
  }

  .absence-body p,
  .absence-directive p,
  .absence-teacher-reply p,
  .absence-leadership p {
    margin: 2px 0;
  }

  .absence-highlight {
    display: inline-block;
    min-width: 90px;
    padding: 0 3px;
    border-bottom: 1px dotted #94a3b8;
    font-weight: 600;
  }

  .absence-reason-box {
    margin: 4px 0;
    padding: 5px 7px;
    border: 1px dashed #94a3b8;
    background: #f8fafc;
    font-weight: 600;
  }

  .absence-notes {
    min-height: 32px;
    border: 1px dashed #cbd5f5;
    background: repeating-linear-gradient(180deg, #ffffff 0, #ffffff 24px, #cbd5f5 25px, #cbd5f5 26px);
    padding: 5px 7px;
    margin-top: 4px;
  }

  .absence-signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    gap: 8mm;
  }

  .absence-signature-block {
    min-width: 150px;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .absence-signature-line {
    height: 1px;
    background: #94a3b8;
  }

  .absence-footer-note {
    font-size: 10.5px;
    color: #475569;
    margin-top: auto;
    border-top: 1px solid #cbd5f5;
    padding-top: 5px;
  }

  .page-break {
    display: block;
    height: 0;
    margin: 0;
    border: 0;
    page-break-after: always;
  }

  @media print {
    body {
      background: #fff;
    }
  }
`

const DelayInquiryTemplate = ({ data }: { data: InquiryTemplateData }) => (
  <div className="inquiry-sheet">
    <div className="inquiry-header">
      <div className="inquiry-header-line">
        <span>نموذج رقم (18)</span>
        <span>اسم النموذج: تنبيه على تأخر / انصراف</span>
        <span>رمز النموذج (و.و.م.ن-02-3)</span>
      </div>
    </div>

    <table className="inquiry-top-table">
      <tbody>
        <tr>
          <th>المدرسة</th>
          <td>{data.schoolName}</td>
          <th>السجل المدني</th>
          <td>{data.nationalId}</td>
        </tr>
        <tr>
          <th>الاسم</th>
          <td>{data.teacherName}</td>
          <th>التخصص</th>
          <td>____________________</td>
        </tr>
        <tr>
          <th>المستوى/المرتبة</th>
          <td>____________________</td>
          <th>الوظيفة</th>
          <td>____________________</td>
        </tr>
        <tr>
          <th>العمل الحالي</th>
          <td>____________________</td>
          <th>رقم الوظيفة</th>
          <td>____________________</td>
        </tr>
      </tbody>
    </table>

    <section className="inquiry-section">
      <p>
        المكرم المعلم : <span className="field wide">{data.teacherName}</span>
      </p>
      <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
      <p>
        إشارة إلى يوم
        <span className="field">{data.attendanceDayName}</span>
        الموافق
        <span className="field">{data.attendanceDateHijri}</span>
        هـ، نأمل توضيح ما يلي:
      </p>

      <ul className="inquiry-options">
        <li className="inquiry-option">
          <span className="inquiry-checkbox">☑</span>
          <span>
            تأخركم من بداية العمل (الساعة
            <span className="field">{data.workStartTime}</span>
            ) وحضوركم الساعة
            <span className="field">{data.checkInTime}</span>
            — بمقدار
            <span className="field">{data.delayMinutesText}</span>
          </span>
        </li>
        <li className="inquiry-option">
          <span className="inquiry-checkbox unchecked">☐</span>
          <span>
            غيابكم أثناء العمل من الساعة
            <span className="field">__________</span>
            إلى الساعة
            <span className="field">__________</span>
          </span>
        </li>
        <li className="inquiry-option">
          <span className="inquiry-checkbox unchecked">☐</span>
          <span>
            انصرافكم مبكرًا قبل نهاية العمل من الساعة
            <span className="field">__________</span>
          </span>
        </li>
      </ul>

      <p>عليه نأمل توضيح أسباب ذلك مع إرفاق ما يثبت عذركم ،،، ولكم تحياتي ..</p>

      <div className="signature-row">
        <div className="signature-block">
          <p>قائد المدرسة :</p>
          <div className="signature-line" />
          <p>
            التاريخ :
            <span className="field">{data.issueDateHijri}</span>
            هـ
          </p>
        </div>
      </div>
    </section>

    <section className="inquiry-section">
      <p>المكرم قائد المدرسة</p>
      <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
      <p>أفيدكم أن أسباب ذلك ما يلي :</p>
      <div className="reason-lines">
        <span className="line" />
        <span className="line" />
        <span className="line" />
        <span className="line" />
      </div>
      <div className="signature-inline-row">
        <span>
          الاسم:
          <span className="inline-line" />
        </span>
        <span>
          التوقيع:
          <span className="inline-line" />
        </span>
        <span>
          التاريخ:
          <span className="inline-line short" />
        </span>
      </div>
    </section>

    <section className="inquiry-section">
      <p>رأي قائد المدرسة :</p>
      <div className="decision-row">
        <span className="inquiry-footer-line">
          <span className="inquiry-checkbox unchecked">☐</span>
          عذر مقبول
        </span>
        <span className="inquiry-footer-line">
          <span className="inquiry-checkbox unchecked">☐</span>
          عذر غير مقبول ويحسم عليه
        </span>
      </div>
      <div className="signature-row">
        <div className="signature-block">
          <p>قائد المدرسة :</p>
          <div className="signature-line" />
          <p>التاريخ : ____________</p>
        </div>
      </div>
    </section>

    <div className="inquiry-footer">
      <div className="inquiry-footer-divider" />
      <p className="note">
        ملاحظة: تُرفق بطاقة المسائلة مع أصل القرار في حالة عدم قبول العذر لحفظها بملفه بالإدارة، وأصلها بملفه في المدرسة.
      </p>
    </div>
  </div>
)

const AbsenceInquiryTemplate = ({ data }: { data: InquiryTemplateData }) => (
  <div className="absence-sheet">
    <header className="absence-header">
      <div className="absence-header-line">
        <span>نموذج رقم (10)</span>
        <span>اسم النموذج: مسائلة غياب</span>
        <span>رمز النموذج (و.م.ن-02-4)</span>
      </div>
    </header>

    <table className="absence-info-table">
      <tbody>
        <tr>
          <th>المدرسة</th>
          <td>{data.schoolName}</td>
          <th>السجل المدني</th>
          <td>{data.nationalId}</td>
        </tr>
        <tr>
          <th>الاسم</th>
          <td>{data.teacherName}</td>
          <th>عدد أيام الغياب</th>
          <td>{data.absenceDurationText ?? 'يوم واحد'}</td>
        </tr>
        <tr>
          <th>التخصص</th>
          <td>____________________</td>
          <th>الوظيفة</th>
          <td>____________________</td>
        </tr>
        <tr>
          <th>العمل الحالي</th>
          <td>____________________</td>
          <th>رقم الوظيفة</th>
          <td>____________________</td>
        </tr>
      </tbody>
    </table>

    <section className="absence-body">
      <p>
        المكرم المعلم / <span className="absence-highlight">{data.teacherName}</span>
      </p>
      <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
      <p>
        نود إفادتكم بأن غيابكم يوم{' '}
        <span className="absence-highlight">{data.attendanceDayName}</span>
        {' '}الموافق{' '}
        <span className="absence-highlight">{data.attendanceDateHijri}</span>
        {' '}هـ، قد تم تسجيله ضمن سجلات المدرسة.
      </p>
      <div className="absence-reason-box">
        سبب الغياب المسجل: {data.absenceReasonLabel ?? '—'}
      </div>
      {data.absenceNotes ? (
        <div>
          <p>الملاحظات المرفقة:</p>
          <div className="absence-notes">{data.absenceNotes}</div>
        </div>
      ) : null}
    </section>

    <section className="absence-directive">
      <p>
        نأمل تزويدنا بما يثبت سبب الغياب خلال مدة لا تتجاوز أسبوعًا من تاريخ التبليغ، وفي حال تعذر ذلك سيُتخذ
        الإجراء النظامي حسب التعليمات.
      </p>
    </section>

    <section className="absence-signature-row">
      <div className="absence-signature-block">
        <p>اسم الرئيس المباشر :</p>
        <div className="absence-signature-line" />
        <p>
          التاريخ :
          <span className="absence-highlight">{data.issueDateHijri}</span>
          هـ
        </p>
      </div>
      <div className="absence-signature-block">
        <p>اسم قائد المدرسة :</p>
        <div className="absence-signature-line" />
        <p>التاريخ : ____________</p>
      </div>
    </section>

    <section className="absence-teacher-reply">
      <p>المكرم قائد المدرسة</p>
      <p>السلام عليكم ورحمة الله وبركاته وبعد :</p>
      <p>أفيدكم بأن سبب الغياب هو :</p>
      <div className="absence-notes" />
      <div className="absence-signature-row">
        <div className="absence-signature-block">
          <p>اسم المعلم :</p>
          <div className="absence-signature-line" />
        </div>
        <div className="absence-signature-block">
          <p>التوقيع :</p>
          <div className="absence-signature-line" />
        </div>
        <div className="absence-signature-block">
          <p>التاريخ :</p>
          <div className="absence-signature-line" />
        </div>
      </div>
    </section>

    <section className="absence-leadership">
      <p>رأي قائد المدرسة :</p>
      <div className="absence-notes" />
      <div className="absence-signature-row">
        <div className="absence-signature-block">
          <p>اسم قائد المدرسة :</p>
          <div className="absence-signature-line" />
        </div>
        <div className="absence-signature-block">
          <p>التوقيع :</p>
          <div className="absence-signature-line" />
        </div>
        <div className="absence-signature-block">
          <p>التاريخ :</p>
          <div className="absence-signature-line" />
        </div>
      </div>
    </section>

    <p className="absence-footer-note">
      ملاحظة: تحفظ نسخة من النموذج في ملف المعلم بالمدرسة، وترسل نسخة إلى الإدارة التعليمية عند الحاجة.
    </p>
  </div>
)

const TEMPLATE_DEFINITIONS: Record<TeacherInquiryTemplateKind, TemplateDefinition> = {
  delay: {
    id: 'delay',
    style: DELAY_TEMPLATE_STYLE,
    render: (data) => <DelayInquiryTemplate data={data} />,
    metadata: {
      heading: 'نموذج مسائلة تأخر',
      description: 'راجع البيانات ثم استخدم خيارات الطباعة أو التنزيل لإصدار النموذج الرسمي للتأخر.',
      bulkHeading: 'نموذج مسائلة تأخر — جميع المتأخرين',
      bulkDescription: 'تم تضمين جميع حالات التأخر الحالية ضمن مستند واحد للطباعة أو التنزيل.',
      downloadPrefix: 'delay-inquiry',
    },
  },
  absence: {
    id: 'absence',
    style: ABSENCE_TEMPLATE_STYLE,
    render: (data) => <AbsenceInquiryTemplate data={data} />,
    metadata: {
      heading: 'نموذج مسائلة غياب',
      description: 'تحقق من بيانات الغياب، ثم اطبع أو نزّل النموذج الرسمي المعتمد لمسائلة الغياب.',
      bulkHeading: 'نموذج مسائلة غياب — جميع الغائبين',
      bulkDescription: 'يشمل هذا المستند كل سجلات الغياب المحددة بصيغة واحدة للطباعة أو الحفظ.',
      downloadPrefix: 'absence-inquiry',
    },
  },
}

function wrapHtmlDocument(title: string, style: string, markup: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${style}</style>
  </head>
  <body>
    ${markup}
  </body>
</html>`
}

export function renderInquiryDocument(template: TeacherInquiryTemplateKind, data: InquiryTemplateData): string {
  const definition = TEMPLATE_DEFINITIONS[template]
  const markup = renderToStaticMarkup(definition.render(data))
  const title = `${definition.metadata.heading} — ${data.teacherName}`
  return wrapHtmlDocument(title, definition.style, markup)
}

export function renderBulkInquiryDocument(
  template: TeacherInquiryTemplateKind,
  entries: InquiryTemplateData[],
): string {
  const definition = TEMPLATE_DEFINITIONS[template]
  const sheets = entries
    .map((data, index) => {
      const markup = renderToStaticMarkup(definition.render(data))
      const separator = index === entries.length - 1 ? '' : '<div class="page-break"></div>'
      return `${markup}${separator}`
    })
    .join('\n')

  const title = definition.metadata.bulkHeading ?? definition.metadata.heading
  return wrapHtmlDocument(title, definition.style, sheets)
}

export function getInquiryTemplateMetadata(template: TeacherInquiryTemplateKind): InquiryTemplateMetadata {
  return TEMPLATE_DEFINITIONS[template].metadata
}
