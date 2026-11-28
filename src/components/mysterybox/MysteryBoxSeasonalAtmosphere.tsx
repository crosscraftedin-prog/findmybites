import type { MysteryBoxSeasonalEdition } from '../../data/mysteryBoxes';
import { getSeasonalEditionPreset } from '../../data/mysteryBoxes';

interface MysteryBoxSeasonalAtmosphereProps {
  edition?: MysteryBoxSeasonalEdition;
  density?: 'section' | 'page';
}

interface FlakeSpec {
  id: number;
  leftPct: number;
  sizePx: number;
  durationSec: number;
  delaySec: number;
  opacity: number;
  driftPx: number;
}

const SNOWFLAKES: FlakeSpec[] = [
  { id: 1, leftPct: 4, sizePx: 5, durationSec: 12, delaySec: -2, opacity: 0.45, driftPx: 18 },
  { id: 2, leftPct: 11, sizePx: 7, durationSec: 15, delaySec: -7, opacity: 0.35, driftPx: -22 },
  { id: 3, leftPct: 18, sizePx: 4, durationSec: 10, delaySec: -4, opacity: 0.5, driftPx: 14 },
  { id: 4, leftPct: 26, sizePx: 6, durationSec: 14, delaySec: -9, opacity: 0.38, driftPx: -16 },
  { id: 5, leftPct: 34, sizePx: 5, durationSec: 11, delaySec: -1, opacity: 0.42, driftPx: 20 },
  { id: 6, leftPct: 43, sizePx: 7, durationSec: 16, delaySec: -6, opacity: 0.32, driftPx: -24 },
  { id: 7, leftPct: 51, sizePx: 4, durationSec: 12, delaySec: -10, opacity: 0.48, driftPx: 16 },
  { id: 8, leftPct: 59, sizePx: 6, durationSec: 15, delaySec: -3, opacity: 0.36, driftPx: -18 },
  { id: 9, leftPct: 67, sizePx: 5, durationSec: 11, delaySec: -8, opacity: 0.44, driftPx: 22 },
  { id: 10, leftPct: 75, sizePx: 7, durationSec: 17, delaySec: -5, opacity: 0.3, driftPx: -20 },
  { id: 11, leftPct: 83, sizePx: 4, durationSec: 10, delaySec: -11, opacity: 0.46, driftPx: 15 },
  { id: 12, leftPct: 91, sizePx: 6, durationSec: 14, delaySec: -2, opacity: 0.38, driftPx: -19 },
  { id: 13, leftPct: 96, sizePx: 5, durationSec: 13, delaySec: -6, opacity: 0.42, driftPx: 12 },
  { id: 14, leftPct: 22, sizePx: 3, durationSec: 9, delaySec: -5, opacity: 0.4, driftPx: 10 },
  { id: 15, leftPct: 63, sizePx: 3, durationSec: 11, delaySec: -7, opacity: 0.42, driftPx: -12 },
  { id: 16, leftPct: 87, sizePx: 3, durationSec: 10, delaySec: -4, opacity: 0.38, driftPx: 14 },
];

const GOLDEN_LIGHTS = [
  { id: 'l1', left: '6%', top: '10px', size: 6, delay: '0s' },
  { id: 'l2', left: '15%', top: '18px', size: 8, delay: '0.7s' },
  { id: 'l3', left: '25%', top: '8px', size: 5, delay: '1.4s' },
  { id: 'l4', left: '36%', top: '20px', size: 7, delay: '0.3s' },
  { id: 'l5', left: '48%', top: '10px', size: 6, delay: '1.1s' },
  { id: 'l6', left: '60%', top: '19px', size: 8, delay: '1.8s' },
  { id: 'l7', left: '72%', top: '9px', size: 5, delay: '0.5s' },
  { id: 'l8', left: '84%', top: '17px', size: 7, delay: '1.3s' },
  { id: 'l9', left: '94%', top: '11px', size: 6, delay: '0.9s' },
];

/**
 * Reusable, compositor-only seasonal festive atmosphere layer.
 * Renders subtle falling snow + warm champagne-gold lights for Christmas Edition,
 * and gracefully scales down or disables when Admin switches to other seasonal editions.
 */
export function MysteryBoxSeasonalAtmosphere({
  edition = 'christmas',
  density = 'page',
}: MysteryBoxSeasonalAtmosphereProps) {
  const preset = getSeasonalEditionPreset(edition);
  if (!preset.enableSnowfall && !preset.enableGoldenLights) {
    return null;
  }

  const flakes = density === 'section' ? SNOWFLAKES.slice(0, 10) : SNOWFLAKES;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <style>{`
        @keyframes fmbSnowFall {
          0% {
            transform: translate3d(0, -16px, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: var(--fmb-flake-opacity, 0.45);
          }
          88% {
            opacity: var(--fmb-flake-opacity, 0.45);
          }
          100% {
            transform: translate3d(var(--fmb-flake-drift, 16px), 105vh, 0) rotate(180deg);
            opacity: 0;
          }
        }
        @keyframes fmbGoldenTwinkle {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fmb-snow-flake,
          .fmb-golden-light {
            animation: none !important;
          }
        }
      `}</style>

      {/* Warm golden ambient holiday glow */}
      {preset.enableGoldenLights && (
        <>
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#D4AF37]/12 blur-3xl dark:bg-[#D4AF37]/15" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#991B1B]/10 blur-3xl dark:bg-[#991B1B]/20" />
          {/* Delicate warm fairy-light string silhouette across the top edge */}
          <svg
            className="absolute inset-x-0 top-0 h-10 w-full opacity-55 dark:opacity-75"
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0,4 Q150,26 300,8 T600,12 T900,10 T1200,6"
              fill="none"
              stroke="rgba(212, 175, 55, 0.45)"
              strokeWidth="1.2"
            />
          </svg>
          {GOLDEN_LIGHTS.map((light) => (
            <span
              key={light.id}
              className="fmb-golden-light absolute rounded-full bg-[#F5D07A]"
              style={{
                left: light.left,
                top: light.top,
                width: light.size,
                height: light.size,
                boxShadow: '0 0 12px 3px rgba(245, 208, 122, 0.55)',
                animation: `fmbGoldenTwinkle 3.6s ease-in-out ${light.delay} infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* Subtle falling snowflakes (compositor-only translate3d + opacity) */}
      {preset.enableSnowfall &&
        flakes.map((flake) => (
          <span
            key={flake.id}
            className="fmb-snow-flake absolute top-0 rounded-full bg-amber-100/90 shadow-[0_0_6px_rgba(255,255,255,0.65)] dark:bg-white/80"
            style={
              {
                left: `${flake.leftPct}%`,
                width: `${flake.sizePx}px`,
                height: `${flake.sizePx}px`,
                ['--fmb-flake-opacity' as string]: flake.opacity,
                ['--fmb-flake-drift' as string]: `${flake.driftPx}px`,
                animation: `fmbSnowFall ${flake.durationSec}s linear ${flake.delaySec}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
