import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // الخط الحالي: Readex Pro
        sans: ['Readex Pro', 'sans-serif'],
        // للرجوع للخط السابق استبدل السطر أعلاه بـ:
        // sans: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      colors: {
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-dark)',
          400: 'var(--color-primary-light)',
        },
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        muted: 'var(--color-muted)',
      },
      borderRadius: {
        base: 'var(--radius-base)',
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
      },
    },
  },
  plugins: [forms()],
}

export default config
