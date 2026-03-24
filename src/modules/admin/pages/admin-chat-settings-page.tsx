import { useState } from 'react'
import { Settings, UserPlus, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/shared/feedback/use-toast'
import {
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
  useCounselorAssignmentsQuery,
  useCounselorsListQuery,
  useCreateCounselorAssignmentMutation,
  useDeleteCounselorAssignmentMutation,
  useBlockedGuardiansQuery,
  useUnblockGuardianMutation,
} from '@/modules/chat/hooks'

export default function AdminChatSettingsPage() {
  const toast = useToast()

  // Settings
  const settingsQuery = useChatSettingsQuery()
  const updateSettingsMutation = useUpdateChatSettingsMutation()
  const settings = settingsQuery.data

  // Counselor Assignments
  const assignmentsQuery = useCounselorAssignmentsQuery()
  const counselorsQuery = useCounselorsListQuery()
  const createAssignmentMutation = useCreateCounselorAssignmentMutation()
  const deleteAssignmentMutation = useDeleteCounselorAssignmentMutation()

  // Blocked Guardians
  const blockedQuery = useBlockedGuardiansQuery()
  const unblockMutation = useUnblockGuardianMutation()

  // New assignment form
  const [newCounselorId, setNewCounselorId] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newClassName, setNewClassName] = useState('')

  function handleToggleSetting(key: string, value: boolean) {
    updateSettingsMutation.mutate({ [key]: value }, {
      onSuccess: () => toast({ title: 'تم تحديث الإعدادات' }),
    })
  }

  function handleCreateAssignment() {
    if (!newCounselorId) return
    createAssignmentMutation.mutate(
      {
        user_id: Number(newCounselorId),
        grade: newGrade || null,
        class_name: newClassName || null,
      },
      {
        onSuccess: () => {
          toast({ title: 'تم إضافة التعيين' })
          setNewCounselorId('')
          setNewGrade('')
          setNewClassName('')
        },
      },
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings className="h-5 w-5" />
        إعدادات الدردشة
      </h1>

      {/* إعدادات عامة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الإعدادات العامة</CardTitle>
          <CardDescription>التحكم في تفعيل وسلوك نظام الدردشة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل الدردشة</Label>
            <Switch
              checked={settings?.chat_enabled ?? false}
              onCheckedChange={(v) => handleToggleSetting('chat_enabled', v)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>السماح لأولياء الأمور ببدء محادثات</Label>
            <Switch
              checked={settings?.parent_can_initiate ?? true}
              onCheckedChange={(v) => handleToggleSetting('parent_can_initiate', v)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* تعيين الموجهين */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            تعيين الموجهين للصفوف
          </CardTitle>
          <CardDescription>حدد أي موجه مسؤول عن أي صفوف وفصول</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* نموذج إضافة */}
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">الموجه</Label>
              <Select value={newCounselorId} onValueChange={setNewCounselorId}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="اختر موجه" />
                </SelectTrigger>
                <SelectContent>
                  {counselorsQuery.data?.counselors?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الصف (اختياري)</Label>
              <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="مثال: الصف الأول" className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الفصل (اختياري)</Label>
              <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="مثال: أ" className="h-9 w-24" />
            </div>
            <Button onClick={handleCreateAssignment} size="sm" disabled={!newCounselorId || createAssignmentMutation.isPending}>
              <UserPlus className="h-4 w-4 ml-1" /> إضافة
            </Button>
          </div>

          {/* قائمة التعيينات */}
          <div className="space-y-2">
            {assignmentsQuery.data?.assignments?.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{a.user?.name}</span>
                  <span className="text-muted-foreground mx-2">←</span>
                  <span className="text-muted-foreground">
                    {a.grade ?? 'كل الصفوف'}
                    {a.class_name && ` / ${a.class_name}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteAssignmentMutation.mutate(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!assignmentsQuery.data?.assignments?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد تعيينات بعد</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* أولياء الأمور المحظورين */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">أولياء الأمور المحظورين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {blockedQuery.data?.data?.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{g.parent_name ?? g.parent_phone}</span>
                  {g.blocked_reason && (
                    <span className="text-xs text-muted-foreground mr-2">({g.blocked_reason})</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockMutation.mutate(g.id)}
                  disabled={unblockMutation.isPending}
                >
                  إلغاء الحظر
                </Button>
              </div>
            ))}
            {!blockedQuery.data?.data?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد محظورين</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
