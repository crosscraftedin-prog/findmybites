import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
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
// Firebase is used strictly for user authentication (Google Sign-In, Email & Phone+Password).

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export function phoneToVendorAuthEmail(phoneDigits: string): string {
  const digits = phoneDigits.replace(/\D/g, '').slice(0, 18);
  return `v${digits}@phone.findmybites.com`;
}

export function formatUserDisplayLabel(user: Pick<User, 'displayName' | 'email'>): string {
  const name = user.displayName?.trim();
  if (name) return name;
  const email = user.email?.trim() || '';
  const phoneMatch = email.match(/^v(\d+)@phone\.findmybites\.com$/i);
  if (phoneMatch) return `+${phoneMatch[1]}`;
  return email || 'Member';
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

export async function registerWithEmailPassword(
  emailRaw: string,
  password: string,
  displayName: string
): Promise<User> {
  const email = emailRaw.trim().toLowerCase();
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

export async function signInWithEmailPassword(
  emailRaw: string,
  password: string
): Promise<User> {
  const email = emailRaw.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function sendAccountPasswordReset(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  await sendPasswordResetEmail(auth, email);
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
    return 'Email/Password login is not enabled yet in Firebase Console. Please use "Continue with Google" for instant access.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email or phone number already exists. Switch to Sign In and enter your password.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long.';
  }
  if (code === 'auth/missing-password') {
    return 'Please enter your password.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Incorrect email/phone or password. Double-check your details (and country code if using phone) and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please wait a minute and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while connecting to sign-in. Please check your internet connection and try again.';
  }
  if (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    msg.includes('disallowed_useragent')
  ) {
    return 'Google Sign-In popup is blocked inside WhatsApp/Instagram browsers. Use Email or Phone + Password right here, or tap the menu to Open in Chrome/Safari.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Google Sign-In is not enabled on this domain yet. Use Email or Phone + Password — it works immediately.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in popup was closed before completing.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export const ADMIN_EMAIL = 'crosscraftedin@gmail.com';
