import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { DutyScheduleAssignment } from '@/modules/admin/api'

interface PrintDutySignatureSheetParams {
  assignments: DutyScheduleAssignment[]
  dutyType: 'morning' | 'afternoon' | 'all'
  semesterName: string
}

const DUTY_TYPE_LABELS: Record<string, string> = {
  morning: 'بداية الدوام',
  afternoon: 'نهاية الدوام',
  all: 'بداية ونهاية الدوام',
}

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr)
  return WEEKDAY_NAMES[date.getDay()] ?? ''
}

export async function printDutySignatureSheet({
  assignments,
  dutyType,
  semesterName,
}: PrintDutySignatureSheetParams) {
  // فلترة التكليفات حسب النوع
  let filteredAssignments = assignments
  if (dutyType !== 'all') {
    filteredAssignments = assignments.filter((a) => a.duty_type === dutyType)
  }

  // ترتيب حسب التاريخ
  filteredAssignments = [...filteredAssignments].sort((a, b) => a.duty_date.localeCompare(b.duty_date))

  // حساب عدد تكرار كل معلم
  const teacherCounts = new Map<number, number>()
  for (const a of filteredAssignments) {
    teacherCounts.set(a.user_id, (teacherCounts.get(a.user_id) ?? 0) + 1)
  }

  const title = `كشف توقيع مناوبة ${DUTY_TYPE_LABELS[dutyType]}`

  // حساب عدد الصفوف لكل صفحة (تقريباً 28 صف لكل صفحة A4 مع الهوامش)
  const rowsPerPage = 28

  // تقسيم البيانات إلى صفحات
  const pages: DutyScheduleAssignment[][] = []
  for (let i = 0; i < filteredAssignments.length; i += rowsPerPage) {
    pages.push(filteredAssignments.slice(i, i + rowsPerPage))
  }

  // إذا لا يوجد بيانات، أضف صفحة فارغة
  if (pages.length === 0) {
    pages.push([])
  }

  const totalPages = pages.length

  // إنشاء PDF
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm

  // معالجة كل صفحة بشكل منفصل
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageAssignments = pages[pageIndex]
    const startIndex = pageIndex * rowsPerPage

    // إنشاء iframe مخفي لهذه الصفحة
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; height: 1123px; border: none;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      continue
    }

    // بناء صفوف الجدول
    const tableRows = pageAssignments
      .map((assignment, i) => {
        const index = startIndex + i + 1
        const dayName = getDayName(assignment.duty_date)

        // إضافة عدد التكرارات بجانب الاسم فقط إذا تكرر أكثر من مرة
        const totalCount = teacherCounts.get(assignment.user_id) ?? 1
        const nameWithCount = totalCount > 1
          ? `${assignment.user_name ?? 'غير محدد'} (${totalCount})`
          : (assignment.user_name ?? 'غير محدد')

        return `
          <tr>
            <td style="padding: 8px 6px; border: 1px solid #333; text-align: center; font-size: 12px; width: 30px;">${index}</td>
            <td style="padding: 8px 6px; border: 1px solid #333; text-align: right; font-size: 12px;">${nameWithCount}</td>
            <td style="padding: 8px 6px; border: 1px solid #333; text-align: center; font-size: 12px; width: 70px;">${dayName}</td>
            <td style="padding: 8px 6px; border: 1px solid #333; text-align: center; font-size: 12px; width: 90px; direction: ltr;">${assignment.duty_date}</td>
            <td style="padding: 8px 6px; border: 1px solid #333; text-align: center; font-size: 12px; width: 100px;"></td>
          </tr>
        `
      })
      .join('')

    // بناء HTML لهذه الصفحة فقط
    const pageHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          }
          body {
            background: #fff;
            direction: rtl;
            text-align: right;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div id="page-content" style="width: 210mm; height: 297mm; padding: 12mm 12mm 15mm 12mm; box-sizing: border-box; background: #fff;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #333;">
            <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 6px 0; color: #000;">${title}</h1>
            <p style="font-size: 13px; color: #333; margin: 0;">الفصل الدراسي: ${semesterName}</p>
            ${totalPages > 1 ? `<p style="font-size: 11px; color: #666; margin: 4px 0 0 0;">صفحة ${pageIndex + 1} من ${totalPages}</p>` : ''}
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e5e5e5;">
                <th style="padding: 10px 6px; border: 1px solid #333; text-align: center; font-size: 13px; font-weight: 700; width: 30px;">م</th>
                <th style="padding: 10px 6px; border: 1px solid #333; text-align: right; font-size: 13px; font-weight: 700;">اسم المعلم</th>
                <th style="padding: 10px 6px; border: 1px solid #333; text-align: center; font-size: 13px; font-weight: 700; width: 70px;">اليوم</th>
                <th style="padding: 10px 6px; border: 1px solid #333; text-align: center; font-size: 13px; font-weight: 700; width: 90px;">التاريخ</th>
                <th style="padding: 10px 6px; border: 1px solid #333; text-align: center; font-size: 13px; font-weight: 700; width: 100px;">التوقيع</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #666; border: 1px solid #333;">لا توجد مناوبات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(pageHtml)
    iframeDoc.close()

    // انتظار تحميل المحتوى
    await new Promise((resolve) => setTimeout(resolve, 300))

    try {
      const element = iframeDoc.getElementById('page-content')
      if (!element) {
        document.body.removeChild(iframe)
        continue
      }

      // تحويل هذه الصفحة فقط إلى صورة
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794, // 210mm at 96dpi
        height: 1123, // 297mm at 96dpi
      })

      // إضافة صفحة جديدة في PDF (إلا إذا كانت الأولى)
      if (pageIndex > 0) {
        pdf.addPage()
      }

      // إضافة الصورة للصفحة الحالية
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    } catch (error) {
      console.error(`خطأ في معالجة الصفحة ${pageIndex + 1}:`, error)
    } finally {
      // حذف iframe
      document.body.removeChild(iframe)
    }
  }

  // حفظ الملف
  const fileName = `كشف_توقيع_مناوبة_${DUTY_TYPE_LABELS[dutyType].replace(/ /g, '_')}.pdf`
  pdf.save(fileName)
}
