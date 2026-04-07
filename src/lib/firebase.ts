import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = (key: string) => process.env[key] || undefined;

const firebaseConfig = {
  apiKey:            env("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain:        env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId:         env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket:     env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             env("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const configured = !!firebaseConfig.apiKey;
const app = configured
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth           = app ? getAuth(app) : null;
export const db             = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
