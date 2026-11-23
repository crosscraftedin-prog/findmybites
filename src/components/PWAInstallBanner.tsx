import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

type GuideMode = 'ios' | 'android' | null;

interface InstallGuideModalProps {
  mode: GuideMode;
  isIOSSafari: boolean;
  onClose: () => void;
}

function InstallGuideModal({ mode, isIOSSafari, onClose }: InstallGuideModalProps) {
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#ef6c22]/12 via-[#e11d74]/10 to-[#a21caf]/12 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="FindMyBites App Icon"
              className="size-11 rounded-xl shadow-sm ring-1 ring-black/10"
            />
            <div>
              <h3
                id="pwa-install-guide-title"
                className="text-base font-extrabold tracking-tight text-foreground"
              >
                {isIosGuide ? 'Install FindMyBites on iPhone' : 'Install FindMyBites on Android'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Instant app access from your Home Screen — free, no App Store needed
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

        {/* Body */}
        <div className="space-y-3.5 px-5 py-4">
          {isIosGuide && !isIOSSafari && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <strong>Tip:</strong> On iPhone, Home Screen installation works in{' '}
              <strong>Safari</strong>. If you opened this link from WhatsApp, Instagram, or Chrome,
              tap the menu icon and choose <strong>Open in Safari</strong> first.
            </div>
          )}

          {isIosGuide ? (
            <ol className="space-y-3">
              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  1
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex items-center gap-1.5 font-bold">
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
                  <div className="flex items-center gap-1.5 font-bold">
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
                  <div className="flex items-center gap-1.5 font-bold">
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
          ) : (
            <ol className="space-y-3">
              <li className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
                  1
                </span>
                <div className="flex-1 text-sm leading-snug text-foreground">
                  <div className="flex items-center gap-1.5 font-bold">
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
                  <div className="flex items-center gap-1.5 font-bold">
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
        <div className="border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

interface PWAInstallBannerProps {
  onInstalledToast?: (msg: string) => void;
}

/**
 * Top mobile app download banner (Android 1-tap Download button + iPhone Add to Home Screen guide).
 * Automatically hides when already running in standalone installed PWA mode.
 */
export function PWAInstallBanner({ onInstalledToast }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, isIOS, isIOSSafari, isAndroid, isMobile, install } =
    usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fmb_pwa_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [guideMode, setGuideMode] = useState<GuideMode>(null);
  const [installing, setInstalling] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Show at the top whenever opened on a mobile device (Android or iPhone/iPad), or when native install prompt is available
  const shouldShow = isIOS || isAndroid || isMobile || isInstallable;
  if (!shouldShow) {
    return null;
  }

  const handleAndroidOrNativeInstall = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'accepted') {
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

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('fmb_pwa_banner_dismissed', '1');
    } catch {
      // ignore storage restrictions
    }
  };

  return (
    <>
      <div className="relative z-[60] border-b border-orange-500/25 bg-gradient-to-r from-[#1a1210] via-[#2b1815] to-[#1f1224] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-3 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="FindMyBites App"
              className="size-9 shrink-0 rounded-xl shadow-sm ring-1 ring-white/20"
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
                <span>{installing ? 'Opening…' : 'Download App'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss app download banner"
              className="grid size-7 cursor-pointer place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <InstallGuideModal
        mode={guideMode}
        isIOSSafari={isIOSSafari}
        onClose={() => setGuideMode(null)}
      />
    </>
  );
}

/**
 * Compact header button so users on Android, iPhone, or Desktop Chrome can still install
 * the app even after closing the top banner.
 */
export function PWAHeaderInstallButton({ onInstalledToast }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, isIOS, isIOSSafari, isAndroid, install } = usePWAInstall();
  const [guideMode, setGuideMode] = useState<GuideMode>(null);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS && !isAndroid) return null;

  const handleClick = async () => {
    if (isIOS) {
      setGuideMode('ios');
      return;
    }
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        onInstalledToast?.('FindMyBites app installed!');
      } else if (outcome === 'unavailable') {
        setGuideMode('android');
      }
      return;
    }
    setGuideMode('android');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        title={isIOS ? 'How to install FindMyBites on iPhone' : 'Download FindMyBites App'}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft/70 px-2.5 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-brand-foreground whitespace-nowrap shrink-0"
      >
        {isIOS ? (
          <Smartphone className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden xl:inline">{isIOS ? 'iOS App' : 'Get App'}</span>
      </button>

      <InstallGuideModal
        mode={guideMode}
        isIOSSafari={isIOSSafari}
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
