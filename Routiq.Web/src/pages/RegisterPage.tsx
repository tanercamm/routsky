import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { register as apiRegister } from '../api/routiqApi';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Sun, Moon, Globe, ChevronLeft } from 'lucide-react';
import { PASSPORT_CODES } from '../constants/passports';

// ── Step 1: Account details ──────────────────────────────────────────────────
function AccountStep({
    firstName, setFirstName, lastName, setLastName,
    email, setEmail, password, setPassword, onNext,
}: {
    firstName: string; setFirstName: (v: string) => void;
    lastName: string; setLastName: (v: string) => void;
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    onNext: () => void;
}) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
            </div>
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Create a password" minLength={6} />
            <Button
                variant="primary"
                className="w-full bg-purple-600 hover:bg-purple-500"
                onClick={e => { e.preventDefault(); if (firstName && email && password) onNext(); }}
            >
                Continue →
            </Button>
        </>
    );
}

// ── Step 2: Citizenship setup ────────────────────────────────────────────────
function CitizenshipStep({
    passports, setPassports,
}: {
    passports: string[];
    setPassports: (v: string[]) => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    Your Passport(s)
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
                    Select all citizenships you hold. The route engine will always evaluate your best-case visa outcome.
                </p>

                {/* Selected chips */}
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[2.25rem]">
                    {passports.length === 0 && (
                        <span className="text-xs text-gray-400 italic">No passports selected yet — add one below.</span>
                    )}
                    {Array.isArray(passports) && passports.map(code => {
                        if (!code) return null;
                        const opt = PASSPORT_CODES.find(o => o.code === code);
                        return (
                            <span key={code} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {opt?.label ?? code}
                                <button
                                    type="button"
                                    onClick={() => setPassports(passports.filter(p => p !== code))}
                                    className="ml-0.5 hover:text-red-500 transition-colors"
                                    aria-label={`Remove ${code}`}
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}
                </div>

                {/* Add dropdown */}
                <select
                    value=""
                    onChange={e => { const v = e.target.value; if (v && Array.isArray(passports) && !passports.includes(v)) setPassports([...passports, v]); }}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-colors"
                >
                    <option value="">+ Add a passport country...</option>
                    {Array.isArray(passports) && PASSPORT_CODES.filter(o => !passports.includes(o.code)).map(o => (
                        <option key={o.code} value={o.code}>{o.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

// ── Main RegisterPage ────────────────────────────────────────────────────────
export const RegisterPage = () => {
    const [step, setStep] = useState<1 | 2>(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Empty by default — user MUST select their citizenship
    const [passports, setPassports] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) { setStep(2); return; }
        if (passports.length === 0) { setError('Please add at least one passport.'); return; }

        setError('');
        setLoading(true);
        try {
            const response = await apiRegister({ email, password, firstName, lastName, passports });
            login(response.token, {
                id: response.id,
                email: response.email,
                name: response.name,
                role: response.role,
                passports,
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
            setError(err.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-900">
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700   transition-all text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Left Column — Form */}
            <div className="flex items-center justify-center p-8 lg:p-12 order-2 lg:order-1">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-sm">

                    {/* Header */}
                    <div className="mb-6">
                        <div className="w-9 h-9 bg-purple-50 dark:bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                            {step === 1
                                ? <UserPlus size={18} className="text-purple-600 dark:text-purple-400" />
                                : <Globe size={18} className="text-purple-600 dark:text-purple-400" />}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                            {step === 1 ? 'Create an account' : 'Set your citizenship'}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step === 1 ? 'Step 1 of 2 — Account details' : 'Step 2 of 2 — Which passports do you hold?'}
                        </p>
                    </div>

                    {/* Step indicator */}
                    <div className="flex gap-1.5 mb-5">
                        <div className="h-1 flex-1 rounded-full bg-purple-500" />
                        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                                    <AccountStep
                                        firstName={firstName} setFirstName={setFirstName}
                                        lastName={lastName} setLastName={setLastName}
                                        email={email} setEmail={setEmail}
                                        password={password} setPassword={setPassword}
                                        onNext={() => setStep(2)}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                                    <CitizenshipStep passports={passports} setPassports={setPassports} />
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                                        >
                                            <ChevronLeft size={13} /> Back
                                        </button>
                                        <Button
                                            variant="primary"
                                            className="flex-1 bg-purple-600 hover:bg-purple-500"
                                            disabled={loading || passports.length === 0}
                                        >
                                            {loading ? 'Creating account...' : 'Create account'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">Log in</Link>
                    </p>
                </motion.div>
            </div>

            {/* Right Column — Branding */}
            <div className="relative hidden lg:flex flex-col justify-end p-12 bg-gray-900 dark:bg-gray-950 order-1 lg:order-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/10" />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                        Start Your Journey<br />
                        <span className="text-purple-400">With Confidence.</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-md">
                        Set your citizenship once. The route engine evaluates your best-case visa outcome across all passports you hold — automatically.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};
