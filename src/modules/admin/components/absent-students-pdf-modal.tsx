import { useState } from 'react'
import { apiClient } from '@/services/api/client'
import { getTodayRiyadh } from '@/lib/date-utils'

// تهريب قيم HTML لمنع حقن سكربتات في نافذة الطباعة (XSS) — C14
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface AbsentStudent {
  student_id: number
  student_name: string
  grade: string
  class_name: string
}

interface AbsentStudentsData {
  school_name: string
  date: string
  day_name: string
  total_absent: number
  students: AbsentStudent[]
}

interface AbsentStudentsPDFModalProps {
  open: boolean
  onClose: () => void
}

export function AbsentStudentsPDFModal({ open, onClose }: AbsentStudentsPDFModalProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayRiyadh)
  const [isLoading, setIsLoading] = useState(false)

  const generatePDF = async () => {
    try {
      setIsLoading(true)

      console.log('📅 Selected date:', selectedDate)

      // جلب البيانات عبر apiClient المركزي (baseURL موحّد + توكن + معالجة أخطاء 401/402) — B04
      const { data: result } = await apiClient.get('/admin/attendance-reports/absent-list', {
        params: { date: selectedDate },
      })

      if (!result?.success) {
        throw new Error(result?.message || 'خطأ في جلب البيانات من الخادم')
      }

      const data: AbsentStudentsData = result.data

      if (!data || !data.students) {
        throw new Error('البيانات المستلمة غير صحيحة')
      }

      console.log('✅ Data received:', data)

      // Create printable HTML window
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.')
      }

      const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كشف الطلاب الغائبين - ${escapeHtml(data.date)}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      text-align: right;
      padding: 10px;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    
    .header h1 {
      font-size: 20px;
      color: #1e293b;
      margin-bottom: 3px;
    }
    
    .header h2 {
      font-size: 16px;
      color: #475569;
      margin-bottom: 5px;
    }
    
    .info {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0;
    }
    
    .total {
      font-size: 14px;
      font-weight: bold;
      color: #dc2626;
      margin-top: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 11px;
    }
    
    thead {
      background: #2563eb;
      color: white;
    }
    
    th {
      padding: 6px 4px;
      text-align: center;
      font-weight: 600;
      border: 1px solid #1e40af;
    }
    
    td {
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
    }
    
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tbody tr:hover {
      background: #e0f2fe;
    }
    
    .col-num {
      width: 50px;
      text-align: center;
    }
    
    .col-name {
      text-align: right;
      padding-right: 10px;
    }
    
    .col-class {
      width: 150px;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.school_name)}</h1>
    <h2>كشف الطلاب الغائبين</h2>
    <div class="info">التاريخ: ${escapeHtml(data.date)} - ${escapeHtml(data.day_name)}</div>
    <div class="total">إجمالي الغائبين: ${Number(data.total_absent) || 0} طالب</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-name">اسم الطالب</th>
        <th class="col-class">الصف</th>
      </tr>
    </thead>
    <tbody>
      ${data.students.map((student: AbsentStudent, index: number) => `
        <tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-name">${escapeHtml(student.student_name)}</td>
          <td class="col-class">${escapeHtml(student.grade)} ${escapeHtml(student.class_name)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <script>
    // Auto print on load
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
      `

      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      onClose()
    } catch (error) {
      console.error('Error generating PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      alert(`حدث خطأ أثناء إنشاء ملف PDF:\n${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">كشف الطلاب الغائبين</h2>
          <p className="mt-1 text-sm text-slate-600">اختر التاريخ لتصدير قائمة الغائبين</p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-right text-sm font-semibold text-slate-700">
            التاريخ
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            dir="ltr"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="button-secondary flex-1"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={generatePDF}
            className="button-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري الإنشاء...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة الكشف
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
