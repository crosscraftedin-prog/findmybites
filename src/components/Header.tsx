import type { User } from 'firebase/auth';
import {
  Briefcase,
  Gift,
  KeyRound,
  LogIn,
  Moon,
  PartyPopper,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Store,
  Sun,
  UtensilsCrossed,
} from 'lucide-react';
import { PWAHeaderInstallButton } from './PWAInstallBanner';

export type Ecosystem = 'FINDMYBITES' | 'PIMPMYPARTY';

interface HeaderProps {
  ecosystem: Ecosystem;
  onChangeEcosystem: (eco: Ecosystem) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  savedCount: number;
  bookingsCount: number;
  user: User | null;
  isAdmin?: boolean;
  pendingTransferCount?: number;
  myVendorCount: number;
  onOpenSaved: () => void;
  onOpenBookings: () => void;
  onOpenListBusiness: () => void;
  onOpenDashboard: () => void;
  onOpenAdminPanel?: () => void;
  onOpenClaimStore?: () => void;
  onOpenBoxAndBite?: () => void;
  onOpenMysteryBoxes?: () => void;
  onSignIn: () => void;
  onNotice?: (message: string) => void;
}

export function Header({
  ecosystem,
  onChangeEcosystem,
  darkMode,
  onToggleDarkMode,
  savedCount,
  bookingsCount,
  user,
  isAdmin,
  pendingTransferCount = 0,
  myVendorCount,
  onOpenSaved,
  onOpenBookings,
  onOpenListBusiness,
  onOpenDashboard,
  onOpenAdminPanel,
  onOpenClaimStore,
  onOpenBoxAndBite,
  onOpenMysteryBoxes,
  onSignIn,
  onNotice,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-1.5 px-3 sm:h-16 sm:gap-2 sm:px-4 lg:px-6">
        {/* Exact FindMyBites × PimpMyParty dual-badge brand mark */}
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight whitespace-nowrap"
        >
          <span className="relative flex items-center">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm sm:size-8">
              <UtensilsCrossed className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
            <span className="grid size-7 -ml-2 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-sm ring-2 ring-background sm:size-8">
              <PartyPopper className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
          </span>
          <span className="hidden text-sm leading-none sm:block 2xl:text-[15px]">
            <span className="text-foreground">FindMyBites</span>
            <span className="hidden 2xl:inline">
              <span className="mx-1 text-muted-foreground">×</span>
              <span className="text-foreground">PimpMyParty</span>
            </span>
          </span>
        </a>

        {/* Desktop & iPad Landscape navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1"
        >
          <a
            href="#explore"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            Explore
          </a>
          <a
            href="#categories"
            className="hidden rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground xl:inline-block xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            Categories
          </a>
          {onOpenMysteryBoxes && (
            <button
              type="button"
              onClick={onOpenMysteryBoxes}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#FF6B35]/12 px-2 py-1.5 text-xs font-extrabold text-[#EA5822] transition-colors hover:bg-[#FF6B35]/20 dark:bg-[#FF6B35]/20 dark:text-[#FF956E] xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
              title="Explore FindMyBites Mystery Boxes"
            >
              <Gift className="size-3.5" aria-hidden="true" />
              Mystery Boxes
            </button>
          )}
          <a
            href="#christmas-special"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-2 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            <Snowflake className="size-3.5" aria-hidden="true" />
            Christmas
          </a>
          <a
            href="#featured"
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground 2xl:inline-block 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            Featured
          </a>
          <button
            type="button"
            onClick={onOpenSaved}
            className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            Saved{savedCount > 0 ? ` (${savedCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenBookings}
            className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground xl:px-2.5 2xl:px-3 2xl:text-sm whitespace-nowrap shrink-0"
          >
            Bookings{bookingsCount > 0 ? ` (${bookingsCount})` : ''}
          </button>
          {onOpenBoxAndBite && (
            <button
              type="button"
              onClick={onOpenBoxAndBite}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#C58B55]/45 bg-[#38231E] px-2 py-1.5 text-xs font-semibold tracking-wide text-[#FFF8EF] transition-colors hover:bg-[#2A1915] xl:px-2.5 whitespace-nowrap shrink-0"
              title="Open BOX & BITE Corporate Gifting"
            >
              <Briefcase className="size-3.5 text-[#C58B55]" aria-hidden="true" />
              BOX &amp; BITE
            </button>
          )}
        </nav>

        {/* Right controls: EcosystemToggle + Dark mode + Auth/Portal + List your business */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div
            role="tablist"
            aria-label="Switch marketplace ecosystem"
            className="inline-flex items-center rounded-full border border-border bg-muted p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={ecosystem === 'FINDMYBITES'}
              onClick={() => onChangeEcosystem('FINDMYBITES')}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs whitespace-nowrap shrink-0 ${
                ecosystem === 'FINDMYBITES'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UtensilsCrossed className="size-3 sm:size-3.5" aria-hidden="true" />
              <span className="hidden 2xl:inline">FindMyBites</span>
              <span className="2xl:hidden">Food</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ecosystem === 'PIMPMYPARTY'}
              onClick={() => onChangeEcosystem('PIMPMYPARTY')}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs whitespace-nowrap shrink-0 ${
                ecosystem === 'PIMPMYPARTY'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PartyPopper className="size-3 sm:size-3.5" aria-hidden="true" />
              <span className="hidden 2xl:inline">PimpMyParty</span>
              <span className="2xl:hidden">Events</span>
            </button>
          </div>

          <PWAHeaderInstallButton onInstalledToast={onNotice} />

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-9 shrink-0"
          >
            {darkMode ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </button>

          {isAdmin && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-amber-500/40 bg-neutral-950 px-2 text-xs font-extrabold text-amber-300 shadow-sm transition-colors hover:bg-neutral-900 dark:bg-amber-500/15 dark:text-amber-300 sm:h-9 sm:gap-1.5 sm:px-2.5 whitespace-nowrap shrink-0"
              title="Open Admin Concierge Panel"
            >
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Admin</span>
              {pendingTransferCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-black leading-none text-neutral-950">
                  {pendingTransferCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft/60 px-2 text-xs font-bold text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand sm:h-9 sm:px-2.5 whitespace-nowrap shrink-0"
              title="Open Vendor Portal & Edit Storefronts"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Account'}
                  referrerPolicy="no-referrer"
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <Store className="size-3.5 text-brand" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {myVendorCount > 0 ? `Portal (${myVendorCount})` : 'Portal'}
              </span>
            </button>
          ) : (
            <>
              {onOpenClaimStore && (
                <button
                  type="button"
                  onClick={onOpenClaimStore}
                  className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300 sm:inline-flex whitespace-nowrap shrink-0"
                  title="Enter your passcode to claim your pre-built storefront"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">Claim</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSignIn}
                aria-label="Sign in"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand sm:h-9 sm:px-3 whitespace-nowrap shrink-0"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Sign in</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenListBusiness}
            className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-2.5 text-xs font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover sm:inline-flex xl:px-3 whitespace-nowrap shrink-0"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span className="hidden 2xl:inline">List Business</span>
            <span className="2xl:hidden">List Store</span>
          </button>
        </div>
      </div>

      {/* Compact iPad / Tablet quick-jump bar (visible between sm and lg when desktop nav is hidden) */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 bg-background/70 px-3 py-1.5 text-xs lg:hidden">
        <a
          href="#explore"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground hover:border-brand"
        >
          Explore
        </a>
        <a
          href="#categories"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground hover:border-brand"
        >
          Categories
        </a>
        {onOpenMysteryBoxes && (
          <button
            type="button"
            onClick={onOpenMysteryBoxes}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#FF6B35]/40 bg-[#FF6B35] px-3 py-1 font-extrabold text-white"
          >
            <Gift className="size-3" aria-hidden="true" />
            Mystery Boxes
          </button>
        )}
        <a
          href="#christmas-special"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-300"
        >
          <Snowflake className="size-3" aria-hidden="true" />
          Christmas
        </a>
        {onOpenBoxAndBite && (
          <button
            type="button"
            onClick={onOpenBoxAndBite}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[#C58B55]/45 bg-[#38231E] px-3 py-1 font-semibold text-[#FFF8EF]"
          >
            <Briefcase className="size-3 text-[#C58B55]" aria-hidden="true" />
            BOX &amp; BITE
          </button>
        )}
        <button
          type="button"
          onClick={onOpenBookings}
          className="shrink-0 cursor-pointer rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground hover:border-brand"
        >
          Bookings{bookingsCount > 0 ? ` (${bookingsCount})` : ''}
        </button>
        {!user && onOpenClaimStore && (
          <button
            type="button"
            onClick={onOpenClaimStore}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-700 dark:text-emerald-300 sm:hidden"
          >
            <KeyRound className="size-3" aria-hidden="true" />
            Claim Store
          </button>
        )}
      </div>
    </header>
  );
}
