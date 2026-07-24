import type { BehaviorProcedureTaskExecution, BehaviorViolation } from '../types'

const DEGREE_LABELS: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
}

interface ReferralFormContext {
  violation: BehaviorViolation
  task: BehaviorProcedureTaskExecution
}

export function openCounselorReferralForm({ violation, task }: ReferralFormContext) {
  const referralWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200')

  if (!referralWindow) {
    alert('تعذر فتح نموذج التحويل. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.')
    return
  }

  const today = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'long' }).format(new Date())
  const incidentDate = violation.date
    ? new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'long' }).format(new Date(violation.date))
    : '................'
  const degreeLabel = DEGREE_LABELS[violation.degree] ?? violation.degree
  const studentName = violation.studentName || '........................'
  const violationType = violation.type || '........................'
  const studentClass = `${violation.grade ?? ''} ${violation.class ?? ''}`.trim() || '........................'
  const reporter = violation.reportedBy || '........................'

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>نموذج إحالة المرشد الطلابي - ${studentName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 22mm 18mm; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12); position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; font-size: 13px; color: #1e293b; }
    .header .left, .header .right { line-height: 1.8; }
    .header .center { text-align: center; flex: 1; }
    .header .center img { height: 66px; margin-bottom: 8px; }
    .secret { border: 2px dashed #94a3b8; border-radius: 12px; padding: 6px 18px; font-weight: 700; letter-spacing: 4px; display: inline-block; margin-bottom: 12px; color: #1e293b; }
    .title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111827; }
    .text-block { font-size: 16px; line-height: 2; margin-bottom: 28px; color: #1f2937; }
    .text-block span.highlight { border-bottom: 1px dotted #64748b; padding: 0 6px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 36px; font-size: 15px; }
    .info-item { display: flex; align-items: center; gap: 8px; }
    .info-label { font-weight: 600; color: #0f172a; min-width: 120px; }
    .info-value { flex: 1; border-bottom: 1px dotted #94a3b8; padding-bottom: 4px; color: #0f172a; min-height: 22px; }
    .signature { margin-top: 48px; display: flex; justify-content: space-between; gap: 24px; }
    .signature .block { flex: 1; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; background: #f8fafc; font-size: 14px; line-height: 2; min-height: 130px; }
    .signature .block h3 { margin: 0 0 12px 0; font-size: 15px; color: #0f172a; }
    .actions-bar { position: fixed; bottom: 0; right: 0; left: 0; background: linear-gradient(to top, rgba(15,23,42,0.96), rgba(15,23,42,0.82)); border-top: 1px solid rgba(148,163,184,0.4); padding: 14px 20px; display: flex; justify-content: center; gap: 12px; z-index: 50; }
    .actions-bar button { background: #2563eb; color: #fff; border: none; border-radius: 12px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: inline-flex; align-items: center; gap: 8px; }
    .actions-bar button:hover { transform: translateY(-2px); box-shadow: 0 12px 20px rgba(37,99,235,0.3); }
    .actions-bar button:active { transform: translateY(0); box-shadow: none; }
    .actions-bar button.secondary { background: rgba(148,163,184,0.35); color: #e2e8f0; backdrop-filter: blur(6px); }
    .actions-bar button.secondary:hover { background: rgba(148,163,184,0.5); }
    .footer { position: absolute; bottom: 18mm; left: 18mm; right: 18mm; text-align: center; font-size: 12px; color: #94a3b8; letter-spacing: 1px; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; margin: 0; }
      .actions-bar { display: none !important; }
      .footer { bottom: 10mm; }
    }
    @page { size: A4; margin: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"></script>
</head>
<body>
  <div class="sheet" id="referral-sheet">
    <header class="header">
      <div class="right">
        <div>المملكة العربية السعودية</div>
        <div>وزارة التعليم</div>
        <div>الإدارة / ........................................</div>
        <div>المدرسة / ........................................</div>
      </div>
      <div class="center">
        <span class="secret">سري</span>
        <div class="title">إحالة طالب/ـة للمرشد الطلابي</div>
      </div>
      <div class="left" style="text-align:left; direction:ltr;">
        <div>Date: <span>${today}</span></div>
        <div>Ref: ........................</div>
      </div>
    </header>

    <section class="text-block">
      <p>المكرم/ة <span class="highlight">المرشد/ة الطلابي/ة</span></p>
      <p>السلام عليكم ورحمة الله وبركاته،</p>
      <p>
        نحيل إليكم الطالب/ـة <span class="highlight">${studentName}</span> من الصف
        <span class="highlight">${studentClass}</span>، ذي المشكلة السلوكية من الدرجة
        <span class="highlight">${degreeLabel}</span>، وهي <span class="highlight">${violationType}</span>،
        والمسجلة بتاريخ <span class="highlight">${incidentDate}</span>.
      </p>
      <p>
        نرجو منكم متابعة حالة الطالب/ـة، ودراسة وضعه/ـا، وتحديد خطة التدخل المناسبة، وإشعارنا بالنتائج أولاً بأول.
      </p>
    </section>

    <section class="info-grid">
      <div class="info-item">
        <span class="info-label">رقم المخالفة:</span>
        <span class="info-value">${violation.id.split('-')[0]}</span>
      </div>
      <div class="info-item">
        <span class="info-label">درجة المخالفة:</span>
        <span class="info-value">${degreeLabel}</span>
      </div>
      <div class="info-item">
        <span class="info-label">نوع السلوك:</span>
        <span class="info-value">${violationType}</span>
      </div>
      <div class="info-item">
        <span class="info-label">المعلم المبلّغ:</span>
        <span class="info-value">${reporter}</span>
      </div>
    </section>

    <section class="text-block" style="margin-bottom: 12px;">
      <p>تفاصيل إضافية:</p>
      <p class="highlight" style="display: block; min-height: 60px; padding: 12px; border-radius: 12px; background: #f1f5f9; border: 1px dashed #cbd5e1;">
        ${violation.description || '..............................................................'}
      </p>
    </section>

    <section class="text-block" style="font-size: 14px; color: #475569;">
      <p>الإجراء المطلوب تنفيذه:</p>
      <p style="border-right: 3px solid #2563eb; padding: 8px 12px; border-radius: 12px; background: #eff6ff; margin-top: 8px;">
        ${task.title}
      </p>
    </section>

    <div class="signature">
      <div class="block">
        <h3>المرشد/ة الطلابي/ة</h3>
        <p>الاسم: ..............................................</p>
        <p>التوقيع: ............................................</p>
        <p>التاريخ: ............................................</p>
      </div>
      <div class="block">
        <h3>وكيل/ـة شؤون الطلاب</h3>
        <p>الاسم: ${reporter !== '........................' ? reporter : '..............................................'}</p>
        <p>التوقيع: ............................................</p>
        <p>الختم: ..............................................</p>
      </div>
    </div>

    <footer class="footer">تم توليد هذا النموذج إلكترونياً عبر نظام المتابعة المدرسية</footer>
  </div>

  <div class="actions-bar">
    <button onclick="window.print()">🖨️ طباعة النموذج</button>
    <button onclick="downloadReferralPDF()">📄 تنزيل PDF</button>
    <button class="secondary" onclick="window.close()">إغلاق</button>
  </div>

  <script>
    async function downloadReferralPDF() {
      const button = document.activeElement
      if (button) {
        button.disabled = true
        button.textContent = 'جاري التحويل...'
      }
      try {
        const { jsPDF } = window.jspdf
        const element = document.getElementById('referral-sheet')
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123,
        })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const width = pdf.internal.pageSize.getWidth()
        const height = pdf.internal.pageSize.getHeight()
        pdf.addImage(imgData, 'PNG', 0, 0, width, height)
        pdf.save('نموذج_تحويل_${studentName.replace(/\s+/g, '_')}.pdf')
      } catch (error) {
        alert('حدث خطأ أثناء تجهيز ملف PDF')
        console.error(error)
      } finally {
        if (button) {
          button.disabled = false
          button.textContent = '📄 تنزيل PDF'
        }
      }
    }
  </script>
</body>
</html>`

  referralWindow.document.write(html)
  referralWindow.document.close()
}
