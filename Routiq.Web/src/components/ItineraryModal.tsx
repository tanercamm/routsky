import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AttractionInfo } from '../utils/itineraryData';
import { X, Clock, DollarSign, ShieldCheck, Thermometer, Timer, Bookmark, Check } from 'lucide-react';
import {
    getFlightForCity,
    getReturnFlight,
    getAttractionsForCity,
    getAccommodationForCity,
} from '../utils/itineraryData';
import { getCommunityTipsForCity, countryCodeToFlag } from '../utils/communityData';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { formatTimeAMPM, calculateFlightDuration, isNextDay } from '../utils/timeFormat';
import { useAuth } from '../context/AuthContext';
import { routiqApi } from '../api/routiqApi';
import LiveFlightModal from './LiveFlightModal';

// V1-compatible shape the modal was built against
interface V1RouteStop {
    city: string;
    country: string;
    days: number;
    estimatedCost: number;
    climate: string;
    visaStatus: string;
}

interface V1RouteOption {
    routeType: string;
    description: string;
    totalEstimatedCost: number;
    stops: V1RouteStop[];
}

interface ItineraryModalProps {
    route: V1RouteOption | null;
    onClose: () => void;
}

const categoryIcon: Record<string, string> = {
    Historical: '🏛️',
    Nature: '🌿',
    Museum: '🖼️',
    Entertainment: '🎭',
};

const timeOfDayIcon: Record<string, string> = {
    Morning: '🌅',
    Afternoon: '☀️',
    Evening: '🌇',
    Anytime: '🕐',
};

