using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Routiq.Api.Data;

namespace Routiq.Api.Services;

/// <summary>
/// The Orchestrator: Decision Solver
/// Fetches member data → calls MCP atoms for facts → passes to Gemini Agent Brain for reasoning → picks winner with explanation.
/// This is a true "Agent Brain" — it does NOT hardcode winners.
/// </summary>
public class DecisionSolverService
{
    private readonly RoutiqDbContext _context;
    private readonly RouteFeasibilityService _feasibility;
    private readonly BudgetConsistencyService _budget;
    private readonly TimeOverlapService _timeOverlap;
    private readonly Kernel _kernel;
    private readonly ILogger<DecisionSolverService> _logger;

    public DecisionSolverService(
        RoutiqDbContext context,
        RouteFeasibilityService feasibility,
        BudgetConsistencyService budget,
        TimeOverlapService timeOverlap,
        Kernel kernel,
        ILogger<DecisionSolverService> logger)
    {
        _context = context;
        _feasibility = feasibility;
        _budget = budget;
        _timeOverlap = timeOverlap;
        _kernel = kernel;
        _logger = logger;
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
        public int ConvertedCost { get; set; }
        public string Currency { get; set; } = "USD";
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
        public int AvgConvertedCost { get; set; }
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
        /// <summary>"gemini" when AI produced the result, "fallback" when deterministic scoring was used.</summary>
        public string Source { get; set; } = "gemini";
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
        public string PreferredCurrency { get; set; } = "USD";
    }

    // ── Candidate destinations to evaluate ──
    private static readonly List<(string Code, string City, string Country, string CountryCode, int PrestigeScore)> CandidateDestinations = new()
    {
        ("TBS", "Tbilisi",       "Georgia",                 "GE", 40),
        ("GYD", "Baku",          "Azerbaijan",              "AZ", 42),
        ("SJJ", "Sarajevo",      "Bosnia & Herzegovina",    "BA", 45),
        ("CMN", "Casablanca",    "Morocco",                 "MA", 50),
        ("SOF", "Sofia",         "Bulgaria",                "BG", 43),
        ("BEG", "Belgrade",      "Serbia",                  "RS", 46),
        ("SIN", "Singapore",     "Singapore",               "SG", 75),
        ("BKK", "Bangkok",       "Thailand",                "TH", 68),
        ("KUL", "Kuala Lumpur",  "Malaysia",                "MY", 62),
        ("HAN", "Hanoi",         "Vietnam",                 "VN", 60),
        ("DPS", "Bali",          "Indonesia",               "ID", 72),
        ("CEB", "Cebu",          "Philippines",             "PH", 55),
        ("DXB", "Dubai",         "UAE",                     "AE", 82),
        ("DOH", "Doha",          "Qatar",                   "QA", 78),
        ("CDG", "Paris",         "France",                  "FR", 92),
        ("BCN", "Barcelona",     "Spain",                   "ES", 85),
        ("LHR", "London",        "United Kingdom",          "GB", 90),
        ("FCO", "Rome",          "Italy",                   "IT", 88),
        ("NRT", "Tokyo",         "Japan",                   "JP", 95),
        ("ICN", "Seoul",         "South Korea",             "KR", 80),
        ("JFK", "New York",      "United States",           "US", 93),
        ("MEX", "Mexico City",   "Mexico",                  "MX", 65),
        ("EZE", "Buenos Aires",  "Argentina",               "AR", 70),
        ("BOG", "Bogotá",        "Colombia",                "CO", 58),
        ("CPT", "Cape Town",     "South Africa",            "ZA", 74),
        ("AKL", "Auckland",      "New Zealand",             "NZ", 76),
    };

