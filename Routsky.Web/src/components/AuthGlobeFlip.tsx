import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login as apiLogin, register as apiRegister, BASE_URL } from '../api/routskyApi';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { PASSPORT_CODES } from '../constants/passports';

// Lazy-load the heavy Globe component
const Globe = lazy(() => import('react-globe.gl').then(m => ({ default: m.default })));

// ── Design Tokens ───────────────────────────────────────────────────────────
const TRANSITION_DURATION = 1.2;
const LUXURY_EASE = [0.4, 0, 0.2, 1] as any;

const LOGIN_ACCENT = { primary: '#00E676', secondary: '#00E676', tertiary: '#00E676' };
const REGISTER_ACCENT = { primary: '#D500F9', secondary: '#D500F9', tertiary: '#D500F9' };

// Dynamic data trails (animated satellite/flight paths)
const GENERATE_ARCS = () => [...Array(24).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 160,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 160,
    endLng: (Math.random() - 0.5) * 360,
    dashLength: Math.random() * 0.2 + 0.1,
    dashGap: Math.random() * 0.5 + 0.5,
    dashAnimateTime: Math.random() * 2000 + 3000
}));

// ── Sub-Components ──────────────────────────────────────────────────────────

const FormInput = ({ label, accentColor, isLight, ...props }: any) => {
    return (
        <div className="space-y-1 group w-full text-left">
            <label className="text-[10px] uppercase tracking-[0.25em] font-semibold opacity-50 block mb-1.5 transition-colors duration-[1200ms]"
                style={{ color: accentColor }}>
                {label}
            </label>
            <Input
                {...props}
                value={props.value ?? ''}
                className={`!bg-white/[0.04] border rounded-lg h-12 px-4 transition-all text-sm tracking-wide w-full ${isLight
                    ? 'border-gray-200 focus:!border-[#007AFF]/50 text-gray-900 placeholder:text-gray-400'
                    : 'border-white/[0.08] focus:!border-white/20 text-white placeholder:text-white/[0.15]'
                    }`}
            />
        </div>
    );
};

