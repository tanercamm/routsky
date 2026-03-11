import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login as apiLogin } from '../api/routskyApi';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Sun, Moon } from 'lucide-react';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiLogin({ email, password });
            login(response.token, {
                id: response.id,
                email: response.email,
                name: response.name,
                role: response.role,
                passports: response.passports || [],
                avatarUrl: response.avatarUrl || response.AvatarUrl,
                origin: response.origin || "",
                preferredCurrency: response.preferredCurrency || "USD",
                unitPreference: response.unitPreference || "Metric",
                travelStyle: response.travelStyle || "Comfort",
                notificationsEnabled: response.notificationsEnabled ?? true,
                priceAlertsEnabled: response.priceAlertsEnabled ?? true
            });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-900">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700   transition-all text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Left Column — Branding */}
            <div className="relative hidden lg:flex flex-col justify-end p-16 bg-gray-900 dark:bg-gray-950">
                <div className="absolute top-12 left-16 z-20">
                    <img
                        src="/assets/logo.png"
                        alt="Routsky"
                        className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] opacity-90"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-blue-600/10" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-10"
                >
                    <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                        Discover the World,<br />
                        <span className="text-teal-400">One Route at a Time.</span>
                    </h2>
                    <p className="text-lg text-gray-400 max-w-md">
                        Join thousands of travelers planning precise adventures with real data — no AI hallucinations.
                    </p>
                </motion.div>
            </div>

            {/* Right Column — Form */}
            <div className="flex items-center justify-center p-8 lg:p-16">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8">
                        <div className="w-10 h-10 bg-teal-50 dark:bg-teal-500/10 rounded-lg flex items-center justify-center mb-5">
                            <LogIn size={20} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Routsky STAGING - VERIFIED V2</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enter your details to sign in.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 mb-5 flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                        <div>
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                            />
                            <div className="flex justify-end mt-1.5">
                                <a href="#" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">Forgot password?</a>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                            Sign up
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};
