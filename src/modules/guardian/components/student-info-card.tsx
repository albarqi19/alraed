import { useState } from 'react'
import { X } from 'lucide-react'

interface StudentInfoCardProps {
  studentName: string
  studentGrade: string
  studentClass: string
  nationalId: string
  points?: number | null
  storeStatus?: 'open' | 'closed' | 'maintenance' | 'inventory' | 'paused' | 'no_products' | 'empty' | null
  storeStatusMessage?: string | null
  guardianName?: string
  guardianPhone?: string
}

export function StudentInfoCard({
  studentName,
  studentGrade,
  studentClass,
  nationalId,
  points = null,
  storeStatus = null,
  storeStatusMessage = null,
  guardianName,
  guardianPhone,
}: StudentInfoCardProps) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const getStoreStatusLabel = () => {
    switch (storeStatus) {
      case 'open':
        return 'المتجر متاح للاستبدال'
      case 'closed':
        return 'المتجر مغلق مؤقتاً'
      case 'maintenance':
        return 'المتجر تحت الصيانة'
      case 'inventory':
        return 'جرد المخزون جارٍ'
      case 'paused':
        return 'المتجر متوقف مؤقتاً'
      case 'no_products':
        return 'لا توجد منتجات متاحة'
      default:
        return null
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsBottomSheetOpen(true)}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500">معلومات الطالب</p>
            <p className="mt-1 text-base font-bold text-slate-900">{studentName}</p>
            <p className="text-xs text-slate-600">
              الصف {studentGrade} • الفصل {studentClass}
            </p>
          </div>

          {points != null ? (
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-xl font-bold text-indigo-700">{points}</p>
            </div>
          ) : null}

          <i className="bi bi-chevron-left text-slate-400" />
        </div>
      </button>

      {/* Bottom Sheet */}
      {isBottomSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setIsBottomSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center py-3 sm:hidden">
              <div className="h-1 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">تفاصيل الطالب</h3>
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-6">
              {/* Student Info */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 text-right">
                    <p className="text-xs font-semibold text-indigo-600">اسم الطالب</p>
                    <p className="mt-0.5 text-base font-bold text-slate-900">{studentName}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      الصف {studentGrade} • الفصل {studentClass}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
                    {nationalId}
                  </div>
                </div>
              </div>

              {/* Guardian Info */}
              {(guardianName || guardianPhone) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-500">معلومات ولي الأمر</p>
                  <div className="space-y-2">
                    {guardianName ? (
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">الاسم</p>
                        <p className="text-sm font-semibold text-slate-800">{guardianName}</p>
                      </div>
                    ) : null}
                    {guardianPhone ? (
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">الهاتف</p>
                        <p className="text-sm font-semibold text-slate-800" dir="ltr">
                          {guardianPhone}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Points & Store */}
              {points != null ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-emerald-600">النقاط والمتجر</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">رصيد النقاط</p>
                      <p className="text-xl font-bold text-emerald-700">{points}</p>
                    </div>

                    {storeStatus ? (
                      <div className="space-y-1 rounded-lg bg-white px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">حالة المتجر</p>
                          <p className="text-sm font-semibold text-slate-800">{getStoreStatusLabel()}</p>
                        </div>
                        {storeStatusMessage ? (
                          <p className="text-xs text-slate-600">{storeStatusMessage}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
