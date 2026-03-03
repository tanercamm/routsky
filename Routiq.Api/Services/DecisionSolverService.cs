using Microsoft.EntityFrameworkCore;
using Routiq.Api.Data;

namespace Routiq.Api.Services;

/// <summary>
/// The Orchestrator: Decision Solver
/// Fetches member data → calls MCP atoms → scores candidates → picks winner with explanation.
/// This is the "Agent Brain" — it does NOT hardcode winners.
/// </summary>
public class DecisionSolverService
{
    private readonly RoutiqDbContext _context;
    private readonly RouteFeasibilityService _feasibility;
    private readonly BudgetConsistencyService _budget;
    private readonly TimeOverlapService _timeOverlap;

    public DecisionSolverService(
        RoutiqDbContext context,
        RouteFeasibilityService feasibility,
        BudgetConsistencyService budget,
        TimeOverlapService timeOverlap)
    {
        _context = context;
        _feasibility = feasibility;
        _budget = budget;
        _timeOverlap = timeOverlap;
    }

    // ── DTOs ──

    public class MemberTicket
    {
        public string MemberName { get; set; } = string.Empty;
        public int MemberId { get; set; }
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string FlightTime { get; set; } = string.Empty;
        public int FlightTimeMinutes { get; set; }
        public int CostUsd { get; set; }
        public string VisaType { get; set; } = "VisaFree";
        public bool VisaRequired { get; set; }
        public string BudgetSeverity { get; set; } = "comfortable";
        public double BudgetPercentUsed { get; set; }
    }

    public class CandidateResult
    {
        public string DestinationCode { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public double CompositeScore { get; set; }
        public int AvgCostUsd { get; set; }
        public string AvgFlightTime { get; set; } = string.Empty;
        public double FrictionScore { get; set; }
        public List<MemberTicket> MemberTickets { get; set; } = new();
    }

    public class DecisionResult
    {
        public CandidateResult Winner { get; set; } = new();
        public List<CandidateResult> Alternatives { get; set; } = new();
        public string Explanation { get; set; } = string.Empty;
        public Dictionary<string, string> EliminatedReasons { get; set; } = new();
        public DateTime DecidedAt { get; set; } = DateTime.UtcNow;
    }

    public class DiscoverRequest
    {
        public string Passport { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string BudgetLimit { get; set; } = "Any";
        public string Duration { get; set; } = "Any";
        public string Region { get; set; } = "All";
    }

    public class MemberInfo
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public List<string> Passports { get; set; } = new();
        public int Budget { get; set; } = 0;
    }

    // ── Candidate destinations to evaluate ──
    // Expanded list: budget → mid-range → premium → long-haul across all continents
    private static readonly List<(string Code, string City, string Country, string CountryCode, int PrestigeScore)> CandidateDestinations = new()
    {
        // Budget / Short-haul
        ("TBS", "Tbilisi",       "Georgia",                 "GE", 40),
        ("GYD", "Baku",          "Azerbaijan",              "AZ", 42),
        ("SJJ", "Sarajevo",      "Bosnia & Herzegovina",    "BA", 45),
        ("CMN", "Casablanca",    "Morocco",                 "MA", 50),
        ("SOF", "Sofia",         "Bulgaria",                "BG", 43),
        ("BEG", "Belgrade",      "Serbia",                  "RS", 46),

        // Mid-range Asia
        ("SIN", "Singapore",     "Singapore",               "SG", 75),
        ("BKK", "Bangkok",       "Thailand",                "TH", 68),
        ("KUL", "Kuala Lumpur",  "Malaysia",                "MY", 62),
        ("HAN", "Hanoi",         "Vietnam",                 "VN", 60),
        ("DPS", "Bali",          "Indonesia",               "ID", 72),
        ("CEB", "Cebu",          "Philippines",             "PH", 55),

        // Middle East
        ("DXB", "Dubai",         "UAE",                     "AE", 82),
        ("DOH", "Doha",          "Qatar",                   "QA", 78),

        // Premium Europe
        ("CDG", "Paris",         "France",                  "FR", 92),
        ("BCN", "Barcelona",     "Spain",                   "ES", 85),
        ("LHR", "London",        "United Kingdom",          "GB", 90),
        ("FCO", "Rome",          "Italy",                   "IT", 88),

        // Long-haul Premium
        ("NRT", "Tokyo",         "Japan",                   "JP", 95),
        ("ICN", "Seoul",         "South Korea",             "KR", 80),
        ("JFK", "New York",      "United States",           "US", 93),

        // Americas
        ("MEX", "Mexico City",   "Mexico",                  "MX", 65),
        ("EZE", "Buenos Aires",  "Argentina",               "AR", 70),
        ("BOG", "Bogotá",        "Colombia",                "CO", 58),

        // Africa / Oceania
        ("CPT", "Cape Town",     "South Africa",            "ZA", 74),
        ("AKL", "Auckland",      "New Zealand",             "NZ", 76),
    };

