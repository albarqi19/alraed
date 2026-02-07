import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    FileText,
    Image,
    Info,
    Loader2,
    Send,
    UserCheck,
    Users,
    X
} from 'lucide-react'

// =====================================================
// Types
// =====================================================

type StandbyTeacher = {
    id: number
    name: string
    phone?: string | null
}

type PeriodInfo = {
    period_number: number
    class: string
    subject: string
    session_id: number
    standby1?: StandbyTeacher | null
    standby2?: StandbyTeacher | null
    standby3?: StandbyTeacher | null
    standby4?: StandbyTeacher | null
    standby5?: StandbyTeacher | null
    standby6?: StandbyTeacher | null
    standby7?: StandbyTeacher | null
    selectedStandby?: StandbyTeacher | null
    availableTeachers?: StandbyTeacher[]
}

type AbsentTeacher = {
    teacher_id: number
    teacher_name: string
    absence_reason: string
    periods: PeriodInfo[]
    selected: boolean
}

type DailyAbsencesResponse = {
    success: boolean
    data: {
        date: string
        day: string
        has_published?: boolean
        schedule_id?: number
        schedule_status?: string
        absent_teachers: AbsentTeacher[]
        message?: string
    }
}

type DistributePayload = {
    date: string
    distributions: Array<{
        absent_teacher_id: number
        period_number: number
        standby_teacher_id: number
        class_session_id: number | null
        class_name: string
    }>
}

type AllStaffResponse = {
    success: boolean
    data: Array<{
        id: number
        name: string
        phone: string | null
        role: string
        secondary_role: string | null
    }>
}

// =====================================================
// API Functions
// =====================================================

async function fetchDailyAbsences(date: string, ignorePublished: boolean = false): Promise<DailyAbsencesResponse> {
    const { data } = await apiClient.get(`/admin/teacher-standby/daily-absences?date=${date}&ignore_published=${ignorePublished ? '1' : '0'}`)
    return data
}

async function distributeStandby(payload: DistributePayload): Promise<{ success: boolean; data: { schedule_id: number; assignments_count: number } }> {
    const { data } = await apiClient.post('/admin/teacher-standby/distribute', payload)
    return data
}

async function approveAndNotify(scheduleId: number): Promise<{ success: boolean; data: { schedule_id: number; status: string; messages_queued: number; estimated_time_minutes: number } }> {
    const { data } = await apiClient.post('/admin/teacher-standby/approve-notify', { schedule_id: scheduleId })
    return data
}

async function fetchAllStaff(): Promise<AllStaffResponse> {
    const { data } = await apiClient.get('/admin/teacher-standby/all-staff')
    return data
}

// =====================================================
// Component
// =====================================================

type StandbyDistributionModalProps = {
    isOpen: boolean
    onClose: () => void
    date: string
}

const PERIOD_NAMES: Record<number, string> = {
    1: 'الأولى',
    2: 'الثانية',
    3: 'الثالثة',
    4: 'الرابعة',
    5: 'الخامسة',
    6: 'السادسة',
    7: 'السابعة',
}

