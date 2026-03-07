import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

// V1-compatible type kept local — no longer tied to types/index.ts
interface V1RouteStop { city: string; days: number; }
interface V1RouteOption { routeType: string; totalEstimatedCost: number; stops: V1RouteStop[]; }

interface CostVsDurationChartProps {
    data: V1RouteOption[];
}

const COLORS = ['#2dd4bf', '#3b82f6', '#a78bfa', '#f472b6', '#fbbf24'];

export const CostVsDurationChart = ({ data }: CostVsDurationChartProps) => {
    const chartData = data.map((route) => ({
        name: route.routeType,
        cost: route.totalEstimatedCost,
        cities: route.stops.map(s => s.city).join(' → '),
        days: route.stops.reduce((sum, s) => sum + s.days, 0),
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg ">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
                    <p className="text-teal-600 dark:text-teal-400 font-medium text-sm mt-1">
                        Cost: ${payload[0].value.toLocaleString()}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        {payload[0].payload.cities}
                    </p>
                    <p className="text-gray-400 text-xs">
                        {payload[0].payload.days} days
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full h-[300px] mb-6 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60  p-6"
        >
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Comparison</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156,163,175,0.1)' }} />
                    <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                        {chartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
