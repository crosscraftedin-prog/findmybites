import { FormEvent, useEffect, useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import {
  COUNTRY_REGION_LABEL,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  STATES_BY_COUNTRY,
} from '../data/vendors';

export interface SelectedLocation {
  country: Exclude<LaunchCountry, 'All'>;
  state: string;
  city: string;
  lat: number;
  lng: number;
  label: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  defaultCountry?: Exclude<LaunchCountry, 'All'>;
  onClose: () => void;
  onSelectLocation: (loc: SelectedLocation) => void;
}

export function LocationPickerModal({
  isOpen,
  defaultCountry = 'India',
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>(defaultCountry);
  const statesForCountry = STATES_BY_COUNTRY[country];
  const [selectedStateName, setSelectedStateName] = useState<string>(statesForCountry[0].name);
  const [selectedCity, setSelectedCity] = useState<string>(statesForCountry[0].cities[0]);
  const [customArea, setCustomArea] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCountry(defaultCountry);
    const initialStates = STATES_BY_COUNTRY[defaultCountry];
    setSelectedStateName(initialStates[0].name);
    setSelectedCity(initialStates[0].cities[0]);
    setCustomArea('');
  }, [isOpen, defaultCountry]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeStateObj =
    statesForCountry.find((s) => s.name === selectedStateName) ?? statesForCountry[0];

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    const list = STATES_BY_COUNTRY[nextCountry];
    setSelectedStateName(list[0].name);
    setSelectedCity(list[0].cities[0]);
    setCustomArea('');
  };

  const handleStateChange = (stateName: string) => {
    setSelectedStateName(stateName);
    const found = statesForCountry.find((s) => s.name === stateName);
    if (found) {
      setSelectedCity(found.cities[0]);
    }
  };

  const handleConfirm = (e: FormEvent) => {
    e.preventDefault();
    const cityFinal = customArea.trim() || selectedCity;
    onSelectLocation({
      country,
      state: activeStateObj.name,
      city: cityFinal,
      lat: activeStateObj.lat,
      lng: activeStateObj.lng,
      label: `${cityFinal}, ${activeStateObj.name}`,
    });
    onClose();
  };

  const regionLabel = COUNTRY_REGION_LABEL[country];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your country, state, and city"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Navigation className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                Choose Your Location
              </h2>
              <p className="text-xs text-muted-foreground">
                Select your Country, {regionLabel} &amp; City to see local vendors near you
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close location picker"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-5 p-6">
          {/* Step 1: Country */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              1. Country
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LAUNCH_COUNTRIES.filter((c): c is Exclude<LaunchCountry, 'All'> => c !== 'All').map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCountryChange(c)}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      country === c
                        ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                        : 'border-border bg-background text-foreground hover:border-brand'
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Step 2: State / Emirate / Province */}
          <div>
            <label
              htmlFor="loc-state"
              className="block text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              2. {regionLabel} in {country}
            </label>
            <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {statesForCountry.map((st) => {
                const active = st.name === activeStateObj.name;
                return (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => handleStateChange(st.name)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      active
                        ? 'border-brand bg-brand-soft text-brand-soft-foreground'
                        : 'border-border bg-background text-foreground hover:border-brand/60'
                    }`}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: City or Neighbourhood */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              3. City or Area in {activeStateObj.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeStateObj.cities.map((c) => {
                const active = selectedCity === c && !customArea.trim();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCity(c);
                      setCustomArea('');
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background text-foreground hover:border-brand'
                    }`}
                  >
                    <MapPin className="size-3" aria-hidden="true" />
                    {c}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder={`Or type your exact town, area, or pincode in ${activeStateObj.name}…`}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-foreground shadow-sm hover:bg-brand-hover sm:text-sm"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Show Vendors in {customArea.trim() || selectedCity}, {activeStateObj.name}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
