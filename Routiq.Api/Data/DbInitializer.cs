using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Routiq.Api.Entities;

namespace Routiq.Api.Data;

/// <summary>
/// V2 Seed Data. Populates:
/// - RegionPriceTiers (9 regions × 3 cost levels = 27 rows)
/// - Destinations (~55 cities across 9 regions incl. luxury)
/// - VisaRules (TR/IN/US/GB passports × key destination countries)
/// - Users, UserProfiles (2 demo users)
/// - Sample RouteQueries, SavedRoutes, RouteStops, RouteEliminations
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(RoutiqDbContext context)
    {
        // Apply any pending migrations (creates schema if DB is new, upgrades if existing)
        await context.Database.MigrateAsync();

        await SeedRegionPriceTiersAsync(context);
        await SeedDestinationsAsync(context);
        await SeedVisaRulesAsync(context);
        await SeedUsersAsync(context);
        await SeedCityIntelligenceAsync(context);
        await SeedVisaMatrixAsync(context);
    }

    // ─────────────────────────────────────────────
    // REGION PRICE TIERS (27 rows — truth table)
    // ─────────────────────────────────────────────
    private static async Task SeedRegionPriceTiersAsync(RoutiqDbContext context)
    {
        if (await context.RegionPriceTiers.AnyAsync()) return;

        var now = new DateTime(2026, 2, 25, 0, 0, 0, DateTimeKind.Utc);

        var tiers = new List<RegionPriceTier>
        {
            // Southeast Asia
            new() { Region = "Southeast Asia", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 20,  DailyBudgetUsdMax = 45,  Description = "Hostel + street food + local transport. Very achievable.",           LastReviewedAt = now },
            new() { Region = "Southeast Asia", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 45,  DailyBudgetUsdMax = 100, Description = "Private room + restaurant meals + occasional tuk-tuk/rideshare.", LastReviewedAt = now },
            new() { Region = "Southeast Asia", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 100, DailyBudgetUsdMax = 250, Description = "Boutique hotel + fine dining + private transfers.",                LastReviewedAt = now },

            // Balkans
            new() { Region = "Balkans", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 25,  DailyBudgetUsdMax = 50,  Description = "Hostel + local eateries + buses/trains. Extremely good value.",   LastReviewedAt = now },
            new() { Region = "Balkans", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 50,  DailyBudgetUsdMax = 110, Description = "Mid-range hotels + sit-down restaurants + occasional taxi.",       LastReviewedAt = now },
            new() { Region = "Balkans", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 110, DailyBudgetUsdMax = 220, Description = "Upscale accommodation + fine dining.",                             LastReviewedAt = now },

            // Eastern Europe
            new() { Region = "Eastern Europe", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 30,  DailyBudgetUsdMax = 55,  Description = "Budget hotel or hostel + cheap local food + metro/tram.",    LastReviewedAt = now },
            new() { Region = "Eastern Europe", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 55,  DailyBudgetUsdMax = 130, Description = "3-star hotel + varied dining + occasional tours.",             LastReviewedAt = now },
            new() { Region = "Eastern Europe", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 130, DailyBudgetUsdMax = 300, Description = "4-5 star hotel + restaurant dining + private transport.",     LastReviewedAt = now },

            // Latin America
            new() { Region = "Latin America", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 25,  DailyBudgetUsdMax = 50,  Description = "Hostel + street food + colectivos. Budget-friendly region.",  LastReviewedAt = now },
            new() { Region = "Latin America", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 50,  DailyBudgetUsdMax = 120, Description = "Budget hotel + restaurant meals + Uber/bus.",                  LastReviewedAt = now },
            new() { Region = "Latin America", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 120, DailyBudgetUsdMax = 280, Description = "Boutique hotel + fine dining + private transfers.",            LastReviewedAt = now },

            // North Africa
            new() { Region = "North Africa", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 20,  DailyBudgetUsdMax = 40,  Description = "Cheap riad room + street food + shared transport.",            LastReviewedAt = now },
            new() { Region = "North Africa", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 40,  DailyBudgetUsdMax = 90,  Description = "Mid-range riad + restaurant meals + taxi.",                    LastReviewedAt = now },
            new() { Region = "North Africa", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 90,  DailyBudgetUsdMax = 200, Description = "Luxury riad + fine dining + private drivers.",                 LastReviewedAt = now },

            // Central America
            new() { Region = "Central America", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 30,  DailyBudgetUsdMax = 55,  Description = "Hostel + comida corrida + chicken buses.",                  LastReviewedAt = now },
            new() { Region = "Central America", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 55,  DailyBudgetUsdMax = 120, Description = "Budget hotel + restaurant meals + shuttle services.",        LastReviewedAt = now },
            new() { Region = "Central America", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 120, DailyBudgetUsdMax = 260, Description = "Eco-lodge/boutique hotel + fine dining + private transport.", LastReviewedAt = now },

            // ── NEW: Western Europe (luxury-tier) ──────────────────────────────
            new() { Region = "Western Europe", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 80,  DailyBudgetUsdMax = 130,  Description = "Hostel or budget hotel + supermarket meals + metro pass.",  LastReviewedAt = now },
            new() { Region = "Western Europe", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 130, DailyBudgetUsdMax = 280,  Description = "3-star hotel + restaurant dining + trains/Uber.",            LastReviewedAt = now },
            new() { Region = "Western Europe", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 280, DailyBudgetUsdMax = 700,  Description = "5-star hotel + fine dining + private concierge.",           LastReviewedAt = now },

            // ── NEW: East Asia ──────────────────────────────────────────────────
            new() { Region = "East Asia", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 50,  DailyBudgetUsdMax = 100, Description = "Budget guesthouse + ramen/street food + subway.",             LastReviewedAt = now },
            new() { Region = "East Asia", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 100, DailyBudgetUsdMax = 220, Description = "Business hotel + restaurants + shinkansen day trips.",         LastReviewedAt = now },
            new() { Region = "East Asia", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 220, DailyBudgetUsdMax = 600, Description = "Ryokan/luxury hotel + kaiseki dining + private transport.",    LastReviewedAt = now },

            // ── NEW: Indian Ocean (ultra-luxury tier) ───────────────────────────
            new() { Region = "Indian Ocean", CostLevel = CostLevel.Low,    DailyBudgetUsdMin = 80,   DailyBudgetUsdMax = 150,  Description = "Guesthouse + local restaurants. Budget version of paradise.",   LastReviewedAt = now },
            new() { Region = "Indian Ocean", CostLevel = CostLevel.Medium, DailyBudgetUsdMin = 150,  DailyBudgetUsdMax = 350,  Description = "3-4 star resort + restaurant meals.",                          LastReviewedAt = now },
            new() { Region = "Indian Ocean", CostLevel = CostLevel.High,   DailyBudgetUsdMin = 350,  DailyBudgetUsdMax = 1200, Description = "Overwater bungalow + all-inclusive + seaplane transfers.",   LastReviewedAt = now },
        };

        context.RegionPriceTiers.AddRange(tiers);
        await context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────
    // DESTINATIONS (~55 cities)
    // ─────────────────────────────────────────────
    private static async Task SeedDestinationsAsync(RoutiqDbContext context)
    {
        if (await context.Destinations.AnyAsync()) return;

        var destinations = new List<Destination>
        {
            // Southeast Asia
            new() { Country = "Thailand",    CountryCode = "TH", City = "Bangkok",      Region = "Southeast Asia", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 7,  PopularityWeight = 1.8 },
            new() { Country = "Thailand",    CountryCode = "TH", City = "Chiang Mai",   Region = "Southeast Asia", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 7,  PopularityWeight = 1.6 },
            new() { Country = "Vietnam",     CountryCode = "VN", City = "Hanoi",        Region = "Southeast Asia", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.5 },
            new() { Country = "Vietnam",     CountryCode = "VN", City = "Ho Chi Minh City", Region = "Southeast Asia", DailyCostLevel = CostLevel.Low, MinRecommendedDays = 3, MaxRecommendedDays = 5, PopularityWeight = 1.5 },
            new() { Country = "Vietnam",     CountryCode = "VN", City = "Hoi An",       Region = "Southeast Asia", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.4 },
            new() { Country = "Cambodia",    CountryCode = "KH", City = "Siem Reap",    Region = "Southeast Asia", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.3 },
            new() { Country = "Indonesia",   CountryCode = "ID", City = "Bali",         Region = "Southeast Asia", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 5, MaxRecommendedDays = 14, PopularityWeight = 1.9 },
            new() { Country = "Malaysia",    CountryCode = "MY", City = "Kuala Lumpur", Region = "Southeast Asia", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.4 },

            // Balkans
            new() { Country = "Serbia",      CountryCode = "RS", City = "Belgrade",     Region = "Balkans", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.5, Notes = "No visa for most passports. Excellent nightlife hub." },
            new() { Country = "North Macedonia", CountryCode = "MK", City = "Skopje",   Region = "Balkans", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 1, MaxRecommendedDays = 3,  PopularityWeight = 1.1 },
            new() { Country = "Albania",     CountryCode = "AL", City = "Tirana",       Region = "Balkans", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 3,  PopularityWeight = 1.2 },
            new() { Country = "Bosnia",      CountryCode = "BA", City = "Sarajevo",     Region = "Balkans", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.3 },
            new() { Country = "Montenegro",  CountryCode = "ME", City = "Kotor",        Region = "Balkans", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.4 },
            new() { Country = "Croatia",     CountryCode = "HR", City = "Dubrovnik",    Region = "Balkans", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.6, Notes = "Schengen zone. Visa required for some passports." },
            new() { Country = "Slovenia",    CountryCode = "SI", City = "Ljubljana",    Region = "Balkans", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 2, MaxRecommendedDays = 3,  PopularityWeight = 1.2, Notes = "Schengen zone." },

            // Eastern Europe
            new() { Country = "Hungary",     CountryCode = "HU", City = "Budapest",    Region = "Eastern Europe", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5, PopularityWeight = 1.7, Notes = "Schengen zone." },
            new() { Country = "Czech Republic", CountryCode = "CZ", City = "Prague",   Region = "Eastern Europe", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5, PopularityWeight = 1.8, Notes = "Schengen zone." },
            new() { Country = "Poland",      CountryCode = "PL", City = "Krakow",      Region = "Eastern Europe", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4, PopularityWeight = 1.4, Notes = "Schengen zone." },
            new() { Country = "Romania",     CountryCode = "RO", City = "Bucharest",   Region = "Eastern Europe", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4, PopularityWeight = 1.3 },
            new() { Country = "Romania",     CountryCode = "RO", City = "Cluj-Napoca", Region = "Eastern Europe", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 3, PopularityWeight = 1.1 },
            new() { Country = "Bulgaria",    CountryCode = "BG", City = "Sofia",       Region = "Eastern Europe", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 3, PopularityWeight = 1.2 },
            new() { Country = "Georgia",     CountryCode = "GE", City = "Tbilisi",     Region = "Eastern Europe", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 6, PopularityWeight = 1.6, Notes = "Visa-free for most passports up to 1 year." },

            // Latin America
            new() { Country = "Colombia",    CountryCode = "CO", City = "Medellín",    Region = "Latin America", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 4, MaxRecommendedDays = 7,  PopularityWeight = 1.6 },
            new() { Country = "Colombia",    CountryCode = "CO", City = "Cartagena",   Region = "Latin America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.4 },
            new() { Country = "Peru",        CountryCode = "PE", City = "Lima",        Region = "Latin America", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.3 },
            new() { Country = "Peru",        CountryCode = "PE", City = "Cusco",       Region = "Latin America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.5 },
            new() { Country = "Argentina",   CountryCode = "AR", City = "Buenos Aires",Region = "Latin America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 4, MaxRecommendedDays = 7,  PopularityWeight = 1.5 },
            new() { Country = "Mexico",      CountryCode = "MX", City = "Mexico City", Region = "Latin America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 4, MaxRecommendedDays = 7,  PopularityWeight = 1.6 },

            // North Africa
            new() { Country = "Morocco",     CountryCode = "MA", City = "Marrakech",   Region = "North Africa", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 6,  PopularityWeight = 1.6 },
            new() { Country = "Morocco",     CountryCode = "MA", City = "Fez",         Region = "North Africa", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 3,  PopularityWeight = 1.3 },
            new() { Country = "Morocco",     CountryCode = "MA", City = "Tangier",     Region = "North Africa", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 1, MaxRecommendedDays = 2,  PopularityWeight = 1.0 },
            new() { Country = "Tunisia",     CountryCode = "TN", City = "Tunis",       Region = "North Africa", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.1 },
            new() { Country = "Egypt",       CountryCode = "EG", City = "Cairo",       Region = "North Africa", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 3, MaxRecommendedDays = 6,  PopularityWeight = 1.4, Notes = "eVisa available. Most nationalities can get on arrival." },

            // Central America
            new() { Country = "Guatemala",   CountryCode = "GT", City = "Guatemala City", Region = "Central America", DailyCostLevel = CostLevel.Low,  MinRecommendedDays = 1, MaxRecommendedDays = 2, PopularityWeight = 1.0 },
            new() { Country = "Guatemala",   CountryCode = "GT", City = "Antigua",      Region = "Central America", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 4, PopularityWeight = 1.4 },
            new() { Country = "Costa Rica",  CountryCode = "CR", City = "San José",     Region = "Central America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 2, MaxRecommendedDays = 3, PopularityWeight = 1.3 },
            new() { Country = "Costa Rica",  CountryCode = "CR", City = "La Fortuna",   Region = "Central America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 2, MaxRecommendedDays = 3, PopularityWeight = 1.3 },
            new() { Country = "Panama",      CountryCode = "PA", City = "Panama City",  Region = "Central America", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 2, MaxRecommendedDays = 4, PopularityWeight = 1.2 },
            new() { Country = "Nicaragua",   CountryCode = "NI", City = "Granada",      Region = "Central America", DailyCostLevel = CostLevel.Low,    MinRecommendedDays = 2, MaxRecommendedDays = 3, PopularityWeight = 1.1 },

            // ── NEW: Western Europe ─────────────────────────────────────────────
            new() { Country = "France",       CountryCode = "FR", City = "Paris",        Region = "Western Europe", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 4, MaxRecommendedDays = 10, PopularityWeight = 2.0, Notes = "Schengen. Iconic luxury destination." },
            new() { Country = "Switzerland",  CountryCode = "CH", City = "Zurich",       Region = "Western Europe", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 3, MaxRecommendedDays = 6,  PopularityWeight = 1.6, Notes = "Schengen. One of the most expensive cities globally." },
            new() { Country = "Switzerland",  CountryCode = "CH", City = "Geneva",       Region = "Western Europe", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 2, MaxRecommendedDays = 4,  PopularityWeight = 1.4, Notes = "Schengen. Swiss Alps access gateway." },
            new() { Country = "Austria",      CountryCode = "AT", City = "Vienna",       Region = "Western Europe", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 3, MaxRecommendedDays = 6,  PopularityWeight = 1.7, Notes = "Schengen. Grand imperial city." },
            new() { Country = "Netherlands",  CountryCode = "NL", City = "Amsterdam",    Region = "Western Europe", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.7, Notes = "Schengen." },
            new() { Country = "Italy",        CountryCode = "IT", City = "Rome",         Region = "Western Europe", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 4, MaxRecommendedDays = 7,  PopularityWeight = 1.9, Notes = "Schengen." },
            new() { Country = "Italy",        CountryCode = "IT", City = "Amalfi Coast", Region = "Western Europe", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.5, Notes = "Schengen. Premium summer destination." },
            new() { Country = "Spain",        CountryCode = "ES", City = "Barcelona",    Region = "Western Europe", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 4, MaxRecommendedDays = 7,  PopularityWeight = 1.8, Notes = "Schengen." },

            // ── NEW: East Asia ──────────────────────────────────────────────────
            new() { Country = "Japan",       CountryCode = "JP", City = "Tokyo",  Region = "East Asia", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 5, MaxRecommendedDays = 14, PopularityWeight = 2.0, Notes = "Visa-free for most passports. Ryokan and fine dining available." },
            new() { Country = "Japan",       CountryCode = "JP", City = "Kyoto",  Region = "East Asia", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 3, MaxRecommendedDays = 7,  PopularityWeight = 1.8, Notes = "Traditional Japan. Temples, tea houses, kaiseki." },
            new() { Country = "Japan",       CountryCode = "JP", City = "Osaka",  Region = "East Asia", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 5,  PopularityWeight = 1.7, Notes = "Japan's food capital. More affordable than Tokyo." },
            new() { Country = "South Korea", CountryCode = "KR", City = "Seoul",  Region = "East Asia", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 4, MaxRecommendedDays = 8,  PopularityWeight = 1.8, Notes = "Visa-free for many passports. K-culture hub." },

            // ── NEW: Indian Ocean ───────────────────────────────────────────────
            new() { Country = "Maldives",  CountryCode = "MV", City = "Malé Atolls", Region = "Indian Ocean", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 5, MaxRecommendedDays = 14, PopularityWeight = 1.9, Notes = "30-day visa on arrival all nationalities. Overwater bungalow capital." },
            new() { Country = "Thailand",  CountryCode = "TH", City = "Phuket",      Region = "Indian Ocean", DailyCostLevel = CostLevel.High,   MinRecommendedDays = 4, MaxRecommendedDays = 10, PopularityWeight = 1.7, Notes = "Luxury beach resort zone." },
            new() { Country = "Sri Lanka", CountryCode = "LK", City = "Colombo",     Region = "Indian Ocean", DailyCostLevel = CostLevel.Medium, MinRecommendedDays = 3, MaxRecommendedDays = 7,  PopularityWeight = 1.4, Notes = "eVisa required. Rising luxury destination." },
        };

        context.Destinations.AddRange(destinations);
        await context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────
    // VISA RULES (key passport × country pairs)
    // ─────────────────────────────────────────────
    private static async Task SeedVisaRulesAsync(RoutiqDbContext context)
    {
        if (await context.VisaRules.AnyAsync()) return;

        var now = new DateTime(2026, 2, 24, 0, 0, 0, DateTimeKind.Utc);

        var rules = new List<VisaRule>
        {
            // ── Turkish Passport (TR) ──
            new() { PassportCountryCode = "TR", DestinationCountryCode = "TH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "VN", Requirement = VisaRequirement.EVisa,      MaxStayDays = 30,  AvgProcessingDays = 3, EVisaUrl = "https://evisa.xuatnhapcanh.gov.vn", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "KH", Requirement = VisaRequirement.OnArrival,  MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "Fee ~$30 USD at airport.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "ID", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "MY", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "RS", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "AL", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "BA", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "ME", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "HR", Requirement = VisaRequirement.Required,   MaxStayDays = 90,  AvgProcessingDays = 15, Notes = "Schengen visa required. Apply at German/Austrian embassy.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "SI", Requirement = VisaRequirement.Required,   MaxStayDays = 90,  AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "HU", Requirement = VisaRequirement.Required,   MaxStayDays = 90,  AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "CZ", Requirement = VisaRequirement.Required,   MaxStayDays = 90,  AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "PL", Requirement = VisaRequirement.Required,   MaxStayDays = 90,  AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "RO", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  Notes = "Romania not fully Schengen. TR passport holders visa-free.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "BG", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "GE", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 365, AvgProcessingDays = 0,  Notes = "Visa-free up to 1 year.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "MA", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "TN", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "EG", Requirement = VisaRequirement.OnArrival,  MaxStayDays = 30,  AvgProcessingDays = 0,  Notes = "Fee ~$25 USD. Available at Cairo & Sharm airports.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "CO", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "PE", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "AR", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "MX", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 180, AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "CR", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "GT", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "PA", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },

            // ── Indian Passport (IN) ──
            new() { PassportCountryCode = "IN", DestinationCountryCode = "TH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "Visa exemption extended for IN passport 2024.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "VN", Requirement = VisaRequirement.EVisa,     MaxStayDays = 90,  AvgProcessingDays = 3, EVisaUrl = "https://evisa.xuatnhapcanh.gov.vn", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "KH", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "ID", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "MY", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "HR", Requirement = VisaRequirement.Required,  MaxStayDays = 90,  AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "HU", Requirement = VisaRequirement.Required,  MaxStayDays = 90,  AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "RS", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "GE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 365, AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "MA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "EG", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "CO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0,  LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "MX", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 180, AvgProcessingDays = 0,  LastReviewedAt = now },

            // ── US Passport (US) ──
            new() { PassportCountryCode = "US", DestinationCountryCode = "TH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "VN", Requirement = VisaRequirement.EVisa,     MaxStayDays = 90,  AvgProcessingDays = 3, EVisaUrl = "https://evisa.xuatnhapcanh.gov.vn", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "HR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen rules apply.", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "HU", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "GE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 365, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "RS", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "MA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "CO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "MX", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 180, AvgProcessingDays = 0, LastReviewedAt = now },

            // TR → NEW regions (Schengen required, but JP/KR/MV visa-free)
            new() { PassportCountryCode = "TR", DestinationCountryCode = "FR", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "CH", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "AT", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "NL", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "IT", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "ES", Requirement = VisaRequirement.Required,   MaxStayDays = 90, AvgProcessingDays = 15, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "JP", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90, AvgProcessingDays = 0, Notes = "Visa-free since 2024 for TR passport.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "KR", Requirement = VisaRequirement.VisaFree,   MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "MV", Requirement = VisaRequirement.OnArrival,  MaxStayDays = 30, AvgProcessingDays = 0, Notes = "Free 30-day visa on arrival all nationalities.", LastReviewedAt = now },
            new() { PassportCountryCode = "TR", DestinationCountryCode = "LK", Requirement = VisaRequirement.EVisa,      MaxStayDays = 30, AvgProcessingDays = 2, EVisaUrl = "https://eta.gov.lk", LastReviewedAt = now },

            // IN → NEW regions
            new() { PassportCountryCode = "IN", DestinationCountryCode = "FR", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "CH", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "AT", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "IT", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "ES", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 20, Notes = "Schengen visa required.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "JP", Requirement = VisaRequirement.Required,  MaxStayDays = 90, AvgProcessingDays = 10, Notes = "Visa required for Indian nationals.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "KR", Requirement = VisaRequirement.EVisa,     MaxStayDays = 90, AvgProcessingDays = 3,  EVisaUrl = "https://www.visa.go.kr", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "MV", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30, AvgProcessingDays = 0, Notes = "Free 30-day visa on arrival all nationalities.", LastReviewedAt = now },
            new() { PassportCountryCode = "IN", DestinationCountryCode = "LK", Requirement = VisaRequirement.EVisa,     MaxStayDays = 30, AvgProcessingDays = 2, EVisaUrl = "https://eta.gov.lk", LastReviewedAt = now },

            // US → NEW regions (mostly visa-free)
            new() { PassportCountryCode = "US", DestinationCountryCode = "FR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, Notes = "Schengen zone. 90-day visa-free.", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "CH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "AT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "NL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "IT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "ES", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "JP", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "KR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90, AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "MV", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30, AvgProcessingDays = 0, Notes = "Free 30-day visa on arrival.", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "LK", Requirement = VisaRequirement.EVisa,     MaxStayDays = 30, AvgProcessingDays = 2, EVisaUrl = "https://eta.gov.lk", LastReviewedAt = now },

            // ── GB (United Kingdom) — full coverage all 40 destination countries ──
            // Southeast Asia
            new() { PassportCountryCode = "GB", DestinationCountryCode = "TH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "VN", Requirement = VisaRequirement.EVisa,     MaxStayDays = 90,  AvgProcessingDays = 3, EVisaUrl = "https://evisa.xuatnhapcanh.gov.vn", Notes = "E-visa 90 days for UK nationals.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "KH", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "Tourist e-Visa / on arrival ~$30.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "ID", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "MY", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Balkans
            new() { PassportCountryCode = "GB", DestinationCountryCode = "RS", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "MK", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "AL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "BA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "ME", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "HR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone. UK gets 90/180 rule.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "SI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            // Eastern Europe
            new() { PassportCountryCode = "GB", DestinationCountryCode = "HU", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "CZ", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "PL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "RO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "BG", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "GE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 365, AvgProcessingDays = 0, LastReviewedAt = now },
            // Latin America
            new() { PassportCountryCode = "GB", DestinationCountryCode = "CO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "PE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "AR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "MX", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 180, AvgProcessingDays = 0, LastReviewedAt = now },
            // North Africa
            new() { PassportCountryCode = "GB", DestinationCountryCode = "MA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "TN", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "EG", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "On-arrival visa ~$25.", LastReviewedAt = now },
            // Central America
            new() { PassportCountryCode = "GB", DestinationCountryCode = "GT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "CR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "PA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "NI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Western Europe
            new() { PassportCountryCode = "GB", DestinationCountryCode = "FR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Post-Brexit 90/180 day rule.", LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "CH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "AT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "NL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "IT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "ES", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // East Asia
            new() { PassportCountryCode = "GB", DestinationCountryCode = "JP", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "KR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Indian Ocean
            new() { PassportCountryCode = "GB", DestinationCountryCode = "MV", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "GB", DestinationCountryCode = "LK", Requirement = VisaRequirement.EVisa,     MaxStayDays = 30,  AvgProcessingDays = 2, EVisaUrl = "https://eta.gov.lk", LastReviewedAt = now },

            // ── US (United States) — fill missing destination gaps ──
            // Southeast Asia (KH, ID, MY were missing)
            new() { PassportCountryCode = "US", DestinationCountryCode = "KH", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "ID", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "MY", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Balkans (MK, AL, BA, ME, SI were missing)
            new() { PassportCountryCode = "US", DestinationCountryCode = "MK", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "AL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "BA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "ME", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "SI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            // Eastern Europe (CZ, PL, RO, BG were missing)
            new() { PassportCountryCode = "US", DestinationCountryCode = "CZ", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "PL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "RO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "BG", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Latin America (PE, AR, GT, CR, PA, NI were missing)
            new() { PassportCountryCode = "US", DestinationCountryCode = "PE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "AR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "GT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "CR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "PA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "NI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // North Africa (TN, EG were missing)
            new() { PassportCountryCode = "US", DestinationCountryCode = "TN", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "US", DestinationCountryCode = "EG", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "On-arrival visa.", LastReviewedAt = now },

            // ── DE (Germany) — comprehensive coverage all 55 destinations ──
            // Germany holds one of the world's strongest passports (Henley Index top 3).
            // Visa-free or on-arrival to virtually every destination in our seed data.
            // Southeast Asia
            new() { PassportCountryCode = "DE", DestinationCountryCode = "TH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "VN", Requirement = VisaRequirement.EVisa,     MaxStayDays = 90,  AvgProcessingDays = 3, EVisaUrl = "https://evisa.xuatnhapcanh.gov.vn", Notes = "E-visa 90 days for German nationals.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "KH", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "Tourist e-Visa / on arrival ~$30.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "ID", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "MY", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Balkans
            new() { PassportCountryCode = "DE", DestinationCountryCode = "RS", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "MK", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "AL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "BA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "ME", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "HR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "SI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            // Eastern Europe
            new() { PassportCountryCode = "DE", DestinationCountryCode = "HU", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "CZ", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "PL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "RO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "BG", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "GE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 365, AvgProcessingDays = 0, Notes = "Visa-free up to 1 year.", LastReviewedAt = now },
            // Latin America
            new() { PassportCountryCode = "DE", DestinationCountryCode = "CO", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "PE", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "AR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "MX", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 180, AvgProcessingDays = 0, LastReviewedAt = now },
            // North Africa
            new() { PassportCountryCode = "DE", DestinationCountryCode = "MA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "TN", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "EG", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "On-arrival visa ~$25.", LastReviewedAt = now },
            // Central America
            new() { PassportCountryCode = "DE", DestinationCountryCode = "GT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "CR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "PA", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "NI", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Western Europe (fellow Schengen members)
            new() { PassportCountryCode = "DE", DestinationCountryCode = "FR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "CH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "AT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "NL", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "IT", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "ES", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, Notes = "Schengen zone.", LastReviewedAt = now },
            // East Asia
            new() { PassportCountryCode = "DE", DestinationCountryCode = "JP", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "KR", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 90,  AvgProcessingDays = 0, LastReviewedAt = now },
            // Indian Ocean
            new() { PassportCountryCode = "DE", DestinationCountryCode = "MV", Requirement = VisaRequirement.OnArrival, MaxStayDays = 30,  AvgProcessingDays = 0, Notes = "Free 30-day visa on arrival all nationalities.", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "LK", Requirement = VisaRequirement.EVisa,     MaxStayDays = 30,  AvgProcessingDays = 2, EVisaUrl = "https://eta.gov.lk", LastReviewedAt = now },
            new() { PassportCountryCode = "DE", DestinationCountryCode = "PH", Requirement = VisaRequirement.VisaFree,  MaxStayDays = 30,  AvgProcessingDays = 0, LastReviewedAt = now },
        };

        context.VisaRules.AddRange(rules);
        await context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────
    // USERS & PROFILES (2 demo users)
    // ─────────────────────────────────────────────
    private static async Task SeedUsersAsync(RoutiqDbContext context)
    {
        if (await context.Users.AnyAsync()) return;

        var user1 = new User
        {
            Email = "admin@navisio.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            FirstName = "Admin",
            LastName = "Navisio",
            Role = "Admin",
            CreatedAt = new DateTime(2026, 2, 25, 0, 0, 0, DateTimeKind.Utc)
        };
        context.Users.Add(user1);
        await context.SaveChangesAsync();

        context.UserProfiles.Add(new UserProfile
        {
            UserId = user1.Id,
            Username = "admin",
            Email = user1.Email,
            Passports = new List<string> { "TR" },
            CountryCode = "TR",
            PreferredCurrency = "USD",
            Age = 29
        });

        var user2 = new User
        {
            Email = "arjun@navisio.app",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
            FirstName = "Arjun",
            LastName = "Demo",
            Role = "User",
            CreatedAt = new DateTime(2026, 2, 25, 0, 0, 0, DateTimeKind.Utc)
        };
        context.Users.Add(user2);
        await context.SaveChangesAsync();

        context.UserProfiles.Add(new UserProfile
        {
            UserId = user2.Id,
            Username = "arjun",
            Email = user2.Email,
            Passports = new List<string> { "IN" },
            CountryCode = "IN",
            PreferredCurrency = "USD",
            Age = 26
        });

        await context.SaveChangesAsync();

        // ── Sample RouteQuery + SavedRoute + RouteStops + RouteEliminations ──
        await SeedSampleRouteAsync(context, user1.Id);
    }

    private static async Task SeedSampleRouteAsync(RoutiqDbContext context, int userId)
    {
        var bangkok = await context.Destinations.FirstAsync(d => d.City == "Bangkok");
        var chiangMai = await context.Destinations.FirstAsync(d => d.City == "Chiang Mai");
        var hanoi = await context.Destinations.FirstAsync(d => d.City == "Hanoi");
        var hoiAn = await context.Destinations.FirstAsync(d => d.City == "Hoi An");
        var budapest = await context.Destinations.FirstAsync(d => d.City == "Budapest");   // eliminated

        var queryId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var queryDate = new DateTime(2026, 2, 25, 9, 0, 0, DateTimeKind.Utc);

        // Query: TR passport, Budget bracket, 21 days, $1400, SEA preference
        var query = new RouteQuery
        {
            Id = queryId,
            UserId = userId,
            Passports = new List<string> { "TR" },
            BudgetBracket = BudgetBracket.Budget,
            TotalBudgetUsd = 1400,
            DurationDays = 21,
            RegionPreference = RegionPreference.SoutheastAsia,
            HasSchengenVisa = false,
            HasUsVisa = false,
            HasUkVisa = false,
            CreatedAt = queryDate
        };

        var savedRoute = new SavedRoute
        {
            Id = routeId,
            UserId = userId,
            RouteQueryId = queryId,
            RouteName = "SEA Budget Loop: 21 Days",
            Status = RouteStatus.Saved,
            SelectionReason = "All 4 stops are visa-free for TR passport. Total cost estimate (Low tier × 21 days) = $945–$1365 USD, within $1400 cap. Minimum day requirements satisfied.",
            SavedAt = queryDate
        };

        var stops = new List<RouteStop>
        {
            new() { SavedRouteId = routeId, DestinationId = bangkok.Id,   StopOrder = 1, RecommendedDays = 5, ExpectedCostLevel = CostLevel.Low,  StopReason = "Gateway city. Low cost, no visa. Sets up the rest of the route." },
            new() { SavedRouteId = routeId, DestinationId = chiangMai.Id, StopOrder = 2, RecommendedDays = 5, ExpectedCostLevel = CostLevel.Low,  StopReason = "Budget-friendly northern hub. Visa-free continuation within Thailand." },
            new() { SavedRouteId = routeId, DestinationId = hanoi.Id,     StopOrder = 3, RecommendedDays = 5, ExpectedCostLevel = CostLevel.Low,  StopReason = "eVisa required (~3 days processing). Budget viable." },
            new() { SavedRouteId = routeId, DestinationId = hoiAn.Id,     StopOrder = 4, RecommendedDays = 4, ExpectedCostLevel = CostLevel.Low,  StopReason = "Within same VN eVisa. Completes the route on budget." },
        };

        // Elimination example: Budapest eliminated due to Schengen visa
        var eliminations = new List<RouteElimination>
        {
            new()
            {
                RouteQueryId  = queryId,
                DestinationId = budapest.Id,
                Reason        = EliminationReason.VisaRequired,
                ExplanationText = "Budapest eliminated: Hungary is Schengen zone. TR passport requires a Schengen visa (avg 15 days processing). You declared no Schengen visa."
            }
        };

        context.RouteQueries.Add(query);
        context.SavedRoutes.Add(savedRoute);
        context.RouteStops.AddRange(stops);
        context.RouteEliminations.AddRange(eliminations);
        await context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────
    // NEW: CITY INTELLIGENCE (Safety, Cost, Climate)
    // ─────────────────────────────────────────────
    private static async Task SeedCityIntelligenceAsync(RoutiqDbContext context)
    {
        if (await context.CityIntelligences.AnyAsync()) return;

        var intelligences = new List<CityIntelligence>
        {
            // Western Europe (High safety, High cost)
            new() { CityName = "London", Country = "United Kingdom", SafetyIndex = 65.5, CostOfLivingIndex = 80.0, AverageMealCostUSD = 25.0, AverageTransportCostUSD = 5.0, BestMonthsToVisit = "5,6,7,8,9" },
            new() { CityName = "Paris", Country = "France", SafetyIndex = 58.2, CostOfLivingIndex = 75.0, AverageMealCostUSD = 22.0, AverageTransportCostUSD = 2.5, BestMonthsToVisit = "5,6,7,8,9,10" },
            new() { CityName = "Zurich", Country = "Switzerland", SafetyIndex = 82.3, CostOfLivingIndex = 120.0, AverageMealCostUSD = 40.0, AverageTransportCostUSD = 6.0, BestMonthsToVisit = "6,7,8,9" },
            new() { CityName = "Geneva", Country = "Switzerland", SafetyIndex = 75.4, CostOfLivingIndex = 115.0, AverageMealCostUSD = 38.0, AverageTransportCostUSD = 5.0, BestMonthsToVisit = "6,7,8,9" },
            new() { CityName = "Vienna", Country = "Austria", SafetyIndex = 80.1, CostOfLivingIndex = 65.0, AverageMealCostUSD = 20.0, AverageTransportCostUSD = 3.0, BestMonthsToVisit = "5,6,7,8,9" },
            new() { CityName = "Amsterdam", Country = "Netherlands", SafetyIndex = 70.0, CostOfLivingIndex = 78.0, AverageMealCostUSD = 22.0, AverageTransportCostUSD = 4.0, BestMonthsToVisit = "5,6,7,8,9" },
            new() { CityName = "Rome", Country = "Italy", SafetyIndex = 60.5, CostOfLivingIndex = 60.0, AverageMealCostUSD = 18.0, AverageTransportCostUSD = 2.0, BestMonthsToVisit = "4,5,6,9,10" },
            new() { CityName = "Amalfi Coast", Country = "Italy", SafetyIndex = 75.0, CostOfLivingIndex = 85.0, AverageMealCostUSD = 30.0, AverageTransportCostUSD = 5.0, BestMonthsToVisit = "5,6,7,8,9" },
            new() { CityName = "Barcelona", Country = "Spain", SafetyIndex = 55.4, CostOfLivingIndex = 55.0, AverageMealCostUSD = 15.0, AverageTransportCostUSD = 2.5, BestMonthsToVisit = "4,5,6,9,10" },

            // Eastern Europe (Medium safety, Low cost)
            new() { CityName = "Budapest", Country = "Hungary", SafetyIndex = 68.3, CostOfLivingIndex = 40.0, AverageMealCostUSD = 10.0, AverageTransportCostUSD = 1.2, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Prague", Country = "Czech Republic", SafetyIndex = 75.8, CostOfLivingIndex = 45.0, AverageMealCostUSD = 12.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Krakow", Country = "Poland", SafetyIndex = 78.9, CostOfLivingIndex = 35.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "5,6,7,8,9" },
            new() { CityName = "Bucharest", Country = "Romania", SafetyIndex = 66.2, CostOfLivingIndex = 32.0, AverageMealCostUSD = 9.0, AverageTransportCostUSD = 0.8, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Cluj-Napoca", Country = "Romania", SafetyIndex = 77.4, CostOfLivingIndex = 34.0, AverageMealCostUSD = 9.0, AverageTransportCostUSD = 0.8, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Sofia", Country = "Bulgaria", SafetyIndex = 62.1, CostOfLivingIndex = 30.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Tbilisi", Country = "Georgia", SafetyIndex = 73.5, CostOfLivingIndex = 25.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "5,6,9,10" },

            // Balkans (High safety, Low cost)
            new() { CityName = "Belgrade", Country = "Serbia", SafetyIndex = 63.8, CostOfLivingIndex = 35.0, AverageMealCostUSD = 9.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Skopje", Country = "North Macedonia", SafetyIndex = 65.4, CostOfLivingIndex = 28.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 0.7, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Tirana", Country = "Albania", SafetyIndex = 64.9, CostOfLivingIndex = 30.0, AverageMealCostUSD = 7.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Sarajevo", Country = "Bosnia", SafetyIndex = 67.2, CostOfLivingIndex = 29.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Kotor", Country = "Montenegro", SafetyIndex = 72.1, CostOfLivingIndex = 40.0, AverageMealCostUSD = 12.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Dubrovnik", Country = "Croatia", SafetyIndex = 79.5, CostOfLivingIndex = 60.0, AverageMealCostUSD = 20.0, AverageTransportCostUSD = 2.0, BestMonthsToVisit = "5,6,9,10" },
            new() { CityName = "Ljubljana", Country = "Slovenia", SafetyIndex = 82.3, CostOfLivingIndex = 50.0, AverageMealCostUSD = 12.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "5,6,7,8,9" },

            // Southeast Asia (Medium safety, Low cost)
            new() { CityName = "Bangkok", Country = "Thailand", SafetyIndex = 60.1, CostOfLivingIndex = 35.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "11,12,1,2" },
            new() { CityName = "Chiang Mai", Country = "Thailand", SafetyIndex = 75.8, CostOfLivingIndex = 30.0, AverageMealCostUSD = 3.0, AverageTransportCostUSD = 0.8, BestMonthsToVisit = "11,12,1,2" },
            new() { CityName = "Hanoi", Country = "Vietnam", SafetyIndex = 63.4, CostOfLivingIndex = 28.0, AverageMealCostUSD = 3.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "10,11,12,3,4" },
            new() { CityName = "Ho Chi Minh City", Country = "Vietnam", SafetyIndex = 58.9, CostOfLivingIndex = 30.0, AverageMealCostUSD = 3.5, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "12,1,2,3" },
            new() { CityName = "Hoi An", Country = "Vietnam", SafetyIndex = 74.2, CostOfLivingIndex = 25.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "2,3,4,5" },
            new() { CityName = "Siem Reap", Country = "Cambodia", SafetyIndex = 65.5, CostOfLivingIndex = 26.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "11,12,1,2" },
            new() { CityName = "Bali", Country = "Indonesia", SafetyIndex = 68.2, CostOfLivingIndex = 32.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "5,6,7,8,9,10" },
            new() { CityName = "Kuala Lumpur", Country = "Malaysia", SafetyIndex = 48.7, CostOfLivingIndex = 32.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 0.8, BestMonthsToVisit = "5,6,7" },

            // LatAm (Low safety, Low cost)
            new() { CityName = "Medellín", Country = "Colombia", SafetyIndex = 42.1, CostOfLivingIndex = 22.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.8, BestMonthsToVisit = "1,2,3,12" },
            new() { CityName = "Cartagena", Country = "Colombia", SafetyIndex = 46.5, CostOfLivingIndex = 28.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "1,2,3,12" },
            new() { CityName = "Lima", Country = "Peru", SafetyIndex = 33.8, CostOfLivingIndex = 30.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 0.6, BestMonthsToVisit = "12,1,2,3,4" },
            new() { CityName = "Cusco", Country = "Peru", SafetyIndex = 49.2, CostOfLivingIndex = 25.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "5,6,7,8,9,10" },
            new() { CityName = "Buenos Aires", Country = "Argentina", SafetyIndex = 47.9, CostOfLivingIndex = 20.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Mexico City", Country = "Mexico", SafetyIndex = 42.6, CostOfLivingIndex = 35.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "3,4,5,10,11" },

            // North Africa (Medium safety, Low cost)
            new() { CityName = "Marrakech", Country = "Morocco", SafetyIndex = 63.4, CostOfLivingIndex = 25.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.4, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Fez", Country = "Morocco", SafetyIndex = 60.1, CostOfLivingIndex = 22.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 0.3, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Tangier", Country = "Morocco", SafetyIndex = 65.5, CostOfLivingIndex = 24.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "4,5,6,9,10" },
            new() { CityName = "Tunis", Country = "Tunisia", SafetyIndex = 58.2, CostOfLivingIndex = 20.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 0.2, BestMonthsToVisit = "4,5,6,9,10" },
            new() { CityName = "Cairo", Country = "Egypt", SafetyIndex = 54.3, CostOfLivingIndex = 18.0, AverageMealCostUSD = 3.0, AverageTransportCostUSD = 0.2, BestMonthsToVisit = "10,11,12,1,2,3,4" },

            // Central America
            new() { CityName = "Guatemala City", Country = "Guatemala", SafetyIndex = 38.5, CostOfLivingIndex = 35.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "11,12,1,2,3,4" },
            new() { CityName = "Antigua", Country = "Guatemala", SafetyIndex = 52.4, CostOfLivingIndex = 40.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 1.0, BestMonthsToVisit = "11,12,1,2,3,4" },
            new() { CityName = "San José", Country = "Costa Rica", SafetyIndex = 44.1, CostOfLivingIndex = 50.0, AverageMealCostUSD = 10.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "12,1,2,3,4" },
            new() { CityName = "La Fortuna", Country = "Costa Rica", SafetyIndex = 65.5, CostOfLivingIndex = 45.0, AverageMealCostUSD = 12.0, AverageTransportCostUSD = 5.0, BestMonthsToVisit = "12,1,2,3,4" },
            new() { CityName = "Panama City", Country = "Panama", SafetyIndex = 51.5, CostOfLivingIndex = 55.0, AverageMealCostUSD = 10.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "1,2,3,4" },
            new() { CityName = "Granada", Country = "Nicaragua", SafetyIndex = 55.0, CostOfLivingIndex = 25.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "12,1,2,3,4" },

            // East Asia (Very High Safety, Medium/High Cost)
            new() { CityName = "Tokyo", Country = "Japan", SafetyIndex = 82.5, CostOfLivingIndex = 60.0, AverageMealCostUSD = 8.0, AverageTransportCostUSD = 2.0, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Kyoto", Country = "Japan", SafetyIndex = 85.2, CostOfLivingIndex = 55.0, AverageMealCostUSD = 7.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Osaka", Country = "Japan", SafetyIndex = 80.4, CostOfLivingIndex = 50.0, AverageMealCostUSD = 6.0, AverageTransportCostUSD = 1.5, BestMonthsToVisit = "3,4,5,9,10,11" },
            new() { CityName = "Seoul", Country = "South Korea", SafetyIndex = 81.1, CostOfLivingIndex = 65.0, AverageMealCostUSD = 7.0, AverageTransportCostUSD = 1.2, BestMonthsToVisit = "4,5,9,10,11" },

            // Indian Ocean
            new() { CityName = "Malé Atolls", Country = "Maldives", SafetyIndex = 65.0, CostOfLivingIndex = 75.0, AverageMealCostUSD = 30.0, AverageTransportCostUSD = 25.0, BestMonthsToVisit = "11,12,1,2,3,4" },
            new() { CityName = "Phuket", Country = "Thailand", SafetyIndex = 58.0, CostOfLivingIndex = 40.0, AverageMealCostUSD = 5.0, AverageTransportCostUSD = 2.0, BestMonthsToVisit = "11,12,1,2,3,4" },
            new() { CityName = "Colombo", Country = "Sri Lanka", SafetyIndex = 60.5, CostOfLivingIndex = 30.0, AverageMealCostUSD = 4.0, AverageTransportCostUSD = 0.5, BestMonthsToVisit = "1,2,3,4" },
        };

        context.CityIntelligences.AddRange(intelligences);
        await context.SaveChangesAsync();
    }

    // ─────────────────────────────────────────────
    // NEW: VISA MATRIX (Passport Power Mapping)
    // ─────────────────────────────────────────────
    private static async Task SeedVisaMatrixAsync(RoutiqDbContext context)
    {
        if (await context.VisaMatrices.AnyAsync()) return;

        var matrices = new List<VisaMatrix>
        {
            // AUSTRALIAN PASSPORT (AU)
            new() { PassportCountry = "Australia", DestinationCountry = "United Kingdom", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "France", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Switzerland", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Austria", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Netherlands", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Italy", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Spain", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Japan", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "South Korea", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Thailand", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Vietnam", VisaStatus = "eVisa" },
            new() { PassportCountry = "Australia", DestinationCountry = "Cambodia", VisaStatus = "OnArrival" },
            new() { PassportCountry = "Australia", DestinationCountry = "Indonesia", VisaStatus = "OnArrival" },
            new() { PassportCountry = "Australia", DestinationCountry = "Malaysia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Serbia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "North Macedonia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Albania", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Bosnia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Montenegro", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Croatia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Slovenia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Hungary", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Czech Republic", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Poland", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Romania", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Bulgaria", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Georgia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Colombia", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Peru", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Argentina", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Mexico", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Morocco", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Tunisia", VisaStatus = "Required" },
            new() { PassportCountry = "Australia", DestinationCountry = "Egypt", VisaStatus = "eVisa" },
            new() { PassportCountry = "Australia", DestinationCountry = "Guatemala", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Costa Rica", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Panama", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Nicaragua", VisaStatus = "VisaFree" },
            new() { PassportCountry = "Australia", DestinationCountry = "Maldives", VisaStatus = "OnArrival" },
            new() { PassportCountry = "Australia", DestinationCountry = "Sri Lanka", VisaStatus = "eVisa" },
        };

        context.VisaMatrices.AddRange(matrices);
        await context.SaveChangesAsync();
    }
}
