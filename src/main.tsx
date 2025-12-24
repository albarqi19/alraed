import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

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
