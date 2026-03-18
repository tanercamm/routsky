import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, LogOut, Zap, Sun, Moon } from 'lucide-react';

const NAV_LINKS = [
    { label: 'Routes', path: '/routes' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Travel Groups', path: '/team' },
    { label: 'Settings', path: '/settings' },
];

export const Navbar = () => {
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header className="sticky top-0 z-30 transition-all duration-300 backdrop-blur-xl border-b light:border-gray-200 light:bg-[#F5F5F7]/80 dark:border-white/[0.06] dark:bg-[#050a18]/80">
            <div className="max-w-[1600px] w-[96%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-1 flex items-center justify-start gap-3">
                    <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                        <img
                            src="/assets/logo.png"
                            alt="Routsky Logo"
                            className={`h-9 w-auto object-contain transition-all duration-500 group-hover:scale-110 ${theme === 'light' ? 'drop-shadow-[0_4px_10px_rgba(0,122,255,0.2)]' : 'drop-shadow-[0_0_12px_rgba(0,122,255,0.5)]'
                                }`}
                        />
                        <span className="text-2xl font-extrabold tracking-tight transition-colors hidden sm:inline text-[#007AFF]">
                            Routsky
                        </span>
                        <span className={`text-sm font-medium hidden lg:inline transition-colors ${theme === 'light' ? 'text-gray-500' : 'text-gray-400/60'}`}>
                            - Orchestrating the World
                        </span>
                    </button>
                </div>

                {/* Center: Nav + New Route */}
                <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
                    <button
                        onClick={() => navigate('/find-route')}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-all ${location.pathname === '/find-route'
                            ? 'text-[#007AFF] bg-[#007AFF]/10'
                            : (theme === 'light'
                                ? 'text-[#007AFF]/80 hover:text-[#007AFF] hover:bg-[#007AFF]/5'
                                : 'text-[#007AFF]/80 hover:text-blue-300 hover:bg-white/[0.04]')
                            }`}
                    >
                        <Zap size={14} />
                        New Route
                    </button>
                    {NAV_LINKS.map(({ label, path }) => {
                        const isActive = location.pathname === path;
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${isActive
                                    ? (theme === 'light' ? 'text-[#007AFF] bg-[#007AFF]/5' : 'text-[#007AFF] bg-white/[0.06]')
                                    : (theme === 'light'
                                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]')
                                    }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </nav>

                {/* Right: Theme, Profile, Logout */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-full transition-all duration-300 ${theme === 'light'
                            ? 'bg-black/5 hover:bg-black/10 text-[#007AFF]'
                            : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                            }`}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/profile')}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all overflow-hidden ${location.pathname === '/profile'
                                ? 'bg-[#007AFF] ring-2 ring-blue-300 shadow-md'
                                : (theme === 'light'
                                    ? 'bg-gray-100 hover:ring-2 hover:ring-[#007AFF]/40'
                                    : 'bg-white/[0.08] hover:ring-2 hover:ring-[#007AFF]/40')
                                }`}
                            title="Profile"
                        >
                            {(user?.avatarBase64 || user?.avatarUrl) ? (
                                <img src={user?.avatarBase64 || user.avatarUrl} alt="Navbar Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className={
                                    location.pathname === '/profile' ? 'text-white' : 'text-gray-400'
                                } />
                            )}
                        </button>
                        <span className={`text-sm font-medium hidden sm:inline cursor-pointer transition-colors ${theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-gray-200'}`} onClick={() => navigate('/profile')}>
                            {user?.name || user?.email || 'User'}
                        </span>
                    </div>

                    <div className={`h-5 w-px mx-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`}></div>

                    <button
                        onClick={logout}
                        title="Sign Out"
                        className="p-2 rounded-full transition-colors flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>

    );
};