    /// <summary>
    /// Run the full decision pipeline for a travel group utilizing the Gemini Agent Orchestrator.
    /// </summary>
    public async Task<DecisionResult> SolveAsync(
        Guid groupId,
        Func<string, Task>? onStatus = null,
        CancellationToken ct = default)
    {
        // ── Phase 1: Search (Gather Constraints) ──
        var (members, skippedWarnings) = await FetchMembersAsync(groupId);
        if (members.Count < 2)
        {
            var reason = skippedWarnings.Count > 0
                ? $"Need at least 2 members with set origins. Skipped: {string.Join(", ", skippedWarnings)}"
                : "Need at least 2 members with set origins to run the intersection engine.";
            return new DecisionResult { Explanation = reason };
        }

        // ── Phase 2: Evaluation (Pre-fetch Facts for Agent) ──
        var factsList = new List<object>();
        var storedTickets = new Dictionary<string, List<MemberTicket>>();

        foreach (var (code, city, country, countryCode, prestigeScore) in CandidateDestinations)
        {
            if (members.Any(m => m.Origin.Equals(code, StringComparison.OrdinalIgnoreCase)))
                continue;

            var rawTickets = new List<object>();
            var hydratedTickets = new List<MemberTicket>();

            foreach (var member in members)
            {
                RouteFeasibilityService.FeasibilityResult feasibility;
                try
                {
                    feasibility = await _feasibility.AnalyseAsync(member.Origin, code, member.Passports, countryCode);
                }
                catch (Exception)
                {
                    continue;
                }

                var currency = member.PreferredCurrency;
                var convertedCost = feasibility.EstimatedCostUsd;
                if (currency == "EUR") convertedCost = (int)(feasibility.EstimatedCostUsd * 0.95);
                else if (currency == "TRY") convertedCost = (int)(feasibility.EstimatedCostUsd * 36.5);

                rawTickets.Add(new
                {
                    MemberName = member.Name,
                    FlightTimeMinutes = feasibility.FlightTimeMinutes,
                    EstimatedFlightCostUsd = feasibility.EstimatedCostUsd,
                    VisaRequired = feasibility.VisaRequired,
                    MemberBudgetUsd = member.Budget
                });

                hydratedTickets.Add(new MemberTicket
                {
                    MemberName = member.Name,
                    MemberId = member.UserId,
                    Origin = member.Origin,
                    Destination = code,
                    FlightTime = feasibility.FlightTimeFormatted,
                    FlightTimeMinutes = feasibility.FlightTimeMinutes,
                    CostUsd = feasibility.EstimatedCostUsd,
                    ConvertedCost = convertedCost,
                    Currency = currency,
                    VisaType = feasibility.VisaType,
                    VisaRequired = feasibility.VisaRequired,
                    BudgetSeverity = feasibility.EstimatedCostUsd > member.Budget ? "over" : "comfortable",
                    BudgetPercentUsed = member.Budget > 0 ? (feasibility.EstimatedCostUsd / (double)member.Budget) * 100 : 50
                });
            }

            if (rawTickets.Count < members.Count) continue; // Skip if a flight couldn't be routed

            factsList.Add(new
            {
                DestinationCode = code,
                City = city,
                PrestigeScore = prestigeScore,
                Tickets = rawTickets
            });
            storedTickets[code] = hydratedTickets;
        }

        // ── Phase 3: Decision & Synthesis (Agent Prompt) ──
        var prompt = $@"
You are an expert group travel Agent Orchestrator. Decide the best travel destination for {members.Count} members.

Raw Facts for Candidate Destinations:
{JsonSerializer.Serialize(factsList)}

Strict Rules:
1. Provide a logical decision. YOU are the sole authority on the logical winner. There are no hardcoded logic loops.
2. Eliminate destinations that strictly require a Visa if the user has no Visa (VisaRequired = true).
3. Select a destination where the majority stay within their personal `MemberBudgetUsd`. The Cost facts represent typical return flight cost.
4. Minimize the difference in `FlightTimeMinutes` between members to ensure fairness.
5. Provide a human-readable explanation of your reasoning process. Mention who pays what and who flies how long.

Respond STRICTLY with valid JSON matching this schema, with NO markdown formatting. Do not wrap in ```json.
{{
  ""Winner"": {{ ""DestinationCode"": ""XYZ"", ""City"": """", ""Country"": """", ""CompositeScore"": 95, ""AvgCostUsd"": 1000, ""AvgFlightTime"": ""2h 30m"" }},
  ""Alternatives"": [ {{ ""DestinationCode"": ""ABC"", ""City"": """", ""Country"": """", ""CompositeScore"": 85, ""AvgCostUsd"": 1200, ""AvgFlightTime"": ""3h"" }} ],
  ""Explanation"": ""Detailed reasoning for why XYZ won and others didn't."",
  ""EliminatedReasons"": {{ ""CDE"": ""Visa required for Member1"", ""FGH"": ""Over budget for Member2"" }}
}}
";
        return await ExecuteAgentPrompt(prompt, storedTickets);
    }




    /// <summary>
    /// Discover route logic - Single User Agent orchestration
    /// </summary>
    public async Task<DecisionResult> SolveDiscoverAsync(
        DiscoverRequest request,
        Func<string, Task>? onStatus = null,
        CancellationToken ct = default)
    {
        var passports = string.IsNullOrWhiteSpace(request.Passport)
            ? new List<string> { "TR" }
            : new List<string> { request.Passport };
        var origin = request.Origin;
        if (string.IsNullOrWhiteSpace(origin))
            origin = passports[0].ToUpperInvariant() switch { "AU" => "SYD", "DE" => "BER", "TR" => "IST", _ => "IST" };

        int maxBudget = request.BudgetLimit switch
        {
            "< $500" => 500,
            "< $1000" => 1000,
            "< $1500" => 1500,
            "< $3000" => 3000,
            "< $5000" => 5000,
            _ => 10000
        };

        var durationDays = request.Duration == "2-3 Days" ? 3 : request.Duration == "4-7 Days" ? 5 : request.Duration == "1-2 Weeks" ? 10 : 7;

        var factsList = new List<object>();
        var storedTickets = new Dictionary<string, List<MemberTicket>>();

        foreach (var (code, city, country, countryCode, prestigeScore) in CandidateDestinations)
        {
            var region = GetRegionForCountryCode(countryCode);
            if (request.Region != "All" && request.Region != region) continue;
            if (origin.Equals(code, StringComparison.OrdinalIgnoreCase)) continue;

            var intelligence = await _context.CityIntelligences.FirstOrDefaultAsync(c => c.CityName == city);
            if (intelligence == null) continue;

            var primaryPassport = passports[0].ToUpper();
            var visaMatrixRow = await _context.VisaMatrices.FirstOrDefaultAsync(v =>
                v.DestinationCountry == country &&
                (v.PassportCountry == "Turkey" && primaryPassport == "TR" ||
                 v.PassportCountry == "Australia" && primaryPassport == "AU" ||
                 v.PassportCountry == "Germany" && primaryPassport == "DE" ||
                 v.PassportCountry == "United Kingdom" && primaryPassport == "GB" ||
                 v.PassportCountry == "United States" && primaryPassport == "US" ||
                 v.PassportCountry == "India" && primaryPassport == "IN"));

            RouteFeasibilityService.FeasibilityResult feasibility;
            try { feasibility = await _feasibility.AnalyseAsync(origin, code, passports, countryCode); }
            catch (Exception) { continue; }

            double dailyCostUsd = 100 * (intelligence.CostOfLivingIndex / 100.0);
            double totalLandCost = dailyCostUsd * durationDays;
            double projectedTotalCost = feasibility.EstimatedCostUsd + totalLandCost;
            bool isVisaRequired = visaMatrixRow?.VisaStatus == "Required" || feasibility.VisaRequired;
            var visaType = visaMatrixRow?.VisaStatus ?? (isVisaRequired ? "Required" : "VisaFree");

            var currency = origin == "SYD" ? "AUD" : origin == "BER" ? "EUR" : origin == "IST" ? "TRY" : "USD";
            var convertedCost = feasibility.EstimatedCostUsd;
            if (currency == "EUR") convertedCost = (int)(feasibility.EstimatedCostUsd * 0.95);
            else if (currency == "TRY") convertedCost = (int)(feasibility.EstimatedCostUsd * 36.5);
            else if (currency == "AUD") convertedCost = (int)(feasibility.EstimatedCostUsd * 1.5);

            factsList.Add(new
            {
                DestinationCode = code,
                City = city,
                EstimatedTotalTripCostUsd = (int)projectedTotalCost,
                FlightCostUsd = feasibility.EstimatedCostUsd,
                FlightTimeMinutes = feasibility.FlightTimeMinutes,
                VisaRequired = isVisaRequired,
                SafetyIndex = intelligence.SafetyIndex,
                PrestigeScore = prestigeScore
            });

            storedTickets[code] = new List<MemberTicket> { new MemberTicket
            {
                MemberName = "You",
                Origin = origin,
                Destination = code,
                FlightTime = feasibility.FlightTimeFormatted,
                FlightTimeMinutes = feasibility.FlightTimeMinutes,
                CostUsd = feasibility.EstimatedCostUsd,
                ConvertedCost = convertedCost,
                Currency = currency,
                VisaType = visaType,
                VisaRequired = isVisaRequired,
                BudgetSeverity = projectedTotalCost > maxBudget ? "over" : "comfortable",
                BudgetPercentUsed = maxBudget < 10000 ? (projectedTotalCost / maxBudget) * 100 : 50
            }};
        }

        var prompt = $@"
You are a highly intelligent travel agent orchestrator. 
The user's constraint: Budget Limit: {request.BudgetLimit} (Approx Max ${maxBudget}), Passports: {string.Join(",", passports)}, Duration: {request.Duration}.

Raw Facts for Candidates:
{JsonSerializer.Serialize(factsList)}

Strict Rules:
1. Eliminate destinations that strictly require a Visa if the user has no Visa (VisaRequired = true).
2. Prioritize staying within the total trip budget (`EstimatedTotalTripCostUsd`).
3. Pick the most logical winner balancing cost, flight time, safety (`SafetyIndex`), and prestige.
4. Provide a human-readable explanation of your reasoning process without robotic numbering. Make sure to talk to the user.

Respond STRICTLY in JSON matching this exact C# schema, NO markdown wrapping.
{{
  ""Winner"": {{ ""DestinationCode"": ""XYZ"", ""City"": ""City"", ""Country"": ""Country"", ""CompositeScore"": 95, ""AvgCostUsd"": 1000, ""AvgFlightTime"": ""2h 30m"" }},
  ""Alternatives"": [ {{ ""DestinationCode"": ""ABC"", ""CompositeScore"": 85 }} ],
  ""Explanation"": ""Your detailed text explanation."",
  ""EliminatedReasons"": {{ ""DEF"": ""Over budget"", ""GHI"": ""Visa required"" }}
}}
";
        return await ExecuteAgentPrompt(prompt, storedTickets);
    }

    private async Task<DecisionResult> ExecuteAgentPrompt(string prompt, Dictionary<string, List<MemberTicket>> storedTickets)
    {
        try
        {
            _logger.LogInformation("Invoking Gemini AI for decision prompt ({CandidateCount} candidates)", storedTickets.Count);
            var chatService = _kernel.GetRequiredService<IChatCompletionService>();
            var history = new ChatHistory();
            history.AddUserMessage(prompt);

            var executionSettings = new PromptExecutionSettings
            {
                ExtensionData = new Dictionary<string, object> { { "temperature", 0.2 }, { "topP", 0.95 } }
            };

            var response = await chatService.GetChatMessageContentAsync(history, executionSettings);
            var json = response.Content ?? "{}";
            json = json.Trim();

            if (json.StartsWith("```"))
            {
                var firstNewline = json.IndexOf('\n');
                var lastBackticks = json.LastIndexOf("```");
                if (firstNewline != -1 && lastBackticks > firstNewline)
                {
                    json = json.Substring(firstNewline + 1, lastBackticks - firstNewline - 1).Trim();
                }
            }

            var result = JsonSerializer.Deserialize<DecisionResult>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (result != null)
            {
                result.DecidedAt = DateTime.UtcNow;
                result.Source = "gemini";

                if (!string.IsNullOrEmpty(result.Winner.DestinationCode) && storedTickets.TryGetValue(result.Winner.DestinationCode, out var winnerTickets))
                    result.Winner.MemberTickets = winnerTickets;

                foreach (var alt in result.Alternatives)
                {
                    if (!string.IsNullOrEmpty(alt.DestinationCode) && storedTickets.TryGetValue(alt.DestinationCode, out var altTickets))
                        alt.MemberTickets = altTickets;
                }

                _logger.LogInformation("Gemini AI decision complete — winner: {Winner}", result.Winner.City);
                return result;
            }

            _logger.LogError("Gemini returned a response but deserialization produced null.");
            throw new Exception("Gemini AI failed to produce a valid decision response.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini AI call failed ({Message}).", ex.Message);
            throw;
        }
    }



    private async Task<(List<MemberInfo> Members, List<string> Warnings)> FetchMembersAsync(Guid groupId)
    {
        var dbMembers = await _context.TravelGroupMembers
            .Where(m => m.GroupId == groupId)
            .Include(m => m.User).ThenInclude(u => u!.Profile).ToListAsync();

        var members = new List<MemberInfo>();
        var warnings = new List<string>();

        foreach (var m in dbMembers.Where(m => m.User != null))
        {
            var name = $"{m.User!.FirstName} {m.User.LastName}".Trim();
            var origin = m.User.Profile?.Origin;
            var passports = m.User.Profile?.Passports;

            if (string.IsNullOrWhiteSpace(origin) && (passports == null || passports.Count == 0))
            {
                warnings.Add($"{name} (no origin/passport set)");
                continue;
            }

            var resolvedOrigin = !string.IsNullOrWhiteSpace(origin) ? origin : passports!.First();
            var budget = m.User.Profile?.Budget ?? 0;

            members.Add(new MemberInfo
            {
                UserId = m.UserId,
                Name = name,
                Origin = resolvedOrigin,
                Passports = passports ?? new List<string>(),
                Budget = budget > 0 ? budget : 1500,
                PreferredCurrency = m.User.Profile?.PreferredCurrency ?? "USD"
            });
        }

        return (members, warnings);
    }

    private string GetRegionForCountryCode(string countryCode)
    {
        return countryCode switch
        {
            "SG" or "TH" or "MY" or "VN" or "ID" or "PH" or "JP" or "KR" or "AZ" or "GE" or "AE" or "QA" => "Asia",
            "BA" or "BG" or "RS" or "FR" or "ES" or "GB" or "IT" or "CH" or "AT" or "NL" or "HU" or "CZ" or "PL" or "RO" or "AL" or "ME" or "HR" or "SI" => "Europe",
            "MA" or "ZA" or "EG" or "TN" => "Africa",
            "US" or "MX" or "CO" or "AR" or "PE" or "GT" or "CR" => "Americas",
            "NZ" or "AU" => "Oceania",
            _ => "Other"
        };
    }
}
