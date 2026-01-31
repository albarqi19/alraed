import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Settings,
  Bell,
  MessageSquare,
  Sliders,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Info,
  Check,
} from 'lucide-react'
import { getExcuseSettings, updateExcuseSettings, resetMessageToDefault } from '../api'
import type { ExcuseSettingsData, UpdateExcuseSettingsPayload, MessageType } from '../types'
import { useToast } from '@/shared/feedback/use-toast'

interface Props {
  open: boolean
  onClose: () => void
}

type SectionKey = 'notifications' | 'messages' | 'general'

export function ExcuseSettingsModal({ open, onClose }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    notifications: true,
    messages: false,
    general: false,
  })

  // Active message tab
  const [activeMessageTab, setActiveMessageTab] = useState<MessageType>('approval')

  // Form state
  const [formData, setFormData] = useState<UpdateExcuseSettingsPayload>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch settings
  const settingsQuery = useQuery({
    queryKey: ['excuse-settings'],
    queryFn: getExcuseSettings,
    enabled: open,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateExcuseSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excuse-settings'] })
      toast({ type: 'success', title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' })
      setHasChanges(false)
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء حفظ الإعدادات' })
    },
  })

  // Reset message mutation
  const resetMutation = useMutation({
    mutationFn: resetMessageToDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excuse-settings'] })
      toast({ type: 'success', title: 'تم إعادة التعيين', description: 'تم إعادة النص للافتراضي' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء إعادة التعيين' })
    },
  })

  // Initialize form data when settings load
  useEffect(() => {
    if (settingsQuery.data?.data) {
      setFormData({})
      setHasChanges(false)
    }
  }, [settingsQuery.data])

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleFieldChange = <K extends keyof UpdateExcuseSettingsPayload>(
    field: K,
    value: UpdateExcuseSettingsPayload[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    if (!hasChanges) return
    updateMutation.mutate(formData)
  }

  const handleResetMessage = (messageType: MessageType) => {
    resetMutation.mutate(messageType)
    // Remove from form data
    const fieldMap: Record<MessageType, keyof UpdateExcuseSettingsPayload> = {
      approval: 'approval_message_template',
      rejection: 'rejection_message_template',
      admin_excuse: 'admin_excuse_message_template',
    }
    setFormData((prev) => {
      const newData = { ...prev }
      delete newData[fieldMap[messageType]]
      return newData
    })
  }

  const getCurrentValue = <K extends keyof ExcuseSettingsData>(field: K): ExcuseSettingsData[K] | undefined => {
    const settings = settingsQuery.data?.data
    if (!settings) return undefined

    // Check if there's a pending change in formData
    if (field in formData) {
      return formData[field as keyof UpdateExcuseSettingsPayload] as ExcuseSettingsData[K]
    }

    return settings[field]
  }

  const getMessageTemplate = (type: MessageType): string => {
    const settings = settingsQuery.data?.data
    if (!settings) return ''

    const fieldMap: Record<MessageType, keyof ExcuseSettingsData> = {
      approval: 'approval_message_template',
      rejection: 'rejection_message_template',
      admin_excuse: 'admin_excuse_message_template',
    }

    const field = fieldMap[type]

    // Check form data first
    if (field in formData) {
      return (formData[field as keyof UpdateExcuseSettingsPayload] as string) ?? ''
    }

    return settings[field] as string
  }

  const isUsingDefault = (type: MessageType): boolean => {
    const settings = settingsQuery.data?.data
    if (!settings) return true

    const fieldMap: Record<MessageType, keyof ExcuseSettingsData> = {
      approval: 'using_default_approval',
      rejection: 'using_default_rejection',
      admin_excuse: 'using_default_admin_excuse',
    }

    return settings[fieldMap[type]] as boolean
  }

  const getVariablesForType = (type: MessageType): Record<string, string> => {
    const variables = settingsQuery.data?.available_variables
    if (!variables) return {}

    return {
      ...variables.common,
      ...variables[type],
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white text-right shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Settings className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">إعدادات الأعذار</h2>
              <p className="text-xs text-slate-500">تخصيص إعدادات أعذار الغياب لهذه المدرسة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {settingsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : settingsQuery.isError ? (
            <div className="text-center py-12 text-rose-600">
              حدث خطأ أثناء تحميل الإعدادات
            </div>
          ) : (
            <>
              {/* Notifications Section */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('notifications')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-slate-900">إعدادات الإشعارات</span>
                  </div>
                  {expandedSections.notifications ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.notifications && (
                  <div className="p-4 space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <span className="text-sm text-slate-700">إرسال إشعار عند قبول العذر</span>
                      <input
                        type="checkbox"
                        checked={getCurrentValue('notify_on_approval') ?? true}
                        onChange={(e) => handleFieldChange('notify_on_approval', e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <span className="text-sm text-slate-700">إرسال إشعار عند رفض العذر</span>
                      <input
                        type="checkbox"
                        checked={getCurrentValue('notify_on_rejection') ?? true}
                        onChange={(e) => handleFieldChange('notify_on_rejection', e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <span className="text-sm text-slate-700">إرسال إشعار عند إنشاء عذر من الإدارة</span>
                      <input
                        type="checkbox"
                        checked={getCurrentValue('notify_on_admin_excuse') ?? true}
                        onChange={(e) => handleFieldChange('notify_on_admin_excuse', e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Messages Section */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('messages')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-slate-900">نصوص الرسائل</span>
                  </div>
                  {expandedSections.messages ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.messages && (
                  <div className="p-4 space-y-4">
                    {/* Message Tabs */}
                    <div className="flex gap-2">
                      {[
                        { key: 'approval' as MessageType, label: 'رسالة القبول' },
                        { key: 'rejection' as MessageType, label: 'رسالة الرفض' },
                        { key: 'admin_excuse' as MessageType, label: 'عذر الإدارة' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveMessageTab(tab.key)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                            activeMessageTab === tab.key
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Message Editor */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isUsingDefault(activeMessageTab) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                              <Check className="h-3 w-3" />
                              افتراضي
                            </span>
                          )}
                        </div>
                        {!isUsingDefault(activeMessageTab) && (
                          <button
                            onClick={() => handleResetMessage(activeMessageTab)}
                            disabled={resetMutation.isPending}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            {resetMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            إعادة للافتراضي
                          </button>
                        )}
                      </div>

                      <textarea
                        value={getMessageTemplate(activeMessageTab)}
                        onChange={(e) => {
                          const fieldMap: Record<MessageType, keyof UpdateExcuseSettingsPayload> = {
                            approval: 'approval_message_template',
                            rejection: 'rejection_message_template',
                            admin_excuse: 'admin_excuse_message_template',
                          }
                          handleFieldChange(fieldMap[activeMessageTab], e.target.value || null)
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[200px] font-mono text-slate-700"
                        dir="rtl"
                      />

                      {/* Variables Help */}
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-600">المتغيرات المتاحة:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(getVariablesForType(activeMessageTab)).map(([variable, description]) => (
                            <button
                              key={variable}
                              type="button"
                              onClick={() => {
                                const fieldMap: Record<MessageType, keyof UpdateExcuseSettingsPayload> = {
                                  approval: 'approval_message_template',
                                  rejection: 'rejection_message_template',
                                  admin_excuse: 'admin_excuse_message_template',
                                }
                                const currentValue = getMessageTemplate(activeMessageTab)
                                handleFieldChange(fieldMap[activeMessageTab], currentValue + variable)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                              title={description}
                            >
                              <code className="text-indigo-600">{variable}</code>
                              <span className="text-slate-400">-</span>
                              <span className="text-slate-600">{description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* General Settings Section */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('general')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-slate-900">إعدادات عامة</span>
                  </div>
                  {expandedSections.general ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                {expandedSections.general && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          صلاحية رابط العذر (بالأيام)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={getCurrentValue('link_validity_days') ?? 7}
                          onChange={(e) => handleFieldChange('link_validity_days', parseInt(e.target.value) || 7)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <p className="mt-1 text-xs text-slate-500">عدد الأيام التي يبقى فيها رابط تقديم العذر صالحاً</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          الحد الأقصى لأيام العذر
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={getCurrentValue('max_excuse_days') ?? 7}
                          onChange={(e) => handleFieldChange('max_excuse_days', parseInt(e.target.value) || 7)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <p className="mt-1 text-xs text-slate-500">الحد الأقصى لعدد الأيام في العذر الواحد</p>
                      </div>
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-slate-700">إلزام إرفاق ملف</span>
                        <p className="text-xs text-slate-500">يجب على ولي الأمر إرفاق مستند مع العذر</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={getCurrentValue('require_attachment') ?? false}
                        onChange={(e) => handleFieldChange('require_attachment', e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-500">
            {hasChanges && (
              <span className="text-amber-600">لديك تغييرات غير محفوظة</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="button-secondary"
              disabled={updateMutation.isPending}
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="button-primary flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              حفظ الإعدادات
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
