import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { countryNames } from '../utils/countryMapper';
import { runDecisionEngine } from '../api/routskyApi';

// ── Types: Agent Decision Result (from MCP backend) ──
interface MemberTicket {
    memberName: string;
    memberId: number;
    origin: string;
    destination: string;
    flightTime: string;
    flightTimeMinutes: number;
    costUsd: number;
    convertedCost: number;
    currency: string;
    visaType: string;
    visaRequired: boolean;
    budgetSeverity: string;
    budgetPercentUsed: number;
}

interface CandidateResult {
    destinationCode: string;
    city: string;
    country: string;
    compositeScore: number;
    avgCostUsd: number;
    avgConvertedCost: number;
    avgFlightTime: string;
    frictionScore: number;
    memberTickets: MemberTicket[];
}

interface DecisionResult {
    winner: CandidateResult;
    alternatives: CandidateResult[];
    explanation: string;
    eliminatedReasons: Record<string, string>;
    decidedAt: string;
}

const DECISION_STORAGE_KEY = 'routsky_decisions';

const getStoredDecision = (groupId: string): DecisionResult | null => {
    try {
        const stored = localStorage.getItem(DECISION_STORAGE_KEY);
        if (!stored) return null;
        const all = JSON.parse(stored);
        return all[groupId] ?? null;
    } catch { return null; }
};

const storeDecision = (groupId: string, decision: DecisionResult) => {
    try {
        const stored = localStorage.getItem(DECISION_STORAGE_KEY);
        const all = stored ? JSON.parse(stored) : {};
        all[groupId] = decision;
        localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(all));
    } catch (e) { console.error('Failed to persist decision', e); }
};

