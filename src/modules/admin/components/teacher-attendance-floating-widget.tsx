import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, X, ChevronUp, ClipboardList } from 'lucide-react'

interface TeacherAttendanceFloatingWidgetProps {
  onStatsClick: () => void
  onRefresh: () => void
  onStandbyClick?: () => void
  isRefreshing?: boolean
}

const WIDGET_STATE_KEY = 'teacher-attendance-widget-expanded'

export function TeacherAttendanceFloatingWidget({
  onStatsClick,
  onRefresh,
  onStandbyClick,
  isRefreshing = false,
}: TeacherAttendanceFloatingWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(WIDGET_STATE_KEY)
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(WIDGET_STATE_KEY, String(isExpanded))
  }, [isExpanded])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleStatsClick = () => {
    onStatsClick()
    setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }

  const handleRefresh = () => {
    onRefresh()
    setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }

  // الزر المصغر - بتصميم الثيم المؤسسي
  if (!isExpanded) {
    return (
      <div className="pointer-events-none fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2">
        <button
          type="button"
          onClick={toggleExpanded}
          className="pointer-events-auto group relative flex h-10 w-10 items-center justify-center text-white transition-all duration-150 hover:scale-105"
          style={{
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(12px)',
          }}
          title="فتح الاختصارات"
        >
          <ChevronUp className="h-4 w-4" />

          {/* نقطة نشاط */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
          </span>
        </button>
      </div>
    )
  }

  // الويدجت الكامل - بتصميم الثيم المؤسسي
  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2">
      <div className="pointer-events-auto relative">
        <div
          className="relative overflow-visible"
          style={{
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* زر الإغلاق */}
          <button
            type="button"
            onClick={toggleExpanded}
            className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center text-white transition-all duration-150 hover:scale-110"
            style={{
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
            }}
            title="إغلاق"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* محتوى الويدجت */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* زر الإحصائيات */}
            <button
              type="button"
              onClick={handleStatsClick}
              className="group flex items-center gap-1.5 px-3 py-2 text-black transition-all duration-150 hover:scale-105"
              style={{
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 500,
                minHeight: '2rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>الإحصائيات</span>
            </button>

            {/* فاصل */}
            <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />

            {/* زر توزيع الانتظار */}
            {onStandbyClick && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onStandbyClick()
                    setTimeout(() => setIsExpanded(false), 300)
                  }}
                  className="group flex items-center gap-1.5 px-3 py-2 text-black transition-all duration-150 hover:scale-105"
                  style={{
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    minHeight: '2rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>توزيع الانتظار</span>
                </button>
                {/* فاصل */}
                <div className="h-6 w-px" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
              </>
            )}

            {/* زر التحديث */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="group flex items-center gap-1.5 px-3 py-2 text-black transition-all duration-150 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              style={{
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 500,
                minHeight: '2rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
