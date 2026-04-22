import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Globe2, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getGlobalVisaMap } from '../api/routskyApi';
import {
  VisaWorldMap,
  STATUS_COLORS,
  STATUS_LABELS,
  HOME_FILL,
  getCountryCode,
} from '../components/VisaWorldMap';
import type { CountryFeature } from '../components/VisaWorldMap';
import type { GlobalVisaCountryStatus, VisaMapStatus } from '../types';

/** Convert a 2-letter ISO country code into its regional-indicator flag emoji. */
function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const A = 'A'.charCodeAt(0);
  const up = code.toUpperCase();
  return String.fromCodePoint(base + (up.charCodeAt(0) - A), base + (up.charCodeAt(1) - A));
}

/** Inline loader used while waiting on auth hydration. */
function LoadingShell({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#007AFF]/30 border-t-[#007AFF]" />
        <div className="text-sm font-semibold tracking-wide text-blue-200">{label}</div>
        <div className="text-[11px] tracking-[0.2em] text-gray-500 uppercase">
          Routsky Visa Intelligence
        </div>
      </div>
    </div>
  );
}

export function VisaIntelPage() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
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

  // Keep selected passport in sync with the user's list.
  useEffect(() => {
    if (passports.length === 0) return;
    if (!passports.includes(passportCode)) {
      setPassportCode(passports[0]);
    }
  }, [passports, passportCode]);

  // ── Shared state that both the sidebar and map consume ──
  const [worldFeatures, setWorldFeatures] = useState<CountryFeature[]>([]);
  const [visaMap, setVisaMap] = useState<Record<string, GlobalVisaCountryStatus>>({});
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load visa status map whenever the passport changes ──
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
        console.error('[VisaIntelPage] Failed to load visa map', err);
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

  const busy = geoLoading || loading;
  const showEmptyDataBanner =
    !geoLoading && !loading && !error && Object.keys(visaMap).length === 0;

  const usePillSelector = passports.length > 0 && passports.length <= 3;
  const useDropdown = passports.length > 3;

  // ── Compute per-status country counts for the sidebar legend ──
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<VisaMapStatus | 'Home', number>> = {};
    // Count home
    if (passportCode) counts.Home = 1;
    for (const f of worldFeatures) {
      const code = getCountryCode(f);
      if (!code || code === passportCode) continue;
      const st = visaMap[code]?.status ?? 'Unknown';
      counts[st as VisaMapStatus] = (counts[st as VisaMapStatus] ?? 0) + 1;
    }
    return counts;
  }, [worldFeatures, visaMap, passportCode]);

  // Graceful fallback
  if (isAuthenticated && !user) {
    return (
      <div
        className={`flex h-[calc(100vh-3.5rem)] overflow-hidden transition-colors duration-700 ${
          isLight ? 'bg-[#F5F5F7]' : 'bg-[#020308]'
        }`}
      >
        <LoadingShell label="Loading your passport profile..." />
      </div>
    );
  }

  return (
    <div
      className={`flex h-[calc(100vh-3.5rem)] overflow-hidden transition-colors duration-700 ${
        isLight ? 'bg-[#F5F5F7]' : 'bg-[#020308]'
      }`}
    >
      {/* ══════════════════════════════════════════════
          LEFT SIDEBAR
          ══════════════════════════════════════════════ */}
      <aside className="flex w-[420px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-800/60 bg-[#071124]/50 p-6 backdrop-blur-sm">

        {/* ── Title + sync indicator ── */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
            <Globe2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-wide text-white">Visa Intelligence</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <ShieldCheck size={10} className="text-blue-400" />
              <span>Real-time visa map</span>
              {busy && (
                <span className="ml-1 animate-pulse text-blue-400">· Syncing...</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Passport Selector ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
            Active Passport
          </span>

          {usePillSelector && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-700/70 bg-[#0a1628]/90 p-1">
              {passports.map(code => {
                const active = code === passportCode;
                return (
                  <button
                    key={code}
                    onClick={() => setPassportCode(code)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
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
                className="flex w-full items-center gap-2 rounded-xl border border-slate-700/70 bg-[#0a1628]/90 px-3 py-2 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur hover:border-[#007AFF]/60"
                aria-haspopup="listbox"
                aria-expanded={selectorOpen}
              >
                <span className="text-sm leading-none">{flagEmoji(passportCode)}</span>
                <span className="flex-1 text-left">{passportCode}</span>
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
                    className="absolute left-0 right-0 z-30 mt-1.5 max-h-64 overflow-auto rounded-xl border border-slate-700/70 bg-[#0a1628]/95 p-1 shadow-2xl backdrop-blur"
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
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] font-semibold text-amber-300">
              Add a passport in your Profile
            </div>
          )}

          {/* Current passport summary */}
          {passportCode && (
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="text-lg leading-none">{flagEmoji(passportCode)}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">{passportCode}</div>
                {Object.keys(visaMap).length > 0 && (
                  <div className="text-[10px] text-gray-500">
                    {Object.keys(visaMap).length} countries classified
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Status Banners ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-2.5 text-xs text-red-300">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="shrink-0 rounded-md bg-red-500/20 px-2 py-0.5 font-bold text-red-200 hover:bg-red-500/30 hover:text-white transition-colors"
              title="Retry"
            >
              ↻ Retry
            </button>
          </div>
        )}

        {showEmptyDataBanner && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-300">
            No visa data for <span className="font-bold">{passportCode}</span> — check{' '}
            <code className="text-amber-200">TRAVELBUDDY_RAPIDAPI_KEY</code>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

        {/* ── Legend (vertical list) ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
            Legend
          </span>

          {/* Home country */}
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: HOME_FILL, boxShadow: `0 0 6px ${HOME_FILL}` }}
            />
            <span className="text-[11px] font-medium text-gray-300">Home Country</span>
            {statusCounts.Home != null && (
              <span className="ml-auto text-[10px] tabular-nums text-gray-600">
                {statusCounts.Home}
              </span>
            )}
          </div>

          {(Object.keys(STATUS_COLORS) as VisaMapStatus[]).map(status => (
            <div
              key={status}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: STATUS_COLORS[status],
                  boxShadow: `0 0 4px ${STATUS_COLORS[status]}60`,
                }}
              />
              <span className="text-[11px] font-medium text-gray-300">
                {STATUS_LABELS[status]}
              </span>
              {(statusCounts[status] ?? 0) > 0 && (
                <span className="ml-auto text-[10px] tabular-nums text-gray-600">
                  {statusCounts[status]}
                </span>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          RIGHT MAP AREA
          ══════════════════════════════════════════════ */}
      <main className="relative flex-1 p-3">
        <VisaWorldMap
          passportCode={passportCode}
          visaMap={visaMap}
          loading={loading}
          geoLoading={geoLoading}
          worldFeatures={worldFeatures}
          setWorldFeatures={setWorldFeatures}
          setGeoLoading={setGeoLoading}
          setError={setError}
          reloadKey={reloadKey}
        />
      </main>
    </div>
  );
}
