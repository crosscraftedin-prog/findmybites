import {
  LaunchCountry,
  STATES_BY_COUNTRY,
  haversineKm,
} from '../data/vendors';

export interface ResolvedGpsLocation {
  lat: number;
  lng: number;
  country: Exclude<LaunchCountry, 'All'>;
  state: string;
  city: string;
  area: string;
  label: string;
  exactCountryMatched: boolean;
}

const COUNTRY_CODE_MAP: Record<string, Exclude<LaunchCountry, 'All'>> = {
  in: 'India',
  ae: 'Dubai / UAE',
  lk: 'Sri Lanka',
  pk: 'Pakistan',
  bd: 'Bangladesh',
  np: 'Nepal',
};

export function requestBrowserGpsLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Your browser does not support GPS location.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission was denied. You can allow it in your browser or pick your city below.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Location request timed out. Please try again or pick your city.'));
        } else {
          reject(new Error('Could not detect GPS coordinates right now. Please try again or pick your city.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  });
}

function findNearestKnownRegion(lat: number, lng: number): {
  country: Exclude<LaunchCountry, 'All'>;
  state: string;
  city: string;
  distanceKm: number;
} {
  let bestCountry: Exclude<LaunchCountry, 'All'> = 'India';
  let bestState = STATES_BY_COUNTRY.India[0].name;
  let bestCity = STATES_BY_COUNTRY.India[0].cities[0];
  let bestDist = Infinity;

  (Object.keys(STATES_BY_COUNTRY) as Exclude<LaunchCountry, 'All'>[]).forEach((country) => {
    for (const region of STATES_BY_COUNTRY[country]) {
      const d = haversineKm(lat, lng, region.lat, region.lng);
      if (d < bestDist) {
        bestDist = d;
        bestCountry = country;
        bestState = region.name;
        bestCity = region.cities[0];
      }
    }
  });

  return {
    country: bestCountry,
    state: bestState,
    city: bestCity,
    distanceKm: bestDist,
  };
}

function matchStateName(
  country: Exclude<LaunchCountry, 'All'>,
  rawState: string,
  fallbackState: string
): string {
  const clean = rawState.trim().toLowerCase();
  if (!clean) return fallbackState;
  const list = STATES_BY_COUNTRY[country];

  const exact = list.find((s) => s.name.toLowerCase() === clean);
  if (exact) return exact.name;

  const partial = list.find(
    (s) =>
      s.name.toLowerCase().includes(clean) ||
      clean.includes(s.name.toLowerCase()) ||
      s.cities.some((c) => c.toLowerCase() === clean)
  );
  if (partial) return partial.name;

  if (country === 'India' && (clean.includes('delhi') || clean.includes('ncr'))) {
    return 'Delhi NCR';
  }
  return fallbackState;
}

export async function resolveRegionFromCoords(
  lat: number,
  lng: number
): Promise<ResolvedGpsLocation> {
  const nearest = findNearestKnownRegion(lat, lng);

  // Instant fallback values
  let country: Exclude<LaunchCountry, 'All'> = nearest.country;
  let state = nearest.state;
  let city = nearest.city;
  let area = '';
  let exactCountryMatched = nearest.distanceKm <= 600;
  let label = `${city}, ${state}`;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lng))}&zoom=14&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
    );
    window.clearTimeout(timer);

    if (resp.ok) {
      const data = (await resp.json()) as {
        address?: Record<string, string | undefined>;
      };
      const addr = data.address;
      if (addr) {
        const cc = (addr.country_code || '').toLowerCase();
        const mappedCountry = COUNTRY_CODE_MAP[cc];
        const rawCity =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.state_district ||
          addr.county ||
          '';
        const rawArea =
          addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
        const rawState = addr.state || addr.region || '';

        if (mappedCountry) {
          country = mappedCountry;
          exactCountryMatched = true;
          const fallbackForCountry =
            nearest.country === mappedCountry
              ? nearest.state
              : STATES_BY_COUNTRY[mappedCountry][0].name;
          state = matchStateName(mappedCountry, rawState || rawCity, fallbackForCountry);
          city = rawCity || nearest.city;
          area = rawArea && rawArea.toLowerCase() !== city.toLowerCase() ? rawArea : '';
          label = [area, city, state].filter(Boolean).slice(0, 2).join(', ') || `${city}, ${state}`;
        } else {
          exactCountryMatched = false;
          city = rawCity || nearest.city;
          area = rawArea || '';
          label = [rawCity || rawArea, addr.country].filter(Boolean).join(', ') || `${lat}, ${lng}`;
        }
      }
    }
  } catch {
    // Keep offline nearest-region match cleanly
  }

  return {
    lat,
    lng,
    country,
    state,
    city,
    area,
    label,
    exactCountryMatched,
  };
}