const GroupDashboard = ({ allGroups, selectedGroupId, onBack, deleteGroup }: any) => {
    const [isCalculating, setIsCalculating] = useState(false);
    const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
    const [decisionError, setDecisionError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { user: currentUser } = useAuth();

    const group = allGroups?.find((g: any) => g.id === selectedGroupId);

    // Restore persisted decision on mount
    useEffect(() => {
        if (selectedGroupId) {
            const cached = getStoredDecision(selectedGroupId);
            if (cached) setDecisionResult(cached);
        }
    }, [selectedGroupId]);

    // CRASH PROTECTION
    if (!group) return <div className="p-8 text-white text-center mt-12 text-sm">Workspace not found.</div>;

    let safeMembers = Array.isArray(group.members) ? group.members : [];
    safeMembers = safeMembers.filter((m: any) => m.name !== 'Admin Routsky');

    // Force creator hydration if empty
    if (safeMembers.length === 0 && currentUser) {
        safeMembers = [{
            id: currentUser.id,
            name: currentUser.name || "User",
            avatar: currentUser.avatarUrl,
            origin: currentUser.passports?.[0] || "Not set",
        }];
    }

    // Admin-first sort
    const sortedMembers = [...safeMembers].sort((a, b) => (a.id === group.ownerId ? -1 : (b.id === group.ownerId ? 1 : 0)));

    // ── PURE MCP FLOW: Only calls real backend, no fallback mock ──
    const handleRunEngine = async () => {
        setIsCalculating(true);
        setDecisionError(null);
        try {
            const result = await runDecisionEngine(group.id);
            setDecisionResult(result);
            storeDecision(group.id, result);
        } catch (err: any) {
            console.error('MCP engine failed', err);
            setDecisionError('MCP engine unavailable. Start backend: dotnet run');
        } finally {
            setIsCalculating(false);
        }
    };

    // Avatar resolver
    const resolveAvatar = (member: any) => {
        const isCurrentUser = member.id === currentUser?.id;
        const raw = isCurrentUser ? currentUser?.avatarUrl : (member.avatar || member.avatarUrl);
        return raw
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0F172A] p-4 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">

                {/* ═══ HEADER: Compact — Title + Trash + Copy only ═══ */}
                <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} title="Back" className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500 dark:text-gray-400 rounded-full transition-colors shrink-0">
                            <ArrowLeft size={16} className="stroke-[2.5]" />
                        </button>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                            {group.name}
                        </h1>
                        <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest text-gray-500 dark:text-gray-400">{group.inviteCode || group.code}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(group.inviteCode || group.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-gray-600 transition-colors" title="Copy Code"
                            >
                                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                        </div>
                    </div>
                    {group.ownerId === currentUser?.id && (
                        <button onClick={() => { onBack(); setTimeout(() => deleteGroup(group.id), 100); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all shrink-0" title="Delete Workspace">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* ═══ LEFT COL: Members (compact) ═══ */}
                    <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold text-gray-900 dark:text-white text-xs mb-3 flex items-center justify-between uppercase tracking-wider">
                            Members <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-normal">{sortedMembers.length}</span>
                        </h3>
                        <div className="space-y-1.5">
                            {sortedMembers.map((member: any) => (
                                <div key={member.id} className="flex items-center gap-2 bg-white dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50 transition-all hover:border-indigo-100 dark:hover:border-indigo-500/30">
                                    <img src={resolveAvatar(member)} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 object-cover" alt={member.name}
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`; }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-gray-900 dark:text-white text-xs truncate">{member.name}</span>
                                            {member.id === group.ownerId && (
                                                <span className="px-1 py-0.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[7px] font-bold rounded uppercase tracking-wider ml-1 shrink-0">Admin</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{countryNames[member.origin] || member.origin || 'Not set'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ═══ RIGHT COL: Engine + Results (compact) ═══ */}
                    <div className="lg:col-span-9 space-y-3">

                        {/* Intersection Engine */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden">

                            {!decisionResult ? (
                                <div className="text-center">
                                    <div className="text-indigo-600 dark:text-indigo-400 text-2xl mb-1">⚡</div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Intersection Engine</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-1">
                                        MCP-powered: calculates optimal meeting point via route feasibility, budget, and visa MCPs.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-1 mt-2 mb-1">
                                        {Array.from(new Set(sortedMembers.map((m: any) => m.origin).filter((o: string) => o && o !== 'Not set'))).map((origin: string) => (
                                            <span key={origin} className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                                                {origin}
                                            </span>
                                        ))}
                                    </div>
                                    {decisionError && (
                                        <div className="mt-2 text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 p-1.5 rounded border border-red-200 dark:border-red-800/50">{decisionError}</div>
                                    )}
                                    <button onClick={handleRunEngine} disabled={isCalculating}
                                        className={`mt-3 px-6 py-2 font-bold rounded-lg transition-all  text-xs flex items-center justify-center gap-2 mx-auto ${isCalculating ? 'bg-indigo-800 text-white cursor-wait opacity-90' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                        {isCalculating ? (
                                            <><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Running MCP Pipeline...</>
                                        ) : '⚡ Run Intersection Engine'}
                                    </button>
                                </div>
                            ) : (
                                /* ═══ DECISION RESULT — rendered from MCP response only ═══ */
                                <div className="text-left">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase mb-0.5 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Match Found
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                                {decisionResult.winner.city} <span className="text-indigo-600 dark:text-indigo-400">({decisionResult.winner.destinationCode})</span>
                                            </h3>
                                            <span className="text-[10px] text-gray-500 font-mono">Score: {decisionResult.winner.compositeScore}/100</span>
                                        </div>
                                        <button onClick={() => { setDecisionResult(null); setDecisionError(null); }}
                                            className="text-[10px] text-gray-500 underline hover:text-gray-900 dark:hover:text-white">Recalculate</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-white/60 dark:bg-slate-900/50 p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Avg Flight</div>
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">{decisionResult.winner.avgFlightTime}</div>
                                        </div>
                                        <div className="bg-white/60 dark:bg-slate-900/50 p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Avg Cost</div>
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                {decisionResult.winner.memberTickets[0]?.currency === 'USD' ? '$' :
                                                    decisionResult.winner.memberTickets[0]?.currency === 'EUR' ? '€' :
                                                        decisionResult.winner.memberTickets[0]?.currency === 'TRY' ? '₺' : ''}
                                                {decisionResult.winner.avgConvertedCost}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Per-member tickets — DYNAMIC from MCP, each shows their real origin */}
                                    <div className="space-y-1 mb-3">
                                        {decisionResult.winner.memberTickets.map(ticket => (
                                            <div key={ticket.memberName} className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-1.5 rounded-lg border border-indigo-100 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{ticket.memberName}</span>
                                                    <span className="text-[10px] text-gray-500">({ticket.flightTime})</span>
                                                    {ticket.visaRequired && <span className="text-[8px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded font-bold uppercase">Visa</span>}
                                                </div>
                                                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                    <span className="text-gray-900 dark:text-white">{ticket.origin}</span>
                                                    <span className="text-indigo-400">➔</span>
                                                    <span className="text-gray-900 dark:text-white">{ticket.destination}</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                                                        {ticket.currency === 'USD' ? '$' : ticket.currency === 'EUR' ? '€' : ticket.currency === 'TRY' ? '₺' : ''}{ticket.convertedCost}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="w-full py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-lg transition-colors text-xs">
                                        View Flights
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Agent Reasoning (compact) */}
                        {decisionResult?.explanation && (
                            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 p-3 rounded-xl">
                                <h3 className="font-bold text-gray-900 dark:text-white text-xs mb-2 flex items-center gap-1.5">
                                    <span>🧠</span> Agent Reasoning
                                </h3>
                                <pre className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                    {decisionResult.explanation}
                                </pre>
                            </div>
                        )}

                        {/* Alternatives (compact) */}
                        {decisionResult && decisionResult.alternatives.filter(a => a.city && a.avgCostUsd > 0).length > 0 && (
                            <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 p-3 rounded-xl">
                                <h3 className="font-bold text-gray-900 dark:text-white text-xs mb-1">Alternatives</h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">Runner-ups evaluated by MCP pipeline</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {decisionResult.alternatives.filter(a => a.city && a.avgCostUsd > 0).map((alt, idx) => {
                                        const scoreDiff = decisionResult.winner.compositeScore - alt.compositeScore;
                                        return (
                                            <div key={alt.destinationCode} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs">Option {['B', 'C'][idx]}</h4>
                                                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded shrink-0">−{scoreDiff.toFixed(1)}</span>
                                                </div>
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-300 mb-2">{alt.city} <span className="text-gray-500 font-normal">({alt.destinationCode})</span></p>
                                                <div className="space-y-1 mb-2">
                                                    {alt.memberTickets.map((md) => {
                                                        const winnerTicket = decisionResult.winner.memberTickets.find(t => t.memberName === md.memberName);
                                                        const costDelta = winnerTicket ? winnerTicket.convertedCost - md.convertedCost : 0;
                                                        const timeDelta = winnerTicket ? md.flightTimeMinutes - winnerTicket.flightTimeMinutes : 0;
                                                        const currencySymbol = md.currency === 'USD' ? '$' : md.currency === 'EUR' ? '€' : md.currency === 'TRY' ? '₺' : '';
                                                        return (
                                                            <div key={md.memberName} className="flex justify-between items-center bg-white/60 dark:bg-black/20 px-2 py-1 rounded border border-white dark:border-gray-700/50">
                                                                <div className="flex flex-col">
                                                                    <span className="text-gray-900 dark:text-gray-300 text-[10px] font-semibold">{md.memberName} <span className="font-normal text-gray-500">({md.origin})</span></span>
                                                                    <span className={`text-[9px] font-medium ${timeDelta > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                        {timeDelta > 0 ? `+${Math.floor(timeDelta / 60)}h ${timeDelta % 60}m` : `${Math.floor(Math.abs(timeDelta) / 60)}h ${Math.abs(timeDelta) % 60}m shorter`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col text-right">
                                                                    <span className="text-[10px] font-bold font-mono text-gray-700 dark:text-gray-300">{currencySymbol}{md.convertedCost}</span>
                                                                    <span className={`text-[9px] font-medium ${costDelta > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                        {costDelta > 0 ? `-${currencySymbol}${Math.round(costDelta)}` : `+${currencySymbol}${Math.abs(Math.round(costDelta))}`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                                                    <div><span className="text-[9px] text-gray-500 uppercase">Avg</span> <span className="text-[11px] font-bold font-mono text-gray-700 dark:text-gray-300">
                                                        {alt.memberTickets[0]?.currency === 'USD' ? '$' : alt.memberTickets[0]?.currency === 'EUR' ? '€' : alt.memberTickets[0]?.currency === 'TRY' ? '₺' : ''}{alt.avgConvertedCost}
                                                    </span></div>
                                                    <div><span className="text-[9px] text-gray-500 uppercase">Time</span> <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{alt.avgFlightTime}</span></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDashboard;
