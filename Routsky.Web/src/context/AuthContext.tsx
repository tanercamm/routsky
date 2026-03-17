import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { routskyApi, getApiUrl } from '../api/routskyApi';

import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    /** Update the user's preferences */
    updateProfile: (data: Partial<User>) => Promise<void>;
    updatePreferences: (data: { preferredCurrency?: string, unitPreference?: string }) => Promise<void>;
    updateNotifications: (data: { notificationsEnabled?: boolean, priceAlertsEnabled?: boolean }) => Promise<void>;
    /** Update the user's avatar URL dynamically */
    setUserAvatar: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                const parsed = JSON.parse(storedUser);

                // Explicitly map the URL
                parsed.avatarUrl = parsed.avatarUrl || parsed.AvatarUrl;

                // Safely ensure passports is an array
                if (!parsed.passports) {
                    parsed.passports = [];
                } else if (typeof parsed.passports === 'string') {
                    try {
                        const innerParsed = JSON.parse(parsed.passports as any);
                        parsed.passports = Array.isArray(innerParsed) ? innerParsed : [parsed.passports as any];
                    } catch {
                        parsed.passports = [parsed.passports as any];
                    }
                } else if (!Array.isArray(parsed.passports)) {
                    parsed.passports = [];
                }

                setUser(parsed);
            } catch (e) {
                console.error("Failed to parse stored user:", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }

        if (storedToken) {
            routskyApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

            // Hydrate the latest state directly from backend
            routskyApi.get(getApiUrl('/auth/me')).then(res => {
                if (res.data) {
                    const refreshedUser = res.data;

                    // EXACT MAPPING: Read from data.avatarUrl or data.AvatarUrl
                    refreshedUser.avatarUrl = refreshedUser.avatarUrl || refreshedUser.AvatarUrl;

                    // Safely ensure passports is an array from API too
                    if (!refreshedUser.passports) {
                        refreshedUser.passports = [];
                    } else if (typeof refreshedUser.passports === 'string') {
                        try {
                            const innerParsed = JSON.parse(refreshedUser.passports as any);
                            refreshedUser.passports = Array.isArray(innerParsed) ? innerParsed : [refreshedUser.passports as any];
                        } catch {
                            refreshedUser.passports = [refreshedUser.passports as any];
                        }
                    } else if (!Array.isArray(refreshedUser.passports)) {
                        refreshedUser.passports = [];
                    }

                    setUser(refreshedUser);
                    localStorage.setItem('user', JSON.stringify(refreshedUser));
                }
            }).catch(err => {
                console.error("Failed to hydrate user profile:", err);
            });
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        // Explicitly map the URL
        newUser.avatarUrl = newUser.avatarUrl || (newUser as any).AvatarUrl;

        // Safely ensure passports is an array
        if (!newUser.passports) {
            newUser.passports = [];
        } else if (typeof newUser.passports === 'string') {
            try {
                const innerParsed = JSON.parse(newUser.passports as any);
                newUser.passports = Array.isArray(innerParsed) ? innerParsed : [newUser.passports as any];
            } catch {
                newUser.passports = [newUser.passports as any];
            }
        } else if (!Array.isArray(newUser.passports)) {
            newUser.passports = [];
        }

        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        routskyApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete routskyApi.defaults.headers.common['Authorization'];
    };

    const updateProfile = async (data: Partial<User>) => {
        try {
            // Need to merge passports since they are always required by the API
            const updatePayload = {
                passports: data.passports || user?.passports || ["TR"],
                origin: data.origin !== undefined ? data.origin : (user?.origin || ""),
                preferredCurrency: data.preferredCurrency !== undefined ? data.preferredCurrency : (user?.preferredCurrency || "USD"),
                unitPreference: data.unitPreference !== undefined ? data.unitPreference : (user?.unitPreference || "Metric"),
                travelStyle: data.travelStyle !== undefined ? data.travelStyle : (user?.travelStyle || "Comfort"),
                notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : (user?.notificationsEnabled ?? true),
                priceAlertsEnabled: data.priceAlertsEnabled !== undefined ? data.priceAlertsEnabled : (user?.priceAlertsEnabled ?? true)
            };

            await routskyApi.put(getApiUrl('/auth/profile'), updatePayload);
            setUser(prev => {
                if (!prev) return prev;
                const updated = { ...prev, ...updatePayload };
                localStorage.setItem('user', JSON.stringify(updated));
                return updated;
            });
        } catch (err) {
            console.error("Failed to update profile:", err);
            throw err;
        }
    };

    const setUserAvatar = (url: string | null) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, avatarUrl: url || undefined };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    const updatePreferencesSettings = async (data: { preferredCurrency?: string, unitPreference?: string }) => {
        try {
            await routskyApi.patch(getApiUrl('/user/preferences'), data);
            setUser(prev => {
                if (!prev) return prev;
                const updated = { ...prev, ...data };
                localStorage.setItem('user', JSON.stringify(updated));
                return updated;
            });
        } catch (err) {
            console.error("Failed to update preferences:", err);
            throw err;
        }
    };

    const updateNotificationSettings = async (data: { notificationsEnabled?: boolean, priceAlertsEnabled?: boolean }) => {
        try {
            await routskyApi.patch(getApiUrl('/user/notifications'), data);
            setUser(prev => {
                if (!prev) return prev;
                const updated = { ...prev, ...data };
                localStorage.setItem('user', JSON.stringify(updated));
                return updated;
            });
        } catch (err) {
            console.error("Failed to update notifications:", err);
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, updateProfile, updatePreferences: updatePreferencesSettings, updateNotifications: updateNotificationSettings, setUserAvatar }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
