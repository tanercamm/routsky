import axios from 'axios';
import type { RouteRequest, RouteResponse } from '../types';

const api = axios.create({
    baseURL: 'http://localhost:5107/api',
});

// ── Critical: Set auth header at module load, BEFORE any component mounts ──
// React useEffect order: children fire before parents.
// Without this, TravelGroupsPage.fetchGroups() fires before AuthContext sets the token.
const storedToken = localStorage.getItem('token');
if (storedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export const routiqApi = api;

export const login = async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const register = async (userData: { email: string; password: string; firstName: string; lastName: string; passports?: string[] }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const generateRoutes = async (payload: RouteRequest): Promise<RouteResponse> => {
    console.log('Payload being sent:', payload);
    const response = await api.post<RouteResponse>('/routes/generate', payload);
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
        console.log('[routiq] POST /routes/save payload:', JSON.stringify(payload, null, 2));
        const response = await api.post('/routes/save', payload);
        console.log('[routiq] Save route success:', response.data);
        return response.data;
    } catch (err: any) {
        console.error('[routiq] Save route FAILED:',
            err?.response?.status,
            err?.response?.data ?? err?.message
        );
        throw err;
    }
};

// ── Agent-as-Orchestrator: Decision Engine ──

export const runDecisionEngine = async (groupId: string) => {
    const response = await api.post('/decision/run', { groupId });
    return response.data;
};

// ── Analytics ──

export const getAnalytics = async () => {
    const response = await api.get('/analytics');
    return response.data;
};
