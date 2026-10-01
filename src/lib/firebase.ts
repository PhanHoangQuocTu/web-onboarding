import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { FIREBASE_CONFIG } from '@/utils/const'

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp()

  const missing = Object.entries(FIREBASE_CONFIG)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length) {
    throw new Error(
      `Firebase config is missing: ${missing.join(', ')}. Check NEXT_PUBLIC_FIREBASE_* env vars.`,
    )
  }

  return initializeApp(FIREBASE_CONFIG)
}
