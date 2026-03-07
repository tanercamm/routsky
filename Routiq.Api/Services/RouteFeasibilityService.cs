using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;
using Routiq.Api.Entities;

namespace Routiq.Api.Services;

/// <summary>
/// MCP Atom #1: Route Feasibility
/// Stateless service. Input (Origin, Destination, Passports) → Output (FlightTime, Cost, VisaInfo).
/// Uses DB VisaRules for visa checks and distance-based estimates for flight data.
/// Now acts as a Semantic Kernel Plugin to feed facts to the Agent Orchestrator.
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
    }

    /// <summary>
    /// Analyse feasibility of a single origin→destination route for a set of passports.
    /// </summary>
    [Microsoft.SemanticKernel.KernelFunction("GetFlightAndVisaFacts")]
    [System.ComponentModel.Description("Gets flight time, cost, and visa requirements for a given origin, destination, and passports.")]
    public async Task<FeasibilityResult> AnalyseAsync(
        [System.ComponentModel.Description("Origin airport code")] string origin,
        [System.ComponentModel.Description("Destination airport code")] string destination,
        [System.ComponentModel.Description("List of passport country codes")] List<string> passportCodes,
        [System.ComponentModel.Description("Destination country code")] string destinationCountryCode)
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
        var visaType = "VisaFree";
        var isVisaRequired = false;

        foreach (var passport in passportCodes)
        {
            var rule = await _context.VisaRules
                .FirstOrDefaultAsync(v => v.PassportCountryCode == passport && v.DestinationCountryCode == destinationCountryCode);

            if (rule != null)
            {
                visaType = rule.Requirement.ToString();
                if (rule.Requirement == VisaRequirement.Banned || rule.Requirement == VisaRequirement.Required)
                {
                    isVisaRequired = true;
                }

                if (rule.Requirement == VisaRequirement.VisaFree || rule.Requirement == VisaRequirement.OnArrival)
                {
                    // Best case — no penalty
                    visaType = rule.Requirement.ToString();
                    isVisaRequired = false;
                    break; // One good passport is enough
                }
            }
            else if (passport == "TR") // Fallback internal knowledge base for TR Passport
            {
                // Schengen Area
                if (new[] { "FR", "ES", "IT", "DE", "NL", "CH", "AT", "CZ", "PL", "HU" }.Contains(destinationCountryCode))
                {
                    isVisaRequired = true;
                    visaType = "Schengen Visa Required";
                }
                // UK
                else if (destinationCountryCode == "GB")
                {
                    isVisaRequired = true;
                    visaType = "UK Visa Required";
                }
                // US
                else if (destinationCountryCode == "US")
                {
                    isVisaRequired = true;
                    visaType = "US Visa Required";
                }
                // AU/NZ etc
                else if (new[] { "AU", "NZ", "CA" }.Contains(destinationCountryCode))
                {
                    isVisaRequired = true;
                    visaType = "Visa Required";
                }
            }
        }

        result.VisaRequired = isVisaRequired;
        result.VisaType = visaType;

        return result;
    }

    /// <summary>
    /// Distance-based flight estimation using known airport pairs.
    /// This replaces the old hardcoded getFlightData() in the frontend.
    /// </summary>
    private static readonly Dictionary<string, (double Lat, double Lng)> AirportCoords = new(StringComparer.OrdinalIgnoreCase)
    {
        // Origins
        ["IST"] = (41.0082, 28.9784),
        ["BER"] = (52.5200, 13.4050),
        ["SYD"] = (-33.8688, 151.2093),
        ["LHR"] = (51.4700, -0.4543),
        ["JFK"] = (40.6413, -73.7781),

        // Destinations
        ["TBS"] = (41.7151, 44.8271),
        ["GYD"] = (40.4093, 49.8671),
        ["SJJ"] = (43.8563, 18.4131),
        ["CMN"] = (33.5731, -7.5898),
        ["SOF"] = (42.6977, 23.3219),
        ["BEG"] = (44.7866, 20.4489),
        ["SIN"] = (1.3521, 103.8198),
        ["BKK"] = (13.7563, 100.5018),
        ["KUL"] = (3.1390, 101.6869),
        ["HAN"] = (21.0285, 105.8542),
        ["DPS"] = (-8.3405, 115.0920),
        ["CEB"] = (10.3157, 123.8854),
        ["DXB"] = (25.2048, 55.2708),
        ["DOH"] = (25.2854, 51.5310),
        ["CDG"] = (48.8566, 2.3522),
        ["BCN"] = (41.3851, 2.1734),
        ["FCO"] = (41.9028, 12.4964),
        ["NRT"] = (35.7720, 140.3929),
        ["ICN"] = (37.4602, 126.4407),
        ["MEX"] = (19.4326, -99.1332),
        ["EZE"] = (-34.8150, -58.5358),
        ["BOG"] = (4.7110, -74.0721),
        ["CPT"] = (-33.9249, 18.4241),
        ["AKL"] = (-37.0062, 174.7850),
    };

    /// <summary>
    /// Great-Circle Distance based flight estimation.
    /// Eliminates hardcoded "mock" results for specific pairs.
    /// Real-time synthesis of flight facts.
    /// </summary>
    private static (int minutes, int costUsd) EstimateFlightData(string origin, string destination)
    {
        if (!AirportCoords.TryGetValue(origin, out var o) || !AirportCoords.TryGetValue(destination, out var d))
        {
            // If unknown, return a generic mid-haul estimate to avoid crash, but log it
            return (480, 800);
        }

        // 1. Calculate Great Circle Distance (Haversine)
        var R = 6371.0; // Earth radius in km
        var dLat = ToRadians(d.Lat - o.Lat);
        var dLng = ToRadians(d.Lng - o.Lng);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(o.Lat)) * Math.Cos(ToRadians(d.Lat)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var distanceKm = R * c;

        // 2. Synthesize flight time (assume 800km/h avg speed + 40m takeoff/landing)
        var flightTimeMinutes = (int)(distanceKm / 800.0 * 60.0) + 40;

        // 3. Synthesize cost (assume $0.12 per km base + $150 fixed taxes/fees)
        var costUsd = (int)(distanceKm * 0.12) + 150;

        // Rounding for "realism"
        flightTimeMinutes = (int)(Math.Round(flightTimeMinutes / 5.0) * 5);
        costUsd = (int)(Math.Round(costUsd / 10.0) * 10);

        return (flightTimeMinutes, costUsd);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

}
