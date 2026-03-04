// ── V2 Enums ──

export type BudgetBracket = 'Shoestring' | 'Budget' | 'Mid' | 'Comfort' | 'Luxury';

export type RegionPreference =
    | 'Any'
    | 'SoutheastAsia'
    | 'EasternEurope'
    | 'Balkans'
    | 'LatinAmerica'
    | 'NorthAfrica'
    | 'CentralAsia'
    | 'CentralAmerica'
    | 'MiddleEast'
    | 'Caribbean';

export type UnitPreference = 'Metric' | 'Imperial';
export type TravelStyle = 'Shoestring' | 'Budget' | 'Comfort' | 'Luxury';

export interface User {
    id: number;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
    passports: string[];
    origin: string;
    preferredCurrency: string;
    unitPreference: UnitPreference;
    travelStyle: TravelStyle;
    notificationsEnabled: boolean;
    priceAlertsEnabled: boolean;
}

export interface AnalyticsData {
    totalGroupSavings: number;
    carbonFootprintEstimate: {
        totalKgCo2: number;
        offsetPercentage: number;
    };
    popularRegions: { name: string; value: number }[];
}

// ── V2 API Request ──

export interface RouteRequest {
    /** All passport codes held by the traveler. e.g. ["TR", "DE"] */
    passports: string[];
    budgetBracket: BudgetBracket;
    totalBudgetUsd: number;
    durationDays: number;
    regionPreference: RegionPreference;
    hasSchengenVisa: boolean;
    hasUsVisa: boolean;
    hasUkVisa: boolean;
}

// ── V2 API Response ──

export interface RouteResponse {
    options: RouteOption[];
    eliminations: EliminationSummary[];
}

export interface RouteOption {
    routeName: string;
    selectionReason: string;
    estimatedBudgetRange: string;
    stops: RouteStop[];
}

export interface RouteStop {
    order: number;
    city: string;
    country: string;
    countryCode: string;
    region: string;
    recommendedDays: number;
    costLevel: string;        // "Low" | "Medium" | "High"
    dailyBudgetRange: string; // e.g. "$20–$45/day"
    visaStatus: string;       // "Visa-Free (DE)" | "eVisa (TR)" | etc.
    bestPassport?: string;    // which passport yielded the best visa outcome
    stopReason?: string;
}

export interface EliminationSummary {
    city: string;
    country: string;
    reason: string;           // EliminationReason enum name
    explanation: string;
}
