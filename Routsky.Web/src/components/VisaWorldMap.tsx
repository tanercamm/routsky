import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getGlobalVisaMap } from '../api/routskyApi';
import { useAuth } from '../context/AuthContext';
import type { GlobalVisaCountryStatus, VisaMapStatus } from '../types';

/**
 * Low-res Natural Earth (Admin 0) GeoJSON.
 * ~300 KB, cached by the CDN, has both ISO alpha-2 and alpha-3 in properties.
 * Properties of interest: ISO_A2_EH, ISO_A2, ISO_A3_EH, ISO_A3, NAME, ADMIN.
 */
const GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

const STATUS_COLORS: Record<VisaMapStatus, string> = {
  VisaFree: '#00E676',
  EVisaOrOnArrival: '#FFEA00',
  ConditionalOrTimeLimited: '#FF9100',
  VisaRequired: '#FF1744',
  BannedOrRefused: '#111111',
  Unknown: '#2E3A52',
};

/** Distinct color applied to the active passport's home country. */
const HOME_FILL = '#38BDF8';

const STATUS_LABELS: Record<VisaMapStatus, string> = {
  VisaFree: 'Visa-Free',
  EVisaOrOnArrival: 'e-Visa / On Arrival',
  ConditionalOrTimeLimited: 'Conditional',
  VisaRequired: 'Visa Required',
  BannedOrRefused: 'Banned / Refused',
  Unknown: 'Unknown',
};

type CountryFeature = Feature<Geometry, GeoJsonProperties>;

interface TooltipState {
  x: number;
  y: number;
  countryName: string;
  status: VisaMapStatus;
}

/** Minimal alpha-3 → alpha-2 fallback for countries where Natural Earth's ISO_A2 is missing/"-99". */
const ISO_A3_TO_A2_FALLBACK: Record<string, string> = {
  FRA: 'FR',
  NOR: 'NO',
  KOS: 'XK',
  SOL: 'SO',
  CYN: 'CY',
  SAH: 'EH',
};

/** Extract an uppercase ISO alpha-2 code from a GeoJSON feature, trying every known property shape. */
function getCountryCode(feature: CountryFeature): string {
  const p = (feature.properties ?? {}) as Record<string, unknown>;

  const directA2 = [
    p.ISO_A2_EH,
    p.ISO_A2,
    p.iso_a2,
    p.iso_a2_eh,
    p['ISO3166-1-Alpha-2'],
  ];
  for (const v of directA2) {
    if (typeof v === 'string') {
      const code = v.trim().toUpperCase();
      if (code.length === 2 && code !== '-9' && code !== '-99' && code !== 'NA') {
        return code;
      }
    }
  }

  const directA3 = [p.ISO_A3_EH, p.ISO_A3, p.iso_a3, p.iso_a3_eh, p['ISO3166-1-Alpha-3']];
  for (const v of directA3) {
    if (typeof v === 'string') {
      const code = v.trim().toUpperCase();
      if (code.length === 3 && code !== '-99' && ISO_A3_TO_A2_FALLBACK[code]) {
        return ISO_A3_TO_A2_FALLBACK[code];
      }
    }
  }
  return '';
}

function getCountryName(feature: CountryFeature): string {
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const candidates = [p.NAME, p.NAME_LONG, p.ADMIN, p.name, p.admin];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Unknown';
}

/** Convert a 2-letter ISO country code into its regional-indicator flag emoji. */
function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const A = 'A'.charCodeAt(0);
  const up = code.toUpperCase();
  return String.fromCodePoint(base + (up.charCodeAt(0) - A), base + (up.charCodeAt(1) - A));
}

/** Inline loader used while waiting on auth hydration, GeoJSON, or the visa API. */
function LoadingShell({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0a1628] shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#007AFF]/30 border-t-[#007AFF]" />
          <div className="text-sm font-semibold tracking-wide text-blue-200">{label}</div>
          <div className="text-[11px] tracking-[0.2em] text-gray-500 uppercase">
            Routsky Visa Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}

