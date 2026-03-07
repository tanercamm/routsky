import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, LogOut, Zap } from 'lucide-react';

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

    const isHome = location.pathname === '/';

    return (
        <header className={`border-b sticky top-0 z-30 transition-colors duration-200 ${
            isHome
                ? 'border-white/[0.06] bg-[#050a18]/80 backdrop-blur-xl'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'
        }`}>
            <div className="max-w-[1600px] w-[96%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-1 flex items-center justify-start gap-3">
                    <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                        <span className={`text-2xl font-extrabold tracking-tight transition-colors ${
                            isHome
                                ? 'text-cyan-400 group-hover:text-cyan-300'
                                : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300'
                        }`}>
                            Routiq
                        </span>
                        <span className={`text-sm font-medium hidden sm:inline ${
                            isHome ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                            Mission Control
                        </span>
                    </button>
                </div>

                {/* Center: Nav + New Route */}
                <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
                    <button
                        onClick={() => navigate('/find-route')}
                        className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-all ${
                            location.pathname === '/find-route'
                                ? isHome
                                    ? 'text-cyan-300 bg-cyan-500/10'
                                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                                : isHome
                                    ? 'text-cyan-400/80 hover:text-cyan-300 hover:bg-white/[0.04]'
                                    : 'text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 hover:bg-blue-50 dark:hover:bg-cyan-500/10'
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
                                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                                    isActive
                                        ? isHome
                                            ? 'text-cyan-300 bg-white/[0.06]'
                                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                                        : isHome
                                            ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
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
                        className={`p-2 rounded-full transition-colors text-lg ${
                            isHome ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/profile')}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all overflow-hidden ${
                                location.pathname === '/profile'
                                    ? 'bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-500/40'
                                    : isHome
                                        ? 'bg-white/[0.08] hover:ring-2 hover:ring-cyan-500/40'
                                        : 'bg-blue-100 dark:bg-blue-500/20 hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-500/40'
                            }`}
                            title="Profile"
                        >
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Navbar Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className={
                                    location.pathname === '/profile'
                                        ? 'text-white'
                                        : isHome ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'
                                } />
                            )}
                        </button>
                        <span className={`text-sm font-medium hidden sm:inline cursor-pointer ${
                            isHome
                                ? 'text-gray-400 hover:text-gray-200'
                                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`} onClick={() => navigate('/profile')}>
                            {user?.name || user?.email || 'User'}
                        </span>
                    </div>

                    <div className={`h-5 w-px mx-1 ${isHome ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700'}`}></div>

                    <button
                        onClick={logout}
                        title="Sign Out"
                        className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                            isHome
                                ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                        }`}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};
