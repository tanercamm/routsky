using Routiq.Api.Entities;

namespace Routiq.Api.DTOs;

// ── Route Generation Request ──

public class RouteRequestDto
{
    /// <summary>
    /// ISO 3166-1 alpha-2 passport codes for all passports held.
    /// The engine applies best-case visa logic — most favorable outcome across all passports wins.
    /// e.g. ["TR", "DE"] for a Turkish-German dual citizen.
    /// </summary>
    public List<string> Passports { get; set; } = new();

    public BudgetBracket BudgetBracket { get; set; }

    /// <summary>Hard upper budget cap in USD.</summary>
    public int TotalBudgetUsd { get; set; }

    public int DurationDays { get; set; }

    public RegionPreference RegionPreference { get; set; } = RegionPreference.Any;

    // Visa context declared by user
    public bool HasSchengenVisa { get; set; }
    public bool HasUsVisa { get; set; }
    public bool HasUkVisa { get; set; }
}

// ── Route Generation Response ──

public class RouteResponseDto
{
    /// <summary>The selected route options. In V2 typically 1–4 options.</summary>
    public List<RouteOptionDto> Options { get; set; } = new();

    /// <summary>Destinations considered but eliminated — the "why NOT" explanations.</summary>
    public List<EliminationSummaryDto> Eliminations { get; set; } = new();
}

public class RouteOptionDto
{
    public string RouteName { get; set; } = string.Empty;

    /// <summary>Engine-generated explanation of why this route was selected.</summary>
    public string SelectionReason { get; set; } = string.Empty;

    /// <summary>Total budget range label — never an exact price.</summary>
    public string EstimatedBudgetRange { get; set; } = string.Empty;  // e.g. "$840–$1,260"

    public List<RouteStopDto> Stops { get; set; } = new();
}

public class RouteStopDto
{
    public int Order { get; set; }
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public int RecommendedDays { get; set; }
    public string CostLevel { get; set; } = string.Empty;     // "Low" | "Medium" | "High"
    public string DailyBudgetRange { get; set; } = string.Empty;  // e.g. "$20–$45/day"
    public string VisaStatus { get; set; } = string.Empty;     // "Visa-Free (DE)" | "eVisa" | etc.
    public string? BestPassport { get; set; }                   // which passport yielded the best outcome
    public string? StopReason { get; set; }
}

public class EliminationSummaryDto
{
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;          // EliminationReason enum name
    public string Explanation { get; set; } = string.Empty;
}

// ── Save Route ──

public class SaveRouteDto
{
    public int UserId { get; set; }
    public string RouteName { get; set; } = string.Empty;

    /// <summary>All passports held at time of query (for audit/display purposes).</summary>
    public List<string> Passports { get; set; } = new();

    public BudgetBracket BudgetBracket { get; set; }
    public int TotalBudgetUsd { get; set; }
    public int DurationDays { get; set; }
    public RegionPreference RegionPreference { get; set; }
    public bool HasSchengenVisa { get; set; }
    public bool HasUsVisa { get; set; }
    public bool HasUkVisa { get; set; }
    public string SelectionReason { get; set; } = string.Empty;
    public List<SaveRouteStopDto> Stops { get; set; } = new();
}

public class SaveRouteStopDto
{
    /// <summary>If known, the DB destination ID. Optional — server resolves from City+CountryCode if omitted.</summary>
    public int? DestinationId { get; set; }
    public string City { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public int StopOrder { get; set; }
    public int RecommendedDays { get; set; }
    public CostLevel ExpectedCostLevel { get; set; }
    public string? StopReason { get; set; }
}

// ── Saved Route Response ──

/// <summary>
/// Lightweight DTO for saving a discover/orchestrator route directly.
/// Does not require FK-resolved stops — stores the city/country as the RouteName.
/// </summary>
public class SaveDiscoverRouteDto
{
    public string DestinationCity { get; set; } = string.Empty;
    public string DestinationCountry { get; set; } = string.Empty;
    public string DestinationCode { get; set; } = string.Empty;
    public int TotalBudgetUsd { get; set; }
    public int DurationDays { get; set; }
    public string SelectionReason { get; set; } = string.Empty;
    public string Passport { get; set; } = "TR";
}

// ── Saved Route Response ──

public class SavedRouteResponseDto
{
    public Guid Id { get; set; }
    public int UserId { get; set; }
    public string RouteName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SelectionReason { get; set; } = string.Empty;
    public DateTime SavedAt { get; set; }
    public int TotalBudgetUsd { get; set; }
    public int DurationDays { get; set; }
    public List<string> Passports { get; set; } = new();
    public List<RouteStopDto> Stops { get; set; } = new();
}

// ── Community Trip Record ──

public class SubmitTraveledRouteDto
{
    public Guid SavedRouteId { get; set; }
    public DateTime TraveledAt { get; set; }
    public ExpenseDensity TransportExpense { get; set; }
    public ExpenseDensity FoodExpense { get; set; }
    public ExpenseDensity AccommodationExpense { get; set; }
    public VisaDifficulty VisaExperience { get; set; }
    public string DaySufficiencyJson { get; set; } = "[]";

    // Allowed free-text (max 500 chars enforced by entity)
    public string? WhyThisRegion { get; set; }
    public string? WhatWasChallenging { get; set; }
    public string? WhatIWouldDoDifferently { get; set; }
}