export function VisaWorldMap() {
  const { user, isAuthenticated } = useAuth();
  const passports = useMemo(
    () =>
      (user?.passports ?? [])
        .map(p => (typeof p === 'string' ? p.trim().toUpperCase() : ''))
        .filter(Boolean),
    [user?.passports],
  );

  const [passportCode, setPassportCode] = useState<string>(() => passports[0] ?? 'TR');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Keep selected passport in sync with the user's list (e.g. late hydration from /auth/me).
  useEffect(() => {
    if (passports.length === 0) return;
    if (!passports.includes(passportCode)) {
      setPassportCode(passports[0]);
    }
  }, [passports, passportCode]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 520 });
  const [worldFeatures, setWorldFeatures] = useState<CountryFeature[]>([]);
  const [visaMap, setVisaMap] = useState<Record<string, GlobalVisaCountryStatus>>({});
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // ── Measure the map container so the SVG fills the available space ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      const width = Math.max(640, Math.floor(rect.width));
      const height = Math.max(360, Math.floor(rect.height));
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Load GeoJSON (re-runnable via reloadKey) ──
  useEffect(() => {
    let active = true;
    const load = async () => {
      setGeoLoading(true);
      try {
        const response = await fetch(GEOJSON_URL);
        if (!response.ok) throw new Error(`GeoJSON HTTP ${response.status}`);
        const geo = (await response.json()) as FeatureCollection<Geometry, GeoJsonProperties>;
        if (!active) return;
        if (!geo || !Array.isArray(geo.features) || geo.features.length === 0) {
          throw new Error('GeoJSON is empty or malformed');
        }
        setWorldFeatures(geo.features);
      } catch (err) {
        console.error('[VisaWorldMap] Failed to load world GeoJSON', err);
        if (active) setError('Failed to load world map geometry.');
      } finally {
        if (active) setGeoLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // ── Load visa status map whenever the passport changes (re-runnable via reloadKey) ──
  useEffect(() => {
    let active = true;
    const loadVisaData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getGlobalVisaMap(passportCode);
        if (!active) return;
        const countries = response?.countries ?? {};
        const normalized: Record<string, GlobalVisaCountryStatus> = {};
        for (const [code, value] of Object.entries(countries)) {
          if (!code || !value) continue;
          normalized[code.trim().toUpperCase()] = value;
        }
        setVisaMap(normalized);
      } catch (err: unknown) {
        console.error('[VisaWorldMap] Failed to load visa map', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        const message =
          status === 401
            ? 'Sign in to load your visa intelligence map.'
            : apiMessage ?? 'Failed to load visa intelligence map.';
        if (active) {
          setVisaMap({});
          setError(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVisaData();
    return () => {
      active = false;
    };
  }, [passportCode, reloadKey]);

  // ── Projection + path are recomputed when the container resizes ──
  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .translate([size.width / 2, size.height / 2])
        .scale(size.width / 6.2),
    [size.height, size.width],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const statusForFeature = (feature: CountryFeature): VisaMapStatus => {
    const code = getCountryCode(feature);
    if (!code) return 'Unknown';
    return visaMap[code]?.status ?? 'Unknown';
  };

  // Sort so the home-country feature renders LAST (glow sits on top of neighbours).
  const orderedFeatures = useMemo(() => {
    if (!worldFeatures.length) return worldFeatures;
    const home: CountryFeature[] = [];
    const rest: CountryFeature[] = [];
    for (const f of worldFeatures) {
      if (getCountryCode(f) === passportCode) home.push(f);
      else rest.push(f);
    }
    return [...rest, ...home];
  }, [worldFeatures, passportCode]);

  // ── Diagnostics: how many GeoJSON features actually matched a visa entry? ──
  useEffect(() => {
    if (geoLoading || loading) return;
    if (!worldFeatures.length) return;
    const visaKeys = Object.keys(visaMap);
    if (visaKeys.length === 0) {
      console.warn(
        `[VisaWorldMap] Visa map is EMPTY for passport ${passportCode}. ` +
          `Likely the RapidAPI key is missing on the server (TRAVELBUDDY_RAPIDAPI_KEY).`,
      );
      return;
    }
    let matched = 0;
    for (const f of worldFeatures) {
      const code = getCountryCode(f);
      if (code && visaMap[code]) matched += 1;
    }
    console.info(
      `[VisaWorldMap] matched ${matched} / ${worldFeatures.length} features for passport ${passportCode} ` +
        `(${visaKeys.length} countries classified).`,
    );
  }, [geoLoading, loading, worldFeatures, visaMap, passportCode]);

  const showEmptyDataBanner =
    !geoLoading && !loading && !error && Object.keys(visaMap).length === 0;

  const handleMouseMove = (event: ReactMouseEvent<SVGPathElement>, feature: CountryFeature) => {
    setTooltip({
      x: event.clientX + 14,
      y: event.clientY + 14,
      countryName: getCountryName(feature),
      status: statusForFeature(feature),
    });
  };

  const busy = geoLoading || loading;

  const usePillSelector = passports.length > 0 && passports.length <= 3;
  const useDropdown = passports.length > 3;

  // Graceful fallback states — never allow the component to collapse to a blank screen.
  if (isAuthenticated && !user) {
    return <LoadingShell label="Loading your passport profile..." />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden">

      {/* Header row */}
      <div className="flex shrink-0 items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-black tracking-wide text-white">Visa Intel 2D</h3>
          <p className="text-[11px] text-gray-400">
            Passport:{' '}
            <span className="font-semibold text-blue-300">
              {flagEmoji(passportCode)} {passportCode}
            </span>
            <span className="ml-2 text-gray-500">
              · {Object.keys(visaMap).length} countries classified
            </span>
          </p>
        </div>
        {busy && <span className="text-[11px] text-blue-300">Loading visa intel...</span>}
      </div>

      {error && (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <span>{error}</span>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="shrink-0 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-200 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {showEmptyDataBanner && (
        <div className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          No visa data returned for <span className="font-bold">{passportCode}</span>. Check the
          RapidAPI key on the server (<code className="text-amber-100">TRAVELBUDDY_RAPIDAPI_KEY</code>).
        </div>
      )}

      {/* Map fills remaining space. `min-h-0` lets it shrink so the legend below
          is never pushed out of the viewport. */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0a1628] shadow-2xl"
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <filter id="home-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x={0} y={0} width={size.width} height={size.height} fill="#071124" />
          <g>
            {orderedFeatures.map(feature => {
              const d = path(feature);
              if (!d) return null;
              const code = getCountryCode(feature);
              const isHome = !!passportCode && code === passportCode;
              const status = statusForFeature(feature);
              const fill = isHome ? HOME_FILL : STATUS_COLORS[status];
              return (
                <path
                  key={String(feature.id ?? code ?? getCountryName(feature))}
                  d={d}
                  fill={fill}
                  stroke={isHome ? '#FFFFFF' : '#0f172a'}
                  strokeWidth={isHome ? 1.4 : 0.4}
                  filter={isHome ? 'url(#home-glow)' : undefined}
                  onMouseMove={event => handleMouseMove(event, feature)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ transition: 'fill 160ms ease', cursor: 'pointer' }}
                />
              );
            })}
          </g>
        </svg>

        {/* In-map loading overlay — shown only when there's nothing to see yet */}
        {busy && worldFeatures.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#0a1628]/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#007AFF]/30 border-t-[#007AFF]" />
              <div className="text-sm font-semibold tracking-wide text-blue-200">
                Loading Visa Intelligence...
              </div>
              <div className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                {geoLoading ? 'Fetching world geometry' : `Passport ${passportCode}`}
              </div>
            </div>
          </div>
        )}

        {/* Floating passport selector — top-right of the map */}
        <div className="pointer-events-auto absolute top-3 right-3 z-20">
          {usePillSelector && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-700/70 bg-[#0a1628]/90 p-1 shadow-lg backdrop-blur">
              {passports.map(code => {
                const active = code === passportCode;
                return (
                  <button
                    key={code}
                    onClick={() => setPassportCode(code)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors ${
                      active
                        ? 'bg-[#007AFF] text-white ring-1 ring-white/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-sm leading-none">{flagEmoji(code)}</span>
                    <span>{code}</span>
                  </button>
                );
              })}
            </div>
          )}

          {useDropdown && (
            <div className="relative">
              <button
                onClick={() => setSelectorOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-[#0a1628]/90 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur hover:border-[#007AFF]/60"
                aria-haspopup="listbox"
                aria-expanded={selectorOpen}
              >
                <span className="text-sm leading-none">{flagEmoji(passportCode)}</span>
                <span>{passportCode}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {selectorOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    role="listbox"
                    className="absolute right-0 mt-2 max-h-64 w-40 overflow-auto rounded-xl border border-slate-700/70 bg-[#0a1628]/95 p-1 shadow-2xl backdrop-blur"
                  >
                    {passports.map(code => {
                      const active = code === passportCode;
                      return (
                        <li key={code}>
                          <button
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setPassportCode(code);
                              setSelectorOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-bold tracking-wide transition-colors ${
                              active
                                ? 'bg-[#007AFF] text-white'
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="text-sm leading-none">{flagEmoji(code)}</span>
                            <span>{code}</span>
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          {passports.length === 0 && (
            <div className="rounded-xl border border-slate-700/70 bg-[#0a1628]/90 px-3 py-1.5 text-[11px] font-semibold text-amber-300 shadow-lg backdrop-blur">
              Add a passport in Profile
            </div>
          )}
        </div>
      </div>

      {/* Tooltip: STRICTLY country name + visa status only. No safety/cost/etc. */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[1100] min-w-[160px] rounded-lg border border-slate-700 bg-[#050a18]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="font-bold">{tooltip.countryName}</div>
          <div className="flex items-center gap-2 text-gray-300">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[tooltip.status] }}
            />
            {STATUS_LABELS[tooltip.status]}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="shrink-0 rounded-xl border border-slate-700/60 bg-[#071124]/80 p-3">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
          Visa Legend
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 lg:grid-cols-7">
          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              borderColor: `${HOME_FILL}60`,
              backgroundColor: `${HOME_FILL}15`,
            }}
          >
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: HOME_FILL,
                boxShadow: `0 0 8px ${HOME_FILL}`,
              }}
            />
            <span className="font-medium leading-tight text-gray-200">Home</span>
          </div>
          {(Object.keys(STATUS_COLORS) as VisaMapStatus[]).map(status => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={{
                borderColor: `${STATUS_COLORS[status]}40`,
                backgroundColor: `${STATUS_COLORS[status]}10`,
              }}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[status],
                  boxShadow: `0 0 6px ${STATUS_COLORS[status]}60`,
                }}
              />
              <span className="font-medium leading-tight text-gray-200">
                {STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
