import { Check, Palette } from 'lucide-react'
import { useTheme } from '@/shared/themes'

export function AdminThemeSettingsPage() {
  const { currentTheme, setTheme, availableThemes } = useTheme()

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          إعدادات المظهر
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          اختر المظهر المفضل لديك لتخصيص تجربة استخدام لوحة التحكم
        </p>
      </div>

      {/* الثيمات المتاحة */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableThemes.map((theme) => {
          const isActive = currentTheme.id === theme.id

          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className="group relative overflow-hidden rounded-3xl border-2 p-6 text-right shadow-sm transition-all hover:shadow-lg"
              style={{
                borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              {/* علامة الاختيار */}
              {isActive && (
                <div
                  className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}

              {/* أيقونة */}
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: theme.colors.primary + '15' }}
              >
                <Palette className="h-8 w-8" style={{ color: theme.colors.primary }} />
              </div>

              {/* الاسم والوصف */}
              <h3
                className="text-lg font-bold"
                style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
              >
                {theme.nameAr}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {theme.descriptionAr}
              </p>

              {/* معاينة الألوان */}
              <div className="mt-6 flex gap-2">
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="اللون الأساسي"
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: theme.colors.sidebar }}
                  title="القائمة الجانبية"
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: theme.colors.header }}
                  title="الهيدر"
                />
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{ backgroundColor: theme.colors.success }}
                  title="النجاح"
                />
              </div>

              {/* معلومات إضافية */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <p style={{ color: theme.colors.textSecondary }}>الخلفية</p>
                  <p className="mt-0.5 font-mono text-[10px]" style={{ color: theme.colors.textPrimary }}>
                    {theme.colors.background}
                  </p>
                </div>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: theme.colors.accent }}
                >
                  <p style={{ color: theme.colors.textSecondary }}>اللون الثانوي</p>
                  <p className="mt-0.5 font-mono text-[10px]" style={{ color: theme.colors.textPrimary }}>
                    {theme.colors.accent}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* معلومات إضافية */}
      <div
        className="rounded-3xl border p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          💡 ملاحظة
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          يتم حفظ اختيارك للمظهر تلقائياً في المتصفح الخاص بك. عند تغيير المظهر، سيتم تطبيقه فوراً على
          جميع صفحات لوحة التحكم.
        </p>
      </div>
    </div>
  )
}
