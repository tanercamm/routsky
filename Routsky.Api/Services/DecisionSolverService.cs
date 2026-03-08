using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Routsky.Api.Data;

namespace Routsky.Api.Services;

/// <summary>
/// The Orchestrator: Decision Solver
/// Fetches member data → calls MCP atoms for facts → passes to Gemini Agent Brain for reasoning → picks winner with explanation.
/// This is a true "Agent Brain" — it does NOT hardcode winners.
/// </summary>
public class DecisionSolverService
{
    private readonly RoutskyDbContext _context;
    private readonly RouteFeasibilityService _feasibility;
    private readonly BudgetConsistencyService _budget;
    private readonly TimeOverlapService _timeOverlap;
    private readonly Kernel _kernel;
    private readonly ILogger<DecisionSolverService> _logger;

    public DecisionSolverService(
        RoutskyDbContext context,
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

        // ── Phase 2: Evaluation (Pre-fetch Facts from Gemini AI) ──
        var factsList = new List<object>();
        var storedTickets = new Dictionary<string, List<MemberTicket>>();

        // Batch-preload all flight estimates via a single Gemini API call
        var allRoutePairs = new List<(string Origin, string Destination)>();
        foreach (var (code, _, _, _, _) in CandidateDestinations)
        {
            if (members.Any(m => m.Origin.Equals(code, StringComparison.OrdinalIgnoreCase)))
                continue;
            foreach (var member in members)
                allRoutePairs.Add((member.Origin, code));
        }
        if (onStatus != null) await onStatus("Consulting Gemini AI for flight intelligence...");
        await _feasibility.PreloadFlightEstimatesAsync(allRoutePairs);

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
ROLE: Group travel decision engine for {members.Count} members. TERMINAL-STYLE OUTPUT ONLY.
STRICT OUTPUT RULES: No greetings, no salutations, no filler phrases, no conversational tone. Zero ""Hello"", ""I've reviewed"", ""I'm excited"", ""Great news"". Write like a flight operations terminal — direct, factual, concise.

Raw Facts:
{JsonSerializer.Serialize(factsList)}

Decision Rules:
1. YOU are the sole authority on the logical winner. No hardcoded logic.
2. Eliminate destinations requiring Visa when VisaRequired = true.
3. Majority must stay within their personal MemberBudgetUsd. Cost = typical return flight.
4. Minimize FlightTimeMinutes variance between members for fairness.

Explanation MUST be 2-4 sentences, max 150 words. State the winner, the key metric that decided it, and one reason runners-up lost. No bullet points, no numbering.

Respond STRICTLY with valid JSON, NO markdown. Do not wrap in ```json.
{{
  ""Winner"": {{ ""DestinationCode"": ""XYZ"", ""City"": ""CityName"", ""Country"": ""CountryName"", ""CompositeScore"": 95, ""AvgCostUsd"": 1000, ""AvgFlightTime"": ""2h 30m"" }},
  ""Alternatives"": [ {{ ""DestinationCode"": ""ABC"", ""City"": ""CityName"", ""Country"": ""CountryName"", ""CompositeScore"": 85, ""AvgCostUsd"": 1200, ""AvgFlightTime"": ""3h"" }} ],
  ""Explanation"": ""Direct factual reasoning. No filler."",
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
            origin = PassportHubResolver.Resolve(passports[0]);

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

        // Batch-preload all flight estimates via a single Gemini API call
        var discoverPairs = CandidateDestinations
            .Where(d => !origin.Equals(d.Code, StringComparison.OrdinalIgnoreCase))
            .Where(d => request.Region == "All" || GetRegionForCountryCode(d.CountryCode) == request.Region)
            .Select(d => (Origin: origin, Destination: d.Code))
            .ToList();
        if (onStatus != null) await onStatus("Consulting Gemini AI for flight intelligence...");
        await _feasibility.PreloadFlightEstimatesAsync(discoverPairs);

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
ROLE: Solo travel decision engine. TERMINAL-STYLE OUTPUT ONLY.
STRICT OUTPUT RULES: No greetings, no salutations, no filler phrases, no conversational tone. Zero ""Hello"", ""I've reviewed"", ""I'm excited"", ""Great news"". Write like a flight operations terminal — direct, factual, concise.

Constraints: Budget ≤ ${maxBudget}, Passports: {string.Join(",", passports)}, Duration: {request.Duration}.

Raw Facts:
{JsonSerializer.Serialize(factsList)}

Decision Rules:
1. Eliminate destinations requiring Visa when VisaRequired = true.
2. Prioritize staying within total trip budget (EstimatedTotalTripCostUsd).
3. Pick the most logical winner balancing cost, flight time, SafetyIndex, and prestige.

Explanation MUST be 2-4 sentences, max 150 words. State the winner, the key metric that decided it, and one reason runners-up lost. No bullet points, no numbering.

ALL fields below are REQUIRED for Winner AND every Alternative. Do not omit City, Country, AvgCostUsd, or AvgFlightTime.
Respond STRICTLY in JSON, NO markdown wrapping. Do not wrap in ```json.
{{
  ""Winner"": {{ ""DestinationCode"": ""XYZ"", ""City"": ""CityName"", ""Country"": ""CountryName"", ""CompositeScore"": 95, ""AvgCostUsd"": 1000, ""AvgFlightTime"": ""2h 30m"" }},
  ""Alternatives"": [ {{ ""DestinationCode"": ""ABC"", ""City"": ""CityName"", ""Country"": ""CountryName"", ""CompositeScore"": 85, ""AvgCostUsd"": 1200, ""AvgFlightTime"": ""3h"" }} ],
  ""Explanation"": ""Direct factual reasoning. No filler."",
  ""EliminatedReasons"": {{ ""DEF"": ""Over budget"", ""GHI"": ""Visa required"" }}
}}
";
        return await ExecuteAgentPrompt(prompt, storedTickets);
    }

