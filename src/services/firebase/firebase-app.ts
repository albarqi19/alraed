import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

function resolveFirebaseConfig(): FirebaseOptions | null {
  try {
    const config: FirebaseOptions = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    }

    const missing = Object.entries(config)
      .filter(([, value]) => value === undefined || value === null || value === '')
      .map(([key]) => key)

    if (missing.length) {
      console.warn(
        `Firebase configuration is incomplete. Missing: ${missing.join(', ')}. Auto-call features will be disabled.`,
      )
      return null
    }

    return config
  } catch (error) {
    console.warn('Failed to resolve Firebase config:', error)
    return null
  }
}

let firebaseApp: FirebaseApp | null = null
let firestoreClient: Firestore | null = null
let initializationFailed = false

export function getFirebaseApp(): FirebaseApp | null {
  if (initializationFailed) {
    return null
  }

  if (firebaseApp) {
    return firebaseApp
  }

  try {
    const existing = getApps()
    if (existing.length) {
      firebaseApp = existing[0]!
    } else {
      const config = resolveFirebaseConfig()
      if (!config) {
        initializationFailed = true
        return null
      }
      firebaseApp = initializeApp(config)
    }

    return firebaseApp
  } catch (error) {
    console.warn('Failed to initialize Firebase app:', error)
    initializationFailed = true
    return null
  }
}

export function getFirestoreClient(): Firestore | null {
  if (firestoreClient) {
    return firestoreClient
  }

  const app = getFirebaseApp()
  if (!app) {
    return null
  }

  try {
    firestoreClient = getFirestore(app)
    return firestoreClient
  } catch (error) {
    console.warn('Failed to get Firestore client:', error)
    return null
  }
}
