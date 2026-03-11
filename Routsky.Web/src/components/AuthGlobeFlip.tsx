import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../api/routskyApi';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { PASSPORT_CODES } from '../constants/passports';

// Lazy-load the heavy Globe component
const Globe = lazy(() => import('react-globe.gl').then(m => ({ default: m.default })));

// ── Design Tokens ───────────────────────────────────────────────────────────
const TRANSITION_DURATION = 1.2;
const LUXURY_EASE = [0.4, 0, 0.2, 1] as any;

const LOGIN_ACCENT = { primary: '#10b981', secondary: '#34d399', tertiary: '#6ee7b7' };
const REGISTER_ACCENT = { primary: '#8b5cf6', secondary: '#a78bfa', tertiary: '#c4b5fd' };

// Route arcs for the globe (emerald for login)
const GENERATE_ARCS = () => [...Array(20).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 160,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 160,
    endLng: (Math.random() - 0.5) * 360,
    color: ['#10b981', '#34d399'][Math.floor(Math.random() * 2)],
}));

// City points for the globe (purple for register)
const GENERATE_POINTS = () => [...Array(60).keys()].map(() => ({
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360,
    size: Math.random() * 0.4 + 0.1,
    color: ['#8b5cf6', '#a78bfa'][Math.floor(Math.random() * 2)]
}));

// ── Sub-Components ──────────────────────────────────────────────────────────

const FormInput = ({ label, accentColor, ...props }: any) => (
    <div className="space-y-1.5 group">
        <label className="text-[10px] uppercase tracking-[0.25em] font-semibold opacity-50 group-focus-within:opacity-80 transition-all"
            style={{ color: accentColor }}>
            {label}
        </label>
        <Input
            {...props}
            className="!bg-white/[0.04] border border-white/[0.08] rounded-lg h-12 px-4 focus:!border-white/20 transition-all text-sm tracking-wide placeholder:text-white/[0.15]"
        />
    </div>
);

function AccountStep({
    firstName, setFirstName, lastName, setLastName,
    email, setEmail, password, setPassword, onNext, accent
}: any) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <FormInput label="First Name" value={firstName} onChange={(e: any) => setFirstName(e.target.value)} placeholder="Alex" accentColor={accent.secondary} />
                <FormInput label="Last Name" value={lastName} onChange={(e: any) => setLastName(e.target.value)} placeholder="Smith" accentColor={accent.secondary} />
            </div>
            <FormInput label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="you@routsky.com" accentColor={accent.secondary} />
            <FormInput label="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" accentColor={accent.secondary} />
            <button
                type="button"
                className="w-full h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-200 text-white mt-2"
                style={{ background: accent.primary }}
                onClick={e => { e.preventDefault(); if (firstName && email && password) onNext(); }}
            >
                Continue
            </button>
        </div>
    );
}

function CitizenshipStep({ passports, setPassports, onBack, onSubmit, loading, accent }: any) {
    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.25em] font-semibold opacity-50 block" style={{ color: accent.secondary }}>
                    Passports
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg min-h-[4rem]">
                    {passports.length === 0 && <span className="text-[11px] text-white/[0.15] m-auto italic">Select your nationalities…</span>}
                    {passports.map((code: string) => {
                        const opt = PASSPORT_CODES.find(o => o.code === code);
                        return (
                            <motion.span
                                key={code}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="px-3 py-1.5 bg-white/[0.05] border border-white/10 text-white/70 text-[11px] font-medium flex items-center gap-2 rounded-md"
                            >
                                {opt?.label ?? code}
                                <button type="button" onClick={() => setPassports(passports.filter((p: string) => p !== code))} className="hover:text-white opacity-50 hover:opacity-100 transition-opacity">×</button>
                            </motion.span>
                        );
                    })}
                </div>
                <select
                    value=""
                    onChange={e => { const v = e.target.value; if (v && !passports.includes(v)) setPassports([...passports, v]); }}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg py-3 px-4 text-[11px] text-white/50 font-medium focus:outline-none appearance-none cursor-pointer hover:text-white/70 transition-colors"
                >
                    <option value="" className="bg-gray-950">+ Add passport…</option>
                    {PASSPORT_CODES.filter(o => !passports.includes(o.code)).map(o => (
                        <option key={o.code} value={o.code} className="bg-gray-950">{o.label}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onBack} className="flex-1 h-12 border border-white/[0.08] rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.04] transition-all">Back</button>
                <button
                    type="button"
                    className="flex-[2] h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-200 text-white disabled:opacity-50"
                    style={{ background: accent.primary }}
                    disabled={loading}
                    onClick={onSubmit}
                >
                    {loading ? 'Creating…' : 'Create Account'}
                </button>
            </div>
        </div>
    );
}

