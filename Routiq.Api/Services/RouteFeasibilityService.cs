using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;
using Routiq.Api.Entities;

namespace Routiq.Api.Services;

/// <summary>
/// MCP Atom #1: Route Feasibility
/// Stateless service. Input (Origin, Destination, Passports) → Output (FlightTime, Cost, VisaInfo).
/// Uses DB VisaRules for visa checks and distance-based estimates for flight data.
/// </summary>
public class RouteFeasibilityService
{
    private readonly RoutiqDbContext _context;

    public RouteFeasibilityService(RoutiqDbContext context)
    {
        _context = context;
    }

    public class FeasibilityResult
    {
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public int FlightTimeMinutes { get; set; }
        public string FlightTimeFormatted { get; set; } = string.Empty;
        public int EstimatedCostUsd { get; set; }
        public bool VisaRequired { get; set; }
        public string VisaType { get; set; } = "VisaFree";
        public bool IsFeasible { get; set; } = true;
        public string? BlockReason { get; set; }
    }

    /// <summary>
    /// Analyse feasibility of a single origin→destination route for a set of passports.
    /// </summary>
    public async Task<FeasibilityResult> AnalyseAsync(string origin, string destination, List<string> passportCodes, string destinationCountryCode)
    {
        var result = new FeasibilityResult
        {
            Origin = origin,
            Destination = destination
        };

        // ── 1. Flight time & cost estimation (distance-based heuristics) ──
        var estimate = EstimateFlightData(origin, destination);
        result.FlightTimeMinutes = estimate.minutes;
        result.FlightTimeFormatted = $"{estimate.minutes / 60}h {estimate.minutes % 60:D2}m";
        result.EstimatedCostUsd = estimate.costUsd;

        // ── 2. Visa check from DB ──
        var visaBlocked = false;
        var visaType = "VisaFree";

        foreach (var passport in passportCodes)
        {
            var rule = await _context.VisaRules
                .FirstOrDefaultAsync(v => v.PassportCountryCode == passport && v.DestinationCountryCode == destinationCountryCode);

            if (rule != null)
            {
                visaType = rule.Requirement.ToString();
                if (rule.Requirement == VisaRequirement.Banned)
                {
                    visaBlocked = true;
                    result.BlockReason = $"Entry banned for {passport} passport holders";
                    break;
                }
                if (rule.Requirement == VisaRequirement.Required)
                {
                    result.VisaRequired = true;
                    // Not blocked, but flagged — reduces score
                }
                if (rule.Requirement == VisaRequirement.VisaFree || rule.Requirement == VisaRequirement.OnArrival)
                {
                    // Best case — no penalty
                    visaType = rule.Requirement.ToString();
                    break; // One good passport is enough
                }
            }
        }

        result.VisaType = visaType;
        result.IsFeasible = !visaBlocked;

        return result;
    }

