import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

function resolveFirebaseConfig(): FirebaseOptions {
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
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missing.join(', ')}. Make sure to set the corresponding Vite environment variables.`,
    )
  }

  return config
}

let firebaseApp: FirebaseApp | null = null
let firestoreClient: Firestore | null = null

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp
  }

  const existing = getApps()
  if (existing.length) {
    firebaseApp = existing[0]!
  } else {
    firebaseApp = initializeApp(resolveFirebaseConfig())
  }

  return firebaseApp
}

export function getFirestoreClient(): Firestore {
  if (firestoreClient) {
    return firestoreClient
  }

  const app = getFirebaseApp()
  firestoreClient = getFirestore(app)
  return firestoreClient
}
