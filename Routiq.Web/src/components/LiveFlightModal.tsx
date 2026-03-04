import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { routiqApi } from '../api/routiqApi';

interface TicketData {
    origin: string;
    destinationCode: string;
    costUsd: number;
    flightTime: string;
    visaRequired: boolean;
    visaType: string;
}

interface LiveFlightModalProps {
    destination: string;
    origin?: string;
    ticketData?: TicketData;
    onClose: () => void;
}

interface FlightData {
    flightNumber?: string;
    duration?: string;
    costUsd?: number;
    origin?: string;
    destination?: string;
    visaRequired?: boolean;
    visaType?: string;
    isFeasible?: boolean;
    isEstimate?: boolean;
    source?: string;
}

export default function LiveFlightModal({ destination, origin, ticketData, onClose }: LiveFlightModalProps) {
    const [flightData, setFlightData] = useState<FlightData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        // If orchestrator ticket data is provided, use it directly — no API call needed
        if (ticketData) {
            setFlightData({
                flightNumber: `TK ${ticketData.origin}-${ticketData.destinationCode}`,
                duration: ticketData.flightTime,
                costUsd: ticketData.costUsd,
                origin: ticketData.origin,
                destination: ticketData.destinationCode,
                visaRequired: ticketData.visaRequired,
                visaType: ticketData.visaType,
                isFeasible: true,
                isEstimate: false,
                source: 'Orchestrator MCP Pipeline'
            });
            setIsLoading(false);
            return;
        }

        // Fallback: fetch from backend API (for non-orchestrator usage)
        setIsLoading(true);
        setError(null);

        const fetchFlightData = async () => {
            try {
                const params = new URLSearchParams({ destination });
                if (origin) params.set('origin', origin);

                const response = await routiqApi.get(`/flights/live?${params.toString()}`);
                setFlightData(response.data);
            } catch (err: any) {
                console.error('Failed to fetch live flight data:', err);
                setError('Could not connect to flight service. Start backend: dotnet run');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFlightData();
    }, [destination, origin, ticketData]);

    const displayOrigin = flightData?.origin || origin || 'IST';

    const modalContent = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300" onClick={(e) => e.stopPropagation()}>

            {/* THEME-AWARE MODAL SHELL */}
            <div className="bg-white dark:bg-[#1A1E23] w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-700 p-8 relative flex flex-col max-h-[90vh] shadow-2xl transition-colors duration-300" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-3xl font-light">&times;</button>

                {/* Theme-Aware Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-[#E60000]">Turkish Airlines</span> Flight Data: {destination}
                    </h2>
                    {flightData?.source && (
                        <span className="text-[10px] text-gray-400 font-mono mt-1 inline-block">
                            Source: {flightData.source}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center flex-1 space-y-6 animate-pulse py-20 min-h-[300px]">
                        <div className="w-16 h-16 border-4 border-[#E60000] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 dark:text-gray-300 text-xl tracking-wide">Fetching flight data for {destination}...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-20 min-h-[300px]">
                        <div className="text-4xl mb-4">⚠️</div>
                        <p className="text-red-500 dark:text-red-400 text-sm font-medium text-center max-w-sm">{error}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">

                        {/* LEFT PANEL - Flight Details */}
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-xl border border-gray-200 dark:border-slate-700/50 flex flex-col justify-between transition-colors duration-300 shadow-inner">
                            <div>
                                <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 tracking-widest uppercase mb-4">
                                    Best Flight Option
                                </div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                    {flightData?.flightNumber || 'Flight TBD'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-slate-300 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700 flex items-center flex-wrap gap-1">
                                    <span className="font-bold text-gray-900 dark:text-white">{displayOrigin}</span> &rarr; {destination}
                                    {flightData?.duration ? <span className="opacity-70 ml-1">({flightData.duration})</span> : null}
                                </div>

                                {/* Visa Status */}
                                {flightData?.visaRequired !== undefined && (
                                    <div className={`p-2 rounded-lg text-xs font-medium mb-4 flex items-center gap-2 ${flightData.visaRequired
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                                        }`}>
                                        <span>{flightData.visaRequired ? '🛂' : '✅'}</span>
                                        <span>{flightData.visaRequired ? `Visa required (${flightData.visaType})` : `Visa-free (${flightData.visaType})`}</span>
                                    </div>
                                )}
                            </div>

                            {/* Price Display */}
                            <div>
                                <div className="flex flex-col mb-6">
                                    <div className="text-4xl font-black text-[#E60000] drop-shadow-sm flex items-end gap-2">
                                        ${flightData?.costUsd || '—'} <span className="text-2xl font-bold mb-1">USD</span>
                                        {flightData?.isEstimate && (
                                            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded ml-1 mb-1 border border-yellow-300 dark:border-yellow-600/50 tracking-wider uppercase font-bold">
                                                Estimate
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">
                                        Based on {displayOrigin} → {destination} route analysis
                                    </div>
                                </div>

                                {/* Interactive Handoff Button */}
                                <button
                                    onClick={() => {
                                        setIsRedirecting(true);
                                        setTimeout(() => {
                                            window.open('https://www.turkishairlines.com', '_blank');
                                            setIsRedirecting(false);
                                        }, 1500);
                                    }}
                                    disabled={isRedirecting}
                                    className={`w-full py-3 font-bold rounded-lg transition-all shadow-md text-sm flex items-center justify-center gap-2 ${isRedirecting
                                        ? 'bg-red-800 text-white cursor-wait opacity-90'
                                        : 'bg-[#E60000] hover:bg-[#CC0000] text-white'
                                        }`}
                                >
                                    {isRedirecting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Bağlanılıyor...
                                        </>
                                    ) : (
                                        'Book directly on Turkish Airlines'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* PREMIUM THY FLIGHT RADAR VISUALIZATION */}
                        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col h-full min-h-[220px] shadow-inner relative overflow-hidden transition-colors duration-300">

                            <style>{`
                                @keyframes smoothArcFly {
                                  0% { offset-distance: 0%; opacity: 0; transform: scale(0.6); }
                                  10% { opacity: 1; transform: scale(1); }
                                  90% { opacity: 1; transform: scale(1); }
                                  100% { offset-distance: 100%; opacity: 0; transform: scale(0.6); }
                                }
                                @keyframes sonarPulse {
                                  0% { r: 5; opacity: 1; stroke-width: 0; }
                                  100% { r: 18; opacity: 0; stroke-width: 1.5; }
                                }
                                .animate-fly-arc { 
                                  animation: smoothArcFly 8s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
                                  offset-path: path('M10 80 C 40 10, 160 10, 190 80');
                                  offset-rotate: auto 90deg;
                                }
                                .animate-sonar {
                                  animation: sonarPulse 2s ease-out infinite;
                                }
                              `}</style>

                            {/* Visualization Canvas */}
                            <div className="relative w-full h-32 flex items-center justify-center mb-6">
                                <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:drop-shadow-none">

                                    {/* Background Grid */}
                                    <defs>
                                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-100 dark:text-slate-800" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />

                                    {/* Static Smooth Arc Path */}
                                    <path
                                        d="M10 80 C 40 10, 160 10, 190 80"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        className="text-gray-200 dark:text-slate-600"
                                    />

                                    {/* Origin Point — Dynamic */}
                                    <circle cx="10" cy="80" r="4" className="fill-gray-600 dark:fill-slate-400" />
                                    <text x="10" y="94" textAnchor="middle" className="text-[9px] font-bold fill-gray-600 dark:fill-slate-400">{displayOrigin}</text>

                                    {/* Destination Point */}
                                    <circle cx="190" cy="80" className="fill-transparent stroke-[#E60000] animate-sonar" />
                                    <circle cx="190" cy="80" r="5" className="fill-[#E60000]" />
                                    <text x="190" y="94" textAnchor="middle" className="text-[9px] font-bold fill-[#E60000]">
                                        {destination || 'DST'}
                                    </text>

                                    {/* The Animated Plane */}
                                    <g className="animate-fly-arc fill-gray-900 dark:fill-white drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">
                                        <svg x="-12" y="-12" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                                        </svg>
                                    </g>
                                </svg>
                            </div>

                            {/* Status / Label */}
                            <div className="text-center z-10 border-t border-gray-100 dark:border-slate-800 pt-4 mt-auto">
                                <div className="font-bold text-gray-900 dark:text-white tracking-wide text-sm flex items-center justify-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${flightData?.isEstimate === false ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
                                    {flightData?.isEstimate === false ? 'MCP Pipeline Data' : 'Estimated Route Data'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 italic mt-1 px-2">
                                    {flightData?.source || 'Pending connection'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
