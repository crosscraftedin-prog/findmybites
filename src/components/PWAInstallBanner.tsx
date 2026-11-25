import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

type GuideMode = 'ios' | 'android' | null;

const POPUP_DISMISS_KEY = 'fmb_pwa_popup_dismissed_at';
const POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function wasPopupRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(POPUP_DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < POPUP_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markPopupDismissed(): void {
  try {
    localStorage.setItem(POPUP_DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore storage restrictions
  }
}

function isClaimLinkOpen(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get('claim') || params.get('claimStore'));
}

interface InstallGuideModalProps {
  mode: GuideMode;
  isIOSSafari: boolean;
  isInAppBrowser: boolean;
  isInstallable: boolean;
  installing: boolean;
  onNativeInstall?: () => void;
  onClose: () => void;
}

function InstallGuideModal({
  mode,
  isIOSSafari,
  isInAppBrowser,
  isInstallable,
  installing,
  onNativeInstall,
  onClose,
}: InstallGuideModalProps) {
  if (!mode) return null;

  const isIosGuide = mode === 'ios';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#ef6c22]/12 via-[#e11d74]/10 to-[#a21caf]/12 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png?v=2"
              alt="FindMyBites App Icon"
              className="size-12 rounded-2xl bg-white p-0.5 shadow-sm ring-1 ring-black/10"
            />
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles className="size-2.5" aria-hidden="true" />
                {isIosGuide ? 'iPhone & iPad App' : 'Android App · Free'}
              </span>
              <h3
                id="pwa-install-guide-title"
                className="mt-0.5 text-base font-extrabold tracking-tight text-foreground"
              >
                {isIosGuide ? 'Install FindMyBites on iPhone' : 'Install FindMyBites App'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Instant access from your Home Screen — no App Store needed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
          {isIosGuide && !isIOSSafari && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <strong>Tip:</strong> On iPhone, Home Screen installation works in{' '}
              <strong>Safari</strong>. If you opened this link from WhatsApp, Instagram, or Chrome,
              tap the menu icon and choose <strong>Open in Safari</strong> first.
            </div>
          )}

          {!isIosGuide && isInAppBrowser && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <strong>Tip:</strong> You are viewing inside WhatsApp / Instagram. Tap the top-right{' '}
              <strong>⋮</strong> menu and choose <strong>Open in Chrome</strong> for 1-tap app
              installation.
            </div>
          )}

          {isIosGuide ? (
            <ol className="space-y-2.5">
              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  1
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>Tap the Share button</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Share className="size-3.5" aria-hidden="true" />
                      Share
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Located at the bottom center of your Safari toolbar (or top-right on iPad).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  2
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>Scroll &amp; tap</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">
                      <PlusSquare className="size-3.5 text-brand" aria-hidden="true" />
                      Add to Home Screen
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Scroll down the Share sheet options until you see Add to Home Screen.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-extrabold text-white">
                  3
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>Tap</span>
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                      Add
                    </span>
                    <span>at the top right</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    FindMyBites will appear right on your iPhone Home Screen like a native app.
                  </p>
                </div>
              </li>
            </ol>
          ) : isInstallable && onNativeInstall ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/35 p-3.5">
                <ul className="space-y-2 text-xs font-medium text-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>1-tap FindMyBites icon right on your Home Screen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>Faster browsing of local bakers, live counters &amp; party decor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>Instant direct WhatsApp ordering · Lightweight (&lt;1 MB)</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                disabled={installing}
                onClick={onNativeInstall}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ef6c22] to-[#e11d74] py-3 text-sm font-extrabold text-white shadow-md transition-transform active:scale-[0.98] hover:brightness-110 disabled:opacity-65"
              >
                <Download className="size-4 shrink-0" aria-hidden="true" />
                <span>{installing ? 'Opening Installer…' : 'Install FindMyBites App'}</span>
              </button>
            </div>
          ) : (
            <ol className="space-y-2.5">
              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  1
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>Tap the browser menu</span>
                    <span className="inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">
                      <MoreVertical className="size-3.5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    In Chrome on Android, tap the three dots in the top-right corner. If you opened
                    this inside WhatsApp or Instagram, tap <strong>Open in Chrome</strong> first.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  2
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex flex-wrap items-center gap-1.5 font-bold">
                    <span>Tap</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">
                      <Download className="size-3.5 text-brand" aria-hidden="true" />
                      Install app
                    </span>
                    <span>or</span>
                    <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">
                      Add to Home screen
                    </span>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-extrabold text-white">
                  3
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                    <span>Confirm Install</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The FindMyBites app icon will be added directly to your Android home screen and
                    app drawer.
                  </p>
                </div>
              </li>
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-muted/30 px-5 py-3">
          {!isIosGuide && isInstallable && onNativeInstall ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full cursor-pointer rounded-xl py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Not now
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PWAInstallBannerProps {
  onInstalledToast?: (msg: string) => void;
}

/**
 * Top mobile app download banner + automatic install popup for Android & iOS visitors.
 * Automatically hides when already running in standalone installed PWA mode.
 */
export function PWAInstallBanner({ onInstalledToast }: PWAInstallBannerProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isIOSSafari,
    isAndroid,
    isInAppBrowser,
    isMobile,
    install,
  } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fmb_pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [guideMode, setGuideMode] = useState<GuideMode>(null);
  const [installing, setInstalling] = useState(false);

  // Automatically pop up the install prompt/guide for Android & iOS mobile users
  useEffect(() => {
    if (isInstalled) return;
    if (!isIOS && !isAndroid && !isMobile) return;
    if (isClaimLinkOpen()) return;
    if (wasPopupRecentlyDismissed()) return;

    const timer = window.setTimeout(() => {
      setGuideMode((prev) => prev ?? (isIOS ? 'ios' : 'android'));
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isInstalled, isIOS, isAndroid, isMobile]);

  // Close popup automatically if app finishes installing
  useEffect(() => {
    if (isInstalled && guideMode) {
      setGuideMode(null);
    }
  }, [isInstalled, guideMode]);

  if (isInstalled) {
    return null;
  }

  const shouldShowBanner = !dismissed && (isIOS || isAndroid || isMobile || isInstallable);

  const handleAndroidOrNativeInstall = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'accepted') {
          setGuideMode(null);
          markPopupDismissed();
          onInstalledToast?.('FindMyBites app installed! Find it on your home screen.');
        } else if (outcome === 'unavailable') {
          setGuideMode('android');
        }
      } finally {
        setInstalling(false);
      }
      return;
    }
    setGuideMode('android');
  };

  const handleDismissBanner = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('fmb_pwa_banner_dismissed', '1');
    } catch {
      // ignore storage restrictions
    }
  };

  const handleCloseGuide = () => {
    setGuideMode(null);
    markPopupDismissed();
  };

  if (!shouldShowBanner && !guideMode) {
    return null;
  }

  return (
    <>
      {shouldShowBanner && (
        <div className="relative z-[60] border-b border-orange-500/25 bg-gradient-to-r from-[#1a1210] via-[#2b1815] to-[#1f1224] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-3 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/pwa-192x192.png?v=2"
                alt="FindMyBites App"
                className="size-9 shrink-0 rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-white/20"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold leading-tight text-white sm:text-sm">
                  {isIOS ? 'Install FindMyBites on iPhone' : 'Get the FindMyBites App'}
                </p>
                <p className="truncate text-[11px] leading-tight text-white/75">
                  {isIOS
                    ? 'Tap Share → Add to Home Screen for instant access'
                    : '1-tap download for Android · Faster local discovery'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isIOS ? (
                <button
                  type="button"
                  onClick={() => setGuideMode('ios')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ef6c22] to-[#e11d74] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:brightness-110"
                >
                  <Share className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>How to Install</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={installing}
                  onClick={() => void handleAndroidOrNativeInstall()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ef6c22] to-[#e11d74] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-transform active:scale-95 hover:brightness-110 disabled:opacity-65"
                >
                  <Download className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{installing ? 'Opening…' : 'Install App'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismissBanner}
                aria-label="Dismiss app download banner"
                className="grid size-7 cursor-pointer place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <InstallGuideModal
        mode={guideMode}
        isIOSSafari={isIOSSafari}
        isInAppBrowser={isInAppBrowser}
        isInstallable={isInstallable}
        installing={installing}
        onNativeInstall={() => void handleAndroidOrNativeInstall()}
        onClose={handleCloseGuide}
      />
    </>
  );
}

/**
 * Compact header button so users on Android, iPhone, or Desktop Chrome can still install
 * the app even after closing the top banner or popup.
 */
export function PWAHeaderInstallButton({ onInstalledToast }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, isIOS, isIOSSafari, isAndroid, isInAppBrowser, install } =
    usePWAInstall();
  const [guideMode, setGuideMode] = useState<GuideMode>(null);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS && !isAndroid) return null;

  const handleNativeInstall = async () => {
    if (!isInstallable) {
      setGuideMode('android');
      return;
    }
    setInstalling(true);
    try {
      const outcome = await install();
      if (outcome === 'accepted') {
        setGuideMode(null);
        onInstalledToast?.('FindMyBites app installed!');
      } else if (outcome === 'unavailable') {
        setGuideMode('android');
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleClick = async () => {
    if (isIOS) {
      setGuideMode('ios');
      return;
    }
    await handleNativeInstall();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={isIOS ? 'Install iOS App' : 'Get FindMyBites App'}
        title={isIOS ? 'How to install FindMyBites on iPhone' : 'Install FindMyBites App'}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft/70 px-2 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-brand-foreground sm:h-9 sm:px-2.5 whitespace-nowrap shrink-0"
      >
        {isIOS ? (
          <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden 2xl:inline">{isIOS ? 'iOS App' : 'Get App'}</span>
      </button>

      <InstallGuideModal
        mode={guideMode}
        isIOSSafari={isIOSSafari}
        isInAppBrowser={isInAppBrowser}
        isInstallable={isInstallable}
        installing={installing}
        onNativeInstall={() => void handleNativeInstall()}
        onClose={() => setGuideMode(null)}
      />
    </>
  );
}

/**
 * Subtle offline banner shown ONLY when the device loses network connectivity.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-600/40 bg-amber-500 px-3.5 py-2 text-xs font-bold text-neutral-950 shadow-lg lg:bottom-5"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      <span>Offline Mode — Showing cached storefronts</span>
    </div>
  );
}
