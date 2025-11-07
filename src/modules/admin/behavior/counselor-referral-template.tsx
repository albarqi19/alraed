import { renderToStaticMarkup } from 'react-dom/server'

/* eslint-disable react-refresh/only-export-components */

export type CounselorReferralData = {
  schoolName: string
  studentName: string
  studentNumber: string
  grade: string
  className: string
  violationType: string
  violationDegree: number
  violationDate: string
  violationTime: string
  violationLocation: string
  violationDescription: string
  referralDate: string
  referralReason: string
}

const REFERRAL_TEMPLATE_STYLE = `
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

  .referral-sheet {
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

  .referral-header {
    border-bottom: 2px solid #047857;
    padding-bottom: 2mm;
  }

  .referral-header-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    color: #047857;
    font-size: 11px;
  }

  .referral-title {
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 3mm 0 2mm;
  }

  .referral-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }

  .referral-info-table th,
  .referral-info-table td {
    border: 1px solid #cbd5f5;
    padding: 4px 6px;
  }

  .referral-info-table th {
    background: #f8fafc;
    font-weight: 700;
    width: 22%;
  }

  .referral-info-table td {
    width: 28%;
    font-weight: 600;
  }

  .referral-body,
  .referral-reason,
  .referral-counselor-notes {
    font-size: 10.5px;
    line-height: 1.5;
    margin-top: 2mm;
  }

  .referral-body p,
  .referral-reason p,
  .referral-counselor-notes p {
    margin: 1px 0;
  }

  .referral-highlight {
    display: inline-block;
    min-width: 80px;
    padding: 0 3px;
    border-bottom: 1px dotted #94a3b8;
    font-weight: 600;
  }

  .referral-description-box {
    margin: 3px 0;
    padding: 6px 8px;
    border: 1px dashed #94a3b8;
    background: #f8fafc;
    font-weight: 600;
    min-height: 40px;
    line-height: 1.6;
  }

  .referral-notes-area {
    min-height: 50px;
    border: 1px dashed #cbd5f5;
    background: repeating-linear-gradient(180deg, #ffffff 0, #ffffff 22px, #cbd5f5 23px, #cbd5f5 24px);
    padding: 4px 6px;
    margin-top: 3px;
  }

  .referral-signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    gap: 6mm;
  }

  .referral-signature-block {
    min-width: 140px;
    font-size: 10.5px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .referral-signature-line {
    height: 1px;
    background: #94a3b8;
  }

  .referral-footer-note {
    font-size: 10px;
    color: #475569;
    margin-top: auto;
    border-top: 1px solid #cbd5f5;
    padding-top: 4px;
  }

  @media print {
    body {
      background: #fff;
    }
  }
`

const CounselorReferralTemplate = ({ data }: { data: CounselorReferralData }) => (
  <div className="referral-sheet">
    <header className="referral-header">
      <div className="referral-header-line">
        <span>المملكة العربية السعودية</span>
        <span>{data.schoolName}</span>
      </div>
      <div className="referral-header-line" style={{ marginTop: '3px' }}>
        <span>وزارة التعليم</span>
        <span></span>
      </div>
    </header>

    <h1 className="referral-title">
      إحالة طالب/ـة
    </h1>

    <table className="referral-info-table">
      <tbody>
        <tr>
          <th>الاسم</th>
          <td>{data.studentName}</td>
          <th>رقم الطالب</th>
          <td>{data.studentNumber}</td>
        </tr>
        <tr>
          <th>الصف</th>
          <td>{data.grade}</td>
          <th>الشعبة</th>
          <td>{data.className}</td>
        </tr>
        <tr>
          <th>نوع المخالفة</th>
          <td>{data.violationType}</td>
          <th>درجة المخالفة</th>
          <td>الدرجة {data.violationDegree}</td>
        </tr>
        <tr>
          <th>تاريخ المخالفة</th>
          <td>{data.violationDate}</td>
          <th>وقت المخالفة</th>
          <td>{data.violationTime}</td>
        </tr>
      </tbody>
    </table>

    <section className="referral-body">
      <p>المكرم / المكرمة المرشد الطلابي / المرشدة الطلابية</p>
      <p>السلام عليكم ورحمة الله وبركاته</p>
      <p>
        تحية طيبة وبعد ،،
      </p>
      <p>
        نحيل إليكم الطالب / الطالبة:
        <span className="referral-highlight">{data.studentName}</span>
        بالصف
        <span className="referral-highlight">{data.grade}</span>
      </p>
    </section>

    <section className="referral-reason">
      <p><strong>بالوصف ذي المشكلة السلوكية من الدرجة {data.violationDegree} :</strong></p>
      <div className="referral-description-box">
        {data.violationDescription}
      </div>

      <p style={{ marginTop: '6mm' }}>
        <strong>موقع المخالفة:</strong>
        <span className="referral-highlight">{data.violationLocation}</span>
      </p>

      <p style={{ marginTop: '4mm' }}>
        <strong>سبب الإحالة:</strong>
      </p>
      <div className="referral-description-box">
        {data.referralReason}
      </div>
    </section>

    <section className="referral-body" style={{ marginTop: '6mm' }}>
      <p>
        يرجى دراسة حالته / حالتها واتخاذ ما يلزم ، وتزويدنا بتقرير عن حالة الطالب / الطالبة.
      </p>
      <p>
        ولكم جزيل الشكر والتقدير ،،،
      </p>

      <div className="referral-signature-row">
        <div className="referral-signature-block">
          <p>مدير المدرسة:</p>
          <div className="referral-signature-line" style={{ marginTop: '8px', marginBottom: '8px' }} />
          <p>
            التاريخ:
            <span className="referral-highlight">{data.referralDate}</span>
          </p>
        </div>
        <div className="referral-signature-block">
          <p>الختم:</p>
          <div style={{ height: '50px', border: '1px dashed #cbd5f5', marginTop: '4px' }} />
        </div>
      </div>
    </section>

    <section className="referral-counselor-notes" style={{ marginTop: '8mm' }}>
      <p><strong>ملاحظات المرشد الطلابي / المرشدة الطلابية:</strong></p>
      <div className="referral-notes-area" />

      <div className="referral-signature-row" style={{ marginTop: '6mm' }}>
        <div className="referral-signature-block">
          <p>المرشد الطلابي / المرشدة الطلابية:</p>
          <div className="referral-signature-line" style={{ marginTop: '8px', marginBottom: '8px' }} />
          <p>التاريخ: _________________</p>
        </div>
        <div className="referral-signature-block">
          <p>التوقيع:</p>
          <div className="referral-signature-line" style={{ marginTop: '8px', marginBottom: '8px' }} />
        </div>
      </div>
    </section>
  </div>
)

export function generateCounselorReferralHtml(data: CounselorReferralData): string {
  const html = renderToStaticMarkup(<CounselorReferralTemplate data={data} />)
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>نموذج إحالة طالب للمرشد الطلابي</title>
        <style>${REFERRAL_TEMPLATE_STYLE}</style>
      </head>
      <body>${html}</body>
    </html>
  `
}
