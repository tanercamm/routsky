import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { routiqApi } from '../api/routiqApi';
import { BarChart3, TrendingUp, TrendingDown, Leaf, Map, Loader2 } from 'lucide-react';
import type { AnalyticsData } from '../types';

export const AnalyticsPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user) return;
            try {
                const response = await routiqApi.get('/analytics');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-teal-600 dark:text-teal-400">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <BarChart3 size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Analytics Available</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">Travel with Navisio to generate real insights about your journeys.</p>
            </div>
        );
    }

    // Determine saving vs loss based on total savings value
    const isSaving = data.totalGroupSavings >= 0;

    // Sort regions by count for chart
    const popularRegionsSorted = (data.popularRegions || [])
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // top 5

    const totalRegionFlights = popularRegionsSorted.reduce((sum, item) => sum + item.value, 0);

    return (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Analytics & Insights</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your travel patterns, financial impact, and environmental footprint.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* ── Metric 1: Total Group Savings ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="text-emerald-500 dark:text-emerald-400" size={20} />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">All Time</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Group Savings</h3>
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-black text-gray-900 dark:text-white">
                                ${(Math.abs(data.totalGroupSavings)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {isSaving ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isSaving ? 'Saved against alternatives' : 'Overpaid vs average routes'}
                        </div>
                    </Card>
                </motion.div>

                {/* ── Metric 2: Carbon Footprint Estimate ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                <Leaf className="text-blue-500 dark:text-blue-400" size={20} />
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Active Trips</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Carbon Footprint</h3>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-gray-900 dark:text-white">
                                {data.carbonFootprintEstimate.totalKgCo2.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </span>
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">kg CO₂e</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${data.carbonFootprintEstimate.totalKgCo2 > 1500 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, (data.carbonFootprintEstimate.totalKgCo2 / 2000) * 100)}%` }}
                            />
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* ── Popular Regions Breakdown ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <Map className="text-indigo-500" size={18} />
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Top Regions Analyzed</h2>
                    </div>

                    {popularRegionsSorted.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Not enough routing data to determine regional trends.</p>
                    ) : (
                        <div className="space-y-4">
                            {popularRegionsSorted.map((item, index) => {
                                const percentage = totalRegionFlights > 0 ? (item.value / totalRegionFlights) * 100 : 0;
                                return (
                                    <div key={item.name} className="group">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                                            <span className="text-gray-500 dark:text-gray-400">{percentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 1, delay: 0.2 + (index * 0.1) }}
                                                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </motion.div>
        </main>
    );
};
