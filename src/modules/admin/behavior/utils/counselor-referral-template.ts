import type { BehaviorViolation } from '../types'

export interface CounselorReferralData {
  violation: BehaviorViolation
  schoolName: string
  issueDate: Date
  studentName: string
  studentNumber: string
  grade: string
  class: string
  violationType: string
  violationDate: string
  violationDescription: string
  referralReason: string
}

export function renderCounselorReferralDocument(data: CounselorReferralData): string {
  const formattedDate = data.issueDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'islamic-umalqura',
  })

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إحالة طالب إلى المرشد الطلابي</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #1a1a1a;
      background: white;
      font-size: 14pt;
      direction: rtl;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid #2563eb;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo {
      width: 80px;
      height: 80px;
    }

    .ministry-info {
      text-align: right;
    }

    .ministry-info h3 {
      font-size: 13pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 3px;
    }

    .school-info {
      text-align: left;
    }

    .school-info p {
      font-size: 11pt;
      color: #4b5563;
      margin-bottom: 2px;
    }

    .document-title {
      text-align: center;
      margin: 30px 0;
    }

    .document-title h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .document-title .subtitle {
      font-size: 12pt;
      color: #6b7280;
    }

    .greeting {
      font-size: 13pt;
      margin-bottom: 25px;
      line-height: 2;
    }

    .content-section {
      margin-bottom: 25px;
    }

    .content-section h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .info-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .info-label {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
    }

    .info-value {
      color: #1f2937;
      flex: 1;
    }

    .description-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      min-height: 80px;
    }

    .reason-box {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      min-height: 100px;
    }

    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }

    .signature-box {
      text-align: center;
      min-width: 200px;
    }

    .signature-line {
      border-top: 2px solid #374151;
      margin-top: 60px;
      margin-bottom: 8px;
    }

    .signature-label {
      font-weight: 600;
      color: #4b5563;
      font-size: 12pt;
    }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 10pt;
      color: #6b7280;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page {
        margin: 0;
        padding: 15mm;
      }

      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-section">
        <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="#2563eb" opacity="0.1"/>
          <path d="M30 40 L50 25 L70 40 L70 75 L30 75 Z" fill="#2563eb"/>
          <rect x="42" y="50" width="16" height="20" fill="white"/>
          <circle cx="50" cy="35" r="5" fill="white"/>
        </svg>
        <div class="ministry-info">
          <h3>المملكة العربية السعودية</h3>
          <h3>وزارة التعليم</h3>
        </div>
      </div>
      <div class="school-info">
        <p>المنطقة/المحافظة: ................................</p>
        <p>المدرسة: <strong>${data.schoolName}</strong></p>
      </div>
    </div>

    <div class="document-title">
      <h1>سري</h1>
      <h1>إحالة طالب/ـة</h1>
    </div>

    <div class="greeting">
      <p>المكرم الموجه الطلابي / الموجهة الطلابية................................ الله</p>
      <p><strong>السلام عليكم ورحمة الله وبركاته</strong></p>
    </div>

    <div class="content-section">
      <p style="margin-bottom: 20px;">
        يرجى منكم متابعة الطالب/الطالبة ودراسة حالته/حالتها، ووضع الحلول التربوية والعلاجية المناسبة.
      </p>
    </div>

    <div class="content-section">
      <h3>بيانات الطالب/الطالبة</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">الاسم:</span>
          <span class="info-value">${data.studentName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">رقم الطالب:</span>
          <span class="info-value">${data.studentNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الصف:</span>
          <span class="info-value">${data.grade}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الشعبة:</span>
          <span class="info-value">${data.class}</span>
        </div>
      </div>
    </div>

    <div class="content-section">
      <h3>تفاصيل المخالفة</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">نوع المخالفة:</span>
          <span class="info-value">${data.violationType}</span>
        </div>
        <div class="info-item">
          <span class="info-label">تاريخ المخالفة:</span>
          <span class="info-value">${data.violationDate}</span>
        </div>
      </div>
      <p style="margin-top: 15px; font-weight: 600; color: #374151;">وصف المخالفة:</p>
      <div class="description-box">
        ${data.violationDescription || 'لا توجد تفاصيل إضافية'}
      </div>
    </div>

    <div class="content-section">
      <h3>سبب الإحالة</h3>
      <div class="reason-box">
        ${data.referralReason}
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">وكيل/وكيلة شؤون الطلبة</div>
        <p style="margin-top: 5px; font-size: 10pt; color: #6b7280;">الاسم: ...................................</p>
        <p style="font-size: 10pt; color: #6b7280;">التوقيع: ...................................</p>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">الختم</div>
        <p style="margin-top: 5px; font-size: 10pt; color: #6b7280;">التاريخ: ${formattedDate}</p>
      </div>
    </div>

    <div class="footer">
      <p>www.moe.gov.sa</p>
      <p>هذه الوثيقة صادرة إلكترونياً من نظام الرائد المدرسي</p>
      <p>صفحة 65</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