    /// <summary>
    /// Run the full decision pipeline for a travel group.
    /// </summary>
    public async Task<DecisionResult> SolveAsync(Guid groupId)
    {
        // ── Step 1: Fetch member data from DB ──
        var (members, skippedWarnings) = await FetchMembersAsync(groupId);
        if (members.Count < 2)
        {
            var reason = skippedWarnings.Count > 0
                ? $"Need at least 2 members with set origins. Skipped: {string.Join(", ", skippedWarnings)}"
                : "Need at least 2 members with set origins to run the intersection engine.";
            return new DecisionResult { Explanation = reason };
        }

        // ── Step 2: Evaluate each candidate with MCP atoms ──
        var scoredCandidates = new List<CandidateResult>();
        var eliminated = new Dictionary<string, string>();

        foreach (var (code, city, country, countryCode, _) in CandidateDestinations)
        {
            // Skip if any member's origin IS the destination
            if (members.Any(m => m.Origin.Equals(code, StringComparison.OrdinalIgnoreCase)))
            {
                eliminated[code] = $"{city} skipped: a group member already lives there.";
                continue;
            }

            var tickets = new List<MemberTicket>();
            var flightTimes = new List<int>();
            var budgetScores = new List<double>();
            var visaIssues = new List<string>();
            var isFeasible = true;

            foreach (var member in members)
            {
                // MCP #1: Route Feasibility
                RouteFeasibilityService.FeasibilityResult feasibility;
                try
                {
                    feasibility = await _feasibility.AnalyseAsync(
                        member.Origin, code, member.Passports, countryCode);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MCP Failure] Feasibility timeout/error: {ex.Message}");
                    feasibility = new RouteFeasibilityService.FeasibilityResult
                    {
                        IsFeasible = true,
                        EstimatedCostUsd = 1000,
                        FlightTimeMinutes = 600,
                        FlightTimeFormatted = "10h 00m",
                        VisaRequired = false,
                        VisaType = "VisaFree (Fallback)"
                    };
                }

                if (!feasibility.IsFeasible)
                {
                    eliminated[code] = $"{city} eliminated: {feasibility.BlockReason} ({member.Name}).";
                    isFeasible = false;
                    break;
                }

                // MCP #2: Budget Consistency
                BudgetConsistencyService.BudgetResult budgetResult;
                try
                {
                    budgetResult = _budget.Analyse(feasibility.EstimatedCostUsd, member.Budget);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MCP Failure] Budget timeout/error: {ex.Message}");
                    budgetResult = new BudgetConsistencyService.BudgetResult
                    {
                        Score = 50.0,
                        Severity = "comfortable",
                        PercentageUsed = 50.0
                    };
                }

                // For groups, if strict filter, we might eliminate
                // but we let Budget Consistency score handle it.

                // MCP #3: collect flight times for overlap analysis
                flightTimes.Add(feasibility.FlightTimeMinutes);
                budgetScores.Add(budgetResult.Score);

                if (feasibility.VisaRequired)
                    visaIssues.Add($"{member.Name} needs visa for {city}");

                tickets.Add(new MemberTicket
                {
                    MemberName = member.Name,
                    MemberId = member.UserId,
                    Origin = member.Origin,
                    Destination = code,
                    FlightTime = feasibility.FlightTimeFormatted,
                    FlightTimeMinutes = feasibility.FlightTimeMinutes,
                    CostUsd = feasibility.EstimatedCostUsd,
                    VisaType = feasibility.VisaType,
                    VisaRequired = feasibility.VisaRequired,
                    BudgetSeverity = budgetResult.Severity,
                    BudgetPercentUsed = budgetResult.PercentageUsed
                });
            }

