import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import RouteDetailsModal from '../components/RouteDetailsModal';
import { routskyApi } from '../api/routskyApi';
import type { BudgetBracket, RegionPreference } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCountryFlag from 'react-country-flag';
import { countryNames } from '../utils/countryMapper';
import {
  Loader2, Wallet, Calendar, MapPin, CheckSquare,
  ChevronDown, XCircle, Zap, AlertTriangle, Globe2, Plane
} from 'lucide-react';

const BUDGET_BRACKETS: { value: BudgetBracket; label: string; sub: string }[] = [
  { value: 'Shoestring', label: 'Shoestring', sub: '~$0–30/day' },
  { value: 'Budget', label: 'Budget', sub: '~$30–60/day' },
  { value: 'Mid', label: 'Mid-Range', sub: '~$60–120/day' },
  { value: 'Comfort', label: 'Comfort', sub: '~$120–250/day' },
  { value: 'Luxury', label: 'Luxury', sub: '$250+/day' },
];

const REGION_OPTIONS: { value: RegionPreference; label: string }[] = [
  { value: 'Any', label: '🌍 Any Region' },
  { value: 'SoutheastAsia', label: '🌏 Southeast Asia' },
  { value: 'EasternEurope', label: '🏰 Eastern Europe' },
  { value: 'Balkans', label: '⛰️ Balkans' },
  { value: 'LatinAmerica', label: '🌿 Latin America' },
  { value: 'NorthAfrica', label: '🏜️ North Africa' },
  { value: 'CentralAsia', label: '🗺️ Central Asia' },
  { value: 'CentralAmerica', label: '🌺 Central America' },
  { value: 'MiddleEast', label: '🕌 Middle East' },
  { value: 'Caribbean', label: '🏝️ Caribbean' },
];

interface OrchestratorTicket {
  memberName: string; origin: string; destination: string;
  flightTime: string; costUsd: number; visaType: string; visaRequired: boolean;
}
interface OrchestratorCandidate {
  destinationCode: string; city: string; country: string;
  compositeScore: number; avgCostUsd: number; avgFlightTime: string;
  memberTickets: OrchestratorTicket[];
}
interface OrchestratorResult {
  winner: OrchestratorCandidate | null;
  alternatives: OrchestratorCandidate[];
  explanation: string;
  eliminatedReasons: Record<string, string>;
}

function mapBudgetToDiscover(_bracket: BudgetBracket, totalUsd: number): string {
  if (totalUsd <= 500) return '< $500';
  if (totalUsd <= 1000) return '< $1000';
  if (totalUsd <= 1500) return '< $1500';
  if (totalUsd <= 3000) return '< $3000';
  if (totalUsd <= 5000) return '< $5000';
  return 'Any';
}

function mapDurationToDiscover(days: number): string {
  if (days <= 4) return '1–4 days';
  if (days <= 7) return '5–7 days';
  return '8+ days';
}

function mapRegionToDiscover(pref: RegionPreference): string {
  const regionMap: Record<string, string> = {
    SoutheastAsia: 'Asia', EasternEurope: 'Europe', Balkans: 'Europe',
    NorthAfrica: 'Africa', CentralAsia: 'Asia', MiddleEast: 'Asia',
    LatinAmerica: 'South America', CentralAmerica: 'North America',
    Caribbean: 'North America',
  };
  return regionMap[pref] || 'All';
}

function FormLabel({ icon: Icon, children }: { icon: React.FC<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
      <Icon size={12} className="opacity-70" />
      {children}
    </label>
  );
}

