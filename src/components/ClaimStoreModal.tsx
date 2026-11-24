import { FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  StoreClaim,
  Vendor,
  normalizePasscode,
  normalizePhoneDigits,
} from '../data/vendors';
import {
  mapAuthErrorMessage,
  registerVendorWithPhonePassword,
  signInVendorWithPhonePassword,
  signInWithGoogle,
} from '../firebase';
import { ensureUserProfile, lookupStoreClaim, redeemStoreClaim } from '../services/firestoreService';

export type ClaimModalInitialTab = 'claim' | 'login';

interface ClaimStoreModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: ClaimModalInitialTab;
  hintVendorName?: string;
  currentUser: User | null;
  isAdminUser: boolean;
  onClaimSuccess: (vendorId: string, vendorName: string, claimedVendor?: Vendor) => void;
  onLoginSuccess: (user: User) => void;
}

const QUICK_DIAL_CODES = [
  { label: 'India +91', code: '91' },
  { label: 'UAE +971', code: '971' },
  { label: 'Sri Lanka +94', code: '94' },
  { label: 'Pakistan +92', code: '92' },
  { label: 'Bangladesh +880', code: '880' },
  { label: 'Nepal +977', code: '977' },
];

export function ClaimStoreModal({
  open,
  onClose,
  initialTab = 'claim',
  hintVendorName,
  currentUser,
  isAdminUser,
  onClaimSuccess,
  onLoginSuccess,
}: ClaimStoreModalProps) {
  const [tab, setTab] = useState<ClaimModalInitialTab>(initialTab);

  // Claim Step 1: Verify Phone + Passcode
  const [dialCode, setDialCode] = useState('91');
  const [phoneInput, setPhoneInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Claim Step 2: Set Password & Claim Ownership
  const [verifiedTicket, setVerifiedTicket] = useState<{
    claim: StoreClaim;
    claimId: string;
    fullPhone: string;
  } | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Vendor Login Tab (Phone + Password or Google)
  const [loginDialCode, setLoginDialCode] = useState('91');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const isInAppBrowser =
    typeof navigator !== 'undefined' &&
    /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|Twitter|wv\)/i.test(navigator.userAgent);

  const combinePhone = (code: string, rawLocal: string): string => {
    const cleanLocal = normalizePhoneDigits(rawLocal).replace(/^0+/, '');
    const cleanCode = normalizePhoneDigits(code).replace(/^0+/, '');
    if (!cleanLocal) return '';
    if (cleanCode && cleanLocal.startsWith(cleanCode) && cleanLocal.length >= cleanCode.length + 7) {
      return cleanLocal;
    }
    return normalizePhoneDigits(`${cleanCode}${cleanLocal}`);
  };

  const handleVerifyPasscode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullPhone = combinePhone(dialCode, phoneInput);
    const rawStripped = normalizePhoneDigits(phoneInput).replace(/^0+/, '');
    const cleanPass = normalizePasscode(passcodeInput);

    if (fullPhone.length < 8) {
      setError('Please enter your full phone number (select country code + mobile digits).');
      return;
    }
    if (cleanPass.length < 6) {
      setError('Please enter the full passcode sent to you on WhatsApp.');
      return;
    }

    setVerifying(true);
    try {
      const barePass = cleanPass.replace(/-/g, '');
      const strippedPrefix = barePass.replace(/^(?:CAKE|FMB)/, '');
      const passcodeCandidates: string[] = [cleanPass];
      if (strippedPrefix && strippedPrefix !== barePass && strippedPrefix.length >= 6) {
        passcodeCandidates.push(strippedPrefix);
      }
      if (!barePass.startsWith('CAKE') && !barePass.startsWith('FMB') && barePass.length >= 6 && barePass.length <= 10) {
        passcodeCandidates.push(`CAKE-${barePass}`, `FMB-${barePass}`);
      }
      const phoneCandidates: string[] = [fullPhone];
      if (rawStripped && rawStripped !== fullPhone && rawStripped.length >= 7) {
        phoneCandidates.push(rawStripped);
      }

      let matchedPhone = fullPhone;
      let result: { claim: StoreClaim; claimId: string } | null = null;
      outer: for (const candidatePhone of phoneCandidates) {
        for (const candidatePass of passcodeCandidates) {
          const hit = await lookupStoreClaim(candidatePhone, candidatePass);
          if (hit) {
            result = hit;
            matchedPhone = candidatePhone;
            break outer;
          }
        }
      }
      if (!result) {
        setError(
          'No matching store transfer found for this phone number and secret key. Please double-check your country code, mobile number, and the secret key from WhatsApp.'
        );
        return;
      }
      if (result.claim.status === 'claimed') {
        setError(
          `This storefront (${result.claim.vendorName}) has already been claimed! Switch to the "Sign In / Vendor Login" tab to sign in with your phone & password.`
        );
        return;
      }
      if (result.claim.status === 'revoked') {
        setError('This passcode has expired or was replaced. Ask FindMyBites admin for your latest passcode.');
        return;
      }
      setVerifiedTicket({
        claim: result.claim,
        claimId: result.claimId,
        fullPhone: matchedPhone,
      });
      setOwnerName(result.claim.vendorName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify passcode. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleClaimWithNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!verifiedTicket) return;
    setError(null);

    if (newPassword.length < 6) {
      setError('Please create a password of at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setClaiming(true);
    try {
      let user: User;
      try {
        user = await registerVendorWithPhonePassword(
          verifiedTicket.fullPhone,
          newPassword,
          ownerName.trim() || verifiedTicket.claim.vendorName
        );
      } catch (regErr) {
        const code =
          typeof regErr === 'object' && regErr !== null && 'code' in regErr
            ? String((regErr as { code?: unknown }).code || '')
            : '';
        // If baker already created an account with this phone earlier, sign in with that password and claim!
        if (code === 'auth/email-already-in-use') {
          user = await signInVendorWithPhonePassword(verifiedTicket.fullPhone, newPassword);
        } else {
          throw regErr;
        }
      }

      const claimedVendor = await redeemStoreClaim(
        verifiedTicket.claimId,
        verifiedTicket.claim.vendorId,
        user.uid,
        user
      );
      void ensureUserProfile(user, []).catch(() => {});
      onClaimSuccess(verifiedTicket.claim.vendorId, verifiedTicket.claim.vendorName, claimedVendor);
      setVerifiedTicket(null);
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimWithGoogle = async () => {
    if (!verifiedTicket) return;
    setError(null);
    setClaiming(true);
    try {
      const user = await signInWithGoogle();
      const claimedVendor = await redeemStoreClaim(
        verifiedTicket.claimId,
        verifiedTicket.claim.vendorId,
        user.uid,
        user
      );
      void ensureUserProfile(user, []).catch(() => {});
      onClaimSuccess(verifiedTicket.claim.vendorId, verifiedTicket.claim.vendorName, claimedVendor);
      setVerifiedTicket(null);
      onClose();
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimIntoCurrentUser = async () => {
    if (!verifiedTicket || !currentUser) return;
    setError(null);
    setClaiming(true);
    try {
      const claimedVendor = await redeemStoreClaim(
        verifiedTicket.claimId,
        verifiedTicket.claim.vendorId,
        currentUser.uid,
        currentUser
      );
      onClaimSuccess(verifiedTicket.claim.vendorId, verifiedTicket.claim.vendorName, claimedVendor);
      setVerifiedTicket(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete store transfer.');
    } finally {
      setClaiming(false);
    }
  };

  const handlePhonePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const fullPhone = combinePhone(loginDialCode, loginPhone);
    if (fullPhone.length < 8) {
      setError('Enter your registered phone number with country code.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }
    setSigningIn(true);
    try {
      const user = await signInVendorWithPhonePassword(fullPhone, loginPassword);
      onLoginSuccess(user);
      onClose();
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
      onClose();
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Claim Your Store or Vendor Login"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-brand/15 via-amber-500/10 to-background px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
              {tab === 'claim' ? (
                <KeyRound className="size-4" aria-hidden="true" />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {tab === 'claim' ? 'Claim Your Bakery Store' : 'Sign In to FindMyBites'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {tab === 'claim'
                  ? 'Enter your WhatsApp passcode & set your password'
                  : 'Phone + Password or Google account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-border bg-muted/40 p-2">
          <button
            type="button"
            onClick={() => {
              setTab('claim');
              setError(null);
            }}
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
              tab === 'claim'
                ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="size-3.5 text-brand" />
            Claim Store (Passcode)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
              tab === 'login'
                ? 'bg-background text-foreground shadow-xs ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="size-3.5 text-brand" />
            Sign In / Vendor Login
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold leading-relaxed text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* TAB 1: CLAIM STORE */}
          {tab === 'claim' && (
            !verifiedTicket ? (
              <form onSubmit={(e) => void handleVerifyPasscode(e)} className="space-y-4">
                {hintVendorName && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <Store className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs">
                      <p className="font-extrabold text-foreground">
                        Claiming {hintVendorName}
                      </p>
                      <p className="text-muted-foreground">
                        Enter your phone number &amp; secret passcode from WhatsApp to unlock ownership.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-foreground">
                    1. Your Phone / WhatsApp Number
                  </label>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {QUICK_DIAL_CODES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setDialCode(c.code)}
                        className={`cursor-pointer rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                          dialCode === c.code
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <div className="relative w-20">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                        +
                      </span>
                      <input
                        type="text"
                        value={dialCode}
                        onChange={(e) => setDialCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        aria-label="Country code"
                        className="w-full rounded-xl border border-border bg-card py-2.5 pl-6 pr-2 font-mono text-sm font-bold text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="9876543210"
                        className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 font-mono text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-foreground">
                    2. Secret Passcode (from FindMyBites)
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="e.g. 7K4M9P"
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 font-mono text-sm font-black uppercase tracking-widest text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Enter the 6-character secret key sent on WhatsApp (letters &amp; numbers, e.g. <span className="font-mono font-bold">7K4M9P</span>).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  {verifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Verify Passcode
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: VERIFIED! CREATE PASSWORD & CLAIM OWNERSHIP */
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs">
                      <p className="font-extrabold text-emerald-900 dark:text-emerald-200">
                        Passcode Verified! Ready to Claim:
                      </p>
                      <p className="mt-0.5 text-sm font-black text-foreground">
                        {verifiedTicket.claim.vendorName}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        Phone verified: ••••{verifiedTicket.claim.phoneLast4}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => void handleClaimWithNewPassword(e)} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-foreground">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Your name or bakery name"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-foreground">
                      Create Your Store Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-10 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-foreground">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={claiming}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {claiming ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Create Password &amp; Claim My Store
                  </button>
                </form>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="bg-background px-2 text-muted-foreground">or instant option</span>
                  </div>
                </div>

                {isInAppBrowser && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                    <strong>Opened inside WhatsApp / Instagram?</strong> Use the green{' '}
                    <strong>Create Password &amp; Claim My Store</strong> button above — it works
                    right inside this browser without needing Google popups.
                  </p>
                )}

                {currentUser && !isAdminUser ? (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => void handleClaimIntoCurrentUser()}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:border-brand disabled:opacity-50"
                  >
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Claim into Signed-In Account ({currentUser.displayName || currentUser.email})
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => void handleClaimWithGoogle()}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:border-brand disabled:opacity-50"
                  >
                    <ShieldCheck className="size-4 text-brand" />
                    Claim Instantly with Google Account
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedTicket(null);
                    setError(null);
                  }}
                  className="w-full cursor-pointer text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  ← Use a different phone or passcode
                </button>
              </div>
            )
          )}

          {/* TAB 2: SIGN IN (GOOGLE OR PHONE + PASSWORD) */}
          {tab === 'login' && (
            <div className="space-y-4">
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-extrabold text-foreground shadow-2xs transition-colors hover:border-brand hover:bg-accent disabled:opacity-60"
              >
                {signingIn ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4 text-brand" />
                )}
                Continue with Google
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-background px-2 text-muted-foreground">
                    or claimed baker login
                  </span>
                </div>
              </div>

              <form onSubmit={(e) => void handlePhonePasswordSignIn(e)} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">
                    Registered Phone Number
                  </label>
                  <div className="flex gap-1.5">
                    <div className="relative w-20">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                        +
                      </span>
                      <input
                        type="text"
                        value={loginDialCode}
                        onChange={(e) =>
                          setLoginDialCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        aria-label="Country code"
                        className="w-full rounded-xl border border-border bg-card py-2.5 pl-6 pr-2 font-mono text-sm font-bold text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <input
                      type="tel"
                      required
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your store password"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-extrabold text-brand-foreground shadow-md hover:bg-brand-hover disabled:opacity-60"
                >
                  {signingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Sign In with Phone &amp; Password
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                Got a passcode from FindMyBites?{' '}
                <button
                  type="button"
                  onClick={() => setTab('claim')}
                  className="cursor-pointer font-bold text-brand hover:underline"
                >
                  Claim your store here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
