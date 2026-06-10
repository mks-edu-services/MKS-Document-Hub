import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyDd10sn7awbNrYRgTmYRaCOYHYjMRaD5vA',
  authDomain: 'mks-certificate-app-cbf64.firebaseapp.com',
  projectId: 'mks-certificate-app-cbf64',
  storageBucket: 'mks-certificate-app-cbf64.firebasestorage.app',
  messagingSenderId: '813274492999',
  appId: '1:813274492999:web:b93bbcf52fa5288db40162',
};

const resolvedApiKey =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  defaultFirebaseConfig.apiKey;

const firebaseConfig = {
  apiKey: resolvedApiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

export function getFirebasePublicConfig() {
  return firebaseConfig;
}

let _app: ReturnType<typeof initializeApp> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _auth: any = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured) return null;
  if (_app) return _app;
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return _app;
}

export function getFirebaseDb() {
  if (!isFirebaseConfigured) return null;
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;
  _db = getFirestore(app);
  return _db;
}

export async function getFirebaseAuth() {
  if (!isFirebaseConfigured) return null;
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const { getAuth } = await import('firebase/auth');
    _auth = getAuth(app);
  } catch {
    const { getAuth } = await import('firebase/auth');
    _auth = getAuth(app);
  }
  return _auth;
}