    /// <summary>
    /// Distance-based flight estimation using known airport pairs.
    /// This replaces the old hardcoded getFlightData() in the frontend.
    /// </summary>
    private static (int minutes, int costUsd) EstimateFlightData(string origin, string destination)
    {
        // Known route estimates (great-circle-based approximations)
        // Covers IST, BER, SYD origins to all 28 candidate destinations
        var routes = new Dictionary<string, (int min, int cost)>(StringComparer.OrdinalIgnoreCase)
        {
            // ── Budget / Short-haul ──
            // TBS (Tbilisi)
            ["IST-TBS"] = (110, 180),
            ["BER-TBS"] = (280, 350),
            ["SYD-TBS"] = (1100, 1400),
            // GYD (Baku)
            ["IST-GYD"] = (170, 150),
            ["BER-GYD"] = (375, 450),
            ["SYD-GYD"] = (1220, 1500),
            // SJJ (Sarajevo)
            ["IST-SJJ"] = (120, 200),
            ["BER-SJJ"] = (130, 250),
            ["SYD-SJJ"] = (1350, 1800),
            // CMN (Casablanca)
            ["IST-CMN"] = (315, 450),
            ["BER-CMN"] = (270, 380),
            ["SYD-CMN"] = (1560, 2100),
            // SOF (Sofia)
            ["IST-SOF"] = (75, 120),
            ["BER-SOF"] = (150, 200),
            ["SYD-SOF"] = (1200, 1500),
            // BEG (Belgrade)
            ["IST-BEG"] = (120, 180),
            ["BER-BEG"] = (110, 170),
            ["SYD-BEG"] = (1250, 1550),

            // ── Mid-range Asia ──
            // SIN (Singapore)
            ["IST-SIN"] = (550, 850),
            ["BER-SIN"] = (735, 1100),
            ["SYD-SIN"] = (500, 700),
            // BKK (Bangkok)
            ["IST-BKK"] = (570, 750),
            ["BER-BKK"] = (640, 900),
            ["SYD-BKK"] = (540, 600),
            // KUL (Kuala Lumpur)
            ["IST-KUL"] = (600, 800),
            ["BER-KUL"] = (720, 1050),
            ["SYD-KUL"] = (480, 650),
            // HAN (Hanoi)
            ["IST-HAN"] = (540, 700),
            ["BER-HAN"] = (620, 850),
            ["SYD-HAN"] = (510, 580),
            // DPS (Bali)
            ["IST-DPS"] = (720, 950),
            ["BER-DPS"] = (810, 1200),
            ["SYD-DPS"] = (360, 450),
            // CEB (Cebu)
            ["IST-CEB"] = (660, 900),
            ["BER-CEB"] = (750, 1100),
            ["SYD-CEB"] = (450, 550),
            // Inter-Asia
            ["BKK-SIN"] = (150, 200),
            ["KUL-SIN"] = (60, 80),

            // ── Middle East ──
            // DXB (Dubai)
            ["IST-DXB"] = (240, 350),
            ["BER-DXB"] = (360, 500),
            ["SYD-DXB"] = (840, 1100),
            // DOH (Doha)
            ["IST-DOH"] = (210, 320),
            ["BER-DOH"] = (370, 520),
            ["SYD-DOH"] = (810, 1050),

            // ── Premium Europe ──
            // CDG (Paris)
            ["IST-CDG"] = (210, 320),
            ["BER-CDG"] = (110, 180),
            ["SYD-CDG"] = (1380, 1800),
            // BCN (Barcelona)
            ["IST-BCN"] = (240, 350),
            ["BER-BCN"] = (155, 220),
            ["SYD-BCN"] = (1400, 1850),
            // LHR (London)
            ["IST-LHR"] = (230, 300),
            ["BER-LHR"] = (110, 160),
            ["SYD-LHR"] = (1440, 1900),
            // FCO (Rome)
            ["IST-FCO"] = (150, 250),
            ["BER-FCO"] = (130, 190),
            ["SYD-FCO"] = (1350, 1750),

            // ── Long-haul Premium ──
            // NRT (Tokyo)
            ["IST-NRT"] = (660, 1200),
            ["BER-NRT"] = (660, 1050),
            ["SYD-NRT"] = (570, 900),
            // ICN (Seoul)
            ["IST-ICN"] = (600, 1100),
            ["BER-ICN"] = (620, 1000),
            ["SYD-ICN"] = (540, 850),
            // JFK (New York)
            ["IST-JFK"] = (630, 1300),
            ["BER-JFK"] = (540, 900),
            ["SYD-JFK"] = (1260, 2200),

            // ── Americas ──
            // MEX (Mexico City)
            ["IST-MEX"] = (780, 1500),
            ["BER-MEX"] = (690, 1200),
            ["SYD-MEX"] = (960, 1800),
            // EZE (Buenos Aires)
            ["IST-EZE"] = (900, 1700),
            ["BER-EZE"] = (810, 1400),
            ["SYD-EZE"] = (780, 1500),
            // BOG (Bogotá)
            ["IST-BOG"] = (750, 1400),
            ["BER-BOG"] = (660, 1100),
            ["SYD-BOG"] = (1080, 2000),

            // ── Africa / Oceania ──
            // CPT (Cape Town)
            ["IST-CPT"] = (660, 1100),
            ["BER-CPT"] = (720, 1200),
            ["SYD-CPT"] = (840, 1350),
            // AKL (Auckland)
            ["IST-AKL"] = (1080, 1800),
            ["BER-AKL"] = (1140, 1900),
            ["SYD-AKL"] = (210, 350),
        };

        var key = $"{origin.ToUpperInvariant()}-{destination.ToUpperInvariant()}";
        if (routes.TryGetValue(key, out var known))
            return known;

        // Reverse lookup
        var reverseKey = $"{destination.ToUpperInvariant()}-{origin.ToUpperInvariant()}";
        if (routes.TryGetValue(reverseKey, out var reverseKnown))
            return reverseKnown;

        // Default fallback for unknown routes
        return (600, 1000);
    }
}