// ── Globe Panel ─────────────────────────────────────────────────────────────

function GlobeSection({ isNightSide, globeRef }: { isNightSide: boolean; globeRef: React.RefObject<any> }) {
    const arcsData = useMemo(() => GENERATE_ARCS(), []);
    const pointsData = useMemo(() => GENERATE_POINTS(), []);
    const accent = isNightSide ? REGISTER_ACCENT : LOGIN_ACCENT;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (globeRef.current) {
                globeRef.current.pointOfView({
                    lat: 20,
                    lng: isNightSide ? 180 : 0,
                    altitude: 2.5
                }, 1200);

                const controls = globeRef.current.controls();
                if (controls) {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 0.4;
                    controls.enableZoom = false;
                }
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [isNightSide, globeRef]);

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#020308]">
            {/* Globe — centered and scaled to fit within the container */}
            <div className="relative flex items-center justify-center" style={{ width: '75%', height: '75%', maxWidth: '600px', maxHeight: '600px' }}>
                <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent.primary}30`, borderTopColor: 'transparent' }} />
                    </div>
                }>
                    <Globe
                        ref={globeRef}
                        width={600}
                        height={600}
                        globeImageUrl={isNightSide
                            ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
                            : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'}
                        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                        backgroundImageUrl=""
                        atmosphereColor={accent.primary}
                        atmosphereAltitude={0.18}
                        arcsData={!isNightSide ? arcsData : []}
                        arcColor="color"
                        arcDashLength={0.5}
                        arcDashGap={4}
                        arcDashAnimateTime={2000}
                        arcStroke={0.5}
                        pointsData={isNightSide ? pointsData : []}
                        pointColor="color"
                        pointRadius="size"
                        pointsMerge={true}
                    />
                </Suspense>
            </div>

            {/* Logo + Routsky branding */}
            <div className="absolute bottom-8 left-8 z-20 pointer-events-none flex items-center gap-3">
                <img src="/assets/logo.png" alt="Routsky" className="h-9 w-auto object-contain opacity-90" />
                <span className="text-xl font-bold tracking-tight text-white/70">Routsky</span>
            </div>
        </div>
    );
}

// ── Form Panel ──────────────────────────────────────────────────────────────

function FormSection({ isRegister, accent, formProps, toggleFlip }: any) {
    const {
        email, setEmail, password, setPassword, loginError, loginLoading, handleLoginSubmit,
        step, setStep, firstName, setFirstName, lastName, setLastName,
        regEmail, setRegEmail, regPassword, setRegPassword,
        passports, setPassports, regError, regLoading, handleRegisterSubmit
    } = formProps;

    return (
        <div className="auth-passport relative z-10 flex flex-col h-full bg-[#060810] border-white/[0.04]"
            style={{
                borderLeft: isRegister ? 'none' : '1px solid rgba(255,255,255,0.04)',
                borderRight: isRegister ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>

            {/* Form Content */}
            <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-8 lg:px-14 justify-center py-12">
                {/* Title */}
                <div className="mb-10">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2">
                        {isRegister ? 'Create Account' : 'Routsky Staging v2'}
                    </h1>
                    <p className="text-sm text-white/30">
                        {isRegister ? 'Start planning your next adventure.' : 'Sign in to continue your journey.'}
                    </p>
                </div>

                {/* Form Fields */}
                {isRegister ? (
                    <div className="space-y-5">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div key="s1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                                    <AccountStep {...{ firstName, setFirstName, lastName, setLastName, email: regEmail, setEmail: setRegEmail, password: regPassword, setPassword: setRegPassword, onNext: () => setStep(2), accent }} />
                                </motion.div>
                            ) : (
                                <motion.div key="s2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                                    <CitizenshipStep passports={passports} setPassports={setPassports} onBack={() => setStep(1)} onSubmit={handleRegisterSubmit} loading={regLoading} accent={accent} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {regError && <p className="text-sm text-red-400 font-medium">{regError}</p>}
                    </div>
                ) : (
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <FormInput label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="you@routsky.com" accentColor={accent.secondary} />
                        <FormInput label="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" accentColor={accent.secondary} />
                        {loginError && <p className="text-sm text-red-400 font-medium">{loginError}</p>}
                        <button
                            type="submit"
                            className="w-full h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-200 text-white disabled:opacity-50"
                            style={{ background: accent.primary }}
                            disabled={loginLoading}
                        >
                            {loginLoading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                )}

                {/* Toggle */}
                <div className="mt-8 pt-6 border-t border-white/[0.04]">
                    <button type="button" onClick={toggleFlip}
                        className="text-sm font-medium transition-colors duration-200"
                        style={{ color: `${accent.secondary}80` }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = accent.secondary)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = `${accent.secondary}80`)}
                    >
                        {isRegister ? 'Already have an account? Sign In →' : "Don't have an account? Create one →"}
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="px-8 lg:px-14 pb-6 text-[10px] text-white/[0.1] flex justify-between">
                <span>Routsky © 2026</span>
                <span>Secure Connection</span>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────

export const AuthGlobeFlip = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const globeRef = useRef<any>(null);

    const isRegisterPath = location.pathname === '/register';
    const accent = isRegisterPath ? REGISTER_ACCENT : LOGIN_ACCENT;

    // ── Login State ──
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // ── Register State ──
    const [step, setStep] = useState<1 | 2>(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [passports, setPassports] = useState<string[]>([]);
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const response = await apiLogin({ email, password });
            login(response.token, response);
            navigate('/');
        } catch (err: any) {
            setLoginError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        if (step === 1) { setStep(2); return; }
        if (passports.length === 0) { setRegError('Please select at least one passport.'); return; }

        setRegError('');
        setRegLoading(true);
        try {
            const response = await apiRegister({ email: regEmail, password: regPassword, firstName, lastName, passports });
            login(response.token, response);
            navigate('/');
        } catch (err: any) {
            setRegError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setRegLoading(false);
        }
    };

    const toggleFlip = () => {
        setStep(1);
        navigate(isRegisterPath ? '/login' : '/register');
    };

    const formProps = {
        email, setEmail, password, setPassword, loginError, loginLoading, handleLoginSubmit,
        step, setStep, firstName, setFirstName, lastName, setLastName,
        regEmail, setRegEmail, regPassword, setRegPassword,
        passports, setPassports, regError, regLoading, handleRegisterSubmit
    };

    /*
     * Layout:
     *   Login:    [Form (LEFT)]  [Globe (RIGHT)] — Green theme
     *   Register: [Globe (LEFT)] [Form (RIGHT)]  — Purple theme
     *
     * The globe slides from one side to the other with a 180° rotation.
     */

    return (
        <div className="auth-passport min-h-screen bg-[#020308] overflow-hidden">
            <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
                {/* Column 1 (LEFT) */}
                <motion.div
                    className="relative h-[40vh] lg:h-screen"
                    layout
                    transition={{ duration: TRANSITION_DURATION, ease: LUXURY_EASE }}
                    style={{ zIndex: isRegisterPath ? 10 : 5 }}
                >
                    {isRegisterPath ? (
                        <GlobeSection isNightSide globeRef={globeRef} />
                    ) : (
                        <FormSection isRegister={false} accent={accent} formProps={formProps} toggleFlip={toggleFlip} />
                    )}
                </motion.div>

                {/* Column 2 (RIGHT) */}
                <motion.div
                    className="relative h-[40vh] lg:h-screen"
                    layout
                    transition={{ duration: TRANSITION_DURATION, ease: LUXURY_EASE }}
                    style={{ zIndex: isRegisterPath ? 5 : 10 }}
                >
                    {isRegisterPath ? (
                        <FormSection isRegister accent={accent} formProps={formProps} toggleFlip={toggleFlip} />
                    ) : (
                        <GlobeSection isNightSide={false} globeRef={globeRef} />
                    )}
                </motion.div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                .auth-passport { font-family: 'Inter', system-ui, sans-serif; }
                body { background-color: #020308; overflow-x: hidden; }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-text-fill-color: white;
                    -webkit-box-shadow: 0 0 0px 1000px #0a0a12 inset;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
        </div>
    );
};
