import { useCallback } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TeacherProfileSummary } from '../types'

interface PdfExportButtonProps {
  summary: TeacherProfileSummary
  printRef: React.RefObject<HTMLDivElement | null>
}

export function PdfExportButton({ summary, printRef }: PdfExportButtonProps) {
  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const teacher = summary.teacher
    const att = summary.attendance
    const actions = summary.delay_actions
    const sched = summary.schedule
    const msgs = summary.messages
    const prep = summary.preparation

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>ملف المعلم - ${teacher.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1e293b; direction: rtl; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
          .header h1 { font-size: 22px; color: #1e40af; margin-bottom: 8px; }
          .header p { font-size: 14px; color: #64748b; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 16px; color: #1e40af; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .info-item { display: flex; gap: 8px; font-size: 13px; }
          .info-label { color: #64748b; min-width: 120px; }
          .info-value { font-weight: 600; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
          .stat-box { text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
          .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          .signature-area { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
          .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #cbd5e1; }
          .signature-box p { font-size: 12px; color: #64748b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ملف المعلم</h1>
          <p>الفترة: ${summary.period.from} إلى ${summary.period.to}</p>
        </div>

        <div class="section">
          <h2>البيانات الأساسية</h2>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">الاسم:</span><span class="info-value">${teacher.name}</span></div>
            <div class="info-item"><span class="info-label">رقم الهوية:</span><span class="info-value">${teacher.national_id}</span></div>
            <div class="info-item"><span class="info-label">الجوال:</span><span class="info-value">${teacher.phone ?? '-'}</span></div>
            <div class="info-item"><span class="info-label">الحالة:</span><span class="info-value">${teacher.status === 'active' ? 'نشط' : 'غير نشط'}</span></div>
          </div>
        </div>

        <div class="section">
          <h2>إحصائيات الانضباط</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${att.attendance_rate ?? 0}%</div><div class="stat-label">نسبة الانضباط</div></div>
            <div class="stat-box"><div class="stat-value">${att.on_time_rate ?? 0}%</div><div class="stat-label">الالتزام بالمواعيد</div></div>
            <div class="stat-box"><div class="stat-value">${att.present_days}</div><div class="stat-label">أيام الحضور</div></div>
            <div class="stat-box"><div class="stat-value">${att.absent_days}</div><div class="stat-label">أيام الغياب</div></div>
            <div class="stat-box"><div class="stat-value">${att.delayed_days}</div><div class="stat-label">أيام التأخر</div></div>
            <div class="stat-box"><div class="stat-value">${att.total_delay_hours}</div><div class="stat-label">ساعات التأخر</div></div>
          </div>
        </div>

        <div class="section">
          <h2>الإجراءات الإدارية</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${actions.warnings_count}</div><div class="stat-label">تنبيهات</div></div>
            <div class="stat-box"><div class="stat-value">${actions.deductions_count}</div><div class="stat-label">حسميات</div></div>
          </div>
        </div>

        <div class="section">
          <h2>التدريس</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${sched.total_sessions}</div><div class="stat-label">حصة أسبوعياً</div></div>
            <div class="stat-box"><div class="stat-value">${sched.subjects_count}</div><div class="stat-label">مادة</div></div>
            <div class="stat-box"><div class="stat-value">${sched.classes_count}</div><div class="stat-label">فصل</div></div>
          </div>
        </div>

        <div class="section">
          <h2>التواصل مع أولياء الأمور</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${msgs.total_sent}</div><div class="stat-label">رسائل مرسلة</div></div>
            <div class="stat-box"><div class="stat-value">${msgs.replies_count}</div><div class="stat-label">ردود أولياء الأمور</div></div>
          </div>
        </div>

        <div class="section">
          <h2>تحضير مدرستي</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${prep.is_linked ? prep.rate + '%' : 'غير مرتبط'}</div><div class="stat-label">نسبة التحضير</div></div>
            <div class="stat-box"><div class="stat-value">${prep.prepared}</div><div class="stat-label">حصص محضّرة</div></div>
            <div class="stat-box"><div class="stat-value">${prep.unprepared}</div><div class="stat-label">غير محضّرة</div></div>
          </div>
        </div>

        ${summary.rewards && summary.rewards.rewards_count > 0 ? `
        <div class="section">
          <h2>المكافآت</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${summary.rewards.total_rewards}</div><div class="stat-label">إجمالي النقاط</div></div>
            <div class="stat-box"><div class="stat-value">${summary.rewards.rewards_count}</div><div class="stat-label">عدد المكافآت</div></div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h2>الإحالات</h2>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-value">${summary.referrals_count}</div><div class="stat-label">إجمالي الإحالات</div></div>
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-box"><p>المعلم</p></div>
          <div class="signature-box"><p>وكيل المدرسة</p></div>
          <div class="signature-box"><p>مدير المدرسة</p></div>
        </div>

        <div class="footer">
          تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-SA')} - نظام الحضور والغياب
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }, [summary, printRef])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="gap-2"
    >
      <Printer className="h-4 w-4" />
      تصدير ملف المعلم PDF
    </Button>
  )
}
