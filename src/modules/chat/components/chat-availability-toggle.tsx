import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MessageCircleOff, MessageCircle } from 'lucide-react'

interface ChatAvailabilityToggleProps {
  isAvailable: boolean
  onToggle: (available: boolean) => void
  isLoading?: boolean
}

export function ChatAvailabilityToggle({ isAvailable, onToggle, isLoading }: ChatAvailabilityToggleProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg" dir="rtl">
      {isAvailable ? (
        <MessageCircle className="h-5 w-5 text-green-500" />
      ) : (
        <MessageCircleOff className="h-5 w-5 text-muted-foreground" />
      )}
      <div className="flex-1">
        <Label className="text-sm font-medium">
          {isAvailable ? 'الدردشة مفتوحة' : 'الدردشة مغلقة'}
        </Label>
        <p className="text-xs text-muted-foreground">
          {isAvailable ? 'أولياء الأمور يمكنهم التواصل معك' : 'لن يظهر اسمك عند أولياء الأمور'}
        </p>
      </div>
      <Switch
        checked={isAvailable}
        onCheckedChange={onToggle}
        disabled={isLoading}
      />
    </div>
  )
}
