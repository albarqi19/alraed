import { renderToStaticMarkup } from 'react-dom/server'

export type GuardianInvitationData = {
  schoolName: string
  region?: string | null
  studentName: string
  grade: string
  className: string
  meetingDay: string
  meetingDateHijri: string
  meetingDateGregorian: string
  meetingPurpose: string
  meetingTime: string
  issueDateHijri: string
  issueDateGregorian: string
  principalName?: string | null
}

const GUARDIAN_INVITATION_TEMPLATE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap');

  @page {
    size: A4;
    margin: 8mm;
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

  .invitation-sheet {
    width: 100%;
    max-width: calc(210mm - 16mm);
    min-height: calc(297mm - 16mm);
    margin: 0 auto;
    background: #fff;
    border: 1px solid #94a3b8;
    box-shadow: 0 0 0 3px #e2e8f0 inset;
    padding: 6mm 8mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 3mm;
  }

  .invitation-header {
    border-bottom: 2px solid #047857;
    padding-bottom: 2mm;
  }

  .invitation-header-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    color: #047857;
    font-size: 11px;
  }

  .invitation-title {
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 3mm 0 2mm;
  }

  .invitation-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-bottom: 2mm;
  }

  .invitation-info-table th,
  .invitation-info-table td {
    border: 1px solid #cbd5f5;
    padding: 4px 6px;
  }

  .invitation-info-table th {
    background: #f8fafc;
    font-weight: 700;
    width: 22%;
  }

  .invitation-info-table td {
    width: 28%;
    font-weight: 600;
  }

  .invitation-body {
    font-size: 10.5px;
    line-height: 1.6;
    margin-top: 2mm;
  }

  .invitation-body p {
    margin: 2mm 0;
  }

  .invitation-highlight {
    display: inline-block;
    min-width: 80px;
    padding: 0 3px;
    border-bottom: 1px dotted #94a3b8;
    font-weight: 600;
  }

  .invitation-purpose-box {
    margin: 3px 0;
    padding: 6px 8px;
    border: 1px dashed #94a3b8;
    background: #f8fafc;
    font-weight: 600;
    min-height: 35px;
    line-height: 1.6;
  }

  .invitation-signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    gap: 6mm;
  }

  .invitation-signature-block {
    min-width: 140px;
    font-size: 10.5px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .invitation-signature-line {
    height: 1px;
    background: #94a3b8;
  }

  .invitation-response-box {
    border: 1px dashed #cbd5f5;
    border-radius: 8px;
    padding: 5mm 6mm;
    background: #f8fafc;
    margin-top: 3mm;
    font-size: 10.5px;
  }

  .checkbox-line {
    display: flex;
    align-items: center;
    gap: 3mm;
    margin: 2mm 0;
  }

  .checkbox {
    width: 11px;
    height: 11px;
    border: 1.4px solid #0f766e;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .invitation-footer-note {
    font-size: 10px;
    color: #475569;
    margin-top: auto;
    border-top: 1px solid #cbd5f5;
    padding-top: 4px;
    text-align: center;
  }

  @media print {
    body {
      background: #fff;
    }
  }
`

const GuardianInvitationTemplate = ({ data }: { data: GuardianInvitationData }) => (
  <div className="invitation-sheet">
    <header className="invitation-header">
      <div className="invitation-header-line">
        <span>المملكة العربية السعودية</span>
        <span>{data.schoolName}</span>
      </div>
      <div className="invitation-header-line" style={{ marginTop: '3px' }}>
        <span>وزارة التعليم</span>
        <span>{data.region?.trim() || ''}</span>
      </div>
    </header>

    <h1 className="invitation-title">خطاب دعوة ولي الأمر</h1>

    <table className="invitation-info-table">
      <tbody>
        <tr>
          <th>اسم الطالب/ـة</th>
          <td>{data.studentName}</td>
          <th>الصف</th>
          <td>{data.grade}</td>
        </tr>
        <tr>
          <th>الشعبة</th>
          <td>{data.className}</td>
          <th>تاريخ الدعوة</th>
          <td>{data.issueDateHijri}</td>
        </tr>
      </tbody>
    </table>

    <section className="invitation-body">
      <p>المكرم ولي أمر الطالب/ـة <span className="invitation-highlight">{data.studentName}</span></p>
      <p style={{ marginTop: '4mm' }}>السلام عليكم ورحمة الله وبركاته،</p>
      <p style={{ marginTop: '3mm' }}>
        نأمل منكم الحضور إلى المدرسة في يوم{' '}
        <span className="invitation-highlight">{data.meetingDay}</span> الموافق{' '}
        <span className="invitation-highlight">{data.meetingDateGregorian}</span> ({data.meetingDateHijri})
        في تمام الساعة <span className="invitation-highlight">{data.meetingTime}</span>
      </p>
      <div className="invitation-purpose-box">
        <strong>الغرض من الدعوة:</strong> {data.meetingPurpose}
      </div>
      <p style={{ marginTop: '3mm' }}>
        شاكرين لكم تعاونكم معنا بما يحقق مصلحة الطالب/ـة.
      </p>
    </section>

    <section className="invitation-signature-row">
      <div className="invitation-signature-block">
        <p style={{ fontWeight: 700, marginBottom: '2mm' }}>مدير/ة المدرسة</p>
        <p>الاسم: <span className="invitation-highlight">{data.principalName?.trim() || '......................'}</span></p>
        <div className="invitation-signature-line" style={{ margin: '8mm 0 2mm' }}></div>
        <p style={{ fontSize: '10px', color: '#64748b' }}>التوقيع</p>
      </div>
      <div className="invitation-signature-block">
        <p style={{ fontWeight: 700, marginBottom: '2mm' }}>الختم</p>
        <div className="invitation-signature-line" style={{ margin: '28mm 0 2mm' }}></div>
      </div>
    </section>

    <section className="invitation-response-box">
      <p style={{ fontWeight: 700, marginBottom: '3mm', color: '#0f172a' }}>رد ولي الأمر:</p>
      <div className="checkbox-line">
        <span className="checkbox"></span>
        <span>أقر بالعلم، وسأحضر في الموعد المحدد.</span>
      </div>
      <div className="checkbox-line">
        <span className="checkbox"></span>
        <span>أعتذر عن الحضور لظروف خاصة.</span>
      </div>
      <div style={{ marginTop: '4mm', display: 'flex', gap: '4mm', flexWrap: 'wrap' }}>
        <span>الاسم: <span className="invitation-highlight" style={{ minWidth: '60mm' }}>..................</span></span>
        <span>التوقيع: <span className="invitation-highlight" style={{ minWidth: '40mm' }}>..................</span></span>
      </div>
    </section>

    <footer className="invitation-footer-note">
      تاريخ الإصدار: {data.issueDateGregorian} ({data.issueDateHijri})
    </footer>
  </div>
)

export const generateGuardianInvitationHtml = (data: GuardianInvitationData): string => `<!DOCTYPE html><html lang="ar"><head><meta charSet="utf-8" /><title>دعوة ولي الأمر</title><style>${GUARDIAN_INVITATION_TEMPLATE_STYLE}</style></head><body>${renderToStaticMarkup(<GuardianInvitationTemplate data={data} />)}</body></html>`
