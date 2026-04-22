using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace Routsky.Api.Services;

/// <summary>
/// Client for the Travel Buddy visa requirements API (travel-buddy.ai).
/// Hosted on RapidAPI at visa-requirement.p.rapidapi.com.
/// Provides real-time visa rules for any passport→destination pair.
/// </summary>
public class TravelBuddyApiService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TravelBuddyApiService> _logger;
    private readonly string _apiKey = string.Empty;
    private readonly string _baseUrl;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);
    private const int GlobalMapEnrichmentCap = 72;

    public TravelBuddyApiService(
        HttpClient httpClient,
        IMemoryCache cache,
        IConfiguration configuration,
        ILogger<TravelBuddyApiService> logger)
    {
        _http = httpClient;
        _cache = cache;
        _logger = logger;

        _baseUrl = configuration["TravelBuddy:BaseUrl"] ?? "https://visa-requirement.p.rapidapi.com";

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 1: Dump all environment variable keys that look relevant
        //          (NEVER log values — only key names and lengths)
        // ═══════════════════════════════════════════════════════════════════
        try
        {
            var allEnvVars = Environment.GetEnvironmentVariables();
            var relevantKeys = new List<string>();
            foreach (System.Collections.DictionaryEntry entry in allEnvVars)
            {
                var key = entry.Key?.ToString() ?? "";
                if (key.Contains("TRAVEL", StringComparison.OrdinalIgnoreCase) ||
                    key.Contains("RAPID", StringComparison.OrdinalIgnoreCase) ||
                    key.Contains("BUDDY", StringComparison.OrdinalIgnoreCase) ||
                    key.Contains("VISA", StringComparison.OrdinalIgnoreCase))
                {
                    var valLen = (entry.Value?.ToString() ?? "").Length;
                    relevantKeys.Add($"{key} (len={valLen})");
                }
            }
            _logger.LogWarning(
                "[TravelBuddy] ENV VAR SCAN — found {Count} relevant keys: [{Keys}]. Total env vars: {Total}",
                relevantKeys.Count,
                relevantKeys.Count > 0 ? string.Join(", ", relevantKeys) : "<none>",
                allEnvVars.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[TravelBuddy] Failed to scan environment variables");
        }

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 2: Aggressive key resolution — every source and casing variant
        // ═══════════════════════════════════════════════════════════════════
        var attempts = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            // Render double-underscore variant (confirmed in production logs)
            ["ENV:TRAVELBUDDY__RAPIDAPI__KEY"] =
                Environment.GetEnvironmentVariable("TRAVELBUDDY__RAPIDAPI__KEY"),
            // OS-level env var (exact casing)
            ["ENV:TRAVELBUDDY_RAPIDAPI_KEY"] =
                Environment.GetEnvironmentVariable("TRAVELBUDDY_RAPIDAPI_KEY"),
            // OS-level env var (ProcessEnvironmentBlock — all-caps)
            ["ENV:TRAVELBUDDY_RAPIDAPI_KEY(Process)"] =
                Environment.GetEnvironmentVariable("TRAVELBUDDY_RAPIDAPI_KEY", EnvironmentVariableTarget.Process),
            // IConfiguration flat key (EnvironmentVariables provider maps KEY=val → configuration["KEY"])
            ["CFG:TRAVELBUDDY_RAPIDAPI_KEY"] =
                configuration["TRAVELBUDDY_RAPIDAPI_KEY"],
            // IConfiguration section-style (appsettings TravelBuddy:ApiKey or env TravelBuddy__ApiKey)
            ["CFG:TravelBuddy:ApiKey"] =
                configuration["TravelBuddy:ApiKey"],
            // Double-underscore variant (Render may map : → __)
            ["ENV:TravelBuddy__ApiKey"] =
                Environment.GetEnvironmentVariable("TravelBuddy__ApiKey"),
            // Custom env var name from appsettings
            ["CFG:TravelBuddy:ApiKeyEnvVar→ENV"] =
                ResolveCustomEnvVar(configuration),
        };

        // Log each attempt
        foreach (var (label, val) in attempts)
        {
            _logger.LogWarning(
                "[TravelBuddy] KEY PROBE {Label}: {Result}",
                label,
                string.IsNullOrWhiteSpace(val) ? "NULL/EMPTY" : $"FOUND (len={val.Length})");
        }

        // Pick the first non-empty value
        _apiKey = attempts.Values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v))
                  ?? string.Empty;

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 3: Last-resort case-insensitive scan of ALL env vars
        // ═══════════════════════════════════════════════════════════════════
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("[TravelBuddy] All standard probes returned null. Running case-insensitive env var scan...");
            try
            {
                foreach (System.Collections.DictionaryEntry entry in Environment.GetEnvironmentVariables())
                {
                    var key = entry.Key?.ToString() ?? "";
                    if (key.Equals("TRAVELBUDDY_RAPIDAPI_KEY", StringComparison.OrdinalIgnoreCase) ||
                        key.Equals("TRAVELBUDDY__RAPIDAPI__KEY", StringComparison.OrdinalIgnoreCase))
                    {
                        _apiKey = entry.Value?.ToString() ?? "";
                        _logger.LogWarning(
                            "[TravelBuddy] Case-insensitive scan HIT: actual key name = '{ActualKey}', len={Length}",
                            key, _apiKey.Length);
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[TravelBuddy] Case-insensitive env scan failed");
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 4: Final verdict
        // ═══════════════════════════════════════════════════════════════════
        _logger.LogWarning("TRAVELBUDDY API KEY LENGTH: {Length}", _apiKey?.Length ?? 0);

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogError(
                "[TravelBuddy] CRITICAL: API key is NULL after exhaustive search. " +
                "Visa lookups will return 'Unknown'. Set TRAVELBUDDY_RAPIDAPI_KEY in Render env vars.");
        }
        else
        {
            var masked = _apiKey.Length <= 8
                ? new string('*', _apiKey.Length)
                : $"{_apiKey[..4]}...{_apiKey[^4..]}";
            _logger.LogWarning(
                "[TravelBuddy] API key RESOLVED. Host={Host}, Key={MaskedKey}, Length={Length}",
                new Uri(_baseUrl).Host, masked, _apiKey.Length);
        }
    }

    /// <summary>Resolve the custom env var name indirection from appsettings.</summary>
    private static string? ResolveCustomEnvVar(IConfiguration configuration)
    {
        var customName = configuration["TravelBuddy:ApiKeyEnvVar"];
        if (string.IsNullOrWhiteSpace(customName)) return null;
        return Environment.GetEnvironmentVariable(customName);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v)) return v;
        }
        return null;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    // ── DTOs ──

    public class VisaCheckResult
    {
        public string PassportCode { get; set; } = "";
        public string DestinationCode { get; set; } = "";
        public string RuleName { get; set; } = "Unknown";
        public string Color { get; set; } = "red";
        public int? DurationDays { get; set; }
        public string? SecondaryRule { get; set; }
        public string? Notes { get; set; }
    }

    public class VisaMapResult
    {
        public string PassportCode { get; set; } = "";
        [JsonPropertyName("green")]
        public List<string> Green { get; set; } = new();
        [JsonPropertyName("blue")]
        public List<string> Blue { get; set; } = new();
        [JsonPropertyName("yellow")]
        public List<string> Yellow { get; set; } = new();
        [JsonPropertyName("red")]
        public List<string> Red { get; set; } = new();
    }

    public class GlobalVisaCountryStatus
    {
        public string Status { get; set; } = "Unknown";
        public string Source { get; set; } = "map";
        public string? RawRuleName { get; set; }
        public string? RawColor { get; set; }
        public int? DurationDays { get; set; }
    }

    public class GlobalVisaMapResponse
    {
        public string PassportCode { get; set; } = "";
        public DateTime GeneratedAtUtc { get; set; }
        public Dictionary<string, GlobalVisaCountryStatus> Countries { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Check visa requirement for a single passport→destination pair.
    /// Uses cached visa map when available to minimize API calls.
    /// </summary>
    public async Task<VisaCheckResult> CheckVisaAsync(string passportCode, string destinationCode)
    {
        passportCode = passportCode.ToUpperInvariant();
        destinationCode = destinationCode.ToUpperInvariant();

        var cacheKey = $"visa:{passportCode}:{destinationCode}";
        if (_cache.TryGetValue(cacheKey, out VisaCheckResult? cached) && cached != null)
            return cached;

        // Try resolving from cached map first
        var mapCacheKey = $"visamap:{passportCode}";
        if (_cache.TryGetValue(mapCacheKey, out VisaMapResult? map) && map != null)
        {
            var result = ResolveFromMap(map, passportCode, destinationCode);
            _cache.Set(cacheKey, result, CacheTtl);
            return result;
        }

        if (!IsConfigured)
        {
            _logger.LogWarning("[TravelBuddy] API key not configured. Returning Unknown visa status for {Passport}→{Dest}",
                passportCode, destinationCode);
            return new VisaCheckResult
            {
                PassportCode = passportCode,
                DestinationCode = destinationCode,
                RuleName = "Unknown",
                Color = "yellow"
            };
        }

        try
        {
            var payload = new { passport = passportCode, destination = destinationCode };
            var request = CreateRequest("/v2/visa/check", payload);
            var response = await _http.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await SafeReadBodyAsync(response);
                _logger.LogWarning(
                    "[TravelBuddy] /v2/visa/check returned {Status} for {Passport}→{Dest}. Body: {Body}",
                    response.StatusCode, passportCode, destinationCode, body);
                return FallbackResult(passportCode, destinationCode);
            }

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var data = doc.RootElement.GetProperty("data");

            var visaRules = data.GetProperty("visa_rules");
            var primaryRule = visaRules.GetProperty("primary_rule");

            var result = new VisaCheckResult
            {
                PassportCode = passportCode,
                DestinationCode = destinationCode,
                RuleName = primaryRule.GetProperty("name").GetString() ?? "Unknown",
                Color = primaryRule.GetProperty("color").GetString() ?? "red",
                DurationDays = primaryRule.TryGetProperty("duration", out var dur) ? dur.GetInt32() : null,
            };

            if (visaRules.TryGetProperty("secondary_rule", out var secondary) &&
                secondary.ValueKind != JsonValueKind.Null)
            {
                result.SecondaryRule = secondary.TryGetProperty("name", out var sn) ? sn.GetString() : null;
            }

            _cache.Set(cacheKey, result, CacheTtl);
            _logger.LogInformation("[TravelBuddy] Visa check {Passport}→{Dest}: {Rule} ({Color})",
                passportCode, destinationCode, result.RuleName, result.Color);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TravelBuddy] Failed to check visa for {Passport}→{Dest}", passportCode, destinationCode);
            return FallbackResult(passportCode, destinationCode);
        }
    }

    /// <summary>
    /// Fetch the color-coded visa map for all 210 destinations for one passport.
    /// Much more efficient than individual checks — use at session start.
    /// </summary>
    public async Task<VisaMapResult> GetVisaMapAsync(string passportCode)
    {
        passportCode = passportCode.ToUpperInvariant();
        var cacheKey = $"visamap:{passportCode}";

        if (_cache.TryGetValue(cacheKey, out VisaMapResult? cached) && cached != null)
            return cached;

        if (!IsConfigured)
        {
            _logger.LogWarning("[TravelBuddy] API key not configured. Returning empty visa map for {Passport}", passportCode);
            return new VisaMapResult { PassportCode = passportCode };
        }

        try
        {
            var payload = new { passport = passportCode };
            var request = CreateRequest("/v2/visa/map", payload);
            var response = await _http.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await SafeReadBodyAsync(response);
                _logger.LogWarning(
                    "[TravelBuddy] /v2/visa/map returned {Status} for {Passport}. Body: {Body}",
                    response.StatusCode, passportCode, body);
                return new VisaMapResult { PassportCode = passportCode };
            }

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var data = doc.RootElement.GetProperty("data");
            var colors = data.GetProperty("colors");

            var result = new VisaMapResult
            {
                PassportCode = passportCode,
                Green = ParseColorList(colors, "green"),
                Blue = ParseColorList(colors, "blue"),
                Yellow = ParseColorList(colors, "yellow"),
                Red = ParseColorList(colors, "red"),
            };

            _cache.Set(cacheKey, result, CacheTtl);
            _logger.LogInformation(
                "[TravelBuddy] Visa map loaded for {Passport}: {Green} green, {Blue} blue, {Yellow} yellow, {Red} red",
                passportCode, result.Green.Count, result.Blue.Count, result.Yellow.Count, result.Red.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TravelBuddy] Failed to fetch visa map for {Passport}", passportCode);
            return new VisaMapResult { PassportCode = passportCode };
        }
    }

    /// <summary>
    /// Returns global visa map classifications for one passport.
    /// Uses map endpoint for breadth + selective per-country enrichment for edge statuses.
    /// </summary>
    public async Task<GlobalVisaMapResponse> GetGlobalVisaStatusesAsync(string passportCode)
    {
        passportCode = passportCode.ToUpperInvariant();
        var globalCacheKey = $"visaglobal:{passportCode}";

        if (_cache.TryGetValue(globalCacheKey, out GlobalVisaMapResponse? cached) && cached != null)
            return cached;

        var map = await GetVisaMapAsync(passportCode);
        var countries = BuildBaselineCountries(map);

        var enrichmentTargets = map.Red
            .Concat(map.Yellow)
            .Concat(map.Blue)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.ToUpperInvariant())
            .Distinct()
            .Take(GlobalMapEnrichmentCap)
            .ToList();

        foreach (var destinationCode in enrichmentTargets)
        {
            var check = await CheckVisaAsync(passportCode, destinationCode);
            var enriched = BuildEnrichedStatus(check);

            if (!countries.TryGetValue(destinationCode, out var existing))
            {
                countries[destinationCode] = enriched;
                continue;
            }

            // Keep baseline unless enrichment found stricter/more informative status.
            if (ShouldReplaceStatus(existing.Status, enriched.Status))
                countries[destinationCode] = enriched;
            else
            {
                existing.RawRuleName ??= check.RuleName;
                existing.RawColor ??= check.Color;
                existing.DurationDays ??= check.DurationDays;
            }
        }

        var response = new GlobalVisaMapResponse
        {
            PassportCode = passportCode,
            GeneratedAtUtc = DateTime.UtcNow,
            Countries = countries
        };

        _cache.Set(globalCacheKey, response, CacheTtl);
        return response;
    }

    /// <summary>
    /// Maps Travel Buddy color codes to our internal VisaRequirement-compatible strings.
    /// green → VisaFree, blue → EVisa/OnArrival, yellow → EVisa, red → Required
    /// </summary>
    public static string MapColorToVisaType(string color) => color.ToLowerInvariant() switch
    {
        "green" => "VisaFree",
        "blue" => "OnArrival",
        "yellow" => "EVisa",
        "red" => "Required",
        _ => "Unknown"
    };

    public static bool IsVisaRequired(string color) =>
        color.Equals("red", StringComparison.OrdinalIgnoreCase);

    // ── Private helpers ──

    private HttpRequestMessage CreateRequest(string path, object payload)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8,
                "application/json")
        };
        // RapidAPI auth headers — required on every call; ".Add" will throw if missing.
        request.Headers.Add("X-RapidAPI-Key", _apiKey);
        request.Headers.Add("X-RapidAPI-Host", new Uri(_baseUrl).Host);
        return request;
    }

    private static async Task<string> SafeReadBodyAsync(HttpResponseMessage response)
    {
        try
        {
            var body = await response.Content.ReadAsStringAsync();
            if (body.Length > 512) body = body[..512] + "…";
            return body;
        }
        catch
        {
            return "<unreadable>";
        }
    }

    private static List<string> ParseColorList(JsonElement colors, string colorKey)
    {
        if (!colors.TryGetProperty(colorKey, out var val) || val.ValueKind == JsonValueKind.Null)
            return new List<string>();

        var csv = val.GetString() ?? "";
        return csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => c.ToUpperInvariant())
            .ToList();
    }

    private static Dictionary<string, GlobalVisaCountryStatus> BuildBaselineCountries(VisaMapResult map)
    {
        var countries = new Dictionary<string, GlobalVisaCountryStatus>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in map.Green.Where(static c => !string.IsNullOrWhiteSpace(c)))
        {
            countries[code] = new GlobalVisaCountryStatus
            {
                Status = "VisaFree",
                Source = "map",
                RawColor = "green",
                RawRuleName = "Visa Free"
            };
        }

        foreach (var code in map.Blue.Where(static c => !string.IsNullOrWhiteSpace(c)))
        {
            countries[code] = new GlobalVisaCountryStatus
            {
                Status = "EVisaOrOnArrival",
                Source = "map",
                RawColor = "blue",
                RawRuleName = "e-Visa or Visa on Arrival"
            };
        }

        foreach (var code in map.Yellow.Where(static c => !string.IsNullOrWhiteSpace(c)))
        {
            countries[code] = new GlobalVisaCountryStatus
            {
                Status = "EVisaOrOnArrival",
                Source = "map",
                RawColor = "yellow",
                RawRuleName = "e-Visa or Visa on Arrival"
            };
        }

        foreach (var code in map.Red.Where(static c => !string.IsNullOrWhiteSpace(c)))
        {
            countries[code] = new GlobalVisaCountryStatus
            {
                Status = "VisaRequired",
                Source = "map",
                RawColor = "red",
                RawRuleName = "Visa Required"
            };
        }

        return countries;
    }

    private static GlobalVisaCountryStatus BuildEnrichedStatus(VisaCheckResult check)
    {
        var normalizedColor = (check.Color ?? string.Empty).ToLowerInvariant();
        var ruleText = $"{check.RuleName} {check.SecondaryRule} {check.Notes}".Trim();
        var lowerRule = ruleText.ToLowerInvariant();

        var status = normalizedColor switch
        {
            "green" => "VisaFree",
            "blue" => "EVisaOrOnArrival",
            "yellow" => "EVisaOrOnArrival",
            "red" => "VisaRequired",
            _ => "Unknown"
        };

        if (ContainsAny(lowerRule, "ban", "banned", "refused", "refusal", "forbidden", "prohibited", "entry not allowed", "denied"))
        {
            status = "BannedOrRefused";
        }
        else if (ContainsAny(lowerRule, "e-visa", "evisa", "visa on arrival", "on arrival", "eta", "electronic travel authorization"))
        {
            status = "EVisaOrOnArrival";
        }
        else if (check.DurationDays.HasValue && check.DurationDays.Value > 0 && check.DurationDays.Value <= 90)
        {
            status = "ConditionalOrTimeLimited";
        }
        else if (ContainsAny(lowerRule, "permit", "registration", "pre-approval", "approval required", "conditions apply", "must show", "proof of"))
        {
            status = "ConditionalOrTimeLimited";
        }

        return new GlobalVisaCountryStatus
        {
            Status = status,
            Source = "enriched-check",
            RawRuleName = string.IsNullOrWhiteSpace(ruleText) ? null : ruleText,
            RawColor = check.Color,
            DurationDays = check.DurationDays
        };
    }

    private static bool ContainsAny(string source, params string[] terms) =>
        terms.Any(term => source.Contains(term, StringComparison.OrdinalIgnoreCase));

    private static bool ShouldReplaceStatus(string existing, string enriched)
    {
        if (string.Equals(existing, enriched, StringComparison.OrdinalIgnoreCase))
            return false;

        if (string.Equals(enriched, "BannedOrRefused", StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(existing, "Unknown", StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(existing, "VisaRequired", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(enriched, "ConditionalOrTimeLimited", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }

    private static VisaCheckResult ResolveFromMap(VisaMapResult map, string passport, string destination)
    {
        string color;
        if (map.Green.Contains(destination)) color = "green";
        else if (map.Blue.Contains(destination)) color = "blue";
        else if (map.Yellow.Contains(destination)) color = "yellow";
        else if (map.Red.Contains(destination)) color = "red";
        else color = "yellow"; // unknown defaults to caution

        return new VisaCheckResult
        {
            PassportCode = passport,
            DestinationCode = destination,
            RuleName = MapColorToVisaType(color),
            Color = color,
        };
    }

    private static VisaCheckResult FallbackResult(string passport, string destination) => new()
    {
        PassportCode = passport,
        DestinationCode = destination,
        RuleName = "Unknown",
        Color = "yellow"
    };
}