export const ItineraryModal = ({ route, onClose }: ItineraryModalProps) => {
    const [saved, setSaved] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [isLiveFlightModalOpen, setIsLiveFlightModalOpen] = useState(false);
    const { token } = useAuth();

    if (!route) return null;

    const handleSave = async () => {
        try {
            if (!token) {
                console.error("No auth token available");
                return;
            }

            const firstCity = route.stops.length > 0 ? route.stops[0].city : 'Unknown';

            await routiqApi.post('/routes/save', {
                destinationCity: firstCity,
                totalBudget: route.totalEstimatedCost,
                durationDays: totalDays,
                itinerarySnapshotJson: JSON.stringify(route),
            });

            setSaved(true);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('Error saving trip:', error);
        }
    };


    const dayRanges = route.stops.reduce<{ start: number; end: number }[]>((acc, stop, i) => {
        const start = i === 0 ? 1 : acc[i - 1].end + 1;
        const end = start + stop.days - 1;
        acc.push({ start, end });
        return acc;
    }, []);

    const totalDays = route.stops.reduce((sum, s) => sum + s.days, 0);

    const distributeAttractions = (cityAttractions: AttractionInfo[], days: number): AttractionInfo[][] => {
        const dailyPlan: AttractionInfo[][] = Array.from({ length: days }, () => []);
        const sorted = [...cityAttractions].sort((a, b) => {
            const order = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
            return order.indexOf(a.bestTimeOfDay) - order.indexOf(b.bestTimeOfDay);
        });
        sorted.forEach((attraction, idx) => {
            dailyPlan[idx % days].push(attraction);
        });
        return dailyPlan;
    };

    return (
        <AnimatePresence>
            {route && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl "
                        initial={{ opacity: 0, scale: 0.92, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* ── Header ── */}
                        <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {route.routeType}
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{route.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={handleSave}
                                        disabled={saved}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 cursor-default'
                                            : 'bg-teal-600 hover:bg-teal-500 text-white '
                                            }`}
                                    >
                                        {saved ? <><Check size={16} /> Saved</> : <><Bookmark size={16} /> Save Trip</>}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Summary tags */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                <span className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/25 rounded-full px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                                    📅 {totalDays} Days
                                </span>
                                <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 rounded-full px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                    💰 ${route.totalEstimatedCost.toLocaleString()} Total
                                </span>
                                {route.stops.map((s, i) => (
                                    <span key={i} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                                        <Thermometer size={10} /> {s.climate}
                                    </span>
                                ))}
                                {route.stops.map((s, i) => (
                                    <span key={`visa-${i}`} className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-full px-3 py-1 text-xs text-green-700 dark:text-green-300">
                                        <ShieldCheck size={10} /> {s.visaStatus}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* ── Timeline Body ── */}
                        <div className="px-6 py-6">
                            <div className="relative border-l-2 border-teal-300 dark:border-teal-500/30 ml-4">

                                {route.stops.map((stop, stopIdx) => {
                                    const flight = getFlightForCity(stop.city);
                                    const returnFlight = getReturnFlight(stop.city);
                                    const accommodation = getAccommodationForCity(stop.city);
                                    const cityAttractions = getAttractionsForCity(stop.city);
                                    const dailyPlan = distributeAttractions(cityAttractions, stop.days);
                                    const communityTips = getCommunityTipsForCity(stop.city);
                                    const isLastStop = stopIdx === route.stops.length - 1;

                                    return (
                                        <motion.div
                                            key={stopIdx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: stopIdx * 0.2, duration: 0.4 }}
                                        >
                                            {/* ── City Header Node ── */}
                                            <div className="relative pl-8 pb-2">
                                                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 border-2 border-white dark:border-gray-900 " />
                                                <div className="flex items-baseline gap-3">
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stop.city}</h3>
                                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{stop.country}</span>
                                                    <span className="ml-auto bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30">
                                                        {dayRanges[stopIdx].start === dayRanges[stopIdx].end
                                                            ? `Day ${dayRanges[stopIdx].start}`
                                                            : `Day ${dayRanges[stopIdx].start}–${dayRanges[stopIdx].end}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ── Arrival Flight ── */}
                                            {flight && (
                                                <div className="relative pl-8 py-2">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-blue-400/60" />
                                                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg">✈️</span>
                                                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                {stopIdx === 0 ? 'Outbound Flight' : `Flight to ${stop.city}`}
                                                            </span>
                                                            {!flight.isDirect && (
                                                                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                                                                    1 Stop
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-500 text-xs block">Airline</span>
                                                                <span className="text-gray-900 dark:text-white font-medium">{flight.airlineName}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-500 text-xs block">Flight</span>
                                                                <span className="text-gray-900 dark:text-white font-medium">{flight.flightNumber}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-500 text-xs block">Departure</span>
                                                                <span className="text-gray-900 dark:text-white">{flight.origin} · <span className="text-blue-600 dark:text-blue-300 font-medium">{formatTimeAMPM(flight.departureTime)}</span></span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 dark:text-gray-500 text-xs block">Arrival</span>
                                                                <span className="text-gray-900 dark:text-white">
                                                                    {flight.destination} · <span className="text-blue-600 dark:text-blue-300 font-medium">{formatTimeAMPM(flight.arrivalTime)}</span>
                                                                    {isNextDay(flight.departureTime, flight.arrivalTime) && (
                                                                        <span className="ml-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[9px] px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/20 font-semibold">
                                                                            +1 Day
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-blue-200 dark:border-blue-500/10">
                                                            <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300 font-medium">
                                                                <Timer size={12} /> {calculateFlightDuration(flight.departureTime, flight.arrivalTime)}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                Est. Price: <span className="text-gray-900 dark:text-white font-medium">${flight.minPrice} – ${flight.maxPrice} {flight.currency}</span>
                                                                <span className="text-gray-400 dark:text-gray-500 ml-1">(avg ~${flight.averagePrice})</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Accommodation ── */}
                                            {accommodation && (
                                                <div className="relative pl-8 py-2">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-purple-400/60" />
                                                    <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg">🏨</span>
                                                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Accommodation</span>
                                                            <span className="ml-auto bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/20">
                                                                {accommodation.category}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-900 dark:text-white font-medium text-sm">{accommodation.zoneName}</p>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{accommodation.description}</p>
                                                        <p className="text-purple-700 dark:text-purple-300 text-xs mt-2 font-medium">
                                                            ${accommodation.averageNightlyCost}/night · {stop.days} nights = <span className="text-gray-900 dark:text-white">${accommodation.averageNightlyCost * stop.days}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Daily Attraction Plan ── */}
                                            {dailyPlan.map((dayAttractions, dayIdx) => (
                                                <div key={dayIdx} className="relative pl-8 py-2">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-teal-400/60" />

                                                    <div className="mb-2">
                                                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                                                            📍 Day {dayRanges[stopIdx].start + dayIdx} — {stop.city}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {dayAttractions.map((attraction, aIdx) => (
                                                            <div
                                                                key={aIdx}
                                                                className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-base mt-0.5">{categoryIcon[attraction.category] ?? '📍'}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{attraction.name}</h4>
                                                                            <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                                                {attraction.category}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{attraction.description}</p>
                                                                        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-500">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock size={10} /> {attraction.estimatedDurationInHours}h
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <DollarSign size={10} /> {attraction.estimatedCost === 0 ? 'Free' : `$${attraction.estimatedCost}`}
                                                                            </span>
                                                                            <span>
                                                                                {timeOfDayIcon[attraction.bestTimeOfDay] ?? ''} {attraction.bestTimeOfDay}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {dayAttractions.length === 0 && (
                                                            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-500 italic">
                                                                🧘 Free day — explore on your own, relax, or discover hidden gems.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* ── Community Advice ── */}
                                            {communityTips.length > 0 && (
                                                <div className="relative pl-8 py-2">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-amber-400/60" />
                                                    <div className="bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/15 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <MessageCircle size={16} className="text-amber-600 dark:text-amber-400" />
                                                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Community Advice</span>
                                                            <span className="text-[10px] text-gray-500 ml-auto">{communityTips.length} tips</span>
                                                        </div>
                                                        <div className="space-y-2.5">
                                                            {communityTips.map((tip, tIdx) => (
                                                                <div key={tIdx} className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-lg p-3">
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <span className="text-sm">{countryCodeToFlag(tip.countryCode)}</span>
                                                                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{tip.username}</span>
                                                                        <span className="flex items-center gap-1 ml-auto text-[10px] text-amber-600 dark:text-amber-300">
                                                                            <ThumbsUp size={10} /> {tip.upvotes}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{tip.content}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Return Flight (last stop only) ── */}
                                            {isLastStop && returnFlight && (
                                                <div className="relative pl-8 py-2">
                                                    <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-orange-400/60" />
                                                    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg">🛫</span>
                                                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Return Flight</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 text-xs block">Airline</span>
                                                                <span className="text-gray-900 dark:text-white font-medium">{returnFlight.airlineName}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs block">Flight</span>
                                                                <span className="text-gray-900 dark:text-white font-medium">{returnFlight.flightNumber}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs block">Departure</span>
                                                                <span className="text-gray-900 dark:text-white">{returnFlight.origin} · <span className="text-orange-600 dark:text-orange-300 font-medium">{formatTimeAMPM(returnFlight.departureTime)}</span></span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs block">Arrival</span>
                                                                <span className="text-gray-900 dark:text-white">
                                                                    {returnFlight.destination} · <span className="text-orange-600 dark:text-orange-300 font-medium">{formatTimeAMPM(returnFlight.arrivalTime)}</span>
                                                                    {isNextDay(returnFlight.departureTime, returnFlight.arrivalTime) && (
                                                                        <span className="ml-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[9px] px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/20 font-semibold">
                                                                            +1 Day
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-orange-200 dark:border-orange-500/10">
                                                            <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-300 font-medium">
                                                                <Timer size={12} /> {calculateFlightDuration(returnFlight.departureTime, returnFlight.arrivalTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Spacer between stops */}
                                            {!isLastStop && <div className="h-4" />}
                                        </motion.div>
                                    );
                                })}

                                {/* End marker */}
                                <div className="relative pl-8 pt-4">
                                    <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white dark:border-gray-900 flex items-center justify-center ">
                                        <span className="text-[10px]">✓</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium pt-0.5">Trip Complete 🎉</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex gap-6 text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-900 dark:text-white">{route.stops.length}</span> {route.stops.length === 1 ? 'city' : 'cities'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold text-gray-900 dark:text-white">{totalDays}</span> days
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    <span className="text-teal-500">$</span><span className="font-semibold text-gray-900 dark:text-white">{route.totalEstimatedCost.toLocaleString()}</span> est.
                                </span>
                            </div>

                            <div className="flex w-full sm:w-auto gap-3">
                                {/* THY Live Flight Data Button */}
                                <button
                                    onClick={() => setIsLiveFlightModalOpen(true)}
                                    className="flex-1 sm:flex-none relative overflow-hidden group bg-gray-900 hover:bg-black dark:bg-black dark:hover:bg-gray-900 text-white font-medium text-sm px-4 py-2 rounded-lg border border-gray-800 dark:border-gray-700  transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <div className="absolute inset-0 w-1/4 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                                    <div className="relative flex items-center justify-center bg-red-600 rounded-full w-4 h-4 shrink-0  border border-red-500">
                                        <span className="text-[10px] text-white">✈️</span>
                                    </div>
                                    <span className="tracking-wide text-xs sm:text-sm">Check Live THY Flights</span>
                                    <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                    </div>
                                </button>

                                <button
                                    onClick={onClose}
                                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border border-transparent"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saved}
                                    className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none ${saved
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 cursor-default'
                                        : 'bg-teal-600 hover:bg-teal-500 text-white '
                                        }`}
                                >
                                    {saved ? <><Check size={16} /> Saved</> : <><Bookmark size={16} /> Save Trip</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Toast notification */}
                    <AnimatePresence>
                        {showToast && (
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-5 py-3 rounded-xl  flex items-center gap-2 text-sm font-medium"
                            >
                                <Check size={16} /> Trip saved successfully!
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Embedded LiveFlightModal */}
                    {isLiveFlightModalOpen && (
                        <LiveFlightModal
                            onClose={() => setIsLiveFlightModalOpen(false)}
                            destination={route.stops.length > 0 ? route.stops[0].city : 'Unknown'}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