            if (!isFeasible) continue;

            // MCP #3: Time Overlap
            TimeOverlapService.TimeOverlapResult timeResult;
            try
            {
                timeResult = _timeOverlap.Analyse(flightTimes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MCP Failure] Time Overlap timeout/error: {ex.Message}");
                timeResult = new TimeOverlapService.TimeOverlapResult
                {
                    NormalizedScore = 50.0,
                    AvgFlightFormatted = "Unknown",
                    FrictionScore = 0
                };
            }

            // ── Step 3: Composite Score ──
            // Weights: 40% budget, 30% time fairness, 30% visa ease
            var avgBudgetScore = budgetScores.Average();
            var timeScore = timeResult.NormalizedScore;
            var visaScore = visaIssues.Count == 0 ? 100.0 : Math.Max(0, 100 - (visaIssues.Count * 30.0));

            var composite = (0.4 * avgBudgetScore) + (0.3 * timeScore) + (0.3 * visaScore);

            // Penalize extreme flight times (>20h for any member)
            if (tickets.Any(t => t.FlightTimeMinutes > 1200))
                composite *= 0.8; // 20% penalty

            scoredCandidates.Add(new CandidateResult
            {
                DestinationCode = code,
                City = city,
                Country = country,
                CompositeScore = Math.Round(composite, 1),
                AvgCostUsd = (int)tickets.Average(t => t.CostUsd),
                AvgFlightTime = timeResult.AvgFlightFormatted,
                FrictionScore = timeResult.FrictionScore,
                MemberTickets = tickets
            });
        }

        // ── Step 4: Rank and pick winner ──
        var ranked = scoredCandidates.OrderByDescending(c => c.CompositeScore).ToList();

        if (ranked.Count == 0)
        {
            return new DecisionResult
            {
                Explanation = "No feasible destinations found for this group's constraints.",
                EliminatedReasons = eliminated
            };
        }

        var winner = ranked[0];
        var alternatives = ranked.Skip(1).Take(2).ToList();

        // ── Step 5: Generate explanation ──
        var explanation = GenerateExplanation(winner, alternatives, eliminated, members);

