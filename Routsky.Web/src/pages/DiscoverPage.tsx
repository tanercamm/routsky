import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, DollarSign, Plane, Globe2, AlertCircle, XCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { routskyApi } from '../api/routskyApi';
import { useAuth } from '../context/AuthContext';

const REGIONS = ['All', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
const BUDGET_LIMITS = ['Any', '< $500', '< $1000', '< $1500'];
const DURATIONS = ['Any', '1–4 days', '5–7 days', '8+ days'];
const PASSPORTS = ['TR', 'AU', 'DE', 'US', 'GB'];

interface Ticket {
    memberName: string;
    origin: string;
    destination: string;
    flightTime: string;
    costUsd: number;
    convertedCost: number;
    currency: string;
    visaType: string;
    visaRequired: boolean;
}

interface CandidateResult {
    destinationCode: string;
    city: string;
    country: string;
    compositeScore: number;
    avgCostUsd: number;
    avgConvertedCost: number;
    avgFlightTime: string;
    memberTickets: Ticket[];
}

interface DecisionResult {
    winner: CandidateResult | null;
    alternatives: CandidateResult[];
    explanation: string;
    eliminatedReasons: Record<string, string>;
}

export const DiscoverPage = () => {
    const { user } = useAuth();
    const [passport, setPassport] = useState('TR');
    const [region, setRegion] = useState('All');
    const [budgetLimit, setBudgetLimit] = useState('Any');
    const [duration, setDuration] = useState('Any');

    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<DecisionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const response = await routskyApi.post('/decision/discover', {
                passport,
                origin: user?.origin || '',
                budgetLimit,
                duration,
                region
            });

            setResult(response.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to generate logical route. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-10"
            >
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                    Orchestrate Your Route
                </h1>
                <p className="text-base text-gray-400 dark:text-gray-500 max-w-2xl">
                    Let the Decision Engine analyze real-time flight data, visa requirements, and budget constraints to find your perfect destination.
                </p>
            </motion.div>

            {/* Input Engine Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="mb-8"
            >
                <Card>
                    <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                        {/* Passport */}
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <Globe2 size={14} /> Passport
                            </label>
                            <select
                                value={passport}
                                onChange={(e) => setPassport(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                            >
                                {PASSPORTS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Duration */}
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <Calendar size={14} /> Duration
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                            >
                                {DURATIONS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        {/* Region */}
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <MapPin size={14} /> Region
                            </label>
                            <select
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                            >
                                {REGIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Budget Limit */}
                        <div className="flex-1 w-full">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <DollarSign size={14} /> Budget Limit
                            </label>
                            <select
                                value={budgetLimit}
                                onChange={(e) => setBudgetLimit(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                            >
                                {BUDGET_LIMITS.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>

                        {/* Generate Button */}
                        <div className="w-full md:w-auto">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full md:w-auto h-[42px] flex items-center justify-center gap-2 px-6 text-sm font-medium rounded-lg transition-colors ${isGenerating
                                    ? 'bg-blue-400 cursor-not-allowed text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                <Plane size={16} className={isGenerating ? "animate-pulse" : ""} />
                                {isGenerating ? "Orchestrating..." : "Generate Logical Route"}
                            </button>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Results Area */}
            {error && (
                <div className="p-4 mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                </div>
            )}

            {!result && !isGenerating && !error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center transform rotate-12 ">
                            <Plane size={32} />
                        </div>
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center transform -rotate-12 ">
                            <Globe2 size={32} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Ready to Orchestrate</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto ">
                        Adjust your parameters above and click "Generate" to let the Decision Engine dynamically calculate the best routes for you.
                    </p>
                </motion.div>
            )}

            {isGenerating && (
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-lg animate-pulse">Running MCP Atoms...</p>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Checking feasibility, budget constraints, and visa rules.</p>
                </div>
            )}

            <AnimatePresence>
                {result && !isGenerating && (() => {
                    const validAlternatives = result.alternatives.filter(
                        a => a.city && a.avgCostUsd > 0
                    );
                    return (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                        {/* Explanation Summary */}
                        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-500/10 border-blue-100 dark:border-blue-500/20">
                            <div className="flex flex-col sm:flex-row gap-5 items-start">
                                <div className="mt-1 flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center ">
                                        <Globe2 size={24} />
                                    </div>
                                </div>
                                <div className="w-full">
                                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-3">Orchestrator Analysis</h3>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 whitespace-pre-line bg-white/50 dark:bg-black/20 p-4 rounded-xl  border border-blue-100/50 dark:border-blue-500/10">
                                        {result.explanation}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {result.winner?.destinationCode ? (
                            <>
                                {/* Winner Card */}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="text-2xl">🏆</span> Logical Winner
                                    </h2>
                                    <Card hoverEffect className="border-2 border-green-500/30 dark:border-green-500/40 relative overflow-hidden bg-white dark:bg-gray-800">

                                        <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                                            <div className="flex-1">
                                                <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-3">
                                                    Top Match • Score: {result.winner.compositeScore}/100
                                                </div>
                                                <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
                                                    {result.winner.city}, {result.winner.country}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600/50">
                                                        <DollarSign size={16} className="text-green-500" />
                                                        {result.winner.memberTickets[0]?.currency === 'USD' ? '$' : result.winner.memberTickets[0]?.currency === 'EUR' ? '€' : result.winner.memberTickets[0]?.currency === 'TRY' ? '₺' : ''}
                                                        {result.winner.avgConvertedCost} round-trip
                                                    </span>
                                                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600/50">
                                                        <Plane size={16} className="text-blue-500" /> {result.winner.avgFlightTime} flight
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Ticket Detail */}
                                            <div className="bg-gray-50 dark:bg-gray-800/80 rounded-xl p-5 min-w-[280px] border border-gray-100 dark:border-gray-700/50 ">
                                                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 font-bold flex items-center justify-between">
                                                    Your Ticket Data
                                                    <Plane size={14} />
                                                </div>
                                                {result.winner.memberTickets.map((t, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-3 py-2 rounded-md  border border-gray-100 dark:border-gray-800">
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Route</span>
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{t.origin} <span className="text-gray-400 mx-1">➔</span> {t.destination}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-3 py-2 rounded-md  border border-gray-100 dark:border-gray-800">
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Visa Rules</span>
                                                            <span className={`text-sm font-bold px-2 rounded ${t.visaRequired ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : 'text-green-600 bg-green-50 dark:bg-green-500/10'}`}>
                                                                {t.visaType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Alternatives */}
                                    {validAlternatives.length > 0 && (
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <span className="text-2xl">🥈</span> Strong Alternatives
                                            </h2>
                                            <div className="space-y-4">
                                                {validAlternatives.map((alt, idx) => (
                                                    <Card key={idx} hoverEffect className="p-5 border border-gray-100 dark:border-gray-700/50  relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors"></div>
                                                        <div className="flex justify-between items-center pl-2">
                                                            <div>
                                                                <h4 className="font-extrabold text-gray-900 dark:text-white text-lg">{alt.city}, {alt.country}</h4>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-3 mt-1.5 font-medium">
                                                                    <span className="flex items-center gap-1"><DollarSign size={14} className="text-green-500" />
                                                                        {alt.memberTickets[0]?.currency === 'USD' ? '$' : alt.memberTickets[0]?.currency === 'EUR' ? '€' : alt.memberTickets[0]?.currency === 'TRY' ? '₺' : ''}
                                                                        {alt.avgConvertedCost}
                                                                    </span>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span className="flex items-center gap-1"><Plane size={14} className="text-blue-500" />{alt.avgFlightTime}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded inline-block">Score: {alt.compositeScore}</div>
                                                                <div className="text-xs text-red-400 font-medium mt-1">−{(result.winner!.compositeScore - alt.compositeScore).toFixed(1)} pts behind</div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Why Not These */}
                                    {Object.keys(result.eliminatedReasons).length > 0 && (
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <XCircle size={22} className="text-red-500" /> Removed by Engine
                                            </h2>
                                            <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-900 border-red-100 dark:border-red-500/20  p-0 overflow-hidden">
                                                <div className="divide-y divide-red-100 dark:divide-red-900/30">
                                                    {Object.entries(result.eliminatedReasons).map(([code, reason]) => (
                                                        <div key={code} className="flex gap-4 text-sm p-4 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors">
                                                            <span className="inline-flex items-center justify-center font-mono text-xs font-bold text-red-500 bg-red-100 dark:bg-red-500/20 w-10 h-7 rounded-md flex-shrink-0">
                                                                {code}
                                                            </span>
                                                            <span className="text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed font-medium">{reason}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Valid Destinations Found</h3>
                                <p className="text-gray-500 max-w-md mx-auto">The constraints might be too strict. Check the orchestrator analysis summary above to see why routes were eliminated and try adjusting your budget or region.</p>
                            </div>
                        )}
                    </motion.div>
                    );
                })()}
            </AnimatePresence>
        </main>
    );
};

