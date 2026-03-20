using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace Routsky.Api.Services;

/// <summary>
/// Flight price estimation via Gemini AI.
/// Extracted from the original RouteFeasibilityService.
/// Supports single and batch estimation.
/// </summary>
public class GeminiFlightPriceProvider : IFlightPriceProvider
{
    private readonly Kernel _kernel;
    private readonly ILogger<GeminiFlightPriceProvider> _logger;
    private readonly Dictionary<string, (int Minutes, int CostUsd)> _cache = new(StringComparer.OrdinalIgnoreCase);

    public GeminiFlightPriceProvider(Kernel kernel, ILogger<GeminiFlightPriceProvider> logger)
    {
        _kernel = kernel;
        _logger = logger;
    }

    public async Task<FlightEstimate?> EstimateAsync(string originCode, string destinationCode, DateTime? departureDate = null)
    {
        var key = $"{originCode.ToUpperInvariant()}-{destinationCode.ToUpperInvariant()}";
        if (_cache.TryGetValue(key, out var cached))
            return new FlightEstimate(cached.Minutes, cached.CostUsd, "gemini-cache");

        _logger.LogInformation(
            "[GeminiClient] Request sent to Google AI — single flight estimate for {Origin} → {Destination}",
            originCode, destinationCode);

        var chatService = _kernel.GetRequiredService<IChatCompletionService>();
        var history = new ChatHistory();
        history.AddUserMessage(
$@"Estimate the one-way flight time in minutes and average economy round-trip ticket cost in USD from airport {originCode} to airport {destinationCode}.
Respond ONLY with JSON, no markdown: {{""minutes"": N, ""costUsd"": N}}");

        var settings = new PromptExecutionSettings
        {
            ExtensionData = new Dictionary<string, object> { { "temperature", 0.1 } }
        };

        try
        {
            var response = await chatService.GetChatMessageContentAsync(history, settings);
            var json = StripMarkdownFences(response.Content?.Trim() ?? "{}");

            _logger.LogInformation(
                "[GeminiClient] Response received from Google AI for {Origin} → {Destination}: {Json}",
                originCode, destinationCode, json);

            var parsed = JsonSerializer.Deserialize<BatchFlightEstimate>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (parsed == null || parsed.Minutes <= 0)
            {
                _logger.LogWarning("[GeminiClient] Invalid flight estimate for {Origin}→{Dest}", originCode, destinationCode);
                return null;
            }

            var minutes = parsed.Minutes;
            var costUsd = parsed.CostUsd > 0 ? parsed.CostUsd : 300;
            _cache[key] = (minutes, costUsd);
            return new FlightEstimate(minutes, costUsd, "gemini");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GeminiClient] Failed to estimate flight {Origin}→{Dest}", originCode, destinationCode);
            return null;
        }
    }

    /// <summary>
    /// Pre-fetch flight estimates for many routes in a single Gemini API call.
    /// </summary>
    public async Task PreloadBatchAsync(List<(string Origin, string Destination)> routePairs)
    {
        var uncached = routePairs
            .Select(p => (Origin: p.Origin.ToUpperInvariant(), Destination: p.Destination.ToUpperInvariant()))
            .Distinct()
            .Where(p => !_cache.ContainsKey($"{p.Origin}-{p.Destination}"))
            .ToList();

        if (uncached.Count == 0) return;

        _logger.LogInformation(
            "[GeminiClient] Request sent to Google AI — batch estimating {Count} flight routes in chunks",
            uncached.Count);

        var chatService = _kernel.GetRequiredService<IChatCompletionService>();
        var settings = new PromptExecutionSettings
        {
            ExtensionData = new Dictionary<string, object> { { "temperature", 0.1 }, { "topP", 0.9 } }
        };

        const int chunkSize = 15;
        var chunks = uncached.Chunk(chunkSize).ToList();

        var tasks = chunks.Select(async chunk =>
        {
            var chunkResults = new Dictionary<string, (int Minutes, int CostUsd)>();

            var routeLines = string.Join("\n",
                chunk.Select((p, i) => $"  {i + 1}. {p.Origin} → {p.Destination}"));

            var history = new ChatHistory();
            history.AddUserMessage(
$@"You are an aviation data expert. For each route below, estimate the approximate one-way flight time in minutes and the average economy round-trip ticket cost in USD.

Routes:
{routeLines}

Respond STRICTLY with a JSON array, no markdown wrapping, no explanation:
[{{""origin"":""XXX"",""destination"":""YYY"",""minutes"":N,""costUsd"":N}}, ...]");

            try
            {
                var response = await chatService.GetChatMessageContentAsync(history, settings);
                var json = StripMarkdownFences(response.Content?.Trim() ?? "[]");

                var estimates = JsonSerializer.Deserialize<List<BatchFlightEstimate>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (estimates != null)
                {
                    foreach (var est in estimates)
                    {
                        if (!string.IsNullOrEmpty(est.Origin) && !string.IsNullOrEmpty(est.Destination) && est.Minutes > 0)
                        {
                            var key = $"{est.Origin.ToUpperInvariant()}-{est.Destination.ToUpperInvariant()}";
                            chunkResults[key] = (est.Minutes, est.CostUsd > 0 ? est.CostUsd : 300);
                        }
                    }
                }
            }
            catch (Exception ex) when (ex is TaskCanceledException || ex is Exception)
            {
                _logger.LogError(ex, "[GeminiClient] Chunk failed or timed out for {Count} routes. Applying fallback.", chunk.Length);
                foreach (var route in chunk)
                {
                    var key = $"{route.Origin}-{route.Destination}";
                    // Fallback: Realistic default assigning $250 and 180m depending on the chunk failure
                    chunkResults[key] = (180, 250);
                }
            }

            return chunkResults;
        });

        var results = await Task.WhenAll(tasks);

        foreach (var chunkResult in results)
        {
            foreach (var kvp in chunkResult)
            {
                _cache[kvp.Key] = kvp.Value;
            }
        }

        _logger.LogInformation("[GeminiClient] Cached {Count}/{Total} flight estimates from Gemini batch",
            _cache.Count, uncached.Count);
    }

    private static string StripMarkdownFences(string text)
    {
        if (!text.StartsWith("```")) return text;
        var firstNewline = text.IndexOf('\n');
        var lastFence = text.LastIndexOf("```");
        if (firstNewline != -1 && lastFence > firstNewline)
            return text.Substring(firstNewline + 1, lastFence - firstNewline - 1).Trim();
        return text;
    }

    private class BatchFlightEstimate
    {
        public string Origin { get; set; } = "";
        public string Destination { get; set; } = "";
        public int Minutes { get; set; }
        public int CostUsd { get; set; }
    }
}