        return new DecisionResult
        {
            Winner = winner,
            Alternatives = alternatives,
            Explanation = explanation,
            EliminatedReasons = eliminated,
            DecidedAt = DateTime.UtcNow
        };
    }

    private async Task<(List<MemberInfo> Members, List<string> Warnings)> FetchMembersAsync(Guid groupId)
    {
        var dbMembers = await _context.TravelGroupMembers
            .Where(m => m.GroupId == groupId)
            .Include(m => m.User)
                .ThenInclude(u => u!.Profile)
            .ToListAsync();

        var members = new List<MemberInfo>();
        var warnings = new List<string>();

        foreach (var m in dbMembers.Where(m => m.User != null))
        {
            var name = $"{m.User!.FirstName} {m.User.LastName}".Trim();
            var origin = m.User.Profile?.Origin;
            var passports = m.User.Profile?.Passports;

            // Skip members with no origin AND no passports — engine can't route them
            if (string.IsNullOrWhiteSpace(origin) && (passports == null || passports.Count == 0))
            {
                warnings.Add($"{name} (no origin/passport set)");
                continue;
            }

            // Use Origin if set, else fall back to first passport code as IATA hint
            var resolvedOrigin = !string.IsNullOrWhiteSpace(origin)
                ? origin
                : passports!.First(); // We know passports is non-empty due to the check above

            var budget = m.User.Profile?.Budget ?? 0;

            members.Add(new MemberInfo
            {
                UserId = m.UserId,
                Name = name,
                Origin = resolvedOrigin,
                Passports = passports ?? new List<string>(),
                Budget = budget > 0 ? budget : 1500 // Default $1500 only when user hasn't set budget
            });
        }

        return (members, warnings);
    }

    private static string GenerateExplanation(
        CandidateResult winner,
        List<CandidateResult> alternatives,
        Dictionary<string, string> eliminated,
        List<MemberInfo> members)
    {
        var lines = new List<string>();

        // Winner explanation
        lines.Add($"🏆 {winner.City} ({winner.DestinationCode}) scored highest at {winner.CompositeScore}/100.");

        // Budget insight
        var allUnderBudget = winner.MemberTickets.All(t => t.BudgetSeverity != "over");
        if (allUnderBudget)
            lines.Add($"✅ All {members.Count} members' tickets are within budget (avg ${winner.AvgCostUsd}/person).");
        else
            lines.Add($"⚠️ Some members' tickets exceed their budget.");

        // Visa insight
        var visaNeeded = winner.MemberTickets.Where(t => t.VisaRequired).ToList();
        if (visaNeeded.Count == 0)
            lines.Add($"🛂 Visa-free entry for all passport holders.");
        else
            lines.Add($"🛂 Visa required for: {string.Join(", ", visaNeeded.Select(t => t.MemberName))}.");

        // Time fairness
        var maxDiff = winner.MemberTickets.Max(t => t.FlightTimeMinutes) - winner.MemberTickets.Min(t => t.FlightTimeMinutes);
        lines.Add($"⏱️ Flight time spread: {maxDiff / 60}h {maxDiff % 60}m difference between members (avg {winner.AvgFlightTime}).");

        // Per-member tickets
        lines.Add("");
        lines.Add("📋 Individual tickets:");
        foreach (var ticket in winner.MemberTickets)
        {
            lines.Add($"  • {ticket.MemberName}: {ticket.Origin} ➔ {ticket.Destination} ({ticket.FlightTime}, ${ticket.CostUsd})");
        }

        // Why alternatives lost
        if (alternatives.Count > 0)
        {
            lines.Add("");
            lines.Add("📊 Runner-ups:");
            foreach (var alt in alternatives)
            {
                var diff = winner.CompositeScore - alt.CompositeScore;
                lines.Add($"  • {alt.City} ({alt.DestinationCode}): scored {alt.CompositeScore}/100 (−{diff:F1} points). Avg cost ${alt.AvgCostUsd}, friction {alt.FrictionScore:F0}.");
            }
        }

        // Eliminated
        if (eliminated.Count > 0)
        {
            lines.Add("");
            lines.Add("❌ Eliminated:");
            foreach (var (code, reason) in eliminated)
            {
                lines.Add($"  • {reason}");
            }
        }

        return string.Join("\n", lines);
    }

    /// <summary>
    /// Run the Discover pipeline for a single user without a group.
    /// Uses the 3 MCP atoms to evaluate destinations based on simple constraints.
    /// </summary>
    public async Task<DecisionResult> SolveDiscoverAsync(DiscoverRequest request)
    {
        var passports = string.IsNullOrWhiteSpace(request.Passport) ? new List<string> { "TR" } : new List<string> { request.Passport };

        // Derive origin if empty
        var origin = request.Origin;
        if (string.IsNullOrWhiteSpace(origin))
        {
            origin = passports[0].ToUpperInvariant() switch
            {
                "AU" => "SYD",
                "DE" => "BER",
                "TR" => "IST",
                _ => "IST"
            };
        }

        // Parse max budget — expanded tiers
        int maxBudget = int.MaxValue;
        if (request.BudgetLimit == "< $500") maxBudget = 500;
        else if (request.BudgetLimit == "< $1000") maxBudget = 1000;
        else if (request.BudgetLimit == "< $1500") maxBudget = 1500;
        else if (request.BudgetLimit == "< $3000") maxBudget = 3000;
        else if (request.BudgetLimit == "< $5000") maxBudget = 5000;

        // ── Determine adaptive scoring weights based on budget tier ──
        double wBudget, wFlight, wVisa, wPrestige;
        if (maxBudget <= 500) { wBudget = 0.55; wFlight = 0.30; wVisa = 0.10; wPrestige = 0.05; }
        else if (maxBudget <= 1500) { wBudget = 0.45; wFlight = 0.25; wVisa = 0.15; wPrestige = 0.15; }
        else if (maxBudget <= 3000) { wBudget = 0.30; wFlight = 0.20; wVisa = 0.15; wPrestige = 0.35; }
        else { wBudget = 0.20; wFlight = 0.10; wVisa = 0.15; wPrestige = 0.55; }

        var scoredCandidates = new List<CandidateResult>();
        var eliminated = new Dictionary<string, string>();

        foreach (var (code, city, country, countryCode, prestigeScore) in CandidateDestinations)
        {
            var region = GetRegionForCountryCode(countryCode);

            // MCP Filter #0: Region
            if (request.Region != "All" && request.Region != region)
            {
                eliminated[code] = $"{city} skipped: Not in selected region ({request.Region}).";
                continue;
            }

            if (origin.Equals(code, StringComparison.OrdinalIgnoreCase))
            {
                eliminated[code] = $"{city} skipped: You're already there.";
                continue;
            }

            // MCP #1: Route Feasibility
            RouteFeasibilityService.FeasibilityResult feasibility;
            try
            {
                feasibility = await _feasibility.AnalyseAsync(origin, code, passports, countryCode);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MCP Failure] Feasibility timeout/error: {ex.Message}");
                feasibility = new RouteFeasibilityService.FeasibilityResult
                {
                    IsFeasible = true,
                    EstimatedCostUsd = 1000,
                    FlightTimeMinutes = 600,
                    FlightTimeFormatted = "10h 00m",
                    VisaRequired = false,
                    VisaType = "VisaFree (Fallback)"
                };
            }

            if (!feasibility.IsFeasible)
            {
                eliminated[code] = $"{city} eliminated: {feasibility.BlockReason}.";
                continue;
            }

            // MCP #2: Budget Consistency
            if (request.BudgetLimit != "Any" && feasibility.EstimatedCostUsd > maxBudget)
            {
                eliminated[code] = $"{city} eliminated: Flight cost (${feasibility.EstimatedCostUsd}) exceeds your `{request.BudgetLimit}` budget limit.";
                continue;
            }

            BudgetConsistencyService.BudgetResult budgetResult;
            try
            {
                budgetResult = _budget.Analyse(feasibility.EstimatedCostUsd, maxBudget == int.MaxValue ? 5000 : maxBudget);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MCP Failure] Budget timeout/error: {ex.Message}");
                budgetResult = new BudgetConsistencyService.BudgetResult
                {
                    Score = 50.0,
                    Severity = "comfortable",
                    PercentageUsed = 50.0
                };
            }

            // Build Ticket
            var ticket = new MemberTicket
            {
                MemberName = "You",
                Origin = origin,
                Destination = code,
                FlightTime = feasibility.FlightTimeFormatted,
                FlightTimeMinutes = feasibility.FlightTimeMinutes,
                CostUsd = feasibility.EstimatedCostUsd,
                VisaType = feasibility.VisaType,
                VisaRequired = feasibility.VisaRequired,
                BudgetSeverity = budgetResult.Severity,
                BudgetPercentUsed = budgetResult.PercentageUsed
            };

            // ── Adaptive Composite Scoring ──
            double flightTimeScore = Math.Max(0, 100 - (feasibility.FlightTimeMinutes / 12.0));
            double visaScore = feasibility.VisaRequired ? 50.0 : 100.0;
            double normalizedPrestige = prestigeScore; // Already 0–100

            double composite = (wBudget * budgetResult.Score)
                             + (wFlight * flightTimeScore)
                             + (wVisa * visaScore)
                             + (wPrestige * normalizedPrestige);

            // Passport-based boosts
            if (passports.Contains("AU") && (region == "Asia" || region == "Oceania"))
                composite += 8;
            if (passports.Contains("TR") && region == "Europe")
                composite += 5;

            // ── Discovery Bias: ±3 jitter for variety ──
            var jitter = (Random.Shared.NextDouble() - 0.5) * 6.0;
            composite += jitter;

            scoredCandidates.Add(new CandidateResult
            {
                DestinationCode = code,
                City = city,
                Country = country,
                CompositeScore = Math.Round(composite, 1),
                AvgCostUsd = feasibility.EstimatedCostUsd,
                AvgFlightTime = feasibility.FlightTimeFormatted,
                FrictionScore = 0,
                MemberTickets = new List<MemberTicket> { ticket }
            });
        }

        var ranked = scoredCandidates.OrderByDescending(c => c.CompositeScore).ToList();

        if (ranked.Count == 0)
        {
            return new DecisionResult
            {
                Explanation = "No feasible destinations found matching your criteria. Try loosening the budget or changing the region.",
                EliminatedReasons = eliminated
            };
        }

        var winner = ranked[0];
        var alternatives = ranked.Skip(1).Take(3).ToList();

        // Single-user explanation
        var lines = new List<string>();
        lines.Add($"🏆 {winner.City} ({winner.DestinationCode}) is our top logical recommendation, scoring {winner.CompositeScore}/100.");

        if (winner.MemberTickets[0].VisaRequired)
            lines.Add($"⚠️ Visa is required for your {passports[0]} passport.");
        else
            lines.Add($"🛂 Visa-free entry based on your {passports[0]} passport.");

        lines.Add($"💸 Estimated round-trip flight from {origin} takes {winner.AvgFlightTime} and costs ${winner.AvgCostUsd}.");

        var weightLabel = maxBudget <= 500 ? "Budget-Optimized" : maxBudget <= 1500 ? "Balanced" : maxBudget <= 3000 ? "Experience-Focused" : "Luxury/Prestige";
        lines.Add($"⚖️ Scoring mode: {weightLabel} (Budget={wBudget:P0}, Flight={wFlight:P0}, Visa={wVisa:P0}, Prestige={wPrestige:P0}).");

        return new DecisionResult
        {
            Winner = winner,
            Alternatives = alternatives,
            Explanation = string.Join("\n", lines),
            EliminatedReasons = eliminated,
            DecidedAt = DateTime.UtcNow
        };
    }

    private string GetRegionForCountryCode(string countryCode)
    {
        return countryCode switch
        {
            "SG" or "TH" or "MY" or "VN" or "ID" or "PH" or "JP" or "KR" => "Asia",
            "AZ" or "GE" or "AE" or "QA" => "Asia",
            "BA" or "BG" or "RS" or "FR" or "ES" or "GB" or "IT" => "Europe",
            "MA" or "ZA" => "Africa",
            "US" or "MX" or "CO" => "North America",
            "AR" => "South America",
            "NZ" => "Oceania",
            _ => "Other"
        };
    }
}
