import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, UserCircle, Sliders, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage = () => {
    const { user, updateProfile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'notifications'>('preferences');
    const [isSaving, setIsSaving] = useState(false);

    // Local state for preferences
    const [currency, setCurrency] = useState(user?.preferredCurrency || 'USD');
    const [units, setUnits] = useState(user?.unitPreference || 'Metric');
    const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
    const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(user?.priceAlertsEnabled ?? true);

    const handleSavePreferences = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                preferredCurrency: currency,
                unitPreference: units,
            });
            // Optional: Show success toast
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                notificationsEnabled,
                priceAlertsEnabled
            });
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'account', label: 'Account', icon: UserCircle },
        { id: 'preferences', label: 'System Preferences', icon: Sliders },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ] as const;

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Settings className="text-indigo-600 dark:text-indigo-400" size={32} />
                    Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your account preferences and application settings.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="md:w-64 shrink-0">
                    <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal
                                        ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : ''} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
                    <AnimatePresence mode="wait">
                        {activeTab === 'account' && (
                            <motion.div
                                key="account"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Account Settings</h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            disabled
                                            value={user?.email || ''}
                                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-400 opacity-70 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Email address cannot be changed currently.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                        <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'preferences' && (
                            <motion.div
                                key="preferences"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">System Preferences</h2>

                                <div className="space-y-8">
                                    {/* Theme Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Appearance</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select your preferred app theme.</p>
                                        </div>
                                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                            <button
                                                onClick={() => theme === 'dark' && toggleTheme()}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                Light
                                            </button>
                                            <button
                                                onClick={() => theme === 'light' && toggleTheme()}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                Dark
                                            </button>
                                        </div>
                                    </div>
                                    <hr className="border-gray-100 dark:border-gray-800" />

                                    {/* Currency Settings */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Default Currency</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Prices across Routiq will be displayed in this currency.</p>
                                        </div>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white w-full sm:w-48"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="TRY">TRY (₺)</option>
                                        </select>
                                    </div>
                                    <hr className="border-gray-100 dark:border-gray-800" />

                                    {/* Unit Preference */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Unit System</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Used for distance and climate data.</p>
                                        </div>
                                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full sm:w-auto">
                                            <button
                                                onClick={() => setUnits('Metric')}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${units === 'Metric' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                Metric (°C, km)
                                            </button>
                                            <button
                                                onClick={() => setUnits('Imperial')}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${units === 'Imperial' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                            >
                                                Imperial (°F, mi)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            onClick={handleSavePreferences}
                                            disabled={isSaving}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                                        >
                                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            Save Preferences
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'notifications' && (
                            <motion.div
                                key="notifications"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notification Settings</h2>

                                <div className="space-y-6">
                                    {/* Group Invitations */}
                                    <div className="flex items-start justify-between">
                                        <div className="pr-4">
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Group Invitations</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Receive email and push notifications when you are invited to a new travel group.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={notificationsEnabled}
                                                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <hr className="border-gray-100 dark:border-gray-800" />

                                    {/* Price Alerts */}
                                    <div className="flex items-start justify-between">
                                        <div className="pr-4">
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Price Alerts</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get notified when flight prices drop for flights in your active travel groups.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={priceAlertsEnabled}
                                                onChange={(e) => setPriceAlertsEnabled(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={handleSaveNotifications}
                                            disabled={isSaving}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                                        >
                                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            Save Notification Settings
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
};
