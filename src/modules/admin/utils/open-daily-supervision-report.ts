import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { TodaySupervisionItem, DutyScheduleTodayItem } from '@/modules/admin/api'

const WEEKDAY_LABELS: Record<number, string> = {
    0: 'الأحد',
    1: 'الإثنين',
    2: 'الثلاثاء',
    3: 'الأربعاء',
    4: 'الخميس',
    5: 'الجمعة',
    6: 'السبت',
}

interface DailyReportData {
    date: string
    supervisions: TodaySupervisionItem[]
    dutySchedules: DutyScheduleTodayItem[]
}

export async function openDailySupervisionReport({ date, supervisions, dutySchedules }: DailyReportData) {
    const dateObj = new Date(date)
    const dayName = WEEKDAY_LABELS[dateObj.getDay()] ?? ''
    const formattedDate = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(dateObj)

    // تقسيم المناوبات حسب النوع
    const morningDuties = dutySchedules.filter(d => d.duty_type === 'morning')
    const afternoonDuties = dutySchedules.filter(d => d.duty_type === 'afternoon')

    // بناء HTML للتقرير
    const sections: string[] = []

    // قسم مناوبة بداية الدوام
    if (morningDuties.length > 0) {
        const time = morningDuties[0]?.start_time ?? ''
        const rows = morningDuties.map((d, i) => `
      <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${d.user_name ?? 'غير محدد'}</td>
      </tr>
    `).join('')
        sections.push(`
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 14px; background: #f1f5f9; padding: 8px 12px; border-right: 4px solid #3b82f6; margin: 0 0 4px 0; text-align: right; display: flex; justify-content: space-between;">
          <span>مناوبة بداية الدوام</span>
          <span style="color: #64748b; font-weight: normal; direction: ltr;">${time}</span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead><tr><th style="background: #1e293b; color: #fff; padding: 6px 10px; text-align: right; font-size: 12px;">اسم المعلم</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `)
    }

    // قسم الإشرافات
    for (const supervision of supervisions) {
        const time = `${supervision.window_start || ''} - ${supervision.window_end || ''}`
        const rows = supervision.teachers.length > 0
            ? supervision.teachers.map((t, i) => `
        <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${t.name}</td>
        </tr>
      `).join('')
            : '<tr><td style="text-align: center; padding: 12px; color: #64748b;">لا يوجد معلمون</td></tr>'

        sections.push(`
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 14px; background: #f1f5f9; padding: 8px 12px; border-right: 4px solid #3b82f6; margin: 0 0 4px 0; text-align: right; display: flex; justify-content: space-between;">
          <span>${supervision.name}</span>
          <span style="color: #64748b; font-weight: normal; direction: ltr;">${time}</span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead><tr><th style="background: #1e293b; color: #fff; padding: 6px 10px; text-align: right; font-size: 12px;">اسم المعلم</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `)
    }

    // قسم مناوبة نهاية الدوام
    if (afternoonDuties.length > 0) {
        const time = afternoonDuties[0]?.end_time ?? ''
        const rows = afternoonDuties.map((d, i) => `
      <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${d.user_name ?? 'غير محدد'}</td>
      </tr>
    `).join('')
        sections.push(`
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 14px; background: #f1f5f9; padding: 8px 12px; border-right: 4px solid #3b82f6; margin: 0 0 4px 0; text-align: right; display: flex; justify-content: space-between;">
          <span>مناوبة نهاية الدوام</span>
          <span style="color: #64748b; font-weight: normal; direction: ltr;">${time}</span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead><tr><th style="background: #1e293b; color: #fff; padding: 6px 10px; text-align: right; font-size: 12px;">اسم المعلم</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `)
    }

    // إذا لا يوجد أي محتوى
    if (sections.length === 0) {
        sections.push(`
      <div style="text-align: center; padding: 40px;">
        <p style="color: #64748b; font-size: 16px;">لا توجد إشرافات أو مناوبات لهذا التاريخ</p>
      </div>
    `)
    }

    // إنشاء iframe مخفي للحفاظ على عرض النص الصحيح
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; height: 1123px; border: none;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
        alert('حدث خطأ أثناء تجهيز التقرير')
        document.body.removeChild(iframe)
        return
    }

    iframeDoc.open()
    iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
          font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
        }
        body { 
          background: #fff; 
          direction: rtl; 
          text-align: right;
          -webkit-font-smoothing: antialiased;
        }
      </style>
    </head>
    <body>
      <div id="report-content" style="padding: 40px; width: 794px; background: #fff;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
          <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #1e293b;">تقرير الإشراف والمناوبة</h1>
          <p style="font-size: 14px; color: #64748b; margin: 0;">${dayName} - ${formattedDate}</p>
        </div>
        ${sections.join('')}
        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          تم توليد هذا التقرير إلكترونياً عبر نظام الرائد للإدارة المدرسية
        </div>
      </div>
    </body>
    </html>
  `)
    iframeDoc.close()

    // انتظار تحميل الخط
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
        const element = iframeDoc.getElementById('report-content')
        if (!element) throw new Error('Element not found')

        // تحويل HTML إلى صورة
        const canvas = await html2canvas(element, {
            scale: 1.5,  // تقليل الحجم
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            foreignObjectRendering: true,
        })

        // إنشاء PDF
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        const imgWidth = pdfWidth
        const imgHeight = (canvas.height * pdfWidth) / canvas.width

        // استخدام JPEG مع ضغط 80% بدلاً من PNG
        const imgData = canvas.toDataURL('image/jpeg', 0.8)

        // إذا كانت الصورة أطول من الصفحة
        if (imgHeight <= pdfHeight) {
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
        } else {
            // تقسيم على صفحات متعددة
            let heightLeft = imgHeight
            let position = 0
            let page = 1

            while (heightLeft > 0) {
                if (page > 1) pdf.addPage()
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
                heightLeft -= pdfHeight
                position -= pdfHeight
                page++
            }
        }


        // تنزيل الملف مباشرة
        pdf.save(`تقرير_الإشراف_${date}.pdf`)
    } catch (error) {
        console.error('خطأ في توليد PDF:', error)
        alert('حدث خطأ أثناء تجهيز التقرير. يرجى المحاولة مرة أخرى.')
    } finally {
        // حذف iframe
        document.body.removeChild(iframe)
    }
}