export function StandbyDistributionModal({ isOpen, onClose, date }: StandbyDistributionModalProps) {
    const toast = useToast()
    const queryClient = useQueryClient()

    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [absentTeachers, setAbsentTeachers] = useState<AbsentTeacher[]>([])
    const [scheduleId, setScheduleId] = useState<number | null>(null)
    const [editingPeriod, setEditingPeriod] = useState<{ teacherId: number; periodNumber: number } | null>(null)
    const [hasPublished, setHasPublished] = useState(false)
    const [isViewingPublished, setIsViewingPublished] = useState(false)
    const [ignorePublished, setIgnorePublished] = useState(false)

    // Queries
    const absencesQuery = useQuery({
        queryKey: ['standby-daily-absences', date, ignorePublished],
        queryFn: () => fetchDailyAbsences(date, ignorePublished),
        enabled: isOpen,
    })

    const staffQuery = useQuery({
        queryKey: ['standby-all-staff'],
        queryFn: fetchAllStaff,
        enabled: isOpen && step >= 2,
    })

    // Mutations
    const distributeMutation = useMutation({
        mutationFn: distributeStandby,
        onSuccess: (result) => {
            setScheduleId(result.data.schedule_id)
            setStep(3)
            toast({ type: 'success', title: `تم حفظ ${result.data.assignments_count} تعيين` })
        },
        onError: () => {
            toast({ type: 'error', title: 'فشل في حفظ التوزيع' })
        },
    })

    const approveMutation = useMutation({
        mutationFn: (id: number) => approveAndNotify(id),
        onSuccess: (result) => {
            const queued = result.data.messages_queued || 0
            const estimatedTime = result.data.estimated_time_minutes || 0

            toast({
                type: 'success',
                title: `تم الاعتماد والجدولة`,
                description: `تم جدولة ${queued} رسالة للإرسال (الوقت المتوقع: ${estimatedTime} دقيقة)`
            })
            queryClient.invalidateQueries({ queryKey: ['standby-daily-absences'] })
            onClose()
        },
        onError: () => {
            toast({ type: 'error', title: 'فشل في الاعتماد' })
        },
    })

    // Initialize absent teachers when data loads
    useEffect(() => {
        if (absencesQuery.data?.data) {
            const data = absencesQuery.data.data

            // تحديث flags الحالة
            setHasPublished(data.has_published || false)
            setIsViewingPublished(data.has_published || false)

            // إذا كان هناك schedule_id من البيانات، احفظه
            if (data.schedule_id) {
                setScheduleId(data.schedule_id)
            }

            // معالجة المعلمين الغائبين
            if (data.absent_teachers) {
                const teachers = data.absent_teachers.map(t => ({
                    ...t,
                    periods: t.periods.map(p => ({
                        ...p,
                        selectedStandby: p.selectedStandby || p.standby1 || p.standby2 || p.standby3 || p.standby4 || p.standby5 || p.standby6 || p.standby7 || null,
                    })),
                }))
                setAbsentTeachers(teachers)
            }
        }
    }, [absencesQuery.data])

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setEditingPeriod(null)
            setIgnorePublished(false)
            // لا نعيد تعيين scheduleId هنا لأنه سيتم تحديثه من البيانات
        }
    }, [isOpen])

    // Computed values
    const selectedTeachers = useMemo(() =>
        absentTeachers.filter(t => t.selected),
        [absentTeachers]
    )

    const allDistributions = useMemo(() => {
        const distributions: DistributePayload['distributions'] = []
        for (const teacher of selectedTeachers) {
            for (const period of teacher.periods) {
                if (period.selectedStandby) {
                    distributions.push({
                        absent_teacher_id: teacher.teacher_id,
                        period_number: period.period_number,
                        standby_teacher_id: period.selectedStandby.id,
                        class_session_id: period.session_id,
                        class_name: period.class,
                    })
                }
            }
        }
        return distributions
    }, [selectedTeachers])

    // Handlers
    const toggleTeacherSelection = (teacherId: number) => {
        setAbsentTeachers(prev => prev.map(t =>
            t.teacher_id === teacherId ? { ...t, selected: !t.selected } : t
        ))
    }

    const updatePeriodStandby = (teacherId: number, periodNumber: number, standby: StandbyTeacher | null) => {
        setAbsentTeachers(prev => prev.map(t => {
            if (t.teacher_id !== teacherId) return t
            return {
                ...t,
                periods: t.periods.map(p =>
                    p.period_number === periodNumber ? { ...p, selectedStandby: standby } : p
                ),
            }
        }))
        setEditingPeriod(null)
    }

    const handleProceedToStep2 = () => {
        if (selectedTeachers.length === 0) {
            toast({ type: 'error', title: 'اختر معلماً غائباً واحداً على الأقل' })
            return
        }
        setStep(2)
    }

    const handleDistribute = () => {
        if (allDistributions.length === 0) {
            toast({ type: 'error', title: 'لا توجد تعيينات للحفظ' })
            return
        }
        distributeMutation.mutate({ date, distributions: allDistributions })
    }

    const handleApprove = () => {
        if (!scheduleId) return
        approveMutation.mutate(scheduleId)
    }

    // بناء HTML للتصدير - تصميم سادة مثل النموذج الرسمي
    const buildExportHTML = () => {
        const dayName = absencesQuery.data?.data?.day || ''

        // دالة لاختصار الاسم (الأول والثاني والأخير فقط) مع تجاهل "بن"
        const shortenName = (fullName: string) => {
            const parts = fullName.trim().split(/\s+/).filter(p => p !== 'بن')
            if (parts.length <= 3) return parts.join(' ')
            return `${parts[0]} ${parts[1]} ${parts[parts.length - 1]}`
        }

        // دالة لإزالة كلمة "الصف" من اسم الصف
        const cleanClassName = (className: string) => {
            return className.replace(/^الصف\s*/i, '')
        }

        // بناء جداول منفصلة لكل معلم غائب
        let teacherSections = ''
        for (const teacher of selectedTeachers) {
            let tableRows = ''
            for (const period of teacher.periods) {
                const standbyName = period.selectedStandby?.name ? shortenName(period.selectedStandby.name) : '-'
                const cleanClass = cleanClassName(period.class)
                tableRows += `<tr>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center;">${PERIOD_NAMES[period.period_number] || period.period_number}</td>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center;">${cleanClass}</td>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center; font-weight: bold;">${standbyName}</td>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center;"></td>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center;"></td>
                    <td style="padding: 6px 5px 8px 5px; border: 1px solid #000; text-align: center;"></td>
                </tr>`
            }

            const shortTeacherName = shortenName(teacher.teacher_name)

            teacherSections += `
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <p style="margin-bottom: 6px; font-size: 13px;">
                    <strong>زملائي المعلمين</strong> / نظراً لغياب الزميل: <strong>${shortTeacherName}</strong> لهذا اليوم <strong>${dayName}</strong>
                </p>
                <p style="margin-bottom: 8px; font-size: 12px;">
                    الموافق ${date} آمل تسديد مكانه حسب الجدول الموضح والتوقيع بالعلم ،، ولكم جزيل الشكر
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f0f0f0;">
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 10%;">الحصة</th>
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 15%;">الصف</th>
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 20%;">معلم الانتظار</th>
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 25%;">ما تم تنفيذه في الحصة</th>
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 12%;">التوقيع</th>
                            <th style="padding: 6px 5px 8px 5px; border: 1px solid #000; font-weight: bold; width: 18%;">ملحوظات</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            `
        }

        return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; }
  body { background: #fff; direction: rtl; text-align: right; color: #000; font-size: 14px; }
  @media print { .page-break { page-break-before: always; } }
</style>
</head>
<body>
<div id="content" style="padding: 15mm; width: 210mm;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">سجل توزيع حصص الانتظار</h1>
    <p style="font-size: 13px;">تاريخ الطباعة: ${date} &nbsp;&nbsp;&nbsp; اليوم: ${dayName}</p>
  </div>

  ${teacherSections}

  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div style="text-align: center;">
      <p style="font-weight: bold; margin-bottom: 30px;">المدير</p>
      <p>التوقيع: ........................</p>
    </div>
  </div>

</div>
</body>
</html>`
    }

    // تحميل كـ PDF
    const handleDownloadPDF = async () => {
        const { default: jsPDF } = await import('jspdf')
        const { default: html2canvas } = await import('html2canvas')

        // إنشاء iframe مخفي - ارتفاع تلقائي للمحتوى
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; border: none;'
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) {
            document.body.removeChild(iframe)
            return
        }

        iframeDoc.open()
        iframeDoc.write(buildExportHTML())
        iframeDoc.close()

        await new Promise(r => setTimeout(r, 500))

        try {
            const element = iframeDoc.getElementById('content')
            if (!element) throw new Error('Element not found')

            // حساب الارتفاع الفعلي للمحتوى
            const contentHeight = element.scrollHeight
            iframe.style.height = `${contentHeight + 100}px`
            await new Promise(r => setTimeout(r, 200))

            const canvas = await html2canvas(element, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#ffffff', logging: false,
                height: contentHeight,
                windowHeight: contentHeight,
            })

            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfPageHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = pdfWidth
            const imgHeight = (canvas.height * pdfWidth) / canvas.width

            let heightLeft = imgHeight
            let position = 0

            // إضافة الصفحة الأولى
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, position, imgWidth, imgHeight)
            heightLeft -= pdfPageHeight

            // إضافة صفحات إضافية إذا لزم الأمر
            while (heightLeft > 0) {
                position = -pdfPageHeight + (imgHeight - heightLeft - pdfPageHeight)
                pdf.addPage()
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, position, imgWidth, imgHeight)
                heightLeft -= pdfPageHeight
            }

            pdf.save(`توزيع_الانتظار_${date}.pdf`)
        } catch (error) {
            console.error('خطأ في توليد PDF:', error)
            toast({ type: 'error', title: 'فشل في توليد المستند' })
        } finally {
            document.body.removeChild(iframe)
        }
    }

    // تحميل كـ صورة
    const handleDownloadImage = async () => {
        const { default: html2canvas } = await import('html2canvas')

        // إنشاء iframe مخفي
        const iframe = document.createElement('iframe')
        iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px; height: 1123px; border: none;'
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) {
            document.body.removeChild(iframe)
            return
        }

        iframeDoc.open()
        iframeDoc.write(buildExportHTML())
        iframeDoc.close()

        await new Promise(r => setTimeout(r, 400))

        try {
            const element = iframeDoc.getElementById('content')
            if (!element) throw new Error('Element not found')

            const canvas = await html2canvas(element, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#ffffff', logging: false, foreignObjectRendering: true,
            })

            // تحميل الصورة
            const link = document.createElement('a')
            link.download = `توزيع_الانتظار_${date}.png`
            link.href = canvas.toDataURL('image/png', 1.0)
            link.click()
        } catch (error) {
            console.error('خطأ في توليد الصورة:', error)
            toast({ type: 'error', title: 'فشل في توليد الصورة' })
        } finally {
            document.body.removeChild(iframe)
        }
    }

    if (!isOpen) return null

    const dayName = absencesQuery.data?.data?.day || ''

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-slate-900">توزيع الانتظار</h2>
                        <p className="text-sm text-muted">{dayName} - {date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Step indicators */}
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${step === s
                                        ? 'bg-indigo-600 text-white'
                                        : step > s
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-200 text-slate-500'
                                        }`}
                                >
                                    {step > s ? <Check className="h-4 w-4" /> : s}
                                </div>
                            ))}
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-6">
                    {absencesQuery.isLoading ? (
                        <div className="flex min-h-[200px] items-center justify-center gap-3 text-muted">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            جاري تحميل البيانات...
                        </div>
                    ) : absencesQuery.isError ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-rose-600">
                            <AlertCircle className="h-8 w-8" />
                            حدث خطأ في تحميل البيانات
                        </div>
                    ) : absentTeachers.length === 0 ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
                            <UserCheck className="h-12 w-12 text-emerald-500" />
                            <p className="text-lg font-semibold text-slate-700">لا يوجد معلمين غائبين اليوم</p>
                            <p className="text-sm">جميع المعلمين حاضرون</p>
                        </div>
                    ) : step === 1 ? (
                        /* Step 1: Select absent teachers */
                        <div className="space-y-4">
                            {/* Banner: عرض التوزيع المعتمد */}
                            {hasPublished && isViewingPublished && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-blue-900">عرض التوزيع المعتمد</h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                هذا التوزيع تم اعتماده وإرساله للمعلمين سابقاً. يمكنك تعديله أو البدء من جديد.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setIsViewingPublished(false)
                                                    setScheduleId(null)
                                                    setIgnorePublished(true)
                                                }}
                                                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                                            >
                                                إعادة التوزيع من جديد (تجاهل المعتمد)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">اختر المعلمين الغائبين</h3>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                                    {selectedTeachers.length} / {absentTeachers.length} مختار
                                </span>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="w-12 px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={absentTeachers.every(t => t.selected)}
                                                    onChange={() => {
                                                        const allSelected = absentTeachers.every(t => t.selected)
                                                        absentTeachers.forEach(t => {
                                                            if (allSelected) {
                                                                if (t.selected) toggleTeacherSelection(t.teacher_id)
                                                            } else {
                                                                if (!t.selected) toggleTeacherSelection(t.teacher_id)
                                                            }
                                                        })
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">المعلم</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">سبب الغياب</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">الحصص</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {absentTeachers.map((teacher) => (
                                            <tr
                                                key={teacher.teacher_id}
                                                className={`cursor-pointer border-t transition hover:bg-slate-50 ${teacher.selected ? 'bg-indigo-50' : ''}`}
                                                onClick={() => toggleTeacherSelection(teacher.teacher_id)}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={teacher.selected}
                                                        onChange={() => toggleTeacherSelection(teacher.teacher_id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-900">{teacher.teacher_name}</td>
                                                <td className="px-4 py-3 text-right text-muted">{teacher.absence_reason}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                        {teacher.periods.length} حصة
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        /* Step 2: Review and modify substitutes */
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-slate-900">مراجعة وتعديل البدلاء</h3>
                            {selectedTeachers.map((teacher) => (
                                <div key={teacher.teacher_id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                    <div className="bg-slate-100 px-4 py-3 flex items-center gap-2">
                                        <Users className="h-5 w-5 text-rose-500" />
                                        <span className="font-semibold text-slate-900">{teacher.teacher_name}</span>
                                        <span className="text-sm text-muted">({teacher.absence_reason})</span>
                                        <span className="mr-auto rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                            {teacher.periods.length} حصة
                                        </span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-slate-50">
                                                <th className="w-24 px-4 py-2 text-right font-semibold text-slate-600">الحصة</th>
                                                <th className="px-4 py-2 text-right font-semibold text-slate-600">الصف</th>
                                                <th className="px-4 py-2 text-right font-semibold text-slate-600">المادة</th>
                                                <th className="w-48 px-4 py-2 text-right font-semibold text-slate-600">البديل</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teacher.periods.map((period) => (
                                                <tr key={period.period_number} className="border-b last:border-b-0 hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                        {PERIOD_NAMES[period.period_number] || period.period_number}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-600">{period.class}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600">{period.subject}</td>
                                                    <td className="px-4 py-3">
                                                        {editingPeriod?.teacherId === teacher.teacher_id &&
                                                            editingPeriod?.periodNumber === period.period_number ? (
                                                            <select
                                                                autoFocus
                                                                className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                value={period.selectedStandby?.id ?? ''}
                                                                onChange={(e) => {
                                                                    const id = Number(e.target.value)
                                                                    const staff = staffQuery.data?.data.find(s => s.id === id)
                                                                    updatePeriodStandby(
                                                                        teacher.teacher_id,
                                                                        period.period_number,
                                                                        staff ? { id: staff.id, name: staff.name, phone: staff.phone } : null
                                                                    )
                                                                }}
                                                                onBlur={() => setEditingPeriod(null)}
                                                            >
                                                                <option value="">-- اختر بديل --</option>
                                                                {([1,2,3,4,5,6,7] as const).map(i => {
                                                                    const s = period[`standby${i}` as keyof PeriodInfo] as StandbyTeacher | null | undefined
                                                                    return s ? <option key={i} value={s.id}>⭐ {s.name} (منتظر {i})</option> : null
                                                                })}
                                                                {period.availableTeachers && period.availableTeachers.length > 0 && (
                                                                    <optgroup label="معلمين متاحين ✅">
                                                                        {period.availableTeachers.map(t => (
                                                                            <option key={t.id} value={t.id}>✅ {t.name} (متاح)</option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                <optgroup label="جميع المعلمين والإداريين">
                                                                    {staffQuery.data?.data.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingPeriod({ teacherId: teacher.teacher_id, periodNumber: period.period_number })}
                                                                className={`w-full rounded-lg border px-3 py-2 text-sm text-right transition ${period.selectedStandby
                                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                    : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                                    }`}
                                                            >
                                                                {period.selectedStandby?.name ?? 'لا يوجد بديل'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Step 3: Confirmation and actions */
                        <div id="standby-print-content" className="space-y-6">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                                <Check className="mx-auto mb-2 h-12 w-12 text-emerald-600" />
                                <h3 className="text-xl font-bold text-emerald-800">تم حفظ التوزيع بنجاح</h3>
                                <p className="text-emerald-600">{allDistributions.length} حصة جاهزة للاعتماد</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h4 className="mb-3 font-semibold text-slate-900">ملخص التوزيع</h4>
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">الحصة</th>
                                            <th className="px-3 py-2">الفصل</th>
                                            <th className="px-3 py-2">البديل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allDistributions.map((dist, idx) => (
                                            <tr key={idx} className="border-t border-slate-100">
                                                <td className="px-3 py-2">{PERIOD_NAMES[dist.period_number] || dist.period_number}</td>
                                                <td className="px-3 py-2">{dist.class_name}</td>
                                                <td className="px-3 py-2 font-semibold">
                                                    {selectedTeachers
                                                        .flatMap(t => t.periods)
                                                        .find(p => p.period_number === dist.period_number)
                                                        ?.selectedStandby?.name ?? '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div>
                        {step > 1 && step < 3 && (
                            <button
                                onClick={() => setStep((step - 1) as 1 | 2)}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                                السابق
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {step === 1 && (
                            <button
                                onClick={handleProceedToStep2}
                                disabled={selectedTeachers.length === 0}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                التالي
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={handleDistribute}
                                disabled={distributeMutation.isPending || allDistributions.length === 0}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {distributeMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        {isViewingPublished ? 'تحديث التوزيع' : 'حفظ التوزيع'}
                                        <ChevronLeft className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        )}
                        {step === 3 && (
                            <>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    <FileText className="h-4 w-4" />
                                    مستند
                                </button>
                                <button
                                    onClick={handleDownloadImage}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    <Image className="h-4 w-4" />
                                    صورة
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {approveMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            جاري الإرسال...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            اعتماد وإرسال واتساب
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    )
}
