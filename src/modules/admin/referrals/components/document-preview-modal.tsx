import { X, Printer } from 'lucide-react'
import { useRef } from 'react'

interface DocumentPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    documentHtml: string
    documentTitle: string
}

export function DocumentPreviewModal({
    isOpen,
    onClose,
    documentHtml,
    documentTitle,
}: DocumentPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    if (!isOpen) return null

    const handlePrint = () => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.print()
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-900">{documentTitle}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
                        >
                            <Printer className="h-4 w-4" />
                            طباعة
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-hidden bg-slate-50">
                    <iframe
                        ref={iframeRef}
                        srcDoc={documentHtml}
                        className="h-full w-full border-0"
                        title={documentTitle}
                    />
                </div>
            </div>
        </div>
    )
}
