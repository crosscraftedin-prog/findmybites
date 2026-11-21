import { Check, Globe2, MapPin } from 'lucide-react';
import {
  COUNTRY_REGION_LABEL,
  LaunchCountry,
  STATES_BY_COUNTRY,
} from '../data/vendors';

const INDIA_ZONES: Record<string, string[]> = {
  'South India': ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Puducherry', 'Goa'],
  'West India': ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa', 'Madhya Pradesh'],
  'North India': [
    'Delhi NCR',
    'Uttar Pradesh',
    'Punjab & Chandigarh',
    'Haryana',
    'Uttarakhand',
    'Himachal Pradesh',
    'Jammu & Kashmir',
  ],
  'East & NE': [
    'West Bengal',
    'Odisha',
    'Bihar',
    'Jharkhand',
    'Chhattisgarh',
    'Assam',
    'Meghalaya',
    'Tripura',
    'Manipur',
    'Nagaland',
    'Mizoram',
    'Arunachal Pradesh',
    'Sikkim',
  ],
};

interface StateCoveragePickerProps {
  country: Exclude<LaunchCountry, 'All'>;
  primaryState: string;
  allStatesCoverage: boolean;
  serviceStates: string[];
  onChangeAllStates: (next: boolean) => void;
  onChangeServiceStates: (next: string[]) => void;
  compact?: boolean;
}

export function StateCoveragePicker({
  country,
  primaryState,
  allStatesCoverage,
  serviceStates,
  onChangeAllStates,
  onChangeServiceStates,
  compact = false,
}: StateCoveragePickerProps) {
  const allRegions = STATES_BY_COUNTRY[country] || [];
  const regionLabel = COUNTRY_REGION_LABEL[country] || 'State';
  const panLabel = country === 'India' ? 'Pan-India (All States & UTs)' : `All ${country} ${regionLabel}s`;

  const selectedSet = new Set<string>([primaryState, ...serviceStates].filter(Boolean));

  const toggleState = (stateName: string) => {
    if (stateName === primaryState) return; // HQ state is always included
    if (allStatesCoverage) {
      // Switching from Pan-India to custom list minus the clicked state
      const allMinusClicked = allRegions
        .map((r) => r.name)
        .filter((name) => name !== primaryState && name !== stateName);
      onChangeAllStates(false);
      onChangeServiceStates(allMinusClicked);
      return;
    }
    const next = serviceStates.includes(stateName)
      ? serviceStates.filter((s) => s !== stateName)
      : [...serviceStates, stateName];
    onChangeServiceStates(next);
  };

  const applyIndiaZone = (zoneName: string) => {
    const zoneStates = INDIA_ZONES[zoneName] || [];
    const merged = Array.from(
      new Set([...serviceStates, ...zoneStates].filter((s) => s && s !== primaryState))
    );
    onChangeAllStates(false);
    onChangeServiceStates(merged);
  };

  const coveredCount = allStatesCoverage ? allRegions.length : selectedSet.size;

  return (
    <div
      className={`rounded-xl border border-indigo-500/30 bg-indigo-500/5 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
            <Globe2 className="size-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Multi-{regionLabel} Storefront Visibility (Admin Outsourcing / Pan-India)
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Choose where this store shows up in search, {regionLabel.toLowerCase()} filters &amp; SEO city pages.
            Currently visible in{' '}
            <strong className="text-foreground">
              {allStatesCoverage
                ? `all ${allRegions.length} ${country} ${regionLabel.toLowerCase()}s`
                : `${coveredCount} ${coveredCount === 1 ? regionLabel.toLowerCase() : `${regionLabel.toLowerCase()}s`}`}
            </strong>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !allStatesCoverage;
            onChangeAllStates(next);
            if (next) {
              onChangeServiceStates([]);
            }
          }}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition-colors ${
            allStatesCoverage
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
              : 'border-indigo-500/40 bg-background text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40'
          }`}
        >
          <Globe2 className="size-3.5" aria-hidden="true" />
          {allStatesCoverage ? `✓ ${panLabel} ON` : `Enable ${panLabel}`}
        </button>
      </div>

      {/* Quick Zone Presets for India */}
      {country === 'India' && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quick Add:
          </span>
          {Object.keys(INDIA_ZONES).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => applyIndiaZone(zone)}
              className="cursor-pointer rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              + {zone}
            </button>
          ))}
          {(allStatesCoverage || serviceStates.length > 0) && (
            <button
              type="button"
              onClick={() => {
                onChangeAllStates(false);
                onChangeServiceStates([]);
              }}
              className="cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10"
            >
              Reset to HQ Only ({primaryState})
            </button>
          )}
        </div>
      )}

      {/* Individual State Selection Grid */}
      <div className="mt-3 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
        {allRegions.map((region) => {
          const isPrimary = region.name === primaryState;
          const isChecked = isPrimary || allStatesCoverage || serviceStates.includes(region.name);
          return (
            <button
              key={region.name}
              type="button"
              disabled={isPrimary}
              onClick={() => toggleState(region.name)}
              title={
                isPrimary
                  ? `Primary HQ ${regionLabel}`
                  : isChecked
                    ? `Remove ${region.name}`
                    : `Show storefront in ${region.name}`
              }
              className={`flex items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                isPrimary
                  ? 'cursor-default border-brand/50 bg-brand-soft/60 text-foreground'
                  : isChecked
                    ? 'cursor-pointer border-emerald-600/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'cursor-pointer border-border bg-background text-muted-foreground hover:border-indigo-400 hover:text-foreground'
              }`}
            >
              <span className="truncate">{region.name}</span>
              {isPrimary ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-brand px-1 py-0.5 text-[9px] font-extrabold text-brand-foreground">
                  <MapPin className="size-2.5" aria-hidden="true" />
                  HQ
                </span>
              ) : isChecked ? (
                <Check className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
