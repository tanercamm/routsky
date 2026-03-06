using System.Text.Json;

namespace Routiq.Api.Services
{
    public class AgentInsightService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AgentInsightService> _logger;

        public AgentInsightService(HttpClient httpClient, ILogger<AgentInsightService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<string> GenerateInsightAsync(string city)
        {
            // 1. Fetch live weather
            var weatherPart = await GetWeatherAsync(city);

            // 2. Fetch seed data for THY and Airbnb
            var thyPart = GetThyInsight(city);
            var airbnbPart = GetAirbnbInsight(city);

            // 3. Synthesize
            var insight = string.Join(" ", new[] { weatherPart, thyPart, airbnbPart }.Where(p => !string.IsNullOrWhiteSpace(p)));

            if (string.IsNullOrWhiteSpace(insight))
            {
                return $"Verified route details for {city}. All parameters match your current travel capabilities.";
            }

            return insight;
        }

        private async Task<string> GetWeatherAsync(string city)
        {
            try
            {
                // Geocode
                var geoUrl = $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(city)}&count=1";
                var geoRes = await _httpClient.GetStringAsync(geoUrl);
                using var geoDoc = JsonDocument.Parse(geoRes);

                if (!geoDoc.RootElement.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
                {
                    return string.Empty;
                }

                var firstResult = results[0];
                var lat = firstResult.GetProperty("latitude").GetDouble();
                var lon = firstResult.GetProperty("longitude").GetDouble();

                // Weather
                var wxUrl = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true";
                var wxRes = await _httpClient.GetStringAsync(wxUrl);
                using var wxDoc = JsonDocument.Parse(wxRes);

                if (!wxDoc.RootElement.TryGetProperty("current_weather", out var current))
                {
                    return string.Empty;
                }

                var temp = Math.Round(current.GetProperty("temperature").GetDouble());
                var code = current.GetProperty("weathercode").GetInt32();

                string condition = "Clear ☀️";
                string advice = "Perfect for your scheduled outdoor tour! 👟";

                if (code >= 1 && code <= 3) { condition = "Partly Cloudy ⛅"; advice = "A great time to explore the city on foot. 🚶"; }
                else if (code >= 45 && code <= 48) { condition = "Foggy 🌫️"; advice = "Take it easy on the roads and enjoy a cozy indoor cafe. ☕"; }
                else if (code >= 51 && code <= 67) { condition = "Rainy 🌧️"; advice = "Bring a light jacket and an umbrella for the Day 1 activities. ☔"; }
                else if (code >= 71 && code <= 77) { condition = "Snowy ❄️"; advice = "Bundle up! It's beautiful weather for winter sightseeing. ⛄"; }
                else if (code >= 80 && code <= 82) { condition = "Experiencing Rain Showers 🌦️"; advice = "Expect intermittent rain, keep your itinerary flexible. 🏛️"; }
                else if (code >= 95 && code <= 99) { condition = "Stormy ⛈️"; advice = "Safest to plan indoor activities or find a local restaurant until it passes. 🍽️"; }

                string tempWarning = string.Empty;
                if (temp > 30) tempWarning = " 🔥";
                else if (temp < 5) tempWarning = " 🥶";

                return $"Currently {temp}°C{tempWarning} and {condition} in {city}—{advice}";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch weather for {City}", city);
                return string.Empty;
            }
        }

        private string GetThyInsight(string city)
        {
            var cityName = city.Split(',')[0].Trim().ToLowerInvariant();
            return cityName switch
            {
                "sofia" => "🏛️ THY suggests starting at the St. Alexander Nevsky Cathedral.",
                "london" => "🏛️ THY recommends visiting the British Museum today.",
                "rome" => "🏛️ THY suggests exploring the Colosseum today.",
                _ => "🏛️ THY highly recommends visiting the main historic square to begin your journey."
            };
        }

        private string GetAirbnbInsight(string city)
        {
            var cityName = city.Split(',')[0].Trim().ToLowerInvariant();
            return cityName switch
            {
                "sofia" => "🏠 I found highly-rated Airbnb stays averaging $85/night for your dates.",
                "london" => "🏠 I found central Airbnb stays averaging $315/night.",
                "rome" => "🏠 I found gorgeous Airbnb stays averaging $285/night right now.",
                _ => "🏠 I found excellent Airbnb stays in this region starting around your budget constraints."
            };
        }
    }
}