function AccountStep({
    firstName, setFirstName, lastName, setLastName,
    email, setEmail, password, setPassword, onNext, accent, isLight
}: any) {
    return (
        <div className="space-y-4 text-left w-full">
            <div className="grid grid-cols-2 gap-4">
                <FormInput label="First Name" value={firstName || ''} onChange={(e: any) => setFirstName(e.target.value)} placeholder="Alex" accentColor={accent.secondary} isLight={isLight} />
                <FormInput label="Last Name" value={lastName || ''} onChange={(e: any) => setLastName(e.target.value)} placeholder="Smith" accentColor={accent.secondary} isLight={isLight} />
            </div>
            <FormInput label="Email" type="email" value={email || ''} onChange={(e: any) => setEmail(e.target.value)} required placeholder="you@routsky.com" accentColor={accent.secondary} isLight={isLight} />
            <FormInput label="Password" type="password" value={password || ''} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" accentColor={accent.secondary} isLight={isLight} />
            <div className="flex justify-center pt-2">
                <button
                    type="button"
                    className="w-full h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-300 text-white hover:brightness-110 active:scale-[0.98]"
                    style={{ background: accent.primary, boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 4px 15px rgba(0,0,0,0.1)' }}
                    onClick={e => { e.preventDefault(); if (firstName && email && password) onNext(); }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

function CitizenshipStep({ passports, setPassports, onBack, onSubmit, loading, accent, isLight }: any) {
    return (
        <div className="space-y-5 text-left w-full">
            <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.25em] font-semibold opacity-50 block transition-colors duration-[1200ms]" style={{ color: accent.secondary }}>
                    Passports
                </label>
                <div className={`flex flex-wrap gap-2 p-4 rounded-lg min-h-[5rem] transition-all duration-[1200ms] border ${isLight ? 'bg-black/[0.02] border-gray-200' : 'bg-white/[0.02] border-white/[0.06]'
                    }`}>
                    {passports.length === 0 && <span className={`text-[11px] m-auto italic ${isLight ? 'text-gray-400' : 'text-white/20'}`}>Select your nationalities…</span>}
                    {passports.map((code: string) => {
                        const opt = PASSPORT_CODES.find(o => o.code === code);
                        return (
                            <motion.span
                                key={code}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`px-3 py-1.5 border text-[11px] font-medium flex items-center gap-2 rounded-md transition-all ${isLight
                                    ? 'bg-white border-gray-200 text-gray-700 shadow-sm'
                                    : 'bg-white/[0.05] border-white/10 text-white/70'
                                    }`}
                            >
                                {opt?.label ?? code}
                                <button type="button" onClick={() => setPassports(passports.filter((p: string) => p !== code))} className={`hover:text-red-500 transition-opacity ${isLight ? 'text-gray-400' : 'text-white/40'}`}>×</button>
                            </motion.span>
                        );
                    })}
                </div>
                <div className="relative">
                    <select
                        value=""
                        onChange={e => { const v = e.target.value; if (v && !passports.includes(v)) setPassports([...passports, v]); }}
                        className={`w-full border rounded-lg py-3 px-4 text-[11px] font-semibold focus:outline-none appearance-none cursor-pointer transition-all ${isLight
                            ? 'bg-white border-gray-200 text-gray-700 hover:border-[#007AFF]/30'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/20'
                            }`}
                    >
                        <option value="" className={isLight ? 'bg-white text-gray-900' : 'bg-gray-950 text-white'}>+ Add passport…</option>
                        {PASSPORT_CODES.filter(o => !passports.includes(o.code)).map(o => (
                            <option key={o.code} value={o.code} className={isLight ? 'bg-white text-gray-900' : 'bg-gray-950 text-white'}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex justify-center pt-2 gap-3 w-full">
                <button type="button" onClick={onBack}
                    className={`w-1/3 h-12 border rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${isLight
                        ? 'border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                        : 'border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.04]'
                        }`}>Back</button>
                <button
                    type="button"
                    className="w-[60%] h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-300 text-white disabled:opacity-50 flex items-center justify-center p-0"
                    style={{ background: accent.primary, boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 4px 15px rgba(0,0,0,0.1)' }}
                    disabled={loading}
                    onClick={onSubmit}
                >
                    {loading ? 'Creating…' : 'Finalize Registration'}
                </button>
            </div>
        </div>
    );
}

// ── Main Layout Definition ──────────────────────────────────────────────────

export const AuthGlobeFlip = () => {
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const globeRef = useRef<any>(null);

    const isLight = theme === 'light';
    const isRegisterPath = location.pathname === '/register';
    const accent = isRegisterPath ? REGISTER_ACCENT : LOGIN_ACCENT;

    // ── Globe Dimensions (70% scaling for elegant orb) ──
    const [globeSize, setGlobeSize] = useState(window.innerHeight * 0.70);
    useEffect(() => {
        const handleResize = () => setGlobeSize(window.innerHeight * 0.70);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const handleSocialLogin = (provider: string) => {
        const apiBase = BASE_URL;
        const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        window.location.href = `${baseUrl}/auth/social/${provider}`;
    };

    const toggleFlip = () => {
        setStep(1);
        navigate(isRegisterPath ? '/login' : '/register');
    };

    const arcsData = useMemo(() => GENERATE_ARCS(), []);

    useEffect(() => {
        const initGlobe = () => {
            if (globeRef.current) {
                globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);
                const controls = globeRef.current.controls();
                if (controls) {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 0.5;
                    controls.enableZoom = false;
                }
            }
        };

        const timer = setTimeout(initGlobe, 300);
        let attempt = 0;
        const interval = setInterval(() => {
            if (globeRef.current) {
                const controls = globeRef.current.controls();
                if (controls && typeof controls.autoRotate !== 'undefined') {
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 0.5;
                    controls.enableZoom = false;
                    attempt++;
                    if (attempt > 5) clearInterval(interval);
                }
            }
        }, 500);

        return () => { clearTimeout(timer); clearInterval(interval); };
    }, []);

    return (
        <div className={`auth-passport w-full h-screen overflow-hidden relative transition-colors duration-[1200ms] ${isLight ? 'bg-[#F5F5F7]' : 'bg-[#020308]'}`}>

            {/* Premium Theme Toggle (High Z-Index) */}
            <div className="absolute top-6 right-6 z-[100]">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleTheme();
                    }}
                    className={`p-3 rounded-full transition-all duration-500 shadow-xl backdrop-blur-xl border pointer-events-auto ${isLight
                        ? 'bg-white/80 hover:bg-white text-[#007AFF] border-gray-200'
                        : 'bg-[#0c1424]/80 hover:bg-[#0c1424] text-white border-white/10'
                        }`}
                    title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
                >
                    {isLight ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            {/* Globe Half (No borders, zero vertical lines) */}
            <motion.div
                initial={false}
                animate={{ left: isRegisterPath ? '0%' : '50%' }}
                transition={{ duration: TRANSITION_DURATION, ease: LUXURY_EASE }}
                className="absolute top-0 w-1/2 h-full z-0 flex items-center justify-center overflow-hidden pointer-events-none"
                style={{ border: 'none' }}
            >
                <div
                    className="absolute top-1/2 flex items-center justify-center globe-glow transition-all duration-[1200ms]"
                    style={{
                        width: globeSize + 100,
                        height: globeSize + 100,
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'transparent',
                        filter: isLight 
                            ? `drop-shadow(0 0 30px ${accent.primary})` 
                            : `drop-shadow(0 0 15px ${accent.primary}80)`
                    }}
                >
                    <Suspense fallback={null}>
                        <Globe
                            ref={globeRef}
                            width={globeSize}
                            height={globeSize}
                            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                            backgroundImageUrl=""
                            backgroundColor="rgba(0,0,0,0)"
                            atmosphereColor={accent.primary}
                            atmosphereAltitude={0.25}
                            showAtmosphere={true}
                            arcsData={arcsData}
                            arcColor={() => accent.primary}
                            arcDashLength="dashLength"
                            arcDashGap="dashGap"
                            arcDashAnimateTime="dashAnimateTime"
                            arcStroke={0.5}
                        />
                    </Suspense>
                </div>
            </motion.div>

            {/* Auth Form Half (No borders, zero vertical lines) */}
            <motion.div
                initial={false}
                animate={{ left: isRegisterPath ? '50%' : '0%' }}
                transition={{ duration: TRANSITION_DURATION, ease: LUXURY_EASE }}
                className="absolute top-0 w-1/2 h-full z-20 flex flex-col justify-center items-center px-4 overflow-hidden"
                style={{ border: 'none' }}
            >
                {/* Logo and Staging Text (Outside and Above the Card) */}
                <div className="w-full max-w-[460px] relative flex flex-col items-start mb-8 pl-1">
                    <div className="flex items-center gap-4 opacity-100">
                        <img src="/assets/logo.png" alt="Routsky" className="h-[42px] w-auto object-contain transition-transform group-hover:scale-105" />
                        <div className="flex flex-col justify-center translate-y-[1px] text-left">
                            <div className={`text-[32px] tracking-tighter leading-none pb-[2px] transition-colors duration-[1200ms] ${isLight ? 'text-[#001A33]' : 'text-[#007AFF]'}`}>
                                <span className="font-bold">Rout</span>
                                <span className="font-light">sky</span>
                            </div>
                            <span className={`text-[10px] font-bold leading-none tracking-widest uppercase transition-colors duration-[1200ms] ${isLight ? 'text-gray-400' : 'text-white/40'}`}>Orchestrating the World</span>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-[460px] relative flex flex-col items-start">
                    {/* Authentication Card (70% Opacity) */}
                    <div className="w-full p-8 sm:p-10 rounded-3xl relative z-20 flex flex-col items-center transition-all duration-[1200ms]" style={{
                        background: isLight ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : accent.primary + '30'}`,
                        boxShadow: isLight
                            ? '0 25px 60px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)'
                            : `0 0 50px ${accent.primary}10`
                    }}>

                        <div className="relative min-h-[300px] w-full pt-4">
                            <AnimatePresence mode="wait">
                                {isRegisterPath ? (
                                    <motion.div
                                        key="register-form"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.6, ease: LUXURY_EASE }}
                                        className="absolute inset-0 flex flex-col items-center w-full"
                                    >
                                        <div className="space-y-4 w-full">
                                            <AnimatePresence mode="wait">
                                                {step === 1 ? (
                                                    <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                                                        <AccountStep {...{ firstName, setFirstName, lastName, setLastName, email: regEmail || '', setEmail: setRegEmail, password: regPassword || '', setPassword: setRegPassword, onNext: () => setStep(2), accent, isLight }} />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                                                        <CitizenshipStep passports={passports} setPassports={setPassports} onBack={() => setStep(1)} onSubmit={handleRegisterSubmit} loading={regLoading} accent={accent} isLight={isLight} />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {regError && <p className="text-sm text-red-500 font-medium text-center">{regError}</p>}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="login-form"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.6, ease: LUXURY_EASE }}
                                        className="absolute inset-0 flex flex-col items-center w-full"
                                    >
                                        <form onSubmit={handleLoginSubmit} className="space-y-4 w-full text-left">
                                            <FormInput label="Email" type="email" value={email || ''} onChange={(e: any) => setEmail(e.target.value)} required placeholder="you@routsky.com" accentColor={accent.secondary} isLight={isLight} />
                                            <FormInput label="Password" type="password" value={password || ''} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" accentColor={accent.secondary} isLight={isLight} />
                                            {loginError && <p className="text-sm text-red-500 font-medium text-center">{loginError}</p>}

                                            <div className="flex justify-center pt-2">
                                                <button
                                                    type="submit"
                                                    className="w-full h-12 rounded-lg font-semibold tracking-wide text-sm uppercase transition-all duration-300 ease-in-out text-white disabled:opacity-50 btn-pulse relative overflow-hidden hover:brightness-110 active:scale-[0.98]"
                                                    style={{ background: accent.primary }}
                                                    disabled={loginLoading}
                                                >
                                                    {loginLoading ? 'Signing in…' : 'Sign In'}
                                                </button>
                                            </div>

                                            {/* Divider */}
                                            <div className="relative flex items-center gap-4 py-4">
                                                <div className={`h-[1px] flex-1 transition-colors duration-[1200ms] ${isLight ? 'bg-gray-200' : 'bg-white/[0.08]'}`} />
                                                <span className={`text-[10px] font-medium uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-[1200ms] ${isLight ? 'text-gray-400' : 'text-white/30'}`}>or continue with</span>
                                                <div className={`h-[1px] flex-1 transition-colors duration-[1200ms] ${isLight ? 'bg-gray-200' : 'bg-white/[0.08]'}`} />
                                            </div>

                                            {/* Social Buttons */}
                                            <div className="flex gap-3">
                                                <button type="button"
                                                    onClick={() => handleSocialLogin('Google')}
                                                    className={`flex-1 flex items-center justify-center h-12 rounded-xl transition-all duration-500 group border relative ${isLight ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                                                    <svg className={`w-5 h-5 transition-opacity ${isLight ? 'text-gray-500 group-hover:text-gray-900' : 'text-white/60 group-hover:text-white'}`} viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                </button>
                                                <button type="button"
                                                    onClick={() => handleSocialLogin('GitHub')}
                                                    className={`flex-1 flex items-center justify-center h-12 rounded-xl transition-all duration-500 group border relative ${isLight ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                                                    <svg className={`w-5 h-5 transition-opacity ${isLight ? 'text-gray-500 group-hover:text-gray-900' : 'text-white/60 group-hover:text-white'}`} viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Toggle */}
                        <div className={`mt-16 pt-10 border-t transition-colors duration-[1200ms] text-center w-full ${isLight ? 'border-gray-100' : 'border-white/[0.06]'}`}>
                            <button type="button" onClick={toggleFlip}
                                className={`text-sm font-semibold transition-colors duration-200 ${isLight ? 'hover:text-gray-900' : 'hover:text-white'}`}
                                style={{ color: `${accent.secondary}${isLight ? '' : '90'}` }}
                            >
                                {isRegisterPath ? 'Already have an account? Sign In →' : "Don't have an account? Create one →"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                .auth-passport { font-family: 'Inter', system-ui, sans-serif; }
                
                .globe-glow canvas {
                    transition: filter 1.2s ease;
                }

                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-text-fill-color: ${isLight ? '#111827' : 'white'} !important;
                    -webkit-box-shadow: 0 0 0px 1000px ${isLight ? '#ffffff' : '#080a10'} inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                }

                @keyframes pulse-emerald {
                    0% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 0 rgba(0, 200, 83, 0.4); }
                    70% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 12px rgba(0, 200, 83, 0); }
                    100% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 0 rgba(0, 200, 83, 0); }
                }

                @keyframes pulse-purple {
                    0% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 0 rgba(156, 39, 176, 0.4); }
                    70% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 12px rgba(156, 39, 176, 0); }
                    100% { box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4), 0 0 0 0 rgba(156, 39, 176, 0); }
                }
                
                .btn-pulse {
                    animation: ${isRegisterPath ? 'pulse-purple' : 'pulse-emerald'} 2s infinite;
                }
            `}</style>
        </div>
    );

};

