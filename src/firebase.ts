import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  payloadShape?: Record<string, string>;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  payloadShape?: Record<string, string>
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
    ...(payloadShape ? { payloadShape } : {}),
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Database reads and writes are served via /api/db (Supabase PostgreSQL + Storage).
// Firebase is used strictly for user authentication (Google Sign-In & vendor login).

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export function phoneToVendorAuthEmail(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, '').slice(0, 18);
  return `v${digits}@phone.findmybites.com`;
}

export async function registerVendorWithPhonePassword(
  phoneDigits: string,
  password: string,
  displayName: string
): Promise<User> {
  const email = phoneToVendorAuthEmail(phoneDigits);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName.trim()) {
    try {
      await updateProfile(credential.user, { displayName: displayName.trim().slice(0, 80) });
    } catch {
      // Non-fatal profile name update
    }
  }
  return credential.user;
}

export async function signInVendorWithPhonePassword(
  phoneDigits: string,
  password: string
): Promise<User> {
  const email = phoneToVendorAuthEmail(phoneDigits);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export function mapAuthErrorMessage(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/configuration-not-found' ||
    msg.includes('operation-not-allowed')
  ) {
    return 'Email/Password login is not enabled yet in Firebase Console (Authentication → Sign-in method → Email/Password). Enable it once, or click "Claim with Google" below for instant access.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account for this phone number already exists. Enter your existing password or switch to Vendor Login.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Incorrect phone number or password. Please check your country code and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    msg.includes('disallowed_useragent')
  ) {
    return 'Google Sign-In popup is blocked in WhatsApp/Instagram browsers. Use "Create Password & Claim My Store" above instead (works right here), or tap the menu to Open in Chrome/Safari.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Google Sign-In is not enabled on this domain yet. Use "Create Password & Claim My Store" above — it works immediately.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completing.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export const ADMIN_EMAIL = 'crosscraftedin@gmail.com';
