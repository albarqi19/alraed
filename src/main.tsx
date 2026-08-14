import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { installBreadcrumbCollectors } from './shared/diagnostics'
import './styles/index.css'
import './styles/workspace.css'

// فتات المسار: يُركَّب قبل تركيب شجرة React عمداً، كي يلتقط أوّل نقرةٍ في شاشة
// الدخول — وهي أكثر الشاشات بلاغاتٍ وأقلّها سياقاً. جامعان اثنان على
// `document` بالتفويض، بلا تخزينٍ دائم، وكلّ ما فيه مقنَّعٌ من المنبع.
installBreadcrumbCollectors()

// ✅ تسجيل Firebase Service Worker فقط للإشعارات
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('[SW] Firebase messaging registered:', registration.scope)
    })
    .catch((error) => {
      console.error('[SW] Firebase messaging registration failed:', error)
    })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
