import axios from 'axios';
import type { RouteRequest, RouteResponse } from '../types';

export const BASE_URL = 'https://routsky-api-prod.onrender.com/api';

console.log("INITIALIZING ROUTSKY API (HARDCODED)");
console.log("BASE_URL is:", BASE_URL);

/**
 * Robustly constructs the API URL.
 * Hardcoded to Render backend to bypass environment variable issues.
 */
export const getApiUrl = (path: string) => {
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${cleanBase}${cleanPath}`;
};

const api = axios.create({
    baseURL: BASE_URL,
});

// ── Critical: Set auth header at module load, BEFORE any component mounts ──
// React useEffect order: children fire before parents.
// Without this, TravelGroupsPage.fetchGroups() fires before AuthContext sets the token.
const storedToken = localStorage.getItem('token');
if (storedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export const routskyApi = api;

export const login = async (credentials: { email: string; password: string }) => {
    const url = getApiUrl('/auth/login');
    console.log("Calling login at:", url);
    const response = await api.post(url, credentials);
    return response.data;
};

export const register = async (userData: { email: string; password: string; firstName: string; lastName: string; passports?: string[] }) => {
    const url = getApiUrl('/auth/register');
    console.log("Calling register at:", url);
    const response = await api.post(url, userData);
    return response.data;
};

export const generateRoutes = async (payload: RouteRequest): Promise<RouteResponse> => {
    console.log('Payload being sent:', payload);
    const url = getApiUrl('/routes/generate');
    const response = await api.post<RouteResponse>(url, payload);
    return response.data;
};

export interface SaveRoutePayload {
    userId: number;
    routeName: string;
    passports: string[];
    budgetBracket: string;
    totalBudgetUsd: number;
    durationDays: number;
    regionPreference: string;
    hasSchengenVisa: boolean;
    hasUsVisa: boolean;
    hasUkVisa: boolean;
    selectionReason: string;
    stops: {
        city: string;
        countryCode: string;
        recommendedDays: number;
        stopOrder: number;
        costLevel: string;
        stopReason?: string;
    }[];
}

export const saveRoute = async (payload: SaveRoutePayload): Promise<{ id: string }> => {
    try {
        console.log('[routsky] POST /routes/save payload:', JSON.stringify(payload, null, 2));
        const url = getApiUrl('/routes/save');
        const response = await api.post(url, payload);
        console.log('[routsky] Save route success:', response.data);
        return response.data;
    } catch (err: any) {
        console.error('[routsky] Save route FAILED:',
            err?.response?.status,
            err?.response?.data ?? err?.message
        );
        throw err;
    }
};

// ── Agent-as-Orchestrator: Decision Engine ──

export const runDecisionEngine = async (groupId: string) => {
    const url = getApiUrl('/decision/run');
    const response = await api.post(url, { groupId });
    return response.data;
};

export const getAgentInsight = async (city: string) => {
    const url = getApiUrl(`/agent/insight/${encodeURIComponent(city)}`);
    const response = await api.get(url);
    return response.data;
};

// ── Settings ──

export const updatePreferences = async (preferences: { preferredCurrency?: string, unitPreference?: string }) => {
    const url = getApiUrl('/user/preferences');
    const response = await api.patch(url, preferences);
    return response.data;
};

export const updateNotifications = async (notifications: { notificationsEnabled?: boolean, priceAlertsEnabled?: boolean }) => {
    const url = getApiUrl('/user/notifications');
    const response = await api.patch(url, notifications);
    return response.data;
};

export const changePassword = async (passwords: { currentPassword?: string, newPassword?: string }) => {
    const url = getApiUrl('/user/change-password');
    const response = await api.post(url, passwords);
    return response.data;
};

export const getAnalytics = async () => {
    const url = getApiUrl('/analytics');
    const response = await api.get(url);
    return response.data;
};
