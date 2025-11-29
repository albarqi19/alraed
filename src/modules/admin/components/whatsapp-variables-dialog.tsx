import { Fragment, useEffect, useState } from 'react'
import { fetchWhatsappVariables } from '../api'

type VariableData = {
  key: string
  label: string
  description: string
  example: string
  data_source: string
  category: string
  required?: boolean
}

type CategoryData = {
  title: string
  icon: string
  color: string
  variables: Record<string, VariableData>
}

type VariablesResponse = Record<string, CategoryData>

type WhatsappVariablesDialogProps = {
  open: boolean
  onClose: () => void
  onInsert: (placeholder: string) => void
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  student: { icon: '👨‍🎓', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  absence: { icon: '📅', color: 'text-red-600 bg-red-50 border-red-200' },
  late: { icon: '⏰', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  teacher: { icon: '👨‍🏫', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  school: { icon: '🏫', color: 'text-green-600 bg-green-50 border-green-200' },
  general: { icon: '📌', color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export function WhatsappVariablesDialog({ open, onClose, onInsert }: WhatsappVariablesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variables, setVariables] = useState<VariablesResponse>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [insertedKey, setInsertedKey] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadVariables()
    }
  }, [open])

  const loadVariables = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWhatsappVariables()
      setVariables(data as VariablesResponse)
    } catch (err) {
      setError('فشل تحميل المتغيرات')
      console.error('Error loading variables:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = (varKey: string) => {
    const placeholder = `{{${varKey}}}`
    console.log('🔵 Dialog handleInsert called with key:', varKey, 'placeholder:', placeholder)
    onInsert(placeholder)
    setInsertedKey(varKey)
    // Show feedback for 1 second
    setTimeout(() => setInsertedKey(null), 1000)
    // Don't close the dialog immediately so users can insert multiple variables
    // onClose()
  }

  const filterVariables = () => {
    const query = searchTerm.trim().toLowerCase()
    const filtered: VariablesResponse = {}

    Object.entries(variables).forEach(([categoryKey, categoryData]) => {
      if (selectedCategory && categoryKey !== selectedCategory) return

      const matchingVariables: Record<string, VariableData> = {}

      Object.entries(categoryData.variables).forEach(([varKey, varData]) => {
        if (!query) {
          matchingVariables[varKey] = varData
          return
        }

        const placeholder = `{{${varData.key}}}`
        const matches =
          placeholder.toLowerCase().includes(query) ||
          varData.key.toLowerCase().includes(query) ||
          varData.label.toLowerCase().includes(query) ||
          varData.description.toLowerCase().includes(query)

        if (matches) {
          matchingVariables[varKey] = varData
        }
      })

      if (Object.keys(matchingVariables).length > 0) {
        filtered[categoryKey] = { ...categoryData, variables: matchingVariables }
      }
    })

    return filtered
  }

  const filteredVariables = filterVariables()
  const totalCount = Object.values(filteredVariables).reduce(
    (sum, category) => sum + Object.keys(category.variables).length,
    0
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">المتغيرات المتاحة</h2>
            <p className="mt-1 text-sm text-slate-600">اختر متغيرًا لإضافته إلى نص القالب</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="border-b border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="relative">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في المتغيرات..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-12 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === null
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({Object.values(variables).reduce((sum, cat) => sum + Object.keys(cat.variables).length, 0)})
            </button>
            {Object.entries(variables).map(([key, data]) => {
              const iconData = CATEGORY_ICONS[key] || CATEGORY_ICONS.general
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedCategory === key
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{iconData.icon}</span>
                  <span>{data.title}</span>
                  <span className="opacity-70">({Object.keys(data.variables).length})</span>
                </button>
              )
            })}
          </div>

          <div className="text-xs text-slate-500">
            عرض <span className="font-semibold text-teal-600">{totalCount}</span> متغير
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
              <p className="text-sm font-medium">جاري تحميل المتغيرات...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <i className="bi bi-exclamation-triangle text-3xl text-red-500"></i>
              <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
              <button
                onClick={loadVariables}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <i className="bi bi-search text-3xl"></i>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">لا توجد متغيرات مطابقة</p>
              <p className="mt-1 text-xs text-slate-400">جرب تعديل معايير البحث</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredVariables).map(([categoryKey, categoryData]) => {
                const iconData = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.general
                return (
                  <Fragment key={categoryKey}>
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-2xl">{iconData.icon}</span>
                        <h3 className="text-lg font-bold text-slate-800">{categoryData.title}</h3>
                        <span className="text-xs text-slate-500">
                          ({Object.keys(categoryData.variables).length})
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(categoryData.variables).map(([varKey, varData]) => {
                          const placeholder = `{{${varData.key}}}`
                          const isInserted = insertedKey === varData.key
                          return (
                            <div
                              key={varKey}
                              className={`group rounded-xl border p-4 transition ${
                                isInserted
                                  ? 'border-green-400 bg-green-50 shadow-md'
                                  : 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-teal-700">
                                      {placeholder}
                                    </code>
                                    {isInserted && (
                                      <span className="text-xs font-semibold text-green-600">✓ تم الإدراج</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900">{varData.label}</p>
                                  <p className="text-xs text-slate-600">{varData.description}</p>
                                  {varData.example && (
                                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                                      <p className="text-xs text-slate-500">مثال:</p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">{varData.example}</p>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleInsert(varData.key)}
                                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                    isInserted
                                      ? 'bg-green-600 text-white'
                                      : 'bg-teal-600 text-white opacity-0 hover:bg-teal-700 group-hover:opacity-100'
                                  }`}
                                  disabled={isInserted}
                                >
                                  <i className={isInserted ? 'bi bi-check-lg' : 'bi bi-plus-lg'}></i>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>💡 انقر على + لإضافة المتغير إلى القالب • يمكنك إضافة عدة متغيرات</span>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