function SelectField({ value, onChange, children, id }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; id: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-colors"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

export function FindRoutePage() {
  useTheme();
  const { user } = useAuth();
  const citizenPassports = Array.isArray(user?.passports) ? user.passports : ['TR'];

  const [form, setForm] = useState({
    passports: citizenPassports,
    budgetBracket: (user?.travelStyle as BudgetBracket) || 'Budget',
    totalBudgetUsd: 1500,
    durationDays: 10,
    regionPreference: 'Any' as RegionPreference,
    hasSchengenVisa: false,
    hasUsVisa: false,
    hasUkVisa: false,
  });

  useEffect(() => {
    if (Array.isArray(user?.passports) && user.passports.length > 0) {
      setForm(prev => ({ ...prev, passports: user.passports }));
    }
  }, [user?.passports]);

  useEffect(() => {
    if (user?.travelStyle) {
      setForm(prev => ({ ...prev, budgetBracket: user.travelStyle as BudgetBracket }));
    }
  }, [user?.travelStyle]);

  const currencySymbol = user?.preferredCurrency === 'TRY' ? '₺' : user?.preferredCurrency === 'EUR' ? '€' : '$';
  const fxRate = user?.preferredCurrency === 'TRY' ? 36.5 : user?.preferredCurrency === 'EUR' ? 0.92 : 1;
  const formatPx = (usdNumber: number) => Math.round(usdNumber * fxRate).toLocaleString();

  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<OrchestratorCandidate | null>(null);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    if (form.totalBudgetUsd <= 0 || form.durationDays <= 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await routskyApi.post('/decision/discover', {
        passport: form.passports[0] || 'TR',
        origin: user?.origin || '',
        budgetLimit: mapBudgetToDiscover(form.budgetBracket, form.totalBudgetUsd),
        duration: mapDurationToDiscover(form.durationDays),
        region: mapRegionToDiscover(form.regionPreference),
      });
      setResult(response.data);
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.message
        || err?.response?.data?.title
        || err?.message
        || 'Unknown error';
      setError(`Orchestrator error: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const validAlternatives = (result?.alternatives ?? []).filter(
    a => a.city && a.avgCostUsd > 0
  );
  const hasResult = result !== null;
  const hasWinner = hasResult && result.winner?.destinationCode;
  const hasEliminations = hasResult && Object.keys(result.eliminatedReasons).length > 0;

  return (
    <main className="max-w-[1600px] w-[96%] mx-auto px-4 sm:px-6 py-4 min-h-[calc(100vh-4rem)] xl:h-[calc(100vh-4rem)] flex flex-col">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Decision Engine
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">
          Deterministic, explainable route generation — no guesswork, no fake flights.
        </p>
      </motion.div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">

        {/* LEFT: Input Engine */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-4 lg:sticky lg:top-20 lg:h-[calc(100vh-10rem)] mb-8 flex flex-col"
        >
          <div className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 rounded-xl p-5  space-y-4 h-full flex-1 overflow-y-auto custom-scrollbar">

            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                Input Engine
              </h2>
            </div>

            {/* Read-Only Citizen Identity */}
            <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Logged-in Citizen of</p>
              <div className="flex flex-wrap gap-2">
                {(!user || !user.passports) ? (
                  <span className="text-xs text-gray-400 italic">Loading profile...</span>
                ) : Array.isArray(citizenPassports) && citizenPassports.map(code => {
                  if (!code) return null;
                  const name = countryNames[code] || code;
                  return (
                    <span key={code} className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                      <ReactCountryFlag countryCode={code} svg style={{ width: '1.2em', height: '1.2em', borderRadius: '2px', display: 'flex', alignItems: 'center' }} title={name} />
                      <span>{name}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Budget Bracket */}
            <div>
              <FormLabel icon={Wallet}>Budget Bracket</FormLabel>
              <SelectField id="budgetBracket" value={form.budgetBracket} onChange={v => setField('budgetBracket', v as BudgetBracket)}>
                {BUDGET_BRACKETS.map(b => (
                  <option key={b.value} value={b.value}>{b.label} — {b.sub}</option>
                ))}
              </SelectField>
            </div>

            {/* Side-by-side: Budget Cap & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel icon={Wallet}>Total Budget ({user?.preferredCurrency || 'USD'})</FormLabel>
                <input
                  id="totalBudget"
                  type="number"
                  min={0}
                  step={100}
                  value={form.totalBudgetUsd}
                  onChange={e => setField('totalBudgetUsd', Number(e.target.value))}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <FormLabel icon={Calendar}>Duration (Days)</FormLabel>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  max={90}
                  value={form.durationDays}
                  onChange={e => setField('durationDays', Number(e.target.value))}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            {/* Region */}
            <div>
              <FormLabel icon={MapPin}>Region Preference</FormLabel>
              <SelectField id="region" value={form.regionPreference} onChange={v => setField('regionPreference', v as RegionPreference)}>
                {REGION_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </SelectField>
            </div>

            {/* Visa flags */}
            <div>
              <FormLabel icon={CheckSquare}>Visas You Hold</FormLabel>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'hasUsVisa', code: 'US', label: 'US Visa' },
                  { key: 'hasUkVisa', code: 'GB', label: 'UK Visa' },
                  { key: 'hasSchengenVisa', code: 'EU', label: 'Schengen Visa' },
                ] as const).map(({ key, code, label }) => (
                  <label
                    key={key}
                    htmlFor={key}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <input
                      id={key}
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setField(key, e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-gray-400/50 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <ReactCountryFlag countryCode={code} svg style={{ width: '1.2em', height: '1.2em', borderRadius: '2px' }} title={label} />
                      <span className="mt-0.5">{label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              id="generate-route-btn"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2 text-sm border border-teal-600/50 hover:border-teal-400/70  transition-colors duration-200 mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Generating Route...</>
              ) : (
                <><Zap size={15} /> Generate Logical Route</>
              )}
            </button>

          </div>
        </motion.div>

        {/* RIGHT: Output & Explanation */}
        <div className="lg:col-span-8 lg:h-[calc(100vh-10rem)] mb-8">
          <div className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 rounded-xl p-5  h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">

              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl"
                  >
                    <Loader2 size={36} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Running deterministic filters...</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Visa rules → Budget → Days</p>
                  </motion.div>
                )}

                {!loading && error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-3 p-5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl"
                  >
                    <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">Engine Error</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                    </div>
                  </motion.div>
                )}

                {!loading && !error && !hasResult && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-4">
                      <Zap size={26} className="text-blue-500" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">Ready to generate</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-center max-w-xs">
                      Configure your constraints on the left, then click <strong>Generate Logical Route</strong>.
                    </p>
                  </motion.div>
                )}

                {!loading && hasResult && (
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                    {/* Orchestrator Analysis */}
                    <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5">
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <Globe2 size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Orchestrator Analysis</h3>
                          <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1 whitespace-pre-line bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-blue-100/50 dark:border-blue-500/10 leading-relaxed">
                            {result!.explanation}
                          </div>
                        </div>
                      </div>
                    </section>

                    {hasWinner ? (
                      <>
                        {/* Winner Card */}
                        <section>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">🏆</span>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Logical Winner</h2>
                          </div>
                          <div className="bg-white dark:bg-gray-800/60 border-2 border-green-500/30 dark:border-green-500/40 rounded-2xl overflow-hidden  relative">
                            <div className="p-5 relative z-10">
                              <div className="flex flex-col md:flex-row justify-between gap-5">
                                <div className="flex-1">
                                  <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                                    Top Match • Score: {result!.winner!.compositeScore}/100
                                  </div>
                                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                                    {result!.winner!.city}, {result!.winner!.country}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600/50">
                                      <span className="text-green-500 font-bold">{currencySymbol}</span> {formatPx(result!.winner!.avgCostUsd)} round-trip
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600/50">
                                      <Plane size={14} className="text-blue-500" /> {result!.winner!.avgFlightTime} flight
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-4 min-w-[260px] border border-gray-100 dark:border-gray-700/50 ">
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
                                    Your Ticket Data
                                    <Plane size={12} />
                                  </div>
                                  {result!.winner!.memberTickets.map((t, idx) => (
                                    <div key={idx} className="space-y-1.5 mb-2">
                                      <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-2.5 py-1.5 rounded-md  border border-gray-100 dark:border-gray-800">
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Route</span>
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{t.origin} <span className="text-gray-400 mx-0.5">➔</span> {t.destination}</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-2.5 py-1.5 rounded-md  border border-gray-100 dark:border-gray-800">
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Cost</span>
                                        <span className="text-xs font-bold text-green-600">{currencySymbol}{formatPx(t.costUsd)}</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-2.5 py-1.5 rounded-md  border border-gray-100 dark:border-gray-800">
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Visa</span>
                                        <span className={`text-xs font-bold px-1.5 rounded ${t.visaRequired ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : 'text-green-600 bg-green-50 dark:bg-green-500/10'}`}>
                                          {t.visaType}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
                                <button
                                  onClick={() => setDetailsTarget(result!.winner!)}
                                  className="h-7 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-[11px] font-black uppercase tracking-widest rounded transition-all border border-gray-300 dark:border-gray-600  flex items-center gap-1"
                                >
                                  VIEW DETAILS →
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Alternatives */}
                        {validAlternatives.length > 0 && (
                          <section>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xl">🥈</span>
                              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Strong Alternatives</h2>
                            </div>
                            <div className="space-y-2">
                              {validAlternatives.map((alt, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.08 }}
                                  className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 rounded-xl p-4  relative overflow-hidden group"
                                >
                                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors" />
                                  <div className="flex justify-between items-center pl-2">
                                    <div>
                                      <h4 className="font-extrabold text-gray-900 dark:text-white text-base">{alt.city}, {alt.country}</h4>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-3 mt-1 font-medium">
                                        <span className="flex items-center gap-1"><span className="text-green-500 font-bold">{currencySymbol}</span>{formatPx(alt.avgCostUsd)}</span>
                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                        <span className="flex items-center gap-1"><Plane size={12} className="text-blue-500" />{alt.avgFlightTime}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <div className="text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded inline-block">Score: {alt.compositeScore}</div>
                                        <div className="text-[10px] text-red-400 font-medium mt-0.5">−{(result!.winner!.compositeScore - alt.compositeScore).toFixed(1)} pts behind</div>
                                      </div>
                                      <button
                                        onClick={() => setDetailsTarget(alt)}
                                        className="h-7 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest rounded transition-all border border-gray-300 dark:border-gray-600  shrink-0"
                                      >
                                        DETAILS →
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    ) : (
                      <section className="flex items-start gap-3 p-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl">
                        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No viable destinations found</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            All destinations were eliminated by the engine. Check the orchestrator analysis above and try adjusting your budget or region.
                          </p>
                        </div>
                      </section>
                    )}

                    {/* Dynamic Elimination */}
                    {hasEliminations && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle size={16} className="text-red-400" />
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                            Removed by Engine
                          </h2>
                          <span className="text-[10px] uppercase tracking-wide bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-sm">
                            {Object.keys(result!.eliminatedReasons).length} eliminated
                          </span>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 border border-red-100 dark:border-red-500/20 rounded-xl overflow-hidden ">
                          <div className="divide-y divide-red-100 dark:divide-red-900/30">
                            {Object.entries(result!.eliminatedReasons).map(([code, reason]) => (
                              <div key={code} className="flex gap-3 text-xs p-3 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors">
                                <span className="inline-flex items-center justify-center font-mono text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-500/20 w-9 h-6 rounded-md flex-shrink-0">
                                  {code}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>

      {/* Route Details Modal */}
      {detailsTarget && (
        <RouteDetailsModal
          trip={{
            destination: `${detailsTarget.city}, ${detailsTarget.country}`,
            destinationCode: detailsTarget.destinationCode,
            totalBudgetUsd: detailsTarget.avgCostUsd,
            durationDays: form.durationDays,
            visaStatus: detailsTarget.memberTickets?.[0]?.visaRequired ? 'VISA REQUIRED' : 'VISA-FREE',
            description: `${detailsTarget.city} scored ${detailsTarget.compositeScore}/100 in the Routsky Decision Engine. Flight from ${detailsTarget.memberTickets?.[0]?.origin || 'IST'} costs $${detailsTarget.avgCostUsd} round-trip and takes ${detailsTarget.avgFlightTime}. Visa status: ${detailsTarget.memberTickets?.[0]?.visaType || 'Unknown'}.`,
            itinerary: [
              `Day 1: Arrive in ${detailsTarget.city} — hotel check-in & neighborhood walk`,
              `Day 2: ${detailsTarget.city} city highlights & cultural landmarks`,
              `Day 3: Local cuisine tour & hidden gems`,
              ...(form.durationDays > 3 ? [`Day 4-${Math.min(form.durationDays - 1, 6)}: Regional exploration & day trips`] : []),
              `Day ${Math.min(form.durationDays, 7)}: Departure from ${detailsTarget.destinationCode}`,
            ],
            ticketData: detailsTarget.memberTickets?.[0] ? {
              origin: detailsTarget.memberTickets[0].origin,
              destinationCode: detailsTarget.destinationCode,
              costUsd: detailsTarget.memberTickets[0].costUsd,
              flightTime: detailsTarget.memberTickets[0].flightTime,
              visaRequired: detailsTarget.memberTickets[0].visaRequired,
              visaType: detailsTarget.memberTickets[0].visaType,
            } : undefined,
          }}
          onClose={() => setDetailsTarget(null)}
          onSave={async () => {
            try {
              await routskyApi.post('/routes/save-discover', {
                destinationCity: detailsTarget.city,
                destinationCountry: detailsTarget.country,
                destinationCode: detailsTarget.destinationCode,
                totalBudgetUsd: detailsTarget.avgCostUsd,
                durationDays: form.durationDays,
                selectionReason: `Score ${detailsTarget.compositeScore}/100. ${detailsTarget.avgFlightTime} flight, $${detailsTarget.avgCostUsd}. Visa: ${detailsTarget.memberTickets?.[0]?.visaType || 'Unknown'}.`,
                passport: form.passports[0] || 'TR',
              });
            } catch (err) {
              console.error('Failed to save route:', err);
            }
          }}
        />
      )}
    </main>
  );
}
