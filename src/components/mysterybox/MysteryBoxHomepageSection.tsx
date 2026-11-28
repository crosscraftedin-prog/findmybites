import { ArrowRight, Gift, Lock, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import {
  DEFAULT_MARKETING_CONFIG,
  DEFAULT_MYSTERY_BOX_PACKAGES,
  type MysteryBoxMarketingConfig,
  type MysteryBoxPackage,
  type MysteryBoxSeasonalEdition,
  formatInr,
  getSeasonalEditionPreset,
} from '../../data/mysteryBoxes';
import { getMysteryBoxHeroImage, resolveMysteryBoxImage } from '../../data/mysteryBoxImages';
import { MysteryBoxSeasonalAtmosphere } from './MysteryBoxSeasonalAtmosphere';
import { getSeasonalThemeClasses } from './seasonalThemeStyles';

interface MysteryBoxHomepageSectionProps {
  packages: MysteryBoxPackage[];
  marketing?: MysteryBoxMarketingConfig | null;
  onExploreMysteryBoxes: (packageId?: string) => void;
  onOpenMyMysteryBoxes: () => void;
}

const CHRISTMAS_HIGHLIGHTS = [
  'Luxury sealed Christmas red, forest green & gold packaging.',
  '100% opaque closed boxes—never spoils what is inside.',
  'Personal gift tag & ribbon presentation ready for gifting.',
  'Interactive digital unboxing unlocks right after payment.',
];

const CLASSIC_HIGHLIGHTS = [
  'A surprise in every sealed box.',
  'You know the price and item count—never what is inside.',
  'The perfect gift for someone special.',
  "More than a gift. It's an unboxing experience.",
];

export function MysteryBoxHomepageSection({
  packages,
  marketing,
  onExploreMysteryBoxes,
  onOpenMyMysteryBoxes,
}: MysteryBoxHomepageSectionProps) {
  const activeMarketing = marketing || DEFAULT_MARKETING_CONFIG;
  const edition: MysteryBoxSeasonalEdition = activeMarketing.seasonalEdition || 'christmas';
  const preset = getSeasonalEditionPreset(edition);
  const theme = getSeasonalThemeClasses(edition);
  const heroImage = getMysteryBoxHeroImage(edition);

  const displayPackages = (packages.length > 0 ? packages : DEFAULT_MYSTERY_BOX_PACKAGES)
    .filter((p) => p.active !== false)
    .slice(0, 5);

  const highlights = theme.isChristmas ? CHRISTMAS_HIGHLIGHTS : CLASSIC_HIGHLIGHTS;

  return (
    <section
      id="mystery-boxes"
      aria-labelledby="mystery-boxes-heading"
      className={`relative overflow-hidden py-16 sm:py-20 ${theme.sectionBg}`}
    >
      <MysteryBoxSeasonalAtmosphere edition={edition} density="section" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Campaign Split Hero */}
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${theme.heroEyebrow}`}>
              {preset.eyebrow}
            </p>
            <h2
              id="mystery-boxes-heading"
              className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-[#FAF6EE] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]"
            >
              {activeMarketing.campaignHeadline || preset.campaignHeadline}
            </h2>
            <p className={`mt-3 text-base font-bold sm:text-lg ${theme.heroQuote}`}>
              &ldquo;{activeMarketing.campaignTagline || preset.campaignTagline}&rdquo;
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-700 dark:text-[#DDD4C2]">
              {activeMarketing.campaignSubheading || preset.campaignSubheading}
            </p>

            <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-neutral-700 dark:text-[#DDD4C2] sm:grid-cols-2">
              {highlights.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Sparkles
                    className={`mt-0.5 size-3.5 shrink-0 ${
                      theme.isChristmas ? 'text-[#C89B3C] dark:text-[#E5C068]' : 'text-[#FF6B35]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onExploreMysteryBoxes()}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold tracking-wide transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0 ${theme.primaryButton}`}
              >
                <Gift className="size-4" aria-hidden="true" />
                {preset.ctaLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenMyMysteryBoxes}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${theme.secondaryButton}`}
              >
                Unwrap / Track My Box
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-600 dark:text-[#C5BBA7]">
              <span className="inline-flex items-center gap-1.5">
                <Lock className={`size-3.5 ${theme.lockIconColor}`} aria-hidden="true" />
                100% Sealed Mystery Until Checkout
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className={`size-3.5 ${
                    theme.isChristmas ? 'text-[#14532D] dark:text-[#E5C068]' : 'text-[#FF6B35]'
                  }`}
                  aria-hidden="true"
                />
                Guaranteed higher retail value
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className={`size-3.5 ${theme.lockIconColor}`} aria-hidden="true" />
                Hyderabad scheduled delivery
              </span>
            </div>
          </div>

          {/* Sealed-Only Holiday Gift Box Showcase */}
          <div className="lg:col-span-6">
            <div
              className={`group relative overflow-hidden rounded-2xl shadow-lg ${theme.cardSurface}`}
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#14261E]">
                <img
                  src={heroImage}
                  referrerPolicy="no-referrer"
                  alt={
                    theme.isChristmas
                      ? 'Closed luxury FindMyBites Christmas Special Edition mystery gift boxes wrapped in satin ribbons'
                      : 'Closed and ribbon-sealed FindMyBites Mystery Gift Box'
                  }
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 ${
                  theme.isChristmas
                    ? 'border-[#E6D6BC] bg-[#FFFDF9] dark:border-[#244236] dark:bg-[#11221B]'
                    : 'border-[#F0E3D6] bg-white dark:border-purple-900/40 dark:bg-[#1D1526]'
                }`}
              >
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${theme.cardCategoryText}`}>
                    {theme.isChristmas
                      ? 'Christmas Gift Packaging · Unwrap Online After Payment'
                      : 'Sealed Mystery Packaging · Unwrap Online After Payment'}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-[#C5BBA7]">
                    5 sealed mystery tiers from {formatInr(displayPackages[0]?.priceInr || 499)} to{' '}
                    {formatInr(displayPackages[displayPackages.length - 1]?.priceInr || 2999)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onExploreMysteryBoxes()}
                  className={`cursor-pointer text-xs font-extrabold hover:underline whitespace-nowrap shrink-0 ${theme.cardTaglineText}`}
                >
                  Pick a mystery box →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Signature Sealed Christmas / Seasonal Mystery Box Preview Row */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {displayPackages.map((pkg) => {
            const imgSrc = resolveMysteryBoxImage(pkg.image, 'celebration', edition);
            const outOfStock = !pkg.deliveryAvailable || pkg.stockCount <= 0;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onExploreMysteryBoxes(pkg.id)}
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${theme.cardSurface} ${theme.cardHoverBorder}`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1A2922]">
                  <img
                    src={imgSrc}
                    referrerPolicy="no-referrer"
                    alt={`Closed sealed ${pkg.name} ${theme.isChristmas ? 'Christmas gift box' : 'mystery gift box'}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  {outOfStock && (
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-neutral-950/85 px-2 py-0.5 text-[11px] font-bold text-white">
                      Sold Out
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${theme.cardCategoryText}`}>
                    Mystery
                  </p>
                  <h3 className="mt-1 text-base font-bold text-neutral-950 dark:text-[#FAF6EE]">
                    {pkg.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600 dark:text-[#CFC5B1]">
                    {pkg.tagline}
                  </p>
                  <div className="mt-auto pt-3">
                    <p className="text-xs text-neutral-500 dark:text-[#AFA692]">
                      {pkg.minGoodiesCount}+ items inside · Worth {formatInr(pkg.guaranteedMinValueInr)}+
                    </p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="text-lg font-extrabold tabular-nums text-neutral-950 dark:text-[#FAF6EE]">
                        {formatInr(pkg.priceInr)}
                      </span>
                      <span
                        className={`text-xs font-bold transition-transform group-hover:translate-x-0.5 ${theme.cardTaglineText}`}
                      >
                        Buy &amp; Unwrap →
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
