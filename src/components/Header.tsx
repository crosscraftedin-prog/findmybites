import type { User } from 'firebase/auth';
import {
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
  onSignIn: () => void;
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
  onSignIn,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        {/* Exact FindMyBites × PimpMyParty dual-badge brand mark */}
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight whitespace-nowrap"
        >
          <span className="relative flex items-center">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <UtensilsCrossed className="size-4" aria-hidden="true" />
            </span>
            <span className="grid size-8 -ml-2 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-sm ring-2 ring-background">
              <PartyPopper className="size-4" aria-hidden="true" />
            </span>
          </span>
          <span className="hidden text-[15px] leading-none sm:block">
            <span className="text-foreground">FindMyBites</span>
            <span className="mx-1 text-muted-foreground">×</span>
            <span className="text-foreground">PimpMyParty</span>
          </span>
        </a>

        {/* Desktop navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          <a
            href="#explore"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap shrink-0"
          >
            Explore
          </a>
          <a
            href="#categories"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap shrink-0"
          >
            Categories
          </a>
          <a
            href="#christmas-special"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-3 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 whitespace-nowrap shrink-0"
          >
            <Snowflake className="size-3.5" aria-hidden="true" />
            Christmas
          </a>
          <a
            href="#featured"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap shrink-0"
          >
            Featured
          </a>
          <button
            type="button"
            onClick={onOpenSaved}
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap shrink-0"
          >
            Saved{savedCount > 0 ? ` (${savedCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenBookings}
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap shrink-0"
          >
            Bookings{bookingsCount > 0 ? ` (${bookingsCount})` : ''}
          </button>
        </nav>

        {/* Right controls: EcosystemToggle + Dark mode + Auth/Portal + List your business */}
        <div className="flex items-center gap-2 shrink-0">
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
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                ecosystem === 'FINDMYBITES'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UtensilsCrossed className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">FindMyBites</span>
              <span className="sm:hidden">Food</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ecosystem === 'PIMPMYPARTY'}
              onClick={() => onChangeEcosystem('PIMPMYPARTY')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                ecosystem === 'PIMPMYPARTY'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PartyPopper className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">PimpMyParty</span>
              <span className="sm:hidden">Events</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shrink-0"
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
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/40 bg-neutral-950 px-2.5 text-xs font-extrabold text-amber-300 shadow-sm transition-colors hover:bg-neutral-900 dark:bg-amber-500/15 dark:text-amber-300 whitespace-nowrap shrink-0"
              title="Open Admin Concierge Panel to create & transfer baker stores"
            >
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Admin Panel</span>
              <span className="md:hidden">Admin</span>
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
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft/60 px-2.5 text-xs font-bold text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand whitespace-nowrap shrink-0"
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
              <span className="hidden sm:inline">
                {myVendorCount > 0 ? `My Storefront (${myVendorCount})` : 'Portal'}
              </span>
            </button>
          ) : (
            <>
              {onOpenClaimStore && (
                <button
                  type="button"
                  onClick={onOpenClaimStore}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300 whitespace-nowrap shrink-0"
                  title="Enter your passcode to claim your pre-built storefront"
                >
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">Claim Store</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand whitespace-nowrap shrink-0"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Sign in</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenListBusiness}
            className="hidden cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover sm:inline-flex whitespace-nowrap shrink-0"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            List your business
          </button>
        </div>
      </div>
    </header>
  );
}
