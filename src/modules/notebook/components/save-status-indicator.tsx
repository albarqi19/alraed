import { Cloud, CloudOff, Loader2 } from 'lucide-react'

interface SaveStatusIndicatorProps {
  saving: boolean
  lastSaved: Date | null
  hasUnsaved: boolean
}

export function SaveStatusIndicator({ saving, lastSaved, hasUnsaved }: SaveStatusIndicatorProps) {
  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>جاري الحفظ...</span>
      </div>
    )
  }

  if (lastSaved && !hasUnsaved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="w-3.5 h-3.5 text-green-500" />
        <span>تم الحفظ {lastSaved.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )
  }

  if (hasUnsaved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <CloudOff className="w-3.5 h-3.5" />
        <span>غير محفوظ</span>
      </div>
    )
  }

  return null
}
