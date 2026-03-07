import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';

import RouteDetailsModal from './RouteDetailsModal';
interface V1RouteStop { city: string; country: string; days: number; climate: string; visaStatus: string; }
interface V1RouteOption { routeType: string; description: string; totalEstimatedCost: number; stops: V1RouteStop[]; }

interface RouteCardProps {
    option: V1RouteOption;
    index: number;
    onViewItinerary: (option: V1RouteOption) => void;
    onSave?: (option: V1RouteOption) => Promise<void>;
    saved?: boolean;
}

export const RouteCard = ({ option, index, onSave, saved }: RouteCardProps) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const trip = { destination: option.stops.length > 0 ? option.stops[0].city : 'Tokyo', isSaved: saved };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
        >
            <Card hoverEffect className="h-full flex flex-col justify-between border-t-2 border-t-teal-500 relative">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {option.routeType}
                        </h3>
                        <span className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20 font-medium">
                            Recommended
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                        {option.description}
                    </p>

                    <div className="space-y-1 mb-5 divide-y divide-gray-100 dark:divide-gray-800/50">
                        {option.stops.map((stop, i) => (
                            <div key={i} className="flex items-center justify-between py-2 mt-2">
                                {/* Left side: Destination Info */}
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                    <span className="text-lg">📍</span> {/* Dynamic flag normally here */}
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{stop.city}</span>
                                    <span className="text-[10px] text-gray-500 tracking-widest uppercase ml-1">{stop.country}</span>
                                </div>

                                {/* Right side: Core Metrics */}
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    <span className="flex items-center gap-1">🗓️ {stop.days} Days</span>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <span className="flex items-center gap-1">☀️ {stop.climate}</span>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{stop.visaStatus}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FORCE-SHRUNK FOOTER - DO NOT MODIFY */}
                <div className="mt-2 h-10 border-t border-gray-200 dark:border-gray-700/50 flex justify-end items-center bg-transparent px-3">

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDetailsOpen(true);
                        }}
                        className="h-7 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-[11px] font-black uppercase tracking-widest rounded transition-all border border-gray-300 dark:border-gray-600  flex items-center"
                    >
                        VIEW DETAILS &rarr;
                    </button>

                    {isDetailsOpen && (
                        <RouteDetailsModal trip={trip} onClose={() => setIsDetailsOpen(false)} onSave={() => onSave?.(option)} />
                    )}
                </div>
            </Card>
        </motion.div>
    );
};
