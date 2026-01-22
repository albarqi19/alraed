/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_DATABASE_URL: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_FIREBASE_VAPID_KEY: string
  readonly VITE_AUTO_CALL_SCHOOL_LAT: string
  readonly VITE_AUTO_CALL_SCHOOL_LNG: string
  readonly VITE_AUTO_CALL_ALLOWED_RADIUS_METERS: string
  readonly VITE_AUTO_CALL_FALLBACK_SCHOOL_ID: string
  readonly VITE_REVERB_APP_KEY: string
  readonly VITE_REVERB_HOST: string
  readonly VITE_REVERB_PORT: string
  readonly VITE_REVERB_SCHEME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