    private async Task<DecisionResult> ExecuteAgentPrompt(string prompt, Dictionary<string, List<MemberTicket>> storedTickets)
    {
        try
        {
            _logger.LogInformation("[GeminiClient] Request sent to Google AI — decision synthesis for {CandidateCount} candidates", storedTickets.Count);
            var chatService = _kernel.GetRequiredService<IChatCompletionService>();
            var history = new ChatHistory();
            history.AddSystemMessage(
                "You are Routsky Decision Engine. Output valid JSON only. " +
                "Never use greetings, salutations, or conversational filler in the Explanation field. " +
                "No \"Hello\", \"Hi there\", \"I've reviewed\", \"Great news\", \"I'm excited\". " +
                "Explanation: max 3 sentences of direct analytical logic.");
            history.AddUserMessage(prompt);

            var executionSettings = new PromptExecutionSettings
            {
                ExtensionData = new Dictionary<string, object> { { "temperature", 0.1 }, { "topP", 0.9 } }
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

                if (!string.IsNullOrEmpty(result.Winner.DestinationCode))
                {
                    if (storedTickets.TryGetValue(result.Winner.DestinationCode, out var winnerTickets))
                        result.Winner.MemberTickets = winnerTickets;

                    var knownWinner = CandidateDestinations.FirstOrDefault(c => c.Code == result.Winner.DestinationCode);
                    if (knownWinner != default)
                    {
                        if (string.IsNullOrEmpty(result.Winner.City)) result.Winner.City = knownWinner.City;
                        if (string.IsNullOrEmpty(result.Winner.Country)) result.Winner.Country = knownWinner.Country;
                    }

                    if (result.Winner.MemberTickets.Count > 0)
                    {
                        if (result.Winner.AvgCostUsd <= 0)
                            result.Winner.AvgCostUsd = (int)result.Winner.MemberTickets.Average(t => t.CostUsd);
                        if (result.Winner.AvgConvertedCost <= 0)
                            result.Winner.AvgConvertedCost = (int)result.Winner.MemberTickets.Average(t => t.ConvertedCost);
                        if (string.IsNullOrEmpty(result.Winner.AvgFlightTime))
                        {
                            var avgMin = (int)result.Winner.MemberTickets.Average(t => t.FlightTimeMinutes);
                            result.Winner.AvgFlightTime = $"{avgMin / 60}h {avgMin % 60}m";
                        }
                    }
                }

                foreach (var alt in result.Alternatives)
                {
                    if (string.IsNullOrEmpty(alt.DestinationCode)) continue;

                    if (storedTickets.TryGetValue(alt.DestinationCode, out var altTickets))
                        alt.MemberTickets = altTickets;

                    var known = CandidateDestinations.FirstOrDefault(c => c.Code == alt.DestinationCode);
                    if (known != default)
                    {
                        if (string.IsNullOrEmpty(alt.City)) alt.City = known.City;
                        if (string.IsNullOrEmpty(alt.Country)) alt.Country = known.Country;
                    }

                    if (alt.MemberTickets.Count > 0)
                    {
                        if (alt.AvgCostUsd <= 0)
                            alt.AvgCostUsd = (int)alt.MemberTickets.Average(t => t.CostUsd);
                        if (alt.AvgConvertedCost <= 0)
                            alt.AvgConvertedCost = (int)alt.MemberTickets.Average(t => t.ConvertedCost);
                        if (string.IsNullOrEmpty(alt.AvgFlightTime))
                        {
                            var avgMin = (int)alt.MemberTickets.Average(t => t.FlightTimeMinutes);
                            alt.AvgFlightTime = $"{avgMin / 60}h {avgMin % 60}m";
                        }
                    }
                }

                result.Alternatives.RemoveAll(a =>
                    string.IsNullOrEmpty(a.City) || a.AvgCostUsd <= 0);

                if (!string.IsNullOrEmpty(result.Explanation))
                    result.Explanation = StripConversationalFiller(result.Explanation);

                _logger.LogInformation("[GeminiClient] Response received from Google AI — winner: {Winner}", result.Winner.City);
                return result;
            }

            _logger.LogError("[GeminiClient] Gemini returned a response but deserialization produced null.");
            throw new Exception("Gemini AI failed to produce a valid decision response. No local fallback.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GeminiClient] Gemini AI call FAILED — {Message}. No local fallback, propagating error.", ex.Message);
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

            var resolvedOrigin = !string.IsNullOrWhiteSpace(origin) ? origin : PassportHubResolver.Resolve(passports!.First());
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

    private static readonly Regex FillerPattern = new(
        @"^(Hello[^.!]*[.!]\s*|Hi[^.!]*[.!]\s*|Hey[^.!]*[.!]\s*|Greetings[^.!]*[.!]\s*|I've reviewed[^.!]*[.!]\s*|I have reviewed[^.!]*[.!]\s*|Great news[^.!]*[.!]\s*|I'm excited[^.!]*[.!]\s*|Good news[^.!]*[.!]\s*|Welcome[^.!]*[.!]\s*|Sure[^.!]*[.!]\s*|Absolutely[^.!]*[.!]\s*|Of course[^.!]*[.!]\s*)+",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static string StripConversationalFiller(string text)
    {
        var cleaned = FillerPattern.Replace(text, "").TrimStart();
        return string.IsNullOrWhiteSpace(cleaned) ? text.Trim() : cleaned;
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
